import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { JudgeModule } from '../judge/judge.module.js';
import { SubmissionsController } from './submissions.controller.js';
import { SubmissionsService } from './submissions.service.js';

@Module({
  imports: [AuthModule, JudgeModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}