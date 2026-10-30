import { defineConfig, devices } from '@playwright/test';

// A separate port, so the smoke test can run while `pnpm dev` is open.
const PORT = 5174;

export default defineConfig({
  testDir: 'packages/client/e2e',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Software WebGL: identical results with or without a GPU (CI, headless).
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
  ],
  webServer: {
    command: `pnpm --filter @nen/client exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
