'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/features/admin/lib/api';
import type { PriceBook } from '../subscriptions/lib/types';

const OPEN = Number.MAX_SAFE_INTEGER;
export const UNKNOWN_PRICES: PriceBook = {
  starter: { monthly: OPEN, quarterly: OPEN, annual: OPEN },
  professional: { monthly: OPEN, quarterly: OPEN, annual: OPEN },
  premium: { monthly: OPEN, quarterly: OPEN, annual: OPEN },
};

let cached: Promise<PriceBook> | null = null;

export function fetchPrices(force = false) {
  if (!cached || force) {
    cached = adminApi<PriceBook>('/super/plans').catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

export function usePrices() {
  const [prices, setPrices] = useState<PriceBook | null>(null);
  useEffect(() => {
    let alive = true;
    fetchPrices()
      .then((value) => {
        if (alive) setPrices(value);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return prices;
}
