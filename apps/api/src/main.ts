import './load-env.js';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { ENV, type Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors({
    origin: ['http://localhost:8081', 'http://localhost:8083', 'http://127.0.0.1:8081', 'http://127.0.0.1:8083'],
  });
  await app.listen(app.get<Env>(ENV).PORT);
}
await bootstrap();
