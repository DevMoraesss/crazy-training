import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';

import { ENV } from '../src/config/env.js';
import { nativeTestDatabaseUrl } from './native-database.js';

import { AppModule } from './../src/app.module.js';

// Usa o PostgreSQL nativo em um banco isolado de testes, com as migrações aplicadas. Não usar Docker.
describe.skipIf(!process.env.TEST_DATABASE_URL)('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ENV)
      .useValue({ NODE_ENV: 'test', PORT: 3000, DATABASE_URL: nativeTestDatabaseUrl() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /health', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok', database: 'up' });
  });

  afterAll(async () => {
    await app.close();
  });
});
