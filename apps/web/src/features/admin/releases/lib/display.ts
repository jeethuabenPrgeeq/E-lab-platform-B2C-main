import { STAGES, STATUS_META, formatAgo, formatIn } from './shared';
import type { Release } from './types';

export function displayStatus(release: Release, currentId: string | null) {
  if (release.status === 'live' && release.id !== currentId) return { label: 'Superseded', tone: 'neutral' };
  return STATUS_META[release.status];
}

export function rolloutPercent(release: Release) {
  if (release.status === 'draft' || release.status === 'scheduled') return 0;
  return STAGES[release.stage];
}

export function whenText(release: Release, now: number) {
  if (release.status === 'scheduled' && release.scheduledAt) return `Starts ${formatIn(release.scheduledAt, now)}`;
  if (release.status === 'draft') return 'Not scheduled';
  if ((release.status === 'rolling' || release.status === 'paused') && release.startedAt) return `Started ${formatAgo(release.startedAt, now)}`;
  if (release.status === 'live' && release.completedAt) return `Shipped ${formatAgo(release.completedAt, now)}`;
  if (release.status === 'rolled_back' && release.completedAt) return `Rolled back ${formatAgo(release.completedAt, now)}`;
  return '—';
}