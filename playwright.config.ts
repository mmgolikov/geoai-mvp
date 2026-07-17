import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180_000,
  expect: {
    timeout: 20_000
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["line"],
    ["junit", { outputFile: "artifacts/auth-session-e2e-junit.xml" }]
  ],
  use: {
    baseURL: process.env.GEOAI_E2E_BASE_URL ?? "http://127.0.0.1:3100",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  outputDir: "artifacts/playwright-auth-session"
});
