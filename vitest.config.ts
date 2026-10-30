import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'packages/*/test/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
    benchmark: {
      include: ['packages/*/test/**/*.bench.ts'],
    },
  },
});
