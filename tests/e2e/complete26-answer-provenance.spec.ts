import { test, expect, type Page } from "@playwright/test";
import { sprint10Selection, sprint10PublicEvidenceReceipt, sprint10AnalysisResponse, SPRINT10_CAVEAT } from "./helpers/sprint10-analysis-fixture";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { POINT_OBJECT_AI_PROMPT_VERSION, recoverPointObjectAiFocusedContentDetailed, validatePointObjectAiContentDetailed, type PointObjectAnalysisRequest } from "../../src/lib/prototype/point-to-object-ai-core";
import type { GroundablePointObjectEvidencePack } from "../../src/lib/prototype/point-to-object-live-evidence";
import { parsePointObjectAiResponse, POINT_OBJECT_SESSION_KEYS } from "../../components/point-to-object/live-session";

// Source/provider responses are synthetic and intercepted. The core really
// validates/renders the answer; this is not live AI, cloud or project-sync proof.
const selection = sprint10Selection.resolvedObject;
const sourceFeatureId = selection.sourceFeatureId;
const evidence = (id: string, value: unknown, sourceId = sourceFeatureId as string) => ({ id, sourceId, label: id, value: JSON.stringify(value) });
const coordinates = { longitude: 55.27, latitude: 25.2, crs: "EPSG:4326" };
const pack = {
  protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2", coordinates,
  selectedObject: { sourceFeatureId, name: selection.name, featureClass: selection.featureClass, tags: selection.tags, geometryType: "Polygon", geometryHash: "a".repeat(64) },
  geoContext: selection.geoContext, nearbyContext: [],
  evidence: [evidence("EVD-COORDINATES", coordinates, "user_point"), evidence("EVD-OSM-OBJECT", { sourceFeatureId, name: selection.name }),
    evidence("EVD-CLASSIFICATION", { sourceFeatureId, featureClass: selection.featureClass }),
    evidence("EVD-ALLOWED-FIELDS", { sourceFeatureId, tags: selection.tags }),
    evidence("EVD-GEOMETRY", { sourceFeatureId, geometryType: "Polygon", geometryHash: "a".repeat(64) }),
    evidence("EVD-CONTEXT-SUMMARY", selection.geoContext, "SPAT-001"), evidence("EVD-SOURCE", "OpenStreetMap ODbL")]
} as unknown as GroundablePointObjectEvidencePack;
const plan = {
  decision: { path: "existing_asset_screen", disposition: "continue_screening", confidence: "low", reasonCodes: ["object_identity_available", "use_classification_available", "source_is_non_official"] },
  signalCodes: ["object_identity", "use_classification", "building_form", "source_limit"],
  opportunityCodes: ["existing_asset_repositioning", "technical_reuse_test"],
  risks: ["non_official_source", "identity_uncertainty", "geometry_not_parcel"].map(code => ({ code, severity: "high", confidence: "low" })),
  answerCode: "source_evidence_only", focusedAnswer: null, caveat: SPRINT10_CAVEAT
};
type FixtureKind = "absent" | "model" | "recovery" | "invalid";
const modelText = (locale: "en" | "ru") => locale === "ru"
  ? "Здание по карте даёт основу для проверки идентичности. Оценивайте техническую пригодность после подтверждения прав и привязки участка."
  : "The mapped building supports an identity-led review. Test technical suitability only after confirming rights and parcel association.";

function fixture(request: PointObjectAnalysisRequest, sequence: number, hash: string, kind: FixtureKind) {
  const response = sprint10AnalysisResponse(request, sequence, hash,
    kind === "absent" ? "POINT_OBJECT_AI_PROMPT_V12_2026_09_21" : POINT_OBJECT_AI_PROMPT_VERSION);
  if (!request.question) return response;
  const raw = { status: "partial", scope: "screening_implication", perspective: request.perspective, horizon: request.horizon, confidence: "low",
    statement: modelText(request.locale), evidenceRefs: ["EVD-OSM-OBJECT", "EVD-GEOMETRY"],
    missingEvidenceCodes: ["official_identity", "parcel_boundary", "title_rights", "planning_controls", "physical_baseline", "current_market", "cost_financials"], unsupportedReasonCode: null };
  const content = kind === "recovery"
    ? recoverPointObjectAiFocusedContentDetailed({ ...plan, focusedAnswer: { ...raw, statement: `${raw.statement} 987654321 levels.` } }, pack, request)
    : validatePointObjectAiContentDetailed({ ...plan, focusedAnswer: raw }, pack, request);
  if (!content.ok) throw new Error(`Synthetic core fixture rejected: ${content.detail}`);
  // Existing fixture supplies the unrelated cards/telemetry/depth-plan envelope;
  // the focused answer under test is the real validated core output, not copy.
  return { ...response, content: { ...response.content, answerToQuestion: content.content.answerToQuestion },
    ...(kind === "absent" ? {} : { answerProvenance: kind === "model"
      ? { kind: "model_validated", rejectionCode: null }
      : { kind: "deterministic_recovery", rejectionCode: kind === "invalid" ? "PRIVATE_INVALID_CODE" : "focused_answer_novel_number" } }) };
}

// Discovery also validates every pure payload shape before a browser is opened.
for (const locale of ["en", "ru"] as const) for (const depth of ["quick", "standard", "deep"] as const) {
  const request: PointObjectAnalysisRequest = { role: "developer", scenario: "unspecified", locale, depth,
    goal: "development_screening", perspective: "developer", horizon: "current",
    question: locale === "en" ? "Screen this object from the selected perspective. Identify opportunities and risks." : "Проведи предварительную оценку объекта: возможности и риски." };
  for (const kind of ["absent", "model", "recovery", "invalid"] as const) {
    expect(Boolean(parsePointObjectAiResponse(fixture(request, 1, "a".repeat(64), kind))), `${locale}/${depth}/${kind}`).toBe(kind !== "invalid");
  }
}

async function stored(page: Page) {
  return page.evaluate(key => {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw).analysis : null;
  }, POINT_OBJECT_SESSION_KEYS.analysis);
}

async function prepare(page: Page, locale: "en" | "ru", baseURL: string) {
  await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
  const acquiredSelection = { ...sprint10Selection, resolvedObject: { ...selection,
    evidenceReceipt: sprint10PublicEvidenceReceipt(sourceFeatureId, locale) } };
  await page.addInitScript(({ key, value }) => {
    // Preserve saved bytes across reload; install only the initial source fixture.
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(value));
  }, { key: POINT_OBJECT_SESSION_KEYS.selection, value: acquiredSelection });
  let posts = 0, kind: FixtureKind = "absent";
  const unexpected: string[] = [];
  const outputs: ReturnType<typeof fixture>[] = [];
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
    const output = fixture({ role, scenario, depth, goal, perspective, horizon, question, locale: requestLocale }, ++posts, evidenceReceipt.evidencePackHash, kind);
    if (kind !== "invalid") expect(parsePointObjectAiResponse(output)).not.toBeNull();
    outputs.push(output);
    await route.fulfill({ json: output });
  });
  return { posts: () => posts, setKind: (next: FixtureKind) => { kind = next; }, latest: () => outputs.at(-1)!, unexpected };
}

test.beforeEach(async ({ page }, info) => installLoopbackBrowserHarness(page, info.project.use.browserName, info.project.use.baseURL));

for (const { locale, width } of [{ locale: "en", width: 1440 }, { locale: "ru", width: 390 }] as const) {
  const labels = locale === "en" ? { goal: "Development screening", quick: "Quick", standard: "Standard", deep: "Deep", run: /^(Run focused analysis|Refresh analysis)$/ }
    : { goal: "Девелопмент", quick: "Быстро", standard: "Стандарт", deep: "Глубоко", run: /^(Запустить целевой анализ|Обновить анализ)$/ };

  test(`COMPLETE26 answer provenance and real core recovery persist/reopen ${locale} ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const harness = await prepare(page, locale, info.project.use.baseURL!);
    await page.goto("/prototype/point-to-object/analysis");
    await expect(page.getByTestId("ai-success")).toBeVisible();
    const dashboard = page.getByTestId("role-decision-cards");
    const statements: string[] = [];
    // An absent field in a focused saved response is historical/unknown, not
    // invented model provenance. Both explicit provenance kinds then roundtrip.
    for (const step of [
      { kind: "absent", depth: "quick" }, { kind: "model", depth: "standard" },
      { kind: "recovery", depth: "quick" }, { kind: "recovery", depth: "standard" }, { kind: "recovery", depth: "deep" }
    ] as const) {
      harness.setKind(step.kind);
      await page.getByRole("button", { name: labels.goal, exact: true }).click();
      await page.getByRole("button", { name: labels[step.depth], exact: true }).click();
      const before = harness.posts();
      await page.getByRole("button", { name: labels.run }).click();
      await expect.poll(harness.posts).toBe(before + 1);
      await expect(dashboard).toHaveAttribute("data-depth", step.depth);
      const output = harness.latest();
      const statement = output.content.answerToQuestion!.statement;
      await expect(page.getByTestId("ai-success")).toContainText(statement);
      const parsed = parsePointObjectAiResponse(output)!;
      await expect.poll(() => stored(page)).toEqual(parsed);
      if (step.kind === "recovery") statements.push(statement);
      else expect(statement).toBe(modelText(locale));
      if (step.kind === "absent") expect(Object.hasOwn(await stored(page), "answerProvenance")).toBe(false);
      const bytes = await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis);
      await page.reload();
      await expect(dashboard).toHaveAttribute("data-depth", step.depth);
      await expect(page.getByTestId("ai-success")).toContainText(statement);
      expect(harness.posts()).toBe(before + 1);
      expect(await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis)).toBe(bytes);
    }
    expect(new Set(statements).size).toBe(3);
    expect(statements[0]).toMatch(locale === "en" ? /confirm object and parcel identity/ : /подтвердить идентичность объекта и участка/);
    expect(statements[1]).toMatch(locale === "en" ? /compare retaining current use with adapting/ : /сравните сохранение использования с адаптацией/i);
    expect(statements[2]).toMatch(locale === "en" ? /Reject adaptation.*hold replacement/ : /Отклоните адаптацию.*замену не выбирайте/);
    expect(harness.posts()).toBe(6);
    expect(harness.unexpected).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByTestId("ai-success").screenshot({ path: info.outputPath(`provenance-recovery-${locale}-${width}.png`) });
  });

  test(`COMPLETE26 invalid provenance cannot replace valid saved answer ${locale} ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const harness = await prepare(page, locale, info.project.use.baseURL!);
    await page.goto("/prototype/point-to-object/analysis");
    await expect(page.getByTestId("ai-success")).toBeVisible();
    const before = await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis);
    harness.setKind("invalid");
    await page.getByRole("button", { name: labels.goal, exact: true }).click();
    await page.getByRole("button", { name: labels.quick, exact: true }).click();
    await page.getByRole("button", { name: labels.run }).click();
    await expect.poll(harness.posts).toBe(2);
    const preservedResultAlert = page.getByRole("alert").filter({ hasText: locale === "en"
      ? "The previous result is still available below."
      : "Предыдущий результат остаётся доступен ниже." });
    await expect(preservedResultAlert).toHaveCount(1);
    await expect(preservedResultAlert).toBeVisible();
    await expect(page.getByTestId("role-decision-cards")).toHaveAttribute("data-depth", "standard");
    expect(parsePointObjectAiResponse(harness.latest())).toBeNull();
    expect(await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis)).toBe(before);
    await page.reload();
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await expect(page.getByTestId("role-decision-cards")).toHaveAttribute("data-depth", "standard");
    expect(harness.posts()).toBe(2);
    expect(await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis)).toBe(before);
    expect(harness.unexpected).toEqual([]);
  });
}
