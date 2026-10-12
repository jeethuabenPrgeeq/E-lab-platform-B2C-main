import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { ContentDashboardService } from './content-dashboard.service.js';

export class ContentDashboardQueryDto {
  @IsOptional() @IsString() @MaxLength(40) technologyId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @IsIn([7, 30, 90]) days?: number;
}

@Controller('content-manager/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('content-manager')
@RequirePermission('content.view')
export class ContentDashboardController {
  constructor(private readonly dashboard: ContentDashboardService) {}

  @Get()
  overview(@Query(QueryPipe) query: ContentDashboardQueryDto, @Actor() actor: AdminActor) {
    return this.dashboard.overview(actor, { technologyId: query.technologyId, days: query.days });
  }
}
