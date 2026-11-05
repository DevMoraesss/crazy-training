import { nativeTestDatabaseUrl } from './native-database.js';

afterEach(() => vi.unstubAllEnvs());
it('exige um banco nativo explicitamente dedicado a testes', () => {
  for (const value of [
    '',
    'postgres://localhost/crazy_training',
    'postgres://remote.example.test/crazy_test',
    'postgres://localhost/crazy_test?host=remote.example.test',
    'postgres://localhost/crazy_test?database=personal',
    'https://localhost/crazy_test',
  ]) {
    vi.stubEnv('TEST_DATABASE_URL', value);
    expect(nativeTestDatabaseUrl).toThrow();
  }
});
it('aceita apenas banco local de testes, sem depender do DATABASE_URL pessoal', () => {
  vi.stubEnv('DATABASE_URL', 'postgres://remote.example.test/personal');
  vi.stubEnv('TEST_DATABASE_URL', 'postgres://127.0.0.1/crazy_training_test?sslmode=disable');
  expect(nativeTestDatabaseUrl()).toBe('postgres://127.0.0.1/crazy_training_test?sslmode=disable');
});
