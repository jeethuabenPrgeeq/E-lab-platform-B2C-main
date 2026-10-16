import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import {
  CreateInstitutionDto,
  InstituteAdminReasonDto,
  InstitutionQueryDto,
  InviteInstituteAdminDto,
  LinkInstituteAdminDto,
  SetInstitutionPermissionsDto,
  UpdateInstitutionDto,
} from './institutions.dto.js';
import { InstitutionsService } from './institutions.service.js';

@Controller('super/institutions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('institutions.manage')
export class InstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}

  @Get()
  list(@Query(QueryPipe) query: InstitutionQueryDto) {
    return this.institutions.list(query);
  }

  @Get('unlinked-admins')
  unlinked() {
    return this.institutions.unlinkedAdmins();
  }

  @Post()
  create(@Body() dto: CreateInstitutionDto, @Actor() actor: AdminActor) {
    return this.institutions.create(dto, actor);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.institutions.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInstitutionDto, @Actor() actor: AdminActor) {
    return this.institutions.update(id, dto, actor);
  }

  @Put(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() dto: SetInstitutionPermissionsDto, @Actor() actor: AdminActor) {
    return this.institutions.setPermissions(id, dto.permissions, actor);
  }

  @Post(':id/admins')
  invite(@Param('id') id: string, @Body() dto: InviteInstituteAdminDto, @Actor() actor: AdminActor) {
    return this.institutions.inviteAdmin(id, dto, actor);
  }

  @Post(':id/admins/link')
  link(@Param('id') id: string, @Body() dto: LinkInstituteAdminDto, @Actor() actor: AdminActor) {
    return this.institutions.linkAdmin(id, dto.userId, actor);
  }

  @Post(':id/admins/:userId/revoke')
  revoke(@Param('id') id: string, @Param('userId') userId: string, @Body() dto: InstituteAdminReasonDto, @Actor() actor: AdminActor) {
    return this.institutions.revokeAdmin(id, userId, dto.reason, actor);
  }

  @Post(':id/admins/:userId/restore')
  restore(@Param('id') id: string, @Param('userId') userId: string, @Actor() actor: AdminActor) {
    return this.institutions.restoreAdmin(id, userId, actor);
  }
}
