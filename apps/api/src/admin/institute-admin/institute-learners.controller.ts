import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import type { StaffScope } from '../access/effective-permissions.js';
import { InstitutionId, RequirePermission, Scope } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { CreateGroupDto, ImportLearnersDto, InviteLearnerDto, LearnerQueryDto, LearnerReasonDto, SetLearnerGroupDto } from './institute-learners.dto.js';
import { InstituteLearnersService } from './institute-learners.service.js';

const GROUPS_DENIED = 'Only the Institute Admin can create or delete learner groups.';

@Controller('institute/learners')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('institute-admin')
@RequirePermission('inst.learners.manage')
export class InstituteLearnersController {
  constructor(private readonly learners: InstituteLearnersService) {}

  @Get()
  list(@Query(QueryPipe) query: LearnerQueryDto, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.learners.list(query, organizationId, scope);
  }

  @Post()
  invite(@Body() dto: InviteLearnerDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.learners.invite(dto, actor, organizationId, scope);
  }

  @Post('import')
  import(@Body() dto: ImportLearnersDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.learners.import(dto, actor, organizationId, scope);
  }

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    if (scope) throw new ForbiddenException(GROUPS_DENIED);
    return this.learners.createGroup(dto.name, actor, organizationId);
  }

  @Delete('groups/:groupId')
  deleteGroup(@Param('groupId') groupId: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    if (scope) throw new ForbiddenException(GROUPS_DENIED);
    return this.learners.deleteGroup(groupId, actor, organizationId);
  }

  @Post(':id/group')
  @HttpCode(200)
  setGroup(@Param('id') id: string, @Body() dto: SetLearnerGroupDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.learners.setGroup(id, dto?.groupId ?? null, actor, organizationId, scope);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(@Param('id') id: string, @Body() dto: LearnerReasonDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.learners.revoke(id, dto.reason, actor, organizationId, scope);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id') id: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.learners.restore(id, actor, organizationId, scope);
  }
}