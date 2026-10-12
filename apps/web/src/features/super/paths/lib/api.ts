'use client';

import { useCallback } from 'react';
import { adminApi } from '@/features/admin/lib/api';
import { attempt, fetchAll, useServerCollection } from '../../lib/server-collection';
import type { LearningPath, NewPathInput, PathDraft, PathStatus } from './types';

const loadPaths = () => fetchAll<LearningPath>('/super/paths');
const detail = (id: string) => `/super/paths/${id}`;

export function usePaths() {
  const store = useServerCollection<LearningPath>(loadPaths, detail);
  const { apply, drop, setError } = store;

  const write = useCallback(
    async (path: string, body?: unknown, method: 'POST' | 'PATCH' = 'POST') => {
      const result = await attempt(() => adminApi<LearningPath>(path, { method, body: body ?? {} }));
      if (result.data) apply(result.data);
      else if (result.error && !result.issues.length) setError(result.error);
      return result;
    },
    [apply, setError],
  );

  const save = useCallback((id: string, draft: PathDraft) => write(`/super/paths/${id}`, draft, 'PATCH'), [write]);

  const publish = useCallback(
    async (id: string, draft: PathDraft): Promise<string[]> => {
      const result = await write(`/super/paths/${id}/publish`, draft);
      return result.data ? [] : result.issues.length ? result.issues : [result.error ?? 'Could not publish the path'];
    },
    [write],
  );

  const setStatus = useCallback((id: string, status: PathStatus, note?: string) => write(`/super/paths/${id}/status`, { status, ...(note ? { note } : {}) }), [write]);

  const create = useCallback(async (input: NewPathInput): Promise<string | null> => (await write('/super/paths', input)).data?.id ?? null, [write]);

  const duplicate = useCallback(async (id: string): Promise<string | null> => (await write(`/super/paths/${id}/duplicate`)).data?.id ?? null, [write]);

  const remove = useCallback(
    async (id: string) => {
      const result = await attempt(() => adminApi(`/super/paths/${id}`, { method: 'DELETE' }));
      if (result.error) setError(result.error);
      else drop(id);
    },
    [drop, setError],
  );

  return { paths: store.items, loaded: store.loaded, error: store.error, clearError: store.clearError, refresh: store.refresh, focus: store.focus, save, publish, setStatus, create, duplicate, remove };
}

export type PathStore = ReturnType<typeof usePaths>;
