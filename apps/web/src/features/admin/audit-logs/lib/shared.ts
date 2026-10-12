import type { AuditCategory, AuditEvent } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const CATEGORY_META: Record<AuditCategory, { label: string; tone: string }> = {
  content: { label: 'Content', tone: 'primary' },
  runtime: { label: 'Runtime', tone: 'neutral' },
  judge: { label: 'Judge', tone: 'warning' },
  monitoring: { label: 'Monitoring', tone: 'primary' },
  support: { label: 'Support', tone: 'success' },
  release: { label: 'Release', tone: 'warning' },
  auth: { label: 'Sign-in', tone: 'danger' },
};

export const RANGES = [
  { value: '24h', label: '24 hours', ms: 86_400_000 },
  { value: '7d', label: '7 days', ms: 7 * 86_400_000 },
  { value: '30d', label: '30 days', ms: 30 * 86_400_000 },
] as const;

export type RangeValue = (typeof RANGES)[number]['value'];

export function formatAgo(t: number, now: number) {
  const minutes = Math.max(0, Math.round((now - t) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatDateTime(t: number, seconds = false) {
  const date = new Date(t);
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined })}`;
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(events: AuditEvent[]) {
  const head = ['id', 'time', 'actor', 'role', 'category', 'action', 'summary', 'target', 'result', 'error', 'ip', 'request_id'];
  const rows = events.map((event) =>
    [
      event.id,
      new Date(event.at).toISOString(),
      event.actor.name,
      event.actor.role,
      event.category,
      event.action,
      event.summary,
      `${event.target.type}:${event.target.id}`,
      event.result,
      event.error ?? '',
      event.ip,
      event.requestId,
    ]
      .map(csvCell)
      .join(','),
  );
  return [head.join(','), ...rows].join('\n');
}