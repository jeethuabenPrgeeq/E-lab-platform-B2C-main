import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { JudgeSettingsService } from '../../judge/judge-settings.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { OUTCOMES, RUN_INCLUDE, languageName, outcomeOf, problemTitles, type RunRow } from './runs.js';

export const ALERT_RULES = [
  { id: 'sandbox-errors', threshold: 5, min: 1, max: 1000 },
  { id: 'p95-latency', threshold: 1200, min: 100, max: 60000 },
  { id: 'tle-rate', threshold: 15, min: 1, max: 100 },
  { id: 're-rate', threshold: 14, min: 1, max: 100 },
  { id: 'low-volume', threshold: 0, min: 0, max: 10000 },
] as const;

type RuleId = (typeof ALERT_RULES)[number]['id'];

interface AlertState {
  thresholds: Record<string, number>;
  acks: Record<string, { ackedEvent?: number; silencedUntil?: number; by?: string }>;
}

const MIN = 60_000;
const TIMED_EXCLUDE = new Set(['tle', 'ce', 'sandbox']);
const FAILURE = new Set(['tle', 'mle', 're', 'sandbox']);

export interface ExecQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  kind?: 'run' | 'submit';
  outcome?: string;
  language?: string;
  range?: '15m' | '1h' | '6h' | '24h' | '7d';
}

const RANGE_MS = { '15m': 15 * MIN, '1h': 60 * MIN, '6h': 360 * MIN, '24h': 1440 * MIN, '7d': 7 * 1440 * MIN };

@Injectable()
export class ExecutionsMonitorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: JudgeSettingsService,
    private readonly audit: AuditService,
  ) {}

  private async present(rows: RunRow[], full: boolean) {
    const [titles, limits] = await Promise.all([problemTitles(this.prisma, rows.map((row) => row.problemSlug)), this.settings.effective()]);
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      state: row.state,
      problem: titles.get(row.problemSlug)?.title ?? row.problemSlug,
      problemSlug: row.problemSlug,
      language: languageName(row.language),
      learner: row.user?.name ?? 'System',
      learnerEmail: row.user?.email ?? null,
      worker: row.worker?.name ?? '—',
      startedAt: (row.startedAt ?? row.queuedAt).getTime(),
      queuedMs: row.startedAt ? row.startedAt.getTime() - row.queuedAt.getTime() : null,
      durationMs: row.durationMs ?? 0,
      memoryMb: null,
      timeLimitMs: limits.timeLimitMs,
      memoryLimitMb: limits.memoryLimitMb,
      exitCode: row.exitCode,
      outcome: outcomeOf(row),
      testsPassed: row.testsPassed ?? 0,
      testsTotal: row.testsTotal ?? 0,
      stdout: full ? (row.stdout ?? '') : (row.stdout ?? '').slice(0, 300),
      stderr: full ? (row.stderr ?? row.error ?? '') : (row.stderr ?? row.error ?? '').slice(0, 300),
      error: row.error,
      ...(full ? { code: row.code, input: row.input, results: row.results } : {}),
    }));
  }

  async snapshot(minutesBack = 1440) {
    const span = Math.min(Math.max(Math.round(minutesBack), 15), 1440);
    const now = Date.now();
    const since = new Date(Math.floor((now - span * MIN) / MIN) * MIN);
    const grouped = await this.prisma.$queryRaw<{ t: Date; language: string; outcome: string; count: bigint; duration_sum: number | null; durations: number[] | null }[]>`
      SELECT date_trunc('minute', "finishedAt") AS t,
             "language",
             CASE WHEN "state" = 'failed' THEN 'sandbox' ELSE COALESCE("outcome", 'sandbox') END AS outcome,
             COUNT(*) AS count,
             SUM("durationMs") AS duration_sum,
             array_agg("durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS durations
      FROM "code_runs"
      WHERE "finishedAt" >= ${since} AND "state" IN ('done', 'failed')
      GROUP BY 1, 2, 3`;
    const buckets = new Map<number, { t: number; count: number; outcomes: Record<string, number>; durations: number[]; languages: Record<string, { count: number; failures: number; timed: number; durationSum: number }> }>();
    for (const row of grouped) {
      const t = new Date(row.t).getTime();
      const bucket = buckets.get(t) ?? { t, count: 0, outcomes: Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0])), durations: [], languages: {} };
      const count = Number(row.count);
      bucket.count += count;
      bucket.outcomes[row.outcome] = (bucket.outcomes[row.outcome] ?? 0) + count;
      const name = languageName(row.language);
      const lang = bucket.languages[name] ?? { count: 0, failures: 0, timed: 0, durationSum: 0 };
      lang.count += count;
      if (FAILURE.has(row.outcome)) lang.failures += count;
      if (!TIMED_EXCLUDE.has(row.outcome) && row.durations) {
        bucket.durations.push(...row.durations);
        lang.timed += row.durations.length;
        lang.durationSum += Number(row.duration_sum ?? 0);
      }
      bucket.languages[name] = lang;
      buckets.set(t, bucket);
    }
    const minutes: (typeof buckets extends Map<number, infer V> ? V : never)[] = [];
    for (let t = since.getTime(); t <= now; t += MIN) {
      const bucket = buckets.get(t) ?? { t, count: 0, outcomes: Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0])), durations: [], languages: {} };
      bucket.durations.sort((a, b) => a - b);
      minutes.push(bucket);
    }
    const recentRows = await this.prisma.codeRun.findMany({ where: { state: { in: ['done', 'failed'] } }, orderBy: { finishedAt: 'desc' }, take: 50, include: RUN_INCLUDE });
    return { minutes, recent: await this.present(recentRows, false), now, epoch: Math.floor(now / MIN) };
  }

  async list(query: ExecQuery) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const and: Prisma.CodeRunWhereInput[] = [{ state: { in: ['done', 'failed', 'running', 'queued'] } }, { queuedAt: { gte: new Date(Date.now() - RANGE_MS[query.range ?? '24h']) } }];
    if (query.kind) and.push({ kind: query.kind });
    if (query.language) and.push({ language: query.language });
    if (query.outcome === 'sandbox') and.push({ OR: [{ state: 'failed' }, { outcome: 'sandbox' }] });
    else if (query.outcome) and.push({ outcome: query.outcome, state: 'done' });
    if (query.q) and.push({ OR: [{ id: { contains: query.q } }, { problemSlug: { contains: query.q, mode: 'insensitive' } }, { user: { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] } }] });
    const where = { AND: and };
    const [rows, total] = await Promise.all([this.prisma.codeRun.findMany({ where, orderBy: { queuedAt: 'desc' }, skip, take, include: RUN_INCLUDE }), this.prisma.codeRun.count({ where })]);
    return { items: await this.present(rows, false), total, page, pageSize };
  }

  async get(id: string) {
    const row = await this.prisma.codeRun.findUnique({ where: { id }, include: RUN_INCLUDE });
    if (!row) throw new NotFoundException('Execution not found.');
    return (await this.present([row], true))[0];
  }

  private async alertState(): Promise<AlertState & { updatedBy: string | null }> {
    const row = await this.prisma.platformSetting.findUnique({ where: { section: 'exec_alerts' } });
    const stored = (row?.values ?? {}) as Partial<AlertState>;
    const thresholds = Object.fromEntries(ALERT_RULES.map((rule) => [rule.id, stored.thresholds?.[rule.id] ?? rule.threshold]));
    return { thresholds, acks: stored.acks ?? {}, updatedBy: row?.updatedByName ?? null };
  }

  private async saveAlertState(state: AlertState, actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    const data = { values: { thresholds: state.thresholds, acks: state.acks } as unknown as Prisma.InputJsonValue, updatedById: actor.id, updatedByName: user?.name ?? actor.email };
    await this.prisma.platformSetting.upsert({ where: { section: 'exec_alerts' }, create: { section: 'exec_alerts', ...data }, update: data });
  }

  async alerts() {
    const state = await this.alertState();
    const now = Date.now();
    const acks = Object.fromEntries(Object.entries(state.acks).map(([ruleId, ack]) => [ruleId, { ...ack, silencedUntil: ack.silencedUntil && ack.silencedUntil > now ? ack.silencedUntil : undefined }]));
    return { rules: ALERT_RULES.map((rule) => ({ id: rule.id, threshold: state.thresholds[rule.id], defaultThreshold: rule.threshold, min: rule.min, max: rule.max })), acks };
  }

  private assertRule(ruleId: string): RuleId {
    if (!ALERT_RULES.some((rule) => rule.id === ruleId)) throw new NotFoundException('Unknown alert rule.');
    return ruleId as RuleId;
  }

  async setThreshold(ruleId: string, threshold: number, actor: AdminActor) {
    const rule = ALERT_RULES.find((item) => item.id === this.assertRule(ruleId))!;
    if (!Number.isFinite(threshold) || threshold < rule.min || threshold > rule.max) throw new BadRequestException(`Threshold must be from ${rule.min} to ${rule.max}.`);
    const state = await this.alertState();
    const before = state.thresholds[ruleId];
    if (before === threshold) return this.alerts();
    state.thresholds[ruleId] = threshold;
    await this.saveAlertState(state, actor);
    await this.audit.record(this.prisma, actor, { action: 'exec.alert_threshold', entityType: 'judge_settings', entityId: ruleId, summary: `Changed the ${ruleId} alert threshold`, changes: [{ field: ruleId, before: String(before), after: String(threshold) }] });
    return this.alerts();
  }

  async acknowledge(ruleId: string, eventStart: number, actor: AdminActor) {
    this.assertRule(ruleId);
    if (!Number.isInteger(eventStart) || eventStart <= 0) throw new BadRequestException('Pass the start time of the alert you are acknowledging.');
    const state = await this.alertState();
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    await this.saveAlertState({ ...state, acks: { ...state.acks, [ruleId]: { ...state.acks[ruleId], ackedEvent: eventStart, by: user?.name ?? actor.email } } }, actor);
    await this.audit.record(this.prisma, actor, { action: 'exec.alert_ack', entityType: 'judge_settings', entityId: ruleId, summary: `Acknowledged the ${ruleId} alert` });
    return this.alerts();
  }

  async silence(ruleId: string, minutes: number | null, actor: AdminActor) {
    this.assertRule(ruleId);
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440)) throw new BadRequestException('Silence for 5 to 1440 minutes.');
    const state = await this.alertState();
    await this.saveAlertState({ ...state, acks: { ...state.acks, [ruleId]: { ...state.acks[ruleId], silencedUntil: minutes === null ? undefined : Date.now() + minutes * MIN } } }, actor);
    await this.audit.record(this.prisma, actor, { action: minutes === null ? 'exec.alert_unsilence' : 'exec.alert_silence', entityType: 'judge_settings', entityId: ruleId, summary: minutes === null ? `Unsilenced the ${ruleId} alert` : `Silenced the ${ruleId} alert for ${minutes} min` });
    return this.alerts();
  }
}