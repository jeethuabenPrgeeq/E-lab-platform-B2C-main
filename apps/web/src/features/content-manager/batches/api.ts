'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import type { ProblemStatus } from '@/features/admin/problems/lib/types';

export const BATCHES = '/institute/batches';
export const BATCH_ROUTE = '/batches';

export type BatchType = 'regular_practice' | 'stack_section' | 'real_time_challenge';
export type Difficulty = 'easy' | 'medium' | 'hard';

export const BATCH_TYPES: { value: BatchType; label: string }[] = [
  { value: 'regular_practice', label: 'Regular practice' },
  { value: 'stack_section', label: 'Stack section' },
  { value: 'real_time_challenge', label: 'Real-time challenge' },
];
export const BATCH_TYPE_LABEL = Object.fromEntries(BATCH_TYPES.map((item) => [item.value, item.label])) as Record<BatchType, string>;

export interface BatchProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  status: ProblemStatus;
  technology: string;
  sampleTests: number;
  hiddenTests: number;
}

export interface BatchSummary {
  id: string;
  name: string;
  description: string;
  type: BatchType;
  focus: string;
  targets: Record<Difficulty, number>;
  difficulty: Record<Difficulty, number>;
  problemCount: number;
  withoutSample: number;
  withoutHidden: number;
  notPublished: number;
  assignedAt: string | null;
  assignedByName: string | null;
  assignedGroup: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchDetail extends BatchSummary {
  items: BatchProblem[];
  progress: { learners: number; started: number; completed: number };
}

export interface BatchInput {
  name: string;
  description: string;
  type: BatchType;
  focus: string;
  easyTarget: number;
  mediumTarget: number;
  hardTarget: number;
  problemIds: string[];
}

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

async function attempt<T>(task: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    return { ok: false, error: errorText(error) };
  }
}

export const batchApi = {
  get: (id: string) => attempt(() => adminApi<BatchDetail>(`${BATCHES}/${id}`)),
  create: (input: BatchInput) => attempt(() => adminApi<BatchDetail>(BATCHES, { method: 'POST', body: input })),
  update: (id: string, input: Partial<BatchInput>) => attempt(() => adminApi<BatchDetail>(`${BATCHES}/${id}`, { method: 'PATCH', body: input })),
  assign: (id: string, groupId: string | null) => attempt(() => adminApi<BatchDetail>(`${BATCHES}/${id}/assign`, { method: 'POST', body: { groupId } })),
  groups: () => attempt(() => adminApi<{ items: { id: string; name: string }[] }>(`${BATCHES}/groups`)),
  unassign: (id: string) => attempt(() => adminApi<BatchDetail>(`${BATCHES}/${id}/unassign`, { method: 'POST' })),
  remove: (id: string) => attempt(() => adminApi<{ deleted: boolean }>(`${BATCHES}/${id}`, { method: 'DELETE' })),
};

export function useBatches(q: string) {
  const [items, setItems] = useState<BatchSummary[] | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<{ items: BatchSummary[] }>(BATCHES, { query: { q: q || undefined } });
      setItems(data.items);
      setError('');
    } catch (err) {
      setError(errorText(err));
      setItems((current) => current ?? []);
    }
  }, [q]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items: items ?? [], loaded: items !== null, error, refresh };
}

export const meetsTargets = (batch: Pick<BatchSummary, 'targets' | 'difficulty'>) =>
  (['easy', 'medium', 'hard'] as const).every((level) => batch.targets[level] === batch.difficulty[level]);
