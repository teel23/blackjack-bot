import { defineConfig, devices } from '@playwright/test';

/** WebKit on iPhone profiles. Run `npm run build` first; tests hit the static export. */
export default defineConfig({
  testDir: 'tests',
  // SCREENS=1 runs the screenshot tour (tests/screens) instead of the e2e suite.
  testMatch: process.env.SCREENS ? 'screens/**/*.spec.ts' : 'e2e/**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 3,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'node scripts/serve-out.mjs',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'iPhone SE', use: { ...devices['iPhone SE (3rd gen)'] } },
    { name: 'iPhone 15', use: { ...devices['iPhone 15'] } },
    { name: 'iPhone 15 Pro Max', use: { ...devices['iPhone 15 Pro Max'] } },
  ],
});
