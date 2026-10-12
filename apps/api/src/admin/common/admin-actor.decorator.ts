import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../../auth/current-user.decorator.js';

export interface AdminActor {
  id: string;
  email: string;
  ip: string | null;
  userAgent?: string | null;
}

export const Actor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminActor => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    return {
      id: request.user.id,
      email: request.user.email,
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent']?.slice(0, 255) ?? null,
    };
  },
);
