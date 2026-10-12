import {
  Body,
  Controller,
  Delete,
  Get,
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
  CreateTechnologyDto,
  TechnologyQueryDto,
  UpdateTechnologyDto,
} from './technologies.dto.js';
import { TechnologiesService } from './technologies.service.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';

@Controller('admin/technologies')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('content.view')
export class TechnologiesController {
  constructor(private readonly technologies: TechnologiesService) {}

  @Get()
  list(@Query(QueryPipe) query: TechnologyQueryDto) {
    return this.technologies.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.technologies.get(id);
  }

  @Post()
  @Roles('platform-admin')
  create(@Body() dto: CreateTechnologyDto, @Actor() actor: AdminActor) {
    return this.technologies.create(dto, actor);
  }

  @Patch(':id')
  @Roles('platform-admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTechnologyDto,
    @Actor() actor: AdminActor,
  ) {
    return this.technologies.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('platform-admin')
  remove(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.technologies.remove(id, actor);
  }
}
