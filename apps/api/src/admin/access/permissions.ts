export const PERMISSIONS = [
  'users.view',
  'users.manage',
  'users.suspend',
  'admins.manage',
  'institutions.manage',
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
  'settings.manage',
  'audit.view',
  'content.upload',
  'problems.manage',
  'tests.manage',
  'tests.hidden',
  'content.validate',
  'runtimes.manage',
  'judge.manage',
  'monitoring.view',
  'support.technical',
  'incidents.manage',
  'releases.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const AUTHORING_PERMISSIONS: readonly Permission[] = ['content.upload', 'problems.manage', 'tests.manage', 'tests.hidden'];

export const OPERATIONS_PERMISSIONS: readonly Permission[] = [
  'content.validate',
  'runtimes.manage',
  'judge.manage',
  'monitoring.view',
  'support.technical',
  'incidents.manage',
  'releases.manage',
];

export const TECHNICAL_PERMISSIONS: readonly Permission[] = [...AUTHORING_PERMISSIONS, ...OPERATIONS_PERMISSIONS];

export const SUPER_PERMISSIONS: readonly Permission[] = PERMISSIONS.filter((key) => !AUTHORING_PERMISSIONS.includes(key));

export const SUPER_ROLE = 'super_admin';
export const PLATFORM_ROLE = 'platform_admin';
export const ALL_SCOPE = 'All institutions';

export const AUTHORING_ROLES: readonly string[] = [PLATFORM_ROLE];

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}

export const INSTITUTION_PERMISSIONS = ['inst.content.view', 'inst.content.create', 'inst.content.publish', 'inst.tests.manage', 'inst.batches.manage', 'inst.learners.manage'] as const;

export type InstitutionPermission = (typeof INSTITUTION_PERMISSIONS)[number];

export type AnyPermission = Permission | InstitutionPermission;

export const DEFAULT_INSTITUTION_PERMISSIONS: InstitutionPermission[] = ['inst.content.view', 'inst.content.create'];

export const INSTITUTE_ROLE = 'institute_admin';

export function isInstitutionPermission(value: unknown): value is InstitutionPermission {
  return typeof value === 'string' && (INSTITUTION_PERMISSIONS as readonly string[]).includes(value);
}

export interface RoleSeed {
  id: string;
  name: string;
  description: string;
  system: boolean;
  locked: boolean;
  permissions: Permission[];
}

export const DEFAULT_ROLES: RoleSeed[] = [
  { id: SUPER_ROLE, name: 'Super admin', description: 'Full business access to every part of eLab. Does not author content. Cannot be edited.', system: true, locked: true, permissions: [...SUPER_PERMISSIONS] },
  { id: PLATFORM_ROLE, name: 'Platform admin', description: 'Authors problems and tests, runs the judge, runtimes, incidents and releases.', system: true, locked: false, permissions: ['users.view', 'content.view', 'analytics.view', 'support.respond', 'audit.view', ...TECHNICAL_PERMISSIONS] },
  { id: 'billing_manager', name: 'Billing manager', description: 'Handles subscriptions, refunds, plans and coupons.', system: true, locked: false, permissions: ['users.view', 'billing.view', 'billing.refund', 'billing.plans', 'coupons.manage', 'analytics.view', 'reports.export'] },
  { id: 'support_agent', name: 'Support agent', description: 'Answers learner tickets and can look up accounts.', system: true, locked: false, permissions: ['users.view', 'billing.view', 'support.respond'] },
];
