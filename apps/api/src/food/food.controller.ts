import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service.js';
import { assertOrigin } from '../auth/origin.js';
import { ENV, type Env } from '../config/env.js';
import { FoodService } from './food.service.js';

@Controller('food')
export class FoodController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(FoodService) private readonly food: FoodService,
    @Inject(ENV) private readonly env: Env,
  ) {}
  @Get('status')
  async status(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    assertOrigin(request, this.env);
    await this.auth.current(request.headers.cookie);
    response.setHeader('Cache-Control', 'no-store');
    return { configured: this.food.configured };
  }
  @Post('analyze')
  async analyze(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: unknown,
  ) {
    assertOrigin(request, this.env);
    const user = await this.auth.current(request.headers.cookie);
    response.setHeader('Cache-Control', 'no-store');
    return this.food.analyze(user.id, input);
  }
}
