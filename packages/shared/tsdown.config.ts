import { defineConfig } from 'tsdown';

// O app (Metro) lê direto de src/. Este build existe para a API (Node ESM).
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  sourcemap: true,
  platform: 'node',
  target: 'node22',
});
