import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env['PLAYWRIGHT_PORT'] ?? 3100)
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `pnpm exec next dev -p ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env['CI'],
    env: {
      DATABASE_URL: 'file:.data/playwright/doit-playwright.sqlite',
      NEXTAUTH_SECRET: 'playwright-local-secret-do-not-use-in-prod',
      NEXTAUTH_URL: baseURL,
    },
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
})
