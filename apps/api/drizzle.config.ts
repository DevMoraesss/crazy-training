import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile();
} catch {
  // Sem .env: usa o DATABASE_URL do ambiente.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
