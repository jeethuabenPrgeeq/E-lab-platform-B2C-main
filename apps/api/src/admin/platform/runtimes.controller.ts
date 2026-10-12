import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { RuntimesService } from './runtimes.service.js';

export class RuntimeStatusDto {
  @IsString() @MaxLength(20) status!: string;
}

export class ImageMarkDto {
  @IsIn(['ready', 'failed']) status!: 'ready' | 'failed';
}

@Controller('admin/runtimes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('platform.operate')
export class RuntimesController {
  constructor(private readonly runtimes: RuntimesService) {}

  @Get()
  store() {
    return this.runtimes.store();
  }

  @Post('versions/:id/default')
  setDefault(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.runtimes.setDefault(id, actor);
  }

  @Post('images/:id/pull')
  pull(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.runtimes.pull(id, actor);
  }

  @Post('images/:id/mark')
  mark(@Param('id') id: string, @Body() dto: ImageMarkDto, @Actor() actor: AdminActor) {
    return this.runtimes.markImage(id, dto.status, actor);
  }

  @Post(':kind')
  create(@Param('kind') kind: string, @Body() body: Record<string, unknown>, @Actor() actor: AdminActor) {
    return this.runtimes.create(kind, body, actor);
  }

  @Patch(':kind/:id')
  update(@Param('kind') kind: string, @Param('id') id: string, @Body() body: Record<string, unknown>, @Actor() actor: AdminActor) {
    return this.runtimes.update(kind, id, body, actor);
  }

  @Post(':kind/:id/status')
  status(@Param('kind') kind: string, @Param('id') id: string, @Body() dto: RuntimeStatusDto, @Actor() actor: AdminActor) {
    return this.runtimes.setStatus(kind, id, dto.status, actor);
  }

  @Delete(':kind/:id')
  remove(@Param('kind') kind: string, @Param('id') id: string, @Actor() actor: AdminActor) {
    return this.runtimes.remove(kind, id, actor);
  }
}