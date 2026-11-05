import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import apiProxy from './api-proxy.cjs';

const root = fileURLToPath(new URL('../apps/mobile/dist/', import.meta.url));
const port = Number(process.env.WEB_PORT ?? 8081);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

try {
  await stat(resolve(root, 'index.html'));
} catch {
  console.error('Build web ausente. Execute npm run build:web primeiro.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/api/')) {
    apiProxy.proxyApi(
      req,
      res,
      `http://127.0.0.1:${process.env.API_PORT ?? 3000}`,
      new URL(req.url, 'http://localhost').pathname.slice(4),
    );
    return;
  }
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (!file.startsWith(root.endsWith(sep) ? root : `${root}${sep}`) && file !== resolve(root)) {
      res.writeHead(403).end();
      return;
    }
    if (pathname.endsWith('/')) file = resolve(file, 'index.html');
    let info;
    try {
      info = await stat(file);
      if (!info.isFile()) throw new Error('Not a file');
    } catch {
      // Rotas do Expo Router usam o mesmo HTML; assets ausentes devem retornar 404.
      if (extname(pathname) || pathname.startsWith('/_expo/') || pathname.startsWith('/assets/')) {
        res.writeHead(404).end();
        return;
      }
      file = resolve(root, 'index.html');
      info = await stat(file);
    }
    res.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size,
    });
    if (req.method === 'HEAD') res.end();
    else
      createReadStream(file)
        .on('error', () => res.destroy())
        .pipe(res);
  } catch {
    res.writeHead(400).end();
  }
});

server.on('error', (error) => {
  console.error(`Não foi possível iniciar o servidor web: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => {
  console.log(`Crazy Training: http://localhost:${port}`);
  console.log('Prévia local do build. Após editar o app, gere o build novamente.');
});
