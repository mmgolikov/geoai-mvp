import { defineConfig } from "@playwright/test";
import localAuth from "./playwright.cloud-projects.config";

// Synthetic loopback only; separate invocation, never reuse another suite's server.
export default defineConfig({
  ...localAuth,
  testMatch: ["complete26-delayed-password-confirmation.spec.ts"],
  retries: 0,
  use: { ...localAuth.use, trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" },
  reporter: [["line"], ["junit", { outputFile: "artifacts/complete26-delayed-password-confirmation-junit.xml" }]],
  outputDir: "artifacts/complete26-delayed-password-confirmation"
});
