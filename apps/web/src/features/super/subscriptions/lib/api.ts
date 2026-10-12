'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import { fetchPrices } from '../../lib/prices';
import { fetchAll } from '../../lib/server-collection';
import { CYCLE_META, DAY, DEFAULT_PRICES } from './shared';
import type { Cycle, IndividualPlan, Payment, PlanId, PriceBook, RevenueActivity, Subscription } from './types';

type SubDetail = Subscription & { payments: Payment[] };
type PayDetail = Payment;

export const periodMs = (cycle: Cycle) => CYCLE_META[cycle].months * 30 * DAY;

const withActivity = <T extends { activity?: RevenueActivity[] }>(item: T) => ({ ...item, activity: item.activity ?? [] });

const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
  const next = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) next.set(item.id, { ...next.get(item.id), ...item });
  return [...next.values()];
};

export function useRevenue() {
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [pays, setPays] = useState<Payment[] | null>(null);
  const [prices, setPrices] = useState<PriceBook>(DEFAULT_PRICES);
  const [epoch, setEpoch] = useState(0);
  const [error, setError] = useState('');
  const focusedSub = useRef<string | null>(null);
  const focusedPay = useRef<string | null>(null);

  const applySub = useCallback((detail: SubDetail) => {
    const { payments, ...sub } = detail;
    setSubs((current) => mergeById(current ?? [], [withActivity(sub)]));
    if (payments?.length) setPays((current) => mergeById(current ?? [], payments.map((payment) => ({ ...payment, activity: (current ?? []).find((item) => item.id === payment.id)?.activity ?? [] }))));
  }, []);

  const applyPay = useCallback((payment: PayDetail) => setPays((current) => mergeById(current ?? [], [withActivity(payment)])), []);

  const loadSub = useCallback(
    async (id: string) => {
      try {
        applySub(await adminApi<SubDetail>(`/super/subscriptions/${id}`));
      } catch {}
    },
    [applySub],
  );

  const loadPay = useCallback(
    async (id: string) => {
      try {
        applyPay(await adminApi<PayDetail>(`/super/payments/${id}`));
      } catch {}
    },
    [applyPay],
  );

  const refresh = useCallback(async () => {
    try {
      const [subList, payList, book] = await Promise.all([fetchAll<Subscription>('/super/subscriptions'), fetchAll<Payment>('/super/payments'), fetchPrices(true)]);
      setSubs(subList.map(withActivity));
      setPays(payList.map(withActivity));
      setPrices(book);
      setEpoch(Date.now());
      setError('');
      if (focusedSub.current) void loadSub(focusedSub.current);
      if (focusedPay.current) void loadPay(focusedPay.current);
    } catch (err) {
      setError(errorText(err));
      setSubs((current) => current ?? []);
      setPays((current) => current ?? []);
      setEpoch((current) => current || Date.now());
    }
  }, [loadPay, loadSub]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const focus = useCallback(
    (id: string | null) => {
      focusedSub.current = id;
      if (id) void loadSub(id);
    },
    [loadSub],
  );

  const focusPayment = useCallback(
    (id: string | null) => {
      focusedPay.current = id;
      if (id) void loadPay(id);
    },
    [loadPay],
  );

  const subscriptions = useMemo(() => subs ?? [], [subs]);
  const payments = useMemo(() => [...(pays ?? [])].sort((a, b) => b.at - a.at), [pays]);
  const subMap = useMemo(() => new Map(subscriptions.map((sub) => [sub.id, sub])), [subscriptions]);

  const subAction = useCallback(
    async (id: string, path: string, body: unknown) => {
      try {
        applySub(await adminApi<SubDetail>(`/super/subscriptions/${id}/${path}`, { method: 'POST', body }));
        return null;
      } catch (err) {
        return errorText(err);
      }
    },
    [applySub],
  );

  const payAction = useCallback(
    async (id: string, path: string, body: unknown) => {
      try {
        const payment = await adminApi<PayDetail>(`/super/payments/${id}/${path}`, { method: 'POST', body });
        applyPay(payment);
        void loadSub(payment.subscriptionId);
        return null;
      } catch (err) {
        return errorText(err);
      }
    },
    [applyPay, loadSub],
  );

  const changePlan = useCallback((id: string, plan: PlanId, cycle: Cycle, when: 'now' | 'renewal') => subAction(id, 'change-plan', { plan, cycle, when }), [subAction]);
  const cancel = useCallback((id: string, mode: 'period_end' | 'now', reason: string, refundUnused: boolean) => subAction(id, 'cancel', { mode, reason, refundUnused }), [subAction]);
  const resume = useCallback((id: string) => subAction(id, 'resume', {}), [subAction]);
  const extend = useCallback((id: string, days: number, reason: string) => subAction(id, 'extend', { days, reason }), [subAction]);
  const retryPayment = useCallback((paymentId: string) => payAction(paymentId, 'retry', {}), [payAction]);
  const refund = useCallback((paymentId: string, amount: number, reason: string) => payAction(paymentId, 'refund', { amount, reason }), [payAction]);
  const rejectRefund = useCallback((paymentId: string, reason: string) => payAction(paymentId, 'reject-refund', { reason }), [payAction]);

  const setPrice = useCallback(async (plan: IndividualPlan, cycle: Cycle, value: number) => {
    try {
      setPrices(await adminApi<PriceBook>(`/super/plans/${plan}/${cycle}`, { method: 'PUT', body: { amount: value } }));
      void fetchPrices(true).catch(() => {});
      return null;
    } catch (err) {
      return errorText(err);
    }
  }, []);

  return {
    loaded: subs !== null && pays !== null,
    epoch,
    subscriptions,
    payments,
    subMap,
    prices,
    error,
    clearError: () => setError(''),
    setError,
    refresh,
    focus,
    focusPayment,
    changePlan,
    cancel,
    resume,
    extend,
    retryPayment,
    refund,
    rejectRefund,
    setPrice,
  };
}

export type RevenueStore = ReturnType<typeof useRevenue>;
