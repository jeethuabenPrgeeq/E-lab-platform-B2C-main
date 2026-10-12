import type { AccessTier, ContentItem, ContentType, Difficulty, Visibility } from './types';

export { ME, cx, formatAgo, formatDate } from '../../users/lib/shared';

export const MAX_FEATURED = 8;

export const TYPE_META: Record<ContentType, { label: string; plural: string }> = {
  problem: { label: 'Problem', plural: 'Problems' },
  project: { label: 'Project', plural: 'Projects' },
  lab: { label: 'Lab', plural: 'Labs' },
};

export const DIFFICULTY_META: Record<Difficulty, { label: string; tone: string }> = {
  easy: { label: 'Easy', tone: 'success' },
  medium: { label: 'Medium', tone: 'warning' },
  hard: { label: 'Hard', tone: 'danger' },
};

export const TIERS: AccessTier[] = ['free', 'starter', 'professional', 'premium'];

export const TIER_META: Record<AccessTier, { label: string; tone: string; hint: string }> = {
  free: { label: 'Free', tone: 'neutral', hint: 'Everyone, including free accounts' },
  starter: { label: 'Starter', tone: 'primary', hint: 'Starter plan and above' },
  professional: { label: 'Professional', tone: 'primary', hint: 'Professional plan and above' },
  premium: { label: 'Premium', tone: 'success', hint: 'Premium and Enterprise only' },
};

export const tierRank = (tier: AccessTier) => TIERS.indexOf(tier);

export const VISIBILITY_META: Record<Visibility, { label: string; tone: string; hint: string }> = {
  listed: { label: 'Listed', tone: 'success', hint: 'Shown in the catalog and search' },
  hidden: { label: 'Hidden', tone: 'warning', hint: 'Only reachable through learning paths and direct links' },
  retired: { label: 'Retired', tone: 'neutral', hint: 'Removed for new learners; past submissions are kept' },
};

export const TECHNOLOGIES = ['C', 'C++', 'Java', 'Python', 'JavaScript', 'TypeScript', 'SQL', 'React', 'Next.js', 'NestJS', 'Django', 'Git', 'Linux', 'Docker', 'Kubernetes'];

export const needsAttention = (item: ContentItem) => item.visibility === 'listed' && item.learners >= 50 && ((item.ratings > 0 && item.rating < 3.6) || item.completion < 20);

export function formatCount(value: number) {
  if (value >= 100000) return `${(value / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return value.toLocaleString('en-IN');
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}
