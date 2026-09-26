import { createHash, randomBytes, randomUUID } from "node:crypto";
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
export const SPRINT10_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V13_2026_09_26" as const;
export const SPRINT10_V12_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V12_2026_09_21" as const;
// Exact immutable read-back compatibility only; never a new dispatch version.
export const SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V10_2026_09_18" as const;
export const SPRINT10_PRE_COMMITMENT_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V11_2026_09_20" as const;
export const SPRINT10_CREATE_PROMPT_VERSION = "POINT_OBJECT_CREATE_PROGRAM_V1_2026_09_04" as const;
type Sprint10StoredPromptVersion = typeof SPRINT10_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_V12_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_PRE_COMMITMENT_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_CREATE_PROMPT_VERSION;

function isHistoricalAnalysisPrompt(value: unknown): boolean {
  return value === SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION || value === SPRINT10_PRE_COMMITMENT_ANALYSIS_PROMPT_VERSION || value === SPRINT10_V12_ANALYSIS_PROMPT_VERSION;
}

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
  promptVersion: Sprint10StoredPromptVersion;
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
  promptVersion: Sprint10StoredPromptVersion;
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

type Sprint10LedgerCommon = {
  cycleId: typeof SPRINT10_CYCLE_ID;
  ledgerId: string;
  createdAt: string;
  ceilingUsd: typeof SPRINT10_LIVE_CEILING_USD;
  generation: number;
  receipts: Sprint10Receipt[];
  estimatedOrReservedUsd: number;
  // Append-only founder-authorized accounting; original unknown receipts stay unchanged.
  conservativeCharges?: (Sprint10ConservativeCharge | Complete26StandingCharge)[];
};

export const COMPLETE25_RECOVERY_APPROVAL = "founder:complete25_20260925_recover_and_repeat_within_usd15" as const;
export const COMPLETE25_EPOCH_ID = "COMPLETE25_2026_09_25" as const;
export const COMPLETE25_OPENING_CHECKPOINT = Object.freeze({
  kind: "geoai.complete25.accounting-loss-checkpoint.v1",
  cycleId: SPRINT10_CYCLE_ID,
  ledgerId: "5aa405b3-bbda-48aa-aeea-ca3357be4042",
  ceilingUsd: 15,
  accountedUsd: 7.3097465,
  generation: 185,
  receiptCount: 90,
  conservativeUnknownChargeCount: 5,
  historicalUnknownActualCostsKnown: false,
  activeReservations: 0,
  unresolvedCharges: 0,
  rawHistoricalReceiptsUnavailable: true,
  historicalAttemptIndexUnavailable: true,
  approvalReference: COMPLETE25_RECOVERY_APPROVAL,
  approvalText: "Да, восстановить учёт и повторить тесты в пределах $15",
  stateSha256: "e088c9a9a95b9c63b5f89aabe8541e52ef105155426798d2582aa4e513a94605",
  handoffSha256: "c9dc5a6e7b80564bd536e12142961bd75d3f86a97d86e9159084c1c71b5a5a65",
  confluencePageId: "26574901",
  confluenceVersion: 32,
  confluenceEnvelopeSha256: "681b9f783511c216f247be75f1f4d65afb2f6f1f03be1ec9e0c41d1ba27e96f4"
});
// Pinned canonical JSON hash; the independently stored checkpoint must match too.
export const COMPLETE25_OPENING_SHA256 = "0a1ddb486bb4a1c99ded5e4e0ec9f5d056d61359158c8837b33f82fa5f8adfbf";
export type Complete25CaseAttempt = {
  caseId: string; manifestSha256: string; startedAt: string; attemptId: string;
};
export type Sprint10SpendLedger = Sprint10LedgerCommon & ({ schemaVersion: 1 } | {
  schemaVersion: 2;
  openingCheckpoint: typeof COMPLETE25_OPENING_CHECKPOINT;
  openingCheckpointSha256: typeof COMPLETE25_OPENING_SHA256;
  acceptanceEpoch: {
    id: typeof COMPLETE25_EPOCH_ID;
    approvalReference: typeof COMPLETE25_RECOVERY_APPROVAL;
    candidateCommit: string;
    candidateHost: string;
    acceptanceRevision: number;
    attempts: Complete25CaseAttempt[];
  };
});

export function sprint10LedgerReceiptCount(ledger: Sprint10SpendLedger): number {
  return (ledger.schemaVersion === 2 ? ledger.openingCheckpoint.receiptCount : 0) + ledger.receipts.length;
}

function complete25CheckpointHash(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" ? createHash("sha256").update(serialized).digest("hex") : "";
  } catch { return ""; }
}

function complete25CaseId(value: unknown): value is string {
  return typeof value === "string" && /^(?:A0[1-8]-[QSD]|A09|A1[0-2]|F0[1-5]|FA(?:0[1-9]|1[0-5])|C-(?:RM|CH|CG|RQ|HR)-0[12])$/.test(value);
}

export type Sprint10ConservativeCharge = {
  receiptId: number;
  receiptHash: string;
  approvedAt: string;
  approvalReference: string;
  chargedUsd: number;
  actualCostKnown: false;
};

// Existing authority, not a new approval or an increase to the cycle ceiling.
// Immutable source: COMPLETE25_STATE.json#overnightAuthority.recordedAtUtc.
export const COMPLETE26_STANDING_AUTHORITY = Object.freeze({
  kind: "geoai.complete26.standing-full-reserve-authority.v1",
  reference: "founder:complete25_20260925_204244_standing_full_reserve",
  recordedAt: "2026-09-25T20:42:44Z",
  source: "COMPLETE25_STATE.json#overnightAuthority",
  ledgerId: COMPLETE25_OPENING_CHECKPOINT.ledgerId,
  ceilingUsd: 15,
  scope: "interrupted-request-full-prior-reservation-after-cause-review-no-blind-retry"
} as const);

export type Complete26StandingApplication = {
  receiptHash: string;
  authority: typeof COMPLETE26_STANDING_AUTHORITY;
  appliedBy: "root";
  appliedAt: string;
  causeReviewReference: string;
  causeReviewed: true;
  noKnownCostAboveReserve: true;
};
export type Complete26StandingCharge = Complete26StandingApplication & {
  receiptId: number;
  receiptIdentity: Sprint10RequestIdentity;
  chargedUsd: number;
  actualCostKnown: false;
};

export function sprint10ReceiptHash(receipt: Sprint10Receipt): string {
  return createHash("sha256").update(JSON.stringify(receipt)).digest("hex");
}

export function hasSprint10UnresolvedCharge(ledger: Sprint10SpendLedger, includeReserved = false): boolean {
  return ledger.receipts.some(receipt =>
    (includeReserved && receipt.state === "reserved") ||
    (receipt.state === "unknown" && !ledger.conservativeCharges?.some(charge => charge.receiptId === receipt.id)));
}

export type Sprint10LedgerLock = {
  lockPath: string;
  release: () => void;
};

export const RESERVE_USD: Readonly<Record<Sprint10Route, number>> = { ai: 1.2, create: 0.3 };
const MODEL_PATTERN = /^gpt-5\.6-(luna|terra|sol)(?:-\d{4}-\d{2}-\d{2})?$/;
const HOST_PATTERN = /^geoai-[a-z0-9-]+\.vercel\.app$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const LEDGER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REQUEST_KEY_PATTERN = /^[A-Z0-9][A-Z0-9._:-]{2,95}$/;
const REQUEST_ID_PATTERN = /^[\x21-\x7e]{1,200}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
// Bounded journal capacity for the expanded, founder-approved acceptance matrix.
// This is not a spending allowance: every reserve still shares the USD 15 cap.
// NIGHT21 continues the same immutable USD15 ledger; this is journal capacity,
// not money, retry permission, a fresh cycle or permission to discard history.
export const SPRINT10_MAX_RECEIPTS = 160;
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

function parseIdentity(value: unknown, allowHistorical = false): Sprint10RequestIdentity | null {
  const keys = ["requestKey", "phase", "candidateHost", "candidateCommit", "route", "depth", "promptVersion", "schemaVersion"];
  if (!record(value) || !exactKeys(value, keys) || typeof value.requestKey !== "string" ||
      !REQUEST_KEY_PATTERN.test(value.requestKey) || !validPhase(value.phase) ||
      typeof value.candidateHost !== "string" || !safeCandidateHost(value.candidateHost) ||
      typeof value.candidateCommit !== "string" || !COMMIT_PATTERN.test(value.candidateCommit) ||
      !validRoute(value.route) || !validDepth(value.depth)) return null;
  const expectedPrompt = value.route === "ai" ? SPRINT10_ANALYSIS_PROMPT_VERSION : SPRINT10_CREATE_PROMPT_VERSION;
  const expectedSchema = value.route === "ai" ? 6 : null;
  const acceptedHistorical = allowHistorical && value.route === "ai" && isHistoricalAnalysisPrompt(value.promptVersion);
  if ((value.promptVersion !== expectedPrompt && !acceptedHistorical) || value.schemaVersion !== expectedSchema) return null;
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
  payload: unknown,
  responseStatus?: number
): Sprint10SpendTelemetry | null {
  return parseProviderTelemetry(identityValue, payload, false, responseStatus);
}

// Only immutable stored telemetry may opt into the exact historical identity.
function parseProviderTelemetry(
  identityValue: Sprint10RequestIdentity,
  payload: unknown,
  allowHistorical: boolean,
  responseStatus?: number
): Sprint10SpendTelemetry | null {
  const identity = parseIdentity(identityValue, allowHistorical);
  if (!identity || !record(payload) || !record(payload.telemetry)) return null;
  const telemetry = payload.telemetry;
  if (identity.route === "ai") {
    // Cost accounting only: a failed output still consumed the complete traced
    // usage. Do not extend result acceptance, Create errors or historical dispatch.
    const accountedOutputError = !allowHistorical && responseStatus === 502 &&
      exactKeys(payload, ["mode", "code", "error", "retryable", "telemetry"]) &&
      payload.mode === "unavailable" && payload.code === "AI_OUTPUT_INVALID" && payload.retryable === true &&
      typeof payload.error === "string" && payload.error.length > 0 && payload.error.length <= 1024;
    if ((!accountedOutputError && (payload.mode !== "openai" || payload.schemaVersion !== 6)) || telemetry.provider !== "openai" ||
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
  return parseProviderTelemetry(identity, payload, true);
}

export function sprint10LedgerCharge(ledger: Pick<Sprint10SpendLedger, "receipts"> & Partial<Pick<Sprint10SpendLedger, "schemaVersion">> & { openingCheckpoint?: typeof COMPLETE25_OPENING_CHECKPOINT }): number {
  return Number(ledger.receipts.reduce((sum, receipt) =>
    sum + (receipt.state === "settled" && receipt.estimatedUsd !== null ? receipt.estimatedUsd : receipt.reserveUsd),
    ledger.schemaVersion === 2 ? ledger.openingCheckpoint?.accountedUsd ?? Number.NaN : 0)
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

export function createComplete25RecoveryLedger(
  checkpoint: unknown, createdAt: string,
  candidate: { candidateCommit: string; candidateHost: string }, approvalReference: string
): Sprint10SpendLedger {
  if (complete25CheckpointHash(checkpoint) !== COMPLETE25_OPENING_SHA256 || approvalReference !== COMPLETE25_RECOVERY_APPROVAL) {
    throw new Error("The exact founder-approved loss-recovery checkpoint is required; no spend reset is permitted.");
  }
  const ledger: Sprint10SpendLedger = {
    schemaVersion: 2, cycleId: SPRINT10_CYCLE_ID, ledgerId: COMPLETE25_OPENING_CHECKPOINT.ledgerId,
    createdAt, ceilingUsd: SPRINT10_LIVE_CEILING_USD,
    openingCheckpoint: structuredClone(COMPLETE25_OPENING_CHECKPOINT), openingCheckpointSha256: COMPLETE25_OPENING_SHA256,
    generation: COMPLETE25_OPENING_CHECKPOINT.generation, receipts: [],
    estimatedOrReservedUsd: COMPLETE25_OPENING_CHECKPOINT.accountedUsd,
    acceptanceEpoch: { id: COMPLETE25_EPOCH_ID, approvalReference: COMPLETE25_RECOVERY_APPROVAL,
      ...candidate, acceptanceRevision: 0, attempts: [] }
  };
  if (!parseSprint10SpendLedger(ledger)) throw new Error("Invalid COMPLETE25 recovery identity, timestamp or frozen candidate.");
  return ledger;
}

export function recordComplete25CaseAttempt(
  ledgerValue: Sprint10SpendLedger, caseId: string, manifestSha256: string, startedAt: string,
  candidate: { candidateCommit: string; candidateHost: string }, attemptId = randomUUID()
): { ledger: Sprint10SpendLedger; attempt: Complete25CaseAttempt } {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger || ledger.schemaVersion !== 2 || hasSprint10UnresolvedCharge(ledger, true) ||
      candidate.candidateCommit !== ledger.acceptanceEpoch.candidateCommit || candidate.candidateHost !== ledger.acceptanceEpoch.candidateHost ||
      ledger.acceptanceEpoch.attempts.some(item => item.caseId === caseId)) {
    throw new Error("COMPLETE25 case was already attempted, candidate changed or the ledger is unresolved; no automatic retry.");
  }
  const attempt = { caseId, manifestSha256, startedAt, attemptId };
  const next: Sprint10SpendLedger = { ...ledger, acceptanceEpoch: { ...ledger.acceptanceEpoch,
    acceptanceRevision: ledger.acceptanceEpoch.acceptanceRevision + 1,
    attempts: [...ledger.acceptanceEpoch.attempts, attempt] } };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid COMPLETE25 case-attempt identity.");
  return { ledger: next, attempt };
}

function parseReceipt(value: unknown, id: number, ledgerId: string): Sprint10Receipt | null {
  const keys = ["id", "ledgerId", "createdAt", "identity", "reserveUsd", "state", "settledAt", "status",
    "estimatedUsd", "telemetry", "resultHash", "unknownReason"];
  if (!record(value) || !exactKeys(value, keys) || value.id !== id || value.ledgerId !== ledgerId ||
      !validIso(value.createdAt) || !record(value.identity)) return null;
  const identity = parseIdentity(value.identity, true);
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
  if (!record(value)) return null;
  const recovery = value.schemaVersion === 2;
  const allowedKeys = recovery ? [...keys, "openingCheckpoint", "openingCheckpointSha256", "acceptanceEpoch"] : keys;
  if (!exactKeys(value, "conservativeCharges" in value ? [...allowedKeys, "conservativeCharges"] : allowedKeys) ||
      (value.schemaVersion !== 1 && !recovery) ||
      value.cycleId !== SPRINT10_CYCLE_ID || typeof value.ledgerId !== "string" ||
      !LEDGER_ID_PATTERN.test(value.ledgerId) || !validIso(value.createdAt) ||
      value.ceilingUsd !== SPRINT10_LIVE_CEILING_USD || !integer(value.generation) ||
      !Array.isArray(value.receipts) || value.receipts.length > SPRINT10_MAX_RECEIPTS ||
      !finite(value.estimatedOrReservedUsd)) return null;
  if (recovery) {
    if (complete25CheckpointHash(value.openingCheckpoint) !== COMPLETE25_OPENING_SHA256 ||
        value.openingCheckpointSha256 !== COMPLETE25_OPENING_SHA256 || value.ledgerId !== COMPLETE25_OPENING_CHECKPOINT.ledgerId ||
        !record(value.acceptanceEpoch)) return null;
    const epoch = value.acceptanceEpoch;
    if (!exactKeys(epoch, ["id", "approvalReference", "candidateCommit", "candidateHost", "acceptanceRevision", "attempts"]) ||
        epoch.id !== COMPLETE25_EPOCH_ID || epoch.approvalReference !== COMPLETE25_RECOVERY_APPROVAL ||
        typeof epoch.candidateCommit !== "string" || !COMMIT_PATTERN.test(epoch.candidateCommit) ||
        typeof epoch.candidateHost !== "string" || !safeCandidateHost(epoch.candidateHost) ||
        !Array.isArray(epoch.attempts) || epoch.attempts.length > 58 || epoch.acceptanceRevision !== epoch.attempts.length) return null;
    const seenCases = new Set<string>();
    const seenAttempts = new Set<string>();
    for (const attempt of epoch.attempts) {
      if (!record(attempt) || !exactKeys(attempt, ["caseId", "manifestSha256", "startedAt", "attemptId"]) ||
          !complete25CaseId(attempt.caseId) || seenCases.has(attempt.caseId) ||
          typeof attempt.manifestSha256 !== "string" || !HASH_PATTERN.test(attempt.manifestSha256) ||
          !validIso(attempt.startedAt) || Date.parse(attempt.startedAt) < Date.parse(value.createdAt) ||
          typeof attempt.attemptId !== "string" || !LEDGER_ID_PATTERN.test(attempt.attemptId) || seenAttempts.has(attempt.attemptId)) return null;
      seenCases.add(attempt.caseId); seenAttempts.add(attempt.attemptId);
    }
  }
  const openingCount = recovery ? COMPLETE25_OPENING_CHECKPOINT.receiptCount : 0;
  if (openingCount + value.receipts.length > SPRINT10_MAX_RECEIPTS) return null;
  const receipts = value.receipts.map((receipt, index) => parseReceipt(receipt, openingCount + index + 1, value.ledgerId as string));
  if (receipts.some((receipt) => receipt === null)) return null;
  const typedReceipts = receipts as Sprint10Receipt[];
  if (new Set(typedReceipts.map((receipt) => receipt.identity.requestKey)).size !== typedReceipts.length) return null;
  if (recovery) {
    const epoch = value.acceptanceEpoch as Extract<Sprint10SpendLedger, { schemaVersion: 2 }>['acceptanceEpoch'];
    const paidCases = new Set<string>();
    for (const receipt of typedReceipts) {
      if (receipt.identity.candidateCommit !== epoch.candidateCommit || receipt.identity.candidateHost !== epoch.candidateHost ||
          Date.parse(receipt.createdAt) < Date.parse(value.createdAt)) return null;
      if (receipt.identity.requestKey.startsWith("Q20:")) {
        const match = /^Q20:([^:]+):(AI|CREATE):([A-F0-9]{64})$/.exec(receipt.identity.requestKey);
        const attempt = match && epoch.attempts.find(item => item.caseId === match[1] && item.manifestSha256 === match[3].toLowerCase());
        if (!match || !attempt || paidCases.has(match[1]) || match[2].toLowerCase() !== receipt.identity.route ||
            Date.parse(receipt.createdAt) < Date.parse(attempt.startedAt)) return null;
        const expectedRoute = match[1].startsWith("C-") ? "create" : /^F0/.test(match[1]) ? null : "ai";
        const expectedDepth = match[1].endsWith("-Q") ? "quick" : match[1].endsWith("-D") ? "deep" : "standard";
        if (receipt.identity.route !== expectedRoute || receipt.identity.depth !== expectedDepth) return null;
        paidCases.add(match[1]);
      }
    }
  }
  const charges = value.conservativeCharges ?? [];
  if (!Array.isArray(charges) || charges.length > typedReceipts.length) return null;
  const reconciledIds = new Set<number>();
  for (const charge of charges) {
    if (!record(charge) || !integer(charge.receiptId, 1) || reconciledIds.has(charge.receiptId) || charge.actualCostKnown !== false) return null;
    const receipt = typedReceipts.find(item => item.id === charge.receiptId);
    if (!receipt || receipt.state !== "unknown" || receipt.settledAt === null ||
        charge.receiptHash !== sprint10ReceiptHash(receipt) ||
        charge.chargedUsd !== receipt.reserveUsd) return null;
    if ("authority" in charge) {
      const authority = charge.authority;
      if (!exactKeys(charge, ["receiptId", "receiptHash", "receiptIdentity", "chargedUsd", "actualCostKnown", "authority", "appliedBy", "appliedAt", "causeReviewReference", "causeReviewed", "noKnownCostAboveReserve"]) ||
          !record(authority) || !exactKeys(authority, Object.keys(COMPLETE26_STANDING_AUTHORITY)) ||
          !Object.entries(COMPLETE26_STANDING_AUTHORITY).every(([key, expected]) => authority[key] === expected) ||
          !recovery || value.ledgerId !== COMPLETE26_STANDING_AUTHORITY.ledgerId ||
          charge.appliedBy !== "root" || !validIso(charge.appliedAt) ||
          Date.parse(charge.appliedAt) < Math.max(Date.parse(receipt.settledAt), Date.parse(COMPLETE26_STANDING_AUTHORITY.recordedAt)) ||
          Date.parse(receipt.createdAt) < Date.parse(COMPLETE26_STANDING_AUTHORITY.recordedAt) ||
          charge.causeReviewed !== true || charge.noKnownCostAboveReserve !== true ||
          typeof charge.causeReviewReference !== "string" || !/^root:[a-zA-Z0-9:_-]{10,160}$/.test(charge.causeReviewReference)) return null;
      const receiptIdentity = parseIdentity(charge.receiptIdentity, true);
      if (!receiptIdentity || !sameIdentity(receipt.identity, receiptIdentity)) return null;
    } else if (!exactKeys(charge, ["receiptId", "receiptHash", "approvedAt", "approvalReference", "chargedUsd", "actualCostKnown"]) ||
        typeof charge.approvalReference !== "string" || !/^founder:[a-zA-Z0-9:_-]{10,120}$/.test(charge.approvalReference) ||
        (recovery && charge.approvalReference === COMPLETE25_RECOVERY_APPROVAL) || !validIso(charge.approvedAt) ||
        Date.parse(charge.approvedAt) < Date.parse(receipt.settledAt)) return null;
    reconciledIds.add(charge.receiptId);
  }
  const expectedGeneration = (recovery ? COMPLETE25_OPENING_CHECKPOINT.generation : 0) +
    typedReceipts.length + typedReceipts.filter((receipt) => receipt.state !== "reserved").length + charges.length;
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
  if (ledger.schemaVersion === 2 && (identity.candidateCommit !== ledger.acceptanceEpoch.candidateCommit ||
      identity.candidateHost !== ledger.acceptanceEpoch.candidateHost)) {
    return { ok: false, reason: "The COMPLETE25 epoch is bound to one exact candidate; no automatic new epoch or retry." };
  }
  if (ledger.receipts.some((receipt) => receipt.state === "reserved" && receipt.identity.route === "ai" &&
      isHistoricalAnalysisPrompt(receipt.identity.promptVersion))) {
    return { ok: false, reason: "An unresolved historical V10/V11 reservation requires explicit review before new dispatch." };
  }
  if (!validIso(createdAt) || Date.parse(createdAt) < Date.parse(ledger.createdAt)) {
    return { ok: false, reason: "The reservation time is invalid or predates the root ledger." };
  }
  if (hasSprint10UnresolvedCharge(ledger, ledger.schemaVersion === 2)) {
    return { ok: false, reason: "An unknown provider charge blocks every later four-sprint request." };
  }
  if (ledger.receipts.some((receipt) => receipt.identity.requestKey === identity.requestKey)) {
    return { ok: false, reason: "The request identity was already reserved; external reruns require a new requestKey." };
  }
  const reserveUsd = RESERVE_USD[identity.route];
  if (sprint10LedgerReceiptCount(ledger) >= SPRINT10_MAX_RECEIPTS) {
    return { ok: false, reason: "The bounded cycle-root receipt journal is full." };
  }
  if (Number((sprint10LedgerCharge(ledger) + reserveUsd).toFixed(8)) > ledger.ceilingUsd) {
    return { ok: false, reason: "The shared USD 15 four-sprint ceiling would be exceeded." };
  }
  const receipt: Sprint10Receipt = {
    id: sprint10LedgerReceiptCount(ledger) + 1,
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
  if (!parseSprint10SpendLedger(next)) return { ok: false, reason: "The reservation violates the COMPLETE25 case-attempt registry or ledger invariants." };
  return { ok: true, ledger: next, receipt };
}

// Accounting is not measured provider settlement and never changes the original receipt.
// Call only after a new exact founder approval; do not automatically reconcile on errors.
export function accountSprint10UnknownAtFullReserve(
  ledgerValue: Sprint10SpendLedger,
  receiptId: number,
  expectedIdentity: Sprint10RequestIdentity,
  approval: Pick<Sprint10ConservativeCharge, "receiptHash" | "approvedAt" | "approvalReference">
): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger) throw new Error("The cycle-root ledger is malformed or corrupt.");
  const receipt = ledger.receipts.find(item => item.id === receiptId);
  if (!receipt || receipt.state !== "unknown" || !sameIdentity(receipt.identity, expectedIdentity) ||
      ledger.conservativeCharges?.some(charge => charge.receiptId === receiptId)) {
    throw new Error("Conservative accounting requires one exact unreconciled unknown receipt.");
  }
  const next = {
    ...ledger,
    generation: ledger.generation + 1,
    conservativeCharges: [...(ledger.conservativeCharges ?? []), {
      receiptId, ...approval, chargedUsd: receipt.reserveUsd, actualCostKnown: false as const
    }]
  };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid conservative accounting approval or receipt hash.");
  return next;
}

// Explicit root action after cause review. Never called by failure/dispatch paths.
export function accountSprint10UnknownUnderStandingAuthority(
  ledgerValue: Sprint10SpendLedger, receiptId: number, expectedIdentity: Sprint10RequestIdentity,
  application: Complete26StandingApplication
): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger) throw new Error("The cycle-root ledger is malformed or corrupt.");
  const receipt = ledger.receipts.find(item => item.id === receiptId);
  if (!receipt || receipt.state !== "unknown" || !sameIdentity(receipt.identity, expectedIdentity) ||
      ledger.conservativeCharges?.some(charge => charge.receiptId === receiptId)) {
    throw new Error("Standing accounting requires one exact unreconciled unknown receipt.");
  }
  const next = { ...ledger, generation: ledger.generation + 1,
    conservativeCharges: [...(ledger.conservativeCharges ?? []), {
      ...application, receiptId, receiptIdentity: { ...receipt.identity }, chargedUsd: receipt.reserveUsd, actualCostKnown: false as const
    }] };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid standing authority, root application or receipt binding.");
  return next;
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
    if (existsSync(join(root, ".complete25-recovery-initialized.json"))) {
      throw new Error("The COMPLETE25 recovery marker forbids initialization of a fresh zero-spend journal.");
    }
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

// This helper is intentionally not a CLI. Root must bind the final candidate,
// verify all pinned evidence and explicitly initialize the ONE durable journal.
export function createComplete25RecoveryLedgerFile(
  privateRoot: string, ledgerPath: string, createdAt: string,
  candidate: { candidateCommit: string; candidateHost: string }, approvalReference: string,
  evidencePaths: { checkpoint: string; state: string; handoff: string; confluence: string }
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    const marker = join(root, ".complete25-recovery-initialized.json");
    if (existsSync(target) || existsSync(marker)) throw new Error("COMPLETE25 recovery already initialized or interrupted; refusing to reset spend.");
    for (const [path, expected] of [
      [evidencePaths.state, COMPLETE25_OPENING_CHECKPOINT.stateSha256],
      [evidencePaths.handoff, COMPLETE25_OPENING_CHECKPOINT.handoffSha256],
      [evidencePaths.confluence, COMPLETE25_OPENING_CHECKPOINT.confluenceEnvelopeSha256]
    ]) {
      if (createHash("sha256").update(readFileSync(path!)).digest("hex") !== expected) throw new Error("Recovery provenance bytes do not match the pinned prior artifact hash.");
    }
    const ledger = createComplete25RecoveryLedger(JSON.parse(readFileSync(evidencePaths.checkpoint, "utf8")), createdAt, candidate, approvalReference);
    // Keep this exclusive marker even if a later write fails: loss must fail closed.
    const fd = openExclusivePrivate(marker);
    try { writeFileSync(fd, JSON.stringify({ openingCheckpointSha256: COMPLETE25_OPENING_SHA256,
      initializedAt: createdAt, candidate, ledgerPath: target })); fsyncSync(fd); } finally { closeSync(fd); }
    syncDirectory(root);
    writeLedgerAtomic(root, target, ledger);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

export function recordComplete25CaseAttemptFile(
  privateRoot: string, ledgerPath: string, caseId: string, manifestSha256: string, startedAt: string,
  candidate: { candidateCommit: string; candidateHost: string }
): Complete25CaseAttempt {
  const lock = acquireSprint10LedgerLock(privateRoot, ledgerPath);
  try {
    const current = readSprint10SpendLedgerFile(privateRoot, ledgerPath);
    const result = recordComplete25CaseAttempt(current, caseId, manifestSha256, startedAt, candidate);
    writeLedgerAtomic(privateRoot, ledgerPath, result.ledger);
    return result.attempt;
  } finally { lock.release(); }
}

export function accountSprint10UnknownAtFullReserveFile(
  privateRoot: string,
  ledgerPath: string,
  receiptId: number,
  expectedIdentity: Sprint10RequestIdentity,
  approval: Parameters<typeof accountSprint10UnknownAtFullReserve>[3]
): Sprint10SpendLedger {
  const lock = acquireSprint10LedgerLock(privateRoot, ledgerPath);
  try {
    const ledger = readSprint10SpendLedgerFile(privateRoot, ledgerPath);
    const next = accountSprint10UnknownAtFullReserve(ledger, receiptId, expectedIdentity, approval);
    writeLedgerAtomic(privateRoot, ledgerPath, next);
    return next;
  } finally { lock.release(); }
}

export function accountSprint10UnknownUnderStandingAuthorityFile(
  privateRoot: string, ledgerPath: string, receiptId: number, expectedIdentity: Sprint10RequestIdentity,
  application: Complete26StandingApplication
): Sprint10SpendLedger {
  const lock = acquireSprint10LedgerLock(privateRoot, ledgerPath);
  try {
    const ledger = readSprint10SpendLedgerFile(privateRoot, ledgerPath);
    const next = accountSprint10UnknownUnderStandingAuthority(ledger, receiptId, expectedIdentity, application);
    writeLedgerAtomic(privateRoot, ledgerPath, next);
    return next;
  } finally { lock.release(); }
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
