import {
  Module,
} from '@nestjs/common';

import {
  ExecutionsController,
} from './executions.controller.js';

import {
  ExecutionsService,
} from './executions.service.js';

@Module({
  controllers: [
    ExecutionsController,
  ],

  providers: [
    ExecutionsService,
  ],

  exports: [
    ExecutionsService,
  ],
})
export class ExecutionsModule {}