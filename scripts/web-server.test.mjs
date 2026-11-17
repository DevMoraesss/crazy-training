import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

async function listen(server) {
  server.listen(0, '0.0.0.0');
  await once(server, 'listening');
  return server.address().port;
}
async function freePort() {
  const server = createServer();
  const port = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function start(t, script, env) {
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, ...env },
  });
  const exited = once(child, 'exit');
  let output = '';
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  t.after(async () => {
    child.kill('SIGTERM');
    await exited;
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Servidor não iniciou: ${output}`)), 10000);
    child.stdout.on('data', () => {
      clearTimeout(timer);
      resolve();
    });
    child.once('exit', () => {
      clearTimeout(timer);
      reject(new Error(output));
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
async function checkPort(port) {
  const child = spawn(process.execPath, ['scripts/check-web-port.mjs'], {
    env: { ...process.env, WEB_PORT: String(port) },
  });
  let message = '';
  child.stderr.on('data', (chunk) => {
    message += chunk;
  });
  const [code] = await once(child, 'exit');
  return { code, message };
}
function isolation(response) {
  assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(response.headers.get('cross-origin-embedder-policy'), 'credentialless');
}

test('prévia envia isolamento no HTML, rotas e worker/WASM, sem cache antigo', async (t) => {
  // Build fictício isolado: o teste não usa nem altera dados ou builds pessoais.
  const fixture = await mkdtemp(join(tmpdir(), 'crazy-training-web-'));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  await mkdir(join(fixture, 'scripts'));
  const dist = join(fixture, 'apps/mobile/dist');
  await mkdir(dist, { recursive: true });
  for (const file of ['serve-web.mjs', 'api-proxy.cjs']) {
    await copyFile(new URL(file, import.meta.url), join(fixture, 'scripts', file));
  }
  await writeFile(join(dist, 'index.html'), '<!doctype html><title>Teste isolado</title>');
  await writeFile(join(dist, 'worker.js'), 'self.onmessage = () => {};');
  await writeFile(join(dist, 'sqlite.wasm'), new Uint8Array([0, 97, 115, 109]));
  const requests = [];
  const api = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({
      path: req.url,
      method: req.method,
      body: Buffer.concat(chunks).toString(),
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ configured: false }));
  });
  const apiPort = await listen(api);
  t.after(() => new Promise((resolve) => api.close(resolve)));
  const port = await freePort();
  await start(t, join(fixture, 'scripts/serve-web.mjs'), {
    WEB_PORT: String(port),
    API_PORT: String(apiPort),
  });
  const origin = `http://127.0.0.1:${port}`;
  for (const route of ['/', '/nutrition', '/session/test', '/worker.js', '/sqlite.wasm']) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200, route);
    isolation(response);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    if (route.endsWith('.wasm')) assert.equal(response.headers.get('content-type'), 'application/wasm');
    await response.arrayBuffer();
  }
  const head = await fetch(origin, { method: 'HEAD' });
  isolation(head);
  assert.equal(await head.text(), '');
  const missing = await fetch(`${origin}/missing.js`);
  assert.equal(missing.status, 404);
  isolation(missing);
  const method = await fetch(origin, { method: 'POST' });
  assert.equal(method.status, 405);
  const status = await fetch(`${origin}/api/food/status`);
  assert.equal(status.status, 200);
  await status.json();
  const analyzed = await fetch(`${origin}/api/food/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Teste' }),
  });
  assert.equal(analyzed.status, 200);
  await analyzed.json();
  assert.deepEqual(requests, [
    { path: '/food/status', method: 'GET', body: '' },
    { path: '/food/analyze', method: 'POST', body: '{"description":"Teste"}' },
  ]);
  const denied = await fetch(`${origin}/api/internal/private`);
  assert.equal(denied.status, 404);
});

test('proxy adiciona isolamento ao HTML do Expo mesmo quando o upstream não envia', async (t) => {
  const upstream = createServer((_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    });
    res.end('<title>Expo sem isolamento</title>');
  });
  const metroPort = await listen(upstream);
  t.after(() => new Promise((resolve) => upstream.close(resolve)));
  const port = await freePort();
  await start(t, 'scripts/proxy-web.mjs', {
    WEB_PROXY_PORT: String(port),
    METRO_PORT: String(metroPort),
  });
  const response = await fetch(`http://127.0.0.1:${port}/nutrition`);
  assert.equal(response.status, 200);
  isolation(response);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(await response.text(), /Expo sem isolamento/);
});

test('inicialização rejeita porta ocupada antes do build e orienta encerrar o Expo', async () => {
  const occupied = createServer();
  const port = await listen(occupied);
  try {
    const result = await checkPort(port);
    assert.equal(result.code, 1);
    assert.match(result.message, /já está ocupada/);
    assert.match(result.message, new RegExp(`WEB_PORT=${port} npm run dev:web`));
    assert.match(result.message, /npm run dev:expo/);
  } finally {
    await new Promise((resolve) => occupied.close(resolve));
  }
  assert.equal((await checkPort(port)).code, 0);
  for (const invalid of ['abc', '0', '65536', '8083.5']) {
    const result = await checkPort(invalid);
    assert.equal(result.code, 1);
    assert.match(result.message, /entre 1 e 65535/);
  }
});
