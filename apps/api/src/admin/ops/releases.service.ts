import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { ms, OpsDirectory } from './ops.common.js';

export const RELEASE_TYPES = ['feature', 'fix', 'hotfix', 'runtime'] as const;
export const CHANGE_KINDS = ['added', 'changed', 'fixed'] as const;
export const STAGES = [5, 25, 50, 100];
export const VERSION_PATTERN = /^\d{4}\.(0?[1-9]|1[0-2])\.\d{1,3}$/;
export const CHECKLIST = [
  { id: 'tests', label: 'CI tests and judge regression suite pass' },
  { id: 'staging', label: 'Verified on staging by QA' },
  { id: 'migrations', label: 'Database migrations reviewed and reversible' },
  { id: 'rollback', label: 'Rollback plan written' },
  { id: 'notes', label: 'Release notes ready for institutions' },
] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];
type Tone = 'success' | 'warning' | 'danger' | 'primary' | 'neutral';
export interface Check {
  id: string;
  label: string;
  done: boolean;
}

const TICK_MS = 30_000;
const ACTIVE = ['rolling', 'paused'];
const SYSTEM = 'Release bot';

const INCLUDE = { events: { orderBy: { at: 'asc' } } } as const satisfies Prisma.ReleaseInclude;
type Row = Prisma.ReleaseGetPayload<{ include: typeof INCLUDE }>;

export function compareVersions(a: string, b: string) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

@Injectable()
export class ReleasesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReleasesService.name);
  private timer?: NodeJS.Timeout;
  private ticking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly directory: OpsDirectory,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private present(row: Row) {
    const checklist = row.checklist as unknown as Check[];
    return {
      id: row.id,
      version: row.version,
      title: row.title,
      type: row.type,
      status: row.status,
      owner: row.ownerName,
      ownerId: row.ownerId,
      stage: row.stage,
      percent: STAGES[row.stage] ?? 100,
      stageMinutes: row.stageMinutes,
      stageAt: ms(row.stageAt),
      nextStageAt: row.status === 'rolling' && row.stageAt && row.stage < STAGES.length - 1 ? row.stageAt.getTime() + row.stageMinutes * 60_000 : null,
      scheduledAt: ms(row.scheduledAt),
      startedAt: ms(row.startedAt),
      completedAt: ms(row.completedAt),
      changes: row.changes,
      checklist,
      events: row.events.map((event) => ({ id: event.id, at: event.at.getTime(), actor: event.actorName, text: event.text, tone: event.tone })),
      createdAt: row.createdAt.getTime(),
    };
  }

  private async load(id: string) {
    const row = await this.prisma.release.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException('Release not found.');
    return row;
  }

  async list(query: { status?: string; q?: string }) {
    const where: Prisma.ReleaseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ version: { contains: query.q } }, { title: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };
    const rows = await this.prisma.release.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, take: 200 });
    rows.sort((a, b) => compareVersions(b.version, a.version));
    const all = await this.prisma.release.findMany({ select: { version: true, status: true } });
    const live = all.filter((row) => row.status === 'live').sort((a, b) => compareVersions(b.version, a.version))[0]?.version ?? null;
    const latest = all.sort((a, b) => compareVersions(b.version, a.version))[0]?.version ?? null;
    return { items: rows.map((row) => this.present(row)), current: live, latest, stages: STAGES, checklist: CHECKLIST };
  }

  async get(id: string) {
    return this.present(await this.load(id));
  }

  async create(input: { version: string; title: string; type: ReleaseType; ownerId: string; changes: { kind: string; text: string }[]; stageMinutes?: number }, actor: AdminActor) {
    const version = input.version.trim();
    if (!VERSION_PATTERN.test(version)) throw new BadRequestException({ message: 'Use the YYYY.M.n format, for example 2026.10.2.', issues: { version: 'Use YYYY.M.n' } });
    const changes = input.changes.map((change) => ({ kind: change.kind, text: change.text.trim() })).filter((change) => change.text);
    if (!changes.length) throw new BadRequestException({ message: 'Add at least one change.', issues: { changes: 'Add at least one change' } });
    const existing = await this.prisma.release.findMany({ select: { version: true, status: true } });
    if (existing.some((row) => compareVersions(row.version, version) === 0)) throw new ConflictException({ message: 'That version already exists.', issues: { version: 'Already exists' } });
    const live = existing.filter((row) => row.status === 'live').sort((a, b) => compareVersions(b.version, a.version))[0];
    if (live && compareVersions(version, live.version) <= 0) throw new BadRequestException({ message: `Must be newer than the live version ${live.version}.`, issues: { version: `Newer than ${live.version}` } });
    const owner = (await this.directory.teammate(input.ownerId))!;
    const me = await this.directory.person(actor.id);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.release.create({
        data: {
          version,
          title: input.title.trim(),
          type: input.type,
          ownerId: owner.id,
          ownerName: owner.name,
          stageMinutes: input.stageMinutes ?? 10,
          changes: changes as unknown as Prisma.InputJsonValue,
          checklist: CHECKLIST.map((item) => ({ ...item, done: false })) as unknown as Prisma.InputJsonValue,
          events: { create: { actorName: me.name, text: 'Created the draft', tone: 'neutral' } },
        },
      });
      await this.audit.record(tx, actor, { action: 'release.create', entityType: 'release', entityId: created.id, summary: `Drafted ${version}: ${created.title}` });
      return created;
    });
    return this.get(row.id);
  }

  private async change(id: string, actor: AdminActor, fn: (row: Row, name: string, tx: Prisma.TransactionClient) => Promise<{ action: string; summary: string; changes?: unknown; event?: { text: string; tone: Tone } }>) {
    const row = await this.load(id);
    const me = await this.directory.person(actor.id);
    await this.prisma.$transaction(async (tx) => {
      const entry = await fn(row, me.name, tx);
      if (entry.event) await tx.releaseEvent.create({ data: { releaseId: id, actorName: me.name, ...entry.event } });
      await this.audit.record(tx, actor, { action: entry.action, entityType: 'release', entityId: id, summary: `${row.version}: ${entry.summary}`, changes: entry.changes });
    });
    return this.get(id);
  }

  private async move(tx: Prisma.TransactionClient, row: Row, from: string[], data: Prisma.ReleaseUpdateManyMutationInput) {
    const result = await tx.release.updateMany({ where: { id: row.id, status: { in: from }, updatedAt: row.updatedAt }, data });
    if (!result.count) throw new ConflictException('This release changed in the meantime. Refresh and try again.');
  }

  private assertReady(row: Row) {
    const open = (row.checklist as unknown as Check[]).filter((item) => !item.done);
    if (open.length) throw new BadRequestException({ message: `Finish the checklist first: ${open.map((item) => item.label).join('; ')}.`, issues: { checklist: `${open.length} item(s) open` } });
  }

  private async assertNoActive(tx: Prisma.TransactionClient, exceptId: string) {
    const active = await tx.release.findFirst({ where: { status: { in: ACTIVE }, id: { not: exceptId } }, select: { version: true, status: true } });
    if (active) throw new ConflictException(`${active.version} is ${active.status === 'paused' ? 'paused mid-rollout' : 'rolling out'}. Finish or roll it back first.`);
  }

  toggleCheck(id: string, itemId: string, actor: AdminActor) {
    return this.change(id, actor, async (row, _name, tx) => {
      if (row.status !== 'draft' && row.status !== 'scheduled') throw new BadRequestException('The checklist is locked once a rollout starts.');
      const list = row.checklist as unknown as Check[];
      const item = list.find((check) => check.id === itemId);
      if (!item) throw new NotFoundException('Checklist item not found.');
      const next = list.map((check) => (check.id === itemId ? { ...check, done: !check.done } : check));
      const unschedule = row.status === 'scheduled' && item.done;
      await this.move(tx, row, ['draft', 'scheduled'], { checklist: next as unknown as Prisma.InputJsonValue, ...(unschedule ? { status: 'draft', scheduledAt: null } : {}) });
      return {
        action: 'release.checklist',
        summary: `${item.done ? 'Unticked' : 'Ticked'} "${item.label}"${unschedule ? ' (schedule cleared)' : ''}`,
        event: unschedule ? { text: `Unticked "${item.label}" — schedule cleared`, tone: 'warning' } : undefined,
      };
    });
  }

  schedule(id: string, at: number, actor: AdminActor) {
    return this.change(id, actor, async (row, _name, tx) => {
      if (row.status !== 'draft' && row.status !== 'scheduled') throw new BadRequestException('Only drafts can be scheduled.');
      if (at < Date.now() + 60_000) throw new BadRequestException({ message: 'Pick a time at least a minute from now.', issues: { at: 'Must be in the future' } });
      if (at > Date.now() + 90 * 86_400_000) throw new BadRequestException({ message: 'Schedule within the next 90 days.', issues: { at: 'Within 90 days' } });
      this.assertReady(row);
      await this.move(tx, row, ['draft', 'scheduled'], { status: 'scheduled', scheduledAt: new Date(at) });
      const when = new Date(at).toISOString().replace('T', ' ').slice(0, 16);
      return { action: 'release.schedule', summary: `Scheduled for ${when} UTC`, event: { text: `Scheduled for ${when} UTC`, tone: 'primary' } };
    });
  }

  unschedule(id: string, actor: AdminActor) {
    return this.change(id, actor, async (row, _name, tx) => {
      if (row.status !== 'scheduled') throw new BadRequestException('This release is not scheduled.');
      await this.move(tx, row, ['scheduled'], { status: 'draft', scheduledAt: null });
      return { action: 'release.unschedule', summary: 'Cleared the schedule', event: { text: 'Cleared the schedule', tone: 'neutral' } };
    });
  }

  start(id: string, actor: AdminActor) {
    return this.change(id, actor, async (row, _name, tx) => {
      if (row.status !== 'draft' && row.status !== 'scheduled') throw new BadRequestException('Only drafts or scheduled releases can start.');
      this.assertReady(row);
      await this.assertNoActive(tx, id);
      const now = new Date();
      await this.move(tx, row, ['draft', 'scheduled'], { status: 'rolling', stage: 0, stageAt: now, startedAt: now, scheduledAt: null });
      return { action: 'release.start', summary: `Started rollout at ${STAGES[0]}%`, event: { text: `Started rollout at ${STAGES[0]}%`, tone: 'warning' } };
    });
  }

  pause(id: string, actor: AdminActor) {
    return this.change(id, actor, async (row, _name, tx) => {
      if (row.status !== 'rolling') throw new BadRequestException('Only a rolling release can be paused.');
      await this.move(tx, row, ['rolling'], { status: 'paused' });
      return { action: 'release.pause', summary: `Paused at ${STAGES[row.stage]}%`, event: { text: `Paused at ${STAGES[row.stage]}%`, tone: 'danger' } };
    });
  }

  resume(id: string, actor: AdminActor) {
    return this.change(id, actor, async (row, _name, tx) => {
      if (row.status !== 'paused') throw new BadRequestException('Only a paused release can resume.');
      await this.move(tx, row, ['paused'], { status: 'rolling', stageAt: new Date() });
      return { action: 'release.resume', summary: `Resumed at ${STAGES[row.stage]}%`, event: { text: `Resumed at ${STAGES[row.stage]}%`, tone: 'warning' } };
    });
  }

  promote(id: string, actor: AdminActor) {
    return this.change(id, actor, async (row, _name, tx) => {
      if (!ACTIVE.includes(row.status)) throw new BadRequestException('Only a release mid-rollout can be promoted.');
      const now = new Date();
      await this.move(tx, row, ACTIVE, { status: 'live', stage: STAGES.length - 1, stageAt: now, completedAt: now });
      return { action: 'release.promote', summary: `Promoted from ${STAGES[row.stage]}% to 100%`, event: { text: `Promoted to 100% — live for everyone`, tone: 'success' } };
    });
  }

  rollback(id: string, reason: string, actor: AdminActor) {
    return this.change(id, actor, async (row, _name, tx) => {
      if (row.status === 'live') {
        const newer = await tx.release.findMany({ where: { status: 'live', id: { not: id } }, select: { version: true } });
        if (newer.some((item) => compareVersions(item.version, row.version) > 0)) throw new BadRequestException('Only the current live release can be rolled back.');
      } else if (!ACTIVE.includes(row.status)) throw new BadRequestException('Only a rolling, paused or live release can be rolled back.');
      await this.move(tx, row, [...ACTIVE, 'live'], { status: 'rolled_back', completedAt: new Date() });
      return { action: 'release.rollback', summary: `Rolled back from ${STAGES[row.stage]}%`, changes: { reason: reason.trim(), before: row.status, after: 'rolled_back' }, event: { text: `Rolled back from ${STAGES[row.stage]}%: ${reason.trim()}`, tone: 'danger' } };
    });
  }

  async remove(id: string, actor: AdminActor) {
    const row = await this.load(id);
    if (row.status !== 'draft') throw new BadRequestException('Only drafts can be deleted.');
    await this.prisma.$transaction(async (tx) => {
      await tx.release.delete({ where: { id } });
      await this.audit.record(tx, actor, { action: 'release.delete', entityType: 'release', entityId: id, summary: `Deleted draft ${row.version}` });
    });
    return { ok: true };
  }

  private async system(tx: Prisma.TransactionClient, id: string, action: string, summary: string) {
    await tx.technicalAuditLog.create({ data: { actorId: null, actorEmail: 'system', action, entityType: 'release', entityId: id, summary } });
  }

  async tick(now = Date.now()) {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const rolling = await this.prisma.release.findMany({ where: { status: 'rolling' } });
      for (const row of rolling) {
        if (!row.stageAt || row.stageAt.getTime() + row.stageMinutes * 60_000 > now) continue;
        const stage = Math.min(row.stage + 1, STAGES.length - 1);
        const live = stage === STAGES.length - 1;
        await this.prisma.$transaction(async (tx) => {
          const moved = await tx.release.updateMany({ where: { id: row.id, status: 'rolling', stage: row.stage }, data: { stage, stageAt: new Date(now), ...(live ? { status: 'live', completedAt: new Date(now) } : {}) } });
          if (!moved.count) return;
          await tx.releaseEvent.create({ data: { releaseId: row.id, actorName: SYSTEM, text: live ? 'Reached 100% — live for everyone' : `Advanced to ${STAGES[stage]}%`, tone: live ? 'success' : 'primary' } });
          await this.system(tx, row.id, live ? 'release.live' : 'release.advance', `${row.version}: ${live ? 'live at 100%' : `advanced to ${STAGES[stage]}%`}`);
        });
      }
      const due = await this.prisma.release.findMany({ where: { status: 'scheduled', scheduledAt: { lte: new Date(now) } }, orderBy: { scheduledAt: 'asc' } });
      for (const row of due) {
        await this.prisma.$transaction(async (tx) => {
          if (await tx.release.findFirst({ where: { status: { in: ACTIVE } }, select: { id: true } })) return;
          const ready = (row.checklist as unknown as Check[]).every((item) => item.done);
          if (!ready) {
            await tx.release.updateMany({ where: { id: row.id, status: 'scheduled' }, data: { status: 'draft', scheduledAt: null } });
            await tx.releaseEvent.create({ data: { releaseId: row.id, actorName: SYSTEM, text: 'Scheduled start skipped — checklist incomplete', tone: 'danger' } });
            return;
          }
          const moved = await tx.release.updateMany({ where: { id: row.id, status: 'scheduled' }, data: { status: 'rolling', stage: 0, stageAt: new Date(now), startedAt: new Date(now), scheduledAt: null } });
          if (!moved.count) return;
          await tx.releaseEvent.create({ data: { releaseId: row.id, actorName: SYSTEM, text: `Scheduled rollout started at ${STAGES[0]}%`, tone: 'warning' } });
          await this.system(tx, row.id, 'release.start', `${row.version}: scheduled rollout started`);
        });
      }
    } catch (error) {
      this.logger.error(`Release tick failed: ${(error as Error).message}`);
    } finally {
      this.ticking = false;
    }
  }

  async notes() {
    const rows = await this.prisma.release.findMany({ where: { status: 'live' }, select: { version: true, title: true, type: true, completedAt: true, changes: true } });
    return rows.sort((a, b) => compareVersions(b.version, a.version)).slice(0, 30).map((row) => ({ version: row.version, title: row.title, type: row.type, releasedAt: ms(row.completedAt), changes: row.changes }));
  }
}