import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

import { externalHttpUrlPattern, installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";

const identity = "demo:demo-user-geoai";
const projectStorageKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(identity)}`;
const browserIdentityKey = "geoai:point-to-object:browser-identity:v1";
const restoreKey = "geoai:point-to-object:project-restore:v1";
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function delayedFindArtifact() {
  const timestamp = "2026-09-19T12:00:00.000Z";
  const candidate = {
    sourceFeatureId: "way/7991", sourceElementType: "way", sourceElementId: "7991",
    label: "Delayed saved result", name: "Delayed saved result", longitude: 55.27, latitude: 25.2,
    group: "construction", matchedTag: { key: "landuse", value: "construction" }, mappedBuildingLevels: null,
    observedTags: { landuse: "construction", name: "Delayed saved result" }, evidenceClass: "observed_in_open_map_source"
  };
  const input = {
    kind: "find", locale: "en", marketKey: "dubai",
    payload: { session: {
      version: 1, marketKey: "dubai", locale: "en", audience: "b2b", role: "developer",
      scenario: "b2b_redevelopment_selected_aoi", group: "construction", mappedMinimumLevels: "", mappedMaximumLevels: "",
      shortlist: [], comparisonOpen: false, comparisonView: "results", analysisTargetSourceFeatureId: null, updatedAt: timestamp,
      result: {
        protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results",
        criteria: { marketKey: "dubai", locale: "en", bounds: [55.26, 25.19, 55.28, 25.21], group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 },
        candidates: [candidate], ordering: "source_identity_ascending_not_ranked",
        coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 4.47, upstreamElementCount: 1, normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
        source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "7".repeat(64), observedAt: null, acquiredAt: timestamp, freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
        limitations: ["Offline restoration-race fixture."], caveat
      }
    } }
  };
  return {
    ...input, label: "Delayed saved result", schemaVersion: 1, artifactId: "artifact-delayed-restore-1",
    idempotencyKey: "operation-delayed-restore-1", payloadHash: createHash("sha256").update(canonical(input)).digest("hex"),
    completedAt: timestamp, updatedAt: timestamp, viewRevision: 0
  };
}

function delayedStore() {
  const artifact = delayedFindArtifact();
  return {
    schemaVersion: 1, identityKey: identity, activeProjectId: "project-delayed-restore-1",
    projects: [{
      schemaVersion: 1, projectId: "project-delayed-restore-1", name: "Delayed restoration project",
      storageMode: "browser_local_on_this_device", createdAt: "2026-09-19T11:59:00.000Z",
      updatedAt: artifact.updatedAt, artifacts: [artifact]
    }]
  };
}

test("delayed owner restore blocks an early Create upload and then reopens the saved result", async ({ page, browserName }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  await installLoopbackBrowserHarness(page, browserName, baseURL);
  await page.route(externalHttpUrlPattern(baseURL), async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "https://tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
      await route.fulfill({ json: { version: 8, name: "Restoration readiness map", sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8edf0" } }] } });
      return;
    }
    await route.abort("blockedbyclient");
  });
  let areaContextRequests = 0;
  await page.route("**/api/prototype/point-to-object/area-context", async (route) => {
    areaContextRequests += 1;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ mode: "unavailable" }) });
  });
  const storeBytes = JSON.stringify(delayedStore());
  await page.addInitScript(({ browserIdentityKey, identity, projectStorageKey, restoreKey, storeBytes }) => {
    localStorage.setItem("geoai-mock-demo-session-v1", "active");
    localStorage.setItem(browserIdentityKey, identity);
    localStorage.setItem(projectStorageKey, storeBytes);
    sessionStorage.setItem(restoreKey, JSON.stringify({ schemaVersion: 1, identityKey: identity, artifactId: "artifact-delayed-restore-1" }));
    const originalDigest = crypto.subtle.digest.bind(crypto.subtle);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    Object.defineProperty(crypto.subtle, "digest", {
      configurable: true,
      value: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
        calls += 1;
        await gate;
        return originalDigest(algorithm, data);
      }
    });
    Object.defineProperty(globalThis, "__geoaiProjectRestoreDigestCalls", { configurable: true, get: () => calls });
    Object.defineProperty(globalThis, "__geoaiReleaseProjectRestore", { configurable: true, value: release });
  }, { browserIdentityKey, identity, projectStorageKey, restoreKey, storeBytes });

  await page.goto("/prototype/point-to-object?mode=create");
  const workspace = page.locator("main[data-project-restoration]");
  await expect.poll(() => page.evaluate(() => (globalThis as Record<string, unknown>).__geoaiProjectRestoreDigestCalls)).toBeGreaterThan(0);
  await expect(workspace).toHaveAttribute("data-project-restoration", "loading");
  await expect(page.getByRole("tab", { name: "Create", exact: true })).toBeDisabled();
  await expect(page.getByTestId("create-workspace")).toHaveAttribute("inert", "");

  await page.getByLabel("Upload GeoJSON").evaluate((input) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([JSON.stringify({ type: "Polygon", coordinates: [[[55.27, 25.2], [55.272, 25.2], [55.272, 25.202], [55.27, 25.2]]] })], "early.geojson", { type: "application/geo+json" }));
    Object.defineProperty(input, "files", { configurable: true, value: transfer.files });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByText(/Area ready/)).toHaveCount(0);
  expect(areaContextRequests).toBe(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), projectStorageKey)).toBe(storeBytes);

  await page.evaluate(() => ((globalThis as Record<string, unknown>).__geoaiReleaseProjectRestore as () => void)());
  await expect(workspace).toHaveAttribute("data-project-restoration", "ready");
  await expect(page.getByRole("tab", { name: "Find", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("find-drawer")).toContainText("Delayed saved result");
  expect(areaContextRequests).toBe(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), projectStorageKey)).toBe(storeBytes);
});
