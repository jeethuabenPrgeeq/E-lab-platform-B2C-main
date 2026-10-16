import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service.js';
import { grantedPermissions, type PermissionRequest } from './effective-permissions.js';
import { PERMISSION_KEY, type PermissionRule } from './permission.decorator.js';
import type { AnyPermission } from './permissions.js';

const READ_METHODS = new Set(['GET', 'HEAD']);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<PermissionRule | null | undefined>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!rule) return true;
    const request = context.switchToHttp().getRequest<PermissionRequest>();
    if (!request.user) throw new UnauthorizedException('Authentication is required.');
    const needed: AnyPermission = READ_METHODS.has(request.method) || !rule.write ? rule.read : rule.write;
    const granted = await grantedPermissions(this.prisma, request);
    if (!granted.has(needed)) throw new ForbiddenException(`Your role does not include "${needed}".`);
    return true;
  }
}
