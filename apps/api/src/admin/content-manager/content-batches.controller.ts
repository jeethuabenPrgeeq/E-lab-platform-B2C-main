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
import {
  InstitutionId,
  RequirePermission,
} from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import {
  AssignBatchDto,
  BatchQueryDto,
  CreateBatchDto,
  UpdateBatchDto,
} from './content-batches.dto.js';
import { ContentBatchesService } from './content-batches.service.js';

@Controller('institute/batches')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('institute-admin')
@RequirePermission('inst.batches.manage')
export class ContentBatchesController {
  constructor(private readonly batches: ContentBatchesService) {}

  @Get()
  list(
    @Query(QueryPipe) query: BatchQueryDto,
    @InstitutionId() organizationId: string,
  ) {
    return this.batches.list(query, organizationId);
  }

  @Get('groups')
  groups(@InstitutionId() organizationId: string) {
    return this.batches.groups(organizationId);
  }

  @Get(':id')
  get(@Param('id') id: string, @InstitutionId() organizationId: string) {
    return this.batches.get(id, organizationId);
  }

  @Post()
  create(
    @Body() dto: CreateBatchDto,
    @Actor() actor: AdminActor,
    @InstitutionId() organizationId: string,
  ) {
    return this.batches.create(dto, actor, organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
    @Actor() actor: AdminActor,
    @InstitutionId() organizationId: string,
  ) {
    return this.batches.update(id, dto, actor, organizationId);
  }

  @Post(':id/assign')
  @HttpCode(200)
    assign(@Param('id') id: string, @Body() dto: AssignBatchDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.batches.assign(id, actor, organizationId, dto?.groupId ?? null);
  }

  @Post(':id/unassign')
  @HttpCode(200)
  unassign(
    @Param('id') id: string,
    @Actor() actor: AdminActor,
    @InstitutionId() organizationId: string,
  ) {
    return this.batches.unassign(id, actor, organizationId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Actor() actor: AdminActor,
    @InstitutionId() organizationId: string,
  ) {
    return this.batches.remove(id, actor, organizationId);
  }
}
