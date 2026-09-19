import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  expect,
  test,
  type Locator,
  type Page,
  type Request,
  type Response,
  type Route
} from "@playwright/test";

import { isPointObjectAreaContextResult } from "../../src/lib/prototype/point-to-object-create-result";
import { coordinatesMatchPointObjectMarket, type PointObjectMarketKey } from "../../src/lib/prototype/point-to-object-markets";

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
  SPRINT10_LIVE_PAID_SCOPE_MATRIX,
  sprint10PaidPostDecision,
  type Sprint10LiveScope,
  sprint10LiveRequestKey
} from "./helpers/sprint10-live-journey-gate";
import {
  SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN,
  SPRINT10_PUBLIC_ANALYSIS_QUESTION,
  validateSprint10AnalysisEvidencePath,
  writeSprint10AnalysisResultEvidence
} from "./helpers/sprint10-analysis-result-evidence";
// @ts-expect-error The diagnostics module is an operator-only JavaScript contract checked by its offline suite.
import { LIVE_JOURNEY_CLEANUP_STAGES, LIVE_JOURNEY_STEPS, boundedLiveJourneyResponseJson, encodeLiveJourneyDiagnostic, primaryAfterFinalizeFailure } from "../../scripts/sprint10-live-journey-diagnostics.mjs";

test.use({ trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" });
test.describe.configure({ mode: "serial", retries: 0 });

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const EXACT_DEVELOPMENT_PROJECT_REF = "pphdqkurxneyagvnnjdt";
const EXPECTED_LEDGER_ID = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const LIVE_SCOPES = [
  "journey", "dubai-analyse", "dubai-find", "singapore-create",
  "singapore-analyse", "singapore-find", "dubai-create"
] as const;
const SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS = [103.855, 1.278, 103.868, 1.289] as const;
type LiveScope = Sprint10LiveScope;

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
  analysisEvidencePath: string | null;
};

function guard(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type LiveProgress = {
  start: (step: string) => void;
  complete: (step: string) => void;
  current: () => string;
  completed: () => string[];
};

function createLiveProgress(): LiveProgress {
  let active = "anonymous_protection";
  const completed: string[] = [];
  return {
    start(step) {
      guard(LIVE_JOURNEY_STEPS.includes(step), "The live diagnostic step is not allowlisted.");
      active = step;
    },
    complete(step) {
      guard(step === active && LIVE_JOURNEY_STEPS.includes(step), "The live diagnostic step order is invalid.");
      if (!completed.includes(step)) completed.push(step);
    },
    current: () => active,
    completed: () => [...completed]
  };
}

function cleanupStage(error: unknown): string {
  const match = error instanceof Error ? /^LIVE_JOURNEY_CLEANUP_FAILED: ([a-z_]+)$/.exec(error.message) : null;
  return match && LIVE_JOURNEY_CLEANUP_STAGES.includes(match[1]) ? match[1] : "logout_unknown";
}

function required(name: string): string {
  const value = process.env[name];
  guard(typeof value === "string" && value.length > 0, `Missing required runtime setting: ${name}.`);
  return value;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactObjectKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function isoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function acceptedSingaporeFindRequest(value: unknown): value is Record<string, unknown> & { bounds: number[] } {
  if (!record(value) || !Array.isArray(value.bounds) || value.bounds.length !== 4 ||
      value.bounds.some((item) => typeof item !== "number" || !Number.isFinite(item))) return false;
  return value.marketKey === "singapore" && value.locale === "en" && value.group === "commercial_office" &&
    value.mappedMinimumLevels === null && value.mappedMaximumLevels === null && value.limit === 12 &&
    value.bounds[0] >= SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS[0] &&
    value.bounds[1] >= SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS[1] &&
    value.bounds[2] <= SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS[2] &&
    value.bounds[3] <= SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS[3];
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
  const evidenceOptIn = process.env.GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE;
  const evidencePath = process.env.GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH;
  const evidenceRequested = evidenceOptIn !== undefined || evidencePath !== undefined;
  if (evidenceRequested) {
    guard(evidenceOptIn === SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN && typeof evidencePath === "string" && evidencePath.length > 0,
      "Analysis evidence capture requires its exact opt-in and one explicit output path.");
    guard(selectedScope === "journey" || selectedScope === "dubai-analyse",
      "Analysis evidence capture is available only for a scope containing the bounded Dubai Analyse scenario.");
    validateSprint10AnalysisEvidencePath(evidencePath);
  }
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
    receiptPath: required("GEOAI_SPRINT10_LIVE_DEPLOYMENT_RECEIPT_PATH"),
    analysisEvidencePath: evidenceRequested ? evidencePath! : null
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
    const expected = SPRINT10_LIVE_PAID_SCOPE_MATRIX[configuration.scope][routeName];
    const decision = sprint10PaidPostDecision(configuration.scope, routeName, occurrences[routeName]);
    if (!decision.ok) {
      fatal = decision.reason === "route_disallowed"
        ? `The ${configuration.scope} scope attempted a disallowed ${routeName} paid POST before reservation.`
        : `The bounded ${routeName} scenario attempted more than ${expected} paid POST.`;
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
    assertExpectedScopeCounts() {
      for (const routeName of ["ai", "create"] as const) {
        guard(occurrences[routeName] === SPRINT10_LIVE_PAID_SCOPE_MATRIX[configuration.scope][routeName],
          `The ${configuration.scope} scope did not produce the exact ${routeName} paid-POST count.`);
      }
      if (fatal) throw new Error(fatal);
    },
    async finalize() {
      await Promise.all([...terminalTasks]);
      for (const item of pending.values()) markUnknown(item, "request_failed_after_dispatch");
      pending.clear();
      if (fatal) throw new Error(fatal);
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

async function browserSessionState(page: Page, expectedUserId: string) {
  return page.evaluate(async (userId) => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000)
      });
      const body = await response.json().catch(() => null) as {
        isAuthenticated?: unknown;
        supabaseAuthenticated?: unknown;
        sessionStatus?: unknown;
        user?: { id?: unknown } | null;
      } | null;
      if (response.status !== 200 || response.headers.get("cache-control")?.includes("no-store") !== true) return "unavailable";
      if (body?.isAuthenticated === false && body?.supabaseAuthenticated === false && body?.sessionStatus === "session_missing" && body?.user === null) {
        return "anonymous";
      }
      if (body?.isAuthenticated === true && body?.supabaseAuthenticated === true && body?.user?.id === userId) return "authenticated";
      return "unavailable";
    } catch {
      return "unavailable";
    }
  }, expectedUserId);
}

type LiveAnalyseSuggestionCase = {
  marketKey: PointObjectMarketKey;
  query: string;
  enterQuery: (search: Locator) => Promise<void>;
  candidateLabel: RegExp;
  label: string;
};

type LiveAnalyseSuggestion = {
  chosen: Record<string, unknown> & { id: string; label: string; longitude: number; latitude: number };
  chosenIndex: number;
};

async function runAnalyseSourceSuggest(
  page: Page,
  input: LiveAnalyseSuggestionCase,
  progress: LiveProgress
): Promise<LiveAnalyseSuggestion> {
  progress.start("analyse_source_suggest_ui");
  await page.goto("/prototype/point-to-object");
  await page.getByTestId("point-object-city-select").selectOption(input.marketKey);
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await expect(search).toBeVisible();
  progress.complete("analyse_source_suggest_ui");

  progress.start("analyse_source_suggest_request");
  const requestPromise = page.waitForRequest((request) =>
    request.method() === "POST" && new URL(request.url()).pathname === "/api/prototype/point-to-object/suggest", { timeout: 30_000 });
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/prototype/point-to-object/suggest", { timeout: 30_000 });
  void responsePromise.catch(() => undefined);
  await input.enterQuery(search);
  const request = await requestPromise;
  const submitted: unknown = request.postDataJSON();
  progress.complete("analyse_source_suggest_request");

  progress.start("analyse_source_suggest_response");
  const suggested = await responsePromise;
  progress.complete("analyse_source_suggest_response");

  progress.start("analyse_source_suggest_http");
  guard(suggested.status() === 200, `The ${input.label} source suggestion did not return HTTP 200.`);
  progress.complete("analyse_source_suggest_http");

  progress.start("analyse_source_suggest_body");
  const suggestionPayload: unknown = await boundedLiveJourneyResponseJson(suggested, 10_000);
  progress.complete("analyse_source_suggest_body");

  progress.start("analyse_source_suggest_contract");
  guard(record(suggestionPayload) && suggestionPayload.protocol === "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1" &&
    suggestionPayload.mode === "results" && suggestionPayload.provider === "Photon" && record(suggestionPayload.source) &&
    suggestionPayload.source.attribution === "© OpenStreetMap contributors" && suggestionPayload.source.licenceId === "ODbL-1.0" &&
    suggestionPayload.source.licenceUrl === "https://www.openstreetmap.org/copyright" &&
    suggestionPayload.source.serviceUrl === "https://photon.komoot.io/" &&
    suggestionPayload.source.officialStatus === "open_context_not_official" && Array.isArray(suggestionPayload.results) &&
    suggestionPayload.results.length > 0 && suggestionPayload.results.length <= 5 &&
    suggestionPayload.results.every((candidate) => record(candidate) && typeof candidate.id === "string" &&
      /^(node|way|relation)\/[1-9]\d{0,19}$/.test(candidate.id) && typeof candidate.label === "string" &&
      candidate.label.trim().length > 0 && typeof candidate.longitude === "number" && Number.isFinite(candidate.longitude) &&
      typeof candidate.latitude === "number" && Number.isFinite(candidate.latitude)),
  `The ${input.label} source suggestion did not return accepted Photon/OSM evidence.`);
  const resultRecords = suggestionPayload.results as Array<Record<string, unknown>>;
  guard(new Set(resultRecords.map((candidate) => candidate.id)).size === resultRecords.length,
    `The ${input.label} source suggestion returned duplicate source identities.`);
  progress.complete("analyse_source_suggest_contract");

  progress.start("analyse_source_suggest_correlation");
  const responseSubmitted: unknown = suggested.request().postDataJSON();
  guard(suggested.request() === request &&
    exactObjectKeys(submitted, ["locale", "marketKey", "query"]) &&
    exactObjectKeys(responseSubmitted, ["locale", "marketKey", "query"]) &&
    JSON.stringify([responseSubmitted.marketKey, responseSubmitted.locale, responseSubmitted.query]) ===
      JSON.stringify([submitted.marketKey, submitted.locale, submitted.query]) &&
    submitted.marketKey === input.marketKey && submitted.locale === "en" && submitted.query === input.query &&
    resultRecords.every((candidate) => coordinatesMatchPointObjectMarket(
      input.marketKey,
      Number(candidate.longitude),
      Number(candidate.latitude)
    )), `The ${input.label} suggestion request/result was not correlated to the exact market and query.`);
  progress.complete("analyse_source_suggest_correlation");

  progress.start("analyse_source_suggest_candidate");
  const chosenIndex = resultRecords.findIndex((candidate) => input.candidateLabel.test(String(candidate.label)));
  const chosen = chosenIndex >= 0 ? resultRecords[chosenIndex] : undefined;
  guard(chosen && typeof chosen.id === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(chosen.id) &&
    typeof chosen.label === "string" && typeof chosen.longitude === "number" && typeof chosen.latitude === "number",
    `The exact ${input.label} source candidate was not returned; no fallback candidate was used.`);
  const option = page.locator(`#point-object-search-result-${chosenIndex}`);
  await expect(option).toBeVisible();
  await expect(option).toContainText(String(chosen.label));
  progress.complete("analyse_source_suggest_candidate");
  return {
    chosen: chosen as Record<string, unknown> & { id: string; label: string; longitude: number; latitude: number },
    chosenIndex
  };
}

async function logoutVerified(page: Page, expectedUserId: string) {
  const initial = await browserSessionState(page, expectedUserId);
  if (initial === "anonymous") return;
  if (initial !== "authenticated") throw new Error("LIVE_JOURNEY_CLEANUP_FAILED: logout_session_precheck");
  try { await page.goto("/profile", { waitUntil: "domcontentloaded", timeout: 60_000 }); }
  catch { throw new Error("LIVE_JOURNEY_CLEANUP_FAILED: logout_profile_navigation"); }
  const button = page.getByRole("button", { name: "Sign out", exact: true });
  try { await expect(button).toBeVisible({ timeout: 30_000 }); }
  catch { throw new Error("LIVE_JOURNEY_CLEANUP_FAILED: logout_action_missing"); }
  let response: Response;
  try {
    const responsePromise = page.waitForResponse((candidate) =>
      candidate.request().method() === "POST" && new URL(candidate.url()).pathname === "/api/auth/logout", { timeout: 30_000 });
    await button.click();
    response = await responsePromise;
  } catch {
    throw new Error("LIVE_JOURNEY_CLEANUP_FAILED: logout_response");
  }
  let payload: unknown;
  try { payload = await boundedLiveJourneyResponseJson(response, 10_000); }
  catch { throw new Error("LIVE_JOURNEY_CLEANUP_FAILED: logout_response"); }
  if (response.status() !== 200 || !record(payload) || payload.ok !== true || payload.status !== "signed_out") {
    throw new Error("LIVE_JOURNEY_CLEANUP_FAILED: logout_response");
  }
  try { await expect.poll(() => browserSessionState(page, expectedUserId), { timeout: 30_000 }).toBe("anonymous"); }
  catch { throw new Error("LIVE_JOURNEY_CLEANUP_FAILED: logout_session"); }
}

type ArtifactKind = "analyse" | "find" | "create";

type LocalArtifactState = {
  count: number;
  artifactId: string;
  payloadHash: string;
  label: string;
  viewRevision: number;
  domainIdentity: string;
  activeAlternativeId: unknown;
  shortlistCount: number | null;
  comparisonView: unknown;
  marketKey: unknown;
  role: unknown;
  scenario: unknown;
};

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
    const analysis = recordForBrowser(payload?.analysis);
    const analysisRequest = recordForBrowser(analysis?.request);
    const subject = recordForBrowser(analysis?.subject);
    const result = recordForBrowser(session?.result);
    const aoi = recordForBrowser(payload?.aoi);
    const generated = recordForBrowser(payload?.generated);
    const candidateIds = Array.isArray(result?.candidates)
      ? result.candidates.map((candidate) => recordForBrowser(candidate)?.sourceFeatureId ?? null)
      : [];
    const shortlistIds = Array.isArray(session?.shortlist)
      ? session.shortlist.map((candidate) => recordForBrowser(candidate)?.sourceFeatureId ?? null)
      : [];
    const alternativeIds = Array.isArray(generated?.alternatives)
      ? generated.alternatives.map((alternative) => recordForBrowser(alternative)?.id ?? null)
      : [];
    const domainIdentity = expectedKind === "analyse"
      ? { sourceFeatureId: subject?.sourceFeatureId ?? null, evidencePackHash: analysis?.evidencePackHash ?? null }
      : expectedKind === "find"
        ? { candidateIds, shortlistIds }
        : {
            aoiId: aoi?.id ?? null,
            generatedAt: generated?.generatedAt ?? null,
            promptVersion: generated?.promptVersion ?? null,
            alternativeIds
          };
    return {
      count: artifacts.filter((candidate) => candidate.kind === expectedKind).length,
      artifactId: artifact.artifactId,
      payloadHash: artifact.payloadHash,
      label: artifact.label,
      viewRevision: artifact.viewRevision,
      domainIdentity: JSON.stringify(domainIdentity),
      activeAlternativeId: payload?.activeAlternativeId ?? null,
      shortlistCount: Array.isArray(session?.shortlist) ? session.shortlist.length : null,
      comparisonView: session?.comparisonView ?? null,
      marketKey: artifact.marketKey ?? null,
      role: expectedKind === "analyse" ? analysisRequest?.role ?? null : session?.role ?? null,
      scenario: expectedKind === "analyse" ? analysisRequest?.scenario ?? null : session?.scenario ?? null
    };

    function recordForBrowser(value: unknown): Record<string, unknown> | null {
      return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
    }
  }, { expectedUserId: userId, expectedKind: kind });
}

async function requireLocalArtifactState(page: Page, userId: string, kind: ArtifactKind): Promise<LocalArtifactState> {
  const state = await localArtifactState(page, userId, kind);
  guard(state && state.count === 1 && typeof state.artifactId === "string" && state.artifactId.length > 0 &&
    typeof state.payloadHash === "string" && /^[a-f0-9]{64}$/.test(state.payloadHash) &&
    typeof state.label === "string" && state.label.length > 0 && typeof state.viewRevision === "number" &&
    Number.isInteger(state.viewRevision) && state.viewRevision >= 0 &&
    typeof state.domainIdentity === "string",
  `The browser-local ${kind} artifact identity is missing or ambiguous.`);
  return state as LocalArtifactState;
}

function assertSameArtifact(before: LocalArtifactState, after: LocalArtifactState) {
  expect(after.artifactId).toBe(before.artifactId);
  expect(after.payloadHash).toBe(before.payloadHash);
  expect(after.viewRevision).toBe(before.viewRevision);
  expect(after.domainIdentity).toBe(before.domainIdentity);
  expect(after.marketKey).toBe(before.marketKey);
  expect(after.role).toBe(before.role);
  expect(after.scenario).toBe(before.scenario);
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

async function stableLocalBarrier(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(1_000);
}

async function reopenSavedArtifact(
  page: Page,
  userId: string,
  kind: ArtifactKind,
  policy: NetworkPolicy,
  expected: LocalArtifactState,
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
  await stableLocalBarrier(page);
  const reopened = await requireLocalArtifactState(page, userId, kind);
  assertSameArtifact(expected, reopened);
  assertNoReplay(before, policy.snapshotJourneyRequests());
}

async function runDubaiAnalyse(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress) {
  const { chosen, chosenIndex } = await runAnalyseSourceSuggest(page, {
    marketKey: "dubai",
    query: "Shangri-La Dubai",
    enterQuery: (search) => search.fill("Shangri-La Dubai"),
    candidateLabel: /shangri/i,
    label: "Dubai"
  }, progress);
  const option = page.locator(`#point-object-search-result-${chosenIndex}`);
  progress.start("analyse_source_context");
  const contextResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/context"), { timeout: 45_000 });
  await option.click();
  const context = await contextResponse;
  const contextPayload: unknown = await context.json();
  guard(context.status() === 200 && record(contextPayload) && contextPayload.mode === "resolved" && contextPayload.schemaVersion === 2 &&
    record(contextPayload.subject) && contextPayload.subject.sourceFeatureId === chosen.id,
  "The selected Dubai source identity was not resolved to the exact structured object.");
  progress.complete("analyse_source_context");
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled({ timeout: 45_000 });
  await page.locator("#point-object-question").fill(SPRINT10_PUBLIC_ANALYSIS_QUESTION);
  progress.start("analyse_paid_response");
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/ai"), { timeout: 180_000 });
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  const response = await responsePromise;
  const payload: unknown = await response.json();
  progress.complete("analyse_paid_response");
  progress.start("analyse_paid_terminal");
  await budget.waitForTerminalReceipts();
  progress.complete("analyse_paid_terminal");
  progress.start("analyse_result_contract");
  guard(response.status() === 200 && record(payload) && payload.mode === "openai" && payload.schemaVersion === 6 &&
    typeof payload.evidencePackId === "string" && typeof payload.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(payload.evidencePackHash) &&
    record(payload.request) && payload.request.depth === "standard" && payload.request.role === "developer" && payload.request.scenario === "unspecified" &&
    record(payload.subject) && payload.subject.sourceFeatureId === chosen.id && payload.subject.sourceLabel === "© OpenStreetMap contributors" &&
    record(payload.content) && payload.content.caveat === CAVEAT && record(payload.content.depthReview) && payload.content.depthReview.depth === "standard",
  "The Dubai Analyse response did not preserve current V10 depth, role/scenario provenance and source identity.");
  progress.complete("analyse_result_contract");
  if (configuration.analysisEvidencePath) {
    progress.start("analyse_evidence_capture");
    const submittedRequest: unknown = response.request().postDataJSON();
    writeSprint10AnalysisResultEvidence(configuration.analysisEvidencePath, {
      response: payload,
      submittedRequest,
      expectedSourceFeatureId: chosen.id,
      telemetryIdentity: {
        requestKey: sprint10LiveRequestKey(configuration.scope, "ai", 1, configuration.commit),
        phase: "S4",
        candidateHost: configuration.host,
        candidateCommit: configuration.commit,
        route: "ai",
        depth: "standard",
        promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
        schemaVersion: 6
      }
    });
    progress.complete("analyse_evidence_capture");
  }
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  const expectedDomainIdentity = JSON.stringify({ sourceFeatureId: chosen.id, evidencePackHash: payload.evidencePackHash });
  progress.start("analyse_local_save");
  await expect.poll(async () => (await localArtifactState(page, configuration.userId, "analyse"))?.domainIdentity ?? null).toBe(expectedDomainIdentity);
  const saved = await requireLocalArtifactState(page, configuration.userId, "analyse");
  expect(saved.marketKey).toBe("dubai");
  expect(saved.role).toBe("developer");
  expect(saved.scenario).toBe("unspecified");
  progress.complete("analyse_local_save");
  const paidBeforeReopen = budget.paidDispatchCount();
  progress.start("analyse_local_reopen");
  await reopenSavedArtifact(page, configuration.userId, "analyse", policy, saved, async () => {
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  });
  expect(budget.paidDispatchCount()).toBe(paidBeforeReopen);
  progress.complete("analyse_local_reopen");
}

async function runSingaporeAnalyse(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress) {
  const { chosen, chosenIndex } = await runAnalyseSourceSuggest(page, {
    marketKey: "singapore",
    query: "Marina Bay Sands Tower 1",
    enterQuery: (search) => search.fill("Marina Bay Sands Tower 1"),
    candidateLabel: /marina bay sands.*tower 1/i,
    label: "Singapore"
  }, progress);
  const option = page.locator(`#point-object-search-result-${chosenIndex}`);
  progress.start("analyse_source_context");
  const contextResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/context"), { timeout: 45_000 });
  await option.click();
  const context = await contextResponse;
  const contextPayload: unknown = await context.json();
  guard(context.status() === 200 && record(contextPayload) && contextPayload.mode === "resolved" && contextPayload.schemaVersion === 2 &&
    record(contextPayload.subject) && contextPayload.subject.sourceFeatureId === chosen.id,
  "The selected Singapore source identity was not resolved to the exact structured object.");
  progress.complete("analyse_source_context");
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled({ timeout: 45_000 });
  await page.locator("#point-object-question").fill(SPRINT10_PUBLIC_ANALYSIS_QUESTION);
  progress.start("analyse_paid_response");
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/ai"), { timeout: 180_000 });
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  const response = await responsePromise;
  const payload: unknown = await response.json();
  progress.complete("analyse_paid_response");
  progress.start("analyse_paid_terminal");
  await budget.waitForTerminalReceipts();
  progress.complete("analyse_paid_terminal");
  progress.start("analyse_result_contract");
  guard(response.status() === 200 && record(payload) && payload.mode === "openai" && payload.schemaVersion === 6 &&
    typeof payload.evidencePackId === "string" && typeof payload.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(payload.evidencePackHash) &&
    record(payload.request) && payload.request.depth === "standard" && payload.request.role === "developer" && payload.request.scenario === "unspecified" &&
    record(payload.subject) && payload.subject.sourceFeatureId === chosen.id && payload.subject.sourceLabel === "© OpenStreetMap contributors" &&
    record(payload.content) && payload.content.caveat === CAVEAT && record(payload.content.depthReview) && payload.content.depthReview.depth === "standard",
  "The Singapore Analyse response did not preserve current V10 depth, role/scenario provenance and source identity.");
  progress.complete("analyse_result_contract");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  const expectedDomainIdentity = JSON.stringify({ sourceFeatureId: chosen.id, evidencePackHash: payload.evidencePackHash });
  progress.start("analyse_local_save");
  await expect.poll(async () => (await localArtifactState(page, configuration.userId, "analyse"))?.domainIdentity ?? null).toBe(expectedDomainIdentity);
  const saved = await requireLocalArtifactState(page, configuration.userId, "analyse");
  expect(saved.marketKey).toBe("singapore");
  expect(saved.role).toBe("developer");
  expect(saved.scenario).toBe("unspecified");
  progress.complete("analyse_local_save");
  const paidBeforeReopen = budget.paidDispatchCount();
  progress.start("analyse_local_reopen");
  await reopenSavedArtifact(page, configuration.userId, "analyse", policy, saved, async () => {
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  });
  expect(budget.paidDispatchCount()).toBe(paidBeforeReopen);
  progress.complete("analyse_local_reopen");
}

class InconclusiveLiveCoverageError extends Error {
  constructor(message: string) {
    super(`INCONCLUSIVE_LIVE_COVERAGE: ${message}`);
    this.name = "InconclusiveLiveCoverageError";
  }
}

async function runDubaiFind(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress) {
  progress.start("find_source_response");
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
    (payload.mode === "results" || payload.mode === "empty") && Array.isArray(payload.candidates) && record(payload.criteria) &&
    payload.criteria.marketKey === "dubai" && record(payload.source) &&
    payload.source.name === "OpenStreetMap" && payload.source.service === "Overpass API" && payload.source.licenceId === "ODbL-1.0" &&
    typeof payload.source.sourceResponseHash === "string" && /^[a-f0-9]{64}$/.test(payload.source.sourceResponseHash) &&
    isoTimestamp(payload.source.acquiredAt) && (payload.source.observedAt === null || isoTimestamp(payload.source.observedAt)) &&
    payload.source.runtimeNetworkUsed === true && payload.source.persistenceUsed === false && payload.source.officialStatus === "open_context_not_official" &&
    record(payload.coverage) && payload.coverage.completeInventory === false && payload.ordering === "source_identity_ascending_not_ranked" && payload.caveat === CAVEAT,
  "The Dubai Find response did not preserve the bounded open-map source contract.");
  progress.complete("find_source_response");
  progress.start("find_candidate_count");
  const candidates = payload.candidates as Array<Record<string, unknown>>;
  if (candidates.length < 2) {
    throw new InconclusiveLiveCoverageError(`Dubai Find returned ${candidates.length} usable candidate(s); Compare requires at least two.`);
  }
  const identities = candidates.slice(0, 2).map((candidate) => candidate.sourceFeatureId);
  guard(identities.every((value) => typeof value === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(value)) && new Set(identities).size === 2,
    "Dubai Find did not return two distinct exact source identities.");
  progress.complete("find_candidate_count");
  const items = page.getByTestId("find-scroll-region").getByRole("listitem");
  await expect(items).toHaveCount(candidates.length);
  progress.start("find_compare");
  const beforeLocalComparison = policy.snapshotJourneyRequests();
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
  await stableLocalBarrier(page);
  assertNoReplay(beforeLocalComparison, policy.snapshotJourneyRequests());
  progress.complete("find_compare");
  const expectedDomainIdentity = JSON.stringify({
    candidateIds: candidates.map((candidate) => candidate.sourceFeatureId),
    shortlistIds: identities
  });
  progress.start("find_local_save");
  await expect.poll(async () => (await localArtifactState(page, configuration.userId, "find"))?.domainIdentity ?? null).toBe(expectedDomainIdentity);
  const saved = await requireLocalArtifactState(page, configuration.userId, "find");
  expect(saved.marketKey).toBe("dubai");
  expect(saved.role).toBe("consultant_broker");
  expect(saved.scenario).toBe("b2b_hotel_development");
  progress.complete("find_local_save");
  const paidBeforeReopen = budget.paidDispatchCount();
  progress.start("find_local_reopen");
  await reopenSavedArtifact(page, configuration.userId, "find", policy, saved, async () => {
    await expect(page.getByTestId("find-full-comparison-dashboard")).toBeVisible();
    for (const identity of identities) await expect(page.getByText(String(identity), { exact: true })).toBeVisible();
  });
  expect(budget.paidDispatchCount()).toBe(paidBeforeReopen);
  progress.complete("find_local_reopen");
}

async function runSingaporeFind(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress) {
  progress.start("find_source_response");
  await page.goto("/prototype/point-to-object");
  await page.getByTestId("point-object-city-select").selectOption("singapore");
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await page.getByTestId("point-object-find-role-select").selectOption("consultant_broker");
  await page.getByTestId("point-object-find-scenario-select").selectOption("b2b_commercial_real_estate");
  await expect(page.getByTestId("point-object-find-group-select")).toHaveValue("commercial_office");
  const twoDimensionalControl = page.getByTestId("map-dimension-control").getByRole("button", { name: "2d", exact: true });
  await twoDimensionalControl.click();
  await expect(twoDimensionalControl).toHaveAttribute("aria-pressed", "true");
  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  await expect(zoomIn).toBeVisible({ timeout: 30_000 });
  await zoomIn.click();
  let resolvePreDispatch!: (value: Record<string, unknown> & { bounds: number[] }) => void;
  let rejectPreDispatch!: (reason: Error) => void;
  const preDispatchRequest = new Promise<Record<string, unknown> & { bounds: number[] }>((resolve, reject) => {
    resolvePreDispatch = resolve;
    rejectPreDispatch = reject;
  });
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    let submitted: unknown;
    try { submitted = route.request().postDataJSON(); }
    catch { submitted = null; }
    if (route.request().method() !== "POST" || !acceptedSingaporeFindRequest(submitted)) {
      rejectPreDispatch(new Error("The Singapore Find request failed its bounded pre-dispatch contract."));
      await route.abort("blockedbyclient");
      return;
    }
    resolvePreDispatch(submitted);
    await route.fallback();
  }, { times: 1 });
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/find"), { timeout: 45_000 });
  await expect(page.getByTestId("find-search-cta")).toBeEnabled({ timeout: 30_000 });
  const responseTransaction = Promise.all([responsePromise, preDispatchRequest]);
  await page.getByTestId("find-search-cta").click();
  const [response, submitted] = await responseTransaction;
  const payload: unknown = await response.json();
  const submittedBounds = submitted.bounds;
  guard(response.status() === 200 && record(payload) && payload.protocol === "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1" &&
    (payload.mode === "results" || payload.mode === "empty") && Array.isArray(payload.candidates) && record(payload.criteria) &&
    payload.criteria.marketKey === "singapore" && payload.criteria.group === "commercial_office" &&
    JSON.stringify(payload.criteria.bounds) === JSON.stringify(submittedBounds) && record(payload.source) &&
    payload.source.name === "OpenStreetMap" && payload.source.service === "Overpass API" && payload.source.licenceId === "ODbL-1.0" &&
    typeof payload.source.sourceResponseHash === "string" && /^[a-f0-9]{64}$/.test(payload.source.sourceResponseHash) &&
    isoTimestamp(payload.source.acquiredAt) && (payload.source.observedAt === null || isoTimestamp(payload.source.observedAt)) &&
    payload.source.runtimeNetworkUsed === true && payload.source.persistenceUsed === false && payload.source.officialStatus === "open_context_not_official" &&
    record(payload.coverage) && payload.coverage.completeInventory === false && payload.ordering === "source_identity_ascending_not_ranked" && payload.caveat === CAVEAT,
  "The Singapore Find response did not preserve the exact bounded request and open-map source contract.");
  progress.complete("find_source_response");
  progress.start("find_candidate_count");
  const candidates = payload.candidates as Array<Record<string, unknown>>;
  if (candidates.length < 2) {
    throw new InconclusiveLiveCoverageError(`Singapore Find returned ${candidates.length} usable candidate(s); Compare requires at least two.`);
  }
  const identities = candidates.slice(0, 2).map((candidate) => candidate.sourceFeatureId);
  guard(identities.every((value) => typeof value === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(value)) && new Set(identities).size === 2,
    "Singapore Find did not return two distinct exact source identities.");
  progress.complete("find_candidate_count");
  const items = page.getByTestId("find-scroll-region").getByRole("listitem");
  await expect(items).toHaveCount(candidates.length);
  progress.start("find_compare");
  const beforeLocalComparison = policy.snapshotJourneyRequests();
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
  await stableLocalBarrier(page);
  assertNoReplay(beforeLocalComparison, policy.snapshotJourneyRequests());
  progress.complete("find_compare");
  const expectedDomainIdentity = JSON.stringify({
    candidateIds: candidates.map((candidate) => candidate.sourceFeatureId),
    shortlistIds: identities
  });
  progress.start("find_local_save");
  await expect.poll(async () => (await localArtifactState(page, configuration.userId, "find"))?.domainIdentity ?? null).toBe(expectedDomainIdentity);
  const saved = await requireLocalArtifactState(page, configuration.userId, "find");
  expect(saved.marketKey).toBe("singapore");
  expect(saved.role).toBe("consultant_broker");
  expect(saved.scenario).toBe("b2b_commercial_real_estate");
  progress.complete("find_local_save");
  const paidBeforeReopen = budget.paidDispatchCount();
  progress.start("find_local_reopen");
  await reopenSavedArtifact(page, configuration.userId, "find", policy, saved, async () => {
    await expect(page.getByTestId("find-full-comparison-dashboard")).toBeVisible();
    for (const identity of identities) await expect(page.getByText(String(identity), { exact: true })).toBeVisible();
  });
  expect(budget.paidDispatchCount()).toBe(paidBeforeReopen);
  progress.complete("find_local_reopen");
}

type LiveCreateCase = {
  marketKey: "dubai" | "singapore";
  coordinates: number[][][];
  fileName: string;
  label: string;
};

async function runMarketCreate(
  page: Page,
  configuration: LiveConfiguration,
  policy: NetworkPolicy,
  budget: ReturnType<typeof installBudgetGate>,
  input: LiveCreateCase,
  progress: LiveProgress
) {
  progress.start("create_source_context_ui");
  await page.goto("/prototype/point-to-object");
  await page.getByTestId("point-object-city-select").selectOption(input.marketKey);
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  const upload = page.getByLabel("Upload GeoJSON", { exact: true });
  await expect(upload).toBeAttached();
  progress.complete("create_source_context_ui");

  progress.start("create_source_context_request");
  const contextRequestPromise = page.waitForRequest((request) =>
    request.method() === "POST" && new URL(request.url()).pathname === "/api/prototype/point-to-object/area-context", { timeout: 45_000 });
  const contextResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/prototype/point-to-object/area-context", { timeout: 45_000 });
  void contextResponsePromise.catch(() => undefined);
  await upload.setInputFiles({
    name: input.fileName,
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: input.coordinates }))
  });
  const contextRequest = await contextRequestPromise;
  const submittedContext: unknown = contextRequest.postDataJSON();
  progress.complete("create_source_context_request");

  progress.start("create_source_context_response");
  const contextResponse = await contextResponsePromise;
  progress.complete("create_source_context_response");

  progress.start("create_source_context_http");
  guard(contextResponse.status() === 200, `The ${input.label} AOI context did not return HTTP 200.`);
  progress.complete("create_source_context_http");

  progress.start("create_source_context_body");
  const contextPayload: unknown = await boundedLiveJourneyResponseJson(contextResponse, 10_000);
  progress.complete("create_source_context_body");

  progress.start("create_source_context_contract");
  guard(isPointObjectAreaContextResult(contextPayload),
    `The ${input.label} AOI did not return a production-valid bounded Overpass result.`);
  progress.complete("create_source_context_contract");

  progress.start("create_source_context_correlation");
  const responseSubmittedContext: unknown = contextResponse.request().postDataJSON();
  guard(contextResponse.request() === contextRequest &&
    exactObjectKeys(submittedContext, ["aoiCoordinates", "locale", "marketKey"]) &&
    exactObjectKeys(responseSubmittedContext, ["aoiCoordinates", "locale", "marketKey"]) &&
    JSON.stringify([responseSubmittedContext.marketKey, responseSubmittedContext.locale, responseSubmittedContext.aoiCoordinates]) ===
      JSON.stringify([submittedContext.marketKey, submittedContext.locale, submittedContext.aoiCoordinates]) &&
    submittedContext.marketKey === input.marketKey && submittedContext.locale === "en" &&
    JSON.stringify(submittedContext.aoiCoordinates) === JSON.stringify(input.coordinates) &&
    contextPayload.request.marketKey === input.marketKey && contextPayload.request.locale === "en" &&
    JSON.stringify(contextPayload.request.aoiCoordinates) === JSON.stringify(input.coordinates) &&
    new Set(contextPayload.features.map((feature) => feature.sourceFeatureId)).size === contextPayload.features.length,
  `The ${input.label} AOI context was not correlated to the exact submitted market and polygon.`);
  progress.complete("create_source_context_correlation");

  progress.start("create_source_context_ui_acceptance");
  const areaContextSection = page.getByTestId("create-area-context-heading").locator("xpath=ancestor::section[1]");
  await expect(areaContextSection.getByText("Mapped objects", { exact: true })).toBeVisible();
  await expect(areaContextSection.locator("strong").first()).toHaveText(String(contextPayload.summary.sampleSize));
  progress.complete("create_source_context_ui_acceptance");
  await page.getByRole("button", { name: /^Business towers/ }).click();
  await expect(page.getByTestId("create-generate-action")).toBeEnabled();
  progress.start("create_paid_response");
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/create"), { timeout: 180_000 });
  await page.getByTestId("create-generate-action").click();
  const response = await responsePromise;
  const payload: unknown = await response.json();
  progress.complete("create_paid_response");
  progress.start("create_paid_terminal");
  await budget.waitForTerminalReceipts();
  progress.complete("create_paid_terminal");
  progress.start("create_result_contract");
  const submitted: unknown = response.request().postDataJSON();
  guard(record(submitted) && submitted.marketKey === input.marketKey && submitted.locale === "en" && submitted.depth === "standard" &&
    submitted.templateId === "commercial_hub" &&
    JSON.stringify(submitted.aoiCoordinates) === JSON.stringify(input.coordinates),
  `The ${input.label} Create request did not preserve the exact market, programme, depth and AOI.`);
  guard(response.status() === 200 && record(payload) && payload.mode === "openai_concept" &&
    typeof payload.generatedAt === "string" && Number.isFinite(Date.parse(payload.generatedAt)) &&
    payload.promptVersion === SPRINT10_CREATE_PROMPT_VERSION && Array.isArray(payload.alternatives) && payload.alternatives.length === 2 &&
    payload.alternatives.every((item) => record(item) && (item.id === "A" || item.id === "B")) && payload.caveat === CAVEAT,
  `The ${input.label} Create response did not return one strict current A/B concept.`);
  progress.complete("create_result_contract");
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  const paidAfterGeneration = budget.paidDispatchCount();
  const beforeLocalViews = policy.snapshotJourneyRequests();
  await page.getByTestId("create-alternative-b").click();
  await page.getByTestId("create-open-result-dashboard").click();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  expect(budget.paidDispatchCount()).toBe(paidAfterGeneration);
  await expect.poll(async () => {
    const state = await localArtifactState(page, configuration.userId, "create");
    return state?.activeAlternativeId ?? "none";
  }).toBe("B");
  await stableLocalBarrier(page);
  assertNoReplay(beforeLocalViews, policy.snapshotJourneyRequests());
  progress.start("create_local_save");
  const saved = await requireLocalArtifactState(page, configuration.userId, "create");
  expect(saved.marketKey).toBe(input.marketKey);
  const savedDomain: unknown = JSON.parse(saved.domainIdentity);
  guard(record(savedDomain) && typeof savedDomain.aoiId === "string" && savedDomain.aoiId.length > 0 &&
    savedDomain.generatedAt === payload.generatedAt && savedDomain.promptVersion === payload.promptVersion &&
    Array.isArray(savedDomain.alternativeIds) && JSON.stringify(savedDomain.alternativeIds) ===
      JSON.stringify((payload.alternatives as Array<Record<string, unknown>>).map((alternative) => alternative.id)),
  "The saved Create artifact is not bound to the generated AOI/A/B result identity.");
  progress.complete("create_local_save");
  progress.start("create_local_reopen");
  await reopenSavedArtifact(page, configuration.userId, "create", policy, saved, async () => {
    await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
    await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  });
  const beforeReload = policy.snapshotJourneyRequests();
  await page.reload();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  await stableLocalBarrier(page);
  const reloaded = await requireLocalArtifactState(page, configuration.userId, "create");
  assertSameArtifact(saved, reloaded);
  assertNoReplay(beforeReload, policy.snapshotJourneyRequests());
  expect(budget.paidDispatchCount()).toBe(paidAfterGeneration);
  progress.complete("create_local_reopen");
}

async function runSingaporeCreate(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress) {
  await runMarketCreate(page, configuration, policy, budget, {
    marketKey: "singapore",
    coordinates: [[
      [103.8580, 1.2815],
      [103.8600, 1.2815],
      [103.8600, 1.2830],
      [103.8580, 1.2830],
      [103.8580, 1.2815]
    ]],
    fileName: "sprint10-singapore-live-aoi.geojson",
    label: "Singapore"
  }, progress);
}

async function runDubaiCreate(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress) {
  await runMarketCreate(page, configuration, policy, budget, {
    marketKey: "dubai",
    coordinates: [[
      [55.27015, 25.20515],
      [55.27065, 25.20515],
      [55.27065, 25.20565],
      [55.27015, 25.20565],
      [55.27015, 25.20515]
    ]],
    fileName: "sprint10-dubai-live-aoi.geojson",
    label: "Dubai"
  }, progress);
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
  const progress = createLiveProgress();
  let delayedInconclusiveStage: string | null = null;
  let primaryStatus: "failed" | "inconclusive" | null = null;
  let primaryStage: string | null = null;
  let cleanupFailureStage: string | null = null;
  let loginAttempted = false;
  try {
    progress.start("anonymous_protection");
    await verifyAnonymousProtection(configuration);
    progress.complete("anonymous_protection");
    progress.start("exact_preview");
    await verifyExactPreview(page, configuration);
    progress.complete("exact_preview");
    loginAttempted = true;
    progress.start("auth_login");
    await login(page, configuration);
    progress.complete("auth_login");
    if (configuration.scope === "journey" || configuration.scope === "dubai-analyse") {
      await runDubaiAnalyse(page, configuration, policy, budget, progress);
    }
    if (configuration.scope === "journey" || configuration.scope === "dubai-find") {
      try { await runDubaiFind(page, configuration, policy, budget, progress); }
      catch (error) {
        if (error instanceof InconclusiveLiveCoverageError) delayedInconclusiveStage = "find_candidate_count";
        else throw error;
      }
    }
    if (configuration.scope === "journey" || configuration.scope === "singapore-create") {
      await runSingaporeCreate(page, configuration, policy, budget, progress);
    }
    if (configuration.scope === "singapore-analyse") {
      await runSingaporeAnalyse(page, configuration, policy, budget, progress);
    }
    if (configuration.scope === "singapore-find") {
      try { await runSingaporeFind(page, configuration, policy, budget, progress); }
      catch (error) {
        if (error instanceof InconclusiveLiveCoverageError) delayedInconclusiveStage = "find_candidate_count";
        else throw error;
      }
    }
    if (configuration.scope === "dubai-create") {
      await runDubaiCreate(page, configuration, policy, budget, progress);
    }
    progress.start("paid_terminal");
    await budget.waitForTerminalReceipts();
    progress.complete("paid_terminal");
    progress.start("scope_paid_counts");
    budget.assertExpectedScopeCounts();
    progress.complete("scope_paid_counts");
    progress.start("network_policy");
    policy.assertClean();
    progress.complete("network_policy");
    if (delayedInconclusiveStage) {
      primaryStatus = "inconclusive";
      primaryStage = delayedInconclusiveStage;
    }
  } catch (error) {
    primaryStatus = error instanceof InconclusiveLiveCoverageError ? "inconclusive" : "failed";
    primaryStage = progress.current();
  } finally {
    progress.start("paid_finalize");
    try {
      await budget.finalize();
      progress.complete("paid_finalize");
    }
    catch {
      ({ primaryStatus, primaryStage } = primaryAfterFinalizeFailure(primaryStatus, primaryStage));
    }
    if (loginAttempted) {
      try { await logoutVerified(page, configuration.userId); }
      catch (error) { cleanupFailureStage = cleanupStage(error); }
    }
    try { policy.assertClean(); }
    catch {
      if (primaryStatus !== "failed") {
        primaryStatus = "failed";
        primaryStage = "network_policy";
      }
    }
  }
  if (primaryStatus || cleanupFailureStage) {
    throw new Error(encodeLiveJourneyDiagnostic({
      primaryStatus,
      primaryStage,
      cleanupStage: cleanupFailureStage,
      completedSteps: progress.completed()
    }));
  }
});
