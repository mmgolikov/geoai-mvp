import { expect, test, type Page, type Route } from "@playwright/test";

const sha256 = "a".repeat(64);
const acquiredAt = "2026-09-04T09:00:00.000Z";
const contextRequests: Array<Record<string, unknown>> = [];

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
    observedTags: { name: label, landuse: "construction" },
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

async function installOfflineRoutes(page: Page) {
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
        layers: [{ id: "background", type: "background", paint: { "background-color": "#e8edf0" } }]
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
  await page.route("**/api/prototype/point-to-object/area-context", (route) => json(route, {
    protocol: "POINT_TO_OBJECT_001_AREA_CONTEXT_V1",
    mode: "results",
    features: [],
    summary: { sampleSize: 2, mappedBuildingCount: 2, mappedLevelsKnownCount: 1, medianMappedLevels: 6, groups: [{ group: "residential", count: 2 }] },
    coverage: { capReached: false }
  }));
  await page.route("**/api/prototype/point-to-object/create", async (route) => {
    if (route.request().method() === "GET") {
      await json(route, { mode: "ready", challenge: "A".repeat(43) });
      return;
    }
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
            properties: { id: "concept-1", kind: "concept_massing", templateId: "residential_mixed_use", use: "residential", levels: 8, heightM: 27.2, baseM: 0, label: "Concept 1" },
            geometry: { type: "Polygon", coordinates: [[[55.2702, 25.2052], [55.2705, 25.2052], [55.2705, 25.2055], [55.2702, 25.2055], [55.2702, 25.2052]]] }
          }]
        },
        requestedBlockCount: 1,
        generatedBlockCount: 1,
        aoiAreaSqM: 2_500,
        generatedFootprintAreaSqM: 950,
        achievedSiteCoveragePct: 38,
        seed: "offline-e2e"
      },
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
  const redirected = await page.waitForURL((url) => url.pathname === nextPath, { timeout: 2_000 }).then(() => true, () => false);
  if (redirected) return;
  await page.getByRole("button", { name: "Open demo access" }).click();
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

test("V5.1 keeps exact identity, Find lineage, Create A/B and mobile profile coherent offline", async ({ page }) => {
  contextRequests.length = 0;
  const unexpectedExternal = await installOfflineRoutes(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/prototype/point-to-object");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill("Shangri");
  await expect(page.getByRole("option", { name: /Shangri-La exact search result/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.getByText("Exact OpenStreetMap object")).toBeVisible();
  await expect(page.getByText("way/1001", { exact: true })).toBeVisible();
  expect(contextRequests.at(-1)?.expectedSourceFeatureId).toBe("way/1001");
  const searchSelection = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null"));
  expect(searchSelection.object.sourceFeatureId).toBe("way/1001");
  expect(searchSelection.object.geometry.type).toBe("Point");

  await page.getByRole("tab", { name: "Find" }).click();
  await page.getByRole("button", { name: "Search this view" }).click();
  await expect(page.getByTestId("find-result-lineage")).toContainText("OpenStreetMap · Overpass API");
  await expect(page.getByTestId("find-result-lineage")).toContainText("ODbL-1.0");
  await expect(page.getByTestId("find-result-lineage")).toContainText("Query extent:");
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  const firstCandidate = page.getByRole("listitem").filter({ hasText: "Marina Candidate One" });
  const secondCandidate = page.getByRole("listitem").filter({ hasText: "Marina Candidate Two" });
  await firstCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await secondCandidate.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).first().click();
  await expect(page.getByText("Sample lineage")).toBeVisible();
  await expect(page.getByText(/SHA-256 aaaaaaaaaaaaaaaa/)).toBeVisible();
  await page.getByRole("article").filter({ hasText: "Marina Candidate One" }).getByRole("button", { name: "Open analysis" }).click();
  await expect(page.getByText("Marina Candidate One", { exact: true }).first()).toBeVisible();
  await expect.poll(() => contextRequests.at(-1)?.expectedSourceFeatureId).toBe("way/2001");
  expect(contextRequests.at(-1)?.expectedSourceFeatureId).toBe("way/2001");
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null")?.object?.sourceFeatureId)).toBe("way/2001");
  const findSelection = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null"));
  expect(findSelection.object.sourceFeatureId).toBe("way/2001");
  expect(findSelection.object.geometry.type).toBe("Point");
  expect(JSON.stringify(findSelection.object.geometry).length).toBeLessThan(100);

  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object\/analysis$/);
  await page.getByRole("link", { name: "Back to map" }).click();
  await page.getByRole("tab", { name: "Find" }).click();
  await expect(page.getByText("Sample lineage")).toBeVisible();
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
  await page.getByTestId("find-data-methodology").click();
  const methodologyPanel = page.getByTestId("find-methodology-panel");
  await expect(methodologyPanel).toBeVisible();
  const methodologyGeometry = await methodologyPanel.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      bottomReached: Math.ceil(element.scrollTop + element.clientHeight) >= element.scrollHeight
    };
  });
  expect(methodologyGeometry.clientHeight).toBeGreaterThan(0);
  expect(methodologyGeometry.scrollHeight).toBeGreaterThan(methodologyGeometry.clientHeight);
  expect(methodologyGeometry.bottomReached).toBe(true);
  await expect(methodologyPanel.getByText("© OpenStreetMap contributors.")).toBeVisible();
  await page.getByTestId("find-data-methodology").click();
  await expect(page.getByText("Pan or zoom the map, then use Find to search the visible area. Map clicks do not select objects in this mode.")).toBeAttached();
  await page.locator(".maplibregl-canvas").click({ position: { x: 200, y: 150 }, force: true });
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null")?.object?.sourceFeatureId)).toBe("way/2001");

  await page.getByRole("tab", { name: "Create" }).click();
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
  await expect(page.getByText("Objects inside the polygon")).toBeVisible();
  await page.getByRole("button", { name: "Generate concept" }).click();
  await expect(page.getByText("Concept ready")).toBeVisible();
  const showExisting = page.getByRole("button", { name: "Show existing" });
  await expect(showExisting).toBeVisible();
  await showExisting.click();
  await expect(page.getByRole("button", { name: "Show concept" })).toBeVisible();
  await expect(page.getByText("Concept ready")).toBeVisible();
  await page.getByRole("button", { name: "Show concept" }).click();
  await expect(page.getByRole("button", { name: "Show existing" })).toBeVisible();
  await page.getByRole("button", { name: "Reset concept" }).click();
  await expect(page.getByText("Concept ready")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear 3D" })).toBeVisible();

  await signInDemo(page, "/profile");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "ru", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ваш профиль" })).toBeVisible();
  await page.getByRole("button", { name: "B2C", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Роль по умолчанию" })).toHaveValue("tourist");
  await page.getByRole("button", { name: "B2B", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Роль по умолчанию" })).toHaveValue("developer");
  await expect(page.getByRole("link", { name: "Вернуться к карте" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(unexpectedExternal).toEqual([]);
});
