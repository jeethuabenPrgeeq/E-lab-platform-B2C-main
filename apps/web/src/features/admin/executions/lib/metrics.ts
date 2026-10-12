import { OUTCOMES, RANGES, percentile } from './shared';
import type { AlertEvent, AlertRule, MinuteBucket, Outcome, Range, RangeBucket } from './types';

const MIN = 60_000;

export function completeMinutes(minutes: MinuteBucket[], now: number) {
  const current = Math.floor(now / MIN) * MIN;
  return minutes.filter((bucket) => bucket.t < current);
}

export function windowOf(minutes: MinuteBucket[], from: number, to: number) {
  return minutes.filter((bucket) => bucket.t >= from && bucket.t < to);
}

const sortedDurations = (buckets: MinuteBucket[]) => buckets.flatMap((bucket) => bucket.durations).sort((a, b) => a - b);

export function rangeSeries(minutes: MinuteBucket[], range: Range, end: number): RangeBucket[] {
  const def = RANGES.find((item) => item.value === range)!;
  const size = def.bucket * MIN;
  const count = def.minutes / def.bucket;
  return Array.from({ length: count }, (_, index) => {
    const t = end - (count - index) * size;
    const slice = windowOf(minutes, t, t + size);
    const durations = sortedDurations(slice);
    const total = slice.reduce((sum, bucket) => sum + bucket.count, 0);
    return { t, count: total, perMinute: total / def.bucket, p50: percentile(durations, 50), p95: percentile(durations, 95) };
  });
}

export interface Summary {
  total: number;
  perMinute: number;
  p50: number;
  p95: number;
  outcomes: Record<Outcome, number>;
  sandboxRate: number;
  languages: { name: string; count: number; failures: number; avgMs: number }[];
}

export function summarize(buckets: MinuteBucket[], minutesSpan: number): Summary {
  const durations = sortedDurations(buckets);
  const outcomes = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0])) as Record<Outcome, number>;
  const langs = new Map<string, { count: number; failures: number; timed: number; durationSum: number }>();
  let total = 0;
  for (const bucket of buckets) {
    total += bucket.count;
    for (const outcome of OUTCOMES) outcomes[outcome] += bucket.outcomes[outcome];
    for (const [name, stat] of Object.entries(bucket.languages)) {
      const acc = langs.get(name) ?? { count: 0, failures: 0, timed: 0, durationSum: 0 };
      acc.count += stat.count;
      acc.failures += stat.failures;
      acc.timed += stat.timed;
      acc.durationSum += stat.durationSum;
      langs.set(name, acc);
    }
  }
  return {
    total,
    perMinute: total / Math.max(1, minutesSpan),
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    outcomes,
    sandboxRate: total ? outcomes.sandbox / total : 0,
    languages: [...langs.entries()]
      .map(([name, stat]) => ({ name, count: stat.count, failures: stat.failures, avgMs: stat.timed ? stat.durationSum / stat.timed : 0 }))
      .sort((a, b) => b.count - a.count),
  };
}

const sum = (window: MinuteBucket[], pick: (bucket: MinuteBucket) => number) => window.reduce((acc, bucket) => acc + pick(bucket), 0);
const total = (window: MinuteBucket[]) => sum(window, (bucket) => bucket.count);

export const ALERT_RULES: AlertRule[] = [
  {
    id: 'sandbox-errors',
    name: 'Sandbox errors',
    description: 'Containers failing to start or crashing outside learner code',
    severity: 'critical',
    threshold: 5,
    condition: '> 5 errors in 5 min',
    format: (value) => `${Math.round(value)} errors`,
    windowMin: 5,
    compare: 'above',
    evaluate: (window) => sum(window, (bucket) => bucket.outcomes.sandbox),
  },
  {
    id: 'p95-latency',
    name: 'Slow executions',
    description: 'p95 run time of completed executions (excludes TLE, compile and sandbox errors)',
    severity: 'warning',
    threshold: 1200,
    condition: 'p95 > 1,200 ms over 5 min',
    format: (value) => `${Math.round(value).toLocaleString('en-IN')} ms`,
    windowMin: 5,
    compare: 'above',
    evaluate: (window) => percentile(sortedDurations(window), 95),
  },
  {
    id: 'tle-rate',
    name: 'Time-limit spike',
    description: 'Share of executions killed for exceeding the time limit',
    severity: 'warning',
    threshold: 15,
    condition: 'TLE share > 15% over 5 min',
    format: (value) => `${value.toFixed(1)}%`,
    windowMin: 5,
    compare: 'above',
    evaluate: (window) => (total(window) ? (sum(window, (bucket) => bucket.outcomes.tle) / total(window)) * 100 : 0),
  },
  {
    id: 're-rate',
    name: 'Runtime error rate',
    description: 'Share of executions ending in a runtime error',
    severity: 'warning',
    threshold: 14,
    condition: 'RE share > 14% over 10 min',
    format: (value) => `${value.toFixed(1)}%`,
    windowMin: 10,
    compare: 'above',
    evaluate: (window) => (total(window) ? (sum(window, (bucket) => bucket.outcomes.re) / total(window)) * 100 : 0),
  },
  {
    id: 'low-volume',
    name: 'Execution volume drop',
    description: 'Executions per minute fell sharply — check the gateway and queue',
    severity: 'critical',
    threshold: 5,
    condition: '< 5 per min over 5 min',
    format: (value) => `${value.toFixed(1)} / min`,
    windowMin: 5,
    compare: 'below',
    evaluate: (window) => total(window) / Math.max(1, window.length),
  },
];

export const breaches = (rule: AlertRule, value: number) => (rule.compare === 'above' ? value > rule.threshold : value < rule.threshold);

const GAP_MERGE = 3;

export function alertHistory(minutes: MinuteBucket[], end: number, hours = 24): { events: AlertEvent[]; current: Record<string, number> } {
  const events: AlertEvent[] = [];
  const current: Record<string, number> = {};
  const start = end - hours * 60 * MIN;
  const byTime = new Map(minutes.map((bucket) => [bucket.t, bucket]));
  for (const rule of ALERT_RULES) {
    let open: AlertEvent | null = null;
    let quiet = 0;
    for (let t = start; t < end; t += MIN) {
      const window: MinuteBucket[] = [];
      for (let k = rule.windowMin - 1; k >= 0; k -= 1) {
        const bucket = byTime.get(t - k * MIN);
        if (bucket) window.push(bucket);
      }
      const value = rule.evaluate(window);
      if (t === end - MIN) current[rule.id] = value;
      if (breaches(rule, value)) {
        quiet = 0;
        if (!open) open = { id: `${rule.id}-${t}`, ruleId: rule.id, startedAt: t, resolvedAt: null, peak: value };
        else open.peak = rule.compare === 'above' ? Math.max(open.peak, value) : Math.min(open.peak, value);
      } else if (open) {
        quiet += 1;
        if (quiet > GAP_MERGE) {
          events.push({ ...open, resolvedAt: t - (quiet - 1) * MIN });
          open = null;
          quiet = 0;
        }
      }
    }
    if (open) events.push(quiet > 0 ? { ...open, resolvedAt: end - quiet * MIN } : open);
  }
  return { events: events.sort((a, b) => b.startedAt - a.startedAt), current };
}