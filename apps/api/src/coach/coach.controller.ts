import { Body, Controller, ForbiddenException, Get, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CoachService } from './coach.service.js';

/** Integração local. Liberar acesso externo requer autenticação antes do deploy. */
@Controller('coach')
export class CoachController {
  constructor(@Inject(CoachService) private readonly coach: CoachService) {}
  private assertLocal(request: Request) {
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')) {
      throw new ForbiddenException('O assistente está disponível apenas para teste local.');
    }
    const origin = request.headers.origin;
    if (
      origin &&
      !['http://localhost:8081', 'http://localhost:8083', 'http://127.0.0.1:8081', 'http://127.0.0.1:8083'].includes(
        origin,
      )
    ) {
      throw new ForbiddenException('Abra o app pelo endereço local configurado.');
    }
  }
  @Get('status')
  status(@Req() request: Request) {
    this.assertLocal(request);
    return { configured: this.coach.configured };
  }
  @Post('plan')
  generate(@Req() request: Request, @Body() input: unknown) {
    this.assertLocal(request);
    return this.coach.generate(input);
  }
}
