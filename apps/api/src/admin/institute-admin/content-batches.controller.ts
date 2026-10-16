import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import type { StaffScope } from '../access/effective-permissions.js';
import { InstitutionId, RequirePermission, Scope } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { AssignBatchDto, BatchQueryDto, CreateBatchDto, UpdateBatchDto } from './content-batches.dto.js';
import { ContentBatchesService } from './content-batches.service.js';

@Controller('institute/batches')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('institute-admin')
@RequirePermission('inst.batches.manage')
export class ContentBatchesController {
  constructor(private readonly batches: ContentBatchesService) {}

  @Get()
  list(@Query(QueryPipe) query: BatchQueryDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.batches.list(query, organizationId, scope, actor.id);
  }

  @Get('progress')
  progress(@InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.batches.assignedProgress(organizationId, scope);
  }

  @Get('groups')
  groups(@InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.batches.groups(organizationId, scope);
  }

  @Get(':id')
  get(@Param('id') id: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.batches.get(id, organizationId, scope, actor.id);
  }

  @Post()
  create(@Body() dto: CreateBatchDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.batches.create(dto, actor, organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBatchDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.batches.update(id, dto, actor, organizationId, scope);
  }

  @Post(':id/assign')
  @HttpCode(200)
  assign(@Param('id') id: string, @Body() dto: AssignBatchDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.batches.assign(id, actor, organizationId, dto?.groupId ?? null, scope);
  }

  @Post(':id/unassign')
  @HttpCode(200)
  unassign(@Param('id') id: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.batches.unassign(id, actor, organizationId, scope);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Actor() actor: AdminActor, @InstitutionId() organizationId: string, @Scope() scope: StaffScope | null) {
    return this.batches.remove(id, actor, organizationId, scope);
  }
}