import { Body, Controller, Get, Inject, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from '../auth/auth.service.js';
import { assertOrigin } from '../auth/origin.js';
import { ENV, type Env } from '../config/env.js';
import { CoachService } from './coach.service.js';

@Controller('coach')
export class CoachController {
  constructor(
    @Inject(CoachService) private readonly coach: CoachService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}
  private async authorize(request: Request) {
    assertOrigin(request, this.env);
    if (request.headers.cookie) return this.auth.current(request.headers.cookie);
    // Compatibilidade com o teste local sem conta. Nunca habilitado em produção.
    if (
      this.env.NODE_ENV !== 'production' &&
      ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')
    )
      return null;
    throw new UnauthorizedException('Entre na sua conta para usar o assistente.');
  }
  @Get('status')
  async status(@Req() request: Request) {
    await this.authorize(request);
    return { configured: this.coach.configured };
  }
  @Post('plan')
  async generate(@Req() request: Request, @Body() input: unknown) {
    await this.authorize(request);
    return this.coach.generate(input);
  }
}
