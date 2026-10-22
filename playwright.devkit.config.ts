import { defineConfig } from "@playwright/test";
import loopback from "./playwright.product-https.config";

// One controlled optimized-build matrix. The inherited TLS exception is fixed
// to loopback, and each E1 test blocks non-loopback traffic and paid/source APIs.
export default defineConfig({
  ...loopback,
  testMatch: ["devkit-workspace.spec.ts"],
  projects: [
    { name: "devkit-chrome", use: { browserName: "chromium", channel: "chrome" } },
    { name: "devkit-webkit", use: { browserName: "webkit", channel: undefined } }
  ],
  retries: 0,
  workers: 1,
  reporter: [["line"], ["junit", { outputFile: "artifacts/devkit-local-junit.xml" }]],
  outputDir: "artifacts/devkit-local"
});
