import type { AuthenticatedRequest } from '../../auth/current-user.decorator.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { AUTHORING_PERMISSIONS, isPermission, SUPER_PERMISSIONS, SUPER_ROLE, type Permission } from './permissions.js';

export interface PermissionSubject {
  role: string;
  status: string;
  adminRoleId: string | null;
  adminRole: { permissions: unknown } | null;
}

export const PERMISSION_SUBJECT_SELECT = {
  role: true,
  status: true,
  adminRoleId: true,
  adminRole: { select: { permissions: true } },
} as const;

const AUTHORING_DB_ROLES = new Set(['PLATFORM_ADMIN', 'CONTENT_MANAGER']);

export function resolvePermissions(subject: PermissionSubject | null): Permission[] {
  if (!subject || subject.status !== 'ACTIVE') return [];
  if (subject.role === 'SUPER_ADMIN' && (!subject.adminRoleId || subject.adminRoleId === SUPER_ROLE)) return [...SUPER_PERMISSIONS].sort();
  const stored = Array.isArray(subject.adminRole?.permissions) ? (subject.adminRole.permissions as unknown[]).filter(isPermission) : [];
  const allowed = AUTHORING_DB_ROLES.has(subject.role) ? stored : stored.filter((key) => !AUTHORING_PERMISSIONS.includes(key));
  return [...new Set(allowed)].sort();
}

export type PermissionRequest = AuthenticatedRequest & { grantedPermissions?: ReadonlySet<Permission> };

export async function grantedPermissions(prisma: PrismaService, request: PermissionRequest): Promise<ReadonlySet<Permission>> {
  if (request.grantedPermissions) return request.grantedPermissions;
  const userId = request.user?.id;
  const subject = userId ? await prisma.user.findUnique({ where: { id: userId }, select: PERMISSION_SUBJECT_SELECT }) : null;
  const granted = new Set(resolvePermissions(subject));
  request.grantedPermissions = granted;
  return granted;
}
