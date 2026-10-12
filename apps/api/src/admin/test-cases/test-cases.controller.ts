import {
  Body,
  Controller,
  Delete,
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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform-admin')
export class TestCasesController {
  constructor(private readonly tests: TestCasesService) {}

  @Get('test-cases/overview')
  overview() {
    return this.tests.overview();
  }

  @Get('problems/:problemId/test-cases')
  list(@Param('problemId') problemId: string) {
    return this.tests.list(problemId);
  }

  @Post('problems/:problemId/test-cases')
  create(
    @Param('problemId') problemId: string,
    @Body() dto: CreateTestCaseDto,
    @Actor() actor: AdminActor,
  ) {
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
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
    @Actor() actor: AdminActor,
  ) {
    return this.tests.update(id, dto, actor);
  }

  @Post('test-cases/:id/duplicate')
  duplicate(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Actor() actor: AdminActor,
  ) {
    return this.tests.duplicate(id, dto.reason, actor);
  }

  @Delete('test-cases/:id')
  remove(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Actor() actor: AdminActor,
  ) {
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
