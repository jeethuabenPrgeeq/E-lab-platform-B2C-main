import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ExecutionsService, type ExecutionRequest } from './executions.service.js';

@Controller('executions')
@UseGuards(JwtAuthGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post('run')
  run(@Body() body: ExecutionRequest, @CurrentUser() user?: AuthenticatedUser) {
    return this.executionsService.run(body, user?.id ?? null);
  }
}