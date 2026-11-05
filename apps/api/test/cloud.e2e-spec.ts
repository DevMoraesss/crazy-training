import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/auth/password.js';
import { ENV } from '../src/config/env.js';
import * as schema from '../src/database/schema.js';
import { nativeTestDatabaseUrl } from './native-database.js';

// Sem TEST_DATABASE_URL, não tocar no DATABASE_URL do desenvolvimento.
describe.skipIf(!process.env.TEST_DATABASE_URL)('conta e sincronização — PostgreSQL nativo', () => {
  let app: INestApplication;
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let cookieA: string;
  let cookieB: string;
  const emailA = `integration-${randomUUID()}@example.test`;
  const emailB = `integration-${randomUUID()}@example.test`;
  const password = 'senha-ficticia-exclusiva-dos-testes';
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

  beforeAll(async () => {
    const url = nativeTestDatabaseUrl();
    pool = new pg.Pool({ connectionString: url });
    db = drizzle({ client: pool, schema });
    await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle/', import.meta.url)) });
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENV)
      .useValue({ NODE_ENV: 'test', PORT: 3000, DATABASE_URL: url, ACCOUNT_EMAIL: emailA, ACCOUNT_PASSWORD: password })
      .compile();
    app = fixture.createNestApplication();
    await app.init();
    await db
      .insert(schema.users)
      .values({ id: randomUUID(), email: emailB, passwordHash: await hashPassword(password) });
    const a = await request(app.getHttpServer()).post('/auth/login').send({ email: emailA, password }).expect(201);
    const b = await request(app.getHttpServer()).post('/auth/login').send({ email: emailB, password }).expect(201);
    cookieA = (a.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    cookieB = (b.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  });
  afterAll(async () => {
    if (db) await db.delete(schema.users).where(inArray(schema.users.email, [emailA, emailB]));
    if (app) await app.close();
    if (pool) await pool.end();
  });
  it('identifica o usuário sem expor hash ou token no JSON', async () => {
    const me = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookieA).expect(200);
    expect(me.body.email).toBe(emailA);
    expect(Object.keys(me.body).sort()).toEqual(['email', 'id']);
  });
  it('persiste a primeira revisão e mantém os dados isolados por conta', async () => {
    await request(app.getHttpServer())
      .put('/cloud/snapshot')
      .set('Cookie', cookieA)
      .send({ revision: 0, snapshot })
      .expect(200);
    const a = await request(app.getHttpServer()).get('/cloud/snapshot').set('Cookie', cookieA).expect(200);
    const b = await request(app.getHttpServer()).get('/cloud/snapshot').set('Cookie', cookieB).expect(200);
    expect(a.body.revision).toBe(1);
    expect(a.body.snapshot).toEqual(snapshot);
    expect(b.body).toEqual({ revision: 0, snapshot: null, updatedAt: null });
  });
  it('retorna 409 para uma gravação antiga sem sobrescrever a revisão atual', async () => {
    await request(app.getHttpServer())
      .put('/cloud/snapshot')
      .set('Cookie', cookieA)
      .send({ revision: 0, snapshot })
      .expect(409);
    const a = await request(app.getHttpServer()).get('/cloud/snapshot').set('Cookie', cookieA).expect(200);
    expect(a.body.revision).toBe(1);
  });
  it('revoga a sessão no logout', async () => {
    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookieB).expect(201);
    await request(app.getHttpServer()).get('/cloud/snapshot').set('Cookie', cookieB).expect(401);
  });
  it('não aceita sessão expirada', async () => {
    const user = await db.query.users.findFirst({ where: eq(schema.users.email, emailA) });
    await db
      .update(schema.authSessions)
      .set({ expiresAt: new Date(0) })
      .where(eq(schema.authSessions.userId, user!.id));
    await request(app.getHttpServer()).get('/cloud/snapshot').set('Cookie', cookieA).expect(401);
  });
});
