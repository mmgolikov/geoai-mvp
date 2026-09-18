import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  expect,
  test,
  type Page,
  type Request,
  type Response,
  type Route
} from "@playwright/test";

import {
  SPRINT10_ANALYSIS_PROMPT_VERSION,
  SPRINT10_CREATE_PROMPT_VERSION,
  SPRINT10_LIVE_CEILING_USD,
  markSprint10SpendUnknownFile,
  parseSprint10ProviderTelemetry,
  readSprint10SpendLedgerFile,
  reserveSprint10SpendFile,
  settleSprint10SpendFile,
  sprint10LedgerCharge,
  type Sprint10Depth,
  type Sprint10Receipt,
  type Sprint10RequestIdentity,
  type Sprint10Route
} from "./helpers/sprint10-live-budget";
import {
  dispatchSprint10PaidRequest,
  sprint10LiveRequestKey
} from "./helpers/sprint10-live-journey-gate";

test.use({ trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" });
test.describe.configure({ mode: "serial", retries: 0 });

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const EXACT_DEVELOPMENT_PROJECT_REF = "pphdqkurxneyagvnnjdt";
const EXPECTED_LEDGER_ID = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const LIVE_SCOPES = ["journey", "dubai-analyse", "dubai-find", "singapore-create"] as const;
type LiveScope = (typeof LIVE_SCOPES)[number];

const runnerActive = process.env.GEOAI_SPRINT10_LIVE_RUNNER_ACTIVE === "1";
const selectedScope = process.env.GEOAI_SPRINT10_LIVE_SCOPE as LiveScope | undefined;

type LiveConfiguration = {
  scope: LiveScope;
  origin: string;
  host: string;
  commit: string;
  bypass: string;
  email: string;
  password: string;
  userId: string;
  ledgerRoot: string;
  ledgerPath: string;
  receiptPath: string;
};

function guard(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function required(name: string): string {
  const value = process.env[name];
  guard(typeof value === "string" && value.length > 0, `Missing required runtime setting: ${name}.`);
  return value;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadConfiguration(baseURL: string | undefined): LiveConfiguration {
  guard(runnerActive, "The live journey must be started by its root-owned runner.");
  guard(selectedScope && LIVE_SCOPES.includes(selectedScope), "The live journey scope is not accepted.");
  const preview = new URL(required("GEOAI_SPRINT10_LIVE_PREVIEW_URL"));
  guard(preview.origin === preview.href.replace(/\/$/, "") && preview.protocol === "https:" && preview.hostname.endsWith(".vercel.app"),
    "The live target must be one exact HTTPS Vercel Preview origin.");
  guard(baseURL && new URL(baseURL).origin === preview.origin, "The Playwright base URL must match the exact Preview origin.");
  const forbidden = new Set(["geoai-mvp.vercel.app", "geoai-id0xnwco2-geoaidev.vercel.app", "geoai-a71p4fxnr-geoaidev.vercel.app"]);
  guard(!forbidden.has(preview.hostname), "Production aliases are forbidden.");
  const commit = required("GEOAI_SPRINT10_LIVE_EXPECTED_COMMIT_SHA").toLowerCase();
  guard(/^[0-9a-f]{40}$/.test(commit), "One exact 40-character Preview commit is required.");
  guard(required("GEOAI_SPRINT10_LIVE_SUPABASE_PROJECT_REF") === EXACT_DEVELOPMENT_PROJECT_REF,
    "The journey is restricted to the approved development Supabase Auth project.");
  const email = required("GEOAI_SPRINT10_LIVE_EMAIL").trim().toLowerCase();
  const password = required("GEOAI_SPRINT10_LIVE_PASSWORD");
  const userId = required("GEOAI_SPRINT10_LIVE_USER_ID").trim();
  guard(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email !== "demo@geoai.space", "An existing non-demo synthetic email is required.");
  guard(password.length >= 8 && password.length <= 128 && password !== "111111", "The existing-password credential is not accepted.");
  guard(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId),
    "The expected synthetic identity must be one exact UUID.");
  const bypass = required("GEOAI_SPRINT10_LIVE_PREVIEW_BYPASS_SECRET");
  guard(bypass.trim().length >= 16, "A runtime-only Preview protection bypass credential is required.");
  guard(required("GEOAI_SPRINT10_LIVE_EXPECTED_LEDGER_ID") === EXPECTED_LEDGER_ID,
    "The root-owned cycle ledger identity is not accepted.");
  return {
    scope: selectedScope,
    origin: preview.origin,
    host: preview.hostname,
    commit,
    bypass,
    email,
    password,
    userId,
    ledgerRoot: required("GEOAI_SPRINT10_LIVE_LEDGER_ROOT"),
    ledgerPath: required("GEOAI_SPRINT10_LIVE_LEDGER_PATH"),
    receiptPath: required("GEOAI_SPRINT10_LIVE_DEPLOYMENT_RECEIPT_PATH")
  };
}

function loadDeploymentReceipt(configuration: LiveConfiguration) {
  let value: unknown;
  try { value = JSON.parse(readFileSync(configuration.receiptPath, "utf8")); }
  catch { throw new Error("The root-owned exact-deployment receipt is missing or invalid."); }
  guard(record(value) && value.schemaVersion === "geoai.sprint10.real-password-preview-receipt.v1",
    "The root-owned exact-deployment receipt schema is not accepted.");
  const deployment = record(value.deployment) ? value.deployment : null;
  const protection = record(value.protection) ? value.protection : null;
  guard(deployment?.url === configuration.origin && deployment?.state === "READY" && deployment?.target === "preview" &&
    deployment?.commitSha === configuration.commit && typeof deployment?.id === "string" && /^dpl_[A-Za-z0-9]+$/.test(deployment.id),
  "The receipt is not bound to this exact READY Preview URL and commit.");
  guard(protection?.kind === "vercel_sso" && [301, 302, 303, 307, 308].includes(Number(protection?.anonymousStatus)) &&
    protection?.locationOrigin === "https://vercel.com" && protection?.locationPath === "/sso-api",
  "The receipt does not prove the expected anonymous Vercel SSO challenge.");
  return { anonymousStatus: Number(protection.anonymousStatus) };
}

type NetworkPolicy = {
  snapshotJourneyRequests: () => Record<string, number>;
  assertClean: () => void;
};

async function installNetworkPolicy(page: Page, configuration: LiveConfiguration): Promise<NetworkPolicy> {
  const authOrigin = `https://${EXACT_DEVELOPMENT_PROJECT_REF}.supabase.co`;
  const allowedApplicationPosts = new Set([
    "/api/auth/logout",
    "/api/prototype/point-to-object/suggest",
    "/api/prototype/point-to-object/search",
    "/api/prototype/point-to-object/context",
    "/api/prototype/point-to-object/find",
    "/api/prototype/point-to-object/area-context",
    "/api/prototype/point-to-object/ai",
    "/api/prototype/point-to-object/create"
  ]);
  const journeyRequests = new Map<string, number>();
  let blockedApplicationRequests = 0;
  let blockedSupabaseRequests = 0;
  let blockedExternalRequests = 0;

  await page.route("**/*", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    if (url.protocol !== "http:" && url.protocol !== "https:") return route.continue();
    if (url.origin === configuration.origin) {
      const key = `${method} ${url.pathname}`;
      journeyRequests.set(key, (journeyRequests.get(key) ?? 0) + 1);
      const allowedRead = method === "GET" || method === "HEAD";
      const allowedMutation = method === "POST" && !url.search && allowedApplicationPosts.has(url.pathname);
      if (!allowedRead && !allowedMutation) {
        blockedApplicationRequests += 1;
        return route.abort("blockedbyclient");
      }
      return route.continue({ headers: { ...request.headers(), "x-vercel-protection-bypass": configuration.bypass } });
    }
    if (url.origin === authOrigin) {
      const preflight = method === "OPTIONS" && ["/auth/v1/token", "/auth/v1/user", "/auth/v1/logout"].includes(url.pathname);
      const token = method === "POST" && url.pathname === "/auth/v1/token" &&
        ["password", "refresh_token"].includes(url.searchParams.get("grant_type") ?? "") &&
        [...url.searchParams.keys()].every((key) => key === "grant_type");
      const userRead = method === "GET" && url.pathname === "/auth/v1/user" && !url.search;
      const logout = method === "POST" && url.pathname === "/auth/v1/logout" &&
        [...url.searchParams.keys()].every((key) => key === "scope");
      if (preflight || token || userRead || logout) return route.continue();
      blockedSupabaseRequests += 1;
      return route.abort("blockedbyclient");
    }
    if (url.origin === "https://tiles.openfreemap.org" && (method === "GET" || method === "HEAD")) return route.continue();
    blockedExternalRequests += 1;
    return route.abort("blockedbyclient");
  });

  return {
    snapshotJourneyRequests: () => Object.fromEntries(journeyRequests),
    assertClean() {
      guard(blockedApplicationRequests === 0, "The browser attempted an application operation outside the exact journey allowlist.");
      guard(blockedSupabaseRequests === 0, "The browser attempted a Supabase operation outside ordinary existing-user Auth.");
      guard(blockedExternalRequests === 0, "The browser attempted an unapproved external request.");
    }
  };
}

type PendingPaidRequest = {
  receipt: Sprint10Receipt;
  identity: Sprint10RequestIdentity;
  terminal: boolean;
};

function installBudgetGate(page: Page, configuration: LiveConfiguration) {
  const pending = new Map<Request, PendingPaidRequest>();
  const terminalTasks = new Set<Promise<void>>();
  const occurrences: Record<Sprint10Route, number> = { ai: 0, create: 0 };
  const receiptIds: number[] = [];
  let fatal: string | null = null;

  const markUnknown = (item: PendingPaidRequest, reason: "request_failed_after_dispatch" | "response_unreadable") => {
    if (item.terminal) return;
    item.terminal = true;
    markSprint10SpendUnknownFile(
      configuration.ledgerRoot,
      configuration.ledgerPath,
      item.receipt.id,
      item.identity,
      new Date().toISOString(),
      reason
    );
    fatal = "A dispatched paid request has an unknown charge; every later paid request is blocked.";
  };

  const registration = page.route(/\/api\/prototype\/point-to-object\/(ai|create)(?:\?|$)/, async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.fallback();
    const routeName = new URL(request.url()).pathname.endsWith("/ai") ? "ai" : "create";
    occurrences[routeName] += 1;
    if (occurrences[routeName] > 1) {
      fatal = `The bounded ${routeName} scenario attempted more than one paid POST.`;
      return route.abort("blockedbyclient");
    }
    let body: Record<string, unknown> | null = null;
    try {
      const parsed = request.postDataJSON();
      body = record(parsed) ? parsed : null;
    } catch { body = null; }
    const depth = body?.depth;
    if (depth !== "quick" && depth !== "standard" && depth !== "deep") {
      fatal = "A paid request without an explicit supported depth was blocked before dispatch.";
      return route.abort("blockedbyclient");
    }
    const identity: Sprint10RequestIdentity = {
      requestKey: sprint10LiveRequestKey(configuration.scope, routeName, occurrences[routeName], configuration.commit),
      phase: "S4",
      candidateHost: configuration.host,
      candidateCommit: configuration.commit,
      route: routeName,
      depth: depth as Sprint10Depth,
      promptVersion: routeName === "ai" ? SPRINT10_ANALYSIS_PROMPT_VERSION : SPRINT10_CREATE_PROMPT_VERSION,
      schemaVersion: routeName === "ai" ? 6 : null
    };
    let item: PendingPaidRequest | null = null;
    const guarded = await dispatchSprint10PaidRequest({
      reserve() {
        const reservation = reserveSprint10SpendFile(configuration.ledgerRoot, configuration.ledgerPath, identity, new Date().toISOString());
        guard(reservation.ledger.ledgerId === EXPECTED_LEDGER_ID, "The paid reservation reached an unexpected cycle ledger.");
        item = { receipt: reservation.receipt, identity, terminal: false };
        pending.set(request, item);
        receiptIds.push(reservation.receipt.id);
        return { receipt: item };
      },
      dispatch: () => route.fallback(),
      markUnknown(registered) { markUnknown(registered, "request_failed_after_dispatch"); }
    });
    if (!guarded.ok) {
      fatal = `The live spend gate stopped the request: ${guarded.reason}`;
      await route.abort("blockedbyclient");
    }
  });

  page.on("response", (response: Response) => {
    const item = pending.get(response.request());
    if (!item || item.terminal) return;
    const task = (async () => {
      try {
        const bytes = await response.body();
        const payload: unknown = JSON.parse(bytes.toString("utf8"));
        const telemetry = parseSprint10ProviderTelemetry(item.identity, payload);
        const ledger = settleSprint10SpendFile(configuration.ledgerRoot, configuration.ledgerPath, item.receipt.id, item.identity, {
          settledAt: new Date().toISOString(),
          status: response.status(),
          resultHash: createHash("sha256").update(bytes).digest("hex"),
          telemetry
        });
        item.terminal = true;
        const stored = ledger.receipts.find((receipt) => receipt.id === item.receipt.id);
        if (stored?.state !== "settled") fatal = "The paid response did not carry accepted current-route telemetry; its charge is unknown.";
      } catch {
        markUnknown(item, "response_unreadable");
      } finally {
        pending.delete(response.request());
      }
    })();
    terminalTasks.add(task);
    void task.finally(() => terminalTasks.delete(task));
  });

  page.on("requestfailed", (request: Request) => {
    const item = pending.get(request);
    if (!item) return;
    try { markUnknown(item, "request_failed_after_dispatch"); }
    finally { pending.delete(request); }
  });

  async function waitForTerminalReceipts() {
    await Promise.all([...terminalTasks]);
    if (fatal) throw new Error(fatal);
    const ledger = readSprint10SpendLedgerFile(configuration.ledgerRoot, configuration.ledgerPath);
    guard(ledger.ledgerId === EXPECTED_LEDGER_ID, "The cycle ledger identity changed.");
    guard(sprint10LedgerCharge(ledger) <= SPRINT10_LIVE_CEILING_USD, "The shared USD 15 ceiling was exceeded.");
    for (const receiptId of receiptIds) {
      guard(ledger.receipts.find((receipt) => receipt.id === receiptId)?.state === "settled",
        "A paid request did not reach an accepted settled state.");
    }
  }

  return {
    ready: registration,
    paidDispatchCount: () => occurrences.ai + occurrences.create,
    receiptIds: () => [...receiptIds],
    waitForTerminalReceipts,
    async finalize() {
      await Promise.all([...terminalTasks]);
      for (const item of pending.values()) markUnknown(item, "request_failed_after_dispatch");
      pending.clear();
    }
  };
}

async function verifyAnonymousProtection(configuration: LiveConfiguration) {
  const receipt = loadDeploymentReceipt(configuration);
  const response = await fetch(`${configuration.origin}/api/health`, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
    headers: { Accept: "text/html" }
  });
  guard(response.status === receipt.anonymousStatus, "The anonymous Preview response no longer matches the protected-deployment receipt.");
  const location = new URL(response.headers.get("location") ?? "", configuration.origin);
  guard(location.origin === "https://vercel.com" && location.pathname === "/sso-api",
    "The exact Preview no longer challenges anonymous access through Vercel SSO.");
}

async function verifyExactPreview(page: Page, configuration: LiveConfiguration) {
  const response = await page.goto(`${configuration.origin}/api/health`, { waitUntil: "domcontentloaded" });
  guard(response?.status() === 200, "The bypassed exact Preview health endpoint was not available.");
  const body: unknown = await response.json();
  guard(record(body) && body.status === "ok" && body.productStage === "public_demo_prototype" &&
    body.environment === "vercel_preview" && body.releaseCommit === configuration.commit,
  "The health response is not the approved exact Preview release.");
  const deployment = record(body.deploymentMetadata) ? body.deploymentMetadata : null;
  guard(deployment?.provider === "vercel" && deployment?.deploymentHost === configuration.host,
    "The health response is not bound to the exact Preview host.");
}

async function login(page: Page, configuration: LiveConfiguration) {
  await page.goto("/login?next=%2Fprototype%2Fpoint-to-object");
  await expect(page.getByRole("heading", { name: "Sign in to GeoAI" })).toBeVisible();
  await page.getByLabel("Email or phone").fill(configuration.email);
  await page.getByLabel("Password").fill(configuration.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/prototype/point-to-object" || url.pathname === "/profile"),
    page.getByRole("button", { name: "Sign in", exact: true }).click()
  ]);
  const evidence = await page.evaluate(async (expectedId) => {
    const response = await fetch("/api/auth/session", { method: "GET", credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => null) as {
      isAuthenticated?: unknown;
      supabaseAuthenticated?: unknown;
      isDemo?: unknown;
      sessionStatus?: unknown;
      user?: { id?: unknown; isDemoUser?: unknown } | null;
      supabaseUser?: { id?: unknown } | null;
    } | null;
    return {
      status: response.status,
      noStore: response.headers.get("cache-control")?.includes("no-store") === true,
      accepted: body?.isAuthenticated === true && body?.supabaseAuthenticated === true && body?.isDemo === false &&
        body?.user?.isDemoUser === false && body?.sessionStatus === "supabase_user_with_profile" &&
        body?.user?.id === expectedId && body?.supabaseUser?.id === expectedId
    };
  }, configuration.userId);
  guard(evidence.status === 200 && evidence.noStore && evidence.accepted,
    "The browser session did not match the injected permanent synthetic identity.");
}

async function logout(page: Page) {
  await page.goto("/profile");
  const button = page.getByRole("button", { name: "Sign out", exact: true });
  if (await button.isVisible().catch(() => false)) await button.click();
}

type ArtifactKind = "analyse" | "find" | "create";

async function localArtifactState(page: Page, userId: string, kind: ArtifactKind) {
  return page.evaluate(({ expectedUserId, expectedKind }) => {
    const identityKey = `user:${expectedUserId}`;
    const key = `geoai:point-to-object:projects:v1:${encodeURIComponent(identityKey)}`;
    const raw = localStorage.getItem(key);
    const store = raw ? JSON.parse(raw) : null;
    if (store?.identityKey !== identityKey) return null;
    const artifacts = (store.projects ?? []).flatMap((project: { artifacts?: unknown[] }) => project.artifacts ?? []) as Array<Record<string, unknown>>;
    const artifact = artifacts.find((candidate) => candidate.kind === expectedKind);
    if (!artifact) return null;
    const payload = recordForBrowser(artifact.payload);
    const session = recordForBrowser(payload?.session);
    return {
      count: artifacts.filter((candidate) => candidate.kind === expectedKind).length,
      activeAlternativeId: payload?.activeAlternativeId ?? null,
      dashboardOpen: payload?.dashboardOpen ?? null,
      shortlistCount: Array.isArray(session?.shortlist) ? session.shortlist.length : null,
      comparisonView: session?.comparisonView ?? null
    };

    function recordForBrowser(value: unknown): Record<string, unknown> | null {
      return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
    }
  }, { expectedUserId: userId, expectedKind: kind });
}

const replayKeys = [
  "POST /api/prototype/point-to-object/suggest",
  "POST /api/prototype/point-to-object/search",
  "POST /api/prototype/point-to-object/context",
  "POST /api/prototype/point-to-object/find",
  "POST /api/prototype/point-to-object/area-context",
  "GET /api/prototype/point-to-object/ai",
  "POST /api/prototype/point-to-object/ai",
  "GET /api/prototype/point-to-object/create",
  "POST /api/prototype/point-to-object/create"
] as const;

function assertNoReplay(before: Record<string, number>, after: Record<string, number>) {
  for (const key of replayKeys) expect(after[key] ?? 0, `${key} must not replay while reopening a browser-local artifact`).toBe(before[key] ?? 0);
}

async function reopenSavedArtifact(
  page: Page,
  kind: ArtifactKind,
  policy: NetworkPolicy,
  verify: () => Promise<void>
) {
  await page.goto("/projects?view=spatial");
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  const summary = page.getByTestId(`hub-count-${kind}`);
  await expect(summary.getByTestId("hub-count-value")).not.toHaveText("0");
  await summary.click();
  const card = page.getByTestId("saved-result-card").first();
  const before = policy.snapshotJourneyRequests();
  await card.getByRole("button", { name: kind === "analyse" ? "Open result" : "Show on map", exact: true }).click();
  await verify();
  assertNoReplay(before, policy.snapshotJourneyRequests());
}

async function runDubaiAnalyse(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>) {
  await page.goto("/prototype/point-to-object");
  await page.getByTestId("point-object-city-select").selectOption("dubai");
  const suggestResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/suggest"), { timeout: 30_000 });
  await page.getByRole("combobox", { name: "Search address or place" }).fill("Shangri-La Dubai");
  const suggested = await suggestResponse;
  const suggestionPayload: unknown = await suggested.json();
  guard(suggested.status() === 200 && record(suggestionPayload) && suggestionPayload.protocol === "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1" &&
    suggestionPayload.provider === "Photon" && record(suggestionPayload.source) && suggestionPayload.source.licenceId === "ODbL-1.0" &&
    suggestionPayload.source.officialStatus === "open_context_not_official" && Array.isArray(suggestionPayload.results) && suggestionPayload.results.length > 0,
  "The Dubai source suggestion did not return accepted Photon/OSM evidence.");
  const resultRecords = suggestionPayload.results as Array<Record<string, unknown>>;
  const chosenIndex = resultRecords.findIndex((candidate) => record(candidate) && /shangri/i.test(String(candidate.label)));
  const chosen = chosenIndex >= 0 ? resultRecords[chosenIndex] : undefined;
  guard(chosen && typeof chosen.id === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(chosen.id),
    "The exact Dubai source candidate was not returned; no fallback candidate was used.");
  const option = page.locator(`#point-object-search-result-${chosenIndex}`);
  await expect(option).toBeVisible();
  const contextResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/context"), { timeout: 45_000 });
  await option.click();
  const context = await contextResponse;
  const contextPayload: unknown = await context.json();
  guard(context.status() === 200 && record(contextPayload) && contextPayload.mode === "resolved" && contextPayload.schemaVersion === 2 &&
    record(contextPayload.subject) && contextPayload.subject.sourceFeatureId === chosen.id,
  "The selected Dubai source identity was not resolved to the exact structured object.");
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled({ timeout: 45_000 });
  await page.locator("#point-object-question").fill("What evidence supports this screening result, and what must be validated before a redevelopment decision?");
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/ai"), { timeout: 180_000 });
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  const response = await responsePromise;
  const payload: unknown = await response.json();
  await budget.waitForTerminalReceipts();
  guard(response.status() === 200 && record(payload) && payload.mode === "openai" && payload.schemaVersion === 6 &&
    typeof payload.evidencePackId === "string" && typeof payload.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(payload.evidencePackHash) &&
    record(payload.request) && payload.request.depth === "standard" && payload.request.role === "developer" && payload.request.scenario === "unspecified" &&
    record(payload.subject) && payload.subject.sourceFeatureId === chosen.id && payload.subject.sourceLabel === "© OpenStreetMap contributors" &&
    record(payload.content) && payload.content.caveat === CAVEAT && record(payload.content.depthReview) && payload.content.depthReview.depth === "standard",
  "The Dubai Analyse response did not preserve current V10 depth, role/scenario provenance and source identity.");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await expect.poll(async () => (await localArtifactState(page, configuration.userId, "analyse"))?.count ?? 0).toBe(1);
  const paidBeforeReopen = budget.paidDispatchCount();
  await reopenSavedArtifact(page, "analyse", policy, async () => {
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  });
  expect(budget.paidDispatchCount()).toBe(paidBeforeReopen);
}

class InconclusiveLiveCoverageError extends Error {
  constructor(message: string) {
    super(`INCONCLUSIVE_LIVE_COVERAGE: ${message}`);
    this.name = "InconclusiveLiveCoverageError";
  }
}

async function runDubaiFind(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>) {
  await page.goto("/prototype/point-to-object");
  await page.getByTestId("point-object-city-select").selectOption("dubai");
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await page.getByTestId("point-object-find-role-select").selectOption("consultant_broker");
  await page.getByTestId("point-object-find-scenario-select").selectOption("b2b_hotel_development");
  const zoomOut = page.getByRole("button", { name: "Zoom out" });
  if (await zoomOut.isVisible().catch(() => false)) {
    await zoomOut.click();
    await zoomOut.click();
  }
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/find"), { timeout: 45_000 });
  await expect(page.getByTestId("find-search-cta")).toBeEnabled({ timeout: 30_000 });
  await page.getByTestId("find-search-cta").click();
  const response = await responsePromise;
  const payload: unknown = await response.json();
  guard(response.status() === 200 && record(payload) && payload.protocol === "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1" &&
    (payload.mode === "results" || payload.mode === "empty") && Array.isArray(payload.candidates) && record(payload.source) &&
    payload.source.name === "OpenStreetMap" && payload.source.service === "Overpass API" && payload.source.licenceId === "ODbL-1.0" &&
    payload.source.runtimeNetworkUsed === true && payload.source.persistenceUsed === false && payload.source.officialStatus === "open_context_not_official" &&
    record(payload.coverage) && payload.coverage.completeInventory === false && payload.ordering === "source_identity_ascending_not_ranked" && payload.caveat === CAVEAT,
  "The Dubai Find response did not preserve the bounded open-map source contract.");
  const candidates = payload.candidates as Array<Record<string, unknown>>;
  if (candidates.length < 2) {
    throw new InconclusiveLiveCoverageError(`Dubai Find returned ${candidates.length} usable candidate(s); Compare requires at least two.`);
  }
  const identities = candidates.slice(0, 2).map((candidate) => candidate.sourceFeatureId);
  guard(identities.every((value) => typeof value === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(value)) && new Set(identities).size === 2,
    "Dubai Find did not return two distinct exact source identities.");
  const items = page.getByTestId("find-scroll-region").getByRole("listitem");
  await expect(items).toHaveCount(candidates.length);
  await items.nth(0).getByRole("button", { name: "Compare", exact: true }).click();
  await items.nth(1).getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await expect(page.getByTestId("find-comparison-grid")).toBeVisible();
  await page.getByRole("button", { name: "Open full comparison dashboard", exact: true }).click();
  await expect(page.getByTestId("find-full-comparison-dashboard")).toBeVisible();
  await expect.poll(async () => {
    const state = await localArtifactState(page, configuration.userId, "find");
    return `${state?.shortlistCount ?? 0}:${state?.comparisonView ?? "none"}`;
  }).toBe("2:dashboard");
  const paidBeforeReopen = budget.paidDispatchCount();
  await reopenSavedArtifact(page, "find", policy, async () => {
    await expect(page.getByTestId("find-full-comparison-dashboard")).toBeVisible();
  });
  expect(budget.paidDispatchCount()).toBe(paidBeforeReopen);
}

async function runSingaporeCreate(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>) {
  await page.goto("/prototype/point-to-object");
  await page.getByTestId("point-object-city-select").selectOption("singapore");
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  const coordinates = [[
    [103.8580, 1.2815],
    [103.8600, 1.2815],
    [103.8600, 1.2830],
    [103.8580, 1.2830],
    [103.8580, 1.2815]
  ]];
  const contextPromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/area-context"), { timeout: 45_000 });
  await page.getByLabel("Upload GeoJSON", { exact: true }).setInputFiles({
    name: "sprint10-singapore-live-aoi.geojson",
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates }))
  });
  const contextResponse = await contextPromise;
  const contextPayload: unknown = await contextResponse.json();
  guard(contextResponse.status() === 200 && record(contextPayload) && contextPayload.protocol === "POINT_TO_OBJECT_001_AREA_CONTEXT_V1" &&
    (contextPayload.mode === "results" || contextPayload.mode === "empty") && record(contextPayload.request) && contextPayload.request.marketKey === "singapore" &&
    record(contextPayload.source) && contextPayload.source.name === "OpenStreetMap" && contextPayload.source.service === "Overpass API" &&
    contextPayload.source.licenceId === "ODbL-1.0" && contextPayload.source.runtimeNetworkUsed === true &&
    contextPayload.source.persistenceUsed === false && contextPayload.caveat === CAVEAT,
  "The Singapore AOI did not return accepted bounded Overpass evidence.");
  await page.getByRole("button", { name: /^Business towers/ }).click();
  await expect(page.getByTestId("create-generate-action")).toBeEnabled();
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/create"), { timeout: 180_000 });
  await page.getByTestId("create-generate-action").click();
  const response = await responsePromise;
  const payload: unknown = await response.json();
  await budget.waitForTerminalReceipts();
  guard(response.status() === 200 && record(payload) && payload.mode === "openai_concept" &&
    payload.promptVersion === SPRINT10_CREATE_PROMPT_VERSION && Array.isArray(payload.alternatives) && payload.alternatives.length === 2 &&
    payload.alternatives.every((item) => record(item) && (item.id === "A" || item.id === "B")) && payload.caveat === CAVEAT,
  "The Singapore Create response did not return one strict current A/B concept.");
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  const paidAfterGeneration = budget.paidDispatchCount();
  await page.getByTestId("create-alternative-b").click();
  await page.getByTestId("create-open-result-dashboard").click();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  expect(budget.paidDispatchCount()).toBe(paidAfterGeneration);
  await expect.poll(async () => {
    const state = await localArtifactState(page, configuration.userId, "create");
    return `${state?.activeAlternativeId ?? "none"}:${String(state?.dashboardOpen)}`;
  }).toBe("B:true");
  await reopenSavedArtifact(page, "create", policy, async () => {
    await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
    await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  });
  const beforeReload = policy.snapshotJourneyRequests();
  await page.reload();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  assertNoReplay(beforeReload, policy.snapshotJourneyRequests());
  expect(budget.paidDispatchCount()).toBe(paidAfterGeneration);
}

test("root-authorized protected Preview source-to-decision journey", async ({ page, baseURL }) => {
  test.skip(!runnerActive, "Live execution requires the fail-closed root-owned runner.");
  test.setTimeout(720_000);
  const configuration = loadConfiguration(baseURL);
  const initialLedger = readSprint10SpendLedgerFile(configuration.ledgerRoot, configuration.ledgerPath);
  guard(initialLedger.ledgerId === EXPECTED_LEDGER_ID, "The existing cycle-root ledger identity is not accepted.");
  const policy = await installNetworkPolicy(page, configuration);
  const budget = installBudgetGate(page, configuration);
  await budget.ready;
  await page.setViewportSize({ width: 1440, height: 1000 });
  let delayedInconclusive: InconclusiveLiveCoverageError | null = null;
  try {
    await verifyAnonymousProtection(configuration);
    await verifyExactPreview(page, configuration);
    await login(page, configuration);
    if (configuration.scope === "journey" || configuration.scope === "dubai-analyse") {
      await runDubaiAnalyse(page, configuration, policy, budget);
    }
    if (configuration.scope === "journey" || configuration.scope === "dubai-find") {
      try { await runDubaiFind(page, configuration, policy, budget); }
      catch (error) {
        if (error instanceof InconclusiveLiveCoverageError) delayedInconclusive = error;
        else throw error;
      }
    }
    if (configuration.scope === "journey" || configuration.scope === "singapore-create") {
      await runSingaporeCreate(page, configuration, policy, budget);
    }
    await budget.waitForTerminalReceipts();
    policy.assertClean();
    if (delayedInconclusive) throw delayedInconclusive;
  } finally {
    try {
      await budget.finalize();
    } finally {
      await logout(page).catch(() => undefined);
    }
  }
});
