import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { InstitutionId, RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { Actor, type AdminActor } from '../common/admin-actor.decorator.js';
import {
  CreateSourceCheckDto,
  CreateTestCaseDto,
  ReasonDto,
  ReorderTestCasesDto,
  UpdateSourceCheckDto,
  UpdateTestCaseDto,
} from './test-cases.dto.js';
import { TestCasesService } from './test-cases.service.js';

@Controller('institute')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('institute-admin')
@RequirePermission('inst.tests.manage')
export class InstituteTestCasesController {
  constructor(private readonly tests: TestCasesService) {}

  @Get('test-cases/overview')
  overview(@InstitutionId() organizationId: string) {
    return this.tests.overview(organizationId);
  }

  @Get('problems/:problemId/test-cases')
  list(@Param('problemId') problemId: string, @InstitutionId() organizationId: string) {
    return this.tests.list(problemId, organizationId);
  }

  @Post('problems/:problemId/test-cases')
  create(
    @Param('problemId') problemId: string,
    @Body() dto: CreateTestCaseDto,
    @Actor() actor: AdminActor,
    @InstitutionId() organizationId: string,
  ) {
    return this.tests.create(problemId, dto, actor, organizationId);
  }

  @Post('problems/:problemId/test-cases/reorder')
  @HttpCode(200)
  reorder(
    @Param('problemId') problemId: string,
    @Body() dto: ReorderTestCasesDto,
    @Actor() actor: AdminActor,
    @InstitutionId() organizationId: string,
  ) {
    return this.tests.reorder(problemId, dto, actor, organizationId);
  }

  @Patch('test-cases/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTestCaseDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.tests.update(id, dto, actor, organizationId);
  }

  @Post('test-cases/:id/duplicate')
  duplicate(@Param('id') id: string, @Body() dto: ReasonDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.tests.duplicate(id, dto.reason, actor, organizationId);
  }

  @Delete('test-cases/:id')
  remove(@Param('id') id: string, @Body() dto: ReasonDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.tests.remove(id, dto.reason, actor, organizationId);
  }

  @Post('problems/:problemId/source-checks')
  createCheck(
    @Param('problemId') problemId: string,
    @Body() dto: CreateSourceCheckDto,
    @Actor() actor: AdminActor,
    @InstitutionId() organizationId: string,
  ) {
    return this.tests.createCheck(problemId, dto, actor, organizationId);
  }

  @Patch('source-checks/:id')
  updateCheck(@Param('id') id: string, @Body() dto: UpdateSourceCheckDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.tests.updateCheck(id, dto, actor, organizationId);
  }

  @Delete('source-checks/:id')
  removeCheck(@Param('id') id: string, @Body() dto: ReasonDto, @Actor() actor: AdminActor, @InstitutionId() organizationId: string) {
    return this.tests.removeCheck(id, dto.reason, actor, organizationId);
  }
}
