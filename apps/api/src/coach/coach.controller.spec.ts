import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';

import { CoachController } from './coach.controller.js';
import type { CoachService } from './coach.service.js';

it('impede que clientes externos usem a integração local de IA', () => {
  const generate = vi.fn();
  const controller = new CoachController({ generate, configured: false } as unknown as CoachService);
  const request = (remoteAddress: string, origin?: string) =>
    ({ socket: { remoteAddress }, headers: { origin } }) as Request;
  expect(() => controller.generate(request('192.168.1.5'), {})).toThrow(ForbiddenException);
  expect(() => controller.generate(request('127.0.0.1', 'https://external.test'), {})).toThrow(ForbiddenException);
  expect(generate).not.toHaveBeenCalled();
  expect(controller.status(request('127.0.0.1', 'http://localhost:8083'))).toEqual({ configured: false });
});
