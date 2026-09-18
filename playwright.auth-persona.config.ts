import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const port = 3112;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...base,
  testMatch: [
    "point-to-object-geocontext-v6.spec.ts",
    "point-to-object-v5-offline-flow.spec.ts",
    "sprint07-ux.spec.ts"
  ],
  grep: /auth-persona/,
  metadata: { authPersona: "supabase_auth" },
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
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_e2e_only_1234567890",
      `PORT=${port}`,
      "npm run dev"
    ].join(" "),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  },
  reporter: [["line"], ["junit", { outputFile: "artifacts/auth-persona-e2e-junit.xml" }]],
  outputDir: "artifacts/playwright-auth-persona"
});
