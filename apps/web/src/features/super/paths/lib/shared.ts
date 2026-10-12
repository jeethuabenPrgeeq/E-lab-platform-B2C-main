import { TIER_META, tierRank } from '../../content/lib/shared';
import type { ContentItem } from '../../content/lib/types';
import type { PathDraft, PathLevel, PathStatus } from './types';

export { ME, TIERS, TIER_META, cx, formatAgo, formatCount, formatDate, formatMinutes } from '../../content/lib/shared';

export const MIN_STEPS = 3;
export const MAX_STEPS = 30;

export const LEVEL_META: Record<PathLevel, { label: string; tone: string }> = {
  beginner: { label: 'Beginner', tone: 'success' },
  intermediate: { label: 'Intermediate', tone: 'warning' },
  advanced: { label: 'Advanced', tone: 'danger' },
};

export const STATUS_META: Record<PathStatus, { label: string; tone: string }> = {
  published: { label: 'Published', tone: 'success' },
  draft: { label: 'Draft', tone: 'primary' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export function pathMinutes(steps: string[], catalog: Map<string, ContentItem>) {
  return steps.reduce((sum, id) => sum + (catalog.get(id)?.minutes ?? 0), 0);
}

export function publishIssues(draft: PathDraft, catalog: Map<string, ContentItem>): string[] {
  const issues: string[] = [];
  if (draft.title.trim().length < 3) issues.push('Give the path a title');
  if (draft.summary.trim().length < 10) issues.push('Write a summary of at least 10 characters');
  if (draft.steps.length < MIN_STEPS) issues.push(`Add at least ${MIN_STEPS} steps`);
  for (const id of draft.steps) {
    const item = catalog.get(id);
    if (!item) {
      issues.push(`Step ${id} no longer exists`);
      continue;
    }
    if (item.visibility === 'retired') issues.push(`“${item.title}” is retired — replace it`);
    if (tierRank(item.tier) > tierRank(draft.tier)) issues.push(`“${item.title}” needs ${TIER_META[item.tier].label}, but the path is ${TIER_META[draft.tier].label}`);
  }
  return issues;
}
