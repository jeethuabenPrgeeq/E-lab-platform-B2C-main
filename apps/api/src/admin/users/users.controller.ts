import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserQueryDto,
  UserStatusDto,
} from './users.dto.js';
import { UsersService } from './users.service.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';

@Controller('super')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('users.view', 'users.manage')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('overview')
  overview() {
    return this.users.overview();
  }

  @Get('users')
  list(@Query(QueryPipe) query: UserQueryDto) {
    return this.users.list(query);
  }

  @Get('users/:id')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post('users')
  create(@Body() dto: CreateUserDto, @Actor() actor: AdminActor) {
    return this.users.create(dto, actor);
  }

  @Patch('users/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Actor() actor: AdminActor,
  ) {
    return this.users.update(id, dto, actor);
  }

  @RequirePermission('users.view', 'users.suspend')
  @Post('users/:id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UserStatusDto,
    @Actor() actor: AdminActor,
  ) {
    return this.users.setStatus(id, dto, actor);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @Actor() actor: AdminActor,
  ) {
    return this.users.resetPassword(id, dto, actor);
  }
}
