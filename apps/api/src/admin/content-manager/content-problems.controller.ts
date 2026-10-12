import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { CreateProblemDto } from '../problems/problems.dto.js';
import { ContentProblemQueryDto, ContentUpdateProblemDto } from './content-problems.dto.js';
import { ContentProblemsService } from './content-problems.service.js';

@Controller('content-manager')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('content-manager')
@RequirePermission('content.view', 'content.edit')
export class ContentProblemsController {
  constructor(private readonly problems: ContentProblemsService) {}

  @Get('technologies')
  technologies() {
    return this.problems.technologies();
  }

  @Get('problems')
  list(@Query(QueryPipe) query: ContentProblemQueryDto, @Actor() actor: AdminActor) {
    return this.problems.list(query, actor);
  }

  @Get('problems/:id')
  get(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.problems.get(id, actor);
  }

  @Get('problems/:id/versions')
  versions(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.problems.versions(id, actor);
  }

  @Post('problems')
  create(@Body() dto: CreateProblemDto, @Actor() actor: AdminActor) {
    return this.problems.create(dto, actor);
  }

  @Patch('problems/:id')
  update(@Param('id') id: string, @Body() dto: ContentUpdateProblemDto, @Actor() actor: AdminActor) {
    return this.problems.update(id, dto, actor);
  }

  @Post('problems/:id/duplicate')
  duplicate(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.problems.duplicate(id, actor);
  }
}
