import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import type { Env } from '../config/env.js';
import type { Database } from '../database/database.module.js';
import { CloudController } from './cloud.controller.js';

const snapshot = {
  version: 1,
  profile: null,
  programs: [],
  sessions: [],
  sessionSets: [],
  mealTemplates: [],
  mealEntries: [],
  nutritionTargets: null,
  activities: [],
  coachSetup: null,
};
const env: Env = { NODE_ENV: 'test', PORT: 3000, DATABASE_URL: 'postgres://localhost/test' };
const req = { headers: { origin: 'http://localhost:8083', cookie: 'test' } } as Request;
const res = { setHeader: vi.fn() } as unknown as Response;

it('isola leituras pela identidade da sessão e retorna conta sem dados', async () => {
  const findFirst = vi.fn().mockResolvedValue(undefined);
  const controller = new CloudController(
    { current: vi.fn().mockResolvedValue({ id: 'owner' }) } as unknown as AuthService,
    { query: { cloudSnapshots: { findFirst } } } as unknown as Database,
    env,
  );
  await expect(controller.read(req, res)).resolves.toEqual({ revision: 0, snapshot: null, updatedAt: null });
  expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
});
it('detecta conflito atômico e não tenta novamente sobrescrevendo dados', async () => {
  const returning = vi.fn().mockResolvedValue([]);
  const update = vi.fn().mockReturnValue({ set: () => ({ where: () => ({ returning }) }) });
  const controller = new CloudController(
    { current: vi.fn().mockResolvedValue({ id: 'owner' }) } as unknown as AuthService,
    { update } as unknown as Database,
    env,
  );
  await expect(controller.write(req, res, { revision: 3, snapshot })).rejects.toBeInstanceOf(ConflictException);
  expect(update).toHaveBeenCalledOnce();
});
it('rejeita snapshots inválidos antes de gravar', async () => {
  const update = vi.fn();
  const controller = new CloudController(
    { current: vi.fn().mockResolvedValue({ id: 'owner' }) } as unknown as AuthService,
    { update } as unknown as Database,
    env,
  );
  await expect(controller.write(req, res, { revision: 1, snapshot: {} })).rejects.toBeInstanceOf(BadRequestException);
  expect(update).not.toHaveBeenCalled();
});
