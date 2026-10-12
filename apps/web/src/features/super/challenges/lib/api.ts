'use client';

import { useCallback } from 'react';
import { adminApi } from '@/features/admin/lib/api';
import { attempt, fetchAll, useServerCollection } from '../../lib/server-collection';
import type { Challenge, ChallengeInput } from './types';

const loadChallenges = () => fetchAll<Challenge>('/super/challenges');
const detail = (id: string) => `/super/challenges/${id}`;

export function useChallenges() {
  const store = useServerCollection<Challenge>(loadChallenges, detail);
  const { apply, drop, setError } = store;

  const write = useCallback(
    async (path: string, body?: unknown, method: 'POST' | 'PATCH' = 'POST') => {
      const result = await attempt(() => adminApi<Challenge>(path, { method, body: body ?? {} }));
      if (result.data) apply(result.data);
      else if (result.error && !result.issues.length) setError(result.error);
      return result;
    },
    [apply, setError],
  );

  const issuesOf = (result: { error: string | null; issues: string[] }) => (result.issues.length ? result.issues : result.error ? [result.error] : []);

  const create = useCallback(
    async (input: ChallengeInput, publish: boolean): Promise<{ id: string | null; issues: string[] }> => {
      const result = await write('/super/challenges', { ...input, publish });
      return { id: result.data?.id ?? null, issues: result.data ? [] : issuesOf(result) };
    },
    [write],
  );

  const edit = useCallback(
    async (id: string, input: ChallengeInput, publish: boolean): Promise<string[]> => {
      const result = await write(`/super/challenges/${id}`, { ...input, publish }, 'PATCH');
      return result.data ? [] : issuesOf(result);
    },
    [write],
  );

  const unpublish = useCallback((id: string) => write(`/super/challenges/${id}/unpublish`), [write]);
  const extend = useCallback((id: string, minutes: number) => write(`/super/challenges/${id}/extend`, { minutes }), [write]);
  const endNow = useCallback((id: string) => write(`/super/challenges/${id}/end`), [write]);
  const cancel = useCallback((id: string, reason: string) => write(`/super/challenges/${id}/cancel`, { reason }), [write]);
  const duplicate = useCallback(async (id: string): Promise<string | null> => (await write(`/super/challenges/${id}/duplicate`)).data?.id ?? null, [write]);

  const remove = useCallback(
    async (id: string) => {
      const result = await attempt(() => adminApi(`/super/challenges/${id}`, { method: 'DELETE' }));
      if (result.error) setError(result.error);
      else drop(id);
    },
    [drop, setError],
  );

  return { items: store.items, loaded: store.loaded, error: store.error, clearError: store.clearError, refresh: store.refresh, focus: store.focus, create, edit, unpublish, extend, endNow, cancel, duplicate, remove };
}

export type ChallengeStore = ReturnType<typeof useChallenges>;
