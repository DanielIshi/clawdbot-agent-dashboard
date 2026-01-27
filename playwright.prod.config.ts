import { defineConfig, devices } from '@playwright/test';

/**
 * Production E2E Test Config
 * Runs tests against the live VPS deployment
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  
  use: {
    baseURL: process.env.PROD_URL || 'https://apps.srv947487.hstgr.cloud/agent-dashboard',
    trace: 'on-first-retry',
    headless: true,
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer - we test against production!
});
