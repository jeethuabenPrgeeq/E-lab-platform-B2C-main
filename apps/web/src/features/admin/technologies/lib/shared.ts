import type { Category, TechStatus } from './types';

export const CATEGORY_LABEL: Record<Category, string> = {
  language: 'Language',
  framework: 'Framework',
  database: 'Database',
  devops: 'DevOps',
  tool: 'Tool',
};

export const STATUS_LABEL: Record<TechStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  disabled: 'Disabled',
};

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/\+/g, 'p')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function initials(name: string) {
  const clean = name.replace(/[^A-Za-z0-9+#]/g, '');
  return clean.slice(0, 2).toUpperCase() || '?';
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}