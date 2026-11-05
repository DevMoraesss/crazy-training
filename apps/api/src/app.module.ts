import { Module } from '@nestjs/common';

import { CoachController } from './coach/coach.controller.js';
import { CoachService } from './coach/coach.service.js';

import { EnvModule } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [EnvModule, DatabaseModule],
  controllers: [HealthController, CoachController],
  providers: [CoachService],
})
export class AppModule {}
