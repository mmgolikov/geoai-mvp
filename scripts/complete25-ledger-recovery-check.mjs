import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  COMPLETE25_OPENING_CHECKPOINT as opening, COMPLETE25_OPENING_SHA256 as openingHash,
  COMPLETE25_RECOVERY_APPROVAL as approval, SPRINT10_ANALYSIS_PROMPT_VERSION as prompt,
  createComplete25RecoveryLedger, createComplete25RecoveryLedgerFile, createSprint10SpendLedgerFile,
  recordComplete25CaseAttempt, recordComplete25CaseAttemptFile,
  reserveSprint10Spend, reserveSprint10SpendFile, settleSprint10Spend, markSprint10SpendUnknown,
  accountSprint10UnknownAtFullReserve, sprint10ReceiptHash, sprint10LedgerCharge,
  sprint10LedgerReceiptCount, parseSprint10SpendLedger, readSprint10SpendLedgerFile
} from "../tests/e2e/helpers/sprint10-live-budget.ts";
import { QUALITY20_CASES, validateQuality20Ledger } from "../tests/e2e/helpers/quality20-frozen-case.ts";
import { captureLiveLedgerBaseline, receiptSummary, validateLiveLedgerScopeHeadroom, verifyComplete25ExecutionBaseline } from "./sprint10-live-journey-run.mjs";

// Entirely synthetic candidate, telemetry and operational files. No live API,
// actual private ledger or hosted service is read or initialized by this check.
const candidate = { candidateCommit: "a".repeat(40), candidateHost: "geoai-complete25-offline.vercel.app" };
const at = "2026-09-25T10:00:00.000Z";
const reserveAt = "2026-09-25T10:01:00.000Z";
const settledAt = "2026-09-25T10:02:00.000Z";
const checkpoint = JSON.parse(readFileSync(new URL("../docs/sprint25/COMPLETE25_RECOVERY_CHECKPOINT.json", import.meta.url), "utf8"));
assert.deepEqual(checkpoint, opening);
assert.equal(createHash("sha256").update(JSON.stringify(checkpoint)).digest("hex"), openingHash);
const initial = () => createComplete25RecoveryLedger(checkpoint, at, candidate, approval);
const identity = (key = "COMPLETE25.OFFLINE.001") => ({ requestKey: key, phase: "S4", ...candidate,
  route: "ai", depth: "quick", promptVersion: prompt, schemaVersion: 6 });
const attempt = { attempt: 1, purpose: "initial", model: "gpt-5.6-terra", reasoningEffort: "low",
  requestId: "resp_complete25_OFFLINE", inputTokens: 100, cachedInputTokens: 0, cacheWriteTokens: 0,
  outputTokens: 10, totalTokens: 110, estimatedCostUsd: 0.00032 };
const { attempt: _attempt, purpose: _purpose, ...totals } = attempt;
const telemetry = { ...totals, provider: "openai", route: "ai", depth: "quick", promptVersion: prompt,
  schemaVersion: 6, latencyMs: 1, attempts: 1, attemptTrace: [attempt], stored: false, toolCalls: 0,
  costRateSource: "OpenAI gpt-5.6-terra Standard API rate accessed 2026-09-04: USD 2/M ordinary input, USD 0.2/M cached input, USD 2.5/M cache writes, USD 12/M output" };
const reserve = (ledger, key = "COMPLETE25.OFFLINE.001") => {
  const result = reserveSprint10Spend(ledger, identity(key), reserveAt); assert.ok(result.ok, result.reason); return result;
};
const settle = (result) => settleSprint10Spend(result.ledger, result.receipt.id, result.receipt.identity,
  { settledAt, status: 200, resultHash: "b".repeat(64), telemetry });
const change = (ledger, mutate) => { const next = structuredClone(ledger); mutate(next); return next; };
const start = initial();
assert.equal(start.estimatedOrReservedUsd, 7.3097465);
assert.equal(start.receipts.length, 0);
assert.equal(sprint10LedgerReceiptCount(start), 90);
assert.equal(start.generation, 185);
assert.equal(start.openingCheckpoint.conservativeUnknownChargeCount, 5);
assert.throws(() => createComplete25RecoveryLedger(checkpoint, at, candidate, "unapproved"));
for (const mutate of [
  l => l.openingCheckpoint.accountedUsd = 0,
  l => l.openingCheckpoint.receiptCount = 0,
  l => l.openingCheckpoint.generation = 0,
  l => l.openingCheckpoint.rawHistoricalReceiptsUnavailable = false,
  l => l.openingCheckpoint.historicalAttemptIndexUnavailable = false,
  l => l.openingCheckpoint.historicalUnknownActualCostsKnown = true,
  l => l.openingCheckpoint.stateSha256 = "0".repeat(64),
  l => l.openingCheckpointSha256 = "0".repeat(64),
  l => l.openingCheckpoint = undefined,
  l => l.generation = 0,
  l => l.estimatedOrReservedUsd = 0,
  l => l.ceilingUsd = 16,
  l => l.ledgerId = "00000000-0000-4000-8000-000000000000",
  l => l.acceptanceEpoch.approvalReference = "unapproved",
  l => l.acceptanceEpoch.id = "COMPLETE25_RETRY",
  l => l.acceptanceEpoch.acceptanceRevision = 1
]) assert.equal(parseSprint10SpendLedger(change(start, mutate)), null);

const first = reserve(start);
assert.equal(first.receipt.id, 91);
assert.equal(first.ledger.generation, 186);
assert.equal(first.ledger.estimatedOrReservedUsd, 8.5097465);
assert.equal(reserveSprint10Spend(first.ledger, identity("SECOND"), reserveAt).ok, false, "Outstanding reservation stops dispatch");
assert.equal(reserveSprint10Spend(start, { ...identity(), candidateCommit: "b".repeat(40) }, reserveAt).ok, false);
assert.equal(reserveSprint10Spend(start, { ...identity(), candidateHost: "geoai-other.vercel.app" }, reserveAt).ok, false);
const settled = settle(first);
assert.equal(settled.generation, 187);
assert.equal(settled.estimatedOrReservedUsd, 7.3100665);
assert.equal(sprint10LedgerCharge(settled), 7.3100665);
assert.deepEqual(settled.openingCheckpoint, start.openingCheckpoint);
assert.throws(() => settleSprint10Spend(settled, 91, identity(), { settledAt, status: 200, resultHash: "b".repeat(64), telemetry }), /Duplicate/);
const unknown = markSprint10SpendUnknown(first.ledger, 91, identity(), settledAt, "request_failed_after_dispatch");
assert.equal(unknown.estimatedOrReservedUsd, 8.5097465);
assert.equal(reserveSprint10Spend(unknown, identity("SECOND"), reserveAt).ok, false);
assert.throws(() => accountSprint10UnknownAtFullReserve(unknown, 91, identity(), {
  receiptHash: "0".repeat(64), approvedAt: settledAt, approvalReference: approval }));
assert.throws(() => accountSprint10UnknownAtFullReserve(unknown, 91, identity(), {
  receiptHash: sprint10ReceiptHash(unknown.receipts[0]), approvedAt: settledAt, approvalReference: approval }),
  /Invalid/, "The opening recovery approval cannot approve a future unknown charge");
const accounted = accountSprint10UnknownAtFullReserve(unknown, 91, identity(), {
  receiptHash: sprint10ReceiptHash(unknown.receipts[0]), approvedAt: settledAt,
  approvalReference: "founder:OFFLINE_ONLY_new_unknown_approval" });
assert.equal(accounted.receipts[0].state, "unknown");
assert.equal(accounted.estimatedOrReservedUsd, 8.5097465);
assert.deepEqual(accounted.openingCheckpoint, opening);
assert.equal(accounted.generation, 188);

// Exact cap and historic-inclusive journal capacity are distinct boundaries.
let capacity = start;
for (let i = 0; i < 69; i++) capacity = settle(reserve(capacity, `CAPACITY.${i}`));
assert.equal(sprint10LedgerReceiptCount(capacity), 159);
assert.throws(() => validateLiveLedgerScopeHeadroom(capacity, "dubai-find-analysis"), /capacity/);
validateLiveLedgerScopeHeadroom(capacity, "dubai-analyse");
capacity = settle(reserve(capacity, "CAPACITY.69"));
assert.equal(sprint10LedgerReceiptCount(capacity), 160);
assert.equal(reserveSprint10Spend(capacity, identity("CAPACITY.70"), reserveAt).ok, false);
assert.equal(parseSprint10SpendLedger(change(capacity, l => { l.receipts.push({ ...l.receipts[0], id: 161 }); })), null);
let cap = start;
for (let i = 0; i < 6; i++) {
  const reservation = reserve(cap, `BUDGET.${i}`);
  cap = markSprint10SpendUnknown(reservation.ledger, reservation.receipt.id, reservation.receipt.identity, settledAt, "request_failed_after_dispatch");
  cap = accountSprint10UnknownAtFullReserve(cap, reservation.receipt.id, reservation.receipt.identity, {
    receiptHash: sprint10ReceiptHash(cap.receipts.at(-1)), approvedAt: settledAt,
    approvalReference: `founder:OFFLINE_ONLY_budget_${i}` });
}
assert.equal(cap.estimatedOrReservedUsd, 14.5097465);
assert.equal(reserveSprint10Spend(cap, identity("BUDGET.6"), reserveAt).ok, false);

// An entire fresh catalogue is explicit, including non-paid cases. Attempt
// registration counts neither as a provider call nor as spend generation.
let registered = start;
const manifest = "c".repeat(64);
for (const definition of QUALITY20_CASES) registered = recordComplete25CaseAttempt(registered,
  definition.id, manifest, at, candidate).ledger;
assert.equal(registered.acceptanceEpoch.attempts.length, 58);
assert.equal(registered.acceptanceEpoch.acceptanceRevision, 58);
assert.equal(registered.generation, 185);
assert.equal(registered.receipts.length, 0);
assert.throws(() => recordComplete25CaseAttempt(registered, "F01", "d".repeat(64), at, candidate), /already attempted/);
assert.throws(() => recordComplete25CaseAttempt(start, "NOT-A-CASE", manifest, at, candidate));
assert.throws(() => recordComplete25CaseAttempt(start, "A01-Q", manifest, at, { ...candidate, candidateCommit: "b".repeat(40) }));
const selection = { definition: QUALITY20_CASES.find(c => c.id === "A01-Q"), manifestSha256: manifest,
  manifest: { execution: { commit: candidate.candidateCommit, origin: `https://${candidate.candidateHost}` } } };
validateQuality20Ledger(selection, start);
assert.throws(() => validateQuality20Ledger(selection, registered), /already attempted/);
const liveAttempt = registered.acceptanceEpoch.attempts.find(a => a.caseId === "A01-Q");
validateQuality20Ledger(selection, registered, liveAttempt.attemptId);
assert.throws(() => validateQuality20Ledger(selection, registered, "wrong-token"));
assert.throws(() => validateQuality20Ledger({ ...selection, manifestSha256: "e".repeat(64) }, registered, liveAttempt.attemptId));
const qKey = `Q20:A01-Q:AI:${manifest.toUpperCase()}`;
assert.equal(reserveSprint10Spend(start, identity(qKey), reserveAt).ok, false, "No paid case without its durable run-attempt record");
const paidCase = reserve(registered, qKey);
assert.equal(paidCase.receipt.id, 91);
const doneCase = settle(paidCase);
assert.throws(() => validateQuality20Ledger(selection, doneCase, liveAttempt.attemptId), /already attempted/);
assert.equal(reserveSprint10Spend(doneCase, identity(`Q20:A01-Q:AI:${"D".repeat(64)}`), reserveAt).ok, false);
assert.equal(reserveSprint10Spend(registered, identity(`Q20:F01:AI:${manifest.toUpperCase()}`), reserveAt).ok, false);

const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-complete25-OFFLINE-")));
chmodSync(root, 0o700);
const path = join(root, "cycle-ledger.json");
const write = (ledger) => writeFileSync(path, JSON.stringify(ledger), { mode: 0o600 });
const helper = pathToFileURL(resolve("tests/e2e/helpers/sprint10-live-budget.ts")).href;
try {
  write(start);
  const config = { ...captureLiveLedgerBaseline(start), ledgerRoot: root, ledgerPath: path,
    commit: candidate.candidateCommit, host: candidate.candidateHost };
  assert.deepEqual(receiptSummary(config), []);
  verifyComplete25ExecutionBaseline(config);
  write(settled);
  assert.throws(() => verifyComplete25ExecutionBaseline(config), /baseline changed/);
  assert.deepEqual(receiptSummary(config).map(r => r.id), [91]);
  assert.throws(() => receiptSummary({ ...config, baselineLastReceiptId: 0 }), /baseline/);
  assert.throws(() => receiptSummary({ ...config, baselineReceiptCount: 90 }), /baseline/);
  assert.throws(() => receiptSummary({ ...config, baselineOpeningSha256: "0".repeat(64) }), /baseline/);
  const secondConfig = { ...config, ...captureLiveLedgerBaseline(settled) };
  assert.deepEqual(receiptSummary(secondConfig), []);
  const second = reserve(settled, "SECOND");
  write(settle(second));
  assert.deepEqual(receiptSummary(secondConfig).map(r => r.id), [92]);
  assert.throws(() => receiptSummary({ ...secondConfig, baselineReceiptPrefixHash: "0".repeat(64) }), /baseline/);
  write(unknown);
  assert.throws(() => receiptSummary(config), /unresolved/);
  assert.deepEqual(receiptSummary(config, { failureProjection: true }).map(r => [r.id, r.state]), [[91, "unknown"]]);

  write(start);
  const recorded = recordComplete25CaseAttemptFile(root, path, "F01", manifest, at, candidate);
  assert.ok(recorded.attemptId);
  assert.throws(() => recordComplete25CaseAttemptFile(root, path, "F01", manifest, at, candidate), /already attempted/);
  assert.equal(readSprint10SpendLedgerFile(root, path).generation, 185);
  assert.throws(() => verifyComplete25ExecutionBaseline(config), /baseline changed/);

  // Contending processes all target the SAME private journal. Only one reserve
  // may survive because outstanding reserved charges stop the recovered lane.
  write(start);
  const jobs = Array.from({ length: 6 }, (_, i) => new Promise((resolveJob, rejectJob) => {
    const program = `import { reserveSprint10SpendFile } from ${JSON.stringify(helper)};
      try { reserveSprint10SpendFile(${JSON.stringify(root)}, ${JSON.stringify(path)}, ${JSON.stringify(identity(`RACE.${i}`))}, ${JSON.stringify(reserveAt)}); process.exitCode=0; }
      catch { process.exitCode=7; }`;
    const child = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", program], { stdio: "ignore" });
    child.on("error", rejectJob); child.on("close", resolveJob);
  }));
  const exits = await Promise.all(jobs);
  assert.equal(exits.filter(code => code === 0).length, 1);
  assert.equal(exits.filter(code => code === 7).length, 5);
  const raced = readSprint10SpendLedgerFile(root, path);
  assert.equal(raced.generation, 186);
  assert.equal(raced.receipts[0].id, 91);
  assert.equal(raced.estimatedOrReservedUsd, 8.5097465);
  assert.throws(() => reserveSprint10SpendFile(root, path, identity("POST.CRASH"), reserveAt), /unknown/);
  assert.throws(() => createComplete25RecoveryLedgerFile(root, path, at, candidate, approval,
    { checkpoint: path, state: path, handoff: path, confluence: path }), /already initialized/);
  const missingPath = join(root, "not-created.json");
  assert.throws(() => createComplete25RecoveryLedgerFile(root, missingPath, at, candidate, approval,
    { checkpoint: path, state: path, handoff: path, confluence: path }), /provenance/);
  writeFileSync(join(root, ".complete25-recovery-initialized.json"), "OFFLINE interrupted initialization", { mode: 0o600 });
  assert.throws(() => createSprint10SpendLedgerFile(root, missingPath, at), /zero-spend journal/);
  assert.throws(() => createComplete25RecoveryLedgerFile(root, missingPath, at, candidate, approval,
    { checkpoint: path, state: path, handoff: path, confluence: path }), /already initialized or interrupted/);
} finally { rmSync(root, { recursive: true, force: true }); }
console.log("PASS COMPLETE25 loss recovery: immutable checkpoint, global cap/count, 58-case epoch retaining original54, no retries, baseline projection, unknown/crash and six-process atomic reservation. Synthetic offline only; no live ledger initialized.");
