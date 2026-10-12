import { Controller, Get, Header, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { QueryPipe } from '../common/pagination.js';
import { EventQueryDto } from './events.dto.js';
import { AuditEventsService } from './events.service.js';

@Controller('super/audit')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('audit.view')
export class AuditEventsController {
  constructor(private readonly events: AuditEventsService) {}

  @Get('events')
  list(@Query(QueryPipe) query: EventQueryDto) {
    return this.events.list(query);
  }

  @Get('events/export')
  @Header('Cache-Control', 'no-store')
  async export(@Query(QueryPipe) query: EventQueryDto, @Res() res: Response) {
    const file = await this.events.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="elab-activity-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader('X-Export-Count', String(file.count));
    res.setHeader('X-Export-Truncated', String(file.truncated));
    res.send(file.csv);
  }

  @Get('events/:id')
  get(@Param('id') id: string) {
    return this.events.get(id);
  }
}