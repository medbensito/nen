import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      // Game data lives at the repository root, shared with tools and tests.
      '@data': fileURLToPath(new URL('../../data', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    // Phaser alone is over 1 MB minified; splitting it is not worth it yet.
    chunkSizeWarningLimit: 2000,
  },
});
