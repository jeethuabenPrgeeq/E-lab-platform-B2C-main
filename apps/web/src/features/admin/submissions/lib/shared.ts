import type { Difficulty, DisplayVerdict, SubRange, Verdict } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const VERDICTS: Verdict[] = ['ac', 'wa', 'tle', 'mle', 're', 'ce'];

export const VERDICT_META: Record<DisplayVerdict, { label: string; short: string; tone: string }> = {
  ac: { label: 'Accepted', short: 'AC', tone: 'success' },
  wa: { label: 'Wrong answer', short: 'WA', tone: 'danger' },
  tle: { label: 'Time limit exceeded', short: 'TLE', tone: 'warning' },
  mle: { label: 'Memory limit exceeded', short: 'MLE', tone: 'warning' },
  re: { label: 'Runtime error', short: 'RE', tone: 'danger' },
  ce: { label: 'Compile error', short: 'CE', tone: 'neutral' },
  judging: { label: 'Judging', short: '…', tone: 'primary' },
};

export const DIFFICULTY_META: Record<Difficulty, { label: string; tone: string }> = {
  easy: { label: 'Easy', tone: 'success' },
  medium: { label: 'Medium', tone: 'warning' },
  hard: { label: 'Hard', tone: 'danger' },
};

export const SUB_RANGES: { value: SubRange; label: string; hours: number; bucketHours: number }[] = [
  { value: '24h', label: '24 hours', hours: 24, bucketHours: 1 },
  { value: '7d', label: '7 days', hours: 168, bucketHours: 6 },
  { value: '30d', label: '30 days', hours: 720, bucketHours: 24 },
];

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const JUDGING_MS = 6000;

export function formatNumber(value: number) {
  return value.toLocaleString('en-IN');
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatClock(t: number) {
  return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(t: number) {
  return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatDateTime(t: number) {
  return `${formatDay(t)}, ${formatClock(t)}`;
}

export function formatAgo(t: number, now: number) {
  const seconds = Math.max(0, Math.round((now - t) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}