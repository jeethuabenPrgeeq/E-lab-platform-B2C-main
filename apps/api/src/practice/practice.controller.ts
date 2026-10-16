import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { RequirePermission } from '../admin/access/permission.decorator.js';
import { PermissionGuard } from '../admin/access/permission.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
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
  constructor(private readonly practiceService: PracticeService) {}

  @Post('drafts')
  @Roles('platform-admin')
  @RequirePermission('content.upload')
  saveDrafts(@Body() dto: SaveDraftsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.practiceService.saveDrafts(dto, user.id);
  }

  @Get('batches')
  listBatches() {
    return this.practiceService.listBatches();
  }
}
