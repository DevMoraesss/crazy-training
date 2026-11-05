import { Module } from '@nestjs/common';

import { CoachController } from './coach/coach.controller.js';
import { CoachService } from './coach/coach.service.js';

import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { CloudController } from './cloud/cloud.controller.js';

import { EnvModule } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [EnvModule, DatabaseModule],
  controllers: [HealthController, CoachController, AuthController, CloudController],
  providers: [CoachService, AuthService],
})
export class AppModule {}
