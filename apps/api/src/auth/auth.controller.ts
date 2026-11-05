import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ENV, type Env } from '../config/env.js';
import { AuthService, COOKIE_NAME, SESSION_MS } from './auth.service.js';
import { assertOrigin } from './origin.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}
  @Post('login')
  async login(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    assertOrigin(request, this.env);
    const result = await this.auth.login(body, request.socket.remoteAddress ?? 'unknown');
    response.cookie(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MS,
    });
    response.setHeader('Cache-Control', 'no-store');
    return result.user;
  }
  @Get('me')
  async me(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    assertOrigin(request, this.env);
    response.setHeader('Cache-Control', 'no-store');
    return this.auth.current(request.headers.cookie);
  }
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    assertOrigin(request, this.env);
    await this.auth.logout(request.headers.cookie);
    response.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { ok: true };
  }
}
