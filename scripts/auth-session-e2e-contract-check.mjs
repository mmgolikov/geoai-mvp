import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const config = read("playwright.config.ts");
const spec = read("tests/e2e/auth-session-flow.spec.ts");
const responsiveSpec = read("tests/e2e/auth-responsive-flow.spec.ts");
const accessibilitySpec = read("tests/e2e/accessibility-workspace-flow.spec.ts");
const projectComparisonAccessibilitySpec = read("tests/e2e/accessibility-project-comparison-flow.spec.ts");
const mobileProductSpec = read("tests/e2e/mobile-product-flow.spec.ts");
const lighthouseBudgetScript = read("scripts/lighthouse-budget-check.mjs");
const workflow = read(".github/workflows/geoai-quality-gate.yml");
const failures = [];

function requireText(source, text, message) {
  if (!source.includes(text)) failures.push(message);
}

if (packageJson.devDependencies?.["@playwright/test"] !== "1.61.1") {
  failures.push("@playwright/test must stay exactly pinned to 1.61.1");
}
if (packageJson.devDependencies?.["@axe-core/playwright"] !== "4.12.1") {
  failures.push("@axe-core/playwright must stay exactly pinned to 4.12.1");
}
if (packageJson.scripts?.["test:e2e:auth-session"] !== "playwright test tests/e2e/auth-session-flow.spec.ts tests/e2e/auth-responsive-flow.spec.ts tests/e2e/accessibility-workspace-flow.spec.ts tests/e2e/accessibility-project-comparison-flow.spec.ts tests/e2e/mobile-product-flow.spec.ts") {
  failures.push("The focused Auth/session, responsive and accessibility Playwright command is missing");
}
if (packageJson.devDependencies?.lighthouse !== "13.4.0") {
  failures.push("Lighthouse must stay exactly pinned to 13.4.0");
}
if (packageJson.scripts?.["test:lighthouse-budget"] !== "node scripts/lighthouse-budget-check.mjs artifacts/lighthouse-mobile.json artifacts/lighthouse-desktop.json") {
  failures.push("The Lighthouse budget command is missing");
}

for (const [text, message] of [
  ['channel: "chrome"', "Playwright must use the Chrome already present on the CI runner"],
  ['workers: 1', "The Auth/session flow must run with one worker"],
  ['trace: "retain-on-failure"', "Failure traces must remain enabled"],
  ['outputDir: "artifacts/playwright-auth-session"', "Playwright evidence must stay inside the uploaded artifact directory"]
]) requireText(config, text, message);

for (const route of ["/workspace?segment=b2b", "/projects", "/explore", "/profile"]) {
  requireText(spec, route, `Browser flow must cover ${route}`);
}
for (const marker of [
  "Use demo credentials",
  "Open demo profile",
  "geoai-mock-demo-session-v1",
  "page.reload()",
  "Sign out",
  "expectLoginRedirect(page, \"/workspace\")"
]) requireText(spec, marker, `Browser flow is missing ${marker}`);

for (const marker of [
  '{ name: "desktop", width: 1440, height: 900 }',
  '{ name: "tablet", width: 834, height: 1112 }',
  '{ name: "mobile-390", width: 390, height: 844 }',
  "expectNoHorizontalOverflow(page)",
  "Primary mobile controls must have a rendered box",
  'control.href === "/login?next=/workspace&intent=demo"',
  'control.text === "Use demo credentials"',
  'control.text === "Open demo"',
  'control.label === "Open demo profile"'
]) requireText(responsiveSpec, marker, `Responsive/keyboard browser flow is missing ${marker}`);

for (const marker of [
  "@axe-core/playwright",
  'violation.impact === "critical" || violation.impact === "serious"',
  "axe-accessibility-results.json",
  'name: "Criteria-first"',
  'name: "Find redevelopment zones"',
  'name: "Analyze Selected"',
  'section[data-dashboard-analysis-id]',
  'name: "Print / Save as PDF"',
  'direction: "backward"'
]) requireText(accessibilitySpec, marker, `Accessibility/keyboard browser flow is missing ${marker}`);

for (const marker of [
  "axe-project-comparison-results.json",
  'signInDemoWithKeyboard(page, "/projects")',
  'name: "Create project"',
  'name: "Project name"',
  "local-projects-v1",
  'name: "Open workspace"',
  'signInDemoWithKeyboard(page, "/explore")',
  'name: "Compare Candidates"',
  "section[data-dashboard-comparison-id]",
  'name: "GeoAI Comparison Report"',
  'name: "Print / Save as PDF"'
]) requireText(projectComparisonAccessibilitySpec, marker, `Project/comparison accessibility flow is missing ${marker}`);

for (const marker of [
  'viewport: { width: 390, height: 844 }',
  "expectMinimumTargetSize",
  "expectNoHorizontalOverflow",
  'document.querySelector("nextjs-portal")?.remove()',
  "mobile-visual-evidence",
  '"mobile-project-hub.png"',
  '"mobile-project-workspace.png"',
  '"mobile-explore-setup.png"',
  '"mobile-comparison-dashboard.png"',
  '"mobile-comparison-report.png"',
  'name: "Comparison table"',
  'name: "Create project"',
  'name: "Criteria-first"',
  'name: "Compare Candidates"',
  'name: "Print / Save as PDF"'
]) requireText(mobileProductSpec, marker, `Mobile product flow is missing ${marker}`);

for (const marker of [
  "lighthouse-budget-summary.json",
  'performance: 0.7',
  'accessibility: 0.95',
  '"largest-contentful-paint"',
  '"cumulative-layout-shift"',
  '"total-blocking-time"'
]) requireText(lighthouseBudgetScript, marker, `Lighthouse budget contract is missing ${marker}`);

const browserStepStart = workflow.indexOf("- name: Browser Auth/session flow");
const buildStepStart = workflow.indexOf("- name: Build", browserStepStart);
if (browserStepStart === -1 || buildStepStart === -1) {
  failures.push("Quality Gate must run the browser Auth/session flow before the production build");
} else {
  const browserStep = workflow.slice(browserStepStart, buildStepStart);
  for (const marker of [
    "NEXT_PUBLIC_AUTH_MODE: supabase_auth",
    "NEXT_PUBLIC_SUPABASE_URL: https://bkmfcjzalcvdsdvyxpgi.supabase.co",
    'GEOAI_ACCESS_ENFORCEMENT_MODE: hard',
    'GEOAI_ALLOW_DEMO_PUBLIC: "false"',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_${E2E_KEY_SUFFIX}"',
    "npm run test:e2e:auth-session"
  ]) requireText(browserStep, marker, `Browser CI step is missing ${marker}`);
  if (browserStep.includes("secrets.")) failures.push("Browser CI must not read a real GitHub secret");
}

requireText(workflow, "npm run test:auth-session-e2e-contract", "Quality Gate must run the static E2E wiring contract");
for (const marker of [
  "artifacts/lighthouse-mobile.json",
  "artifacts/lighthouse-desktop.json",
  "--preset=desktop",
  "npm run test:lighthouse-budget"
]) requireText(workflow, marker, `Quality Gate Lighthouse step is missing ${marker}`);

if (failures.length > 0) {
  console.error("Auth/session E2E contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auth/session E2E contract passed: bounded guest redirects, browser-only demo restoration, authenticated route navigation, logout re-gating, desktop/tablet/390px layout checks, serious/critical Axe scans, mobile target-size/visual evidence, Lighthouse budgets, keyboard-only browser-local project save/open and analysis/comparison-to-print journeys are wired into CI without live credentials.");
