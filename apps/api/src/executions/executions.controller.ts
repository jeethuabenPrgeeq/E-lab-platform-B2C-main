import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  ExecutionsService,
  type ExecutionRequest,
} from './executions.service.js';

@Controller('executions')
export class ExecutionsController {
  constructor(
    private readonly executionsService:
      ExecutionsService,
  ) {}

  @Post('run')
  run(
    @Body()
    body: ExecutionRequest,
  ) {
    return this.executionsService.run(
      body,
    );
  }
}