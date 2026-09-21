import { expect, test, type Page, type Route } from "@playwright/test";
import {
  declaredAuthPersona,
  expectDeclaredAuthPersona,
  expectProtectedEntryDeniedWithoutByteMutation,
  sessionMissingFixture
} from "./helpers/auth-persona";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

test.beforeEach(async ({ page, browserName }, testInfo) => {
  await installLoopbackBrowserHarness(page, browserName, testInfo.project.use.baseURL);
});

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const CLICKED_AT = "2026-09-06T08:59:00.000Z";
const SYNTHETIC_OBJECT_ID = "way/91001";
function publicReceipt(locale: "en" | "ru", lookupSourceFeatureId: string | null = SYNTHETIC_OBJECT_ID) {
  const created = Math.floor(Date.now() / 900_000) * 900_000;
  return { version: "PUBLIC_EVIDENCE_LEASE_V1" as const, evidencePackHash: "a".repeat(64),
    sourceResponseHash: "b".repeat(64), acquiredAt: new Date(created).toISOString(),
    createdAt: new Date(created).toISOString(), expiresAt: new Date(created + 900_000).toISOString(),
    cacheWindow: Math.floor(created / 900_000), sourceLocale: locale === "ru" ? "ru,en" : "en",
    lookupSourceFeatureId };
}

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

function syntheticV9StandardResponse() {
  const response = syntheticV6Response("en");
  return {
    ...response,
    content: {
      ...response.content,
      depthReview: {
        depth: "standard",
        basis: "structured_review_of_existing_evidence",
        purpose: "decision_criteria",
        analyticChecks: [{
          title: "Mapped-use gate",
          observation: "The returned open-map record identifies a hotel use.",
          implication: "Treat the use as screening evidence until an official record confirms it.",
          evidenceClass: "observed",
          evidenceRefs: ["EVD-ALLOWED-FIELDS"],
          confidence: "medium"
        }],
        alternatives: [{
          title: "Retain the existing-use path",
          rationale: "The observed hotel tag supports checking an operating-asset path before redevelopment.",
          evidenceClass: "hypothesis",
          evidenceRefs: ["EVD-ALLOWED-FIELDS"]
        }],
        uncertainties: [{
          title: "Official permitted use",
          statement: "The open-map tag is not an official planning record.",
          decisionImpact: "The development path remains conditional on official validation.",
          evidenceRefs: ["EVD-ALLOWED-FIELDS"]
        }],
        decisionTriggers: [{
          title: "Confirm the official use",
          action: "Obtain the current planning record for the selected object.",
          decisionImpact: "A conflicting official use would change the programme screened next.",
          evidenceRefs: ["EVD-ALLOWED-FIELDS"]
        }]
      }
    },
    telemetry: {
      ...response.telemetry,
      promptVersion: "POINT_OBJECT_AI_PROMPT_V9_2026_09_12"
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

function syntheticCurrentResponse(request: Record<string, unknown>) {
  const locale = request.locale === "ru" ? "ru" : "en";
  const response = syntheticV6Response(locale);
  const depthReview = syntheticV9StandardResponse().content.depthReview;
  return {
    ...response,
    request: {
      ...response.request,
      role: request.role,
      scenario: request.scenario,
      depth: request.depth,
      goal: request.goal,
      perspective: request.perspective,
      horizon: request.horizon,
      question: request.question,
      focused: Boolean(request.question)
    },
    content: { ...response.content, depthReview },
    telemetry: { ...response.telemetry, promptVersion: "POINT_OBJECT_AI_PROMPT_V10_2026_09_18" }
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

  await page.route(externalHttpUrlPattern(test.info().project.use.baseURL), async (route) => {
    unexpectedExternal.push(route.request().url());
    await route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", (route) => json(route, sessionMissingFixture));
  await page.route("**/api/auth/logout", (route) => json(route, { ok: true }));
  await page.route("**/api/prototype/point-to-object/context", route => {
    const body = route.request().postDataJSON() as { locale: "en" | "ru"; expectedSourceFeatureId: string | null };
    return json(route, { mode: "resolved", subject: { ...selection.resolvedObject,
      evidenceReceipt: publicReceipt(body.locale, body.expectedSourceFeatureId) } });
  });
  await page.route("**/api/prototype/point-to-object/ai", async (route) => {
    if (route.request().method() === "GET") {
      await json(route, { mode: "ready", challenge: "A".repeat(43) });
      return;
    }
    const request = route.request().postDataJSON() as Record<string, unknown>;
    await json(route, syntheticCurrentResponse(request));
  });

  return { apiCalls, unexpectedExternal };
}

async function signInDemo(page: Page, nextPath: string) {
  const loginNextPath = nextPath.startsWith("/prototype/point-to-object") ? "/workspace" : nextPath;
  // The authenticated header can mount before Workspace's passive bootstrap
  // effects. Complete those real reads before this helper's hard navigation;
  // otherwise WebKit can report requests from the departing document as errors.
  const workspaceBootstrap = loginNextPath === "/workspace" ? Promise.all([
    "/api/projects",
    "/api/analysis-runs?limit=10&projectKey=dubai-investment-screening-demo",
    "/api/db/health"
  ].map(async (path) => {
    const expected = new URL(path, test.info().project.use.baseURL);
    expected.searchParams.sort();
    const response = await page.waitForResponse((candidate) => {
      const actual = new URL(candidate.url());
      actual.searchParams.sort();
      return candidate.request().method() === "GET" && actual.href === expected.href;
    });
    return { path, status: response.status(), completionError: await response.finished() };
  })).then((responses) => ({ responses }), (error: unknown) => ({ error })) : null;
  await page.goto(`/login?next=${encodeURIComponent(loginNextPath)}&intent=demo`);
  const demoAccess = page.getByRole("button", { name: "Open demo access" });
  await expect.poll(async () => {
    return new URL(page.url()).pathname === loginNextPath || await demoAccess.isVisible().catch(() => false);
  }, { timeout: 10_000, intervals: [50, 100, 250] }).toBe(true);
  if (new URL(page.url()).pathname !== loginNextPath) {
    await expect(demoAccess).toBeVisible();
    await demoAccess.click();
    await page.getByRole("button", { name: "Open demo", exact: true }).click();
    await expect.poll(async () => {
      try {
        return await page.evaluate(() => localStorage.getItem("geoai-mock-demo-session-v1"));
      } catch {
        return null;
      }
    }).toBe("active");
    // The demo action owns navigation; a competing goto can abort that redirect.
    await expect(page).toHaveURL((url) => url.pathname === loginNextPath);
  }
  if (loginNextPath === nextPath) return;
  await expect(page.getByRole("link", { name: "Open demo profile" })).toHaveAttribute("data-authenticated", "true");
  if (workspaceBootstrap) {
    const bootstrap = await workspaceBootstrap;
    if ("error" in bootstrap) throw bootstrap.error;
    for (const response of bootstrap.responses) {
      expect(response.status, `${response.path} bootstrap status`).toBe(200);
      expect(response.completionError, `${response.path} bootstrap completion`).toBeNull();
    }
  }
  await page.goto(nextPath);
}

async function seedSelection(page: Page) {
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("geoai:point-to-object:selection:v3")) {
      sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(value));
    }
  }, { ...selection, resolvedObject: { ...selection.resolvedObject, evidenceReceipt: publicReceipt("en") } });
}

function pointObjectCalls<T extends { path: string }>(apiCalls: T[]): T[] {
  return apiCalls.filter((call) => call.path.startsWith("/api/prototype/point-to-object/"));
}

async function savedAnalyseArtifactCount(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.reduce((count: number, project: { artifacts?: Array<{ kind?: string }> }) =>
      count + (project.artifacts?.filter((artifact) => artifact.kind === "analyse").length ?? 0), 0) ?? 0;
  });
}

async function expectNoVisibleResolverBoilerplate(page: Page) {
  const visibleCopy = await page.locator("body").innerText();
  expect(visibleCopy).not.toMatch(/way\/91001|Q777|EVD-|SHA-256|sourceResponseHash|resolver/i);
}

test('auth-persona: public demo recovers the RU draft while protected entry redirects without mutating bytes', async ({ page }, testInfo) => {
  const persona = declaredAuthPersona(testInfo);
  await page.setViewportSize({ width: 430, height: 932 });
  const { apiCalls } = await installAnalysisRoutes(page);
  await page.route('https://tiles.openfreemap.org/styles/**', route => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e8edf0' } }] } }));
  await page.route('**/api/prototype/point-to-object/suggest', route => route.fulfill({ json: {
    protocol: 'POINT_TO_OBJECT_001_AUTOCOMPLETE_V1', mode: 'results', provider: 'Photon',
    results: [{ id: 'way/91001', label: 'Synthetic Harbour Hotel', secondaryLabel: 'Dubai', longitude: 55.27, latitude: 25.2, category: 'tourism', featureType: 'hotel', boundingBox: null }],
    source: { attribution: '© OpenStreetMap contributors', licenceId: 'ODbL-1.0', licenceUrl: 'https://www.openstreetmap.org/copyright', serviceUrl: 'https://photon.komoot.io/', officialStatus: 'open_context_not_official' }
  } }));
  await page.route('**/api/prototype/point-to-object/context', route => route.fulfill({ json: { mode: 'resolved', subject: {
    ...selection.resolvedObject, evidenceReceipt: publicReceipt("ru") } } }));
  await page.context().addCookies([{ name: 'geoai_locale', value: 'ru', url: testInfo.project.use.baseURL! }]);
  if (persona === "supabase_auth") {
    await expectProtectedEntryDeniedWithoutByteMutation(page, "/prototype/point-to-object", {
      local: { "geoai:point-to-object:browser-identity:v1": "user:protected-e2e" },
      session: { "geoai:point-to-object:analysis-draft:v1": '{"locale":"ru","draft":"protected-byte-sentinel"}' }
    });
    expect(apiCalls).toEqual([]);
    return;
  }
  await page.goto('/prototype/point-to-object');
  await expectDeclaredAuthPersona(page, persona);
  await page.getByRole('combobox', { name: 'Поиск адреса или места', exact: true }).fill('Synthetic Harbour');
  await page.getByRole('option').filter({ hasText: 'Synthetic Harbour Hotel' }).click();
  await page.getByRole('button', { name: 'Открыть задачу', exact: true }).click();
  await page.getByRole('button', { name: 'Анализировать', exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/, { timeout: 60_000 });
  await expect(page.getByTestId('ai-success')).toBeVisible();
  const draft = 'GUEST06 несохранённое уточнение: транспорт и подъезд';
  const input = page.getByRole('textbox', { name: 'Провести целевой анализ', exact: true });
  await input.fill(draft);
  const state = () => page.evaluate(() => ({
    selection: sessionStorage.getItem('geoai:point-to-object:selection:v3'),
    draft: sessionStorage.getItem('geoai:point-to-object:analysis-draft:v1'),
    analysis: sessionStorage.getItem('geoai:point-to-object:analysis:v8'),
    question: sessionStorage.getItem('geoai:point-to-object:question:v2'),
    identity: localStorage.getItem('geoai:point-to-object:browser-identity:v1')
  }));
  const before = await state();
  expect(before.identity).toBe("demo:demo-user-geoai");
  expect(before.draft).toContain(draft);
  expect(before.selection).not.toBeNull();
  const count = () => apiCalls.filter(call => call.path.endsWith('/ai')).map(call => call.method);
  expect(count()).toEqual(['GET', 'POST']);
  await page.getByRole('link', { name: 'Вернуться к карте', exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object$/);
  await page.getByRole('button', { name: 'Открыть задачу', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Что вы хотите узнать?', exact: true })).toBeVisible();
  const afterMap = await state();
  expect(afterMap.selection).not.toBeNull();
  expect(JSON.parse(afterMap.selection!).clickedAt).toBe(JSON.parse(before.selection!).clickedAt);
  expect(afterMap.draft).toBe(before.draft);
  expect(afterMap.question).toBe(before.question);
  await page.screenshot({ path: testInfo.outputPath('guest-map-after-back-430-ru.png') });
  await page.goBack();
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
  await expect(page.getByTestId('ai-success')).toBeVisible();
  await expect(input).toHaveValue(draft);
  expect(count()).toEqual(['GET', 'POST']);
  await page.reload();
  await expect(page.getByTestId('ai-success')).toBeVisible();
  await expect(input).toHaveValue(draft);
  expect(count()).toEqual(['GET', 'POST']);
  await page.goto('/prototype/point-to-object/analysis');
  await expect(page.getByTestId('ai-success')).toBeVisible();
  await expect(input).toHaveValue(draft);
  expect(count()).toEqual(['GET', 'POST']);
  const final = await state();
  expect(final.identity).toBe("demo:demo-user-geoai");
  expect(final.draft).toBe(before.draft);
  await page.screenshot({ path: testInfo.outputPath('guest-analysis-restored-430-ru.png'), fullPage: true });
  console.log(JSON.stringify({ result: 'PASS', viewport: '430x932', locale: 'ru', authPersona: persona, aiRequests: count(), selectionRetainedAfterMap: true, draftRecoveredAfterBrowserBack: true, reloadAndDirectEntryRecovered: true }));
});

test("current Standard renders its structured criteria review and restores it without another AI request", async ({ page }) => {
  const { apiCalls, unexpectedExternal } = await installAnalysisRoutes(page);
  await page.route("**/api/prototype/point-to-object/ai", async (route) => {
    if (route.request().method() === "GET") return json(route, { mode: "ready", challenge: "A".repeat(43) });
    await json(route, syntheticCurrentResponse(route.request().postDataJSON()));
  });
  await seedSelection(page);

  await signInDemo(page, "/prototype/point-to-object/analysis");
  const review = page.getByTestId("analysis-depth-review");
  await expect(review).toBeVisible();
  await expect(review).toHaveAttribute("data-depth", "standard");
  await expect(review.getByRole("heading", { name: "Decision criteria review" })).toBeVisible();
  await expect(review.getByText("Retain the existing-use path", { exact: true })).toBeVisible();
  await expect(review.getByText("Official permitted use", { exact: true })).toBeVisible();
  await expect(review.getByRole("heading", { name: "Confirm the official use", exact: true })).toBeVisible();
  await expect.poll(() => apiCalls.filter((call) => call.path.endsWith("/ai") && call.method === "POST").length).toBe(1);

  await page.reload();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  expect(apiCalls.filter((call) => call.path.endsWith("/ai") && call.method === "POST")).toHaveLength(1);
  expect(unexpectedExternal).toEqual([]);
});

test("a stored role-less V9 receipt reopens unchanged without being relabelled from the current profile", async ({ page }) => {
  const { apiCalls, unexpectedExternal } = await installAnalysisRoutes(page);
  const historical = syntheticV9StandardResponse();
  const stored = JSON.stringify({ selectionFingerprint: selectionFingerprint(), analysis: historical });
  await page.addInitScript(({ selected, raw }) => {
    sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(selected));
    sessionStorage.setItem("geoai:point-to-object:analysis:v8", raw);
  }, { selected: selection, raw: stored });
  await signInDemo(page, "/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-role", "unknown");
  expect(await page.evaluate(() => sessionStorage.getItem("geoai:point-to-object:analysis:v8"))).toBe(stored);
  expect(pointObjectCalls(apiCalls)).toEqual([]);
  expect(unexpectedExternal).toEqual([]);
});

test("V6 renders useful GeoContext and linked-source facts in EN/RU and restores each locale without automatic calls", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { apiCalls, unexpectedExternal } = await installAnalysisRoutes(page);
  await seedSelection(page);

  await signInDemo(page, "/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  const dashboard = page.getByTestId("role-decision-cards");
  await expect(dashboard).toBeVisible();
  await expect(dashboard).toHaveAttribute("data-goal", "development_screening");
  await expect(dashboard).toHaveAttribute("data-depth", "standard");
  const completedModules = ["surroundings", "buildings", "access", "risks", "coverage", "validation"];
  await expect.poll(() => dashboard.locator("[data-module]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-module")))).toEqual(completedModules);
  await page.getByTestId("infrastructure-cards").locator("summary").first().click();
  await expect(page.getByTestId("infrastructure-cards").locator("[data-infrastructure]")).toHaveCount(7);
  await expect(page.locator('[data-infrastructure="transport"]')).toContainText("120 m");
  await expect(page.locator('[data-infrastructure="transport"]')).toContainText("not travel time");
  await expect(page.locator('[data-infrastructure="tourism"]')).toContainText("2");
  await expect(page.locator('[data-infrastructure="health"]')).toContainText("No matching feature was returned in this sample.");
  await expect(page.getByTestId("infrastructure-cards").getByText("Not returned in sample", { exact: true })).toHaveCount(0);
  await page.getByTestId("role-decision-cards").screenshot({ path: testInfo.outputPath("decision-cards-1440.png") });
  await page.setViewportSize({ width: 393, height: 852 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId("role-decision-cards").screenshot({ path: testInfo.outputPath("decision-cards-393.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  const beforeLocalInteractions = apiCalls.length;
  // Draft controls must not relabel or recompose the completed receipt.
  await page.getByRole("button", { name: "Due diligence", exact: true }).click();
  await page.getByRole("button", { name: "Deep", exact: true }).click();
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-draft-depth", "deep");
  await expect(dashboard).toHaveAttribute("data-goal", "development_screening");
  await expect(dashboard).toHaveAttribute("data-depth", "standard");
  await expect.poll(() => dashboard.locator("[data-module]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-module")))).toEqual(completedModules);
  await dashboard.locator('[data-category="hospitality"]').click();
  await expect(dashboard.locator('[data-category="hospitality"]')).toHaveAttribute("aria-pressed", "true");
  await expect(dashboard.locator("#dashboard-category-detail")).toContainText("45 m");
  await dashboard.getByText("Data table & method", { exact: true }).click();
  await expect(dashboard.getByRole("table")).toContainText("Hospitality");
  await dashboard.getByText("Data table & method", { exact: true }).click();
  await page.getByRole("button", { name: "Development screening", exact: true }).click();
  await page.getByRole("button", { name: "Standard", exact: true }).click();
  expect(apiCalls).toHaveLength(beforeLocalInteractions);
  await page.getByText("Decision reasoning & context", { exact: true }).click();
  await page.getByText("Measurements & sample details", { exact: true }).click();
  await expect(page.getByText("Decision context", { exact: true })).toBeVisible();
  await expect(page.getByText("Nearest returned transit is 120 m and the nearest major road is 80 m away in a straight line.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Surroundings within 400 m" })).toBeVisible();
  await expect(page.getByTestId("analysis-geocontext").getByText("Commercial", { exact: true })).toBeVisible();
  await expect(page.getByTestId("analysis-geocontext").getByText("Hospitality", { exact: true })).toBeVisible();
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
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await expect(page.getByTestId("hub-count-analyse").getByTestId("hub-count-value")).toHaveText("1");
  await page.getByRole("button", { name: "Open result", exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  expect(apiCalls).toHaveLength(callsAfterEnglish);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  await expect(dashboard).toHaveAttribute("data-goal", "development_screening");
  await expect(dashboard).toHaveAttribute("data-depth", "standard");
  expect(apiCalls).toHaveLength(callsAfterEnglish);

  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(dashboard).toHaveAttribute("data-goal", "development_screening");
  await expect(dashboard).toHaveAttribute("data-depth", "standard");
  await expect.poll(() => dashboard.locator("[data-module]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-module")))).toEqual(completedModules);
  await expect(page.locator('[data-infrastructure="transport"]')).toContainText("120 м");
  await expect(page.locator('[data-infrastructure="health"]')).toContainText("Совпадающие объекты не вернулись в этой выборке.");
  expect(apiCalls).toHaveLength(callsAfterEnglish);
  await page.getByRole("button", { name: "Обновить на русском", exact: true }).click();
  await expect.poll(() => apiCalls.filter((call) => call.path.endsWith("/ai") && call.method === "POST").map((call) => call.body?.locale)).toEqual(["en", "ru"]);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { name: "Продолжить ограниченный скрининг объекта" })).toBeVisible();
  await page.getByText("Обоснование и контекст решения", { exact: true }).click();
  await page.getByText("Измерения и состав выборки", { exact: true }).click();
  await expect(page.getByText("Контекст решения", { exact: true })).toBeVisible();
  await expect(page.getByText("Ближайший найденный транспорт — 120 м, магистраль — 80 м по прямой.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Окружение в радиусе 400 м" })).toBeVisible();
  await expect(page.getByTestId("analysis-geocontext").getByText("Деловые объекты", { exact: true })).toBeVisible();
  await expect(page.getByTestId("analysis-geocontext").getByText("Гостиницы", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Геоконтекст" }).locator("..")).toContainText("Wikidata указывает 321,4 м; значение расходится с OpenStreetMap и не выбирается автоматически.");
  await expectNoVisibleResolverBoilerplate(page);
  await page.screenshot({ path: testInfo.outputPath("v6-analysis-ru.png"), fullPage: true });

  const callsAfterRussian = apiCalls.length;
  await page.reload();
  await expect(page.getByRole("heading", { name: "Продолжить ограниченный скрининг объекта" })).toBeVisible();
  await expect(dashboard).toHaveAttribute("data-goal", "development_screening");
  await expect(dashboard).toHaveAttribute("data-depth", "standard");
  expect(apiCalls).toHaveLength(callsAfterRussian);
  expect(pointObjectCalls(apiCalls).filter((call) => !call.path.endsWith("/ai")).map((call) => [call.method, call.path]))
    .toEqual([["POST", "/api/prototype/point-to-object/context"]]);
  expect(unexpectedExternal).toEqual([]);
});

test("a rendered tile selection never promotes a nearest POI into the requested exact identity", async ({ page }) => {
  const { apiCalls, unexpectedExternal } = await installAnalysisRoutes(page);
  const tileSelection = { ...selection, object: { ...selection.object, name: "Selected building footprint", sourceFeatureId: "18290731" },
    resolvedObject: { ...selection.resolvedObject, evidenceReceipt: publicReceipt("en", null) } };
  await page.addInitScript((value) => sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(value)), tileSelection);
  await page.route("**/api/prototype/point-to-object/ai", async (route) => {
    if (route.request().method() === "GET") return json(route, { mode: "ready", challenge: "A".repeat(43) });
    const response = syntheticCurrentResponse(route.request().postDataJSON());
    response.subject = { ...response.subject, name: "Synthetic nearby fountain", sourceFeatureId: "node/91099", coordinateAssociation: "reverse_nearest_indexed_object_not_point_in_polygon", resultCentroidDistanceM: 63 };
    await json(route, response);
  });
  await signInDemo(page, "/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Selected building footprint");
  await expect(page.getByText(/Nearest mapped context.*63/)).toBeVisible();
  await expect(page.getByText("Exact mapped object", { exact: true })).toHaveCount(0);
  expect(apiCalls.find(call => call.method === "POST")?.body?.expectedSourceFeatureId).toBeNull();
  await expect.poll(() => savedAnalyseArtifactCount(page)).toBe(1);
  const saved = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(item => item.startsWith("geoai:point-to-object:projects:v1:"));
    const project = JSON.parse(localStorage.getItem(key!)!).projects[0];
    return { name: project.name, artifact: project.artifacts[0] };
  });
  expect(saved.name).not.toContain("fountain");
  expect(saved.artifact.label).toBe("Selected building footprint");
  // The selected name is presentation metadata; the original provider receipt
  // and its nearby-object evidence must remain unmodified and hash-verifiable.
  expect(saved.artifact.payload.analysis.subject.name).toBe("Synthetic nearby fountain");
  const callsBeforeReopen = apiCalls.length;
  await page.goto("/projects");
  await expect(page.getByTestId("saved-result-card")).toContainText("Selected building footprint");
  await page.getByRole("button", { name: "Open result", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Selected building footprint");
  expect(apiCalls).toHaveLength(callsBeforeReopen);
  expect(unexpectedExternal).toEqual([]);
});

test("a legacy exact-identity mismatch stays immutable and displays its warning without a provider call", async ({ page }) => {
  const { apiCalls } = await installAnalysisRoutes(page);
  const tileSelection = { ...selection, object: { ...selection.object, name: "Selected building footprint", sourceFeatureId: "18290731" } };
  const legacy = syntheticLegacyV5Response();
  const stored = JSON.stringify({ selectionFingerprint: selectionFingerprint(), analysis: legacy });
  await page.addInitScript(({ value, raw }) => {
    sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(value));
    sessionStorage.setItem("geoai:point-to-object:analysis:v7", raw);
  }, { value: tileSelection, raw: stored });
  await signInDemo(page, "/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByText(/This saved report labelled a nearby object as exact/)).toBeVisible();
  await expect(page.getByText("Exact mapped object", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("geoai:point-to-object:analysis:v7"))).toBe(stored);
  expect(pointObjectCalls(apiCalls)).toEqual([]);
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

  await signInDemo(page, "/prototype/point-to-object/analysis");
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

test("Saved Analyse reopens RU from EN Projects and EN from RU Projects without implicit provider calls", async ({ page }) => {
  const { apiCalls, unexpectedExternal } = await installAnalysisRoutes(page);
  await seedSelection(page);

  await signInDemo(page, "/prototype/point-to-object/analysis");
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  await expect.poll(() => savedAnalyseArtifactCount(page)).toBe(1);
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  expect(apiCalls.filter((call) => call.method === "POST")).toHaveLength(1);
  await page.getByRole("button", { name: "Обновить на русском", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Продолжить ограниченный скрининг объекта" })).toBeVisible();
  await expect.poll(() => savedAnalyseArtifactCount(page)).toBe(2);

  const callsBeforeReopen = pointObjectCalls(apiCalls).length;
  await page.goto("/projects?view=spatial");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await page.getByRole("button", { name: "Open result", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Продолжить ограниченный скрининг объекта" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  expect(pointObjectCalls(apiCalls)).toHaveLength(callsBeforeReopen);
  await expect.poll(() => savedAnalyseArtifactCount(page)).toBe(2);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Продолжить ограниченный скрининг объекта" })).toBeVisible();
  expect(pointObjectCalls(apiCalls)).toHaveLength(callsBeforeReopen);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Центр проектов" })).toBeVisible();
  await page.getByRole("button", { name: "Открыть результат", exact: true }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(pointObjectCalls(apiCalls)).toHaveLength(callsBeforeReopen);
  await expect.poll(() => savedAnalyseArtifactCount(page)).toBe(2);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  expect(pointObjectCalls(apiCalls)).toHaveLength(callsBeforeReopen);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Project Hub", exact: true })).toBeVisible();
  expect(pointObjectCalls(apiCalls)).toHaveLength(callsBeforeReopen);
  expect(unexpectedExternal).toEqual([]);
});

test("auth-persona: public demo loads no Supabase SDK while protected login fails closed after its optional chunk fails", async ({ page }, testInfo) => {
  const persona = declaredAuthPersona(testInfo);
  const pageErrors: string[] = [];
  let sessionGets = 0;
  let subscriptionChunkRequests = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/auth/session", async (route) => {
    sessionGets += 1;
    await json(route, sessionMissingFixture);
  });
  await page.route(/\/_next\/static\/chunks\/.*supabase.*browser.*\.js(?:\?.*)?$/, async (route) => {
    subscriptionChunkRequests += 1;
    if (subscriptionChunkRequests === 1) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  if (persona === "demo_public") {
    await page.goto("/prototype/point-to-object");
    await expectDeclaredAuthPersona(page, persona);
    expect(subscriptionChunkRequests).toBe(0);
    expect(sessionGets).toBe(0);
    expect(pageErrors).toEqual([]);
    return;
  }

  await page.goto("/login?next=%2Fworkspace");
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open demo access" })).toHaveCount(0);
  await expect.poll(() => subscriptionChunkRequests).toBeGreaterThanOrEqual(1);
  await expect.poll(() => sessionGets).toBeGreaterThanOrEqual(2);
  await expect(page).toHaveURL(/\/login\?/);
  expect(await page.evaluate(() => localStorage.getItem("geoai-mock-demo-session-v1"))).toBeNull();
  expect(pageErrors).toEqual([]);

  const protectedMutation = await page.request.post("/api/projects", { data: { name: "Anonymous boundary probe" } });
  expect(protectedMutation.status()).toBe(403);
  const denial = await protectedMutation.json() as { ok?: boolean; project?: unknown };
  expect(denial).toMatchObject({ ok: false });
  expect(denial).not.toHaveProperty("project");
});

test("Projects preserves bytes and permits explicit retry when integrity hashing is temporarily unavailable", async ({ page }) => {
  const { apiCalls, unexpectedExternal } = await installAnalysisRoutes(page);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await seedSelection(page);

  await signInDemo(page, "/prototype/point-to-object/analysis");
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  await expect.poll(() => savedAnalyseArtifactCount(page)).toBe(1);
  await page.goto("/projects?view=spatial");
  await page.getByRole("button", { name: "ru", exact: true }).click();
  const before = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    if (!key) throw new Error("Expected a saved project namespace.");
    const target = window as typeof window & { __geoAiUnhandled?: string[]; __geoAiOriginalDigest?: SubtleCrypto["digest"] };
    target.__geoAiUnhandled = [];
    window.addEventListener("unhandledrejection", (event) => target.__geoAiUnhandled?.push(String(event.reason)));
    const original = crypto.subtle.digest.bind(crypto.subtle);
    target.__geoAiOriginalDigest = original;
    let failOnce = true;
    Object.defineProperty(crypto.subtle, "digest", {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto["digest"]>) => {
        if (failOnce) {
          failOnce = false;
          throw new DOMException("Synthetic digest unavailable", "OperationError");
        }
        return original(...args);
      }
    });
    return { key, raw: localStorage.getItem(key), locale: document.documentElement.lang };
  });
  const callsBeforeReopen = pointObjectCalls(apiCalls).length;

  await page.getByRole("button", { name: "Открыть результат", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\?view=spatial$/);
  await expect(page.locator("main").getByRole("alert")).toHaveText("Проверка целостности временно недоступна. Сохранённые данные не изменены; попробуйте открыть ещё раз.");
  expect(await page.evaluate((key) => localStorage.getItem(key), before.key)).toBe(before.raw);
  await expect(page.locator("html")).toHaveAttribute("lang", before.locale);
  expect(pointObjectCalls(apiCalls)).toHaveLength(callsBeforeReopen);
  expect(pageErrors).toEqual([]);
  expect(await page.evaluate(() => (window as typeof window & { __geoAiUnhandled?: string[] }).__geoAiUnhandled ?? [])).toEqual([]);

  await page.getByRole("button", { name: "Открыть результат", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Continue bounded object screening" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(pointObjectCalls(apiCalls)).toHaveLength(callsBeforeReopen);
  await expect.poll(() => savedAnalyseArtifactCount(page)).toBe(1);
  expect(pageErrors).toEqual([]);
  expect(unexpectedExternal).toEqual([]);
});
