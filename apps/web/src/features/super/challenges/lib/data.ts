'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCatalog } from '../../content/lib/data';
import type { ContentItem } from '../../content/lib/types';
import { ME, formatDuration, formatWhen, scheduleIssues, statusOf } from './shared';
import type { Challenge, ChallengeActivity, ChallengeInput, ChallengeKind, LeaderboardEntry } from './types';

const KEY = 'elab_super_challenges_v1';
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const NAMES = ['Aarav Nair', 'Diya Menon', 'Rahul Iyer', 'Ananya Rao', 'Karthik Shetty', 'Meghana Reddy', 'Arjun George', 'Fathima Rasheed', 'Nikhil Joseph', 'Sneha Pillai', 'Rohan Hegde', 'Kavya Krishnan', 'Ishaan Das', 'Riya Thomas', 'Siddharth Kumar'];
const COLLEGES = ['NIT Calicut', 'PES University', 'Christ University', 'RV College of Engineering', 'Amrita Vishwa Vidyapeetham', 'Independent'];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function leaderboard(r: () => number, problems: number, durationMinutes: number): LeaderboardEntry[] {
  const used = new Set<number>();
  const entries: LeaderboardEntry[] = [];
  let score = problems * 100;
  for (let i = 0; i < 5; i += 1) {
    let index = Math.floor(r() * NAMES.length);
    while (used.has(index)) index = (index + 1) % NAMES.length;
    used.add(index);
    const solved = Math.max(1, problems - Math.floor(i / 2) - (r() < 0.3 ? 1 : 0));
    score = Math.min(score, solved * 100 - Math.floor(r() * 30));
    entries.push({ name: NAMES[index], institution: COLLEGES[Math.floor(r() * COLLEGES.length)], score, solved, minutes: Math.min(durationMinutes, Math.floor(durationMinutes * (0.35 + i * 0.1 + r() * 0.1))) });
    score -= 5 + Math.floor(r() * 25);
  }
  return entries;
}

type Spec = [title: string, kind: ChallengeKind, sponsor: string | null, start: [days: number, hour: number], durationMinutes: number, problemCount: number, registered: number, turnout: number, prize: number, access: Challenge['access'], published: boolean, cancelReason: string | null, mix: 'algo' | 'sql' | 'lab'];

const SPECS: Spec[] = [
  ['October Long Challenge', 'monthly', null, [-6, 0], 14 * 1440, 8, 3940, 0.69, 50000, 'everyone', true, null, 'algo'],
  ['Weekly Code Sprint #44', 'weekly', null, [3, 20], 120, 4, 612, 0, 10000, 'everyone', true, null, 'algo'],
  ['DataGrid SQL Showdown', 'sponsored', 'DataGrid', [1, 18], 90, 5, 1180, 0, 25000, 'everyone', true, null, 'sql'],
  ['Northwind Labs Hiring Challenge', 'hiring', 'Northwind Labs', [9, 10], 180, 3, 840, 0, 0, 'everyone', true, null, 'algo'],
  ['November Long Challenge', 'monthly', null, [24, 0], 14 * 1440, 8, 210, 0, 50000, 'everyone', true, null, 'algo'],
  ['Weekly Code Sprint #45', 'weekly', null, [10, 20], 120, 0, 0, 0, 10000, 'everyone', false, null, 'algo'],
  ['DevOps Lab Rally', 'sponsored', '', [20, 15], 180, 4, 0, 0, 15000, 'paid', false, null, 'lab'],
  ['Weekly Code Sprint #43', 'weekly', null, [-4, 20], 120, 4, 2310, 0.8, 10000, 'everyone', true, null, 'algo'],
  ['Weekly Code Sprint #42', 'weekly', null, [-11, 20], 120, 4, 2085, 0.77, 10000, 'everyone', true, null, 'algo'],
  ['Weekly Code Sprint #41', 'weekly', null, [-18, 20], 120, 4, 1960, 0.74, 10000, 'everyone', true, null, 'algo'],
  ['September Long Challenge', 'monthly', null, [-36, 0], 14 * 1440, 8, 3620, 0.71, 50000, 'everyone', true, null, 'algo'],
  ['Acme Fintech Backend Hiring Sprint', 'hiring', 'Acme Fintech', [-35, 10], 180, 3, 930, 0.74, 0, 'everyone', true, null, 'algo'],
  ['Campus Cup: PES vs RVCE', 'sponsored', 'PES University', [5, 14], 120, 4, 380, 0, 5000, 'everyone', true, 'Clashes with the university exam schedule', 'algo'],
];

function pickProblems(catalog: ContentItem[], r: () => number, count: number, mix: Spec[12]) {
  const pool = catalog.filter((item) => item.visibility === 'listed' && (mix === 'lab' ? item.type === 'lab' : item.type === 'problem' && (mix === 'sql' ? item.technology === 'SQL' : item.technology !== 'SQL')));
  const order = ['easy', 'medium', 'medium', 'hard', 'hard', 'medium', 'hard', 'easy'];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length; i += 1) {
    const wanted = pool.filter((item) => item.difficulty === order[i % order.length] && !picked.includes(item.id));
    const source = wanted.length ? wanted : pool.filter((item) => !picked.includes(item.id));
    if (!source.length) break;
    picked.push(source[Math.floor(r() * source.length)].id);
  }
  return picked;
}

function seed(now: number): Challenge[] {
  const r = rng(44);
  const catalog = loadCatalog();
  const at = ([days, hour]: [number, number]) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date.getTime();
  };
  return SPECS.map(([title, kind, sponsor, start, duration, count, registered, turnout, prize, access, published, cancelReason, mix], index) => {
    const startAt = at(start);
    const endAt = startAt + duration * MIN;
    const problems = pickProblems(catalog, r, count, mix);
    const createdAt = Math.min(startAt - 6 * DAY, now - 2 * DAY);
    const activity: ChallengeActivity[] = [{ at: createdAt, text: 'Created as a draft', actor: 'Lakshmi V' }];
    if (published) activity.push({ at: createdAt + DAY, text: `Scheduled for ${formatWhen(startAt)}`, actor: 'Lakshmi V' });
    if (cancelReason) activity.push({ at: now - DAY, text: `Cancelled: ${cancelReason}`, actor: 'Lakshmi V' });
    const started = published && !cancelReason && startAt <= now;
    const participants = started ? Math.round(registered * turnout) : 0;
    return {
      id: `CH-${301 + index}`,
      title,
      kind,
      sponsor,
      startAt,
      endAt,
      problems,
      registered,
      participants,
      prize,
      access,
      published,
      cancelled: Boolean(cancelReason),
      cancelReason,
      leaderboard: started ? leaderboard(r, problems.length || 1, Math.min(duration, 600)) : [],
      activity,
    };
  });
}

function load(): Challenge[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Challenge[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(items: Challenge[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  return items;
}

const nextId = (current: Challenge[] | null) => `CH-${Math.max(300, ...(current ?? []).map((challenge) => Number(challenge.id.slice(3)))) + 1}`;

const catalogMap = () => new Map(loadCatalog().map((item) => [item.id, item]));

const log = (challenge: Challenge, text: string): ChallengeActivity[] => [...challenge.activity, { at: Date.now(), text, actor: ME }];

export function useChallenges() {
  const [items, setItems] = useState<Challenge[] | null>(null);
  const itemsRef = useRef<Challenge[] | null>(null);
  itemsRef.current = items;

  useEffect(() => {
    setItems(load());
  }, []);

  const update = useCallback((id: string, fn: (challenge: Challenge) => Challenge) => {
    setItems((current) => (current ? persist(current.map((challenge) => (challenge.id === id ? fn(challenge) : challenge))) : current));
  }, []);

  const create = useCallback((input: ChallengeInput, publish: boolean): { id: string | null; issues: string[] } => {
    const now = Date.now();
    if (publish) {
      const issues = scheduleIssues(input, catalogMap(), now);
      if (issues.length) return { id: null, issues };
    } else if (input.title.trim().length < 4) {
      return { id: null, issues: ['Give the challenge a title of at least 4 characters'] };
    }
    const challenge: Challenge = {
      id: nextId(itemsRef.current),
      title: input.title.trim(),
      kind: input.kind,
      sponsor: input.sponsor?.trim() || null,
      startAt: input.startAt,
      endAt: input.startAt + input.durationMinutes * MIN,
      problems: input.problems,
      registered: 0,
      participants: 0,
      prize: input.prize,
      access: input.access,
      published: publish,
      cancelled: false,
      cancelReason: null,
      leaderboard: [],
      activity: [
        { at: now, text: 'Created as a draft', actor: ME },
        ...(publish ? [{ at: now, text: `Scheduled for ${formatWhen(input.startAt)}`, actor: ME }] : []),
      ],
    };
    setItems((current) => (current ? persist([challenge, ...current]) : current));
    return { id: challenge.id, issues: [] };
  }, []);

  const edit = useCallback(
    (id: string, input: ChallengeInput, publish: boolean): string[] => {
      const now = Date.now();
      const existing = itemsRef.current?.find((challenge) => challenge.id === id);
      if (!existing) return ['Challenge not found'];
      const status = statusOf(existing, now);
      if (status !== 'draft' && status !== 'scheduled') return ['Only drafts and scheduled challenges can be edited'];
      const goingLive = publish || existing.published;
      if (goingLive) {
        const issues = scheduleIssues(input, catalogMap(), now);
        if (issues.length) return issues;
      } else if (input.title.trim().length < 4) return ['Give the challenge a title of at least 4 characters'];
      update(id, (challenge) => ({
        ...challenge,
        title: input.title.trim(),
        kind: input.kind,
        sponsor: input.sponsor?.trim() || null,
        startAt: input.startAt,
        endAt: input.startAt + input.durationMinutes * MIN,
        problems: input.problems,
        prize: input.prize,
        access: input.access,
        published: goingLive,
        activity: log(challenge, !challenge.published && goingLive ? `Scheduled for ${formatWhen(input.startAt)}` : 'Edited the details'),
      }));
      return [];
    },
    [update],
  );

  const unpublish = useCallback((id: string) => update(id, (challenge) => ({ ...challenge, published: false, activity: log(challenge, 'Moved back to draft — registrations paused') })), [update]);

  const extend = useCallback(
    (id: string, minutes: number) => update(id, (challenge) => ({ ...challenge, endAt: challenge.endAt + minutes * MIN, activity: log(challenge, `Extended by ${formatDuration(minutes)} — now ends ${formatWhen(challenge.endAt + minutes * MIN)}`) })),
    [update],
  );

  const endNow = useCallback((id: string) => update(id, (challenge) => ({ ...challenge, endAt: Date.now(), activity: log(challenge, 'Ended early') })), [update]);

  const cancel = useCallback(
    (id: string, reason: string) => update(id, (challenge) => ({ ...challenge, cancelled: true, cancelReason: reason, activity: log(challenge, `Cancelled: ${reason}`) })),
    [update],
  );

  const duplicate = useCallback((id: string): string | null => {
    const source = itemsRef.current?.find((challenge) => challenge.id === id);
    if (!source) return null;
    const now = Date.now();
    const duration = source.endAt - source.startAt;
    let startAt = source.startAt + (source.kind === 'weekly' ? 7 * DAY : 30 * DAY);
    while (startAt < now + DAY) startAt += 7 * DAY;
    const numbered = source.title.match(/^(.*#)(\d+)$/);
    const highest = numbered
      ? Math.max(...(itemsRef.current ?? []).map((challenge) => (challenge.title.startsWith(numbered[1]) ? Number(challenge.title.slice(numbered[1].length)) || 0 : 0)))
      : 0;
    const title = numbered ? `${numbered[1]}${highest + 1}` : `${source.title} (copy)`;
    const copy: Challenge = {
      ...source,
      id: nextId(itemsRef.current),
      title,
      startAt,
      endAt: startAt + duration,
      registered: 0,
      participants: 0,
      published: false,
      cancelled: false,
      cancelReason: null,
      leaderboard: [],
      activity: [{ at: now, text: `Duplicated from ${source.title}`, actor: ME }],
    };
    setItems((current) => (current ? persist([copy, ...current]) : current));
    return copy.id;
  }, []);

  const remove = useCallback((id: string) => setItems((current) => (current ? persist(current.filter((challenge) => challenge.id !== id)) : current)), []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems(seed(Date.now()));
  }, []);

  return { items: items ?? [], loaded: items !== null, create, edit, unpublish, extend, endNow, cancel, duplicate, remove, reset };
}

export type ChallengeStore = ReturnType<typeof useChallenges>;
