const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { dirname, join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const mobileRequire = createRequire(require.resolve('@crazy-training/mobile/package.json'));
const ts = mobileRequire('typescript');
const source = readFileSync(
  process.env.SQLITE_WORKER_CHANNEL ?? join(dirname(mobileRequire.resolve('expo-sqlite/package.json')), 'web/WorkerChannel.ts'),
  'utf8',
);
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function channel({ pause, replyAfter, step = 0.0001 }) {
  let now = 0;
  const atomics = {
    store() {},
    load() { now += step; return now >= replyAfter ? 2 : 1; },
    ...(pause ? { pause() {} } : {}),
  };
  const context = {
    exports: {},
    require(name) {
      if (name === './SyncSerializer') return { serialize: JSON.stringify, deserialize: JSON.parse };
      if (name === './Deferred') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
    performance: { now: () => now },
    Atomics: atomics,
    SharedArrayBuffer, Int32Array, Uint32Array, Uint8Array, TextEncoder, TextDecoder,
    __DEV__: false,
  };
  vm.runInNewContext(compiled, context);
  const worker = {
    postMessage({ resultBuffer }) {
      const bytes = new TextEncoder().encode(JSON.stringify({ result: { changes: 1 } }));
      new Uint32Array(resultBuffer, 0, 1)[0] = bytes.length;
      new Uint8Array(resultBuffer).set(bytes, 4);
    },
  };
  return { run: () => context.exports.invokeWorkerSync(worker, 'run', {}), time: () => now };
}

test('a valid delayed write completes with Atomics.pause available', () => {
  const delayed = channel({ pause: true, replyAfter: 250 });
  assert.equal(delayed.run().changes, 1);
  assert.ok(delayed.time() >= 250);
});

test('the same delayed response works without Atomics.pause', () => {
  const delayed = channel({ pause: false, replyAfter: 250 });
  assert.equal(delayed.run().changes, 1);
});

test('an unresponsive worker still times out after a bounded real-time budget', () => {
  for (const pause of [true, false]) {
    const stalled = channel({ pause, replyAfter: Infinity, step: 0.01 });
    assert.throws(stalled.run, /Sync operation timeout/);
    assert.ok(stalled.time() >= 15_000);
    assert.ok(stalled.time() < 15_050);
  }
});
