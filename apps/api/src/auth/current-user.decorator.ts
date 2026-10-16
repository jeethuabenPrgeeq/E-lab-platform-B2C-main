import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AppRole } from './roles.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  mustChangePassword?: boolean;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);