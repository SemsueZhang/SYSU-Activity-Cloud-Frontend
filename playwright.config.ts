import { defineConfig, devices } from '@playwright/test'

const localBrowser = process.platform === 'win32' ? { channel: 'chrome' } : {}

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', ...localBrowser } }],
  webServer: [
    { command: 'node mock/index.js', port: 5000, reuseExistingServer: !process.env.CI, timeout: 20_000 },
    { command: 'npm run dev -- --host 127.0.0.1', port: 3000, reuseExistingServer: !process.env.CI, timeout: 20_000 },
  ],
})
