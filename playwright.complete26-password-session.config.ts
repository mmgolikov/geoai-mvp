import { defineConfig } from "@playwright/test";
import localAuth from "./playwright.cloud-projects.config";

// Same explicit loopback-only synthetic Auth environment as the existing suite.
export default defineConfig({
  ...localAuth,
  testMatch: ["complete26-password-session.spec.ts"],
  retries: 0,
  use: { ...localAuth.use, trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" },
  reporter: [["line"]],
  outputDir: "artifacts/complete26-password-session"
});
