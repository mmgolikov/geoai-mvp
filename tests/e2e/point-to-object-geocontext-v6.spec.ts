import { expect, test, type Page, type Route } from "@playwright/test";

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const CLICKED_AT = "2026-09-06T08:59:00.000Z";
const SYNTHETIC_OBJECT_ID = "way/91001";

const geoContext = {
  radiusM: 400,
  coverage: "available",
  sampleSize: 5,
  capReached: false,
  groups: [
    { group: "commercial", count: 3, sharePct: 60, nearestDistanceM: 25 },
    { group: "hospitality", count: 2, sharePct: 40, nearestDistanceM: 45 }
  ],
  mappedBuildingCount: 4,
  mappedLevelsKnownCount: 3,
  medianMappedLevels: 18,
  nearestTransitM: 120,
  nearestMajorRoadM: 80,
  districtCharacter: {
    code: "commercial_business",
    confidence: "medium",
    ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
    driverGroups: ["commercial", "hospitality"]
  }
} as const;

const linkedEntity = {
  contractVersion: "POINT_OBJECT_WIKIDATA_ENTITY_V1",
  qid: "Q777",
  labels: { en: "Synthetic Harbour Complex", ru: "Тестовый комплекс Harbour" },
  source: {
    sourceId: "WIKIDATA-ENTITY",
    dataset: "Wikidata",
    service: "MediaWiki Action API",
    endpointHost: "www.wikidata.org",
    sourceResponseHash: "b".repeat(64),
    sourceResponseBytes: 1_200,
    sourceRevisionId: 77,
    entityModifiedAt: "2026-08-30T00:00:00.000Z",
    acquiredAt: "2026-09-06T09:00:00.000Z",
    cacheExpiresAt: "2026-09-07T09:00:00.000Z",
    licenceId: "CC0-1.0",
    licenceUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    accessPolicyUrl: "https://www.wikidata.org/wiki/Wikidata:Data_access/en",
    usagePolicyUrl: "https://www.mediawiki.org/wiki/API:Etiquette",
    officialStatus: "community_structured_data_not_official_asset_record"
  },
  identity: {
    identityReceiptHash: "c".repeat(64),
    qid: "Q777",
    osmSourceFeatureId: SYNTHETIC_OBJECT_ID,
    osmGeometryHash: "d".repeat(64),
    basis: "polygon_coordinate_inside_or_boundary_tolerance",
    linkedCoordinateDistanceM: 8,
    polygonBoundaryToleranceM: 20,
    nodeOrComplexMaxDistanceM: 250,
    countryMatch: "matched",
    typeMatch: "compatible",
    scope: "linked_community_entity_not_certified_selected_footprint"
  },
  statements: [{
    statementReceiptHash: "e".repeat(64),
    identityReceiptHash: "c".repeat(64),
    sourceResponseHash: "b".repeat(64),
    sourceRevisionId: 77,
    qid: "Q777",
    propertyId: "P2048",
    statementId: "Q777$synthetic-height",
    rank: "normal",
    value: {
      kind: "quantity",
      amount: "+321.4",
      numericValue: 321.4,
      unit: "metre",
      unitEntityId: "Q11573",
      lowerBound: null,
      upperBound: null
    },
    qualifiers: []
  }],
  conflictingPropertyIds: ["P2048"]
} as const;

const selection = {
  locationKey: "dubai",
  longitude: 55.27,
  latitude: 25.2,
  clickedAt: CLICKED_AT,
  object: {
    name: "Synthetic Harbour Hotel",
    featureClass: "tourism:hotel",
    sourceFeatureId: SYNTHETIC_OBJECT_ID,
    geometry: { type: "Point", coordinates: [55.27, 25.2] },
    renderHeightM: null,
    renderMinHeightM: null
  },
  resolvedObject: {
    name: "Synthetic Harbour Hotel",
    address: "Synthetic Harbour Hotel, Dubai",
    featureClass: "tourism:hotel",
    sourceFeatureId: SYNTHETIC_OBJECT_ID,
    geometryType: "Polygon",
    coordinateAssociation: "trusted_open_map_identity",
    resultCentroidDistanceM: 0,
    addressParts: { city: "Dubai", country: "United Arab Emirates" },
    tags: { "tag.building": "hotel", "tag.building:levels": "30", "tag.height": "200" },
    metrics: {
      footprintAreaSqM: 2_400,
      footprintPerimeterM: 210,
      method: "local_equirectangular_wgs84_approximation",
      geometryGeneralized: true
    },
    geoContext,
    linkedEntity: null
  },
  viewport: { center: [55.27, 25.2], zoom: 17, pitch: 0, bearing: 0, viewMode: "2d", basemapId: "street" },
  provider: "OpenFreeMap / OpenStreetMap",
  nearbyLabels: []
} as const;

function claim(statement: string, ...evidenceRefs: string[]) {
  return { statement, evidenceRefs };
}

function syntheticV6Response(locale: "en" | "ru") {
  const ru = locale === "ru";
  const allowedFields = ["EVD-ALLOWED-FIELDS"];
  const contextRefs = ["EVD-CONTEXT-SUMMARY", "EVD-CONTEXT-1"];
  const linkedRefs = ["EVD-WIKIDATA-ENTITY", "EVD-WIKIDATA-P2048"];
  const requestId = `resp_synthetic_${locale}`;

  return {
    mode: "openai",
    schemaVersion: 6,
    generatedAt: "2026-09-06T09:00:01.000Z",
    evidencePackId: `synthetic_geocontext_${locale}`,
    evidencePackHash: "a".repeat(64),
    request: {
      depth: "standard",
      goal: "development_screening",
      perspective: "developer",
      horizon: "current",
      question: null,
      focused: false,
      locale
    },
    content: {
      initialSemanticBrief: {
        codes: {
          subject: "linked_named_entity",
          context: "commercial_business_mapped",
          access: "mapped_transit_and_road",
          implication: "developer_development_sequence"
        },
        subject: claim(
          ru ? "Тестовый Harbour Hotel — гостиничный объект в открытой карте." : "Synthetic Harbour Hotel — hotel in the open map.",
          ...allowedFields
        ),
        context: claim(
          ru ? "В выборке окружения преобладают деловые объекты (3) и гостиницы (2)." : "The surroundings sample is led by commercial places (3) and hospitality places (2).",
          ...contextRefs
        ),
        access: claim(
          ru ? "Ближайший найденный транспорт — 120 м, магистраль — 80 м по прямой." : "Nearest returned transit is 120 m and the nearest major road is 80 m away in a straight line.",
          ...contextRefs
        ),
        implication: claim(
          ru ? "До продолжения девелоперского скрининга проверить допустимое использование и пропускную способность подъездов." : "Before continuing development screening, validate permitted use and access capacity.",
          ...allowedFields,
          ...contextRefs
        ),
        confidence: "medium"
      },
      decisionBrief: {
        headline: ru ? "Продолжить ограниченный скрининг объекта" : "Continue bounded object screening",
        disposition: "continue_screening",
        summary: ru
          ? "Открытые источники дают полезный контекст, но не подтверждают права, зонирование или стоимость."
          : "Open sources provide useful context, but do not verify title, zoning or value.",
        reasons: [
          claim(ru ? "Тип объекта и этажность указаны в открытой карте." : "Object type and mapped levels are present in the open map.", ...allowedFields),
          claim(ru ? "Окружение показывает деловые и гостиничные объекты рядом." : "The surroundings sample shows nearby commercial and hospitality places.", ...contextRefs)
        ],
        confidence: "medium"
      },
      signals: [
        {
          title: ru ? "Функция объекта" : "Mapped use",
          observation: ru ? "В открытой карте объект обозначен как гостиница." : "The open map classifies the selected object as a hotel.",
          implication: ru ? "Проверить официальный допустимый вид использования." : "Validate the officially permitted use.",
          evidenceClass: "observed",
          evidenceRefs: allowedFields,
          confidence: "medium"
        },
        {
          title: ru ? "Контекст окружения" : "Surroundings mix",
          observation: ru ? "В ограниченной выборке найдено пять объектов." : "Five places were returned in the bounded sample.",
          implication: ru ? "Использовать как контекст, а не как полный реестр." : "Use this as context, not as a complete inventory.",
          evidenceClass: "derived",
          evidenceRefs: contextRefs,
          confidence: "medium"
        },
        {
          title: ru ? "Расхождение высоты" : "Height conflict",
          observation: ru ? "Открытая карта и связанная запись Wikidata содержат разные значения высоты." : "The open map and linked Wikidata record contain different height values.",
          implication: ru ? "Не выбирать значение без независимой проверки." : "Do not select a value without independent validation.",
          evidenceClass: "observed",
          evidenceRefs: [...allowedFields, ...linkedRefs],
          confidence: "low"
        }
      ],
      opportunities: [{
        title: ru ? "Проверка программы" : "Programme test",
        hypothesis: ru ? "Гостинично-деловой сценарий можно проверить как гипотезу." : "A hotel/business programme can be tested as a hypothesis.",
        rationale: ru ? "Открытый геоконтекст показывает смешанное деловое окружение." : "Open geocontext shows a mixed commercial setting.",
        potentialValue: ru ? "Не рассчитана без официальных и финансовых данных." : "Not quantified without official and financial evidence.",
        evidenceRefs: contextRefs,
        evidenceNeeded: [ru ? "Официальные ограничения и финансовая модель" : "Official controls and a financial model"],
        confidence: "low"
      }],
      risks: [
        {
          title: ru ? "Неофициальный контекст" : "Non-official context",
          statement: ru ? "Открытые данные не являются кадастровым или планировочным заключением." : "Open data is not a cadastral or planning conclusion.",
          decisionImpact: ru ? "Нельзя принимать инвестиционное решение без официальной проверки." : "Do not make an investment decision without official validation.",
          severity: "high",
          evidenceRefs: allowedFields,
          confidence: "medium"
        },
        {
          title: ru ? "Конфликт атрибутов" : "Attribute conflict",
          statement: ru ? "Значения высоты расходятся между источниками." : "Height values differ between the two sources.",
          decisionImpact: ru ? "Габариты объекта остаются неподтверждёнными." : "The object dimensions remain unverified.",
          severity: "high",
          evidenceRefs: [...allowedFields, ...linkedRefs],
          confidence: "low"
        }
      ],
      sourceFacts: [
        claim(
          ru ? "OpenStreetMap указывает: гостиница, 30 этажей и высота 200 м." : "OpenStreetMap reports hotel use, 30 mapped levels and a height of 200 m.",
          ...allowedFields
        ),
        claim(
          ru ? "Wikidata связывает тестовый комплекс, но его атрибуты не подтверждают выбранное здание." : "Wikidata links a synthetic complex, but its attributes do not certify the selected building.",
          "EVD-WIKIDATA-ENTITY"
        ),
        claim(
          ru ? "Wikidata указывает 321,4 м; значение расходится с OpenStreetMap и не выбирается автоматически." : "Wikidata reports 321.4 m; it conflicts with OpenStreetMap and is not selected automatically.",
          ...allowedFields,
          "EVD-WIKIDATA-P2048"
        )
      ],
      locationContext: [
        claim(
          ru ? "В радиусе 400 м возвращены пять объектов; ближайший транспорт — 120 м." : "Five places were returned within 400 m; nearest transit is 120 m away.",
          ...contextRefs
        )
      ],
      nextValidation: [{
        title: ru ? "Сверить официальный профиль объекта" : "Validate the official object profile",
        action: ru ? "Получить официальные данные об использовании, высоте и правах." : "Obtain official use, height and title evidence.",
        source: ru ? "Компетентные органы и документы клиента" : "Relevant authorities and client records",
        decisionImpact: ru ? "Снимает ключевые ограничения для следующего этапа." : "Closes the main gates for the next screening stage.",
        priority: "critical",
        evidenceRefs: [...allowedFields, ...linkedRefs]
      }],
      answerToQuestion: null,
      geoContext,
      caveat: CAVEAT
    },
    subject: {
      name: "Synthetic Harbour Hotel",
      address: "Synthetic Harbour Hotel, Dubai",
      featureClass: "tourism:hotel",
      sourceFeatureId: SYNTHETIC_OBJECT_ID,
      resolutionMethod: "nominatim_lookup",
      coordinateAssociation: "trusted_open_map_identity",
      sourceLabel: "© OpenStreetMap contributors",
      geometryType: "Polygon",
      resultCentroidDistanceM: 0,
      addressParts: { city: "Dubai", country: "United Arab Emirates" },
      tags: { "tag.building": "hotel", "tag.building:levels": "30", "tag.height": "200" },
      metrics: {
        footprintAreaSqM: 2_400,
        footprintPerimeterM: 210,
        method: "local_equirectangular_wgs84_approximation",
        geometryGeneralized: true
      },
      geoContext,
      linkedEntity
    },
    telemetry: {
      provider: "openai",
      schemaVersion: 6,
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      depth: "standard",
      promptVersion: "POINT_OBJECT_AI_PROMPT_V8_2026_09_06",
      requestId,
      latencyMs: 1,
      attempts: 1,
      attemptTrace: [{
        attempt: 1,
        purpose: "initial",
        model: "gpt-5.6-sol",
        reasoningEffort: "medium",
        requestId,
        inputTokens: 120,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 30,
        totalTokens: 150,
        estimatedCostUsd: null
      }],
      inputTokens: 120,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 30,
      totalTokens: 150,
      estimatedCostUsd: null,
      costRateSource: null,
      stored: false,
      toolCalls: 0
    }
  };
}

function syntheticLegacyV5Response() {
  const current = syntheticV6Response("en");
  const { linkedEntity: _linkedEntity, ...subject } = current.subject;
  const evidenceRefs = ["EVD-OBJECT"];
  return {
    ...current,
    schemaVersion: 5,
    evidencePackId: "synthetic_legacy_v5",
    content: {
      decisionBrief: {
        headline: "Stored V5 screening result",
        disposition: "hold",
        summary: "This exact historical result is restored from the browser session.",
        reasons: [claim("Stored legacy reason one.", ...evidenceRefs), claim("Stored legacy reason two.", ...evidenceRefs)],
        confidence: "low"
      },
      signals: Array.from({ length: 3 }, (_, index) => ({
        title: `Stored signal ${index + 1}`,
        observation: "Historical browser-session observation.",
        implication: "Validate against current evidence before reuse.",
        evidenceClass: "observed",
        evidenceRefs,
        confidence: "low"
      })),
      opportunities: [{
        title: "Stored opportunity",
        hypothesis: "Historical screening hypothesis.",
        rationale: "Retained only to restore the exact V5 result.",
        potentialValue: "Not quantified.",
        evidenceRefs,
        evidenceNeeded: ["Current official evidence"],
        confidence: "low"
      }],
      risks: Array.from({ length: 2 }, (_, index) => ({
        title: `Stored risk ${index + 1}`,
        statement: "Historical evidence may be stale.",
        decisionImpact: "Revalidate before a current decision.",
        severity: "high",
        evidenceRefs,
        confidence: "low"
      })),
      sourceFacts: [claim("Stored legacy source fact.", ...evidenceRefs)],
      locationContext: [claim("Stored legacy location context.", ...evidenceRefs)],
      nextValidation: [{
        title: "Refresh official evidence",
        action: "Obtain current official evidence before use.",
        source: "Relevant authority or client record",
        decisionImpact: "Determines whether the historical screen remains usable.",
        priority: "critical",
        evidenceRefs
      }],
      answerToQuestion: null,
      geoContext,
      caveat: CAVEAT
    },
    subject,
    telemetry: {
      ...current.telemetry,
      schemaVersion: 5,
      promptVersion: "POINT_OBJECT_AI_PROMPT_V7_2026_09_04",
      requestId: "resp_synthetic_legacy",
      attemptTrace: [{
        ...current.telemetry.attemptTrace[0],
        requestId: "resp_synthetic_legacy"
      }]
    }
  };
}

function selectionFingerprint() {
  return [selection.locationKey, selection.longitude.toFixed(6), selection.latitude.toFixed(6), selection.clickedAt].join(":");
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installAnalysisRoutes(page: Page) {
  const apiCalls: Array<{ method: string; path: string; body: Record<string, unknown> | null }> = [];
  const unexpectedExternal: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/prototype/point-to-object/")) {
      apiCalls.push({
        method: request.method(),
        path: url.pathname,
        body: request.method() === "POST" ? request.postDataJSON() as Record<string, unknown> : null
      });
    }
  });

  await page.route(/^https:\/\//, async (route) => {
    unexpectedExternal.push(route.request().url());
    await route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", (route) => json(route, { isAuthenticated: false, user: null }));
  await page.route("**/api/prototype/point-to-object/ai", async (route) => {
    if (route.request().method() === "GET") {
      await json(route, { mode: "ready", challenge: "A".repeat(43) });
      return;
    }
    const request = route.request().postDataJSON() as Record<string, unknown>;
    const locale = request.locale === "ru" ? "ru" : "en";
    await json(route, syntheticV6Response(locale));
  });

  return { apiCalls, unexpectedExternal };
}

async function seedSelection(page: Page) {
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("geoai:point-to-object:selection:v3")) {
      sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(value));
    }
  }, selection);
}

function pointObjectCalls(apiCalls: Array<{ path: string }>) {
  return apiCalls.filter((call) => call.path.startsWith("/api/prototype/point-to-object/"));
}

async function expectNoVisibleResolverBoilerplate(page: Page) {
  const visibleCopy = await page.locator("body").innerText();
  expect(visibleCopy).not.toMatch(/way\/91001|Q777|EVD-|SHA-256|sourceResponseHash|resolver/i);
}

test("V6 renders useful GeoContext and linked-source facts in EN/RU and restores each locale without automatic calls", async ({ page }, testInfo) => {
  const { apiCalls, unexpectedExternal } = await installAnalysisRoutes(page);
  await seedSelection(page);

  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  await expect(page.getByText("Decision context", { exact: true })).toBeVisible();
  await expect(page.getByText("Nearest returned transit is 120 m and the nearest major road is 80 m away in a straight line.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Surroundings within 400 m" })).toBeVisible();
  await expect(page.getByText("Commercial", { exact: true })).toBeVisible();
  await expect(page.getByText("Hospitality", { exact: true })).toBeVisible();
  await expect(page.getByText("Transit: 120 m", { exact: true })).toBeVisible();
  await expect(page.getByText("Major road: 80 m", { exact: true })).toBeVisible();

  const sourceFacts = page.getByRole("heading", { name: "Live location context" }).locator("..");
  await expect(sourceFacts).toContainText("OpenStreetMap reports hotel use, 30 mapped levels and a height of 200 m.");
  await expect(sourceFacts).toContainText("Wikidata links a synthetic complex, but its attributes do not certify the selected building.");
  await expect(sourceFacts).toContainText("Wikidata reports 321.4 m; it conflicts with OpenStreetMap and is not selected automatically.");
  await expect(page.getByTestId("analysis-caveat")).toHaveText(CAVEAT);
  await expectNoVisibleResolverBoilerplate(page);
  await page.screenshot({ path: testInfo.outputPath("v6-analysis-en.png"), fullPage: true });

  await expect.poll(() => apiCalls.filter((call) => call.path.endsWith("/ai") && call.method === "POST").map((call) => call.body?.locale)).toEqual(["en"]);
  expect(apiCalls.find((call) => call.path.endsWith("/ai") && call.method === "POST")?.body).toMatchObject({
    locale: "en",
    expectedSourceFeatureId: SYNTHETIC_OBJECT_ID,
    goal: "development_screening",
    perspective: "developer",
    horizon: "current",
    consent: true
  });
  expect(pointObjectCalls(apiCalls).filter((call) => !call.path.endsWith("/ai"))).toEqual([]);
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:analysis:v8") ?? "null")?.analysis?.schemaVersion)).toBe(6);

  const callsAfterEnglish = apiCalls.length;
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.[0]?.artifacts?.[0]?.kind;
  })).toBe("analyse");
  await page.goto("/projects?view=spatial");
  await expect(page.getByText("Storage mode: on this device.")).toBeVisible();
  await page.getByRole("button", { name: "Reopen without rerunning" }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  expect(apiCalls).toHaveLength(callsAfterEnglish);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  expect(apiCalls).toHaveLength(callsAfterEnglish);

  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect.poll(() => apiCalls.filter((call) => call.path.endsWith("/ai") && call.method === "POST").map((call) => call.body?.locale)).toEqual(["en", "ru"]);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { name: "Продолжить ограниченный скрининг объекта" })).toBeVisible();
  await expect(page.getByText("Контекст решения", { exact: true })).toBeVisible();
  await expect(page.getByText("Ближайший найденный транспорт — 120 м, магистраль — 80 м по прямой.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Окружение в радиусе 400 м" })).toBeVisible();
  await expect(page.getByText("Деловые объекты", { exact: true })).toBeVisible();
  await expect(page.getByText("Гостиницы", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Геоконтекст" }).locator("..")).toContainText("Wikidata указывает 321,4 м; значение расходится с OpenStreetMap и не выбирается автоматически.");
  await expectNoVisibleResolverBoilerplate(page);
  await page.screenshot({ path: testInfo.outputPath("v6-analysis-ru.png"), fullPage: true });

  const callsAfterRussian = apiCalls.length;
  await page.reload();
  await expect(page.getByRole("heading", { name: "Продолжить ограниченный скрининг объекта" })).toBeVisible();
  expect(apiCalls).toHaveLength(callsAfterRussian);
  expect(pointObjectCalls(apiCalls).filter((call) => !call.path.endsWith("/ai"))).toEqual([]);
  expect(unexpectedExternal).toEqual([]);
});

test("a persisted legacy V5 result restores and survives EN/RU locale changes with zero source or AI requests", async ({ page }, testInfo) => {
  const { apiCalls, unexpectedExternal } = await installAnalysisRoutes(page);
  const legacy = syntheticLegacyV5Response();
  await page.addInitScript(({ selected, analysis, fingerprint }) => {
    if (!sessionStorage.getItem("geoai:point-to-object:selection:v3")) {
      sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(selected));
    }
    if (!sessionStorage.getItem("geoai:point-to-object:analysis:v7")) {
      sessionStorage.setItem("geoai:point-to-object:analysis:v7", JSON.stringify({ selectionFingerprint: fingerprint, analysis }));
    }
  }, { selected: selection, analysis: legacy, fingerprint: selectionFingerprint() });

  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stored V5 screening result" })).toBeVisible();
  await expect(page.getByText("This exact historical result is restored from the browser session.")).toBeVisible();
  await expect(page.getByText("Decision context", { exact: true })).toHaveCount(0);
  expect(pointObjectCalls(apiCalls)).toEqual([]);

  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { name: "Stored V5 screening result" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ключевые сигналы" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stored signal 1" })).toBeVisible();
  await expect(page.getByText("Контекст решения", { exact: true })).toHaveCount(0);
  expect(pointObjectCalls(apiCalls)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("legacy-v5-restored-ru.png"), fullPage: true });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Stored V5 screening result" })).toBeVisible();
  expect(pointObjectCalls(apiCalls)).toEqual([]);
  expect(unexpectedExternal).toEqual([]);
});
