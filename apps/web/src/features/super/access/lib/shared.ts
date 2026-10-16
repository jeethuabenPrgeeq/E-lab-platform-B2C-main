import { INSTITUTIONS } from '../../users/lib/shared';
import type { AdminAccount, AdminRole, AdminStatus, PermissionKey } from './types';

export { EMAIL_PATTERN, ME, cx, formatAgo, formatDate, initials } from '../../users/lib/shared';

export const SUPER_ROLE = 'super_admin';
export const ALL_SCOPE = 'All institutions';
export const SCOPES = [ALL_SCOPE, ...INSTITUTIONS.filter((name) => name !== 'Independent')];

export const PERMISSION_GROUPS: { id: string; label: string; items: { key: PermissionKey; label: string; sensitive?: boolean }[] }[] = [
  {
    id: 'people',
    label: 'People & access',
    items: [
      { key: 'users.view', label: 'View users' },
      { key: 'users.manage', label: 'Invite and edit users' },
      { key: 'users.suspend', label: 'Suspend and reactivate users' },
      { key: 'admins.manage', label: 'Manage admins and roles', sensitive: true },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { key: 'content.view', label: 'View catalog' },
      { key: 'content.edit', label: 'Create and edit content' },
      { key: 'content.publish', label: 'Publish and retire content' },
      { key: 'content.review.approve', label: 'Review and approve other managers’ content' },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    items: [
      { key: 'billing.view', label: 'View billing and subscriptions' },
      { key: 'billing.refund', label: 'Issue refunds', sensitive: true },
      { key: 'billing.plans', label: 'Manage plans and pricing', sensitive: true },
      { key: 'coupons.manage', label: 'Manage coupons' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      { key: 'analytics.view', label: 'View analytics' },
      { key: 'reports.export', label: 'Export reports' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { key: 'support.respond', label: 'Respond to support tickets' },
      { key: 'notifications.send', label: 'Send notifications' },
    ],
  },
  {
    id: 'authoring',
    label: 'Content authoring (Platform admin and Content manager only)',
    items: [
      { key: 'content.upload', label: 'Upload content (CSV and AI)' },
      { key: 'problems.manage', label: 'Create and edit problems and technologies' },
      { key: 'tests.manage', label: 'Manage sample tests and source checks' },
      { key: 'tests.hidden', label: 'View and edit hidden tests', sensitive: true },
    ],
  },
  {
    id: 'technical',
    label: 'Technical operations',
    items: [
      { key: 'content.validate', label: 'Validate problems and move them through review' },
      { key: 'runtimes.manage', label: 'Manage runtimes and Docker images' },
      { key: 'judge.manage', label: 'Manage the judge, rejudges and plagiarism decisions' },
      { key: 'monitoring.view', label: 'View executions and submissions' },
      { key: 'support.technical', label: 'Handle technical tickets and problem reports' },
      { key: 'incidents.manage', label: 'Manage incidents' },
      { key: 'releases.manage', label: 'Manage releases' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { key: 'settings.manage', label: 'Change platform settings', sensitive: true },
      { key: 'audit.view', label: 'View audit logs' },
    ],
  },
];

export const AUTHORING_PERMISSIONS: readonly PermissionKey[] = ['content.upload', 'problems.manage', 'tests.manage', 'tests.hidden'];

export const AUTHORING_ROLE_IDS: readonly string[] = ['platform_admin', 'content_manager'];

export const canHoldPermission = (roleId: string, key: PermissionKey) => AUTHORING_ROLE_IDS.includes(roleId) || !AUTHORING_PERMISSIONS.includes(key);

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key));

export const PERMISSION_LABEL = Object.fromEntries(PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => [item.key, item.label]))) as Record<PermissionKey, string>;

export const STATUS_META: Record<AdminStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'primary' },
  revoked: { label: 'Revoked', tone: 'neutral' },
};

export const ROLE_TONES: Record<string, string> = {
  super_admin: 'danger',
  platform_admin: 'primary',
  content_manager: 'success',
  billing_manager: 'warning',
};

export const roleTone = (roleId: string) => ROLE_TONES[roleId] ?? 'neutral';

export const isActiveSuper = (admin: AdminAccount) => admin.roleId === SUPER_ROLE && admin.status === 'active';

export const roleName = (roles: AdminRole[], id: string) => roles.find((role) => role.id === id)?.name ?? 'Unknown role';

export function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
