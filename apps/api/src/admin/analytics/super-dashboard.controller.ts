import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { SuperDashboardService } from './super-dashboard.service.js';

@Controller('super/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('analytics.view')
export class SuperDashboardController {
  constructor(private readonly dashboard: SuperDashboardService) {}

  @Get()
  overview() {
    return this.dashboard.overview();
  }
}
