import { createServer, request } from 'node:http';
import { connect } from 'node:net';

// O HTML da SPA é respondido pelo Expo antes do enhanceMiddleware do Metro.
// Este acesso adiciona isolamento também ao HTML, sem mudar o servidor nativo.
const port = Number(process.env.WEB_PROXY_PORT ?? 8083);
const metroPort = Number(process.env.METRO_PORT ?? 8082);
const hostname = '127.0.0.1';

const server = createServer((req, res) => {
  const upstream = request(
    { hostname, port: metroPort, method: req.method, path: req.url, headers: req.headers },
    (response) => {
      res.writeHead(response.statusCode ?? 502, {
        ...response.headers,
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-embedder-policy': 'credentialless',
      });
      response.on('error', () => res.destroy());
      response.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`O Expo não está disponível na porta ${metroPort}. Execute npm run dev:expo em outro terminal.`);
  });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
});

// Mantém as conexões WebSocket de atualização automática do Metro.
server.on('upgrade', (req, socket, head) => {
  const upstream = connect(metroPort, hostname, () => {
    const headers = [];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headers.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers.join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  socket.on('close', () => upstream.destroy());
  upstream.on('close', () => socket.destroy());
});

server.on('error', (error) => {
  console.error(`Não foi possível iniciar o acesso web de desenvolvimento: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, hostname, () => {
  console.log(`Web com SQLite: http://localhost:${port}`);
  console.log(`Expo/Metro: porta ${metroPort}. Mantenha npm run dev:expo aberto em outro terminal.`);
  console.log('Use este endereço no navegador; a porta do Metro continua disponível para o Expo Go.');
});
