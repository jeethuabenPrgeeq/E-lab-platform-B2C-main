import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { activityFor } from './activity.js';
import type { CancelChallengeDto, ChallengeInputDto, ChallengeQueryDto, ExtendChallengeDto } from './content.dto.js';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
export const MIN_LEAD_MINUTES = 15;
const NEEDS_SPONSOR = new Set(['hiring', 'sponsored']);
const KIND_LABEL: Record<string, string> = { weekly: 'Weekly contest', monthly: 'Long challenge', hiring: 'Hiring challenge', sponsored: 'Sponsored' };

const INCLUDE = { problems: { orderBy: { position: 'asc' }, select: { problemId: true } } } as const;
type Row = Prisma.ChallengeGetPayload<{ include: typeof INCLUDE }>;

export function statusOf(row: { cancelled: boolean; published: boolean; startAt: Date; endAt: Date }, now = Date.now()) {
  if (row.cancelled) return 'cancelled';
  if (!row.published) return 'draft';
  if (now < row.startAt.getTime()) return 'scheduled';
  if (now < row.endAt.getTime()) return 'live';
  return 'ended';
}

function present(row: Row) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    sponsor: row.sponsor,
    startAt: row.startAt.getTime(),
    endAt: row.endAt.getTime(),
    problems: row.problems.map((item) => item.problemId),
    registered: 0,
    participants: 0,
    prize: row.prize,
    access: row.access,
    published: row.published,
    cancelled: row.cancelled,
    cancelReason: row.cancelReason,
    status: statusOf(row),
    leaderboard: [] as never[],
  };
}

function when(at: number) {
  return new Date(at).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private statusWhere(status: ChallengeQueryDto['status'], now: Date): Prisma.ChallengeWhereInput {
    switch (status) {
      case 'cancelled':
        return { cancelled: true };
      case 'draft':
        return { cancelled: false, published: false };
      case 'scheduled':
        return { cancelled: false, published: true, startAt: { gt: now } };
      case 'live':
        return { cancelled: false, published: true, startAt: { lte: now }, endAt: { gt: now } };
      case 'ended':
        return { cancelled: false, published: true, endAt: { lte: now } };
      default:
        return {};
    }
  }

  async list(query: ChallengeQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const now = new Date();
    const where: Prisma.ChallengeWhereInput = {
      ...this.statusWhere(query.status, now),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [rows, total, all] = await Promise.all([
      this.prisma.challenge.findMany({ where, include: INCLUDE, orderBy: { startAt: query.order ?? 'desc' }, skip, take }),
      this.prisma.challenge.count({ where }),
      this.prisma.challenge.findMany({ select: { cancelled: true, published: true, startAt: true, endAt: true } }),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of all) {
      const key = statusOf(row, now.getTime());
      statusCounts[key] = (statusCounts[key] ?? 0) + 1;
    }
    return { items: rows.map(present), total, page, pageSize, statusCounts };
  }

  async get(id: string) {
    const row = await this.prisma.challenge.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException('Challenge not found.');
    const activity = await activityFor(this.prisma, 'challenge', [id]);
    return { ...present(row), activity: activity.get(id) ?? [] };
  }

  private async scheduleIssues(input: ChallengeInputDto) {
    const issues: string[] = [];
    if (input.title.trim().length < 4) issues.push('Give the challenge a title of at least 4 characters');
    if (NEEDS_SPONSOR.has(input.kind) && !input.sponsor?.trim()) issues.push(`${KIND_LABEL[input.kind]}s need a sponsor name`);
    if (input.startAt < Date.now() + MIN_LEAD_MINUTES * MIN) issues.push(`The start time must be at least ${MIN_LEAD_MINUTES} minutes from now`);
    if (input.problems.length === 0) issues.push('Add at least one problem');
    const rows = await this.prisma.problem.findMany({ where: { id: { in: input.problems }, status: 'published' }, select: { id: true, title: true, visibility: true } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const id of input.problems) {
      const item = byId.get(id);
      if (!item) issues.push(`Problem ${id} is not in the published catalog`);
      else if (item.visibility === 'retired') issues.push(`"${item.title}" is retired. Replace it`);
    }
    return issues;
  }

  private async validate(input: ChallengeInputDto, live: boolean) {
    if (new Set(input.problems).size !== input.problems.length) throw new BadRequestException('A problem can only appear once in a challenge.');
    if (live) {
      const issues = await this.scheduleIssues(input);
      if (issues.length) throw new BadRequestException({ message: 'The challenge is not ready to schedule.', issues });
      return;
    }
    if (input.title.trim().length < 4) throw new BadRequestException('Give the challenge a title of at least 4 characters');
    const found = await this.prisma.problem.count({ where: { id: { in: input.problems }, status: 'published' } });
    if (found !== input.problems.length) throw new BadRequestException('Some problems are not in the published catalog.');
  }

  private fields(input: ChallengeInputDto) {
    return {
      title: input.title.trim(),
      kind: input.kind,
      sponsor: input.sponsor?.trim() || null,
      startAt: new Date(input.startAt),
      endAt: new Date(input.startAt + input.durationMinutes * MIN),
      prize: input.prize,
      access: input.access,
    };
  }

  async create(input: ChallengeInputDto, actor: AdminActor) {
    const publish = Boolean(input.publish);
    await this.validate(input, publish);
    const id = await this.prisma.$transaction(async (tx) => {
      const challenge = await tx.challenge.create({ data: { ...this.fields(input), published: publish, createdById: actor.id } });
      if (input.problems.length) {
        await tx.challengeProblem.createMany({ data: input.problems.map((problemId, position) => ({ challengeId: challenge.id, problemId, position })) });
      }
      await this.audit.record(tx, actor, {
        action: publish ? 'challenge.schedule' : 'challenge.create',
        entityType: 'challenge',
        entityId: challenge.id,
        summary: publish ? `Created and scheduled for ${when(input.startAt)}` : 'Created as a draft',
      });
      return challenge.id;
    });
    return this.get(id);
  }

  private async editable(id: string) {
    const existing = await this.prisma.challenge.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Challenge not found.');
    return existing;
  }

  async edit(id: string, input: ChallengeInputDto, actor: AdminActor) {
    const existing = await this.editable(id);
    const status = statusOf(existing);
    if (status !== 'draft' && status !== 'scheduled') throw new BadRequestException('Only drafts and scheduled challenges can be edited.');
    const live = Boolean(input.publish) || existing.published;
    await this.validate(input, live);
    await this.prisma.$transaction(async (tx) => {
      await tx.challenge.update({ where: { id }, data: { ...this.fields(input), published: live } });
      await tx.challengeProblem.deleteMany({ where: { challengeId: id } });
      if (input.problems.length) {
        await tx.challengeProblem.createMany({ data: input.problems.map((problemId, position) => ({ challengeId: id, problemId, position })) });
      }
      await this.audit.record(tx, actor, {
        action: !existing.published && live ? 'challenge.schedule' : 'challenge.edit',
        entityType: 'challenge',
        entityId: id,
        summary: !existing.published && live ? `Scheduled for ${when(input.startAt)}` : 'Edited the details',
      });
    });
    return this.get(id);
  }

  async unpublish(id: string, actor: AdminActor) {
    const existing = await this.editable(id);
    if (statusOf(existing) !== 'scheduled') throw new BadRequestException('Only scheduled challenges can be moved back to draft.');
    await this.prisma.$transaction(async (tx) => {
      await tx.challenge.update({ where: { id }, data: { published: false } });
      await this.audit.record(tx, actor, { action: 'challenge.unpublish', entityType: 'challenge', entityId: id, summary: 'Moved back to draft. Registrations paused' });
    });
    return this.get(id);
  }

  async extend(id: string, dto: ExtendChallengeDto, actor: AdminActor) {
    const existing = await this.editable(id);
    const status = statusOf(existing);
    if (status !== 'live' && status !== 'scheduled') throw new BadRequestException('Only scheduled or live challenges can be extended.');
    const endAt = new Date(existing.endAt.getTime() + dto.minutes * MIN);
    await this.prisma.$transaction(async (tx) => {
      await tx.challenge.update({ where: { id }, data: { endAt } });
      await this.audit.record(tx, actor, { action: 'challenge.extend', entityType: 'challenge', entityId: id, summary: `Extended by ${dto.minutes} min. Now ends ${when(endAt.getTime())}` });
    });
    return this.get(id);
  }

  async endNow(id: string, actor: AdminActor) {
    const existing = await this.editable(id);
    if (statusOf(existing) !== 'live') throw new BadRequestException('Only live challenges can be ended early.');
    await this.prisma.$transaction(async (tx) => {
      await tx.challenge.update({ where: { id }, data: { endAt: new Date() } });
      await this.audit.record(tx, actor, { action: 'challenge.end', entityType: 'challenge', entityId: id, summary: 'Ended early' });
    });
    return this.get(id);
  }

  async cancel(id: string, dto: CancelChallengeDto, actor: AdminActor) {
    const existing = await this.editable(id);
    const status = statusOf(existing);
    if (status === 'ended' || status === 'cancelled') throw new BadRequestException('Ended or cancelled challenges cannot be cancelled.');
    const reason = dto.reason.trim();
    await this.prisma.$transaction(async (tx) => {
      await tx.challenge.update({ where: { id }, data: { cancelled: true, cancelReason: reason } });
      await this.audit.record(tx, actor, { action: 'challenge.cancel', entityType: 'challenge', entityId: id, summary: `Cancelled: ${reason}` });
    });
    return this.get(id);
  }

  async duplicate(id: string, actor: AdminActor) {
    const source = await this.prisma.challenge.findUnique({ where: { id }, include: INCLUDE });
    if (!source) throw new NotFoundException('Challenge not found.');
    const now = Date.now();
    const duration = source.endAt.getTime() - source.startAt.getTime();
    let startAt = source.startAt.getTime() + (source.kind === 'weekly' ? 7 * DAY : 30 * DAY);
    while (startAt < now + DAY) startAt += 7 * DAY;
    const copyId = await this.prisma.$transaction(async (tx) => {
      const copy = await tx.challenge.create({
        data: {
          title: `${source.title} (copy)`.slice(0, 120),
          kind: source.kind,
          sponsor: source.sponsor,
          startAt: new Date(startAt),
          endAt: new Date(startAt + duration),
          prize: source.prize,
          access: source.access,
          createdById: actor.id,
        },
      });
      if (source.problems.length) {
        await tx.challengeProblem.createMany({ data: source.problems.map((item, position) => ({ challengeId: copy.id, problemId: item.problemId, position })) });
      }
      await this.audit.record(tx, actor, { action: 'challenge.duplicate', entityType: 'challenge', entityId: copy.id, summary: `Duplicated from ${source.title}` });
      return copy.id;
    });
    return this.get(copyId);
  }

  async remove(id: string, actor: AdminActor) {
    const existing = await this.editable(id);
    if (existing.published && !existing.cancelled) throw new BadRequestException('Only drafts or cancelled challenges can be deleted.');
    await this.prisma.$transaction(async (tx) => {
      await tx.challenge.delete({ where: { id } });
      await this.audit.record(tx, actor, { action: 'challenge.delete', entityType: 'challenge', entityId: id, summary: `Deleted the challenge ${existing.title}` });
    });
    return { deleted: true };
  }
}