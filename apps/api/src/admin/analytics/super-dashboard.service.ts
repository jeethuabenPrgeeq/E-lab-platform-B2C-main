import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { dayKey } from '../common/time.js';
import { CYCLE_MONTHS, DAY, PLAN_LABEL } from '../revenue/billing-math.js';
import { SettingsService } from '../settings/settings.service.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PLANS = ['starter', 'professional', 'premium', 'enterprise'] as const;
const PLAN_TONE = { starter: 'neutral', professional: 'primary', premium: 'success', enterprise: 'warning' } as const;

function monthsBack(key: string, count: number) {
  const [year, month] = key.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

const label = (month: string) => MONTH_NAMES[Number(month.slice(5, 7)) - 1];
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

@Injectable()
export class SuperDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async overview() {
    const { values } = await this.settings.all();
    const timeZone = String(values.timezone);
    const gstRate = Number(values.gstRate) || 0;
    const now = new Date();
    const today = dayKey(now, timeZone);
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);
    const trendMonths = monthsBack(month, 12);
    const flowMonths = trendMonths.slice(-6);
    const since = new Date(now.getTime() - 400 * DAY);

    const [learners, subs, payments, failedOpen, refundRequests, redemptions, sessions, runs] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'LEARNER' }, select: { id: true, status: true, createdAt: true, lastLoginAt: true } }),
      this.prisma.subscription.findMany({ select: { userId: true, plan: true, cycle: true, amount: true, status: true, cancelAtPeriodEnd: true, periodEnd: true, startedAt: true, cancelledAt: true } }),
      this.prisma.payment.findMany({ where: { paidAt: { gte: since } }, select: { paidAt: true, amount: true, refunded: true, discount: true, status: true, subscriptionId: true, subscription: { select: { startedAt: true } } } }),
      this.prisma.payment.count({ where: { status: 'failed' } }),
      this.prisma.payment.count({ where: { refundStatus: 'pending' } }),
      this.prisma.couponRedemption.findMany({ where: { at: { gte: since } }, select: { at: true } }),
      this.prisma.refreshSession.findMany({ where: { createdAt: { gte: since }, user: { role: 'LEARNER' } }, select: { userId: true, createdAt: true } }),
      this.prisma.codeRun.findMany({ where: { queuedAt: { gte: since }, user: { role: 'LEARNER' } }, select: { userId: true, queuedAt: true } }),
    ]);

    const live = subs.filter((sub) => sub.status !== 'cancelled');
    const mrr = Math.round(live.reduce((sum, sub) => sum + sub.amount / CYCLE_MONTHS[sub.cycle], 0));
    const paidUserIds = new Set(live.map((sub) => sub.userId));
    const learnerIds = new Set(learners.map((user) => user.id));
    const paidLearners = [...paidUserIds].filter((id) => learnerIds.has(id)).length;
    const weekAhead = now.getTime() + 7 * DAY;
    const renewalsDue = live.filter((sub) => !sub.cancelAtPeriodEnd && sub.periodEnd.getTime() <= weekAhead).length;
    const expiring = live.filter((sub) => sub.cancelAtPeriodEnd && sub.periodEnd.getTime() <= now.getTime() + 30 * DAY).length;

    const activity: { userId: string; key: string }[] = [];
    for (const row of sessions) activity.push({ userId: row.userId, key: dayKey(row.createdAt, timeZone) });
    for (const row of runs) if (row.userId) activity.push({ userId: row.userId, key: dayKey(row.queuedAt, timeZone) });
    for (const user of learners) if (user.lastLoginAt && user.lastLoginAt >= since) activity.push({ userId: user.id, key: dayKey(user.lastLoginAt, timeZone) });
    const activeSince = (days: number) => {
      const from = dayKey(new Date(now.getTime() - (days - 1) * DAY), timeZone);
      return new Set(activity.filter((item) => item.key >= from).map((item) => item.userId)).size;
    };
    const activeByMonth = trendMonths.map((key) => new Set(activity.filter((item) => item.key.startsWith(key)).map((item) => item.userId)).size);

    const joinedKeys = learners.map((user) => dayKey(user.createdAt, timeZone));
    const weekFrom = dayKey(new Date(now.getTime() - 6 * DAY), timeZone);
    const newToday = joinedKeys.filter((key) => key === today).length;
    const newWeek = joinedKeys.filter((key) => key >= weekFrom).length;
    const newMonth = joinedKeys.filter((key) => key.startsWith(month)).length;
    const previousMonth = trendMonths[trendMonths.length - 2];
    const newPrevious = joinedKeys.filter((key) => key.startsWith(previousMonth)).length;
    const totalBeforeMonth = joinedKeys.filter((key) => key < `${month}-01`).length;

    const suspended = learners.filter((user) => user.status === 'SUSPENDED').length;
    const deactivated = learners.filter((user) => user.status === 'DEACTIVATED').length;
    const free = learners.filter((user) => user.status === 'ACTIVE' && !paidUserIds.has(user.id)).length;

    let revenueToday = 0;
    let revenueMonth = 0;
    let revenueYear = 0;
    let successfulMonth = 0;
    let refundsMonth = 0;
    let discountsMonth = 0;
    let taxMonth = 0;
    let renewalsMonth = 0;
    const revenueByMonth = new Map<string, number>();
    for (const payment of payments) {
      if (payment.status === 'failed') continue;
      const key = dayKey(payment.paidAt, timeZone);
      const net = payment.amount - payment.refunded;
      if (key.startsWith(year)) {
        revenueYear += net;
        revenueByMonth.set(key.slice(0, 7), (revenueByMonth.get(key.slice(0, 7)) ?? 0) + net);
      }
      if (key === today) revenueToday += net;
      if (key.startsWith(month)) {
        revenueMonth += net;
        successfulMonth += 1;
        discountsMonth += payment.discount;
        taxMonth += net - (net * 100) / (100 + gstRate);
        if (payment.refunded > 0) refundsMonth += 1;
        if (payment.subscription && dayKey(payment.subscription.startedAt, timeZone).slice(0, 7) !== month) renewalsMonth += 1;
      }
    }
    const yearMonths = trendMonths.filter((key) => key.startsWith(year));

    const started = flowMonths.map((key) => subs.filter((sub) => dayKey(sub.startedAt, timeZone).startsWith(key)).length);
    const cancelled = flowMonths.map((key) => subs.filter((sub) => sub.cancelledAt && dayKey(sub.cancelledAt, timeZone).startsWith(key)).length);
    const couponMonth = redemptions.filter((row) => dayKey(row.at, timeZone).startsWith(month)).length;
    const pastDue = live.filter((sub) => sub.status === 'past_due').length;

    return {
      updatedAt: new Intl.DateTimeFormat('en-IN', { timeZone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
      activeUsersTrend: { labels: trendMonths.map(label), values: activeByMonth },
      subscriptionFlow: { labels: flowMonths.map(label), started, cancelled: cancelled },
      revenueTrend: { labels: yearMonths.map(label), values: yearMonths.map((key) => revenueByMonth.get(key) ?? 0) },
      highlights: [
        { key: 'mrr', label: 'MRR', value: mrr, format: 'currency', tone: 'primary' },
        { key: 'paymentsToday', label: 'Payments today', value: revenueToday, format: 'currency', tone: 'success' },
        { key: 'failedPayments', label: 'Failed payments', value: failedOpen, tone: 'danger' },
        { key: 'refundRequests', label: 'Refund requests', value: refundRequests, tone: 'warning' },
        { key: 'renewalsDue', label: 'Renewals due in 7 days', value: renewalsDue, tone: 'neutral' },
      ],
      userTotals: [
        { key: 'totalRegistered', label: 'Total registered learners', value: learners.length, tone: 'primary' },
        { key: 'activeUsers', label: 'Active learners, 30 days', value: activeSince(30), tone: 'success' },
        { key: 'paidUsers', label: 'Paid learners', value: paidLearners, tone: 'primary' },
        { key: 'userGrowth', label: 'Learner growth this month', value: pct(newMonth, totalBeforeMonth), format: 'percent', tone: newMonth >= newPrevious ? 'success' : 'warning' },
      ],
      engagement: [
        { key: 'newToday', label: 'New learners today', value: newToday },
        { key: 'newThisWeek', label: 'New learners, 7 days', value: newWeek },
        { key: 'newThisMonth', label: 'New learners this month', value: newMonth },
        { key: 'dau', label: 'Daily active learners', value: activeSince(1), tone: 'primary' },
        { key: 'wau', label: 'Weekly active learners', value: activeSince(7), tone: 'primary' },
        { key: 'mau', label: 'Monthly active learners', value: activeSince(30), tone: 'primary' },
      ],
      accountStatus: [
        { key: 'free', label: 'Free learners', value: free, tone: 'neutral' },
        { key: 'paid', label: 'Paid learners', value: paidLearners, tone: 'primary' },
        { key: 'suspended', label: 'Suspended', value: suspended, tone: 'warning' },
        { key: 'deactivated', label: 'Deactivated', value: deactivated, tone: 'danger' },
      ],
      subscriptions: [
        { key: 'active', label: 'Active subscriptions', value: live.length, tone: 'primary' },
        { key: 'new', label: 'New this month', value: started[started.length - 1], tone: 'success' },
        { key: 'renewals', label: 'Renewals this month', value: renewalsMonth, tone: 'success' },
        { key: 'expiring', label: 'Ending in 30 days', value: expiring, tone: 'warning' },
        { key: 'cancelled', label: 'Cancelled this month', value: cancelled[cancelled.length - 1], tone: 'danger' },
        { key: 'freeToPaid', label: 'Free-to-paid conversion', value: pct(paidLearners, learners.length), format: 'percent' },
      ],
      planDistribution: PLANS.map((plan) => ({ key: plan, label: PLAN_LABEL[plan], value: live.filter((sub) => sub.plan === plan).length, tone: PLAN_TONE[plan] })),
      billingCycles: (['monthly', 'quarterly', 'annual'] as const).map((cycle) => ({ key: cycle, label: `${cycle[0].toUpperCase()}${cycle.slice(1)} plans`, value: live.filter((sub) => sub.cycle === cycle).length, tone: 'primary' })),
      revenue: [
        { key: 'revenueToday', label: 'Revenue today', value: revenueToday, format: 'currency' },
        { key: 'revenueMonth', label: 'Revenue this month', value: revenueMonth, format: 'currency' },
        { key: 'revenueYear', label: 'Revenue this year', value: revenueYear, format: 'currency' },
        { key: 'mrr', label: 'Monthly recurring revenue', value: mrr, format: 'currency', tone: 'primary' },
        { key: 'arr', label: 'Annual recurring revenue', value: mrr * 12, format: 'currency', tone: 'primary' },
      ],
      transactions: [
        { key: 'successful', label: 'Successful this month', value: successfulMonth, tone: 'success' },
        { key: 'failed', label: 'Failed, not recovered', value: failedOpen, tone: 'danger' },
        { key: 'outstandingInvoices', label: 'Past-due subscriptions', value: pastDue, tone: 'warning' },
        { key: 'refunds', label: 'Refunds this month', value: refundsMonth, tone: 'warning' },
        { key: 'taxCollected', label: 'GST collected this month', value: Math.round(taxMonth), format: 'currency' },
        { key: 'discountsGiven', label: 'Discounts this month', value: discountsMonth, format: 'currency' },
        { key: 'couponUsage', label: 'Coupon uses this month', value: couponMonth },
      ],
    };
  }
}
