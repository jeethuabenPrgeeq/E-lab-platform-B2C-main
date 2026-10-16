import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { LearnerCatalogService } from './learner-catalog.service.js';
import { LearnerController } from './learner.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [LearnerController],
  providers: [LearnerCatalogService],
  exports: [LearnerCatalogService],
})
export class LearnerModule {}
