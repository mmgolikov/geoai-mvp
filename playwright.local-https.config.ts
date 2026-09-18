import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: ["sprint10-auth-entry.spec.ts", "pilot-auth-boundary.spec.ts"],
  use: {
    ...base.use,
    channel: undefined,
    baseURL: "https://127.0.0.1:3443",
    // Only this loopback context trusts the generated one-day test certificate.
    ignoreHTTPSErrors: true
  },
  projects: [
    { name: "chrome-local-https", use: { browserName: "chromium", channel: "chrome" } },
    { name: "webkit-local-https", use: { browserName: "webkit", channel: undefined } }
  ],
  reporter: [["line"], ["junit", { outputFile: "artifacts/sprint10-auth-https-junit.xml" }]],
  outputDir: "artifacts/sprint10-auth-https"
});
