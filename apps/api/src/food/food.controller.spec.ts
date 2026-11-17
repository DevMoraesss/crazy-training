import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import type { AuthService } from '../auth/auth.service.js';
import type { FoodService } from './food.service.js';
import { FoodController } from './food.controller.js';

const env: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  DATABASE_URL: 'postgres://localhost/test',
};
const req = {
  headers: { origin: 'http://localhost:8083', cookie: 'session' },
} as Request;
const setHeader = vi.fn();
const res = { setHeader } as unknown as Response;
it('exige autenticação antes de analisar ou informar configuração', async () => {
  const analyze = vi.fn();
  const controller = new FoodController(
    {
      current: vi.fn().mockRejectedValue(new UnauthorizedException()),
    } as unknown as AuthService,
    { analyze } as unknown as FoodService,
    env,
  );
  await expect(controller.analyze(req, res, {})).rejects.toBeInstanceOf(UnauthorizedException);
  await expect(controller.status(req, res)).rejects.toBeInstanceOf(UnauthorizedException);
  expect(analyze).not.toHaveBeenCalled();
});
it('rejeita origem externa e usa identidade autenticada em vez de ID enviado no corpo', async () => {
  const analyze = vi.fn().mockResolvedValue({ status: 'clarification' });
  const controller = new FoodController(
    {
      current: vi.fn().mockResolvedValue({ id: 'owner' }),
    } as unknown as AuthService,
    { analyze, configured: false } as unknown as FoodService,
    env,
  );
  await expect(
    controller.analyze({ headers: { origin: 'https://outside.test' } } as Request, res, {}),
  ).rejects.toBeInstanceOf(ForbiddenException);
  const body = { userId: 'someone-else' };
  await controller.analyze(req, res, body);
  expect(analyze).toHaveBeenCalledWith('owner', body);
  await expect(controller.status(req, res)).resolves.toEqual({
    configured: false,
  });
  expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
});
