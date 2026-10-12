import type { ContentItem } from '../../content/lib/types';
import type { Coupon } from '../../coupons/lib/types';
import { appliesLabel, discountLabel, statusOf as couponStatus, STATUS_META as COUPON_STATUS } from '../../coupons/lib/shared';
import { CYCLE_META, PLAN_META, STATUS_META as SUB_STATUS, gstOf, isLive, monthlyValue } from '../../subscriptions/lib/shared';
import type { Payment, Subscription } from '../../subscriptions/lib/types';
import type { PlatformUser } from '../../users/lib/types';

export type TemplateId = 'revenue' | 'gst' | 'payments' | 'churn' | 'subscriptions' | 'content' | 'coupons' | 'institutions' | 'users';
export type RangeId = '7d' | '30d' | 'this_month' | 'last_month' | '90d';

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  group: 'Revenue' | 'Learners' | 'Content';
  snapshot: boolean;
  columns: string[];
}

export const TEMPLATES: Template[] = [
  { id: 'revenue', name: 'Revenue summary', description: 'Money collected each day, refunds and net revenue split by plan.', group: 'Revenue', snapshot: false, columns: ['date', 'payments', 'gross', 'refunds', 'net', 'starter', 'professional', 'premium', 'enterprise'] },
  { id: 'gst', name: 'GST summary', description: 'Taxable value, CGST and SGST per day for filing returns.', group: 'Revenue', snapshot: false, columns: ['date', 'invoices', 'total', 'taxable_value', 'cgst', 'sgst'] },
  { id: 'payments', name: 'Failed payments & refunds', description: 'Every failed charge and refund with the customer and reason.', group: 'Revenue', snapshot: false, columns: ['invoice', 'date', 'customer', 'email', 'amount', 'status', 'refunded', 'detail'] },
  { id: 'churn', name: 'Cancellations', description: 'Subscriptions that ended, with plan and the reason given.', group: 'Revenue', snapshot: false, columns: ['subscription', 'customer', 'email', 'plan', 'cycle', 'cancelled_on', 'reason'] },
  { id: 'subscriptions', name: 'Active subscriptions', description: 'Everyone paying today with plan, price and next renewal.', group: 'Revenue', snapshot: true, columns: ['subscription', 'customer', 'email', 'plan', 'cycle', 'amount', 'monthly_value', 'status', 'renews_on'] },
  { id: 'coupons', name: 'Coupon performance', description: 'Redemptions, discount given and status for every code.', group: 'Revenue', snapshot: true, columns: ['code', 'discount', 'applies_to', 'redemptions', 'limit', 'this_month', 'discount_given', 'status'] },
  { id: 'institutions', name: 'Institution usage', description: 'Enterprise institutions with seats and contract value.', group: 'Learners', snapshot: true, columns: ['institution', 'seats', 'contract_per_year', 'started_on', 'renews_on'] },
  { id: 'users', name: 'User directory', description: 'All learner, instructor and institution admin accounts.', group: 'Learners', snapshot: true, columns: ['id', 'name', 'email', 'role', 'institution', 'plan', 'status', 'joined', 'last_active'] },
  { id: 'content', name: 'Content performance', description: 'Learners, completion and rating for every catalog item.', group: 'Content', snapshot: true, columns: ['id', 'title', 'type', 'technology', 'difficulty', 'access', 'visibility', 'learners', 'completion_pct', 'rating'] },
];

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map((template) => [template.id, template])) as Record<TemplateId, Template>;

export const RANGE_LABEL: Record<RangeId, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  this_month: 'This month',
  last_month: 'Last month',
  '90d': 'Last 90 days',
};

export function rangeBounds(range: RangeId, now: number): [number, number] {
  const day = 86_400_000;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === '7d') return [start.getTime() - 6 * day, now];
  if (range === '30d') return [start.getTime() - 29 * day, now];
  if (range === '90d') return [start.getTime() - 89 * day, now];
  const month = new Date(now);
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  if (range === 'this_month') return [month.getTime(), now];
  const prev = new Date(month);
  prev.setMonth(prev.getMonth() - 1);
  return [prev.getTime(), month.getTime() - 1];
}

export interface ReportSources {
  payments: Payment[];
  subscriptions: Subscription[];
  catalog: ContentItem[];
  coupons: Coupon[];
  users: PlatformUser[];
}

export const iso = (t: number) => {
  const date = new Date(t);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const money = (value: number) => value.toFixed(2);

export function buildReport(id: TemplateId, from: number, to: number, data: ReportSources, now: number): string[][] {
  const inRange = (t: number) => t >= from && t <= to;
  switch (id) {
    case 'revenue':
    case 'gst': {
      const days = new Map<string, { count: number; gross: number; refunds: number; plan: Record<string, number>; gst: number }>();
      for (const payment of data.payments) {
        if (payment.status === 'failed' || !inRange(payment.at)) continue;
        const key = iso(payment.at);
        const entry = days.get(key) ?? { count: 0, gross: 0, refunds: 0, plan: { starter: 0, professional: 0, premium: 0, enterprise: 0 }, gst: 0 };
        entry.count += 1;
        entry.gross += payment.amount;
        entry.refunds += payment.refunded;
        entry.plan[payment.plan] += payment.amount - payment.refunded;
        entry.gst += gstOf(payment.amount);
        days.set(key, entry);
      }
      const keys = [...days.keys()].sort();
      if (id === 'revenue') return keys.map((key) => {
        const entry = days.get(key)!;
        return [key, String(entry.count), money(entry.gross), money(entry.refunds), money(entry.gross - entry.refunds), money(entry.plan.starter), money(entry.plan.professional), money(entry.plan.premium), money(entry.plan.enterprise)];
      });
      return keys.map((key) => {
        const entry = days.get(key)!;
        return [key, String(entry.count), money(entry.gross), money(entry.gross - entry.gst), money(entry.gst / 2), money(entry.gst / 2)];
      });
    }
    case 'payments':
      return data.payments
        .filter((payment) => inRange(payment.at) && (payment.status !== 'succeeded' || payment.refundRequest))
        .map((payment) => [
          payment.id,
          iso(payment.at),
          payment.name,
          payment.email,
          money(payment.amount),
          payment.status,
          money(payment.refunded),
          payment.status === 'failed' ? payment.attempts[payment.attempts.length - 1]?.note ?? '' : payment.refundRequest ? `Refund request: ${payment.refundRequest.reason} (${payment.refundRequest.status})` : payment.activity[payment.activity.length - 1]?.text ?? '',
        ]);
    case 'churn':
      return data.subscriptions
        .filter((sub) => sub.status === 'cancelled' && sub.cancelledAt && inRange(sub.cancelledAt))
        .sort((a, b) => (b.cancelledAt ?? 0) - (a.cancelledAt ?? 0))
        .map((sub) => [sub.id, sub.name, sub.email, PLAN_META[sub.plan].label, CYCLE_META[sub.cycle].label, iso(sub.cancelledAt ?? 0), sub.cancelReason ?? '']);
    case 'subscriptions':
      return data.subscriptions.filter(isLive).map((sub) => [sub.id, sub.name, sub.email, PLAN_META[sub.plan].label, CYCLE_META[sub.cycle].label, money(sub.amount), money(monthlyValue(sub)), sub.cancelAtPeriodEnd ? 'Cancelling' : SUB_STATUS[sub.status].label, iso(sub.periodEnd)]);
    case 'coupons':
      return data.coupons.map((coupon) => [coupon.code, discountLabel(coupon), appliesLabel(coupon), String(coupon.redemptions), coupon.maxRedemptions ? String(coupon.maxRedemptions) : '', String(coupon.monthRedemptions), money(coupon.discountGiven), COUPON_STATUS[couponStatus(coupon, now)].label]);
    case 'institutions':
      return data.subscriptions.filter((sub) => sub.plan === 'enterprise' && isLive(sub)).sort((a, b) => (b.seats ?? 0) - (a.seats ?? 0)).map((sub) => [sub.name, String(sub.seats ?? 0), money(sub.amount), iso(sub.startedAt), iso(sub.periodEnd)]);
    case 'users':
      return data.users.map((user) => [user.id, user.name, user.email, user.role, user.institution, user.plan, user.status, iso(user.joinedAt), user.lastActiveAt ? iso(user.lastActiveAt) : '']);
    case 'content':
      return data.catalog.map((item) => [item.id, item.title, item.type, item.technology, item.difficulty, item.tier, item.visibility, String(item.learners), String(item.completion), item.ratings ? item.rating.toFixed(1) : '']);
  }
}

const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(id: TemplateId, rows: string[][]) {
  return [TEMPLATE_MAP[id].columns.join(','), ...rows.map((row) => row.map(cell).join(','))].join('\n');
}
