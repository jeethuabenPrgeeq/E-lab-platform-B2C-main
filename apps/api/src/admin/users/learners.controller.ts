import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { InviteLearnersDto, LearnerQueryDto } from './learners.dto.js';
import { LearnersService } from './learners.service.js';

@Controller('super/learners')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('users.view')
export class LearnersController {
  constructor(private readonly learners: LearnersService) {}

  @Get()
  list(@Query(QueryPipe) query: LearnerQueryDto) {
    return this.learners.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.learners.get(id);
  }

  @RequirePermission('users.view', 'users.manage')
  @Post('invite')
  invite(@Body() dto: InviteLearnersDto, @Actor() actor: AdminActor) {
    return this.learners.invite(dto.emails, actor);
  }

  @RequirePermission('users.view', 'users.manage')
  @Post(':id/temporary-password')
  temporaryPassword(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.learners.temporaryPassword(id, actor);
  }
}
