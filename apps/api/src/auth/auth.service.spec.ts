import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

import type { Env } from '../config/env.js';
import type { Database } from '../database/database.module.js';
import { AuthService } from './auth.service.js';
import { hashPassword } from './password.js';

const env: Env = { NODE_ENV: 'test', PORT: 3000, DATABASE_URL: 'postgres://localhost/test' };
function database() {
  const findFirst = vi.fn();
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn().mockResolvedValue(undefined);
  const selectWhere = vi.fn();
  const db = {
    query: { users: { findFirst } },
    insert: () => ({ values: insertValues }),
    delete: () => ({ where: remove }),
    select: () => ({ from: () => ({ innerJoin: () => ({ where: selectWhere }) }) }),
  } as unknown as Database;
  return { db, findFirst, insertValues, remove, selectWhere };
}

it('armazena apenas o hash do token da sessão e permite sair', async () => {
  const mocks = database();
  const auth = new AuthService(mocks.db, env);
  await auth.onModuleInit();
  mocks.findFirst.mockResolvedValue({
    id: 'user-1',
    email: 'user@example.test',
    passwordHash: await hashPassword('senha-ficticia'),
  });
  const result = await auth.login({ email: 'user@example.test', password: 'senha-ficticia' }, '127.0.0.1');
  expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const stored = mocks.insertValues.mock.calls[0]![0];
  expect(stored.userId).toBe('user-1');
  expect(stored.tokenHash).toBe(createHash('sha256').update(result.token).digest('hex'));
  expect(stored.tokenHash).not.toBe(result.token);
  mocks.selectWhere.mockResolvedValue([{ id: 'user-1', email: 'user@example.test' }]);
  await expect(auth.current(`ct_session=${result.token}`)).resolves.toEqual(result.user);
  await auth.logout(`ct_session=${result.token}`);
  expect(mocks.remove).toHaveBeenCalledTimes(2);
});
it('rejeita token ausente, malformado, expirado ou revogado', async () => {
  const mocks = database();
  const auth = new AuthService(mocks.db, env);
  for (const cookie of [undefined, 'ct_session=invalid'])
    await expect(auth.current(cookie)).rejects.toBeInstanceOf(UnauthorizedException);
  mocks.selectWhere.mockResolvedValue([]);
  await expect(auth.current(`ct_session=${'a'.repeat(43)}`)).rejects.toBeInstanceOf(UnauthorizedException);
});
it('limita tentativas de senha e não cria sessões em caso de falha', async () => {
  const mocks = database();
  const auth = new AuthService(mocks.db, env);
  await auth.onModuleInit();
  mocks.findFirst.mockResolvedValue(undefined);
  for (let i = 0; i < 10; i++)
    await expect(auth.login({ email: 'user@example.test', password: 'incorreta' }, '127.0.0.1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  await expect(auth.login({ email: 'user@example.test', password: 'incorreta' }, '127.0.0.1')).rejects.toMatchObject({
    status: 429,
  });
  expect(mocks.insertValues).not.toHaveBeenCalled();
});
