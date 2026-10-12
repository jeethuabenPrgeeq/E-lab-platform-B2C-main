import type { Difficulty, ProblemAction, ProblemStatus } from './types';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const STATUS_LABEL: Record<ProblemStatus, string> = {
  draft: 'Draft',
  review: 'Technical Review',
  ready: 'Ready',
  published: 'Published',
  deprecated: 'Deprecated',
};

export const ACTION_LABEL: Record<ProblemAction, string> = {
  submit: 'Submit for review',
  approve: 'Approve',
  sendBack: 'Send back',
  publish: 'Publish',
  moveBack: 'Move back',
  unpublish: 'Unpublish',
  deprecate: 'Deprecate',
};

export const NOTE_ACTIONS: ProblemAction[] = ['sendBack', 'deprecate'];

export const STAGE_ACTIONS: Record<ProblemStatus, ProblemAction[]> = {
  draft: ['submit'],
  review: ['approve', 'sendBack'],
  ready: ['publish', 'moveBack'],
  published: ['unpublish', 'deprecate'],
  deprecated: [],
};

export const ACTION_TARGET: Record<ProblemAction, ProblemStatus> = {
  submit: 'review',
  approve: 'ready',
  sendBack: 'draft',
  publish: 'published',
  moveBack: 'review',
  unpublish: 'ready',
  deprecate: 'deprecated',
};

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}