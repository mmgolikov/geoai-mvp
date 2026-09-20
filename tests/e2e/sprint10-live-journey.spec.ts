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
import { SPRINT10_GOAL_DEPTH_SCOPES, validateSprint10GoalDepthRequest,
  type Sprint10GoalDepthScope, type Sprint10GoalDepthSource } from "./helpers/sprint10-live-journey-gate";
import { validateGoalDepthCaptureEnvironment, writeSprint10GoalDepthEvidence } from "./helpers/sprint10-goal-depth-evidence";
import { validateSprint10FindAnalysisRequest } from "./helpers/sprint10-live-journey-gate";
import { validateFindAnalysisCaptureEnvironment } from "./helpers/sprint10-find-analysis-evidence";
import { observeComparisonMapNetwork, readComparisonMapDiagnostic, withComparisonGeometryDeadline, ComparisonGeometryProbeTimeout } from "./helpers/sprint10-map-diagnostics";
import {
  SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN,
  SPRINT10_PUBLIC_ANALYSIS_QUESTION,
  buildSprint10AnalysisResultEvidence,
  validateSprint10AnalysisEvidencePath,
  writeSprint10AnalysisResultEvidence
} from "./helpers/sprint10-analysis-result-evidence";
import {
  SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE_OPT_IN,
  SPRINT10_DEVELOPMENT_SCREENING_QUESTION,
  validateSprint10DepthCycleTransportIdentity,
  validateSprint10DepthCycleEvidencePath,
  writeSprint10DepthCycleEvidence,
  type Sprint10DepthCycleEvidenceInput
} from "./helpers/sprint10-depth-cycle-evidence";
// @ts-expect-error The diagnostics module is an operator-only JavaScript contract checked by its offline suite.
import { LIVE_JOURNEY_CLEANUP_STAGES, LIVE_JOURNEY_STEPS, analyseSuggestionCorrelationChecks, boundedLiveJourneyResponseJson, canonicalLiveJourneyCompletedSteps, encodeLiveJourneyDiagnostic, primaryAfterFinalizeFailure } from "../../scripts/sprint10-live-journey-diagnostics.mjs";
import { POINT_OBJECT_SOURCE_HARNESS_RESPONSE_TIMEOUT_MS as SOURCE_REQUEST_HARNESS_TIMEOUT_MS } from "../../src/lib/prototype/source-request-deadline";
import { loadQuality20Selection, quality20Hash, quality20RequestKey, validateQuality20Context,
  validateQuality20PaidBody, validateQuality20AnalysisResult, validateQuality20Ledger,
  type Quality20Selection } from "./helpers/quality20-frozen-case";
import { loadQuality20Acquisition, writeQuality20Acquisition, type Quality20Acquisition } from "./helpers/quality20-acquisition";
import {
  DUBAI_CREATE_GOLDEN,
  DUBAI_CREATE_PROGRAMME_SCOPES,
  assertDubaiCreateRequest,
  assertDubaiCreateGeometry,
  assertDubaiCreateProgrammeGeometry,
  assertDubaiCreateProgrammeRequest,
  dubaiCreateProgrammeCase,
  type DubaiCreateProgrammeScope
} from "./helpers/sprint20-live-create";

test.use({ trace: "off", screenshot: "off", video: "off", serviceWorkers: "block" });
test.describe.configure({ mode: "serial", retries: 0 });

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const EXACT_DEVELOPMENT_PROJECT_REF = "pphdqkurxneyagvnnjdt";
const EXPECTED_LEDGER_ID = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const LIVE_SCOPES: readonly Sprint10LiveScope[] = [
  "journey", "dubai-analyse", "dubai-find", "dubai-find-analysis", "singapore-create",
  "singapore-analyse", "singapore-find", "dubai-create", "dubai-depth-cycle",
  ...DUBAI_CREATE_PROGRAMME_SCOPES,
  "dubai-profile-depth-cycle", "dubai-redevelopment-depth-cycle", "dubai-diligence-depth-cycle",
  "quality20-analyse", "quality20-find", "quality20-create", "quality20-acquire"
] as const;
const ANALYSE_SUGGESTION_RESPONSE_TIMEOUT_MS = 30_000;
const SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS = [103.855, 1.278, 103.868, 1.289] as const;
type LiveScope = Sprint10LiveScope;
type FindRequestIssue = "shape" | "market_or_locale" | "criteria" | "bounds";
type FindPreDispatchIssue = FindRequestIssue | "method" | "contract_mismatch" | "timeout";
type SourceResponseObservation =
  | { kind: "response"; response: Response }
  | { kind: "aborted" | "network_failed" | "timeout" };

class FindPreDispatchError extends Error {
  constructor(readonly reason: FindPreDispatchIssue) {
    super(`The Find request failed its bounded pre-dispatch contract: ${reason}.`);
    this.name = "FindPreDispatchError";
  }
}

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
  depthCycleEvidencePath: string | null;
  goalDepthEvidencePrefix: string | null;
  findAnalysisEvidencePrefix: string | null;
  quality20: Quality20Selection | null;
  acquisition: Quality20Acquisition | null;
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
    completed: () => canonicalLiveJourneyCompletedSteps(completed)
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

function observeSourcePostResponse(page: Page, pathname: string, timeoutMs: number) {
  guard(pathname.startsWith("/api/") && Number.isInteger(timeoutMs) && timeoutMs > 0,
    "The source response observer configuration is invalid.");
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let resolveResult: (result: SourceResponseObservation) => void = () => undefined;
  const matches = (request: Request) => request.method() === "POST" && new URL(request.url()).pathname === pathname;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    page.off("response", onResponse);
    page.off("requestfailed", onRequestFailed);
  };
  const finish = (result: SourceResponseObservation) => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveResult(result);
  };
  const onResponse = (response: Response) => {
    if (matches(response.request())) finish({ kind: "response", response });
  };
  const onRequestFailed = (request: Request) => {
    if (!matches(request)) return;
    const errorText = request.failure()?.errorText ?? "";
    finish({ kind: /aborted/i.test(errorText) ? "aborted" : "network_failed" });
  };
  const result = new Promise<SourceResponseObservation>((resolve) => { resolveResult = resolve; });
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);
  timer = setTimeout(() => finish({ kind: "timeout" }), timeoutMs);
  return { result, cancel: cleanup };
}

async function observeExactSourceRequestResponse(
  request: { response(): Promise<Response | null>; failure(): { errorText: string } | null },
  deadlineAt: number
): Promise<SourceResponseObservation> {
  const remainingMs = Math.max(0, deadlineAt - Date.now());
  if (remainingMs === 0) return { kind: "timeout" };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      request.response(),
      new Promise<"timeout">((resolve) => {
        timeout = setTimeout(() => resolve("timeout"), remainingMs);
      })
    ]);
    if (response === "timeout") return { kind: "timeout" };
    if (response) return { kind: "response", response };
    const errorText = request.failure()?.errorText ?? "";
    return { kind: /aborted/i.test(errorText) ? "aborted" : "network_failed" };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function requireFindSourceResponse(observation: SourceResponseObservation, progress: LiveProgress): Response {
  if (observation.kind === "response") return observation.response;
  if (observation.kind === "aborted") progress.start("find_source_response_wait_aborted");
  else if (observation.kind === "network_failed") progress.start("find_source_response_wait_network_failed");
  else progress.start("find_source_response_wait_timeout");
  throw new Error(`The Find source transport ended with the safe reason ${observation.kind}.`);
}

function requireCreateContextResponse(observation: SourceResponseObservation, progress: LiveProgress): Response {
  if (observation.kind === "response") return observation.response;
  if (observation.kind === "aborted") progress.start("create_source_context_response_aborted");
  else if (observation.kind === "network_failed") progress.start("create_source_context_response_network_failed");
  else progress.start("create_source_context_response_timeout");
  throw new Error(`The Create context transport ended with the safe reason ${observation.kind}.`);
}

function markFindPreDispatchFailure(error: unknown, progress: LiveProgress) {
  if (!(error instanceof FindPreDispatchError)) return;
  const reason = error.reason;
  if (reason === "method") progress.start("find_source_pre_dispatch_method");
  else if (reason === "shape") progress.start("find_source_pre_dispatch_shape");
  else if (reason === "market_or_locale") progress.start("find_source_pre_dispatch_market_or_locale");
  else if (reason === "criteria") progress.start("find_source_pre_dispatch_criteria");
  else if (reason === "bounds") progress.start("find_source_pre_dispatch_bounds");
  else if (reason === "timeout") progress.start("find_source_pre_dispatch_timeout");
  else progress.start("find_source_pre_dispatch_contract_mismatch");
}

function exactObjectKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function isoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function singaporeFindRequestIssue(value: unknown): FindRequestIssue | null {
  if (!exactObjectKeys(value, ["bounds", "group", "limit", "locale", "mappedMaximumLevels", "mappedMinimumLevels", "marketKey"]) ||
      !Array.isArray(value.bounds) || value.bounds.length !== 4 ||
      value.bounds.some((item) => typeof item !== "number" || !Number.isFinite(item))) return "shape";
  if (value.marketKey !== "singapore" || value.locale !== "en") return "market_or_locale";
  if (value.group !== "commercial_office" || value.mappedMinimumLevels !== null ||
      value.mappedMaximumLevels !== null || value.limit !== 12) return "criteria";
  return value.bounds[0] >= SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS[0] &&
    value.bounds[1] >= SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS[1] &&
    value.bounds[2] <= SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS[2] &&
    value.bounds[3] <= SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS[3]
    ? null
    : "bounds";
}

function acceptedSingaporeFindRequest(value: unknown): value is Record<string, unknown> & { bounds: number[] } {
  return singaporeFindRequestIssue(value) === null;
}

function dubaiFindRequestIssue(value: unknown): FindRequestIssue | null {
  if (!exactObjectKeys(value, ["bounds", "group", "limit", "locale", "mappedMaximumLevels", "mappedMinimumLevels", "marketKey"]) ||
      !Array.isArray(value.bounds) || value.bounds.length !== 4 ||
      value.bounds.some((item) => typeof item !== "number" || !Number.isFinite(item))) return "shape";
  if (value.marketKey !== "dubai" || value.locale !== "en") return "market_or_locale";
  if (value.group !== "hospitality" || value.mappedMinimumLevels !== null ||
      value.mappedMaximumLevels !== null || value.limit !== 12) return "criteria";
  return value.bounds[0] < value.bounds[2] && value.bounds[1] < value.bounds[3] &&
    coordinatesMatchPointObjectMarket("dubai", value.bounds[0], value.bounds[1]) &&
    coordinatesMatchPointObjectMarket("dubai", value.bounds[2], value.bounds[3]) ? null : "bounds";
}

function acceptedDubaiFindRequest(value: unknown): value is Record<string, unknown> & { bounds: number[] } {
  return dubaiFindRequestIssue(value) === null;
}

type AcceptedFindRequest = Record<string, unknown> & { bounds: number[] };

async function installFindPreDispatchGate(
  page: Page,
  accepts: (value: unknown) => value is AcceptedFindRequest,
  label: "Dubai" | "Singapore"
) {
  let resolveRequest!: (value: AcceptedFindRequest) => void;
  let rejectRequest!: (reason: Error) => void;
  const request = new Promise<AcceptedFindRequest>((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });
  const requestTimeout = setTimeout(() => {
    rejectRequest(new FindPreDispatchError("timeout"));
  }, SOURCE_REQUEST_HARNESS_TIMEOUT_MS);
  void request.finally(() => clearTimeout(requestTimeout)).catch(() => undefined);
  await page.route("**/api/prototype/point-to-object/find", async (route) => {
    let submitted: unknown;
    try { submitted = route.request().postDataJSON(); }
    catch { submitted = null; }
    if (route.request().method() !== "POST" || !accepts(submitted)) {
      const reason: FindPreDispatchIssue = route.request().method() !== "POST"
        ? "method"
        : label === "Singapore"
          ? singaporeFindRequestIssue(submitted) ?? "contract_mismatch"
          : dubaiFindRequestIssue(submitted) ?? "contract_mismatch";
      rejectRequest(new FindPreDispatchError(reason));
      await route.abort("blockedbyclient");
      return;
    }
    resolveRequest(submitted);
    await route.fallback();
  }, { times: 1 });
  return { request };
}

function acceptedFindResponse(
  value: unknown,
  submitted: AcceptedFindRequest,
  marketKey: "dubai" | "singapore",
  group: "hospitality" | "commercial_office"
): value is Record<string, unknown> & { candidates: Array<Record<string, unknown>> } {
  if (!record(value) || value.protocol !== "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1" ||
      (value.mode !== "results" && value.mode !== "empty") || !Array.isArray(value.candidates) ||
      !value.candidates.every(record) ||
      !record(value.criteria) || value.criteria.marketKey !== marketKey || value.criteria.group !== group ||
      JSON.stringify(value.criteria.bounds) !== JSON.stringify(submitted.bounds) || !record(value.source)) return false;
  return value.source.name === "OpenStreetMap" && value.source.service === "Overpass API" &&
    value.source.licenceId === "ODbL-1.0" && typeof value.source.sourceResponseHash === "string" &&
    /^[a-f0-9]{64}$/.test(value.source.sourceResponseHash) && isoTimestamp(value.source.acquiredAt) &&
    (value.source.observedAt === null || isoTimestamp(value.source.observedAt)) &&
    value.source.runtimeNetworkUsed === true && value.source.persistenceUsed === false &&
    value.source.officialStatus === "open_context_not_official" && record(value.coverage) &&
    value.coverage.completeInventory === false && value.ordering === "source_identity_ascending_not_ranked" &&
    value.caveat === CAVEAT;
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
  const depthEvidenceOptIn = process.env.GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE;
  const depthEvidencePath = process.env.GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_PATH;
  const depthEvidenceRequested = depthEvidenceOptIn !== undefined || depthEvidencePath !== undefined;
  if (depthEvidenceRequested) {
    guard(depthEvidenceOptIn === SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE_OPT_IN &&
      typeof depthEvidencePath === "string" && depthEvidencePath.length > 0,
    "Depth-cycle evidence capture requires its exact opt-in and one explicit output path.");
    guard(selectedScope === "dubai-depth-cycle",
      "Depth-cycle evidence capture is available only for the bounded Dubai depth-cycle scope.");
    guard(!evidenceRequested, "Single-response and depth-cycle evidence capture cannot be combined.");
    validateSprint10DepthCycleEvidencePath(depthEvidencePath);
  }
  const goalCapture = validateGoalDepthCaptureEnvironment(process.env, selectedScope);
  const findCapture = validateFindAnalysisCaptureEnvironment(process.env, selectedScope);
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
    analysisEvidencePath: evidenceRequested ? evidencePath! : null,
    depthCycleEvidencePath: depthEvidenceRequested ? depthEvidencePath! : null,
    goalDepthEvidencePrefix: goalCapture.GEOAI_SPRINT10_GOAL_DEPTH_EVIDENCE_PREFIX ?? null,
    findAnalysisEvidencePrefix: findCapture.GEOAI_SPRINT10_FIND_ANALYSIS_EVIDENCE_PREFIX ?? null,
    quality20: loadQuality20Selection(process.env, selectedScope, { commit, origin: preview.origin }),
    acquisition: selectedScope === "quality20-acquire" ? loadQuality20Acquisition(process.env, { commit, origin: preview.origin }) : null
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
  if (configuration.quality20) guard(configuration.quality20.manifest.execution.deploymentId === deployment.id,
    "The frozen case deployment differs from the root-owned receipt.");
  if (configuration.acquisition) guard(configuration.acquisition.execution.deploymentId === deployment.id,
    "The acquisition deployment differs from the root-owned receipt.");
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
  let frozenCaseArmed = configuration.quality20 === null;
  let goalDepthSource: Sprint10GoalDepthSource | null = null;
  let findAnalysisSources: Sprint10GoalDepthSource[] | null = null;

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
    if (fatal) return route.abort("blockedbyclient");
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
    if (configuration.scope === "dubai-create") {
      try { assertDubaiCreateRequest(body); }
      catch {
        fatal = "Dubai Create golden AOI/controls contract rejected the request before reservation.";
        return route.abort("blockedbyclient");
      }
    }
    if (DUBAI_CREATE_PROGRAMME_SCOPES.includes(configuration.scope as DubaiCreateProgrammeScope)) {
      try { assertDubaiCreateProgrammeRequest(configuration.scope as DubaiCreateProgrammeScope, body); }
      catch {
        fatal = "Dubai Create programme/AOI contract rejected the request before reservation.";
        return route.abort("blockedbyclient");
      }
    }
    if (configuration.quality20) {
      try {
        guard(frozenCaseArmed, "Frozen-case UI/source preconditions were not completed before a paid POST.");
        validateQuality20PaidBody(configuration.quality20, routeName, body);
        validateQuality20Ledger(configuration.quality20,
          readSprint10SpendLedgerFile(configuration.ledgerRoot, configuration.ledgerPath));
      } catch {
        fatal = "QUALITY20_BLOCKED: frozen case identity/source/body/receipt gate rejected the paid request before reservation.";
        return route.abort("blockedbyclient");
      }
    }
    if (Object.hasOwn(SPRINT10_GOAL_DEPTH_SCOPES, configuration.scope)) {
      try { validateSprint10GoalDepthRequest(body, occurrences[routeName], goalDepthSource, configuration.scope as Sprint10GoalDepthScope); }
      catch { fatal = "Goal-depth recipe or source rejected before reservation."; return route.abort("blockedbyclient"); }
    }
    if (configuration.scope === "dubai-find-analysis") {
      try { validateSprint10FindAnalysisRequest(body, occurrences[routeName], findAnalysisSources); }
      catch { fatal = "Find analysis exact source or intent rejected before reservation."; return route.abort("blockedbyclient"); }
    }
    const depth = body?.depth;
    if (depth !== "quick" && depth !== "standard" && depth !== "deep") {
      fatal = "A paid request without an explicit supported depth was blocked before dispatch.";
      return route.abort("blockedbyclient");
    }
    const identity: Sprint10RequestIdentity = {
      requestKey: configuration.quality20 ? quality20RequestKey(configuration.quality20, routeName)
        : sprint10LiveRequestKey(configuration.scope, routeName, occurrences[routeName], configuration.commit),
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
    armFindAnalysisSources(sources: Sprint10GoalDepthSource[]) {
      guard(configuration.scope === "dubai-find-analysis" && !fatal && occurrences.ai === 0 && !findAnalysisSources &&
        sources.length === 3 && new Set(sources.map((source) => source.sourceFeatureId)).size === 3 &&
        sources.every((source) => /^(node|way|relation)\/[1-9]\d{0,19}$/.test(source.sourceFeatureId) &&
          coordinatesMatchPointObjectMarket("dubai", source.longitude, source.latitude)), "Find analysis must arm exactly three accepted live Dubai candidates before dispatch.");
      findAnalysisSources = sources.map((source) => ({ ...source }));
    },
    armGoalDepthSource(source: Sprint10GoalDepthSource) { guard(!fatal && occurrences.ai === 0, "Goal-depth source must be armed before the first request."); goalDepthSource = source; },
    armFrozenCase() { guard(!fatal, "A previous gate failure blocks this case."); frozenCaseArmed = true; },
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
  await page.locator("#login-identifier").fill(configuration.email);
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
  expectedSourceIdentity?: string;
  missingCandidateInconclusive?: boolean;
  label: string;
};

type LiveAnalyseSuggestion = {
  chosen: Record<string, unknown> & { id: string; label: string; longitude: number; latitude: number };
  chosenIndex: number;
};

async function waitForExactSuggestionResponse(
  request: { response(): Promise<Response | null> },
  deadlineAt: number
): Promise<Response> {
  const remainingMs = Math.max(0, deadlineAt - Date.now());
  if (remainingMs === 0) throw new Error("The exact suggestion response deadline expired.");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      request.response(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("The exact suggestion response deadline expired.")), remainingMs);
      })
    ]);
    if (!response) throw new Error("The exact suggestion request completed without an HTTP response.");
    return response;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function runAnalyseSourceSuggest(
  page: Page,
  input: LiveAnalyseSuggestionCase,
  progress: LiveProgress
): Promise<LiveAnalyseSuggestion> {
  progress.start("analyse_source_suggest_ui");
  await page.goto("/prototype/point-to-object");
  await expect(page.locator('main[data-project-restoration="ready"]')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("point-object-city-select").selectOption(input.marketKey);
  const search = page.getByRole("combobox", { name: "Search address or place" });
  await expect(search).toBeVisible();
  progress.complete("analyse_source_suggest_ui");

  progress.start("analyse_source_suggest_request");
  const responseDeadlineAt = Date.now() + ANALYSE_SUGGESTION_RESPONSE_TIMEOUT_MS;
  const requestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/prototype/point-to-object/suggest",
    { timeout: ANALYSE_SUGGESTION_RESPONSE_TIMEOUT_MS }
  );
  await input.enterQuery(search);
  const request = await requestPromise;
  const submitted: unknown = request.postDataJSON();
  progress.complete("analyse_source_suggest_request");

  progress.start("analyse_source_suggest_response");
  const suggested = await waitForExactSuggestionResponse(request, responseDeadlineAt);
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
    suggestionPayload.results.length <= 5 &&
    suggestionPayload.results.every((candidate) => record(candidate) && typeof candidate.id === "string" &&
      /^(node|way|relation)\/[1-9]\d{0,19}$/.test(candidate.id) && typeof candidate.label === "string" &&
      candidate.label.trim().length > 0 && typeof candidate.longitude === "number" && Number.isFinite(candidate.longitude) &&
      typeof candidate.latitude === "number" && Number.isFinite(candidate.latitude)),
  `The ${input.label} source suggestion did not return accepted Photon/OSM evidence.`);
  const resultRecords = suggestionPayload.results as Array<Record<string, unknown>>;
  guard(new Set(resultRecords.map((candidate) => candidate.id)).size === resultRecords.length,
    `The ${input.label} source suggestion returned duplicate source identities.`);
  progress.complete("analyse_source_suggest_contract");

  progress.start("analyse_source_suggest_request_identity");
  const responseRequest = suggested.request();
  guard(responseRequest === request, `The ${input.label} suggestion response did not belong to the observed request.`);
  progress.complete("analyse_source_suggest_request_identity");

  progress.start("analyse_source_suggest_request_contract");
  let responseSubmitted: unknown;
  try { responseSubmitted = responseRequest.postDataJSON(); }
  catch { responseSubmitted = null; }
  const correlation = analyseSuggestionCorrelationChecks({
    observedRequest: request,
    responseRequest,
    submitted,
    responseSubmitted,
    expectedMarketKey: input.marketKey,
    expectedLocale: "en",
    expectedQuery: input.query,
    allCoordinatesInMarket: resultRecords.every((candidate) => coordinatesMatchPointObjectMarket(
      input.marketKey,
      Number(candidate.longitude),
      Number(candidate.latitude)
    ))
  });
  guard(correlation.requestIdentity, `The ${input.label} suggestion response did not belong to the observed request.`);
  guard(correlation.requestContract, `The ${input.label} suggestion request did not preserve the exact bounded field contract.`);
  progress.complete("analyse_source_suggest_request_contract");
  progress.start("analyse_source_suggest_market_locale");
  guard(correlation.marketLocale, `The ${input.label} suggestion request did not preserve the exact market and locale.`);
  progress.complete("analyse_source_suggest_market_locale");
  progress.start("analyse_source_suggest_query");
  guard(correlation.query, `The ${input.label} suggestion request did not preserve the exact public place query.`);
  progress.complete("analyse_source_suggest_query");
  progress.start("analyse_source_suggest_coordinates");
  guard(correlation.coordinates, `The ${input.label} suggestion returned a candidate outside the selected market.`);
  progress.complete("analyse_source_suggest_coordinates");

  progress.start("analyse_source_suggest_candidate");
  const chosenIndex = resultRecords.findIndex((candidate) => input.expectedSourceIdentity
    ? candidate.id === input.expectedSourceIdentity : input.candidateLabel.test(String(candidate.label)));
  const chosen = chosenIndex >= 0 ? resultRecords[chosenIndex] : undefined;
  if (!chosen && input.missingCandidateInconclusive) {
    throw new InconclusiveLiveCoverageError(`The requested ${input.label} source candidate was not returned; no fallback candidate or paid request was used.`);
  }
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
  let initial: Awaited<ReturnType<typeof browserSessionState>>;
  try { initial = await browserSessionState(page, expectedUserId); }
  catch { throw new Error("LIVE_JOURNEY_CLEANUP_FAILED: logout_session_precheck"); }
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

async function requireLocalArtifactState(page: Page, userId: string, kind: ArtifactKind, expectedCount = 1): Promise<LocalArtifactState> {
  const state = await localArtifactState(page, userId, kind);
  guard(state && state.count === expectedCount && typeof state.artifactId === "string" && state.artifactId.length > 0 &&
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
  verify: () => Promise<void>,
  expectedCount = 1
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
  const reopened = await requireLocalArtifactState(page, userId, kind, expectedCount);
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

async function runDubaiDepthCycle(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress,
  presetConfiguration: { goal: string; label: string; question: string; sourceQuery?: string; sourceCandidateLabel?: RegExp } = { goal: "development_screening", label: "Development screening", question: SPRINT10_DEVELOPMENT_SCREENING_QUESTION }) {
  const sourceQuery = presetConfiguration.sourceQuery ?? "Shangri-La Dubai";
  const { chosen, chosenIndex } = await runAnalyseSourceSuggest(page, {
    marketKey: "dubai",
    query: sourceQuery,
    enterQuery: (search) => search.fill(sourceQuery),
    candidateLabel: presetConfiguration.sourceCandidateLabel ?? /shangri/i,
    missingCandidateInconclusive: presetConfiguration.sourceQuery !== undefined,
    label: presetConfiguration.sourceQuery ?? "Dubai depth cycle"
  }, progress);
  const option = page.locator(`#point-object-search-result-${chosenIndex}`);
  progress.start("analyse_source_context");
  const contextResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/context"), { timeout: 45_000 });
  await option.click();
  const context = await contextResponse;
  const contextPayload: unknown = await boundedLiveJourneyResponseJson(context, 10_000);
  guard(context.status() === 200 && record(contextPayload) && contextPayload.mode === "resolved" && contextPayload.schemaVersion === 2 &&
    record(contextPayload.subject) && contextPayload.subject.sourceFeatureId === chosen.id,
  "The selected Dubai depth-cycle source identity was not resolved to the exact structured object.");
  progress.complete("analyse_source_context");

  if (Object.hasOwn(SPRINT10_GOAL_DEPTH_SCOPES, configuration.scope)) {
    budget.armGoalDepthSource({ sourceFeatureId: chosen.id, longitude: chosen.longitude, latitude: chosen.latitude });
    test.info().annotations.push({ type: "functional-source", description: JSON.stringify({ scope: configuration.scope,
      sourceQuery, sourceFeatureId: chosen.id, contextHttpStatus: context.status(), comparativeBenchmark: false }) });
  }
  await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled({ timeout: 45_000 });
  await page.locator("#point-object-question").fill(SPRINT10_PUBLIC_ANALYSIS_QUESTION);
  progress.start("analyse_paid_response");
  const baselineResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/ai"), { timeout: 180_000 });
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  const baselineResponse = await baselineResponsePromise;
  const baselinePayload: unknown = await boundedLiveJourneyResponseJson(baselineResponse, 10_000);
  progress.complete("analyse_paid_response");
  progress.start("analyse_paid_terminal");
  await budget.waitForTerminalReceipts();
  progress.complete("analyse_paid_terminal");
  progress.start("analyse_result_contract");
  const baselineSubmitted: unknown = baselineResponse.request().postDataJSON();
  const baselineTransportIdentity = validateSprint10DepthCycleTransportIdentity(baselineSubmitted, chosen.id);
  guard(baselineResponse.status() === 200 && record(baselinePayload) && baselinePayload.mode === "openai" && baselinePayload.schemaVersion === 6 &&
    typeof baselinePayload.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(baselinePayload.evidencePackHash) &&
    baselinePayload.evidencePackId === `p2o_live_evidence_${baselinePayload.evidencePackHash.slice(0, 24)}` &&
    record(baselineSubmitted) && baselineSubmitted.depth === "standard" && baselineSubmitted.goal === "custom" &&
    baselineSubmitted.perspective === "developer" && baselineSubmitted.horizon === "current" &&
    baselineSubmitted.question === SPRINT10_PUBLIC_ANALYSIS_QUESTION && baselineSubmitted.locale === "en" &&
    baselineSubmitted.role === "developer" && baselineSubmitted.scenario === "unspecified" &&
    baselineSubmitted.expectedSourceFeatureId === chosen.id && baselineSubmitted.consent === true &&
    baselineTransportIdentity.caseKey === "dubai" &&
    baselineTransportIdentity.longitude === chosen.longitude && baselineTransportIdentity.latitude === chosen.latitude &&
    coordinatesMatchPointObjectMarket("dubai", baselineTransportIdentity.longitude, baselineTransportIdentity.latitude) &&
    record(baselinePayload.request) && baselinePayload.request.depth === "standard" && baselinePayload.request.goal === "custom" &&
    baselinePayload.request.perspective === "developer" && baselinePayload.request.horizon === "current" &&
    baselinePayload.request.question === SPRINT10_PUBLIC_ANALYSIS_QUESTION && baselinePayload.request.locale === "en" &&
    baselinePayload.request.role === "developer" && baselinePayload.request.scenario === "unspecified" &&
    record(baselinePayload.subject) && baselinePayload.subject.sourceFeatureId === chosen.id &&
    baselinePayload.subject.sourceLabel === "© OpenStreetMap contributors" &&
    record(baselinePayload.content) && record(baselinePayload.content.depthReview) && baselinePayload.content.depthReview.depth === "standard",
  "The initial Dubai Standard baseline did not preserve its exact source, submitted settings and completed depth receipt.");
  progress.complete("analyse_result_contract");
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
  await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-depth", "standard");
  await expect.poll(async () => (await localArtifactState(page, configuration.userId, "analyse"))?.count ?? 0).toBe(1);

  const preset = page.getByRole("button", { name: presetConfiguration.label, exact: true });
  await expect(preset).toBeEnabled();
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#analysis-follow-up")).toHaveValue(presetConfiguration.question);

  const captureInputs: Sprint10DepthCycleEvidenceInput[] = [];
  const screeningDepths = ["standard", "deep", "quick"] as const;
  let previousDepth: "standard" | "deep" | "quick" = "standard";
  let previousGoal = "custom";
  let finalPayload: Record<string, unknown> | null = null;
  for (const [screeningIndex, depth] of screeningDepths.entries()) {
    const depthButton = page.getByRole("button", { name: depth === "standard" ? "Standard" : depth === "deep" ? "Deep" : "Quick", exact: true });
    await depthButton.click();
    await expect(depthButton).toHaveAttribute("aria-pressed", "true");
    const state = page.getByTestId("analysis-request-state");
    await expect(state).toHaveAttribute("data-draft-depth", depth);
    await expect(state).toHaveAttribute("data-draft-role", "developer");
    await expect(state).toHaveAttribute("data-draft-scenario", "unspecified");
    await expect(preset).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#analysis-follow-up")).toHaveValue(presetConfiguration.question);
    const displayed = page.getByTestId("role-decision-cards");
    await expect(displayed).toHaveAttribute("data-goal", previousGoal);
    await expect(displayed).toHaveAttribute("data-depth", previousDepth);
    const run = page.getByRole("button", { name: "Run focused analysis", exact: true });
    await expect(run).toBeEnabled();

    progress.start("analyse_paid_response");
    const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/point-to-object/ai"), { timeout: 45_000 });
    const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/ai"), { timeout: 180_000 });
    const startedAt = Date.now();
    await run.click();
    const request = await requestPromise;
    const submittedRequest: unknown = request.postDataJSON();
    const transportIdentity = validateSprint10DepthCycleTransportIdentity(submittedRequest, chosen.id);
    guard(record(submittedRequest) && submittedRequest.depth === depth && submittedRequest.goal === presetConfiguration.goal &&
      submittedRequest.perspective === "developer" && submittedRequest.horizon === "current" &&
      submittedRequest.question === presetConfiguration.question && submittedRequest.locale === "en" &&
      submittedRequest.role === "developer" && submittedRequest.scenario === "unspecified" &&
      submittedRequest.expectedSourceFeatureId === chosen.id && submittedRequest.consent === true &&
      transportIdentity.caseKey === baselineTransportIdentity.caseKey &&
      transportIdentity.longitude === baselineTransportIdentity.longitude &&
      transportIdentity.latitude === baselineTransportIdentity.latitude,
    `The submitted ${depth} screening request changed a fixed non-depth input or source identity.`);
    await expect(state).toHaveAttribute("data-in-flight-depth", depth);
    await expect(state).toHaveAttribute("data-in-flight-role", "developer");
    await expect(state).toHaveAttribute("data-in-flight-scenario", "unspecified");
    await expect(displayed).toHaveAttribute("data-goal", previousGoal);
    await expect(displayed).toHaveAttribute("data-depth", previousDepth);
    await expect(state).toHaveAttribute("data-completed-depth", previousDepth);
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", previousDepth);
    await expect(page.getByRole("status").filter({ hasText: `Running ${depth === "deep" ? "Deep" : depth === "quick" ? "Quick" : "Standard"} analysis while keeping the current result visible` })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`^Running ${depth === "deep" ? "Deep" : depth === "quick" ? "Quick" : "Standard"} analysis`) })).toBeDisabled();

    const response = await responsePromise;
    const payload: unknown = await boundedLiveJourneyResponseJson(response, 10_000);
    progress.complete("analyse_paid_response");
    progress.start("analyse_paid_terminal");
    await budget.waitForTerminalReceipts();
    progress.complete("analyse_paid_terminal");
    progress.start("analyse_result_contract");
    guard(response.request() === request && response.status() === 200 && record(payload) && payload.mode === "openai" && payload.schemaVersion === 6 &&
      typeof payload.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(payload.evidencePackHash) &&
      payload.evidencePackId === `p2o_live_evidence_${payload.evidencePackHash.slice(0, 24)}` &&
      record(payload.request) && payload.request.depth === depth && payload.request.goal === presetConfiguration.goal &&
      payload.request.perspective === "developer" && payload.request.horizon === "current" &&
      payload.request.question === presetConfiguration.question && payload.request.locale === "en" &&
      payload.request.role === "developer" && payload.request.scenario === "unspecified" &&
      record(payload.subject) && payload.subject.sourceFeatureId === chosen.id && payload.subject.sourceLabel === "© OpenStreetMap contributors" &&
      record(payload.content) && payload.content.caveat === CAVEAT && record(payload.content.depthReview) && payload.content.depthReview.depth === depth,
    `The completed ${depth} screening result changed source identity, fixed inputs, provenance or depth receipt.`);
    progress.complete("analyse_result_contract");
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", depth);
    await expect(state).toHaveAttribute("data-in-flight-depth", "none");
    await expect(state).toHaveAttribute("data-completed-depth", depth);
    await expect(state).toHaveAttribute("data-completed-role", "developer");
    await expect(state).toHaveAttribute("data-completed-scenario", "unspecified");
    await expect(displayed).toHaveAttribute("data-goal", presetConfiguration.goal);
    await expect(displayed).toHaveAttribute("data-depth", depth);
    await expect.poll(async () => {
      const artifact = await localArtifactState(page, configuration.userId, "analyse");
      return artifact?.count === screeningIndex + 2
        ? artifact.domainIdentity
        : null;
    }).toBe(JSON.stringify({ sourceFeatureId: chosen.id, evidencePackHash: payload.evidencePackHash }));
    if (configuration.depthCycleEvidencePath) {
      captureInputs.push({
        response: payload,
        submittedRequest,
        expectedSourceFeatureId: chosen.id,
        telemetryIdentity: {
          requestKey: sprint10LiveRequestKey(configuration.scope, "ai", screeningIndex + 2, configuration.commit),
          phase: "S4",
          candidateHost: configuration.host,
          candidateCommit: configuration.commit,
          route: "ai",
          depth,
          promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
          schemaVersion: 6
        }
      });
    }
    if (configuration.goalDepthEvidencePrefix) {
      writeSprint10GoalDepthEvidence(configuration.goalDepthEvidencePrefix, configuration.scope as Sprint10GoalDepthScope, screeningIndex + 2, {
        response: payload, submittedRequest, expectedSourceFeatureId: chosen.id,
        telemetryIdentity: { requestKey: sprint10LiveRequestKey(configuration.scope, "ai", screeningIndex + 2, configuration.commit),
          phase: "S4", candidateHost: configuration.host, candidateCommit: configuration.commit, route: "ai", depth,
          promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 }
      });
    }
    if (Object.hasOwn(SPRINT10_GOAL_DEPTH_SCOPES, configuration.scope)) test.info().annotations.push({
      type: "functional-goal-depth", description: JSON.stringify({ scope: configuration.scope, goal: presetConfiguration.goal,
        depth, evidencePackHash: payload.evidencePackHash, latencyMs: Date.now() - startedAt, comparativeBenchmark: false })
    });
    previousGoal = presetConfiguration.goal;
    previousDepth = depth;
    finalPayload = payload;
  }

  guard(finalPayload && typeof finalPayload.evidencePackHash === "string", "The final Quick screening result is missing.");
  if (configuration.depthCycleEvidencePath) {
    progress.start("analyse_evidence_capture");
    writeSprint10DepthCycleEvidence(configuration.depthCycleEvidencePath, captureInputs);
    progress.complete("analyse_evidence_capture");
  }
  const expectedDomainIdentity = JSON.stringify({ sourceFeatureId: chosen.id, evidencePackHash: finalPayload.evidencePackHash });
  progress.start("analyse_local_save");
  await expect.poll(async () => {
    const state = await localArtifactState(page, configuration.userId, "analyse");
    return state?.count === 4 ? state.domainIdentity : null;
  }).toBe(expectedDomainIdentity);
  const saved = await requireLocalArtifactState(page, configuration.userId, "analyse", 4);
  expect(saved.marketKey).toBe("dubai");
  expect(saved.role).toBe("developer");
  expect(saved.scenario).toBe("unspecified");
  progress.complete("analyse_local_save");
  const paidBeforeReopen = budget.paidDispatchCount();
  progress.start("analyse_local_reopen");
  await reopenSavedArtifact(page, configuration.userId, "analyse", policy, saved, async () => {
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "quick");
    await expect(page.getByTestId("role-decision-cards")).toHaveAttribute("data-goal", presetConfiguration.goal);
  }, 4);
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
  const runCandidateAnalysis = configuration.scope === "dubai-find-analysis";
  progress.start("find_source_ui");
  progress.start("find_source_ui_navigation");
  await page.goto("/prototype/point-to-object");
  await expect(page.locator('main[data-project-restoration="ready"]')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("point-object-city-select").selectOption("dubai");
  await expect(page.getByTestId("point-object-city-select")).toHaveValue("dubai");
  progress.complete("find_source_ui_navigation");
  progress.start("find_source_ui_tab");
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  progress.complete("find_source_ui_tab");
  progress.start("find_source_ui_role");
  await page.getByTestId("point-object-find-role-select").selectOption("consultant_broker");
  progress.complete("find_source_ui_role");
  progress.start("find_source_ui_scenario");
  await page.getByTestId("point-object-find-scenario-select").selectOption("b2b_hotel_development");
  progress.complete("find_source_ui_scenario");
  progress.start("find_source_ui_group");
  await expect(page.getByTestId("point-object-find-group-select")).toHaveValue("hospitality");
  await expect(page.getByLabel("Levels from", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Levels to", { exact: true })).toHaveValue("");
  progress.complete("find_source_ui_group");
  progress.start("find_source_camera");
  const zoomOut = page.getByRole("button", { name: "Zoom out" });
  if (await zoomOut.isVisible().catch(() => false)) {
    await zoomOut.click();
    await zoomOut.click();
  }
  progress.complete("find_source_camera");
  progress.start("find_source_cta");
  await expect(page.getByTestId("point-object-city-select")).toHaveValue("dubai");
  await expect(page.getByTestId("point-object-find-role-select")).toHaveValue("consultant_broker");
  await expect(page.getByTestId("point-object-find-scenario-select")).toHaveValue("b2b_hotel_development");
  await expect(page.getByTestId("point-object-find-group-select")).toHaveValue("hospitality");
  await expect(page.getByLabel("Levels from", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Levels to", { exact: true })).toHaveValue("");
  await expect(page.getByTestId("find-search-cta")).toBeEnabled({ timeout: 30_000 });
  progress.complete("find_source_cta");
  progress.start("find_source_pre_dispatch");
  const preDispatch = await installFindPreDispatchGate(page, acceptedDubaiFindRequest, "Dubai");
  const responseObservation = observeSourcePostResponse(page, "/api/prototype/point-to-object/find", SOURCE_REQUEST_HARNESS_TIMEOUT_MS);
  let submitted: AcceptedFindRequest;
  try {
    await page.getByTestId("find-search-cta").click();
    submitted = await preDispatch.request;
  }
  catch (error) {
    responseObservation.cancel();
    markFindPreDispatchFailure(error, progress);
    throw error;
  }
  progress.complete("find_source_pre_dispatch");
  progress.start("find_source_response_wait");
  const response = requireFindSourceResponse(await responseObservation.result, progress);
  progress.complete("find_source_response_wait");
  progress.start("find_source_http");
  guard(response.status() === 200, "The Dubai Find source response did not return HTTP 200.");
  progress.complete("find_source_http");
  progress.start("find_source_body");
  const payload: unknown = await boundedLiveJourneyResponseJson(response, 10_000);
  progress.complete("find_source_body");
  progress.start("find_source_contract");
  guard(acceptedFindResponse(payload, submitted, "dubai", "hospitality"),
    "The Dubai Find response did not preserve the exact bounded request and open-map source contract.");
  progress.complete("find_source_contract");
  progress.start("find_candidate_count");
  const candidates = payload.candidates as Array<Record<string, unknown>>;
  if (candidates.length < 3) {
    throw new InconclusiveLiveCoverageError(`Dubai Find returned ${candidates.length} usable candidate(s); live acceptance requires three.`);
  }
  const hasFootprint = (candidate: Record<string, unknown>) => record(candidate.geometry) &&
    (candidate.geometry.type === "Polygon" || candidate.geometry.type === "MultiPolygon");
  const selectedCandidates = [...candidates.filter(hasFootprint), ...candidates.filter((candidate) => !hasFootprint(candidate))].slice(0, 3);
  const identities = selectedCandidates.map((candidate) => candidate.sourceFeatureId);
  guard(identities.every((value) => typeof value === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(value)) && new Set(identities).size === 3,
    "Dubai Find did not return three distinct exact source identities.");
  const analysisSources = selectedCandidates.map((candidate) => ({ sourceFeatureId: String(candidate.sourceFeatureId),
    longitude: Number(candidate.longitude), latitude: Number(candidate.latitude) }));
  if (runCandidateAnalysis) budget.armFindAnalysisSources(analysisSources);
  progress.complete("find_candidate_count");
  const items = page.getByTestId("find-scroll-region").getByRole("listitem");
  await expect(items).toHaveCount(candidates.length);
  progress.start("find_compare");
  const beforeLocalComparison = policy.snapshotJourneyRequests();
  progress.start("find_compare_select");
  for (const candidate of selectedCandidates) {
    await items.nth(candidates.indexOf(candidate)).getByRole("button", { name: "Compare", exact: true }).click();
  }
  progress.complete("find_compare_select");
  progress.start("find_compare_compact");
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await expect(page.getByTestId("find-comparison-grid")).toBeVisible();
  progress.complete("find_compare_compact");
  const comparisonNetwork = observeComparisonMapNetwork(page);
  progress.start("find_compare_dashboard");
  await page.getByRole("button", { name: "Open full comparison dashboard", exact: true }).click();
  const dashboard = page.getByTestId("find-full-comparison-dashboard");
  const verifyComparison = async () => {
    const parentStep = progress.current();
    progress.start("find_compare_dashboard");
    await expect(dashboard).toBeVisible();
    progress.complete("find_compare_dashboard");
    const map = dashboard.getByTestId("live-map-canvas");
    progress.start("find_compare_basemap");
    try {
      await expect.poll(async () => (await readComparisonMapDiagnostic(map, comparisonNetwork.snapshot())).map?.basemapFeatures ?? 0).toBeGreaterThan(0);
    } catch (error) {
      try {
        test.info().annotations.push({ type: "find-comparison-map-failure",
          description: JSON.stringify(await readComparisonMapDiagnostic(map, comparisonNetwork.snapshot())) });
      } catch {
        // Diagnostics must never replace the original failing map assertion.
      } finally { comparisonNetwork.dispose(); }
      throw error;
    }
    progress.complete("find_compare_basemap");
    progress.start("find_compare_geometry");
    let state: Awaited<ReturnType<typeof quality20MapState>> | undefined;
    const expectedFootprintIds = selectedCandidates.filter(hasFootprint).map((candidate) => candidate.sourceFeatureId).sort();
    await expect.poll(async () => {
      state = await withComparisonGeometryDeadline(quality20MapState(map));
      if (state.width <= 100 || state.height <= 100 || !state.footprintsLoaded ||
          !record(state.geometry) || !Array.isArray(state.geometry.features)) return null;
      return state.geometry.features.filter(record).map((feature) => feature.id).sort();
    }, { message: "Comparison must finish loading every exact source footprint, independently of its basemap." }).toEqual(expectedFootprintIds).catch(async (error: unknown) => {
      try {
        test.info().annotations.push({ type: "find-comparison-map-failure", description: JSON.stringify({
          ...await readComparisonMapDiagnostic(map, comparisonNetwork.snapshot()), stage: "find_compare_geometry",
          failureKind: error instanceof ComparisonGeometryProbeTimeout ? "geometry_probe_timeout" : "geometry_probe_error"
        }) });
      } catch { /* Preserve the original geometry probe failure. */ }
      finally { comparisonNetwork.dispose(); }
      throw error;
    });
    guard(state && state.width > 100 && state.height > 100, "Dubai comparison basemap has no useful dimensions.");
    guard(record(state.geometry) && Array.isArray(state.geometry.features), "Dubai comparison footprint source is missing.");
    const footprints = state.geometry.features.filter(record);
    expect(footprints.map((feature) => feature.id).sort()).toEqual(expectedFootprintIds);
    progress.complete("find_compare_geometry");
    progress.start("find_compare_markers");
    await expect(dashboard.locator("[data-find-result-marker]")).toHaveCount(3);
    function positions(value: unknown): number[][] {
      if (!Array.isArray(value)) return [];
      if (value.length === 2 && value.every((number) => typeof number === "number")) return [value as number[]];
      return value.flatMap(positions);
    }
    for (const candidate of selectedCandidates) {
      await expect(dashboard.locator(`[data-find-result-marker="${candidate.sourceFeatureId}"]`)).toBeVisible();
      const feature = footprints.find((item) => item.id === candidate.sourceFeatureId);
      if (hasFootprint(candidate)) expect(feature?.geometry).toEqual(candidate.geometry);
      else expect(feature).toBeUndefined();
    }
    progress.complete("find_compare_markers");
    progress.start("find_compare_bounds");
    // Basemap tiles may already be visible while the camera is still animating.
    // Observe the final viewport, retaining every vertex and centroid assertion.
    await expect.poll(async () => {
      const framed = await quality20MapState(map);
      return selectedCandidates.every((candidate) => {
        const points = [[Number(candidate.longitude), Number(candidate.latitude)], ...positions(record(candidate.geometry) ? candidate.geometry.coordinates : null)];
        return points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= framed.bounds[0][0] &&
          x <= framed.bounds[1][0] && y >= framed.bounds[0][1] && y <= framed.bounds[1][1]);
      });
    }, { message: "Dubai comparison must frame every complete footprint after camera fit." }).toBe(true);
    progress.complete("find_compare_bounds");
    progress.start(parentStep);
  };
  await verifyComparison();
  progress.start("find_compare_artifact");
  await expect.poll(async () => {
    const state = await localArtifactState(page, configuration.userId, "find");
    return `${state?.shortlistCount ?? 0}:${state?.comparisonView ?? "none"}`;
  }).toBe("3:dashboard");
  await stableLocalBarrier(page);
  assertNoReplay(beforeLocalComparison, policy.snapshotJourneyRequests());
  progress.complete("find_compare_artifact");
  progress.start("find_compare");
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
    await verifyComparison();
    for (const identity of identities) await expect(page.getByText(String(identity), { exact: true })).toBeVisible();
  });
  expect(budget.paidDispatchCount()).toBe(paidBeforeReopen);
  progress.complete("find_local_reopen");
  for (const [index, candidate] of selectedCandidates.entries()) {
    const beforeAnalysis = policy.snapshotJourneyRequests();
    const contextPromise = page.waitForResponse((response) => response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/prototype/point-to-object/context", { timeout: SOURCE_REQUEST_HARNESS_TIMEOUT_MS });
    await dashboard.getByRole("button", { name: "Open object analysis", exact: true }).nth(index).click();
    const contextResponse = await contextPromise;
    expect(contextResponse.request().postDataJSON()).toEqual({ caseKey: "dubai", longitude: candidate.longitude,
      latitude: candidate.latitude, locale: "en", expectedSourceFeatureId: candidate.sourceFeatureId });
    const contextPayload: unknown = await boundedLiveJourneyResponseJson(contextResponse, 10_000);
    guard(contextResponse.status() === 200 && record(contextPayload) && contextPayload.mode === "resolved" &&
      record(contextPayload.subject) && contextPayload.subject.sourceFeatureId === candidate.sourceFeatureId,
    "Dubai Find to Analyse did not resolve the same exact source identity with HTTP 200.");
    await expect(dashboard).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled({ timeout: 30_000 });
    await expect.poll(async () => page.evaluate(() => {
      const raw = sessionStorage.getItem("geoai:point-to-object:selection:v3");
      return raw ? JSON.parse(raw)?.resolvedObject?.sourceFeatureId : null;
    })).toBe(candidate.sourceFeatureId);
    const selection = await page.evaluate(() => JSON.parse(sessionStorage.getItem("geoai:point-to-object:selection:v3") ?? "null"));
    expect(selection.object.sourceFeatureId).toBe(candidate.sourceFeatureId);
    if (hasFootprint(candidate)) expect(selection.object.geometry).toEqual(candidate.geometry);
    expect(budget.paidDispatchCount()).toBe(paidBeforeReopen + (runCandidateAnalysis ? index : 0));
    const afterAnalysis = policy.snapshotJourneyRequests();
    expect(afterAnalysis["POST /api/prototype/point-to-object/context"] ?? 0).toBe((beforeAnalysis["POST /api/prototype/point-to-object/context"] ?? 0) + 1);
    expect(afterAnalysis["POST /api/prototype/point-to-object/find"]).toBe(beforeAnalysis["POST /api/prototype/point-to-object/find"]);
    if (runCandidateAnalysis) {
      await page.locator("#point-object-question").fill(SPRINT10_PUBLIC_ANALYSIS_QUESTION);
      progress.start("analyse_paid_response");
      const aiObservation = observeSourcePostResponse(page, "/api/prototype/point-to-object/ai", 180_000);
      let observed: SourceResponseObservation;
      try {
        await page.getByRole("button", { name: "Analyze", exact: true }).click();
        observed = await aiObservation.result;
      } finally {
        aiObservation.cancel();
      }
      if (observed.kind !== "response") {
        progress.start(observed.kind === "aborted" ? "analyse_paid_aborted" :
          observed.kind === "network_failed" ? "analyse_paid_network_failed" : "analyse_paid_response_timeout");
        throw new Error("The paid analysis response did not complete.");
      }
      const aiResponse = observed.response;
      const aiPayload: unknown = await boundedLiveJourneyResponseJson(aiResponse, 10_000);
      const aiSubmitted: unknown = aiResponse.request().postDataJSON();
      validateSprint10FindAnalysisRequest(aiSubmitted, index + 1, analysisSources);
      progress.complete("analyse_paid_response");
      progress.start("analyse_paid_terminal");
      await budget.waitForTerminalReceipts();
      progress.complete("analyse_paid_terminal");
      progress.start("analyse_result_contract");
      guard(aiResponse.status() === 200 && record(aiPayload) && record(aiPayload.subject) &&
        aiPayload.subject.sourceFeatureId === candidate.sourceFeatureId && aiPayload.subject.sourceLabel === "© OpenStreetMap contributors",
      "Find analysis response did not return HTTP 200 for the exact source identity and attribution.");
      const evidenceInput = { response: aiPayload, submittedRequest: aiSubmitted, expectedSourceFeatureId: String(candidate.sourceFeatureId),
        telemetryIdentity: { requestKey: sprint10LiveRequestKey(configuration.scope, "ai", index + 1, configuration.commit),
          phase: "S4" as const, candidateHost: configuration.host, candidateCommit: configuration.commit, route: "ai" as const,
          depth: "standard" as const, promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 as const } };
      const evidence = buildSprint10AnalysisResultEvidence(evidenceInput);
      expect(evidence.submitted).toMatchObject({ depth: "standard", goal: "custom", role: "consultant_broker",
        scenario: "b2b_hotel_development", perspective: "developer", horizon: "one_to_three_years", locale: "en" });
      if (configuration.findAnalysisEvidencePrefix) writeSprint10AnalysisResultEvidence(`${configuration.findAnalysisEvidencePrefix}-${index + 1}.json`, evidenceInput);
      await expect(page.getByTestId("ai-success")).toBeVisible();
      await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
      await expect(page.getByTestId("role-decision-cards")).toHaveAttribute("data-goal", "custom");
      await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-role", "consultant_broker");
      await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-scenario", "b2b_hotel_development");
      guard(record(aiPayload.content) && record(aiPayload.content.decisionBrief) && typeof aiPayload.content.decisionBrief.headline === "string",
        "Find analysis content has no validated decision headline.");
      await expect(page.getByText(aiPayload.content.decisionBrief.headline, { exact: true }).first()).toBeVisible();
      progress.complete("analyse_result_contract");
      progress.start("analyse_local_save");
      await expect.poll(async () => {
        const state = await localArtifactState(page, configuration.userId, "analyse");
        return state?.count === index + 1 ? state.domainIdentity : null;
      }).toBe(JSON.stringify({ sourceFeatureId: candidate.sourceFeatureId, evidencePackHash: evidence.evidencePackHash }));
      const savedAnalysis = await requireLocalArtifactState(page, configuration.userId, "analyse", index + 1);
      expect(savedAnalysis.role).toBe("consultant_broker");
      expect(savedAnalysis.scenario).toBe("b2b_hotel_development");
      progress.complete("analyse_local_save");
      progress.start("analyse_local_reopen");
      await reopenSavedArtifact(page, configuration.userId, "analyse", policy, savedAnalysis, async () => {
        await expect(page.getByTestId("ai-success")).toBeVisible();
        await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", "standard");
        await expect(page.getByTestId("role-decision-cards")).toHaveAttribute("data-goal", "custom");
      }, index + 1);
      expect(budget.paidDispatchCount()).toBe(paidBeforeReopen + index + 1);
      progress.complete("analyse_local_reopen");
    }
    const beforeReturn = policy.snapshotJourneyRequests();
    if (runCandidateAnalysis) await page.goto("/prototype/point-to-object");
    await page.getByRole("tab", { name: "Find", exact: true }).click();
    await page.getByRole("button", { name: "Open full comparison dashboard", exact: true }).click();
    await verifyComparison();
    await stableLocalBarrier(page);
    const current = await requireLocalArtifactState(page, configuration.userId, "find");
    expect(current.artifactId).toBe(saved.artifactId);
    expect(current.domainIdentity).toBe(saved.domainIdentity);
    expect(current.viewRevision).toBeGreaterThanOrEqual(saved.viewRevision);
    expect(current.shortlistCount).toBe(3);
    expect(current.comparisonView).toBe("dashboard");
    assertNoReplay(beforeReturn, policy.snapshotJourneyRequests());
    await reopenSavedArtifact(page, configuration.userId, "find", policy, current, verifyComparison);
    expect(budget.paidDispatchCount()).toBe(paidBeforeReopen + (runCandidateAnalysis ? index + 1 : 0));
  }
  comparisonNetwork.dispose();
}

async function runSingaporeFind(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress) {
  progress.start("find_source_ui");
  progress.start("find_source_ui_navigation");
  await page.goto("/prototype/point-to-object");
  progress.complete("find_source_ui_navigation");
  progress.start("find_source_ui_tab");
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  progress.complete("find_source_ui_tab");
  const findCta = page.getByTestId("find-search-cta");
  const twoDimensionalControl = page.getByTestId("map-dimension-control").getByRole("button", { name: "2d", exact: true });
  progress.start("find_source_ui_default_2d");
  await expect(twoDimensionalControl).toHaveAttribute("aria-pressed", "true");
  progress.complete("find_source_ui_default_2d");
  progress.start("find_source_ui_initial_cta");
  await expect(findCta).toBeEnabled({ timeout: 30_000 });
  progress.complete("find_source_ui_initial_cta");
  progress.start("find_source_ui_city_change");
  await page.getByTestId("point-object-city-select").selectOption("singapore");
  progress.complete("find_source_ui_city_change");
  progress.start("find_source_ui_city_pending");
  await expect(findCta).toBeDisabled();
  progress.complete("find_source_ui_city_pending");
  progress.start("find_source_ui_city_ready");
  await expect(findCta).toBeEnabled({ timeout: 30_000 });
  progress.complete("find_source_ui_city_ready");
  progress.start("find_source_ui_role");
  await page.getByTestId("point-object-find-role-select").selectOption("consultant_broker");
  progress.complete("find_source_ui_role");
  progress.start("find_source_ui_scenario");
  await page.getByTestId("point-object-find-scenario-select").selectOption("b2b_commercial_real_estate");
  progress.complete("find_source_ui_scenario");
  progress.start("find_source_ui_group");
  await expect(page.getByTestId("point-object-find-group-select")).toHaveValue("commercial_office");
  progress.complete("find_source_ui_group");
  progress.start("find_source_camera");
  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  await expect(zoomIn).toBeVisible({ timeout: 30_000 });
  await zoomIn.click();
  await expect(findCta).toBeDisabled();
  await expect(findCta).toBeEnabled({ timeout: 30_000 });
  progress.complete("find_source_camera");
  progress.start("find_source_cta");
  await expect(findCta).toBeEnabled({ timeout: 30_000 });
  progress.complete("find_source_cta");
  progress.start("find_source_pre_dispatch");
  const preDispatch = await installFindPreDispatchGate(page, acceptedSingaporeFindRequest, "Singapore");
  const responseObservation = observeSourcePostResponse(page, "/api/prototype/point-to-object/find", SOURCE_REQUEST_HARNESS_TIMEOUT_MS);
  let submitted: AcceptedFindRequest;
  try {
    await page.getByTestId("find-search-cta").click();
    submitted = await preDispatch.request;
  }
  catch (error) {
    responseObservation.cancel();
    markFindPreDispatchFailure(error, progress);
    throw error;
  }
  progress.complete("find_source_pre_dispatch");
  progress.start("find_source_response_wait");
  const response = requireFindSourceResponse(await responseObservation.result, progress);
  progress.complete("find_source_response_wait");
  progress.start("find_source_http");
  guard(response.status() === 200, "The Singapore Find source response did not return HTTP 200.");
  progress.complete("find_source_http");
  progress.start("find_source_body");
  const payload: unknown = await boundedLiveJourneyResponseJson(response, 10_000);
  progress.complete("find_source_body");
  progress.start("find_source_contract");
  guard(acceptedFindResponse(payload, submitted, "singapore", "commercial_office"),
    "The Singapore Find response did not preserve the exact bounded request and open-map source contract.");
  progress.complete("find_source_contract");
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
  programme?: string;
  prompt?: string;
  controls?: typeof DUBAI_CREATE_GOLDEN.controls;
  assertGeometry?: typeof assertDubaiCreateGeometry;
};

async function assertCreateMap(page: Page, expected: unknown, dimension: "2d" | "3d") {
  const preview = page.getByTestId("create-result-preview-3d");
  await page.getByTestId(`create-preview-mode-${dimension}`).click();
  await expect(preview).toHaveAttribute("data-preview-status", "ready");
  await expect(preview).toHaveAttribute("data-preview-basemap", "rendered");
  await expect(preview).toHaveAttribute("data-preview-camera-pitch", dimension === "3d" ? "50" : "0");
  // Read the mounted MapLibre source and rendered features, not only React data attributes.
  await expect.poll(async () => preview.evaluate(async (element) => {
    type Fiber = { memoizedState: { memoizedState: unknown; next: unknown } | null; return: Fiber | null };
    const key = Object.getOwnPropertyNames(element).find(name => name.startsWith("__reactFiber$"));
    let fiber = key ? (element as unknown as Record<string, Fiber>)[key] : null;
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const map = (hook.memoizedState as { current?: import("maplibre-gl").Map } | null)?.current;
        if (map && typeof map.queryRenderedFeatures === "function" && typeof map.getSource === "function") {
          const source = map.getSource("create-result-preview-massing") as import("maplibre-gl").GeoJSONSource | undefined;
          const rendered = map.queryRenderedFeatures();
          const geometry = source ? await source.getData() : null;
          const canvas = map.getCanvas();
          const points = geometry?.type === "FeatureCollection" ? geometry.features.flatMap(f =>
            f.geometry.type === "Polygon" ? f.geometry.coordinates.flat() : []) : [];
          return { geometry,
            framed: points.length > 0 && points.every(p => {
              const pixel = map.project([p[0], p[1]]);
              return pixel.x >= -1 && pixel.x <= canvas.clientWidth + 1 && pixel.y >= -1 && pixel.y <= canvas.clientHeight + 1;
            }),
            context: rendered.filter(f => !String(f.source).startsWith("create-result-preview-")).length > 0,
            massing: rendered.filter(f => f.source === "create-result-preview-massing").length > 0,
            pitch: Math.round(map.getPitch()) };
        }
        hook = hook.next as typeof hook;
      }
      fiber = fiber.return;
    }
    return null;
  }), { timeout: 30_000 }).toEqual({ geometry: expected, framed: true, context: true, massing: true, pitch: dimension === "3d" ? 50 : 0 });
}

async function assertSavedCreateGeometry(page: Page, userId: string, expected: unknown,
  coordinates: number[][][], areaContext: unknown, assertGeometry: typeof assertDubaiCreateGeometry) {
  const stored = await page.evaluate((id) => {
    const raw = localStorage.getItem(`geoai:point-to-object:projects:v1:${encodeURIComponent(`user:${id}`)}`);
    const store = raw ? JSON.parse(raw) : null;
    const artifacts = (store?.projects ?? []).flatMap((p: { artifacts?: Array<{ kind: string; payload: unknown }> }) => p.artifacts ?? []);
    return artifacts.find((a: { kind: string }) => a.kind === "create")?.payload ?? null;
  }, userId);
  guard(record(stored) && record(stored.aoi), "Saved Create geometry is missing.");
  expect(stored.aoi.coordinates).toEqual(coordinates);
  expect(stored.areaContext).toEqual(areaContext);
  // areaContextUsed belongs to the wire envelope; the saved domain keeps its
  // context separately. Every canonical concept field must remain identical.
  expect(stored.generated).toEqual(assertGeometry(expected));
  assertGeometry(stored.generated);
}

async function runMarketCreate(
  page: Page,
  configuration: LiveConfiguration,
  policy: NetworkPolicy,
  budget: ReturnType<typeof installBudgetGate>,
  input: LiveCreateCase,
  progress: LiveProgress
) {
  const caseStartedAt = Date.now();
  progress.start("create_source_context_ui");
  await page.goto("/prototype/point-to-object");
  await expect(page.locator('main[data-project-restoration="ready"]')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("point-object-city-select").selectOption(input.marketKey);
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  const upload = page.getByLabel("Upload GeoJSON", { exact: true });
  await expect(upload).toBeAttached();
  progress.complete("create_source_context_ui");

  progress.start("create_source_context_request");
  const contextResponseDeadlineAt = Date.now() + SOURCE_REQUEST_HARNESS_TIMEOUT_MS;
  const contextRequestPromise = page.waitForRequest((request) =>
    request.method() === "POST" && new URL(request.url()).pathname === "/api/prototype/point-to-object/area-context", { timeout: SOURCE_REQUEST_HARNESS_TIMEOUT_MS });
  await upload.setInputFiles({
    name: input.fileName,
    mimeType: "application/geo+json",
    buffer: Buffer.from(JSON.stringify({ type: "Polygon", coordinates: input.coordinates }))
  });
  const contextRequest = await contextRequestPromise;
  const submittedContext: unknown = contextRequest.postDataJSON();
  progress.complete("create_source_context_request");

  progress.start("create_source_context_response");
  const contextResponse = requireCreateContextResponse(
    await observeExactSourceRequestResponse(contextRequest, contextResponseDeadlineAt),
    progress
  );
  progress.complete("create_source_context_response");

  progress.start("create_source_context_http");
  guard(contextResponse.status() === 200, `The ${input.label} AOI context did not return HTTP 200.`);
  progress.complete("create_source_context_http");

  progress.start("create_source_context_body");
  const contextPayload: unknown = await boundedLiveJourneyResponseJson(contextResponse, 10_000);
  const sourceLatencyMs = Date.now() - (contextResponseDeadlineAt - SOURCE_REQUEST_HARNESS_TIMEOUT_MS);
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
  if (configuration.quality20) {
    const frozen = configuration.quality20.binding.create;
    guard(frozen && quality20Hash(contextPayload) === frozen.contextHash,
      "QUALITY20_BLOCKED: Create source context differs from the frozen snapshot.");
  }

  progress.start("create_source_context_ui_acceptance");
  const areaContextSection = page.getByTestId("create-area-context-heading").locator("xpath=ancestor::section[1]");
  await expect(areaContextSection.getByText("Mapped objects", { exact: true })).toBeVisible();
  await expect(areaContextSection.locator("strong").first()).toHaveText(String(contextPayload.summary.sampleSize));
  progress.complete("create_source_context_ui_acceptance");
  const programmeLabel = input.programme === "residential_mixed_use" ? /^Residential courtyard/
    : input.programme === "civic_green" ? /^Public campus/ : /^Business towers/;
  await page.getByRole("button", { name: programmeLabel }).click();
  if (input.prompt) await page.getByLabel("Custom direction", { exact: true }).fill(input.prompt);
  if (input.controls) {
    await page.getByText("Concept parameters", { exact: true }).click();
    const sliders = [
      [/^Blocks/, input.controls.blockCount], [/^Minimum levels/, input.controls.levelsMin],
      [/^Maximum levels/, input.controls.levelsMax], [/^Site coverage/, input.controls.targetSiteCoveragePct],
      [/^Open space/, input.controls.openSpacePct], [/^Setback/, input.controls.setbackM]
    ] as const;
    for (const [name, value] of sliders) {
      const slider = page.getByRole("slider", { name });
      const current = Number(await slider.inputValue());
      const minimum = Number(await slider.getAttribute("min") ?? "0");
      const maximum = Number(await slider.getAttribute("max") ?? "100");
      const step = Number(await slider.getAttribute("step") ?? "1");
      guard(Number.isFinite(step) && step > 0 && value >= minimum && value <= maximum &&
        Math.abs((value - current) / step - Math.round((value - current) / step)) < 1e-8,
      "The requested Create slider value is not reachable through its native step.");
      await slider.focus();
      if (current === value) {
        // Exercise onChange even for template defaults. Keep coupled height controls intact.
        const isMinimumLevels = name.source === "^Minimum levels";
        const isMaximumLevels = name.source === "^Maximum levels";
        const pairedLevel = isMinimumLevels || isMaximumLevels ? Number(await page.getByRole("slider", {
          name: isMinimumLevels ? /^Maximum levels/ : /^Minimum levels/
        }).inputValue()) : null;
        const neighbours = isMaximumLevels ? [current + step, current - step] : [current - step, current + step];
        const neighbour = neighbours.find(candidate => candidate >= minimum && candidate <= maximum &&
          (!isMinimumLevels || candidate <= pairedLevel!) && (!isMaximumLevels || candidate >= pairedLevel!));
        guard(neighbour !== undefined, "The Create slider has no legal reversible neighbouring value.");
        await page.keyboard.press(neighbour > current ? "ArrowRight" : "ArrowLeft");
        await expect(slider).toHaveValue(String(neighbour));
        await page.keyboard.press(neighbour > current ? "ArrowLeft" : "ArrowRight");
      } else {
        for (let i = 0; i < Math.round(Math.abs(value - current) / step); i++) {
          await page.keyboard.press(value > current ? "ArrowRight" : "ArrowLeft");
        }
      }
      await expect(slider).toHaveValue(String(value));
    }
    await expect(page.getByTestId("create-local-preflight")).toHaveAttribute("data-preflight-kind", "ready", { timeout: 30_000 });
  }
  await expect(page.getByTestId("create-generate-action")).toBeEnabled();
  if (configuration.quality20) budget.armFrozenCase();
  progress.start("create_paid_response");
  const paidStartedAt = Date.now();
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/point-to-object/create"), { timeout: 180_000 });
  await page.getByTestId("create-generate-action").click();
  const response = await responsePromise;
  const payload: unknown = await response.json();
  const responseMs = Date.now() - paidStartedAt;
  progress.complete("create_paid_response");
  progress.start("create_paid_terminal");
  await budget.waitForTerminalReceipts();
  progress.complete("create_paid_terminal");
  progress.start("create_result_contract");
  const submitted: unknown = response.request().postDataJSON();
  guard(record(submitted) && submitted.marketKey === input.marketKey && submitted.locale === "en" && submitted.depth === "standard" &&
    submitted.templateId === (input.programme ?? "commercial_hub") &&
    JSON.stringify(submitted.aoiCoordinates) === JSON.stringify(input.coordinates),
  `The ${input.label} Create request did not preserve the exact market, programme, depth and AOI.`);
  guard(response.status() === 200 && record(payload) && payload.mode === "openai_concept" &&
    typeof payload.generatedAt === "string" && Number.isFinite(Date.parse(payload.generatedAt)) &&
    payload.promptVersion === SPRINT10_CREATE_PROMPT_VERSION && Array.isArray(payload.alternatives) && payload.alternatives.length === 2 &&
    payload.alternatives.every((item) => record(item) && (item.id === "A" || item.id === "B")) && payload.caveat === CAVEAT,
  `The ${input.label} Create response did not return one strict current A/B concept.`);
  progress.complete("create_result_contract");
  const assertGeometry = input.assertGeometry ?? (input.controls ? assertDubaiCreateGeometry : null);
  const goldenConcept = input.assertGeometry ? input.assertGeometry(payload)
    : input.controls ? assertDubaiCreateGeometry(payload) : null;
  if (input.controls && !input.assertGeometry) assertDubaiCreateRequest(submitted);
  await expect(page.getByTestId("generated-concept-summary")).toBeVisible();
  const renderedMs = Date.now() - paidStartedAt;
  const paidAfterGeneration = budget.paidDispatchCount();
  const beforeLocalViews = policy.snapshotJourneyRequests();
  await page.getByTestId("create-alternative-b").click();
  await page.getByTestId("create-open-result-dashboard").click();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  if (configuration.quality20) {
    const preview = page.getByTestId("create-result-preview-3d");
    await expect(preview).toHaveAttribute("data-preview-basemap", "rendered");
    await expect.poll(async () => Number(await preview.getAttribute("data-preview-basemap-feature-count"))).toBeGreaterThan(0);
    await page.getByTestId("create-preview-mode-3d").click();
    await expect(preview).toHaveAttribute("data-preview-camera-pitch", "50");
    await expect.poll(async () => Number(await preview.getAttribute("data-preview-rendered-massing-count"))).toBeGreaterThan(0);
    await page.getByTestId("create-dashboard-alternative-a").click();
    await expect(preview).toHaveAttribute("data-preview-variant", "A");
    await page.getByTestId("create-dashboard-alternative-b").click();
    await expect(preview).toHaveAttribute("data-preview-variant", "B");
  }
  if (goldenConcept) {
    for (const id of ["A", "B"] as const) {
      const option = goldenConcept.alternatives!.find(a => a.id === id)!;
      await page.getByTestId(`create-dashboard-alternative-${id.toLowerCase()}`).click();
      await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-estimated-floor-area-sqm", String(option.massing.estimatedFloorAreaSqM));
      for (const mode of ["2d", "3d"] as const) await assertCreateMap(page, option.massing.featureCollection, mode);
    }
  }
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
  if (configuration.quality20) guard(savedDomain.aoiId === configuration.quality20.binding.create?.aoiId,
    "Saved Create AOI identity differs from the frozen input; no parity workaround is applied.");
  progress.complete("create_local_save");
  if (goldenConcept) await assertSavedCreateGeometry(page, configuration.userId, payload, input.coordinates, contextPayload, assertGeometry!);
  progress.start("create_local_reopen");
  await reopenSavedArtifact(page, configuration.userId, "create", policy, saved, async () => {
    await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
    await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
    if (goldenConcept) {
      await assertSavedCreateGeometry(page, configuration.userId, payload, input.coordinates, contextPayload, assertGeometry!);
      await assertCreateMap(page, goldenConcept.alternatives!.find(a => a.id === "B")!.massing.featureCollection, "3d");
    }
  });
  const beforeReload = policy.snapshotJourneyRequests();
  await page.reload();
  await expect(page.getByTestId("create-full-result-dashboard")).toBeVisible();
  await expect(page.getByTestId("create-result-kpis")).toHaveAttribute("data-active-variant", "B");
  await stableLocalBarrier(page);
  const reloaded = await requireLocalArtifactState(page, configuration.userId, "create");
  assertSameArtifact(saved, reloaded);
  if (goldenConcept) {
    await assertSavedCreateGeometry(page, configuration.userId, payload, input.coordinates, contextPayload, assertGeometry!);
    await assertCreateMap(page, goldenConcept.alternatives!.find(a => a.id === "B")!.massing.featureCollection, "2d");
  }
  assertNoReplay(beforeReload, policy.snapshotJourneyRequests());
  expect(budget.paidDispatchCount()).toBe(paidAfterGeneration);
  progress.complete("create_local_reopen");
  if (configuration.quality20) test.info().annotations.push({ type: "quality20-case", description: JSON.stringify({
    caseId: configuration.quality20.definition.id, entryCoverage: "create_ui", sourceLatencyMs, responseMs, renderedMs,
    evidencePackHash: quality20Hash(contextPayload), paidPostCount: 1, reopenPaidPostCount: 0, totalMs: Date.now() - caseStartedAt
  }) });
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
    coordinates: DUBAI_CREATE_GOLDEN.coordinates,
    programme: DUBAI_CREATE_GOLDEN.templateId,
    controls: DUBAI_CREATE_GOLDEN.controls,
    fileName: "quality20-dubai-golden-large-L.geojson",
    label: "Dubai synthetic golden large-L"
  }, progress);
}

async function runDubaiCreateProgramme(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy,
  budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress, scope: DubaiCreateProgrammeScope) {
  const input = dubaiCreateProgrammeCase(scope);
  await runMarketCreate(page, configuration, policy, budget, {
    ...input,
    assertGeometry: (payload) => assertDubaiCreateProgrammeGeometry(scope, payload)
  }, progress);
}

async function quality20SelectSource(page: Page, input: { marketKey: "dubai" | "singapore"; query: string; sourceIdentity: string }, progress: LiveProgress) {
  const { chosenIndex } = await runAnalyseSourceSuggest(page, {
    marketKey: input.marketKey, query: input.query, expectedSourceIdentity: input.sourceIdentity,
    enterQuery: (search) => search.fill(input.query), candidateLabel: /./, label: input.marketKey
  }, progress);
  progress.start("analyse_source_context");
  const startedAt = Date.now();
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/prototype/point-to-object/context", { timeout: SOURCE_REQUEST_HARNESS_TIMEOUT_MS });
  await page.locator(`#point-object-search-result-${chosenIndex}`).click();
  const response = await responsePromise;
  const payload: unknown = await boundedLiveJourneyResponseJson(response, 10_000);
  const receivedAt = new Date().toISOString();
  guard(response.status() === 200 && record(payload) && payload.mode === "resolved" && record(payload.subject) &&
    payload.subject.sourceFeatureId === input.sourceIdentity, "Observed context did not resolve the exact frozen source identity.");
  progress.complete("analyse_source_context");
  return { payload, receivedAt, sourceLatencyMs: Date.now() - startedAt };
}

/** Explicit root-authorized recovery coverage, not ordinary auto-entry acceptance. */
async function suppressOneInitialNonpaidChallenge(page: Page) {
  let count = 0;
  let finished!: () => void;
  const observed = new Promise<void>((resolve) => { finished = resolve; });
  const handler = async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    guard(count === 0, "Only the first nonpaid auto-entry challenge may be suppressed.");
    count += 1;
    await route.abort("blockedbyclient");
    finished();
  };
  await page.route("**/api/prototype/point-to-object/ai", handler);
  return {
    async waitAndRemove() {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { await Promise.race([observed, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("The expected nonpaid auto-entry challenge was not observed.")), 30_000);
      })]); } finally { if (timer) clearTimeout(timer); await page.unroute("**/api/prototype/point-to-object/ai", handler); }
      guard(count === 1, "The nonpaid recovery entry did not abort exactly one challenge.");
    }
  };
}

async function quality20MapState(container: Locator, bounds?: number[]) {
  return container.evaluate(async (element, targetBounds) => {
    type Fiber = { memoizedState: { memoizedState: unknown; next: unknown } | null; return: Fiber | null };
    const key = Object.getOwnPropertyNames(element).find((name) => name.startsWith("__reactFiber$"));
    let fiber = key ? (element as unknown as Record<string, Fiber>)[key] : null;
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const map = (hook.memoizedState as { current?: import("maplibre-gl").Map } | null)?.current;
        if (map && typeof map.queryRenderedFeatures === "function" && typeof map.getSource === "function") {
          if (targetBounds) map.fitBounds([[targetBounds[0], targetBounds[1]], [targetBounds[2], targetBounds[3]]], { padding: 0, duration: 0, bearing: 0, pitch: 0 });
          const style = map.getStyle();
          const layers = (style.layers ?? []).filter((layer) => "source" in layer && !String(layer.source).startsWith("geoai-") &&
            (layer.type === "line" || layer.type === "fill")).map((layer) => layer.id);
          const source = map.getSource("geoai-find-footprints") as import("maplibre-gl").GeoJSONSource | undefined;
          const geometry: unknown = source ? await source.getData() : null;
          const canvas = map.getCanvas();
          return { ready: map.isStyleLoaded(), basemapCount: layers.length ? map.queryRenderedFeatures(undefined, { layers }).length : 0,
            geometry, footprintsLoaded: Boolean(source) && map.isSourceLoaded("geoai-find-footprints"),
            width: canvas.clientWidth, height: canvas.clientHeight, bounds: map.getBounds().toArray() };
        }
        hook = hook.next as typeof hook;
      }
      fiber = fiber.return;
    }
    throw new Error("The real MapLibre instance is unavailable; no static map acceptance.");
  }, bounds);
}

async function runQuality20Find(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy,
  budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress, openAnalysis: boolean) {
  const selection = configuration.quality20!;
  const { binding: b, definition: d } = selection;
  const f = b.find!;
  progress.start("find_source_ui");
  await page.goto("/prototype/point-to-object");
  await expect(page.locator('main[data-project-restoration="ready"]')).toBeVisible();
  await page.getByTestId("point-object-city-select").selectOption(d.marketKey);
  await page.getByRole("tab", { name: "Find", exact: true }).click();
  await page.getByTestId("point-object-find-role-select").selectOption(b.role);
  await page.getByTestId("point-object-find-scenario-select").selectOption(b.scenario);
  await page.getByTestId("point-object-find-group-select").selectOption(f.group);
  await page.getByLabel("Levels from", { exact: true }).fill(f.mappedMinimumLevels === null ? "" : String(f.mappedMinimumLevels));
  await page.getByLabel("Levels to", { exact: true }).fill(f.mappedMaximumLevels === null ? "" : String(f.mappedMaximumLevels));
  const map = page.getByTestId("live-map-canvas").first();
  await expect.poll(async () => (await quality20MapState(map)).ready).toBe(true);
  await quality20MapState(map, f.bounds);
  await expect(page.getByTestId("find-search-cta")).toBeEnabled();
  const expected = { marketKey: d.marketKey, locale: b.locale, bounds: f.bounds, group: f.group,
    mappedMinimumLevels: f.mappedMinimumLevels, mappedMaximumLevels: f.mappedMaximumLevels, limit: 12 };
  progress.start("find_source_pre_dispatch");
  const sourceStartedAt = Date.now();
  const gate = await installFindPreDispatchGate(page, (value): value is AcceptedFindRequest =>
    record(value) && Array.isArray(value.bounds) && value.bounds.length === 4 &&
    value.bounds.every((n, i) => typeof n === "number" && Math.abs(n - f.bounds[i]) < 1e-7) &&
    quality20Hash({ ...value, bounds: f.bounds }) === quality20Hash(expected), d.marketKey === "dubai" ? "Dubai" : "Singapore");
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/prototype/point-to-object/find", { timeout: SOURCE_REQUEST_HARNESS_TIMEOUT_MS });
  await page.getByTestId("find-search-cta").click();
  await gate.request;
  const response = await responsePromise;
  const payload: unknown = await boundedLiveJourneyResponseJson(response, 10_000);
  const sourceLatencyMs = Date.now() - sourceStartedAt;
  guard(response.status() === 200 && record(payload) && Array.isArray(payload.candidates) && record(payload.source) &&
    payload.source.sourceResponseHash === f.sourceResponseHash && payload.source.acquiredAt === f.acquiredAt &&
    payload.source.licenceId === "ODbL-1.0" && payload.source.officialStatus === "open_context_not_official" && payload.caveat === CAVEAT,
  "Find returned a different/unattributed source snapshot; not frozen-cohort acceptance.");
  const candidates = payload.candidates.filter(record);
  for (const [index, id] of f.candidateIds.entries()) {
    const candidate = candidates.find((item) => item.sourceFeatureId === id);
    guard(candidate && quality20Hash(candidate.geometry ?? null) === f.geometryHashes[index], "Find candidate identity/full geometry changed.");
    const item = page.locator("li").filter({ has: page.locator(`[id="find-result-${id}"]`) });
    await item.getByRole("button", { name: "Compare", exact: true }).click();
  }
  progress.start("find_compare");
  await page.getByRole("button", { name: "Compare selected", exact: true }).click();
  await page.getByRole("button", { name: "Open full comparison dashboard", exact: true }).click();
  const dashboard = page.getByTestId("find-full-comparison-dashboard");
  await expect(dashboard).toBeVisible();
  const comparisonMap = dashboard.getByTestId("live-map-canvas");
  await expect.poll(async () => (await quality20MapState(comparisonMap)).basemapCount).toBeGreaterThan(0);
  const mapState = await quality20MapState(comparisonMap);
  const renderedMs = Date.now() - sourceStartedAt;
  guard(mapState.width > 100 && mapState.height > 100, "Compare basemap canvas has no useful dimensions.");
  guard(record(mapState.geometry) && Array.isArray(mapState.geometry.features), "Compare has no geographic footprint source.");
  const displayed = mapState.geometry.features.filter(record);
  function positions(value: unknown): number[][] {
    if (!Array.isArray(value)) return [];
    if (value.length === 2 && value.every((n) => typeof n === "number")) return [value as number[]];
    return value.flatMap(positions);
  }
  for (const [index, id] of f.candidateIds.entries()) {
    const candidate = candidates.find((item) => item.sourceFeatureId === id)!;
    const feature = displayed.find((item) => item.id === id);
    if (candidate.geometry === null || candidate.geometry === undefined) guard(!feature, "A point-only candidate was given an invented polygon.");
    else guard(feature && quality20Hash(feature.geometry) === f.geometryHashes[index], "Displayed footprint differs from exact source geometry.");
    const points = [[Number(candidate.longitude), Number(candidate.latitude)], ...positions(record(candidate.geometry) ? candidate.geometry.coordinates : null)];
    guard(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= mapState.bounds[0][0] &&
      x <= mapState.bounds[1][0] && y >= mapState.bounds[0][1] && y <= mapState.bounds[1][1]), "Compare does not frame the full selected geometry.");
  }
  await expect(dashboard.locator("[data-find-result-marker]")).toHaveCount(3);
  for (const id of f.candidateIds) await expect(dashboard.locator(`[data-find-result-marker="${id}"]`)).toBeVisible();
  const saved = await requireLocalArtifactState(page, configuration.userId, "find");
  expect(saved.shortlistCount).toBe(3);
  expect(saved.comparisonView).toBe("dashboard");
  await reopenSavedArtifact(page, configuration.userId, "find", policy, saved, async () => {
    await expect(dashboard).toBeVisible();
    await expect.poll(async () => (await quality20MapState(comparisonMap)).basemapCount).toBeGreaterThan(0);
  });
  if (openAnalysis) {
    const index = f.candidateIds.indexOf(b.subject!.sourceIdentity);
    guard(index >= 0, "Analysis candidate is not in the frozen shortlist.");
    const contextPromise = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/prototype/point-to-object/context",
      { timeout: SOURCE_REQUEST_HARNESS_TIMEOUT_MS });
    await dashboard.getByRole("button", { name: "Open object analysis", exact: true }).nth(index).click();
    const context = await contextPromise;
    validateQuality20Context(selection, await boundedLiveJourneyResponseJson(context, 10_000));
    await runQuality20Analysis(page, configuration, policy, budget, progress, true);
    await page.goto("/prototype/point-to-object?mode=find");
    assertSameArtifact(saved, await requireLocalArtifactState(page, configuration.userId, "find"));
  }
  else test.info().annotations.push({ type: "quality20-case", description: JSON.stringify({ caseId: d.id, entryCoverage: "find_three_candidate_compare",
    sourceLatencyMs, responseMs: null, renderedMs, evidencePackHash: f.sourceResponseHash,
    paidPostCount: 0, reopenPaidPostCount: 0 }) });
}

async function runQuality20Analysis(page: Page, configuration: LiveConfiguration, policy: NetworkPolicy,
  budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress, alreadySelected = false) {
  const selection = configuration.quality20!;
  const { binding: b, definition: d } = selection;
  let sourceLatencyMs: number | null = null;
  if (!alreadySelected) {
    const context = await quality20SelectSource(page, { marketKey: d.marketKey, query: b.query, sourceIdentity: b.subject!.sourceIdentity }, progress);
    sourceLatencyMs = context.sourceLatencyMs;
    validateQuality20Context(selection, context.payload);
  }
  const baseline = /^A(09|10|11|12)$/.test(d.id);
  if (!baseline) {
    const suppressed = await suppressOneInitialNonpaidChallenge(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await suppressed.waitAndRemove();
    const labels: Record<string, string> = { object_profile: "Object profile", development_screening: "Development screening", redevelopment: "Redevelopment", due_diligence: "Due diligence" };
    await page.getByRole("button", { name: labels[b.goal], exact: true }).click();
    await expect(page.locator("#analysis-follow-up")).toHaveValue(b.question);
    await page.getByRole("button", { name: d.depth === "quick" ? "Quick" : d.depth === "deep" ? "Deep" : "Standard", exact: true }).click();
    await expect(page.getByTestId("analysis-request-state")).toHaveAttribute("data-draft-depth", d.depth!);
  } else {
    await page.locator("#point-object-question").fill(b.question);
  }
  budget.armFrozenCase();
  progress.start("analyse_paid_response");
  const startedAt = Date.now();
  const responsePromise = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/prototype/point-to-object/ai", { timeout: 240_000 });
  if (baseline) await page.getByRole("button", { name: "Analyze", exact: true }).click();
  else await page.locator("form").filter({ has: page.locator("#analysis-follow-up") }).locator('button[type="submit"]').click();
  const response = await responsePromise;
  const payload: unknown = await boundedLiveJourneyResponseJson(response, 10_000);
  const responseMs = Date.now() - startedAt;
  await budget.waitForTerminalReceipts();
  guard(response.status() === 200, "Analysis HTTP response was not successful.");
  validateQuality20PaidBody(selection, "ai", response.request().postDataJSON());
  validateQuality20AnalysisResult(selection, payload);
  buildSprint10AnalysisResultEvidence({ response: payload, submittedRequest: response.request().postDataJSON(),
    expectedSourceFeatureId: b.subject!.sourceIdentity, telemetryIdentity: { requestKey: quality20RequestKey(selection, "ai"),
      phase: "S4", candidateHost: configuration.host, candidateCommit: configuration.commit, route: "ai", depth: d.depth!,
      promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6 } });
  await expect(page.getByTestId("ai-success")).toBeVisible();
  await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", d.depth!);
  const renderedMs = Date.now() - startedAt;
  const saved = await requireLocalArtifactState(page, configuration.userId, "analyse");
  expect(saved.role).toBe(b.role); expect(saved.scenario).toBe(b.scenario);
  const before = budget.paidDispatchCount();
  await reopenSavedArtifact(page, configuration.userId, "analyse", policy, saved, async () => {
    await expect(page.getByTestId("ai-success")).toBeVisible();
    await expect(page.getByTestId("analysis-depth-review")).toHaveAttribute("data-depth", d.depth!);
  });
  expect(budget.paidDispatchCount()).toBe(before);
  test.info().annotations.push({ type: "quality20-case", description: JSON.stringify({ caseId: d.id,
    entryCoverage: baseline ? "ordinary_auto_entry_custom_goal" : "follow_up_recovery_initial_NONPAID_challenge_aborted",
    sourceLatencyMs, responseMs, renderedMs, evidencePackHash: b.subject!.evidencePackHash, paidPostCount: 1, reopenPaidPostCount: 0 }) });
}

async function runQuality20Acquisition(page: Page, configuration: LiveConfiguration, budget: ReturnType<typeof installBudgetGate>, progress: LiveProgress) {
  const plan = configuration.acquisition!;
  const context = await quality20SelectSource(page, { marketKey: plan.marketKey, query: plan.query, sourceIdentity: plan.expectedSourceIdentity }, progress);
  const suppressed = await suppressOneInitialNonpaidChallenge(page);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await suppressed.waitAndRemove();
  await stableLocalBarrier(page);
  guard(budget.paidDispatchCount() === 0, "Nonpaid acquisition attempted a paid POST.");
  writeQuality20Acquisition(plan, context.payload, context.receivedAt);
  // Stop here. No Run, Refresh, generation, replay or paid result assertion.
  test.info().annotations.push({ type: "quality20-acquisition", description: "ACQUIRED_NOT_ANALYSED; local receivedAt is not source freshness." });
}

test("root-authorized protected Preview source-to-decision journey", async ({ page, baseURL }) => {
  test.skip(!runnerActive, "Live execution requires the fail-closed root-owned runner.");
  test.setTimeout(selectedScope?.endsWith("depth-cycle") ? 1_020_000 : 720_000);
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
    if (configuration.scope === "quality20-acquire") await runQuality20Acquisition(page, configuration, budget, progress);
    if (configuration.quality20) {
      const { definition: d, binding: b } = configuration.quality20;
      if (d.scope === "quality20-find" || b.find) await runQuality20Find(page, configuration, policy, budget, progress, d.scope === "quality20-analyse");
      else if (d.scope === "quality20-analyse") await runQuality20Analysis(page, configuration, policy, budget, progress);
      else {
        const coordinates = b.create!.coordinates;
        await runMarketCreate(page, configuration, policy, budget, { marketKey: d.marketKey,
          coordinates: [[...coordinates, coordinates[0]]], fileName: `${d.id}.geojson`, label: d.id,
          programme: d.programme!, prompt: b.create!.prompt }, progress);
      }
    }
    if (configuration.scope === "journey" || configuration.scope === "dubai-analyse") {
      await runDubaiAnalyse(page, configuration, policy, budget, progress);
    }
    if (configuration.scope === "dubai-depth-cycle") {
      await runDubaiDepthCycle(page, configuration, policy, budget, progress);
    }
    if (Object.hasOwn(SPRINT10_GOAL_DEPTH_SCOPES, configuration.scope)) {
      await runDubaiDepthCycle(page, configuration, policy, budget, progress, SPRINT10_GOAL_DEPTH_SCOPES[configuration.scope as Sprint10GoalDepthScope]);
    }
    if (configuration.scope === "journey" || configuration.scope === "dubai-find" || configuration.scope === "dubai-find-analysis") {
      try { await runDubaiFind(page, configuration, policy, budget, progress); }
      catch (error) {
        if (error instanceof InconclusiveLiveCoverageError && configuration.scope === "dubai-find-analysis") throw error;
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
    if (DUBAI_CREATE_PROGRAMME_SCOPES.includes(configuration.scope as DubaiCreateProgrammeScope)) {
      await runDubaiCreateProgramme(page, configuration, policy, budget, progress,
        configuration.scope as DubaiCreateProgrammeScope);
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
