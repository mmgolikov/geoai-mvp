import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { chooseD2ThroughSearch, openD2Analysis, openD2Projects, installD2Transport, expectD2TransportQuiet,
  publicD2Snapshot, type D2Case, type D2Locale, type D2Signals } from "./helpers/d2-context-fixture";
import { loadD2CitationFixture, chooseD2CitationFindTarget } from "./helpers/d2-citation-fixture";
import { installLoopbackBrowserHarness, requireLoopbackTestOrigin } from "./helpers/local-webkit-csp";
import { sprint10AnalysisResponse } from "./helpers/sprint10-analysis-fixture";

// Independent authored QA; Root alone executes. Discovery imports no Product
// service, loader or producer. New synthetic catalogue and immutable historical
// paid-response replay are deliberately separate journeys, never new live AI.
type HeldRecord = {
  operation: string; payloadSha256: string;
  originalSubmissionIntent: Record<string, unknown> & { question: string };
  sourceSnapshot: { context: D2Case["envelope"]["subject"] };
  response: { mode: string; schemaVersion: number; generatedAt: string; evidencePackHash: string;
    content: { answerToQuestion: { statement: string }; [key: string]: unknown }; [key: string]: unknown };
};
const replaySha = "ab2784c4f62e854dd8e3320194a80e4382fbe740bf40871803e8e4ea2073bcea";
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const clone = structuredClone;
const count = (s: D2Signals) => ({ context: s.contextPosts.length, ai: s.aiPosts.length, challenge: s.challenges });
const refLink = (scope: Locator, ref: string) => scope.locator('[data-testid="d2-source-link"][data-evidence-ref="' + ref + '"]');
let historical: { records: HeldRecord[]; currentSelection: unknown };
let held: HeldRecord;

test.describe.configure({ retries: 0 });
test.use({ serviceWorkers: "block" });
test.beforeAll(() => {
  const root = process.cwd();
  const bytes = readFileSync(path.join(root, "tests/fixtures/d2-source-citation-closure/recorded-public-result.json"));
  expect(sha(bytes)).toBe(replaySha);
  historical = JSON.parse(bytes.toString("utf8"));
  expect(historical.records).toHaveLength(1); held = historical.records[0];
  expect(held.response.mode).toBe("openai"); expect(held.response.schemaVersion).toBe(6);
  expect(held.sourceSnapshot.context.normalizedContext?.citationContext).toBeUndefined();
});
test.beforeEach(async ({ page, browserName }, info) => {
  requireLoopbackTestOrigin(info.project.use.baseURL);
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
});
function itemFor(locale: D2Locale) {
  // Runtime callback only: each new synthetic case receives a coherent current
  // synthetic lease, even if preceding browser journeys took several minutes.
  // The immutable historical replay cases never use this new source catalogue.
  const item = loadD2CitationFixture(locale).item;
  const catalogue = item.envelope.subject.normalizedContext?.citationContext;
  if (!catalogue) throw new Error("Isolated source-projected citation fixture required");
  const university = catalogue.items.find(p => p.evidenceRef === "EVD-CONTEXT-1");
  expect(university?.distanceM).toBe(548); expect(university?.featureClass).toBe("amenity:university");
  expect(item.envelope.subject.normalizedContext?.sampleSize).toBe(123);
  expect(item.envelope.subject.normalizedContext?.places.some(p => p.evidenceRef === "EVD-CONTEXT-1")).toBe(false);
  return item;
}
function modelRecord(snapshot: Record<string, unknown>) {
  const records = (snapshot.records as HeldRecord[]).filter(r => r.operation === "analyse");
  expect(records).toHaveLength(1); return records[0];
}
function source(snapshot: Record<string, unknown>) {
  return (snapshot.preSubmit as { sourceSnapshot: { context: D2Case["envelope"]["subject"] } }).sourceSnapshot;
}
async function prepareForm(page: Page, locale: D2Locale, width: number, question: string) {
  const form = page.getByTestId("analysis-controls-form");
  if (width < 640) await page.getByTestId("analysis-mobile-controls-trigger").click();
  await form.locator("fieldset").getByRole("button").nth(1).click();
  await form.locator("#analysis-follow-up").fill(question);
  await form.locator("details > summary").click();
  await form.getByTestId("point-object-analysis-perspective-select").selectOption("developer");
  await form.getByTestId("point-object-analysis-horizon-select").selectOption("one_to_three_years");
  await expect(form.getByTestId("analysis-request-state")).toHaveAttribute("data-draft-depth", "standard");
  await expect(form.getByTestId("analysis-request-state")).toHaveAttribute("data-draft-scenario", "b2b_redevelopment_selected_aoi");
  return form;
}
function syntheticReply(body: Parameters<typeof sprint10AnalysisResponse>[0], item: D2Case, statement: string) {
  const envelope = item.envelope, subject = envelope.subject;
  const medical = subject.normalizedContext?.places.find(p => p.evidenceRef === "EVD-CONTEXT-2");
  if (!medical) throw new Error("Bound medical record required for cross-widget selection");
  const base = sprint10AnalysisResponse(body, 1, envelope.evidenceReceipt.evidencePackHash, "POINT_OBJECT_AI_PROMPT_V14_2026_09_26");
  return { ...base,
    subject: { name: subject.name, address: subject.address, featureClass: subject.featureClass,
      sourceFeatureId: subject.sourceFeatureId, resolutionMethod: "overpass_exact_identity",
      coordinateAssociation: subject.coordinateAssociation, sourceLabel: "© OpenStreetMap contributors",
      geometryType: subject.geometryType, resultCentroidDistanceM: subject.resultCentroidDistanceM,
      addressParts: subject.addressParts, tags: subject.tags, metrics: subject.metrics,
      geoContext: subject.geoContext, linkedEntity: subject.linkedEntity },
    content: { ...base.content, geoContext: subject.geoContext,
      decisionBrief: { ...base.content.decisionBrief, headline: "D2 citation closure SYNTHETIC transport" },
      sourceFacts: [...base.content.sourceFacts, { statement, evidenceRefs: ["EVD-CONTEXT-1"] },
        { statement: "Synthetic cross-widget medical citation: " + medical.name + ".", evidenceRefs: [medical.evidenceRef] }] }
  };
}
async function noClipping(page: Page, scopes: Locator[]) {
  const documentBounds = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(documentBounds.scroll).toBeLessThanOrEqual(documentBounds.viewport + 2);
  for (const scope of scopes) {
    await expect(scope).toBeVisible();
    const bounds = await scope.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 2);
  }
}
async function evidenceOpen(page: Page, button: Locator, reference: string, available: boolean) {
  await expect(button).toHaveCount(1);
  await button.focus(); await page.keyboard.press("Enter");
  const panel = page.getByTestId("d2-source-evidence");
  await expect(panel).toBeVisible(); await expect(panel).toBeFocused();
  await expect(panel).toHaveAttribute("data-evidence-ref", reference);
  await expect(panel).toHaveAttribute("data-evidence-available", String(available));
  return panel;
}
async function reopen(page: Page, label: string, locale: D2Locale) {
  await openD2Projects(page, locale);
  const card = page.getByTestId("saved-result-card").filter({ hasText: label }).filter({
    has: page.getByRole("button", { name: locale === "ru" ? "Открыть результат" : "Open result", exact: true })
  });
  await expect(card).toHaveCount(1);
  await card.getByRole("button", { name: locale === "ru" ? "Открыть результат" : "Open result", exact: true }).click();
  await expect(page.getByTestId("ai-success")).toBeVisible();
}
async function attach(info: TestInfo, page: Page, data: Record<string, unknown>) {
  const screenshot = info.outputPath("source-citation-closure.png");
  await page.screenshot({ path: screenshot, fullPage: false });
  await info.attach("source-citation-closure", { path: screenshot, contentType: "image/png" });
  await info.attach("source-citation-closure-observation", { body: JSON.stringify(data), contentType: "application/json" });
}

for (const locale of ["en", "ru"] as const) for (const width of [1440, 390]) {
  test("D2 new synthetic citation chart→map→source→save " + locale + " " + width, async ({ page }, info) => {
    const item = itemFor(locale), baseURL = info.project.use.baseURL!;
    await page.setViewportSize({ width, height: 900 });
    await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
    const signals = await installD2Transport(page, baseURL, item);
    const catalogue = item.envelope.subject.normalizedContext!.citationContext!;
    const university = catalogue.items.find(c => c.evidenceRef === "EVD-CONTEXT-1")!;
    const statement = (locale === "ru" ? "Синтетическая цитата вне радиуса KPI: " : "Synthetic outside-KPI citation: ") + university.name + " · 548 m.";
    const reply: { value: ReturnType<typeof syntheticReply> | null } = { value: null };
    await page.route("**/api/prototype/point-to-object/ai", async route => {
      if (route.request().method() === "GET") return route.fallback();
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON() as Parameters<typeof sprint10AnalysisResponse>[0] & { evidenceReceipt: unknown };
      signals.aiPosts.push(body);
      expect(signals.aiPosts).toHaveLength(1);
      expect(body.evidenceReceipt).toEqual(item.envelope.evidenceReceipt);
      reply.value = syntheticReply(body, item, statement);
      await route.fulfill({ json: reply.value });
    });
    await chooseD2ThroughSearch(page, item, locale);
    await expect.poll(() => signals.contextPosts.length).toBe(1);
    const findSetup = await chooseD2CitationFindTarget(page, item, locale);
    await openD2Analysis(page, locale);
    const form = await prepareForm(page, locale, width, locale === "ru"
      ? "Синтетическая проверка связности цитат, вариантов и следующих действий."
      : "Synthetic citation, option-consequence and next-check closure.");
    const before = source(await publicD2Snapshot(page));
    await form.locator('button[type="submit"]').click();
    await expect(page.getByTestId("ai-success")).toBeVisible();
    const saved = modelRecord(await publicD2Snapshot(page));
    expect(saved.sourceSnapshot).toEqual(before);
    expect(saved.response.content).toEqual(reply.value!.content);
    const dashboard = page.getByTestId("normalized-context-dashboard");
    const screening = page.getByTestId("d2-scenario-screening");
    await expect(screening).toHaveAttribute("data-analysis-goal", "custom");
    await expect(screening).toHaveAttribute("data-analysis-scenario", "b2b_redevelopment_selected_aoi");
    for (const id of ["mapped-envelope", "entrances-and-servicing", "programme-service-check"]) {
      const card = screening.getByTestId("d2-screening-" + id);
      await expect(card).toBeVisible();
      await expect(card).toContainText(locale === "ru" ? "Следующая проверка" : "Next check");
      expect(await card.getByTestId("d2-source-link").count()).toBeGreaterThan(0);
    }
    const cardText = await screening.allTextContents();
    await form.locator("#analysis-follow-up").fill("Unsubmitted draft about unrelated bank collateral.");
    expect(await screening.allTextContents()).toEqual(cardText);
    const claim = page.getByTestId("ai-success").getByText(statement, { exact: true }).locator("..");
    await claim.locator("details > summary").click();
    const universityButton = refLink(claim, "EVD-CONTEXT-1");
    const panel = await evidenceOpen(page, universityButton, "EVD-CONTEXT-1", true);
    await expect(panel).toContainText(university.name);
    await expect(panel).toContainText("amenity:university");
    await expect(panel).toContainText("548");
    await expect(panel).toContainText(/400[–-]800/);
    await expect(panel.getByTestId("d2-evidence-plot")).toBeVisible();
    await expect(panel.getByTestId("d2-evidence-origin")).toBeVisible();
    await expect(panel.getByTestId("d2-evidence-point")).toHaveAttribute("data-source-feature-id", university.id);
    await noClipping(page, [panel, universityButton, screening]);

    // An open panel must not reappear after a local group/map selection.
    const transitBar = dashboard.locator('[data-testid="context-mix-bar"][data-context-group="transport"]');
    await transitBar.click(); await expect(panel).toBeHidden();
    await expect(transitBar).toHaveAttribute("aria-pressed", "true");
    const transit = item.envelope.subject.normalizedContext!.places.find(p => p.evidenceRef === "EVD-CONTEXT-4");
    if (!transit || transit.distanceM !== 94 || transit.group !== "transport") throw new Error("Bound synthetic94m transit record required");
    const transportCount = item.envelope.subject.normalizedContext!.places.filter(p => p.group === "transport").length;
    const list = dashboard.getByTestId("context-place-list");
    const localTransit = list.getByTestId("context-place-select").filter({ hasText: transit.name });
    await localTransit.click();
    await expect(transitBar).toHaveAttribute("aria-pressed", "true");
    await expect(list.getByTestId("context-place-select")).toHaveCount(transportCount);
    await expect(dashboard.getByTestId("context-spatial-plot").locator('g[role="button"]')).toHaveCount(transportCount);
    await expect(panel).toBeHidden();
    // Explicit evidence from another widget may override that category; a
    // subsequent local selection must keep its visible group/cluster state.
    const medical = item.envelope.subject.normalizedContext!.places.find(p => p.evidenceRef === "EVD-CONTEXT-2");
    if (!medical) throw new Error("Bound cross-widget medical record required");
    const medicalClaim = page.getByTestId("ai-success")
      .getByText("Synthetic cross-widget medical citation: " + medical.name + ".", { exact: true }).locator("..");
    await medicalClaim.locator("details > summary").click();
    await evidenceOpen(page, refLink(medicalClaim, medical.evidenceRef), medical.evidenceRef, true);
    await expect(dashboard.getByTestId("context-selected-detail")).toHaveAttribute("data-source-feature-id", medical.id);
    await expect(dashboard.getByTestId("context-spatial-plot")
      .locator('g[role="button"][data-source-feature-id="' + medical.id + '"]')).toHaveAttribute("aria-pressed", "true");
    await transitBar.click();
    await localTransit.click();
    await expect(transitBar).toHaveAttribute("aria-pressed", "true");
    await expect(list.getByTestId("context-place-select")).toHaveCount(transportCount);
    await expect(panel).toBeHidden();
    const distance = dashboard.locator('[data-testid="context-distance-select"][data-source-feature-id="' + transit.id + '"]');
    await distance.click();
    await expect(panel).toBeHidden();
    await expect(dashboard.getByTestId("context-selected-detail")).toHaveAttribute("data-source-feature-id", transit.id);
    const point = dashboard.getByTestId("context-spatial-plot").locator('g[role="button"][data-source-feature-id="' + transit.id + '"]');
    await expect(point).toHaveAttribute("aria-pressed", "true");
    await point.focus(); await page.keyboard.press("Enter"); await expect(panel).toBeHidden();
    const detailLink = refLink(dashboard, transit.evidenceRef);
    await evidenceOpen(page, detailLink, transit.evidenceRef, true);
    await page.keyboard.press("Escape"); await expect(panel).toBeHidden(); await expect(detailLink).toBeFocused();
    await evidenceOpen(page, detailLink, transit.evidenceRef, true);
    await panel.getByTestId("d2-evidence-close").click();
    await expect(panel).toBeHidden(); await expect(detailLink).toBeFocused();
    await expect(dashboard.getByTestId("context-use-chart")).toContainText("123");
    const independent = dashboard.getByTestId("independent-source-context");
    await independent.getByRole("button", { name: locale === "ru" ? "Медицинские записи" : "Healthcare records", exact: true }).click();
    const pharmacy = item.envelope.subject.normalizedContext!.independentContext!.places.find(p => p.taxonomy.primary === "pharmacy");
    if (!pharmacy) throw new Error("Named pharmacy admitted in this exact mixed U1 fixture required");
    await independent.locator('[data-testid="independent-place-select"][data-overture-id="' + pharmacy.id + '"]').click();
    await independent.getByTestId("independent-map-focus").click();
    await expect(independent.getByTestId("independent-point-plot")).toHaveAttribute("data-map-view", "selected");
    await expect(independent.getByTestId("independent-place-detail")).toHaveAttribute("data-overture-id", pharmacy.id);
    await independent.getByTestId("independent-map-overview").click();
    await expect(independent.getByTestId("independent-point-plot")).toHaveAttribute("data-map-view", "overview");
    const counts = count(signals);
    const original = modelRecord(await publicD2Snapshot(page));
    expect(original.sourceSnapshot).toEqual(before);
    expect(original.response.content).toEqual(saved.response.content);
    await reopen(page, item.label, locale);
    await expect(page.getByTestId("ai-success").getByText(statement, { exact: true })).toBeVisible();
    expect(source(await publicD2Snapshot(page))).toEqual(before);
    await expect(screening).toHaveAttribute("data-analysis-goal", "custom");
    await expect(screening).toHaveAttribute("data-analysis-scenario", "b2b_redevelopment_selected_aoi");
    const other = locale === "en" ? "ru" : "en";
    await page.getByRole("button", { name: other, exact: true }).click();
    await expect(page.getByRole("button", { name: other, exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(source(await publicD2Snapshot(page))).toEqual(before);
    expect(count(signals)).toEqual(counts);
    expect(findSetup.calls()).toBe(1);
    expectD2TransportQuiet(signals);
    await noClipping(page, [screening]);
    await attach(info, page, { classification: "MIXED_GOLDEN_SELECTED_OBJECT_SYNTHETIC_CATALOGUE_AND_AI_TRANSPORT_NOT_PAID_G2", locale, width,
      university: { id: university.id, ref: university.evidenceRef, distanceM: 548, featureClass: university.featureClass },
      kpiRadiusM: 400, sampleSize: 123, citationRadiusM: 800, counts, syntheticFindPosts: findSetup.calls(), sourceRetained: true,
      panelResetAndKeyboardFocus: true, newLiveAiEvidence: false });
  });

  test("D2 immutable actual13Oct replay stays legacy without backfill " + locale + " " + width, async ({ page }, info) => {
    const baseURL = info.project.use.baseURL!, context = clone(held.sourceSnapshot.context);
    const originalIntent = held.originalSubmissionIntent;
    // Explicit historical browser clock for an expired historical fixture lease;
    // never mint a new source receipt or relabel this as current/live evidence.
    await page.clock.install({ time: new Date("2026-10-13T20:18:43.909Z") });
    await page.setViewportSize({ width, height: 900 });
    await page.context().addCookies([{ name: "geoai_locale", value: "en", url: baseURL }]);
    const envelope = { mode: "resolved" as const, schemaVersion: 2 as const, evidenceReceipt: clone(context.evidenceReceipt!), subject: context };
    const item: D2Case = { locale: "en", sourceLocale: "en", key: "u1", sourceFeatureId: context.sourceFeatureId,
      anchor: [55.280154550000006, 25.22041245], label: context.name!, expectedIndependentStatus: "available",
      envelope, legacyEnvelope: clone(envelope) };
    const signals = await installD2Transport(page, baseURL, item);
    await page.route("**/api/prototype/point-to-object/ai", async route => {
      if (route.request().method() === "GET") return route.fallback();
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON() as Record<string, unknown>;
      signals.aiPosts.push(body); expect(signals.aiPosts).toHaveLength(1);
      const { challenge: _challenge, ...intent } = body;
      expect(intent).toEqual(originalIntent);
      await route.fulfill({ json: held.response }); // Exact historical public result, no fields changed.
    });
    await chooseD2ThroughSearch(page, item, "en");
    const findSetup = await chooseD2CitationFindTarget(page, item, "en");
    await openD2Analysis(page, "en");
    const form = await prepareForm(page, "en", width, originalIntent.question);
    await form.locator('button[type="submit"]').click();
    await expect(page.getByTestId("ai-success")).toBeVisible();
    const captured = modelRecord(await publicD2Snapshot(page));
    expect(captured.response).toEqual(held.response);
    expect(captured.sourceSnapshot).toEqual(held.sourceSnapshot);
    expect(captured.payloadSha256).toBe(held.payloadSha256);
    if (locale === "ru") await page.getByRole("button", { name: "ru", exact: true }).click();
    const counts = count(signals);
    const notice = page.getByTestId("d2-missing-citation-notice");
    await expect(notice).toBeVisible();
    const button = refLink(notice, "EVD-CONTEXT-1");
    const panel = await evidenceOpen(page, button, "EVD-CONTEXT-1", false);
    await expect(panel.getByTestId("d2-citation-unavailable")).toBeVisible();
    await expect(panel.getByTestId("d2-evidence-plot")).toHaveCount(0);
    await noClipping(page, [panel, button]);
    await page.keyboard.press("Escape"); await expect(button).toBeFocused();
    const screening = page.getByTestId("d2-scenario-screening");
    await expect(screening).toHaveAttribute("data-analysis-goal", "custom");
    await expect(screening).toHaveAttribute("data-analysis-scenario", "b2b_redevelopment_selected_aoi");
    await reopen(page, item.label, locale);
    await expect(page.getByText(held.response.content.answerToQuestion.statement, { exact: true })).toBeVisible();
    const reopened = await publicD2Snapshot(page);
    expect(source(reopened)).toEqual(held.sourceSnapshot);
    expect(source(reopened).context.normalizedContext?.citationContext).toBeUndefined();
    // An empty observer history after reopen is not a missing saved analysis.
    expect(reopened.records).toEqual([]);
    expect(count(signals)).toEqual(counts);
    expect(findSetup.calls()).toBe(1);
    expectD2TransportQuiet(signals);
    await attach(info, page, { classification: "IMMUTABLE_ACTUAL13OCT_PUBLIC_RESPONSE_REPLAY_NOT_NEW_LIVE_AI", locale, width,
      replaySha, originalIntentSha: held.payloadSha256, originalGeneratedAt: held.response.generatedAt,
      catalogueAbsent: true, universityUnresolved: true, saveReopenSourceRetained: true, counts, syntheticFindPosts: findSetup.calls(),
      historicalBrowserClock: "2026-10-13T20:18:43.909Z", historicalG2ScoreUnchanged: 7, newPaidCalls: 0 });
  });
}
test("D2 forged foreign-subject catalogue is refused before AI and explicit Retry restores source", async ({ page }, info) => {
  const item = itemFor("en"), signals = await installD2Transport(page, info.project.use.baseURL!, item);
  let corrupted = true;
  await page.route("**/api/prototype/point-to-object/context", async route => {
    signals.contextPosts.push(route.request().postDataJSON());
    const response = clone(item.envelope);
    if (corrupted) response.subject.normalizedContext!.citationContext!.subjectId = "way/393391114";
    await route.fulfill({ json: response });
  });
  await chooseD2ThroughSearch(page, item, "en");
  await expect.poll(() => signals.contextPosts.length).toBe(1);
  const task = page.locator("#workspace-task");
  await expect(task.getByRole("alert")).toBeVisible();
  expect(signals.aiPosts).toHaveLength(0);
  corrupted = false;
  await task.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => signals.contextPosts.length).toBe(2);
  await openD2Analysis(page, "en");
  await expect(page.getByTestId("normalized-context-dashboard")).toBeVisible();
  expect(signals.aiPosts).toHaveLength(0); expectD2TransportQuiet(signals);
  await attach(info, page, { classification: "SYNTHETIC_FOREIGN_CATALOGUE_REFUSAL_NOT_LIVE_AI", foreignRefused: true,
    explicitRetryOnly: true, counts: count(signals), newPaidCalls: 0 });
});
