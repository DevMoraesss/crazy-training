import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

it('envia sessão apenas em cookie HttpOnly e Secure na produção', async () => {
  const auth = {
    login: vi.fn().mockResolvedValue({ token: 'secret-session', user: { id: 'id', email: 'user@example.test' } }),
  } as unknown as AuthService;
  const env = { NODE_ENV: 'production', WEB_ORIGINS: 'https://app.example.test' } as Env;
  const controller = new AuthController(auth, env);
  const cookie = vi.fn();
  const setHeader = vi.fn();
  const response = { cookie, setHeader } as unknown as Response;
  const req = { headers: { origin: 'https://app.example.test' }, socket: { remoteAddress: '127.0.0.1' } } as Request;
  const result = await controller.login(req, response, {});
  expect(result).toEqual({ id: 'id', email: 'user@example.test' });
  expect(JSON.stringify(result)).not.toContain('secret-session');
  expect(cookie).toHaveBeenCalledWith(
    'ct_session',
    'secret-session',
    expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax' }),
  );
});
it('bloqueia login iniciado por outra origem antes de consultar a senha', async () => {
  const login = vi.fn();
  const controller = new AuthController({ login } as unknown as AuthService, { NODE_ENV: 'test' } as Env);
  const req = { headers: { origin: 'https://attacker.example.test' }, socket: {} } as Request;
  await expect(controller.login(req, {} as Response, {})).rejects.toBeInstanceOf(ForbiddenException);
  expect(login).not.toHaveBeenCalled();
});
