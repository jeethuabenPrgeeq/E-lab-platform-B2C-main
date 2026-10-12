import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { AssignDto, CreateTicketDto, EscalateDto, NoteDto, ReplyDto, TicketPriorityDto, TicketQueryDto, TicketStatusDto } from './support.dto.js';
import { SupportService } from './support.service.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';

@Controller('super/support')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('support.respond')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  list(@Query(QueryPipe) query: TicketQueryDto, @Actor() actor: AdminActor) {
    return this.support.list(query, actor);
  }

  @Get('agents')
  agents() {
    return this.support.agents();
  }

  @Get('tickets/:id')
  get(@Param('id') id: string) {
    return this.support.get(id);
  }

  @Post('tickets/:id/reply')
  reply(@Param('id') id: string, @Body() dto: ReplyDto, @Actor() actor: AdminActor) {
    return this.support.reply(id, dto, actor);
  }

  @Post('tickets/:id/note')
  note(@Param('id') id: string, @Body() dto: NoteDto, @Actor() actor: AdminActor) {
    return this.support.note(id, dto.body, actor);
  }

  @Post('tickets/:id/status')
  status(@Param('id') id: string, @Body() dto: TicketStatusDto, @Actor() actor: AdminActor) {
    return this.support.setStatus(id, dto.status, actor);
  }

  @Post('tickets/:id/priority')
  priority(@Param('id') id: string, @Body() dto: TicketPriorityDto, @Actor() actor: AdminActor) {
    return this.support.setPriority(id, dto.priority, actor);
  }

  @Post('tickets/:id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignDto, @Actor() actor: AdminActor) {
    return this.support.assign(id, dto, actor);
  }
}

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform-admin')
export class EscalationController {
  constructor(private readonly support: SupportService) {}

  @Post('escalations')
  escalate(@Body() dto: EscalateDto, @Actor() actor: AdminActor) {
    return this.support.escalate(dto, actor);
  }
}

@Controller('support')
@UseGuards(JwtAuthGuard)
export class HelpdeskController {
  constructor(private readonly support: SupportService) {}

  @Post('tickets')
  create(@Body() dto: CreateTicketDto, @Actor() actor: AdminActor) {
    return this.support.createForUser(actor.id, dto);
  }
}