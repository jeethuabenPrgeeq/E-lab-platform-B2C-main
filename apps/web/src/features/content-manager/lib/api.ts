'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, adminApi, errorText, type Paged } from '@/features/admin/lib/api';
import type { ProblemDetail, ProblemItem, ProblemStatus } from '@/features/admin/problems/lib/types';

export const CM_PROBLEMS = '/institute/problems';
export const CM_TECHNOLOGIES = '/institute/technologies';
export const CM_ROUTE = '/content-library';

export type LibraryScope = 'all' | 'created' | 'assigned';

export interface PersonRef {
  id: string;
  name: string;
}

export interface LibraryItem extends ProblemItem {
  createdBy: PersonRef | null;
  assignee: PersonRef | null;
  mine: boolean;
  editable: boolean;
}

export interface LibraryDetail extends ProblemDetail {
  assignee: PersonRef | null;
  assignedAt: string | null;
  editable: boolean;
}

export interface LibraryFilters {
  scope: LibraryScope;
  status: ProblemStatus | '';
  difficulty: string;
  technologyId: string;
  q: string;
}

interface LibraryPage extends Paged<LibraryItem> {
  statusCounts: Partial<Record<ProblemStatus, number>>;
}

export function useLibrary(filters: LibraryFilters) {
  const [data, setData] = useState<LibraryPage | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await adminApi<LibraryPage>(CM_PROBLEMS, { query: { ...filters, pageSize: 100 } }));
      setError('');
    } catch (err) {
      setError(errorText(err));
      setData((current) => current ?? { items: [], total: 0, page: 1, pageSize: 100, statusCounts: {} });
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), filters.q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [refresh, filters.q]);

  const duplicate = useCallback(async (id: string) => {
    try {
      const created = await adminApi<LibraryDetail>(`${CM_PROBLEMS}/${id}/duplicate`, { method: 'POST', body: {} });
      return { ok: true as const, id: created.id };
    } catch (err) {
      return { ok: false as const, error: err instanceof ApiError ? err.message : errorText(err) };
    }
  }, []);

  return { data, loaded: data !== null, error, clearError: () => setError(''), refresh, duplicate };
}
