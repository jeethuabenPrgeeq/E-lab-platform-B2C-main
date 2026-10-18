import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { RequirePermission } from '../admin/access/permission.decorator.js';
import { PermissionGuard } from '../admin/access/permission.guard.js';
import { Actor, type AdminActor } from '../admin/common/admin-actor.decorator.js';
import { InstituteUploadService } from '../admin/institute-admin/institute-upload.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SaveDraftsDto } from './dto/save-drafts.dto.js';
import { PracticeService } from './practice.service.js';

@Controller('admin/practice')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin', 'super-admin')
@RequirePermission('content.view')
export class PracticeController {
  constructor(
    private readonly practiceService: PracticeService,
    private readonly uploads: InstituteUploadService,
  ) {}

  @Post('drafts')
  @Roles('platform-admin')
  @RequirePermission('content.upload')
  saveDrafts(@Body() dto: SaveDraftsDto, @Actor() actor: AdminActor) {
    return this.uploads.upload(dto, actor, null);
  }

  @Get('batches')
  listBatches() {
    return this.practiceService.listBatches();
  }
}