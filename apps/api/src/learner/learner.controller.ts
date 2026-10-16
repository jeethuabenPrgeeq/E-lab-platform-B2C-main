import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { LearnerCatalogService } from './learner-catalog.service.js';

@Controller('learner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class LearnerController {
  constructor(private readonly catalog: LearnerCatalogService) {}

  @Get('progress')
  async progress(@CurrentUser() user: AuthenticatedUser) {
    return { solved: await this.catalog.solvedSlugs(user.id) };
  }

  @Get('batches')
  batches(@CurrentUser() user: AuthenticatedUser) {
    return this.catalog.batches(user.id);
  }

  @Get('problems')
  list(@CurrentUser() user: AuthenticatedUser, @Query('technology') technology?: string) {
    return this.catalog.list(user.id, typeof technology === 'string' && technology ? technology.slice(0, 60) : undefined);
  }

  @Get('problems/:slug')
  get(@CurrentUser() user: AuthenticatedUser, @Param('slug') slug: string) {
    return this.catalog.get(user.id, slug);
  }
}
