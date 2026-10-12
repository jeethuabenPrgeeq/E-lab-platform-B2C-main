import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { JudgeGateway } from '../../judge/judge-gateway.service.js';
import { JudgeSettingsService } from '../../judge/judge-settings.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';

export interface WorkerInput {
  name: string;
  host: string;
  capacity: number;
  version?: string;
}

const JOB_SELECT = {
  id: true,
  kind: true,
  state: true,
  priority: true,
  problemSlug: true,
  language: true,
  workerId: true,
  error: true,
  queuedAt: true,
  startedAt: true,
  finishedAt: true,
  user: { select: { name: true, email: true } },
} as const;

function normalizeHost(host: string) {
  const trimmed = host.trim().replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new BadRequestException('Enter the worker URL, like http://10.0.0.12:4100');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BadRequestException('The worker URL must start with http:// or https://');
  return `${url.protocol}//${url.host}${url.pathname === '/' ? '' : url.pathname}`;
}

@Injectable()
export class JudgeAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: JudgeGateway,
    private readonly settings: JudgeSettingsService,
    private readonly audit: AuditService,
  ) {}

  private async actorName(actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    return { id: actor.id, name: user?.name ?? actor.email };
  }

  async workers() {
    const rows = await this.prisma.judgeWorker.findMany({ orderBy: { createdAt: 'asc' } });
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const stats = await this.prisma.codeRun.groupBy({ by: ['workerId'], where: { finishedAt: { gte: since }, workerId: { not: null } }, _count: { _all: true }, _avg: { durationMs: true } });
    const byWorker = new Map(stats.map((row) => [row.workerId, row]));
    return rows.map((row) => {
      const running = this.gateway.runningOn(row.id);
      return {
        id: row.id,
        name: row.name,
        host: row.host,
        capacity: row.capacity,
        running,
        utilization: row.capacity ? Math.round((running / row.capacity) * 100) : 0,
        cpu: null,
        memory: null,
        version: row.version,
        status: row.status,
        heartbeatAt: row.lastHeartbeatAt?.toISOString() ?? '',
        lastError: row.lastError,
        jobsLastHour: byWorker.get(row.id)?._count._all ?? 0,
        avgDurationMs: Math.round(byWorker.get(row.id)?._avg.durationMs ?? 0),
      };
    });
  }

  async overview() {
    const [workers, jobs, limits, effective] = await Promise.all([this.workers(), this.jobs(), this.settings.limits(), this.settings.effective()]);
    return { workers, ...jobs, limits, effective };
  }

  async jobs() {
    const snapshot = this.gateway.queueSnapshot();
    const position = new Map(snapshot.waiting.map((item) => [item.runId, item.position]));
    const [active, failed, counts] = await Promise.all([
      this.prisma.codeRun.findMany({ where: { state: { in: ['queued', 'running'] } }, orderBy: { queuedAt: 'asc' }, select: JOB_SELECT, take: 200 }),
      this.prisma.codeRun.findMany({ where: { state: 'failed', finishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, orderBy: { finishedAt: 'desc' }, select: JOB_SELECT, take: 100 }),
      this.prisma.codeRun.groupBy({ by: ['state'], where: { queuedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, _count: { _all: true } }),
    ]);
    const present = (row: (typeof active)[number]) => ({
      id: row.id,
      kind: row.kind,
      problem: row.problemSlug,
      language: row.language,
      learner: row.user?.name ?? 'System',
      learnerEmail: row.user?.email ?? null,
      state: row.state,
      priority: row.priority,
      position: position.get(row.id) ?? null,
      workerId: row.workerId ?? '',
      queuedAt: row.queuedAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? '',
      error: row.error ?? '',
    });
    return {
      queuePaused: snapshot.paused,
      jobs: [...active, ...failed].map(present),
      last24h: Object.fromEntries(counts.map((row) => [row.state, row._count._all])),
    };
  }

  private async assertUniqueHost(host: string, exceptId?: string) {
    const clash = await this.prisma.judgeWorker.findUnique({ where: { host } });
    if (clash && clash.id !== exceptId) throw new ConflictException('A worker with this URL already exists.');
  }

  private validate(input: WorkerInput) {
    const name = String(input.name ?? '').trim();
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/i.test(name)) throw new BadRequestException('Name: 2 to 40 letters, numbers or dashes');
    const capacity = Number(input.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 64) throw new BadRequestException('Capacity: whole number from 1 to 64');
    return { name, host: normalizeHost(String(input.host ?? '')), capacity, version: String(input.version ?? '').trim().slice(0, 40) };
  }

  async addWorker(input: WorkerInput, actor: AdminActor) {
    const data = this.validate(input);
    await this.assertUniqueHost(data.host);
    const worker = await this.prisma.$transaction(async (tx) => {
      const row = await tx.judgeWorker.create({ data: { ...data, status: 'offline' } });
      await this.audit.record(tx, actor, { action: 'judge.worker_add', entityType: 'judge_worker', entityId: row.id, summary: `Added judge worker ${row.name} (${row.host})` });
      return row;
    });
    await this.gateway.refreshWorkers();
    const health = await this.gateway.checkWorker(worker);
    return { worker: (await this.workers()).find((item) => item.id === worker.id), reachable: health?.ok ?? false };
  }

  async updateWorker(id: string, input: WorkerInput, actor: AdminActor) {
    const current = await this.prisma.judgeWorker.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Worker not found.');
    const data = this.validate(input);
    await this.assertUniqueHost(data.host, id);
    const changes = (['name', 'host', 'capacity', 'version'] as const).filter((key) => String(current[key]) !== String(data[key])).map((key) => ({ field: key, before: String(current[key]), after: String(data[key]) }));
    if (!changes.length) return (await this.workers()).find((item) => item.id === id);
    await this.prisma.$transaction(async (tx) => {
      await tx.judgeWorker.update({ where: { id }, data });
      await this.audit.record(tx, actor, { action: 'judge.worker_edit', entityType: 'judge_worker', entityId: id, summary: `Edited judge worker ${data.name}`, changes });
    });
    await this.gateway.refreshWorkers();
    if (current.host !== data.host) await this.gateway.checkWorker({ id, host: data.host });
    return (await this.workers()).find((item) => item.id === id);
  }

  async removeWorker(id: string, actor: AdminActor) {
    const worker = await this.prisma.judgeWorker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException('Worker not found.');
    if (this.gateway.runningOn(id) > 0) throw new ConflictException('This worker is still running jobs. Drain it and wait for them to finish.');
    if ((await this.prisma.judgeWorker.count()) === 1) throw new ConflictException('Keep at least one judge worker.');
    await this.prisma.$transaction(async (tx) => {
      await tx.judgeWorker.delete({ where: { id } });
      await this.audit.record(tx, actor, { action: 'judge.worker_remove', entityType: 'judge_worker', entityId: id, summary: `Removed judge worker ${worker.name}` });
    });
    await this.gateway.refreshWorkers();
    return { deleted: true };
  }

  async toggleDrain(id: string, actor: AdminActor) {
    const worker = await this.prisma.judgeWorker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException('Worker not found.');
    const draining = worker.status !== 'draining';
    if (draining) {
      const others = await this.prisma.judgeWorker.count({ where: { id: { not: id }, status: 'online' } });
      if (others === 0) throw new ConflictException('This is the only online worker. Add or bring another worker online first, or pause the queue instead.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.judgeWorker.update({ where: { id }, data: { status: draining ? 'draining' : 'offline' } });
      await this.audit.record(tx, actor, { action: draining ? 'judge.worker_drain' : 'judge.worker_undrain', entityType: 'judge_worker', entityId: id, summary: `${draining ? 'Started draining' : 'Stopped draining'} ${worker.name}` });
    });
    await this.gateway.refreshWorkers();
    if (!draining) await this.gateway.checkWorker(worker);
    return (await this.workers()).find((item) => item.id === id);
  }

  async restart(id: string, actor: AdminActor) {
    const worker = await this.prisma.judgeWorker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException('Worker not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.judgeWorker.update({ where: { id }, data: { status: 'restarting' } });
      await this.audit.record(tx, actor, { action: 'judge.worker_reconnect', entityType: 'judge_worker', entityId: id, summary: `Reconnected judge worker ${worker.name}` });
    });
    await this.gateway.refreshWorkers();
    const health = await this.gateway.checkWorker(worker);
    return { worker: (await this.workers()).find((item) => item.id === id), reachable: health?.ok ?? false };
  }

  async check(id: string) {
    const worker = await this.prisma.judgeWorker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException('Worker not found.');
    const health = await this.gateway.checkWorker(worker);
    return { worker: (await this.workers()).find((item) => item.id === id), reachable: health?.ok ?? false, languages: health && health.ok ? health.languages : [] };
  }

  async retry(id: string, actor: AdminActor) {
    const result = await this.gateway.retry(id);
    await this.audit.record(this.prisma, actor, { action: 'judge.job_retry', entityType: 'code_run', entityId: id, summary: 'Retried a failed judge job' });
    return result;
  }

  async retryAllFailed(actor: AdminActor) {
    const failed = await this.prisma.codeRun.findMany({ where: { state: 'failed', finishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, select: { id: true }, take: 100 });
    for (const row of failed) await this.gateway.retry(row.id).catch(() => undefined);
    await this.audit.record(this.prisma, actor, { action: 'judge.job_retry_all', entityType: 'code_run', entityId: 'bulk', summary: `Retried ${failed.length} failed judge job${failed.length === 1 ? '' : 's'}` });
    return { retried: failed.length };
  }

  async cancel(id: string, actor: AdminActor) {
    const row = await this.prisma.codeRun.findUnique({ where: { id }, select: { state: true } });
    if (!row) throw new NotFoundException('Job not found.');
    if (row.state === 'running') throw new ConflictException('This job is already running on a worker and will finish in a few seconds.');
    if (row.state === 'failed') {
      await this.prisma.codeRun.update({ where: { id }, data: { state: 'cancelled', error: 'Dismissed by an admin' } });
    } else if (!this.gateway.cancel(id)) throw new ConflictException('This job is no longer waiting in the queue.');
    await this.audit.record(this.prisma, actor, { action: 'judge.job_cancel', entityType: 'code_run', entityId: id, summary: row.state === 'failed' ? 'Dismissed a failed judge job' : 'Cancelled a queued judge job' });
    return { id, state: 'cancelled' };
  }

  async prioritize(id: string, actor: AdminActor) {
    const row = await this.prisma.codeRun.findUnique({ where: { id }, select: { state: true } });
    if (!row) throw new NotFoundException('Job not found.');
    if (row.state !== 'queued' || !this.gateway.prioritize(id)) throw new ConflictException('Only jobs waiting in the queue can be prioritised.');
    await this.prisma.codeRun.update({ where: { id }, data: { priority: 'high' } });
    await this.audit.record(this.prisma, actor, { action: 'judge.job_prioritize', entityType: 'code_run', entityId: id, summary: 'Moved a queued job to high priority' });
    return { id, priority: 'high' };
  }

  async setPaused(paused: boolean, actor: AdminActor) {
    if (this.gateway.isPaused() === paused) return { queuePaused: paused };
    const by = await this.actorName(actor);
    await this.settings.setQueuePaused(paused, by);
    this.gateway.setPaused(paused);
    await this.audit.record(this.prisma, actor, { action: paused ? 'judge.queue_pause' : 'judge.queue_resume', entityType: 'judge_settings', entityId: 'queue', summary: paused ? 'Paused the judge queue' : 'Resumed the judge queue' });
    return { queuePaused: paused };
  }

  async saveLimits(input: Record<string, unknown>, actor: AdminActor) {
    const next = this.settings.validateLimits(input);
    const current = await this.settings.limits();
    const changes = (Object.keys(next) as (keyof typeof next)[]).filter((key) => current[key] !== next[key]).map((key) => ({ field: key, before: String(current[key]), after: String(next[key]) }));
    if (!changes.length) return { limits: current, effective: await this.settings.effective() };
    const by = await this.actorName(actor);
    await this.settings.saveLimits(next, by);
    await this.audit.record(this.prisma, actor, { action: 'judge.limits', entityType: 'judge_settings', entityId: 'limits', summary: `Changed judge limits: ${changes.map((change) => change.field).join(', ')}`, changes });
    return { limits: await this.settings.limits(), effective: await this.settings.effective() };
  }
}