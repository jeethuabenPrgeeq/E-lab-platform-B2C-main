'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, adminApi, errorText, type Paged } from '../../lib/api';
import type { ProblemAction, ProblemDetail, ProblemInput, ProblemItem, ProblemStatus, ProblemVersion } from './types';

export type ActionResult = { ok: true } | { ok: false; error: string; issues: string[] };

function failure(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof ApiError ? error.message : errorText(error),
    issues: error instanceof ApiError ? error.issues : [],
  };
}

export function useProblems(status?: ProblemStatus) {
  const [items, setItems] = useState<ProblemItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<Paged<ProblemItem>>('/admin/problems', { query: { status, pageSize: 100 } });
      setItems(data.items);
      setLoadError('');
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setLoaded(true);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const transition = useCallback(
    async (id: string, action: ProblemAction, note?: string): Promise<ActionResult> => {
      try {
        await adminApi(`/admin/problems/${id}/transition`, { method: 'POST', body: { action, ...(note ? { note } : {}) } });
        await refresh();
        return { ok: true };
      } catch (error) {
        return failure(error);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        await adminApi(`/admin/problems/${id}`, { method: 'DELETE' });
        await refresh();
        return { ok: true };
      } catch (error) {
        return failure(error);
      }
    },
    [refresh],
  );

  return { items, loaded, loadError, refresh, transition, remove };
}

export function useProblem(id: string) {
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setProblem(await adminApi<ProblemDetail>(`/admin/problems/${id}`));
      setLoadError('');
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<ProblemInput>, reason?: string): Promise<ActionResult> => {
      try {
        setProblem(await adminApi<ProblemDetail>(`/admin/problems/${id}`, { method: 'PATCH', body: { ...patch, ...(reason ? { reason } : {}) } }));
        return { ok: true };
      } catch (error) {
        return failure(error);
      }
    },
    [id],
  );

  const transition = useCallback(
    async (action: ProblemAction, note?: string): Promise<ActionResult> => {
      try {
        setProblem(await adminApi<ProblemDetail>(`/admin/problems/${id}/transition`, { method: 'POST', body: { action, ...(note ? { note } : {}) } }));
        return { ok: true };
      } catch (error) {
        return failure(error);
      }
    },
    [id],
  );

  return { problem, loaded, loadError, refresh, update, transition };
}

export async function createProblem(input: ProblemInput): Promise<{ ok: true; id: string } | { ok: false; error: string; issues: string[] }> {
  try {
    const created = await adminApi<ProblemDetail>('/admin/problems', { method: 'POST', body: input });
    return { ok: true, id: created.id };
  } catch (error) {
    const result = failure(error);
    return result.ok ? { ok: false, error: 'Something went wrong.', issues: [] } : result;
  }
}

export async function fetchVersions(id: string) {
  const data = await adminApi<{ items: ProblemVersion[] }>(`/admin/problems/${id}/versions`);
  return data.items;
}

export function validateProblem(problem: ProblemInput): string[] {
  const errors: string[] = [];
  if (problem.title.trim().length < 3) errors.push('Title must be at least 3 characters.');
  if (!problem.technologyId) errors.push('Technology is required.');
  if (problem.shortDescription.trim().length < 10) errors.push('Short description must be at least 10 characters.');
  if (problem.problemStatement.trim().length < 30) errors.push('Problem statement must be at least 30 characters.');
  if (!Number.isFinite(problem.estimatedMinutes) || problem.estimatedMinutes < 1 || problem.estimatedMinutes > 600) {
    errors.push('Estimated minutes must be between 1 and 600.');
  }
  if (problem.skills.length === 0) errors.push('Add at least one skill.');
  return errors;
}
