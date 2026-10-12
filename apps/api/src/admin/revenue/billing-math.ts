export const CYCLE_MONTHS = { monthly: 1, quarterly: 3, annual: 12 } as const;
export const PLAN_LABEL = { starter: 'Starter', professional: 'Professional', premium: 'Premium', enterprise: 'Enterprise' } as const;
export const CYCLE_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' } as const;
export const DEFAULT_PRICES = {
  starter: { monthly: 79, quarterly: 213, annual: 756 },
  professional: { monthly: 199, quarterly: 537, annual: 1908 },
  premium: { monthly: 399, quarterly: 1077, annual: 3828 },
} as const;
export const DAY = 86_400_000;

export function addMonths(from: Date, months: number) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function unusedValue(amount: number, periodEnd: Date, cycle: keyof typeof CYCLE_MONTHS, now = new Date()) {
  const start = addMonths(periodEnd, -CYCLE_MONTHS[cycle]);
  const length = periodEnd.getTime() - start.getTime();
  const left = Math.max(0, periodEnd.getTime() - now.getTime());
  return length > 0 ? Math.round((amount * Math.min(left, length)) / length) : 0;
}

export function inr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}