import { expect, test, type Page, type Route } from "@playwright/test";
import { sprint10AnalysisResponse, sprint10Selection } from "./helpers/sprint10-analysis-fixture";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

test.beforeEach(async ({ page }, testInfo) => {
  await installLoopbackBrowserHarness(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
});

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

type ProvenanceContext = {
  role: "developer" | "consultant_broker";
  scenario: "b2b_redevelopment_selected_aoi" | "b2b_hotel_development";
};

function findSession(context: ProvenanceContext, analysisTargetSourceFeatureId: string | null = "way/91010") {
  const candidate = {
    sourceFeatureId: "way/91010",
    sourceElementType: "way",
    sourceElementId: "91010",
    label: "Sprint 10 Hotel",
    name: "Sprint 10 Hotel",
    longitude: 55.27,
    latitude: 25.2,
    group: "construction",
    matchedTag: { key: "building", value: "hotel" },
    mappedBuildingLevels: 20,
    observedTags: { building: "hotel", name: "Sprint 10 Hotel" },
    evidenceClass: "observed_in_open_map_source"
  };
  return {
    version: 1,
    marketKey: "dubai",
    locale: "en",
    audience: "b2b",
    role: context.role,
    scenario: context.scenario,
    group: "construction",
    mappedMinimumLevels: "",
    mappedMaximumLevels: "",
    result: {
      protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",
      mode: "results",
      criteria: {
        marketKey: "dubai",
        locale: "en",
        bounds: [55.26, 25.19, 55.28, 25.21],
        group: "construction",
        mappedMinimumLevels: null,
        mappedMaximumLevels: null,
        limit: 12
      },
      candidates: [candidate],
      ordering: "source_identity_ascending_not_ranked",
      coverage: {
        kind: "bounded_open_map_sample",
        approximateAreaSqKm: 4.47,
        upstreamElementCount: 1,
        normalizedCandidateCount: 1,
        returnedCandidateCount: 1,
        upstreamQueryLimit: 80,
        capReached: false,
        completeInventory: false,
        mappedLevelsPolicy: "not_requested"
      },
      source: {
        name: "OpenStreetMap",
        service: "Overpass API",
        sourceResponseHash: "7".repeat(64),
        observedAt: null,
        acquiredAt: "2026-09-18T12:00:00.000Z",
        freshness: "runtime_response_feature_time_unavailable",
        licenceId: "ODbL-1.0",
        attribution: "© OpenStreetMap contributors",
        licenceUrl: "https://www.openstreetmap.org/copyright",
        usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",
        officialStatus: "open_context_not_official",
        runtimeNetworkUsed: true,
        persistenceUsed: false
      },
      limitations: ["Deterministic provenance fixture."],
      caveat
    },
    shortlist: [],
    comparisonOpen: false,
    analysisTargetSourceFeatureId,
    updatedAt: "2026-09-18T12:00:00.000Z"
  };
}

function responseFor(body: Record<string, unknown>, sequence: number) {
  const base = sprint10AnalysisResponse({
    depth: body.depth as "quick" | "standard" | "deep",
    goal: body.goal as "object_profile" | "development_screening" | "redevelopment" | "due_diligence" | "custom",
    perspective: body.perspective as "developer" | "investor" | "asset_owner",
    horizon: body.horizon as "current" | "one_to_three_years" | "long_term",
    question: body.question as string | null,
    locale: body.locale as "en" | "ru"
  }, sequence);
  return {
    ...base,
    request: {
      role: body.role,
      scenario: body.scenario,
      ...base.request
    },
    telemetry: {
      ...base.telemetry,
      promptVersion: "POINT_OBJECT_AI_PROMPT_V10_2026_09_18"
    }
  };
}

async function prepare(page: Page, options: { holdPost?: boolean; selection?: unknown; session?: ReturnType<typeof findSession> } = {}) {
  const initialContext: ProvenanceContext = { role: "developer", scenario: "b2b_redevelopment_selected_aoi" };
  const posts: Array<Record<string, unknown>> = [];
  let challengeGets = 0;
  let releasePost: (() => void) | null = null;
  await page.addInitScript(({ selection, session }) => {
    sessionStorage.setItem("geoai:point-to-object:selection:v3", JSON.stringify(selection));
    sessionStorage.setItem("geoai:point-to-object:find:v1", JSON.stringify(session));
  }, { selection: options.selection ?? sprint10Selection, session: options.session ?? findSession(initialContext) });
  await page.route("**/api/auth/session", (route) => json(route, {
    isAuthenticated: false,
    sessionStatus: "session_missing",
    user: null
  }));
  await page.route("**/api/auth/logout", (route) => json(route, { ok: true }));
  await page.route("**/api/prototype/point-to-object/ai", async (route) => {
    if (route.request().method() === "GET") {
      challengeGets += 1;
      return json(route, { mode: "ready", challenge: "P".repeat(43) });
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    posts.push(body);
    if (options.holdPost) await new Promise<void>((resolve) => { releasePost = resolve; });
    await json(route, responseFor(body, posts.length));
  });
  return {
    posts,
    challengeGets: () => challengeGets,
    release: () => { releasePost?.(); releasePost = null; }
  };
}

test("S1 provenance submits and restores the exact validated role/scenario receipt without another analysis call", async ({ page }) => {
  const api = await prepare(page);
  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  expect(api.posts).toHaveLength(1);
  expect(api.posts[0]).toMatchObject({
    role: "developer",
    scenario: "b2b_redevelopment_selected_aoi",
    depth: "standard",
    consent: true
  });
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-role", "developer");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-scenario", "b2b_redevelopment_selected_aoi");
  const storedReceipt = await page.evaluate(() => {
    const envelope = JSON.parse(sessionStorage.getItem("geoai:point-to-object:analysis:v8") ?? "null");
    return envelope?.analysis?.request ?? null;
  });
  expect(storedReceipt).toMatchObject({
    role: "developer",
    scenario: "b2b_redevelopment_selected_aoi",
    depth: "standard",
    focused: false
  });

  await page.reload();
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-role", "developer");
  expect(api.posts).toHaveLength(1);
  expect(api.challengeGets()).toBe(1);
});

test("S1 provenance does not bind a saved null Find target to an unresolved free point", async ({ page }) => {
  const freePointSelection = {
    ...sprint10Selection,
    object: {
      ...sprint10Selection.object,
      name: null,
      featureClass: "selected_location",
      sourceFeatureId: null,
      geometry: { type: "Point", coordinates: [55.27, 25.2] }
    },
    resolvedObject: null
  };
  const api = await prepare(page, {
    selection: freePointSelection,
    session: findSession({ role: "consultant_broker", scenario: "b2b_hotel_development" }, null)
  });

  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  expect(api.posts).toHaveLength(1);
  expect(api.posts[0]).toMatchObject({
    role: "developer",
    scenario: "unspecified",
    goal: "development_screening",
    horizon: "current"
  });
});

test("S1 provenance ignores a valid Find target that differs from the selected object", async ({ page }) => {
  const mismatchedSelection = {
    ...sprint10Selection,
    object: { ...sprint10Selection.object, sourceFeatureId: "way/91011" },
    resolvedObject: { ...sprint10Selection.resolvedObject, sourceFeatureId: "way/91011" }
  };
  const api = await prepare(page, {
    selection: mismatchedSelection,
    session: findSession({ role: "consultant_broker", scenario: "b2b_hotel_development" })
  });

  await page.goto("/prototype/point-to-object/analysis");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  expect(api.posts).toHaveLength(1);
  expect(api.posts[0]).toMatchObject({
    role: "developer",
    scenario: "unspecified",
    goal: "development_screening",
    horizon: "current"
  });
});

test("S1 provenance discards an in-flight result after the validated role/scenario context changes", async ({ page }) => {
  const api = await prepare(page, { holdPost: true });
  await page.goto("/prototype/point-to-object/analysis");
  await expect.poll(() => api.posts.length).toBe(1);
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-in-flight-role", "developer");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-in-flight-scenario", "b2b_redevelopment_selected_aoi");

  await page.evaluate((session) => {
    sessionStorage.setItem("geoai:point-to-object:find:v1", JSON.stringify(session));
  }, findSession({ role: "consultant_broker", scenario: "b2b_hotel_development" }));
  api.release();

  await expect(page.locator("main").getByRole("alert").filter({ hasText: /^Please try again shortly\.$/ })).toBeVisible();
  await expect(page.getByTestId("ai-success")).toHaveCount(0);
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-role", "unknown");
  expect(api.posts[0]).toMatchObject({ role: "developer", scenario: "b2b_redevelopment_selected_aoi" });
  expect(await page.evaluate(() => sessionStorage.getItem("geoai:point-to-object:analysis:v8"))).toBeNull();
});
