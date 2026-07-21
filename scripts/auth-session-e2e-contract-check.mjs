import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const config = read("playwright.config.ts");
const spec = read("tests/e2e/auth-session-flow.spec.ts");
const realEmailSpec = read("tests/e2e/real-email-auth-flow.spec.ts");
const responsiveSpec = read("tests/e2e/auth-responsive-flow.spec.ts");
const publicRequestSpec = read("tests/e2e/public-request-flow.spec.ts");
const accessibilitySpec = read("tests/e2e/accessibility-workspace-flow.spec.ts");
const projectComparisonAccessibilitySpec = read("tests/e2e/accessibility-project-comparison-flow.spec.ts");
const mobileProductSpec = read("tests/e2e/mobile-product-flow.spec.ts");
const mobileGlobalNavigationSpec = read("tests/e2e/mobile-global-navigation.spec.ts");
const commercialAlignmentVisualSpec = read("tests/e2e/commercial-alignment-visual.spec.ts");
const systemResilienceSpec = read("tests/e2e/system-resilience-flow.spec.ts");
const productNavigation = read("components/product-navigation.tsx");
const lighthouseBudgetScript = read("scripts/lighthouse-budget-check.mjs");
const workflow = read(".github/workflows/geoai-quality-gate.yml");
const operatorEnvExample = read(".env.operator.example");
const publicEnvExample = read(".env.example");
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
if (packageJson.scripts?.["test:e2e:auth-session"] !== "playwright test tests/e2e/auth-session-flow.spec.ts tests/e2e/auth-responsive-flow.spec.ts tests/e2e/public-request-flow.spec.ts tests/e2e/accessibility-workspace-flow.spec.ts tests/e2e/accessibility-project-comparison-flow.spec.ts tests/e2e/mobile-product-flow.spec.ts tests/e2e/mobile-global-navigation.spec.ts tests/e2e/commercial-alignment-visual.spec.ts tests/e2e/system-resilience-flow.spec.ts tests/e2e/design-foundation-shell.spec.ts") {
  failures.push("The focused Auth/session, responsive, accessibility and commercial visual Playwright command is missing");
}
if (packageJson.scripts?.["test:e2e:auth-real-persona"] !== "playwright test tests/e2e/real-email-auth-flow.spec.ts") {
  failures.push("The explicit trusted-terminal real email Auth persona command is missing");
}
if (packageJson.devDependencies?.lighthouse !== "13.4.0") {
  failures.push("Lighthouse must stay exactly pinned to 13.4.0");
}
if (packageJson.scripts?.["test:lighthouse-budget"] !== "node scripts/lighthouse-budget-check.mjs artifacts/lighthouse-mobile.json artifacts/lighthouse-desktop.json artifacts/lighthouse-mobile-projects.json artifacts/lighthouse-desktop-explore.json artifacts/lighthouse-desktop-login.json artifacts/lighthouse-desktop-request-access.json artifacts/lighthouse-desktop-profile.json") {
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
  'test.describe("public Auth signup containment"',
  'create_user: false',
  'pathname === "/auth/v1/signup"',
  'name: "Send sign-in link"',
  'name: "Send code"',
  'expect(signupRequests).toEqual([])'
]) requireText(spec, marker, `Public signup containment browser flow is missing ${marker}`);

for (const marker of [
  'name: "desktop-1440"',
  'name: "tablet-834"',
  'name: "mobile-390"',
  "AxeBuilder",
  "mutationRequests",
  "storageSnapshot",
  "expectHeaderDoesNotOverlap",
  "-top.png",
  "-generated.png",
  "Generated request brief",
  'page.keyboard.press("Tab")',
  "navigator.clipboard.readText()",
  'maxRedirects: 0',
  'url.pathname === "/request-access"'
]) requireText(publicRequestSpec, marker, `Public request browser flow is missing ${marker}`);

for (const marker of [
  'const rehearsalProjectRef = "bkmfcjzalcvdsdvyxpgi"',
  "GEOAI_REAL_AUTH_EMAIL",
  "GEOAI_REAL_AUTH_PASSWORD",
  "GEOAI_REAL_AUTH_EXPECTED_USER_ID",
  "GEOAI_REAL_AUTH_PROJECT_REF",
  "GEOAI_REAL_AUTH_RUN_APPROVAL",
  "read-only:${expectedProjectRef}",
  'realEmail === "demo@geoai.space"',
  'realPassword === "111111"',
  'target.hostname === "geoai-mvp.vercel.app"',
  'page.request.get("/api/auth/session"',
  'sessionStatus).toBe("supabase_user_with_profile")',
  'name: "Open your profile"',
  '"This is already your account email."',
  '"The password confirmation does not match."',
  'name: "Sign out"',
  "geoai-mock-demo-session-v1"
]) requireText(realEmailSpec, marker, `Real email Auth persona is missing ${marker}`);

for (const marker of [
  "GEOAI_REAL_AUTH_PROJECT_REF=bkmfcjzalcvdsdvyxpgi",
  "GEOAI_REAL_AUTH_RUN_APPROVAL=",
  "GEOAI_REAL_AUTH_EMAIL=",
  "GEOAI_REAL_AUTH_PASSWORD=",
  "GEOAI_REAL_AUTH_EXPECTED_USER_ID=",
  "GEOAI_E2E_BASE_URL=",
  "Never configure these values in the public"
]) requireText(operatorEnvExample, marker, `Trusted operator environment example is missing ${marker}`);

for (const forbidden of [
  "GEOAI_REAL_AUTH_EMAIL",
  "GEOAI_REAL_AUTH_PASSWORD",
  "GEOAI_REAL_AUTH_EXPECTED_USER_ID",
  "GEOAI_REAL_AUTH_RUN_APPROVAL"
]) {
  if (publicEnvExample.includes(forbidden)) {
    failures.push(`${forbidden} must not appear in the public application environment example`);
  }
  if (workflow.includes(forbidden)) {
    failures.push(`${forbidden} must not be consumed by the normal GitHub Quality Gate`);
  }
}
if (workflow.includes("test:e2e:auth-real-persona")) {
  failures.push("The real email Auth persona must remain an explicit trusted-terminal run, not an automatic Quality Gate step");
}

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
  "toHaveScreenshot",
  "maxDiffPixelRatio: 0.01",
  'page.clock.setFixedTime(new Date("2026-07-17T16:23:00.000Z"))',
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
  '{ width: 430, height: 932 }',
  '{ width: 834, height: 1112 }',
  'name: "Open product navigation"',
  'name: "Mobile product navigation"',
  'name: "Primary product navigation"',
  'name: /Workspace/',
  'name: /Projects/',
  'name: /Explore/',
  "aria-current",
  '"mobile-product-navigation.png"',
  'page.keyboard.press("Escape")',
  "expectNoHorizontalOverflow(page)"
]) requireText(mobileGlobalNavigationSpec, marker, `Mobile global navigation flow is missing ${marker}`);

for (const marker of [
  '{ name: "desktop-1440", width: 1440, height: 900 }',
  '{ name: "tablet-768", width: 768, height: 1024 }',
  '{ name: "mobile-390", width: 390, height: 844 }',
  "commercial-visual-evidence",
  "canonical-post-stabilization-capture",
  "stabilizationDelayMs",
  "scrollbar-width: none",
  "expectNoHorizontalOverflow(page)",
  'reducedMotion: "reduce"',
  'page.clock.setFixedTime(new Date("2026-07-19T09:00:00.000Z"))',
  'name: "Ask the map. Move with evidence."',
  'name: "Sign in to GeoAI"',
  'name: "Your profile"',
  "landing-${viewport.name}.png",
  "login-${viewport.name}.png",
  "profile-${viewport.name}.png"
]) requireText(commercialAlignmentVisualSpec, marker, `Commercial Landing/Account visual flow is missing ${marker}`);

for (const marker of [
  "{malformed-json",
  "geoai-public-demo-v999",
  "256 * 1024 + 1",
  "localStorage\", { configurable: true",
  "sessionStorage\", { configurable: true",
  "navigator, \"clipboard\"",
  "repeated request actions",
  "unrelated-user-key"
]) requireText(systemResilienceSpec, marker, `System resilience browser flow is missing ${marker}`);

for (const marker of [
  'aria-label="Primary product navigation"',
  'aria-label="Mobile product navigation"',
  'aria-controls="mobile-product-navigation-menu"',
  'aria-current={isCurrent ? "page" : undefined}',
  'href: "/workspace"',
  'href: "/projects"',
  'href: "/explore"',
  "triggerRef.current?.focus()"
]) requireText(productNavigation, marker, `Product navigation component is missing ${marker}`);

for (const marker of [
  "lighthouse-budget-summary.json",
  'performance: 0.7',
  'name: "mobile-projects"',
  'name: "desktop-explore"',
  'name: "desktop-workspace"',
  'name: "desktop-login"',
  'name: "desktop-request-access"',
  'name: "desktop-profile"',
  'expectedPath: "/workspace"',
  'expectedPath: "/login"',
  'accessibility: 0.95',
  '"largest-contentful-paint"',
  '"cumulative-layout-shift"',
  '"total-blocking-time"',
  "transferredJsBytes",
  "decodedJsBytes",
  "mapboxContribution"
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
  for (const marker of [
    "artifacts/lighthouse-desktop-login.json",
    "http://127.0.0.1:3100/login?next=/workspace&intent=demo"
  ]) requireText(browserStep, marker, `Isolated Login Lighthouse step is missing ${marker}`);
  if (browserStep.includes("secrets.")) failures.push("Browser CI must not read a real GitHub secret");
}

requireText(workflow, "npm run test:auth-session-e2e-contract", "Quality Gate must run the static E2E wiring contract");
for (const marker of [
  "artifacts/lighthouse-mobile.json",
  "artifacts/lighthouse-desktop.json",
  "artifacts/lighthouse-mobile-projects.json",
  "artifacts/lighthouse-desktop-explore.json",
  "artifacts/lighthouse-desktop-login.json",
  "artifacts/lighthouse-desktop-request-access.json",
  "artifacts/lighthouse-desktop-profile.json",
  "--preset=desktop",
  "npm run test:lighthouse-budget"
]) requireText(workflow, marker, `Quality Gate Lighthouse step is missing ${marker}`);

if (failures.length > 0) {
  console.error("Auth/session E2E contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Auth/session E2E contract passed: bounded guest redirects, browser-only demo restoration, authenticated route navigation, logout re-gating, desktop/tablet/390px layout checks, non-overlapping request top/generated evidence, serious/critical Axe scans, strict mobile and canonical commercial visual evidence, Lighthouse budgets, keyboard-only browser-local project save/open and analysis/comparison-to-print journeys are wired into normal CI without live credentials; a separately approved rehearsal-only real email/password persona can be run read-only from a trusted terminal.");
