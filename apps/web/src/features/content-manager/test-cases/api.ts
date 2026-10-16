'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText, type Paged } from '@/features/admin/lib/api';
import { CM_PROBLEMS } from '@/features/content-manager/lib/api';
import type { LibraryItem } from '@/features/content-manager/lib/api';
import type { CoverageRow, ProblemTestsInfo, TestCaseInput, TestCaseItem } from './types';

const SELECTED_KEY = 'elab_cm_test_case_problem';
const PENDING = 'Test-case details require an authorized Content Manager API. No Platform Admin endpoint is called.';
export type MutationResult = { ok: true } | { ok: false; error: string };
export function rememberProblem(id: string) {
  try { sessionStorage.setItem(SELECTED_KEY, id); } catch { /* storage unavailable */ }
}
export function recalledProblem(): string {
  try { return sessionStorage.getItem(SELECTED_KEY) ?? ''; } catch { return ''; }
}
export function useCoverage() {
  const [problems, setProblems] = useState<CoverageRow[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<Paged<LibraryItem>>(CM_PROBLEMS, { query: { scope: 'all', pageSize: 100 } });
      setProblems(data.items.map((p) => ({
        id: p.id, slug: p.slug, title: p.title, status: p.status,
        technology: p.technology.name, difficulty: p.difficulty,
        sampleTests: p.sampleTests, hiddenTests: p.hiddenTests,
        editable: p.editable,
      })));
      setLoadError('');
    } catch (error) { setProblems([]); setLoadError(errorText(error)); }
    finally { setReady(true); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { problems, ready, loadError, refresh };
}
export function useProblemTests(problemId: string | null) {
  const [problem] = useState<ProblemTestsInfo | null>(null);
  const [tests] = useState<TestCaseItem[]>([]);
  const loading = false;
  const loadError = problemId ? PENDING : '';
  const needsReason = false;
  const refresh = useCallback(async () => {}, []);
  const unsupported = useCallback(async (_data?: TestCaseInput | string | Partial<TestCaseInput>, _reason?: string): Promise<MutationResult> => ({ ok: false, error: PENDING }), []);
  const updateTest = useCallback(async (_id: string, _patch: Partial<TestCaseInput>, _reason?: string): Promise<MutationResult> => ({ ok: false, error: PENDING }), []);
  return { problem, tests, loading, loadError, needsReason, refresh, addTest: unsupported, updateTest, removeTest: unsupported };
}
