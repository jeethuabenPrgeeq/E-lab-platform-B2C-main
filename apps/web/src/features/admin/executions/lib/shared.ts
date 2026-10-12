import type { Outcome, Range } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const OUTCOMES: Outcome[] = ['ok', 'wrong', 'tle', 'mle', 're', 'ce', 'sandbox'];

export const OUTCOME_META: Record<Outcome, { label: string; short: string; tone: string }> = {
  ok: { label: 'Accepted', short: 'OK', tone: 'success' },
  wrong: { label: 'Wrong answer', short: 'WA', tone: 'neutral' },
  tle: { label: 'Time limit exceeded', short: 'TLE', tone: 'warning' },
  mle: { label: 'Memory limit exceeded', short: 'MLE', tone: 'warning' },
  re: { label: 'Runtime error', short: 'RE', tone: 'danger' },
  ce: { label: 'Compile error', short: 'CE', tone: 'neutral' },
  sandbox: { label: 'Sandbox error', short: 'SBX', tone: 'danger' },
};

export const LEARNER_FAILURES: Outcome[] = ['tle', 'mle', 're'];

export const RANGES: { value: Range; label: string; minutes: number; bucket: number }[] = [
  { value: '15m', label: '15 min', minutes: 15, bucket: 1 },
  { value: '1h', label: '1 hour', minutes: 60, bucket: 2 },
  { value: '6h', label: '6 hours', minutes: 360, bucket: 10 },
  { value: '24h', label: '24 hours', minutes: 1440, bucket: 30 },
];

export function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 2)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatNumber(value: number) {
  return value.toLocaleString('en-IN');
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatClock(t: number, withSeconds = false) {
  return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: withSeconds ? '2-digit' : undefined });
}

export function formatAgo(t: number, now: number) {
  const seconds = Math.max(0, Math.round((now - t) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

export function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}