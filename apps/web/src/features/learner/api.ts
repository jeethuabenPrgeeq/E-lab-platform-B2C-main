'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/features/auth/apiFetch';
import { getProblemBySlug, type PracticeProblem, type ProblemDifficulty, type ProblemLanguage, type WorkspaceType } from '@/features/problem-engine';
import { markProblemSolved } from '@/features/progress/local-progress';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export interface LearnerInstitution {
  id: string;
  name: string;
}

export interface LearnerProblemSummary {
  id: string;
  slug: string;
  title: string;
  technologySlug: string;
  technologyName: string;
  difficulty: ProblemDifficulty;
  workspaceType: WorkspaceType;
  shortDescription: string;
  skills: string[];
  estimatedMinutes: number;
  defaultLanguage: ProblemLanguage;
  source: 'platform' | 'institution';
  institutionName: string | null;
}

export interface LearnerProblemDetail extends LearnerProblemSummary {
  problemStatement: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints: string[];
  notes: string[];
  allowedLanguages: ProblemLanguage[];
  starterCode?: string;
  sampleTests: { id: string; title: string; input?: string; expectedOutput?: string }[];
}

export interface LearnerBatchProblem {
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  shortDescription: string;
  skills: string[];
  estimatedMinutes: number;
  technologySlug: string;
  technologyName: string;
  solved: boolean;
}

export interface LearnerBatch {
  id: string;
  name: string;
  description: string;
  type: 'regular_practice' | 'stack_section' | 'real_time_challenge';
  focus: string;
  assignedAt: string;
  problems: LearnerBatchProblem[];
  total: number;
  solvedCount: number;
}

async function learnerGet<T>(path: string): Promise<T> {
  const response = await apiFetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as T;
}

export function toPracticeProblem(problem: LearnerProblemSummary | LearnerBatchProblem | LearnerProblemDetail): PracticeProblem {
  const detail = 'problemStatement' in problem ? problem : null;
  const language = 'defaultLanguage' in problem ? problem.defaultLanguage : (problem.technologySlug as ProblemLanguage);
  return {
    slug: problem.slug,
    title: problem.title,
    technologySlug: problem.technologySlug,
    difficulty: problem.difficulty,
    workspaceType: 'workspaceType' in problem ? problem.workspaceType : 'code',
    shortDescription: problem.shortDescription,
    problemStatement: detail?.problemStatement ?? '',
    inputFormat: detail?.inputFormat,
    outputFormat: detail?.outputFormat,
    constraints: detail?.constraints,
    notes: detail?.notes,
    skills: problem.skills,
    estimatedMinutes: problem.estimatedMinutes,
    defaultLanguage: language,
    allowedLanguages: detail?.allowedLanguages ?? [language],
    starterCode: detail?.starterCode,
    sampleTests: detail?.sampleTests,
  };
}

export function useLearnerCatalog(technologySlug: string) {
  const [state, setState] = useState<{ institution: LearnerInstitution | null; items: LearnerProblemSummary[] }>({ institution: null, items: [] });

  useEffect(() => {
    let alive = true;
    learnerGet<{ institution: LearnerInstitution | null; items: LearnerProblemSummary[] }>(`/learner/problems?technology=${encodeURIComponent(technologySlug)}`)
      .then((data) => {
        if (alive) setState({ institution: data.institution, items: data.items.filter((item) => !getProblemBySlug(item.slug)) });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [technologySlug]);

  return state;
}

export function useRemoteProblem(slug: string | null) {
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    learnerGet<LearnerProblemDetail>(`/learner/problems/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (alive) setProblem(toPracticeProblem(data));
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return { problem, loading };
}

export function useLearnerBatches() {
  const [state, setState] = useState<{ loaded: boolean; error: string; institution: LearnerInstitution | null; items: LearnerBatch[] }>({ loaded: false, error: '', institution: null, items: [] });

  const refresh = useCallback(async () => {
    try {
      const data = await learnerGet<{ institution: LearnerInstitution | null; items: LearnerBatch[] }>('/learner/batches');
      setState({ loaded: true, error: '', institution: data.institution, items: data.items });
    } catch (error) {
      setState((current) => ({ ...current, loaded: true, error: error instanceof Error ? error.message : 'Could not load assignments.' }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export async function syncServerProgress(): Promise<boolean> {
  try {
    const data = await learnerGet<{ solved: string[] }>('/learner/progress');
    data.solved.forEach((slug) => markProblemSolved(slug));
    return data.solved.length > 0;
  } catch {
    return false;
  }
}
