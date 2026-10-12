import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PracticeController } from './practice.controller.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}