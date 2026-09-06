import { expect, test, type Page, type Route } from "@playwright/test";

const sha256 = "a".repeat(64);
const acquiredAt = "2026-09-04T09:00:00.000Z";
const contextRequests: Array<Record<string, unknown>> = [];
const findPostRequests: Array<Record<string, unknown>> = [];
const createPostRequests: Array<Record<string, unknown>> = [];
let areaContextPostRequests = 0;

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

async function installOfflineRoutes(page: Page, options: { areaContextMode?: "success" | "rate" | "error" } = {}) {
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
      mode: "results",
      criteria: request,
      candidates,
      ordering: "source_identity_ascending_not_ranked",
      coverage: {
        kind: "bounded_open_map_sample",
        approximateAreaSqKm: 1.25,
        upstreamElementCount: 3,
        normalizedCandidateCount: 3,
        returnedCandidateCount: 3,
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
    return json(route, {
      protocol: "POINT_TO_OBJECT_001_AREA_CONTEXT_V1",
      mode: "results",
      features: [],
      summary: { sampleSize: 2, mappedBuildingCount: 2, mappedLevelsKnownCount: 1, medianMappedLevels: 6, groups: [{ group: "residential", count: 2 }] },
      coverage: { capReached: false }
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
        useMix: [{ use: "residential", sharePct: 100 }],
        rationale: ["Deterministic offline E2E fixture."]
      },
      massing: {
        featureCollection: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
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
              properties: { id: "concept-b-1", kind: "concept_massing", templateId: "residential_mixed_use", massingStyle: "courtyard", variantId: "B", volumeRole: "courtyard_wing", primaryBlock: true, use: "residential", levels: 6, heightM: 20.4, baseM: 0, label: "Option B block 1" },
              geometry: { type: "Polygon", coordinates: [[[55.2702, 25.2052], [55.27035, 25.2052], [55.27035, 25.2055], [55.2702, 25.2055], [55.2702, 25.2052]]] }
            }, {
              type: "Feature",
              properties: { id: "concept-b-2", kind: "concept_massing", templateId: "residential_mixed_use", massingStyle: "courtyard", variantId: "B", volumeRole: "courtyard_wing", primaryBlock: true, use: "residential", levels: 10, heightM: 34, baseM: 0, label: "Option B block 2" },
              geometry: { type: "Polygon", coordinates: [[[55.27036, 25.2052], [55.2705, 25.2052], [55.2705, 25.2055], [55.27036, 25.2055], [55.27036, 25.2052]]] }
            }]
          },
          requestedBlockCount: 1,
          generatedBlockCount: 2,
          generatedFeatureCount: 2,
          aoiAreaSqM: 2_500,
          generatedFootprintAreaSqM: 925,
          estimatedFloorAreaSqM: 8_100,
          achievedSiteCoveragePct: 37,
          minGeneratedLevels: 6,
          maxGeneratedLevels: 10,
          massingStyle: "courtyard",
          variantId: "B",
          seed: "offline-e2e-b"
        }
      }],
      telemetry: { model: "offline-fixture", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 },
      caveat: "Concept massing is a screening visualization, not an architectural design or approved plan."
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
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}&intent=demo`);
  const demoAccess = page.getByRole("button", { name: "Open demo access" });
  await expect.poll(async () => {
    return new URL(page.url()).pathname === nextPath || await demoAccess.isVisible().catch(() => false);
  }, { timeout: 10_000, intervals: [50, 100, 250] }).toBe(true);
  if (new URL(page.url()).pathname === nextPath) return;
  await expect(demoAccess).toBeVisible();
  await demoAccess.click();
  await page.getByRole("button", { name: "Open demo", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === nextPath);
}

async function expectFindDrawerGeometry(page: Page, checkMapAlignment = false) {
  const drawer = page.getByTestId("find-drawer");
  const scrollRegion = page.getByTestId("find-scroll-region");
  const footer = page.getByTestId("find-sticky-footer");
  const cta = page.getByTestId("find-search-cta");
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
}

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
      expect(await chevron.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);

      await page.getByRole("tab", { name: locale === "ru" ? "Поиск" : "Find", exact: true }).click();
      for (const testId of [
        "point-object-find-role-select",
        "point-object-find-scenario-select",
        "point-object-find-group-select"
      ]) {
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
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill("Shangri");
  await page.getByRole("option", { name: /Shangri-La exact search result/ }).click();
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
    { width: 1710, height: 877, drawerWidth: 430, stacked: false },
    { width: 1440, height: 720, drawerWidth: 430, stacked: false },
    { width: 1280, height: 900, drawerWidth: 430, stacked: false },
    { width: 1024, height: 768, drawerWidth: 430, stacked: false },
    { width: 1024, height: 1366, drawerWidth: 430, stacked: false },
    { width: 1023, height: 720, drawerWidth: 491.04, stacked: false },
    { width: 720, height: 450, drawerWidth: 345.6, stacked: false },
    { width: 640, height: 450, drawerWidth: 340, stacked: false },
    { width: 639, height: 450, drawerWidth: 639, stacked: true },
    { width: 834, height: 1112, drawerWidth: 834, stacked: true },
    { width: 390, height: 844, drawerWidth: 390, stacked: true }
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
      if (viewport.stacked) {
        expect(Math.abs(geometry.mapWidth - viewport.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.drawerLeft)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.drawerTop - geometry.mapBottom)).toBeLessThanOrEqual(1);
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
        await page.locator("main aside > div").evaluate((element) => { element.scrollTop = 0; });
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
  await page.goto("/prototype/point-to-object");
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
  expect(searchSelection.object.geometry.type).toBe("Point");

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
  const firstCandidate = page.getByRole("listitem").filter({ hasText: "Marina Candidate One" });
  const secondCandidate = page.getByRole("listitem").filter({ hasText: "Marina Candidate Two" });
  await firstCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await secondCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await expect(page.getByTestId("find-comparison-grid").getByRole("article")).toHaveCount(2);
  await expect(page.getByTestId("find-comparison-grid")).toContainText("Dubai Marina");
  await expect(page.getByTestId("find-comparison-grid")).toContainText("Jumeirah Lakes Towers");
  const findCallsBeforeReopen = findPostRequests.length;
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("geoai:point-to-object:projects:v1:")))).toBe(true);
  await page.goto("/projects?view=spatial");
  await expect(page.getByTestId("point-object-projects-page")).toBeVisible();
  await expect(page.getByText("Storage mode: on this device.")).toBeVisible();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId("saved-project-card").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reopen without rerunning" }).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Проекты GeoAI" })).toBeVisible();
  await expect(page.getByText("Режим хранения: на этом устройстве.")).toBeVisible();
  await page.getByRole("button", { name: "en", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Reopen without rerunning" }).first().click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object$/);
  await expect(page.getByRole("tab", { name: "Find", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("find-comparison-grid").getByRole("article")).toHaveCount(2);
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
  await page.getByRole("article").filter({ hasText: "Marina Candidate One" }).getByRole("button", { name: "Open analysis" }).click();
  await expect(page.getByText("Marina Candidate One", { exact: true }).first()).toBeVisible();
  await expect.poll(() => contextRequests.at(-1)?.expectedSourceFeatureId).toBe("way/2001");
  expect(contextRequests.at(-1)?.expectedSourceFeatureId).toBe("way/2001");
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null")?.object?.sourceFeatureId)).toBe("way/2001");
  const findSelection = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null"));
  expect(findSelection.object.sourceFeatureId).toBe("way/2001");
  expect(findSelection.object.geometry.type).toBe("Point");
  expect(JSON.stringify(findSelection.object.geometry).length).toBeLessThan(100);

  const emptyQuestion = page.getByRole("textbox", { name: "What would you like to know?" });
  await expect(emptyQuestion).toHaveValue("");
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled();
  await emptyQuestion.press("Control+Enter");
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
  await expect(page.getByRole("link", { name: "Data sources" })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to map" }).click();
  await page.getByRole("tab", { name: "Find" }).click();
  await expect(page.getByText("Showing 3", { exact: true })).toBeVisible();
  await expect(page.getByTestId("find-result-stale")).toHaveText("Stale");
  await expect(page.getByTestId("find-search-cta")).toHaveText("Update search");
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

test("Create A/B and mobile profile remain coherent offline", async ({ page }, testInfo) => {
  createPostRequests.length = 0;
  areaContextPostRequests = 0;
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
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
  await expect(page.getByTestId("generated-concept-metrics")).toContainText("Generated blocks2");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("create-alternative-b.png") });
  expect(createPostRequests).toHaveLength(1);
  const areaContextCallsBeforeReopen = areaContextPostRequests;
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    const store = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
    return store?.projects?.[0]?.artifacts?.some((artifact: { kind?: string; payload?: { generated?: { mode?: string; generatedAt?: string; promptVersion?: string } } }) =>
      artifact.kind === "create" && artifact.payload?.generated?.mode === "openai_concept" &&
      Boolean(artifact.payload.generated.generatedAt) && Boolean(artifact.payload.generated.promptVersion));
  })).toBe(true);
  await page.goto("/projects?view=spatial");
  await page.getByRole("button", { name: "Reopen without rerunning" }).first().click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object$/);
  await expect(page.getByRole("tab", { name: "Create", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  await expect(page.getByTestId("create-alternative-b")).toHaveAttribute("aria-selected", "true");
  expect(createPostRequests).toHaveLength(1);
  expect(areaContextPostRequests).toBe(areaContextCallsBeforeReopen);
  await page.getByTestId("create-alternative-a").click();
  expect(createPostRequests).toHaveLength(1);
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
  await generateConcept.click();
  // The prior summary deliberately remains visible during regeneration, so it
  // cannot signal completion of the new request.
  await expect.poll(() => createPostRequests.length).toBe(2);
  await expect(generateConcept).toHaveText("Already generated");
  await expect(generateConcept).toBeDisabled();
  expect([...(createPostRequests[1]?.lockedControlKeys as string[])].sort()).toEqual(
    ["blockCount", "levelsMin", "levelsMax", "targetSiteCoveragePct", "openSpacePct", "setbackM"].sort());
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

  await signInDemo(page, "/profile");
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

  await expect(page.getByText("Retry in 30s.")).toBeVisible();
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
