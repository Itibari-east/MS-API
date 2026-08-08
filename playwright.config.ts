import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './auth/globalSetup',
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ['blob', { outputDir: 'blob-report' }],
        ['json', { outputFile: 'test-results/playwright-report.json' }],
      ]
    : [['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },
});
