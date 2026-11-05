import './load-env.js';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { json } from 'express';
import { allowedOrigins } from './auth/origin.js';

import { ENV, type Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();
  app.use(json({ limit: '10mb' }));
  app.enableCors({
    origin: allowedOrigins(app.get<Env>(ENV)),
    credentials: true,
  });
  await app.listen(app.get<Env>(ENV).PORT);
}
await bootstrap();
