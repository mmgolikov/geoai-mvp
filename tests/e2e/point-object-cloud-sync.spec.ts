import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { expect, test, type BrowserContext, type Page, type Route, type TestInfo } from "@playwright/test";

const cloudPath = "/api/prototype/point-to-object/project-artifacts";
const cookieName = "sb-127-auth-token";
const primaryUserId = "11111111-1111-4111-8111-111111111111";
const secondaryUserId = "22222222-2222-4222-8222-222222222222";
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
let fakeSupabase: Server | null = null;

function isAuthenticatedRun(testInfo: TestInfo): boolean {
  return (testInfo.project.metadata as { cloudAuthE2E?: boolean }).cloudAuthE2E === true;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fixtureArtifact(index = 1, label = "Cloud alpha result") {
  const timestamp = `2026-09-18T10:0${index}:00.000Z`;
  const input = {
    kind: "find",
    locale: "en",
    marketKey: "dubai",
    payload: {
      session: {
        version: 1,
        marketKey: "dubai",
        locale: "en",
        audience: "b2b",
        role: "developer",
        scenario: "b2b_redevelopment_selected_aoi",
        group: "construction",
        mappedMinimumLevels: "",
        mappedMaximumLevels: "",
        shortlist: [],
        comparisonOpen: false,
        analysisTargetSourceFeatureId: null,
        updatedAt: timestamp,
        result: {
          protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",
          mode: "results",
          criteria: { marketKey: "dubai", locale: "en", bounds: [55.26, 25.19, 55.28, 25.21], group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 },
          candidates: [{
            sourceFeatureId: `way/700${index}`, sourceElementType: "way", sourceElementId: `700${index}`, label, name: label,
            longitude: 55.27 + index / 10_000, latitude: 25.2, group: "construction", matchedTag: { key: "landuse", value: "construction" },
            mappedBuildingLevels: null, observedTags: { landuse: "construction", name: label }, evidenceClass: "observed_in_open_map_source"
          }],
          ordering: "source_identity_ascending_not_ranked",
          coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 4.47, upstreamElementCount: 1, normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
          source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: String(index + 6).repeat(64), observedAt: null, acquiredAt: timestamp, freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
          limitations: ["Cloud browser fixture."],
          caveat
        }
      }
    }
  };
  return {
    ...input,
    label,
    schemaVersion: 1,
    artifactId: `artifact-cloud-browser-${index}`,
    idempotencyKey: `operation-cloud-browser-${index}`,
    payloadHash: createHash("sha256").update(canonical(input)).digest("hex"),
    completedAt: timestamp,
    updatedAt: timestamp,
    viewRevision: 0
  };
}

function fixtureProject(name = "Selected cloud project") {
  return {
    schemaVersion: 1,
    projectId: "project-cloud-browser-1",
    name,
    storageMode: "browser_local_on_this_device",
    createdAt: "2026-09-18T09:00:00.000Z",
    updatedAt: "2026-09-18T10:02:00.000Z",
    artifacts: [fixtureArtifact(2, "Cloud beta result"), fixtureArtifact(1, "Cloud alpha result")]
  };
}

function fixtureStore(userId = primaryUserId, name = "Selected cloud project") {
  const identityKey = `user:${userId}`;
  const project = fixtureProject(name);
  const unrelated = {
    ...fixtureProject("Unrelated local project"),
    projectId: "project-cloud-browser-unrelated",
    createdAt: "2026-09-18T08:00:00.000Z",
    artifacts: [fixtureArtifact(3, "Unrelated gamma result")]
  };
  return { schemaVersion: 1, identityKey, activeProjectId: project.projectId, projects: [project, unrelated] };
}

function projectStorageKey(userId: string) {
  return `geoai:point-to-object:projects:v1:${encodeURIComponent(`user:${userId}`)}`;
}

function authUser(userId: string) {
  const now = "2026-09-18T09:00:00.000Z";
  return {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: `${userId === primaryUserId ? "primary" : "secondary"}@cloud-e2e.invalid`,
    email_confirmed_at: now,
    phone: "",
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: userId === primaryUserId ? "Primary cloud user" : "Secondary cloud user" },
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: false
  };
}

function accessToken(userId: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: userId,
    aud: "authenticated",
    role: "authenticated",
    email: authUser(userId).email,
    is_anonymous: false,
    session_id: `${userId.slice(0, 24)}${userId.slice(24)}`,
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600
  })}.synthetic-signature`;
}

function authCookie(userId: string): string {
  const session = {
    access_token: accessToken(userId),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `synthetic-refresh-${userId}`,
    user: authUser(userId)
  };
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

function userIdFromAuthorization(value: string | undefined): string | null {
  const token = value?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { sub?: unknown };
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function startFakeSupabase(): Promise<Server> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1:54321");
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3117");
    response.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Content-Type", "application/json");
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }
    const userId = userIdFromAuthorization(request.headers.authorization);
    if (!userId || (userId !== primaryUserId && userId !== secondaryUserId)) {
      response.statusCode = 401;
      response.end(JSON.stringify({ message: "Synthetic session missing." }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/auth/v1/user") {
      response.end(JSON.stringify(authUser(userId)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/current_profile") {
      response.end(JSON.stringify([{
        id: `profile-${userId}`,
        auth_user_id: userId,
        email: authUser(userId).email,
        full_name: authUser(userId).user_metadata.full_name,
        status: "active",
        identity_kind: "user"
      }]));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ message: "Synthetic endpoint unavailable." }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(54321, "127.0.0.1", () => resolve());
  });
  return server;
}

async function stopFakeSupabase(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function installAuthenticatedCookie(context: BrowserContext, baseURL: string, userId: string) {
  await context.addCookies([{ name: cookieName, value: authCookie(userId), url: baseURL, sameSite: "Lax" }]);
}

async function seedLocalProject(page: Page, userId: string, name = "Selected cloud project") {
  await page.addInitScript(({ storageKey, raw }) => {
    if (localStorage.getItem(storageKey) === null) localStorage.setItem(storageKey, raw);
  }, { storageKey: projectStorageKey(userId), raw: JSON.stringify(fixtureStore(userId, name)) });
}

async function fulfillCloudList(route: Route, items: unknown[] = []) {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    ok: true, persisted: true, storageMode: "authenticated_supabase_preview", items, nextCursor: null
  }) });
}

test.beforeAll(async ({}, workerInfo) => {
  if ((workerInfo.project.metadata as { cloudAuthE2E?: boolean }).cloudAuthE2E === true) fakeSupabase = await startFakeSupabase();
});

test.afterAll(async () => {
  if (fakeSupabase) await stopFakeSupabase(fakeSupabase);
  fakeSupabase = null;
});

test("demo/anonymous Project Hub never calls the cloud artifact route", async ({ page }, testInfo) => {
  let cloudCalls = 0;
  await page.route(`**${cloudPath}**`, async (route) => {
    cloudCalls += 1;
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false }) });
  });
  await page.goto("/projects");
  if (isAuthenticatedRun(testInfo)) {
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  } else {
    await expect(page.getByRole("heading", { name: "Project Hub", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save to cloud", exact: true })).toHaveCount(0);
  }
  await page.waitForTimeout(250);
  expect(cloudCalls).toBe(0);
});

test("explicit Save to cloud is the only PUT and a clean second context imports additively", async ({ browser }, testInfo) => {
  test.skip(!isAuthenticatedRun(testInfo), "Requires the local authenticated cloud harness.");
  const baseURL = String(testInfo.project.use.baseURL);
  const remoteItems: Array<{ cloudRevision: number; localProject: unknown; artifact: unknown }> = [];
  const methods: string[] = [];
  const putArtifactIds: string[] = [];
  const putProjectIds: string[] = [];

  const firstContext = await browser.newContext({ baseURL });
  await installAuthenticatedCookie(firstContext, baseURL, primaryUserId);
  const firstPage = await firstContext.newPage();
  await seedLocalProject(firstPage, primaryUserId);
  await firstPage.route(`**${cloudPath}**`, async (route) => {
    const method = route.request().method();
    methods.push(method);
    if (method === "GET") return fulfillCloudList(route, remoteItems);
    const body = route.request().postDataJSON() as {
      localProject: { projectId: string };
      artifact: { artifactId: string; payloadHash: string };
    };
    putArtifactIds.push(body.artifact.artifactId);
    putProjectIds.push(body.localProject.projectId);
    remoteItems.push({ cloudRevision: 1, localProject: body.localProject, artifact: body.artifact });
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      ok: true, persisted: true, storageMode: "authenticated_supabase_preview", outcome: "created", cloudRevision: 1,
      payloadHash: (body.artifact as { payloadHash: string }).payloadHash, immutableHash: "b".repeat(64)
    }) });
  });
  await firstPage.goto("/projects");
  await expect(firstPage.getByRole("heading", { name: "Project Hub", exact: true })).toBeVisible();
  await expect(firstPage.getByText("Cloud projects are synced to this device.", { exact: true })).toBeVisible();
  expect(methods.filter((method) => method === "PUT")).toHaveLength(0);
  await firstPage.getByLabel("Search", { exact: true }).fill("Cloud alpha");
  await expect(firstPage.getByTestId("saved-result-card")).toHaveCount(1);
  const beforeSave = await firstPage.evaluate((storageKey) => localStorage.getItem(storageKey), projectStorageKey(primaryUserId));
  await firstPage.getByRole("button", { name: "Save to cloud", exact: true }).click();
  await expect(firstPage.getByText(/selected project is saved to the protected cloud test environment/i)).toBeVisible();
  expect(methods.filter((method) => method === "PUT")).toHaveLength(2);
  expect(putArtifactIds).toEqual(["artifact-cloud-browser-1", "artifact-cloud-browser-2"]);
  expect(putProjectIds).toEqual(["project-cloud-browser-1", "project-cloud-browser-1"]);
  expect(await firstPage.evaluate((storageKey) => localStorage.getItem(storageKey), projectStorageKey(primaryUserId))).toBe(beforeSave);
  expect(remoteItems).toHaveLength(2);

  const secondContext = await browser.newContext({ baseURL });
  await installAuthenticatedCookie(secondContext, baseURL, primaryUserId);
  const secondPage = await secondContext.newPage();
  let secondContextPutCalls = 0;
  await secondPage.route(`**${cloudPath}**`, async (route) => {
    if (route.request().method() === "PUT") secondContextPutCalls += 1;
    await fulfillCloudList(route, remoteItems);
  });
  await secondPage.goto("/projects");
  await expect(secondPage.getByRole("heading", { name: "Selected cloud project", exact: true })).toBeVisible();
  await expect(secondPage.getByText("Cloud alpha result", { exact: true })).toBeVisible();
  await expect(secondPage.getByText("Cloud beta result", { exact: true })).toBeVisible();
  const imported = await secondPage.evaluate((storageKey) => localStorage.getItem(storageKey), projectStorageKey(primaryUserId));
  expect(imported).not.toBeNull();
  expect(JSON.parse(imported!).projects).toEqual([fixtureProject()]);
  expect(secondContextPutCalls).toBe(0);
  await secondContext.close();
  await firstContext.close();
});

test("cloud conflict and error preserve the selected local project bytes", async ({ browser }, testInfo) => {
  test.skip(!isAuthenticatedRun(testInfo), "Requires the local authenticated cloud harness.");
  const baseURL = String(testInfo.project.use.baseURL);
  for (const scenario of ["conflict", "error"] as const) {
    const context = await browser.newContext({ baseURL });
    await installAuthenticatedCookie(context, baseURL, primaryUserId);
    const page = await context.newPage();
    const projectName = scenario === "conflict" ? "Locally renamed project" : "Selected cloud project";
    await seedLocalProject(page, primaryUserId, projectName);
    await page.route(`**${cloudPath}**`, async (route) => {
      if (route.request().method() === "GET") return fulfillCloudList(route);
      if (scenario === "error") {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false }) });
        return;
      }
      await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({
        ok: false, persisted: false, conflict: true, reason: "local_project_identity",
        message: "The cloud artifact belongs to a different project receipt.",
        current: { cloudRevision: 3, payloadHash: "a".repeat(64), immutableHash: "b".repeat(64) }
      }) });
    });
    await page.goto("/projects");
    await expect(page.getByText("Cloud projects are synced to this device.", { exact: true })).toBeVisible();
    const before = await page.evaluate((storageKey) => localStorage.getItem(storageKey), projectStorageKey(primaryUserId));
    await page.getByRole("button", { name: "Save to cloud", exact: true }).click();
    await expect(page.getByTestId("point-object-projects-page").getByRole("alert")).toContainText(scenario === "conflict"
      ? "The local project name differs from its original cloud receipt"
      : "The cloud copy was not saved completely");
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), projectStorageKey(primaryUserId))).toBe(before);
    await context.close();
  }
});

test("an old account cloud completion cannot import into the next account", async ({ browser }, testInfo) => {
  test.skip(!isAuthenticatedRun(testInfo), "Requires the local authenticated cloud harness.");
  const baseURL = String(testInfo.project.use.baseURL);
  const context = await browser.newContext({ baseURL });
  await installAuthenticatedCookie(context, baseURL, primaryUserId);
  const page = await context.newPage();
  const oldListDeferred: { release?: () => void } = {};
  let getCalls = 0;
  let putCalls = 0;
  await page.route(`**${cloudPath}**`, async (route) => {
    if (route.request().method() === "PUT") {
      putCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false }) });
      return;
    }
    getCalls += 1;
    if (getCalls > 1) return fulfillCloudList(route);
    await new Promise<void>((resolve) => { oldListDeferred.release = resolve; });
    await fulfillCloudList(route, [{ cloudRevision: 1, localProject: {
      projectId: fixtureProject().projectId, name: fixtureProject().name, createdAt: fixtureProject().createdAt
    }, artifact: fixtureArtifact() }]).catch(() => undefined);
  });
  await page.goto("/projects");
  await expect.poll(() => getCalls).toBe(1);
  await installAuthenticatedCookie(context, baseURL, secondaryUserId);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => page.evaluate(() => localStorage.getItem("geoai:point-to-object:browser-identity:v1"))).toBe(`user:${secondaryUserId}`);
  await expect.poll(() => getCalls).toBeGreaterThanOrEqual(2);
  oldListDeferred.release?.();
  await page.waitForTimeout(250);
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), projectStorageKey(secondaryUserId))).toBeNull();
  expect(putCalls).toBe(0);
  await context.close();
});
