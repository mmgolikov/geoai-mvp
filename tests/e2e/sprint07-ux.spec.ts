import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  declaredAuthPersona,
  expectProtectedEntryDeniedWithoutByteMutation,
  sessionMissingFixture
} from "./helpers/auth-persona";
import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

const identity = "demo:demo-user-geoai";
const storageKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(identity)}`;
const restoreKey = "geoai:point-to-object:project-restore:v1";
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const nativeDeadlineCallsKey = "__geoaiSprint07NativeDeadlineCalls";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function findArtifact(inputOptions: { artifactId?: string; marketKey?: "dubai" | "singapore"; longitude?: number; latitude?: number; label?: string } = {}) {
  const artifactId = inputOptions.artifactId ?? "artifact-sprint07-find";
  const marketKey = inputOptions.marketKey ?? "dubai";
  const longitude = inputOptions.longitude ?? 55.27;
  const latitude = inputOptions.latitude ?? 25.2;
  const label = inputOptions.label ?? "Saved bounded site";
  const bounds = marketKey === "singapore" ? [103.81, 1.30, 103.83, 1.32] : [55.26, 25.19, 55.28, 25.21];
  const candidate = {
    sourceFeatureId: artifactId === "artifact-sprint07-find" ? "way/701" : "way/702", sourceElementType: "way", sourceElementId: artifactId === "artifact-sprint07-find" ? "701" : "702", label, name: label,
    longitude, latitude, group: "construction", matchedTag: { key: "landuse", value: "construction" }, mappedBuildingLevels: null,
    observedTags: { landuse: "construction", name: label }, evidenceClass: "observed_in_open_map_source"
  };
  const input = {
    kind: "find", locale: "en", marketKey, payload: { session: {
      version: 1, marketKey, locale: "en", audience: "b2b", role: "developer", scenario: "b2b_redevelopment_selected_aoi", group: "construction", mappedMinimumLevels: "", mappedMaximumLevels: "", shortlist: [], comparisonOpen: false, analysisTargetSourceFeatureId: null, updatedAt: "2026-09-10T10:00:00.000Z",
      result: {
        protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results", criteria: { marketKey, locale: "en", bounds, group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 }, candidates: [candidate], ordering: "source_identity_ascending_not_ranked",
        coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 4.47, upstreamElementCount: 1, normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
        source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "7".repeat(64), observedAt: null, acquiredAt: "2026-09-10T10:00:00.000Z", freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
        limitations: ["Offline Sprint07 fixture."], caveat
      }
    } }
  };
  return { ...input, label: `${label} Find result`, schemaVersion: 1, artifactId, idempotencyKey: `operation-${artifactId}`, payloadHash: createHash("sha256").update(canonical(input)).digest("hex"), completedAt: "2026-09-10T10:00:00.000Z", updatedAt: "2026-09-10T10:00:00.000Z", viewRevision: 2 };
}

function storeFixture(options: { sameCoordinate?: boolean } = {}) {
  const artifacts = options.sameCoordinate
    ? [
      findArtifact(),
      findArtifact({ artifactId: "artifact-sprint07-same-coordinate", label: "Second saved bounded site" })
    ]
    : [
      findArtifact(),
      findArtifact({ artifactId: "artifact-sprint07-singapore", marketKey: "singapore", longitude: 103.82, latitude: 1.31, label: "Saved Singapore site" })
    ];
  return {
    schemaVersion: 1, identityKey: identity, activeProjectId: "project-sprint07", projects: [{
      schemaVersion: 1, projectId: "project-sprint07", name: "Sprint07 local project", storageMode: "browser_local_on_this_device", createdAt: "2026-09-10T10:00:00.000Z", updatedAt: "2026-09-10T10:00:00.000Z", artifacts
    }]
  };
}

function contextSubject(sourceFeatureId: string, name = "Exact mapped object") {
  return {
    name,
    address: `${name}, Dubai, United Arab Emirates`,
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
      districtCharacter: { code: "commercial_business", confidence: "medium", ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1", driverGroups: ["commercial"] }
    }
  };
}

function autocompleteResult(id: string, label: string) {
  return {
    id,
    label,
    secondaryLabel: "Sheikh Zayed Road, Dubai",
    longitude: 55.271928,
    latitude: 25.208110,
    category: "tourism",
    featureType: "hotel",
    boundingBox: [25.2078, 25.2084, 55.2716, 55.2722]
  };
}

async function installContextAutocomplete(page: Page, resolveContext: (sourceFeatureId: string) => Promise<unknown> | unknown) {
  await page.route("**/api/prototype/point-to-object/suggest", async (route) => {
    const query = (route.request().postDataJSON() as { query?: string } | null)?.query ?? "";
    const second = query.toLowerCase().includes("second");
    const late = query.toLowerCase().includes("late");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        protocol: "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1",
        mode: "results",
        provider: "Photon",
        results: [autocompleteResult(second ? "way/1002" : late ? "way/1003" : "way/1001", second ? "Second exact result" : late ? "First late result" : "First exact result")],
        source: { attribution: "© OpenStreetMap contributors", licenceId: "ODbL-1.0", licenceUrl: "https://www.openstreetmap.org/copyright", serviceUrl: "https://photon.komoot.io/", officialStatus: "open_context_not_official" }
      })
    });
  });
  await page.route("**/api/prototype/point-to-object/context", async (route) => {
    const request = route.request().postDataJSON() as { expectedSourceFeatureId?: string };
    const payload = await resolveContext(request.expectedSourceFeatureId ?? "missing/id");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) }).catch(() => undefined);
  });
}

async function chooseAutocompleteResult(page: Page, query: string) {
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await search.fill(query);
  await expect(page.getByRole("listbox", { name: "Search results" }).getByRole("option")).toBeVisible({ timeout: 30_000 });
  await search.press("ArrowDown");
  await search.press("Enter");
}

async function installNativeOneSecondDeadline(page: Page) {
  await page.addInitScript((counterKey) => {
    const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
    let calls = 0;
    Object.defineProperty(globalThis, counterKey, { configurable: true, get: () => calls });
    Object.defineProperty(AbortSignal, "timeout", {
      configurable: true,
      value: (milliseconds: number) => {
        if (milliseconds !== 30_000) return originalTimeout(milliseconds);
        calls += 1;
        // Keep the engine's native timeout signal. The production flow owns
        // the deadline transition explicitly, then aborts its request controller;
        // this test must not replace either signal with a custom controller.
        return originalTimeout(1_000);
      }
    });
  }, nativeDeadlineCallsKey);
}

async function expectNativeDeadlineCalls(page: Page, expected: number) {
  await expect.poll(() => page.evaluate((counterKey) => (globalThis as Record<string, unknown>)[counterKey], nativeDeadlineCallsKey)).toBe(expected);
}

async function installOfflineHub(page: Page, store = storeFixture(), options: { mockSession?: boolean } = {}) {
  await installLoopbackBrowserHarness(page, test.info().project.use.browserName, test.info().project.use.baseURL);
  await page.route(externalHttpUrlPattern(test.info().project.use.baseURL), async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await route.fulfill({ json: { version: 8, name: "Sprint07 offline map", sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8edf0" } }] } });
      return;
    }
    await route.abort();
  });
  await page.addInitScript(({ key, store, mockSession }) => {
    if (mockSession) localStorage.setItem("geoai-mock-demo-session-v1", "active");
    localStorage.setItem(key, store);
  }, { key: storageKey, store: JSON.stringify(store), mockSession: options.mockSession ?? true });
}

async function expectProjectMarkersInsideCanvas(page: Page) {
  // Container layout, MapLibre's transform resize and marker DOM projection
  // settle on separate render events. Keep all strict geometry assertions, but
  // wait for that bounded lifecycle instead of sampling stale desktop pixels.
  await expect(async () => {
    const positions = await page.locator("[data-project-result-marker]").evaluateAll((nodes) => {
      const canvas = document.querySelector("[data-testid='live-map-canvas']");
      const map = canvas?.getBoundingClientRect();
      if (!map) return [];
      return nodes.map((node) => {
        const marker = node.getBoundingClientRect();
        return {
          id: node.getAttribute("data-project-result-marker"),
          left: marker.left,
          right: marker.right,
          top: marker.top,
          bottom: marker.bottom,
          mapLeft: map.left,
          mapRight: map.right,
          mapTop: map.top,
          mapBottom: map.bottom
        };
      });
    });
    expect(positions).toHaveLength(2);
    for (const marker of positions) {
      expect(marker.left, `${marker.id} left edge`).toBeGreaterThanOrEqual(marker.mapLeft);
      expect(marker.right, `${marker.id} right edge`).toBeLessThanOrEqual(marker.mapRight);
      expect(marker.top, `${marker.id} top edge`).toBeGreaterThanOrEqual(marker.mapTop);
      expect(marker.bottom, `${marker.id} bottom edge`).toBeLessThanOrEqual(marker.mapBottom);
    }
  }).toPass({ timeout: 5_000 });
}

test("Sprint07: a verified saved Find result reopens owner-scoped through reload without a new Find request", async ({ page }) => {
  let findRequests = 0;
  await installOfflineHub(page);
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    findRequests += 1;
    await route.abort();
  });
  await page.goto("/projects");
  const card = page.getByTestId("saved-result-card").filter({ hasText: "Saved bounded site" });
  await expect(card).toContainText("View revision 3");
  await card.getByRole("button", { name: "Show on map", exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object$/);
  await expect(page.getByTestId("find-drawer")).toContainText("Saved bounded site");
  await expect.poll(() => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? "null")?.artifactId, restoreKey)).toBe("artifact-sprint07-find");
  await page.reload();
  await expect(page.getByTestId("find-drawer")).toContainText("Saved bounded site");
  expect(findRequests).toBe(0);
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null").projects[0].artifacts.length, storageKey)).toBe(2);
});

test("Sprint07: Project Hub overview clears the active canvas only, shows every saved location, and opens one exact result", async ({ page }, testInfo) => {
  await installOfflineHub(page);
  await page.goto("/projects");
  const primaryNavigation = page.getByRole("navigation", { name: "Primary product navigation" });
  await expect(primaryNavigation.getByRole("link", { name: "Workspace", exact: true })).toHaveAttribute("href", "/prototype/point-to-object");
  const commonHeaderControls = await Promise.all([
    page.getByRole("link", { name: "Projects", exact: true }).boundingBox(),
    page.getByRole("link", { name: "Open demo profile", exact: true }).boundingBox()
  ]);
  for (const control of commonHeaderControls) {
    expect(control?.height).toBeGreaterThanOrEqual(44);
    expect(control?.width).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByRole("button", { name: "Open map", exact: true })).toBeVisible();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), restoreKey)).toBeNull();
  await page.evaluate(({ key, owner }) => sessionStorage.setItem(key, JSON.stringify({ schemaVersion: 1, identityKey: owner, artifactId: "artifact-sprint07-find" })), { key: restoreKey, owner: identity });
  await expect.poll(() => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? "null")?.artifactId, restoreKey)).toBe("artifact-sprint07-find");
  await page.getByRole("button", { name: "Open map", exact: true }).click();
  await expect(page).toHaveURL(/\/prototype\/point-to-object$/);
  await expect(page.locator("[data-project-result-marker]")).toHaveCount(2);
  await expect(page.locator("[data-project-result-marker='artifact-sprint07-find']")).toBeVisible();
  await expect(page.locator("[data-project-result-marker='artifact-sprint07-singapore']")).toBeVisible();
  await expectProjectMarkersInsideCanvas(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expectProjectMarkersInsideCanvas(page);
  await expect(page.getByTestId("project-storage-location")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New local project", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("project-overview-1440x900.png") });
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.getByTestId("mobile-workspace-shell")).toHaveAttribute("data-sheet", "peek");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await expectProjectMarkersInsideCanvas(page);
  await page.screenshot({ path: testInfo.outputPath("project-overview-393x852.png") });
  // Repeat the wide-to-phone cycle: a one-time initial overview fit is not
  // sufficient when the user rotates/resizes an already mounted map.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 393, height: 852 }]) {
    await page.setViewportSize(viewport);
    await expectProjectMarkersInsideCanvas(page);
  }
  // The prior exact restore receipt remains untouched; the overview intent wins
  // only for this canvas and never mutates the locally saved artifacts.
  await expect.poll(() => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? "null")?.artifactId, restoreKey)).toBe("artifact-sprint07-find");
  await page.locator("[data-project-result-marker='artifact-sprint07-find']").click();
  await expect(page.getByTestId("find-drawer")).toContainText("Saved bounded site");
});

test("Sprint07: Find map marker focuses its numbered result rather than starting Analyse", async ({ page }) => {
  await installOfflineHub(page);
  let findRequests = 0;
  await page.route("**/api/prototype/point-to-object/find", async (route) => { findRequests += 1; await route.abort(); });
  await page.goto("/projects");
  await page.getByTestId("saved-result-card").filter({ hasText: "Saved bounded site" }).getByRole("button", { name: "Show on map", exact: true }).click();
  await expect(page.getByTestId("find-drawer")).toBeVisible();
  const marker = page.locator("[data-find-result-marker='way/701']");
  await expect(marker).toBeVisible();
  const originalMarkerNode = await marker.elementHandle();
  expect(originalMarkerNode).not.toBeNull();
  const expectOriginalMarkerNode = async () => {
    expect(await marker.evaluate((current, original) => current === original, originalMarkerNode!)).toBe(true);
  };
  await marker.click();
  await expect(page.getByRole("tab", { name: "Find", exact: true })).toHaveAttribute("aria-selected", "true");
  const exactResult = page.locator("#find-result-way\\/701");
  await expect(exactResult).toBeFocused();
  await expect(marker).toHaveAttribute("data-active", "true");
  await expectOriginalMarkerNode();
  await marker.focus();
  await expect(marker).toBeFocused();
  await expect(marker).toHaveAttribute("data-hovered", "true");
  await expectOriginalMarkerNode();
  await page.keyboard.press("Enter");
  await expect(exactResult).toBeFocused();
  await expect(marker).toHaveAttribute("data-active", "true");
  await expectOriginalMarkerNode();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(marker).toHaveAttribute("data-shortlisted", "true");
  await expectOriginalMarkerNode();
  await page.getByRole("button", { name: "Selected", exact: true }).click();
  await expect(marker).toHaveAttribute("data-shortlisted", "false");
  await expectOriginalMarkerNode();
  // Marker focus and Fit are passive camera inspection: neither action commits
  // new search criteria or makes the saved result stale.
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  await expect(page.getByTestId("find-search-cta")).toHaveText("Search");
  await expect(page.getByTestId("point-object-find-group-select")).toHaveValue("construction");
  await expect(page.getByRole("textbox", { name: "Levels from", exact: true })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Levels to", exact: true })).toHaveValue("");
  await expect(page.getByTestId("find-search-cta")).toBeEnabled();
  await expect(marker).toBeVisible();
  await expect(page.getByTestId("find-fit-results")).toBeVisible();
  await page.getByTestId("find-fit-results").click();
  await expect(page.getByTestId("find-result-stale")).toHaveCount(0);
  await expect(page.getByTestId("find-search-cta")).toBeEnabled();
  await expect(marker).toBeVisible();
  await expect(page.getByTestId("find-fit-results")).toBeVisible();
  await marker.click();
  const useCurrentArea = page.getByTestId("find-use-current-map-area");
  await expect(useCurrentArea).toBeVisible();
  await useCurrentArea.click();
  await expect(page.getByTestId("find-result-stale")).toBeVisible();
  await expect(page.getByTestId("find-search-cta")).toHaveText("Update search");
  await page.getByRole("textbox", { name: "Levels from", exact: true }).fill("1");
  await expect(marker).toHaveCount(0);
  await expect(page.getByTestId("find-fit-results")).toHaveCount(0);
  await expect(page.getByTestId("find-result-stale")).toBeVisible();
  await page.getByRole("textbox", { name: "Levels from", exact: true }).fill("");
  await expect(marker).toBeVisible();
  await expect(page.getByTestId("find-fit-results")).toBeVisible();
  expect(findRequests).toBe(0);
});

test("Sprint07: a stacked project marker opens an exact saved result only after the user chooses it", async ({ page }) => {
  await installOfflineHub(page, storeFixture({ sameCoordinate: true }));
  await page.goto("/projects");
  await page.getByRole("button", { name: "Open map", exact: true }).click();
  await page.setViewportSize({ width: 393, height: 852 });
  const groupedMarker = page.locator("[data-project-result-group]");
  await expect(groupedMarker).toHaveAttribute("aria-label", "2 saved results at this location");
  await groupedMarker.click();
  const picker = page.getByTestId("project-location-picker");
  await expect(picker).toHaveAttribute("role", "dialog");
  await expect(picker).toHaveAccessibleName("Saved results at this location");
  await expect(picker.locator("[data-project-location-result]")).toHaveCount(2);
  const rects = await Promise.all([picker.boundingBox(), page.getByTestId("live-map-canvas").boundingBox()]);
  expect(rects[0]).not.toBeNull();
  expect(rects[1]).not.toBeNull();
  expect(rects[0]!.x).toBeGreaterThanOrEqual(rects[1]!.x);
  expect(rects[0]!.y).toBeGreaterThanOrEqual(rects[1]!.y);
  expect(rects[0]!.x + rects[0]!.width).toBeLessThanOrEqual(rects[1]!.x + rects[1]!.width);
  expect(rects[0]!.y + rects[0]!.height).toBeLessThanOrEqual(rects[1]!.y + rects[1]!.height);
  const close = picker.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(groupedMarker).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(picker).toBeVisible();
  await picker.locator("[data-project-location-result='artifact-sprint07-same-coordinate']").click();
  await expect(page.getByTestId("find-drawer")).toContainText("Second saved bounded site");
  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Open map", exact: true }).click();
  await page.locator("[data-project-result-group]").click();
  await page.locator("[data-project-location-result='artifact-sprint07-find']").click();
  await expect(page.getByTestId("find-drawer")).toContainText("Saved bounded site");
});

test("Sprint07: a context deadline is recoverable and preserves the question", async ({ page }) => {
  await installOfflineHub(page);
  await installNativeOneSecondDeadline(page);
  let requests = 0;
  await installContextAutocomplete(page, async (sourceFeatureId) => {
    requests += 1;
    if (requests === 1) {
      // Let the client deadline win, then let the intercepted request finish so
      // Playwright can close the page without a dangling route handler.
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      return { mode: "resolved", subject: contextSubject(sourceFeatureId, "Too-late first result") };
    }
    return { mode: "resolved", subject: contextSubject(sourceFeatureId, "Recovered exact result") };
  });
  await page.goto("/prototype/point-to-object");
  const openTask = page.getByRole("button", { name: "Open task", exact: true });
  if (await openTask.isVisible()) await openTask.click();
  await page.locator("#point-object-question").fill("Keep this question after a deadline");
  const showMap = page.getByRole("button", { name: "Show map", exact: true });
  if (await showMap.isVisible()) await showMap.click();
  await chooseAutocompleteResult(page, "First");
  await expectNativeDeadlineCalls(page, 1);
  await expect(page.getByRole("alert").filter({ hasText: "Source did not respond in time." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolving location…", exact: true })).toHaveCount(0);
  await expect(page.locator("#point-object-question")).toHaveValue("Keep this question after a deadline");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled();
  await expectNativeDeadlineCalls(page, 2);
  expect(requests).toBe(2);
});

test("Sprint07: a locally cancelled late context cannot overwrite the next selected object", async ({ page }) => {
  await installOfflineHub(page);
  let firstRouteSettled = false;
  await installContextAutocomplete(page, async (sourceFeatureId) => {
    if (sourceFeatureId === "way/1003") {
      await new Promise((resolve) => setTimeout(resolve, 450));
      firstRouteSettled = true;
      return { mode: "resolved", subject: contextSubject(sourceFeatureId, "Stale first result") };
    }
    return { mode: "resolved", subject: contextSubject(sourceFeatureId, "Second exact result") };
  });
  await page.goto("/prototype/point-to-object");
  await chooseAutocompleteResult(page, "First late");
  // The context debounce is 250ms: let the first request begin, then change
  // selection before its delayed response arrives.
  await page.waitForTimeout(300);
  await chooseAutocompleteResult(page, "Second");
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled();
  await expect(page.getByText("Second exact result", { exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  expect(firstRouteSettled).toBe(true);
  await expect(page.getByText("Stale first result", { exact: true })).toHaveCount(0);
});

test("auth-persona: public demo Find is ready while protected entry redirects without mutating bytes", async ({ page }, testInfo) => {
  const persona = declaredAuthPersona(testInfo);
  await installOfflineHub(page, storeFixture(), { mockSession: false });
  let sessionGets = 0;
  let findRequests = 0;
  await page.route("**/api/auth/session", async (route) => {
    sessionGets += 1;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(sessionMissingFixture) });
  });
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    findRequests += 1;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(findArtifact().payload.session.result) });
  });
  if (persona === "supabase_auth") {
    await expectProtectedEntryDeniedWithoutByteMutation(page, "/prototype/point-to-object", {
      local: { [storageKey]: JSON.stringify(storeFixture()) },
      session: { "geoai:point-to-object:find:v1": '{"version":1,"protected":"byte-sentinel"}' }
    });
    await expect.poll(() => sessionGets).toBeGreaterThanOrEqual(1);
    expect(findRequests).toBe(0);
    return;
  }
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  const findCta = page.getByTestId("find-search-cta");
  await expect(findCta).toBeEnabled();
  expect(sessionGets).toBe(0);
  await findCta.click();
  await expect(page.getByText("Showing 1", { exact: true })).toBeVisible();
  expect(findRequests).toBe(1);
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:find:v1") ?? "null")?.result?.candidates?.[0]?.label)).toBe("Saved bounded site");
});

test("Sprint07: Find accepts one explicit search only after its 2D camera transition is acknowledged", async ({ page }) => {
  await installOfflineHub(page);
  let findRequests = 0;
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    findRequests += 1;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(findArtifact().payload.session.result) });
  });
  await page.goto("/prototype/point-to-object");
  await expect(page.getByText("Live map ready for object selection.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("map-dimension-control").getByRole("button", { name: "3d", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  const findCta = page.getByTestId("find-search-cta");
  await expect(findCta).toBeDisabled();
  expect(findRequests).toBe(0);
  await expect(findCta).toBeEnabled();
  await findCta.click();
  await expect(page.getByText("Showing 1", { exact: true })).toBeVisible();
  expect(findRequests).toBe(1);
  await page.getByRole("tab", { name: "Analyse", exact: true }).click();
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await expect(findCta).toBeEnabled();
  await findCta.click();
  await expect(page.getByText("Showing 1", { exact: true })).toBeVisible();
  expect(findRequests).toBe(2);
});

test("Sprint07: a collapsed mobile task sheet shows every mode tab without scrolling", async ({ page }, testInfo) => {
  await installOfflineHub(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/prototype/point-to-object");
  const shell = page.getByTestId("mobile-workspace-shell");
  await expect(shell).toHaveAttribute("data-sheet", "peek");
  const task = page.getByRole("complementary", { name: "Task" });
  const tabs = task.getByRole("tablist", { name: "Product mode" });
  await expect(tabs.getByRole("tab")).toHaveCount(3);
  await expect(task.getByRole("button", { name: "Open task", exact: true })).toBeVisible();
  const geometry = await Promise.all([task.boundingBox(), tabs.boundingBox(), page.evaluate(() => ({ height: window.innerHeight, scrollY: window.scrollY }))]);
  const [taskRect, tabsRect, viewport] = geometry;
  if (!taskRect || !tabsRect) throw new Error("Mobile task sheet or its mode tabs are not rendered.");
  expect(viewport.scrollY).toBe(0);
  expect(tabsRect.y).toBeGreaterThanOrEqual(taskRect.y);
  expect(tabsRect.y + tabsRect.height).toBeLessThanOrEqual(taskRect.y + taskRect.height);
  expect(tabsRect.y + tabsRect.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({ path: testInfo.outputPath("mobile-peek-393x852.png") });
});

test("Sprint07: an area-context deadline leaves Create actionable and retries without a new paid request", async ({ page }) => {
  await installOfflineHub(page);
  await installNativeOneSecondDeadline(page);
  let areaRequests = 0;
  await page.route("**/api/prototype/point-to-object/area-context", async (route) => {
    areaRequests += 1;
    if (areaRequests === 1) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ mode: "unavailable", error: "too late" }) }).catch(() => undefined);
      return;
    }
    const request = route.request().postDataJSON();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({
      protocol: "POINT_TO_OBJECT_001_AREA_CONTEXT_V1",
      mode: "results",
      request,
      area: { areaSqM: 2_500, perimeterM: 200, centroid: { longitude: 55.27035, latitude: 25.20535 } },
      features: [{ sourceFeatureId: "way/3001", longitude: 55.27025, latitude: 25.20525, label: "Recovered mapped residence", group: "residential", mappedBuildingLevels: 6, observedTags: { building: "residential" }, inclusionMethod: "returned_center_inside_aoi" }],
      summary: { sampleSize: 1, namedFeatureCount: 1, mappedBuildingCount: 1, mappedLevelsKnownCount: 1, medianMappedLevels: 6, nearestTransitM: null, nearestMajorRoadM: null, groups: [{ group: "residential", count: 1, sharePct: 100 }] },
      coverage: { kind: "bounded_open_map_polygon_sample", inclusionMethod: "returned_center_inside_aoi", geometryCoverage: "centroid_proxy_not_complete_intersection", upstreamElementCount: 1, normalizedInsideCount: 1, returnedFeatureCount: 1, upstreamQueryLimit: 300, featureReturnLimit: 80, capReached: false, completeInventory: false },
      source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "a".repeat(64), observedAt: null, acquiredAt: "2026-09-10T10:00:00.000Z", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
      limitations: ["Offline timeout-recovery fixture."],
      caveat
    }) });
  });
  await page.goto("/prototype/point-to-object");
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  await page.getByLabel("Upload GeoJSON").setInputFiles({
    name: "deadline-aoi.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[55.2701, 25.2051], [55.2705, 25.2051], [55.2705, 25.2055], [55.2701, 25.2051]]] } }))
  });
  await expectNativeDeadlineCalls(page, 1);
  await expect(page.getByRole("alert").filter({ hasText: "Source did not respond in time." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  const areaContext = page.getByTestId("create-area-context-heading").locator("xpath=ancestor::section");
  await expect(areaContext).toContainText("Mapped objects");
  expect(await areaContext.locator("strong").allTextContents()).toEqual(["1", "1", "6"]);
  await expect(areaContext).toContainText("Residential · 1");
  await expect(page.getByTestId("create-edit-area")).toBeVisible();
  await expectNativeDeadlineCalls(page, 2);
  await page.getByRole("tab", { name: "Analyse", exact: true }).click();
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  await expect(areaContext).toContainText("Residential · 1");
  await expect(page.getByTestId("create-edit-area")).toBeVisible();
  expect(areaRequests).toBe(2);
});

test("Sprint07: landing keeps the selected real-map image bounded and action paths usable at review sizes", async ({ page }, testInfo) => {
  await installLoopbackBrowserHarness(page, testInfo.project.use.browserName, testInfo.project.use.baseURL);
  for (const [width, height] of [[1440, 900], [393, 852]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const hero = page.locator("main > section").first();
    const image = hero.locator("img:visible");
    await expect(image).toHaveCount(1);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    const source = decodeURIComponent(await image.evaluate((element: HTMLImageElement) => element.currentSrc));
    expect(source).toContain("/landing/sprint07-workspace-capture.png");
    await expect(hero.getByRole("link", { name: "Open map", exact: true }).first()).toHaveAttribute("href", "/prototype/point-to-object");
    await expect(hero.getByRole("link", { name: "Leave a request", exact: true })).toHaveAttribute("href", "/request-access");
    await expect(hero.getByRole("navigation", { name: "Choose an action for the selected place" }).getByRole("link")).toHaveCount(3);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}x${height}.png`) });
  }
});
