'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCatalog } from '../../content/lib/data';
import { tierRank } from '../../content/lib/shared';
import type { AccessTier, ContentItem, ContentType } from '../../content/lib/types';
import { ME, STATUS_META, publishIssues } from './shared';
import type { LearningPath, NewPathInput, PathActivity, PathDraft, PathLevel, PathStatus } from './types';

const KEY = 'elab_super_paths_v1';
const DAY = 86_400_000;

type Spec = [title: string, summary: string, level: PathLevel, tier: AccessTier, status: PathStatus, certificate: boolean, techs: string[], types: ContentType[], steps: number, enrolled: number, completion: number];

const SPECS: Spec[] = [
  ['Python Foundations', 'Variables to recursion — the first 12 problems every new learner should solve.', 'beginner', 'free', 'published', true, ['Python'], ['problem'], 12, 4820, 46],
  ['Data Structures in Java', 'Arrays, lists, trees and graphs implemented and tested in Java.', 'intermediate', 'starter', 'published', true, ['Java'], ['problem'], 14, 2140, 38],
  ['JavaScript Interview Prep', 'The patterns that come up most in front-end and full-stack interviews.', 'intermediate', 'starter', 'published', false, ['JavaScript'], ['problem'], 16, 3310, 41],
  ['SQL for Analysts', 'Joins, window functions and reporting queries on realistic schemas.', 'beginner', 'free', 'published', true, ['SQL'], ['problem'], 10, 2760, 52],
  ['React from Zero', 'Components, state and data fetching, ending with a small app.', 'beginner', 'starter', 'published', false, ['React', 'JavaScript'], ['problem', 'project'], 8, 1890, 33],
  ['Full-stack with Next.js & NestJS', 'Ship a typed full-stack product: API, auth, UI and deployment.', 'advanced', 'professional', 'published', true, ['Next.js', 'NestJS'], ['project'], 8, 940, 21],
  ['DevOps Essentials', 'Git, Linux and Docker labs in a real terminal.', 'intermediate', 'professional', 'published', true, ['Git', 'Linux', 'Docker'], ['lab'], 12, 1320, 36],
  ['Kubernetes in Practice', 'Deploy, scale and debug workloads on a live cluster.', 'advanced', 'premium', 'draft', true, ['Kubernetes', 'Docker'], ['lab'], 6, 0, 0],
  ['C Programming Basics', 'Pointers, memory and arrays for first-year engineering students.', 'beginner', 'free', 'published', false, ['C'], ['problem'], 10, 1610, 49],
  ['Competitive Programming in C++', 'Hard algorithmic problems with tight time limits.', 'advanced', 'professional', 'published', false, ['C++'], ['problem'], 15, 780, 18],
  ['TypeScript Deep Dive', '', 'intermediate', 'starter', 'draft', false, ['TypeScript'], ['problem', 'project'], 2, 0, 0],
  ['Django Web Apps', 'Models, views and auth by building two Django projects.', 'intermediate', 'professional', 'published', false, ['Django', 'Python'], ['project', 'problem'], 7, 610, 27],
  ['System Design Projects', 'Larger builds that need caching, queues and careful data models.', 'advanced', 'premium', 'published', true, ['NestJS', 'Next.js', 'React'], ['project'], 6, 320, 15],
  ['Backend APIs with NestJS', 'REST APIs with validation, guards and Prisma.', 'intermediate', 'starter', 'archived', false, ['NestJS'], ['project'], 6, 450, 31],
];

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

function pickSteps(catalog: ContentItem[], spec: Spec, offset: number) {
  const [, , level, tier, , , techs, types, count] = spec;
  const pool = catalog.filter((item) => techs.includes(item.technology) && types.includes(item.type) && item.visibility !== 'retired');
  const fits = pool.filter((item) => tierRank(item.tier) <= tierRank(tier));
  const source = fits.length >= count ? fits : pool;
  const ordered = [...source].sort((a, b) => {
    const target = level === 'advanced' ? -1 : 1;
    return target * (DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]) || b.learners - a.learners;
  });
  const start = Math.min(offset % 3, Math.max(0, ordered.length - count));
  return ordered.slice(start, start + count).map((item) => item.id);
}

function seed(now: number): LearningPath[] {
  const catalog = loadCatalog();
  return SPECS.map((spec, index) => {
    const [title, summary, level, tier, status, certificate, , , , enrolled, completion] = spec;
    const createdAt = now - (380 - index * 22) * DAY;
    const updatedAt = now - (index % 5) * 6 * DAY - DAY;
    const activity: PathActivity[] = [{ at: createdAt, text: 'Created the path', actor: 'Lakshmi V' }];
    if (status !== 'draft') activity.push({ at: createdAt + 4 * DAY, text: 'Published the path', actor: 'Lakshmi V' });
    if (status === 'archived') activity.push({ at: updatedAt, text: 'Archived: replaced by Full-stack with Next.js & NestJS', actor: 'Lakshmi V' });
    return {
      id: `P-${101 + index}`,
      title,
      summary,
      level,
      tier,
      status,
      certificate,
      steps: pickSteps(catalog, spec, index),
      enrolled,
      completion,
      createdAt,
      updatedAt,
      activity,
    };
  });
}

function load(): LearningPath[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LearningPath[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(items: LearningPath[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  return items;
}

const log = (path: LearningPath, text: string): PathActivity[] => [...path.activity, { at: Date.now(), text, actor: ME }];

export function usePaths() {
  const [paths, setPaths] = useState<LearningPath[] | null>(null);
  const pathsRef = useRef<LearningPath[] | null>(null);
  pathsRef.current = paths;

  useEffect(() => {
    setPaths(load());
  }, []);

  const update = useCallback((id: string, fn: (path: LearningPath) => LearningPath) => {
    setPaths((current) => (current ? persist(current.map((path) => (path.id === id ? fn(path) : path))) : current));
  }, []);

  const save = useCallback(
    (id: string, draft: PathDraft) => update(id, (path) => ({ ...path, ...draft, title: draft.title.trim(), summary: draft.summary.trim(), updatedAt: Date.now(), activity: log(path, path.status === 'published' ? 'Saved changes to the live path' : 'Saved the draft') })),
    [update],
  );

  const publish = useCallback(
    (id: string, draft: PathDraft): string[] => {
      const issues = publishIssues(draft, new Map(loadCatalog().map((item) => [item.id, item])));
      if (issues.length) return issues;
      update(id, (path) => ({ ...path, ...draft, title: draft.title.trim(), summary: draft.summary.trim(), status: 'published', updatedAt: Date.now(), activity: log(path, path.status === 'published' ? 'Saved changes to the live path' : 'Published the path') }));
      return [];
    },
    [update],
  );

  const setStatus = useCallback(
    (id: string, status: PathStatus, note?: string) =>
      update(id, (path) => ({ ...path, status, updatedAt: Date.now(), activity: log(path, status === 'archived' ? `Archived${note ? `: ${note}` : ''}` : status === 'draft' ? 'Moved back to draft' : `${STATUS_META[status].label}`) })),
    [update],
  );

  const create = useCallback((input: NewPathInput): string => {
    const current = pathsRef.current ?? [];
    const next = Math.max(100, ...current.map((path) => Number(path.id.slice(2)))) + 1;
    const now = Date.now();
    const path: LearningPath = {
      id: `P-${next}`,
      title: input.title.trim(),
      summary: '',
      level: input.level,
      tier: input.tier,
      status: 'draft',
      certificate: false,
      steps: [],
      enrolled: 0,
      completion: 0,
      createdAt: now,
      updatedAt: now,
      activity: [{ at: now, text: 'Created the path', actor: ME }],
    };
    setPaths((list) => (list ? persist([path, ...list]) : list));
    return path.id;
  }, []);

  const duplicate = useCallback((id: string): string | null => {
    const current = pathsRef.current ?? [];
    const source = current.find((path) => path.id === id);
    if (!source) return null;
    const next = Math.max(100, ...current.map((path) => Number(path.id.slice(2)))) + 1;
    const now = Date.now();
    const copy: LearningPath = { ...source, id: `P-${next}`, title: `${source.title} (copy)`, status: 'draft', enrolled: 0, completion: 0, createdAt: now, updatedAt: now, activity: [{ at: now, text: `Duplicated from ${source.title}`, actor: ME }] };
    setPaths((list) => (list ? persist([copy, ...list]) : list));
    return copy.id;
  }, []);

  const remove = useCallback((id: string) => setPaths((list) => (list ? persist(list.filter((path) => path.id !== id)) : list)), []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setPaths(seed(Date.now()));
  }, []);

  return { paths: paths ?? [], loaded: paths !== null, save, publish, setStatus, create, duplicate, remove, reset };
}

export type PathStore = ReturnType<typeof usePaths>;
