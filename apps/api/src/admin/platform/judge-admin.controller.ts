import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { JudgeAdminService } from './judge-admin.service.js';

export class WorkerDto {
  @IsString() @MaxLength(40) name!: string;
  @IsString() @MaxLength(200) host!: string;
  @IsInt() @Min(1) @Max(64) capacity!: number;
  @IsOptional() @IsString() @MaxLength(40) version?: string;
}

export class PauseDto {
  @IsBoolean() paused!: boolean;
}

@Controller('admin/judge')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('platform.operate')
export class JudgeAdminController {
  constructor(private readonly judge: JudgeAdminService) {}

  @Get()
  overview() {
    return this.judge.overview();
  }

  @Get('workers')
  workers() {
    return this.judge.workers();
  }

  @Post('workers')
  addWorker(@Body() dto: WorkerDto, @Actor() actor: AdminActor) {
    return this.judge.addWorker(dto, actor);
  }

  @Patch('workers/:id')
  updateWorker(@Param('id') id: string, @Body() dto: WorkerDto, @Actor() actor: AdminActor) {
    return this.judge.updateWorker(id, dto, actor);
  }

  @Delete('workers/:id')
  removeWorker(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.judge.removeWorker(id, actor);
  }

  @Post('workers/:id/drain')
  drain(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.judge.toggleDrain(id, actor);
  }

  @Post('workers/:id/restart')
  restart(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.judge.restart(id, actor);
  }

  @Post('workers/:id/check')
  check(@Param('id') id: string) {
    return this.judge.check(id);
  }

  @Get('jobs')
  jobs() {
    return this.judge.jobs();
  }

  @Post('jobs/retry-failed')
  retryAll(@Actor() actor: AdminActor) {
    return this.judge.retryAllFailed(actor);
  }

  @Post('jobs/:id/retry')
  retry(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.judge.retry(id, actor);
  }

  @Post('jobs/:id/cancel')
  cancel(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.judge.cancel(id, actor);
  }

  @Post('jobs/:id/prioritize')
  prioritize(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.judge.prioritize(id, actor);
  }

  @Post('queue/pause')
  pause(@Body() dto: PauseDto, @Actor() actor: AdminActor) {
    return this.judge.setPaused(dto.paused, actor);
  }

  @Put('limits')
  limits(@Body() body: Record<string, unknown>, @Actor() actor: AdminActor) {
    return this.judge.saveLimits(body, actor);
  }
}