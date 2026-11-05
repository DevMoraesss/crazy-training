import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import type { Env } from '../config/env.js';

export function allowedOrigins(env: Env) {
  return (
    env.WEB_ORIGINS?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? [
      'http://localhost:8081',
      'http://localhost:8083',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:8083',
    ]
  );
}
export function assertOrigin(request: Request, env: Env) {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins(env).includes(origin)) throw new ForbiddenException('Origem não autorizada.');
  if (!origin && request.headers['sec-fetch-site'] === 'cross-site')
    throw new ForbiddenException('Origem não autorizada.');
}
