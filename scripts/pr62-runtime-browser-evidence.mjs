import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const { chromium } = await import(process.env.GEOAI_PLAYWRIGHT_MODULE ?? "playwright");
const baseUrl = process.env.GEOAI_BROWSER_BASE_URL ?? "http://127.0.0.1:3036";
const outputDir = path.resolve(process.env.GEOAI_BROWSER_OUTPUT_DIR ?? "artifacts/pr62-runtime-status-browser-evidence");
const testedSha = process.env.GEOAI_TESTED_SHA ?? process.env.GITHUB_SHA ?? "local-working-tree";
const previewUrl = process.env.GEOAI_PREVIEW_URL;
const previewDeploymentId = process.env.GEOAI_PREVIEW_DEPLOYMENT_ID;
const githubDeploymentId = process.env.GEOAI_GITHUB_DEPLOYMENT_ID;
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const consoleEntries = [];

function assert(condition, message) {
  if (!condition) throw new Error(`Browser evidence assertion failed: ${message}`);
}

function occurrences(text, value) {
  return text.split(value).length - 1;
}

function sanitize(value, key = "") {
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey)]));
  }
  if (typeof value === "string" && /(password|accessToken|refreshToken|serviceRoleKey|databaseUrl|dbUrl|secret)$/i.test(key)) {
    return "[redacted]";
  }
  return value;
}

async function statusRow(panel, label) {
  const labelLocator = panel.getByText(label, { exact: true });
  assert(await labelLocator.count() === 1, `${label} executive row count is not 1`);
  const card = labelLocator.locator("xpath=../..");
  return {
    label,
    value: (await card.locator("span").first().innerText()).trim(),
    note: (await card.locator(":scope > p").innerText()).trim()
  };
}

async function waitForInterception(intercepted) {
  await Promise.race([
    intercepted,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Backend status request was not intercepted")), 15000))
  ]);
}

assert(Boolean(previewUrl && previewDeploymentId && githubDeploymentId), "Preview metadata is incomplete");
await mkdir(outputDir, { recursive: true });

const apiResponse = await fetch(`${baseUrl}/api/pilot-backend/status`);
assert(apiResponse.status === 200, "local backend status route did not return 200");
const api = await apiResponse.json();
assert(api.executiveStatus && Array.isArray(api.executiveStatus.rows), "executiveStatus is missing from backend response");
assert(["demo_workflow_available", "demo_workflow_degraded"].includes(api.executiveStatus.demoWorkflow), "demo workflow is incorrectly blocked");
assert(api.executiveStatus.confidentialPilot === "confidential_pilot_blocked", "confidential pilot is not blocked");
assert(api.readinessClaim === "not_production_ready_or_pilot_ready", "readiness claim changed unexpectedly");
assert(api.canRunDemoWorkflow === true, "public demo workflow is unavailable");
assert(api.canRunConfidentialPilot === false, "confidential pilot was promoted");
const apiText = JSON.stringify(api);
assert(!/sk-[a-z0-9]/i.test(apiText), "API response contains an API-key-like value");
assert(!/postgres:\/\/[^\s\"]+:[^\s\"]+@/i.test(apiText), "API response contains a database URL");
assert(!/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(apiText), "API response contains a JWT-like value");
await writeFile(path.join(outputDir, "runtime-api-response.json"), `${JSON.stringify(sanitize(api), null, 2)}\n`);

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.on("console", (message) => consoleEntries.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => consoleEntries.push({ type: "pageerror", text: error.stack ?? error.message }));

  let releaseStatusRequest;
  let markIntercepted;
  const requestGate = new Promise((resolve) => { releaseStatusRequest = resolve; });
  const intercepted = new Promise((resolve) => { markIntercepted = resolve; });
  await page.route("**/api/pilot-backend/status", async (route) => {
    markIntercepted();
    await requestGate;
    await route.continue();
  });

  await page.goto(`${baseUrl}/projects`, { waitUntil: "domcontentloaded" });
  await waitForInterception(intercepted);
  const diagnostics = page.locator("details").filter({ hasText: "Advanced project diagnostics" }).first();
  await diagnostics.evaluate((element) => { element.open = true; });
  const activationPanel = page.getByRole("heading", { name: "Activation Diagnostics", exact: true }).locator("xpath=../..");
  await activationPanel.waitFor({ state: "visible", timeout: 15000 });

  const initialRows = [
    await statusRow(activationPanel, "Public demo workflow"),
    await statusRow(activationPanel, "Confidential pilot"),
    await statusRow(activationPanel, "Auth")
  ];
  assert(initialRows[0].value === "Checking", "initial public demo value is not neutral");
  assert(initialRows[1].value === "Checking", "initial confidential pilot value is not neutral");
  assert(initialRows[2].value === "Checking runtime status", "initial Auth value is not neutral");
  await activationPanel.screenshot({ path: path.join(outputDir, "project-hub-initial-runtime-checking.png") });
  await writeFile(path.join(outputDir, "initial-runtime-rows.json"), `${JSON.stringify(initialRows, null, 2)}\n`);

  releaseStatusRequest();
  await activationPanel.getByText("Available", { exact: true }).waitFor({ state: "visible", timeout: 30000 });

  const executiveRows = [];
  for (const expected of api.executiveStatus.rows) {
    const actual = await statusRow(activationPanel, expected.label);
    assert(actual.value === expected.value, `${expected.label} UI value does not match API`);
    assert(actual.note === expected.note, `${expected.label} UI note does not match API`);
    executiveRows.push(actual);
  }
  await writeFile(path.join(outputDir, "executive-rows.json"), `${JSON.stringify(executiveRows, null, 2)}\n`);

  const bodyText = await page.locator("body").innerText();
  for (const prohibited of [
    "Sample pilot",
    "Pilot access",
    "Public sample access is disabled",
    "Client-ready memo generation",
    "manual snapshot ready",
    "Local Fallback Only"
  ]) {
    assert(occurrences(bodyText, prohibited) === 0, `hydrated Project Hub contains ${prohibited}`);
  }
  assert(await page.getByText("Public demo workflow", { exact: true }).count() === 1, "Public demo workflow count is not 1");
  assert(await page.getByText("Confidential pilot", { exact: true }).count() === 1, "Confidential pilot count is not 1");
  assert(await page.getByText("Review-ready screening memo previews remain connected to the workspace result and report flow.", { exact: true }).count() === 1, "review-ready memo wording count is not 1");
  assert(bodyText.includes("manual import path available; no verified snapshot attached"), "manual connector wording is absent");
  assert(!bodyText.includes("Dubai Marina / JBR Market Signal / Dubai Marina / JBR Market Signal"), "duplicated Marina metadata remains");
  assert(bodyText.includes("Investment Site Selection / Dubai Marina / JBR Market Signal"), "meaningful Marina compact metadata is absent");
  assert(bodyText.includes(caveat), "required caveat is absent");

  const readinessHeadings = page.getByRole("heading", { name: "Data Readiness / Source Lineage", exact: true });
  assert(await readinessHeadings.count() === 1, "Data Readiness heading count is not 1");
  const h2Texts = await page.locator("h2").allTextContents();
  assert(h2Texts.at(-1)?.trim() === "Data Readiness / Source Lineage", "Data Readiness is not the final substantive Project Hub section");

  const reportsPanel = page.getByRole("heading", { name: "Reports / Memos", exact: true }).locator("xpath=../..");
  assert(await reportsPanel.getByText("Investment Screening Memo", { exact: true }).count() === 1, "analysis report card is absent");
  assert(await reportsPanel.getByText("Dubai Marina vs Business Bay vs Dubai South Comparison Memo", { exact: true }).count() === 1, "comparison report card is absent");
  assert(await reportsPanel.getByRole("link", { name: "Export report", exact: true }).count() >= 2, "report export links are absent");
  const reportCardMetadata = await reportsPanel.locator("article").evaluateAll((articles) => articles.map((article) => ({
    title: article.querySelector("h3")?.textContent?.trim() ?? "",
    paragraphs: Array.from(article.querySelectorAll("p")).map((item) => item.textContent?.trim() ?? ""),
    exportPath: article.querySelector("a")?.getAttribute("href") ?? null
  })));
  await writeFile(path.join(outputDir, "report-card-metadata.json"), `${JSON.stringify(reportCardMetadata, null, 2)}\n`);

  const overflow1366 = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  assert(overflow1366 === 0, "1366 Project Hub has horizontal overflow");
  await page.screenshot({ path: path.join(outputDir, "project-hub-1366x768-full.png"), fullPage: true });
  const appHeader = page.locator("header").first();
  const previousHeaderVisibility = await appHeader.evaluate((element) => element.style.visibility);
  await appHeader.evaluate((element) => { element.style.visibility = "hidden"; });
  await activationPanel.screenshot({ path: path.join(outputDir, "project-hub-advanced-diagnostics-expanded.png") });
  await appHeader.evaluate((element, visibility) => { element.style.visibility = visibility; }, previousHeaderVisibility);

  await page.setViewportSize({ width: 1440, height: 900 });
  const overflow1440 = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  assert(overflow1440 === 0, "1440 Project Hub has horizontal overflow");
  await page.screenshot({ path: path.join(outputDir, "project-hub-1440x900-full.png"), fullPage: true });

  const domEvidence = {
    text: bodyText,
    h2Texts: h2Texts.map((item) => item.trim()),
    horizontalOverflow: { "1366x768": overflow1366, "1440x900": overflow1440 },
    counts: {
      publicDemoWorkflow: await page.getByText("Public demo workflow", { exact: true }).count(),
      confidentialPilot: await page.getByText("Confidential pilot", { exact: true }).count(),
      dataReadinessHeading: await readinessHeadings.count(),
      reviewReadyMemoWording: await page.getByText("Review-ready screening memo previews remain connected to the workspace result and report flow.", { exact: true }).count(),
      manualImportWording: occurrences(bodyText, "manual import path available; no verified snapshot attached")
    }
  };
  await writeFile(path.join(outputDir, "hydrated-dom-text.json"), `${JSON.stringify(domEvidence, null, 2)}\n`);

  const browserErrors = consoleEntries.filter((entry) => entry.type === "error" || entry.type === "pageerror");
  assert(browserErrors.length === 0, `browser console contains ${browserErrors.length} error(s)`);
  await writeFile(path.join(outputDir, "browser-console.log"), consoleEntries.map((entry) => `${entry.type}: ${entry.text}`).join("\n") + "\n");
  await context.close();
} finally {
  await browser.close();
}

const analysisRoute = "/reports/seeded-analysis-dubai-marina-report/print";
const comparisonRoute = "/reports/seeded-comparison-dubai-shortlist-report/print";
const routeChecks = [];
for (const route of [analysisRoute, comparisonRoute]) {
  const response = await fetch(`${baseUrl}${route}`);
  const text = await response.text();
  assert(response.status === 200, `${route} did not return 200`);
  if (route === analysisRoute) {
    for (const expected of [
      "Dubai Marina / JBR Market Signal",
      "Investment site selection",
      "25.082200, 55.143100",
      "92/100",
      "Compare before advancing",
      "Define screening criteria",
      "Captured rendered map context"
    ]) {
      assert(text.toLowerCase().includes(expected.toLowerCase()), `analysis report is missing ${expected}`);
    }
  }
  routeChecks.push({ route, status: response.status });
}

const previewRoutes = ["/", "/workspace", "/projects", "/api/health", "/api/pilot-backend/status", analysisRoute, comparisonRoute];
const previewSmoke = [];
for (const route of previewRoutes) {
  const response = await fetch(`${previewUrl}${route}`);
  assert(response.status === 200, `Preview ${route} returned ${response.status}`);
  previewSmoke.push({ route, status: response.status });
}
await writeFile(path.join(outputDir, "preview-route-smoke.json"), `${JSON.stringify(previewSmoke, null, 2)}\n`);
await writeFile(path.join(outputDir, "deployment-metadata.json"), `${JSON.stringify({
  testedSha,
  previewUrl,
  previewDeploymentId,
  githubDeploymentId,
  generatedAt: new Date().toISOString()
}, null, 2)}\n`);
await writeFile(path.join(outputDir, "SUMMARY.md"), `# PR #62 Runtime Status Browser Evidence

- Tested commit: \`${testedSha}\`
- Preview: \`${previewUrl}\`
- Vercel deployment: \`${previewDeploymentId}\`
- GitHub deployment: \`${githubDeploymentId}\`
- Neutral pre-hydration executive state: passed.
- Hydrated executive API/UI row parity: passed.
- Stale status labels: absent.
- Connector, Storage, memo and report metadata wording: passed.
- Data Readiness heading/order and PR #61 report links: preserved.
- Horizontal overflow at 1366x768 and 1440x900: 0 px.
- Local and Preview route/report regression checks: passed.

${caveat}
`);
