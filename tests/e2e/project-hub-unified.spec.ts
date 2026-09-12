import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { parsePointObjectFindSessionState } from "@/src/lib/prototype/point-to-object-find-session";
import { installLocalWebKitHttpCsp } from "./helpers/local-webkit-csp";

const identity = "demo:demo-user-geoai";
const key = `geoai:point-to-object:projects:v1:${encodeURIComponent(identity)}`;
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) return `{${Object.keys(value).sort().map((item) => `${JSON.stringify(item)}:${canonical((value as Record<string, unknown>)[item])}`).join(",")}}`;
  return JSON.stringify(value);
}

// Explicit offline test fixtures; never introduced into application defaults.
function fixture(index: number, label: string) {
  const timestamp = `2026-09-0${index}T10:00:00.000Z`;
  const candidate = { sourceFeatureId: `way/${index}`, sourceElementType: "way", sourceElementId: String(index), label: `Site ${index}`, name: `Site ${index}`, longitude: 55.27, latitude: 25.2, group: "construction", matchedTag: { key: "landuse", value: "construction" }, mappedBuildingLevels: null, observedTags: { landuse: "construction", name: `Site ${index}` }, evidenceClass: "observed_in_open_map_source" };
  const payload = { session: {
    version: 1, marketKey: "dubai", locale: "en", audience: "b2b", role: "developer", scenario: "b2b_redevelopment_selected_aoi", group: "construction", mappedMinimumLevels: "", mappedMaximumLevels: "",
    result: {
      protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results",
      criteria: { marketKey: "dubai", locale: "en", bounds: [55.26, 25.19, 55.28, 25.21], group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 },
      candidates: [candidate], ordering: "source_identity_ascending_not_ranked",
      coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 4.47, upstreamElementCount: 1, normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
      source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: String(index).repeat(64), observedAt: null, acquiredAt: timestamp, freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
      limitations: ["Offline test fixture."], caveat
    }, shortlist: [], comparisonOpen: false, analysisTargetSourceFeatureId: null, updatedAt: timestamp
  } };
  const input = { kind: "find", locale: "en", marketKey: "dubai", payload };
  return { ...input, label, schemaVersion: 1, artifactId: `artifact-${index}`, idempotencyKey: `operation-${index}`, payloadHash: createHash("sha256").update(canonical(input)).digest("hex"), completedAt: timestamp, updatedAt: timestamp, viewRevision: 0 };
}

function fixtureStore() {
  return { schemaVersion: 1, identityKey: identity, activeProjectId: "project-1", projects: [
    { schemaVersion: 1, projectId: "project-1", name: "Dubai review", storageMode: "browser_local_on_this_device", createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-02T10:00:00.000Z", artifacts: [fixture(1, "Alpha result"), fixture(2, "Zulu result")] },
    { schemaVersion: 1, projectId: "project-2", name: "Empty draft", storageMode: "browser_local_on_this_device", createdAt: "2026-09-03T10:00:00.000Z", updatedAt: "2026-09-03T10:00:00.000Z", artifacts: [] }
  ] };
}

async function openHub(page: Page, raw: string | null) {
  await page.route(/^https:\/\//, (route) => route.abort());
  await installLocalWebKitHttpCsp(page, test.info().project.use.browserName, test.info().project.use.baseURL);
  await page.addInitScript(({ storageKey, value }) => {
    localStorage.setItem("geoai-mock-demo-session-v1", "active");
    if (!sessionStorage.getItem("hub-fixture-installed")) {
      if (value !== null) localStorage.setItem(storageKey, value);
      sessionStorage.setItem("hub-fixture-installed", "true");
    }
  }, { storageKey: key, value: raw });
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Project Hub", exact: true })).toBeVisible();
  await expect(page.getByTestId("hub-summary")).toHaveCSS("display", "grid");
}

test("legacy Find V1 session round-trips without adding dashboard state or changing its hash", () => {
  const legacyArtifact = fixture(1, "Alpha result");
  const originalSession = legacyArtifact.payload.session;
  const parsedSession = parsePointObjectFindSessionState(originalSession);

  expect(parsedSession).toEqual(originalSession);
  expect(Object.prototype.hasOwnProperty.call(parsedSession, "comparisonView")).toBe(false);

  const roundTripInput = {
    kind: legacyArtifact.kind,
    locale: legacyArtifact.locale,
    marketKey: legacyArtifact.marketKey,
    payload: { session: parsedSession }
  };
  expect(createHash("sha256").update(canonical(roundTripInput)).digest("hex")).toBe(legacyArtifact.payloadHash);
});

test("unified Hub counts verified results, searches, filters, sorts and fits EN/RU mobile", async ({ page }, testInfo) => {
  await openHub(page, JSON.stringify(fixtureStore()));
  const hub = page.getByTestId("point-object-projects-page");
  await expect(hub.getByTestId("hub-count-find").getByTestId("hub-count-value")).toHaveText("2");
  await expect(hub.getByTestId("hub-count-analyse").getByTestId("hub-count-value")).toHaveText("0");
  await expect(hub.getByTestId("hub-count-create").getByTestId("hub-count-value")).toHaveText("0");
  await expect(hub.getByText(/Data readiness|Saved spatial work|B2B|B2C/)).toHaveCount(0);
  await expect(hub.getByText(/Cloud sync|Completed Analyse|Storage mode/)).toHaveCount(0);
  await expect(hub.getByText("Saved on this device", { exact: true })).toHaveCount(1);
  await expect(hub.getByTestId("saved-result-card").getByRole("button", { name: "Show on map", exact: true })).toHaveCount(2);
  await expect(hub.getByTestId("saved-result-card").first()).toContainText("Zulu result");
  await hub.getByRole("combobox", { name: "Sort", exact: true }).selectOption("oldest");
  await expect(hub.getByTestId("saved-result-card").first()).toContainText("Alpha result");
  await hub.getByLabel("Search", { exact: true }).fill("zulu");
  await expect(hub.getByTestId("saved-result-card")).toHaveCount(1);
  await expect(hub.getByTestId("hub-count-find").getByTestId("hub-count-value")).toHaveText("2");
  await hub.getByRole("combobox", { name: "Result type", exact: true }).selectOption("create");
  await expect(hub.getByText("No matching results", { exact: true })).toBeVisible();
  await hub.getByRole("button", { name: "Clear filters" }).click();
  await expect(hub.getByTestId("saved-project-card")).toHaveCount(2);
  for (const width of [390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 932 });
    for (const locale of ["en", "ru"]) {
      await hub.getByRole("button", { name: locale, exact: true }).click();
      if (locale === "ru") {
        await expect(hub.getByTestId("hub-count-analyse")).toContainText("Анализ");
        await expect(hub.getByTestId("hub-count-find")).toContainText("Поиск");
        await expect(hub.getByTestId("hub-count-create")).toContainText("Генерация");
        await expect(hub.getByText("Сохранено на этом устройстве", { exact: true })).toHaveCount(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const boxes = await hub.getByTestId("hub-summary").getByRole("button").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
      expect(new Set(boxes).size).toBe(1);
      const controlHeights = await hub.getByRole("combobox").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
      expect(controlHeights).toHaveLength(2);
      for (const height of controlHeights) expect(height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: testInfo.outputPath(`hub-${width}-${locale}.png`), fullPage: true });
    }
  }
  await hub.getByRole("button", { name: "en", exact: true }).click();
  await page.goto("/projects?view=spatial");
  await expect(page.getByRole("heading", { name: "Project Hub", exact: true })).toBeVisible();
  await expect(page.getByTestId("saved-result-card")).toHaveCount(2);
});

test("project rename persists metadata only, supports cancellation and mobile Russian", async ({ page }) => {
  const initial = fixtureStore();
  await openHub(page, JSON.stringify(initial));
  const hub = page.getByTestId("point-object-projects-page");
  let paidCalls = 0;
  page.on("request", (request) => { if (request.method() === "POST" && /\/point-to-object\/(ai|create|analysis-runs)/.test(request.url())) paidCalls += 1; });
  await hub.getByRole("button", { name: "Rename Dubai review", exact: true }).click();
  await hub.getByLabel("Project name", { exact: true }).fill("Dubai decision room");
  await hub.getByRole("button", { name: "Save", exact: true }).click();
  await expect(hub.getByRole("heading", { name: "Dubai decision room", exact: true })).toBeVisible();
  const after = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key);
  expect(after.activeProjectId).toBe(initial.activeProjectId);
  expect(after.projects.find((item: { projectId: string }) => item.projectId === "project-1").artifacts).toEqual(initial.projects[0].artifacts);
  await page.reload();
  await expect(hub.getByRole("heading", { name: "Dubai decision room", exact: true })).toBeVisible();
  await hub.getByRole("button", { name: "Rename Dubai decision room", exact: true }).click();
  await hub.getByLabel("Project name", { exact: true }).fill("Discard this");
  await hub.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(hub.getByRole("heading", { name: "Dubai decision room", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await hub.getByRole("button", { name: "ru", exact: true }).click();
  await hub.getByRole("button", { name: "Переименовать Dubai decision room", exact: true }).click();
  await hub.getByLabel("Название проекта", { exact: true }).fill("Дубай — сравнение площадок");
  await hub.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(hub.getByRole("heading", { name: "Дубай — сравнение площадок", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(paidCalls).toBe(0);
});

test("damaged saved bytes show unavailable counts and explicit retry, never an empty success", async ({ page }) => {
  const broken = "{broken-json";
  await openHub(page, broken);
  const hub = page.getByTestId("point-object-projects-page");
  await expect(hub.getByRole("alert")).toContainText("Original data was not changed");
  await expect(hub.getByTestId("hub-count-find").getByTestId("hub-count-value")).toHaveText("—");
  await expect(hub.getByText("No saved projects yet", { exact: true })).toHaveCount(0);
  await expect(hub.getByRole("button", { name: "+ New project" })).toBeDisabled();
  await hub.getByRole("button", { name: "Retry verification" }).click();
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(broken);
  await page.evaluate(({ storageKey, value }) => localStorage.setItem(storageKey, value), { storageKey: key, value: JSON.stringify(fixtureStore()) });
  await hub.getByRole("button", { name: "Retry verification" }).click();
  await expect(hub.getByRole("alert")).toHaveCount(0);
  await expect(hub.getByTestId("hub-count-find").getByTestId("hub-count-value")).toHaveText("2");
});

test("empty Hub ignores another owner's store and creates only a local empty project", async ({ page }) => {
  await openHub(page, null);
  const hub = page.getByTestId("point-object-projects-page");
  await page.evaluate((value) => localStorage.setItem("geoai:point-to-object:projects:v1:user%3Aother-user", value), JSON.stringify({ ...fixtureStore(), identityKey: "user:other-user" }));
  await page.reload();
  await expect(hub.getByText("No saved projects yet", { exact: true })).toBeVisible();
  await expect(hub.getByTestId("hub-count-find").getByTestId("hub-count-value")).toHaveText("0");
  await hub.getByRole("button", { name: "+ New project" }).click();
  await expect(hub.getByTestId("saved-project-card")).toHaveCount(1);
  await expect(hub.getByTestId("saved-result-card")).toHaveCount(0);
  await expect(hub.getByTestId("hub-count-create").getByTestId("hub-count-value")).toHaveText("0");
});
