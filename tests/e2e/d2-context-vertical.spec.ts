import { createHash } from "node:crypto";
import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";
import {
  chooseD2ThroughSearch, expectD2TransportQuiet, installD2Transport, loadD2FixtureBundle,
  openD2Analysis, publicD2Snapshot, type D2Bundle, type D2Case, type D2Signals
} from "./helpers/d2-context-fixture";
import { installLoopbackBrowserHarness, requireLoopbackTestOrigin } from "./helpers/local-webkit-csp";

// Source-only authoring. Root alone executes this finite offline suite.
// No private storage seed/extraction, React/Map state injection, live provider,
// paid response, real U1-U4 usefulness or generated Create acceptance.
let bundle: D2Bundle;
test.beforeAll(() => { bundle = loadD2FixtureBundle(); });
test.beforeEach(async ({ page, browserName }, info) => {
  requireLoopbackTestOrigin(info.project.use.baseURL);
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
});
function fixture(key: D2Case["key"]) {
  const item = bundle.cases.find(value => value.key === key);
  if (!item) throw new Error("Missing bounded D2 fixture");
  return item;
}
async function intake(page: Page, baseURL: string, locale: "en" | "ru", width: number, key: D2Case["key"] = "u2", legacy = false) {
  await page.setViewportSize({ width, height: 900 });
  await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
  const item = fixture(key);
  const signals = await installD2Transport(page, baseURL, item, legacy);
  await chooseD2ThroughSearch(page, item, locale);
  await expect.poll(() => signals.contextPosts.length).toBe(1);
  // Completion is witnessed on ordinary rendered context, not private state.
  await openD2Analysis(page, locale);
  await expect(page.getByTestId("normalized-context-dashboard")).toBeVisible();
  return { item, signals };
}
async function runOfflineAnalysis(page: Page, locale: "en" | "ru") {
  await page.getByRole("button", { name: locale === "ru" ? "Запустить целевой анализ" : "Run focused analysis", exact: true }).click();
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
}
function publicObject(value: unknown, label: string): Record<string, unknown> {
  expect(value, label + " must exist as a public object").toBeTruthy();
  expect(typeof value, label + " object type").toBe("object");
  expect(Array.isArray(value), label + " must not be an array").toBe(false);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing public " + label);
  return value as Record<string, unknown>;
}
async function visibleSourceSnapshot(page: Page, item: D2Case, legacy = false) {
  const value = await publicD2Snapshot(page);
  expect(value.protocol).toBe("GEOAI_PREVIEW_VERIFICATION_V1");
  const current = publicObject(value.currentSelection, "current selection");
  expect(current).toMatchObject({ mode: "analyse", marketKey: "dubai", sourceFeatureId: item.sourceFeatureId,
    longitude: item.anchor[0], latitude: item.anchor[1] });
  const pre = publicObject(value.preSubmit, "pre-submit");
  expect(pre.operation).toBe("analyse");
  expect(publicObject(pre.intent, "current intent")).toMatchObject({ expectedSourceFeatureId: item.sourceFeatureId,
    longitude: item.anchor[0], latitude: item.anchor[1] });
  const context = publicObject(publicObject(pre.sourceSnapshot, "source snapshot").context, "source context");
  const expected = (legacy ? item.legacyEnvelope : item.envelope).subject;
  expect(context).toMatchObject({ name: expected.name, sourceFeatureId: item.sourceFeatureId,
    coordinateAssociation: "trusted_open_map_identity", evidenceReceipt: expected.evidenceReceipt });
  expect(publicObject(context.evidenceReceipt, "evidence receipt").lookupSourceFeatureId).toBe(item.sourceFeatureId);
  const normalized = publicObject(context.normalizedContext, "normalized context");
  expect(normalized).toMatchObject({ version: "POINT_OBJECT_NORMALIZED_CONTEXT_V1", subjectId: item.sourceFeatureId,
    scope: { kind: "point_radius", anchor: item.anchor.map(number => Number(number.toFixed(6))) } });
  if (legacy) {
    // V1 optional-field absence remains V1; export cannot fill D2 facts.
    expect(normalized.details).toBeUndefined();
    expect(normalized.independentContext).toBeUndefined();
  } else {
    const details = publicObject(normalized.details, "D2 context details");
    expect(details).toMatchObject({ version: "POINT_OBJECT_CONTEXT_DETAILS_V2", subjectId: item.sourceFeatureId,
      association: "selected_record", anchor: expected.normalizedContext!.scope.anchor });
    const independent = publicObject(normalized.independentContext, "independent context");
    expect(bundle.sourceHash).toBe("f55ad27098707b5a6efd1ee6d5bd7d8373cff9bd1eddd656207cf70cb15fe67d");
    expect(independent).toMatchObject({ version: "POINT_OBJECT_INDEPENDENT_CONTEXT_V1", subjectId: item.sourceFeatureId,
      snapshotHash: bundle.sourceHash, status: item.expectedIndependentStatus,
      anchor: expected.normalizedContext!.scope.anchor, sourceMode: "admitted_bundled_snapshot_not_live" });
    if (item.expectedIndependentStatus === "available") {
      const admitted = expected.normalizedContext!.independentContext!;
      expect(admitted.places.length).toBeGreaterThan(0);
      expect(admitted.places.some(place => place.sources.some(source => !!source.record_id))).toBe(true);
      // Full admitted records include GERS/provider record IDs and schema fields;
      // a stripped whitelist cannot satisfy source continuity.
      expect(independent.places).toEqual(admitted.places);
      expect(independent.sampleSize).toBe(admitted.sampleSize);
    } else {
      expect(independent.sampleSize).toBeNull();
      expect(independent.interiorSampleSize).toBeNull();
      expect(independent.caseId).toBeNull();
      expect(independent.places).toEqual([]);
      expect(publicObject(independent.spatialCoverage, "unsupported spatial coverage").state).toBe("unsupported_scope");
    }
  }
  expect(normalized).toEqual(expected.normalizedContext);
  return context;
}
async function releaseHeldTransport(route: Route, json: unknown, info: TestInfo, kind: "ai" | "context") {
  let transportOutcome: "fulfilled" | "aborted_or_closed" = "fulfilled";
  try { await route.fulfill({ json }); }
  catch (error) {
    if (!/closed|cancel|abort|disposed|invalid interception id/i.test(String(error))) throw error;
    transportOutcome = "aborted_or_closed";
  }
  await info.attach("d2-" + kind + "-late-transport-outcome", { body: JSON.stringify({ transportOutcome,
    outcomeScope: "Playwright interception only; browser delivery not independently confirmed",
    deliveredLateResponseOwnership: transportOutcome === "aborted_or_closed" ? "BLOCKED_ABORTED_TRANSPORT" : "NOT_PROVEN_BY_FULFILL_ALONE",
    preservationCoverage: "Requires following last-valid/source/reopen assertions; separate from delivered late ownership" }),
    contentType: "application/json" });
}

for (const locale of ["en", "ru"] as const) for (const width of [1440, 390]) {
  test("D2 ordinary intake→actual envelope→linked evidence→save/reopen " + locale + " " + width, async ({ page }, info) => {
    const { item, signals } = await intake(page, info.project.use.baseURL!, locale, width);
    const dashboard = page.getByTestId("normalized-context-dashboard");
    const height = dashboard.getByTestId("context-physical-height");
    await height.focus(); await page.keyboard.press("Enter");
    await expect(height).toHaveAttribute("aria-pressed", "true");
    await expect(dashboard.getByTestId("context-linked-map")).toHaveAttribute("open", "");
    await expect(dashboard.getByTestId("context-source-boundary")).toBeVisible();
    await expect(dashboard.getByTestId("context-selected-detail")).toBeVisible();
    const independent = dashboard.getByTestId("independent-source-context");
    await expect(independent).toHaveAttribute("data-source-status", "available");
    const source = item.envelope.subject.normalizedContext!.independentContext!;
    const binsina = source.places.find(p => p.name === "BinSina Pharmacy");
    if (!binsina) throw new Error("Actual admitted BinSina source row required");
    const listButton = independent.getByTestId("independent-place-select").filter({ hasText: binsina.name });
    await listButton.click();
    await expect(listButton).toHaveAttribute("aria-pressed", "true");
    await expect(independent.getByTestId("independent-place-detail")).toContainText(binsina.name);
    const mapPoint = independent.locator('[data-overture-id="' + binsina.id + '"]');
    await mapPoint.focus(); await page.keyboard.press(" ");
    await expect(mapPoint).toHaveAttribute("aria-pressed", "true");
    await independent.getByTestId("independent-place-detail").locator("details summary").click();
    await expect(independent.getByTestId("independent-place-detail")).toContainText(binsina.sources[0].record_id!);
    expect(signals.aiPosts).toHaveLength(0); // All drilldown is free.
    const before = await visibleSourceSnapshot(page, item);
    await runOfflineAnalysis(page, locale);
    const posts = signals.aiPosts.length;
    const contextPosts = signals.contextPosts.length;
    // Save is automatic after completed Analyse; verify it through Projects UI.
    await page.goto("/prototype/point-to-object/projects");
    await expect(page.getByTestId("hub-count-analyse").getByTestId("hub-count-value")).toHaveText("1");
    const saved = page.getByTestId("saved-result-card").filter({ hasText: item.label });
    await expect(saved).toHaveCount(1);
    await saved.getByRole("button", { name: locale === "ru" ? "Открыть результат" : "Open result", exact: true }).click();
    await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
    await expect(page.getByTestId("ai-success")).toBeVisible();
    expect(await visibleSourceSnapshot(page, item)).toEqual(before);
    await expect(page.getByRole("button", { name: locale, exact: true })).toHaveAttribute("aria-pressed", "true");
    const originalScreenshot = "d2-linked-context-" + locale + "-" + width + ".png";
    await dashboard.screenshot({ path: info.outputPath(originalScreenshot) });
    const switchedLocale = locale === "ru" ? "en" : "ru";
    const switchedButton = page.getByRole("button", { name: switchedLocale, exact: true });
    await switchedButton.click();
    await expect(switchedButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: locale, exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(dashboard.getByTestId("independent-source-context")).toContainText("BinSina Pharmacy");
    expect(await visibleSourceSnapshot(page, item)).toEqual(before);
    expect(signals.aiPosts).toHaveLength(posts);
    expect(signals.contextPosts).toHaveLength(contextPosts);
    const bounds = await dashboard.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth,
      page: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    expect(bounds.page).toBeLessThanOrEqual(bounds.viewport + 1);
    for (const control of [height, listButton]) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const switchedScreenshot = "d2-linked-context-switched-" + switchedLocale + "-" + width + ".png";
    await dashboard.screenshot({ path: info.outputPath(switchedScreenshot) });
    await info.attach("d2-fixture-boundary", { body: JSON.stringify({ classification: bundle.classification, sourceHash: bundle.sourceHash,
      sourceFeatureId: item.sourceFeatureId, anchor: item.anchor, contextPosts, aiPosts: posts, bounds,
      captures: [{ locale, path: originalScreenshot }, { locale: switchedLocale, path: switchedScreenshot }],
      realCaseUsefulness: "NOT_SCORED", noPrivateStorageIntake: true }), contentType: "application/json" });
    expectD2TransportQuiet(signals);
  });
}

test("D2 ordinary U1 intake uses its own exact anchor/source, not U2 POI substitution", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440, "u1");
  await expect(page.getByTestId("independent-source-context")).toHaveAttribute("data-source-status", "available");
  expect(signals.contextPosts[0].expectedSourceFeatureId).toBe(item.sourceFeatureId);
  await visibleSourceSnapshot(page, item);
  expect(signals.aiPosts).toHaveLength(0);
  expectD2TransportQuiet(signals);
});

test("D2 ordinary coordinate drift >1m stays unsupported and unknown", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440, "outside_u2");
  await expect(page.getByTestId("independent-source-context")).toHaveAttribute("data-source-status", "unsupported_scope");
  await expect(page.getByTestId("independent-source-unknown")).toBeVisible();
  await expect(page.getByTestId("independent-service-brief")).toHaveCount(0);
  await expect(page.getByTestId("independent-source-context")).not.toContainText("BinSina Pharmacy");
  await visibleSourceSnapshot(page, item);
  expect(signals.aiPosts).toHaveLength(0);
  expectD2TransportQuiet(signals);
});

test("D2 V1 absence through normal context intake/save/reopen never gains current facts", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440, "u2", true);
  await expect(page.getByTestId("context-legacy-measurements")).toContainText("Saved V1");
  await expect(page.getByTestId("independent-source-context")).toHaveCount(0);
  const before = await visibleSourceSnapshot(page, item, true);
  await runOfflineAnalysis(page, "en");
  await page.goto("/prototype/point-to-object/projects");
  const saved = page.getByTestId("saved-result-card").filter({ hasText: item.label });
  await expect(saved).toHaveCount(1);
  await saved.getByRole("button", { name: "Open result", exact: true }).click();
  await expect(page.getByTestId("context-legacy-measurements")).toBeVisible();
  expect(await visibleSourceSnapshot(page, item, true)).toEqual(before);
  expect(signals.contextPosts).toHaveLength(1); expect(signals.aiPosts).toHaveLength(1);
  expectD2TransportQuiet(signals);
});

test("D2 malformed source HTTP response rejects forged facts and supports explicit Retry", async ({ page }, info) => {
  const item = fixture("u2");
  const signals = await installD2Transport(page, info.project.use.baseURL!, item);
  signals.contextMode = "tamper_name";
  await chooseD2ThroughSearch(page, item, "en");
  await expect.poll(() => signals.contextPosts.length).toBe(1);
  const task = page.locator("#workspace-task");
  await expect(task.getByRole("alert")).toBeVisible();
  await expect(task).not.toContainText("FORGED SOURCE NAME");
  expect(signals.aiPosts).toHaveLength(0);
  signals.contextMode = "ok";
  await task.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => signals.contextPosts.length).toBe(2);
  await openD2Analysis(page, "en");
  await expect(page.getByTestId("independent-source-context")).toHaveAttribute("data-source-status", "available");
  expect(signals.aiPosts).toHaveLength(0);
  expectD2TransportQuiet(signals);
});

for (const failure of ["transient_404", "source_error"] as const) {
  test("D2 ordinary context " + failure + " stays unknown until explicit Retry", async ({ page }, info) => {
    const item = fixture("u2");
    const signals = await installD2Transport(page, info.project.use.baseURL!, item);
    signals.contextMode = failure;
    await chooseD2ThroughSearch(page, item, "en");
    await expect.poll(() => signals.contextPosts.length).toBe(1);
    const task = page.locator("#workspace-task");
    await expect(task.getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("independent-source-context")).toHaveCount(0);
    expect(signals.aiPosts).toHaveLength(0);
    signals.contextMode = "ok";
    await task.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => signals.contextPosts.length).toBe(2);
    await openD2Analysis(page, "en");
    await expect(page.getByTestId("independent-source-context")).toHaveAttribute("data-source-status", "available");
    expect(signals.aiPosts).toHaveLength(0);
    expectD2TransportQuiet(signals);
  });
}

test("D2 last valid analysis survives failed refresh/cancel and late completion without implicit paid reopen", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440);
  await runOfflineAnalysis(page, "en");
  const before = await visibleSourceSnapshot(page, item);
  signals.aiMode = "error";
  await page.getByRole("button", { name: "Refresh analysis", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("D2 offline refresh failure");
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
  expect(await visibleSourceSnapshot(page, item)).toEqual(before);
  signals.aiMode = "hold";
  await page.getByRole("button", { name: "Refresh analysis", exact: true }).click();
  await expect.poll(() => signals.pendingAi !== null).toBe(true);
  await page.getByRole("button", { name: "Cancel analysis", exact: true }).click();
  const late = signals.pendingAi!;
  // An aborted transport qualifies cancellation preservation only. Fulfill
  // acceptance alone does not prove a delivered late-response ownership test.
  await releaseHeldTransport(late.route, late.response, info, "ai");
  signals.pendingAi = null;
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
  await expect(page.getByText("D2 offline result 3", { exact: true })).toHaveCount(0);
  expect(await visibleSourceSnapshot(page, item)).toEqual(before);
  const posts = signals.aiPosts.length;
  await page.goto("/prototype/point-to-object/projects");
  const saved = page.getByTestId("saved-result-card").filter({ hasText: item.label });
  await expect(saved).toHaveCount(1);
  await saved.getByRole("button", { name: "Open result", exact: true }).click();
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
  expect(await visibleSourceSnapshot(page, item)).toEqual(before);
  expect(signals.aiPosts).toHaveLength(posts);
  expect(signals.contextPosts).toHaveLength(1);
  expectD2TransportQuiet(signals);
});

test("D2 leaving an in-flight context request preserves the saved source and does not pay on reopen", async ({ page }, info) => {
  const { item, signals } = await intake(page, info.project.use.baseURL!, "en", 1440);
  await runOfflineAnalysis(page, "en");
  const before = await visibleSourceSnapshot(page, item);
  signals.contextMode = "hold";
  await chooseD2ThroughSearch(page, item, "en");
  await expect.poll(() => signals.pendingContext !== null).toBe(true);
  const late = signals.pendingContext!;
  // Distinct synthetic transport-lease metadata makes a late state write
  // observable. Actual route shape and admitted facts stay intact; this is
  // not a signed/new server lease or fresh physical observation claim.
  late.envelope.evidenceReceipt.evidencePackHash = "d".repeat(64);
  late.envelope.subject.evidenceReceipt!.evidencePackHash = "d".repeat(64);
  late.envelope.subject.normalizedContext!.independentContext!.cacheServedAt = new Date().toISOString();
  await page.goto("/prototype/point-to-object/projects");
  const saved = page.getByTestId("saved-result-card").filter({ hasText: item.label });
  await expect(saved).toHaveCount(1);
  await saved.getByRole("button", { name: "Open result", exact: true }).click();
  await expect(page.getByText("D2 offline result 1", { exact: true })).toBeVisible();
  await releaseHeldTransport(late.route, late.envelope, info, "context");
  signals.pendingContext = null;
  expect(await visibleSourceSnapshot(page, item)).toEqual(before);
  expect(signals.aiPosts).toHaveLength(1);
  expect(signals.contextPosts).toHaveLength(2); // Both were explicit object selections.
  expectD2TransportQuiet(signals);
});

test("D2 licence is served by actual local HTTP with full admitted text, no mocked delivery", async ({ request }, info) => {
  const origin = requireLoopbackTestOrigin(info.project.use.baseURL).origin;
  const response = await request.get(origin + "/data/d2-overture/LICENSES.json", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const bytes = await response.body();
  expect(bytes.length).toBe(5013);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe("19a262096d9bf69bd27a1aca479f317719e17f98ae71e3f736923c7e96ce7640");
  const licence = JSON.parse(bytes.toString("utf8"));
  expect(licence.subsetSha256).toBe(bundle.sourceHash);
  expect(createHash("sha256").update(licence.licenseText).digest("hex")).toBe("4531a67d443284d93ffed0803df5b10634aff21c3d77e381f2d48af01d875868");
  expect(licence.licenseText).toContain("2. Conditions for Sharing Data");
});
