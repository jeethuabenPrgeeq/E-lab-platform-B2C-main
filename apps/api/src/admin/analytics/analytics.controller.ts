import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { QueryPipe } from '../common/pagination.js';
import { ANALYTICS_RANGES, AnalyticsService, type AnalyticsRange } from './analytics.service.js';

export class AnalyticsQueryDto {
  @IsOptional() @IsIn(Object.keys(ANALYTICS_RANGES)) range?: AnalyticsRange;
}

@Controller('super/analytics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('analytics.view')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  overview(@Query(QueryPipe) query: AnalyticsQueryDto) {
    return this.analytics.overview(query.range ?? '30d');
  }
}