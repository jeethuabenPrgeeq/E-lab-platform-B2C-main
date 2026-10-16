import { Module } from '@nestjs/common';

import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ExecutionsModule } from './executions/executions.module.js';
import { LearnerModule } from './learner/learner.module.js';
import { PracticeModule } from './practice/practice.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SubmissionsModule } from './submissions/submissions.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PracticeModule,
    ExecutionsModule,
    SubmissionsModule,
    LearnerModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
