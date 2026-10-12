import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SaveDraftsDto } from './dto/save-drafts.dto.js';
import { PracticeService } from './practice.service.js';

@Controller('admin/practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform-admin', 'super-admin')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Post('drafts')
  saveDrafts(@Body() dto: SaveDraftsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.practiceService.saveDrafts(dto, user.id);
  }

  @Get('batches')
  listBatches() {
    return this.practiceService.listBatches();
  }
}