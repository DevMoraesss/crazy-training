import './load-env.js';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { ENV, type Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(app.get<Env>(ENV).PORT);
}
await bootstrap();
