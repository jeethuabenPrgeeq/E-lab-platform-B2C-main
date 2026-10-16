import type { AuthenticatedRequest } from '../../auth/current-user.decorator.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { AUTHORING_PERMISSIONS, isInstitutionPermission, isPermission, SUPER_PERMISSIONS, SUPER_ROLE, type AnyPermission } from './permissions.js';

export interface PermissionSubject {
  role: string;
  status: string;
  adminRoleId: string | null;
  adminRole: { permissions: unknown } | null;
  organizationId?: string | null;
  organization?: { status: string; permissions: unknown } | null;
}

export const PERMISSION_SUBJECT_SELECT = {
  role: true,
  status: true,
  adminRoleId: true,
  adminRole: { select: { permissions: true } },
  organizationId: true,
  organization: { select: { status: true, permissions: true } },
} as const;

const AUTHORING_DB_ROLES = new Set(['PLATFORM_ADMIN']);

export function resolvePermissions(subject: PermissionSubject | null): AnyPermission[] {
  if (!subject || subject.status !== 'ACTIVE') return [];
  if (subject.role === 'INSTITUTE_ADMIN') {
    if (!subject.organization || subject.organization.status !== 'active') return [];
    const keys = Array.isArray(subject.organization.permissions) ? (subject.organization.permissions as unknown[]).filter(isInstitutionPermission) : [];
    return [...new Set(keys)].sort();
  }
  if (subject.role === 'SUPER_ADMIN' && (!subject.adminRoleId || subject.adminRoleId === SUPER_ROLE)) return [...SUPER_PERMISSIONS].sort();
  const stored = Array.isArray(subject.adminRole?.permissions) ? (subject.adminRole.permissions as unknown[]).filter(isPermission) : [];
  const allowed = AUTHORING_DB_ROLES.has(subject.role) ? stored : stored.filter((key) => !AUTHORING_PERMISSIONS.includes(key));
  return [...new Set(allowed)].sort();
}

export type PermissionRequest = AuthenticatedRequest & { grantedPermissions?: ReadonlySet<AnyPermission>; institutionId?: string | null };

export async function grantedPermissions(prisma: PrismaService, request: PermissionRequest): Promise<ReadonlySet<AnyPermission>> {
  if (request.grantedPermissions) return request.grantedPermissions;
  const userId = request.user?.id;
  const subject = userId ? await prisma.user.findUnique({ where: { id: userId }, select: PERMISSION_SUBJECT_SELECT }) : null;
  const granted = new Set(resolvePermissions(subject));
  request.grantedPermissions = granted;
  request.institutionId = subject?.role === 'INSTITUTE_ADMIN' && granted.size > 0 ? (subject.organizationId ?? null) : null;
  return granted;
}
