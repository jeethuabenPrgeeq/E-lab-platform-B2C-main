'use client';

import { useCallback } from 'react';
import { adminApi } from '@/features/admin/lib/api';
import { attempt, fetchAll, useServerCollection } from '../../lib/server-collection';
import type { Coupon, CouponInput } from './types';

type Row = Coupon & { id: string };

const withId = (coupon: Coupon): Row => ({ ...coupon, id: coupon.code });
const loadCoupons = async () => (await fetchAll<Coupon>('/super/coupons')).map(withId);
const detail = (code: string) => `/super/coupons/${encodeURIComponent(code)}`;

export function useCoupons() {
  const store = useServerCollection<Row>(loadCoupons, detail);
  const { apply, setError } = store;

  const write = useCallback(
    async (path: string, body: unknown, method: 'POST' | 'PATCH' = 'POST') => {
      const result = await attempt(() => adminApi<Coupon>(path, { method, body }));
      if (result.data) apply(withId(result.data));
      else if (result.error) setError(result.error);
      return result;
    },
    [apply, setError],
  );

  const create = useCallback((input: CouponInput) => write('/super/coupons', input), [write]);
  const edit = useCallback((code: string, input: CouponInput) => write(detail(code), input, 'PATCH'), [write]);
  const setPaused = useCallback((code: string, paused: boolean) => write(`${detail(code)}/pause`, { paused }), [write]);
  const endNow = useCallback((code: string) => write(`${detail(code)}/end`, {}), [write]);

  return { items: store.items as Coupon[], loaded: store.loaded, error: store.error, clearError: store.clearError, refresh: store.refresh, focus: store.focus, create, edit, setPaused, endNow };
}

export type CouponStore = ReturnType<typeof useCoupons>;
