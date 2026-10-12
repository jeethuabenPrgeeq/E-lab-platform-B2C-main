import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import { QueryPipe } from '../common/pagination.js';
import { CatalogService } from './catalog.service.js';
import { ChallengesService } from './challenges.service.js';
import {
  CancelChallengeDto,
  CatalogQueryDto,
  CatalogTierDto,
  CatalogVisibilityDto,
  ChallengeInputDto,
  ChallengeQueryDto,
  CreatePathDto,
  ExtendChallengeDto,
  PathQueryDto,
  PathStatusDto,
  SavePathDto,
} from './content.dto.js';
import { PathsService } from './paths.service.js';

@Controller('super')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('content.view', 'content.edit')
export class ContentController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly paths: PathsService,
    private readonly challenges: ChallengesService,
  ) {}

  @Get('catalog')
  listCatalog(@Query(QueryPipe) query: CatalogQueryDto) {
    return this.catalog.list(query);
  }

  @Get('catalog/:id')
  getCatalog(@Param('id') id: string) {
    return this.catalog.get(id);
  }

  @Post('catalog/tier')
  setTier(@Body() dto: CatalogTierDto, @Actor() actor: AdminActor) {
    return this.catalog.setTier(dto, actor);
  }

  @RequirePermission('content.view', 'content.publish')
  @Post('catalog/visibility')
  setVisibility(@Body() dto: CatalogVisibilityDto, @Actor() actor: AdminActor) {
    return this.catalog.setVisibility(dto, actor);
  }

  @RequirePermission('content.view', 'content.publish')
  @Post('catalog/:id/feature')
  toggleFeatured(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.catalog.toggleFeatured(id, actor);
  }

  @Get('paths')
  listPaths(@Query(QueryPipe) query: PathQueryDto) {
    return this.paths.list(query);
  }

  @Get('paths/:id')
  getPath(@Param('id') id: string) {
    return this.paths.get(id);
  }

  @Post('paths')
  createPath(@Body() dto: CreatePathDto, @Actor() actor: AdminActor) {
    return this.paths.create(dto, actor);
  }

  @Patch('paths/:id')
  savePath(@Param('id') id: string, @Body() dto: SavePathDto, @Actor() actor: AdminActor) {
    return this.paths.save(id, dto, actor);
  }

  @RequirePermission('content.view', 'content.publish')
  @Post('paths/:id/publish')
  publishPath(@Param('id') id: string, @Body() dto: SavePathDto, @Actor() actor: AdminActor) {
    return this.paths.publish(id, dto, actor);
  }

  @RequirePermission('content.view', 'content.publish')
  @Post('paths/:id/status')
  pathStatus(@Param('id') id: string, @Body() dto: PathStatusDto, @Actor() actor: AdminActor) {
    return this.paths.setStatus(id, dto, actor);
  }

  @Post('paths/:id/duplicate')
  duplicatePath(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.paths.duplicate(id, actor);
  }

  @Delete('paths/:id')
  removePath(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.paths.remove(id, actor);
  }

  @Get('challenges')
  listChallenges(@Query(QueryPipe) query: ChallengeQueryDto) {
    return this.challenges.list(query);
  }

  @Get('challenges/:id')
  getChallenge(@Param('id') id: string) {
    return this.challenges.get(id);
  }

  @Post('challenges')
  createChallenge(@Body() dto: ChallengeInputDto, @Actor() actor: AdminActor) {
    return this.challenges.create(dto, actor);
  }

  @Patch('challenges/:id')
  editChallenge(@Param('id') id: string, @Body() dto: ChallengeInputDto, @Actor() actor: AdminActor) {
    return this.challenges.edit(id, dto, actor);
  }

  @Post('challenges/:id/unpublish')
  unpublishChallenge(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.challenges.unpublish(id, actor);
  }

  @Post('challenges/:id/extend')
  extendChallenge(@Param('id') id: string, @Body() dto: ExtendChallengeDto, @Actor() actor: AdminActor) {
    return this.challenges.extend(id, dto, actor);
  }

  @Post('challenges/:id/end')
  endChallenge(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.challenges.endNow(id, actor);
  }

  @Post('challenges/:id/cancel')
  cancelChallenge(@Param('id') id: string, @Body() dto: CancelChallengeDto, @Actor() actor: AdminActor) {
    return this.challenges.cancel(id, dto, actor);
  }

  @Post('challenges/:id/duplicate')
  duplicateChallenge(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.challenges.duplicate(id, actor);
  }

  @Delete('challenges/:id')
  removeChallenge(@Param('id') id: string, @Actor() actor: AdminActor) {
    return this.challenges.remove(id, actor);
  }
}