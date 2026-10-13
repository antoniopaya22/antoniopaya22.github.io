import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4322',
    // locally reuse the installed Chrome; CI installs Playwright's Chromium
    channel: process.env.CI ? undefined : 'chrome',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'python3 -m http.server 4322 -d dist',
    url: 'http://localhost:4322',
    reuseExistingServer: !process.env.CI,
  },
});
