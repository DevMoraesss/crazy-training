import './load-env.js';

import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

// Roda antes da API no container (Dockerfile). Aplica só migrações novas, sem apagar dados.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL não definida: não é possível aplicar as migrações.');

const pool = new pg.Pool({ connectionString, max: 1 });
try {
  await migrate(drizzle({ client: pool }), {
    migrationsFolder: fileURLToPath(new URL('../drizzle/', import.meta.url)),
  });
  console.log('Migrações do banco aplicadas.');
} finally {
  await pool.end();
}
