'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_FEATURED, ME, TIER_META, VISIBILITY_META } from './shared';
import type { AccessTier, ContentActivity, ContentItem, ContentType, Difficulty, Visibility } from './types';

const KEY = 'elab_super_catalog_v1';
const DAY = 86_400_000;
export const CATALOG_SIZE = 486;

const ALGO = [
  'Two Sum', 'Reverse a String', 'Valid Parentheses', 'Merge Intervals', 'Binary Search', 'Longest Common Prefix', 'Rotate Array', 'Move Zeroes',
  'Climbing Stairs', 'Coin Change', 'Group Anagrams', 'Top K Frequent Elements', 'Linked List Cycle', 'Merge Two Sorted Lists', 'Kth Largest Element',
  'Number of Islands', 'Course Schedule', 'Word Ladder', 'LRU Cache', 'Sliding Window Maximum', 'Trapping Rain Water', 'Median of Two Arrays',
  'Matrix Spiral Order', 'Prime Sieve', 'FizzBuzz Variations', 'Palindrome Partitioning', 'Knapsack', 'Longest Increasing Subsequence',
  'Dijkstra Shortest Path', 'Balanced Binary Tree', 'Level Order Traversal', 'Serialize a Tree', 'Roman to Integer', 'Stock Buy and Sell',
  'Edit Distance', 'Meeting Rooms',
];
const SQL = [
  'Top Customers by Revenue', 'Monthly Active Users', 'Second Highest Salary', 'Duplicate Emails', 'Orders Without Payments', 'Running Totals',
  'Department Top Earners', 'Churned Subscribers', 'Daily Signups Trend', 'Products Never Sold', 'Average Session Length', 'Funnel Conversion',
  'Rank Students by Score', 'Late Deliveries', 'Inventory Reorder List', 'Cohort Retention', 'Revenue by Region', 'Users With Streaks',
  'Cancelled Bookings', 'Pivot Quarterly Sales', 'Find Overlapping Shifts', 'Median Order Value', 'Repeat Purchasers', 'Gaps in Invoice Numbers',
];
const PROJECT = [
  'Build a Todo App', 'Expense Tracker', 'Weather Dashboard', 'Blog with Auth', 'E-commerce Cart', 'Chat Room', 'URL Shortener', 'Kanban Board',
  'Job Board', 'Recipe Finder', 'Quiz Platform', 'Notes with Search', 'Booking System', 'Inventory Manager', 'Movie Watchlist', 'Habit Tracker',
  'File Upload Service', 'Payments Integration',
];
const LABS: Record<string, string[]> = {
  Git: ['Resolve a Merge Conflict', 'Interactive Rebase', 'Recover a Deleted Branch', 'Cherry-pick a Hotfix', 'Bisect a Regression', 'Write Git Hooks', 'Squash Commits', 'Tag a Release'],
  Linux: ['File Permissions', 'Process Management', 'Cron Jobs', 'Log Analysis with grep', 'Users and Groups', 'Disk Usage Cleanup', 'Systemd Services', 'Networking Basics', 'Shell Scripting', 'SSH Keys'],
  Docker: ['Write a Dockerfile', 'Multi-stage Builds', 'Docker Compose Stack', 'Volumes and Persistence', 'Container Networking', 'Shrink an Image', 'Healthchecks', 'Debug a Crashing Container'],
  Kubernetes: ['Deploy a Pod', 'Services and Ingress', 'ConfigMaps and Secrets', 'Rolling Updates', 'Horizontal Autoscaling', 'Debug a CrashLoop'],
};

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

function pickWeighted<T extends string>(r: () => number, entries: [T, number][]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = r() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

const TIER_WEIGHTS: Record<ContentType, [AccessTier, number][]> = {
  problem: [['free', 45], ['starter', 30], ['professional', 18], ['premium', 7]],
  project: [['starter', 30], ['professional', 45], ['premium', 25]],
  lab: [['free', 20], ['starter', 30], ['professional', 35], ['premium', 15]],
};

const COMPLETION: Record<Difficulty, [number, number]> = { easy: [55, 30], medium: [30, 35], hard: [16, 32] };

function seed(now: number): ContentItem[] {
  const r = rng(486);
  const used = new Map<string, number>();
  const cursor = new Map<string, number>();
  const nextTitle = (list: string[], tech: string) => {
    const at = cursor.get(tech) ?? Math.floor(r() * list.length);
    cursor.set(tech, at + 1);
    return list[at % list.length];
  };
  const items: ContentItem[] = [];
  const uniqueTitle = (base: string, tech: string) => {
    const key = `${tech}:${base}`;
    const count = (used.get(key) ?? 0) + 1;
    used.set(key, count);
    return count === 1 ? base : `${base} ${['', '', 'II', 'III', 'IV', 'V'][count] ?? count}`;
  };

  for (let i = 0; i < CATALOG_SIZE; i += 1) {
    const roll = r();
    const type: ContentType = roll < 0.7 ? 'problem' : roll < 0.85 ? 'project' : 'lab';
    let technology: string;
    let base: string;
    if (type === 'problem') {
      technology = pickWeighted(r, [['Python', 26], ['JavaScript', 18], ['Java', 18], ['C++', 12], ['C', 10], ['TypeScript', 6], ['SQL', 10]]);
      const list = technology === 'SQL' ? SQL : ALGO;
      base = nextTitle(list, technology);
    } else if (type === 'project') {
      technology = pickWeighted(r, [['React', 30], ['Next.js', 25], ['NestJS', 20], ['Django', 15], ['TypeScript', 10]]);
      base = nextTitle(PROJECT, technology);
    } else {
      technology = pickWeighted(r, [['Linux', 35], ['Git', 25], ['Docker', 28], ['Kubernetes', 12]]);
      base = nextTitle(LABS[technology], technology);
    }
    const difficulty: Difficulty = type === 'project' ? pickWeighted(r, [['easy', 20], ['medium', 50], ['hard', 30]]) : pickWeighted(r, [['easy', 40], ['medium', 40], ['hard', 20]]);
    const tier = pickWeighted(r, TIER_WEIGHTS[type]);
    const visRoll = r();
    const visibility: Visibility = visRoll < 0.92 ? 'listed' : visRoll < 0.98 ? 'hidden' : 'retired';
    const ageDays = Math.floor(r() * 540) + 3;
    const publishedAt = now - ageDays * DAY - Math.floor(r() * DAY);
    const reach = Math.min(1, ageDays / 200) * (tier === 'free' ? 1.4 : tier === 'starter' ? 1 : tier === 'professional' ? 0.6 : 0.35);
    const learners = Math.max(4, Math.floor(Math.pow(r(), 2.4) * 6200 * reach) + Math.floor(r() * 40));
    const [low, span] = COMPLETION[difficulty];
    const completion = Math.max(4, Math.min(96, Math.round(low + r() * span + (r() < 0.06 ? -25 : 0))));
    const rating = Math.round((3.3 + Math.pow(r(), 0.55) * 1.65) * 10) / 10;
    const ratings = Math.max(0, Math.floor(learners * (0.08 + r() * 0.12)));
    const minutes = type === 'project' ? [120, 180, 240, 360, 480][Math.floor(r() * 5)] : type === 'lab' ? [20, 30, 45, 60][Math.floor(r() * 4)] : [10, 15, 20, 30, 45][Math.floor(r() * 5)];
    const updatedAt = Math.min(now - DAY, publishedAt + Math.floor(r() * ageDays) * DAY);
    const activity: ContentActivity[] = [{ at: publishedAt, text: 'Published from the review pipeline', actor: 'Content team' }];
    if (visibility === 'hidden') activity.push({ at: updatedAt, text: 'Hidden: being reworked after learner reports', actor: 'Lakshmi V' });
    if (visibility === 'retired') activity.push({ at: updatedAt, text: 'Retired: replaced by a newer version', actor: 'Lakshmi V' });
    items.push({
      id: `C-${1001 + i}`,
      title: uniqueTitle(base, technology),
      type,
      technology,
      difficulty,
      tier,
      visibility,
      featured: false,
      minutes,
      learners,
      completion,
      rating,
      ratings,
      openReports: r() < 0.08 ? 1 + Math.floor(r() * 4) : 0,
      publishedAt,
      updatedAt,
      visibilityReason: visibility === 'hidden' ? 'Being reworked after learner reports' : visibility === 'retired' ? 'Replaced by a newer version' : null,
      activity,
    });
  }

  items
    .filter((item) => item.visibility === 'listed')
    .sort((a, b) => b.learners * b.rating - a.learners * a.rating)
    .slice(0, 6)
    .forEach((item) => {
      item.featured = true;
      item.activity.push({ at: now - 10 * DAY, text: 'Featured on the catalog home', actor: 'Lakshmi V' });
    });

  return items.sort((a, b) => b.publishedAt - a.publishedAt);
}

export function loadCatalog(): ContentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ContentItem[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(items: ContentItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  return items;
}

const log = (item: ContentItem, text: string): ContentActivity[] => [...item.activity, { at: Date.now(), text, actor: ME }];

export function useCatalog() {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const itemsRef = useRef<ContentItem[] | null>(null);
  itemsRef.current = items;

  useEffect(() => {
    setItems(loadCatalog());
  }, []);

  const mutate = useCallback((ids: string[], fn: (item: ContentItem) => ContentItem) => {
    const set = new Set(ids);
    setItems((current) => (current ? persist(current.map((item) => (set.has(item.id) ? fn(item) : item))) : current));
  }, []);

  const setTier = useCallback(
    (ids: string[], tier: AccessTier) =>
      mutate(ids, (item) => (item.tier === tier ? item : { ...item, tier, updatedAt: Date.now(), activity: log(item, `Changed access from ${TIER_META[item.tier].label} to ${TIER_META[tier].label}`) })),
    [mutate],
  );

  const setVisibility = useCallback(
    (ids: string[], visibility: Visibility, reason: string | null) =>
      mutate(ids, (item) =>
        item.visibility === visibility
          ? item
          : {
              ...item,
              visibility,
              featured: visibility === 'listed' ? item.featured : false,
              visibilityReason: visibility === 'listed' ? null : reason,
              updatedAt: Date.now(),
              activity: log(item, visibility === 'listed' ? 'Listed in the catalog again' : `${VISIBILITY_META[visibility].label}${reason ? `: ${reason}` : ''}`),
            },
      ),
    [mutate],
  );

  const toggleFeatured = useCallback(
    (id: string): string | null => {
      const current = itemsRef.current ?? [];
      const item = current.find((entry) => entry.id === id);
      if (!item) return 'Item not found';
      if (!item.featured) {
        if (item.visibility !== 'listed') return 'Only listed items can be featured';
        if (current.filter((entry) => entry.featured).length >= MAX_FEATURED) return `The catalog home shows at most ${MAX_FEATURED} featured items — unfeature one first`;
      }
      mutate([id], (entry) => ({ ...entry, featured: !entry.featured, activity: log(entry, entry.featured ? 'Removed from featured' : 'Featured on the catalog home') }));
      return null;
    },
    [mutate],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems(seed(Date.now()));
  }, []);

  return { items: items ?? [], loaded: items !== null, setTier, setVisibility, toggleFeatured, reset };
}

export type CatalogStore = ReturnType<typeof useCatalog>;
