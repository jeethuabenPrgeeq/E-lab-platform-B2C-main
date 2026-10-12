import type { AuditCategory, AuditEvent, AuditSeverity } from './types';

export { cx, formatAgo } from '../../users/lib/shared';

export const CATEGORY_META: Record<AuditCategory, { label: string }> = {
  auth: { label: 'Sign-in & security' },
  users: { label: 'Users' },
  access: { label: 'Admins & roles' },
  content: { label: 'Content' },
  billing: { label: 'Billing' },
  settings: { label: 'Settings' },
  support: { label: 'Support' },
  notifications: { label: 'Notifications' },
  reports: { label: 'Reports' },
  platform: { label: 'Platform & judge' },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as AuditCategory[];

export const SEVERITY_META: Record<AuditSeverity, { label: string; tone: string; rank: number }> = {
  info: { label: 'Info', tone: 'neutral', rank: 0 },
  notice: { label: 'Notice', tone: 'warning', rank: 1 },
  critical: { label: 'Critical', tone: 'danger', rank: 2 },
};

export const RANGE_META = {
  '24h': { label: 'Last 24 hours', ms: 86_400_000 },
  '7d': { label: '7 days', ms: 7 * 86_400_000 },
  '30d': { label: '30 days', ms: 30 * 86_400_000 },
  '90d': { label: '90 days', ms: 90 * 86_400_000 },
} as const;

export type Range = keyof typeof RANGE_META;

export function formatDateTime(t: number) {
  return new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

export function formatDay(t: number) {
  return new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatTime(t: number) {
  return new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

const pad = (value: number) => String(value).padStart(2, '0');

function localStamp(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function toCsv(events: AuditEvent[]) {
  const head = ['event_id', 'time', 'actor', 'actor_email', 'actor_role', 'action', 'summary', 'category', 'severity', 'outcome', 'target_type', 'target_id', 'target', 'ip', 'location', 'changes', 'reason'];
  const rows = events.map((event) =>
    [
      event.id,
      localStamp(event.at),
      event.actor.name,
      event.actor.email,
      event.actor.role,
      event.action,
      event.summary,
      CATEGORY_META[event.category].label,
      SEVERITY_META[event.severity].label,
      event.outcome,
      event.target.type,
      event.target.id,
      event.target.label,
      event.ip,
      event.location,
      (event.changes ?? []).map((change) => `${change.field}: ${change.before} -> ${change.after}`).join('; '),
      event.reason ?? '',
    ]
      .map(csvCell)
      .join(','),
  );
  return [head.join(','), ...rows].join('\n');
}
