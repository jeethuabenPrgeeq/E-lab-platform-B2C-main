import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { QueryPipe } from '../common/pagination.js';
import { AuditQueryDto } from './audit.dto.js';
import { AuditService } from './audit.service.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('audit.view')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query(QueryPipe) query: AuditQueryDto) {
    return this.audit.list(query);
  }
}
