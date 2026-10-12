import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { AudienceQueryDto, CampaignInputDto, CampaignQueryDto, CancelCampaignDto } from './notifications.dto.js';
import { NotificationsService } from './notifications.service.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';

@Controller('super/notifications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('notifications.send')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('campaigns')
  list(@Query(QueryPipe) query: CampaignQueryDto) {
    return this.notifications.list(query);
  }

  @Get('audience')
  audience(@Query(QueryPipe) query: AudienceQueryDto) {
    return this.notifications.audienceSize(query.kind, query.value);
  }

  @Get('campaigns/:id')
  get(@Param('id') id: string) {
    return this.notifications.get(id);
  }

  @Post('campaigns')
  create(@Body() dto: CampaignInputDto, @Actor() actor: AdminActor) {
    return this.notifications.save(null, dto, actor);
  }

  @Patch('campaigns/:id')
  edit(@Param('id') id: string, @Body() dto: CampaignInputDto, @Actor() actor: AdminActor) {
    return this.notifications.save(id, dto, actor);
  }

  @Post('campaigns/:id/send')
  send(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.notifications.sendNow(id, actor);
  }

  @Post('campaigns/:id/unschedule')
  unschedule(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.notifications.unschedule(id, actor);
  }

  @Post('campaigns/:id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelCampaignDto, @Actor() actor: AdminActor) {
    return this.notifications.cancel(id, dto.reason, actor);
  }

  @Delete('campaigns/:id')
  remove(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.notifications.remove(id, actor);
  }

  @Get('automations')
  automations() {
    return this.notifications.automations();
  }

  @Post('automations/:id/toggle')
  toggle(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.notifications.toggleAutomation(id, actor);
  }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  mine(@Actor() actor: AdminActor) {
    return this.notifications.mine(actor.id);
  }

  @Post('read-all')
  readAll(@Actor() actor: AdminActor) {
    return this.notifications.markRead(actor.id, 'all');
  }

  @Post(':id/read')
  read(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.notifications.markRead(actor.id, id);
  }
}
