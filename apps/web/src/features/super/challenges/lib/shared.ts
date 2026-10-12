import type { ContentItem } from '../../content/lib/types';
import type { Challenge, ChallengeAccess, ChallengeInput, ChallengeKind, ChallengeStatus } from './types';

export { DIFFICULTY_META, ME, cx, formatAgo, formatCount } from '../../content/lib/shared';

export const MAX_PROBLEMS = 10;
export const MIN_LEAD_MINUTES = 15;

export const KIND_META: Record<ChallengeKind, { label: string; needsSponsor: boolean }> = {
  weekly: { label: 'Weekly contest', needsSponsor: false },
  monthly: { label: 'Long challenge', needsSponsor: false },
  hiring: { label: 'Hiring challenge', needsSponsor: true },
  sponsored: { label: 'Sponsored', needsSponsor: true },
};

export const STATUS_META: Record<ChallengeStatus, { label: string; tone: string }> = {
  live: { label: 'Live', tone: 'danger' },
  scheduled: { label: 'Scheduled', tone: 'primary' },
  draft: { label: 'Draft', tone: 'neutral' },
  ended: { label: 'Ended', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const ACCESS_META: Record<ChallengeAccess, string> = {
  everyone: 'Everyone',
  paid: 'Paid plans only',
};

export const DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '90 minutes' },
  { minutes: 120, label: '2 hours' },
  { minutes: 180, label: '3 hours' },
  { minutes: 1440, label: '1 day' },
  { minutes: 10080, label: '7 days' },
  { minutes: 20160, label: '14 days' },
];

export function statusOf(challenge: Challenge, now: number): ChallengeStatus {
  if (challenge.cancelled) return 'cancelled';
  if (!challenge.published) return 'draft';
  if (now < challenge.startAt) return 'scheduled';
  if (now < challenge.endAt) return 'live';
  return 'ended';
}

export function formatRupees(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.round(minutes / 1440);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function formatRelative(target: number, now: number) {
  const diff = target - now;
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);
  let text: string;
  if (minutes < 60) text = `${Math.max(1, minutes)} min`;
  else if (minutes < 1440) text = `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim();
  else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    text = hours && days < 3 ? `${days} d ${hours} h` : `${days} day${days === 1 ? '' : 's'}`;
  }
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

export function formatWhen(t: number) {
  return new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function toLocalInput(t: number) {
  const date = new Date(t);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function scheduleIssues(input: Pick<ChallengeInput, 'title' | 'kind' | 'sponsor' | 'startAt' | 'problems'>, catalog: Map<string, ContentItem>, now: number): string[] {
  const issues: string[] = [];
  if (input.title.trim().length < 4) issues.push('Give the challenge a title of at least 4 characters');
  if (KIND_META[input.kind].needsSponsor && !input.sponsor?.trim()) issues.push(`${KIND_META[input.kind].label}s need a sponsor name`);
  if (!Number.isFinite(input.startAt)) issues.push('Pick a start date and time');
  else if (input.startAt < now + MIN_LEAD_MINUTES * 60000) issues.push(`The start time must be at least ${MIN_LEAD_MINUTES} minutes from now`);
  if (input.problems.length === 0) issues.push('Add at least one problem');
  for (const id of input.problems) {
    const item = catalog.get(id);
    if (!item) issues.push(`Problem ${id} no longer exists`);
    else if (item.visibility === 'retired') issues.push(`“${item.title}” is retired — replace it`);
  }
  return issues;
}
