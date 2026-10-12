'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHECKLIST, ME, STAGES, STAGE_MS, compareVersions } from './shared';
import type { Release, ReleaseEvent, ReleaseInput, ReleaseStatus, ReleaseType } from './types';

const KEY = 'elab_releases_v1';
const H = 3_600_000;
const D = 24 * H;

interface SeedDef {
  version: string;
  title: string;
  type: ReleaseType;
  status: ReleaseStatus;
  owner: string;
  stage?: number;
  startedAgo?: number;
  durationMs?: number;
  scheduledIn?: number;
  checklistDone: number;
  changes: [Release['changes'][number]['kind'], string][];
  extra?: [number, string, ReleaseEvent['tone']][];
}

const SEEDS: SeedDef[] = [
  {
    version: '2026.10.4',
    title: 'Plagiarism review improvements',
    type: 'feature',
    status: 'draft',
    owner: 'Meera S',
    checklistDone: 2,
    changes: [
      ['added', 'Side-by-side code comparison with matching lines highlighted'],
      ['added', 'Bulk dismiss for low-similarity flags'],
      ['changed', 'Similarity threshold is configurable per institution'],
    ],
  },
  {
    version: '2026.10.3',
    title: 'Assessment reconnect and timer fixes',
    type: 'fix',
    status: 'scheduled',
    owner: 'Ravi K',
    scheduledIn: 2 * D + 3 * H,
    checklistDone: 5,
    changes: [
      ['fixed', 'Timer no longer resets when a learner reconnects'],
      ['fixed', 'Answers are restored from the previous session after a network drop'],
      ['changed', 'Autosave interval reduced from 30 s to 10 s'],
    ],
  },
  {
    version: '2026.10.2',
    title: 'Python 3.12 becomes the default runtime',
    type: 'runtime',
    status: 'rolling',
    owner: 'Arjun P',
    stage: 1,
    startedAgo: 40 * 60_000,
    checklistDone: 5,
    changes: [
      ['changed', 'Python 3.12 is the default for new problems'],
      ['added', 'Recursion limit raised to 10 000 for Python submissions'],
      ['fixed', 'Java multiplier applied correctly on graph problems'],
    ],
  },
  {
    version: '2026.10.1',
    title: 'Execution and submission monitoring',
    type: 'feature',
    status: 'live',
    owner: 'You',
    startedAgo: 2 * D + 5 * H,
    durationMs: 70 * 60_000,
    checklistDone: 5,
    changes: [
      ['added', 'Execution Monitoring with live throughput, run time and alerts'],
      ['added', 'Submission Monitoring with problem health and rejudge'],
      ['fixed', 'Judge queue no longer double-assigns jobs after a worker restart'],
    ],
  },
  {
    version: '2026.09.4',
    title: 'Hotfix: SSO redirect URIs',
    type: 'hotfix',
    status: 'live',
    owner: 'Arjun P',
    startedAgo: 6 * D,
    durationMs: 25 * 60_000,
    checklistDone: 5,
    changes: [['fixed', 'Google SSO redirect URIs include the new learner domain']],
  },
  {
    version: '2026.09.3',
    title: 'New sandbox base image',
    type: 'runtime',
    status: 'rolled_back',
    owner: 'Ravi K',
    stage: 2,
    startedAgo: 9 * D,
    durationMs: 50 * 60_000,
    checklistDone: 5,
    changes: [['changed', 'Sandbox base image moved to Debian 12']],
    extra: [[45, 'Sandbox error rate rose to 4% at 50% rollout', 'danger']],
  },
  {
    version: '2026.09.2',
    title: 'Test case management tabs',
    type: 'feature',
    status: 'live',
    owner: 'Meera S',
    startedAgo: 15 * D,
    durationMs: 65 * 60_000,
    checklistDone: 5,
    changes: [
      ['added', 'Overview, Sample, Hidden and Source Checks tabs'],
      ['fixed', 'Horizontal scrolling on small screens'],
    ],
  },
];

const ev = (at: number, actor: string, text: string, tone: ReleaseEvent['tone']): ReleaseEvent => ({ id: `e-${at}-${Math.random().toString(36).slice(2, 6)}`, at, actor, text, tone });

function seed(now: number): Release[] {
  return SEEDS.map((def) => {
    const startedAt = def.startedAgo !== undefined ? now - def.startedAgo : null;
    const createdAt = (startedAt ?? now) - 3 * D;
    const events: ReleaseEvent[] = [ev(createdAt, def.owner, 'Created the release', 'neutral')];
    if (def.scheduledIn) events.push(ev(now - 5 * H, def.owner, `Scheduled for ${new Date(now + def.scheduledIn).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`, 'primary'));
    let completedAt: number | null = null;
    let stage = def.stage ?? 0;
    let stageAt: number | null = null;
    if (startedAt) {
      events.push(ev(startedAt, def.owner, `Started rollout at ${STAGES[0]}%`, 'warning'));
      if (def.status === 'rolling') {
        for (let i = 1; i <= stage; i += 1) events.push(ev(startedAt + i * 15 * 60_000, 'System', `Expanded to ${STAGES[i]}%`, 'warning'));
        stageAt = now - 4_000;
      }
      if (def.status === 'live' && def.durationMs) {
        stage = STAGES.length - 1;
        completedAt = startedAt + def.durationMs;
        events.push(ev(startedAt + def.durationMs / 2, 'System', 'Expanded to 50%', 'warning'));
        events.push(ev(completedAt, 'System', 'Reached 100% — release is live', 'success'));
      }
      if (def.status === 'rolled_back' && def.durationMs) {
        for (const [min, text, tone] of def.extra ?? []) events.push(ev(startedAt + min * 60_000, 'System', text, tone));
        completedAt = startedAt + def.durationMs;
        events.push(ev(completedAt, def.owner, `Rolled back at ${STAGES[stage]}%`, 'danger'));
      }
    }
    events.sort((a, b) => a.at - b.at);
    return {
      id: `rel-${def.version}`,
      version: def.version,
      title: def.title,
      type: def.type,
      status: def.status,
      owner: def.owner,
      stage,
      stageAt,
      scheduledAt: def.scheduledIn ? now + def.scheduledIn : null,
      startedAt,
      completedAt,
      changes: def.changes.map(([kind, text]) => ({ kind, text })),
      checklist: CHECKLIST.map((item, index) => ({ ...item, done: index < def.checklistDone })),
      events,
    };
  });
}

function load(): Release[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Release[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(items: Release[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  return items;
}

export function currentLive(items: Release[]) {
  return items.filter((item) => item.status === 'live').sort((a, b) => compareVersions(b.version, a.version))[0] ?? null;
}

export function activeRollout(items: Release[]) {
  return items.find((item) => item.status === 'rolling' || item.status === 'paused') ?? null;
}

function advance(items: Release[], now: number) {
  let changed = false;
  const blocked = Boolean(activeRollout(items));
  const next = items.map((item) => {
    if (item.status === 'rolling' && item.stageAt !== null && now - item.stageAt >= STAGE_MS) {
      changed = true;
      const stage = item.stage + 1;
      if (stage >= STAGES.length - 1) {
        return { ...item, stage: STAGES.length - 1, stageAt: null, status: 'live' as const, completedAt: now, events: [...item.events, ev(now, 'System', 'Reached 100% — release is live', 'success')] };
      }
      return { ...item, stage, stageAt: now, events: [...item.events, ev(now, 'System', `Expanded to ${STAGES[stage]}%`, 'warning')] };
    }
    if (item.status === 'scheduled' && item.scheduledAt !== null && now >= item.scheduledAt && !blocked) {
      changed = true;
      return { ...item, status: 'rolling' as const, stage: 0, stageAt: now, startedAt: now, events: [...item.events, ev(now, 'System', `Scheduled start — rolling out to ${STAGES[0]}%`, 'warning')] };
    }
    return item;
  });
  return changed ? next : items;
}

export function useReleases() {
  const [items, setItems] = useState<Release[] | null>(null);
  const itemsRef = useRef<Release[] | null>(null);
  itemsRef.current = items;

  useEffect(() => {
    setItems(advance(load(), Date.now()));
  }, []);

  const busy = items?.some((item) => item.status === 'rolling' || item.status === 'scheduled') ?? false;

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => {
      setItems((current) => {
        if (!current) return current;
        const next = advance(current, Date.now());
        return next === current ? current : persist(next);
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [busy]);

  const mutate = useCallback((id: string, fn: (release: Release, now: number) => Release) => {
    setItems((current) => (current ? persist(current.map((release) => (release.id === id ? fn(release, Date.now()) : release))) : current));
  }, []);

  const create = useCallback((input: ReleaseInput) => {
    const now = Date.now();
    const release: Release = {
      id: `rel-${input.version}`,
      version: input.version,
      title: input.title,
      type: input.type,
      status: 'draft',
      owner: input.owner,
      stage: 0,
      stageAt: null,
      scheduledAt: null,
      startedAt: null,
      completedAt: null,
      changes: input.changes,
      checklist: CHECKLIST.map((item) => ({ ...item, done: false })),
      events: [ev(now, ME, 'Created the release', 'neutral')],
    };
    setItems((current) => (current ? persist([release, ...current]) : current));
    return release.id;
  }, []);

  const toggleCheck = useCallback(
    (id: string, checkId: string) =>
      mutate(id, (release) => ({ ...release, checklist: release.checklist.map((item) => (item.id === checkId ? { ...item, done: !item.done } : item)) })),
    [mutate],
  );

  const schedule = useCallback(
    (id: string, at: number) =>
      mutate(id, (release, now) => ({
        ...release,
        status: 'scheduled',
        scheduledAt: at,
        events: [...release.events, ev(now, ME, `Scheduled for ${new Date(at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`, 'primary')],
      })),
    [mutate],
  );

  const unschedule = useCallback(
    (id: string) => mutate(id, (release, now) => ({ ...release, status: 'draft', scheduledAt: null, events: [...release.events, ev(now, ME, 'Moved back to draft', 'neutral')] })),
    [mutate],
  );

  const start = useCallback(
    (id: string) =>
      mutate(id, (release, now) => ({
        ...release,
        status: 'rolling',
        stage: 0,
        stageAt: now,
        startedAt: now,
        scheduledAt: null,
        events: [...release.events, ev(now, ME, `Started rollout at ${STAGES[0]}%`, 'warning')],
      })),
    [mutate],
  );

  const pause = useCallback(
    (id: string) => mutate(id, (release, now) => ({ ...release, status: 'paused', stageAt: null, events: [...release.events, ev(now, ME, `Paused at ${STAGES[release.stage]}%`, 'danger')] })),
    [mutate],
  );

  const resume = useCallback(
    (id: string) => mutate(id, (release, now) => ({ ...release, status: 'rolling', stageAt: now, events: [...release.events, ev(now, ME, `Resumed at ${STAGES[release.stage]}%`, 'warning')] })),
    [mutate],
  );

  const promote = useCallback(
    (id: string) =>
      mutate(id, (release, now) => ({
        ...release,
        status: 'live',
        stage: STAGES.length - 1,
        stageAt: null,
        completedAt: now,
        events: [...release.events, ev(now, ME, 'Promoted straight to 100% — release is live', 'success')],
      })),
    [mutate],
  );

  const rollback = useCallback(
    (id: string, reason: string) =>
      mutate(id, (release, now) => ({
        ...release,
        status: 'rolled_back',
        stageAt: null,
        completedAt: now,
        events: [...release.events, ev(now, ME, `Rolled back at ${STAGES[release.stage]}% — ${reason}`, 'danger')],
      })),
    [mutate],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems(seed(Date.now()));
  }, []);

  return { items: items ?? [], loaded: items !== null, itemsRef, create, toggleCheck, schedule, unschedule, start, pause, resume, promote, rollback, reset };
}