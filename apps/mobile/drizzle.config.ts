import { defineConfig } from 'drizzle-kit';

// Migrações do banco no aparelho. O driver "expo" gera também drizzle/migrations.js,
// que o app importa (os .sql entram no bundle pelo babel-plugin-inline-import).
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
