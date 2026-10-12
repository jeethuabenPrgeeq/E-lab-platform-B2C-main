'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BROKEN_PROBLEM, PROBLEMS, brokenFrom, generateHour, rejudgeVerdict } from './data';
import { HOUR } from './shared';
import type { FlagDecision, PersistState, RejudgeJob, RejudgeScope, Submission, Verdict } from './types';

const KEY = 'elab_submissions_v1';
const HISTORY_HOURS = 24 * 31;
const TICK_MS = 4000;
const JOB_RATE = 80;

interface DataStore {
  closed: Submission[];
  current: Submission[];
  currentHour: number;
  brokenStart: number;
}

let data: DataStore | null = null;

function build(now: number) {
  const hour = Math.floor(now / HOUR);
  const brokenStart = brokenFrom(now);
  if (!data || data.brokenStart !== brokenStart) {
    const closed: Submission[] = [];
    for (let h = hour - HISTORY_HOURS; h < hour; h += 1) closed.push(...generateHour(h, brokenStart));
    data = { closed, current: [], currentHour: hour, brokenStart };
  } else if (data.currentHour !== hour) {
    for (let h = data.currentHour; h < hour; h += 1) data.closed.push(...generateHour(h, brokenStart));
    const cutoff = (hour - HISTORY_HOURS) * HOUR;
    let drop = 0;
    while (drop < data.closed.length && data.closed[drop].t < cutoff) drop += 1;
    if (drop) data.closed = data.closed.slice(drop);
    data.currentHour = hour;
  }
  data.current = generateHour(hour, brokenStart).filter((sub) => sub.t <= now);
  return data;
}

export interface SubSnapshot {
  all: Submission[];
  now: number;
}

function snapshot(): SubSnapshot {
  const now = Date.now();
  const store = build(now);
  return { all: store.current.length ? store.closed.concat(store.current) : store.closed, now };
}

const EMPTY: PersistState = { overrides: {}, flags: {}, jobs: [], fixedAt: {} };

function readPersist(): PersistState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as PersistState) };
  } catch {}
  return EMPTY;
}

export function effectiveVerdict(sub: Submission, persist: PersistState): Verdict {
  const override = persist.overrides[sub.id];
  if (override) return override.verdict;
  const fixed = persist.fixedAt[PROBLEMS[sub.problem].id];
  if (sub.broken && fixed && sub.t >= fixed) return sub.trueVerdict;
  return sub.verdict;
}

export function inScope(sub: Submission, problem: number, scope: RejudgeScope, since: number | null, cutoff: number, persist: PersistState) {
  if (sub.problem !== problem || sub.t > cutoff) return false;
  if (scope === 'since' && since !== null && sub.t < since) return false;
  if (scope === 'failed' && effectiveVerdict(sub, persist) === 'ac') return false;
  return true;
}

export function jobProgress(job: RejudgeJob, now: number) {
  if (job.status !== 'running') return job.status === 'done' ? job.total : 0;
  return Math.min(job.total, Math.floor(((now - job.startedAt) / job.durationMs) * job.total));
}

export function useSubmissions(live: boolean) {
  const [snap, setSnap] = useState<SubSnapshot | null>(null);
  const [persist, setPersist] = useState<PersistState>(EMPTY);
  const snapRef = useRef<SubSnapshot | null>(null);
  snapRef.current = snap;
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const write = useCallback((fn: (current: PersistState) => PersistState) => {
    setPersist((current) => {
      const next = fn(current);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    setPersist(readPersist());
    setSnap(snapshot());
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setSnap(snapshot()), TICK_MS);
    return () => window.clearInterval(id);
  }, [live]);

  const running = persist.jobs.some((job) => job.status === 'running');

  useEffect(() => {
    if (!running) return;
    const finish = () => {
      const current = snapRef.current ?? snapshot();
      const now = Date.now();
      write((state) => {
        const due = state.jobs.filter((job) => job.status === 'running' && now >= job.startedAt + job.durationMs);
        if (!due.length) return state;
        const overrides = { ...state.overrides };
        const fixedAt = { ...state.fixedAt };
        const jobs = state.jobs.map((job) => {
          if (!due.includes(job)) return job;
          const changes: Record<string, number> = {};
          let touchedBroken = false;
          for (const sub of current.all) {
            if (!inScope(sub, job.problem, job.scope, job.since, job.cutoff, state)) continue;
            const before = effectiveVerdict(sub, state);
            const after = rejudgeVerdict(sub);
            if (sub.broken) touchedBroken = true;
            if (before !== after) {
              overrides[sub.id] = { verdict: after, from: before, jobId: job.id, at: now };
              const key = `${before}>${after}`;
              changes[key] = (changes[key] ?? 0) + 1;
            }
          }
          if (touchedBroken && job.problem === BROKEN_PROBLEM) fixedAt[PROBLEMS[job.problem].id] = fixedAt[PROBLEMS[job.problem].id] ?? job.startedAt;
          return { ...job, status: 'done' as const, finishedAt: now, changes };
        });
        return { ...state, overrides, fixedAt, jobs };
      });
    };
    finish();
    const id = window.setInterval(() => {
      setSnap(snapshot());
      finish();
    }, 500);
    return () => window.clearInterval(id);
  }, [running, write]);

  const startJob = useCallback(
    (problem: number, scope: RejudgeScope, since: number | null) => {
      const current = snapRef.current ?? snapshot();
      const now = Date.now();
      const total = current.all.filter((sub) => inScope(sub, problem, scope, since, now, persistRef.current)).length;
      write((state) => {
        const job: RejudgeJob = {
          id: `RJ-${now.toString(36).toUpperCase().slice(-6)}`,
          problem,
          scope,
          since,
          cutoff: now,
          total,
          startedAt: now,
          durationMs: Math.max(2500, (total / JOB_RATE) * 1000),
          status: 'running',
          finishedAt: null,
          changes: {},
        };
        return { ...state, jobs: [job, ...state.jobs] };
      });
      return total;
    },
    [write],
  );

  const cancelJob = useCallback(
    (id: string) =>
      write((state) => ({ ...state, jobs: state.jobs.map((job) => (job.id === id && job.status === 'running' ? { ...job, status: 'cancelled', finishedAt: Date.now() } : job)) })),
    [write],
  );

  const rejudgeOne = useCallback(
    (sub: Submission) =>
      write((state) => {
        const before = effectiveVerdict(sub, state);
        const after = rejudgeVerdict(sub);
        if (before === after) return state;
        return { ...state, overrides: { ...state.overrides, [sub.id]: { verdict: after, from: before, jobId: 'single', at: Date.now() } } };
      }),
    [write],
  );

  const decideFlag = useCallback(
    (id: string, decision: FlagDecision | null) =>
      write((state) => {
        const flags = { ...state.flags };
        if (decision) flags[id] = { decision, at: Date.now() };
        else delete flags[id];
        return { ...state, flags };
      }),
    [write],
  );

  const reset = useCallback(() => {
    write(() => EMPTY);
    data = null;
    setSnap(snapshot());
  }, [write]);

  return { snap, persist, startJob, cancelJob, rejudgeOne, decideFlag, reset };
}