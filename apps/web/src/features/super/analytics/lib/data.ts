import { TARGET_MRR } from '../../subscriptions/lib/shared';

export type Range = '30d' | '90d' | '12m';

const DAY = 86_400_000;

export const RANGE_META: Record<Range, { label: string; days: number; bucket: 'day' | 'week' | 'month'; previous: string }> = {
  '30d': { label: 'Last 30 days', days: 30, bucket: 'day', previous: 'previous 30 days' },
  '90d': { label: 'Last 90 days', days: 90, bucket: 'week', previous: 'previous 90 days' },
  '12m': { label: 'Last 12 months', days: 365, bucket: 'month', previous: 'previous 12 months' },
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

export interface DailyPoint {
  t: number;
  signups: number;
  paid: number;
  trials: number;
  active: number;
  firstSolve: number;
}

export function startOfDay(t: number) {
  const date = new Date(t);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function buildDaily(now: number): DailyPoint[] {
  const r = rng(9870);
  const today = startOfDay(now);
  const days = 730;
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const t = today - i * DAY;
    const age = (days - i) / days;
    const weekday = new Date(t).getDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.72 : 1;
    const month = new Date(t).getMonth();
    const season = month >= 5 && month <= 7 ? 0.82 : month === 0 || month === 6 ? 1.15 : 1;
    const signups = Math.max(5, Math.round((10 + 58 * Math.pow(age, 1.3)) * weekend * season * (0.8 + r() * 0.4)));
    const firstSolve = Math.round(signups * (0.62 + r() * 0.1));
    const trials = Math.round(signups * (0.28 + r() * 0.07));
    const paid = Math.round(signups * (0.115 + r() * 0.035) + (r() < 0.05 ? 4 : 0));
    const active = Math.round((900 + 2600 * Math.pow(age, 1.2)) * (weekend === 1 ? 1 : 0.78) * (0.92 + r() * 0.16));
    points.push({ t, signups, paid, trials, active, firstSolve });
  }
  return points;
}

export interface Bucket {
  t: number;
  signups: number;
  paid: number;
}

export function bucketize(points: DailyPoint[], range: Range): Bucket[] {
  const { days, bucket } = RANGE_META[range];
  const slice = points.slice(-days);
  if (bucket === 'day') return slice.map((point) => ({ t: point.t, signups: point.signups, paid: point.paid }));
  const map = new Map<number, Bucket>();
  for (const point of slice) {
    const date = new Date(point.t);
    if (bucket === 'week') date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    else date.setDate(1);
    date.setHours(0, 0, 0, 0);
    const key = date.getTime();
    const entry = map.get(key) ?? { t: key, signups: 0, paid: 0 };
    entry.signups += point.signups;
    entry.paid += point.paid;
    map.set(key, entry);
  }
  return [...map.values()];
}

export interface Summary {
  signups: number;
  paid: number;
  trials: number;
  firstSolve: number;
  avgDaily: number;
  visitors: number;
}

export function summarize(points: DailyPoint[], days: number, offset = 0): Summary {
  const slice = points.slice(points.length - days - offset, points.length - offset);
  const total = (key: keyof Omit<DailyPoint, 't'>) => slice.reduce((sum, point) => sum + point[key], 0);
  const signups = total('signups');
  return {
    signups,
    paid: total('paid'),
    trials: total('trials'),
    firstSolve: total('firstSolve'),
    avgDaily: slice.length ? Math.round(total('active') / slice.length) : 0,
    visitors: Math.round(signups * 4.3),
  };
}

export const MAU = 9870;

export function monthlyActive(points: DailyPoint[], offsetDays = 0) {
  const ratio = MAU / summarize(points, 30).avgDaily;
  return Math.round(summarize(points, 30, offsetDays).avgDaily * ratio);
}

export interface MrrPoint {
  t: number;
  mrr: number;
}

export function buildMrr(now: number, liveMrr: number | null): MrrPoint[] {
  const r = rng(842);
  const end = liveMrr ?? TARGET_MRR;
  const points: MrrPoint[] = [];
  const first = new Date(now);
  first.setDate(1);
  first.setHours(0, 0, 0, 0);
  let value = end;
  const values: number[] = [end];
  for (let i = 1; i < 12; i += 1) {
    value = value / (1.028 + r() * 0.03);
    values.push(Math.round(value / 100) * 100);
  }
  values.reverse();
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(first);
    date.setMonth(first.getMonth() - (11 - i));
    points.push({ t: date.getTime(), mrr: values[i] });
  }
  return points;
}

export interface Cohort {
  label: string;
  size: number;
  retention: (number | null)[];
}

export function buildCohorts(now: number): Cohort[] {
  const r = rng(62);
  const base = [100, 61, 47, 40, 36, 33];
  const cohorts: Cohort[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(1);
    date.setMonth(date.getMonth() - i);
    const label = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const lift = (5 - i) * 0.8;
    const retention = base.map((value, month) => (month > i ? null : month === 0 ? 100 : Math.max(10, Math.round(value + lift + (r() - 0.5) * 6))));
    cohorts.push({ label, size: Math.round(1100 + (5 - i) * 120 + r() * 160), retention });
  }
  return cohorts;
}

export function pctChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
