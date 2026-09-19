import { createHash } from "node:crypto";
import { expect, test, type Browser, type BrowserContext, type Page, type Route } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" });

const projectRef = "pphdqkurxneyagvnnjdt";
const cloudPath = "/api/prototype/point-to-object/project-artifacts";
const previewUrl = process.env.GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL ?? "";
const previewBypass = process.env.GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET ?? "";
const phase = process.env.GEOAI_CLOUD_LIVE_PHASE ?? "";
const active = process.env.GEOAI_CLOUD_LIVE_BROWSER_ACTIVE === "1";
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

test.skip(!active, "Root-only cloud-live acceptance is absent from default browser execution.");

type Persona = { email: string; password: string; userId: string };
const personaA: Persona = {
  email: process.env.GEOAI_CLOUD_LIVE_A_EMAIL ?? "",
  password: process.env.GEOAI_CLOUD_LIVE_A_PASSWORD ?? "",
  userId: process.env.GEOAI_CLOUD_LIVE_A_USER_ID ?? ""
};
const personaB: Persona = {
  email: process.env.GEOAI_CLOUD_LIVE_B_EMAIL ?? "",
  password: process.env.GEOAI_CLOUD_LIVE_B_PASSWORD ?? "",
  userId: process.env.GEOAI_CLOUD_LIVE_B_USER_ID ?? ""
};

function guard(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fixtureArtifact() {
  const timestamp = "2026-09-19T10:01:00.000Z";
  const input = {
    kind: "find", locale: "en", marketKey: "dubai",
    payload: { session: {
      version: 1, marketKey: "dubai", locale: "en", audience: "b2b", role: "developer",
      scenario: "b2b_redevelopment_selected_aoi", group: "construction",
      mappedMinimumLevels: "", mappedMaximumLevels: "", shortlist: [], comparisonOpen: false,
      comparisonView: "results", analysisTargetSourceFeatureId: null, updatedAt: timestamp,
      result: {
        protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results",
        criteria: { marketKey: "dubai", locale: "en", bounds: [55.26, 25.19, 55.28, 25.21], group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 },
        candidates: [{
          sourceFeatureId: "way/7001", sourceElementType: "way", sourceElementId: "7001", label: "Public synthetic cloud site", name: "Public synthetic cloud site",
          longitude: 55.27, latitude: 25.2, group: "construction", matchedTag: { key: "landuse", value: "construction" },
          mappedBuildingLevels: null, observedTags: { landuse: "construction", name: "Public synthetic cloud site" }, evidenceClass: "observed_in_open_map_source"
        }],
        ordering: "source_identity_ascending_not_ranked",
        coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 4.47, upstreamElementCount: 1, normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
        source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "7".repeat(64), observedAt: null, acquiredAt: timestamp, freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
        limitations: ["Synthetic public acceptance fixture; no customer or account content."], caveat
      }
    } }
  };
  return {
    ...input, label: "Public synthetic cloud result", schemaVersion: 1,
    artifactId: "artifact-cloud-live-public-1", idempotencyKey: "operation-cloud-live-public-1",
    payloadHash: createHash("sha256").update(canonical(input)).digest("hex"),
    completedAt: timestamp, updatedAt: timestamp, viewRevision: 0
  };
}

function fixtureStore(userId: string) {
  const artifact = fixtureArtifact();
  return JSON.stringify({
    schemaVersion: 1, identityKey: `user:${userId}`, activeProjectId: "project-cloud-live-public-1",
    projects: [{
      schemaVersion: 1, projectId: "project-cloud-live-public-1", name: "Public synthetic cloud project",
      storageMode: "browser_local_on_this_device", createdAt: "2026-09-19T10:00:00.000Z",
      updatedAt: artifact.updatedAt, artifacts: [artifact]
    }]
  });
}

function storageKey(userId: string) {
  return `geoai:point-to-object:projects:v1:${encodeURIComponent(`user:${userId}`)}`;
}

async function installNetworkPolicy(page: Page) {
  const previewOrigin = new URL(previewUrl).origin;
  const authOrigin = `https://${projectRef}.supabase.co`;
  let unexpected = 0;
  await page.route("**/*", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    if (!["http:", "https:"].includes(url.protocol)) return route.continue();
    if (url.origin === previewOrigin) {
      const safeRead = method === "GET" || method === "HEAD";
      const cloudWrite = method === "PUT" && url.pathname === cloudPath && !url.search;
      if (!safeRead && !cloudWrite) { unexpected += 1; return route.abort("blockedbyclient"); }
      return route.continue({ headers: { ...request.headers(), "x-vercel-protection-bypass": previewBypass } });
    }
    if (url.origin === authOrigin) {
      const allowed = method === "OPTIONS" ||
        (method === "POST" && url.pathname === "/auth/v1/token" && ["password", "refresh_token"].includes(url.searchParams.get("grant_type") ?? "")) ||
        (method === "GET" && url.pathname === "/auth/v1/user");
      if (!allowed) { unexpected += 1; return route.abort("blockedbyclient"); }
      return route.continue();
    }
    unexpected += 1;
    return route.abort("blockedbyclient");
  });
  return () => guard(unexpected === 0, "Browser attempted an unapproved network operation.");
}

async function verifyPreview(page: Page) {
  const response = await page.goto("/api/health", { waitUntil: "domcontentloaded" });
  guard(response?.status() === 200, "Protected Preview health failed.");
  const body = await response.json() as { environment?: unknown; releaseCommit?: unknown; deploymentMetadata?: { deploymentHost?: unknown } };
  guard(body.environment === "vercel_preview" && body.releaseCommit === process.env.GEOAI_CLOUD_LIVE_EXPECTED_COMMIT_SHA &&
    body.deploymentMetadata?.deploymentHost === new URL(previewUrl).hostname, "Preview tuple changed.");
}

async function login(page: Page, persona: Persona, rawStore: string | null) {
  await page.goto("/login?next=%2Fprojects");
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
  if (rawStore !== null) await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey(persona.userId), value: rawStore });
  await page.getByLabel("Email or phone").fill(persona.email);
  await page.getByLabel("Password").fill(persona.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/projects"),
    page.getByRole("button", { name: "Sign in", exact: true }).click()
  ]);
  await expect(page.getByRole("heading", { name: "Project Hub", exact: true })).toBeVisible();
}

async function newContext(browser: Browser) {
  const context = await browser.newContext({ baseURL: previewUrl, serviceWorkers: "block" });
  const page = await context.newPage();
  const assertNetworkClean = await installNetworkPolicy(page);
  return { context, page, assertNetworkClean };
}

async function close(contexts: BrowserContext[]) {
  await Promise.all(contexts.map((context) => context.close().catch(() => undefined)));
}

test.beforeAll(() => {
  guard(active && ["writer_outsider", "viewer_denial"].includes(phase), "Cloud-live spec is disabled by default.");
  guard(previewBypass.length >= 16 && previewUrl.startsWith("https://"), "Protected Preview settings are incomplete.");
});

test("writer saves, clean context reopens, outsider is denied", async ({ browser }) => {
  test.skip(phase !== "writer_outsider", "Wrong bounded phase.");
  const contexts: BrowserContext[] = [];
  try {
    const first = await newContext(browser); contexts.push(first.context);
    await verifyPreview(first.page);
    const originalBytes = fixtureStore(personaA.userId);
    const aResponses: number[] = [];
    first.page.on("response", (response) => { if (new URL(response.url()).pathname === cloudPath) aResponses.push(response.status()); });
    await login(first.page, personaA, originalBytes);
    await expect(first.page.getByText("Cloud projects are synced to this device.", { exact: true })).toBeVisible();
    const put = first.page.waitForResponse((response) => response.request().method() === "PUT" && new URL(response.url()).pathname === cloudPath);
    await first.page.getByRole("button", { name: "Save to cloud", exact: true }).click();
    expect((await put).status()).toBe(201);
    await expect(first.page.getByText(/selected project is saved to the protected cloud test environment/i)).toBeVisible();
    expect(await first.page.evaluate((key) => localStorage.getItem(key), storageKey(personaA.userId))).toBe(originalBytes);
    expect(aResponses.filter((status) => status === 201)).toHaveLength(1);
    first.assertNetworkClean();

    const second = await newContext(browser); contexts.push(second.context);
    let secondPuts = 0;
    second.page.on("request", (request) => { if (request.method() === "PUT" && new URL(request.url()).pathname === cloudPath) secondPuts += 1; });
    await login(second.page, personaA, null);
    await expect(second.page.getByRole("heading", { name: "Public synthetic cloud project", exact: true })).toBeVisible();
    await expect(second.page.getByText("Public synthetic cloud result", { exact: true })).toBeVisible();
    const imported = await second.page.evaluate((key) => localStorage.getItem(key), storageKey(personaA.userId));
    guard(imported !== null, "Clean A context did not import the artifact.");
    expect(JSON.parse(imported).projects[0].artifacts[0]).toEqual(fixtureArtifact());
    await Promise.all([
      second.page.waitForURL((url) => url.pathname === "/prototype/point-to-object"),
      second.page.getByRole("button", { name: "Show on map", exact: true }).click()
    ]);
    expect(secondPuts).toBe(0);
    second.assertNetworkClean();

    const outsider = await newContext(browser); contexts.push(outsider.context);
    const outsiderStatuses: number[] = [];
    outsider.page.on("response", (response) => { if (new URL(response.url()).pathname === cloudPath) outsiderStatuses.push(response.status()); });
    const outsiderBytes = fixtureStore(personaB.userId);
    await login(outsider.page, personaB, outsiderBytes);
    await expect(outsider.page.getByText("Cloud sync is not authorized for this project.", { exact: true })).toBeVisible();
    await expect(outsider.page.getByRole("button", { name: "Save to cloud", exact: true })).toBeDisabled();
    expect(outsiderStatuses).toContain(403);
    expect(await outsider.page.evaluate((key) => localStorage.getItem(key), storageKey(personaB.userId))).toBe(outsiderBytes);
    outsider.assertNetworkClean();
  } finally {
    await close(contexts);
  }
});

test("viewer cannot save", async ({ browser }) => {
  test.skip(phase !== "viewer_denial", "Wrong bounded phase.");
  const contexts: BrowserContext[] = [];
  try {
    const viewer = await newContext(browser); contexts.push(viewer.context);
    await verifyPreview(viewer.page);
    const originalBytes = fixtureStore(personaB.userId);
    await login(viewer.page, personaB, originalBytes);
    await expect(viewer.page.getByText("Cloud projects are synced to this device.", { exact: true })).toBeVisible();
    const button = viewer.page.getByRole("button", { name: "Save to cloud", exact: true });
    await expect(button).toBeEnabled();
    const put = viewer.page.waitForResponse((response) => response.request().method() === "PUT" && new URL(response.url()).pathname === cloudPath);
    await button.click();
    expect((await put).status()).toBe(403);
    await expect(viewer.page.getByRole("alert")).toContainText("not saved completely");
    expect(await viewer.page.evaluate((key) => localStorage.getItem(key), storageKey(personaB.userId))).toBe(originalBytes);
    viewer.assertNetworkClean();
  } finally {
    await close(contexts);
  }
});
