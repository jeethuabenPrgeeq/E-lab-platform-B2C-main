import { Injectable } from '@nestjs/common';

import { JudgeGateway } from '../../judge/judge-gateway.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { languageName } from '../platform/runs.js';

type State = 'healthy' | 'degraded' | 'down';

const HOUR = 3_600_000;
const FAILURES = ['tle', 'mle', 're', 'sandbox'];
const RUNTIME_FAILURE_ALERT = 5;
const AVG_RUNTIME_ALERT_S = 5;

const istTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
const istStamp = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

@Injectable()
export class PlatformDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: JudgeGateway,
  ) {}

  private async database(): Promise<State> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return Date.now() - started > 500 ? 'degraded' : 'healthy';
    } catch {
      return 'down';
    }
  }

  async get() {
    const now = Date.now();
    const day = new Date(now - 24 * HOUR);
    const hour = new Date(now - HOUR);
    const trendStart = Math.floor(now / HOUR) * HOUR - 11 * HOUR;
    const [db, workers, images, recent5m, hourStats, outcomes24h, byLanguage, pipeline, validationFailed, trendRows] = await Promise.all([
      this.database(),
      this.prisma.judgeWorker.findMany({ select: { status: true, capacity: true } }),
      this.prisma.runtimeEntry.findMany({ where: { kind: 'images' }, select: { status: true, data: true } }),
      this.prisma.codeRun.count({ where: { finishedAt: { gte: new Date(now - 5 * 60_000) } } }),
      this.prisma.$queryRaw<{ avg_ms: number | null; wait_ms: number | null }[]>`
        SELECT AVG("durationMs") FILTER (WHERE "state" = 'done' AND COALESCE("outcome", '') NOT IN ('tle', 'ce')) AS avg_ms,
               AVG(EXTRACT(EPOCH FROM ("startedAt" - "queuedAt")) * 1000) FILTER (WHERE "startedAt" IS NOT NULL) AS wait_ms
        FROM "code_runs" WHERE "finishedAt" >= ${hour}`,
      this.prisma.$queryRaw<{ outcome: string; count: bigint; max_ms: number | null }[]>`
        SELECT CASE WHEN "state" = 'failed' THEN 'sandbox' ELSE COALESCE("outcome", 'sandbox') END AS outcome, COUNT(*) AS count, MAX("durationMs") AS max_ms
        FROM "code_runs" WHERE "finishedAt" >= ${day} AND "state" IN ('done', 'failed') GROUP BY 1`,
      this.prisma.$queryRaw<{ language: string; total: bigint; failed: bigint }[]>`
        SELECT "language", COUNT(*) AS total,
               COUNT(*) FILTER (WHERE "state" = 'failed' OR "outcome" = ANY(${FAILURES})) AS failed
        FROM "code_runs" WHERE "finishedAt" >= ${day} AND "state" IN ('done', 'failed') GROUP BY 1 ORDER BY 2 DESC`,
      this.prisma.problem.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.problem.count({ where: { status: 'draft', reviewNote: { not: null } } }),
      this.prisma.$queryRaw<{ t: Date; depth: bigint }[]>`
        SELECT b.t, COUNT(r."id") AS depth
        FROM generate_series(${new Date(trendStart)}::timestamp, ${new Date(trendStart + 11 * HOUR)}::timestamp, interval '1 hour') AS b(t)
        LEFT JOIN "code_runs" r ON r."queuedAt" <= b.t AND ((r."startedAt" IS NULL AND r."state" = 'queued') OR r."startedAt" > b.t)
        GROUP BY b.t ORDER BY b.t`,
    ]);

    const snapshot = this.gateway.queueSnapshot();
    const queued = snapshot.waiting.length;
    const online = workers.filter((worker) => worker.status === 'online');
    const capacity = online.reduce((sum, worker) => sum + worker.capacity, 0);
    const queueThreshold = Math.max(10, capacity * 5);
    const judge: State = !online.length ? 'down' : online.length < workers.length || snapshot.paused || queued > queueThreshold ? 'degraded' : 'healthy';
    const failedImages = images.filter((image) => image.status === 'failed');
    const runtime: State = failedImages.length ? 'degraded' : 'healthy';

    const count = (key: string) => Number(outcomes24h.find((row) => row.outcome === key)?.count ?? 0);
    const maxMs = Math.max(0, ...outcomes24h.map((row) => Number(row.max_ms ?? 0)));
    const avgS = hourStats[0]?.avg_ms === null || hourStats[0]?.avg_ms === undefined ? 0 : Math.round(Number(hourStats[0].avg_ms) / 100) / 10;
    const waitMs = Math.round(Number(hourStats[0]?.wait_ms ?? 0));

    const runtimes = byLanguage.map((row) => {
      const total = Number(row.total);
      const rate = total ? Math.round((Number(row.failed) / total) * 1000) / 10 : 0;
      const state: State = rate > RUNTIME_FAILURE_ALERT * 2 ? 'down' : rate > RUNTIME_FAILURE_ALERT ? 'degraded' : 'healthy';
      return { key: row.language, runtime: languageName(row.language), state, executions: total, failureRate: rate };
    });
    const failing = runtimes.filter((row) => row.failureRate > RUNTIME_FAILURE_ALERT && row.executions >= 20);

    const pipelineCount = (status: string) => pipeline.find((row) => row.status === status)?._count._all ?? 0;

    return {
      updatedAt: `${istStamp.format(now)} IST`,
      updatedAtMs: now,
      queueTrend: {
        labels: trendRows.map((row) => istTime.format(new Date(row.t))),
        values: trendRows.map((row) => Number(row.depth)),
        threshold: queueThreshold,
        current: queued,
      },
      services: [
        { key: 'judge', label: 'Judge', state: judge },
        { key: 'api', label: 'API', state: 'healthy' as State },
        { key: 'database', label: 'Database', state: db },
        { key: 'runtime', label: 'Runtime', state: runtime },
      ],
      judge: [
        { key: 'executionsPerMin', label: 'Executions / min', value: Math.round((recent5m / 5) * 10) / 10, tone: 'primary' },
        { key: 'queuedJobs', label: 'Queued jobs', value: queued, tone: queued > queueThreshold ? 'danger' : 'neutral' },
        { key: 'avgExecutionTime', label: 'Avg execution time', value: avgS, format: 'duration-s', tone: avgS > AVG_RUNTIME_ALERT_S ? 'danger' : 'success' },
        { key: 'containerStartup', label: 'Avg queue wait', value: waitMs, format: 'duration-ms', tone: 'neutral' },
      ],
      outcomes: [
        { key: 'successfulRuns', label: 'Successful runs', value: count('ok'), tone: 'success' },
        { key: 'compilationFailures', label: 'Compilation failures', value: count('ce'), tone: 'warning' },
        { key: 'runtimeFailures', label: 'Runtime failures', value: count('re') + count('mle'), tone: 'warning' },
        { key: 'timeouts', label: 'Timeouts', value: count('tle'), tone: 'warning' },
        { key: 'internalErrors', label: 'Internal errors', value: count('sandbox'), tone: 'danger' },
        { key: 'maxExecutionTime', label: 'Max execution time', value: Math.round(maxMs / 100) / 10, format: 'duration-s' },
      ],
      runtimes,
      alerts: [
        { key: 'judgeQueue', label: `Judge queue > ${queueThreshold}`, active: queued > queueThreshold },
        { key: 'runtimeFailureRate', label: failing.length ? `${failing.map((row) => row.runtime).join(', ')} failure rate > ${RUNTIME_FAILURE_ALERT}%` : `Runtime failure rate > ${RUNTIME_FAILURE_ALERT}%`, active: failing.length > 0 },
        { key: 'imageUnavailable', label: failedImages.length ? `${failedImages.map((image) => `${(image.data as { name?: string }).name}:${(image.data as { tag?: string }).tag}`).join(', ')} unavailable` : 'Runtime image unavailable', active: failedImages.length > 0 },
        { key: 'avgRuntime', label: `Average runtime > ${AVG_RUNTIME_ALERT_S} seconds`, active: avgS > AVG_RUNTIME_ALERT_S },
        { key: 'queuePaused', label: 'Judge queue paused', active: snapshot.paused },
        { key: 'judgeOffline', label: 'Judge service offline', active: !online.length },
      ],
      pipeline: [
        { key: 'draft', label: 'Draft', value: pipelineCount('draft') - validationFailed },
        { key: 'underReview', label: 'Under review', value: pipelineCount('review'), tone: 'primary' },
        { key: 'validationFailed', label: 'Sent back from review', value: validationFailed, tone: 'danger' },
        { key: 'readyToPublish', label: 'Ready to publish', value: pipelineCount('ready'), tone: 'success' },
        { key: 'published', label: 'Published', value: pipelineCount('published'), tone: 'success' },
        { key: 'deprecated', label: 'Deprecated', value: pipelineCount('deprecated') },
      ],
    };
  }
}