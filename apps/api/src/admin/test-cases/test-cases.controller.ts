import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Granted, RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import type { Permission } from '../access/permissions.js';
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

const HIDDEN_DENIED = 'Your role does not include "tests.hidden".';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('platform-admin')
@RequirePermission('tests.manage')
export class TestCasesController {
  constructor(private readonly tests: TestCasesService) {}

  private async assertHiddenAccess(granted: ReadonlySet<Permission>, id: string | null, makesHidden?: boolean) {
    if (granted.has('tests.hidden')) return;
    if (makesHidden === true || (id !== null && (await this.tests.isHidden(id)))) throw new ForbiddenException(HIDDEN_DENIED);
  }

  @Get('test-cases/overview')
  overview() {
    return this.tests.overview();
  }

  @Get('problems/:problemId/test-cases')
  async list(@Param('problemId') problemId: string, @Granted() granted: ReadonlySet<Permission>) {
    const result = await this.tests.list(problemId);
    if (granted.has('tests.hidden')) return result;
    return {
      ...result,
      testCases: result.testCases.map((test) => (test.hidden ? { ...test, input: null, expectedOutput: '', redacted: true } : test)),
    };
  }

  @Post('problems/:problemId/test-cases')
  async create(
    @Param('problemId') problemId: string,
    @Body() dto: CreateTestCaseDto,
    @Actor() actor: AdminActor,
    @Granted() granted: ReadonlySet<Permission>,
  ) {
    await this.assertHiddenAccess(granted, null, dto.hidden);
    return this.tests.create(problemId, dto, actor);
  }

  @Post('problems/:problemId/test-cases/reorder')
  @HttpCode(200)
  reorder(
    @Param('problemId') problemId: string,
    @Body() dto: ReorderTestCasesDto,
    @Actor() actor: AdminActor,
  ) {
    return this.tests.reorder(problemId, dto, actor);
  }

  @Patch('test-cases/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
    @Actor() actor: AdminActor,
    @Granted() granted: ReadonlySet<Permission>,
  ) {
    await this.assertHiddenAccess(granted, id, dto.hidden);
    return this.tests.update(id, dto, actor);
  }

  @Post('test-cases/:id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Actor() actor: AdminActor,
    @Granted() granted: ReadonlySet<Permission>,
  ) {
    await this.assertHiddenAccess(granted, id);
    return this.tests.duplicate(id, dto.reason, actor);
  }

  @Delete('test-cases/:id')
  async remove(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Actor() actor: AdminActor,
    @Granted() granted: ReadonlySet<Permission>,
  ) {
    await this.assertHiddenAccess(granted, id);
    return this.tests.remove(id, dto.reason, actor);
  }

  @Post('problems/:problemId/source-checks')
  createCheck(
    @Param('problemId') problemId: string,
    @Body() dto: CreateSourceCheckDto,
    @Actor() actor: AdminActor,
  ) {
    return this.tests.createCheck(problemId, dto, actor);
  }

  @Patch('source-checks/:id')
  updateCheck(
    @Param('id') id: string,
    @Body() dto: UpdateSourceCheckDto,
    @Actor() actor: AdminActor,
  ) {
    return this.tests.updateCheck(id, dto, actor);
  }

  @Delete('source-checks/:id')
  removeCheck(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Actor() actor: AdminActor,
  ) {
    return this.tests.removeCheck(id, dto.reason, actor);
  }
}
