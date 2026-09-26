import { test, expect, type Page } from "@playwright/test";
import { sprint10Selection, sprint10PublicEvidenceReceipt, sprint10AnalysisResponse, SPRINT10_CAVEAT } from "./helpers/sprint10-analysis-fixture";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { POINT_OBJECT_AI_PROMPT_VERSION, recoverPointObjectAiFocusedContentDetailed, validatePointObjectAiContentDetailed, type PointObjectAnalysisRequest } from "../../src/lib/prototype/point-to-object-ai-core";
import type { GroundablePointObjectEvidencePack } from "../../src/lib/prototype/point-to-object-live-evidence";
import { parsePointObjectAiResponse, POINT_OBJECT_SESSION_KEYS } from "../../components/point-to-object/live-session";

// Synthetic source/provider boundary, real core rendering and real browser storage.
// This proves neither live acquisition nor the physical extent of a real building.
const selected = sprint10Selection.resolvedObject;
const tags = { ...selected.tags, "tag.building:part": "yes" };
const metrics = selected.metrics; // Exactly 1,800 m² / 180 m; never recomputed/scaled.
const sourceFeatureId = selected.sourceFeatureId;
const geometryHash = "a".repeat(64);
const coordinates = { longitude: 55.27, latitude: 25.2, crs: "EPSG:4326" };
const evidence = (id: string, value: unknown, sourceId: string = sourceFeatureId) => ({ id, sourceId, label: id, value: JSON.stringify(value) });
const pack = {
  protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2", coordinates,
  selectedObject: { sourceFeatureId, name: selected.name, featureClass: selected.featureClass, tags, geometryType: "Polygon", geometryHash, metrics },
  geoContext: selected.geoContext, nearbyContext: [],
  evidence: [evidence("EVD-COORDINATES", coordinates, "user_point"), evidence("EVD-OSM-OBJECT", { sourceFeatureId, name: selected.name }),
    evidence("EVD-CLASSIFICATION", { sourceFeatureId, featureClass: selected.featureClass }),
    evidence("EVD-ALLOWED-FIELDS", { sourceFeatureId, tags }),
    evidence("EVD-GEOMETRY", { sourceFeatureId, geometryType: "Polygon", geometryHash }),
    evidence("EVD-OBJECT-METRICS", { sourceFeatureId, geometryHash, metrics }),
    evidence("EVD-CONTEXT-SUMMARY", selected.geoContext, "SPAT-001"), evidence("EVD-SOURCE", "OpenStreetMap ODbL")]
} as unknown as GroundablePointObjectEvidencePack;
const plan = {
  decision: { path: "existing_asset_screen", disposition: "continue_screening", confidence: "low", reasonCodes: ["object_identity_available", "use_classification_available", "source_is_non_official"] },
  signalCodes: ["object_identity", "use_classification", "building_form", "source_limit"],
  opportunityCodes: ["existing_asset_repositioning", "technical_reuse_test"],
  risks: ["non_official_source", "identity_uncertainty", "geometry_not_parcel"].map(code => ({ code, severity: "high", confidence: "low" })),
  answerCode: "source_evidence_only", focusedAnswer: null, caveat: SPRINT10_CAVEAT
};

function fixture(request: PointObjectAnalysisRequest, sequence: number, hash: string) {
  const generated = request.question
    ? recoverPointObjectAiFocusedContentDetailed(plan, pack, request)
    : validatePointObjectAiContentDetailed({ ...plan, answerCode: null }, pack, request);
  if (!generated.ok) throw new Error(`Building-part core fixture rejected: ${generated.detail}`);
  const response = sprint10AnalysisResponse(request, sequence, hash, POINT_OBJECT_AI_PROMPT_VERSION);
  // Reuse the unrelated cards/depth-plan/telemetry envelope; these three fields
  // are the actual source-bound core output under test, including initial output.
  return { ...response, subject: { ...response.subject, tags, metrics }, content: { ...response.content,
    sourceFacts: generated.content.sourceFacts, initialSemanticBrief: generated.content.initialSemanticBrief,
    answerToQuestion: generated.content.answerToQuestion } };
}

// Run pure fixture/strict-parser checks at discovery, before any browser exists.
for (const locale of ["en", "ru"] as const) {
  const answers: string[] = [];
  for (const depth of ["quick", "standard", "deep"] as const) for (const focused of [false, true]) {
    const request: PointObjectAnalysisRequest = { locale, depth, role: "developer", scenario: "unspecified",
      goal: "development_screening", perspective: "developer", horizon: "current", question: !focused ? null : locale === "en"
        ? "Screen this object from the selected perspective. Identify opportunities and risks."
        : "Проведи предварительную оценку объекта: возможности и риски." };
    const response = fixture(request, 1, "a".repeat(64));
    expect(parsePointObjectAiResponse(response)).not.toBeNull();
    expect(response.subject.metrics).toEqual(metrics);
    const measurement = response.content.sourceFacts.find(claim => claim.evidenceRefs.includes("EVD-OBJECT-METRICS"))!;
    expect(measurement.evidenceRefs).toContain("EVD-ALLOWED-FIELDS");
    expect(measurement.statement).toContain(locale === "en" ? "1,800 m²; perimeter: 180 m." : "1\u00a0800 м²; периметр: 180 м.");
    expect(measurement.statement).toMatch(locale === "en" ? /not the whole building or complex/ : /не всего здания или комплекса/);
    expect(response.content.initialSemanticBrief.subject.statement).toMatch(locale === "en" ? /building part/ : /часть здания/);
    if (focused) answers.push(response.content.answerToQuestion!.statement);
  }
  expect(new Set(answers).size).toBe(3);
}

async function stored(page: Page) {
  return page.evaluate(key => {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw).analysis : null;
  }, POINT_OBJECT_SESSION_KEYS.analysis);
}

async function prepare(page: Page, locale: "en" | "ru", baseURL: string) {
  await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
  const acquired = { ...sprint10Selection, resolvedObject: { ...selected, tags, metrics,
    evidenceReceipt: sprint10PublicEvidenceReceipt(sourceFeatureId, locale) } };
  await page.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(value));
  }, { key: POINT_OBJECT_SESSION_KEYS.selection, value: acquired });
  let posts = 0;
  const unexpected: string[] = [], outputs: ReturnType<typeof fixture>[] = [];
  await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, user: null } }));
  await page.route("**/api/prototype/point-to-object/**", route => {
    unexpected.push(new URL(route.request().url()).pathname);
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/prototype/point-to-object/ai", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { mode: "ready", challenge: "A".repeat(43) } });
    expect(route.request().method()).toBe("POST");
    const { role, scenario, depth, goal, perspective, horizon, question, locale: requestLocale, evidenceReceipt } = route.request().postDataJSON();
    expect(requestLocale).toBe(locale);
    expect(evidenceReceipt.sourceLocale).toBe(locale === "ru" ? "ru,en" : "en");
    const output = fixture({ role, scenario, depth, goal, perspective, horizon, question, locale: requestLocale }, ++posts, evidenceReceipt.evidencePackHash);
    expect(parsePointObjectAiResponse(output)).not.toBeNull();
    outputs.push(output);
    await route.fulfill({ json: output });
  });
  return { posts: () => posts, latest: () => outputs.at(-1)!, unexpected };
}

test.beforeEach(async ({ page }, info) => installLoopbackBrowserHarness(page, info.project.use.browserName, info.project.use.baseURL));

for (const { locale, width } of [{ locale: "en", width: 1440 }, { locale: "ru", width: 390 }] as const) {
  test(`COMPLETE26 building-part scope and exact metrics persist/reopen ${locale} ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const harness = await prepare(page, locale, info.project.use.baseURL!);
    await page.goto("/prototype/point-to-object/analysis");
    await expect(page.getByTestId("ai-success")).toBeVisible();
    const labels = locale === "en"
      ? { attributes: "OpenStreetMap attributes", reasoning: "Decision reasoning & context", measurements: "Measurements & sample details", goal: "Development screening", quick: "Quick", standard: "Standard", deep: "Deep", run: /^(Run focused analysis|Refresh analysis)$/ }
      : { attributes: "Атрибуты OpenStreetMap", reasoning: "Обоснование и контекст решения", measurements: "Измерения и состав выборки", goal: "Девелопмент", quick: "Быстро", standard: "Стандарт", deep: "Глубоко", run: /^(Запустить целевой анализ|Обновить анализ)$/ };
    const partPattern = locale === "en" ? /building part/ : /част[ьи] здания/;
    const exclusion = locale === "en" ? /not the whole building or complex/ : /не (всё здание или комплекс|всего здания или комплекса)/;
    async function assertVisibleScope(output: ReturnType<typeof fixture>) {
      // The source tag is beside identity; the normalized qualifier and explicit
      // whole-complex exclusion are actual core source facts, not injected UI copy.
      await expect(page.getByLabel(labels.attributes).getByText("Building · Part · yes", { exact: true })).toBeVisible();
      const identity = output.content.sourceFacts.find(claim => claim.evidenceRefs.includes("EVD-OSM-OBJECT"))!;
      expect(identity.statement).toMatch(partPattern);
      expect(identity.statement).toMatch(exclusion);
      await expect(page.getByText(identity.statement, { exact: true })).toBeVisible();
      const reasoning = page.locator("details").filter({ has: page.locator("summary", { hasText: labels.reasoning }) });
      const reasoningToggle = reasoning.locator(":scope > summary");
      await expect(reasoningToggle).toHaveCount(1);
      if (await reasoning.getAttribute("open") === null) await reasoningToggle.click();
      await expect(reasoning.getByText(output.content.initialSemanticBrief.subject.statement, { exact: true })).toBeVisible();
      const panel = page.getByTestId("analysis-geocontext");
      if (await panel.getAttribute("open") === null) await panel.getByText(labels.measurements, { exact: true }).click();
      // This panel calls them selected-record metrics. The explicit part scope
      // lives in the adjacent source facts below; do not claim a changed label.
      await expect(panel).toContainText(locale === "en" ? "1,800 m² · 180 m perimeter" : "1 800 м² · 180 м по периметру");
      const measurement = output.content.sourceFacts.find(claim => claim.evidenceRefs.includes("EVD-OBJECT-METRICS"))!;
      expect(measurement.statement).toMatch(partPattern);
      expect(measurement.statement).toMatch(exclusion);
      await expect(page.getByText(measurement.statement, { exact: true })).toBeVisible();
      expect(output.subject.metrics).toEqual(metrics);
      if (output.content.answerToQuestion) {
        expect(output.content.answerToQuestion.statement).toMatch(partPattern);
        await expect(page.getByText(output.content.answerToQuestion.statement, { exact: true })).toBeVisible();
      }
    }
    const statements: string[] = [];
    for (const depth of [null, "quick", "standard", "deep"] as const) {
      if (depth) {
        await page.getByRole("button", { name: labels.goal, exact: true }).click();
        await page.getByRole("button", { name: labels[depth], exact: true }).click();
        const before = harness.posts();
        await page.getByRole("button", { name: labels.run }).click();
        await expect.poll(harness.posts).toBe(before + 1);
        await expect(page.getByTestId("role-decision-cards")).toHaveAttribute("data-depth", depth);
      }
      const output = harness.latest(), parsed = parsePointObjectAiResponse(output)!;
      await expect.poll(() => stored(page)).toEqual(parsed);
      await assertVisibleScope(output);
      if (depth) statements.push(output.content.answerToQuestion!.statement);
      const bytes = await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis);
      const posts = harness.posts();
      await page.reload();
      await expect(page.getByTestId("ai-success")).toBeVisible();
      await assertVisibleScope(output);
      expect(await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis)).toBe(bytes);
      expect(harness.posts()).toBe(posts);
    }
    expect(new Set(statements).size).toBe(3);
    expect(harness.posts()).toBe(4);
    expect(harness.unexpected).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByTestId("ai-success").screenshot({ path: info.outputPath(`building-part-${locale}-${width}.png`) });
  });
}
