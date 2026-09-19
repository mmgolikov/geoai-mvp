import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const port = 3117;
const baseURL = `http://127.0.0.1:${port}`;
const syntheticPublishableKey = ["sb", "publishable", "synthetic_cloud_e2e_only_1234567890"].join("_");

export default defineConfig({
  ...base,
  testMatch: "point-object-cloud-sync.spec.ts",
  metadata: { cloudAuthE2E: true },
  use: {
    ...base.use,
    baseURL,
    channel: "chrome",
    headless: true
  },
  webServer: {
    command: [
      "NEXT_PUBLIC_AUTH_MODE=supabase_auth",
      "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
      "NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE=true",
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${syntheticPublishableKey}`,
      "GEOAI_ACCESS_ENFORCEMENT_MODE=hard",
      "GEOAI_ALLOW_DEMO_PUBLIC=false",
      `PORT=${port}`,
      "npm run dev"
    ].join(" "),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  },
  reporter: [["line"]],
  outputDir: "artifacts/playwright-cloud-projects"
});
