import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { couponStatus } from '../revenue/coupons.service.js';
import { CYCLE_LABEL, CYCLE_MONTHS, PLAN_LABEL } from '../revenue/billing-math.js';
import type { RangeId, RunQueryDto, ScheduleInputDto, TemplateId } from './reports.dto.js';
import { RANGE_LABEL, TEMPLATES, TEMPLATE_MAP, nextRun, rangeBounds, toCsv } from './templates.js';

const GST_RATE = 0.18;
const money = (value: number) => value.toFixed(2);
const iso = (value: Date | number) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const gstOf = (amount: number) => Math.round(((amount * GST_RATE) / (1 + GST_RATE)) * 100) / 100;
const ROLE = { LEARNER: 'learner', PLATFORM_ADMIN: 'platform-admin', SUPER_ADMIN: 'super-admin', CONTENT_MANAGER: 'content-manager' } as const;
const CONTENT_TYPE = (workspace: string) => (workspace === 'devops' ? 'lab' : workspace === 'web' || workspace === 'framework' ? 'project' : 'problem');

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  templates() {
    return { templates: TEMPLATES, ranges: RANGE_LABEL };
  }

  async build(id: TemplateId, from: Date, to: Date): Promise<string[][]> {
    switch (id) {
      case 'revenue':
      case 'gst': {
        const payments = await this.prisma.payment.findMany({ where: { status: { not: 'failed' }, paidAt: { gte: from, lte: to } }, select: { paidAt: true, amount: true, refunded: true, plan: true } });
        const days = new Map<string, { count: number; gross: number; refunds: number; plan: Record<string, number>; gst: number }>();
        for (const payment of payments) {
          const key = iso(payment.paidAt);
          const entry = days.get(key) ?? { count: 0, gross: 0, refunds: 0, plan: { starter: 0, professional: 0, premium: 0, enterprise: 0 }, gst: 0 };
          entry.count += 1;
          entry.gross += payment.amount;
          entry.refunds += payment.refunded;
          entry.plan[payment.plan] += payment.amount - payment.refunded;
          entry.gst += gstOf(payment.amount);
          days.set(key, entry);
        }
        const keys = [...days.keys()].sort();
        if (id === 'revenue') {
          return keys.map((key) => {
            const entry = days.get(key)!;
            return [key, String(entry.count), money(entry.gross), money(entry.refunds), money(entry.gross - entry.refunds), money(entry.plan.starter), money(entry.plan.professional), money(entry.plan.premium), money(entry.plan.enterprise)];
          });
        }
        return keys.map((key) => {
          const entry = days.get(key)!;
          return [key, String(entry.count), money(entry.gross), money(entry.gross - entry.gst), money(entry.gst / 2), money(entry.gst / 2)];
        });
      }
      case 'payments': {
        const payments = await this.prisma.payment.findMany({
          where: { paidAt: { gte: from, lte: to }, OR: [{ status: { not: 'succeeded' } }, { refundStatus: { not: null } }] },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { paidAt: 'desc' },
        });
        return payments.map((payment) => {
          const attempts = payment.attempts as { note: string }[];
          const detail =
            payment.status === 'failed'
              ? attempts[attempts.length - 1]?.note ?? ''
              : payment.refundStatus
                ? `Refund request: ${payment.refundReason ?? ''} (${payment.refundStatus})`
                : `Refunded ${money(payment.refunded)}`;
          return [payment.id, iso(payment.paidAt), payment.user.name, payment.user.email, money(payment.amount), payment.status, money(payment.refunded), detail];
        });
      }
      case 'churn': {
        const subs = await this.prisma.subscription.findMany({
          where: { status: 'cancelled', cancelledAt: { gte: from, lte: to } },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { cancelledAt: 'desc' },
        });
        return subs.map((sub) => [sub.id, sub.user.name, sub.user.email, PLAN_LABEL[sub.plan], CYCLE_LABEL[sub.cycle], iso(sub.cancelledAt ?? sub.updatedAt), sub.cancelReason ?? '']);
      }
      case 'subscriptions': {
        const subs = await this.prisma.subscription.findMany({ where: { status: { not: 'cancelled' } }, include: { user: { select: { name: true, email: true } } }, orderBy: { periodEnd: 'asc' } });
        return subs.map((sub) => [
          sub.id,
          sub.user.name,
          sub.user.email,
          PLAN_LABEL[sub.plan],
          CYCLE_LABEL[sub.cycle],
          money(sub.amount),
          money(sub.amount / CYCLE_MONTHS[sub.cycle]),
          sub.cancelAtPeriodEnd ? 'Cancelling' : sub.status === 'past_due' ? 'Past due' : 'Active',
          iso(sub.periodEnd),
        ]);
      }
      case 'coupons': {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const [coupons, all, month] = await Promise.all([
          this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
          this.prisma.couponRedemption.groupBy({ by: ['couponCode'], _count: { _all: true }, _sum: { saved: true } }),
          this.prisma.couponRedemption.groupBy({ by: ['couponCode'], where: { at: { gte: monthStart } }, _count: { _all: true } }),
        ]);
        const totals = new Map(all.map((row) => [row.couponCode, row]));
        const monthly = new Map(month.map((row) => [row.couponCode, row._count._all]));
        return coupons.map((coupon) => {
          const total = totals.get(coupon.code);
          const redemptions = total?._count._all ?? 0;
          const plans = (coupon.plans as string[]).map((plan) => PLAN_LABEL[plan as keyof typeof PLAN_LABEL]).join(', ') || 'All plans';
          const cycles = (coupon.cycles as string[]).map((cycle) => CYCLE_LABEL[cycle as keyof typeof CYCLE_LABEL].toLowerCase()).join(', ') || 'any cycle';
          return [
            coupon.code,
            coupon.kind === 'percent' ? `${coupon.value}% off` : `Rs ${coupon.value} off`,
            `${plans} · ${cycles}`,
            String(redemptions),
            coupon.maxRedemptions ? String(coupon.maxRedemptions) : '',
            String(monthly.get(coupon.code) ?? 0),
            money(total?._sum.saved ?? 0),
            couponStatus(coupon, redemptions),
          ];
        });
      }
      case 'institutions': {
        const subs = await this.prisma.subscription.findMany({ where: { plan: 'enterprise', status: { not: 'cancelled' } }, orderBy: { seats: 'desc' } });
        return subs.map((sub) => [sub.institution ?? '', String(sub.seats ?? 0), money(sub.amount), iso(sub.startedAt), iso(sub.periodEnd)]);
      }
      case 'users': {
        const users = await this.prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true, subscriptions: { where: { status: { not: 'cancelled' } }, select: { plan: true }, take: 1 } },
        });
        return users.map((user) => [user.id, user.name, user.email, ROLE[user.role], user.subscriptions[0] ? PLAN_LABEL[user.subscriptions[0].plan] : 'Free', user.status.toLowerCase(), iso(user.createdAt), user.lastLoginAt ? iso(user.lastLoginAt) : '']);
      }
      case 'content': {
        const problems = await this.prisma.problem.findMany({ where: { status: 'published' }, include: { technology: { select: { name: true } } }, orderBy: { title: 'asc' } });
        return problems.map((problem) => [problem.id, problem.title, CONTENT_TYPE(problem.workspaceType), problem.technology.name, problem.difficulty.toLowerCase(), problem.tier, problem.visibility, '0', '0', '']);
      }
    }
  }

  private bounds(templateId: TemplateId, range: RangeId | undefined | null) {
    const now = Date.now();
    if (TEMPLATE_MAP[templateId].snapshot || !range) return { from: new Date(now), to: new Date(now), range: null };
    const [from, to] = rangeBounds(range, now);
    return { from: new Date(from), to: new Date(to), range };
  }

  private async actorName(actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    return user?.name ?? actor.email;
  }

  private presentRun(run: { id: string; templateId: string; range: string | null; from: Date; to: Date; requestedByName: string; status: string; rows: number; note: string | null; scheduleId: string | null; at: Date }) {
    return {
      id: run.id,
      templateId: run.templateId,
      range: run.range,
      from: run.from.getTime(),
      to: run.to.getTime(),
      requestedBy: run.requestedByName,
      status: run.status,
      rows: run.rows,
      note: run.note,
      scheduleId: run.scheduleId,
      at: run.at.getTime(),
    };
  }

  async generate(templateId: TemplateId, range: RangeId | undefined, actor: AdminActor, scheduleId: string | null = null, note: string | null = null) {
    const bounds = this.bounds(templateId, range ?? (TEMPLATE_MAP[templateId].snapshot ? null : '30d'));
    const name = await this.actorName(actor);
    let rows = 0;
    let status: 'ready' | 'failed' = 'ready';
    let failure: string | null = null;
    try {
      rows = (await this.build(templateId, bounds.from, bounds.to)).length;
    } catch (error) {
      status = 'failed';
      failure = error instanceof Error ? error.message.slice(0, 200) : 'Report failed';
    }
    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reportRun.create({
        data: { templateId, range: bounds.range, from: bounds.from, to: bounds.to, requestedById: actor.id, requestedByName: name, status, rows, note: failure ?? note, scheduleId },
      });
      await this.audit.record(tx, actor, {
        action: 'report.generate',
        entityType: 'report_run',
        entityId: created.id,
        summary: `Generated ${TEMPLATE_MAP[templateId].name}${bounds.range ? ` (${RANGE_LABEL[bounds.range]})` : ''}: ${rows} rows`,
      });
      return created;
    });
    return this.presentRun(run);
  }

  async runs(query: RunQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const [rows, total] = await Promise.all([this.prisma.reportRun.findMany({ orderBy: { at: 'desc' }, skip, take }), this.prisma.reportRun.count()]);
    return { items: rows.map((run) => this.presentRun(run)), total, page, pageSize };
  }

  async download(id: string) {
    const run = await this.prisma.reportRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Report run not found.');
    const templateId = run.templateId as TemplateId;
    const rows = await this.build(templateId, run.from, run.to);
    const stamp = iso(run.at);
    return { filename: `${templateId}-${stamp}.csv`, csv: toCsv(templateId, rows) };
  }

  private presentSchedule(schedule: { id: string; templateId: string; frequency: 'weekly' | 'monthly'; weekday: number; dayOfMonth: number; hour: number; recipients: unknown; active: boolean; createdByName: string; createdAt: Date; lastRunAt: Date | null; lastStatus: string | null }) {
    return {
      id: schedule.id,
      templateId: schedule.templateId,
      frequency: schedule.frequency,
      weekday: schedule.weekday,
      dayOfMonth: schedule.dayOfMonth,
      hour: schedule.hour,
      recipients: schedule.recipients as string[],
      active: schedule.active,
      createdBy: schedule.createdByName,
      createdAt: schedule.createdAt.getTime(),
      lastRunAt: schedule.lastRunAt?.getTime() ?? null,
      lastStatus: schedule.lastStatus,
      nextRunAt: schedule.active ? nextRun(schedule, Date.now()) : null,
    };
  }

  async schedules() {
    const rows = await this.prisma.reportSchedule.findMany({ orderBy: { createdAt: 'desc' } });
    return { items: rows.map((row) => this.presentSchedule(row)) };
  }

  private scheduleData(dto: ScheduleInputDto) {
    return {
      templateId: dto.templateId,
      frequency: dto.frequency,
      weekday: dto.weekday,
      dayOfMonth: dto.dayOfMonth,
      hour: dto.hour,
      recipients: [...new Set(dto.recipients.map((email) => email.trim().toLowerCase()))],
    };
  }

  async createSchedule(dto: ScheduleInputDto, actor: AdminActor) {
    const name = await this.actorName(actor);
    const schedule = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reportSchedule.create({ data: { ...this.scheduleData(dto), createdById: actor.id, createdByName: name } });
      await this.audit.record(tx, actor, { action: 'report.schedule', entityType: 'report_schedule', entityId: created.id, summary: `Scheduled ${TEMPLATE_MAP[dto.templateId].name} ${dto.frequency} for ${created.recipients ? (created.recipients as string[]).length : 0} recipients` });
      return created;
    });
    return this.presentSchedule(schedule);
  }

  private async schedule(id: string) {
    const schedule = await this.prisma.reportSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('Schedule not found.');
    return schedule;
  }

  async updateSchedule(id: string, dto: ScheduleInputDto, actor: AdminActor) {
    await this.schedule(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.reportSchedule.update({ where: { id }, data: this.scheduleData(dto) });
      await this.audit.record(tx, actor, { action: 'report.schedule_edit', entityType: 'report_schedule', entityId: id, summary: `Edited the ${TEMPLATE_MAP[dto.templateId].name} schedule` });
      return row;
    });
    return this.presentSchedule(updated);
  }

  async setActive(id: string, active: boolean, actor: AdminActor) {
    const existing = await this.schedule(id);
    if (existing.active === active) return this.presentSchedule(existing);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.reportSchedule.update({ where: { id }, data: { active } });
      await this.audit.record(tx, actor, { action: active ? 'report.schedule_resume' : 'report.schedule_pause', entityType: 'report_schedule', entityId: id, summary: `${active ? 'Resumed' : 'Paused'} the ${TEMPLATE_MAP[existing.templateId as TemplateId].name} schedule` });
      return row;
    });
    return this.presentSchedule(updated);
  }

  async removeSchedule(id: string, actor: AdminActor) {
    const existing = await this.schedule(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.reportSchedule.delete({ where: { id } });
      await this.audit.record(tx, actor, { action: 'report.schedule_delete', entityType: 'report_schedule', entityId: id, summary: `Deleted the ${TEMPLATE_MAP[existing.templateId as TemplateId].name} schedule` });
    });
    return { deleted: true };
  }

  async runSchedule(id: string, actor: AdminActor) {
    const schedule = await this.schedule(id);
    const recipients = schedule.recipients as string[];
    const run = await this.generate(
      schedule.templateId as TemplateId,
      schedule.frequency === 'weekly' ? '7d' : 'last_month',
      actor,
      schedule.id,
      `Generated for ${recipients.length} recipients. Email delivery is not configured yet`,
    );
    await this.prisma.reportSchedule.update({ where: { id }, data: { lastRunAt: new Date(), lastStatus: run.status as 'ready' | 'failed' } });
    return run;
  }
}