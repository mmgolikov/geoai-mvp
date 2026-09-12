import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Desktop WebKit with responsive viewport fixtures; not physical iOS certification.
export default defineConfig({
  ...base,
  use: { ...base.use, browserName: "webkit", channel: undefined },
  reporter: [["line"], ["junit", { outputFile: "artifacts/webkit-regressions-junit.xml" }]],
  outputDir: "artifacts/playwright-webkit-regressions"
});
