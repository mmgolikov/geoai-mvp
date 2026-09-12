import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Version-matched local runner; the default Chrome configuration stays intact.
export default defineConfig({
  ...base,
  use: { ...base.use, browserName: "chromium", channel: undefined },
  reporter: [["line"], ["junit", { outputFile: "artifacts/chromium-regressions-junit.xml" }]],
  outputDir: "artifacts/playwright-chromium-regressions"
});
