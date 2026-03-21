const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4020',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1440, height: 960 },
  },
  webServer: {
    command: 'npx next dev --hostname 127.0.0.1 --port 4020',
    url: 'http://127.0.0.1:4020/qa/financial-calendar',
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  },
});
