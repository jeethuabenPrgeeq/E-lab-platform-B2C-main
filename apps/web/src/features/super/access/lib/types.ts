export type AdminStatus = 'active' | 'invited' | 'revoked';

export type PermissionKey =
  | 'users.view'
  | 'users.manage'
  | 'users.suspend'
  | 'admins.manage'
  | 'content.view'
  | 'content.edit'
  | 'content.publish'
  | 'content.review.approve'
  | 'billing.view'
  | 'billing.refund'
  | 'billing.plans'
  | 'coupons.manage'
  | 'analytics.view'
  | 'reports.export'
  | 'support.respond'
  | 'notifications.send'
  | 'platform.operate'
  | 'settings.manage'
  | 'audit.view';

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  system: boolean;
  locked: boolean;
  permissions: PermissionKey[];
  updatedAt: number;
  updatedBy: string;
}

export interface AdminActivity {
  at: number;
  text: string;
  actor: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  roleId: string;
  scope: string;
  status: AdminStatus;
  mfa: boolean;
  self: boolean;
  createdAt: number;
  lastSignInAt: number | null;
  invitedBy: string;
  revokeReason: string | null;
  activity: AdminActivity[];
}

export interface AdminDirectory {
  admins: AdminAccount[];
  roles: AdminRole[];
}

export interface InviteAdminInput {
  name: string;
  email: string;
  roleId: string;
  scope: string;
}

export interface NewRoleInput {
  name: string;
  description: string;
  copyFrom: string | null;
}