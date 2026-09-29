import { Module } from '@nestjs/common';

import { EnvModule } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [EnvModule, DatabaseModule],
  controllers: [HealthController],
})
export class AppModule {}
