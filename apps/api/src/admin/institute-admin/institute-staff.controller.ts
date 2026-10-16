import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { InstitutionId, RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { InviteStaffDto, StaffReasonDto, UpdateStaffDto } from './institute-staff.dto.js';
import { InstituteStaffService } from './institute-staff.service.js';

@Controller('institute/staff')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('institute-admin')
@RequirePermission('inst.staff.manage')
export class InstituteStaffController {
  constructor(private readonly staff: InstituteStaffService) {}

  @Get()
  list(@InstitutionId() organizationId: string) {
    return this.staff.list(organizationId);
  }

  @Post()
  invite(@Body() dto: InviteStaffDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.staff.invite(dto, actor, organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.staff.update(id, dto, actor, organizationId);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(@Param('id') id: string, @Body() dto: StaffReasonDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.staff.revoke(id, dto.reason, actor, organizationId);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id') id: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.staff.restore(id, actor, organizationId);
  }
}