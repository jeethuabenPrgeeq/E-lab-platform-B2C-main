import { Module } from '@nestjs/common';

import { JudgeGateway } from './judge-gateway.service.js';
import { JudgeSettingsService } from './judge-settings.service.js';

@Module({
  providers: [JudgeGateway, JudgeSettingsService],
  exports: [JudgeGateway, JudgeSettingsService],
})
export class JudgeModule {}