import { randomBytes } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { dayKey } from '../common/time.js';
import { SettingsService } from '../settings/settings.service.js';
import type { LearnerQueryDto } from './learners.dto.js';

const DAY = 86_400_000;
const STREAK_WINDOW_DAYS = 400;
const tempPassword = () => `${randomBytes(9).toString('base64url')}A1!`;

const SELECT = { id: true, name: true, email: true, status: true, lastLoginAt: true, createdAt: true } as const;
type Row = Prisma.UserGetPayload<{ select: typeof SELECT }>;

type LearnerStatus = 'active' | 'invited' | 'suspended' | 'deactivated';

function statusOf(row: Row): LearnerStatus {
  if (row.status === 'SUSPENDED') return 'suspended';
  if (row.status === 'DEACTIVATED') return 'deactivated';
  return row.lastLoginAt ? 'active' : 'invited';
}

function nameFromEmail(email: string) {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim();
  const name = local
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  return name.length >= 2 ? name : email.split('@')[0];
}

function streakOf(days: Set<string>, today: string, yesterday: string, timeZone: string) {
  let cursor = days.has(today) ? Date.now() : days.has(yesterday) ? Date.now() - DAY : null;
  if (cursor === null) return 0;
  let streak = 0;
  while (days.has(dayKey(new Date(cursor), timeZone))) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}

@Injectable()
export class LearnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  private async enrich(rows: Row[]) {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const { values } = await this.settings.all();
    const timeZone = String(values.timezone);
    const since = new Date(Date.now() - STREAK_WINDOW_DAYS * DAY);
    const [subs, submissions, solved, recentRuns, suspensions] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { userId: { in: ids }, status: { not: 'cancelled' } },
        orderBy: { startedAt: 'desc' },
        select: { userId: true, plan: true, cycle: true, institution: true },
      }),
      this.prisma.codeRun.groupBy({ by: ['userId'], where: { userId: { in: ids }, kind: 'submit' }, _count: { _all: true } }),
      this.prisma.codeRun.groupBy({ by: ['userId', 'problemSlug'], where: { userId: { in: ids }, kind: 'submit', verdict: 'ac' } }),
      this.prisma.codeRun.findMany({ where: { userId: { in: ids }, kind: 'submit', queuedAt: { gte: since } }, select: { userId: true, queuedAt: true } }),
      this.prisma.technicalAuditLog.findMany({
        where: { entityType: 'user', entityId: { in: ids }, action: { in: ['user.suspend', 'user.deactivate'] } },
        orderBy: { createdAt: 'desc' },
        select: { entityId: true, changes: true },
      }),
    ]);
    const subOf = new Map<string, (typeof subs)[number]>();
    for (const sub of subs) if (!subOf.has(sub.userId)) subOf.set(sub.userId, sub);
    const submitCount = new Map(submissions.map((row) => [row.userId, row._count._all]));
    const solvedCount = new Map<string, number>();
    for (const row of solved) if (row.userId) solvedCount.set(row.userId, (solvedCount.get(row.userId) ?? 0) + 1);
    const activeDays = new Map<string, Set<string>>();
    const lastRun = new Map<string, number>();
    for (const run of recentRuns) {
      if (!run.userId) continue;
      const set = activeDays.get(run.userId) ?? new Set<string>();
      set.add(dayKey(run.queuedAt, timeZone));
      activeDays.set(run.userId, set);
      lastRun.set(run.userId, Math.max(lastRun.get(run.userId) ?? 0, run.queuedAt.getTime()));
    }
    const reasonOf = new Map<string, string>();
    for (const row of suspensions) {
      if (reasonOf.has(row.entityId)) continue;
      const reason = (row.changes as { reason?: unknown } | null)?.reason;
      reasonOf.set(row.entityId, typeof reason === 'string' ? reason : '');
    }
    const today = dayKey(new Date(), timeZone);
    const yesterday = dayKey(new Date(Date.now() - DAY), timeZone);
    return rows.map((row) => {
      const sub = subOf.get(row.id);
      const status = statusOf(row);
      const lastActive = Math.max(row.lastLoginAt?.getTime() ?? 0, lastRun.get(row.id) ?? 0);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: 'learner' as const,
        status,
        plan: sub?.plan ?? 'free',
        cycle: sub ? sub.cycle : null,
        institution: sub?.institution ?? 'Independent',
        joinedAt: row.createdAt.getTime(),
        lastActiveAt: lastActive || null,
        solved: solvedCount.get(row.id) ?? 0,
        submissions: submitCount.get(row.id) ?? 0,
        streak: streakOf(activeDays.get(row.id) ?? new Set(), today, yesterday, timeZone),
        suspendReason: status === 'suspended' || status === 'deactivated' ? reasonOf.get(row.id) || null : null,
      };
    });
  }

  async list(query: LearnerQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.UserWhereInput = {
      role: 'LEARNER',
      ...(query.q ? { OR: [{ email: { contains: query.q, mode: 'insensitive' } }, { name: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, select: SELECT, orderBy: { createdAt: query.order ?? 'desc' }, skip, take }),
      this.prisma.user.count({ where }),
    ]);
    return { items: await this.enrich(rows), total, page, pageSize };
  }

  private async row(id: string) {
    const row = await this.prisma.user.findFirst({ where: { id, role: 'LEARNER' }, select: SELECT });
    if (!row) throw new NotFoundException('Learner not found.');
    return row;
  }

  async get(id: string) {
    const row = await this.row(id);
    const [[learner], logs] = await Promise.all([
      this.enrich([row]),
      this.prisma.technicalAuditLog.findMany({
        where: { OR: [{ entityType: 'user', entityId: id }, { actorId: id }] },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { summary: true, createdAt: true, actorEmail: true, actor: { select: { name: true } } },
      }),
    ]);
    const activity = logs
      .map((log) => ({ at: log.createdAt.getTime(), text: log.summary, actor: log.actor?.name ?? (log.actorEmail === 'system' ? 'System' : log.actorEmail) }))
      .reverse();
    return { ...learner, activity: [{ at: row.createdAt.getTime(), text: 'Joined eLab', actor: learner.name }, ...activity] };
  }

  async invite(emails: string[], actor: AdminActor) {
    const wanted = [...new Set(emails.map((email) => email.trim().toLowerCase()))];
    const existing = await this.prisma.user.findMany({ where: { email: { in: wanted } }, select: { email: true } });
    const taken = new Set(existing.map((row) => row.email));
    const fresh = wanted.filter((email) => !taken.has(email));
    if (!fresh.length) throw new BadRequestException('All of these emails already have an account.');
    const credentials: { email: string; password: string }[] = [];
    const created = await this.prisma.$transaction(async (tx) => {
      const rows: Row[] = [];
      for (const email of fresh) {
        const password = tempPassword();
        credentials.push({ email, password });
        const row = await tx.user.create({ data: { email, name: nameFromEmail(email), role: 'LEARNER', passwordHash: await bcrypt.hash(password, 12), invitedByName: actor.email }, select: SELECT });
        await this.audit.record(tx, actor, { action: 'user.invite', entityType: 'user', entityId: row.id, summary: `Invited ${email} as a learner` });
        rows.push(row);
      }
      return rows;
    });
    return { items: await this.enrich(created), skipped: [...taken], credentials };
  }

  async temporaryPassword(id: string, actor: AdminActor) {
    const row = await this.row(id);
    if (row.status !== 'ACTIVE') throw new BadRequestException('Reactivate the account before resetting its password.');
    const password = tempPassword();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
      await tx.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, actor, {
        action: row.lastLoginAt ? 'user.reset_password' : 'user.resend_invite',
        entityType: 'user',
        entityId: id,
        summary: row.lastLoginAt ? `Reset the password for ${row.email}` : `Created a new invitation password for ${row.email}`,
      });
    });
    return { learner: await this.get(id), credential: { email: row.email, password } };
  }
}
