import { SetMetadata } from '@nestjs/common';

import type { Permission } from './permissions.js';

export const PERMISSION_KEY = 'required_permission';

export interface PermissionRule {
  read: Permission;
  write?: Permission;
}

export const RequirePermission = (read: Permission, write?: Permission) => SetMetadata(PERMISSION_KEY, { read, write } satisfies PermissionRule);