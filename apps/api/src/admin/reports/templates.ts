import type { RangeId, TemplateId } from './reports.dto.js';

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
  { id: 'users', name: 'User directory', description: 'All learner and admin accounts.', group: 'Learners', snapshot: true, columns: ['id', 'name', 'email', 'role', 'plan', 'status', 'joined', 'last_active'] },
  { id: 'content', name: 'Content performance', description: 'Access tier and visibility for every catalog item.', group: 'Content', snapshot: true, columns: ['id', 'title', 'type', 'technology', 'difficulty', 'access', 'visibility', 'learners', 'completion_pct', 'rating'] },
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

export function nextRun(schedule: { frequency: 'weekly' | 'monthly'; weekday: number; dayOfMonth: number; hour: number }, now: number) {
  const date = new Date(now);
  date.setMinutes(0, 0, 0);
  date.setHours(schedule.hour);
  if (schedule.frequency === 'weekly') {
    const diff = (schedule.weekday - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + diff);
    if (date.getTime() <= now) date.setDate(date.getDate() + 7);
    return date.getTime();
  }
  date.setDate(schedule.dayOfMonth);
  if (date.getTime() <= now) date.setMonth(date.getMonth() + 1, schedule.dayOfMonth);
  return date.getTime();
}

const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(id: TemplateId, rows: string[][]) {
  return [TEMPLATE_MAP[id].columns.join(','), ...rows.map((row) => row.map(cell).join(','))].join('\n');
}