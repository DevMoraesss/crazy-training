/** Nunca permitir que os testes alterem um banco pessoal ou um servidor remoto. */
export function nativeTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value)
    throw new Error(
      'Configure TEST_DATABASE_URL para um banco PostgreSQL nativo isolado, com nome terminado em _test.',
    );
  const url = new URL(value);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    [...url.searchParams.keys()].some((key) => !['sslmode', 'application_name'].includes(key)) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !decodeURIComponent(url.pathname).endsWith('_test')
  ) {
    throw new Error(
      'TEST_DATABASE_URL precisa apontar para localhost e um banco terminado em _test. Nenhum banco foi alterado.',
    );
  }
  return value;
}
