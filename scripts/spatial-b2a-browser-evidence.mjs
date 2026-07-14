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
const states = [
  "default-synthetic-workspace",
  "expanded-layer-panel",
  "attribution-chip-collapsed",
  "attribution-details-expanded",
  "controlled-test-feature-lineage-drawer",
  "production-open-request-rejection",
  "preview-controlled-test-mode",
  "mobile-attribution-details",
  "map-snapshot-regression"
];

const screenshotsDir = path.join(evidenceDir, "screenshots");
await fs.mkdir(screenshotsDir, { recursive: true });

const browserConsole = [];
const failures = [];
const assertions = [];
const viewportResults = [];

function record(name, passed, detail) {
  assertions.push({ name, passed, detail });
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

async function attachConsole(page, viewport, state) {
  page.on("console", (message) => {
    browserConsole.push({ viewport, state, type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => {
    browserConsole.push({ viewport, state, type: "pageerror", text: error.message });
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

async function ensureMapInView(page, preferPicker = false) {
  if (preferPicker) {
    const openMap = page.getByRole("button", { name: "Open map", exact: true });
    if (await openMap.isVisible().catch(() => false)) {
      await openMap.click();
      await page.getByRole("dialog", { name: "Full-screen map picker" }).waitFor({ state: "visible" });
    }
  }
  const spatialRoot = await root(page);
  await spatialRoot.scrollIntoViewIfNeeded();
  return spatialRoot;
}

async function waitForMap(page) {
  const spatialRoot = await root(page);
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
    fallbackReason: element.getAttribute("data-spatial-fallback-reason"),
    syntheticLayerCount: element.getAttribute("data-spatial-synthetic-layer-count"),
    defaultVisibleCount: element.getAttribute("data-spatial-default-visible-count"),
    openFixtureFeatureCount: element.getAttribute("data-spatial-open-fixture-feature-count"),
    openRealFeatureCount: element.getAttribute("data-spatial-open-real-feature-count"),
    mapSourceCount: element.getAttribute("data-spatial-map-source-count"),
    mapLayerCount: element.getAttribute("data-spatial-map-layer-count"),
    openGeodataLayerCount: element.getAttribute("data-spatial-open-geodata-layer-count"),
    openGeodataFeatureCount: element.getAttribute("data-spatial-open-geodata-feature-count"),
    openGeodataSelectableCount: element.getAttribute("data-spatial-open-geodata-selectable-count"),
    mapReadyMs: element.getAttribute("data-spatial-map-ready-ms"),
    layerRegistrationMs: element.getAttribute("data-spatial-layer-registration-ms")
  }));
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const telemetry = await page.evaluate(() => window.__GEOAI_SPATIAL_B2_EVIDENCE__ ?? null);
  return {
    ...attributes,
    syntheticLayerCount: numberAttribute(attributes.syntheticLayerCount),
    defaultVisibleCount: numberAttribute(attributes.defaultVisibleCount),
    openFixtureFeatureCount: numberAttribute(attributes.openFixtureFeatureCount),
    openRealFeatureCount: numberAttribute(attributes.openRealFeatureCount),
    mapSourceCount: numberAttribute(attributes.mapSourceCount),
    mapLayerCount: numberAttribute(attributes.mapLayerCount),
    openGeodataLayerCount: numberAttribute(attributes.openGeodataLayerCount),
    openGeodataFeatureCount: numberAttribute(attributes.openGeodataFeatureCount),
    openGeodataSelectableCount: numberAttribute(attributes.openGeodataSelectableCount),
    mapReadyMs: numberAttribute(attributes.mapReadyMs),
    layerRegistrationMs: numberAttribute(attributes.layerRegistrationMs),
    horizontalOverflowPx: overflow,
    telemetry
  };
}

async function screenshot(page, viewportName, state) {
  const file = path.join(screenshotsDir, `${viewportName}-${state}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(evidenceDir, file);
}

async function selectControlledFixture(page) {
  const fixtureButton = page.locator("[data-controlled-fixture-key]").first();
  if (await fixtureButton.isVisible().catch(() => false)) {
    await fixtureButton.click();
  } else {
    const canvas = page.locator(".mapboxgl-canvas").last();
    await canvas.waitFor({ state: "visible", timeout: 30_000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Map canvas has no bounding box.");
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  }
  await page.getByText(/Selected: Controlled OSM attribution point/).last().waitFor({ state: "visible", timeout: 15_000 });
}

async function openAttribution(page) {
  const chip = page.locator("[data-spatial-attribution-chip]").last();
  await chip.waitFor({ state: "visible", timeout: 15_000 });
  await chip.click();
  await page.locator("[data-spatial-attribution-details]").waitFor({ state: "visible" });
}

async function closeAttribution(page) {
  const close = page.getByRole("button", { name: "Close data licences" });
  if (await close.isVisible().catch(() => false)) await close.click();
}

async function runViewport(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const result = { viewport: viewport.name, states: {}, assertions: [] };

  await attachConsole(page, viewport.name, "default-synthetic-workspace");
  await navigate(page, `${previewBaseUrl}/workspace`);
  result.states[states[0]] = await screenshot(page, viewport.name, states[0]);
  const defaultRoot = await ensureMapInView(page);
  await waitForMap(page);
  const defaultMetrics = await readMetrics(page);
  record(`${viewport.name} default mode is synthetic`, defaultMetrics.effectiveSourceMode === "synthetic_fallback", JSON.stringify(defaultMetrics));
  record(`${viewport.name} synthetic catalogue count`, defaultMetrics.syntheticLayerCount === 8, `count=${defaultMetrics.syntheticLayerCount}`);
  record(`${viewport.name} default visible count`, defaultMetrics.defaultVisibleCount === 5, `count=${defaultMetrics.defaultVisibleCount}`);
  record(`${viewport.name} default real geometry zero`, defaultMetrics.openRealFeatureCount === 0, `count=${defaultMetrics.openRealFeatureCount}`);
  record(`${viewport.name} legacy open-geodata registered`, defaultMetrics.openGeodataLayerCount > 0 && defaultMetrics.openGeodataFeatureCount > 0 && defaultMetrics.openGeodataSelectableCount > 0, JSON.stringify(defaultMetrics));
  record(`${viewport.name} default horizontal overflow`, defaultMetrics.horizontalOverflowPx === 0, `overflow=${defaultMetrics.horizontalOverflowPx}`);

  const layerButton = page.getByRole("button").filter({ hasText: "Spatial layers" }).first();
  await layerButton.scrollIntoViewIfNeeded();
  await layerButton.click();
  await page.getByText("Basemap + GeoAI signals").waitFor({ state: "visible" });
  result.states[states[1]] = await screenshot(page, viewport.name, states[1]);
  record(`${viewport.name} expanded layer panel visible`, await page.getByText("Basemap + GeoAI signals").isVisible(), "layer panel must be visible");

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureMapInView(page);
  const chip = page.locator("[data-spatial-attribution-chip]").first();
  await chip.waitFor({ state: "visible" });
  result.states[states[2]] = await screenshot(page, viewport.name, states[2]);
  record(`${viewport.name} GeoAI attribution chip visible`, await chip.isVisible(), "chip must remain additive");

  await openAttribution(page);
  result.states[states[3]] = await screenshot(page, viewport.name, states[3]);
  const detailsText = await page.locator("[data-spatial-attribution-details]").innerText();
  record(`${viewport.name} attribution identifies Mapbox`, detailsText.includes("Mapbox"), detailsText);
  record(`${viewport.name} attribution identifies GeoAI`, detailsText.includes("GeoAI"), detailsText);
  record(`${viewport.name} synthetic attribution excludes fixture providers`, !detailsText.includes("OpenStreetMap contributors") && !detailsText.includes("Overture Maps Foundation"), detailsText);
  record(`${viewport.name} caveat visible in licences`, detailsText.includes(caveat), "required caveat must be visible");
  await closeAttribution(page);

  await navigate(page, `${previewBaseUrl}/workspace?spatialMode=open_context_preview`);
  await ensureMapInView(page, viewport.width <= 768);
  await waitForMap(page);
  await selectControlledFixture(page);
  await openAttribution(page);
  const lineageButton = page.getByRole("button", { name: "Selected feature lineage" });
  await lineageButton.click();
  const drawer = page.locator("[data-spatial-lineage-drawer]");
  await drawer.waitFor({ state: "visible" });
  result.states[states[4]] = await screenshot(page, viewport.name, states[4]);
  const drawerText = await drawer.innerText();
  for (let section = 1; section <= 9; section += 1) {
    record(`${viewport.name} lineage section ${section}`, drawerText.includes(`${section}.`), `drawer must include section ${section}`);
  }
  record(`${viewport.name} lineage caveat`, drawerText.includes(caveat), "required caveat must be visible");
  await page.getByRole("button", { name: "Close source lineage" }).click();
  record(`${viewport.name} selection preserved after drawer close`, await page.getByText(/Selected: Controlled OSM attribution point/).last().isVisible(), "selection must remain visible");

  await navigate(page, `${productionBaseUrl}/workspace?spatialMode=open_context_preview`);
  await ensureMapInView(page);
  const productionMetrics = await readMetrics(page);
  const fallbackChip = page.locator("[data-spatial-fallback-chip]").first();
  await fallbackChip.waitFor({ state: "visible" });
  result.states[states[5]] = await screenshot(page, viewport.name, states[5]);
  record(`${viewport.name} production rejects open request`, productionMetrics.runtimeEnvironment === "production" && productionMetrics.requestedSourceMode === "open_context_preview" && productionMetrics.effectiveSourceMode === "synthetic_fallback" && Boolean(productionMetrics.fallbackReason), JSON.stringify(productionMetrics));
  record(`${viewport.name} production real geometry zero`, productionMetrics.openRealFeatureCount === 0 && productionMetrics.openFixtureFeatureCount === 0, JSON.stringify(productionMetrics));
  record(`${viewport.name} production fallback visible`, await fallbackChip.isVisible(), "fallback badge must be visible");

  await navigate(page, `${previewBaseUrl}/workspace?spatialMode=open_context_preview`);
  await ensureMapInView(page, viewport.width <= 768);
  await waitForMap(page);
  const previewMetrics = await readMetrics(page);
  result.states[states[6]] = await screenshot(page, viewport.name, states[6]);
  record(`${viewport.name} Preview controlled mode`, previewMetrics.runtimeEnvironment === "preview" && previewMetrics.effectiveSourceMode === "open_context_preview", JSON.stringify(previewMetrics));
  record(`${viewport.name} Preview fixture-only geometry`, previewMetrics.openFixtureFeatureCount === 2 && previewMetrics.openRealFeatureCount === 0, JSON.stringify(previewMetrics));
  record(`${viewport.name} registration timing bounded`, previewMetrics.mapReadyMs > 0 && previewMetrics.mapReadyMs < 30_000 && previewMetrics.layerRegistrationMs >= 0 && previewMetrics.layerRegistrationMs < 5_000, JSON.stringify(previewMetrics));

  await openAttribution(page);
  result.states[states[7]] = await screenshot(page, viewport.name, states[7]);
  const previewDetails = await page.locator("[data-spatial-attribution-details]").innerText();
  record(`${viewport.name} OSM and Overture attribution separate`, previewDetails.includes("OpenStreetMap contributors") && previewDetails.includes("Overture Maps Foundation"), previewDetails);
  const mapboxAttribution = page.locator(".mapboxgl-ctrl-attrib").last();
  record(`${viewport.name} Mapbox native attribution remains`, await mapboxAttribution.isVisible().catch(() => false), "native Mapbox attribution must remain visible");
  await closeAttribution(page);
  const chipBox = await page.locator("[data-spatial-attribution-chip]").last().boundingBox();
  const mapboxBox = await mapboxAttribution.boundingBox().catch(() => null);
  record(`${viewport.name} attribution controls do not overlap`, intersects(chipBox, mapboxBox) === 0, `intersection=${intersects(chipBox, mapboxBox)}`);

  await selectControlledFixture(page);
  await page.waitForFunction(() => Boolean(window.__GEOAI_SPATIAL_B2_EVIDENCE__?.mapSnapshotCaptured), undefined, { timeout: 20_000 });
  result.states[states[8]] = await screenshot(page, viewport.name, states[8]);
  const finalMetrics = await readMetrics(page);
  record(`${viewport.name} map snapshot captured`, finalMetrics.telemetry?.mapSnapshotCaptured === true && finalMetrics.telemetry?.mapSnapshotWidth > 0 && finalMetrics.telemetry?.mapSnapshotHeight > 0, JSON.stringify(finalMetrics.telemetry));
  record(`${viewport.name} final horizontal overflow`, finalMetrics.horizontalOverflowPx === 0, `overflow=${finalMetrics.horizontalOverflowPx}`);

  const viewportConsoleErrors = browserConsole.filter((entry) => entry.viewport === viewport.name && ["error", "pageerror"].includes(entry.type));
  record(`${viewport.name} browser console clear`, viewportConsoleErrors.length === 0, JSON.stringify(viewportConsoleErrors));
  result.metrics = { default: defaultMetrics, productionRejection: productionMetrics, previewControlled: previewMetrics, final: finalMetrics };
  viewportResults.push(result);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    await runViewport(browser, viewport);
  }
} finally {
  await browser.close();
}

const metadata = {
  testedCommitSha,
  workflowCommitSha,
  previewUrl: previewBaseUrl,
  previewDeploymentId,
  productionTestUrl: productionBaseUrl,
  generatedAt: new Date().toISOString(),
  viewports,
  states,
  screenshotCount: viewports.length * states.length,
  caveat
};

await fs.writeFile(path.join(evidenceDir, "browser-metrics.json"), `${JSON.stringify({ metadata, viewportResults, assertions }, null, 2)}\n`);
await fs.writeFile(path.join(evidenceDir, "map-registration-timing.json"), `${JSON.stringify(viewportResults.map((entry) => ({ viewport: entry.viewport, mapReadyMs: entry.metrics.previewControlled.mapReadyMs, layerRegistrationMs: entry.metrics.previewControlled.layerRegistrationMs })), null, 2)}\n`);
await fs.writeFile(path.join(evidenceDir, "browser-console.log"), `${browserConsole.map((entry) => `${entry.viewport}\t${entry.state}\t${entry.type}\t${entry.text}`).join("\n")}\n`);
await fs.writeFile(path.join(evidenceDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);

const passedCount = assertions.filter((assertion) => assertion.passed).length;
const summary = [
  "# Spatial B2A Browser Evidence",
  "",
  `- Tested Product commit: \`${testedCommitSha}\``,
  `- Evidence workflow commit: \`${workflowCommitSha}\``,
  `- Preview deployment: \`${previewDeploymentId}\``,
  `- Preview URL: ${previewBaseUrl}`,
  `- Screenshots: ${metadata.screenshotCount}`,
  `- Assertions: ${passedCount}/${assertions.length} passed`,
  `- Failures: ${failures.length}`,
  "",
  "## Viewports",
  "",
  ...viewports.map((viewport) => `- ${viewport.name}: nine required states captured`),
  "",
  "## Data Honesty",
  "",
  caveat,
  "",
  failures.length ? "## Failures" : "## Result",
  "",
  ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["All P0 browser assertions passed."])
].join("\n");
await fs.writeFile(path.join(evidenceDir, "summary.md"), `${summary}\n`);

if (failures.length) {
  throw new Error(`${failures.length} browser evidence assertions failed. See summary.md.`);
}

console.log(`Spatial B2A browser evidence passed (${passedCount} assertions, ${metadata.screenshotCount} screenshots).`);
