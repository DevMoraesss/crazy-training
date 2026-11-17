import { Module } from '@nestjs/common';

import { AiJobs } from './ai/ai-jobs.js';
import { AiModule } from './ai/ai.service.js';

import { CoachController } from './coach/coach.controller.js';
import { CoachService } from './coach/coach.service.js';

import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { CloudController } from './cloud/cloud.controller.js';

import { EnvModule } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { FoodController } from './food/food.controller.js';
import { FoodService } from './food/food.service.js';

@Module({
  imports: [EnvModule, DatabaseModule, AiModule],
  controllers: [HealthController, CoachController, AuthController, CloudController, FoodController],
  providers: [AiJobs, CoachService, AuthService, FoodService],
})
export class AppModule {}
