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
    // the burger menu only exists below 1240px, so its spec runs in the mobile project only
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'python3 -m http.server 4322 -d dist',
    url: 'http://localhost:4322',
    reuseExistingServer: !process.env.CI,
  },
});
