import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from './current-user.decorator.js';
import { ROLES_KEY } from './roles.decorator.js';
import type { AppRole } from './roles.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    return true;
  }
}