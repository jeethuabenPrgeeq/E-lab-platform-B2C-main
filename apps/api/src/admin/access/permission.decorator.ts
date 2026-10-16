import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

import type { PermissionRequest } from './effective-permissions.js';
import type { Permission } from './permissions.js';

export const PERMISSION_KEY = 'required_permission';

export interface PermissionRule {
  read: Permission;
  write?: Permission;
}

export const RequirePermission = (read: Permission, write?: Permission) => SetMetadata(PERMISSION_KEY, { read, write } satisfies PermissionRule);

export const NoPermissionRequired = () => SetMetadata(PERMISSION_KEY, null);

export const Granted = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ReadonlySet<Permission> =>
    context.switchToHttp().getRequest<PermissionRequest>().grantedPermissions ?? new Set<Permission>(),
);
