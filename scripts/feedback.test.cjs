const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const vm = require('node:vm');
const mobileRequire = createRequire(require.resolve('@crazy-training/mobile/package.json'));
const ts = mobileRequire('typescript');

function load(file, dependencies = {}) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    require(name) {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
function fixture() {
  const store = load('apps/mobile/src/lib/feedback-store.ts');
  const dialogs = load('apps/mobile/src/lib/dialogs.ts', {
    './feedback-store': store,
    'react-native': {
      Platform: { OS: 'web' },
      Alert: {
        alert() {
          throw new Error('Web cannot use native alert');
        },
      },
    },
  });
  return { store, dialogs };
}

test('confirmar exige uma resposta explícita; cancelar retorna false', async () => {
  const { store, dialogs } = fixture();
  const pending = dialogs.confirm('Apagar?', 'Mensagem', 'Apagar', true);
  const active = store.getFeedback().dialogs[0];
  assert.equal(active.actions[0].style, 'destructive');
  store.respondToDialog(active.id, null);
  assert.equal(await pending, false);
  const next = dialogs.confirm('Apagar?', 'Mensagem', 'Apagar', true);
  store.respondToDialog(store.getFeedback().dialogs[0].id, 0);
  assert.equal(await next, true);
});
test('todas as escolhas aparecem juntas e retornam o valor correto', async () => {
  const { store, dialogs } = fixture();
  const pending = dialogs.choose('Encerrar?', 'Treino', [
    { label: 'Salvar', value: 'finish' },
    { label: 'Continuar depois', value: 'later' },
    { label: 'Descartar', value: 'discard', style: 'destructive' },
  ]);
  const active = store.getFeedback().dialogs[0];
  assert.equal(active.actions.length, 3);
  store.respondToDialog(active.id, 1);
  assert.equal(await pending, 'later');
});
test('fila, clique duplicado e desmontagem não confirmam ações indevidas', async () => {
  const { store, dialogs } = fixture();
  const first = dialogs.confirm('Primeiro', 'Mensagem', 'Confirmar');
  const id = store.getFeedback().dialogs[0].id;
  const second = dialogs.confirm('Segundo', 'Mensagem', 'Confirmar');
  store.respondToDialog(id, 0);
  store.respondToDialog(id, 0);
  assert.equal(await first, true);
  assert.equal(store.getFeedback().dialogs.length, 1);
  store.clearFeedback();
  assert.equal(await second, false);
});
test('avisos não bloqueiam, erros não expiram e duplicatas não se acumulam', () => {
  const { store, dialogs } = fixture();
  dialogs.notify('Confira o peso', 'Valor inválido');
  dialogs.notify('Confira o peso', 'Valor inválido');
  assert.equal(store.getFeedback().notices.length, 1);
  assert.equal(store.getFeedback().notices[0].duration, null);
  dialogs.notify('Salvo', undefined, { tone: 'success' });
  assert.equal(store.getFeedback().notices[1].duration, 6000);
  dialogs.notify('Outro erro');
  dialogs.notify('Mais um erro');
  assert.equal(store.getFeedback().notices.length, 4);
  assert.equal(store.getFeedback().dialogs.length, 0);
  store.dismissNotice(store.getFeedback().notices[0].id);
  assert.equal(store.getFeedback().notices.length, 3);
});
