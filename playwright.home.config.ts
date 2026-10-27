import { defineConfig, devices } from '@playwright/test';

/**
 * Mac sync end to end: WebKit on iPhone profiles against the real home server (HTTPS, throwaway
 * self-signed cert, temp data dir per test). Run `npm run build` first.
 */
export default defineConfig({
  testDir: 'tests/home',
  globalSetup: './tests/home/global-setup.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 3,
  retries: 0,
  reporter: [['list']],
  use: {
    ignoreHTTPSErrors: true,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iPhone SE', use: { ...devices['iPhone SE (3rd gen)'] } },
    { name: 'iPhone 15', use: { ...devices['iPhone 15'] } },
    { name: 'iPhone 15 Pro Max', use: { ...devices['iPhone 15 Pro Max'] } },
  ],
});
