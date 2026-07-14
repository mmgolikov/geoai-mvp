import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const previewBaseUrl = process.env.SPATIAL_B2_PREVIEW_URL;
const productionBaseUrl = process.env.SPATIAL_B2_PRODUCTION_URL ?? "http://127.0.0.1:3000";
const evidenceDir = process.env.SPATIAL_B2_EVIDENCE_DIR ?? "artifacts";
const testedCommitSha = process.env.SPATIAL_B2_TESTED_COMMIT_SHA;
const previewDeploymentId = process.env.SPATIAL_B2_PREVIEW_DEPLOYMENT_ID;
const workflowCommitSha = process.env.GITHUB_SHA ?? null;

if (!previewBaseUrl || !testedCommitSha || !previewDeploymentId) {
  throw new Error("SPATIAL_B2_PREVIEW_URL, SPATIAL_B2_TESTED_COMMIT_SHA and SPATIAL_B2_PREVIEW_DEPLOYMENT_ID are required.");
}

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1440x900", width: 1440, height: 900 }
];
const workspaceStates = [
  "default-synthetic-workspace",
  "expanded-layer-panel",
  "licences-local-fixture-visible",
  "licences-local-fixture-hidden",
  "fallback-grid-no-mapbox",
  "controlled-fixture-selected",
  "source-lineage-identity",
  "synthetic-rollback",
  "map-snapshot-regression"
];
const screenshotsDir = path.join(evidenceDir, "screenshots");
await fs.mkdir(screenshotsDir, { recursive: true });

const browserConsole = [];
const failures = [];
const assertions = [];
const viewportResults = [];
const landingResults = [];
const warningAllowlist = [
  /Automatic fallback to software WebGL has been deprecated/i,
  /GPU stall due to ReadPixels/i
];

function record(name, passed, detail) {
  assertions.push({ name, passed: Boolean(passed), detail });
  if (!passed) failures.push(`${name}: ${detail}`);
}

function numberAttribute(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function intersects(a, b) {
  if (!a || !b) return 0;
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

function attachConsole(page, viewport, stateRef) {
  page.on("console", (message) => {
    browserConsole.push({ viewport, state: stateRef.current, type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => {
    browserConsole.push({ viewport, state: stateRef.current, type: "pageerror", text: error.message });
  });
}

async function navigate(page, url) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  record(`HTTP 200 ${url}`, response?.status() === 200, `status=${response?.status() ?? "none"}`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
}

async function root(page) {
  const locator = page.locator("[data-spatial-effective-source-mode]").first();
  await locator.waitFor({ state: "attached", timeout: 30_000 });
  return locator;
}

async function waitForMap(page) {
  const spatialRoot = await root(page);
  await spatialRoot.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const element = document.querySelector("[data-spatial-effective-source-mode]");
    return Number(element?.getAttribute("data-spatial-map-ready-ms") ?? 0) > 0;
  }, undefined, { timeout: 30_000 }).catch(() => undefined);
  return spatialRoot;
}

async function readMetrics(page) {
  const spatialRoot = await root(page);
  const attributes = await spatialRoot.evaluate((element) => ({
    runtimeEnvironment: element.getAttribute("data-spatial-runtime-environment"),
    requestedSourceMode: element.getAttribute("data-spatial-requested-source-mode"),
    effectiveSourceMode: element.getAttribute("data-spatial-effective-source-mode"),
    basemapMode: element.getAttribute("data-spatial-basemap-mode"),
    fallbackReason: element.getAttribute("data-spatial-fallback-reason"),
    syntheticLayerCount: element.getAttribute("data-spatial-synthetic-layer-count"),
    defaultVisibleCount: element.getAttribute("data-spatial-default-visible-count"),
    openFixtureFeatureCount: element.getAttribute("data-spatial-open-fixture-feature-count"),
    openRealFeatureCount: element.getAttribute("data-spatial-open-real-feature-count"),
    localFixtureVisible: element.getAttribute("data-spatial-local-fixture-visible"),
    visibleAttributionIds: element.getAttribute("data-spatial-visible-attribution-ids"),
    attributionMissing: element.getAttribute("data-spatial-attribution-missing"),
    attributionUnexpected: element.getAttribute("data-spatial-attribution-unexpected"),
    controlledSourceIds: element.getAttribute("data-spatial-controlled-source-ids"),
    controlledLayerIds: element.getAttribute("data-spatial-controlled-layer-ids"),
    obsoleteControlledSourceCount: element.getAttribute("data-spatial-obsolete-controlled-source-count"),
    selectionRollbackReason: element.getAttribute("data-spatial-selection-rollback-reason"),
    mapSourceCount: element.getAttribute("data-spatial-map-source-count"),
    mapLayerCount: element.getAttribute("data-spatial-map-layer-count"),
    mapReadyMs: element.getAttribute("data-spatial-map-ready-ms"),
    layerRegistrationMs: element.getAttribute("data-spatial-layer-registration-ms")
  }));
  const horizontalOverflowPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const telemetry = await page.evaluate(() => window.__GEOAI_SPATIAL_B2_EVIDENCE__ ?? null);
  return {
    ...attributes,
    syntheticLayerCount: numberAttribute(attributes.syntheticLayerCount),
    defaultVisibleCount: numberAttribute(attributes.defaultVisibleCount),
    openFixtureFeatureCount: numberAttribute(attributes.openFixtureFeatureCount),
    openRealFeatureCount: numberAttribute(attributes.openRealFeatureCount),
    obsoleteControlledSourceCount: numberAttribute(attributes.obsoleteControlledSourceCount),
    mapSourceCount: numberAttribute(attributes.mapSourceCount),
    mapLayerCount: numberAttribute(attributes.mapLayerCount),
    mapReadyMs: numberAttribute(attributes.mapReadyMs),
    layerRegistrationMs: numberAttribute(attributes.layerRegistrationMs),
    horizontalOverflowPx,
    telemetry
  };
}

async function capture(page, viewportName, state) {
  const file = path.join(screenshotsDir, `${viewportName}-${state}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(evidenceDir, file);
}

async function openLayerPanel(page) {
  const button = page.getByRole("button").filter({ hasText: "Spatial layers" }).first();
  await button.scrollIntoViewIfNeeded();
  const expanded = await button.getAttribute("aria-expanded");
  if (expanded !== "true" && !(await page.getByText("Basemap + GeoAI signals").isVisible().catch(() => false))) {
    await button.click();
  }
  await page.getByText("Basemap + GeoAI signals").waitFor({ state: "visible", timeout: 15_000 });
}

async function closeLayerPanel(page) {
  const heading = page.getByText("Basemap + GeoAI signals");
  if (!(await heading.isVisible().catch(() => false))) return;
  await page.getByRole("button").filter({ hasText: "Spatial layers" }).first().click();
  await heading.waitFor({ state: "hidden", timeout: 10_000 });
}

async function openAttribution(page) {
  const chip = page.locator("[data-spatial-attribution-chip]").first();
  await chip.waitFor({ state: "visible", timeout: 15_000 });
  await chip.click();
  await page.locator("[data-spatial-attribution-details]").waitFor({ state: "visible" });
  return chip;
}

async function closeAttribution(page) {
  const close = page.getByRole("button", { name: "Close data licences" });
  if (await close.isVisible().catch(() => false)) await close.click();
}

async function hideLocalFixture(page) {
  const checkboxes = page.locator("[data-local-open-geodata-fixture] input[type=checkbox]");
  record("Local fixture exposes three visibility controls", await checkboxes.count() === 3, `count=${await checkboxes.count()}`);
  for (let index = 0; index < await checkboxes.count(); index += 1) {
    if (await checkboxes.nth(index).isChecked()) await checkboxes.nth(index).uncheck();
  }
  await page.waitForFunction(() => document.querySelector("[data-spatial-local-fixture-visible='false']"), undefined, { timeout: 10_000 });
}

async function selectControlledFixture(page) {
  const canvas = page.locator(".mapboxgl-canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no bounding box.");
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await page.getByText(/Selected: Controlled OSM attribution point/).first().waitFor({ state: "visible", timeout: 15_000 });
}

async function runLanding(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const stateRef = { current: "landing" };
  attachConsole(page, viewport.name, stateRef);
  await navigate(page, `${previewBaseUrl}/`);
  const mapRoot = page.locator("[data-landing-basemap-mode='mapbox']");
  await mapRoot.waitFor({ state: "attached", timeout: 30_000 });
  const nativeAttribution = page.locator(".mapboxgl-ctrl-attrib").first();
  await nativeAttribution.waitFor({ state: "visible", timeout: 30_000 });
  const screenshot = await capture(page, viewport.name, "landing-mapbox-attribution");
  const attributionBox = await nativeAttribution.boundingBox();
  const heroCopyBox = await page.getByRole("heading", { name: "GeoAI spatial decision intelligence" }).locator("..").boundingBox();
  const ctaBox = await page.getByRole("link", { name: "Open workspace" }).boundingBox();
  const productCardBox = await page.getByText("Select target or criteria", { exact: true }).locator("..").boundingBox();
  const horizontalOverflowPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const result = {
    viewport: viewport.name,
    screenshot,
    basemapMode: await mapRoot.getAttribute("data-landing-basemap-mode"),
    nativeAttributionVisible: await nativeAttribution.isVisible(),
    overlaps: {
      heroCopyPx: intersects(attributionBox, heroCopyBox),
      ctaPx: intersects(attributionBox, ctaBox),
      productStripPx: intersects(attributionBox, productCardBox)
    },
    horizontalOverflowPx
  };
  record(`${viewport.name} Landing Mapbox attribution visible`, result.nativeAttributionVisible, JSON.stringify(result));
  record(`${viewport.name} Landing attribution avoids hero copy`, result.overlaps.heroCopyPx === 0, JSON.stringify(result.overlaps));
  record(`${viewport.name} Landing attribution avoids hero CTA`, result.overlaps.ctaPx === 0, JSON.stringify(result.overlaps));
  record(`${viewport.name} Landing attribution avoids Product strip`, result.overlaps.productStripPx === 0, JSON.stringify(result.overlaps));
  record(`${viewport.name} Landing horizontal overflow zero`, horizontalOverflowPx === 0, `overflow=${horizontalOverflowPx}`);
  landingResults.push(result);
  await context.close();
}

async function runWorkspace(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const stateRef = { current: workspaceStates[0] };
  attachConsole(page, viewport.name, stateRef);
  const result = { viewport: viewport.name, states: {}, metrics: {} };

  await navigate(page, `${previewBaseUrl}/workspace`);
  await waitForMap(page);
  const defaultMetrics = await readMetrics(page);
  result.states[workspaceStates[0]] = await capture(page, viewport.name, workspaceStates[0]);
  record(`${viewport.name} Product default synthetic`, defaultMetrics.effectiveSourceMode === "synthetic_fallback", JSON.stringify(defaultMetrics));
  record(`${viewport.name} real geometry count zero`, defaultMetrics.openRealFeatureCount === 0, `count=${defaultMetrics.openRealFeatureCount}`);
  record(`${viewport.name} synthetic layer invariants`, defaultMetrics.syntheticLayerCount === 8 && defaultMetrics.defaultVisibleCount === 5, JSON.stringify(defaultMetrics));
  record(`${viewport.name} visible local fixture attributed`, defaultMetrics.localFixtureVisible === "true" && defaultMetrics.visibleAttributionIds.includes("local-open-geodata-fixture"), JSON.stringify(defaultMetrics));
  record(`${viewport.name} attribution coverage exact`, defaultMetrics.attributionMissing === "" && defaultMetrics.attributionUnexpected === "", JSON.stringify(defaultMetrics));
  record(`${viewport.name} default horizontal overflow zero`, defaultMetrics.horizontalOverflowPx === 0, `overflow=${defaultMetrics.horizontalOverflowPx}`);

  stateRef.current = workspaceStates[1];
  await openLayerPanel(page);
  result.states[workspaceStates[1]] = await capture(page, viewport.name, workspaceStates[1]);
  const panelText = await page.locator("[data-local-open-geodata-fixture]").innerText();
  record(`${viewport.name} local fixture not labelled live OSM`, !/>?\blive OSM\b/i.test(panelText) && !/^OSM$/m.test(panelText), panelText);
  record(`${viewport.name} approved local fixture badge`, /local fixture|OSM-style sample/i.test(panelText), panelText);

  stateRef.current = workspaceStates[2];
  const attributionChip = await openAttribution(page);
  result.states[workspaceStates[2]] = await capture(page, viewport.name, workspaceStates[2]);
  let detailsText = await page.locator("[data-spatial-attribution-details]").innerText();
  record(`${viewport.name} visible fixture disclosure`, detailsText.includes("GeoAI local OSM-style fixture"), detailsText);
  record(`${viewport.name} fixture disclosure avoids inferred licence`, !/OpenStreetMap contributors|ODbL/i.test(detailsText), detailsText);
  record(`${viewport.name} caveat visible`, detailsText.includes(caveat), detailsText);

  const dialog = page.locator("[data-spatial-attribution-details]");
  record(`${viewport.name} modal initial focus`, await page.getByRole("button", { name: "Close data licences" }).evaluate((element) => document.activeElement === element), "close button receives initial focus");
  await page.keyboard.press("Shift+Tab");
  record(`${viewport.name} modal reverse focus stays trapped`, await dialog.evaluate((element) => element.contains(document.activeElement)), "Shift+Tab remains inside dialog");
  await page.keyboard.press("Tab");
  record(`${viewport.name} modal forward focus stays trapped`, await dialog.evaluate((element) => element.contains(document.activeElement)), "Tab remains inside dialog");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  record(`${viewport.name} Escape closes and returns focus`, await attributionChip.evaluate((element) => document.activeElement === element), "focus returns to attribution chip");
  await openAttribution(page);
  await page.mouse.click(2, 2);
  await dialog.waitFor({ state: "hidden" });
  record(`${viewport.name} backdrop closes and returns focus`, await attributionChip.evaluate((element) => document.activeElement === element), "focus returns after backdrop close");

  stateRef.current = workspaceStates[3];
  await hideLocalFixture(page);
  await openAttribution(page);
  result.states[workspaceStates[3]] = await capture(page, viewport.name, workspaceStates[3]);
  detailsText = await page.locator("[data-spatial-attribution-details]").innerText();
  const hiddenMetrics = await readMetrics(page);
  record(`${viewport.name} hidden fixture removes attribution`, !detailsText.includes("GeoAI local OSM-style fixture") && !hiddenMetrics.visibleAttributionIds.includes("local-open-geodata-fixture"), JSON.stringify(hiddenMetrics));
  await closeAttribution(page);

  stateRef.current = workspaceStates[4];
  await navigate(page, `${productionBaseUrl}/workspace?spatialMode=open_context_preview`);
  const fallbackMetrics = await readMetrics(page);
  await openAttribution(page);
  result.states[workspaceStates[4]] = await capture(page, viewport.name, workspaceStates[4]);
  const fallbackText = await page.locator("[data-spatial-attribution-details]").innerText();
  record(`${viewport.name} fallback grid has no Mapbox record`, fallbackMetrics.basemapMode === "fallback_grid" && !fallbackText.includes("Mapbox basemap"), JSON.stringify(fallbackMetrics));
  record(`${viewport.name} Production open request rejected`, fallbackMetrics.runtimeEnvironment === "production" && fallbackMetrics.requestedSourceMode === "open_context_preview" && fallbackMetrics.effectiveSourceMode === "synthetic_fallback" && Boolean(fallbackMetrics.fallbackReason), JSON.stringify(fallbackMetrics));
  await closeAttribution(page);

  await navigate(page, `${previewBaseUrl}/workspace`);
  await waitForMap(page);
  await openLayerPanel(page);
  const navigationCount = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  await page.locator("[data-spatial-source-mode-option='open_context_preview']").click();
  await page.waitForFunction(() => document.querySelector("[data-spatial-effective-source-mode='open_context_preview']"), undefined, { timeout: 15_000 });
  await page.waitForFunction(() => Boolean(document.querySelector("[data-spatial-controlled-source-ids]:not([data-spatial-controlled-source-ids=''])")), undefined, { timeout: 15_000 });
  const fixtureActiveMetrics = await readMetrics(page);
  record(`${viewport.name} synthetic to fixture without reload`, await page.evaluate(() => performance.getEntriesByType("navigation").length) === navigationCount, `navigationEntries=${navigationCount}`);
  record(`${viewport.name} controlled fixture remains non-real`, fixtureActiveMetrics.openFixtureFeatureCount === 2 && fixtureActiveMetrics.openRealFeatureCount === 0, JSON.stringify(fixtureActiveMetrics));
  await closeLayerPanel(page);

  stateRef.current = workspaceStates[5];
  await selectControlledFixture(page);
  result.states[workspaceStates[5]] = await capture(page, viewport.name, workspaceStates[5]);
  await page.waitForFunction(() => Boolean(window.__GEOAI_SPATIAL_B2_EVIDENCE__?.mapSnapshotCaptured), undefined, { timeout: 20_000 });

  stateRef.current = workspaceStates[6];
  await openAttribution(page);
  await page.getByRole("button", { name: "Selected feature lineage" }).click();
  const drawer = page.locator("[data-spatial-lineage-drawer]");
  await drawer.waitFor({ state: "visible" });
  result.states[workspaceStates[6]] = await capture(page, viewport.name, workspaceStates[6]);
  const sourceId = await drawer.locator("[data-lineage-source-id]").innerText();
  const providerFeatureId = await drawer.locator("[data-lineage-provider-feature-id]").innerText();
  record(`${viewport.name} source ID exact`, sourceId === "controlled-osm-attribution-fixture", sourceId);
  record(`${viewport.name} provider feature ID exact`, providerFeatureId === "invented-point-01", providerFeatureId);
  record(`${viewport.name} lineage initial focus`, await page.getByRole("button", { name: "Close source lineage" }).evaluate((element) => document.activeElement === element), "close button receives focus");
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "hidden" });
  record(`${viewport.name} lineage Escape returns focus`, await attributionChip.evaluate((element) => document.activeElement === element), "focus returns to attribution chip");
  record(`${viewport.name} selected object survives disclosure`, await page.getByText(/Selected: Controlled OSM attribution point/).first().isVisible(), "selection remains visible");

  stateRef.current = workspaceStates[7];
  await openLayerPanel(page);
  await page.locator("[data-spatial-source-mode-option='synthetic_fallback']").click();
  await page.waitForFunction(() => document.querySelector("[data-spatial-effective-source-mode='synthetic_fallback']"), undefined, { timeout: 15_000 });
  await page.waitForFunction(() => document.querySelector("[data-spatial-obsolete-controlled-source-count='0'][data-spatial-controlled-source-ids='']"), undefined, { timeout: 15_000 });
  const rollbackMetrics = await readMetrics(page);
  result.states[workspaceStates[7]] = await capture(page, viewport.name, workspaceStates[7]);
  record(`${viewport.name} fixture to synthetic without reload`, await page.evaluate(() => performance.getEntriesByType("navigation").length) === navigationCount, `navigationEntries=${navigationCount}`);
  record(`${viewport.name} obsolete fixture sources zero`, rollbackMetrics.obsoleteControlledSourceCount === 0 && rollbackMetrics.controlledSourceIds === "" && rollbackMetrics.controlledLayerIds === "", JSON.stringify(rollbackMetrics));
  record(`${viewport.name} invalid fixture selection rolled back`, Boolean(rollbackMetrics.selectionRollbackReason) && !(await page.getByText(/Selected: Controlled OSM attribution point/).first().isVisible().catch(() => false)), JSON.stringify(rollbackMetrics));

  stateRef.current = workspaceStates[8];
  result.states[workspaceStates[8]] = await capture(page, viewport.name, workspaceStates[8]);
  const finalOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  record(`${viewport.name} map snapshot regression`, fixtureActiveMetrics.telemetry?.mapSnapshotCaptured === true || rollbackMetrics.telemetry?.mapSnapshotCaptured === true, JSON.stringify({ fixtureActiveMetrics, rollbackMetrics }));
  record(`${viewport.name} final horizontal overflow zero`, finalOverflow === 0, `overflow=${finalOverflow}`);

  result.metrics = { default: defaultMetrics, hiddenFixture: hiddenMetrics, fallback: fallbackMetrics, fixtureActive: fixtureActiveMetrics, rollback: rollbackMetrics };
  viewportResults.push(result);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runLanding(browser, viewports[0]);
  await runLanding(browser, viewports[4]);
  for (const viewport of viewports) await runWorkspace(browser, viewport);
} finally {
  await browser.close();
}

const javascriptErrors = browserConsole.filter((entry) => entry.type === "error" || entry.type === "pageerror");
const warnings = browserConsole.filter((entry) => entry.type === "warning");
const allowlistedWebglWarnings = warnings.filter((entry) => warningAllowlist.some((pattern) => pattern.test(entry.text)));
const unexpectedWarnings = warnings.filter((entry) => !warningAllowlist.some((pattern) => pattern.test(entry.text)));
const warningInventory = {
  javascriptErrorCount: javascriptErrors.length,
  allowlistedWebglWarningCount: allowlistedWebglWarnings.length,
  unexpectedWarningCount: unexpectedWarnings.length,
  allowlistedWebglWarnings,
  unexpectedWarnings,
  preserveDrawingBufferRelationship: "Existing map snapshot capture uses preserveDrawingBuffer; headless GPU ReadPixels warnings are an allowlisted non-blocking performance limitation."
};
record("JavaScript errors zero", warningInventory.javascriptErrorCount === 0, JSON.stringify(javascriptErrors));
record("Unexpected browser warnings zero", warningInventory.unexpectedWarningCount === 0, JSON.stringify(unexpectedWarnings));

const reportRoutes = [
  "/reports/seeded-analysis-dubai-marina-report/print",
  "/reports/seeded-comparison-dubai-shortlist-report/print"
];
const reportRouteResults = [];
for (const route of reportRoutes) {
  const response = await fetch(`${previewBaseUrl}${route}`);
  reportRouteResults.push({ route, status: response.status });
  record(`Report route ${route} returns 200`, response.status === 200, `status=${response.status}`);
}

const metadata = {
  testedCommitSha,
  workflowCommitSha,
  previewUrl: previewBaseUrl,
  previewDeploymentId,
  generatedAt: new Date().toISOString(),
  viewports,
  landingViewports: [viewports[0], viewports[4]],
  workspaceStates,
  screenshotCount: viewports.length * workspaceStates.length + 2,
  reportRouteResults,
  caveat
};

await fs.writeFile(path.join(evidenceDir, "browser-metrics.json"), `${JSON.stringify({ metadata, landingResults, viewportResults, assertions }, null, 2)}\n`);
await fs.writeFile(path.join(evidenceDir, "landing-attribution.json"), `${JSON.stringify(landingResults, null, 2)}\n`);
await fs.writeFile(path.join(evidenceDir, "activation-transition-inventory.json"), `${JSON.stringify(viewportResults.map(({ viewport, metrics }) => ({ viewport, before: metrics.fixtureActive, after: metrics.rollback })), null, 2)}\n`);
await fs.writeFile(path.join(evidenceDir, "browser-warning-inventory.json"), `${JSON.stringify(warningInventory, null, 2)}\n`);
await fs.writeFile(path.join(evidenceDir, "browser-console.log"), `${browserConsole.map((entry) => `${entry.viewport}\t${entry.state}\t${entry.type}\t${entry.text}`).join("\n")}\n`);
await fs.writeFile(path.join(evidenceDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);

const passedCount = assertions.filter((assertion) => assertion.passed).length;
const summary = [
  "# Spatial B2A Corrective Browser Evidence",
  "",
  `- Tested Product commit: \`${testedCommitSha}\``,
  `- Evidence workflow commit: \`${workflowCommitSha}\``,
  `- Preview deployment: \`${previewDeploymentId}\``,
  `- Preview URL: ${previewBaseUrl}`,
  `- Screenshots: ${metadata.screenshotCount}`,
  `- Assertions: ${passedCount}/${assertions.length} passed`,
  `- JavaScript errors: ${warningInventory.javascriptErrorCount}`,
  `- Allowlisted WebGL warnings: ${warningInventory.allowlistedWebglWarningCount}`,
  `- Unexpected warnings: ${warningInventory.unexpectedWarningCount}`,
  "",
  "## Captured scope",
  "",
  "Landing attribution at 390x844 and 1440x900; five Workspace viewports across default, layer, attribution, fallback, controlled selection, identity, rollback and map-snapshot states; source/delivery and generic-adapter matrices; logs and exact deployment metadata.",
  "",
  "## Warning classification",
  "",
  warningInventory.preserveDrawingBufferRelationship,
  "",
  "## Data honesty",
  "",
  caveat,
  "",
  failures.length ? "## Failures" : "## Result",
  "",
  ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["All hard browser assertions passed."])
].join("\n");
await fs.writeFile(path.join(evidenceDir, "summary.md"), `${summary}\n`);

if (failures.length) throw new Error(`${failures.length} browser evidence assertions failed. See summary.md.`);
console.log(`Spatial B2A corrective browser evidence passed (${passedCount} assertions, ${metadata.screenshotCount} screenshots).`);
