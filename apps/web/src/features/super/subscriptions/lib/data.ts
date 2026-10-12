'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CYCLE_META, DAY, DEFAULT_PRICES, ME, PLAN_META, TARGET_MRR, formatINR, monthlyValue } from './shared';
import type { Cycle, IndividualPlan, MethodType, Payment, PaymentAttempt, PlanId, PriceBook, RevenueActivity, Subscription } from './types';

const KEY = 'elab_super_revenue_v1';
const HOUR = 3_600_000;
const WINDOW_DAYS = 60;

export const SEED_COUPONS: Record<string, number> = { LAUNCH20: 20, STUDENT15: 15, DIWALI25: 25, ANNUAL10: 10 };

const FIRST = ['Aarav', 'Diya', 'Rahul', 'Ananya', 'Vikram', 'Fathima', 'Karthik', 'Meghana', 'Arjun', 'Priya', 'Suresh', 'Deepa', 'Nikhil', 'Sneha', 'Rohan', 'Lakshmi', 'Aditya', 'Kavya', 'Joel', 'Neha', 'Ishaan', 'Riya', 'Siddharth', 'Anjali', 'Manoj', 'Pooja', 'Varun', 'Asha', 'Harish', 'Nandini', 'Tanvi', 'Gautham', 'Sameer', 'Divya', 'Abhishek', 'Shreya'];
const LAST = ['Nair', 'Menon', 'Rao', 'Iyer', 'Shetty', 'Rasheed', 'Reddy', 'George', 'Krishnan', 'Babu', 'Pillai', 'Kumar', 'Joseph', 'Varghese', 'Hegde', 'Sharma', 'Das', 'Thomas', 'Bhat', 'Gowda'];
const BANKS = ['okhdfcbank', 'oksbi', 'okicici', 'okaxis', 'ybl', 'paytm'];
const NETBANKING = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'];
const CANCEL_REASONS = ['Too expensive', 'Finished my course', 'Switched to my college’s plan', 'Not using it enough', 'Found another platform', 'Payment method expired'];
const INSTITUTIONS = [
  'Christ University', 'NIT Calicut', 'PES University', 'Amrita Vishwa Vidyapeetham', 'RV College of Engineering', 'BMS College of Engineering', 'MS Ramaiah Institute', 'CUSAT', 'College of Engineering Trivandrum', 'VIT Vellore',
  'SRM Institute', 'Manipal Institute of Technology', 'PSG College of Technology', 'Anna University', 'NIT Surathkal', 'Dayananda Sagar College', 'Jain University', 'Model Engineering College', 'TKM College of Engineering', 'Rajagiri School of Engineering',
  'Saintgits College', 'KJ Somaiya College', 'Symbiosis Institute of Technology', 'MIT World Peace University', 'Thapar Institute', 'Amity University', 'Presidency University', 'Reva University', 'Nitte Meenakshi Institute', 'Sahyadri College',
  'St Joseph’s College', 'Mar Athanasius College', 'Federal Institute of Science', 'Government Engineering College Thrissur', 'NSS College of Engineering',
];

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

function shuffled<T>(items: T[], r: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const repeat = <T,>(value: T, count: number) => Array.from({ length: count }, () => value);
export const periodMs = (cycle: Cycle) => CYCLE_META[cycle].months * 30 * DAY;

function method(r: () => number, first: string): [MethodType, string] {
  const roll = r();
  if (roll < 0.55) return ['upi', `UPI · ${first.toLowerCase()}@${BANKS[Math.floor(r() * BANKS.length)]}`];
  if (roll < 0.85) return ['card', `${r() < 0.6 ? 'Visa' : r() < 0.5 ? 'Mastercard' : 'RuPay'} •••• ${1000 + Math.floor(r() * 9000)}`];
  return ['netbanking', `Netbanking · ${NETBANKING[Math.floor(r() * NETBANKING.length)]}`];
}

interface Generated {
  subscriptions: Subscription[];
  payments: Payment[];
}

function generate(epoch: number): Generated {
  const r = rng(4305);
  const subscriptions: Subscription[] = [];
  const individualPlans = shuffled<IndividualPlan>([...repeat<IndividualPlan>('starter', 2450), ...repeat<IndividualPlan>('professional', 1280), ...repeat<IndividualPlan>('premium', 540)], r);
  const cycles = shuffled<Cycle>([...repeat<Cycle>('monthly', 2980), ...repeat<Cycle>('quarterly', 610), ...repeat<Cycle>('annual', 680)], r);
  const pastDue = new Set(shuffled(cycles.map((cycle, index) => (cycle === 'monthly' ? index : -1)).filter((index) => index >= 0), r).slice(0, 17));
  let serial = 10001;

  const makeIndividual = (plan: IndividualPlan, cycle: Cycle, status: Subscription['status'], index: number): Subscription => {
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    const length = periodMs(cycle);
    let periodEnd: number;
    let cancelledAt: number | null = null;
    if (status === 'past_due') periodEnd = epoch - (1 + Math.floor(r() * 6)) * DAY - Math.floor(r() * DAY);
    else if (status === 'cancelled') {
      cancelledAt = epoch - Math.floor(r() * 90 * DAY);
      periodEnd = cancelledAt;
    } else periodEnd = epoch + Math.floor(r() * length);
    const periods = 1 + Math.floor(Math.pow(r(), 1.6) * (cycle === 'monthly' ? 18 : cycle === 'quarterly' ? 6 : 2));
    const startedAt = periodEnd - periods * length;
    const [methodType, methodLabel] = method(r, first);
    const codes = Object.keys(SEED_COUPONS);
    const coupon = r() < 0.12 ? codes[Math.floor(r() * codes.length)] : null;
    const cancelReason = status === 'cancelled' ? CANCEL_REASONS[Math.floor(r() * CANCEL_REASONS.length)] : null;
    const activity: RevenueActivity[] = [{ at: startedAt, text: `Subscribed to ${PLAN_META[plan].label} (${CYCLE_META[cycle].label})${coupon ? ` with ${coupon}` : ''}`, actor: `${first} ${last}` }];
    if (status === 'past_due') activity.push({ at: periodEnd, text: 'Renewal payment failed', actor: 'Billing' });
    if (cancelReason && cancelledAt) activity.push({ at: cancelledAt, text: `Cancelled: ${cancelReason}`, actor: `${first} ${last}` });
    return {
      id: `SUB-${serial++}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${index % 9 === 0 ? index % 100 : ''}@${r() < 0.7 ? 'gmail.com' : 'outlook.com'}`.toLowerCase(),
      institution: null,
      seats: null,
      plan,
      cycle,
      amount: DEFAULT_PRICES[plan][cycle],
      status,
      cancelAtPeriodEnd: status === 'active' && r() < 0.03,
      pendingChange: null,
      startedAt,
      periodEnd,
      cancelledAt,
      cancelReason,
      method: methodType,
      methodLabel,
      coupon,
      activity,
    };
  };

  individualPlans.forEach((plan, index) => subscriptions.push(makeIndividual(plan, cycles[index], pastDue.has(index) ? 'past_due' : 'active', index)));

  const individualMrr = subscriptions.reduce((sum, sub) => sum + monthlyValue(sub), 0);
  const remaining = Math.max(35 * 1000, Math.round(TARGET_MRR - individualMrr));
  const weights = INSTITUTIONS.map(() => 0.4 + r() * 1.8);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let allotted = 0;
  INSTITUTIONS.forEach((institution, index) => {
    const monthly = index === INSTITUTIONS.length - 1 ? remaining - allotted : Math.floor((remaining * weights[index]) / total);
    allotted += monthly;
    const length = periodMs('annual');
    const periodEnd = epoch + Math.floor(r() * length);
    const startedAt = periodEnd - (1 + Math.floor(r() * 3)) * length;
    const seats = Math.max(60, Math.round((monthly * 12) / 950 / 10) * 10);
    const slug = institution.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 10);
    subscriptions.push({
      id: `SUB-${serial++}`,
      name: institution,
      email: `accounts@${slug}.edu.in`,
      institution,
      seats,
      plan: 'enterprise',
      cycle: 'annual',
      amount: monthly * 12,
      status: 'active',
      cancelAtPeriodEnd: false,
      pendingChange: null,
      startedAt,
      periodEnd,
      cancelledAt: null,
      cancelReason: null,
      method: 'invoice',
      methodLabel: `Bank transfer · PO-${2026}${100 + index}`,
      coupon: null,
      activity: [{ at: startedAt, text: `Enterprise contract signed for ${seats} seats`, actor: 'Sales' }],
    });
  });

  const churnPlans = shuffled<IndividualPlan>([...repeat<IndividualPlan>('starter', 260), ...repeat<IndividualPlan>('professional', 110), ...repeat<IndividualPlan>('premium', 42)], r);
  churnPlans.forEach((plan, index) => subscriptions.push(makeIndividual(plan, r() < 0.82 ? 'monthly' : 'quarterly', 'cancelled', index + 5000)));

  const payments: Payment[] = [];
  const windowStart = epoch - WINDOW_DAYS * DAY;
  for (const sub of subscriptions) {
    const length = periodMs(sub.cycle);
    const charges: number[] = [];
    if (sub.status === 'past_due') charges.push(sub.periodEnd);
    for (let t = sub.periodEnd - length; t >= sub.startedAt && t > windowStart; t -= length) if (t <= epoch) charges.push(t);
    charges.forEach((at, chargeIndex) => {
      const openFailure = sub.status === 'past_due' && chargeIndex === 0;
      const first = Math.abs(at - sub.startedAt) < HOUR;
      const listAmount = sub.amount;
      const discount = first && sub.coupon ? Math.round((listAmount * SEED_COUPONS[sub.coupon]) / 100) : 0;
      const amount = listAmount - discount;
      const attempts: PaymentAttempt[] = [];
      if (openFailure) {
        attempts.push({ at, ok: false, note: sub.method === 'card' ? 'Card declined by the bank' : 'UPI mandate was not approved' });
        if (epoch - at > 2 * DAY) attempts.push({ at: at + 2 * DAY, ok: false, note: 'Automatic retry failed' });
      } else if (r() < 0.03) {
        attempts.push({ at, ok: false, note: sub.method === 'card' ? 'Insufficient funds' : 'Bank server timed out' });
        attempts.push({ at: Math.min(epoch, at + DAY), ok: true, note: 'Automatic retry succeeded' });
      } else attempts.push({ at, ok: true, note: 'Charged successfully' });
      const refundRoll = r();
      let status: Payment['status'] = openFailure ? 'failed' : 'succeeded';
      let refunded = 0;
      const refundRequest: Payment['refundRequest'] = null;
      const activity: RevenueActivity[] = [];
      if (!openFailure && refundRoll < 0.006 && amount > 0) {
        status = 'refunded';
        refunded = amount;
        activity.push({ at: at + 3 * DAY, text: `Refunded ${formatINR(amount)}: charged after cancelling`, actor: 'Lakshmi V' });
      }
      payments.push({
        id: '',
        subscriptionId: sub.id,
        name: sub.name,
        email: sub.email,
        plan: sub.plan,
        cycle: sub.cycle,
        listAmount,
        discount,
        coupon: discount ? sub.coupon : null,
        amount,
        at: attempts[attempts.length - 1].ok ? attempts[attempts.length - 1].at : at,
        status,
        refunded,
        attempts,
        refundRequest,
        method: sub.method,
        methodLabel: sub.methodLabel,
        activity,
      });
    });
  }

  payments.sort((a, b) => a.at - b.at);
  const reasons = ['Charged twice for the same month', 'Forgot to cancel before renewal', 'Course access did not work for a week', 'Upgraded by mistake'];
  shuffled(
    payments.filter((payment) => payment.status === 'succeeded' && epoch - payment.at < 10 * DAY && payment.amount > 150),
    r,
  )
    .slice(0, reasons.length)
    .forEach((payment, index) => {
      payment.refundRequest = { reason: reasons[index], requestedAt: Math.min(epoch, payment.at + DAY), status: 'pending', note: null };
    });
  payments.forEach((payment, index) => {
    payment.id = `INV-26-${String(40001 + index)}`;
  });
  payments.reverse();
  return { subscriptions, payments };
}

interface Patches {
  subs: Record<string, Partial<Subscription>>;
  pays: Record<string, Partial<Payment>>;
  extras: Payment[];
  prices: PriceBook;
  serial: number;
}

const EMPTY: Patches = { subs: {}, pays: {}, extras: [], prices: DEFAULT_PRICES, serial: 90001 };

function loadPatches(): Patches {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Patches;
      if (parsed && parsed.subs && parsed.pays && Array.isArray(parsed.extras)) return { ...EMPTY, ...parsed };
    }
  } catch {}
  return EMPTY;
}

function persist(patches: Patches) {
  try {
    localStorage.setItem(KEY, JSON.stringify(patches));
  } catch {}
  return patches;
}

const note = (activity: RevenueActivity[], text: string): RevenueActivity[] => [...activity, { at: Date.now(), text, actor: ME }];

const patchSub = (current: Patches, sub: Subscription, change: Partial<Subscription>): Patches => ({ ...current, subs: { ...current.subs, [sub.id]: { ...(current.subs[sub.id] ?? {}), ...change } } });

const patchPay = (current: Patches, payment: Payment, change: Partial<Payment>): Patches => ({ ...current, pays: { ...current.pays, [payment.id]: { ...(current.pays[payment.id] ?? {}), ...change } } });

const addPayment = (current: Patches, sub: Subscription, listAmount: number, text: string): Patches => {
  const now = Date.now();
  const payment: Payment = {
    id: `INV-26-${current.serial}`,
    subscriptionId: sub.id,
    name: sub.name,
    email: sub.email,
    plan: sub.plan,
    cycle: sub.cycle,
    listAmount,
    discount: 0,
    coupon: null,
    amount: listAmount,
    at: now,
    status: 'succeeded',
    refunded: 0,
    attempts: [{ at: now, ok: true, note: text }],
    refundRequest: null,
    method: sub.method,
    methodLabel: sub.methodLabel,
    activity: [],
  };
  return { ...current, serial: current.serial + 1, extras: [payment, ...current.extras] };
};

export function loadPrices(): PriceBook {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Patches>;
      if (parsed?.prices) return parsed.prices;
    }
  } catch {}
  return DEFAULT_PRICES;
}

export function useRevenue() {
  const [epoch, setEpoch] = useState(0);
  const [patches, setPatches] = useState<Patches | null>(null);

  useEffect(() => {
    setEpoch(Math.floor(Date.now() / HOUR) * HOUR);
    setPatches(loadPatches());
  }, []);

  const base = useMemo(() => (epoch ? generate(epoch) : null), [epoch]);

  const subscriptions = useMemo(() => {
    if (!base || !patches) return [];
    return base.subscriptions.map((sub) => (patches.subs[sub.id] ? { ...sub, ...patches.subs[sub.id] } : sub));
  }, [base, patches]);

  const payments = useMemo(() => {
    if (!base || !patches) return [];
    const patched = base.payments.map((payment) => (patches.pays[payment.id] ? { ...payment, ...patches.pays[payment.id] } : payment));
    return [...patches.extras.map((payment) => ({ ...payment, ...(patches.pays[payment.id] ?? {}) })), ...patched].sort((a, b) => b.at - a.at);
  }, [base, patches]);

  const subMap = useMemo(() => new Map(subscriptions.map((sub) => [sub.id, sub])), [subscriptions]);
  const payMap = useMemo(() => new Map(payments.map((payment) => [payment.id, payment])), [payments]);

  const commit = useCallback((fn: (current: Patches) => Patches) => setPatches((current) => (current ? persist(fn(current)) : current)), []);


  const changePlan = useCallback(
    (id: string, plan: PlanId, cycle: Cycle, when: 'now' | 'renewal') => {
      const sub = subMap.get(id);
      if (!sub || sub.plan === 'enterprise' || plan === 'enterprise' || !patches) return;
      const amount = patches.prices[plan][cycle];
      const label = `${PLAN_META[plan].label} (${CYCLE_META[cycle].label})`;
      commit((current) => {
        if (when === 'renewal') return patchSub(current, sub, { pendingChange: { plan, cycle, amount }, activity: note(sub.activity, `Scheduled a change to ${label} from the next renewal`) });
        const now = Date.now();
        const credit = Math.max(0, Math.round((sub.amount * Math.max(0, sub.periodEnd - now)) / periodMs(sub.cycle)));
        const due = Math.max(0, amount - credit);
        let next = patchSub(current, sub, { plan, cycle, amount, pendingChange: null, periodEnd: now + periodMs(cycle), activity: note(sub.activity, `Changed to ${label} now — ${formatINR(credit)} credit for unused time, charged ${formatINR(due)}`) });
        if (due > 0) next = addPayment(next, { ...sub, plan, cycle }, due, `Prorated charge for switching to ${label}`);
        return next;
      });
    },
    [commit, patches, subMap],
  );

  const cancel = useCallback(
    (id: string, mode: 'period_end' | 'now', reason: string, refundUnused: boolean) => {
      const sub = subMap.get(id);
      if (!sub) return;
      commit((current) => {
        if (mode === 'period_end') return patchSub(current, sub, { cancelAtPeriodEnd: true, cancelReason: reason, pendingChange: null, activity: note(sub.activity, `Set to cancel at the end of the period: ${reason}`) });
        const now = Date.now();
        let next = patchSub(current, sub, { status: 'cancelled', cancelAtPeriodEnd: false, cancelledAt: now, periodEnd: now, cancelReason: reason, pendingChange: null, activity: note(sub.activity, `Cancelled immediately: ${reason}`) });
        if (refundUnused) {
          const last = payments.find((payment) => payment.subscriptionId === id && (payment.status === 'succeeded' || payment.status === 'partially_refunded'));
          if (last) {
            const unused = Math.min(last.amount - last.refunded, Math.round((sub.amount * Math.max(0, sub.periodEnd - now)) / periodMs(sub.cycle)));
            if (unused > 0) {
              const refunded = last.refunded + unused;
              next = patchPay(next, last, { refunded, status: refunded >= last.amount ? 'refunded' : 'partially_refunded', activity: note(last.activity, `Refunded ${formatINR(unused)} for unused time after cancelling`) });
            }
          }
        }
        return next;
      });
    },
    [commit, payments, subMap],
  );

  const resume = useCallback(
    (id: string) => {
      const sub = subMap.get(id);
      if (sub) commit((current) => patchSub(current, sub, { cancelAtPeriodEnd: false, cancelReason: null, activity: note(sub.activity, 'Resumed — the subscription will renew again') }));
    },
    [commit, subMap],
  );

  const extend = useCallback(
    (id: string, days: number, reason: string) => {
      const sub = subMap.get(id);
      if (sub) commit((current) => patchSub(current, sub, { periodEnd: sub.periodEnd + days * DAY, activity: note(sub.activity, `Added ${days} free days: ${reason}`) }));
    },
    [commit, subMap],
  );

  const retryPayment = useCallback(
    (paymentId: string) => {
      const payment = payMap.get(paymentId);
      const sub = payment ? subMap.get(payment.subscriptionId) : undefined;
      if (!payment || !sub || payment.status !== 'failed') return;
      const now = Date.now();
      commit((current) => {
        let next = patchPay(current, payment, { status: 'succeeded', at: now, attempts: [...payment.attempts, { at: now, ok: true, note: 'Manual retry succeeded' }], activity: note(payment.activity, 'Retried the payment manually') });
        if (sub.status === 'past_due') next = patchSub(next, sub, { status: 'active', periodEnd: sub.periodEnd + periodMs(sub.cycle), activity: note(sub.activity, `Payment recovered — renewed until the next period`) });
        return next;
      });
    },
    [commit, payMap, subMap],
  );

  const refund = useCallback(
    (paymentId: string, amount: number, reason: string) => {
      const payment = payMap.get(paymentId);
      if (!payment) return;
      commit((current) => {
        const refunded = Math.min(payment.amount, payment.refunded + amount);
        return patchPay(current, payment, {
          refunded,
          status: refunded >= payment.amount ? 'refunded' : 'partially_refunded',
          refundRequest: payment.refundRequest?.status === 'pending' ? { ...payment.refundRequest, status: 'approved', note: reason } : payment.refundRequest,
          activity: note(payment.activity, `Refunded ${formatINR(amount)}: ${reason}`),
        });
      });
    },
    [commit, payMap],
  );

  const rejectRefund = useCallback(
    (paymentId: string, reason: string) => {
      const payment = payMap.get(paymentId);
      if (!payment?.refundRequest) return;
      commit((current) => patchPay(current, payment, { refundRequest: { ...payment.refundRequest!, status: 'rejected', note: reason }, activity: note(payment.activity, `Declined the refund request: ${reason}`) }));
    },
    [commit, payMap],
  );

  const setPrice = useCallback(
    (plan: IndividualPlan, cycle: Cycle, value: number) =>
      commit((current) => ({ ...current, prices: { ...current.prices, [plan]: { ...current.prices[plan], [cycle]: value } } })),
    [commit],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setPatches(EMPTY);
  }, []);

  return {
    loaded: Boolean(base && patches),
    epoch,
    subscriptions,
    payments,
    subMap,
    prices: patches?.prices ?? DEFAULT_PRICES,
    changePlan,
    cancel,
    resume,
    extend,
    retryPayment,
    refund,
    rejectRefund,
    setPrice,
    reset,
  };
}

export type RevenueStore = ReturnType<typeof useRevenue>;
