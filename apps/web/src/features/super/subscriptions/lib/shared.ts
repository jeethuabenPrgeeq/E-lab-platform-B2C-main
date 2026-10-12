import type { Cycle, IndividualPlan, PaymentStatus, PlanId, PriceBook, SubStatus, Subscription } from './types';

export { ME, cx, formatAgo, formatCount, formatDate } from '../../content/lib/shared';

export const DAY = 86_400_000;
export const GST_RATE = 0.18;
export const TARGET_MRR = 842000;

export const PLAN_META: Record<PlanId, { label: string; tone: string }> = {
  starter: { label: 'Starter', tone: 'primary' },
  professional: { label: 'Professional', tone: 'primary' },
  premium: { label: 'Premium', tone: 'success' },
  enterprise: { label: 'Enterprise', tone: 'warning' },
};

export const INDIVIDUAL_PLANS: IndividualPlan[] = ['starter', 'professional', 'premium'];
export const CYCLES: Cycle[] = ['monthly', 'quarterly', 'annual'];

export const CYCLE_META: Record<Cycle, { label: string; months: number; short: string }> = {
  monthly: { label: 'Monthly', months: 1, short: 'mo' },
  quarterly: { label: 'Quarterly', months: 3, short: 'qtr' },
  annual: { label: 'Annual', months: 12, short: 'yr' },
};

export const DEFAULT_PRICES: PriceBook = {
  starter: { monthly: 79, quarterly: 213, annual: 756 },
  professional: { monthly: 199, quarterly: 537, annual: 1908 },
  premium: { monthly: 399, quarterly: 1077, annual: 3828 },
};

export const STATUS_META: Record<SubStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'success' },
  past_due: { label: 'Past due', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: string }> = {
  succeeded: { label: 'Paid', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  partially_refunded: { label: 'Part refunded', tone: 'warning' },
};

export const isLive = (sub: Subscription) => sub.status !== 'cancelled';

export const monthlyValue = (sub: Pick<Subscription, 'amount' | 'cycle'>) => sub.amount / CYCLE_META[sub.cycle].months;

export function formatINR(value: number, opts: { decimals?: boolean } = {}) {
  const rounded = opts.decimals ? Math.round(value * 100) / 100 : Math.round(value);
  return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: opts.decimals ? 2 : 0, maximumFractionDigits: opts.decimals ? 2 : 0 })}`;
}

export function formatCompactINR(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2).replace(/\.?0+$/, '')} L`;
  return formatINR(value);
}

export function gstOf(amount: number) {
  return Math.round(((amount * GST_RATE) / (1 + GST_RATE)) * 100) / 100;
}

export function priceFor(prices: PriceBook, plan: PlanId, cycle: Cycle) {
  return plan === 'enterprise' ? null : prices[plan][cycle];
}

export function savingVsMonthly(prices: PriceBook, plan: IndividualPlan, cycle: Cycle) {
  const full = prices[plan].monthly * CYCLE_META[cycle].months;
  return full ? Math.round((1 - prices[plan][cycle] / full) * 100) : 0;
}

export function daysBetween(from: number, to: number) {
  return Math.ceil((to - from) / DAY);
}
