import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DATABASE } from '../database/database.module.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const execute = vi.fn();
  let controller: HealthController;

  beforeEach(async () => {
    execute.mockReset();
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DATABASE, useValue: { execute } }],
    }).compile();
    controller = module.get(HealthController);
  });

  it('responde ok quando o banco responde', async () => {
    execute.mockResolvedValue({ rows: [] });
    await expect(controller.check()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('responde 503 quando o banco está fora', async () => {
    execute.mockRejectedValue(new Error('connection refused'));
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
