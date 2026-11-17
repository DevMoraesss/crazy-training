import { Module } from '@nestjs/common';

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
  imports: [EnvModule, DatabaseModule],
  controllers: [HealthController, CoachController, AuthController, CloudController, FoodController],
  providers: [CoachService, AuthService, FoodService],
})
export class AppModule {}
