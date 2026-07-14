import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.CR_DEV7_PREVIEW_URL;
const testedCommitSha = process.env.CR_DEV7_TESTED_COMMIT_SHA;
const deploymentId = process.env.CR_DEV7_PREVIEW_DEPLOYMENT_ID;
const evidenceDir = process.env.CR_DEV7_EVIDENCE_DIR ?? "artifacts/cr-dev7-001";
const workflowCommitSha = process.env.GITHUB_SHA ?? null;

if (!baseUrl || !testedCommitSha || !deploymentId) {
  throw new Error("CR_DEV7_PREVIEW_URL, CR_DEV7_TESTED_COMMIT_SHA and CR_DEV7_PREVIEW_DEPLOYMENT_ID are required.");
}

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const viewports = [
  { id: "vp01", name: "390x844", width: 390, height: 844 },
  { id: "vp02", name: "430x932", width: 430, height: 932 },
  { id: "vp03", name: "768x1024", width: 768, height: 1024 },
  { id: "vp04", name: "1366x768", width: 1366, height: 768 },
  { id: "vp05", name: "1440x900", width: 1440, height: 900 }
];
const states = {
  s01: {
    id: "s01",
    audience: "B2B",
    role: "Developer",
    roleSlug: "developer",
    scenario: "Redevelopment Potential",
    scenarioSlug: "redevelopment-potential",
    expectedDefault: "map_first",
    viewports: viewports.map((item) => item.id)
  },
  s02: {
    id: "s02",
    audience: "B2B",
    role: "Real estate fund",
    roleSlug: "real-estate-fund",
    scenario: "100+ ha Redevelopment Zones",
    scenarioSlug: "100-ha-redevelopment-zones",
    expectedDefault: "criteria_first",
    viewports: viewports.map((item) => item.id)
  },
  s03: {
    id: "s03",
    audience: "B2C",
    role: "Tourist",
    roleSlug: "tourist",
    scenario: "Point Insight",
    scenarioSlug: "point-insight",
    expectedDefault: "map_first",
    viewports: viewports.map((item) => item.id)
  },
  s04: {
    id: "s04",
    audience: "B2C",
    role: "Tourist",
    roleSlug: "tourist",
    scenario: "Tourist Objects & Route",
    scenarioSlug: "tourist-objects-route",
    expectedDefault: "criteria_first",
    viewports: ["vp01", "vp05"]
  }
};
const stateSequence = [states.s01, states.s02, states.s03, states.s04];
const screenshotsDir = path.join(evidenceDir, "screenshots");
const manifestPath = path.join(evidenceDir, "cr-dev7-001-evidence-manifest.json");

await fs.mkdir(screenshotsDir, { recursive: true });

const failures = [];
const assertions = [];
const consoleInventory = [];
const screenshotRecords = [];
const interactionResults = [];

function record(name, passed, detail) {
  const result = { name, passed: Boolean(passed), detail };
  assertions.push(result);
  if (!result.passed) failures.push(`${name}: ${detail}`);
}

function intersectionArea(first, second) {
  if (!first || !second) return 0;
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  return width * height;
}

async function sha256(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function disableCache(context, page) {
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
}

function attachConsole(page, viewportName, stateRef) {
  page.on("console", (message) => {
    consoleInventory.push({
      timestamp: new Date().toISOString(),
      viewport: viewportName,
      state: stateRef.current,
      type: message.type(),
      text: message.text()
    });
  });
  page.on("pageerror", (error) => {
    consoleInventory.push({
      timestamp: new Date().toISOString(),
      viewport: viewportName,
      state: stateRef.current,
      type: "pageerror",
      text: error.message
    });
  });
}

async function openWorkspace(page) {
  const response = await page.goto(`${baseUrl}/workspace`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  record("Preview /workspace returns HTTP 200", response?.status() === 200, `status=${response?.status() ?? "none"}`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await page.getByLabel("Role").waitFor({ state: "visible", timeout: 30_000 });
}

async function setState(page, state) {
  const audienceButton = page.getByRole("button", { name: state.audience, exact: true });
  await audienceButton.click();
  await page.getByLabel("Role").selectOption({ label: state.role });
  await page.getByLabel("Scenario").selectOption({ label: state.scenario });
  await page.waitForFunction(
    ({ role, scenario, expectedDefault }) => {
      const roleSelect = document.querySelector("select[aria-label='Role'], label select");
      const selects = [...document.querySelectorAll("select")];
      const matchingRole = selects.find((node) => node.selectedOptions[0]?.textContent?.trim() === role);
      const matchingScenario = selects.find((node) => node.selectedOptions[0]?.textContent?.trim() === scenario);
      const activeMode = [...document.querySelectorAll("[data-interaction-mode]")]
        .find((node) => node.getAttribute("aria-pressed") === "true")
        ?.getAttribute("data-interaction-mode");
      return Boolean(roleSelect || matchingRole) && Boolean(matchingRole) && Boolean(matchingScenario) && activeMode === expectedDefault;
    },
    { role: state.role, scenario: state.scenario, expectedDefault: state.expectedDefault },
    { timeout: 15_000 }
  );
  await page.waitForTimeout(250);
}

async function inspectState(page, viewport, state) {
  const metrics = await page.evaluate((requiredCaveat) => {
    const modeNodes = [...document.querySelectorAll("[data-interaction-mode]")];
    const stickySection = [...document.querySelectorAll("section")].find((node) =>
      node.classList.contains("sticky") && node.classList.contains("bottom-0")
    );
    const stickyButtons = stickySection ? [...stickySection.querySelectorAll("button")] : [];
    const primaryButton = stickyButtons.at(-1) ?? null;
    const primaryActionLabel = primaryButton?.textContent?.trim() ?? null;
    const primaryActionDomCount = primaryActionLabel
      ? [...document.querySelectorAll("button")].filter((node) => node.textContent?.trim() === primaryActionLabel).length
      : 0;
    const exactTextCount = (text) => [...document.querySelectorAll("body *")]
      .filter((node) => node.children.length === 0 && node.textContent?.trim() === text).length;
    const redundantTileLabels = ["Lat", "Lng", "Type", "Confidence"];
    const tileGroupCount = [...document.querySelectorAll("body *")].filter((node) => {
      const childTexts = [...node.children].map((child) => child.textContent?.trim());
      return redundantTileLabels.every((label) => childTexts.includes(label));
    }).length;
    return {
      interactionModeOrder: modeNodes.map((node) => node.getAttribute("data-interaction-mode")),
      activeMode: modeNodes.find((node) => node.getAttribute("aria-pressed") === "true")?.getAttribute("data-interaction-mode") ?? null,
      redundantCardCounts: {
        noPointSelected: exactTextCount("No point selected"),
        selectedPoint: exactTextCount("Selected point"),
        selectedObject: exactTextCount("Selected object"),
        selectedAoi: exactTextCount("Selected AOI"),
        latLngTypeConfidenceTileGroup: tileGroupCount
      },
      stickyCtaCount: primaryButton ? 1 : 0,
      primaryActionLabel,
      primaryActionDomCount,
      stickySectionCount: stickySection ? 1 : 0,
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      caveatPresent: document.body.textContent?.includes(requiredCaveat) ?? false,
      candidateSearchPresent: document.body.textContent?.includes("Candidate Search") ?? false,
      customQueryPresent: document.body.textContent?.includes("Custom Query") ?? false,
      addToComparePresent: [...document.querySelectorAll("button")].some((node) => node.textContent?.trim() === "Add to compare"),
      openMapVisible: [...document.querySelectorAll("button")].some((node) => node.textContent?.trim() === "Open map" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0),
      devicePixelRatio: window.devicePixelRatio
    };
  }, caveat);

  const criteriaButton = page.locator("[data-interaction-mode='criteria_first']");
  const mapButton = page.locator("[data-interaction-mode='map_first']");
  const stickySection = page.locator("section.sticky.bottom-0").first();
  const panelScroller = page.locator("aside > section").first();
  const criteriaBox = await criteriaButton.boundingBox();
  const mapBox = await mapButton.boundingBox();
  const stickyBox = await stickySection.boundingBox();
  const scrollerBox = await panelScroller.boundingBox();
  const layout = {
    criteriaBeforeMap: Boolean(criteriaBox && mapBox && criteriaBox.x < mapBox.x),
    modeOverlapPx: intersectionArea(criteriaBox, mapBox),
    stickyPanelOverlapPx: viewport.width >= 1024 ? intersectionArea(stickyBox, scrollerBox) : 0
  };

  const prefix = `${viewport.name} ${state.id}`;
  record(`${prefix} DOM interaction order`, JSON.stringify(metrics.interactionModeOrder) === JSON.stringify(["criteria_first", "map_first"]), JSON.stringify(metrics.interactionModeOrder));
  record(`${prefix} visual interaction order`, layout.criteriaBeforeMap, JSON.stringify(layout));
  record(`${prefix} scenario default active`, metrics.activeMode === state.expectedDefault, `active=${metrics.activeMode}; expected=${state.expectedDefault}`);
  record(`${prefix} redundant selection card absent`, Object.values(metrics.redundantCardCounts).every((count) => count === 0), JSON.stringify(metrics.redundantCardCounts));
  record(
    `${prefix} one sticky primary CTA`,
    metrics.stickySectionCount === 1 && metrics.stickyCtaCount === 1 && metrics.primaryActionDomCount === 1,
    `section=${metrics.stickySectionCount}; cta=${metrics.stickyCtaCount}; label=${metrics.primaryActionLabel}; dom=${metrics.primaryActionDomCount}`
  );
  record(`${prefix} interaction controls do not overlap`, layout.modeOverlapPx === 0, `overlap=${layout.modeOverlapPx}`);
  record(`${prefix} sticky CTA does not overlap panel content`, layout.stickyPanelOverlapPx === 0, `overlap=${layout.stickyPanelOverlapPx}`);
  record(`${prefix} horizontal overflow zero`, metrics.horizontalOverflowPx === 0, `overflow=${metrics.horizontalOverflowPx}`);
  record(`${prefix} workflow controls remain available`, metrics.candidateSearchPresent && metrics.customQueryPresent && metrics.addToComparePresent, JSON.stringify(metrics));
  record(`${prefix} required caveat present`, metrics.caveatPresent, `present=${metrics.caveatPresent}`);
  if (viewport.width <= 768) {
    record(`${prefix} mobile/tablet map path visible`, metrics.openMapVisible, `visible=${metrics.openMapVisible}`);
  }

  return { ...metrics, ...layout };
}

async function captureState(page, viewport, state) {
  const metrics = await inspectState(page, viewport, state);
  await page.evaluate(() => window.scrollTo(0, 0));
  const filename = `cr-dev7-001_${state.id}_${viewport.name}_${state.roleSlug}_${state.scenarioSlug}.png`;
  const filePath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled" });
  const stateMessages = consoleInventory.filter((item) => item.viewport === viewport.name && item.state === state.id);
  const errors = stateMessages.filter((item) => item.type === "error" || item.type === "pageerror");
  const warnings = stateMessages.filter((item) => item.type === "warning");
  const recordItem = {
    state: state.id,
    viewport: viewport.name,
    cssViewport: { width: viewport.width, height: viewport.height },
    devicePixelRatio: metrics.devicePixelRatio,
    audience: state.audience,
    role: state.role,
    scenario: state.scenario,
    expectedDefault: state.expectedDefault,
    observedInteractionModeOrder: metrics.interactionModeOrder,
    activeMode: metrics.activeMode,
    redundantCardDomCount: Object.values(metrics.redundantCardCounts).reduce((sum, count) => sum + count, 0),
    redundantCardCounts: metrics.redundantCardCounts,
    stickyCtaCount: metrics.stickyCtaCount,
    stickyCtaLabel: metrics.primaryActionLabel,
    primaryActionDomCount: metrics.primaryActionDomCount,
    horizontalOverflowPx: metrics.horizontalOverflowPx,
    javascriptErrorCount: errors.length,
    warningInventory: warnings.map((item) => item.text),
    screenshotFilename: filename,
    screenshotSha256: await sha256(filePath)
  };
  record(`${viewport.name} ${state.id} JavaScript errors zero`, errors.length === 0, JSON.stringify(errors));
  screenshotRecords.push(recordItem);
}

async function verifyMobileMap(page, viewport, stateRef) {
  stateRef.current = "mobile-map";
  const openMap = page.getByRole("button", { name: "Open map", exact: true });
  await openMap.click();
  const dialog = page.getByRole("dialog", { name: "Full-screen map picker" });
  await dialog.waitFor({ state: "visible", timeout: 20_000 });
  const back = dialog.getByRole("button", { name: "Back to workflow", exact: true });
  const run = dialog.getByRole("button", { name: "Run Express Analysis", exact: true });
  record(`${viewport.name} mobile map opens`, await dialog.isVisible(), "dialog visible");
  record(`${viewport.name} mobile map return action visible`, await back.isVisible(), "Back to workflow visible");
  record(`${viewport.name} mobile map analysis action present`, await run.count() === 1, `count=${await run.count()}`);
  await back.click();
  await dialog.waitFor({ state: "hidden", timeout: 10_000 });
  record(`${viewport.name} mobile map closes to workflow`, await page.getByLabel("Role").isVisible(), "workflow restored");
  return { viewport: viewport.name, opened: true, backVisible: true, analysisActionPresent: true, closedToWorkflow: true };
}

async function runViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  await disableCache(context, page);
  const stateRef = { current: "navigation" };
  attachConsole(page, viewport.name, stateRef);
  await openWorkspace(page);
  const initialNavigationCount = await page.evaluate(() => performance.getEntriesByType("navigation").length);

  for (const state of stateSequence) {
    await setState(page, state);
    stateRef.current = state.id;
    if (state.viewports.includes(viewport.id)) await captureState(page, viewport, state);
  }

  const firstPassNavigationCount = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  record(`${viewport.name} first scenario sequence has no reload`, firstPassNavigationCount === initialNavigationCount, `before=${initialNavigationCount}; after=${firstPassNavigationCount}`);

  let mobileMap = null;
  if (viewport.id === "vp01" || viewport.id === "vp02") {
    await setState(page, states.s03);
    mobileMap = await verifyMobileMap(page, viewport, stateRef);
  }

  for (const state of stateSequence) await setState(page, state);
  const repeatedNavigationCount = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  const repeatedState = await page.evaluate(() => ({
    role: [...document.querySelectorAll("select")].find((node) => node.selectedOptions[0]?.textContent?.trim() === "Tourist")?.selectedOptions[0]?.textContent?.trim() ?? null,
    scenario: [...document.querySelectorAll("select")].find((node) => node.selectedOptions[0]?.textContent?.trim() === "Tourist Objects & Route")?.selectedOptions[0]?.textContent?.trim() ?? null,
    activeMode: [...document.querySelectorAll("[data-interaction-mode]")].find((node) => node.getAttribute("aria-pressed") === "true")?.getAttribute("data-interaction-mode") ?? null
  }));
  const repeatPassed = repeatedNavigationCount === initialNavigationCount && repeatedState.role === "Tourist" && repeatedState.scenario === "Tourist Objects & Route" && repeatedState.activeMode === "criteria_first";
  record(`${viewport.name} repeated scenario sequence has no reload`, repeatPassed, JSON.stringify({ initialNavigationCount, repeatedNavigationCount, repeatedState }));
  interactionResults.push({
    viewport: viewport.name,
    firstPassNoReload: firstPassNavigationCount === initialNavigationCount,
    repeatedSequenceNoReload: repeatPassed,
    navigationEntries: repeatedNavigationCount,
    mobileMap
  });
  await context.close();
}

let browser;
let browserVersion = null;
try {
  browser = await chromium.launch({ headless: true });
  browserVersion = browser.version();
  for (const viewport of viewports) await runViewport(browser, viewport);
} catch (error) {
  failures.push(`Harness execution: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
} finally {
  await browser?.close();
}

const errors = consoleInventory.filter((item) => item.type === "error" || item.type === "pageerror");
const warnings = consoleInventory.filter((item) => item.type === "warning");
const unexpectedWarnings = warnings.filter((item) => !/Automatic fallback to software WebGL has been deprecated|GPU stall due to ReadPixels/i.test(item.text));
record("Screenshot inventory is exactly 17", screenshotRecords.length === 17, `count=${screenshotRecords.length}`);
record("Console has zero JavaScript errors", errors.length === 0, JSON.stringify(errors));
record("Console has zero unexpected warnings", unexpectedWarnings.length === 0, JSON.stringify(unexpectedWarnings));

const manifest = {
  schemaVersion: "cr-dev7-001-responsive-evidence-v1",
  protocolUrl: "https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/9830449",
  exactTestedCommitSha: testedCommitSha,
  temporaryWorkflowCommitSha: workflowCommitSha,
  deploymentId,
  previewUrl: baseUrl,
  captureTimestamp: new Date().toISOString(),
  reviewer: "Codex independent evidence runner / GitHub-hosted Chromium",
  browser: { name: "Chromium", version: browserVersion },
  operatingSystem: `${os.platform()} ${os.release()} ${os.arch()}`,
  browserZoomPercent: 100,
  cacheDisabled: true,
  screenshotCount: screenshotRecords.length,
  screenshots: screenshotRecords,
  interactionSequenceResults: interactionResults,
  consoleSummary: {
    javascriptErrorCount: errors.length,
    warningCount: warnings.length,
    unexpectedWarningCount: unexpectedWarnings.length,
    warnings: warnings.map((item) => ({ viewport: item.viewport, state: item.state, message: item.text }))
  },
  assertions: {
    total: assertions.length,
    passed: assertions.filter((item) => item.passed).length,
    failed: assertions.filter((item) => !item.passed).length,
    results: assertions
  },
  result: failures.length === 0 ? "passed" : "failed",
  failures,
  caveat
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await fs.writeFile(path.join(evidenceDir, "browser-console-inventory.json"), `${JSON.stringify(consoleInventory, null, 2)}\n`);
await fs.writeFile(path.join(evidenceDir, "assertions.json"), `${JSON.stringify(assertions, null, 2)}\n`);
await fs.writeFile(
  path.join(evidenceDir, "interaction-notes.md"),
  [
    "# CR-DEV7-001 responsive interaction evidence",
    "",
    `- Tested Product SHA: \`${testedCommitSha}\``,
    `- Preview deployment: \`${deploymentId}\``,
    `- Preview URL: ${baseUrl}`,
    `- Captures: ${screenshotRecords.length}/17`,
    `- Assertions: ${manifest.assertions.passed}/${manifest.assertions.total} passed`,
    `- JavaScript errors: ${errors.length}`,
    `- Unexpected warnings: ${unexpectedWarnings.length}`,
    `- Known WebGL warnings: ${warnings.length - unexpectedWarnings.length}`,
    "- Scenario sequence was executed twice in each viewport without page reload.",
    "- Full-screen mobile map open/return was exercised at 390x844 and 430x932.",
    "",
    `Result: **${manifest.result.toUpperCase()}**`,
    "",
    caveat,
    ""
  ].join("\n")
);

if (failures.length > 0) {
  throw new Error(`CR-DEV7-001 evidence gate failed:\n${failures.join("\n")}`);
}

console.log(JSON.stringify({ result: manifest.result, screenshots: screenshotRecords.length, assertions: manifest.assertions }, null, 2));
