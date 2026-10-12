'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PRICES } from '../../subscriptions/lib/shared';
import type { Cycle, IndividualPlan } from '../../subscriptions/lib/types';
import { ME, discountLabel } from './shared';
import type { Coupon, CouponActivity, CouponInput, Redemption } from './types';

const KEY = 'elab_super_coupons_v1';
const DAY = 86_400_000;

const NAMES = ['Aarav Nair', 'Diya Menon', 'Rahul Iyer', 'Ananya Rao', 'Karthik Shetty', 'Meghana Reddy', 'Arjun George', 'Fathima Rasheed', 'Nikhil Joseph', 'Sneha Pillai', 'Rohan Hegde', 'Kavya Krishnan', 'Ishaan Das', 'Riya Thomas', 'Tanvi Bhat', 'Gautham Kumar'];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Spec = Omit<CouponInput, 'startsAt' | 'endsAt'> & { start: number; end: number | null; paused?: boolean; endedEarly?: boolean; redemptions: number; monthShare: number };

const SPECS: Spec[] = [
  { code: 'LAUNCH20', description: 'Launch offer for new learners', kind: 'percent', value: 20, plans: [], cycles: [], duration: 'once', months: 0, maxRedemptions: null, firstTimeOnly: true, start: -300, end: null, redemptions: 1840, monthShare: 0.05 },
  { code: 'STUDENT15', description: 'Verified students, any plan', kind: 'percent', value: 15, plans: [], cycles: [], duration: 'forever', months: 0, maxRedemptions: null, firstTimeOnly: false, start: -240, end: null, redemptions: 1312, monthShare: 0.07 },
  { code: 'ANNUAL10', description: 'Extra 10% when paying yearly', kind: 'percent', value: 10, plans: [], cycles: ['annual'], duration: 'once', months: 0, maxRedemptions: null, firstTimeOnly: false, start: -200, end: null, redemptions: 406, monthShare: 0.09 },
  { code: 'WELCOME50', description: '₹50 off the first month', kind: 'fixed', value: 50, plans: ['professional', 'premium'], cycles: ['monthly'], duration: 'once', months: 0, maxRedemptions: null, firstTimeOnly: true, start: -90, end: null, redemptions: 522, monthShare: 0.18 },
  { code: 'NITC2026', description: 'Campus drive at NIT Calicut', kind: 'percent', value: 30, plans: ['starter', 'professional'], cycles: [], duration: 'repeating', months: 3, maxRedemptions: 500, firstTimeOnly: true, start: -40, end: 50, redemptions: 318, monthShare: 0.4 },
  { code: 'DEVOPS40', description: 'DevOps Essentials path promotion', kind: 'percent', value: 40, plans: ['professional'], cycles: ['monthly'], duration: 'repeating', months: 2, maxRedemptions: 300, firstTimeOnly: false, start: -20, end: 25, redemptions: 141, monthShare: 0.7 },
  { code: 'PREMIUM500', description: '₹500 off Premium annual', kind: 'fixed', value: 500, plans: ['premium'], cycles: ['annual'], duration: 'once', months: 0, maxRedemptions: 200, firstTimeOnly: false, start: -60, end: 30, redemptions: 87, monthShare: 0.25 },
  { code: 'DIWALI25', description: 'Diwali sale', kind: 'percent', value: 25, plans: [], cycles: [], duration: 'once', months: 0, maxRedemptions: 3000, firstTimeOnly: false, start: 24, end: 38, redemptions: 0, monthShare: 0 },
  { code: 'FLASH60', description: '48-hour flash sale on Starter', kind: 'percent', value: 60, plans: ['starter'], cycles: ['monthly'], duration: 'once', months: 0, maxRedemptions: 1000, firstTimeOnly: true, start: 5, end: 7, redemptions: 0, monthShare: 0 },
  { code: 'HACKFEST', description: 'Prize for HackFest finalists', kind: 'percent', value: 50, plans: ['premium'], cycles: [], duration: 'repeating', months: 6, maxRedemptions: 60, firstTimeOnly: false, start: -75, end: null, redemptions: 60, monthShare: 0.05 },
  { code: 'BETA-TESTERS', description: 'Thank-you for beta testers', kind: 'percent', value: 90, plans: [], cycles: ['monthly'], duration: 'repeating', months: 12, maxRedemptions: 150, firstTimeOnly: false, start: -330, end: null, paused: true, redemptions: 112, monthShare: 0 },
  { code: 'SUMMER30', description: 'Summer break sale', kind: 'percent', value: 30, plans: [], cycles: [], duration: 'once', months: 0, maxRedemptions: null, firstTimeOnly: false, start: -150, end: -95, redemptions: 2215, monthShare: 0 },
  { code: 'BACK2CAMPUS', description: 'Back to campus offer', kind: 'fixed', value: 40, plans: ['starter', 'professional'], cycles: ['monthly'], duration: 'once', months: 0, maxRedemptions: null, firstTimeOnly: true, start: -80, end: -50, redemptions: 964, monthShare: 0 },
  { code: 'TEST-QA', description: 'Internal QA code', kind: 'percent', value: 90, plans: [], cycles: [], duration: 'once', months: 0, maxRedemptions: 10, firstTimeOnly: false, start: -120, end: null, endedEarly: true, redemptions: 4, monthShare: 0 },
];

const priceOf = (plan: IndividualPlan, cycle: Cycle) => DEFAULT_PRICES[plan][cycle];

function savedOn(spec: Spec, plan: IndividualPlan, cycle: Cycle) {
  const price = priceOf(plan, cycle);
  return spec.kind === 'percent' ? Math.round((price * spec.value) / 100) : Math.min(spec.value, price - 1);
}

function seed(now: number): Coupon[] {
  const r = rng(77);
  const plansAll: IndividualPlan[] = ['starter', 'professional', 'premium'];
  const cyclesAll: Cycle[] = ['monthly', 'quarterly', 'annual'];
  return SPECS.map((spec) => {
    const startsAt = now + spec.start * DAY;
    const endsAt = spec.end === null ? null : now + spec.end * DAY;
    const plans = spec.plans.length ? spec.plans : plansAll;
    const cycles = spec.cycles.length ? spec.cycles : cyclesAll;
    const recent: Redemption[] = [];
    const lastAt = Math.min(now, endsAt ?? now);
    if (spec.redemptions > 0) {
      for (let i = 0; i < Math.min(6, spec.redemptions); i += 1) {
        const plan = plans[Math.floor(r() * plans.length)];
        const cycle = cycles[Math.floor(r() * cycles.length)];
        recent.push({ name: NAMES[Math.floor(r() * NAMES.length)], plan, cycle, at: lastAt - Math.floor((i + r()) * (spec.monthShare > 0.3 ? 0.3 : 2) * DAY), saved: savedOn(spec, plan, cycle) });
      }
    }
    const avgSaved = recent.length ? recent.reduce((sum, item) => sum + item.saved, 0) / recent.length : 0;
    const factor = spec.duration === 'forever' ? 3 : spec.duration === 'repeating' ? Math.min(spec.months, 3) : 1;
    const monthRedemptions = Math.round(spec.redemptions * spec.monthShare);
    const avgPrice = recent.length ? recent.reduce((sum, item) => sum + priceOf(item.plan, item.cycle), 0) / recent.length : 0;
    const activity: CouponActivity[] = [{ at: startsAt - 3 * DAY, text: `Created ${discountLabel(spec)}`, actor: 'Lakshmi V' }];
    if (spec.paused) activity.push({ at: now - 20 * DAY, text: 'Paused: beta programme ended', actor: 'Lakshmi V' });
    if (spec.endedEarly) activity.push({ at: now - 100 * DAY, text: 'Ended early: internal testing finished', actor: 'Lakshmi V' });
    return {
      code: spec.code,
      description: spec.description,
      kind: spec.kind,
      value: spec.value,
      plans: spec.plans,
      cycles: spec.cycles,
      duration: spec.duration,
      months: spec.months,
      maxRedemptions: spec.maxRedemptions,
      firstTimeOnly: spec.firstTimeOnly,
      startsAt,
      endsAt,
      createdAt: startsAt - 3 * DAY,
      paused: Boolean(spec.paused),
      endedEarly: Boolean(spec.endedEarly),
      redemptions: spec.redemptions,
      monthRedemptions,
      discountGiven: Math.round(spec.redemptions * avgSaved * factor),
      monthDiscount: Math.round(monthRedemptions * avgSaved),
      revenue: Math.round(spec.redemptions * (avgPrice - avgSaved)),
      recent,
      activity,
    };
  });
}

function load(): Coupon[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Coupon[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(items: Coupon[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  return items;
}

const log = (coupon: Coupon, text: string): CouponActivity[] => [...coupon.activity, { at: Date.now(), text, actor: ME }];

export function useCoupons() {
  const [items, setItems] = useState<Coupon[] | null>(null);
  const itemsRef = useRef<Coupon[] | null>(null);
  itemsRef.current = items;

  useEffect(() => {
    setItems(load());
  }, []);

  const update = useCallback((code: string, fn: (coupon: Coupon) => Coupon) => {
    setItems((current) => (current ? persist(current.map((coupon) => (coupon.code === code ? fn(coupon) : coupon))) : current));
  }, []);

  const create = useCallback((input: CouponInput) => {
    const now = Date.now();
    const coupon: Coupon = { ...input, createdAt: now, paused: false, endedEarly: false, redemptions: 0, monthRedemptions: 0, discountGiven: 0, monthDiscount: 0, revenue: 0, recent: [], activity: [{ at: now, text: `Created ${discountLabel(input)}`, actor: ME }] };
    setItems((current) => (current ? persist([coupon, ...current]) : current));
  }, []);

  const edit = useCallback(
    (code: string, input: CouponInput) =>
      update(code, (coupon) => {
        const locked = coupon.redemptions > 0;
        const next: Coupon = locked
          ? { ...coupon, description: input.description, maxRedemptions: input.maxRedemptions, endsAt: input.endsAt }
          : { ...coupon, ...input };
        return { ...next, activity: log(coupon, locked ? 'Edited the description, limit or end date' : 'Edited the coupon') };
      }),
    [update],
  );

  const setPaused = useCallback((code: string, paused: boolean) => update(code, (coupon) => ({ ...coupon, paused, activity: log(coupon, paused ? 'Paused — new customers cannot use it' : 'Resumed') })), [update]);

  const endNow = useCallback((code: string) => update(code, (coupon) => ({ ...coupon, endedEarly: true, endsAt: coupon.endsAt && coupon.endsAt < Date.now() ? coupon.endsAt : Date.now(), activity: log(coupon, 'Ended now — existing discounts keep running for their duration') })), [update]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems(seed(Date.now()));
  }, []);

  return { items: items ?? [], loaded: items !== null, create, edit, setPaused, endNow, reset };
}

export type CouponStore = ReturnType<typeof useCoupons>;
