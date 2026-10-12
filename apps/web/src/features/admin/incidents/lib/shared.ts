import type { ComponentHealth, ComponentId, Incident, IncidentStatus, Severity } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const ME = 'You';
export const RESPONDERS = ['You', 'Ravi K', 'Meera S', 'Arjun P'];

export const SEVERITY_META: Record<Severity, { label: string; tone: string; rank: number; description: string; health: ComponentHealth }> = {
  sev1: { label: 'SEV1', tone: 'danger', rank: 0, description: 'Platform down or graded assessments blocked for many institutions', health: 'major' },
  sev2: { label: 'SEV2', tone: 'warning', rank: 1, description: 'A core feature is broken or badly degraded for some users', health: 'partial' },
  sev3: { label: 'SEV3', tone: 'primary', rank: 2, description: 'Minor degradation with a workaround available', health: 'degraded' },
};

export const STATUS_FLOW: IncidentStatus[] = ['investigating', 'identified', 'monitoring', 'resolved'];

export const STATUS_META: Record<IncidentStatus, { label: string; tone: string; hint: string }> = {
  investigating: { label: 'Investigating', tone: 'danger', hint: 'Looking for the cause' },
  identified: { label: 'Identified', tone: 'warning', hint: 'Cause found, fix in progress' },
  monitoring: { label: 'Monitoring', tone: 'primary', hint: 'Fix deployed, watching' },
  resolved: { label: 'Resolved', tone: 'success', hint: 'Back to normal' },
};

export const COMPONENTS: { id: ComponentId; label: string }[] = [
  { id: 'judge', label: 'Judge workers' },
  { id: 'sandbox', label: 'Sandbox runtime' },
  { id: 'editor', label: 'Code editor' },
  { id: 'auth', label: 'Login & SSO' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'api', label: 'Public API' },
  { id: 'database', label: 'Database' },
];

export const HEALTH_META: Record<ComponentHealth, { label: string; tone: string; rank: number }> = {
  operational: { label: 'Operational', tone: 'success', rank: 3 },
  degraded: { label: 'Degraded', tone: 'primary', rank: 2 },
  partial: { label: 'Partial outage', tone: 'warning', rank: 1 },
  major: { label: 'Major outage', tone: 'danger', rank: 0 },
};

export function componentHealth(incidents: Incident[]) {
  const map = Object.fromEntries(COMPONENTS.map((item) => [item.id, 'operational'])) as Record<ComponentId, ComponentHealth>;
  for (const incident of incidents) {
    if (incident.status === 'resolved') continue;
    const health: ComponentHealth = incident.status === 'monitoring' ? 'degraded' : SEVERITY_META[incident.severity].health;
    for (const id of incident.components) if (HEALTH_META[health].rank < HEALTH_META[map[id]].rank) map[id] = health;
  }
  return map;
}

export function formatSpan(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  return hours % 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${Math.floor(hours / 24)}d`;
}

export function formatAgo(t: number, now: number) {
  const minutes = Math.max(0, Math.round((now - t) / 60000));
  if (minutes < 1) return 'just now';
  return `${formatSpan(now - t)} ago`;
}

export function formatDateTime(t: number) {
  const date = new Date(t);
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}