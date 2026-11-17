import { createServer } from 'node:net';

// Falha antes do build: outro servidor nesta porta pode entregar HTML sem COOP/COEP.
const port = Number(process.env.WEB_PORT ?? 8081);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('WEB_PORT precisa ser uma porta entre 1 e 65535.');
  process.exitCode = 1;
} else {
  const probe = createServer();
  probe.once('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? `A porta ${port} já está ocupada. Encerre o servidor dessa porta com Ctrl+C e execute novamente WEB_PORT=${port} npm run dev:web.\nPara Expo Go, use npm run dev:expo (porta 8082). Mantenha o endereço web habitual para acessar seus dados locais.`
        : `Não foi possível verificar a porta ${port}: ${error.message}`,
    );
    process.exitCode = 1;
  });
  probe.listen(port, '0.0.0.0', () => probe.close());
}
