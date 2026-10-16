import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { AssignProblemDto, OwnershipQueryDto } from './ownership.dto.js';
import { OwnershipService } from './ownership.service.js';

@Controller('super/content')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('content.view', 'content.edit')
export class OwnershipController {
  constructor(private readonly ownership: OwnershipService) {}

  @Get('ownership')
  list(@Query(QueryPipe) query: OwnershipQueryDto) {
    return this.ownership.list(query);
  }

  @Get('institute-admins')
  contentManagers() {
    return this.ownership.contentManagers();
  }

  @Post('ownership/:id/assign')
  @HttpCode(200)
  assign(@Param('id') id: string, @Body() dto: AssignProblemDto, @Actor() actor: AdminActor) {
    return this.ownership.assign(id, dto, actor);
  }
}
