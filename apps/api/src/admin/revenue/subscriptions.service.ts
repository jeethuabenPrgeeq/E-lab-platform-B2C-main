import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { activityFor } from '../content/activity.js';
import { CYCLE_LABEL, CYCLE_MONTHS, DAY, PLAN_LABEL, addMonths, inr, unusedValue } from './billing-math.js';
import { CouponsService, discountFor } from './coupons.service.js';
import { PricesService } from './prices.service.js';
import type {
  CancelSubscriptionDto,
  ChangePlanDto,
  CreateSubscriptionDto,
  ExtendSubscriptionDto,
  PaymentQueryDto,
  RefundDto,
  SubscriptionQueryDto,
} from './revenue.dto.js';

type Tx = Prisma.TransactionClient;
const USER = { select: { id: true, name: true, email: true } } as const;
type SubRow = Prisma.SubscriptionGetPayload<{ include: { user: typeof USER } }>;
type PayRow = Prisma.PaymentGetPayload<{ include: { user: typeof USER } }>;

export interface Attempt {
  at: number;
  ok: boolean;
  note: string;
}

function presentSub(row: SubRow) {
  return {
    id: row.id,
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    institution: row.institution,
    seats: row.seats,
    plan: row.plan,
    cycle: row.cycle,
    amount: row.amount,
    status: row.status,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    pendingChange: row.pendingPlan && row.pendingCycle && row.pendingAmount != null ? { plan: row.pendingPlan, cycle: row.pendingCycle, amount: row.pendingAmount } : null,
    startedAt: row.startedAt.getTime(),
    periodEnd: row.periodEnd.getTime(),
    cancelledAt: row.cancelledAt?.getTime() ?? null,
    cancelReason: row.cancelReason,
    method: row.method,
    methodLabel: row.methodLabel,
    coupon: row.couponCode,
  };
}

function presentPayment(row: PayRow) {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    name: row.user.name,
    email: row.user.email,
    plan: row.plan,
    cycle: row.cycle,
    listAmount: row.listAmount,
    discount: row.discount,
    coupon: row.couponCode,
    amount: row.amount,
    at: row.paidAt.getTime(),
    status: row.status,
    refunded: row.refunded,
    attempts: row.attempts as unknown as Attempt[],
    refundRequest: row.refundStatus
      ? { reason: row.refundReason ?? '', requestedAt: row.refundRequestedAt?.getTime() ?? row.createdAt.getTime(), status: row.refundStatus, note: row.refundNote }
      : null,
    method: row.method,
    methodLabel: row.methodLabel,
  };
}

const METHOD_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', invoice: 'Invoice' } as const;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly prices: PricesService,
    private readonly coupons: CouponsService,
  ) {}

  async list(query: SubscriptionQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.plan ? { plan: query.plan } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.cycle ? { cycle: query.cycle } : {}),
      ...(query.q
        ? {
            OR: [
              { user: { email: { contains: query.q, mode: 'insensitive' } } },
              { user: { name: { contains: query.q, mode: 'insensitive' } } },
              { institution: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total, live, byStatus, cancelling] = await Promise.all([
      this.prisma.subscription.findMany({ where, include: { user: USER }, orderBy: { startedAt: query.order ?? 'desc' }, skip, take }),
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({ where: { status: { not: 'cancelled' } }, select: { amount: true, cycle: true, plan: true } }),
      this.prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.subscription.count({ where: { status: { not: 'cancelled' }, cancelAtPeriodEnd: true } }),
    ]);
    const mrr = Math.round(live.reduce((sum, sub) => sum + sub.amount / CYCLE_MONTHS[sub.cycle], 0));
    const byPlan: Record<string, number> = {};
    for (const sub of live) byPlan[sub.plan] = (byPlan[sub.plan] ?? 0) + 1;
    return {
      items: rows.map(presentSub),
      total,
      page,
      pageSize,
      metrics: {
        mrr,
        live: live.length,
        cancelling,
        byPlan,
        statusCounts: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
      },
    };
  }

  async get(id: string) {
    const row = await this.prisma.subscription.findUnique({ where: { id }, include: { user: USER } });
    if (!row) throw new NotFoundException('Subscription not found.');
    const [payments, activity] = await Promise.all([
      this.prisma.payment.findMany({ where: { subscriptionId: id }, include: { user: USER }, orderBy: { paidAt: 'desc' } }),
      activityFor(this.prisma, 'subscription', [id]),
    ]);
    return { ...presentSub(row), payments: payments.map(presentPayment), activity: activity.get(id) ?? [] };
  }

  private async recordPayment(tx: Tx, sub: { id: string; userId: string; method: SubRow['method']; methodLabel: string }, values: { plan: SubRow['plan']; cycle: SubRow['cycle']; listAmount: number; discount: number; couponCode: string | null; note: string }) {
    const amount = Math.max(0, values.listAmount - values.discount);
    return tx.payment.create({
      data: {
        subscriptionId: sub.id,
        userId: sub.userId,
        plan: values.plan,
        cycle: values.cycle,
        listAmount: values.listAmount,
        discount: values.discount,
        couponCode: values.couponCode,
        amount,
        status: 'succeeded',
        attempts: [{ at: Date.now(), ok: true, note: values.note }],
        method: sub.method,
        methodLabel: sub.methodLabel,
      },
    });
  }

  async create(dto: CreateSubscriptionDto, actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user) throw new NotFoundException('No user with this email.');
    const current = await this.prisma.subscription.findFirst({ where: { userId: user.id, status: { not: 'cancelled' } } });
    if (current) throw new ConflictException('This user already has a live subscription. Change its plan instead.');
    const listAmount = dto.plan === 'enterprise' ? dto.amount! : (await this.prices.book())[dto.plan][dto.cycle];
    const coupon = dto.coupon?.trim() ? await this.coupons.resolveForCheckout(dto.coupon, user.id, dto.plan, dto.cycle) : null;
    const discount = coupon ? discountFor(coupon, listAmount) : 0;
    const now = new Date();
    const id = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          userId: user.id,
          plan: dto.plan,
          cycle: dto.cycle,
          amount: listAmount,
          institution: dto.plan === 'enterprise' ? dto.institution!.trim() : null,
          seats: dto.plan === 'enterprise' ? dto.seats! : null,
          method: dto.method,
          methodLabel: dto.methodLabel?.trim() || METHOD_LABEL[dto.method],
          couponCode: coupon?.code ?? null,
          startedAt: now,
          periodEnd: addMonths(now, CYCLE_MONTHS[dto.cycle]),
        },
      });
      await this.recordPayment(tx, sub, { plan: dto.plan, cycle: dto.cycle, listAmount, discount, couponCode: coupon?.code ?? null, note: 'Recorded by super admin' });
      if (coupon) {
        await tx.couponRedemption.create({ data: { couponCode: coupon.code, userId: user.id, subscriptionId: sub.id, plan: dto.plan, cycle: dto.cycle, saved: discount, revenue: listAmount - discount } });
      }
      await this.audit.record(tx, actor, {
        action: 'subscription.create',
        entityType: 'subscription',
        entityId: sub.id,
        summary: `Started ${PLAN_LABEL[dto.plan]} (${CYCLE_LABEL[dto.cycle]}) for ${user.email} at ${inr(listAmount - discount)}${coupon ? ` with ${coupon.code}` : ''}`,
      });
      return sub.id;
    });
    return this.get(id);
  }

  private async live(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found.');
    if (sub.status === 'cancelled') throw new BadRequestException('This subscription is cancelled.');
    return sub;
  }

  async changePlan(id: string, dto: ChangePlanDto, actor: AdminActor) {
    const sub = await this.live(id);
    if (sub.plan === 'enterprise') throw new BadRequestException('Enterprise contracts are changed by the sales team, not here.');
    if (sub.plan === dto.plan && sub.cycle === dto.cycle) throw new BadRequestException('The subscription is already on this plan.');
    const amount = (await this.prices.book())[dto.plan][dto.cycle];
    const label = `${PLAN_LABEL[dto.plan]} (${CYCLE_LABEL[dto.cycle]})`;
    await this.prisma.$transaction(async (tx) => {
      if (dto.when === 'renewal') {
        await tx.subscription.update({ where: { id }, data: { pendingPlan: dto.plan, pendingCycle: dto.cycle, pendingAmount: amount } });
        await this.audit.record(tx, actor, { action: 'subscription.schedule_change', entityType: 'subscription', entityId: id, summary: `Scheduled a change to ${label} from the next renewal` });
        return;
      }
      const now = new Date();
      const credit = unusedValue(sub.amount, sub.periodEnd, sub.cycle, now);
      const due = Math.max(0, amount - credit);
      await tx.subscription.update({
        where: { id },
        data: { plan: dto.plan, cycle: dto.cycle, amount, pendingPlan: null, pendingCycle: null, pendingAmount: null, periodEnd: addMonths(now, CYCLE_MONTHS[dto.cycle]) },
      });
      if (due > 0) {
        await this.recordPayment(tx, sub, { plan: dto.plan, cycle: dto.cycle, listAmount: amount, discount: Math.min(credit, amount), couponCode: null, note: `Prorated charge for switching to ${label}` });
      }
      await this.audit.record(tx, actor, {
        action: 'subscription.change',
        entityType: 'subscription',
        entityId: id,
        summary: `Changed to ${label} now. ${inr(credit)} credit for unused time, charged ${inr(due)}`,
      });
    });
    return this.get(id);
  }

  async cancel(id: string, dto: CancelSubscriptionDto, actor: AdminActor) {
    const sub = await this.live(id);
    const reason = dto.reason.trim();
    await this.prisma.$transaction(async (tx) => {
      if (dto.mode === 'period_end') {
        await tx.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: true, cancelReason: reason, pendingPlan: null, pendingCycle: null, pendingAmount: null } });
        await this.audit.record(tx, actor, { action: 'subscription.cancel_at_end', entityType: 'subscription', entityId: id, summary: `Set to cancel at the end of the period: ${reason}` });
        return;
      }
      const now = new Date();
      let refundNote = '';
      if (dto.refundUnused) {
        const last = await tx.payment.findFirst({ where: { subscriptionId: id, status: { in: ['succeeded', 'partially_refunded'] } }, orderBy: { paidAt: 'desc' } });
        if (last) {
          const unused = Math.min(last.amount - last.refunded, unusedValue(sub.amount, sub.periodEnd, sub.cycle, now));
          if (unused > 0) {
            const refunded = last.refunded + unused;
            await tx.payment.update({ where: { id: last.id }, data: { refunded, status: refunded >= last.amount ? 'refunded' : 'partially_refunded' } });
            await this.audit.record(tx, actor, { action: 'payment.refund', entityType: 'payment', entityId: last.id, summary: `Refunded ${inr(unused)} for unused time after cancelling` });
            refundNote = ` and refunded ${inr(unused)}`;
          }
        }
      }
      await tx.subscription.update({
        where: { id },
        data: { status: 'cancelled', cancelAtPeriodEnd: false, cancelledAt: now, periodEnd: now, cancelReason: reason, pendingPlan: null, pendingCycle: null, pendingAmount: null },
      });
      await this.audit.record(tx, actor, { action: 'subscription.cancel', entityType: 'subscription', entityId: id, summary: `Cancelled immediately${refundNote}: ${reason}` });
    });
    return this.get(id);
  }

  async resume(id: string, actor: AdminActor) {
    const sub = await this.live(id);
    if (!sub.cancelAtPeriodEnd) throw new BadRequestException('This subscription is not set to cancel.');
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: false, cancelReason: null } });
      await this.audit.record(tx, actor, { action: 'subscription.resume', entityType: 'subscription', entityId: id, summary: 'Resumed. The subscription will renew again' });
    });
    return this.get(id);
  }

  async extend(id: string, dto: ExtendSubscriptionDto, actor: AdminActor) {
    const sub = await this.live(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id }, data: { periodEnd: new Date(sub.periodEnd.getTime() + dto.days * DAY) } });
      await this.audit.record(tx, actor, { action: 'subscription.extend', entityType: 'subscription', entityId: id, summary: `Added ${dto.days} free days: ${dto.reason.trim()}` });
    });
    return this.get(id);
  }

  async payments(query: PaymentQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.refund ? { refundStatus: 'pending' } : {}),
      ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
      ...(query.q
        ? { OR: [{ id: { contains: query.q } }, { user: { email: { contains: query.q, mode: 'insensitive' } } }, { user: { name: { contains: query.q, mode: 'insensitive' } } }] }
        : {}),
    };
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [rows, total, collected, failed, pendingRefunds] = await Promise.all([
      this.prisma.payment.findMany({ where, include: { user: USER }, orderBy: { paidAt: query.order ?? 'desc' }, skip, take }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({ where: { paidAt: { gte: monthStart }, status: { in: ['succeeded', 'partially_refunded', 'refunded'] } }, _sum: { amount: true, refunded: true } }),
      this.prisma.payment.count({ where: { status: 'failed' } }),
      this.prisma.payment.count({ where: { refundStatus: 'pending' } }),
    ]);
    return {
      items: rows.map(presentPayment),
      total,
      page,
      pageSize,
      metrics: {
        collectedThisMonth: (collected._sum.amount ?? 0) - (collected._sum.refunded ?? 0),
        refundedThisMonth: collected._sum.refunded ?? 0,
        failed,
        pendingRefunds,
      },
    };
  }

  async getPayment(id: string) {
    const row = await this.prisma.payment.findUnique({ where: { id }, include: { user: USER } });
    if (!row) throw new NotFoundException('Payment not found.');
    const activity = await activityFor(this.prisma, 'payment', [id]);
    return { ...presentPayment(row), activity: activity.get(id) ?? [] };
  }

  async retryPayment(id: string, actor: AdminActor) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { subscription: true } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== 'failed') throw new BadRequestException('Only failed payments can be retried.');
    const now = Date.now();
    const attempts = [...(payment.attempts as unknown as Attempt[]), { at: now, ok: true, note: 'Manual retry succeeded' }];
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id }, data: { status: 'succeeded', paidAt: new Date(now), attempts: attempts as unknown as Prisma.InputJsonValue } });
      await this.audit.record(tx, actor, { action: 'payment.retry', entityType: 'payment', entityId: id, summary: 'Retried the payment manually' });
      const sub = payment.subscription;
      if (sub.status === 'past_due') {
        await tx.subscription.update({ where: { id: sub.id }, data: { status: 'active', periodEnd: addMonths(sub.periodEnd, CYCLE_MONTHS[sub.cycle]) } });
        await this.audit.record(tx, actor, { action: 'subscription.recover', entityType: 'subscription', entityId: sub.id, summary: 'Payment recovered. Renewed until the next period' });
      }
    });
    return this.getPayment(id);
  }

  async refund(id: string, dto: RefundDto, actor: AdminActor) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== 'succeeded' && payment.status !== 'partially_refunded') throw new BadRequestException('Only successful payments can be refunded.');
    const refundable = payment.amount - payment.refunded;
    if (dto.amount > refundable) throw new BadRequestException(`At most ${inr(refundable)} can still be refunded.`);
    const reason = dto.reason.trim();
    const refunded = payment.refunded + dto.amount;
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: {
          refunded,
          status: refunded >= payment.amount ? 'refunded' : 'partially_refunded',
          ...(payment.refundStatus === 'pending' ? { refundStatus: 'approved', refundNote: reason } : {}),
        },
      });
      await this.audit.record(tx, actor, { action: 'payment.refund', entityType: 'payment', entityId: id, summary: `Refunded ${inr(dto.amount)}: ${reason}` });
    });
    return this.getPayment(id);
  }

  async rejectRefund(id: string, reason: string, actor: AdminActor) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.refundStatus !== 'pending') throw new BadRequestException('There is no pending refund request on this payment.');
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id }, data: { refundStatus: 'rejected', refundNote: reason.trim() } });
      await this.audit.record(tx, actor, { action: 'payment.refund_reject', entityType: 'payment', entityId: id, summary: `Declined the refund request: ${reason.trim()}` });
    });
    return this.getPayment(id);
  }
}