const { request: httpRequest } = require('node:http');
const { request: httpsRequest } = require('node:https');

// O navegador usa /api na mesma origem: cookies funcionam também no Safari do iPhone.
function proxyApi(req, res, upstreamUrl, pathname) {
  if (!/^\/(?:auth\/(?:login|logout|me)|cloud\/snapshot|coach\/(?:plan|status))$/.test(pathname)) {
    res.writeHead(404).end();
    return;
  }
  let base;
  try {
    base = new URL(upstreamUrl);
  } catch {
    res.writeHead(503).end('API não configurada.');
    return;
  }
  if (
    base.username ||
    base.password ||
    !['https:', 'http:'].includes(base.protocol) ||
    (base.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
  ) {
    res.writeHead(503).end('Endereço da API inválido.');
    return;
  }
  const headers = { ...req.headers, host: base.host };
  for (const name of [
    'connection',
    'upgrade',
    'proxy-authorization',
    'proxy-authenticate',
    'transfer-encoding',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
  ])
    delete headers[name];
  const parsedBody =
    req.body === undefined
      ? null
      : Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  if (parsedBody) headers['content-length'] = String(parsedBody.length);
  const send = base.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = send(new URL(pathname, base), { method: req.method, headers, timeout: 110_000 }, (response) => {
    const responseHeaders = { ...response.headers, 'cache-control': 'no-store' };
    delete responseHeaders['transfer-encoding'];
    delete responseHeaders.connection;
    res.writeHead(response.statusCode ?? 502, responseHeaders);
    response.on('error', () => res.destroy());
    response.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
  upstream.on('error', () => {
    if (res.headersSent) res.destroy();
    else {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ message: 'O servidor não está disponível. Seus dados continuam neste aparelho.' }));
    }
  });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => upstream.destroy());
  if (parsedBody) upstream.end(parsedBody);
  else req.pipe(upstream);
}
module.exports = { proxyApi };
