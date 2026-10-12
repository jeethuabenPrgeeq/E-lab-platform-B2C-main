import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { SettingsService } from './settings.service.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';

export class UpdateSettingsDto {
  @IsObject() values!: Record<string, unknown>;
  @IsOptional() @IsBoolean() confirm?: boolean;
}

@Controller('super/settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('settings.manage')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  all() {
    return this.settings.all();
  }

  @Patch(':section')
  update(@Param('section') section: string, @Body() dto: UpdateSettingsDto, @Actor() actor: AdminActor) {
    return this.settings.update(section, dto.values, Boolean(dto.confirm), actor);
  }
}

@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  publicSettings() {
    return this.settings.publicSettings();
  }
}