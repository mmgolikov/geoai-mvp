import { randomBytes, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const SPRINT10_CYCLE_ID = "GEOAI_FOUR_SPRINTS_2026_09_18" as const;
export const SPRINT10_LIVE_CEILING_USD = 15 as const;
export const SPRINT10_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V10_2026_09_18" as const;
export const SPRINT10_CREATE_PROMPT_VERSION = "POINT_OBJECT_CREATE_PROGRAM_V1_2026_09_04" as const;

export type Sprint10Phase = "S1" | "S2" | "S3" | "S4";
export type Sprint10Route = "ai" | "create";
export type Sprint10Depth = "quick" | "standard" | "deep";
export type Sprint10AttemptPurpose = "initial" | "focused" | "repair";
export type Sprint10ReceiptState = "reserved" | "settled" | "unknown";
export type Sprint10UnknownReason =
  | "request_failed_after_dispatch"
  | "response_unreadable"
  | "telemetry_missing_or_invalid"
  | "settlement_evidence_invalid";

export type Sprint10RequestIdentity = {
  requestKey: string;
  phase: Sprint10Phase;
  candidateHost: string;
  candidateCommit: string;
  route: Sprint10Route;
  depth: Sprint10Depth;
  promptVersion: typeof SPRINT10_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_CREATE_PROMPT_VERSION;
  schemaVersion: 6 | null;
};

export type Sprint10AttemptTelemetry = {
  attempt: number;
  purpose: Sprint10AttemptPurpose;
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  requestId: string;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type Sprint10SpendTelemetry = {
  provider: "openai";
  route: Sprint10Route;
  depth: Sprint10Depth;
  promptVersion: typeof SPRINT10_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_CREATE_PROMPT_VERSION;
  schemaVersion: 6 | null;
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  requestId: string;
  latencyMs: number;
  attempts: number;
  attemptTrace: Sprint10AttemptTelemetry[];
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

export type Sprint10Receipt = {
  id: number;
  ledgerId: string;
  createdAt: string;
  identity: Sprint10RequestIdentity;
  reserveUsd: number;
  state: Sprint10ReceiptState;
  settledAt: string | null;
  status: number | null;
  estimatedUsd: number | null;
  telemetry: Sprint10SpendTelemetry | null;
  resultHash: string | null;
  unknownReason: Sprint10UnknownReason | null;
};

export type Sprint10SpendLedger = {
  schemaVersion: 1;
  cycleId: typeof SPRINT10_CYCLE_ID;
  ledgerId: string;
  createdAt: string;
  ceilingUsd: typeof SPRINT10_LIVE_CEILING_USD;
  generation: number;
  receipts: Sprint10Receipt[];
  estimatedOrReservedUsd: number;
};

export type Sprint10LedgerLock = {
  lockPath: string;
  release: () => void;
};

const RESERVE_USD: Readonly<Record<Sprint10Route, number>> = { ai: 1.2, create: 0.3 };
const MODEL_PATTERN = /^gpt-5\.6-(luna|terra|sol)(?:-\d{4}-\d{2}-\d{2})?$/;
const HOST_PATTERN = /^geoai-[a-z0-9-]+\.vercel\.app$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const LEDGER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REQUEST_KEY_PATTERN = /^[A-Z0-9][A-Z0-9._:-]{2,95}$/;
const REQUEST_ID_PATTERN = /^[\x21-\x7e]{1,200}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_RECEIPTS = 64;
const LOCK_WAIT_MS = 5_000;
const LOCK_POLL_MS = 10;
const SLEEP_ARRAY = new Int32Array(new SharedArrayBuffer(4));
const COST_RATES = {
  luna: { input: 0.2, cached: 0.02, cacheWrite: 0.25, output: 1.2, label: "gpt-5.6-luna" },
  terra: { input: 2, cached: 0.2, cacheWrite: 2.5, output: 12, label: "gpt-5.6-terra" },
  sol: { input: 4, cached: 0.4, cacheWrite: 5, output: 20, label: "gpt-5.6-sol" }
} as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function finite(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum;
}

function integer(value: unknown, minimum = 0): value is number {
  return finite(value, minimum) && Number.isInteger(value);
}

function validIso(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_PATTERN.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function validPhase(value: unknown): value is Sprint10Phase {
  return value === "S1" || value === "S2" || value === "S3" || value === "S4";
}

function validRoute(value: unknown): value is Sprint10Route {
  return value === "ai" || value === "create";
}

function validDepth(value: unknown): value is Sprint10Depth {
  return value === "quick" || value === "standard" || value === "deep";
}

function validUnknownReason(value: unknown): value is Sprint10UnknownReason {
  return value === "request_failed_after_dispatch" || value === "response_unreadable" ||
    value === "telemetry_missing_or_invalid" || value === "settlement_evidence_invalid";
}

function safeCandidateHost(host: string): boolean {
  return HOST_PATTERN.test(host) && host !== "geoai-mvp.vercel.app";
}

function parseIdentity(value: unknown): Sprint10RequestIdentity | null {
  const keys = ["requestKey", "phase", "candidateHost", "candidateCommit", "route", "depth", "promptVersion", "schemaVersion"];
  if (!record(value) || !exactKeys(value, keys) || typeof value.requestKey !== "string" ||
      !REQUEST_KEY_PATTERN.test(value.requestKey) || !validPhase(value.phase) ||
      typeof value.candidateHost !== "string" || !safeCandidateHost(value.candidateHost) ||
      typeof value.candidateCommit !== "string" || !COMMIT_PATTERN.test(value.candidateCommit) ||
      !validRoute(value.route) || !validDepth(value.depth)) return null;
  const expectedPrompt = value.route === "ai" ? SPRINT10_ANALYSIS_PROMPT_VERSION : SPRINT10_CREATE_PROMPT_VERSION;
  const expectedSchema = value.route === "ai" ? 6 : null;
  if (value.promptVersion !== expectedPrompt || value.schemaVersion !== expectedSchema) return null;
  return { ...(value as Sprint10RequestIdentity) };
}

function sameIdentity(left: Sprint10RequestIdentity, right: Sprint10RequestIdentity): boolean {
  return left.requestKey === right.requestKey && left.phase === right.phase &&
    left.candidateHost === right.candidateHost && left.candidateCommit === right.candidateCommit &&
    left.route === right.route && left.depth === right.depth && left.promptVersion === right.promptVersion &&
    left.schemaVersion === right.schemaVersion;
}

function maximumOutputTokens(
  route: Sprint10Route,
  depth: Sprint10Depth,
  purpose: Sprint10AttemptPurpose
): number {
  if (route === "create") return depth === "quick" ? 1_600 : depth === "standard" ? 2_200 : 2_400;
  if (purpose === "initial") return depth === "quick" ? 2_800 : depth === "standard" ? 5_000 : 5_200;
  if (purpose === "focused") return depth === "quick" ? 3_500 : depth === "standard" ? 6_000 : 5_500;
  return depth === "quick" ? 3_500 : depth === "standard" ? 6_500 : 4_500;
}

function validAttemptProfile(
  route: Sprint10Route,
  depth: Sprint10Depth,
  attempt: Sprint10AttemptTelemetry
): boolean {
  const tier = MODEL_PATTERN.exec(attempt.model)?.[1];
  if (!tier) return false;
  if (route === "create") {
    if (attempt.purpose === "focused") return false;
    if (attempt.purpose === "initial") {
      if (depth === "quick") return (tier === "terra" || tier === "sol") && attempt.reasoningEffort === "low";
      return tier === "sol" && attempt.reasoningEffort === (depth === "deep" ? "high" : "medium");
    }
    if (depth === "quick") return (tier === "terra" || tier === "sol") && attempt.reasoningEffort === "medium";
    return tier === "sol" && attempt.reasoningEffort === "medium";
  }
  if (attempt.purpose === "initial") {
    if (depth === "quick") return ["luna", "terra", "sol"].includes(tier) && attempt.reasoningEffort === "low";
    if (depth === "standard") return ["terra", "sol"].includes(tier) && attempt.reasoningEffort === "medium";
    return tier === "sol" && attempt.reasoningEffort === "high";
  }
  if (attempt.purpose === "focused") {
    if (depth === "quick") return ["terra", "sol"].includes(tier) && attempt.reasoningEffort === "low";
    return tier === "sol" && attempt.reasoningEffort === (depth === "deep" ? "high" : "medium");
  }
  if (depth === "quick") return ["terra", "sol"].includes(tier) && attempt.reasoningEffort === "low";
  return tier === "sol" && attempt.reasoningEffort === "medium";
}

function attemptCost(attempt: Sprint10AttemptTelemetry): { cost: number; source: string } | null {
  const tier = MODEL_PATTERN.exec(attempt.model)?.[1] as keyof typeof COST_RATES | undefined;
  if (!tier) return null;
  const rate = COST_RATES[tier];
  const ordinary = attempt.inputTokens - attempt.cachedInputTokens - attempt.cacheWriteTokens;
  if (ordinary < 0) return null;
  const cost = ordinary * rate.input / 1_000_000 +
    attempt.cachedInputTokens * rate.cached / 1_000_000 +
    attempt.cacheWriteTokens * rate.cacheWrite / 1_000_000 +
    attempt.outputTokens * rate.output / 1_000_000;
  return {
    cost: Number(cost.toFixed(8)),
    source: `OpenAI ${rate.label} Standard API rate accessed 2026-09-04: USD ${rate.input}/M ordinary input, USD ${rate.cached}/M cached input, USD ${rate.cacheWrite}/M cache writes, USD ${rate.output}/M output`
  };
}

function parseAttempt(
  value: unknown,
  identity: Sprint10RequestIdentity,
  index: number
): Sprint10AttemptTelemetry | null {
  const keys = ["attempt", "purpose", "model", "reasoningEffort", "requestId", "inputTokens", "cachedInputTokens",
    "cacheWriteTokens", "outputTokens", "totalTokens", "estimatedCostUsd"];
  if (!record(value) || !exactKeys(value, keys) || value.attempt !== index + 1 ||
      !["initial", "focused", "repair"].includes(String(value.purpose)) ||
      !["low", "medium", "high"].includes(String(value.reasoningEffort)) ||
      typeof value.model !== "string" || typeof value.requestId !== "string" ||
      !REQUEST_ID_PATTERN.test(value.requestId) || !integer(value.inputTokens) ||
      !integer(value.cachedInputTokens) || !integer(value.cacheWriteTokens) ||
      !integer(value.outputTokens) || !integer(value.totalTokens) || !finite(value.estimatedCostUsd)) return null;
  const parsed = value as Sprint10AttemptTelemetry;
  if (parsed.totalTokens !== parsed.inputTokens + parsed.outputTokens ||
      parsed.cachedInputTokens + parsed.cacheWriteTokens > parsed.inputTokens ||
      parsed.inputTokens > (identity.route === "ai" ? 81_000 : 17_000) ||
      parsed.outputTokens > maximumOutputTokens(identity.route, identity.depth, parsed.purpose) ||
      (index === 0 && parsed.purpose === "repair") || (index === 1 && parsed.purpose !== "repair") ||
      !validAttemptProfile(identity.route, identity.depth, parsed)) return null;
  const priced = attemptCost(parsed);
  return priced && parsed.estimatedCostUsd === priced.cost ? { ...parsed } : null;
}

export function parseSprint10ProviderTelemetry(
  identityValue: Sprint10RequestIdentity,
  payload: unknown
): Sprint10SpendTelemetry | null {
  const identity = parseIdentity(identityValue);
  if (!identity || !record(payload) || !record(payload.telemetry)) return null;
  const telemetry = payload.telemetry;
  if (identity.route === "ai") {
    if (payload.mode !== "openai" || payload.schemaVersion !== 6 || telemetry.provider !== "openai" ||
        telemetry.schemaVersion !== 6 || telemetry.depth !== identity.depth ||
        telemetry.promptVersion !== identity.promptVersion) return null;
  } else if (payload.mode !== "openai_concept" || payload.promptVersion !== identity.promptVersion) return null;
  if (typeof telemetry.model !== "string" || !["low", "medium", "high"].includes(String(telemetry.reasoningEffort)) ||
      typeof telemetry.requestId !== "string" || !REQUEST_ID_PATTERN.test(telemetry.requestId) ||
      !integer(telemetry.latencyMs) || !integer(telemetry.attempts, 1) || telemetry.attempts > 2 ||
      !Array.isArray(telemetry.attemptTrace) || telemetry.attemptTrace.length !== telemetry.attempts ||
      !integer(telemetry.inputTokens) || !integer(telemetry.cachedInputTokens) ||
      !integer(telemetry.cacheWriteTokens) || !integer(telemetry.outputTokens) ||
      !integer(telemetry.totalTokens) || !finite(telemetry.estimatedCostUsd) ||
      typeof telemetry.costRateSource !== "string" || telemetry.stored !== false || telemetry.toolCalls !== 0) return null;
  const trace = telemetry.attemptTrace.map((attempt, index) => parseAttempt(attempt, identity, index));
  if (trace.some((attempt) => attempt === null)) return null;
  const attempts = trace as Sprint10AttemptTelemetry[];
  const firstPurpose = attempts[0]!.purpose;
  if ((identity.route === "create" && firstPurpose !== "initial") ||
      (identity.route === "ai" && firstPurpose !== "initial" && firstPurpose !== "focused")) return null;
  if (new Set(attempts.map((attempt) => attempt.requestId)).size !== attempts.length) return null;
  const sums = attempts.reduce((total, attempt) => ({
    input: total.input + attempt.inputTokens,
    cached: total.cached + attempt.cachedInputTokens,
    cacheWrite: total.cacheWrite + attempt.cacheWriteTokens,
    output: total.output + attempt.outputTokens,
    all: total.all + attempt.totalTokens,
    cost: total.cost + attempt.estimatedCostUsd
  }), { input: 0, cached: 0, cacheWrite: 0, output: 0, all: 0, cost: 0 });
  const cost = Number(sums.cost.toFixed(8));
  const rateSource = [...new Set(attempts.map((attempt) => attemptCost(attempt)!.source))].join(" | ");
  const finalAttempt = attempts.at(-1)!;
  const reportedProfile = identity.route === "ai" ? finalAttempt : attempts[0]!;
  if (telemetry.inputTokens !== sums.input || telemetry.cachedInputTokens !== sums.cached ||
      telemetry.cacheWriteTokens !== sums.cacheWrite || telemetry.outputTokens !== sums.output ||
      telemetry.totalTokens !== sums.all || telemetry.totalTokens !== telemetry.inputTokens + telemetry.outputTokens ||
      telemetry.cachedInputTokens + telemetry.cacheWriteTokens > telemetry.inputTokens ||
      telemetry.estimatedCostUsd !== cost || telemetry.costRateSource !== rateSource ||
      telemetry.model !== reportedProfile.model || telemetry.reasoningEffort !== reportedProfile.reasoningEffort ||
      telemetry.requestId !== finalAttempt.requestId) return null;
  return {
    provider: "openai",
    route: identity.route,
    depth: identity.depth,
    promptVersion: identity.promptVersion,
    schemaVersion: identity.schemaVersion,
    model: telemetry.model,
    reasoningEffort: telemetry.reasoningEffort as Sprint10SpendTelemetry["reasoningEffort"],
    requestId: telemetry.requestId,
    latencyMs: telemetry.latencyMs,
    attempts: telemetry.attempts,
    attemptTrace: attempts,
    inputTokens: telemetry.inputTokens,
    cachedInputTokens: telemetry.cachedInputTokens,
    cacheWriteTokens: telemetry.cacheWriteTokens,
    outputTokens: telemetry.outputTokens,
    totalTokens: telemetry.totalTokens,
    estimatedCostUsd: telemetry.estimatedCostUsd,
    costRateSource: telemetry.costRateSource,
    stored: false,
    toolCalls: 0
  };
}

function parseStoredTelemetry(value: unknown, identity: Sprint10RequestIdentity): Sprint10SpendTelemetry | null {
  const keys = ["provider", "route", "depth", "promptVersion", "schemaVersion", "model", "reasoningEffort",
    "requestId", "latencyMs", "attempts", "attemptTrace", "inputTokens", "cachedInputTokens", "cacheWriteTokens",
    "outputTokens", "totalTokens", "estimatedCostUsd", "costRateSource", "stored", "toolCalls"];
  if (!record(value) || !exactKeys(value, keys) || value.provider !== "openai" || value.route !== identity.route ||
      value.depth !== identity.depth || value.promptVersion !== identity.promptVersion ||
      value.schemaVersion !== identity.schemaVersion) return null;
  const payload = identity.route === "ai"
    ? { mode: "openai", schemaVersion: 6, telemetry: value }
    : { mode: "openai_concept", promptVersion: identity.promptVersion, telemetry: value };
  return parseSprint10ProviderTelemetry(identity, payload);
}

export function sprint10LedgerCharge(ledger: Pick<Sprint10SpendLedger, "receipts">): number {
  return Number(ledger.receipts.reduce((sum, receipt) =>
    sum + (receipt.state === "settled" && receipt.estimatedUsd !== null ? receipt.estimatedUsd : receipt.reserveUsd), 0)
    .toFixed(8));
}

export function createSprint10SpendLedger(createdAt: string, ledgerId = randomUUID()): Sprint10SpendLedger {
  if (!validIso(createdAt)) throw new Error("The cycle-root ledger requires an exact ISO creation time.");
  if (!LEDGER_ID_PATTERN.test(ledgerId)) throw new Error("The cycle-root ledger requires a UUIDv4 identity.");
  return {
    schemaVersion: 1,
    cycleId: SPRINT10_CYCLE_ID,
    ledgerId,
    createdAt,
    ceilingUsd: SPRINT10_LIVE_CEILING_USD,
    generation: 0,
    receipts: [],
    estimatedOrReservedUsd: 0
  };
}

function parseReceipt(value: unknown, id: number, ledgerId: string): Sprint10Receipt | null {
  const keys = ["id", "ledgerId", "createdAt", "identity", "reserveUsd", "state", "settledAt", "status",
    "estimatedUsd", "telemetry", "resultHash", "unknownReason"];
  if (!record(value) || !exactKeys(value, keys) || value.id !== id || value.ledgerId !== ledgerId ||
      !validIso(value.createdAt) || !record(value.identity)) return null;
  const identity = parseIdentity(value.identity);
  if (!identity || value.reserveUsd !== RESERVE_USD[identity.route] ||
      !["reserved", "settled", "unknown"].includes(String(value.state)) ||
      !(value.settledAt === null || validIso(value.settledAt)) ||
      !(value.status === null || (integer(value.status, 100) && value.status <= 599)) ||
      !(value.estimatedUsd === null || finite(value.estimatedUsd)) ||
      !(value.resultHash === null || (typeof value.resultHash === "string" && HASH_PATTERN.test(value.resultHash))) ||
      !(value.unknownReason === null || validUnknownReason(value.unknownReason))) return null;
  const state = value.state as Sprint10ReceiptState;
  const telemetry = value.telemetry === null ? null : parseStoredTelemetry(value.telemetry, identity);
  if (value.telemetry !== null && telemetry === null) return null;
  if (state === "reserved" && (value.settledAt !== null || value.status !== null || value.estimatedUsd !== null ||
      value.telemetry !== null || value.resultHash !== null || value.unknownReason !== null)) return null;
  if (state !== "reserved" && (value.settledAt === null || Date.parse(value.settledAt) < Date.parse(value.createdAt))) return null;
  if (state === "settled" && (value.status === null || value.resultHash === null || value.estimatedUsd === null ||
      telemetry === null || value.unknownReason !== null || value.estimatedUsd > value.reserveUsd ||
      value.estimatedUsd !== telemetry.estimatedCostUsd)) return null;
  if (state === "unknown" && (value.estimatedUsd !== null || value.unknownReason === null)) return null;
  return { ...(value as unknown as Sprint10Receipt), identity, telemetry };
}

export function parseSprint10SpendLedger(value: unknown): Sprint10SpendLedger | null {
  const keys = ["schemaVersion", "cycleId", "ledgerId", "createdAt", "ceilingUsd", "generation", "receipts",
    "estimatedOrReservedUsd"];
  if (!record(value) || !exactKeys(value, keys) || value.schemaVersion !== 1 ||
      value.cycleId !== SPRINT10_CYCLE_ID || typeof value.ledgerId !== "string" ||
      !LEDGER_ID_PATTERN.test(value.ledgerId) || !validIso(value.createdAt) ||
      value.ceilingUsd !== SPRINT10_LIVE_CEILING_USD || !integer(value.generation) ||
      !Array.isArray(value.receipts) || value.receipts.length > MAX_RECEIPTS ||
      !finite(value.estimatedOrReservedUsd)) return null;
  const receipts = value.receipts.map((receipt, index) => parseReceipt(receipt, index + 1, value.ledgerId as string));
  if (receipts.some((receipt) => receipt === null)) return null;
  const typedReceipts = receipts as Sprint10Receipt[];
  if (new Set(typedReceipts.map((receipt) => receipt.identity.requestKey)).size !== typedReceipts.length) return null;
  const expectedGeneration = typedReceipts.length + typedReceipts.filter((receipt) => receipt.state !== "reserved").length;
  const ledger = { ...(value as unknown as Sprint10SpendLedger), receipts: typedReceipts };
  const charge = sprint10LedgerCharge(ledger);
  return value.generation === expectedGeneration && value.estimatedOrReservedUsd === charge &&
    charge <= SPRINT10_LIVE_CEILING_USD ? ledger : null;
}

export function reserveSprint10Spend(
  ledgerValue: Sprint10SpendLedger,
  identityValue: Sprint10RequestIdentity,
  createdAt: string
): { ok: true; ledger: Sprint10SpendLedger; receipt: Sprint10Receipt } | { ok: false; reason: string } {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  const identity = parseIdentity(identityValue);
  if (!ledger) return { ok: false, reason: "The cycle-root ledger is malformed or corrupt." };
  if (!identity) return { ok: false, reason: "The immutable request identity is invalid." };
  if (!validIso(createdAt) || Date.parse(createdAt) < Date.parse(ledger.createdAt)) {
    return { ok: false, reason: "The reservation time is invalid or predates the root ledger." };
  }
  if (ledger.receipts.some((receipt) => receipt.state === "unknown")) {
    return { ok: false, reason: "An unknown provider charge blocks every later four-sprint request." };
  }
  if (ledger.receipts.some((receipt) => receipt.identity.requestKey === identity.requestKey)) {
    return { ok: false, reason: "The request identity was already reserved; external reruns require a new requestKey." };
  }
  const reserveUsd = RESERVE_USD[identity.route];
  if (ledger.receipts.length >= MAX_RECEIPTS ||
      Number((sprint10LedgerCharge(ledger) + reserveUsd).toFixed(8)) > ledger.ceilingUsd) {
    return { ok: false, reason: "The shared USD 15 four-sprint ceiling would be exceeded." };
  }
  const receipt: Sprint10Receipt = {
    id: ledger.receipts.length + 1,
    ledgerId: ledger.ledgerId,
    createdAt,
    identity,
    reserveUsd,
    state: "reserved",
    settledAt: null,
    status: null,
    estimatedUsd: null,
    telemetry: null,
    resultHash: null,
    unknownReason: null
  };
  const next: Sprint10SpendLedger = {
    ...ledger,
    generation: ledger.generation + 1,
    receipts: [...ledger.receipts, receipt],
    estimatedOrReservedUsd: 0
  };
  next.estimatedOrReservedUsd = sprint10LedgerCharge(next);
  return { ok: true, ledger: next, receipt };
}

export function settleSprint10Spend(
  ledgerValue: Sprint10SpendLedger,
  receiptId: number,
  expectedIdentityValue: Sprint10RequestIdentity,
  outcome: {
    settledAt: string;
    status: number | null;
    resultHash: string | null;
    telemetry: Sprint10SpendTelemetry | null;
  }
): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  const expectedIdentity = parseIdentity(expectedIdentityValue);
  if (!ledger) throw new Error("The cycle-root ledger is malformed or corrupt.");
  if (!expectedIdentity) throw new Error("The expected receipt identity is invalid.");
  const receipt = ledger.receipts.find((candidate) => candidate.id === receiptId);
  if (!receipt) throw new Error("The settlement receipt does not exist.");
  if (!sameIdentity(receipt.identity, expectedIdentity)) throw new Error("The settlement host/SHA/phase/request identity does not match the reservation.");
  if (receipt.state !== "reserved") throw new Error("Duplicate or late settlement is forbidden.");
  if (!validIso(outcome.settledAt) || Date.parse(outcome.settledAt) < Date.parse(receipt.createdAt)) {
    throw new Error("The settlement time is invalid or predates the reservation.");
  }
  const statusValid = outcome.status !== null && integer(outcome.status, 100) && outcome.status <= 599;
  const hashValid = outcome.resultHash !== null && HASH_PATTERN.test(outcome.resultHash);
  const telemetry = outcome.telemetry === null ? null : parseStoredTelemetry(outcome.telemetry, receipt.identity);
  const telemetryValid = telemetry !== null && telemetry.estimatedCostUsd <= receipt.reserveUsd;
  const settled = statusValid && hashValid && telemetryValid;
  const updated: Sprint10Receipt = {
    ...receipt,
    state: settled ? "settled" : "unknown",
    settledAt: outcome.settledAt,
    status: statusValid ? outcome.status : null,
    estimatedUsd: settled ? telemetry.estimatedCostUsd : null,
    telemetry: telemetryValid ? telemetry : null,
    resultHash: hashValid ? outcome.resultHash : null,
    unknownReason: settled ? null : telemetryValid ? "settlement_evidence_invalid" : "telemetry_missing_or_invalid"
  };
  const next: Sprint10SpendLedger = {
    ...ledger,
    generation: ledger.generation + 1,
    receipts: ledger.receipts.map((candidate) => candidate.id === receiptId ? updated : candidate),
    estimatedOrReservedUsd: 0
  };
  next.estimatedOrReservedUsd = sprint10LedgerCharge(next);
  return next;
}

export function markSprint10SpendUnknown(
  ledgerValue: Sprint10SpendLedger,
  receiptId: number,
  expectedIdentityValue: Sprint10RequestIdentity,
  settledAt: string,
  reason: Exclude<Sprint10UnknownReason, "telemetry_missing_or_invalid" | "settlement_evidence_invalid">
): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  const expectedIdentity = parseIdentity(expectedIdentityValue);
  if (!ledger) throw new Error("The cycle-root ledger is malformed or corrupt.");
  if (!expectedIdentity) throw new Error("The expected receipt identity is invalid.");
  const receipt = ledger.receipts.find((candidate) => candidate.id === receiptId);
  if (!receipt) throw new Error("The unknown-charge receipt does not exist.");
  if (!sameIdentity(receipt.identity, expectedIdentity)) throw new Error("The unknown-charge host/SHA/phase/request identity does not match the reservation.");
  if (receipt.state !== "reserved") throw new Error("Duplicate or late settlement is forbidden.");
  if (!validIso(settledAt) || Date.parse(settledAt) < Date.parse(receipt.createdAt)) {
    throw new Error("The unknown-charge time is invalid or predates the reservation.");
  }
  const updated: Sprint10Receipt = {
    ...receipt,
    state: "unknown",
    settledAt,
    status: null,
    estimatedUsd: null,
    telemetry: null,
    resultHash: null,
    unknownReason: reason
  };
  const next: Sprint10SpendLedger = {
    ...ledger,
    generation: ledger.generation + 1,
    receipts: ledger.receipts.map((candidate) => candidate.id === receiptId ? updated : candidate),
    estimatedOrReservedUsd: 0
  };
  next.estimatedOrReservedUsd = sprint10LedgerCharge(next);
  return next;
}

type ValidatedLedgerPath = { root: string; target: string };

function validatePrivateLedgerPath(privateRoot: string, ledgerPath: string): ValidatedLedgerPath {
  if (!privateRoot || !ledgerPath || !isAbsolute(privateRoot) || !isAbsolute(ledgerPath)) {
    throw new Error("The private ledger root and ledger path must be explicit absolute paths.");
  }
  const root = resolve(privateRoot);
  const target = resolve(ledgerPath);
  if (!existsSync(root) || realpathSync(root) !== root || !statSync(root).isDirectory()) {
    throw new Error("The private ledger root must be an existing real directory, not a symlink.");
  }
  if ((statSync(root).mode & 0o077) !== 0) throw new Error("The private ledger root must deny group/world access (0700).");
  const relation = relative(root, target);
  if (!relation || relation.startsWith(`..${sep}`) || relation === ".." || isAbsolute(relation) || dirname(target) !== root) {
    throw new Error("The ledger path must be a direct child of the explicit private root.");
  }
  if (realpathSync(dirname(target)) !== root) throw new Error("The ledger parent must not resolve through a symlink.");
  return { root, target };
}

function validateExistingPrivateFile(target: string, label: string): void {
  const details = lstatSync(target);
  if (details.isSymbolicLink() || !details.isFile() || details.nlink !== 1 || (details.mode & 0o077) !== 0 ||
      realpathSync(target) !== target) throw new Error(`${label} must be a private 0600 regular non-link file.`);
}

function openExclusivePrivate(path: string): number {
  const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
  return openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | noFollow, 0o600);
}

function syncDirectory(path: string): void {
  const descriptor = openSync(path, constants.O_RDONLY);
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function sleep(milliseconds: number): void {
  Atomics.wait(SLEEP_ARRAY, 0, 0, milliseconds);
}

export function sprint10LedgerLockPath(ledgerPath: string): string {
  const target = resolve(ledgerPath);
  return join(dirname(target), `.${basename(target)}.cycle.lock`);
}

export function acquireSprint10LedgerLock(privateRoot: string, ledgerPath: string): Sprint10LedgerLock {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const lockPath = sprint10LedgerLockPath(target);
  const deadline = Date.now() + LOCK_WAIT_MS;
  let descriptor: number;
  while (true) {
    try {
      descriptor = openExclusivePrivate(lockPath);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || Date.now() >= deadline) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          throw new Error("Another process holds the four-sprint ledger lock; no provider request was authorized.");
        }
        throw error;
      }
      sleep(LOCK_POLL_MS);
    }
  }
  try {
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`, "utf8");
    fsyncSync(descriptor);
    const held = fstatSync(descriptor);
    if (!held.isFile() || held.nlink !== 1 || (held.mode & 0o077) !== 0 || realpathSync(root) !== root) {
      throw new Error("The four-sprint ledger lock is not a private regular file.");
    }
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
          throw new Error("The four-sprint ledger lock changed identity; it was not removed automatically.");
        }
        unlinkSync(lockPath);
        syncDirectory(root);
      } finally {
        closeSync(descriptor);
      }
    }
  };
}

function writeLedgerAtomic(privateRoot: string, ledgerPath: string, ledgerValue: Sprint10SpendLedger): void {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger) throw new Error("Refusing to write a malformed four-sprint ledger.");
  if (existsSync(target)) validateExistingPrivateFile(target, "The existing cycle-root ledger");
  const temporary = join(root, `.${basename(target)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
  let descriptor: number | null = null;
  try {
    descriptor = openExclusivePrivate(temporary);
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    if (existsSync(target)) validateExistingPrivateFile(target, "The existing cycle-root ledger");
    renameSync(temporary, target);
    chmodSync(target, 0o600);
    validateExistingPrivateFile(target, "The written cycle-root ledger");
    syncDirectory(root);
  } catch (error) {
    if (descriptor !== null) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

export function readSprint10SpendLedgerFile(privateRoot: string, ledgerPath: string): Sprint10SpendLedger {
  const { target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  if (!existsSync(target)) throw new Error("The explicit cycle-root ledger does not exist.");
  validateExistingPrivateFile(target, "The cycle-root ledger");
  let value: unknown;
  try { value = JSON.parse(readFileSync(target, "utf8")); }
  catch { throw new Error("The cycle-root ledger is not valid JSON; no provider request is authorized."); }
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger) throw new Error("The cycle-root ledger is malformed or corrupt; no provider request is authorized.");
  return ledger;
}

export function createSprint10SpendLedgerFile(
  privateRoot: string,
  ledgerPath: string,
  createdAt: string,
  ledgerId = randomUUID()
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    if (existsSync(target)) throw new Error("The cycle-root ledger already exists; refusing to reset the USD 15 authority.");
    const ledger = createSprint10SpendLedger(createdAt, ledgerId);
    let descriptor: number | null = null;
    try {
      descriptor = openExclusivePrivate(target);
      fchmodSync(descriptor, 0o600);
      writeFileSync(descriptor, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = null;
      validateExistingPrivateFile(target, "The new cycle-root ledger");
      syncDirectory(root);
    } catch (error) {
      if (descriptor !== null) closeSync(descriptor);
      throw error;
    }
    return ledger;
  } finally {
    lock.release();
  }
}

export function reserveSprint10SpendFile(
  privateRoot: string,
  ledgerPath: string,
  identity: Sprint10RequestIdentity,
  createdAt: string
): { ledger: Sprint10SpendLedger; receipt: Sprint10Receipt } {
  const lock = acquireSprint10LedgerLock(privateRoot, ledgerPath);
  try {
    const ledger = readSprint10SpendLedgerFile(privateRoot, ledgerPath);
    const reservation = reserveSprint10Spend(ledger, identity, createdAt);
    if (!reservation.ok) throw new Error(reservation.reason);
    writeLedgerAtomic(privateRoot, ledgerPath, reservation.ledger);
    return { ledger: reservation.ledger, receipt: reservation.receipt };
  } finally {
    lock.release();
  }
}

export function settleSprint10SpendFile(
  privateRoot: string,
  ledgerPath: string,
  receiptId: number,
  expectedIdentity: Sprint10RequestIdentity,
  outcome: Parameters<typeof settleSprint10Spend>[3]
): Sprint10SpendLedger {
  const lock = acquireSprint10LedgerLock(privateRoot, ledgerPath);
  try {
    const ledger = readSprint10SpendLedgerFile(privateRoot, ledgerPath);
    const next = settleSprint10Spend(ledger, receiptId, expectedIdentity, outcome);
    writeLedgerAtomic(privateRoot, ledgerPath, next);
    return next;
  } finally {
    lock.release();
  }
}

export function markSprint10SpendUnknownFile(
  privateRoot: string,
  ledgerPath: string,
  receiptId: number,
  expectedIdentity: Sprint10RequestIdentity,
  settledAt: string,
  reason: Parameters<typeof markSprint10SpendUnknown>[4]
): Sprint10SpendLedger {
  const lock = acquireSprint10LedgerLock(privateRoot, ledgerPath);
  try {
    const ledger = readSprint10SpendLedgerFile(privateRoot, ledgerPath);
    const next = markSprint10SpendUnknown(ledger, receiptId, expectedIdentity, settledAt, reason);
    writeLedgerAtomic(privateRoot, ledgerPath, next);
    return next;
  } finally {
    lock.release();
  }
}
