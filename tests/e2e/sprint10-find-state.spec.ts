import { expect, test, type Page, type Route } from "@playwright/test";
import { sessionMissingFixture } from "./helpers/auth-persona";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
let findCalls = 0;

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installRoutes(page: Page) {
  await page.route(/^https:\/\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      return json(route, {
        version: 8,
        name: "Sprint 10 Find state",
        sources: { openmaptiles: { type: "vector", tiles: ["https://tiles.openfreemap.org/e2e/{z}/{x}/{y}.pbf"] } },
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#e8edf0" } },
          { id: "building", type: "fill", source: "openmaptiles", "source-layer": "building", paint: { "fill-color": "#c8d1d0" } }
        ]
      });
    }
    if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/e2e/")) {
      return route.fulfill({ status: 200, contentType: "application/x-protobuf", body: Buffer.alloc(0) });
    }
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/auth/session", (route) => json(route, sessionMissingFixture));
  await page.route("**/api/auth/logout", (route) => json(route, { ok: true }));
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    findCalls += 1;
    const request = route.request().postDataJSON() as Record<string, unknown>;
    const candidate = {
      sourceFeatureId: "way/72001",
      sourceElementType: "way",
      sourceElementId: "72001",
      label: "Overlapping Candidate",
      name: "Overlapping Candidate",
      longitude: 55.2704,
      latitude: 25.2054,
      group: "construction",
      matchedTag: { key: "landuse", value: "construction" },
      mappedBuildingLevels: 8,
      observedTags: { name: "Overlapping Candidate", landuse: "construction" },
      evidenceClass: "observed_in_open_map_source"
    };
    await json(route, {
      protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",
      mode: "results",
      criteria: request,
      candidates: [candidate],
      ordering: "source_identity_ascending_not_ranked",
      coverage: {
        kind: "bounded_open_map_sample",
        approximateAreaSqKm: 1,
        upstreamElementCount: 1,
        normalizedCandidateCount: 1,
        returnedCandidateCount: 1,
        upstreamQueryLimit: 80,
        capReached: false,
        completeInventory: false,
        mappedLevelsPolicy: request.mappedMinimumLevels === null ? "not_requested" : "strict_explicit_building_levels_tag_only"
      },
      source: {
        name: "OpenStreetMap",
        service: "Overpass API",
        sourceResponseHash: (findCalls === 1 ? "a" : "b").repeat(64),
        observedAt: null,
        acquiredAt: "2026-09-18T15:00:00.000Z",
        freshness: "runtime_response_feature_time_unavailable",
        licenceId: "ODbL-1.0",
        attribution: "© OpenStreetMap contributors",
        licenceUrl: "https://www.openstreetmap.org/copyright",
        usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",
        officialStatus: "open_context_not_official",
        runtimeNetworkUsed: true,
        persistenceUsed: false
      },
      limitations: ["Bounded deterministic test result."],
      caveat
    });
  });
}

async function signInDemo(page: Page) {
  await page.goto("/login?next=%2Fworkspace&intent=demo");
  const access = page.getByRole("button", { name: "Open demo access" });
  if (await access.isVisible().catch(() => false)) {
    await access.click();
    await page.getByRole("button", { name: "Open demo", exact: true }).click();
  }
  await expect(page).toHaveURL((url) => url.pathname === "/workspace");
  await page.goto("/prototype/point-to-object");
}

async function projectStore(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    return key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
  });
}

test("Reset and delayed overlapping Find save never mutate the prior saved cohort", async ({ page }) => {
  findCalls = 0;
  await installRoutes(page);
  await page.addInitScript(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let release: (() => void) | null = null;
    let delayNext = false;
    const state = {
      delay() { delayNext = true; },
      release() { release?.(); release = null; }
    };
    Object.defineProperty(window, "__findDigestGate", { value: state });
    Object.defineProperty(crypto.subtle, "digest", {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto["digest"]>) => {
        if (delayNext) {
          delayNext = false;
          await new Promise<void>((resolve) => { release = resolve; });
        }
        return original(...args);
      }
    });
  });
  await signInDemo(page);
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  const cta = page.getByTestId("find-search-cta");
  await cta.click();
  await expect(page.getByText("Showing 1", { exact: true })).toBeVisible();
  await expect.poll(async () => (await projectStore(page))?.projects?.[0]?.artifacts?.length ?? 0).toBe(1);
  const candidate = page.getByRole("listitem").filter({ hasText: "Overlapping Candidate" });
  await candidate.getByRole("button", { name: "Compare", exact: true }).click();
  await expect.poll(async () => (await projectStore(page))?.projects?.[0]?.artifacts?.[0]?.payload?.session?.shortlist?.length ?? 0).toBe(1);
  const prior = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"))!;
    const store = JSON.parse(localStorage.getItem(key)!);
    const artifact = store.projects[0].artifacts[0];
    return { artifactId: artifact.artifactId, bytes: JSON.stringify(artifact) };
  });

  await page.evaluate(() => (window as unknown as { __findDigestGate: { delay(): void } }).__findDigestGate.delay());
  await page.getByLabel("Levels from").fill("2");
  await expect(cta).toHaveText("Update search");
  await expect(candidate.locator("button").first()).toBeDisabled();
  await expect(candidate.getByRole("button", { name: "Open analysis", exact: true })).toBeDisabled();
  await expect(candidate.getByRole("button", { name: "Selected", exact: true })).toBeDisabled();
  await cta.click();
  await expect.poll(() => findCalls).toBe(2);
  await expect(page.getByText("Showing 1", { exact: true })).toBeVisible();
  await candidate.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByTestId("find-reset-results").click();
  await expect(page.getByText("Showing 1", { exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { __findDigestGate: { release(): void } }).__findDigestGate.release());
  await expect.poll(async () => (await projectStore(page))?.projects?.[0]?.artifacts?.length ?? 0).toBe(2);
  const priorAfter = await page.evaluate((artifactId) => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"))!;
    const store = JSON.parse(localStorage.getItem(key)!);
    const artifact = store.projects
      .flatMap((project: { artifacts: Array<{ artifactId: string }> }) => project.artifacts)
      .find((item: { artifactId: string }) => item.artifactId === artifactId);
    return artifact ? JSON.stringify(artifact) : null;
  }, prior.artifactId);
  expect(priorAfter).toBe(prior.bytes);
});
