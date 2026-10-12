export const PERMISSIONS = [
  'users.view',
  'users.manage',
  'users.suspend',
  'admins.manage',
  'content.view',
  'content.edit',
  'content.publish',
  'content.review.approve',
  'billing.view',
  'billing.refund',
  'billing.plans',
  'coupons.manage',
  'analytics.view',
  'reports.export',
  'support.respond',
  'notifications.send',
  'platform.operate',
  'settings.manage',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const SUPER_ROLE = 'super_admin';
export const PLATFORM_ROLE = 'platform_admin';
export const CONTENT_ROLE = 'content_manager';
export const ALL_SCOPE = 'All institutions';

export interface RoleSeed {
  id: string;
  name: string;
  description: string;
  system: boolean;
  locked: boolean;
  permissions: Permission[];
}

export const DEFAULT_ROLES: RoleSeed[] = [
  { id: SUPER_ROLE, name: 'Super admin', description: 'Full access to every part of eLab. Cannot be edited.', system: true, locked: true, permissions: [...PERMISSIONS] },
  { id: PLATFORM_ROLE, name: 'Platform admin', description: 'Runs the judge, runtimes, incidents and releases.', system: true, locked: false, permissions: ['users.view', 'content.view', 'analytics.view', 'support.respond', 'platform.operate', 'audit.view'] },
  { id: CONTENT_ROLE, name: 'Content manager', description: 'Creates, imports and organizes coding problems and submits them for review.', system: true, locked: false, permissions: ['content.view', 'content.edit', 'analytics.view'] },
  { id: 'billing_manager', name: 'Billing manager', description: 'Handles subscriptions, refunds, plans and coupons.', system: true, locked: false, permissions: ['users.view', 'billing.view', 'billing.refund', 'billing.plans', 'coupons.manage', 'analytics.view', 'reports.export'] },
  { id: 'support_agent', name: 'Support agent', description: 'Answers learner tickets and can look up accounts.', system: true, locked: false, permissions: ['users.view', 'billing.view', 'support.respond'] },
];