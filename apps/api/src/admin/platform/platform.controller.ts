import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { PageQueryDto, QueryPipe } from '../common/pagination.js';
import { ExecutionsMonitorService } from './executions-monitor.service.js';
import { OUTCOMES, VERDICTS } from './runs.js';
import { SUB_RANGES, SubmissionsAdminService, type SubRange } from './submissions-admin.service.js';

export class ExecQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['run', 'submit']) kind?: 'run' | 'submit';
  @IsOptional() @IsIn(OUTCOMES) outcome?: string;
  @IsOptional() @IsString() @MaxLength(30) language?: string;
  @IsOptional() @IsIn(['15m', '1h', '6h', '24h', '7d']) range?: '15m' | '1h' | '6h' | '24h' | '7d';
}

export class SnapshotQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(15) @Max(1440) minutes?: number;
}

export class ThresholdDto {
  @IsNumber() threshold!: number;
}

export class AckDto {
  @IsInt() eventStart!: number;
}

export class SilenceDto {
  @ValidateIf((_, value) => value !== null) @IsInt() @Min(5) @Max(1440) minutes!: number | null;
}

export class SubQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(VERDICTS) verdict?: string;
  @IsOptional() @IsString() @MaxLength(120) problem?: string;
  @IsOptional() @IsString() @MaxLength(30) language?: string;
  @IsOptional() @IsIn(Object.keys(SUB_RANGES)) range?: SubRange;
}

export class RangeQueryDto {
  @IsOptional() @IsIn(Object.keys(SUB_RANGES)) range?: SubRange;
}

export class OverrideDto {
  @IsIn(VERDICTS) verdict!: string;
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}

export class RejudgeDto {
  @IsString() @MaxLength(120) problemSlug!: string;
  @IsIn(['all', 'since', 'failed']) scope!: 'all' | 'since' | 'failed';
  @IsOptional() @IsInt() since?: number | null;
}

export class PlagiarismQueryDto {
  @IsOptional() @IsString() @MaxLength(120) problem?: string;
  @IsOptional() @IsIn([...Object.keys(SUB_RANGES), 'all']) range?: SubRange | 'all';
  @IsOptional() @Type(() => Number) @IsInt() @Min(50) @Max(100) threshold?: number;
}

export class PairQueryDto {
  @IsString() @MaxLength(40) a!: string;
  @IsString() @MaxLength(40) b!: string;
}

export class DecideDto {
  @IsString() @MaxLength(40) runAId!: string;
  @IsString() @MaxLength(40) runBId!: string;
  @ValidateIf((_, value) => value !== null) @IsIn(['confirmed', 'dismissed']) decision!: 'confirmed' | 'dismissed' | null;
}

@Controller('admin/executions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('monitoring.view')
export class ExecutionsMonitorController {
  constructor(private readonly monitor: ExecutionsMonitorService) {}

  @Get('snapshot')
  snapshot(@Query(QueryPipe) query: SnapshotQueryDto) {
    return this.monitor.snapshot(query.minutes ?? 1440);
  }

  @Get('alerts')
  alerts() {
    return this.monitor.alerts();
  }

  @Put('alerts/:ruleId/threshold')
  threshold(@Param('ruleId') ruleId: string, @Body() dto: ThresholdDto, @Actor() actor: AdminActor) {
    return this.monitor.setThreshold(ruleId, dto.threshold, actor);
  }

  @Post('alerts/:ruleId/ack')
  ack(@Param('ruleId') ruleId: string, @Body() dto: AckDto, @Actor() actor: AdminActor) {
    return this.monitor.acknowledge(ruleId, dto.eventStart, actor);
  }

  @Post('alerts/:ruleId/silence')
  silence(@Param('ruleId') ruleId: string, @Body() dto: SilenceDto, @Actor() actor: AdminActor) {
    return this.monitor.silence(ruleId, dto.minutes, actor);
  }

  @Get()
  list(@Query(QueryPipe) query: ExecQueryDto) {
    return this.monitor.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.monitor.get(id);
  }
}

@Controller('admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('monitoring.view', 'judge.manage')
export class SubmissionsAdminController {
  constructor(private readonly submissions: SubmissionsAdminService) {}

  @Get('overview')
  overview(@Query(QueryPipe) query: RangeQueryDto) {
    return this.submissions.overview(query.range ?? '7d');
  }

  @Get('rejudge')
  jobs() {
    return this.submissions.jobs();
  }

  @Post('rejudge/preview')
  preview(@Body() dto: RejudgeDto) {
    return this.submissions.preview(dto.problemSlug, dto.scope, dto.since ?? null);
  }

  @Post('rejudge')
  rejudge(@Body() dto: RejudgeDto, @Actor() actor: AdminActor) {
    return this.submissions.startRejudge(dto.problemSlug, dto.scope, dto.since ?? null, actor);
  }

  @Get('rejudge/:id')
  job(@Param('id') id: string) {
    return this.submissions.job(id);
  }

  @Post('rejudge/:id/cancel')
  cancel(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.submissions.cancelJob(id, actor);
  }

  @Get('plagiarism')
  plagiarism(@Query(QueryPipe) query: PlagiarismQueryDto) {
    return this.submissions.plagiarism(query.problem, query.range ?? '30d', query.threshold ?? 80);
  }

  @Get('plagiarism/compare')
  compare(@Query(QueryPipe) query: PairQueryDto) {
    return this.submissions.compare(query.a, query.b);
  }

  @Post('plagiarism/decide')
  decide(@Body() dto: DecideDto, @Actor() actor: AdminActor) {
    return this.submissions.decide(dto.runAId, dto.runBId, dto.decision, actor);
  }

  @Get()
  list(@Query(QueryPipe) query: SubQueryDto) {
    return this.submissions.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.submissions.get(id);
  }

  @Post(':id/verdict')
  override(@Param('id') id: string, @Body() dto: OverrideDto, @Actor() actor: AdminActor) {
    return this.submissions.override(id, dto.verdict, dto.reason, actor);
  }
}