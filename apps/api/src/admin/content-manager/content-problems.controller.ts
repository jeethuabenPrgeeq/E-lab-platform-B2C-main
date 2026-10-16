import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { InstitutionId, RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { CreateProblemDto } from '../problems/problems.dto.js';
import { ContentProblemQueryDto, ContentUpdateProblemDto } from './content-problems.dto.js';
import { ContentProblemsService } from './content-problems.service.js';

@Controller('institute')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('institute-admin')
@RequirePermission('inst.content.view', 'inst.content.create')
export class ContentProblemsController {
  constructor(private readonly problems: ContentProblemsService) {}

  @Get('technologies')
  technologies() {
    return this.problems.technologies();
  }

  @Get('problems')
  list(@Query(QueryPipe) query: ContentProblemQueryDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.problems.list(query, actor, organizationId);
  }

  @Get('problems/:id')
  get(@Param('id') id: string, @InstitutionId() organizationId: string) {
    return this.problems.get(id, organizationId);
  }

  @Get('problems/:id/versions')
  versions(@Param('id') id: string, @InstitutionId() organizationId: string) {
    return this.problems.versions(id, organizationId);
  }

  @Post('problems')
  create(@Body() dto: CreateProblemDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.problems.create(dto, actor, organizationId);
  }

  @Patch('problems/:id')
  update(@Param('id') id: string, @Body() dto: ContentUpdateProblemDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.problems.update(id, dto, actor, organizationId);
  }

  @Post('problems/:id/duplicate')
  duplicate(@Param('id') id: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.problems.duplicate(id, actor, organizationId);
  }
}
