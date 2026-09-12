import { expect, test, type Page, type Route } from "@playwright/test";
import { conceptTemplate, generateConceptMassingAlternatives, validateRedevelopmentProgram } from "../../src/lib/prototype/point-to-object-create";
import { POINT_OBJECT_CREATE_RESULT_CAVEAT } from "../../src/lib/prototype/point-to-object-create-result";
import { installLocalWebKitHttpCsp } from "./helpers/local-webkit-csp";

test.beforeEach(async ({ page, browserName }, testInfo) => {
  await installLocalWebKitHttpCsp(page, browserName, testInfo.project.use.baseURL);
});

const sha256 = "a".repeat(64);
const acquiredAt = "2026-09-04T09:00:00.000Z";
const contextRequests: Array<Record<string, unknown>> = [];
const findPostRequests: Array<Record<string, unknown>> = [];
const createPostRequests: Array<Record<string, unknown>> = [];
let areaContextPostRequests = 0;

const guestCreateAoiCoordinates = [[
  [55.278, 25.216], [55.281, 25.216], [55.281, 25.219],
  [55.278, 25.219], [55.278, 25.216]
]] as [number, number][][];
const guestCreateProgramValidation = validateRedevelopmentProgram(conceptTemplate("residential_mixed_use", "en"));
if (!guestCreateProgramValidation.ok) throw new Error(guestCreateProgramValidation.errors.join("; "));
const guestCreateAlternatives = generateConceptMassingAlternatives(
  guestCreateAoiCoordinates,
  guestCreateProgramValidation.value,
  "geoai-guest-create-e2e",
  "en"
);

const candidates = [
  candidate("way", "2001", "Marina Candidate One", 55.2704, 25.2054, 12),
  candidate("node", "2002", "Marina Candidate Two", 55.2712, 25.2060, 8),
  candidate("relation", "2003", "Marina Candidate Three", 55.2720, 25.2066, null)
];

function candidate(type: "node" | "way" | "relation", id: string, label: string, longitude: number, latitude: number, levels: number | null) {
  return {
    sourceFeatureId: `${type}/${id}`,
    sourceElementType: type,
    sourceElementId: id,
    label,
    name: label,
    longitude,
    latitude,
    group: "construction",
    matchedTag: { key: "landuse", value: "construction" },
    mappedBuildingLevels: levels,
    observedTags: { name: label, landuse: "construction", "addr:district": id === "2001" ? "Dubai Marina" : id === "2002" ? "Jumeirah Lakes Towers" : "Jumeirah Beach Residence" },
    evidenceClass: "observed_in_open_map_source"
  } as const;
}

function contextSubject(sourceFeatureId: string) {
  const label = sourceFeatureId === "way/1001"
    ? "Shangri-La exact search result"
    : candidates.find((item) => item.sourceFeatureId === sourceFeatureId)?.label ?? "Exact OSM object";
  const knownCandidate = candidates.find((item) => item.sourceFeatureId === sourceFeatureId);
  const center = sourceFeatureId === "way/1001"
    ? [55.271928, 25.208110]
    : sourceFeatureId === "way/9102"
      ? [55.2712, 25.2054]
      : knownCandidate
        ? [knownCandidate.longitude, knownCandidate.latitude]
        : [55.27, 25.2];
  const carriesCompleteFootprint = /^(?:way|relation)\//.test(sourceFeatureId);
  return {
    name: label,
    address: `${label}, Dubai, United Arab Emirates`,
    featureClass: "building",
    sourceFeatureId,
    geometryType: "Polygon",
    coordinateAssociation: "trusted_open_map_identity",
    resultCentroidDistanceM: 0,
    addressParts: { city: "Dubai", country: "United Arab Emirates" },
    tags: { building: "yes", "building:levels": "12" },
    metrics: null,
    displayGeometry: carriesCompleteFootprint ? {
      type: "Polygon",
      coordinates: [[
        [center[0] - 0.00008, center[1] - 0.00005],
        [center[0] + 0.00008, center[1] - 0.00005],
        [center[0] + 0.00008, center[1] + 0.00005],
        [center[0] - 0.00008, center[1] + 0.00005],
        [center[0] - 0.00008, center[1] - 0.00005]
      ]]
    } : null,
    geometryProvenance: carriesCompleteFootprint ? "confirmed_complete_footprint" : null,
    renderHeightM: null,
    renderMinHeightM: null,
    geoContext: {
      radiusM: 400,
      coverage: "available",
      sampleSize: 3,
      capReached: false,
      groups: [{ group: "commercial", count: 3, sharePct: 100, nearestDistanceM: 25 }],
      mappedBuildingCount: 3,
      mappedLevelsKnownCount: 2,
      medianMappedLevels: 10,
      nearestTransitM: 120,
      nearestMajorRoadM: 80,
      districtCharacter: {
        code: "commercial_business",
        confidence: "medium",
        ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
        driverGroups: ["commercial"]
      }
    }
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installOfflineRoutes(page: Page, options: { areaContextMode?: "success" | "rate" | "error"; emptyFind?: boolean } = {}) {
  const unexpectedExternal: string[] = [];
  await page.route(/^https:\/\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await json(route, {
        version: 8,
        name: "GeoAI offline E2E",
        sources: {
          openmaptiles: {
            type: "vector",
            tiles: ["https://tiles.openfreemap.org/e2e/{z}/{x}/{y}.pbf"],
            minzoom: 0,
            maxzoom: 14
          }
        },
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#e8edf0" } },
          { id: "building", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#c8d1d0" } }
        ]
      });
      return;
    }
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/e2e/")) {
      await route.fulfill({ status: 200, contentType: "application/x-protobuf", body: Buffer.alloc(0) });
      return;
    }
    unexpectedExternal.push(route.request().url());
    await route.abort("blockedbyclient");
  });

  await page.route("**/api/auth/session", (route) => json(route, { isAuthenticated: false, user: null }));
  await page.route("**/api/auth/logout", (route) => json(route, { ok: true }));
  await page.route("**/api/prototype/point-to-object/suggest", (route) => json(route, {
    protocol: "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1",
    mode: "results",
    provider: "Photon",
    results: [{
      id: "way/1001",
      label: "Shangri-La exact search result",
      secondaryLabel: "Sheikh Zayed Road, Dubai",
      longitude: 55.271928,
      latitude: 25.208110,
      category: "tourism",
      featureType: "hotel",
      boundingBox: [25.2078, 25.2084, 55.2716, 55.2722]
    }],
    source: {
      attribution: "© OpenStreetMap contributors",
      licenceId: "ODbL-1.0",
      licenceUrl: "https://www.openstreetmap.org/copyright",
      serviceUrl: "https://photon.komoot.io/",
      officialStatus: "open_context_not_official"
    }
  }));
  await page.route("**/api/prototype/point-to-object/context", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    contextRequests.push(body);
    const sourceFeatureId = typeof body.expectedSourceFeatureId === "string" ? body.expectedSourceFeatureId : "invalid/missing";
    await json(route, { mode: "resolved", subject: contextSubject(sourceFeatureId) });
  });
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>;
    findPostRequests.push(request);
    await json(route, {
      protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",
      mode: options.emptyFind ? "empty" : "results",
      criteria: request,
      candidates: options.emptyFind ? [] : candidates,
      ordering: "source_identity_ascending_not_ranked",
      coverage: {
        kind: "bounded_open_map_sample",
        approximateAreaSqKm: 1.25,
        upstreamElementCount: options.emptyFind ? 0 : 3,
        normalizedCandidateCount: options.emptyFind ? 0 : 3,
        returnedCandidateCount: options.emptyFind ? 0 : 3,
        upstreamQueryLimit: 80,
        capReached: false,
        completeInventory: false,
        mappedLevelsPolicy: "not_requested"
      },
      source: {
        name: "OpenStreetMap",
        service: "Overpass API",
        sourceResponseHash: sha256,
        observedAt: null,
        acquiredAt,
        freshness: "runtime_response_feature_time_unavailable",
        licenceId: "ODbL-1.0",
        attribution: "© OpenStreetMap contributors",
        licenceUrl: "https://www.openstreetmap.org/copyright",
        usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",
        officialStatus: "open_context_not_official",
        runtimeNetworkUsed: true,
        persistenceUsed: false
      },
      limitations: ["Bounded deterministic E2E sample."],
      caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    });
  });
  await page.route("**/api/prototype/point-to-object/area-context", (route) => {
    areaContextPostRequests += 1;
    if (options.areaContextMode === "rate") {
      return route.fulfill({ status: 429, contentType: "application/json", headers: { "Retry-After": "30" }, body: JSON.stringify({ mode: "unavailable", error: "rate limited" }) });
    }
    if (options.areaContextMode === "error") return json(route, { mode: "unavailable", error: "upstream unavailable" }, 502);
    const request = route.request().postDataJSON() as { marketKey: "dubai"; locale: "en" | "ru"; aoiCoordinates: [[number, number][]] };
    return json(route, {
      protocol: "POINT_TO_OBJECT_001_AREA_CONTEXT_V1",
      mode: "results",
      request,
      area: { areaSqM: 2_500, perimeterM: 200, centroid: { longitude: 55.27035, latitude: 25.20535 } },
      features: [
        { sourceFeatureId: "way/3001", longitude: 55.27025, latitude: 25.20525, label: "Mapped residence 1", group: "residential", mappedBuildingLevels: 6, observedTags: { building: "residential" }, inclusionMethod: "returned_center_inside_aoi" },
        { sourceFeatureId: "way/3002", longitude: 55.2704, latitude: 25.2054, label: "Mapped residence 2", group: "residential", mappedBuildingLevels: null, observedTags: { building: "residential" }, inclusionMethod: "returned_center_inside_aoi" }
      ],
      summary: { sampleSize: 2, namedFeatureCount: 2, mappedBuildingCount: 2, mappedLevelsKnownCount: 1, medianMappedLevels: 6, nearestTransitM: null, nearestMajorRoadM: null, groups: [{ group: "residential", count: 2, sharePct: 100 }] },
      coverage: { kind: "bounded_open_map_polygon_sample", inclusionMethod: "returned_center_inside_aoi", geometryCoverage: "centroid_proxy_not_complete_intersection", upstreamElementCount: 2, normalizedInsideCount: 2, returnedFeatureCount: 2, upstreamQueryLimit: 300, featureReturnLimit: 80, capReached: false, completeInventory: false },
      source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: sha256, observedAt: null, acquiredAt, licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
      limitations: ["Bounded deterministic E2E area sample."],
      caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    });
  });
  await page.route("**/api/prototype/point-to-object/create", async (route) => {
    if (route.request().method() === "GET") {
      await json(route, { mode: "ready", challenge: "A".repeat(43) });
      return;
    }
    createPostRequests.push(route.request().postDataJSON() as Record<string, unknown>);
    await json(route, {
      mode: "openai_concept",
      generatedAt: acquiredAt,
      promptVersion: "POINT_OBJECT_CREATE_PROMPT_V1",
      program: {
        schemaVersion: 1,
        templateId: "residential_mixed_use",
        title: "Residential mixed-use concept",
        summary: "A deterministic mixed-use concept for the selected area.",
        massingStyle: "courtyard",
        blockCount: 1,
        levelsMin: 6,
        levelsMax: 12,
        targetSiteCoveragePct: 38,
        openSpacePct: 35,
        setbackM: 8,
        useMix: [{ use: "residential", sharePct: 65 }, { use: "open_space", sharePct: 35 }],
        rationale: ["Deterministic offline E2E fixture."]
      },
      massing: {
        featureCollection: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            id: "concept-a-1",
            properties: { id: "concept-a-1", kind: "concept_massing", templateId: "residential_mixed_use", massingStyle: "courtyard", variantId: "A", volumeRole: "courtyard_wing", primaryBlock: true, use: "residential", levels: 8, heightM: 27.2, baseM: 0, label: "Option A block" },
            geometry: { type: "Polygon", coordinates: [[[55.2702, 25.2052], [55.2705, 25.2052], [55.2705, 25.2055], [55.2702, 25.2055], [55.2702, 25.2052]]] }
          }]
        },
        requestedBlockCount: 1,
        generatedBlockCount: 1,
        aoiAreaSqM: 2_500,
        generatedFootprintAreaSqM: 950,
        achievedSiteCoveragePct: 38,
        seed: "offline-e2e-a",
        generatedFeatureCount: 1,
        estimatedFloorAreaSqM: 7_600,
        minGeneratedLevels: 8,
        maxGeneratedLevels: 8,
        massingStyle: "courtyard",
        variantId: "A"
      },
      alternatives: [{
        id: "A",
        label: "Option A · Courtyard",
        massing: {
          featureCollection: {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              id: "concept-a-1",
              properties: { id: "concept-a-1", kind: "concept_massing", templateId: "residential_mixed_use", massingStyle: "courtyard", variantId: "A", volumeRole: "courtyard_wing", primaryBlock: true, use: "residential", levels: 8, heightM: 27.2, baseM: 0, label: "Option A block" },
              geometry: { type: "Polygon", coordinates: [[[55.2702, 25.2052], [55.2705, 25.2052], [55.2705, 25.2055], [55.2702, 25.2055], [55.2702, 25.2052]]] }
            }]
          },
          requestedBlockCount: 1,
          generatedBlockCount: 1,
          generatedFeatureCount: 1,
          aoiAreaSqM: 2_500,
          generatedFootprintAreaSqM: 950,
          estimatedFloorAreaSqM: 7_600,
          achievedSiteCoveragePct: 38,
          minGeneratedLevels: 8,
          maxGeneratedLevels: 8,
          massingStyle: "courtyard",
          variantId: "A",
          seed: "offline-e2e-a"
        }
      }, {
        id: "B",
        label: "Option B · Two bars",
        massing: {
          featureCollection: {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              id: "concept-b-1",
              properties: { id: "concept-b-1", kind: "concept_massing", templateId: "residential_mixed_use", massingStyle: "courtyard", variantId: "B", volumeRole: "courtyard_wing", primaryBlock: true, use: "residential", levels: 6, heightM: 20.4, baseM: 0, label: "Option B block 1" },
              geometry: { type: "Polygon", coordinates: [[[55.2702, 25.2052], [55.27035, 25.2052], [55.27035, 25.2055], [55.2702, 25.2055], [55.2702, 25.2052]]] }
            }]
          },
          requestedBlockCount: 1,
          generatedBlockCount: 1,
          generatedFeatureCount: 1,
          aoiAreaSqM: 2_500,
          generatedFootprintAreaSqM: 925,
          estimatedFloorAreaSqM: 8_100,
          achievedSiteCoveragePct: 37,
          minGeneratedLevels: 6,
          maxGeneratedLevels: 6,
          massingStyle: "courtyard",
          variantId: "B",
          seed: "offline-e2e-b"
        }
      }],
      telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
      caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    });
  });
  await page.route("**/api/prototype/point-to-object/ai", (route) => json(route, {
    mode: "unavailable",
    error: "Offline E2E intentionally stops before model generation.",
    retryable: false
  }, 503));

  return unexpectedExternal;
}

async function signInDemo(page: Page, nextPath: string) {
  const loginNextPath = nextPath.startsWith("/prototype/point-to-object") ? "/workspace" : nextPath;
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
  await expect(page.getByRole("link", { name: "Open demo profile" })).toBeVisible();
  await page.goto(nextPath);
}

async function expectFindDrawerGeometry(page: Page, checkMapAlignment = false) {
  const drawer = page.getByTestId("find-drawer");
  const footer = page.getByTestId("find-sticky-footer");
  const cta = page.getByTestId("find-search-cta");
  await expect(async () => {
    await expect(drawer).toBeVisible();
    await expect(footer).toBeVisible();
    await expect(cta).toBeVisible();
    const geometry = await drawer.evaluate((element) => {
      const scroll = element.querySelector<HTMLElement>('[data-testid="find-scroll-region"]');
      const localFooter = element.querySelector<HTMLElement>('[data-testid="find-sticky-footer"]');
      const localCta = element.querySelector<HTMLElement>('[data-testid="find-search-cta"]');
      if (!scroll || !localFooter || !localCta) throw new Error("Find drawer geometry targets are missing.");
      const drawerRect = element.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      const footerRect = localFooter.getBoundingClientRect();
      const ctaRect = localCta.getBoundingClientRect();
      const scrollOwners = [...element.querySelectorAll<HTMLElement>("*")].filter((candidate) => {
        const overflowY = getComputedStyle(candidate).overflowY;
        return candidate.getClientRects().length > 0 && (overflowY === "auto" || overflowY === "scroll");
      });
      const visibleTargets = [...element.querySelectorAll<HTMLElement>("button, select, input, summary")].filter((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });
      return {
        drawerBottom: drawerRect.bottom,
        scrollBottom: scrollRect.bottom,
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        ctaHeight: ctaRect.height,
        scrollOwnerCount: scrollOwners.length,
        smallestTargetHeight: Math.min(...visibleTargets.map((candidate) => candidate.getBoundingClientRect().height))
      };
    });
    expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.drawerBottom + 1);
    expect(geometry.scrollBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
    expect(geometry.scrollOwnerCount).toBe(1);
    expect(geometry.ctaHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.smallestTargetHeight).toBeGreaterThanOrEqual(44);
    if (checkMapAlignment) {
      const ctaBox = await cta.boundingBox();
      const dimensionButtonBox = await page.getByTestId("map-dimension-control").getByRole("button").first().boundingBox();
      expect(ctaBox).not.toBeNull();
      expect(dimensionButtonBox).not.toBeNull();
      expect(Math.abs((ctaBox?.y ?? 0) + (ctaBox?.height ?? 0) - (dimensionButtonBox?.y ?? 0) - (dimensionButtonBox?.height ?? 0))).toBeLessThanOrEqual(2);
    }
  }).toPass({ timeout: 5_000 });
}

test("SOURCE10 context quota ends resolving, preserves the question and retries only on demand", async ({ page }) => {
  const external = await installOfflineRoutes(page);
  let requests = 0;
  await page.route("**/api/prototype/point-to-object/context", async (route) => {
    requests += 1;
    if (requests === 1) return route.fulfill({ status: 429, contentType: "application/json", headers: { "Retry-After": "5" }, body: JSON.stringify({ mode: "unavailable", code: "APPLICATION_RATE_LIMITED", retryable: true }) });
    return route.fallback();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("button", { name: "Open task", exact: true }).click();
  await page.locator("#point-object-question").fill("Keep this redevelopment question");
  await page.getByRole("button", { name: "Show map", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill("Shangri");
  await expect(page.getByRole("option", { name: /Shangri-La exact search result/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  if (await page.getByRole("button", { name: "Open task", exact: true }).isVisible()) await page.getByRole("button", { name: "Open task", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Application request limit reached." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolving location…", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeDisabled();
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  await expect(retry).toBeDisabled();
  await expect(retry).toBeEnabled({ timeout: 8_000 });
  expect(requests).toBe(1);
  await retry.click();
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled();
  await expect(page.locator("#point-object-question")).toHaveValue("Keep this redevelopment question");
  expect(requests).toBe(2);
  const clickedAt = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null")?.clickedAt);
  await page.getByRole("button", { name: "Show map", exact: true }).click();
  await search.fill("Shangri again");
  await expect(page.getByRole("option", { name: /Shangri-La exact search result/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null")?.clickedAt)).not.toBe(clickedAt);
  await page.getByRole("button", { name: "Open task", exact: true }).click();
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled();
  expect(requests).toBe(2); // Validated same-object cache does not consume another route quota.
  expect(external).toEqual([]);
});

test("SOURCE10 Find preserves exact criteria through timeout, recovery and source cooldown", async ({ page }) => {
  const external = await installOfflineRoutes(page);
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) return json(route, { mode: "unavailable", code: "OVERPASS_TIMEOUT", retryable: true }, 504);
    if (requests.length === 3) return route.fulfill({ status: 429, contentType: "application/json", headers: { "Retry-After": "2" }, body: JSON.stringify({ mode: "unavailable", code: "OVERPASS_RATE_LIMITED", retryable: true }) });
    return route.fallback();
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInDemo(page, "/prototype/point-to-object");
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  const cta = page.getByTestId("find-search-cta");
  await expect(cta).toBeEnabled();
  await cta.click();
  await expect(page.getByTestId("find-sticky-footer")).toContainText("The source did not respond in time.");
  await expect(page.getByRole("combobox", { name: "Object type" })).toHaveValue("construction");
  await cta.click();
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  expect(requests[1]).toEqual(requests[0]);
  await cta.click();
  await expect(page.getByTestId("find-sticky-footer")).toContainText("The source limited requests.");
  await expect(cta).toBeDisabled();
  await expect(cta).toBeEnabled({ timeout: 8_000 });
  expect(requests).toHaveLength(3);
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  await cta.click();
  await expect(page.getByTestId("find-sticky-footer")).not.toContainText("The source limited requests.");
  expect(requests).toHaveLength(4);
  expect(requests[3]).toEqual(requests[0]);
  expect(external).toEqual([]);
});

test("Sprint06 J06 keeps unsent RU refinement separate on Back and restores it without another request", async ({ page }, testInfo) => {
  await installOfflineRoutes(page);
  const aiRequests = { challenge: 0, generation: 0 };
  await page.route("**/api/prototype/point-to-object/ai", (route) => route.request().method() === "GET"
    ? json(route, { mode: "ready", challenge: "offline-j06-challenge" })
    : json(route, { mode: "unavailable", error: "Offline J06 generation unavailable", retryable: false }, 503));
  page.on("request", (request) => {
    if (!new URL(request.url()).pathname.endsWith("/point-to-object/ai")) return;
    if (request.method() === "GET") aiRequests.challenge += 1;
    if (request.method() === "POST") aiRequests.generation += 1;
  });
  await page.setViewportSize({ width: 430, height: 932 });
  await signInDemo(page, "/prototype/point-to-object");
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await page.getByRole("tab", { name: "Поиск", exact: true }).click();
  await page.getByTestId("find-search-cta").click();
  const third = page.getByRole("listitem").filter({ hasText: "Marina Candidate Three" });
  await third.getByRole("button").first().click();
  const original = "Проверить окружение выбранного объекта QA06";
  const draft = "QA06 несохранённое уточнение: транспорт и подъезд";
  await page.getByLabel("Что вы хотите узнать?").fill(original);
  await page.getByRole("button", { name: "Анализировать", exact: true }).click();
  await expect(page).toHaveURL(/\/analysis$/);
  const composer = page.getByLabel("Провести целевой анализ", { exact: true });
  await expect.poll(() => ({ ...aiRequests })).toEqual({ challenge: 1, generation: 1 });
  await composer.fill(draft);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("geoai:point-to-object:question:v2"))).toBe(original);
  await page.getByRole("link", { name: "Вернуться к карте", exact: true }).click();
  await page.getByRole("button", { name: "Открыть задачу", exact: true }).click();
  await expect(page.getByLabel("Что вы хотите узнать?")).toHaveValue(original);
  await page.goBack();
  await expect(page).toHaveURL(/\/analysis$/);
  await expect(composer).toHaveValue(draft);
  expect(aiRequests).toEqual({ challenge: 1, generation: 1 });
  await page.screenshot({ path: testInfo.outputPath("j06-unsent-refinement-restored-430-ru.png") });
  await page.reload();
  await expect(composer).toHaveValue(draft);
  expect(aiRequests).toEqual({ challenge: 1, generation: 1 });
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByLabel("Run a focused analysis", { exact: true })).toHaveValue(original);
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(composer).toHaveValue(draft);
  expect(aiRequests).toEqual({ challenge: 1, generation: 1 });
});

test("Sprint06 half sheet fits the selected object inside the uncovered map", async ({ page }, testInfo) => {
  await installOfflineRoutes(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/prototype/point-to-object");
  await expect(page.getByText("Live map ready for object selection.")).toBeAttached();
  await page.getByRole("button", { name: "Open task at half height", exact: true }).click();
  await expect(page.getByTestId("mobile-workspace-shell")).toHaveAttribute("data-sheet", "half");
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill("Shangri");
  await page.getByRole("option", { name: /Shangri-La exact search result/ }).click();
  await expect(page.getByTestId("selected-object")).toHaveText("Shangri-La exact search result");
  await expect.poll(async () => page.getByTestId("live-map-canvas").evaluate((element) => {
    type Map = { project: (point: [number, number]) => { x: number; y: number }; isMoving: () => boolean };
    type Hook = { memoizedState: { current?: Partial<Map> } | null; next: Hook | null };
    type Fiber = { memoizedState?: Hook; return?: Fiber };
    const key = Object.getOwnPropertyNames(element).find((item) => item.startsWith("__reactFiber$"))!;
    let fiber: Fiber | undefined = (element as unknown as Record<string, Fiber>)[key];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const map = hook.memoizedState?.current;
        if (map && typeof map.project === "function" && typeof map.isMoving === "function") {
          const point = map.project([55.271928, 25.208110]);
          const box = element.getBoundingClientRect();
          const sheetTop = document.getElementById("workspace-task")!.getBoundingClientRect().top;
          return !map.isMoving() && point.y + box.top > 136 && point.y + box.top < sheetTop - 24 && point.x > 24 && point.x < box.width - 56;
        }
        hook = hook.next ?? undefined;
      }
      fiber = fiber.return;
    }
    return false;
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("half-sheet-selected-object-fit.png") });
});

test("actual MapLibre canvas fills its desktop map region", async ({ page }) => {
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/prototype/point-to-object");

  const host = page.getByTestId("live-map-canvas");
  await expect(host).toHaveCSS("position", "absolute");
  await expect.poll(async () => host.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(0);
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();

  const geometry = await host.evaluate((element) => {
    const region = element.parentElement;
    const canvas = element.querySelector<HTMLCanvasElement>("canvas.maplibregl-canvas");
    if (!region || !canvas) throw new Error("MapLibre geometry targets are missing.");
    const rect = (target: Element) => {
      const value = target.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    return {
      region: rect(region),
      host: rect(element),
      canvas: rect(canvas)
    };
  });

  expect(geometry.host.height).toBeGreaterThan(0);
  for (const target of [geometry.host, geometry.canvas]) {
    expect(Math.abs(target.x - geometry.region.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(target.y - geometry.region.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(target.width - geometry.region.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(target.height - geometry.region.height)).toBeLessThanOrEqual(1);
  }
  expect(unexpectedExternal).toEqual([]);
});

test("native select controls keep the full chevron inset mouse, touch and keyboard operable", async ({ page }) => {
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.goto("/prototype/point-to-object");

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    for (const locale of ["en", "ru"] as const) {
      await page.getByRole("button", { name: locale, exact: true }).click();
      if (viewport.width < 1024 && await page.getByTestId("mobile-workspace-shell").getAttribute("data-sheet") !== "peek") {
        await page.getByRole("button", { name: locale === "ru" ? "На карту" : "Show map", exact: true }).click();
      }
      const city = page.getByTestId("point-object-city-select");
      await city.selectOption("dubai");
      const cityBox = await city.boundingBox();
      expect(cityBox, `${viewport.width}px ${locale} city select must render`).not.toBeNull();
      await city.click({ position: { x: Math.max(1, (cityBox?.width ?? 1) - 4), y: (cityBox?.height ?? 1) / 2 } });
      await expect(city).toBeFocused();
      await city.press("Escape");
      await city.press("ArrowDown");
      await city.press("Enter");
      // Chrome's headless native menu does not expose its highlighted option to Playwright;
      // selectOption verifies the same native change event without replacing the real control.
      await city.selectOption("abu_dhabi");
      await expect(city).toHaveValue("abu_dhabi");

      const chevron = city.locator("xpath=following-sibling::*[1]");
      await expect(chevron).toHaveCSS("pointer-events", "none");
      const chevronWidth = await chevron.evaluate((element) => element.getBoundingClientRect().width);
      expect(chevronWidth).toBeGreaterThanOrEqual(24);
      expect(await city.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingRight))).toBeGreaterThanOrEqual(chevronWidth);
      expect(cityBox?.height, "The native select, not its decorative chevron, owns the 44px target").toBeGreaterThanOrEqual(44);

      await page.getByRole("tab", { name: locale === "ru" ? "Поиск" : "Find", exact: true }).click();
      for (const testId of [
        "point-object-find-role-select",
        "point-object-find-scenario-select",
        "point-object-find-group-select"
      ]) {
        if (viewport.width < 1024 && await page.getByTestId("mobile-workspace-shell").getAttribute("data-sheet") === "peek") {
          await page.getByRole("button", { name: locale === "ru" ? "Открыть задачу" : "Open task", exact: true }).click();
        }
        const control = page.getByTestId(testId);
        const box = await control.boundingBox();
        expect(box, `${viewport.width}px ${locale} ${testId} must render`).not.toBeNull();
        await control.click({ position: { x: Math.max(1, (box?.width ?? 1) - 4), y: (box?.height ?? 1) / 2 } });
        await expect(control).toBeFocused();
        await control.press("Escape");
      }
    }
  }

  await page.getByRole("button", { name: "en", exact: true }).click();
  await page.getByRole("tab", { name: "Analyse", exact: true }).click();
  await page.getByRole("button", { name: "Show map", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill("Shangri");
  await page.getByRole("option", { name: /Shangri-La exact search result/ }).click();
  await page.getByRole("button", { name: "Open task", exact: true }).click();
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
  await page.getByText("Analysis settings", { exact: true }).click();
  for (const testId of ["point-object-analysis-perspective-select", "point-object-analysis-horizon-select"]) {
    const control = page.getByTestId(testId);
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    await control.click({ position: { x: Math.max(1, (box?.width ?? 1) - 4), y: (box?.height ?? 1) / 2 } });
    await expect(control).toBeFocused();
    await control.press("Escape");
  }

  expect(unexpectedExternal).toEqual([]);
});

test("map-first layout keeps a compact desktop drawer across all modes and breakpoint boundaries", async ({ page }, testInfo) => {
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.goto("/prototype/point-to-object");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill("Shangri");
  await page.getByRole("option", { name: /Shangri-La exact search result/ }).click();
  await expect(page.getByTestId("selected-object")).toHaveText("Shangri-La exact search result");
  await expect(page.getByRole("link", { name: "Data sources" })).toHaveCount(0);
  await expect(page.getByText("Data & methodology", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Optional", { exact: true })).toHaveCount(0);

  for (const viewport of [
    { width: 1710, height: 877, drawerWidth: 430, overlay: false },
    { width: 1440, height: 720, drawerWidth: 430, overlay: false },
    { width: 1280, height: 900, drawerWidth: 430, overlay: false },
    { width: 1024, height: 768, drawerWidth: 430, overlay: false },
    { width: 1024, height: 1366, drawerWidth: 430, overlay: false },
    { width: 1023, height: 720, drawerWidth: 1023, overlay: true },
    { width: 720, height: 450, drawerWidth: 720, overlay: true },
    { width: 640, height: 450, drawerWidth: 640, overlay: true },
    { width: 639, height: 450, drawerWidth: 639, overlay: true },
    { width: 834, height: 1112, drawerWidth: 834, overlay: true },
    { width: 390, height: 844, drawerWidth: 390, overlay: true }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const mode of ["Analyse", "Find", "Create"]) {
      const modeTab = page.getByRole("tab", { name: mode, exact: true });
      await modeTab.click();
      await expect(modeTab).toHaveAttribute("aria-selected", "true");
      await expect(modeTab).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect.poll(async () => {
        const drawer = await page.locator("main aside").boundingBox();
        return Math.abs((drawer?.width ?? 0) - viewport.drawerWidth);
      }, { message: `${mode}: drawer width at ${viewport.width}x${viewport.height}` }).toBeLessThanOrEqual(1);
      const geometry = await page.locator("main aside").evaluate((aside) => {
        const map = aside.previousElementSibling;
        if (!map) throw new Error("Map must precede the drawer.");
        const drawerRect = aside.getBoundingClientRect();
        const mapRect = map.getBoundingClientRect();
        return {
          drawerLeft: drawerRect.left, drawerTop: drawerRect.top, drawerRight: drawerRect.right,
          mapLeft: mapRect.left, mapTop: mapRect.top, mapRight: mapRect.right,
          mapBottom: mapRect.bottom, mapWidth: mapRect.width,
          pageWidth: document.documentElement.scrollWidth
        };
      });
      expect(geometry.pageWidth).toBeLessThanOrEqual(viewport.width);
      expect(Math.abs(geometry.drawerRight - viewport.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.mapLeft)).toBeLessThanOrEqual(1);
      if (viewport.overlay) {
        await expect(page.getByTestId("mobile-workspace-shell")).toHaveAttribute("data-sheet", "full");
        expect(Math.abs(geometry.mapWidth - viewport.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.drawerLeft)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.drawerTop - geometry.mapTop)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.mapBottom - viewport.height)).toBeLessThanOrEqual(1);
        await page.getByRole("button", { name: "Show map", exact: true }).click();
        await expect(page.getByTestId("mobile-workspace-shell")).toHaveAttribute("data-sheet", "peek");
        const uncoveredMapHeight = await page.locator("main aside").evaluate((aside) => aside.previousElementSibling?.getBoundingClientRect().height);
        expect(uncoveredMapHeight).toBeCloseTo(geometry.mapBottom - geometry.mapTop, 0);
        await page.getByRole("button", { name: "Open task", exact: true }).click();
      } else {
        expect(Math.abs(geometry.mapWidth - (viewport.width - viewport.drawerWidth))).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.drawerLeft - geometry.mapRight)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.drawerTop - geometry.mapTop)).toBeLessThanOrEqual(1);
      }
      if (viewport.width === 1710) {
        if (mode === "Analyse") {
          const composer = page.getByTestId("analyse-composer");
          const selectedObject = page.getByTestId("selected-object");
          const textarea = composer.getByRole("textbox", { name: "What would you like to know?" });
          const analyze = composer.getByRole("button", { name: "Analyze", exact: true });
          await expect(selectedObject).toBeVisible();
          await expect(composer).toBeVisible();
          await expect(analyze).toBeVisible();
          const textareaBox = await textarea.boundingBox();
          const analyzeBox = await analyze.boundingBox();
          const dimensionButtonBox = await page.getByTestId("map-dimension-control").getByRole("button").first().boundingBox();
          const analyzeGeometry = await composer.evaluate((element) => {
            const wrapper = element.parentElement;
            const drawer = wrapper?.parentElement;
            const rect = (target: Element | null | undefined) => target?.getBoundingClientRect().toJSON() ?? null;
            return {
              composer: rect(element),
              wrapper: rect(wrapper),
              drawer: rect(drawer),
              composerMarginTop: getComputedStyle(element).marginTop,
              wrapperFlex: wrapper ? getComputedStyle(wrapper).flex : null,
              drawerDisplay: drawer ? getComputedStyle(drawer).display : null
            };
          });
          expect(textareaBox?.height).toBeGreaterThanOrEqual(120);
          expect(textareaBox?.height).toBeLessThanOrEqual(160);
          expect(analyzeBox).not.toBeNull();
          expect(dimensionButtonBox).not.toBeNull();
          expect(
            Math.abs((analyzeBox?.y ?? 0) + (analyzeBox?.height ?? 0) - (dimensionButtonBox?.y ?? 0) - (dimensionButtonBox?.height ?? 0)),
            `Analyse composer must share the map control horizon: ${JSON.stringify(analyzeGeometry)}`
          ).toBeLessThanOrEqual(2);
        }
        await page.screenshot({ path: testInfo.outputPath(`desktop-drawer-${mode.toLowerCase()}.png`) });
      }
      if ((viewport.width === 720 || viewport.width === 640) && mode === "Analyse") {
        await page.locator("#workspace-task-content").evaluate((element) => { element.scrollTop = 0; });
        const selectedObject = page.getByTestId("selected-object");
        const analyze = page.getByTestId("analyse-composer").getByRole("button", { name: "Analyze", exact: true });
        await expect(selectedObject).toBeVisible();
        const selectedBox = await selectedObject.boundingBox();
        expect(selectedBox).not.toBeNull();
        expect((selectedBox?.y ?? 0)).toBeGreaterThanOrEqual(64);
        expect((selectedBox?.y ?? viewport.height) + (selectedBox?.height ?? 0)).toBeLessThanOrEqual(viewport.height + 1);
        await analyze.scrollIntoViewIfNeeded();
        await expect(analyze).toBeVisible();
        const analyzeBox = await analyze.boundingBox();
        expect(analyzeBox).not.toBeNull();
        expect((analyzeBox?.y ?? viewport.height) + (analyzeBox?.height ?? 0)).toBeLessThanOrEqual(viewport.height + 1);
      }
    }
  }
  expect(unexpectedExternal).toEqual([]);
});

test("V5.1 keeps exact identity and the complete Find comparison flow coherent offline", async ({ page }, testInfo) => {
  contextRequests.length = 0;
  findPostRequests.length = 0;
  createPostRequests.length = 0;
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInDemo(page, "/prototype/point-to-object");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill("Shangri");
  await expect(page.getByRole("option", { name: /Shangri-La exact search result/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.getByText("Exact mapped object")).toBeVisible();
  await expect(page.getByTestId("selected-object")).toHaveText("Shangri-La exact search result");
  await expect(page.getByText("Shangri-La exact search result, Dubai, United Arab Emirates")).toBeVisible();
  await expect(page.getByText("Mapped levels · 12")).toBeVisible();
  await expect(page.getByText("way/1001", { exact: true })).toHaveCount(0);
  expect(contextRequests.at(-1)?.expectedSourceFeatureId).toBe("way/1001");
  const searchSelection = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null"));
  expect(searchSelection.object.sourceFeatureId).toBe("way/1001");
  expect(searchSelection.object.geometry.type).toBe("Polygon");
  expect(searchSelection.object.geometryProvenance).toBe("confirmed_complete_footprint");

  await page.getByRole("tab", { name: "Find" }).click();
  await expect(page.getByRole("heading", { name: "Find places" })).toBeVisible();
  await expect(page.locator('[data-testid^="find-audience-"]')).toHaveCount(0);
  const findRole = page.getByRole("combobox", { name: "Role" });
  await expect(findRole).toHaveValue("developer");
  const findScenario = page.getByRole("combobox", { name: "Scenario" });
  const findObjectType = page.getByRole("combobox", { name: "Object type" });
  const findLevelsFrom = page.getByLabel("Levels from");
  const findLevelsTo = page.getByLabel("Levels to");
  await expect(page.getByRole("option", { name: /development-zone search unavailable/i })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Buildings and construction sites" })).toHaveCount(1);
  await expect(findObjectType).toHaveValue("construction");
  await findRole.selectOption("real_estate_fund");
  await expect(findScenario).toHaveValue("b2b_lowrise_luxury_residential");
  await expect(findScenario.getByRole("option", { name: "Commercial properties" })).toHaveCount(1);
  await findRole.selectOption("developer");
  await expect(findScenario).toHaveValue("b2b_redevelopment_selected_aoi");
  await page.screenshot({ path: testInfo.outputPath("find-complete-settings-en.png") });
  await findScenario.selectOption("b2b_lowrise_luxury_residential");
  await expect(findObjectType).toHaveValue("residential");
  await expect(findLevelsFrom).toHaveValue("");
  await expect(findLevelsTo).toHaveValue("4");
  await findLevelsFrom.fill("1.5");
  await expect(findLevelsFrom).toHaveValue("");
  await findLevelsFrom.fill("2");
  await page.getByTestId("find-search-cta").click();
  await expect.poll(() => findPostRequests.length).toBe(1);
  expect(findPostRequests[0]).toMatchObject({ group: "residential", mappedMinimumLevels: 2, mappedMaximumLevels: 4, limit: 12 });
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.reduce((count: number, project: { artifacts?: unknown[] }) => count + (project.artifacts?.length ?? 0), 0) ?? 0;
  })).toBe(1);
  await findScenario.selectOption("b2b_redevelopment_selected_aoi");
  await expect(findObjectType).toHaveValue("construction");
  await expect(findLevelsFrom).toHaveValue("");
  await expect(findLevelsTo).toHaveValue("");
  await page.getByTestId("find-search-cta").click();
  await expect.poll(() => findPostRequests.length).toBe(2);
  expect(findPostRequests[1]).toMatchObject({ group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 });
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  await expect(page.getByText(/OpenStreetMap sample · acquired/)).toHaveCount(0);
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.reduce((count: number, project: { artifacts?: unknown[] }) => count + (project.artifacts?.length ?? 0), 0) ?? 0;
  })).toBe(2);
  const completedFindArtifactsBeforeViewChanges = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.reduce((count: number, project: { artifacts?: unknown[] }) => count + (project.artifacts?.length ?? 0), 0) ?? 0;
  });
  const firstCandidate = page.getByRole("listitem").filter({ hasText: "Marina Candidate One" });
  const secondCandidate = page.getByRole("listitem").filter({ hasText: "Marina Candidate Two" });
  await firstCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await secondCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await expect(page.getByTestId("find-comparison-grid").getByRole("article")).toHaveCount(2);
  await expect(page.getByTestId("find-comparison-grid")).toContainText("Dubai Marina");
  await expect(page.getByTestId("find-comparison-grid")).toContainText("Jumeirah Lakes Towers");
  const fullComparisonAction = page.getByTestId("find-search-cta");
  await expect(fullComparisonAction).toHaveText("Open full comparison dashboard");
  await fullComparisonAction.press("Enter");
  await expect(page.getByTestId("find-full-comparison-dashboard")).toBeVisible();
  await expect(page.getByTestId("find-comparison-map-context")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Common observed metrics" })).toBeVisible();
  await expect(page.getByTestId("find-comparison-basis")).toContainText("no separate comparison AI run");
  await expect(page.getByText(/Next step: open an object analysis/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("find-full-comparison-dashboard-en.png"), fullPage: true });
  await expect(page.getByRole("button", { name: "← Back to compact comparison", exact: true })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect.poll(() => page.getByTestId("find-drawer").evaluate((element) => (element instanceof HTMLElement && element.inert) || element.closest("[inert]") !== null)).toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByText("Source and data boundaries", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("find-full-comparison-dashboard")).toHaveCount(0);
  await expect(fullComparisonAction).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await fullComparisonAction.press("Enter");
  await expect(page.getByTestId("find-full-comparison-dashboard")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.reduce((count: number, project: { artifacts?: unknown[] }) => count + (project.artifacts?.length ?? 0), 0) ?? 0;
  })).toBe(completedFindArtifactsBeforeViewChanges);
  const findCallsBeforeReopen = findPostRequests.length;
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("geoai:point-to-object:projects:v1:")))).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.flatMap((project: { artifacts?: Array<{ payload?: { session?: { comparisonView?: string } } }> }) => project.artifacts ?? []).some((artifact: { payload?: { session?: { comparisonView?: string } } }) => artifact.payload?.session?.comparisonView === "dashboard") ?? false;
  })).toBe(true);
  await page.goto("/projects?view=spatial");
  await expect(page.getByTestId("point-object-projects-page")).toBeVisible();
  await expect(page.getByTestId("hub-count-find").getByTestId("hub-count-value")).toHaveText(String(completedFindArtifactsBeforeViewChanges));
  await expect(page.getByText("Saved on this device")).toBeVisible();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId("saved-project-card").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Show on map", exact: true }).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Центр проектов" })).toBeVisible();
  await expect(page.getByText("Сохранено на этом устройстве", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Показать на карте", exact: true }).first().click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object$/);
  await expect(page.getByRole("tab", { name: "Find", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("find-full-comparison-dashboard")).toBeVisible();
  await page.getByRole("button", { name: "← Back to compact comparison", exact: true }).click();
  await expect(page.getByTestId("find-comparison-grid").getByRole("article")).toHaveCount(2);
  // Inspect the real map only in the offline browser test, as in MAP10. Wait
  // for the requested fit to finish, not a transient non-stale animation frame.
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.evaluate(() => {
    type Hook = { memoizedState: unknown; next: Hook | null };
    type Fiber = { memoizedState: Hook | null; return: Fiber | null };
    const canvas = document.querySelector("[data-testid='live-map-canvas']")!;
    const fiberKey = Object.getOwnPropertyNames(canvas).find(key => key.startsWith("__reactFiber$"))!;
    let fiber: Fiber | null = (canvas as unknown as Record<string, Fiber>)[fiberKey];
    while (fiber) {
      for (let hook = fiber.memoizedState; hook; hook = hook.next) {
        const map = (hook.memoizedState as { current?: { isMoving?: unknown } } | null)?.current;
        if (typeof map?.isMoving === "function") {
          (window as unknown as { findRestoreMap: unknown }).findRestoreMap = map;
          return;
        }
      }
      fiber = fiber.return;
    }
    throw new Error("Find restore map instance unavailable");
  });
  const waitForFindMapIdle = async () => {
    await expect.poll(() => page.evaluate(() => {
      const map = (window as unknown as { findRestoreMap: import("maplibre-gl").Map }).findRestoreMap;
      return map.loaded() && !map.isMoving();
    })).toBe(true);
  };
  await waitForFindMapIdle();
  const contextCallsBeforeFootprint = contextRequests.length;
  const firstFindMarker = page.locator('[data-find-result-marker="way/2001"]');
  await expect(firstFindMarker).toBeVisible();
  await firstFindMarker.evaluate((element) => (element as HTMLButtonElement).click());
  await expect.poll(() => contextRequests.length).toBe(contextCallsBeforeFootprint + 1);
  expect(contextRequests.at(-1)).toMatchObject({ expectedSourceFeatureId: "way/2001", locale: "en" });
  await expect(firstFindMarker).toHaveCount(0);
  await waitForFindMapIdle();
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { findRestoreMap: import("maplibre-gl").Map }).findRestoreMap;
    return map.querySourceFeatures("geoai-find-footprints").some((feature) => feature.properties?.resultId === "way/2001" && feature.geometry.type === "Polygon");
  })).toBe(true);
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await waitForFindMapIdle();
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  await expect(page.getByTestId("find-use-current-map-area")).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await waitForFindMapIdle();
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  const restoredCenter = await page.evaluate(() => (window as unknown as { findRestoreMap: import("maplibre-gl").Map }).findRestoreMap.getCenter().toArray());
  const mapBox = await page.locator(".maplibregl-canvas").boundingBox();
  if (!mapBox) throw new Error("Find map bounds unavailable for manual pan");
  await page.mouse.move(mapBox.x + 200, mapBox.y + 300);
  await page.mouse.down();
  await page.mouse.move(mapBox.x + 280, mapBox.y + 300, { steps: 8 });
  await page.mouse.up();
  await waitForFindMapIdle();
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  await expect(page.getByTestId("find-use-current-map-area")).toBeVisible();
  // Restore the test camera so the existing comparison/analysis flow continues.
  await page.evaluate(center => (window as unknown as { findRestoreMap: import("maplibre-gl").Map }).findRestoreMap.jumpTo({ center }), restoredCenter);
  await waitForFindMapIdle();
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  const restoredFindSession = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:find:v1") ?? "null"));
  expect(restoredFindSession.marketKey).toBe("dubai");
  expect(restoredFindSession.result.criteria.bounds).toEqual(findPostRequests[1]?.bounds);
  expect(findPostRequests).toHaveLength(findCallsBeforeReopen);
  await page.getByTestId("find-comparison-grid").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("find-side-by-side-comparison-en.png") });
  await expect(page.getByText(/SHA-256/)).toHaveCount(0);
  await expect(page.getByText(/way\/2001|node\/2002|relation\/2003/)).toHaveCount(0);
  await expect(page.getByText(/Coordinates|OSM ID/)).toHaveCount(0);
  await expect(page.getByText(/Factual OpenStreetMap attribute comparison|mapped signal/)).toHaveCount(0);
  await page.getByRole("button", { name: "Remove from comparison: Marina Candidate Two" }).click();
  await expect(page.getByTestId("find-comparison-grid")).toHaveCount(0);
  await secondCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await page.getByRole("button", { name: "Back to results", exact: true }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByTestId("find-comparison-toolbar")).toHaveCount(0);
  await firstCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await secondCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  const contextCallsBeforeAnalysisNavigation = contextRequests.length;
  await page.getByRole("article").filter({ hasText: "Marina Candidate One" }).getByRole("button", { name: "Open analysis" }).click();
  await expect(page.getByText("Marina Candidate One", { exact: true }).first()).toBeVisible();
  await expect.poll(() => contextRequests.at(-1)?.expectedSourceFeatureId).toBe("way/2001");
  expect(contextRequests.at(-1)?.expectedSourceFeatureId).toBe("way/2001");
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null")?.object?.sourceFeatureId)).toBe("way/2001");
  const findSelection = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null"));
  expect(findSelection.object.sourceFeatureId).toBe("way/2001");
  expect(findSelection.object.geometry.type).toBe("Polygon");
  expect(findSelection.object.geometryProvenance).toBe("confirmed_complete_footprint");
  expect(contextRequests).toHaveLength(contextCallsBeforeAnalysisNavigation);

  const emptyQuestion = page.getByRole("textbox", { name: "What would you like to know?" });
  await expect(emptyQuestion).toHaveValue("");
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled();
  await emptyQuestion.press("Control+Enter");
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
  await expect(page.getByRole("link", { name: "Data sources" })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to map" }).click();
  await page.getByRole("tab", { name: "Find" }).click();
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  await expect(page.getByTestId("find-search-cta")).toHaveText("Open full comparison dashboard");
  await expect(page.getByRole("article").filter({ hasText: "Marina Candidate Two" })).toBeVisible();
  await page.getByRole("combobox", { name: "City" }).selectOption("singapore");
  await expect(page.getByTestId("find-result-stale")).toHaveText("Stale");
  await expect(page.getByRole("article").filter({ hasText: "Marina Candidate One" }).getByRole("button", { name: "Open analysis" })).toBeDisabled();
  await page.getByRole("combobox", { name: "City" }).selectOption("dubai");
  await expect(page.getByRole("article").filter({ hasText: "Marina Candidate One" }).getByRole("button", { name: "Open analysis" })).toBeEnabled();
  const restoredFind = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:find:v1") ?? "null"));
  expect(restoredFind.result.source.sourceResponseHash).toBe(sha256);
  expect(restoredFind.shortlist.map((item: { sourceFeatureId: string }) => item.sourceFeatureId)).toEqual(["way/2001", "node/2002"]);
  expect(restoredFind.analysisTargetSourceFeatureId).toBe("way/2001");
  expect(restoredFind.role).toBe("developer");
  expect(restoredFind.scenario).toBe("b2b_redevelopment_selected_aoi");
  expect(restoredFind.mappedMaximumLevels).toBe("");
  for (const viewport of [
    { width: 1440, height: 900, align: true },
    { width: 1440, height: 720, align: true },
    { width: 1440, height: 768, align: true },
    { width: 834, height: 1112, align: false },
    { width: 390, height: 844, align: false },
    { width: 720, height: 450, align: false }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expectFindDrawerGeometry(page, viewport.align);
  }
  await expect(page.getByTestId("find-data-methodology")).toHaveCount(0);
  await expect(page.getByTestId("find-methodology-panel")).toHaveCount(0);
  await expect(page.getByText("Pan or zoom the map, then use Find to search the visible area. Map clicks do not select objects in this mode.")).toBeAttached();
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null"))).toBeNull();
  await page.locator(".maplibregl-canvas").click({ position: { x: 200, y: 150 }, force: true });
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null"))).toBeNull();
  expect(unexpectedExternal).toEqual([]);
});

test("Find changes the committed search area only through the explicit area action", async ({ page }) => {
  findPostRequests.length = 0;
  await installOfflineRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInDemo(page, "/prototype/point-to-object?mode=find");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  const primary = page.getByTestId("find-search-cta");
  await expect(primary).toHaveText("Search");
  await expect(primary).toBeEnabled();
  await primary.click();
  await expect.poll(() => findPostRequests.length).toBe(1);
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);

  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(page.getByTestId("find-use-current-map-area")).toBeVisible();
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  expect(findPostRequests).toHaveLength(1);

  await page.getByTestId("find-use-current-map-area").click();
  await expect(page.getByTestId("find-result-stale")).toHaveText("Stale");
  await expect(primary).toHaveText("Update search");
  await primary.click();
  await expect.poll(() => findPostRequests.length).toBe(2);
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
});

test("Find keeps an estate-agency OSM record as a POI and resolves only a physical object's footprint", async ({ page }) => {
  contextRequests.length = 0;
  await installOfflineRoutes(page);
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>;
    const businessPoi = {
      sourceFeatureId: "way/9101",
      sourceElementType: "way",
      sourceElementId: "9101",
      label: "Marina Estate Agency",
      name: "Marina Estate Agency",
      longitude: 55.2704,
      latitude: 25.2054,
      group: "commercial_office",
      matchedTag: { key: "office", value: "estate_agent" },
      mappedBuildingLevels: null,
      observedTags: { name: "Marina Estate Agency", office: "estate_agent" },
      evidenceClass: "observed_in_open_map_source"
    };
    const physicalProperty = {
      ...businessPoi,
      sourceFeatureId: "way/9102",
      sourceElementId: "9102",
      label: "Mapped Commercial Building",
      name: "Mapped Commercial Building",
      longitude: 55.2712,
      matchedTag: { key: "building", value: "commercial" },
      mappedBuildingLevels: 7,
      observedTags: { name: "Mapped Commercial Building", building: "commercial", "building:levels": "7" }
    };
    await json(route, {
      protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",
      mode: "results",
      criteria: request,
      candidates: [businessPoi, physicalProperty],
      ordering: "source_identity_ascending_not_ranked",
      coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 1.25, upstreamElementCount: 2, normalizedCandidateCount: 2, returnedCandidateCount: 2, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
      source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: sha256, observedAt: null, acquiredAt, freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
      limitations: ["Bounded deterministic E2E sample."],
      caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInDemo(page, "/prototype/point-to-object?mode=find");
  await page.getByRole("combobox", { name: "Object type" }).selectOption("commercial_office");
  await page.getByTestId("find-search-cta").click();
  await expect(page.getByText("Showing 2", { exact: true })).toBeVisible();

  const agency = page.getByRole("listitem").filter({ hasText: "Marina Estate Agency" });
  const building = page.getByRole("listitem").filter({ hasText: "Mapped Commercial Building" });
  await agency.getByRole("button", { name: "Compare", exact: true }).click();
  await building.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await page.getByTestId("find-search-cta").click();
  await expect(page.getByText("Mapped function / POI", { exact: true })).toBeVisible();
  await expect(page.getByText("Mapped building / land use", { exact: true })).toBeVisible();
  await expect(page.getByText("OSM returned a functional point: useful context, not a confirmed property asset.", { exact: true })).toBeVisible();
  await page.getByTestId("find-full-comparison-dashboard").getByRole("button", { name: "Back to results", exact: true }).click();

  await page.locator('[data-find-result-marker="way/9101"]').evaluate((element) => (element as HTMLButtonElement).click());
  expect(contextRequests).toHaveLength(0);
  const physicalMarker = page.locator('[data-find-result-marker="way/9102"]');
  await physicalMarker.evaluate((element) => (element as HTMLButtonElement).click());
  await expect.poll(() => contextRequests.length).toBe(1);
  expect(contextRequests[0]?.expectedSourceFeatureId).toBe("way/9102");
  await expect(physicalMarker).toHaveCount(0);
});

test("empty saved Find restores its query viewport without a fabricated selection or rerun", async ({ page }) => {
  findPostRequests.length = 0;
  contextRequests.length = 0;
  const unexpectedExternal = await installOfflineRoutes(page, { emptyFind: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInDemo(page, "/prototype/point-to-object");
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill("Shangri");
  await expect(page.getByRole("option", { name: /Shangri-La exact search result/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.getByText("Exact mapped object")).toBeVisible();
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await page.getByTestId("find-search-cta").click();
  await expect(page.getByText("No matches for these filters.", { exact: true })).toBeVisible();
  await expect.poll(() => findPostRequests.length).toBe(1);
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith("geoai:point-to-object:projects:v1:"));
    return key ? JSON.parse(localStorage.getItem(key)!).projects.flatMap((project: { artifacts: unknown[] }) => project.artifacts).length : 0;
  })).toBe(1);
  const savedQuery = findPostRequests[0].bounds;
  const contextCalls = contextRequests.length;
  await page.getByRole("button", { name: "3d", exact: true }).click();
  await expect(page.getByRole("button", { name: "3d", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/projects");
  const priorSelection = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3")!));
  await page.getByRole("button", { name: "Show on map", exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object$/);
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByText("No matches for these filters.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "2d", exact: true })).toHaveAttribute("aria-pressed", "true");
  const restored = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:find:v1")!));
  expect(restored.result.criteria.bounds).toEqual(savedQuery);
  expect(restored.result.candidates).toEqual([]);
  expect(restored.result.source.sourceResponseHash).toBe(sha256);
  const selectionAfterRestore = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3")!));
  // Find preserves prior legitimate Analyse work; an empty bbox fit must not
  // replace it with a synthetic point or a fabricated source identity.
  expect(selectionAfterRestore.object).toEqual(priorSelection.object);
  expect(selectionAfterRestore.resolvedObject).toEqual(priorSelection.resolvedObject);
  expect(selectionAfterRestore.clickedAt).toBe(priorSelection.clickedAt);
  expect(findPostRequests).toHaveLength(1);
  expect(contextRequests).toHaveLength(contextCalls);
  expect(unexpectedExternal).toEqual([]);
});

test("true guest Create restores its exact result and mode without another request", async ({ page }) => {
  createPostRequests.length = 0;
  areaContextPostRequests = 0;
  const createRequestMethods: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/prototype/point-to-object/create") createRequestMethods.push(request.method());
  });
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.unroute("**/api/prototype/point-to-object/create");
  await page.route("**/api/prototype/point-to-object/create", async (route) => {
    if (route.request().method() === "GET") return json(route, { mode: "ready", challenge: "G".repeat(43) });
    createPostRequests.push(route.request().postDataJSON() as Record<string, unknown>);
    return json(route, {
      mode: "openai_concept",
      generatedAt: acquiredAt,
      promptVersion: "POINT_OBJECT_CREATE_GUEST_E2E",
      program: guestCreateProgramValidation.value,
      massing: guestCreateAlternatives[0].massing,
      alternatives: guestCreateAlternatives,
      telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
      caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object?mode=create");
  await expect(page.getByRole("link", { name: "Sign in to GeoAI", exact: true })).toBeVisible();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "guest-create-area.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({
      type: "Polygon",
      coordinates: guestCreateAoiCoordinates
    }))
  });
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await page.getByTestId("create-alternative-b").click();
  await page.getByTestId("create-open-result-dashboard").click();
  await expect(page.getByTestId("create-dashboard-alternative-b")).toHaveAttribute("aria-selected", "true");
  const requestMethodsAfterGeneration = [...createRequestMethods];
  const areaContextCallsAfterGeneration = areaContextPostRequests;
  await page.goto("/prototype/point-to-object?mode=find");
  await expect(page.getByRole("tab", { name: "Find", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(createRequestMethods).toEqual(requestMethodsAfterGeneration);
  expect(areaContextPostRequests).toBe(areaContextCallsAfterGeneration);
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");
  await page.getByTestId("create-open-result-dashboard").click();
  await expect(page.getByTestId("create-dashboard-alternative-b")).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Show on map", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Find", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await page.evaluate(() => window.history.replaceState(null, "", "/prototype/point-to-object?mode=create"));
  await page.reload();
  await expect(page.getByRole("tab", { name: "Create", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");
  expect(createRequestMethods).toEqual(requestMethodsAfterGeneration);
  expect(areaContextPostRequests).toBe(areaContextCallsAfterGeneration);
  const restoredSession = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:create:v1") ?? "null"));
  expect(restoredSession).toMatchObject({ schemaVersion: 1, marketKey: "dubai", locale: "en", generatedLocale: "en", activeAlternativeId: "B", dashboardOpen: false });

  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByTestId("create-result-language-stale")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const session = JSON.parse(sessionStorage.getItem("geoai:point-to-object:create:v1") ?? "null") as { locale?: string; generatedLocale?: string } | null;
    return session ? `${session.locale}:${session.generatedLocale}` : null;
  })).toBe("ru:en");
  const requestMethodsBeforeLocaleReload = [...createRequestMethods];
  await page.reload();
  await expect(page.getByRole("tab", { name: "Создать", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("create-result-language-stale")).toBeVisible();
  expect(createRequestMethods).toEqual(requestMethodsBeforeLocaleReload);
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();

  await page.unroute("**/api/prototype/point-to-object/create");
  await page.route("**/api/prototype/point-to-object/create", async (route) => {
    if (route.request().method() === "GET") return json(route, { mode: "ready", challenge: "B".repeat(43) });
    await json(route, { mode: "unavailable", error: "deliberate guest update failure" }, 502);
  });
  await page.getByText("Concept parameters", { exact: true }).click();
  await page.getByRole("slider", { name: "Blocks" }).fill("2");
  await page.getByTestId("create-generate-action").click();
  await expect(page.getByTestId("create-generation-error")).toBeVisible();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Create", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");

  const preservedGuestSession = await page.evaluate(() => sessionStorage.getItem("geoai:point-to-object:create:v1"));
  expect(preservedGuestSession).not.toBeNull();
  await page.getByTestId("point-object-city-select").selectOption("singapore");
  await expect(page.getByTestId("generated-concept-summary")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("geoai:point-to-object:create:v1"))).toBeNull();
  await page.reload();
  await expect(page.getByTestId("generated-concept-summary")).toHaveCount(0);
  await page.evaluate((raw) => sessionStorage.setItem("geoai:point-to-object:create:v1", raw), preservedGuestSession!);
  await page.reload();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await signInDemo(page, "/prototype/point-to-object");
  await expect(page.locator('[data-point-object-header] a[href="/profile"]')).toHaveAttribute("data-authenticated", "true");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("geoai:point-to-object:create:v1"))).toBeNull();
  await expect(page.getByTestId("generated-concept-summary")).toHaveCount(0);
  expect(unexpectedExternal).toEqual([]);
});

test("Create A/B and mobile profile remain coherent offline", async ({ page }, testInfo) => {
  createPostRequests.length = 0;
  areaContextPostRequests = 0;
  const createRequestMethods: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/prototype/point-to-object/create") {
      createRequestMethods.push(request.method());
    }
  });
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInDemo(page, "/prototype/point-to-object");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  await page.getByRole("tab", { name: "Create" }).click();
  await page.getByTestId("live-map-canvas").evaluate((element) => {
    (window as typeof window & { __geoAiAoiFitReceipts?: string[] }).__geoAiAoiFitReceipts = [];
    element.addEventListener("geoai:aoi-fit-applied", ((event: CustomEvent<{ requestId: string }>) => {
      (window as typeof window & { __geoAiAoiFitReceipts?: string[] }).__geoAiAoiFitReceipts?.push(event.detail.requestId);
    }) as EventListener);
  });
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "offline-create-area.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [55.27015, 25.20515],
        [55.27065, 25.20515],
        [55.27065, 25.20565],
        [55.27015, 25.20565],
        [55.27015, 25.20515]
      ]]
    }))
  });
  await expect(page.getByText(/Area ready ·/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __geoAiAoiFitReceipts?: string[] }).__geoAiAoiFitReceipts?.length ?? 0)).toBe(1);
  await expect(page.getByText("Objects inside the polygon")).toBeVisible();
  await expect(page.getByText("Mapped objects", { exact: true })).toBeVisible();
  await expect(page.getByText(/Uses returned feature centres inside the AOI/)).toHaveCount(0);
  const mapPresentation = page.getByTestId("create-map-presentation-toggle");
  await expect(mapPresentation).toHaveText("Hide existing buildings");
  await mapPresentation.click();
  await expect(mapPresentation).toHaveText("Show existing");
  await mapPresentation.click();
  await expect(mapPresentation).toHaveText("Hide existing buildings");
  await page.getByRole("button", { name: /Business towers/ }).click();
  await page.getByText("Concept parameters", { exact: true }).click();
  await page.getByRole("slider", { name: "Blocks" }).fill("5");
  await page.getByRole("slider", { name: "Site coverage" }).fill("31");
  await page.getByRole("slider", { name: "Minimum levels" }).fill("12");
  await page.getByRole("slider", { name: "Maximum levels" }).fill("24");
  await page.getByRole("slider", { name: "Open space" }).fill("42");
  await page.getByRole("slider", { name: "Setback" }).fill("11");
  await page.getByLabel("Custom direction").fill("Keep a shaded civic spine and active ground floors.");
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByRole("button", { name: /Деловой комплекс/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider", { name: "Корпуса" })).toHaveValue("5");
  await expect(page.getByRole("slider", { name: "Плотность застройки" })).toHaveValue("31");
  await expect(page.getByRole("slider", { name: "Минимум этажей" })).toHaveValue("12");
  await expect(page.getByRole("slider", { name: "Максимум этажей" })).toHaveValue("24");
  await expect(page.getByRole("slider", { name: "Открытые пространства" })).toHaveValue("42");
  await expect(page.getByRole("slider", { name: "Отступ" })).toHaveValue("11");
  await expect(page.getByLabel("Дополнительное задание")).toHaveValue("Keep a shaded civic spine and active ground floors.");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByRole("button", { name: /Business towers/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider", { name: "Blocks" })).toHaveValue("5");
  await expect(page.getByLabel("Custom direction")).toHaveValue("Keep a shaded civic spine and active ground floors.");
  await page.getByRole("combobox", { name: "Map style" }).selectOption("light");
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __geoAiAoiFitReceipts?: string[] }).__geoAiAoiFitReceipts?.length ?? 0)).toBe(1);
  await expect(page.getByText("Edited", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("reset-edited-create-controls")).toBeVisible();
  const generateConcept = page.getByTestId("create-generate-action");
  await expect(generateConcept).toHaveText("Generate concept");
  await generateConcept.click();
  await expect(page.getByTestId("generated-concept-summary")).toContainText("A deterministic mixed-use concept for the selected area.");
  await expect(generateConcept).toHaveText("Already generated");
  await expect(generateConcept).toBeDisabled();
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByTestId("create-result-language-stale")).toBeVisible();
  await expect(page.getByText("A deterministic mixed-use concept for the selected area.")).toHaveCount(0);
  await expect(page.getByTestId("create-generate-action")).toHaveText("Обновить концепцию");
  await mapPresentation.click();
  await expect(mapPresentation).toHaveText("Показать созданную концепцию");
  const areaHeadingBox = await page.getByTestId("create-area-context-heading").boundingBox();
  const presentationBox = await mapPresentation.boundingBox();
  expect(areaHeadingBox).not.toBeNull();
  expect(presentationBox).not.toBeNull();
  expect(areaHeadingBox!.width).toBeGreaterThan(280);
  expect(presentationBox!.y).toBeGreaterThanOrEqual(areaHeadingBox!.y + areaHeadingBox!.height);
  await mapPresentation.click();
  await expect(mapPresentation).toHaveText("Показать исходные");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByTestId("create-result-language-stale")).toHaveCount(0);
  await expect(generateConcept).toHaveText("Already generated");
  await expect(generateConcept).toBeDisabled();
  expect(createPostRequests).toHaveLength(1);
  expect(createPostRequests[0]).toMatchObject({
    locale: "en",
    depth: "standard",
    templateId: "commercial_hub",
    customPrompt: "Keep a shaded civic spine and active ground floors.",
    controls: {
      blockCount: 5,
      targetSiteCoveragePct: 31,
      levelsMin: 12,
      levelsMax: 24,
      openSpacePct: 42,
      setbackM: 11
    }
  });
  expect([...(createPostRequests[0]?.lockedControlKeys as string[])].sort()).toEqual(
    ["blockCount", "levelsMin", "levelsMax", "targetSiteCoveragePct", "openSpacePct", "setbackM"].sort());
  await expect(page.getByTestId("create-alternative-a")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("generated-concept-metrics")).toContainText("Generated blocks1");
  await page.getByTestId("create-alternative-b").click();
  await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("create-alternative-b")).toHaveCSS("background-color", "rgb(8, 127, 112)");
  await expect(page.getByTestId("generated-concept-metrics")).toContainText("Generated blocks1");
  await expect(generateConcept).toHaveText("Already generated");
  await expect(generateConcept).toBeDisabled();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("create-alternative-b.png") });
  expect(createPostRequests).toHaveLength(1);
  const createCallsBeforeReopen = createRequestMethods.length;
  const areaContextCallsBeforeReopen = areaContextPostRequests;
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.[0]?.artifacts?.some((artifact: { kind?: string; payload?: { generated?: { mode?: string; generatedAt?: string; promptVersion?: string } } }) =>
      artifact.kind === "create" && artifact.payload?.generated?.mode === "openai_concept" &&
      Boolean(artifact.payload.generated.generatedAt) && Boolean(artifact.payload.generated.promptVersion));
  })).toBe(true);
  await page.goto("/projects?view=spatial");
  await expect(page.getByTestId("hub-count-create").getByTestId("hub-count-value")).toHaveText("1");
  await page.getByRole("button", { name: "Show on map", exact: true }).first().click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object$/);
  await expect(page.getByRole("tab", { name: "Create", exact: true })).toHaveAttribute("aria-selected", "true");
  const reopenedDashboard = page.getByTestId("create-full-result-dashboard");
  await expect(reopenedDashboard).toBeVisible();
  await expect(reopenedDashboard.getByTestId("create-dashboard-alternative-b")).toHaveAttribute("aria-selected", "true");
  await reopenedDashboard.getByTestId("create-dashboard-alternative-a").click();
  await expect(reopenedDashboard.getByTestId("create-dashboard-alternative-a")).toHaveAttribute("aria-selected", "true");
  expect(createRequestMethods).toHaveLength(createCallsBeforeReopen);
  expect(createPostRequests).toHaveLength(1);
  expect(areaContextPostRequests).toBe(areaContextCallsBeforeReopen);
  await reopenedDashboard.getByRole("button", { name: "Show on map", exact: true }).click();
  await expect(reopenedDashboard).toHaveCount(0);
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect(page.getByTestId("create-alternative-a")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("create-generate-action")).toHaveText("Already generated");
  await expect(page.getByTestId("create-generate-action")).toBeDisabled();
  expect(createPostRequests).toHaveLength(1);
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.reduce((count: number, project: { artifacts?: unknown[] }) => count + (project.artifacts?.length ?? 0), 0) ?? 0;
  })).toBe(1);
  await expect(page.getByText("Concept ready")).toHaveCount(0);
  const showExisting = page.getByRole("button", { name: "Show existing" });
  await expect(showExisting).toBeVisible();
  await showExisting.click();
  await expect(page.getByRole("button", { name: "Show generated concept" })).toBeVisible();
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await page.getByRole("button", { name: "Show generated concept" }).click();
  await expect(page.getByRole("button", { name: "Show existing" })).toBeVisible();
  await expect(page.getByText(/Source buildings inside the selected area are hidden/)).toHaveCount(0);
  await page.getByText("Concept parameters", { exact: true }).click();
  await page.getByTestId("reset-edited-create-controls").click();
  await expect(page.getByText("Edited", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect(generateConcept).toHaveText("Update concept");
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(generateConcept).toHaveText("Обновить концепцию");
  await generateConcept.click();
  // The prior summary deliberately remains visible during regeneration, so it
  // cannot signal completion of the new request.
  await expect.poll(() => createPostRequests.length).toBe(2);
  await expect(generateConcept).toHaveText("Уже создано");
  await expect(generateConcept).toBeDisabled();
  expect([...(createPostRequests[1]?.lockedControlKeys as string[])].sort()).toEqual(
    ["blockCount", "levelsMin", "levelsMax", "targetSiteCoveragePct", "openSpacePct", "setbackM"].sort());
  const createCallsBeforeLocaleReopens = createPostRequests.length;
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.reduce((count: number, project: { artifacts?: unknown[] }) => count + (project.artifacts?.length ?? 0), 0) ?? 0;
  })).toBe(2);
  await page.goto("/projects?view=spatial");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await page.getByRole("button", { name: "Show on map", exact: true }).first().click();
  await expect(page.getByRole("tab", { name: "Создать", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  expect(createPostRequests).toHaveLength(createCallsBeforeLocaleReopens);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Создать", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  expect(createPostRequests).toHaveLength(createCallsBeforeLocaleReopens);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Центр проектов" })).toBeVisible();
  await page.getByRole("button", { name: "Показать на карте", exact: true }).nth(1).click();
  await expect(page.getByRole("tab", { name: "Create", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(createPostRequests).toHaveLength(createCallsBeforeLocaleReopens);
  const finalDashboard = page.getByTestId("create-full-result-dashboard");
  await expect(finalDashboard).toBeVisible();
  await finalDashboard.getByRole("button", { name: "Back to parameters", exact: true }).click();
  await expect(finalDashboard).toHaveCount(0);
  await page.getByTestId("create-clear-generated").click();
  await expect(page.getByTestId("generated-concept-summary")).toHaveCount(0);
  await expect(mapPresentation).toHaveText("Hide existing buildings");
  await page.getByTestId("create-delete-area").click();
  await expect(page.getByText(/Area ready ·/)).toHaveCount(0);

  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await page.getByTestId("find-search-cta").click();
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  const savedCandidateOne = page.getByRole("listitem").filter({ hasText: "Marina Candidate One" });
  const savedCandidateTwo = page.getByRole("listitem").filter({ hasText: "Marina Candidate Two" });
  await savedCandidateOne.getByRole("button", { name: "Compare", exact: true }).click();
  await savedCandidateTwo.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await expect(page.getByTestId("find-comparison-grid")).toBeVisible();

  // The session is already authenticated; exercise the actual map-to-profile journey.
  const profileLink = page.locator('[data-point-object-header] a[href="/profile"]');
  await expect(profileLink).toHaveAttribute("data-authenticated", "true");
  await profileLink.click();
  await expect(page).toHaveURL((url) => url.pathname === "/profile");
  await expect(page.locator('[data-point-object-header] a[href="/profile"]')).toHaveAttribute("data-authenticated", "true");
  await expect(page.getByRole("combobox", { name: /Default role|Роль по умолчанию/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const russianLocale = page.getByRole("button", { name: "ru", exact: true });
  await expect.poll(async () => {
    if (await russianLocale.getAttribute("aria-pressed") !== "true") await russianLocale.click();
    return russianLocale.getAttribute("aria-pressed");
  }, { timeout: 10_000, intervals: [50, 100, 250] }).toBe("true");
  await expect(page.getByRole("heading", { name: "Ваш профиль" })).toBeVisible();
  await page.getByRole("button", { name: "B2C", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Роль по умолчанию" })).toHaveValue("tourist");
  await page.getByRole("button", { name: "Сохранить профиль", exact: true }).click();
  await expect(page.getByText("Демо-профиль сохранён для этой браузерной сессии.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Вернуться к карте" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("create-mobile-profile-390-ru.png") });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Поиск" }).click();
  await expect(page.locator('[data-testid^="find-audience-"]')).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Роль" })).toHaveValue("tourist");
  await expect(page.getByText("Показано: 3", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("find-comparison-toolbar")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(sessionStorage.getItem("geoai:point-to-object:find:v1") ?? "null");
    return { audience: state?.audience, result: state?.result, shortlist: state?.shortlist };
  })).toEqual({ audience: "b2c", result: null, shortlist: [] });
  await expect(page.getByRole("combobox", { name: "Сценарий" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Тип объекта" })).toBeVisible();
  await expect(page.getByLabel("Этажей от")).toBeVisible();
  await expect(page.getByLabel("Этажей до")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("create-profile-return-b2c-criteria-390-ru.png") });
  await page.goto("/profile");
  await expect(page.getByRole("combobox", { name: "Роль по умолчанию" })).toHaveValue("tourist");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(unexpectedExternal).toEqual([]);
});

test("Find rejects a same-audience saved result when its scenario is no longer executable", async ({ page }) => {
  findPostRequests.length = 0;
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await page.getByTestId("find-search-cta").click();
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  const firstCandidate = page.getByRole("listitem").filter({ hasText: "Marina Candidate One" });
  const secondCandidate = page.getByRole("listitem").filter({ hasText: "Marina Candidate Two" });
  await firstCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await secondCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await expect(page.getByTestId("find-comparison-grid")).toBeVisible();

  await page.evaluate(() => {
    const key = "geoai:point-to-object:find:v1";
    const state = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (!state) throw new Error("Expected a saved Find session.");
    state.scenario = "b2b_redevelopment_100ha";
    sessionStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Role" })).toHaveValue("developer");
  await expect(page.getByRole("combobox", { name: "Scenario" })).toHaveValue("b2b_redevelopment_selected_aoi");
  await expect(page.getByText("Showing 3", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("find-comparison-toolbar")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(sessionStorage.getItem("geoai:point-to-object:find:v1") ?? "null");
    return {
      scenario: state?.scenario,
      result: state?.result,
      shortlist: state?.shortlist,
      comparisonOpen: state?.comparisonOpen,
      analysisTargetSourceFeatureId: state?.analysisTargetSourceFeatureId
    };
  })).toEqual({
    scenario: "b2b_redevelopment_selected_aoi",
    result: null,
    shortlist: [],
    comparisonOpen: false,
    analysisTargetSourceFeatureId: null
  });
  expect(unexpectedExternal).toEqual([]);
});

test("Create source-building replacement stays reversible when area context is rate limited", async ({ page }) => {
  const unexpectedExternal = await installOfflineRoutes(page, { areaContextMode: "rate" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "offline-rate-limited-area.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({
      type: "Polygon",
      coordinates: [[
        [55.27015, 25.20515],
        [55.27065, 25.20515],
        [55.27065, 25.20565],
        [55.27015, 25.20565],
        [55.27015, 25.20515]
      ]]
    }))
  });

  await expect(page.getByText(/The source limited requests\. Retry in \d+s\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeDisabled();
  const presentationToggle = page.getByTestId("create-map-presentation-toggle");
  await expect(presentationToggle).toHaveText("Hide existing buildings");
  await presentationToggle.click();
  await expect(presentationToggle).toHaveText("Show existing");
  await presentationToggle.click();
  await expect(presentationToggle).toHaveText("Hide existing buildings");

  await page.getByTestId("create-delete-area").click();
  await expect(page.getByText(/Area ready ·/)).toHaveCount(0);
  await expect(page.getByText(/Retry in \d+s\.|Try again\./)).toHaveCount(0);
  await expect(presentationToggle).toHaveCount(0);
  expect(unexpectedExternal).toEqual([]);
});

test("Saved Projects exposes recoverable storage failure at every supported width without rerunning Find", async ({ page }) => {
  findPostRequests.length = 0;
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInDemo(page, "/prototype/point-to-object");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.evaluate(() => {
    const target = window as typeof window & { __geoAiFailProjectWrites?: boolean; __geoAiOriginalStorageSetItem?: typeof Storage.prototype.setItem };
    target.__geoAiFailProjectWrites = true;
    target.__geoAiOriginalStorageSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (target.__geoAiFailProjectWrites && key.startsWith("geoai:point-to-object:projects:v1:")) {
        throw new DOMException("Synthetic project storage denial", "QuotaExceededError");
      }
      return target.__geoAiOriginalStorageSetItem!.call(this, key, value);
    };
  });
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await page.getByTestId("find-search-cta").click();
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  const recovery = page.getByTestId("point-object-project-recovery");
  await expect(recovery).toBeVisible();
  await expect(recovery).toHaveAccessibleName(/Quota exceeded|Synthetic project storage denial|Retry/i);
  expect(findPostRequests).toHaveLength(1);

  for (const language of ["en", "ru"] as const) {
    if (language === "ru") {
      await page.getByRole("button", { name: "ru", exact: true }).click();
      await expect(recovery).toHaveAccessibleName(/Повторить|Synthetic project storage denial/i);
    }
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await expect(recovery).toBeVisible();
      const box = await recovery.boundingBox();
      expect(box, `Recovery control must be rendered at ${viewport.width}px in ${language}`).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }

  await page.evaluate(() => {
    (window as typeof window & { __geoAiFailProjectWrites?: boolean }).__geoAiFailProjectWrites = false;
  });
  await recovery.click();
  await expect(recovery).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.[0]?.artifacts?.length ?? 0;
  })).toBe(1);
  expect(findPostRequests).toHaveLength(1);
  expect(unexpectedExternal).toEqual([]);
});
