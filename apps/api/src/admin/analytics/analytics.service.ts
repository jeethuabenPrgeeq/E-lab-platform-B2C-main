import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { dayKey } from '../common/time.js';
import { CYCLE_MONTHS, DAY } from '../revenue/billing-math.js';
import { SettingsService } from '../settings/settings.service.js';

export const ANALYTICS_RANGES = { '30d': { days: 30, bucket: 'day' }, '90d': { days: 90, bucket: 'week' }, '12m': { days: 365, bucket: 'month' } } as const;
export type AnalyticsRange = keyof typeof ANALYTICS_RANGES;
type Bucket = (typeof ANALYTICS_RANGES)[AnalyticsRange]['bucket'];

const PLANS = ['starter', 'professional', 'premium', 'enterprise'] as const;
const COHORT_MONTHS = 6;

function bucketOf(key: string, bucket: Bucket) {
  if (bucket === 'day') return key;
  if (bucket === 'month') return `${key.slice(0, 7)}-01`;
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function monthsBack(key: string, count: number) {
  const [year, month] = key.split('-').map(Number);
  const list: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - i, 1));
    list.push(date.toISOString().slice(0, 7));
  }
  return list;
}

const pct = (current: number, previous: number) => (previous ? Math.round(((current - previous) / previous) * 1000) / 10 : null);
const monthly = (sub: { amount: number; cycle: keyof typeof CYCLE_MONTHS }) => sub.amount / CYCLE_MONTHS[sub.cycle];

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private async activeLearners(from: Date, to: Date) {
    const rows = await this.prisma.refreshSession.findMany({
      where: { createdAt: { gte: from, lt: to }, user: { role: 'LEARNER' } },
      distinct: ['userId'],
      select: { userId: true },
    });
    return rows.length;
  }

  async overview(range: AnalyticsRange) {
    const { values } = await this.settings.all();
    const timeZone = String(values.timezone);
    const { days, bucket } = ANALYTICS_RANGES[range];
    const now = new Date();
    const start = new Date(now.getTime() - days * DAY);
    const prevStart = new Date(start.getTime() - days * DAY);

    const [signupRows, subRows, mau, mauPrev, catalog] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'LEARNER', createdAt: { gte: prevStart } }, select: { createdAt: true } }),
      this.prisma.subscription.findMany({
        select: { id: true, plan: true, cycle: true, amount: true, status: true, startedAt: true, cancelledAt: true, seats: true, institution: true, user: { select: { name: true } } },
      }),
      this.activeLearners(new Date(now.getTime() - 30 * DAY), now),
      this.activeLearners(new Date(now.getTime() - (30 + days) * DAY), new Date(now.getTime() - days * DAY)),
      this.prisma.problem.groupBy({ by: ['technologyId'], where: { status: 'published', visibility: 'listed' }, _count: { _all: true } }),
    ]);

    const keys: string[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = bucketOf(dayKey(new Date(now.getTime() - i * DAY), timeZone), bucket);
      if (keys[keys.length - 1] !== key) keys.push(key);
    }
    const series = new Map(keys.map((key) => [key, { signups: 0, paid: 0 }]));
    let signups = 0;
    let signupsPrev = 0;
    for (const row of signupRows) {
      if (row.createdAt >= start) {
        signups += 1;
        const entry = series.get(bucketOf(dayKey(row.createdAt, timeZone), bucket));
        if (entry) entry.signups += 1;
      } else signupsPrev += 1;
    }
    let paid = 0;
    let paidPrev = 0;
    for (const sub of subRows) {
      if (sub.startedAt >= start) {
        paid += 1;
        const entry = series.get(bucketOf(dayKey(sub.startedAt, timeZone), bucket));
        if (entry) entry.paid += 1;
      } else if (sub.startedAt >= prevStart) paidPrev += 1;
    }

    const live = subRows.filter((sub) => sub.status !== 'cancelled');
    const mrr = Math.round(live.reduce((sum, sub) => sum + monthly(sub), 0));
    const individual = live.filter((sub) => sub.plan !== 'enterprise');
    const individualMrr = individual.reduce((sum, sub) => sum + monthly(sub), 0);

    const today = dayKey(now, timeZone);
    const mrrMonths = monthsBack(today, 12);
    const mrrSeries = mrrMonths.map((month, index) => {
      const [year, m] = month.split('-').map(Number);
      const at = index === mrrMonths.length - 1 ? now : new Date(Date.UTC(year, m, 1) - 1);
      const value = subRows
        .filter((sub) => sub.startedAt <= at && (!sub.cancelledAt || sub.cancelledAt > at) && !(sub.status === 'cancelled' && !sub.cancelledAt))
        .reduce((sum, sub) => sum + monthly(sub), 0);
      return { month, mrr: Math.round(value) };
    });

    const cohortMonths = monthsBack(today, COHORT_MONTHS);
    const cohortFrom = new Date(`${cohortMonths[0]}-01T00:00:00Z`);
    const [cohortUsers, cohortSessions] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'LEARNER', createdAt: { gte: new Date(cohortFrom.getTime() - DAY) } }, select: { id: true, createdAt: true } }),
      this.prisma.refreshSession.findMany({ where: { createdAt: { gte: new Date(cohortFrom.getTime() - DAY) }, user: { role: 'LEARNER' } }, select: { userId: true, createdAt: true } }),
    ]);
    const signupMonth = new Map<string, string>();
    for (const user of cohortUsers) {
      const month = dayKey(user.createdAt, timeZone).slice(0, 7);
      if (cohortMonths.includes(month)) signupMonth.set(user.id, month);
    }
    const seen = new Map<string, Set<string>>();
    for (const session of cohortSessions) {
      if (!signupMonth.has(session.userId)) continue;
      const month = dayKey(session.createdAt, timeZone).slice(0, 7);
      const set = seen.get(session.userId) ?? new Set<string>();
      set.add(month);
      seen.set(session.userId, set);
    }
    const cohorts = cohortMonths.map((month, cohortIndex) => {
      const members = [...signupMonth.entries()].filter(([, value]) => value === month).map(([id]) => id);
      const retention = Array.from({ length: COHORT_MONTHS }, (_, offset) => {
        if (cohortIndex + offset > COHORT_MONTHS - 1) return null;
        if (!members.length) return null;
        if (offset === 0) return 100;
        const target = cohortMonths[cohortIndex + offset];
        const active = members.filter((id) => seen.get(id)?.has(target)).length;
        return Math.round((active / members.length) * 100);
      });
      return { month, size: members.length, retention };
    });

    const technologies = await this.prisma.technology.findMany({ where: { id: { in: catalog.map((row) => row.technologyId) } }, select: { id: true, name: true } });
    const techName = new Map(technologies.map((tech) => [tech.id, tech.name]));

    return {
      range,
      timeZone,
      kpis: {
        monthlyActive: mau,
        monthlyActiveDelta: pct(mau, mauPrev),
        signups,
        signupsDelta: pct(signups, signupsPrev),
        newPaid: paid,
        newPaidDelta: pct(paid, paidPrev),
        conversion: signups ? Math.round((paid / signups) * 1000) / 10 : 0,
        conversionDelta: signups && signupsPrev && paidPrev ? pct(paid / signups, paidPrev / signupsPrev) : null,
        mrr,
        arpu: individual.length ? Math.round(individualMrr / individual.length) : 0,
      },
      growth: keys.map((key) => ({ bucket: key, ...series.get(key)! })),
      mrrSeries,
      byPlan: PLANS.map((plan) => {
        const subs = live.filter((sub) => sub.plan === plan);
        return { plan, count: subs.length, mrr: Math.round(subs.reduce((sum, sub) => sum + monthly(sub), 0)) };
      }),
      funnel: [
        { key: 'visited', label: 'Visited eLab', value: null },
        { key: 'signed_up', label: 'Signed up', value: signups },
        { key: 'first_solve', label: 'Solved a first problem', value: null },
        { key: 'trial', label: 'Started a trial', value: null },
        { key: 'paid', label: 'Became paying', value: paid },
      ],
      cohorts,
      technologies: catalog
        .map((row) => ({ name: techName.get(row.technologyId) ?? 'Unknown', items: row._count._all, learners: null, completion: null }))
        .sort((a, b) => b.items - a.items)
        .slice(0, 12),
      enterprise: live
        .filter((sub) => sub.plan === 'enterprise')
        .map((sub) => ({ id: sub.id, name: sub.institution ?? sub.user.name, seats: sub.seats ?? 0, activeSeats: null, contract: sub.amount }))
        .sort((a, b) => b.seats - a.seats),
      notTracked: ['visitors', 'trials', 'first_solve', 'technology_learners', 'enterprise_active_seats'],
    };
  }
}