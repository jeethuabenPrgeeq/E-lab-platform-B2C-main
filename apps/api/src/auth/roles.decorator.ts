import { SetMetadata } from '@nestjs/common';

import type { AppRole } from './roles.js';

export const ROLES_KEY = 'required_roles';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);