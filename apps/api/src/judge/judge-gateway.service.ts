import { ConflictException, HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JudgeSettingsService, type JudgeLimits } from './judge-settings.service.js';

export type RunKind = 'run' | 'submit';

export interface JobPayload {
  kind: RunKind;
  userId: string | null;
  problemSlug: string;
  language: string;
  workspaceType: string;
  code: string;
  input?: string | null;
  priority?: 'normal' | 'high';
  rejudgeJobId?: string | null;
  rejudgeOfId?: string | null;
}

export interface RunRecord {
  outcome: string;
  verdict?: string | null;
  testsPassed?: number | null;
  testsTotal?: number | null;
  exitCode?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  results?: unknown;
}

export type Executor = (job: JobPayload, judgeUrl: string, limits: JudgeLimits) => Promise<{ response: unknown; record: RunRecord }>;

interface Worker {
  id: string;
  host: string;
  capacity: number;
  status: string;
}

interface Waiter {
  runId: string;
  priority: 'normal' | 'high';
  at: number;
  resolve: (worker: Worker) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

const QUEUE_WAIT_MS = 60_000;
const HEARTBEAT_MS = 15_000;
const HEALTH_TIMEOUT_MS = 3_000;
const TEXT_LIMIT = 8_000;

const clip = (value: string | null | undefined) => (value == null ? null : value.length > TEXT_LIMIT ? `${value.slice(0, TEXT_LIMIT)}\n…truncated` : value);

class CancelledError extends ConflictException {
  constructor() {
    super('This job was cancelled by an admin.');
  }
}

@Injectable()
export class JudgeGateway implements OnModuleInit, OnModuleDestroy {
  private readonly executors = new Map<RunKind, Executor>();
  private readonly running = new Map<string, number>();
  private waiting: Waiter[] = [];
  private workers: Worker[] = [];
  private paused = false;
  private heartbeat?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: JudgeSettingsService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.judgeWorker.count();
    if (count === 0) {
      await this.prisma.judgeWorker.create({ data: { name: 'judge-1', host: (process.env.JUDGE_URL ?? 'http://127.0.0.1:4100').replace(/\/+$/, ''), capacity: 4 } });
    }
    await this.prisma.codeRun.updateMany({
      where: { state: { in: ['queued', 'running'] } },
      data: { state: 'failed', error: 'Interrupted by an API restart', finishedAt: new Date() },
    });
    this.paused = await this.settings.queuePaused();
    await this.refreshWorkers();
    void this.checkHealth();
    this.heartbeat = setInterval(() => void this.checkHealth(), HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);
  }

  register(kind: RunKind, executor: Executor) {
    this.executors.set(kind, executor);
  }

  async execute(job: JobPayload) {
    if (job.userId && !job.rejudgeJobId) await this.assertWithinLimits(job);
    const row = await this.prisma.codeRun.create({
      data: {
        kind: job.kind,
        priority: job.priority ?? 'normal',
        userId: job.userId,
        problemSlug: job.problemSlug,
        language: job.language,
        workspaceType: job.workspaceType,
        code: job.code,
        input: job.input ?? null,
        rejudgeJobId: job.rejudgeJobId ?? null,
        rejudgeOfId: job.rejudgeOfId ?? null,
      },
    });
    return this.process(row.id, job);
  }

  async retry(runId: string) {
    const row = await this.prisma.codeRun.findUnique({ where: { id: runId } });
    if (!row) throw new HttpException('Job not found.', HttpStatus.NOT_FOUND);
    if (row.state !== 'failed') throw new ConflictException('Only failed jobs can be retried.');
    await this.prisma.codeRun.update({
      where: { id: runId },
      data: { state: 'queued', error: null, workerId: null, startedAt: null, finishedAt: null, queuedAt: new Date() },
    });
    const job: JobPayload = { kind: row.kind, userId: row.userId, problemSlug: row.problemSlug, language: row.language, workspaceType: row.workspaceType, code: row.code, input: row.input, priority: row.priority === 'high' ? 'high' : 'normal', rejudgeJobId: row.rejudgeJobId, rejudgeOfId: row.rejudgeOfId };
    void this.process(runId, job).catch(() => undefined);
    return { id: runId, state: 'queued' };
  }

  private async process(runId: string, job: JobPayload) {
    const executor = this.executors.get(job.kind);
    if (!executor) throw new ServiceUnavailableException('The judge is not ready yet.');
    let worker: Worker;
    try {
      worker = await this.acquire(runId, job.priority ?? 'normal');
    } catch (error) {
      const cancelled = error instanceof CancelledError;
      await this.prisma.codeRun.update({
        where: { id: runId },
        data: { state: cancelled ? 'cancelled' : 'failed', error: cancelled ? 'Cancelled by an admin' : 'Timed out waiting for a judge worker', finishedAt: new Date() },
      });
      throw error;
    }
    const started = Date.now();
    await this.prisma.codeRun.update({ where: { id: runId }, data: { state: 'running', workerId: worker.id, startedAt: new Date(started) } });
    try {
      const limits = await this.settings.effective();
      const { response, record } = await executor(job, worker.host, limits);
      await this.prisma.codeRun.update({
        where: { id: runId },
        data: {
          state: 'done',
          outcome: record.outcome,
          verdict: record.verdict ?? null,
          testsPassed: record.testsPassed ?? null,
          testsTotal: record.testsTotal ?? null,
          exitCode: record.exitCode ?? null,
          stdout: clip(record.stdout),
          stderr: clip(record.stderr),
          results: record.results === undefined ? undefined : (record.results as Prisma.InputJsonValue),
          durationMs: Date.now() - started,
          finishedAt: new Date(),
        },
      });
      return { runId, response };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Judge failed';
      await this.prisma.codeRun.update({ where: { id: runId }, data: { state: 'failed', error: message.slice(0, 500), durationMs: Date.now() - started, finishedAt: new Date() } });
      if (!(error instanceof HttpException) || error.getStatus() >= 500) void this.checkWorker(worker);
      throw error;
    } finally {
      this.release(worker.id);
    }
  }

  private async assertWithinLimits(job: JobPayload) {
    const limits = await this.settings.effective();
    const [active, recent] = await Promise.all([
      this.prisma.codeRun.count({ where: { userId: job.userId, state: { in: ['queued', 'running'] } } }),
      job.kind === 'submit' ? this.prisma.codeRun.count({ where: { userId: job.userId, kind: 'submit', queuedAt: { gte: new Date(Date.now() - 60_000) } } }) : Promise.resolve(0),
    ]);
    if (active >= limits.maxConcurrentPerLearner) throw new HttpException(`You already have ${active} run${active === 1 ? '' : 's'} in progress. Wait for ${active === 1 ? 'it' : 'them'} to finish.`, HttpStatus.TOO_MANY_REQUESTS);
    if (recent >= limits.submissionsPerMinute) throw new HttpException(`You can submit ${limits.submissionsPerMinute} times a minute. Try again shortly.`, HttpStatus.TOO_MANY_REQUESTS);
  }

  private pick(): Worker | null {
    let best: Worker | null = null;
    let bestLoad = Infinity;
    for (const worker of this.workers) {
      if (worker.status !== 'online') continue;
      const busy = this.running.get(worker.id) ?? 0;
      if (busy >= worker.capacity) continue;
      const load = busy / worker.capacity;
      if (load < bestLoad) {
        best = worker;
        bestLoad = load;
      }
    }
    return best;
  }

  private take(worker: Worker) {
    this.running.set(worker.id, (this.running.get(worker.id) ?? 0) + 1);
    return worker;
  }

  private acquire(runId: string, priority: 'normal' | 'high'): Promise<Worker> {
    if (!this.paused && this.waiting.length === 0) {
      const worker = this.pick();
      if (worker) return Promise.resolve(this.take(worker));
    }
    return new Promise<Worker>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting = this.waiting.filter((item) => item.runId !== runId);
        reject(new ServiceUnavailableException(this.paused ? 'Judging is paused for maintenance. Try again in a few minutes.' : 'All judge workers are busy. Try again in a minute.'));
      }, QUEUE_WAIT_MS);
      timer.unref();
      this.waiting.push({ runId, priority, at: Date.now(), resolve, reject, timer });
      this.sortWaiting();
    });
  }

  private sortWaiting() {
    this.waiting.sort((a, b) => (a.priority === b.priority ? a.at - b.at : a.priority === 'high' ? -1 : 1));
  }

  private release(workerId: string) {
    this.running.set(workerId, Math.max(0, (this.running.get(workerId) ?? 1) - 1));
    this.pump();
  }

  private pump() {
    while (!this.paused && this.waiting.length) {
      const worker = this.pick();
      if (!worker) return;
      const next = this.waiting.shift()!;
      clearTimeout(next.timer);
      next.resolve(this.take(worker));
    }
  }

  cancel(runId: string) {
    const waiter = this.waiting.find((item) => item.runId === runId);
    if (!waiter) return false;
    this.waiting = this.waiting.filter((item) => item.runId !== runId);
    clearTimeout(waiter.timer);
    waiter.reject(new CancelledError());
    return true;
  }

  prioritize(runId: string) {
    const waiter = this.waiting.find((item) => item.runId === runId);
    if (!waiter) return false;
    waiter.priority = 'high';
    this.sortWaiting();
    return true;
  }

  isPaused() {
    return this.paused;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) this.pump();
  }

  queueSnapshot() {
    return {
      paused: this.paused,
      waiting: this.waiting.map((item, index) => ({ runId: item.runId, position: index + 1, priority: item.priority, waitingMs: Date.now() - item.at })),
      running: Object.fromEntries(this.running),
    };
  }

  runningOn(workerId: string) {
    return this.running.get(workerId) ?? 0;
  }

  async refreshWorkers() {
    const rows = await this.prisma.judgeWorker.findMany({ select: { id: true, host: true, capacity: true, status: true } });
    this.workers = rows;
    this.pump();
  }

  private async probe(host: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const response = await fetch(`${host}/health`, { signal: controller.signal });
      if (!response.ok) return { ok: false as const, error: `Health check returned ${response.status}` };
      const body = (await response.json().catch(() => ({}))) as { version?: string; supportedLanguages?: string[] };
      return { ok: true as const, version: body.version ?? null, languages: body.supportedLanguages ?? [] };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error && error.name === 'AbortError' ? 'Health check timed out' : 'Cannot reach the worker' };
    } finally {
      clearTimeout(timer);
    }
  }

  async checkWorker(worker: { id: string; host: string }) {
    const row = await this.prisma.judgeWorker.findUnique({ where: { id: worker.id } });
    if (!row) return;
    const result = await this.probe(row.host);
    const status = result.ok ? (row.status === 'draining' ? 'draining' : 'online') : row.status === 'draining' ? 'draining' : 'offline';
    await this.prisma.judgeWorker.update({
      where: { id: row.id },
      data: result.ok
        ? { status, lastHeartbeatAt: new Date(), lastError: null, ...(result.version ? { version: result.version } : {}) }
        : { status, lastError: result.error },
    });
    const cached = this.workers.find((item) => item.id === row.id);
    if (cached) cached.status = status;
    this.pump();
    return result;
  }

  async checkHealth() {
    const rows = await this.prisma.judgeWorker.findMany({ select: { id: true, host: true } });
    await Promise.all(rows.map((row) => this.checkWorker(row).catch(() => undefined)));
  }
}