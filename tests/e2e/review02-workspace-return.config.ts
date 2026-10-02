import { defineConfig } from "@playwright/test";
import baseline from "../../playwright.config";

/** Bounded correction matrix only; Root owns the full integrated CI. */
export default defineConfig({
  ...baseline,
  testDir: ".",
  testMatch: "review02-workspace-return.spec.ts",
  retries: 0,
  reporter: [["line"], ["junit", { outputFile: "artifacts/review02-workspace-return/junit.xml" }]],
  outputDir: "artifacts/review02-workspace-return/results",
  use: { ...baseline.use, channel: undefined },
  projects: [
    { name: "chromium", use: { browserName: "chromium", channel: "chrome" } },
    { name: "webkit", use: { browserName: "webkit" } }
  ]
});
