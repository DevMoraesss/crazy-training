import { checkPassword, hashPassword } from './password.js';

it('gera hashes com sal e verifica senhas sem armazenar o texto original', async () => {
  const first = await hashPassword('senha-ficticia-de-teste');
  const second = await hashPassword('senha-ficticia-de-teste');
  expect(first).not.toEqual(second);
  expect(first).not.toContain('senha-ficticia');
  expect(await checkPassword('senha-ficticia-de-teste', first)).toBe(true);
  expect(await checkPassword('outra-senha', first)).toBe(false);
  expect(await checkPassword('outra-senha', 'hash-invalido')).toBe(false);
});
