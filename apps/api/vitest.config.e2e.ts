import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    hookTimeout: 30000,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./src/load-env.ts'],
  },
});
