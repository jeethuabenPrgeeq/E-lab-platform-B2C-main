import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { activityFor } from '../content/activity.js';
import { inr } from './billing-math.js';
import { PricesService } from './prices.service.js';
import type { CouponInputDto, CouponQueryDto, Cycle, IndividualPlan } from './revenue.dto.js';

export const CODE_PATTERN = /^[A-Z0-9-]{4,20}$/;
const ALL_PLANS: IndividualPlan[] = ['starter', 'professional', 'premium'];
const ALL_CYCLES: Cycle[] = ['monthly', 'quarterly', 'annual'];

type CouponRow = Prisma.CouponGetPayload<object>;

interface Stats {
  redemptions: number;
  monthRedemptions: number;
  discountGiven: number;
  monthDiscount: number;
  revenue: number;
}

export function couponStatus(coupon: Pick<CouponRow, 'endedEarly' | 'endsAt' | 'maxRedemptions' | 'paused' | 'startsAt'>, redemptions: number, now = Date.now()) {
  if (coupon.endedEarly || (coupon.endsAt && coupon.endsAt.getTime() <= now)) return 'expired';
  if (coupon.maxRedemptions !== null && redemptions >= coupon.maxRedemptions) return 'used_up';
  if (coupon.paused) return 'paused';
  if (coupon.startsAt.getTime() > now) return 'scheduled';
  return 'active';
}

export function discountFor(coupon: Pick<CouponRow, 'kind' | 'value'>, listAmount: number) {
  const raw = coupon.kind === 'percent' ? Math.round((listAmount * coupon.value) / 100) : coupon.value;
  return Math.min(listAmount, Math.max(0, raw));
}

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly prices: PricesService,
  ) {}

  private async stats(codes: string[]) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [all, month] = await Promise.all([
      this.prisma.couponRedemption.groupBy({ by: ['couponCode'], where: { couponCode: { in: codes } }, _count: { _all: true }, _sum: { saved: true, revenue: true } }),
      this.prisma.couponRedemption.groupBy({ by: ['couponCode'], where: { couponCode: { in: codes }, at: { gte: monthStart } }, _count: { _all: true }, _sum: { saved: true } }),
    ]);
    const map = new Map<string, Stats>();
    for (const code of codes) map.set(code, { redemptions: 0, monthRedemptions: 0, discountGiven: 0, monthDiscount: 0, revenue: 0 });
    for (const row of all) {
      const entry = map.get(row.couponCode)!;
      entry.redemptions = row._count._all;
      entry.discountGiven = row._sum.saved ?? 0;
      entry.revenue = row._sum.revenue ?? 0;
    }
    for (const row of month) {
      const entry = map.get(row.couponCode)!;
      entry.monthRedemptions = row._count._all;
      entry.monthDiscount = row._sum.saved ?? 0;
    }
    return map;
  }

  private present(row: CouponRow, stats: Stats) {
    return {
      code: row.code,
      description: row.description,
      kind: row.kind,
      value: row.value,
      plans: row.plans as IndividualPlan[],
      cycles: row.cycles as Cycle[],
      duration: row.duration,
      months: row.months,
      maxRedemptions: row.maxRedemptions,
      firstTimeOnly: row.firstTimeOnly,
      startsAt: row.startsAt.getTime(),
      endsAt: row.endsAt?.getTime() ?? null,
      createdAt: row.createdAt.getTime(),
      paused: row.paused,
      endedEarly: row.endedEarly,
      status: couponStatus(row, stats.redemptions),
      ...stats,
    };
  }

  async list(query: CouponQueryDto) {
    const rows = await this.prisma.coupon.findMany({
      where: query.q ? { OR: [{ code: { contains: query.q.toUpperCase() } }, { description: { contains: query.q, mode: 'insensitive' } }] } : {},
      orderBy: { createdAt: query.order ?? 'desc' },
    });
    const stats = await this.stats(rows.map((row) => row.code));
    const all = rows.map((row) => this.present(row, stats.get(row.code)!));
    const statusCounts: Record<string, number> = {};
    for (const item of all) statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
    const filtered = query.status ? all.filter((item) => item.status === query.status) : all;
    const { page, pageSize, skip, take } = pageArgs(query);
    return { items: filtered.slice(skip, skip + take), total: filtered.length, page, pageSize, statusCounts };
  }

  async get(code: string) {
    const row = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!row) throw new NotFoundException('Coupon not found.');
    const [stats, recent, activity] = await Promise.all([
      this.stats([row.code]),
      this.prisma.couponRedemption.findMany({
        where: { couponCode: row.code },
        orderBy: { at: 'desc' },
        take: 10,
        select: { plan: true, cycle: true, at: true, saved: true, user: { select: { name: true } } },
      }),
      activityFor(this.prisma, 'coupon', [row.code]),
    ]);
    return {
      ...this.present(row, stats.get(row.code)!),
      recent: recent.map((item) => ({ name: item.user.name, plan: item.plan, cycle: item.cycle, at: item.at.getTime(), saved: item.saved })),
      activity: activity.get(row.code) ?? [],
    };
  }

  private async validate(input: CouponInputDto) {
    const errors: Record<string, string> = {};
    if (!CODE_PATTERN.test(input.code)) errors.code = 'Use 4-20 capital letters, numbers or hyphens';
    if (input.value <= 0) errors.value = 'Enter a discount above zero';
    else if (input.kind === 'percent' && input.value > 90) errors.value = 'Percentage discounts top out at 90%';
    else if (input.kind === 'fixed') {
      const book = await this.prices.book();
      const plans = input.plans.length ? input.plans : ALL_PLANS;
      const cycles = input.cycles.length ? input.cycles : ALL_CYCLES;
      const cheapest = Math.min(...plans.flatMap((plan) => cycles.map((cycle) => book[plan][cycle])));
      if (input.value >= cheapest) errors.value = `Must be less than the cheapest matching price (${inr(cheapest)})`;
    }
    if (input.duration === 'repeating' && (input.months < 2 || input.months > 12)) errors.months = 'Between 2 and 12 months';
    if (input.duration !== 'once' && input.cycles.length && !input.cycles.includes('monthly')) errors.duration = 'Repeating discounts only make sense with monthly billing';
    if (input.maxRedemptions != null && input.maxRedemptions < 1) errors.maxRedemptions = 'Leave blank for no limit, or enter 1 or more';
    if (input.endsAt != null && input.endsAt <= input.startsAt) errors.endsAt = 'Must be after the start date';
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'Fix the highlighted fields.', issues: Object.values(errors), fields: errors });
  }

  private data(input: CouponInputDto) {
    return {
      description: input.description.trim(),
      kind: input.kind,
      value: input.value,
      plans: [...new Set(input.plans)],
      cycles: [...new Set(input.cycles)],
      duration: input.duration,
      months: input.duration === 'repeating' ? input.months : input.duration === 'once' ? 1 : 0,
      maxRedemptions: input.maxRedemptions ?? null,
      firstTimeOnly: input.firstTimeOnly,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt != null ? new Date(input.endsAt) : null,
    };
  }

  async create(input: CouponInputDto, actor: AdminActor) {
    input.code = input.code.trim().toUpperCase();
    await this.validate(input);
    const exists = await this.prisma.coupon.findUnique({ where: { code: input.code } });
    if (exists) throw new ConflictException('This code already exists.');
    await this.prisma.$transaction(async (tx) => {
      await tx.coupon.create({ data: { code: input.code, ...this.data(input) } });
      await this.audit.record(tx, actor, { action: 'coupon.create', entityType: 'coupon', entityId: input.code, summary: `Created the coupon ${input.code}` });
    });
    return this.get(input.code);
  }

  async edit(code: string, input: CouponInputDto, actor: AdminActor) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!existing) throw new NotFoundException('Coupon not found.');
    input.code = existing.code;
    const redemptions = await this.prisma.couponRedemption.count({ where: { couponCode: existing.code } });
    const locked = redemptions > 0;
    if (locked) {
      if (input.maxRedemptions != null && input.maxRedemptions < redemptions) throw new BadRequestException(`The limit cannot be below the ${redemptions} redemptions already made.`);
      if (input.endsAt != null && input.endsAt <= existing.startsAt.getTime()) throw new BadRequestException('The end date must be after the start date.');
    } else {
      await this.validate(input);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { code: existing.code },
        data: locked
          ? { description: input.description.trim(), maxRedemptions: input.maxRedemptions ?? null, endsAt: input.endsAt != null ? new Date(input.endsAt) : null }
          : this.data(input),
      });
      await this.audit.record(tx, actor, {
        action: 'coupon.edit',
        entityType: 'coupon',
        entityId: existing.code,
        summary: locked ? 'Edited the description, limit or end date' : 'Edited the coupon',
      });
    });
    return this.get(existing.code);
  }

  async setPaused(code: string, paused: boolean, actor: AdminActor) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!existing) throw new NotFoundException('Coupon not found.');
    if (existing.paused === paused) return this.get(existing.code);
    await this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({ where: { code: existing.code }, data: { paused } });
      await this.audit.record(tx, actor, {
        action: paused ? 'coupon.pause' : 'coupon.resume',
        entityType: 'coupon',
        entityId: existing.code,
        summary: paused ? 'Paused. New customers cannot use it' : 'Resumed',
      });
    });
    return this.get(existing.code);
  }

  async endNow(code: string, actor: AdminActor) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!existing) throw new NotFoundException('Coupon not found.');
    if (existing.endedEarly) return this.get(existing.code);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({ where: { code: existing.code }, data: { endedEarly: true, endsAt: existing.endsAt && existing.endsAt < now ? existing.endsAt : now } });
      await this.audit.record(tx, actor, { action: 'coupon.end', entityType: 'coupon', entityId: existing.code, summary: 'Ended now. Existing discounts keep running for their duration' });
    });
    return this.get(existing.code);
  }

  async resolveForCheckout(code: string, userId: string, plan: string, cycle: Cycle) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!coupon) throw new BadRequestException('Coupon not found.');
    const redemptions = await this.prisma.couponRedemption.count({ where: { couponCode: coupon.code } });
    const status = couponStatus(coupon, redemptions);
    if (status !== 'active') throw new BadRequestException(`Coupon ${coupon.code} is ${status.replace('_', ' ')}.`);
    const plans = coupon.plans as string[];
    const cycles = coupon.cycles as string[];
    if (plan === 'enterprise' || (plans.length && !plans.includes(plan))) throw new BadRequestException(`Coupon ${coupon.code} does not apply to this plan.`);
    if (cycles.length && !cycles.includes(cycle)) throw new BadRequestException(`Coupon ${coupon.code} does not apply to this billing cycle.`);
    if (coupon.firstTimeOnly) {
      const previous = await this.prisma.subscription.count({ where: { userId } });
      if (previous > 0) throw new BadRequestException(`Coupon ${coupon.code} is for first-time subscribers only.`);
    }
    return coupon;
  }
}