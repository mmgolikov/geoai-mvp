import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
// @ts-expect-error The Node transform-types runner requires the explicit TypeScript extension.
import { SPRINT10_ANALYSIS_PROMPT_VERSION, SPRINT10_CREATE_PROMPT_VERSION, acquireSprint10LedgerLock, createSprint10SpendLedger, createSprint10SpendLedgerFile, markSprint10SpendUnknownFile, parseSprint10ProviderTelemetry, parseSprint10SpendLedger, readSprint10SpendLedgerFile, reserveSprint10Spend, reserveSprint10SpendFile, settleSprint10SpendFile, sprint10LedgerCharge, type Sprint10AttemptTelemetry, type Sprint10RequestIdentity, type Sprint10SpendTelemetry } from "../tests/e2e/helpers/sprint10-live-budget.ts";
// @ts-expect-error The Node transform-types runner requires the explicit TypeScript extension.
import { SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION, settleSprint10Spend, markSprint10SpendUnknown } from "../tests/e2e/helpers/sprint10-live-budget.ts";

const node = process.execPath;
const helperUrl = pathToFileURL(resolve("tests/e2e/helpers/sprint10-live-budget.ts")).href;
const createdAt = "2026-09-18T10:00:00.000Z";
const reserveAt = "2026-09-18T10:01:00.000Z";
const settleAt = "2026-09-18T10:02:00.000Z";
// Unlike self-consistent synthetic receipts, this catches drift from the real app prompt.
const appPromptSource = readFileSync("src/lib/prototype/point-to-object-ai-core.ts", "utf8");
const appPromptVersion = /export const POINT_OBJECT_AI_PROMPT_VERSION = "([^"]+)"/.exec(appPromptSource)?.[1];
assert.equal(SPRINT10_ANALYSIS_PROMPT_VERSION, appPromptVersion, "global test ledger must match the candidate's actual prompt version");
const ledgerId = "11111111-1111-4111-8111-111111111111";
const commitA = "a".repeat(40);
const commitB = "b".repeat(40);

function identity(options: Partial<Sprint10RequestIdentity> & Pick<Sprint10RequestIdentity, "requestKey">): Sprint10RequestIdentity {
  const route = options.route ?? "ai";
  return {
    requestKey: options.requestKey,
    phase: options.phase ?? "S1",
    candidateHost: options.candidateHost ?? "geoai-candidate-a.vercel.app",
    candidateCommit: options.candidateCommit ?? commitA,
    route,
    depth: options.depth ?? "quick",
    promptVersion: route === "ai" ? SPRINT10_ANALYSIS_PROMPT_VERSION : SPRINT10_CREATE_PROMPT_VERSION,
    schemaVersion: route === "ai" ? 6 : null
  };
}

const rates = {
  luna: { input: 0.2, cached: 0.02, cacheWrite: 0.25, output: 1.2, label: "gpt-5.6-luna" },
  terra: { input: 2, cached: 0.2, cacheWrite: 2.5, output: 12, label: "gpt-5.6-terra" },
  sol: { input: 4, cached: 0.4, cacheWrite: 5, output: 20, label: "gpt-5.6-sol" }
} as const;

function attempt(options: Partial<Sprint10AttemptTelemetry> = {}): Sprint10AttemptTelemetry {
  const model = options.model ?? "gpt-5.6-terra";
  const tier = /gpt-5\.6-(luna|terra|sol)/.exec(model)?.[1] as keyof typeof rates;
  const inputTokens = options.inputTokens ?? 100;
  const cachedInputTokens = options.cachedInputTokens ?? 20;
  const cacheWriteTokens = options.cacheWriteTokens ?? 10;
  const outputTokens = options.outputTokens ?? 30;
  const rate = rates[tier];
  const estimatedCostUsd = Number((((inputTokens - cachedInputTokens - cacheWriteTokens) * rate.input +
    cachedInputTokens * rate.cached + cacheWriteTokens * rate.cacheWrite + outputTokens * rate.output) / 1_000_000).toFixed(8));
  return {
    attempt: options.attempt ?? 1,
    purpose: options.purpose ?? "focused",
    model,
    reasoningEffort: options.reasoningEffort ?? "low",
    requestId: options.requestId ?? "resp_sprint10_1",
    inputTokens,
    cachedInputTokens,
    cacheWriteTokens,
    outputTokens,
    totalTokens: options.totalTokens ?? inputTokens + outputTokens,
    estimatedCostUsd: options.estimatedCostUsd ?? estimatedCostUsd
  };
}

function rateSource(trace: Sprint10AttemptTelemetry[]): string {
  return [...new Set(trace.map((entry) => {
    const tier = /gpt-5\.6-(luna|terra|sol)/.exec(entry.model)![1] as keyof typeof rates;
    const rate = rates[tier];
    return `OpenAI ${rate.label} Standard API rate accessed 2026-09-04: USD ${rate.input}/M ordinary input, USD ${rate.cached}/M cached input, USD ${rate.cacheWrite}/M cache writes, USD ${rate.output}/M output`;
  }))].join(" | ");
}

function payloadFor(request: Sprint10RequestIdentity, trace = [attempt()]): unknown {
  const sums = trace.reduce((total, entry) => ({
    input: total.input + entry.inputTokens,
    cached: total.cached + entry.cachedInputTokens,
    cacheWrite: total.cacheWrite + entry.cacheWriteTokens,
    output: total.output + entry.outputTokens,
    all: total.all + entry.totalTokens,
    cost: total.cost + entry.estimatedCostUsd
  }), { input: 0, cached: 0, cacheWrite: 0, output: 0, all: 0, cost: 0 });
  const final = trace.at(-1)!;
  const profile = request.route === "ai" ? final : trace[0]!;
  const telemetry = {
    model: profile.model,
    reasoningEffort: profile.reasoningEffort,
    requestId: final.requestId,
    latencyMs: 250,
    attempts: trace.length,
    attemptTrace: trace,
    inputTokens: sums.input,
    cachedInputTokens: sums.cached,
    cacheWriteTokens: sums.cacheWrite,
    outputTokens: sums.output,
    totalTokens: sums.all,
    estimatedCostUsd: Number(sums.cost.toFixed(8)),
    costRateSource: rateSource(trace),
    stored: false,
    toolCalls: 0
  };
  return request.route === "ai"
    ? {
        mode: "openai",
        schemaVersion: 6,
        telemetry: {
          provider: "openai",
          schemaVersion: 6,
          depth: request.depth,
          promptVersion: request.promptVersion,
          ...telemetry
        }
      }
    : { mode: "openai_concept", promptVersion: request.promptVersion, telemetry };
}

const aiIdentity = identity({ requestKey: "S1.PAIRED.QUICK" });
const telemetry = parseSprint10ProviderTelemetry(aiIdentity, payloadFor(aiIdentity));
assert.ok(telemetry, "A complete pinned-rate provider receipt must pass.");

// Entirely synthetic in-memory history. Never inspect or rewrite the actual
// global ledger while certifying the V10-read / V11-dispatch boundary.
const seed = reserveSprint10Spend(createSprint10SpendLedger(createdAt, ledgerId), aiIdentity, reserveAt);
assert.ok(seed.ok);
const settledSeed = settleSprint10Spend(seed.ledger, seed.receipt.id, aiIdentity, {
  settledAt: settleAt, status: 200, resultHash: "a".repeat(64), telemetry
});
// Cheap settled history must not masquerade as dollar exhaustion at receipt 65.
// Capacity is still finite and the independent monetary/unknown-charge guards remain.
function settledHistory(count: number) {
  const ledger = structuredClone(settledSeed);
  ledger.receipts = Array.from({ length: count }, (_, index) => ({
    ...structuredClone(settledSeed.receipts[0]!),
    id: index + 1,
    identity: identity({ requestKey: `S4.CAPACITY.${index + 1}` })
  }));
  ledger.generation = count * 2;
  ledger.estimatedOrReservedUsd = sprint10LedgerCharge(ledger);
  return ledger;
}
const sixtyFour = settledHistory(64);
const historyBefore65 = JSON.stringify(sixtyFour);
assert.ok(parseSprint10SpendLedger(sixtyFour));
const sixtyFifth = reserveSprint10Spend(sixtyFour, identity({ requestKey: "S4.CAPACITY.65" }), reserveAt);
assert.ok(sixtyFifth.ok, "Receipt 65 is allowed only when real monetary headroom remains.");
assert.equal(sixtyFifth.receipt.id, 65);
assert.deepEqual(sixtyFifth.ledger.receipts.slice(0, 64), sixtyFour.receipts);
assert.equal(JSON.stringify(sixtyFour), historyBefore65, "Capacity expansion cannot rewrite original receipts.");
const eighty = settledHistory(80);
assert.ok(parseSprint10SpendLedger(eighty));
const historyBefore81 = JSON.stringify(eighty);
const eightyFirst = reserveSprint10Spend(eighty, identity({ requestKey: "S4.CAPACITY.81" }), reserveAt);
assert.ok(eightyFirst.ok, "NIGHT21 continues the same bounded journal without resetting spend.");
assert.equal(eightyFirst.receipt.id, 81);
assert.deepEqual(eightyFirst.ledger.receipts.slice(0, 80), eighty.receipts);
assert.equal(JSON.stringify(eighty), historyBefore81);
const full = settledHistory(160);
assert.ok(parseSprint10SpendLedger(full));
assert.deepEqual(reserveSprint10Spend(full, identity({ requestKey: "S4.CAPACITY.161" }), reserveAt), {
  ok: false, reason: "The bounded cycle-root receipt journal is full."
});
assert.equal(parseSprint10SpendLedger(settledHistory(161)), null, "Oversize journals remain invalid.");
const historical = structuredClone(settledSeed);
historical.receipts = Array.from({ length: 23 }, (_, index) => {
  const receipt = structuredClone(settledSeed.receipts[0]!);
  receipt.id = index + 1;
  receipt.identity.requestKey = `S1.HISTORICAL.V10.${index + 1}`;
  receipt.identity.promptVersion = SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION;
  receipt.telemetry!.promptVersion = SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION;
  return receipt;
});
historical.generation = 46;
historical.estimatedOrReservedUsd = sprint10LedgerCharge(historical);
const immutableHistory = JSON.stringify(historical);
const parsedHistorical = parseSprint10SpendLedger(historical);
assert.ok(parsedHistorical, "All 23 immutable V10 settled receipts must remain readable.");
assert.equal(JSON.stringify(parsedHistorical), immutableHistory, "Historical versions, telemetry, order and charges must not be rewritten.");
const currentIdentity = identity({ requestKey: "S4.CURRENT.V11.NEW" });
const currentReservation = reserveSprint10Spend(parsedHistorical, currentIdentity, reserveAt);
assert.ok(currentReservation.ok, "A settled V10 history must allow an exact current V11 reservation.");
assert.equal(currentReservation.receipt.identity.promptVersion, "POINT_OBJECT_AI_PROMPT_V11_2026_09_20");
assert.deepEqual(currentReservation.ledger.receipts.slice(0, 23), historical.receipts);
assert.equal(currentReservation.ledger.estimatedOrReservedUsd, Number((historical.estimatedOrReservedUsd + 1.2).toFixed(8)));
const currentTelemetry = parseSprint10ProviderTelemetry(currentIdentity, payloadFor(currentIdentity));
assert.ok(currentTelemetry, "Current V11 provider/capture telemetry must pass.");
const mixed = settleSprint10Spend(currentReservation.ledger, 24, currentIdentity, {
  settledAt: settleAt, status: 200, resultHash: "b".repeat(64), telemetry: currentTelemetry
});
assert.ok(parseSprint10SpendLedger(mixed), "Mixed V10 historical and V11 current settled receipts must parse.");
assert.deepEqual(mixed.receipts.slice(0, 23), historical.receipts);
assert.equal(mixed.estimatedOrReservedUsd, Number((historical.estimatedOrReservedUsd + currentTelemetry.estimatedCostUsd).toFixed(8)));
assert.equal(JSON.stringify(historical), immutableHistory, "New operations must leave the historical input untouched.");
const legacyIdentity = { ...currentIdentity, requestKey: "S4.LEGACY.NEW.FORBIDDEN", promptVersion: SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION };
assert.equal(reserveSprint10Spend(parsedHistorical, legacyIdentity, reserveAt).ok, false, "New V10 reservation is forbidden.");
assert.equal(parseSprint10ProviderTelemetry(legacyIdentity, payloadFor(legacyIdentity)), null, "Live V10 provider parsing is forbidden even though stored V10 is readable.");
for (const unsupported of ["POINT_OBJECT_AI_PROMPT_V9_2026_09_18", "POINT_OBJECT_AI_PROMPT_V10_2026_09_20", "POINT_OBJECT_AI_PROMPT_V12_2026_09_20"]) {
  const corrupted: any = structuredClone(historical);
  corrupted.receipts[0].identity.promptVersion = unsupported;
  corrupted.receipts[0].telemetry.promptVersion = unsupported;
  assert.equal(parseSprint10SpendLedger(corrupted), null, "Historical compatibility must not accept an unsupported version/date.");
}
const mismatchedHistorical = structuredClone(historical);
mismatchedHistorical.receipts[0]!.telemetry!.promptVersion = SPRINT10_ANALYSIS_PROMPT_VERSION;
assert.equal(parseSprint10SpendLedger(mismatchedHistorical), null, "Historical identity and telemetry must match exactly.");
const corruptHistoricalProfile = structuredClone(historical);
corruptHistoricalProfile.receipts[0]!.telemetry!.attemptTrace[0]!.reasoningEffort = "high";
assert.equal(parseSprint10SpendLedger(corruptHistoricalProfile), null, "Historical read-back must retain the exact model/token profile checks.");
const historicalPending = structuredClone(seed.ledger);
historicalPending.receipts[0]!.identity.promptVersion = SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION;
assert.ok(parseSprint10SpendLedger(historicalPending), "Unexpected historical pending entries must stay inspectable.");
const pendingDecision = reserveSprint10Spend(historicalPending, currentIdentity, reserveAt);
assert.ok(!pendingDecision.ok && pendingDecision.reason.includes("historical V10"), "Historical pending stops any new reservation pending explicit review.");
assert.throws(() => settleSprint10Spend(historicalPending, 1, historicalPending.receipts[0]!.identity,
  { settledAt: settleAt, status: 200, resultHash: "c".repeat(64), telemetry: historical.receipts[0]!.telemetry }), /identity is invalid/);
assert.throws(() => markSprint10SpendUnknown(historicalPending, 1, historicalPending.receipts[0]!.identity, settleAt,
  "response_unreadable"), /identity is invalid/, "Legacy pending must not be mutated by inference.");
const legacyUnknown = markSprint10SpendUnknown(seed.ledger, 1, aiIdentity, settleAt, "response_unreadable");
legacyUnknown.receipts[0]!.identity.promptVersion = SPRINT10_LEGACY_ANALYSIS_PROMPT_VERSION;
assert.ok(parseSprint10SpendLedger(legacyUnknown), "Historical unknown-charge evidence must remain readable without forgiving its charge.");
assert.equal(legacyUnknown.estimatedOrReservedUsd, 1.2);
assert.equal(reserveSprint10Spend(legacyUnknown, currentIdentity, reserveAt).ok, false, "Historical unknown charges retain the existing stop.");

const repairTrace = [
  attempt({ purpose: "initial", model: "gpt-5.6-luna", requestId: "resp_initial" }),
  attempt({ attempt: 2, purpose: "repair", model: "gpt-5.6-terra", requestId: "resp_repair" })
];
assert.ok(parseSprint10ProviderTelemetry(aiIdentity, payloadFor(aiIdentity, repairTrace)),
  "The full initial + repair trace must be charged and accepted.");

const createIdentity = identity({ requestKey: "S3.CREATE.QUICK", phase: "S3", route: "create" });
const createTrace = [attempt({ purpose: "initial", model: "gpt-5.6-terra" })];
assert.ok(parseSprint10ProviderTelemetry(createIdentity, payloadFor(createIdentity, createTrace)),
  "Create telemetry must use its pinned prompt and model profile.");

const understated = structuredClone(payloadFor(aiIdentity)) as { telemetry: { estimatedCostUsd: number } };
understated.telemetry.estimatedCostUsd -= 0.00000001;
assert.equal(parseSprint10ProviderTelemetry(aiIdentity, understated), null, "Understated aggregate spend must fail closed.");
const understatedAttempt = structuredClone(payloadFor(aiIdentity)) as { telemetry: { attemptTrace: Sprint10AttemptTelemetry[] } };
understatedAttempt.telemetry.attemptTrace[0]!.estimatedCostUsd -= 0.00000001;
assert.equal(parseSprint10ProviderTelemetry(aiIdentity, understatedAttempt), null, "Understated attempt spend must fail closed.");
const fractionalTokens = structuredClone(payloadFor(aiIdentity)) as { telemetry: { inputTokens: number } };
fractionalTokens.telemetry.inputTokens = 100.5;
assert.equal(parseSprint10ProviderTelemetry(aiIdentity, fractionalTokens), null, "Fractional token usage must fail closed.");
const missingCacheWrite = structuredClone(payloadFor(aiIdentity)) as { telemetry: Record<string, unknown> };
delete missingCacheWrite.telemetry.cacheWriteTokens;
assert.equal(parseSprint10ProviderTelemetry(aiIdentity, missingCacheWrite), null, "Missing cache-write tokens must fail closed.");
const incompatibleModel = payloadFor(aiIdentity, [attempt({ model: "gpt-5.6-luna", purpose: "focused" })]);
assert.equal(parseSprint10ProviderTelemetry(aiIdentity, incompatibleModel), null, "A Luna focused answer is incompatible with the route profile.");
const wrongPromptPayload = structuredClone(payloadFor(aiIdentity)) as { telemetry: { promptVersion: string } };
wrongPromptPayload.telemetry.promptVersion = "UNPINNED_PROMPT";
assert.equal(parseSprint10ProviderTelemetry(aiIdentity, wrongPromptPayload), null, "An unpinned prompt must fail closed.");
const incompleteTrace = structuredClone(payloadFor(aiIdentity)) as { telemetry: { attempts: number } };
incompleteTrace.telemetry.attempts = 2;
assert.equal(parseSprint10ProviderTelemetry(aiIdentity, incompleteTrace), null, "Attempt count and trace must be complete.");
const duplicateProviderIds = [repairTrace[0]!, { ...repairTrace[1]!, requestId: repairTrace[0]!.requestId }];
assert.equal(parseSprint10ProviderTelemetry(aiIdentity, payloadFor(aiIdentity, duplicateProviderIds)), null,
  "Every provider attempt must retain its own request ID.");

const malformedPure = { ...createSprint10SpendLedger(createdAt, ledgerId), unexpected: true };
assert.equal(parseSprint10SpendLedger(malformedPure), null, "Unknown ledger fields must be rejected.");

function temporaryRoot(prefix: string): string {
  const root = mkdtempSync(join(realpathSync(tmpdir()), prefix));
  chmodSync(root, 0o700);
  return root;
}

const roots: string[] = [];
try {
  const capRoot = temporaryRoot("geoai-sprint10-cap-");
  roots.push(capRoot);
  const capPath = join(capRoot, "four-sprint-ledger.json");
  createSprint10SpendLedgerFile(capRoot, capPath, createdAt, ledgerId);
  assert.equal(statSync(capPath).mode & 0o777, 0o600, "The root ledger must be private 0600.");
  assert.throws(() => createSprint10SpendLedgerFile(capRoot, capPath, createdAt), /already exists/,
    "Explicit creation must never overwrite/reset an existing root ledger.");

  for (let index = 0; index < 12; index += 1) {
    reserveSprint10SpendFile(capRoot, capPath, identity({
      requestKey: `CAP.AI.${String(index + 1).padStart(2, "0")}`,
      phase: index < 3 ? "S1" : index < 6 ? "S2" : index < 9 ? "S3" : "S4",
      candidateHost: index % 2 === 0 ? "geoai-candidate-a.vercel.app" : "geoai-candidate-b.vercel.app",
      candidateCommit: index % 2 === 0 ? commitA : commitB
    }), reserveAt);
  }
  for (let index = 0; index < 2; index += 1) {
    reserveSprint10SpendFile(capRoot, capPath, identity({
      requestKey: `CAP.CREATE.${index + 1}`,
      phase: "S4",
      candidateHost: "geoai-candidate-b.vercel.app",
      candidateCommit: commitB,
      route: "create",
      depth: index === 0 ? "quick" : "deep"
    }), reserveAt);
  }
  const atCap = readSprint10SpendLedgerFile(capRoot, capPath);
  assert.equal(atCap.estimatedOrReservedUsd, 15);
  assert.equal(sprint10LedgerCharge(atCap), 15);
  assert.equal(new Set(atCap.receipts.map((receipt) => receipt.identity.candidateCommit)).size, 2,
    "Different candidate SHAs must accumulate in the same root total.");
  assert.throws(() => reserveSprint10SpendFile(capRoot, capPath, identity({
    requestKey: "CAP.CANNOT.RESET",
    phase: "S1",
    candidateHost: "geoai-new-date.vercel.app",
    candidateCommit: "c".repeat(40),
    route: "create"
  }), "2026-10-01T00:00:00.000Z"), /USD 15/,
  "A new candidate/date must not reset the shared cap.");

  const settlementRoot = temporaryRoot("geoai-sprint10-settle-");
  roots.push(settlementRoot);
  const settlementPath = join(settlementRoot, "ledger.json");
  createSprint10SpendLedgerFile(settlementRoot, settlementPath, createdAt, "22222222-2222-4222-8222-222222222222");
  const settlementIdentity = identity({ requestKey: "S1.SETTLE.IDENTITY" });
  const reservation = reserveSprint10SpendFile(settlementRoot, settlementPath, settlementIdentity, reserveAt);
  const beforeMismatch = readFileSync(settlementPath, "utf8");
  assert.throws(() => settleSprint10SpendFile(settlementRoot, settlementPath, reservation.receipt.id,
    { ...settlementIdentity, candidateCommit: commitB }, {
      settledAt: settleAt,
      status: 200,
      resultHash: "d".repeat(64),
      telemetry
    }), /does not match/, "A mismatched receipt SHA must not settle.");
  assert.equal(readFileSync(settlementPath, "utf8"), beforeMismatch, "A rejected identity must not mutate the ledger.");
  const settled = settleSprint10SpendFile(settlementRoot, settlementPath, reservation.receipt.id, settlementIdentity, {
    settledAt: settleAt,
    status: 200,
    resultHash: "d".repeat(64),
    telemetry
  });
  assert.equal(settled.receipts[0]!.state, "settled");
  assert.equal(settled.estimatedOrReservedUsd, telemetry!.estimatedCostUsd);
  assert.throws(() => settleSprint10SpendFile(settlementRoot, settlementPath, reservation.receipt.id, settlementIdentity, {
    settledAt: "2026-09-18T10:03:00.000Z",
    status: 200,
    resultHash: "d".repeat(64),
    telemetry
  }), /Duplicate or late/, "Duplicate settlement must fail without rewriting history.");

  const unknownRoot = temporaryRoot("geoai-sprint10-unknown-");
  roots.push(unknownRoot);
  const unknownPath = join(unknownRoot, "ledger.json");
  createSprint10SpendLedgerFile(unknownRoot, unknownPath, createdAt, "33333333-3333-4333-8333-333333333333");
  const unknownIdentity = identity({ requestKey: "S2.UNKNOWN.CHARGE", phase: "S2" });
  const unknownReservation = reserveSprint10SpendFile(unknownRoot, unknownPath, unknownIdentity, reserveAt);
  markSprint10SpendUnknownFile(unknownRoot, unknownPath, unknownReservation.receipt.id, unknownIdentity, settleAt,
    "request_failed_after_dispatch");
  assert.throws(() => reserveSprint10SpendFile(unknownRoot, unknownPath,
    identity({ requestKey: "S3.BLOCKED.BY.UNKNOWN", phase: "S3" }), "2026-09-18T10:04:00.000Z"), /unknown provider charge/,
  "Any unknown charge must block every later candidate.");
  assert.throws(() => settleSprint10SpendFile(unknownRoot, unknownPath, unknownReservation.receipt.id, unknownIdentity, {
    settledAt: "2026-09-18T10:05:00.000Z",
    status: 200,
    resultHash: "e".repeat(64),
    telemetry
  }), /Duplicate or late/, "A response arriving after unknown settlement must not rewrite the audit trail.");

  const badEvidenceRoot = temporaryRoot("geoai-sprint10-badevidence-");
  roots.push(badEvidenceRoot);
  const badEvidencePath = join(badEvidenceRoot, "ledger.json");
  createSprint10SpendLedgerFile(badEvidenceRoot, badEvidencePath, createdAt, "44444444-4444-4444-8444-444444444444");
  const badEvidenceIdentity = identity({ requestKey: "S1.BAD.TELEMETRY" });
  const badEvidenceReservation = reserveSprint10SpendFile(badEvidenceRoot, badEvidencePath, badEvidenceIdentity, reserveAt);
  const unknownAfterBadEvidence = settleSprint10SpendFile(badEvidenceRoot, badEvidencePath,
    badEvidenceReservation.receipt.id, badEvidenceIdentity, {
      settledAt: settleAt,
      status: 200,
      resultHash: "not-a-hash",
      telemetry: null
    });
  assert.equal(unknownAfterBadEvidence.receipts[0]!.state, "unknown");
  assert.equal(unknownAfterBadEvidence.estimatedOrReservedUsd, 1.2,
    "Missing evidence must retain the full reservation rather than understate spend.");

  const corruptRoot = temporaryRoot("geoai-sprint10-corrupt-");
  roots.push(corruptRoot);
  const corruptPath = join(corruptRoot, "ledger.json");
  writeFileSync(corruptPath, "{broken", { mode: 0o600 });
  assert.throws(() => readSprint10SpendLedgerFile(corruptRoot, corruptPath), /not valid JSON/);
  assert.throws(() => createSprint10SpendLedgerFile(corruptRoot, corruptPath, createdAt), /already exists/,
    "Creation must fail on corruption rather than replacing the evidence.");
  assert.throws(() => readSprint10SpendLedgerFile(corruptRoot, join(corruptRoot, "..", "escaped-ledger.json")),
    /direct child/, "A path escape must be rejected.");

  const symlinkRoot = temporaryRoot("geoai-sprint10-symlink-");
  roots.push(symlinkRoot);
  const realTarget = join(symlinkRoot, "real.json");
  writeFileSync(realTarget, "{}", { mode: 0o600 });
  const linkTarget = join(symlinkRoot, "linked.json");
  symlinkSync(realTarget, linkTarget);
  assert.throws(() => readSprint10SpendLedgerFile(symlinkRoot, linkTarget), /non-link file/,
    "A ledger symlink must be rejected.");
  const linkedRoot = `${symlinkRoot}-link`;
  symlinkSync(symlinkRoot, linkedRoot);
  roots.push(linkedRoot);
  assert.throws(() => readSprint10SpendLedgerFile(linkedRoot, join(linkedRoot, "real.json")), /not a symlink/,
    "A symlinked private root must be rejected.");

  const lockRoot = temporaryRoot("geoai-sprint10-lock-");
  roots.push(lockRoot);
  const lockPath = join(lockRoot, "ledger.json");
  const lock = acquireSprint10LedgerLock(lockRoot, lockPath);
  assert.equal(statSync(lock.lockPath).mode & 0o777, 0o600, "The cross-process lock must be private 0600.");
  lock.release();
  assert.equal(existsSync(lock.lockPath), false);

  const raceRoot = temporaryRoot("geoai-sprint10-race-");
  roots.push(raceRoot);
  const racePath = join(raceRoot, "ledger.json");
  createSprint10SpendLedgerFile(raceRoot, racePath, createdAt, "55555555-5555-4555-8555-555555555555");
  const reserveChild = `
const helper = await import(process.argv[1]);
const index = Number(process.argv[4]);
const identity = {
  requestKey: \`RACE.AI.\${String(index).padStart(2, "0")}\`,
  phase: index < 4 ? "S1" : index < 8 ? "S2" : index < 11 ? "S3" : "S4",
  candidateHost: index % 2 ? "geoai-race-b.vercel.app" : "geoai-race-a.vercel.app",
  candidateCommit: (index % 2 ? "b" : "a").repeat(40),
  route: "ai", depth: "quick",
  promptVersion: helper.SPRINT10_ANALYSIS_PROMPT_VERSION, schemaVersion: 6
};
try {
  helper.reserveSprint10SpendFile(process.argv[2], process.argv[3], identity, "2026-09-18T10:10:00.000Z");
  process.stdout.write("reserved\\n");
} catch (error) {
  process.stdout.write(\`blocked:\${error instanceof Error ? error.message : String(error)}\\n\`);
}`;
  const raceResults = await Promise.all(Array.from({ length: 14 }, (_, index) => runChild(
    reserveChild, [helperUrl, raceRoot, racePath, String(index + 1)]
  )));
  assert.equal(raceResults.filter((result) => result.stdout === "reserved\n").length, 12,
    `Exactly twelve concurrent AI reservations fit under USD 15: ${JSON.stringify(raceResults)}`);
  assert.equal(raceResults.filter((result) => result.stdout.includes("USD 15")).length, 2);
  const raceLedger = readSprint10SpendLedgerFile(raceRoot, racePath);
  assert.equal(raceLedger.receipts.length, 12);
  assert.equal(raceLedger.estimatedOrReservedUsd, 14.4);
  assert.ok(parseSprint10SpendLedger(raceLedger));

  const settlementRaceRoot = temporaryRoot("geoai-sprint10-settlement-race-");
  roots.push(settlementRaceRoot);
  const settlementRacePath = join(settlementRaceRoot, "ledger.json");
  createSprint10SpendLedgerFile(settlementRaceRoot, settlementRacePath, createdAt,
    "66666666-6666-4666-8666-666666666666");
  const settlementRaceIdentity = identity({ requestKey: "S1.SETTLEMENT.RACE" });
  const settlementRaceReservation = reserveSprint10SpendFile(settlementRaceRoot, settlementRacePath,
    settlementRaceIdentity, reserveAt);
  const outcomePath = join(settlementRaceRoot, "outcome.json");
  writeFileSync(outcomePath, JSON.stringify({ identity: settlementRaceIdentity, outcome: {
    settledAt: settleAt,
    status: 200,
    resultHash: "f".repeat(64),
    telemetry
  } }), { mode: 0o600 });
  const settleChild = `
const { readFileSync } = await import("node:fs");
const helper = await import(process.argv[1]);
const input = JSON.parse(readFileSync(process.argv[5], "utf8"));
try {
  helper.settleSprint10SpendFile(process.argv[2], process.argv[3], Number(process.argv[4]), input.identity, input.outcome);
  process.stdout.write("settled\\n");
} catch (error) {
  process.stdout.write(\`blocked:\${error instanceof Error ? error.message : String(error)}\\n\`);
}`;
  const settlementRace = await Promise.all([1, 2].map(() => runChild(settleChild,
    [helperUrl, settlementRaceRoot, settlementRacePath, String(settlementRaceReservation.receipt.id), outcomePath])));
  assert.equal(settlementRace.filter((result) => result.stdout === "settled\n").length, 1,
    "Only one process may settle a receipt.");
  assert.equal(settlementRace.filter((result) => result.stdout.includes("Duplicate or late")).length, 1,
    "The losing settlement race must fail closed as a duplicate.");
  assert.equal(readSprint10SpendLedgerFile(settlementRaceRoot, settlementRacePath).receipts[0]!.state, "settled");

  const pureLedger = createSprint10SpendLedger(createdAt, "77777777-7777-4777-8777-777777777777");
  const badIdentity = { ...identity({ requestKey: "S1.INVALID.PROMPT" }), promptVersion: "WRONG" } as unknown as Sprint10RequestIdentity;
  assert.equal(reserveSprint10Spend(pureLedger, badIdentity, reserveAt).ok, false,
    "A request cannot reserve against an incompatible prompt identity.");
} finally {
  for (const root of roots.reverse()) {
    if (lstatSync(root).isSymbolicLink()) unlinkSafe(root);
    else rmSync(root, { recursive: true, force: true });
  }
}

function runChild(program: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(node, ["--experimental-transform-types", "-e", program, ...args], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", rejectResult);
    child.once("exit", (code) => resolveResult({ code, stdout, stderr }));
  });
}

function unlinkSafe(path: string): void {
  if (existsSync(path) || lstatSync(path).isSymbolicLink()) rmSync(path, { force: true });
}

console.log("Sprint 10 four-sprint live budget contract checks passed.");
