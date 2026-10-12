import type { Priority, ProblemReport, ReportCategory, ReportStatus, ResolutionType } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const ME = 'You';

export const STATUS_META: Record<ReportStatus, { label: string; tone: string }> = {
  open: { label: 'Open', tone: 'danger' },
  in_review: { label: 'In review', tone: 'primary' },
  resolved: { label: 'Resolved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'neutral' },
};

export const CATEGORY_META: Record<ReportCategory, { label: string; technical: boolean }> = {
  wrong_testcase: { label: 'Wrong test case', technical: true },
  wrong_output: { label: 'Expected output wrong', technical: true },
  unclear_statement: { label: 'Unclear statement', technical: false },
  compiler: { label: 'Language / compiler', technical: true },
  typo: { label: 'Typo or formatting', technical: false },
  other: { label: 'Other', technical: false },
};

export const PRIORITY_META: Record<Priority, { label: string; tone: string; rank: number }> = {
  high: { label: 'High', tone: 'danger', rank: 0 },
  medium: { label: 'Medium', tone: 'warning', rank: 1 },
  low: { label: 'Low', tone: 'neutral', rank: 2 },
};

export const RESOLUTION_META: Record<ResolutionType, { label: string; for: 'resolve' | 'reject' }> = {
  fixed_testcase: { label: 'Fixed the test case', for: 'resolve' },
  updated_statement: { label: 'Updated the problem statement', for: 'resolve' },
  fixed_runtime: { label: 'Fixed the language runtime', for: 'resolve' },
  not_a_bug: { label: 'Works as intended', for: 'reject' },
  duplicate: { label: 'Duplicate of another report', for: 'reject' },
};

export function priorityOf(report: ProblemReport): Priority {
  const count = report.reports.length;
  if (count >= 5 || (CATEGORY_META[report.category].technical && count >= 3)) return 'high';
  if (count >= 2 || CATEGORY_META[report.category].technical) return 'medium';
  return 'low';
}

export function formatAgo(t: number, now: number) {
  const minutes = Math.max(0, Math.round((now - t) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatDateTime(t: number) {
  const date = new Date(t);
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDuration(ms: number) {
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60000))} min`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}