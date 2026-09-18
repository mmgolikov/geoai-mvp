import { expect, test, type Page, type Route } from "@playwright/test";
import { sessionMissingFixture } from "./helpers/auth-persona";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
let findCalls = 0;

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installRoutes(page: Page) {
  await page.addInitScript(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let release: (() => void) | null = null;
    let delayNeedle: string | null | undefined;
    let held = false;
    const state = {
      delay(needle?: string) { delayNeedle = needle ?? null; },
      held() { return held; },
      release() { release?.(); release = null; held = false; delayNeedle = undefined; }
    };
    Object.defineProperty(window, "__findDigestGate", { value: state });
    Object.defineProperty(crypto.subtle, "digest", {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto["digest"]>) => {
        const bytes = args[1];
        const text = typeof bytes === "string" ? bytes : new TextDecoder().decode(bytes as ArrayBuffer);
        if (delayNeedle !== undefined && (delayNeedle === null || text.includes(delayNeedle))) {
          delayNeedle = undefined;
          held = true;
          await new Promise<void>((resolve) => { release = resolve; });
        }
        return original(...args);
      }
    });
  });
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
        sourceResponseHash: (findCalls % 16).toString(16).repeat(64),
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

async function projectStoreRaw(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("geoai:point-to-object:projects:v1:"));
    return key ? localStorage.getItem(key) : null;
  });
}

async function delayDigest(page: Page, needle?: string) {
  await page.evaluate((value) => (window as unknown as { __findDigestGate: { delay(needle?: string): void } }).__findDigestGate.delay(value), needle);
}

async function waitForHeldDigest(page: Page) {
  await expect.poll(() => page.evaluate(() => (window as unknown as { __findDigestGate: { held(): boolean } }).__findDigestGate.held())).toBe(true);
}

async function releaseDigest(page: Page) {
  await page.evaluate(() => (window as unknown as { __findDigestGate: { release(): void } }).__findDigestGate.release());
}

test("Find persistence reconciles delayed save, project switch, new project and identity races", async ({ page }) => {
  findCalls = 0;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installRoutes(page);
  await signInDemo(page);
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  const cta = page.getByTestId("find-search-cta");
  const candidate = page.getByRole("listitem").filter({ hasText: "Overlapping Candidate" });

  // A new Find result is interactive before its delayed save completes. The
  // eventual binding must catch up the immediate shortlist to the new artifact.
  await delayDigest(page, "1".repeat(64));
  await cta.click();
  await expect(page.getByText("Showing 1", { exact: true })).toBeVisible();
  await waitForHeldDigest(page);
  await candidate.getByRole("button", { name: "Compare", exact: true }).click();
  await releaseDigest(page);
  await expect.poll(async () => (await projectStore(page))?.projects?.[0]?.artifacts?.[0]?.payload?.session?.shortlist?.length ?? 0).toBe(1);
  const initial = await projectStore(page);
  const projectAId = initial.projects[0].projectId as string;
  const artifactAId = initial.projects[0].artifacts[0].artifactId as string;

  // A view update to A must merge into the latest store when project B is
  // created while the view hash is held. B's bytes and active selection win.
  await delayDigest(page, '"shortlist":[]');
  await candidate.getByRole("button", { name: "Selected", exact: true }).click();
  await waitForHeldDigest(page);
  await page.getByRole("button", { name: "New local project", exact: true }).click();
  await expect.poll(async () => (await projectStore(page))?.projects?.length ?? 0).toBe(2);
  const afterCreateB = await projectStore(page);
  const projectB = afterCreateB.projects.find((project: { projectId: string }) => project.projectId !== projectAId);
  expect(projectB).toBeTruthy();
  const projectBId = projectB.projectId as string;
  const projectBBytes = JSON.stringify(projectB);
  expect(afterCreateB.activeProjectId).toBe(projectBId);
  await releaseDigest(page);
  await expect.poll(async () => {
    const store = await projectStore(page);
    return store.projects.find((project: { projectId: string }) => project.projectId === projectAId)
      ?.artifacts.find((artifact: { artifactId: string }) => artifact.artifactId === artifactAId)?.viewRevision ?? 0;
  }).toBe(2);
  const afterViewMerge = await projectStore(page);
  expect(afterViewMerge.activeProjectId).toBe(projectBId);
  expect(JSON.stringify(afterViewMerge.projects.find((project: { projectId: string }) => project.projectId === projectBId))).toBe(projectBBytes);
  expect(afterViewMerge.projects.flatMap((project: { artifacts: unknown[] }) => project.artifacts)).toHaveLength(1);

  // A delayed save initiated in A must land in A without selecting it again
  // after the user switches to B on the same page.
  const activeProject = page.getByRole("combobox", { name: "Active project", exact: true });
  await activeProject.selectOption(projectAId);
  await expect.poll(async () => (await projectStore(page))?.activeProjectId).toBe(projectAId);
  await page.getByLabel("Levels from").fill("2");
  await expect(cta).toHaveText("Update search");
  await delayDigest(page, "2".repeat(64));
  await cta.click();
  await expect.poll(() => findCalls).toBe(2);
  await waitForHeldDigest(page);
  await activeProject.selectOption(projectBId);
  await expect.poll(async () => (await projectStore(page))?.activeProjectId).toBe(projectBId);
  await releaseDigest(page);
  await expect.poll(async () => {
    const store = await projectStore(page);
    return store.projects.find((project: { projectId: string }) => project.projectId === projectAId)?.artifacts.length ?? 0;
  }).toBe(2);
  const afterProjectSwitch = await projectStore(page);
  expect(afterProjectSwitch.activeProjectId).toBe(projectBId);
  expect(JSON.stringify(afterProjectSwitch.projects.find((project: { projectId: string }) => project.projectId === projectBId))).toBe(projectBBytes);
  const delayedArtifact = afterProjectSwitch.projects.find((project: { projectId: string }) => project.projectId === projectAId).artifacts[0];
  const delayedArtifactBytes = JSON.stringify(delayedArtifact);
  await candidate.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(candidate.getByRole("button", { name: "Selected", exact: true })).toBeVisible();
  await page.waitForTimeout(100);
  const afterDetachedInteraction = await projectStore(page);
  expect(JSON.stringify(afterDetachedInteraction.projects.find((project: { projectId: string }) => project.projectId === projectAId)
    .artifacts.find((artifact: { artifactId: string }) => artifact.artifactId === delayedArtifact.artifactId))).toBe(delayedArtifactBytes);

  // An identity transition during an actual delayed save fails closed and
  // preserves every project byte in the original identity namespace.
  await page.getByLabel("Levels from").fill("3");
  await delayDigest(page, "3".repeat(64));
  await cta.click();
  await expect.poll(() => findCalls).toBe(3);
  await waitForHeldDigest(page);
  const beforeIdentityChange = await projectStoreRaw(page);
  const projectIdentity = (await projectStore(page)).identityKey as string;
  await page.evaluate(() => localStorage.setItem("geoai:point-to-object:browser-identity:v1", "user:switched-e2e"));
  await releaseDigest(page);
  await expect(page.getByTestId("point-object-project-recovery")).toBeVisible();
  expect(await projectStoreRaw(page)).toBe(beforeIdentityChange);
  await page.evaluate((identityKey) => localStorage.setItem("geoai:point-to-object:browser-identity:v1", identityKey), projectIdentity);
});

test("Reset and delayed overlapping Find save never mutate the prior saved cohort", async ({ page }) => {
  findCalls = 0;
  await installRoutes(page);
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
