import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '../../auth/current-user.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PERMISSION_KEY, type PermissionRule } from './permission.decorator.js';
import { CONTENT_ROLE, DEFAULT_ROLES, SUPER_ROLE, type Permission } from './permissions.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<PermissionRule | undefined>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!rule) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Authentication is required.');
    if (user.role !== 'super-admin' && user.role !== 'content-manager') return true;
    const needed: Permission = request.method === 'GET' || !rule.write ? rule.read : rule.write;
    const record = await this.prisma.user.findUnique({ where: { id: user.id }, select: { adminRoleId: true, adminRole: { select: { permissions: true } } } });
    if (user.role === 'super-admin' && (!record?.adminRoleId || record.adminRoleId === SUPER_ROLE)) return true;
    const fallback = DEFAULT_ROLES.find((role) => role.id === CONTENT_ROLE)?.permissions ?? [];
    const granted = (record?.adminRole?.permissions as string[] | undefined) ?? (user.role === 'content-manager' ? fallback : []);
    if (!granted.includes(needed)) throw new ForbiddenException(`Your role does not include "${needed}".`);
    return true;
  }
}