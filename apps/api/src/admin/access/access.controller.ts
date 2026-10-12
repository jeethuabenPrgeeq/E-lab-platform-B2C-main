import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { AdminQueryDto, CreateRoleDto, InviteAdminDto, RevokeDto, SavePermissionsDto, SetRoleDto, SetScopeDto } from './access.dto.js';
import { AccessService } from './access.service.js';
import { RequirePermission } from './permission.decorator.js';
import { PermissionGuard } from './permission.guard.js';

@Controller('super/access')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('admins.manage')
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('me')
  @RequirePermission('users.view')
  me(@Actor() actor: AdminActor) {
    return this.access.me(actor);
  }

  @Get('admins')
  list(@Query(QueryPipe) query: AdminQueryDto, @Actor() actor: AdminActor) {
    return this.access.list(query, actor);
  }

  @Get('admins/:id')
  get(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.access.get(id, actor);
  }

  @Post('admins')
  invite(@Body() dto: InviteAdminDto, @Actor() actor: AdminActor) {
    return this.access.invite(dto, actor);
  }

  @Post('admins/:id/role')
  setRole(@Param('id') id: string, @Body() dto: SetRoleDto, @Actor() actor: AdminActor) {
    return this.access.setRole(id, dto.roleId, actor);
  }

  @Post('admins/:id/scope')
  setScope(@Param('id') id: string, @Body() dto: SetScopeDto, @Actor() actor: AdminActor) {
    return this.access.setScope(id, dto.scope, actor);
  }

  @Post('admins/:id/revoke')
  revoke(@Param('id') id: string, @Body() dto: RevokeDto, @Actor() actor: AdminActor) {
    return this.access.revoke(id, dto.reason, actor);
  }

  @Post('admins/:id/restore')
  restore(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.access.restore(id, actor);
  }

  @Post('admins/:id/resend-invite')
  resendInvite(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.access.resendInvite(id, actor);
  }

  @Post('admins/:id/reset-mfa')
  resetMfa(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.access.resetMfa(id, actor);
  }

  @Post('admins/:id/sign-out')
  signOut(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.access.signOutEverywhere(id, actor);
  }

  @Get('roles')
  roles() {
    return this.access.roles();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto, @Actor() actor: AdminActor) {
    return this.access.createRole(dto, actor);
  }

  @Put('roles/:id/permissions')
  savePermissions(@Param('id') id: string, @Body() dto: SavePermissionsDto, @Actor() actor: AdminActor) {
    return this.access.savePermissions(id, dto.permissions, actor);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.access.deleteRole(id, actor);
  }
}