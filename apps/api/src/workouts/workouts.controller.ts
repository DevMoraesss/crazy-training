import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service.js';
import { assertOrigin } from '../auth/origin.js';
import { ENV, type Env } from '../config/env.js';
import { WorkoutImportService } from './workout-import.service.js';

@Controller('workouts')
export class WorkoutsController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(WorkoutImportService) private readonly imports: WorkoutImportService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private async user(request: Request, response: Response) {
    assertOrigin(request, this.env);
    response.setHeader('Cache-Control', 'no-store');
    return this.auth.current(request.headers.cookie);
  }

  /** Começa a ler a ficha em PDF. O app consulta o resultado em GET /workouts/import/:id. */
  @Post('import')
  @HttpCode(202)
  async start(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() input: unknown) {
    const user = await this.user(request, response);
    return this.imports.start(user.id, input);
  }

  @Get('import/:id')
  async job(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = await this.user(request, response);
    return this.imports.job(user.id, id);
  }
}
