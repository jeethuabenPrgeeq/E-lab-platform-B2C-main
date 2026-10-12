import { Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { IncidentsService } from './incidents.service.js';
import { OpsDirectory } from './ops.common.js';
import {
  AssignDto,
  CloseReportDto,
  CommanderDto,
  ComponentDto,
  CreateReleaseDto,
  CreateTicketDto,
  DeclareDto,
  EscalateTicketDto,
  IncidentQueryDto,
  IncidentUpdateDto,
  LinkDto,
  PlatformAuditQueryDto,
  PostmortemDto,
  RateDto,
  ReasonDto,
  ReleaseQueryDto,
  ReportQueryDto,
  ScheduleDto,
  SeverityDto,
  SubmitReportDto,
  TextDto,
  TicketPriorityDto,
  TicketQueryDto,
  TicketReplyDto,
  TicketStatusDto,
} from './ops.dto.js';
import { PlatformAuditService } from './platform-audit.service.js';
import { PlatformDashboardService } from './platform-dashboard.service.js';
import { ProblemReportsService } from './problem-reports.service.js';
import { ReleasesService } from './releases.service.js';
import { TechSupportService } from './tech-support.service.js';

@Controller('admin/platform')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('platform.operate')
export class PlatformOpsController {
  constructor(
    private readonly dashboard: PlatformDashboardService,
    private readonly directory: OpsDirectory,
  ) {}

  @Get('dashboard')
  @Header('Cache-Control', 'no-store')
  getDashboard() {
    return this.dashboard.get();
  }

  @Get('team')
  team() {
    return this.directory.team();
  }
}

@Controller('admin/problem-reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('platform.operate')
export class ProblemReportsController {
  constructor(private readonly reports: ProblemReportsService) {}

  @Get()
  list(@Query(QueryPipe) query: ReportQueryDto, @Actor() actor: AdminActor) {
    return this.reports.list(query, actor);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.reports.get(id);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignDto, @Actor() actor: AdminActor) {
    return this.reports.assign(id, dto.assigneeId, actor);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.reports.startReview(id, actor);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseReportDto, @Actor() actor: AdminActor) {
    return this.reports.close(id, dto.status, dto.type, dto.note, actor);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.reports.reopen(id, actor);
  }

  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() dto: TextDto, @Actor() actor: AdminActor) {
    return this.reports.reply(id, dto.body, actor);
  }

  @Post(':id/note')
  note(@Param('id') id: string, @Body() dto: TextDto, @Actor() actor: AdminActor) {
    return this.reports.note(id, dto.body, actor);
  }
}

@Controller('admin/tech-support')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('platform.operate')
export class TechSupportController {
  constructor(private readonly tickets: TechSupportService) {}

  @Get()
  list(@Query(QueryPipe) query: TicketQueryDto, @Actor() actor: AdminActor) {
    return this.tickets.list(query, actor);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tickets.get(id);
  }

  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() dto: TicketReplyDto, @Actor() actor: AdminActor) {
    return this.tickets.reply(id, dto.body, dto.status, actor);
  }

  @Post(':id/note')
  note(@Param('id') id: string, @Body() dto: TextDto, @Actor() actor: AdminActor) {
    return this.tickets.note(id, dto.body, actor);
  }

  @Post(':id/status')
  status(@Param('id') id: string, @Body() dto: TicketStatusDto, @Actor() actor: AdminActor) {
    return this.tickets.setStatus(id, dto.status, actor);
  }

  @Post(':id/priority')
  priority(@Param('id') id: string, @Body() dto: TicketPriorityDto, @Actor() actor: AdminActor) {
    return this.tickets.setPriority(id, dto.priority, actor);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignDto, @Actor() actor: AdminActor) {
    return this.tickets.assign(id, dto.assigneeId, actor);
  }

  @Post(':id/escalate')
  escalate(@Param('id') id: string, @Body() dto: EscalateTicketDto, @Actor() actor: AdminActor) {
    return this.tickets.escalate(id, dto.note, actor);
  }
}

@Controller('admin/incidents')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('platform.operate')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get()
  list(@Query(QueryPipe) query: IncidentQueryDto) {
    return this.incidents.list(query);
  }

  @Post()
  declare(@Body() dto: DeclareDto, @Actor() actor: AdminActor) {
    return this.incidents.declare(dto, actor);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.incidents.get(id);
  }

  @Post(':id/updates')
  update(@Param('id') id: string, @Body() dto: IncidentUpdateDto, @Actor() actor: AdminActor) {
    return this.incidents.postUpdate(id, dto.status, dto.message, dto.public, actor);
  }

  @Post(':id/severity')
  severity(@Param('id') id: string, @Body() dto: SeverityDto, @Actor() actor: AdminActor) {
    return this.incidents.setSeverity(id, dto.severity, actor);
  }

  @Post(':id/commander')
  commander(@Param('id') id: string, @Body() dto: CommanderDto, @Actor() actor: AdminActor) {
    return this.incidents.setCommander(id, dto.commanderId, actor);
  }

  @Post(':id/components')
  component(@Param('id') id: string, @Body() dto: ComponentDto, @Actor() actor: AdminActor) {
    return this.incidents.toggleComponent(id, dto.component, actor);
  }

  @Post(':id/links')
  link(@Param('id') id: string, @Body() dto: LinkDto, @Actor() actor: AdminActor) {
    return this.incidents.addLink(id, { kind: dto.kind, label: dto.label.trim(), href: dto.href.trim() }, actor);
  }

  @Delete(':id/links/:index')
  unlink(@Param('id') id: string, @Param('index', ParseIntPipe) index: number, @Actor() actor: AdminActor) {
    return this.incidents.removeLink(id, index, actor);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string, @Body() dto: ReasonDto, @Actor() actor: AdminActor) {
    return this.incidents.reopen(id, dto.reason, actor);
  }

  @Post(':id/postmortem')
  postmortem(@Param('id') id: string, @Body() dto: PostmortemDto, @Actor() actor: AdminActor) {
    return this.incidents.savePostmortem(id, dto, actor);
  }
}

@Controller('admin/releases')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('platform.operate')
export class ReleasesController {
  constructor(private readonly releases: ReleasesService) {}

  @Get()
  list(@Query(QueryPipe) query: ReleaseQueryDto) {
    return this.releases.list(query);
  }

  @Post()
  create(@Body() dto: CreateReleaseDto, @Actor() actor: AdminActor) {
    return this.releases.create(dto, actor);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.releases.get(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.releases.remove(id, actor);
  }

  @Post(':id/checklist/:itemId')
  check(@Param('id') id: string, @Param('itemId') itemId: string, @Actor() actor: AdminActor) {
    return this.releases.toggleCheck(id, itemId, actor);
  }

  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body() dto: ScheduleDto, @Actor() actor: AdminActor) {
    return this.releases.schedule(id, dto.at, actor);
  }

  @Post(':id/unschedule')
  unschedule(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.releases.unschedule(id, actor);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.releases.start(id, actor);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.releases.pause(id, actor);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.releases.resume(id, actor);
  }

  @Post(':id/promote')
  promote(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.releases.promote(id, actor);
  }

  @Post(':id/rollback')
  rollback(@Param('id') id: string, @Body() dto: ReasonDto, @Actor() actor: AdminActor) {
    return this.releases.rollback(id, dto.reason, actor);
  }
}

@Controller('admin/audit/events')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('platform.operate')
export class PlatformAuditController {
  constructor(private readonly audit: PlatformAuditService) {}

  @Get()
  list(@Query(QueryPipe) query: PlatformAuditQueryDto) {
    return this.audit.list(query);
  }

  @Get('export')
  @Header('Cache-Control', 'no-store')
  async export(@Query(QueryPipe) query: PlatformAuditQueryDto, @Res() res: Response) {
    const file = await this.audit.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="elab-platform-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader('X-Export-Count', String(file.count));
    res.setHeader('X-Export-Truncated', String(file.truncated));
    res.send(file.csv);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.audit.get(id);
  }
}

@Controller()
@UseGuards(JwtAuthGuard)
export class LearnerOpsController {
  constructor(
    private readonly reports: ProblemReportsService,
    private readonly tickets: TechSupportService,
  ) {}

  @Post('problems/:slug/reports')
  report(@Param('slug') slug: string, @Body() dto: SubmitReportDto, @Actor() actor: AdminActor) {
    return this.reports.submit(actor.id, slug, dto);
  }

  @Post('support/technical')
  createTicket(@Body() dto: CreateTicketDto, @Actor() actor: AdminActor) {
    return this.tickets.create(actor.id, dto);
  }

  @Get('support/technical')
  myTickets(@Actor() actor: AdminActor) {
    return this.tickets.mine(actor.id);
  }

  @Get('support/technical/:id')
  myTicket(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.tickets.mineOne(actor.id, id);
  }

  @Post('support/technical/:id/reply')
  replyTicket(@Param('id') id: string, @Body() dto: TextDto, @Actor() actor: AdminActor) {
    return this.tickets.requesterReply(actor.id, id, dto.body);
  }

  @Post('support/technical/:id/rate')
  rate(@Param('id') id: string, @Body() dto: RateDto, @Actor() actor: AdminActor) {
    return this.tickets.rate(actor.id, id, dto.rating);
  }
}

@Controller()
export class PublicOpsController {
  constructor(
    private readonly incidents: IncidentsService,
    private readonly releases: ReleasesService,
  ) {}

  @Get('status')
  @Header('Cache-Control', 'public, max-age=30')
  status() {
    return this.incidents.publicStatus();
  }

  @Get('releases/notes')
  @Header('Cache-Control', 'public, max-age=300')
  notes() {
    return this.releases.notes();
  }
}