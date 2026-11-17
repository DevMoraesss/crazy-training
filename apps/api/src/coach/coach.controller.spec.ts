import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import type { Env } from '../config/env.js';
import type { AuthService } from '../auth/auth.service.js';
import { CoachController } from './coach.controller.js';
import type { CoachService } from './coach.service.js';

const request = (remoteAddress: string, origin?: string, cookie?: string) =>
  ({ socket: { remoteAddress }, headers: { origin, cookie } }) as Request;
const env: Env = { NODE_ENV: 'test', PORT: 3000, DATABASE_URL: 'postgres://localhost/test', AI_MODEL: 'test-model' };
it('exige conta para uso externo e rejeita origem não autorizada', async () => {
  const start = vi.fn().mockReturnValue({ id: 'job' });
  const current = vi.fn().mockResolvedValue({ id: 'user', email: 'user@example.test' });
  const controller = new CoachController(
    { start, configured: false } as unknown as CoachService,
    { current } as unknown as AuthService,
    env,
  );
  await expect(controller.start(request('192.168.1.5'), {})).rejects.toBeInstanceOf(UnauthorizedException);
  await expect(controller.start(request('127.0.0.1', 'https://external.test'), {})).rejects.toBeInstanceOf(
    ForbiddenException,
  );
  expect(start).not.toHaveBeenCalled();
  await expect(controller.status(request('127.0.0.1', 'http://localhost:8083'))).resolves.toEqual({
    configured: false,
  });
  await controller.start(request('192.168.1.5', 'http://localhost:8083', 'ct_session=valid'), {});
  expect(current).toHaveBeenCalled();
  expect(start).toHaveBeenCalledWith('user', {});
});
it('nunca permite uso sem conta em produção, mesmo em loopback', async () => {
  const controller = new CoachController({ configured: false } as CoachService, {} as AuthService, {
    ...env,
    NODE_ENV: 'production',
  });
  await expect(controller.status(request('127.0.0.1'))).rejects.toBeInstanceOf(UnauthorizedException);
});
