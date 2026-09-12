import {
  closeSync, existsSync, fchmodSync, fstatSync, fsyncSync, lstatSync, openSync, realpathSync, unlinkSync, writeFileSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export const SPRINT09_LIVE_LEDGER_DATE = "2026-09-12" as const;
export const SPRINT09_LIVE_CEILING_USD = 2 as const;
export const SPRINT09_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V9_2026_09_12" as const;
export const SPRINT09_CREATE_PROMPT_VERSION = "POINT_OBJECT_CREATE_PROGRAM_V1_2026_09_04" as const;

export type LiveRoute = "ai" | "create";
export type LiveDepth = "quick" | "standard" | "deep";
export type LiveReceiptState = "reserved" | "settled" | "unknown";

export type LiveDeploymentAuthority = {
  deploymentHost: string;
  releaseCommit: string;
};

export type LiveAttemptTelemetry = {
  attempt: number;
  purpose: "initial" | "focused" | "repair";
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  requestId: string | null;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type LiveSpendTelemetry = {
  provider: "openai";
  route: LiveRoute;
  depth: LiveDepth;
  promptVersion: typeof SPRINT09_ANALYSIS_PROMPT_VERSION | typeof SPRINT09_CREATE_PROMPT_VERSION;
  schemaVersion: number | null;
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  requestId: string | null;
  latencyMs: number;
  attempts: number;
  attemptTrace: LiveAttemptTelemetry[];
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  costRateSource: string;
  stored: false;
  toolCalls: 0;
};

export type LiveReceipt = {
  id: number;
  createdAt: string;
  deploymentHost: string;
  releaseCommit: string;
  route: LiveRoute;
  depth: LiveDepth;
  reserveUsd: number;
  state: LiveReceiptState;
  status: number | null;
  estimatedUsd: number | null;
  telemetry: LiveSpendTelemetry | null;
  resultHash: string | null;
};

export type LiveSpendLedger = {
  schemaVersion: 2;
  date: typeof SPRINT09_LIVE_LEDGER_DATE;
  ceilingUsd: typeof SPRINT09_LIVE_CEILING_USD;
  deploymentHost: string;
  releaseCommit: string;
  receipts: LiveReceipt[];
  estimatedOrReservedUsd: number;
};

const RESERVE_USD: Readonly<Record<LiveRoute, number>> = { ai: 1.2, create: 0.3 };
const MAX_RECEIPTS = 20;
const MODEL_PATTERN = /^gpt-5\.6-(luna|terra|sol)(?:-\d{4}-\d{2}-\d{2})?$/;
const HOST_PATTERN = /^geoai-[a-z0-9-]+\.vercel\.app$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const EPSILON = 1e-8;
const COST_RATES = {
  luna: { input: 0.2, cached: 0.02, cacheWrite: 0.25, output: 1.2, label: "gpt-5.6-luna" },
  terra: { input: 2, cached: 0.2, cacheWrite: 2.5, output: 12, label: "gpt-5.6-terra" },
  sol: { input: 4, cached: 0.4, cacheWrite: 5, output: 20, label: "gpt-5.6-sol" }
} as const;

export type LiveRunLock = {
  lockPath: string;
  release: () => void;
};

export function liveRunLockPath(ledgerPath: string): string {
  const target = resolve(ledgerPath);
  return join(dirname(target), `.${basename(target)}.run.lock`);
}

export function acquireLiveRunLock(ledgerPath: string): LiveRunLock {
  const target = resolve(ledgerPath);
  const parent = dirname(target);
  if (realpathSync(parent) !== parent) throw new Error("The live run-lock directory must not resolve through a symlink.");
  const lockPath = liveRunLockPath(target);
  let descriptor: number;
  try {
    descriptor = openSync(lockPath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("Another live-test run holds the spend ledger lock. If that run crashed, verify it has stopped and remove the stale lock manually; no provider request was dispatched.");
    }
    throw error;
  }
  try {
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`, "utf8");
    fsyncSync(descriptor);
    const details = fstatSync(descriptor);
    if (!details.isFile() || (details.mode & 0o077) !== 0) throw new Error("The live run lock is not a private regular file.");
  } catch (error) {
    const held = fstatSync(descriptor);
    closeSync(descriptor);
    if (existsSync(lockPath)) {
      const current = lstatSync(lockPath);
      if (!current.isSymbolicLink() && current.isFile() && current.dev === held.dev && current.ino === held.ino) unlinkSync(lockPath);
    }
    throw error;
  }
  const held = fstatSync(descriptor);
  let released = false;
  return {
    lockPath,
    release() {
      if (released) return;
      released = true;
      try {
        const current = lstatSync(lockPath);
        if (current.isSymbolicLink() || !current.isFile() || current.dev !== held.dev || current.ino !== held.ino) {
          throw new Error("The live run lock changed identity; it was not removed automatically.");
        }
        unlinkSync(lockPath);
      } finally {
        closeSync(descriptor);
      }
    }
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function finite(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum;
}

function integer(value: unknown, minimum = 0): value is number {
  return finite(value, minimum) && Number.isInteger(value);
}

function close(left: number, right: number): boolean {
  return Math.abs(left - right) <= EPSILON;
}

function validIso(value: string): boolean {
  if (!ISO_PATTERN.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function depth(value: unknown): value is LiveDepth {
  return value === "quick" || value === "standard" || value === "deep";
}

function route(value: unknown): value is LiveRoute {
  return value === "ai" || value === "create";
}

function safeAuthority(value: LiveDeploymentAuthority): boolean {
  return HOST_PATTERN.test(value.deploymentHost) && value.deploymentHost !== "geoai-mvp.vercel.app" &&
    COMMIT_PATTERN.test(value.releaseCommit);
}

export function parseLiveDeploymentAuthority(
  baseURL: string,
  expectedHost: string | undefined,
  expectedCommit: string | undefined
): LiveDeploymentAuthority | null {
  const deploymentHost = expectedHost?.trim().toLowerCase() ?? "";
  const releaseCommit = expectedCommit?.trim().toLowerCase() ?? "";
  let target: URL;
  try { target = new URL(baseURL); } catch { return null; }
  const authority = { deploymentHost, releaseCommit };
  if (target.protocol !== "https:" || target.username || target.password || target.port ||
      target.hostname.toLowerCase() !== deploymentHost || !safeAuthority(authority)) return null;
  return authority;
}

export function validateHealthRelease(value: unknown, authority: LiveDeploymentAuthority): boolean {
  if (!safeAuthority(authority) || !record(value) || value.releaseCommit !== authority.releaseCommit ||
      !record(value.deploymentMetadata)) return false;
  return value.deploymentMetadata.provider === "vercel" &&
    value.deploymentMetadata.deploymentHost === authority.deploymentHost;
}

function validModelForAttempt(routeName: LiveRoute, depthName: LiveDepth, attempt: LiveAttemptTelemetry): boolean {
  const match = MODEL_PATTERN.exec(attempt.model);
  if (!match) return false;
  const tier = match[1];
  if (routeName === "create") {
    if (attempt.purpose === "focused") return false;
    if (attempt.purpose === "initial") {
      return depthName === "quick"
        ? (tier === "terra" || tier === "sol") && attempt.reasoningEffort === "low"
        : tier === "sol" && attempt.reasoningEffort === (depthName === "deep" ? "high" : "medium");
    }
    return tier === "sol" && attempt.reasoningEffort === "medium";
  }
  if (attempt.purpose === "initial") {
    if (depthName === "quick") return ["luna", "terra", "sol"].includes(tier) && attempt.reasoningEffort === "low";
    if (depthName === "standard") return ["terra", "sol"].includes(tier) && attempt.reasoningEffort === "medium";
    return tier === "sol" && attempt.reasoningEffort === "high";
  }
  if (attempt.purpose === "focused") {
    if (depthName === "quick") return ["terra", "sol"].includes(tier) && attempt.reasoningEffort === "low";
    return tier === "sol" && attempt.reasoningEffort === (depthName === "deep" ? "high" : "medium");
  }
  if (depthName === "quick") return ["terra", "sol"].includes(tier) && attempt.reasoningEffort === "low";
  return tier === "sol" && attempt.reasoningEffort === "medium";
}

function maximumOutputTokens(routeName: LiveRoute, depthName: LiveDepth, purpose: LiveAttemptTelemetry["purpose"]): number {
  if (routeName === "create") return depthName === "quick" ? 1_600 : depthName === "standard" ? 2_200 : 2_400;
  if (purpose === "initial") return depthName === "quick" ? 2_800 : depthName === "standard" ? 5_000 : 5_200;
  if (purpose === "focused") return depthName === "quick" ? 3_500 : depthName === "standard" ? 6_000 : 5_500;
  return depthName === "quick" ? 3_500 : depthName === "standard" ? 6_500 : 4_500;
}

function attemptCost(attempt: LiveAttemptTelemetry): { cost: number; source: string } | null {
  const tier = MODEL_PATTERN.exec(attempt.model)?.[1] as keyof typeof COST_RATES | undefined;
  if (!tier) return null;
  const rate = COST_RATES[tier];
  const ordinary = attempt.inputTokens - attempt.cachedInputTokens - attempt.cacheWriteTokens;
  const cost = ordinary * rate.input / 1_000_000 +
    attempt.cachedInputTokens * rate.cached / 1_000_000 +
    attempt.cacheWriteTokens * rate.cacheWrite / 1_000_000 +
    attempt.outputTokens * rate.output / 1_000_000;
  return {
    cost: Number(cost.toFixed(8)),
    source: `OpenAI ${rate.label} Standard API rate accessed 2026-09-04: USD ${rate.input}/M ordinary input, USD ${rate.cached}/M cached input, USD ${rate.cacheWrite}/M cache writes, USD ${rate.output}/M output`
  };
}

function parseAttempt(value: unknown, routeName: LiveRoute, depthName: LiveDepth, index: number): LiveAttemptTelemetry | null {
  const keys = ["attempt", "purpose", "model", "reasoningEffort", "requestId", "inputTokens", "cachedInputTokens",
    "cacheWriteTokens", "outputTokens", "totalTokens", "estimatedCostUsd"];
  if (!record(value) || !exactKeys(value, keys) || value.attempt !== index + 1 ||
      !["initial", "focused", "repair"].includes(String(value.purpose)) ||
      !["low", "medium", "high"].includes(String(value.reasoningEffort)) ||
      typeof value.model !== "string" || !(value.requestId === null || typeof value.requestId === "string") ||
      !integer(value.inputTokens) || !integer(value.cachedInputTokens) || !integer(value.cacheWriteTokens) ||
      !integer(value.outputTokens) || !integer(value.totalTokens) || !finite(value.estimatedCostUsd)) return null;
  const parsed = value as LiveAttemptTelemetry;
  if (parsed.totalTokens !== parsed.inputTokens + parsed.outputTokens ||
      parsed.cachedInputTokens + parsed.cacheWriteTokens > parsed.inputTokens ||
      parsed.inputTokens > (routeName === "ai" ? 81_000 : 17_000) ||
      parsed.outputTokens > maximumOutputTokens(routeName, depthName, parsed.purpose) ||
      (index === 0 && parsed.purpose === "repair") || (index === 1 && parsed.purpose !== "repair") ||
      !validModelForAttempt(routeName, depthName, parsed)) return null;
  const priced = attemptCost(parsed);
  if (!priced || !close(parsed.estimatedCostUsd, priced.cost)) return null;
  return { ...parsed };
}

export function parseLiveProviderTelemetry(
  routeName: LiveRoute,
  depthName: LiveDepth,
  payload: unknown
): LiveSpendTelemetry | null {
  if (!record(payload) || !record(payload.telemetry)) return null;
  const telemetry = payload.telemetry;
  const promptVersion = routeName === "ai" ? SPRINT09_ANALYSIS_PROMPT_VERSION : SPRINT09_CREATE_PROMPT_VERSION;
  const schemaVersion = routeName === "ai" ? 6 : null;
  if ((routeName === "ai" && (payload.mode !== "openai" || payload.schemaVersion !== schemaVersion ||
      telemetry.provider !== "openai" || telemetry.schemaVersion !== schemaVersion ||
      telemetry.depth !== depthName || telemetry.promptVersion !== promptVersion)) ||
      (routeName === "create" && (payload.mode !== "openai_concept" || payload.promptVersion !== promptVersion))) return null;
  if (typeof telemetry.model !== "string" || !["low", "medium", "high"].includes(String(telemetry.reasoningEffort)) ||
      !(telemetry.requestId === null || typeof telemetry.requestId === "string") || !integer(telemetry.latencyMs) ||
      !integer(telemetry.attempts, 1) || telemetry.attempts > 2 || !Array.isArray(telemetry.attemptTrace) ||
      telemetry.attemptTrace.length !== telemetry.attempts || !integer(telemetry.inputTokens) ||
      !integer(telemetry.cachedInputTokens) || !integer(telemetry.cacheWriteTokens) || !integer(telemetry.outputTokens) ||
      !integer(telemetry.totalTokens) || !finite(telemetry.estimatedCostUsd) ||
      typeof telemetry.costRateSource !== "string" || telemetry.costRateSource.trim().length === 0 ||
      telemetry.stored !== false || telemetry.toolCalls !== 0) return null;
  const attemptTrace = telemetry.attemptTrace.map((attempt, index) => parseAttempt(attempt, routeName, depthName, index));
  if (attemptTrace.some((attempt) => attempt === null)) return null;
  const attempts = attemptTrace as LiveAttemptTelemetry[];
  const sums = attempts.reduce((total, attempt) => ({
    input: total.input + attempt.inputTokens,
    cached: total.cached + attempt.cachedInputTokens,
    cacheWrite: total.cacheWrite + attempt.cacheWriteTokens,
    output: total.output + attempt.outputTokens,
    all: total.all + attempt.totalTokens,
    cost: total.cost + attempt.estimatedCostUsd
  }), { input: 0, cached: 0, cacheWrite: 0, output: 0, all: 0, cost: 0 });
  if (telemetry.inputTokens !== sums.input || telemetry.cachedInputTokens !== sums.cached ||
      telemetry.cacheWriteTokens !== sums.cacheWrite || telemetry.outputTokens !== sums.output ||
      telemetry.totalTokens !== sums.all || telemetry.totalTokens !== telemetry.inputTokens + telemetry.outputTokens ||
      telemetry.cachedInputTokens + telemetry.cacheWriteTokens > telemetry.inputTokens ||
      !close(telemetry.estimatedCostUsd, Number(sums.cost.toFixed(8)))) return null;
  const finalAttempt = attempts.at(-1)!;
  const reportedProfile = routeName === "ai" ? finalAttempt : attempts[0];
  const rateSources = [...new Set(attempts.map((attempt) => attemptCost(attempt)!.source))].join(" | ");
  if (telemetry.model !== reportedProfile.model ||
      telemetry.reasoningEffort !== reportedProfile.reasoningEffort ||
      telemetry.requestId !== finalAttempt.requestId || telemetry.costRateSource !== rateSources) return null;
  return {
    provider: "openai", route: routeName, depth: depthName, promptVersion, schemaVersion,
    model: telemetry.model, reasoningEffort: telemetry.reasoningEffort as LiveSpendTelemetry["reasoningEffort"],
    requestId: telemetry.requestId, latencyMs: telemetry.latencyMs, attempts: telemetry.attempts,
    attemptTrace: attempts, inputTokens: telemetry.inputTokens, cachedInputTokens: telemetry.cachedInputTokens,
    cacheWriteTokens: telemetry.cacheWriteTokens, outputTokens: telemetry.outputTokens,
    totalTokens: telemetry.totalTokens, estimatedCostUsd: telemetry.estimatedCostUsd,
    costRateSource: telemetry.costRateSource, stored: false, toolCalls: 0
  };
}

function parseStoredTelemetry(value: unknown, routeName: LiveRoute, depthName: LiveDepth): LiveSpendTelemetry | null {
  const keys = ["provider", "route", "depth", "promptVersion", "schemaVersion", "model", "reasoningEffort",
    "requestId", "latencyMs", "attempts", "attemptTrace", "inputTokens", "cachedInputTokens", "cacheWriteTokens",
    "outputTokens", "totalTokens", "estimatedCostUsd", "costRateSource", "stored", "toolCalls"];
  if (!record(value) || !exactKeys(value, keys) || value.route !== routeName || value.depth !== depthName ||
      value.provider !== "openai") return null;
  const payload = routeName === "ai"
    ? { mode: "openai", schemaVersion: 6, telemetry: value }
    : { mode: "openai_concept", promptVersion: SPRINT09_CREATE_PROMPT_VERSION, telemetry: value };
  return parseLiveProviderTelemetry(routeName, depthName, payload);
}

export function chargeLiveSpendLedger(ledger: Pick<LiveSpendLedger, "receipts">): number {
  return Number(ledger.receipts.reduce((sum, receipt) =>
    sum + (receipt.state === "settled" && receipt.estimatedUsd !== null
      ? receipt.estimatedUsd
      : Math.max(receipt.reserveUsd, receipt.telemetry?.estimatedCostUsd ?? 0)), 0).toFixed(8));
}

export function createLiveSpendLedger(authority: LiveDeploymentAuthority): LiveSpendLedger {
  if (!safeAuthority(authority)) throw new Error("Invalid immutable deployment authority.");
  return {
    schemaVersion: 2, date: SPRINT09_LIVE_LEDGER_DATE, ceilingUsd: SPRINT09_LIVE_CEILING_USD,
    ...authority, receipts: [], estimatedOrReservedUsd: 0
  };
}

function parseReceipt(value: unknown, id: number): LiveReceipt | null {
  const keys = ["id", "createdAt", "deploymentHost", "releaseCommit", "route", "depth", "reserveUsd", "state", "status", "estimatedUsd", "telemetry", "resultHash"];
  if (!record(value) || !exactKeys(value, keys) || value.id !== id || typeof value.createdAt !== "string" ||
      !validIso(value.createdAt) || typeof value.deploymentHost !== "string" || typeof value.releaseCommit !== "string" ||
      !safeAuthority({ deploymentHost: value.deploymentHost, releaseCommit: value.releaseCommit }) ||
      !route(value.route) || !depth(value.depth) || value.reserveUsd !== RESERVE_USD[value.route] ||
      !["reserved", "settled", "unknown"].includes(String(value.state)) ||
      !(value.status === null || (integer(value.status, 100) && value.status <= 599)) ||
      !(value.estimatedUsd === null || finite(value.estimatedUsd)) ||
      !(value.resultHash === null || (typeof value.resultHash === "string" && HASH_PATTERN.test(value.resultHash)))) return null;
  const state = value.state as LiveReceiptState;
  const storedTelemetry = value.telemetry === null ? null : parseStoredTelemetry(value.telemetry, value.route, value.depth);
  if (value.telemetry !== null && storedTelemetry === null) return null;
  if (state === "reserved" && (value.status !== null || value.estimatedUsd !== null || value.telemetry !== null || value.resultHash !== null)) return null;
  if (state === "unknown" && value.estimatedUsd !== null) return null;
  if (state === "settled") {
    if (value.status === null || value.resultHash === null || value.estimatedUsd === null || storedTelemetry === null ||
        value.estimatedUsd > value.reserveUsd || !close(value.estimatedUsd, storedTelemetry.estimatedCostUsd)) return null;
  }
  return { ...(value as unknown as LiveReceipt), telemetry: storedTelemetry };
}

export function parseLiveSpendLedger(value: unknown, authority: LiveDeploymentAuthority): LiveSpendLedger | null {
  const keys = ["schemaVersion", "date", "ceilingUsd", "deploymentHost", "releaseCommit", "receipts", "estimatedOrReservedUsd"];
  if (!safeAuthority(authority) || !record(value) || !exactKeys(value, keys) || value.schemaVersion !== 2 ||
      value.date !== SPRINT09_LIVE_LEDGER_DATE || value.ceilingUsd !== SPRINT09_LIVE_CEILING_USD ||
      value.deploymentHost !== authority.deploymentHost || value.releaseCommit !== authority.releaseCommit ||
      !Array.isArray(value.receipts) || value.receipts.length > MAX_RECEIPTS || !finite(value.estimatedOrReservedUsd)) return null;
  const receipts = value.receipts.map((receipt, index) => parseReceipt(receipt, index + 1));
  if (receipts.some((receipt) => receipt === null)) return null;
  const ledger = { ...value, receipts: receipts as LiveReceipt[] } as LiveSpendLedger;
  const charge = chargeLiveSpendLedger(ledger);
  return close(charge, ledger.estimatedOrReservedUsd) && charge <= SPRINT09_LIVE_CEILING_USD ? ledger : null;
}

export function rebindLiveSpendLedger(
  value: unknown,
  currentAuthority: LiveDeploymentAuthority,
  nextAuthority: LiveDeploymentAuthority,
  verifiedHealth: unknown
): LiveSpendLedger {
  const current = parseLiveSpendLedger(value, currentAuthority);
  if (!current) throw new Error("The existing live ledger failed its strict current-authority or receipt contract.");
  if (!validateHealthRelease(verifiedHealth, nextAuthority)) {
    throw new Error("The next live deployment was not verified by exact immutable health metadata.");
  }
  return { ...current, ...nextAuthority };
}

export function reserveLiveSpend(
  ledger: LiveSpendLedger,
  routeName: LiveRoute,
  depthName: LiveDepth,
  createdAt: string
): { ok: true; ledger: LiveSpendLedger; receipt: LiveReceipt } | { ok: false; reason: string } {
  if (!validIso(createdAt)) return { ok: false, reason: "Invalid receipt time." };
  if (ledger.receipts.some((receipt) => receipt.state !== "settled")) {
    return { ok: false, reason: "A previous live charge is unresolved." };
  }
  const reserveUsd = RESERVE_USD[routeName];
  if (ledger.receipts.length >= MAX_RECEIPTS || chargeLiveSpendLedger(ledger) + reserveUsd > ledger.ceilingUsd + EPSILON) {
    return { ok: false, reason: "The USD 2 live-test ceiling would be exceeded." };
  }
  const receipt: LiveReceipt = {
    id: ledger.receipts.length + 1, createdAt,
    deploymentHost: ledger.deploymentHost, releaseCommit: ledger.releaseCommit,
    route: routeName, depth: depthName, reserveUsd,
    state: "reserved", status: null, estimatedUsd: null, telemetry: null, resultHash: null
  };
  const next = { ...ledger, receipts: [...ledger.receipts, receipt] };
  return { ok: true, ledger: { ...next, estimatedOrReservedUsd: chargeLiveSpendLedger(next) }, receipt };
}

export function settleLiveSpend(
  ledger: LiveSpendLedger,
  id: number,
  outcome: { status: number | null; resultHash: string | null; telemetry: LiveSpendTelemetry | null }
): LiveSpendLedger {
  const receipt = ledger.receipts.find((candidate) => candidate.id === id);
  if (!receipt || receipt.state !== "reserved") return ledger;
  const validStatus = outcome.status !== null && integer(outcome.status, 100) && outcome.status <= 599;
  const validHash = outcome.resultHash !== null && HASH_PATTERN.test(outcome.resultHash);
  const telemetry = outcome.telemetry === null ? null : parseStoredTelemetry(outcome.telemetry, receipt.route, receipt.depth);
  const estimated = telemetry?.estimatedCostUsd ?? null;
  const settled = validStatus && validHash && estimated !== null && finite(estimated) && estimated <= receipt.reserveUsd;
  const receipts = ledger.receipts.map((candidate): LiveReceipt => candidate.id === id ? {
    ...candidate,
    state: settled ? "settled" : "unknown",
    status: validStatus ? outcome.status : null,
    estimatedUsd: settled ? estimated : null,
    telemetry,
    resultHash: validHash ? outcome.resultHash : null
  } : candidate);
  const next = { ...ledger, receipts };
  return { ...next, estimatedOrReservedUsd: chargeLiveSpendLedger(next) };
}

export function markLiveSpendUnknown(ledger: LiveSpendLedger, id: number): LiveSpendLedger {
  return settleLiveSpend(ledger, id, { status: null, resultHash: null, telemetry: null });
}
