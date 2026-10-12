import type { ChangeKind, ChecklistItem, ReleaseStatus, ReleaseType } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const ME = 'You';
export const OWNERS = ['You', 'Ravi K', 'Meera S', 'Arjun P'];
export const STAGES = [5, 25, 50, 100];
export const STAGE_MS = 10 * 60_000;
export const VERSION_PATTERN = /^\d{4}\.(0?[1-9]|1[0-2])\.\d{1,3}$/;

export const STATUS_META: Record<ReleaseStatus, { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'primary' },
  rolling: { label: 'Rolling out', tone: 'warning' },
  paused: { label: 'Paused', tone: 'danger' },
  live: { label: 'Live', tone: 'success' },
  rolled_back: { label: 'Rolled back', tone: 'neutral' },
};

export const TYPE_META: Record<ReleaseType, string> = {
  feature: 'Feature release',
  fix: 'Bug-fix release',
  hotfix: 'Hotfix',
  runtime: 'Runtime update',
};

export const CHANGE_META: Record<ChangeKind, { label: string; tone: string }> = {
  added: { label: 'Added', tone: 'success' },
  changed: { label: 'Changed', tone: 'primary' },
  fixed: { label: 'Fixed', tone: 'warning' },
};

export const CHECKLIST: Omit<ChecklistItem, 'done'>[] = [
  { id: 'tests', label: 'CI tests and judge regression suite pass' },
  { id: 'staging', label: 'Verified on staging by QA' },
  { id: 'migrations', label: 'Database migrations reviewed and reversible' },
  { id: 'rollback', label: 'Rollback plan written' },
  { id: 'notes', label: 'Release notes ready for institutions' },
];

export function compareVersions(a: string, b: string) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

export function parseChanges(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(added|add|new|fixed|fix|changed|change)\s*[:\-]\s*(.+)$/i);
      if (!match) return { kind: 'changed' as ChangeKind, text: line };
      const word = match[1].toLowerCase();
      const kind: ChangeKind = word.startsWith('fix') ? 'fixed' : word.startsWith('add') || word === 'new' ? 'added' : 'changed';
      return { kind, text: match[2].trim() };
    });
}

export function formatSpan(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

export function formatAgo(t: number, now: number) {
  if (now - t < 60_000) return 'just now';
  return `${formatSpan(now - t)} ago`;
}

export function formatIn(t: number, now: number) {
  if (t - now < 60_000) return 'any moment';
  return `in ${formatSpan(t - now)}`;
}

export function formatDateTime(t: number) {
  const date = new Date(t);
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export function toLocalInput(t: number) {
  const date = new Date(t);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}