'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JudgeJob, JudgeLimits, JudgeState, JudgeWorker, WorkerInput } from './types';

const KEY = 'elab_judge_v1';
const TICK_MS = 2500;
const MAX_JOBS = 14;

export const DEFAULT_LIMITS: JudgeLimits = {
  timeLimitMs: 2000,
  compileTimeoutMs: 10000,
  memoryLimitMb: 256,
  outputLimitKb: 64,
  maxProcesses: 16,
  maxConcurrentPerLearner: 2,
  submissionsPerMinute: 10,
  networkAccess: false,
  sandboxProfile: 'strict',
};

const PROBLEMS = [
  ['Reverse a String', 'Python'],
  ['Two Sum', 'JavaScript'],
  ['Merge Intervals', 'Java'],
  ['Largest of Three', 'C'],
  ['Balanced Brackets', 'C'],
  ['Palindrome Check', 'Python'],
  ['Second Largest Element', 'Java'],
  ['Fibonacci (Recursive)', 'Java'],
  ['Top Customers by Revenue', 'SQL'],
] as const;

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();

let jobCounter = 4810;

function makeJob(partial: Partial<JudgeJob> = {}): JudgeJob {
  jobCounter += 1;
  const [problem, language] = PROBLEMS[jobCounter % PROBLEMS.length];
  return {
    id: `J-${jobCounter}`,
    problem,
    language,
    learner: `L-${1000 + ((jobCounter * 37) % 900)}`,
    state: 'queued',
    priority: 'normal',
    workerId: '',
    queuedAt: new Date().toISOString(),
    startedAt: '',
    error: '',
    ...partial,
  };
}

function seed(): JudgeState {
  const workers: JudgeWorker[] = [
    { id: 'w-1', name: 'judge-01', host: '10.0.1.11', capacity: 8, running: 0, cpu: 42, memory: 51, version: '1.4.2', status: 'online', heartbeatAt: ago(2) },
    { id: 'w-2', name: 'judge-02', host: '10.0.1.12', capacity: 8, running: 0, cpu: 58, memory: 47, version: '1.4.2', status: 'online', heartbeatAt: ago(1) },
    { id: 'w-3', name: 'judge-03', host: '10.0.1.13', capacity: 6, running: 0, cpu: 12, memory: 30, version: '1.4.1', status: 'draining', heartbeatAt: ago(3) },
    { id: 'w-4', name: 'judge-04', host: '10.0.1.14', capacity: 4, running: 0, cpu: 0, memory: 0, version: '1.3.9', status: 'offline', heartbeatAt: ago(1260) },
  ];
  const jobs: JudgeJob[] = [
    makeJob({ state: 'running', workerId: 'w-1', queuedAt: ago(9), startedAt: ago(4) }),
    makeJob({ state: 'running', workerId: 'w-1', queuedAt: ago(7), startedAt: ago(2) }),
    makeJob({ state: 'running', workerId: 'w-2', queuedAt: ago(6), startedAt: ago(3) }),
    makeJob({ state: 'queued', queuedAt: ago(5) }),
    makeJob({ state: 'queued', queuedAt: ago(4), priority: 'high' }),
    makeJob({ state: 'queued', queuedAt: ago(2) }),
    makeJob({ state: 'failed', queuedAt: ago(95), startedAt: ago(90), error: 'Worker timed out' }),
    makeJob({ state: 'failed', queuedAt: ago(240), startedAt: ago(236), error: 'Sandbox image missing' }),
  ];
  return { workers: withRunning(workers, jobs), jobs, limits: DEFAULT_LIMITS, queuePaused: false };
}

function withRunning(workers: JudgeWorker[], jobs: JudgeJob[]) {
  return workers.map((worker) => ({
    ...worker,
    running: jobs.filter((job) => job.state === 'running' && job.workerId === worker.id).length,
  }));
}

function load(): JudgeState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as JudgeState;
      if (parsed && Array.isArray(parsed.workers) && Array.isArray(parsed.jobs)) {
        return { ...parsed, limits: { ...DEFAULT_LIMITS, ...parsed.limits } };
      }
    }
  } catch {}
  return seed();
}

function persist(state: JudgeState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

const jitter = (value: number, spread: number) => Math.max(1, Math.min(99, Math.round(value + (Math.random() - 0.5) * spread)));

function tick(state: JudgeState): JudgeState {
  const now = Date.now();
  let jobs = [...state.jobs];

  jobs = jobs.flatMap((job) => {
    if (job.state !== 'running') return [job];
    const elapsed = (now - new Date(job.startedAt).getTime()) / 1000;
    if (elapsed < 3 + Math.random() * 5) return [job];
    if (Math.random() < 0.08) return [{ ...job, state: 'failed' as const, error: 'Runtime crashed in sandbox' }];
    return [];
  });

  if (!state.queuePaused) {
    const free = new Map(
      withRunning(state.workers, jobs)
        .filter((worker) => worker.status === 'online')
        .map((worker) => [worker.id, worker.capacity - worker.running]),
    );
    const waiting = jobs
      .filter((job) => job.state === 'queued')
      .sort((a, b) => (a.priority === b.priority ? a.queuedAt.localeCompare(b.queuedAt) : a.priority === 'high' ? -1 : 1));
    for (const job of waiting) {
      const slot = [...free.entries()].find(([, count]) => count > 0);
      if (!slot) break;
      free.set(slot[0], slot[1] - 1);
      jobs = jobs.map((item) => (item.id === job.id ? { ...item, state: 'running', workerId: slot[0], startedAt: new Date(now).toISOString() } : item));
    }
    if (jobs.length < MAX_JOBS && Math.random() < 0.7) jobs = [...jobs, makeJob()];
  }

  const workers = withRunning(state.workers, jobs).map((worker) => {
    if (worker.status === 'offline' || worker.status === 'restarting') return worker;
    const load = worker.capacity > 0 ? (worker.running / worker.capacity) * 100 : 0;
    return {
      ...worker,
      cpu: jitter(load * 0.8 + 12, 10),
      memory: jitter(load * 0.5 + 30, 6),
      heartbeatAt: new Date(now).toISOString(),
    };
  });

  return { ...state, workers, jobs };
}

export function useJudge(simulate = true) {
  const [state, setState] = useState<JudgeState | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setState(load());
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const mutate = useCallback((fn: (current: JudgeState) => JudgeState) => {
    setState((current) => {
      if (!current) return current;
      const next = fn(current);
      persist(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!simulate || !state) return;
    const id = window.setInterval(() => mutate(tick), TICK_MS);
    return () => window.clearInterval(id);
  }, [simulate, state === null, mutate]);

  const requeueFrom = (jobs: JudgeJob[], workerId: string) =>
    jobs.map((job) => (job.state === 'running' && job.workerId === workerId ? { ...job, state: 'queued' as const, workerId: '', startedAt: '' } : job));

  const addWorker = useCallback(
    (input: WorkerInput) =>
      mutate((current) => ({
        ...current,
        workers: [
          ...current.workers,
          { ...input, id: `w-${Date.now().toString(36)}`, running: 0, cpu: 8, memory: 20, status: 'online', heartbeatAt: new Date().toISOString() },
        ],
      })),
    [mutate],
  );

  const updateWorker = useCallback(
    (id: string, input: WorkerInput) =>
      mutate((current) => ({ ...current, workers: current.workers.map((worker) => (worker.id === id ? { ...worker, ...input } : worker)) })),
    [mutate],
  );

  const removeWorker = useCallback(
    (id: string) =>
      mutate((current) => {
        const jobs = requeueFrom(current.jobs, id);
        return { ...current, jobs, workers: withRunning(current.workers.filter((worker) => worker.id !== id), jobs) };
      }),
    [mutate],
  );

  const toggleDrain = useCallback(
    (id: string) =>
      mutate((current) => ({
        ...current,
        workers: current.workers.map((worker) =>
          worker.id === id ? { ...worker, status: worker.status === 'draining' ? 'online' : 'draining' } : worker,
        ),
      })),
    [mutate],
  );

  const restartWorker = useCallback(
    (id: string) => {
      mutate((current) => {
        const jobs = requeueFrom(current.jobs, id);
        return {
          ...current,
          jobs,
          workers: withRunning(current.workers, jobs).map((worker) =>
            worker.id === id ? { ...worker, status: 'restarting', cpu: 0, memory: 0 } : worker,
          ),
        };
      });
      timers.current.push(
        window.setTimeout(() => {
          mutate((current) => ({
            ...current,
            workers: current.workers.map((worker) =>
              worker.id === id ? { ...worker, status: 'online', cpu: 8, memory: 22, heartbeatAt: new Date().toISOString() } : worker,
            ),
          }));
        }, 3000),
      );
    },
    [mutate],
  );

  const cancelJob = useCallback(
    (id: string) =>
      mutate((current) => {
        const jobs = current.jobs.filter((job) => job.id !== id);
        return { ...current, jobs, workers: withRunning(current.workers, jobs) };
      }),
    [mutate],
  );

  const retryJob = useCallback(
    (id: string) =>
      mutate((current) => ({
        ...current,
        jobs: current.jobs.map((job) =>
          job.id === id ? { ...job, state: 'queued', error: '', workerId: '', startedAt: '', queuedAt: new Date().toISOString() } : job,
        ),
      })),
    [mutate],
  );

  const prioritizeJob = useCallback(
    (id: string) => mutate((current) => ({ ...current, jobs: current.jobs.map((job) => (job.id === id ? { ...job, priority: 'high' } : job)) })),
    [mutate],
  );

  const retryAllFailed = useCallback(
    () =>
      mutate((current) => ({
        ...current,
        jobs: current.jobs.map((job) =>
          job.state === 'failed' ? { ...job, state: 'queued', error: '', workerId: '', startedAt: '', queuedAt: new Date().toISOString() } : job,
        ),
      })),
    [mutate],
  );

  const togglePause = useCallback(() => mutate((current) => ({ ...current, queuePaused: !current.queuePaused })), [mutate]);

  const saveLimits = useCallback((limits: JudgeLimits) => mutate((current) => ({ ...current, limits })), [mutate]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setState(seed());
  }, []);

  return {
    state,
    loaded: state !== null,
    addWorker,
    updateWorker,
    removeWorker,
    toggleDrain,
    restartWorker,
    cancelJob,
    retryJob,
    prioritizeJob,
    retryAllFailed,
    togglePause,
    saveLimits,
    reset,
  };
}