import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PracticeController } from './practice.controller.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}