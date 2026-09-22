import {
  Module,
} from '@nestjs/common';

import {
  ExecutionsModule,
} from './executions/executions.module.js';

import {
  SubmissionsModule,
} from './submissions/submissions.module.js';

@Module({
  imports: [
    ExecutionsModule,
    SubmissionsModule,
  ],

  controllers: [],

  providers: [],
})
export class AppModule {}