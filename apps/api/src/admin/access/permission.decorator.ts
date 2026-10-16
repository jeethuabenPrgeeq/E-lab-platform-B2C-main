import { createParamDecorator, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';

import type { PermissionRequest } from './effective-permissions.js';
import type { AnyPermission } from './permissions.js';

export const PERMISSION_KEY = 'required_permission';

export interface PermissionRule {
  read: AnyPermission;
  write?: AnyPermission;
}

export const RequirePermission = (read: AnyPermission, write?: AnyPermission) => SetMetadata(PERMISSION_KEY, { read, write } satisfies PermissionRule);

export const NoPermissionRequired = () => SetMetadata(PERMISSION_KEY, null);

export const Granted = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ReadonlySet<AnyPermission> =>
    context.switchToHttp().getRequest<PermissionRequest>().grantedPermissions ?? new Set<AnyPermission>(),
);

export const InstitutionId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const id = context.switchToHttp().getRequest<PermissionRequest>().institutionId;
  if (!id) throw new ForbiddenException('Your account is not linked to an active institution.');
  return id;
});
