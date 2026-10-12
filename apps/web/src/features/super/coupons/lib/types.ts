import type { Cycle, IndividualPlan } from '../../subscriptions/lib/types';

export type DiscountKind = 'percent' | 'fixed';
export type CouponDuration = 'once' | 'repeating' | 'forever';
export type CouponStatus = 'active' | 'scheduled' | 'paused' | 'used_up' | 'expired';

export interface Redemption {
  name: string;
  plan: IndividualPlan;
  cycle: Cycle;
  at: number;
  saved: number;
}

export interface CouponActivity {
  at: number;
  text: string;
  actor: string;
}

export interface CouponInput {
  code: string;
  description: string;
  kind: DiscountKind;
  value: number;
  plans: IndividualPlan[];
  cycles: Cycle[];
  duration: CouponDuration;
  months: number;
  maxRedemptions: number | null;
  firstTimeOnly: boolean;
  startsAt: number;
  endsAt: number | null;
}

export interface Coupon extends CouponInput {
  createdAt: number;
  paused: boolean;
  endedEarly: boolean;
  redemptions: number;
  monthRedemptions: number;
  discountGiven: number;
  monthDiscount: number;
  revenue: number;
  recent: Redemption[];
  activity: CouponActivity[];
}
