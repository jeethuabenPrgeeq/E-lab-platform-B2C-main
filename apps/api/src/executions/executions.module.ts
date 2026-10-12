import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { JudgeModule } from '../judge/judge.module.js';
import { ExecutionsController } from './executions.controller.js';
import { ExecutionsService } from './executions.service.js';

@Module({
  imports: [AuthModule, JudgeModule],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}