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
export const SPRINT10_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V14_2026_09_26" as const;
export const SPRINT10_V13_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V13_2026_09_26" as const;
export const SPRINT10_V12_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V12_2026_09_21" as const;
// Exact immutable read-back compatibility only; never a new dispatch version.
export const SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V10_2026_09_18" as const;
export const SPRINT10_PRE_COMMITMENT_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V11_2026_09_20" as const;
export const SPRINT10_CREATE_PROMPT_VERSION = "POINT_OBJECT_CREATE_PROGRAM_V1_2026_09_04" as const;
type Sprint10StoredPromptVersion = typeof SPRINT10_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_V13_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_V12_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_PRE_COMMITMENT_ANALYSIS_PROMPT_VERSION | typeof SPRINT10_CREATE_PROMPT_VERSION;

function isHistoricalAnalysisPrompt(value: unknown): boolean {
  return value === SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION || value === SPRINT10_PRE_COMMITMENT_ANALYSIS_PROMPT_VERSION || value === SPRINT10_V12_ANALYSIS_PROMPT_VERSION || value === SPRINT10_V13_ANALYSIS_PROMPT_VERSION;
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
  ceilingUsd: typeof SPRINT10_LIVE_CEILING_USD | typeof COMPLETE26_AMENDED_CEILING_USD;
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
export const COMPLETE26_EPOCH_ID = "COMPLETE26_2026_09_26" as const;
export const COMPLETE26_FINAL_EPOCH_ID = "COMPLETE26_FINAL_REVALIDATION" as const;
export const COMPLETE26_CONTINUATION_EPOCH_ID = "COMPLETE26_REVIEWED_CONTINUATION" as const;
export const COMPLETE26_CANDIDATE642_EPOCH_ID = "COMPLETE26_642_REVALIDATION" as const;
export const COMPLETE26_EMPTY_REPIN_EPOCH_ID = "COMPLETE26_EMPTY_EPOCH_REPIN" as const;
export const COMPLETE26_POST_SINGLEPASS_EPOCH_ID = "COMPLETE26_POST_SINGLEPASS" as const;
export const COMPLETE26_V14_EPOCH_ID = "COMPLETE26_V14_FINAL_REVALIDATION" as const;
export const COMPLETE26_V14_PREDECESSOR_COMMIT = "ebf7c348b7eefba357630b0c54d0b406ec891dd3" as const;
export const COMPLETE26_V14_PREDECESSOR_HOST = "geoai-popboz5n1-geoaidev.vercel.app" as const;
export const COMPLETE26_SINGLEPASS_COMMIT = "7da5b006c20d0762fe858280d557882609e3890d";
export const COMPLETE26_SINGLEPASS_HOST = "geoai-qb5673t5b-geoaidev.vercel.app";
export const COMPLETE26_CANDIDATE642_COMMIT = "642a3858ee2aaa375e750d75a062f37a2c1937c0";
export const COMPLETE26_CANDIDATE642_HOST = "geoai-di2yjdj2r-geoaidev.vercel.app";
export const COMPLETE26_CANDIDATE642_DEPLOYMENT = "dpl_Au5Xs5bktXabMMhwi3Hq7zDt967T";
export const COMPLETE26_AMENDED_CEILING_USD = 20 as const;
export const COMPLETE26_CEILING_AMENDMENT_AUTHORITY = Object.freeze({
  kind: "geoai.complete26.founder-ceiling-amendment.v1",
  reference: "founder:complete26_20260926_1802utc_add_usd5",
  approvedAtMinute: "2026-09-26T18:02Z",
  approvalText: "добавь 5 долларов в лимит",
  previousCeilingUsd: 15,
  additionalUsd: 5,
  currentCeilingUsd: 20
});
export type Complete26CeilingAmendmentContract = {
  schemaVersion: "geoai.complete26.ceiling-amendment.v1";
  rootReference: string; appliedAt: string;
  previousLedgerSha256: string; previousLedgerCanonicalSha256: string;
  previousGeneration: 281; openingReceiptCount: 135; openingAccountedUsd: 10.6824222;
  previousCeilingUsd: 15; currentCeilingUsd: 20;
  authority: typeof COMPLETE26_CEILING_AMENDMENT_AUTHORITY;
};
type Complete25AcceptanceEpoch = {
  id: typeof COMPLETE25_EPOCH_ID | typeof COMPLETE26_EPOCH_ID | typeof COMPLETE26_FINAL_EPOCH_ID | typeof COMPLETE26_CONTINUATION_EPOCH_ID | typeof COMPLETE26_CANDIDATE642_EPOCH_ID | typeof COMPLETE26_EMPTY_REPIN_EPOCH_ID | typeof COMPLETE26_POST_SINGLEPASS_EPOCH_ID | typeof COMPLETE26_V14_EPOCH_ID;
  approvalReference: typeof COMPLETE25_RECOVERY_APPROVAL;
  candidateCommit: string; candidateHost: string; acceptanceRevision: number; attempts: Complete25CaseAttempt[];
};
export type Complete26SuccessorContract = {
  schemaVersion: "geoai.complete26.successor-transition.v1";
  rootReference: string; appliedAt: string;
  previousLedgerSha256: string; previousLedgerCanonicalSha256: string;
  previousGeneration: 192; openingReceiptCount: 93; openingAccountedUsd: 8.6162505;
  previousCandidateCommit: string; previousCandidateHost: string;
  currentCandidateCommit: string; currentCandidateHost: string;
  currentEpochId: typeof COMPLETE26_EPOCH_ID;
  evidence: {
    failedBatchPlanSha256: string; failedBatchResultSha256: string;
    retiredHostedReceiptSha256: string; retiredPersonaCheckpointSha256: string;
    newBatchPlanSha256: string; newPreviewReceiptSha256: string; newCiReceiptSha256: string;
  };
};
export type Complete26FinalSuccessorContract = {
  schemaVersion: "geoai.complete26.final-successor-transition.v1";
  rootReference: string; appliedAt: string;
  previousLedgerSha256: string; previousLedgerCanonicalSha256: string;
  previousGeneration: number; openingReceiptCount: number; openingAccountedUsd: number;
  previousCandidateCommit: string; previousCandidateHost: string;
  currentCandidateCommit: string; currentCandidateHost: string;
  currentEpochId: typeof COMPLETE26_FINAL_EPOCH_ID;
  receiptCeiling: 201;
  terminal: { status: "PASS" | "FAIL"; completedCaseIds: string[]; attemptedCaseIds: string[]; causeReviewSha256: string | null };
  evidence: {
    terminalBatchPlanSha256: string; terminalBatchResultSha256: string;
    retiredHostedReceiptSha256: string; retiredPersonaCheckpointSha256: string;
    newBatchPlanSha256: string; newPreviewReceiptSha256: string; newCiReceiptSha256: string;
  };
};
export type Sprint10SpendLedger = Sprint10LedgerCommon & ({ schemaVersion: 1 } | {
  schemaVersion: 2;
  openingCheckpoint: typeof COMPLETE25_OPENING_CHECKPOINT;
  openingCheckpointSha256: typeof COMPLETE25_OPENING_SHA256;
  acceptanceEpoch: Complete25AcceptanceEpoch;
  archivedAcceptanceEpoch?: {
    epoch: Complete25AcceptanceEpoch;
    transition: Complete26SuccessorContract;
    transitionSha256: string;
  };
  finalTransitionArchive?: {
    epoch: Complete25AcceptanceEpoch;
    transition: Complete26FinalSuccessorContract;
    transitionSha256: string;
  };
  continuationTransitionArchive?: {
    epoch: Complete25AcceptanceEpoch;
    transition: Complete26ContinuationContract;
    transitionSha256: string;
  };
  reviewedBatchSegment?: { contract: Complete26ReviewedBatchSegmentContract; contractSha256: string };
  candidateTransitionArchive?: {
    epoch: Complete25AcceptanceEpoch;
    reviewedBatchSegment: { contract: Complete26ReviewedBatchSegmentContract; contractSha256: string };
    transition: Complete26Candidate642Contract; transitionSha256: string;
  };
  emptyEpochRepinArchive?: { epoch: Complete25AcceptanceEpoch; transition: Complete26EmptyEpochRepinContract; transitionSha256: string };
  postSinglepassArchive?: { epoch: Complete25AcceptanceEpoch; transition: Complete26PostSinglepassContract; transitionSha256: string };
  v14SuccessorArchive?: { epoch: Complete25AcceptanceEpoch; transition: Complete26V14SuccessorContract; transitionSha256: string };
  ceilingAmendment?: { contract: Complete26CeilingAmendmentContract; contractSha256: string };
});

/** A new exact-candidate batch. Old V13 attempts and their costs remain archived. */
export type Complete26V14SuccessorContract = {
  schemaVersion: "geoai.complete26.v14-successor-transition.v1";
  rootReference: string; appliedAt: string;
  previousLedgerSha256: string; previousLedgerCanonicalSha256: string;
  previousGeneration: 342; openingReceiptCount: 164; openingAccountedUsd: 12.0768842;
  previousCandidateCommit: typeof COMPLETE26_V14_PREDECESSOR_COMMIT;
  previousCandidateHost: typeof COMPLETE26_V14_PREDECESSOR_HOST;
  currentCandidateCommit: string; currentCandidateHost: string; currentDeploymentId: string;
  currentEpochId: typeof COMPLETE26_V14_EPOCH_ID; receiptCeiling: 219;
  terminal: {
    status: "FAIL"; completedCaseIds: string[]; attemptedCaseIds: string[];
    stoppedCaseId: "A10"; stoppedStatus: 502; fullyRetired: true;
    causeReviewSha256: string;
  };
  evidence: {
    terminalBatchPlanSha256: string; terminalBatchResultSha256: string;
    retiredHostedReceiptSha256: string; retiredPersonaCheckpointSha256: string;
    stoppedChildReceiptSha256: string; newBatchPlanSha256: string;
    newPreviewReceiptSha256: string; newCiReceiptSha256: string;
    newAuthReceiptSha256: string;
  };
};

export type Complete26EmptyEpochRepinContract = Omit<Complete26Candidate642Contract, "schemaVersion" | "previousGeneration" | "currentEpochId" | "terminal"> & {
  schemaVersion: "geoai.complete26.empty-epoch-repin.v1"; previousGeneration: 281 | 282;
  currentEpochId: typeof COMPLETE26_EMPTY_REPIN_EPOCH_ID;
  terminal: { status: "FAIL"; completedCaseIds: []; attemptedCaseIds: []; stoppedCaseId: "A01-Q";
    failureStage: "acquisition_auth_login"; loginStage: "submit_redirect"; paidDispatchStarted: false;
    sourceDispatchStarted: false; fullyRetired: true; causeReviewSha256: string };
};

export type Complete26PostSinglepassContract = Omit<Complete26EmptyEpochRepinContract, "schemaVersion" | "previousGeneration" | "openingReceiptCount" | "openingAccountedUsd" | "currentEpochId" | "terminal" | "evidence"> & {
  schemaVersion: "geoai.complete26.post-singlepass-transition.v1"; previousGeneration: 289;
  openingReceiptCount: 138; openingAccountedUsd: 10.8480797;
  currentEpochId: typeof COMPLETE26_POST_SINGLEPASS_EPOCH_ID;
  terminal: { status: "FAIL"; completedCaseIds: ["A01-Q", "A01-D", "A01-S"];
    attemptedCaseIds: ["A01-Q", "A01-D", "A01-S"]; stoppedCaseId: "A02-Q";
    primaryStage: "auth_login"; loginStage: "submit_redirect"; errorClass: "timeout";
    stoppedChildPaidDispatchStarted: false; stoppedChildSourceDispatchStarted: false;
    fullyRetired: true; causeReviewSha256: string };
  evidence: { terminalBatchPlanSha256: string; terminalBatchResultSha256: string;
    retiredHostedReceiptSha256: string; retiredPersonaCheckpointSha256: string;
    stoppedChildReceiptSha256: string; newBatchPlanSha256: string;
    newPreviewReceiptSha256: string; newCiReceiptSha256: string; newAuthReceiptSha256: string };
};

function validPostSinglepassContract(c: unknown): c is Complete26PostSinglepassContract {
  if (!record(c) || !exactKeys(c, ["schemaVersion", "rootReference", "appliedAt", "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration", "openingReceiptCount", "openingAccountedUsd", "previousCandidateCommit", "previousCandidateHost", "currentCandidateCommit", "currentCandidateHost", "currentDeploymentId", "currentEpochId", "receiptCeiling", "terminal", "evidence"]) ||
      c.schemaVersion !== "geoai.complete26.post-singlepass-transition.v1" || c.previousGeneration !== 289 || c.openingReceiptCount !== 138 || c.openingAccountedUsd !== 10.8480797 || c.receiptCeiling !== 201 || c.currentEpochId !== COMPLETE26_POST_SINGLEPASS_EPOCH_ID ||
      c.previousCandidateCommit !== COMPLETE26_SINGLEPASS_COMMIT || c.previousCandidateHost !== COMPLETE26_SINGLEPASS_HOST ||
      typeof c.currentCandidateCommit !== "string" || !COMMIT_PATTERN.test(c.currentCandidateCommit) || /^0+$/.test(c.currentCandidateCommit) || c.currentCandidateCommit === c.previousCandidateCommit || c.currentCandidateCommit === COMPLETE26_CANDIDATE642_COMMIT ||
      typeof c.currentCandidateHost !== "string" || !safeCandidateHost(c.currentCandidateHost) || c.currentCandidateHost === c.previousCandidateHost || c.currentCandidateHost === COMPLETE26_CANDIDATE642_HOST ||
      typeof c.currentDeploymentId !== "string" || !/^dpl_[A-Za-z0-9]{8,80}$/.test(c.currentDeploymentId) ||
      typeof c.rootReference !== "string" || !/^root:[A-Za-z0-9:_-]{10,160}$/.test(c.rootReference) || !validIso(c.appliedAt) ||
      ![c.previousLedgerSha256, c.previousLedgerCanonicalSha256].every(h => typeof h === "string" && HASH_PATTERN.test(h) && !/^0+$/.test(h)) ||
      !record(c.terminal) || !exactKeys(c.terminal, ["status", "completedCaseIds", "attemptedCaseIds", "stoppedCaseId", "primaryStage", "loginStage", "errorClass", "stoppedChildPaidDispatchStarted", "stoppedChildSourceDispatchStarted", "fullyRetired", "causeReviewSha256"]) ||
      c.terminal.status !== "FAIL" || JSON.stringify(c.terminal.completedCaseIds) !== '["A01-Q","A01-D","A01-S"]' || JSON.stringify(c.terminal.attemptedCaseIds) !== '["A01-Q","A01-D","A01-S"]' ||
      c.terminal.stoppedCaseId !== "A02-Q" || c.terminal.primaryStage !== "auth_login" || c.terminal.loginStage !== "submit_redirect" || c.terminal.errorClass !== "timeout" || c.terminal.stoppedChildPaidDispatchStarted !== false || c.terminal.stoppedChildSourceDispatchStarted !== false || c.terminal.fullyRetired !== true ||
      typeof c.terminal.causeReviewSha256 !== "string" || !HASH_PATTERN.test(c.terminal.causeReviewSha256) || /^0+$/.test(c.terminal.causeReviewSha256) ||
      !record(c.evidence) || !exactKeys(c.evidence, ["terminalBatchPlanSha256", "terminalBatchResultSha256", "retiredHostedReceiptSha256", "retiredPersonaCheckpointSha256", "stoppedChildReceiptSha256", "newBatchPlanSha256", "newPreviewReceiptSha256", "newCiReceiptSha256", "newAuthReceiptSha256"])) return false;
  return Object.values(c.evidence).every(h => typeof h === "string" && HASH_PATTERN.test(h) && !/^0+$/.test(h)) && c.evidence.newBatchPlanSha256 !== c.evidence.terminalBatchPlanSha256;
}

function validPostSinglepassPredecessor(l: Sprint10SpendLedger, c: Complete26PostSinglepassContract): boolean {
  if (l.schemaVersion !== 2 || !l.emptyEpochRepinArchive || !l.ceilingAmendment || l.postSinglepassArchive || l.generation !== 289 || l.ceilingUsd !== 20 ||
      l.generation !== c.previousGeneration || sprint10LedgerReceiptCount(l) !== 138 || l.estimatedOrReservedUsd !== c.openingAccountedUsd ||
      l.acceptanceEpoch.id !== COMPLETE26_EMPTY_REPIN_EPOCH_ID || l.acceptanceEpoch.candidateCommit !== c.previousCandidateCommit || l.acceptanceEpoch.candidateHost !== c.previousCandidateHost ||
      l.acceptanceEpoch.acceptanceRevision !== 3 || JSON.stringify(l.acceptanceEpoch.attempts.map(a => a.caseId)) !== '["A01-Q","A01-D","A01-S"]' ||
      l.receipts.length !== 48 || complete25CheckpointHash(l) !== c.previousLedgerCanonicalSha256 || hasSprint10UnresolvedCharge(l, true) ||
      l.receipts.find(r => r.id === 93)?.state !== "unknown" || l.conservativeCharges?.some(ch => ch.receiptId > 135) ||
      l.receipts.some(r => r.identity.candidateCommit === c.currentCandidateCommit || r.identity.candidateHost === c.currentCandidateHost)) return false;
  const recent = l.receipts.slice(-3);
  if (recent.some((r, i) => r.id !== 136 + i || r.state !== "settled" || r.status !== 200 ||
      r.identity.candidateCommit !== c.previousCandidateCommit || r.identity.candidateHost !== c.previousCandidateHost ||
      !r.identity.requestKey.startsWith(`Q20:${c.terminal.completedCaseIds[i]}:AI:`))) return false;
  const lastChange = Math.max(Date.parse(l.emptyEpochRepinArchive.transition.appliedAt), ...l.acceptanceEpoch.attempts.map(a => Date.parse(a.startedAt)), ...recent.map(r => Date.parse(r.settledAt ?? r.createdAt)));
  return Date.parse(c.appliedAt) >= lastChange;
}

/** Pure one-shot archival transition; evidence contents and freshness are a separate root gate. */
export function startComplete26PostSinglepassEpoch(value: Sprint10SpendLedger, contract: Complete26PostSinglepassContract): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !validPostSinglepassContract(contract) || !validPostSinglepassPredecessor(ledger, contract)) throw new Error("Post-singlepass transition requires exact settled 289/138 predecessor and reviewed future tuple.");
  const next: Sprint10SpendLedger = { ...structuredClone(ledger), generation: 290,
    postSinglepassArchive: { epoch: structuredClone(ledger.acceptanceEpoch), transition: structuredClone(contract), transitionSha256: complete25CheckpointHash(contract) },
    acceptanceEpoch: { id: COMPLETE26_POST_SINGLEPASS_EPOCH_ID, approvalReference: COMPLETE25_RECOVERY_APPROVAL, candidateCommit: contract.currentCandidateCommit, candidateHost: contract.currentCandidateHost, acceptanceRevision: 0, attempts: [] } };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid post-singlepass archive.");
  return next;
}

export function complete26PostSinglepassOpening(value: unknown) {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !ledger.postSinglepassArchive) return null;
  return { ...ledger.postSinglepassArchive.transition, transitionSha256: ledger.postSinglepassArchive.transitionSha256 };
}

const COMPLETE26_V14_PREDECESSOR_COMPLETED = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) =>
    ["Q", "D", "S"].map(depth => `A${String(index + 1).padStart(2, "0")}-${depth}`)).flat(),
  "A09"
]);

function validComplete26V14SuccessorContract(value: unknown): value is Complete26V14SuccessorContract {
  if (!record(value) || !exactKeys(value, ["schemaVersion", "rootReference", "appliedAt",
    "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration",
    "openingReceiptCount", "openingAccountedUsd", "previousCandidateCommit",
    "previousCandidateHost", "currentCandidateCommit", "currentCandidateHost",
    "currentDeploymentId", "currentEpochId", "receiptCeiling", "terminal", "evidence"]) ||
      value.schemaVersion !== "geoai.complete26.v14-successor-transition.v1" ||
      value.previousGeneration !== 342 || value.openingReceiptCount !== 164 ||
      value.openingAccountedUsd !== 12.0768842 || value.receiptCeiling !== 219 ||
      value.previousCandidateCommit !== COMPLETE26_V14_PREDECESSOR_COMMIT ||
      value.previousCandidateHost !== COMPLETE26_V14_PREDECESSOR_HOST ||
      value.currentEpochId !== COMPLETE26_V14_EPOCH_ID ||
      typeof value.rootReference !== "string" || !/^root:[A-Za-z0-9:_-]{10,160}$/.test(value.rootReference) ||
      !validIso(value.appliedAt) ||
      typeof value.currentCandidateCommit !== "string" || !COMMIT_PATTERN.test(value.currentCandidateCommit) ||
      /^0+$/.test(value.currentCandidateCommit) || value.currentCandidateCommit === COMPLETE26_V14_PREDECESSOR_COMMIT ||
      typeof value.currentCandidateHost !== "string" || !safeCandidateHost(value.currentCandidateHost) ||
      value.currentCandidateHost === COMPLETE26_V14_PREDECESSOR_HOST ||
      typeof value.currentDeploymentId !== "string" || !/^dpl_[A-Za-z0-9]{8,80}$/.test(value.currentDeploymentId) ||
      ![value.previousLedgerSha256, value.previousLedgerCanonicalSha256].every(
        hash => typeof hash === "string" && HASH_PATTERN.test(hash) && !/^0+$/.test(hash)) ||
      !record(value.terminal) || !exactKeys(value.terminal,
        ["status", "completedCaseIds", "attemptedCaseIds", "stoppedCaseId",
          "stoppedStatus", "fullyRetired", "causeReviewSha256"]) ||
      value.terminal.status !== "FAIL" || value.terminal.stoppedCaseId !== "A10" ||
      value.terminal.stoppedStatus !== 502 || value.terminal.fullyRetired !== true ||
      JSON.stringify(value.terminal.completedCaseIds) !== JSON.stringify(COMPLETE26_V14_PREDECESSOR_COMPLETED) ||
      JSON.stringify(value.terminal.attemptedCaseIds) !== JSON.stringify([...COMPLETE26_V14_PREDECESSOR_COMPLETED, "A10"]) ||
      typeof value.terminal.causeReviewSha256 !== "string" ||
      !HASH_PATTERN.test(value.terminal.causeReviewSha256) || /^0+$/.test(value.terminal.causeReviewSha256) ||
      !record(value.evidence) || !exactKeys(value.evidence,
        ["terminalBatchPlanSha256", "terminalBatchResultSha256", "retiredHostedReceiptSha256",
          "retiredPersonaCheckpointSha256", "stoppedChildReceiptSha256", "newBatchPlanSha256",
          "newPreviewReceiptSha256", "newCiReceiptSha256", "newAuthReceiptSha256"])) return false;
  return Object.values(value.evidence).every(hash =>
    typeof hash === "string" && HASH_PATTERN.test(hash) && !/^0+$/.test(hash)) &&
    value.evidence.newBatchPlanSha256 !== value.evidence.terminalBatchPlanSha256;
}

function validComplete26V14Predecessor(
  ledger: Sprint10SpendLedger, contract: Complete26V14SuccessorContract
): boolean {
  if (ledger.schemaVersion !== 2 || !ledger.postSinglepassArchive || ledger.v14SuccessorArchive ||
      ledger.generation !== 342 || sprint10LedgerReceiptCount(ledger) !== 164 ||
      ledger.estimatedOrReservedUsd !== 12.0768842 || ledger.ceilingUsd !== 20 ||
      ledger.acceptanceEpoch.id !== COMPLETE26_POST_SINGLEPASS_EPOCH_ID ||
      ledger.acceptanceEpoch.candidateCommit !== COMPLETE26_V14_PREDECESSOR_COMMIT ||
      ledger.acceptanceEpoch.candidateHost !== COMPLETE26_V14_PREDECESSOR_HOST ||
      ledger.postSinglepassArchive.transition.currentCandidateCommit !== COMPLETE26_V14_PREDECESSOR_COMMIT ||
      ledger.postSinglepassArchive.transition.currentCandidateHost !== COMPLETE26_V14_PREDECESSOR_HOST ||
      ledger.acceptanceEpoch.acceptanceRevision !== 26 ||
      JSON.stringify(ledger.acceptanceEpoch.attempts.map(attempt => attempt.caseId)) !==
        JSON.stringify(contract.terminal.attemptedCaseIds) ||
      complete25CheckpointHash(ledger) !== contract.previousLedgerCanonicalSha256 ||
      hasSprint10UnresolvedCharge(ledger, true) ||
      ledger.receipts.find(receipt => receipt.id === 93)?.state !== "unknown" ||
      ledger.receipts.some(receipt =>
        receipt.identity.candidateCommit === contract.currentCandidateCommit ||
        receipt.identity.candidateHost === contract.currentCandidateHost)) return false;
  const recent = ledger.receipts.filter(receipt => receipt.id > 138);
  if (recent.length !== 26 || recent.some((receipt, index) =>
    receipt.id !== 139 + index || receipt.state !== "settled" ||
    receipt.status !== (index === 25 ? 502 : 200) ||
    receipt.identity.candidateCommit !== COMPLETE26_V14_PREDECESSOR_COMMIT ||
    receipt.identity.candidateHost !== COMPLETE26_V14_PREDECESSOR_HOST ||
    receipt.identity.promptVersion !== SPRINT10_V13_ANALYSIS_PROMPT_VERSION ||
    receipt.identity.route !== "ai" ||
    !receipt.identity.requestKey.startsWith(`Q20:${contract.terminal.attemptedCaseIds[index]}:AI:`))) return false;
  if (recent.at(-1)?.estimatedUsd !== 0.0849996 ||
      recent.at(-1)?.telemetry?.estimatedCostUsd !== 0.0849996 ||
      recent.at(-1)?.telemetry?.attempts !== 2) return false;
  const lastChange = Math.max(
    Date.parse(ledger.postSinglepassArchive.transition.appliedAt),
    ...ledger.acceptanceEpoch.attempts.map(attempt => Date.parse(attempt.startedAt)),
    ...recent.map(receipt => Date.parse(receipt.settledAt ?? receipt.createdAt)),
    ...(ledger.conservativeCharges ?? []).map(charge =>
      Date.parse("appliedAt" in charge ? charge.appliedAt : charge.approvedAt))
  );
  return Date.parse(contract.appliedAt) >= lastChange;
}

/** Pure, fail-closed archival transition. Actual proof contents are a separate Root gate. */
export function startComplete26V14SuccessorEpoch(
  value: Sprint10SpendLedger, contract: Complete26V14SuccessorContract
): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !validComplete26V14SuccessorContract(contract) ||
      !validComplete26V14Predecessor(ledger, contract)) {
    throw new Error("V14 successor requires exact terminal A10/164 history and reviewed final tuple.");
  }
  const next: Sprint10SpendLedger = {
    ...structuredClone(ledger), generation: ledger.generation + 1,
    v14SuccessorArchive: {
      epoch: structuredClone(ledger.acceptanceEpoch),
      transition: structuredClone(contract),
      transitionSha256: complete25CheckpointHash(contract)
    },
    acceptanceEpoch: {
      id: COMPLETE26_V14_EPOCH_ID, approvalReference: COMPLETE25_RECOVERY_APPROVAL,
      candidateCommit: contract.currentCandidateCommit,
      candidateHost: contract.currentCandidateHost, acceptanceRevision: 0, attempts: []
    }
  };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid V14 successor archive.");
  return next;
}

export function complete26V14SuccessorOpening(value: unknown) {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !ledger.v14SuccessorArchive) return null;
  return {
    ...ledger.v14SuccessorArchive.transition,
    transitionSha256: ledger.v14SuccessorArchive.transitionSha256
  };
}

function validEmptyEpochRepinContract(c: unknown): c is Complete26EmptyEpochRepinContract {
  if (!record(c) || !exactKeys(c, ["schemaVersion", "rootReference", "appliedAt", "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration", "openingReceiptCount", "openingAccountedUsd", "previousCandidateCommit", "previousCandidateHost", "currentCandidateCommit", "currentCandidateHost", "currentDeploymentId", "currentEpochId", "receiptCeiling", "terminal", "evidence"]) ||
      c.schemaVersion !== "geoai.complete26.empty-epoch-repin.v1" || ![281, 282].includes(c.previousGeneration as number) || c.openingReceiptCount !== 135 || c.openingAccountedUsd !== 10.6824222 || c.receiptCeiling !== 201 || c.currentEpochId !== COMPLETE26_EMPTY_REPIN_EPOCH_ID ||
      c.previousCandidateCommit !== COMPLETE26_CANDIDATE642_COMMIT || c.previousCandidateHost !== COMPLETE26_CANDIDATE642_HOST ||
      typeof c.currentCandidateCommit !== "string" || !COMMIT_PATTERN.test(c.currentCandidateCommit) || /^0+$/.test(c.currentCandidateCommit) || c.currentCandidateCommit === c.previousCandidateCommit ||
      typeof c.currentCandidateHost !== "string" || !safeCandidateHost(c.currentCandidateHost) || c.currentCandidateHost === c.previousCandidateHost ||
      typeof c.currentDeploymentId !== "string" || !/^dpl_[A-Za-z0-9]{8,80}$/.test(c.currentDeploymentId) || c.currentDeploymentId === COMPLETE26_CANDIDATE642_DEPLOYMENT ||
      typeof c.rootReference !== "string" || !/^root:[A-Za-z0-9:_-]{10,160}$/.test(c.rootReference) || !validIso(c.appliedAt) ||
      ![c.previousLedgerSha256, c.previousLedgerCanonicalSha256].every(h => typeof h === "string" && HASH_PATTERN.test(h) && !/^0+$/.test(h)) ||
      !record(c.terminal) || !exactKeys(c.terminal, ["status", "completedCaseIds", "attemptedCaseIds", "stoppedCaseId", "failureStage", "loginStage", "paidDispatchStarted", "sourceDispatchStarted", "fullyRetired", "causeReviewSha256"]) ||
      c.terminal.status !== "FAIL" || JSON.stringify(c.terminal.completedCaseIds) !== "[]" || JSON.stringify(c.terminal.attemptedCaseIds) !== "[]" || c.terminal.stoppedCaseId !== "A01-Q" || c.terminal.failureStage !== "acquisition_auth_login" || c.terminal.loginStage !== "submit_redirect" || c.terminal.paidDispatchStarted !== false || c.terminal.sourceDispatchStarted !== false || c.terminal.fullyRetired !== true ||
      typeof c.terminal.causeReviewSha256 !== "string" || !HASH_PATTERN.test(c.terminal.causeReviewSha256) || /^0+$/.test(c.terminal.causeReviewSha256) ||
      !record(c.evidence) || !exactKeys(c.evidence, ["terminalBatchPlanSha256", "terminalBatchResultSha256", "retiredHostedReceiptSha256", "retiredPersonaCheckpointSha256", "newBatchPlanSha256", "newPreviewReceiptSha256", "newCiReceiptSha256", "stoppedChildReceiptSha256", "authThreeCycleReceiptSha256"])) return false;
  return Object.values(c.evidence).every(h => typeof h === "string" && HASH_PATTERN.test(h) && !/^0+$/.test(h)) && c.evidence.newBatchPlanSha256 !== c.evidence.terminalBatchPlanSha256;
}

function validEmptyEpochRepinPredecessor(l: Sprint10SpendLedger, c: Complete26EmptyEpochRepinContract): boolean {
  return l.schemaVersion === 2 && !!l.candidateTransitionArchive && !l.emptyEpochRepinArchive &&
    (l.ceilingAmendment ? l.generation === 282 && l.ceilingUsd === COMPLETE26_AMENDED_CEILING_USD && c.previousGeneration === 282 && Date.parse(c.appliedAt) >= Date.parse(l.ceilingAmendment.contract.appliedAt) :
      l.generation === 281 && l.ceilingUsd === SPRINT10_LIVE_CEILING_USD && c.previousGeneration === 281) &&
    l.acceptanceEpoch.id === COMPLETE26_CANDIDATE642_EPOCH_ID && l.acceptanceEpoch.attempts.length === 0 && l.acceptanceEpoch.acceptanceRevision === 0 &&
    l.generation === c.previousGeneration && sprint10LedgerReceiptCount(l) === c.openingReceiptCount && l.estimatedOrReservedUsd === c.openingAccountedUsd &&
    l.acceptanceEpoch.candidateCommit === c.previousCandidateCommit && l.acceptanceEpoch.candidateHost === c.previousCandidateHost &&
    complete25CheckpointHash(l) === c.previousLedgerCanonicalSha256 && !hasSprint10UnresolvedCharge(l, true) &&
    !l.receipts.some(r => r.identity.candidateCommit === c.currentCandidateCommit || r.identity.candidateHost === c.currentCandidateHost) &&
    Date.parse(c.appliedAt) >= Date.parse(l.candidateTransitionArchive.transition.appliedAt);
}

function validComplete26CeilingAmendmentContract(c: unknown): c is Complete26CeilingAmendmentContract {
  if (!record(c)) return false;
  const authority = c.authority;
  return exactKeys(c, ["schemaVersion", "rootReference", "appliedAt", "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration", "openingReceiptCount", "openingAccountedUsd", "previousCeilingUsd", "currentCeilingUsd", "authority"]) &&
    c.schemaVersion === "geoai.complete26.ceiling-amendment.v1" && c.previousGeneration === 281 && c.openingReceiptCount === 135 && c.openingAccountedUsd === 10.6824222 &&
    c.previousCeilingUsd === SPRINT10_LIVE_CEILING_USD && c.currentCeilingUsd === COMPLETE26_AMENDED_CEILING_USD &&
    typeof c.rootReference === "string" && /^root:[A-Za-z0-9:_-]{10,160}$/.test(c.rootReference) && validIso(c.appliedAt) &&
    Date.parse(c.appliedAt as string) >= Date.parse(COMPLETE26_CEILING_AMENDMENT_AUTHORITY.approvedAtMinute) &&
    [c.previousLedgerSha256, c.previousLedgerCanonicalSha256].every(h => typeof h === "string" && HASH_PATTERN.test(h) && !/^0+$/.test(h)) &&
    record(authority) && exactKeys(authority, Object.keys(COMPLETE26_CEILING_AMENDMENT_AUTHORITY)) &&
    Object.entries(COMPLETE26_CEILING_AMENDMENT_AUTHORITY).every(([key, value]) => authority[key] === value);
}

function validComplete26CeilingAmendmentPredecessor(l: Sprint10SpendLedger, c: Complete26CeilingAmendmentContract): boolean {
  return l.schemaVersion === 2 && !!l.candidateTransitionArchive && !l.emptyEpochRepinArchive && !l.ceilingAmendment &&
    l.ceilingUsd === 15 && l.generation === c.previousGeneration && sprint10LedgerReceiptCount(l) === c.openingReceiptCount &&
    l.estimatedOrReservedUsd === c.openingAccountedUsd && complete25CheckpointHash(l) === c.previousLedgerCanonicalSha256 &&
    l.acceptanceEpoch.id === COMPLETE26_CANDIDATE642_EPOCH_ID && l.acceptanceEpoch.candidateCommit === COMPLETE26_CANDIDATE642_COMMIT &&
    l.acceptanceEpoch.candidateHost === COMPLETE26_CANDIDATE642_HOST && l.acceptanceEpoch.acceptanceRevision === 0 &&
    l.acceptanceEpoch.attempts.length === 0 && l.receipts.find(r => r.id === 93)?.state === "unknown" &&
    !hasSprint10UnresolvedCharge(l, true) && Date.parse(c.appliedAt) >= Date.parse(l.candidateTransitionArchive.transition.appliedAt);
}

/** One founder-authorized $5 ceiling amendment; receipts, archives and unknown costs remain byte-equivalent values. */
export function startComplete26CeilingAmendment(value: Sprint10SpendLedger, contract: Complete26CeilingAmendmentContract): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !validComplete26CeilingAmendmentContract(contract) || !validComplete26CeilingAmendmentPredecessor(ledger, contract)) throw new Error("Ceiling amendment requires exact founder authority and unchanged empty 281/135 predecessor.");
  const next: Sprint10SpendLedger = { ...structuredClone(ledger), ceilingUsd: COMPLETE26_AMENDED_CEILING_USD, generation: ledger.generation + 1,
    ceilingAmendment: { contract: structuredClone(contract), contractSha256: complete25CheckpointHash(contract) } };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid founder ceiling amendment archive.");
  return next;
}

/** Single root-reviewed empty-epoch move, not a retry launcher. Proof contents/freshness are the operator's gate. */
export function startComplete26EmptyEpochRepin(value: Sprint10SpendLedger, contract: Complete26EmptyEpochRepinContract): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !validEmptyEpochRepinContract(contract) || !validEmptyEpochRepinPredecessor(ledger, contract)) throw new Error("Repin requires the unchanged empty, retired 281/135 epoch and exact reviewed target.");
  const next: Sprint10SpendLedger = { ...structuredClone(ledger), generation: ledger.generation + 1,
    emptyEpochRepinArchive: { epoch: structuredClone(ledger.acceptanceEpoch), transition: structuredClone(contract), transitionSha256: complete25CheckpointHash(contract) },
    acceptanceEpoch: { id: COMPLETE26_EMPTY_REPIN_EPOCH_ID, approvalReference: COMPLETE25_RECOVERY_APPROVAL, candidateCommit: contract.currentCandidateCommit, candidateHost: contract.currentCandidateHost, acceptanceRevision: 0, attempts: [] } };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid empty epoch archive.");
  return next;
}

export function complete26EmptyEpochRepinOpening(value: unknown) {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !ledger.emptyEpochRepinArchive) return null;
  return { ...ledger.emptyEpochRepinArchive.transition, transitionSha256: ledger.emptyEpochRepinArchive.transitionSha256 };
}

export type Complete26Candidate642Contract = Omit<Complete26FinalSuccessorContract, "schemaVersion" | "currentEpochId" | "terminal" | "evidence"> & {
  schemaVersion: "geoai.complete26.candidate642-transition.v1";
  previousGeneration: 280; openingReceiptCount: 135; openingAccountedUsd: 10.6824222;
  currentEpochId: typeof COMPLETE26_CANDIDATE642_EPOCH_ID; currentDeploymentId: string;
  terminal: { status: "FAIL"; completedCaseIds: string[]; attemptedCaseIds: string[];
    stoppedCaseId: "A02-Q"; failureStage: "acquisition_auth_login"; paidDispatchStarted: false; fullyRetired: true; causeReviewSha256: string };
  evidence: Complete26ReviewedBatchSegmentContract["evidence"];
};

function validCandidate642Contract(c: unknown): c is Complete26Candidate642Contract {
  if (!record(c) || !exactKeys(c, ["schemaVersion", "rootReference", "appliedAt", "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration", "openingReceiptCount", "openingAccountedUsd", "previousCandidateCommit", "previousCandidateHost", "currentCandidateCommit", "currentCandidateHost", "currentDeploymentId", "currentEpochId", "receiptCeiling", "terminal", "evidence"]) ||
      c.schemaVersion !== "geoai.complete26.candidate642-transition.v1" || c.currentEpochId !== COMPLETE26_CANDIDATE642_EPOCH_ID || c.receiptCeiling !== 201 ||
      c.previousGeneration !== 280 || c.openingReceiptCount !== 135 || c.openingAccountedUsd !== 10.6824222 ||
      c.previousCandidateCommit !== SEGMENT_COMMIT || c.previousCandidateHost !== SEGMENT_HOST || c.currentCandidateCommit !== COMPLETE26_CANDIDATE642_COMMIT ||
      c.currentCandidateHost !== COMPLETE26_CANDIDATE642_HOST || c.currentDeploymentId !== COMPLETE26_CANDIDATE642_DEPLOYMENT ||
      typeof c.rootReference !== "string" || !/^root:[a-zA-Z0-9:_-]{10,160}$/.test(c.rootReference) || !validIso(c.appliedAt) ||
      ![c.previousLedgerSha256, c.previousLedgerCanonicalSha256].every(h => typeof h === "string" && HASH_PATTERN.test(h) && !/^0+$/.test(h)) ||
      !record(c.terminal) || !exactKeys(c.terminal, ["status", "completedCaseIds", "attemptedCaseIds", "stoppedCaseId", "failureStage", "paidDispatchStarted", "fullyRetired", "causeReviewSha256"]) ||
      c.terminal.status !== "FAIL" || c.terminal.stoppedCaseId !== "A02-Q" || c.terminal.failureStage !== "acquisition_auth_login" || c.terminal.paidDispatchStarted !== false || c.terminal.fullyRetired !== true ||
      JSON.stringify(c.terminal.completedCaseIds) !== JSON.stringify(["A01-Q", "A01-D", "A01-S"]) || JSON.stringify(c.terminal.attemptedCaseIds) !== JSON.stringify(c.terminal.completedCaseIds) ||
      typeof c.terminal.causeReviewSha256 !== "string" || !HASH_PATTERN.test(c.terminal.causeReviewSha256) || /^0+$/.test(c.terminal.causeReviewSha256) ||
      !record(c.evidence) || !exactKeys(c.evidence, ["terminalBatchPlanSha256", "terminalBatchResultSha256", "retiredHostedReceiptSha256", "retiredPersonaCheckpointSha256", "newBatchPlanSha256", "newPreviewReceiptSha256", "newCiReceiptSha256", "stoppedChildReceiptSha256", "authThreeCycleReceiptSha256"])) return false;
  return Object.values(c.evidence).every(h => typeof h === "string" && HASH_PATTERN.test(h) && !/^0+$/.test(h)) && c.evidence.newBatchPlanSha256 !== c.evidence.terminalBatchPlanSha256;
}

function validCandidate642Predecessor(l: Sprint10SpendLedger, c: Complete26Candidate642Contract): boolean {
  if (l.schemaVersion !== 2 || !l.reviewedBatchSegment || l.candidateTransitionArchive || l.acceptanceEpoch.id !== COMPLETE26_CONTINUATION_EPOCH_ID ||
      l.generation !== c.previousGeneration || sprint10LedgerReceiptCount(l) !== c.openingReceiptCount || l.estimatedOrReservedUsd !== c.openingAccountedUsd ||
      l.acceptanceEpoch.candidateCommit !== c.previousCandidateCommit || l.acceptanceEpoch.candidateHost !== c.previousCandidateHost ||
      complete25CheckpointHash(l) !== c.previousLedgerCanonicalSha256 || hasSprint10UnresolvedCharge(l, true) ||
      JSON.stringify(l.acceptanceEpoch.attempts.slice(3).map(a => a.caseId)) !== JSON.stringify(c.terminal.attemptedCaseIds)) return false;
  const receipts = l.receipts.filter(r => r.id > 132);
  return receipts.length === 3 && receipts.every((r, i) => r.state === "settled" && r.status === 200 && r.identity.requestKey.startsWith(`Q20:${c.terminal.completedCaseIds[i]}:AI:`)) &&
    Date.parse(c.appliedAt) >= Math.max(Date.parse(l.reviewedBatchSegment.contract.appliedAt), ...l.acceptanceEpoch.attempts.map(a => Date.parse(a.startedAt)), ...l.receipts.map(r => Date.parse(r.settledAt ?? r.createdAt)), ...(l.conservativeCharges ?? []).map(cg => Date.parse("appliedAt" in cg ? cg.appliedAt : cg.approvedAt)));
}

/** One further candidate only. Root must validate all actual terminal/Auth/CI/source-plan proofs before claiming. */
export function startComplete26Candidate642Epoch(value: Sprint10SpendLedger, contract: Complete26Candidate642Contract): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !ledger.reviewedBatchSegment || !validCandidate642Contract(contract) || !validCandidate642Predecessor(ledger, contract)) throw new Error("Candidate642 requires the exact retired 280/135 predecessor and unchanged USD15 history.");
  const next: Sprint10SpendLedger = { ...structuredClone(ledger), generation: ledger.generation + 1,
    candidateTransitionArchive: { epoch: structuredClone(ledger.acceptanceEpoch), reviewedBatchSegment: structuredClone(ledger.reviewedBatchSegment), transition: structuredClone(contract), transitionSha256: complete25CheckpointHash(contract) },
    acceptanceEpoch: { id: COMPLETE26_CANDIDATE642_EPOCH_ID, approvalReference: COMPLETE25_RECOVERY_APPROVAL, candidateCommit: contract.currentCandidateCommit, candidateHost: contract.currentCandidateHost, acceptanceRevision: 0, attempts: [] } };
  delete next.reviewedBatchSegment;
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid candidate642 archive.");
  return next;
}

export function complete26Candidate642Opening(value: unknown) {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !ledger.candidateTransitionArchive) return null;
  return { ...ledger.candidateTransitionArchive.transition, transitionSha256: ledger.candidateTransitionArchive.transitionSha256 };
}

export type Complete26ReviewedBatchSegmentContract = {
  schemaVersion: "geoai.complete26.reviewed-batch-segment.v1";
  rootReference: string; appliedAt: string;
  previousLedgerSha256: string; previousLedgerCanonicalSha256: string;
  previousGeneration: 273; openingReceiptCount: 132; openingAttemptCount: 3;
  openingAccountedUsd: number; candidateCommit: string; candidateHost: string;
  terminal: { status: "FAIL"; completedCaseIds: string[]; attemptedCaseIds: string[];
    stoppedCaseId: "A01-S"; paidDispatchStarted: false; fullyRetired: true; causeReviewSha256: string };
  evidence: Complete26FinalSuccessorContract["evidence"] & { stoppedChildReceiptSha256: string; authThreeCycleReceiptSha256: string };
};

const SEGMENT_COMMIT = "61d333ed210e3b6ffb8ed5448a67ebe78bfab0f9";
const SEGMENT_HOST = "geoai-ki7vk39sl-geoaidev.vercel.app";

function validReviewedBatchSegmentContract(c: unknown): c is Complete26ReviewedBatchSegmentContract {
  if (!record(c) || !exactKeys(c, ["schemaVersion", "rootReference", "appliedAt", "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration", "openingReceiptCount", "openingAttemptCount", "openingAccountedUsd", "candidateCommit", "candidateHost", "terminal", "evidence"]) ||
      c.schemaVersion !== "geoai.complete26.reviewed-batch-segment.v1" || typeof c.rootReference !== "string" || !/^root:[a-zA-Z0-9:_-]{10,160}$/.test(c.rootReference) ||
      !validIso(c.appliedAt) || c.previousGeneration !== 273 || c.openingReceiptCount !== 132 || c.openingAttemptCount !== 3 ||
      !finite(c.openingAccountedUsd) || c.openingAccountedUsd <= 0 || c.openingAccountedUsd + 1.2 > 15 ||
      c.candidateCommit !== SEGMENT_COMMIT || c.candidateHost !== SEGMENT_HOST ||
      ![c.previousLedgerSha256, c.previousLedgerCanonicalSha256].every(x => typeof x === "string" && HASH_PATTERN.test(x) && !/^0+$/.test(x)) ||
      !record(c.terminal) || !exactKeys(c.terminal, ["status", "completedCaseIds", "attemptedCaseIds", "stoppedCaseId", "paidDispatchStarted", "fullyRetired", "causeReviewSha256"]) ||
      c.terminal.status !== "FAIL" || c.terminal.stoppedCaseId !== "A01-S" || c.terminal.paidDispatchStarted !== false || c.terminal.fullyRetired !== true ||
      JSON.stringify(c.terminal.completedCaseIds) !== JSON.stringify(["A01-Q", "A01-D"]) ||
      JSON.stringify(c.terminal.attemptedCaseIds) !== JSON.stringify(["A01-Q", "A01-D", "A01-S"]) ||
      typeof c.terminal.causeReviewSha256 !== "string" || !HASH_PATTERN.test(c.terminal.causeReviewSha256) || /^0+$/.test(c.terminal.causeReviewSha256) ||
      !record(c.evidence) || !exactKeys(c.evidence, ["terminalBatchPlanSha256", "terminalBatchResultSha256", "retiredHostedReceiptSha256", "retiredPersonaCheckpointSha256", "newBatchPlanSha256", "newPreviewReceiptSha256", "newCiReceiptSha256", "stoppedChildReceiptSha256", "authThreeCycleReceiptSha256"])) return false;
  return Object.values(c.evidence).every(x => typeof x === "string" && HASH_PATTERN.test(x) && !/^0+$/.test(x)) && c.evidence.newBatchPlanSha256 === c.evidence.terminalBatchPlanSha256;
}

function validReviewedBatchSegmentPredecessor(l: Sprint10SpendLedger, c: Complete26ReviewedBatchSegmentContract): boolean {
  if (l.schemaVersion !== 2 || !l.continuationTransitionArchive || l.reviewedBatchSegment || l.acceptanceEpoch.id !== COMPLETE26_CONTINUATION_EPOCH_ID ||
      l.generation !== c.previousGeneration || sprint10LedgerReceiptCount(l) !== c.openingReceiptCount || l.estimatedOrReservedUsd !== c.openingAccountedUsd ||
      l.acceptanceEpoch.candidateCommit !== c.candidateCommit || l.acceptanceEpoch.candidateHost !== c.candidateHost ||
      complete25CheckpointHash(l) !== c.previousLedgerCanonicalSha256 || hasSprint10UnresolvedCharge(l, true) ||
      JSON.stringify(l.acceptanceEpoch.attempts.map(a => a.caseId)) !== JSON.stringify(c.terminal.attemptedCaseIds)) return false;
  const receipts = l.receipts.filter(r => r.id > 130);
  return receipts.length === 2 && receipts.every((r, i) => r.state === "settled" && r.status === 200 && r.identity.requestKey.startsWith(`Q20:${c.terminal.completedCaseIds[i]}:AI:`)) &&
    Date.parse(c.appliedAt) >= Math.max(Date.parse(l.continuationTransitionArchive.transition.appliedAt), ...l.acceptanceEpoch.attempts.map(a => Date.parse(a.startedAt)), ...l.receipts.map(r => Date.parse(r.settledAt ?? r.createdAt)), ...(l.conservativeCharges ?? []).map(c => Date.parse("appliedAt" in c ? c.appliedAt : c.approvedAt)));
}

/** One explicit same-candidate segment. Every old attempt stays in its original array. */
export function startComplete26ReviewedBatchSegment(value: Sprint10SpendLedger, contract: Complete26ReviewedBatchSegmentContract): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !validReviewedBatchSegmentContract(contract) || !validReviewedBatchSegmentPredecessor(ledger, contract)) throw new Error("Reviewed segment requires the exact retired 61d pre-dispatch stop and immutable history.");
  const next: Sprint10SpendLedger = { ...structuredClone(ledger), generation: ledger.generation + 1,
    reviewedBatchSegment: { contract: structuredClone(contract), contractSha256: complete25CheckpointHash(contract) } };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid reviewed batch segment.");
  return next;
}

export function complete26ReviewedBatchSegmentOpening(value: unknown) {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2 || !ledger.reviewedBatchSegment) return null;
  return { ...ledger.reviewedBatchSegment.contract, contractSha256: ledger.reviewedBatchSegment.contractSha256 };
}

export function complete26ActiveCaseAttempts(value: unknown): Complete25CaseAttempt[] {
  const ledger = parseSprint10SpendLedger(value);
  if (!ledger || ledger.schemaVersion !== 2) throw new Error("Invalid active attempt ledger.");
  return ledger.acceptanceEpoch.attempts.slice(ledger.reviewedBatchSegment?.contract.openingAttemptCount ?? 0);
}

/** Exactly one reviewed continuation, not an extensible retry/reset mechanism.
 * Root verifies the actual proof contents before creating the exclusive claim. */
export type Complete26ContinuationContract = Omit<Complete26FinalSuccessorContract, "schemaVersion" | "currentEpochId" | "terminal"> & {
  schemaVersion: "geoai.complete26.reviewed-continuation.v1";
  currentEpochId: typeof COMPLETE26_CONTINUATION_EPOCH_ID;
  terminal: {
    status: "FAIL"; completedCaseIds: string[]; attemptedCaseIds: string[];
    stoppedCaseId: "A05-Q"; failureStage: "acquisition_pre_ai";
    paidDispatchStarted: false; fullyRetired: true; causeReviewSha256: string;
  };
};

export function sprint10LedgerReceiptCount(ledger: Sprint10SpendLedger): number {
  return (ledger.schemaVersion === 2 ? ledger.openingCheckpoint.receiptCount : 0) + ledger.receipts.length;
}

// Hashes deliberately match JSON.stringify of the validated objects, not a
// sorted-key hash. The raw file hash is a separate optimistic concurrency guard.
export function complete26LedgerCanonicalHash(ledgerValue: Sprint10SpendLedger): string {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger) throw new Error("Invalid successor ledger hash input.");
  return complete25CheckpointHash(ledger);
}

export function complete26SuccessorOpening(ledgerValue: unknown) {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger || ledger.schemaVersion !== 2 || !ledger.archivedAcceptanceEpoch) return null;
  const { transition, transitionSha256 } = ledger.v14SuccessorArchive ?? ledger.postSinglepassArchive ?? ledger.emptyEpochRepinArchive ?? ledger.candidateTransitionArchive ?? ledger.continuationTransitionArchive ?? ledger.finalTransitionArchive ?? ledger.archivedAcceptanceEpoch;
  return { transitionSha256, openingReceiptCount: transition.openingReceiptCount,
    openingAccountedUsd: transition.openingAccountedUsd, previousCandidateCommit: transition.previousCandidateCommit,
    currentCandidateCommit: transition.currentCandidateCommit, currentCandidateHost: transition.currentCandidateHost,
    currentEpochId: transition.currentEpochId };
}

/** Capacity, not spend authority. Malformed ledgers never acquire the extension. */
export function sprint10LedgerReceiptCapacity(ledgerValue: unknown): number {
  // Legacy callers also use non-authoritative summaries. They retain 160;
  // only the new extension requires and can return a fully parsed proof.
  if (!record(ledgerValue) || !("finalTransitionArchive" in ledgerValue)) return SPRINT10_MAX_RECEIPTS;
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger) throw new Error("Invalid ledger capacity input.");
  return ledger.schemaVersion === 2 && ledger.v14SuccessorArchive ? 219 :
    ledger.schemaVersion === 2 && ledger.finalTransitionArchive ? 201 : SPRINT10_MAX_RECEIPTS;
}

export function startComplete26FinalSuccessorEpoch(
  ledgerValue: Sprint10SpendLedger, contract: Complete26FinalSuccessorContract
): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger || !validFinalSuccessorContract(contract) || !validFinalSuccessorPredecessor(ledger, contract) || ledger.schemaVersion !== 2) {
    throw new Error("Final successor requires one reviewed terminal predecessor and exact unchanged history.");
  }
  const next: Sprint10SpendLedger = { ...structuredClone(ledger), generation: ledger.generation + 1,
    finalTransitionArchive: { epoch: structuredClone(ledger.acceptanceEpoch), transition: structuredClone(contract), transitionSha256: complete25CheckpointHash(contract) },
    acceptanceEpoch: { id: COMPLETE26_FINAL_EPOCH_ID, approvalReference: COMPLETE25_RECOVERY_APPROVAL,
      candidateCommit: contract.currentCandidateCommit, candidateHost: contract.currentCandidateHost, acceptanceRevision: 0, attempts: [] } };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid final successor archive.");
  return next;
}

export function startComplete26ContinuationEpoch(
  ledgerValue: Sprint10SpendLedger, contract: Complete26ContinuationContract
): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger || ledger.schemaVersion !== 2 || !validContinuationContract(contract) || !validContinuationPredecessor(ledger, contract)) {
    throw new Error("Reviewed continuation requires the exact retired pre-AI failure and immutable predecessor history.");
  }
  const next: Sprint10SpendLedger = { ...structuredClone(ledger), generation: ledger.generation + 1,
    continuationTransitionArchive: { epoch: structuredClone(ledger.acceptanceEpoch), transition: structuredClone(contract), transitionSha256: complete25CheckpointHash(contract) },
    acceptanceEpoch: { id: COMPLETE26_CONTINUATION_EPOCH_ID, approvalReference: COMPLETE25_RECOVERY_APPROVAL,
      candidateCommit: contract.currentCandidateCommit, candidateHost: contract.currentCandidateHost, acceptanceRevision: 0, attempts: [] } };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid reviewed continuation archive.");
  return next;
}

export function startComplete26SuccessorEpoch(
  ledgerValue: Sprint10SpendLedger, contract: Complete26SuccessorContract
): Sprint10SpendLedger {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger || ledger.schemaVersion !== 2 || !validSuccessorContract(contract) || !validSuccessorPredecessor(ledger, contract)) {
    throw new Error("COMPLETE26 successor requires the exact reconciled failed predecessor and reviewed new candidate.");
  }
  // Copies avoid the caller mutating the archived contract or epoch through aliases.
  const next: Sprint10SpendLedger = { ...ledger, generation: ledger.generation + 1,
    archivedAcceptanceEpoch: { epoch: structuredClone(ledger.acceptanceEpoch), transition: structuredClone(contract), transitionSha256: complete25CheckpointHash(contract) },
    acceptanceEpoch: { id: COMPLETE26_EPOCH_ID, approvalReference: COMPLETE25_RECOVERY_APPROVAL,
      candidateCommit: contract.currentCandidateCommit, candidateHost: contract.currentCandidateHost,
      acceptanceRevision: 0, attempts: [] } };
  if (!parseSprint10SpendLedger(next)) throw new Error("Invalid COMPLETE26 successor archive.");
  return next;
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
// This is not a spending allowance: every reserve shares the parsed ledger ceiling.
// NIGHT21 continues the same ledger and history; this is journal capacity,
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
  candidate: { candidateCommit: string; candidateHost: string; reviewedSegmentSha256?: string }, attemptId = randomUUID()
): { ledger: Sprint10SpendLedger; attempt: Complete25CaseAttempt } {
  const ledger = parseSprint10SpendLedger(ledgerValue);
  if (!ledger || ledger.schemaVersion !== 2 || hasSprint10UnresolvedCharge(ledger, true) ||
      candidate.candidateCommit !== ledger.acceptanceEpoch.candidateCommit || candidate.candidateHost !== ledger.acceptanceEpoch.candidateHost ||
      (ledger.reviewedBatchSegment?.contractSha256 ?? undefined) !== candidate.reviewedSegmentSha256 ||
      complete26ActiveCaseAttempts(ledger).some(item => item.caseId === caseId)) {
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

function validSuccessorContract(value: unknown): value is Complete26SuccessorContract {
  if (!record(value) || !exactKeys(value, ["schemaVersion", "rootReference", "appliedAt", "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration", "openingReceiptCount", "openingAccountedUsd", "previousCandidateCommit", "previousCandidateHost", "currentCandidateCommit", "currentCandidateHost", "currentEpochId", "evidence"]) ||
      value.schemaVersion !== "geoai.complete26.successor-transition.v1" || value.currentEpochId !== COMPLETE26_EPOCH_ID ||
      typeof value.rootReference !== "string" || !/^root:[a-zA-Z0-9:_-]{10,160}$/.test(value.rootReference) || !validIso(value.appliedAt) ||
      value.previousGeneration !== 192 || value.openingReceiptCount !== 93 || value.openingAccountedUsd !== 8.6162505 ||
      value.previousCandidateCommit !== "fceccdb9e885b005d66771d4d6be711ff7faf28e" || value.previousCandidateHost !== "geoai-qllzf2haw-geoaidev.vercel.app" ||
      typeof value.currentCandidateCommit !== "string" || !COMMIT_PATTERN.test(value.currentCandidateCommit) || value.currentCandidateCommit === value.previousCandidateCommit ||
      typeof value.currentCandidateHost !== "string" || !safeCandidateHost(value.currentCandidateHost) || value.currentCandidateHost === value.previousCandidateHost ||
      typeof value.previousLedgerSha256 !== "string" || !HASH_PATTERN.test(value.previousLedgerSha256) ||
      typeof value.previousLedgerCanonicalSha256 !== "string" || !HASH_PATTERN.test(value.previousLedgerCanonicalSha256) ||
      !record(value.evidence) || !exactKeys(value.evidence, ["failedBatchPlanSha256", "failedBatchResultSha256", "retiredHostedReceiptSha256", "retiredPersonaCheckpointSha256", "newBatchPlanSha256", "newPreviewReceiptSha256", "newCiReceiptSha256"]) ||
      !Object.values(value.evidence).every(hash => typeof hash === "string" && HASH_PATTERN.test(hash))) return false;
  return value.evidence.failedBatchPlanSha256 !== value.evidence.newBatchPlanSha256;
}

function validFinalSuccessorContract(value: unknown): value is Complete26FinalSuccessorContract {
  if (!record(value) || !exactKeys(value, ["schemaVersion", "rootReference", "appliedAt", "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration", "openingReceiptCount", "openingAccountedUsd", "previousCandidateCommit", "previousCandidateHost", "currentCandidateCommit", "currentCandidateHost", "currentEpochId", "receiptCeiling", "terminal", "evidence"]) ||
      value.schemaVersion !== "geoai.complete26.final-successor-transition.v1" || value.currentEpochId !== COMPLETE26_FINAL_EPOCH_ID || value.receiptCeiling !== 201 ||
      typeof value.rootReference !== "string" || !/^root:[a-zA-Z0-9:_-]{10,160}$/.test(value.rootReference) || !validIso(value.appliedAt) ||
      !integer(value.previousGeneration, 193) || !integer(value.openingReceiptCount, 93) || value.openingReceiptCount > 146 ||
      !finite(value.openingAccountedUsd, 8.6162505) || value.openingAccountedUsd > SPRINT10_LIVE_CEILING_USD ||
      value.previousCandidateCommit !== "c039fab32cfed370761a2849c89725f614f03e63" || value.previousCandidateHost !== "geoai-1476jrp2s-geoaidev.vercel.app" ||
      typeof value.currentCandidateCommit !== "string" || !COMMIT_PATTERN.test(value.currentCandidateCommit) || value.currentCandidateCommit === value.previousCandidateCommit ||
      typeof value.currentCandidateHost !== "string" || !safeCandidateHost(value.currentCandidateHost) || value.currentCandidateHost === value.previousCandidateHost ||
      typeof value.previousLedgerSha256 !== "string" || !HASH_PATTERN.test(value.previousLedgerSha256) ||
      typeof value.previousLedgerCanonicalSha256 !== "string" || !HASH_PATTERN.test(value.previousLedgerCanonicalSha256) ||
      !record(value.evidence) || !exactKeys(value.evidence, ["terminalBatchPlanSha256", "terminalBatchResultSha256", "retiredHostedReceiptSha256", "retiredPersonaCheckpointSha256", "newBatchPlanSha256", "newPreviewReceiptSha256", "newCiReceiptSha256"]) ||
      !Object.values(value.evidence).every(hash => typeof hash === "string" && HASH_PATTERN.test(hash)) ||
      value.evidence.terminalBatchPlanSha256 === value.evidence.newBatchPlanSha256 ||
      !record(value.terminal) || !exactKeys(value.terminal, ["status", "completedCaseIds", "attemptedCaseIds", "causeReviewSha256"])) return false;
  const terminal = value.terminal;
  if (!Array.isArray(terminal.completedCaseIds) || !Array.isArray(terminal.attemptedCaseIds) ||
      terminal.completedCaseIds.length > 58 || terminal.attemptedCaseIds.length > 58 ||
      !terminal.attemptedCaseIds.every(complete25CaseId) || new Set(terminal.attemptedCaseIds).size !== terminal.attemptedCaseIds.length ||
      !terminal.completedCaseIds.every((id, index) => id === (terminal.attemptedCaseIds as unknown[])[index])) return false;
  return terminal.status === "PASS" ? terminal.completedCaseIds.length === 58 && terminal.attemptedCaseIds.length === 58 && terminal.causeReviewSha256 === null
    : terminal.status === "FAIL" && typeof terminal.causeReviewSha256 === "string" && HASH_PATTERN.test(terminal.causeReviewSha256);
}

function validFinalSuccessorPredecessor(ledger: Sprint10SpendLedger, contract: Complete26FinalSuccessorContract): boolean {
  if (ledger.schemaVersion !== 2 || !ledger.archivedAcceptanceEpoch || ledger.finalTransitionArchive || ledger.acceptanceEpoch.id !== COMPLETE26_EPOCH_ID ||
      ledger.generation !== contract.previousGeneration || sprint10LedgerReceiptCount(ledger) !== contract.openingReceiptCount ||
      ledger.estimatedOrReservedUsd !== contract.openingAccountedUsd || complete25CheckpointHash(ledger) !== contract.previousLedgerCanonicalSha256 ||
      ledger.acceptanceEpoch.candidateCommit !== contract.previousCandidateCommit || ledger.acceptanceEpoch.candidateHost !== contract.previousCandidateHost ||
      contract.currentCandidateCommit === ledger.archivedAcceptanceEpoch.epoch.candidateCommit || contract.currentCandidateHost === ledger.archivedAcceptanceEpoch.epoch.candidateHost ||
      hasSprint10UnresolvedCharge(ledger, true) ||
      JSON.stringify(ledger.acceptanceEpoch.attempts.map(a => a.caseId)) !== JSON.stringify(contract.terminal.attemptedCaseIds)) return false;
  const currentReceipts = ledger.receipts.filter(r => r.id > ledger.archivedAcceptanceEpoch!.transition.openingReceiptCount);
  // Extras belong to the final candidate only; no previous extra may be hidden in this transition.
  if (currentReceipts.some(r => !r.identity.requestKey.startsWith("Q20:"))) return false;
  const completedPaid = contract.terminal.completedCaseIds.filter(id => !/^F0/.test(id));
  if (completedPaid.some(id => !currentReceipts.some(r => r.identity.requestKey.startsWith(`Q20:${id}:`) && r.state === "settled" && r.status === 200))) return false;
  if (contract.terminal.status === "PASS" && (currentReceipts.length !== 53 || currentReceipts.some(r => r.state !== "settled" || r.status !== 200))) return false;
  const lastChange = Math.max(Date.parse(ledger.archivedAcceptanceEpoch.transition.appliedAt),
    ...ledger.acceptanceEpoch.attempts.map(a => Date.parse(a.startedAt)),
    ...ledger.receipts.map(r => Date.parse(r.settledAt ?? r.createdAt)),
    ...(ledger.conservativeCharges ?? []).map(c => Date.parse("appliedAt" in c ? c.appliedAt : c.approvedAt)));
  return Date.parse(contract.appliedAt) >= lastChange;
}

function validContinuationContract(value: unknown): value is Complete26ContinuationContract {
  if (!record(value) || !exactKeys(value, ["schemaVersion", "rootReference", "appliedAt", "previousLedgerSha256", "previousLedgerCanonicalSha256", "previousGeneration", "openingReceiptCount", "openingAccountedUsd", "previousCandidateCommit", "previousCandidateHost", "currentCandidateCommit", "currentCandidateHost", "currentEpochId", "receiptCeiling", "terminal", "evidence"]) ||
      value.schemaVersion !== "geoai.complete26.reviewed-continuation.v1" || value.currentEpochId !== COMPLETE26_CONTINUATION_EPOCH_ID || value.receiptCeiling !== 201 ||
      value.previousGeneration !== 268 || value.openingReceiptCount !== 130 ||
      !finite(value.openingAccountedUsd, 8.6162505) || value.openingAccountedUsd > SPRINT10_LIVE_CEILING_USD - RESERVE_USD.ai ||
      value.previousCandidateCommit !== "1723d95fe80541f6d8b03381683b13c895e3751f" || value.previousCandidateHost !== "geoai-3v5es0af0-geoaidev.vercel.app" ||
      typeof value.rootReference !== "string" || !/^root:[a-zA-Z0-9:_-]{10,160}$/.test(value.rootReference) || !validIso(value.appliedAt) ||
      typeof value.currentCandidateCommit !== "string" || !COMMIT_PATTERN.test(value.currentCandidateCommit) || /^0+$/.test(value.currentCandidateCommit) || value.currentCandidateCommit === value.previousCandidateCommit ||
      typeof value.currentCandidateHost !== "string" || !safeCandidateHost(value.currentCandidateHost) || value.currentCandidateHost === value.previousCandidateHost ||
      typeof value.previousLedgerSha256 !== "string" || !HASH_PATTERN.test(value.previousLedgerSha256) ||
      typeof value.previousLedgerCanonicalSha256 !== "string" || !HASH_PATTERN.test(value.previousLedgerCanonicalSha256) ||
      !record(value.evidence) || !exactKeys(value.evidence, ["terminalBatchPlanSha256", "terminalBatchResultSha256", "retiredHostedReceiptSha256", "retiredPersonaCheckpointSha256", "newBatchPlanSha256", "newPreviewReceiptSha256", "newCiReceiptSha256"]) ||
      !Object.values(value.evidence).every(hash => typeof hash === "string" && HASH_PATTERN.test(hash) && !/^0+$/.test(hash)) ||
      value.evidence.terminalBatchPlanSha256 === value.evidence.newBatchPlanSha256 ||
      !record(value.terminal) || !exactKeys(value.terminal, ["status", "completedCaseIds", "attemptedCaseIds", "stoppedCaseId", "failureStage", "paidDispatchStarted", "fullyRetired", "causeReviewSha256"])) return false;
  const terminal = value.terminal;
  const completed = Array.from({ length: 4 }, (_, i) => ["Q", "D", "S"].map(d => `A0${i + 1}-${d}`)).flat();
  return terminal.status === "FAIL" && terminal.stoppedCaseId === "A05-Q" && terminal.failureStage === "acquisition_pre_ai" &&
    terminal.paidDispatchStarted === false && terminal.fullyRetired === true &&
    typeof terminal.causeReviewSha256 === "string" && HASH_PATTERN.test(terminal.causeReviewSha256) && !/^0+$/.test(terminal.causeReviewSha256) &&
    JSON.stringify(terminal.completedCaseIds) === JSON.stringify(completed) && JSON.stringify(terminal.attemptedCaseIds) === JSON.stringify(completed);
}

function validContinuationPredecessor(ledger: Sprint10SpendLedger, contract: Complete26ContinuationContract): boolean {
  if (ledger.schemaVersion !== 2 || !ledger.archivedAcceptanceEpoch || !ledger.finalTransitionArchive || ledger.continuationTransitionArchive ||
      ledger.acceptanceEpoch.id !== COMPLETE26_FINAL_EPOCH_ID || ledger.generation !== contract.previousGeneration ||
      sprint10LedgerReceiptCount(ledger) !== contract.openingReceiptCount || ledger.estimatedOrReservedUsd !== contract.openingAccountedUsd ||
      complete25CheckpointHash(ledger) !== contract.previousLedgerCanonicalSha256 || hasSprint10UnresolvedCharge(ledger, true) ||
      ledger.acceptanceEpoch.candidateCommit !== contract.previousCandidateCommit || ledger.acceptanceEpoch.candidateHost !== contract.previousCandidateHost ||
      [ledger.archivedAcceptanceEpoch.epoch, ledger.finalTransitionArchive.epoch].some(epoch =>
        epoch.candidateCommit === contract.currentCandidateCommit || epoch.candidateHost === contract.currentCandidateHost) ||
      JSON.stringify(ledger.acceptanceEpoch.attempts.map(a => a.caseId)) !== JSON.stringify(contract.terminal.attemptedCaseIds)) return false;
  const current = ledger.receipts.filter(r => r.id > ledger.finalTransitionArchive!.transition.openingReceiptCount);
  if (current.length !== 12 || current.some((receipt, index) => receipt.state !== "settled" || receipt.status !== 200 ||
      !receipt.identity.requestKey.startsWith(`Q20:${contract.terminal.completedCaseIds[index]}:AI:`))) return false;
  const lastChange = Math.max(Date.parse(ledger.finalTransitionArchive.transition.appliedAt),
    ...ledger.acceptanceEpoch.attempts.map(a => Date.parse(a.startedAt)),
    ...ledger.receipts.map(r => Date.parse(r.settledAt ?? r.createdAt)),
    ...(ledger.conservativeCharges ?? []).map(c => Date.parse("appliedAt" in c ? c.appliedAt : c.approvedAt)));
  return Date.parse(contract.appliedAt) >= lastChange;
}

function validAcceptanceEpoch(value: unknown, id: string, minimumTime: string, segmentStart: string | null = null): value is Complete25AcceptanceEpoch {
  if (!record(value) || !exactKeys(value, ["id", "approvalReference", "candidateCommit", "candidateHost", "acceptanceRevision", "attempts"]) ||
      value.id !== id || value.approvalReference !== COMPLETE25_RECOVERY_APPROVAL ||
      typeof value.candidateCommit !== "string" || !COMMIT_PATTERN.test(value.candidateCommit) ||
      typeof value.candidateHost !== "string" || !safeCandidateHost(value.candidateHost) ||
      !Array.isArray(value.attempts) || value.attempts.length > (segmentStart ? 61 : 58) || value.acceptanceRevision !== value.attempts.length) return false;
  const seenCases = new Set<string>(), seenAttempts = new Set<string>();
  for (const [index, attempt] of value.attempts.entries()) {
    if (segmentStart && index === 3) seenCases.clear();
    if (!record(attempt) || !exactKeys(attempt, ["caseId", "manifestSha256", "startedAt", "attemptId"]) ||
        !complete25CaseId(attempt.caseId) || seenCases.has(attempt.caseId) ||
        typeof attempt.manifestSha256 !== "string" || !HASH_PATTERN.test(attempt.manifestSha256) ||
        !validIso(attempt.startedAt) || Date.parse(attempt.startedAt) < Date.parse(segmentStart && index >= 3 ? segmentStart : minimumTime) ||
        typeof attempt.attemptId !== "string" || !LEDGER_ID_PATTERN.test(attempt.attemptId) || seenAttempts.has(attempt.attemptId)) return false;
    seenCases.add(attempt.caseId); seenAttempts.add(attempt.attemptId);
  }
  return true;
}

function validSuccessorPredecessor(ledger: Sprint10SpendLedger, transition: Complete26SuccessorContract): boolean {
  if (ledger.schemaVersion !== 2 || ledger.archivedAcceptanceEpoch || ledger.acceptanceEpoch.id !== COMPLETE25_EPOCH_ID ||
      ledger.generation !== transition.previousGeneration || ledger.estimatedOrReservedUsd !== transition.openingAccountedUsd ||
      ledger.acceptanceEpoch.candidateCommit !== transition.previousCandidateCommit || ledger.acceptanceEpoch.candidateHost !== transition.previousCandidateHost ||
      sprint10LedgerReceiptCount(ledger) !== transition.openingReceiptCount || hasSprint10UnresolvedCharge(ledger, true) ||
      complete25CheckpointHash(ledger) !== transition.previousLedgerCanonicalSha256 ||
      JSON.stringify(ledger.acceptanceEpoch.attempts.map(a => a.caseId)) !== JSON.stringify(["A01-Q", "A01-D", "A01-S"]) ||
      ledger.receipts.length !== 3 || ledger.receipts[0]!.state !== "settled" || ledger.receipts[1]!.state !== "settled" ||
      ledger.receipts[2]!.state !== "unknown" || ledger.receipts[2]!.id !== 93 ||
      ledger.receipts[0]!.status !== 200 || ledger.receipts[1]!.status !== 200 || ledger.receipts[2]!.status !== 502 ||
      ledger.receipts[2]!.unknownReason !== "telemetry_missing_or_invalid" ||
      ledger.receipts.some(r => r.identity.promptVersion !== SPRINT10_V12_ANALYSIS_PROMPT_VERSION) ||
      ledger.conservativeCharges?.length !== 1 || ledger.conservativeCharges[0]!.receiptId !== 93) return false;
  const charge = ledger.conservativeCharges[0]!;
  return "authority" in charge && Date.parse(transition.appliedAt) >= Date.parse(charge.appliedAt);
}

export function parseSprint10SpendLedger(value: unknown): Sprint10SpendLedger | null {
  const keys = ["schemaVersion", "cycleId", "ledgerId", "createdAt", "ceilingUsd", "generation", "receipts",
    "estimatedOrReservedUsd"];
  if (!record(value)) return null;
  const recovery = value.schemaVersion === 2;
  const successor = "archivedAcceptanceEpoch" in value;
  const finalSuccessor = "finalTransitionArchive" in value;
  const continuation = "continuationTransitionArchive" in value;
  const candidate642 = "candidateTransitionArchive" in value;
  if (candidate642 && (!continuation || "reviewedBatchSegment" in value || !record(value.candidateTransitionArchive) ||
      !exactKeys(value.candidateTransitionArchive, ["epoch", "reviewedBatchSegment", "transition", "transitionSha256"]) ||
      !validCandidate642Contract(value.candidateTransitionArchive.transition) || value.candidateTransitionArchive.transitionSha256 !== complete25CheckpointHash(value.candidateTransitionArchive.transition))) return null;
  const candidateArchive = candidate642 ? value.candidateTransitionArchive as NonNullable<Extract<Sprint10SpendLedger, { schemaVersion: 2 }>["candidateTransitionArchive"]> : null;
  const amendment = "ceilingAmendment" in value;
  if (amendment && (!candidate642 || !record(value.ceilingAmendment) || !exactKeys(value.ceilingAmendment, ["contract", "contractSha256"]) ||
      !validComplete26CeilingAmendmentContract(value.ceilingAmendment.contract) || value.ceilingAmendment.contractSha256 !== complete25CheckpointHash(value.ceilingAmendment.contract))) return null;
  const emptyRepin = "emptyEpochRepinArchive" in value;
  if (emptyRepin && (!candidate642 || !record(value.emptyEpochRepinArchive) || !exactKeys(value.emptyEpochRepinArchive, ["epoch", "transition", "transitionSha256"]) ||
      !validEmptyEpochRepinContract(value.emptyEpochRepinArchive.transition) || value.emptyEpochRepinArchive.transitionSha256 !== complete25CheckpointHash(value.emptyEpochRepinArchive.transition))) return null;
  const emptyArchive = emptyRepin ? value.emptyEpochRepinArchive as NonNullable<Extract<Sprint10SpendLedger, { schemaVersion: 2 }>["emptyEpochRepinArchive"]> : null;
  const postSinglepass = "postSinglepassArchive" in value;
  if (postSinglepass && (!emptyRepin || !amendment || !record(value.postSinglepassArchive) || !exactKeys(value.postSinglepassArchive, ["epoch", "transition", "transitionSha256"]) ||
      !validPostSinglepassContract(value.postSinglepassArchive.transition) || value.postSinglepassArchive.transitionSha256 !== complete25CheckpointHash(value.postSinglepassArchive.transition))) return null;
  const postArchive = postSinglepass ? value.postSinglepassArchive as NonNullable<Extract<Sprint10SpendLedger, { schemaVersion: 2 }>["postSinglepassArchive"]> : null;
  const v14Successor = "v14SuccessorArchive" in value;
  if (v14Successor && (!postSinglepass || !record(value.v14SuccessorArchive) ||
      !exactKeys(value.v14SuccessorArchive, ["epoch", "transition", "transitionSha256"]) ||
      !validComplete26V14SuccessorContract(value.v14SuccessorArchive.transition) ||
      value.v14SuccessorArchive.transitionSha256 !== complete25CheckpointHash(value.v14SuccessorArchive.transition))) return null;
  const v14Archive = v14Successor ? value.v14SuccessorArchive as NonNullable<Extract<Sprint10SpendLedger, { schemaVersion: 2 }>["v14SuccessorArchive"]> : null;
  const segment = "reviewedBatchSegment" in value || candidate642;
  const segmentValue = candidateArchive ? candidateArchive.reviewedBatchSegment : value.reviewedBatchSegment;
  const capacity = v14Successor ? 219 : finalSuccessor ? 201 : SPRINT10_MAX_RECEIPTS;
  if (finalSuccessor && (!recovery || !successor)) return null;
  if (continuation && !finalSuccessor) return null;
  if (segment && (!continuation || !record(segmentValue) || !exactKeys(segmentValue, ["contract", "contractSha256"]) || !validReviewedBatchSegmentContract(segmentValue.contract) || segmentValue.contractSha256 !== complete25CheckpointHash(segmentValue.contract))) return null;
  const segmentContract = segment ? (segmentValue as { contract: Complete26ReviewedBatchSegmentContract }).contract : null;
  const allowedKeys = recovery ? [...keys, "openingCheckpoint", "openingCheckpointSha256", "acceptanceEpoch", ...(successor ? ["archivedAcceptanceEpoch"] : []), ...(finalSuccessor ? ["finalTransitionArchive"] : []), ...(continuation ? ["continuationTransitionArchive"] : []), ...(segment && !candidate642 ? ["reviewedBatchSegment"] : []), ...(candidate642 ? ["candidateTransitionArchive"] : []), ...(amendment ? ["ceilingAmendment"] : []), ...(emptyRepin ? ["emptyEpochRepinArchive"] : []), ...(postSinglepass ? ["postSinglepassArchive"] : []), ...(v14Successor ? ["v14SuccessorArchive"] : [])] : keys;
  if (!exactKeys(value, "conservativeCharges" in value ? [...allowedKeys, "conservativeCharges"] : allowedKeys) ||
      (value.schemaVersion !== 1 && !recovery) ||
      value.cycleId !== SPRINT10_CYCLE_ID || typeof value.ledgerId !== "string" ||
      !LEDGER_ID_PATTERN.test(value.ledgerId) || !validIso(value.createdAt) ||
      value.ceilingUsd !== (amendment ? COMPLETE26_AMENDED_CEILING_USD : SPRINT10_LIVE_CEILING_USD) || !integer(value.generation) ||
      !Array.isArray(value.receipts) || value.receipts.length > capacity ||
      !finite(value.estimatedOrReservedUsd)) return null;
  if (recovery) {
    if (complete25CheckpointHash(value.openingCheckpoint) !== COMPLETE25_OPENING_SHA256 ||
        value.openingCheckpointSha256 !== COMPLETE25_OPENING_SHA256 || value.ledgerId !== COMPLETE25_OPENING_CHECKPOINT.ledgerId ||
        !record(value.acceptanceEpoch)) return null;
    if (successor) {
      const archive = value.archivedAcceptanceEpoch;
      const finalArchive = value.finalTransitionArchive;
      const continuationArchive = value.continuationTransitionArchive;
      const continuationEpoch = candidateArchive ? candidateArchive.epoch : value.acceptanceEpoch;
      const candidateEpoch = emptyArchive ? emptyArchive.epoch : value.acceptanceEpoch;
      const emptyEpoch = postArchive ? postArchive.epoch : value.acceptanceEpoch;
      const postEpoch = v14Archive ? v14Archive.epoch : value.acceptanceEpoch;
      if (v14Archive && (!validAcceptanceEpoch(value.acceptanceEpoch, COMPLETE26_V14_EPOCH_ID, v14Archive.transition.appliedAt) ||
          value.acceptanceEpoch.candidateCommit !== v14Archive.transition.currentCandidateCommit ||
          value.acceptanceEpoch.candidateHost !== v14Archive.transition.currentCandidateHost)) return null;
      if (postArchive && (!validAcceptanceEpoch(postEpoch, COMPLETE26_POST_SINGLEPASS_EPOCH_ID, postArchive.transition.appliedAt) ||
          postEpoch.candidateCommit !== postArchive.transition.currentCandidateCommit || postEpoch.candidateHost !== postArchive.transition.currentCandidateHost)) return null;
      if (emptyArchive && (!validAcceptanceEpoch(emptyEpoch, COMPLETE26_EMPTY_REPIN_EPOCH_ID, emptyArchive.transition.appliedAt) ||
          emptyEpoch.candidateCommit !== emptyArchive.transition.currentCandidateCommit || emptyEpoch.candidateHost !== emptyArchive.transition.currentCandidateHost)) return null;
      if (candidateArchive && (!validAcceptanceEpoch(candidateEpoch, COMPLETE26_CANDIDATE642_EPOCH_ID, candidateArchive.transition.appliedAt) ||
          candidateEpoch.candidateCommit !== candidateArchive.transition.currentCandidateCommit || candidateEpoch.candidateHost !== candidateArchive.transition.currentCandidateHost || (emptyArchive && candidateEpoch.attempts.length !== 0))) return null;
      if (continuation && (!record(continuationArchive) || !exactKeys(continuationArchive, ["epoch", "transition", "transitionSha256"]) ||
          !validContinuationContract(continuationArchive.transition) || continuationArchive.transitionSha256 !== complete25CheckpointHash(continuationArchive.transition) ||
          !validAcceptanceEpoch(continuationEpoch, COMPLETE26_CONTINUATION_EPOCH_ID, continuationArchive.transition.appliedAt, segmentContract?.appliedAt ?? null) ||
          continuationEpoch.candidateCommit !== continuationArchive.transition.currentCandidateCommit || continuationEpoch.candidateHost !== continuationArchive.transition.currentCandidateHost)) return null;
      const finalEpoch = continuation ? (continuationArchive as { epoch: unknown }).epoch : value.acceptanceEpoch;
      if (finalSuccessor && (!record(finalArchive) || !exactKeys(finalArchive, ["epoch", "transition", "transitionSha256"]) ||
          !validFinalSuccessorContract(finalArchive.transition) || finalArchive.transitionSha256 !== complete25CheckpointHash(finalArchive.transition) ||
          !validAcceptanceEpoch(finalEpoch, COMPLETE26_FINAL_EPOCH_ID, finalArchive.transition.appliedAt) ||
          finalEpoch.candidateCommit !== finalArchive.transition.currentCandidateCommit || finalEpoch.candidateHost !== finalArchive.transition.currentCandidateHost)) return null;
      const intermediateEpoch = finalSuccessor ? (finalArchive as { epoch: unknown }).epoch : value.acceptanceEpoch;
      if (!record(archive) || !exactKeys(archive, ["epoch", "transition", "transitionSha256"]) || !validSuccessorContract(archive.transition) ||
          archive.transitionSha256 !== complete25CheckpointHash(archive.transition) || !validAcceptanceEpoch(archive.epoch, COMPLETE25_EPOCH_ID, value.createdAt) ||
          !validAcceptanceEpoch(intermediateEpoch, COMPLETE26_EPOCH_ID, archive.transition.appliedAt) ||
          intermediateEpoch.candidateCommit !== archive.transition.currentCandidateCommit || intermediateEpoch.candidateHost !== archive.transition.currentCandidateHost) return null;
      const allAttempts = [...archive.epoch.attempts, ...intermediateEpoch.attempts,
        ...(finalSuccessor ? (finalEpoch as Complete25AcceptanceEpoch).attempts : []),
        ...(continuation ? (continuationEpoch as Complete25AcceptanceEpoch).attempts : []),
        ...(candidateArchive ? (candidateEpoch as Complete25AcceptanceEpoch).attempts : []),
        ...(emptyArchive ? (emptyEpoch as Complete25AcceptanceEpoch).attempts : []),
        ...(postArchive ? (postEpoch as Complete25AcceptanceEpoch).attempts : []),
        ...(v14Archive ? (value.acceptanceEpoch as Complete25AcceptanceEpoch).attempts : [])];
      if (new Set(allAttempts.map(a => a.attemptId)).size !== allAttempts.length) return null;
    } else if (!validAcceptanceEpoch(value.acceptanceEpoch, COMPLETE25_EPOCH_ID, value.createdAt)) {
      return null;
    }
  }
  const openingCount = recovery ? COMPLETE25_OPENING_CHECKPOINT.receiptCount : 0;
  if (openingCount + value.receipts.length > capacity) return null;
  const receipts = value.receipts.map((receipt, index) => parseReceipt(receipt, openingCount + index + 1, value.ledgerId as string));
  if (receipts.some((receipt) => receipt === null)) return null;
  const typedReceipts = receipts as Sprint10Receipt[];
  if (new Set(typedReceipts.map((receipt) => receipt.identity.requestKey)).size !== typedReceipts.length) return null;
  if (recovery) {
    const recoveryLedger = value as unknown as Extract<Sprint10SpendLedger, { schemaVersion: 2 }>;
    const paidCases = new Set<string>();
    for (const receipt of typedReceipts) {
      const archive = recoveryLedger.archivedAcceptanceEpoch;
      const finalArchive = recoveryLedger.finalTransitionArchive;
      const continuationArchive = recoveryLedger.continuationTransitionArchive;
      const v14Archive = recoveryLedger.v14SuccessorArchive;
      const historical = archive && receipt.id <= archive.transition.openingReceiptCount;
      const intermediate = finalArchive && receipt.id <= finalArchive.transition.openingReceiptCount;
      const finalHistorical = continuationArchive && receipt.id <= continuationArchive.transition.openingReceiptCount;
      const continuationEpoch = candidateArchive ? candidateArchive.epoch : recoveryLedger.acceptanceEpoch;
      const candidateHistorical = candidateArchive && receipt.id <= candidateArchive.transition.openingReceiptCount;
      const postHistorical = postArchive && receipt.id <= postArchive.transition.openingReceiptCount;
      const v14Historical = v14Archive && receipt.id <= v14Archive.transition.openingReceiptCount;
      const epoch = historical ? archive.epoch : intermediate ? finalArchive.epoch : finalHistorical ? continuationArchive.epoch : candidateHistorical ? continuationEpoch : postHistorical ? postArchive.epoch : v14Historical ? v14Archive.epoch : recoveryLedger.acceptanceEpoch;
      const activeSegment = segmentContract !== null && receipt.id > segmentContract.openingReceiptCount && (!candidateArchive || candidateHistorical);
      const minimumTime = v14Archive && !v14Historical ? v14Archive.transition.appliedAt : postArchive && !postHistorical ? postArchive.transition.appliedAt : candidateArchive && !candidateHistorical ? (emptyArchive ?? candidateArchive).transition.appliedAt : activeSegment ? segmentContract!.appliedAt : historical || !archive ? value.createdAt : continuationArchive && !finalHistorical ? continuationArchive.transition.appliedAt : finalArchive && !intermediate ? finalArchive.transition.appliedAt : archive.transition.appliedAt;
      if (receipt.identity.candidateCommit !== epoch.candidateCommit || receipt.identity.candidateHost !== epoch.candidateHost ||
          Date.parse(receipt.createdAt) < Date.parse(minimumTime)) return null;
      if (v14Archive && receipt.id > v14Archive.transition.openingReceiptCount &&
          receipt.identity.route === "ai" &&
          receipt.identity.promptVersion !== SPRINT10_ANALYSIS_PROMPT_VERSION) return null;
      if (receipt.identity.requestKey.startsWith("Q20:")) {
        const match = /^Q20:([^:]+):(AI|CREATE):([A-F0-9]{64})$/.exec(receipt.identity.requestKey);
        const attempts = segmentContract && epoch === continuationEpoch ? (activeSegment ? epoch.attempts.slice(3) : epoch.attempts.slice(0, 3)) : epoch.attempts;
        const attempt = match && attempts.find(item => item.caseId === match[1] && item.manifestSha256 === match[3].toLowerCase());
        const caseKey = `${epoch.id}:${activeSegment ? "reviewed-segment:" : ""}${match?.[1]}`;
        if (!match || !attempt || paidCases.has(caseKey) || match[2].toLowerCase() !== receipt.identity.route ||
            Date.parse(receipt.createdAt) < Date.parse(attempt.startedAt)) return null;
        const expectedRoute = match[1].startsWith("C-") ? "create" : /^F0/.test(match[1]) ? null : "ai";
        const expectedDepth = match[1].endsWith("-Q") ? "quick" : match[1].endsWith("-D") ? "deep" : "standard";
        if (receipt.identity.route !== expectedRoute || receipt.identity.depth !== expectedDepth) return null;
        paidCases.add(caseKey);
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
    typedReceipts.length + typedReceipts.filter((receipt) => receipt.state !== "reserved").length + charges.length + Number(successor) + Number(finalSuccessor) + Number(continuation) + Number(segment) + Number(candidate642) + Number(amendment) + Number(emptyRepin) + Number(postSinglepass) + Number(v14Successor);
  const ledger = { ...(value as unknown as Sprint10SpendLedger), receipts: typedReceipts };
  if (ledger.schemaVersion === 2 && ledger.v14SuccessorArchive) {
    const archive = ledger.v14SuccessorArchive, contract = archive.transition;
    const previous = { ...ledger, generation: contract.previousGeneration, acceptanceEpoch: archive.epoch,
      receipts: typedReceipts.filter(receipt => receipt.id <= contract.openingReceiptCount),
      conservativeCharges: charges.filter(charge => charge.receiptId <= contract.openingReceiptCount),
      estimatedOrReservedUsd: contract.openingAccountedUsd };
    delete previous.v14SuccessorArchive;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validComplete26V14Predecessor(parsedPrevious, contract)) return null;
  } else if (ledger.schemaVersion === 2 && ledger.postSinglepassArchive) {
    const a = ledger.postSinglepassArchive, c = a.transition;
    const previous = { ...ledger, generation: c.previousGeneration, acceptanceEpoch: a.epoch,
      receipts: typedReceipts.filter(r => r.id <= c.openingReceiptCount), conservativeCharges: charges.filter(ch => ch.receiptId <= c.openingReceiptCount), estimatedOrReservedUsd: c.openingAccountedUsd };
    delete previous.postSinglepassArchive;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validPostSinglepassPredecessor(parsedPrevious, c)) return null;
  } else if (ledger.schemaVersion === 2 && ledger.emptyEpochRepinArchive) {
    const a = ledger.emptyEpochRepinArchive, c = a.transition;
    const previous = { ...ledger, generation: c.previousGeneration, acceptanceEpoch: a.epoch,
      receipts: typedReceipts.filter(r => r.id <= c.openingReceiptCount), conservativeCharges: charges.filter(cg => cg.receiptId <= c.openingReceiptCount), estimatedOrReservedUsd: c.openingAccountedUsd };
    delete previous.emptyEpochRepinArchive;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validEmptyEpochRepinPredecessor(parsedPrevious, c)) return null;
  } else if (ledger.schemaVersion === 2 && ledger.ceilingAmendment) {
    const c = ledger.ceilingAmendment.contract;
    const previous = { ...ledger, ceilingUsd: c.previousCeilingUsd, generation: c.previousGeneration };
    delete previous.ceilingAmendment;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validComplete26CeilingAmendmentPredecessor(parsedPrevious, c)) return null;
  } else if (ledger.schemaVersion === 2 && ledger.candidateTransitionArchive) {
    const a = ledger.candidateTransitionArchive, c = a.transition;
    const previous = { ...ledger, generation: c.previousGeneration, acceptanceEpoch: a.epoch, reviewedBatchSegment: a.reviewedBatchSegment,
      receipts: typedReceipts.filter(r => r.id <= c.openingReceiptCount), conservativeCharges: charges.filter(cg => cg.receiptId <= c.openingReceiptCount), estimatedOrReservedUsd: c.openingAccountedUsd };
    delete previous.candidateTransitionArchive;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validCandidate642Predecessor(parsedPrevious, c)) return null;
  } else if (ledger.schemaVersion === 2 && ledger.reviewedBatchSegment) {
    const c = ledger.reviewedBatchSegment.contract;
    const previous = { ...ledger, generation: c.previousGeneration,
      acceptanceEpoch: { ...ledger.acceptanceEpoch, acceptanceRevision: 3, attempts: ledger.acceptanceEpoch.attempts.slice(0, 3) },
      receipts: typedReceipts.filter(r => r.id <= c.openingReceiptCount), conservativeCharges: charges.filter(cg => cg.receiptId <= c.openingReceiptCount),
      estimatedOrReservedUsd: c.openingAccountedUsd };
    delete previous.reviewedBatchSegment;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validReviewedBatchSegmentPredecessor(parsedPrevious, c)) return null;
  } else if (ledger.schemaVersion === 2 && ledger.continuationTransitionArchive) {
    const archive = ledger.continuationTransitionArchive;
    const previous = { ...ledger, generation: archive.transition.previousGeneration, acceptanceEpoch: archive.epoch,
      receipts: typedReceipts.filter(r => r.id <= archive.transition.openingReceiptCount),
      conservativeCharges: charges.filter(c => c.receiptId <= archive.transition.openingReceiptCount),
      estimatedOrReservedUsd: archive.transition.openingAccountedUsd };
    delete previous.continuationTransitionArchive;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validContinuationPredecessor(parsedPrevious, archive.transition)) return null;
  } else if (ledger.schemaVersion === 2 && ledger.finalTransitionArchive) {
    const archive = ledger.finalTransitionArchive;
    const previous = { ...ledger, generation: archive.transition.previousGeneration, acceptanceEpoch: archive.epoch,
      receipts: typedReceipts.filter(r => r.id <= archive.transition.openingReceiptCount),
      conservativeCharges: charges.filter(c => c.receiptId <= archive.transition.openingReceiptCount),
      estimatedOrReservedUsd: archive.transition.openingAccountedUsd };
    delete previous.finalTransitionArchive;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validFinalSuccessorPredecessor(parsedPrevious, archive.transition)) return null;
  } else if (ledger.schemaVersion === 2 && ledger.archivedAcceptanceEpoch) {
    const archive = ledger.archivedAcceptanceEpoch;
    const previous = { ...ledger, generation: archive.transition.previousGeneration, acceptanceEpoch: archive.epoch,
      receipts: typedReceipts.filter(r => r.id <= archive.transition.openingReceiptCount),
      conservativeCharges: charges.filter(c => c.receiptId <= archive.transition.openingReceiptCount),
      estimatedOrReservedUsd: archive.transition.openingAccountedUsd };
    delete previous.archivedAcceptanceEpoch;
    const parsedPrevious = parseSprint10SpendLedger(previous);
    if (!parsedPrevious || !validSuccessorPredecessor(parsedPrevious, archive.transition)) return null;
  }
  const charge = sprint10LedgerCharge(ledger);
  return value.generation === expectedGeneration && value.estimatedOrReservedUsd === charge &&
    charge <= ledger.ceilingUsd ? ledger : null;
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
  if (sprint10LedgerReceiptCount(ledger) >= sprint10LedgerReceiptCapacity(ledger)) {
    return { ok: false, reason: "The bounded cycle-root receipt journal is full." };
  }
  if (Number((sprint10LedgerCharge(ledger) + reserveUsd).toFixed(8)) > ledger.ceilingUsd) {
    return { ok: false, reason: `The shared USD ${ledger.ceilingUsd} four-sprint ceiling would be exceeded.` };
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
  const identity = parseIdentity(expectedIdentity, true);
  const receipt = ledger.receipts.find(item => item.id === receiptId);
  if (!identity || !receipt || receipt.state !== "unknown" || !sameIdentity(receipt.identity, identity) ||
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
  candidate: { candidateCommit: string; candidateHost: string; reviewedSegmentSha256?: string }
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

export function startComplete26SuccessorEpochFile(
  privateRoot: string, ledgerPath: string, contract: Complete26SuccessorContract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-successor-epoch-claim.json");
  if (exclusiveClaimPath !== claimPath || !HASH_PATTERN.test(expectedLedgerSha256) ||
      expectedLedgerSha256 !== contract.previousLedgerSha256) throw new Error("Exact successor claim and predecessor bytes are required.");
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    // A surviving live-run lease is not permission to steal or resume a runner.
    let runnerLeaseAbsent = false;
    try {
      lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`));
    } catch (error) {
      runnerLeaseAbsent = (error as NodeJS.ErrnoException).code === "ENOENT";
    }
    if (!runnerLeaseAbsent) throw new Error("An active, stale or unverifiable runner lease blocks the successor.");
    validateExistingPrivateFile(claimPath, "The exclusive successor claim");
    if (statSync(claimPath).size > 4096) throw new Error("The successor claim exceeds its fixed size bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8")) as unknown;
    if (!record(claim) || !exactKeys(claim, ["schemaVersion", "transitionSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.successor-epoch-claim.v1" || claim.transitionSha256 !== complete25CheckpointHash(contract) ||
        claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) throw new Error("The successor claim does not bind this transition.");
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) throw new Error("The predecessor ledger bytes changed before successor transition.");
    const next = startComplete26SuccessorEpoch(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

/** Root must first validate actual terminal/retirement/CI/Preview proofs and create
 * this separate O_EXCL claim. No automatic dispatch, recovery or claim deletion. */
export function startComplete26FinalSuccessorEpochFile(
  privateRoot: string, ledgerPath: string, contract: Complete26FinalSuccessorContract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-final-successor-epoch-claim.json");
  if (exclusiveClaimPath !== claimPath || !HASH_PATTERN.test(expectedLedgerSha256) ||
      expectedLedgerSha256 !== contract.previousLedgerSha256) throw new Error("Exact final successor claim and predecessor bytes are required.");
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    let runnerLeaseAbsent = false;
    try { lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`)); }
    catch (error) { runnerLeaseAbsent = (error as NodeJS.ErrnoException).code === "ENOENT"; }
    if (!runnerLeaseAbsent) throw new Error("An active, stale or unverifiable runner lease blocks the final successor.");
    validateExistingPrivateFile(claimPath, "The exclusive final successor claim");
    if (statSync(claimPath).size > 4096) throw new Error("The final successor claim exceeds its fixed size bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8")) as unknown;
    if (!record(claim) || !exactKeys(claim, ["schemaVersion", "transitionSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.final-successor-epoch-claim.v1" || claim.transitionSha256 !== complete25CheckpointHash(contract) ||
        claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) throw new Error("The final successor claim does not bind this transition.");
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) throw new Error("The predecessor ledger bytes changed before final successor transition.");
    const next = startComplete26FinalSuccessorEpoch(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

/** No operational invocation here. Root must validate actual terminal FAIL,
 * full retirement, cause review and fresh exact-candidate CI/Preview evidence.
 * The one-use claim is created by that reviewed operator using O_EXCL. */
export function startComplete26ContinuationEpochFile(
  privateRoot: string, ledgerPath: string, contract: Complete26ContinuationContract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-continuation-epoch-claim.json");
  if (target !== join(root, "cycle-ledger.json") || exclusiveClaimPath !== claimPath || !HASH_PATTERN.test(expectedLedgerSha256) ||
      expectedLedgerSha256 !== contract.previousLedgerSha256) throw new Error("Exact cycle ledger, continuation claim and predecessor bytes are required.");
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    let runnerLeaseAbsent = false;
    try { lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`)); }
    catch (error) { runnerLeaseAbsent = (error as NodeJS.ErrnoException).code === "ENOENT"; }
    if (!runnerLeaseAbsent) throw new Error("An active, stale or unverifiable runner lease blocks the continuation.");
    validateExistingPrivateFile(claimPath, "The exclusive continuation claim");
    if (statSync(claimPath).size > 4096) throw new Error("The continuation claim exceeds its fixed size bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8")) as unknown;
    if (!record(claim) || !exactKeys(claim, ["schemaVersion", "transitionSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.reviewed-continuation-epoch-claim.v1" || claim.transitionSha256 !== complete25CheckpointHash(contract) ||
        claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) throw new Error("The continuation claim does not bind this transition.");
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) throw new Error("The predecessor ledger bytes changed before continuation.");
    const next = startComplete26ContinuationEpoch(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

/** Root-created exclusive claim; locked CAS; never dispatches a browser or paid request. */
export function startComplete26ReviewedBatchSegmentFile(
  privateRoot: string, ledgerPath: string, contract: Complete26ReviewedBatchSegmentContract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-reviewed-batch-segment-claim.json");
  if (target !== join(root, "cycle-ledger.json") || exclusiveClaimPath !== claimPath || !HASH_PATTERN.test(expectedLedgerSha256) || expectedLedgerSha256 !== contract.previousLedgerSha256) throw new Error("Exact segment claim and predecessor bytes required.");
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    let absent = false;
    try { lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`)); }
    catch (error) { absent = (error as NodeJS.ErrnoException).code === "ENOENT"; }
    if (!absent) throw new Error("An active, stale or unverifiable runner lease blocks the segment.");
    validateExistingPrivateFile(claimPath, "Exclusive segment claim");
    if (statSync(claimPath).size > 4096) throw new Error("Segment claim exceeds its bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8"));
    if (!record(claim) || !exactKeys(claim, ["schemaVersion", "contractSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.reviewed-batch-segment-claim.v1" || claim.contractSha256 !== complete25CheckpointHash(contract) || claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) throw new Error("Segment claim binding failed.");
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) throw new Error("Segment predecessor bytes changed.");
    const next = startComplete26ReviewedBatchSegment(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

/** Same locked CAS mechanism; a different fixed claim cannot replay an earlier epoch. */
export function startComplete26Candidate642EpochFile(
  privateRoot: string, ledgerPath: string, contract: Complete26Candidate642Contract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-candidate642-epoch-claim.json");
  if (target !== join(root, "cycle-ledger.json") || exclusiveClaimPath !== claimPath || !HASH_PATTERN.test(expectedLedgerSha256) || expectedLedgerSha256 !== contract.previousLedgerSha256) throw new Error("Exact candidate642 claim and predecessor bytes required.");
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    let absent = false;
    try { lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`)); }
    catch (error) { absent = (error as NodeJS.ErrnoException).code === "ENOENT"; }
    if (!absent) throw new Error("An active, stale or unverifiable runner lease blocks candidate642.");
    validateExistingPrivateFile(claimPath, "Exclusive candidate642 claim");
    if (statSync(claimPath).size > 4096) throw new Error("Candidate642 claim exceeds its bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8"));
    if (!record(claim) || !exactKeys(claim, ["schemaVersion", "transitionSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.candidate642-epoch-claim.v1" || claim.transitionSha256 !== complete25CheckpointHash(contract) || claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) throw new Error("Candidate642 claim binding failed.");
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) throw new Error("Candidate642 predecessor bytes changed.");
    const next = startComplete26Candidate642Epoch(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

/** Fixed one-shot claim and existing atomic writer; no source/Auth/provider dispatch. */
export function startComplete26EmptyEpochRepinFile(
  privateRoot: string, ledgerPath: string, contract: Complete26EmptyEpochRepinContract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-empty-epoch-repin-claim.json");
  if (target !== join(root, "cycle-ledger.json") || exclusiveClaimPath !== claimPath || !HASH_PATTERN.test(expectedLedgerSha256) || expectedLedgerSha256 !== contract.previousLedgerSha256) throw new Error("Exact empty-epoch claim and predecessor bytes required.");
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    let absent = false;
    try { lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`)); }
    catch (error) { absent = (error as NodeJS.ErrnoException).code === "ENOENT"; }
    if (!absent) throw new Error("An active, stale or unverifiable runner lease blocks empty-epoch repin.");
    validateExistingPrivateFile(claimPath, "Exclusive empty-epoch claim");
    if (statSync(claimPath).size > 4096) throw new Error("Empty-epoch claim exceeds its bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8"));
    if (!record(claim) || !exactKeys(claim, ["schemaVersion", "transitionSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.empty-epoch-repin-claim.v1" || claim.transitionSha256 !== complete25CheckpointHash(contract) || claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) throw new Error("Empty-epoch claim binding failed.");
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) throw new Error("Empty-epoch predecessor bytes changed.");
    const next = startComplete26EmptyEpochRepin(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

/** Root-owned one-shot claim, raw-byte CAS, existing ledger lock and atomic writer. */
export function startComplete26PostSinglepassFile(
  privateRoot: string, ledgerPath: string, contract: Complete26PostSinglepassContract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-post-singlepass-claim.json");
  if (target !== join(root, "cycle-ledger.json") || exclusiveClaimPath !== claimPath || !HASH_PATTERN.test(expectedLedgerSha256) || expectedLedgerSha256 !== contract.previousLedgerSha256) throw new Error("Exact post-singlepass claim and predecessor bytes required.");
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    let absent = false;
    try { lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`)); }
    catch (error) { absent = (error as NodeJS.ErrnoException).code === "ENOENT"; }
    if (!absent) throw new Error("An active, stale or unverifiable runner lease blocks post-singlepass transition.");
    validateExistingPrivateFile(claimPath, "Exclusive post-singlepass claim");
    if (statSync(claimPath).size > 4096) throw new Error("Post-singlepass claim exceeds its bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8"));
    if (!record(claim) || !exactKeys(claim, ["schemaVersion", "transitionSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.post-singlepass-claim.v1" || claim.transitionSha256 !== complete25CheckpointHash(contract) || claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) throw new Error("Post-singlepass claim binding failed.");
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) throw new Error("Post-singlepass predecessor bytes changed.");
    const next = startComplete26PostSinglepassEpoch(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

/** One Root-owned claim; the old ledger is checked again under its existing lock. */
export function startComplete26V14SuccessorFile(
  privateRoot: string, ledgerPath: string, contract: Complete26V14SuccessorContract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-v14-successor-claim.json");
  if (target !== join(root, "cycle-ledger.json") || exclusiveClaimPath !== claimPath ||
      !HASH_PATTERN.test(expectedLedgerSha256) ||
      expectedLedgerSha256 !== contract.previousLedgerSha256) {
    throw new Error("Exact V14 successor claim and predecessor bytes required.");
  }
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    let runnerLeaseAbsent = false;
    try { lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`)); }
    catch (error) { runnerLeaseAbsent = (error as NodeJS.ErrnoException).code === "ENOENT"; }
    if (!runnerLeaseAbsent) throw new Error("An active or unverifiable runner lease blocks V14 successor.");
    validateExistingPrivateFile(claimPath, "Exclusive V14 successor claim");
    if (statSync(claimPath).size > 4096) throw new Error("V14 successor claim exceeds its bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8"));
    if (!record(claim) || !exactKeys(claim,
      ["schemaVersion", "transitionSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.v14-successor-claim.v1" ||
        claim.transitionSha256 !== complete25CheckpointHash(contract) ||
        claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) {
      throw new Error("V14 successor claim binding failed.");
    }
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) {
      throw new Error("V14 predecessor bytes changed.");
    }
    const next = startComplete26V14SuccessorEpoch(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
  } finally { lock.release(); }
}

/** Exact one-shot amendment claim, raw-byte CAS, existing ledger lock and atomic writer. */
export function startComplete26CeilingAmendmentFile(
  privateRoot: string, ledgerPath: string, contract: Complete26CeilingAmendmentContract,
  expectedLedgerSha256: string, exclusiveClaimPath: string
): Sprint10SpendLedger {
  const { root, target } = validatePrivateLedgerPath(privateRoot, ledgerPath);
  const claimPath = join(root, ".complete26-usd20-amendment-claim.json");
  if (target !== join(root, "cycle-ledger.json") || exclusiveClaimPath !== claimPath || !HASH_PATTERN.test(expectedLedgerSha256) || expectedLedgerSha256 !== contract.previousLedgerSha256) throw new Error("Exact USD 20 amendment claim and predecessor bytes required.");
  const lock = acquireSprint10LedgerLock(root, target);
  try {
    let absent = false;
    try { lstatSync(join(root, `.${basename(target)}.sprint10-live-journey.lock`)); }
    catch (error) { absent = (error as NodeJS.ErrnoException).code === "ENOENT"; }
    if (!absent) throw new Error("An active, stale or unverifiable runner lease blocks ceiling amendment.");
    validateExistingPrivateFile(claimPath, "Exclusive ceiling amendment claim");
    if (statSync(claimPath).size > 4096) throw new Error("Ceiling amendment claim exceeds its bound.");
    const claim = JSON.parse(readFileSync(claimPath, "utf8"));
    if (!record(claim) || !exactKeys(claim, ["schemaVersion", "contractSha256", "ledgerPath", "expectedLedgerSha256"]) ||
        claim.schemaVersion !== "geoai.complete26.ceiling-amendment-claim.v1" || claim.contractSha256 !== complete25CheckpointHash(contract) || claim.ledgerPath !== target || claim.expectedLedgerSha256 !== expectedLedgerSha256) throw new Error("Ceiling amendment claim binding failed.");
    const current = readSprint10SpendLedgerFile(root, target);
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expectedLedgerSha256) throw new Error("Ceiling amendment predecessor bytes changed.");
    const next = startComplete26CeilingAmendment(current, contract);
    writeLedgerAtomic(root, target, next);
    return readSprint10SpendLedgerFile(root, target);
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
