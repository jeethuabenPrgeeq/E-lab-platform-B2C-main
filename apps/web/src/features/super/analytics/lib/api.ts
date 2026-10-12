'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import type { PlanId } from '../../subscriptions/lib/types';
import type { Range } from './data';

export interface AnalyticsOverview {
  range: Range;
  timeZone: string;
  kpis: {
    monthlyActive: number;
    monthlyActiveDelta: number | null;
    signups: number;
    signupsDelta: number | null;
    newPaid: number;
    newPaidDelta: number | null;
    conversion: number;
    conversionDelta: number | null;
    mrr: number;
    arpu: number;
  };
  growth: { bucket: string; signups: number; paid: number }[];
  mrrSeries: { month: string; mrr: number }[];
  byPlan: { plan: PlanId; count: number; mrr: number }[];
  funnel: { key: string; label: string; value: number | null }[];
  cohorts: { month: string; size: number; retention: (number | null)[] }[];
  technologies: { name: string; items: number; learners: number | null; completion: number | null }[];
  enterprise: { id: string; name: string; seats: number; activeSeats: number | null; contract: number }[];
  notTracked: string[];
}

export const dayTime = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day || 1).getTime();
};

export function useAnalytics(range: Range) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const refresh = useCallback(async () => {
    const wanted = rangeRef.current;
    try {
      const next = await adminApi<AnalyticsOverview>('/super/analytics', { query: { range: wanted } });
      if (rangeRef.current === wanted) setData(next);
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [range, refresh]);

  return { data: data && data.range === range ? data : null, error, clearError: () => setError(''), refresh };
}
