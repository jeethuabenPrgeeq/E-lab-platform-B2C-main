'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText } from '../lib/api';
import type { CoverageRow, ProblemTestsInfo, TestCaseInput, TestCaseItem } from './types';

const SELECTED_KEY = 'elab_test_case_problem';

export type MutationResult = { ok: true } | { ok: false; error: string };

interface ServerTest {
  id: string;
  input: string | null;
  expectedOutput: string;
  hidden: boolean;
  enabled: boolean;
  position: number;
}

const toItem = (test: ServerTest): TestCaseItem => ({ ...test, input: test.input ?? '' });

export function rememberProblem(id: string) {
  try {
    sessionStorage.setItem(SELECTED_KEY, id);
  } catch {}
}

export function recalledProblem(): string {
  try {
    return sessionStorage.getItem(SELECTED_KEY) ?? '';
  } catch {
    return '';
  }
}

export function useCoverage() {
  const [problems, setProblems] = useState<CoverageRow[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<{ items: CoverageRow[] }>('/admin/test-cases/overview');
      setProblems(data.items);
      setLoadError('');
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { problems, ready, loadError, refresh };
}

export function useProblemTests(problemId: string | null) {
  const [problem, setProblem] = useState<ProblemTestsInfo | null>(null);
  const [tests, setTests] = useState<TestCaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    if (!problemId) {
      setProblem(null);
      setTests([]);
      return;
    }
    setLoading(true);
    try {
      const data = await adminApi<{ problem: ProblemTestsInfo; testCases: ServerTest[] }>(`/admin/problems/${problemId}/test-cases`);
      setProblem(data.problem);
      setTests(data.testCases.map(toItem));
      setLoadError('');
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (task: () => Promise<unknown>): Promise<MutationResult> => {
      try {
        await task();
        await refresh();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorText(error) };
      }
    },
    [refresh],
  );

  const reasonBody = (reason?: string) => (reason ? { reason } : {});

  const addTest = useCallback(
    (data: TestCaseInput, reason?: string) =>
      run(() => adminApi(`/admin/problems/${problemId}/test-cases`, { method: 'POST', body: { ...data, ...reasonBody(reason) } })),
    [problemId, run],
  );

  const updateTest = useCallback(
    (testId: string, patch: Partial<TestCaseInput>, reason?: string) =>
      run(() => adminApi(`/admin/test-cases/${testId}`, { method: 'PATCH', body: { ...patch, ...reasonBody(reason) } })),
    [run],
  );

  const removeTest = useCallback(
    (testId: string, reason?: string) => run(() => adminApi(`/admin/test-cases/${testId}`, { method: 'DELETE', body: reasonBody(reason) })),
    [run],
  );

  const needsReason = problem?.status === 'published' || problem?.status === 'deprecated';

  return { problem, tests, loading, loadError, needsReason, refresh, addTest, updateTest, removeTest };
}
