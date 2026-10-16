import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { InstitutionId, RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { CreateGroupDto, ImportLearnersDto, InviteLearnerDto, LearnerQueryDto, LearnerReasonDto, SetLearnerGroupDto } from './institute-learners.dto.js';
import { InstituteLearnersService } from './institute-learners.service.js';

@Controller('institute/learners')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('institute-admin')
@RequirePermission('inst.learners.manage')
export class InstituteLearnersController {
  constructor(private readonly learners: InstituteLearnersService) {}

  @Get()
  list(@Query(QueryPipe) query: LearnerQueryDto, @InstitutionId() organizationId: string) {
    return this.learners.list(query, organizationId);
  }

  @Post()
  invite(@Body() dto: InviteLearnerDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.learners.invite(dto, actor, organizationId);
  }

  @Post('import')
  import(@Body() dto: ImportLearnersDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.learners.import(dto, actor, organizationId);
  }

    @Post('groups')
  createGroup(@Body() dto: CreateGroupDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.learners.createGroup(dto.name, actor, organizationId);
  }

  @Delete('groups/:groupId')
  deleteGroup(@Param('groupId') groupId: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.learners.deleteGroup(groupId, actor, organizationId);
  }

  @Post(':id/group')
  @HttpCode(200)
  setGroup(@Param('id') id: string, @Body() dto: SetLearnerGroupDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.learners.setGroup(id, dto?.groupId ?? null, actor, organizationId);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(@Param('id') id: string, @Body() dto: LearnerReasonDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.learners.revoke(id, dto.reason, actor, organizationId);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id') id: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.learners.restore(id, actor, organizationId);
  }
}
