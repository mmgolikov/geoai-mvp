import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const productSpecs = [
  "point-to-object-v5-offline-flow.spec.ts",
  "point-to-object-create-reliability.spec.ts",
  "point-to-object-geocontext-v6.spec.ts",
  "sprint06-security-compat.spec.ts",
  "point-to-object-map10.spec.ts",
  "quality20-map-find.spec.ts",
  "quality20-dashboard.spec.ts",
  "complete25-dashboard.spec.ts",
  "complete25-create-programmes.spec.ts",
  "complete25-climate.spec.ts",
  "complete25-map-view-race.spec.ts",
  "complete26-workspace-hydration.spec.ts",
  "complete26-workspace-project-links.spec.ts",
  "complete26-create-analogues.spec.ts",
  "project-hub-unified.spec.ts",
  "point-object-project-restoration-readiness.spec.ts",
  "point-to-object-find-viewport.spec.ts",
  "sprint07-ux.spec.ts",
  "point-to-object-map-sprint07.spec.ts",
  "sprint10-analysis-state.spec.ts",
  "sprint10-analysis-provenance.spec.ts",
  "sprint10-find-state.spec.ts",
  "sprint10-create-preview.spec.ts"
];

// Fixed loopback TLS only. The context-wide TLS-error exception is bounded by
// the fixed origin plus the external network guard; do not make it configurable.
export default defineConfig({
  ...base,
  testMatch: productSpecs,
  retries: 0,
  workers: 1,
  use: {
    ...base.use,
    baseURL: "https://127.0.0.1:3443",
    browserName: "webkit",
    channel: undefined,
    ignoreHTTPSErrors: true,
    serviceWorkers: "block"
  },
  reporter: [["line"], ["junit", { outputFile: "artifacts/product-https-webkit-junit.xml" }]],
  outputDir: "artifacts/product-https-webkit"
});
