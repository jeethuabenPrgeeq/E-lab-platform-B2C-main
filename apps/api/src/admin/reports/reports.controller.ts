import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { GenerateReportDto, RunQueryDto, ScheduleActiveDto, ScheduleInputDto } from './reports.dto.js';
import { ReportsService } from './reports.service.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';

@Controller('super/reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('reports.export')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('templates')
  templates() {
    return this.reports.templates();
  }

  @Get('runs')
  runs(@Query(QueryPipe) query: RunQueryDto) {
    return this.reports.runs(query);
  }

  @Post('runs')
  generate(@Body() dto: GenerateReportDto, @Actor() actor: AdminActor) {
    return this.reports.generate(dto.templateId, dto.range, actor);
  }

  @Get('runs/:id/download')
  @Header('Cache-Control', 'no-store')
  async download(@Param('id') id: string, @Res() res: Response) {
    const file = await this.reports.download(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.csv);
  }

  @Get('schedules')
  schedules() {
    return this.reports.schedules();
  }

  @Post('schedules')
  createSchedule(@Body() dto: ScheduleInputDto, @Actor() actor: AdminActor) {
    return this.reports.createSchedule(dto, actor);
  }

  @Patch('schedules/:id')
  updateSchedule(@Param('id') id: string, @Body() dto: ScheduleInputDto, @Actor() actor: AdminActor) {
    return this.reports.updateSchedule(id, dto, actor);
  }

  @Post('schedules/:id/active')
  setActive(@Param('id') id: string, @Body() dto: ScheduleActiveDto, @Actor() actor: AdminActor) {
    return this.reports.setActive(id, dto.active, actor);
  }

  @Post('schedules/:id/run')
  runSchedule(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.reports.runSchedule(id, actor);
  }

  @Delete('schedules/:id')
  removeSchedule(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.reports.removeSchedule(id, actor);
  }
}