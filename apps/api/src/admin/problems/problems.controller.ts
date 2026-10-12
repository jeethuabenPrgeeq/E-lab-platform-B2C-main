import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import {
  CreateProblemDto,
  ProblemQueryDto,
  TransitionDto,
  UpdateProblemDto,
} from './problems.dto.js';
import { ProblemsService } from './problems.service.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';

@Controller('admin/problems')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('content.view')
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get()
  list(@Query(QueryPipe) query: ProblemQueryDto) {
    return this.problems.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.problems.get(id);
  }

  @Get(':id/versions')
  versions(@Param('id') id: string) {
    return this.problems.versions(id);
  }

  @Post()
  @Roles('platform-admin')
  create(@Body() dto: CreateProblemDto, @Actor() actor: AdminActor) {
    return this.problems.create(dto, actor);
  }

  @Patch(':id')
  @Roles('platform-admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProblemDto,
    @Actor() actor: AdminActor,
  ) {
    return this.problems.update(id, dto, actor);
  }

  @Post(':id/transition')
  @HttpCode(200)
  @Roles('platform-admin')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionDto,
    @Actor() actor: AdminActor,
  ) {
    return this.problems.transition(id, dto, actor);
  }

  @Delete(':id')
  @Roles('platform-admin')
  remove(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.problems.remove(id, actor);
  }
}
