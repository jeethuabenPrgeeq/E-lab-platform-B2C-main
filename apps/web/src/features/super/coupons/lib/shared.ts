import { CYCLE_META, PLAN_META, formatINR } from '../../subscriptions/lib/shared';
import type { PriceBook } from '../../subscriptions/lib/types';
import type { Coupon, CouponInput, CouponStatus } from './types';

export { CYCLES, CYCLE_META, INDIVIDUAL_PLANS, PLAN_META, ME, cx, formatAgo, formatCompactINR, formatDate, formatINR } from '../../subscriptions/lib/shared';

export const CODE_PATTERN = /^[A-Z0-9-]{4,20}$/;

export const STATUS_META: Record<CouponStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'primary' },
  paused: { label: 'Paused', tone: 'warning' },
  used_up: { label: 'Used up', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
};

export function statusOf(coupon: Coupon, now: number): CouponStatus {
  if (coupon.endedEarly || (coupon.endsAt !== null && coupon.endsAt <= now)) return 'expired';
  if (coupon.maxRedemptions !== null && coupon.redemptions >= coupon.maxRedemptions) return 'used_up';
  if (coupon.paused) return 'paused';
  if (coupon.startsAt > now) return 'scheduled';
  return 'active';
}

export function discountLabel(coupon: Pick<CouponInput, 'kind' | 'value'>) {
  return coupon.kind === 'percent' ? `${coupon.value}% off` : `${formatINR(coupon.value)} off`;
}

export function appliesLabel(coupon: Pick<CouponInput, 'plans' | 'cycles'>) {
  const plans = coupon.plans.length ? coupon.plans.map((plan) => PLAN_META[plan].label).join(', ') : 'All plans';
  const cycles = coupon.cycles.length ? coupon.cycles.map((cycle) => CYCLE_META[cycle].label.toLowerCase()).join(', ') : 'any cycle';
  return `${plans} · ${cycles}`;
}

export function durationLabel(coupon: Pick<CouponInput, 'duration' | 'months'>) {
  if (coupon.duration === 'once') return 'First payment only';
  if (coupon.duration === 'forever') return 'Every payment';
  return `First ${coupon.months} months`;
}

export function validateCoupon(input: CouponInput, existingCodes: Set<string>, prices: PriceBook, editingCode: string | null): Partial<Record<keyof CouponInput | 'form', string>> {
  const errors: Partial<Record<keyof CouponInput | 'form', string>> = {};
  if (!CODE_PATTERN.test(input.code)) errors.code = 'Use 4–20 capital letters, numbers or hyphens';
  else if (input.code !== editingCode && existingCodes.has(input.code)) errors.code = 'This code already exists';
  if (!Number.isFinite(input.value) || input.value <= 0) errors.value = 'Enter a discount above zero';
  else if (input.kind === 'percent' && input.value > 90) errors.value = 'Percentage discounts top out at 90%';
  else if (input.kind === 'fixed') {
    const plans = input.plans.length ? input.plans : (Object.keys(prices) as (keyof PriceBook)[]);
    const cycles = input.cycles.length ? input.cycles : (['monthly', 'quarterly', 'annual'] as const);
    const cheapest = Math.min(...plans.flatMap((plan) => cycles.map((cycle) => prices[plan][cycle])));
    if (input.value >= cheapest) errors.value = `Must be less than the cheapest matching price (${formatINR(cheapest)})`;
  }
  if (input.duration === 'repeating' && (input.months < 2 || input.months > 12)) errors.months = 'Between 2 and 12 months';
  if (input.duration !== 'once' && input.cycles.length && !input.cycles.includes('monthly')) errors.duration = 'Repeating discounts only make sense with monthly billing';
  if (input.maxRedemptions !== null && (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1)) errors.maxRedemptions = 'Leave blank for no limit, or enter 1 or more';
  if (!Number.isFinite(input.startsAt)) errors.startsAt = 'Pick a start date';
  if (input.endsAt !== null && Number.isFinite(input.startsAt) && input.endsAt <= input.startsAt) errors.endsAt = 'Must be after the start date';
  return errors;
}
