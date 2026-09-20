import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error Explicit .ts for the Node transform-types runner.
import { accountSprint10UnknownAtFullReserve, accountSprint10UnknownAtFullReserveFile, createSprint10SpendLedgerFile, hasSprint10UnresolvedCharge, markSprint10SpendUnknownFile, parseSprint10SpendLedger, readSprint10SpendLedgerFile, reserveSprint10SpendFile, sprint10ReceiptHash, SPRINT10_CREATE_PROMPT_VERSION } from "../tests/e2e/helpers/sprint10-live-budget.ts";
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-sprint20-budget-test-")));
const path = join(root, "ledger.json");
const time = "2026-09-20T10:00:00.000Z";
const identity = {requestKey: "S4.CREATE.TEST", phase: "S4" as const, candidateHost: "geoai-fixture.vercel.app",
  candidateCommit: "a".repeat(40), route: "create" as const, depth: "standard" as const,
  promptVersion: SPRINT10_CREATE_PROMPT_VERSION, schemaVersion: null};
try {
  createSprint10SpendLedgerFile(root, path, time);
  reserveSprint10SpendFile(root, path, identity, time);
  const original = markSprint10SpendUnknownFile(root, path, 1, identity, time, "response_unreadable");
  const approval = {receiptHash: sprint10ReceiptHash(original.receipts[0]!), approvedAt: time,
    approvalReference: "founder:2026-09-20:test-explicit-approval"};
  assert.equal(hasSprint10UnresolvedCharge(original), true);
  assert.throws(() => reserveSprint10SpendFile(root, path, {...identity, requestKey: "S4.BLOCKED"}, time), /unknown/);
  assert.throws(() => accountSprint10UnknownAtFullReserve(original, 1, {...identity, candidateCommit: "b".repeat(40)}, approval));
  assert.throws(() => accountSprint10UnknownAtFullReserve(original, 1, identity, {...approval, receiptHash: "f".repeat(64)}));
  assert.throws(() => accountSprint10UnknownAtFullReserve(original, 1, identity, {...approval, approvalReference: ""}));
  assert.throws(() => accountSprint10UnknownAtFullReserve(original, 1, identity, {...approval, approvedAt: "2026-09-19T10:00:00.000Z"}));
  const next = accountSprint10UnknownAtFullReserveFile(root, path, 1, identity, approval);
  assert.deepEqual(next.receipts, original.receipts, "Historical unknown receipt must remain byte-equivalent as JSON");
  assert.equal(next.estimatedOrReservedUsd, 0.3);
  assert.equal(next.conservativeCharges?.[0].actualCostKnown, false);
  assert.equal(next.generation, original.generation + 1);
  assert.equal(hasSprint10UnresolvedCharge(next), false);
  assert.deepEqual(readSprint10SpendLedgerFile(root, path), next);
  assert.throws(() => accountSprint10UnknownAtFullReserveFile(root, path, 1, identity, approval));
  for (const amendment of [{chargedUsd: 0}, {chargedUsd: 0.29}, {actualCostKnown: true}, {receiptId: 2}, {receiptHash: "f".repeat(64)}]) {
    const corrupt = structuredClone(next);
    Object.assign(corrupt.conservativeCharges![0]!, amendment);
    assert.equal(parseSprint10SpendLedger(corrupt), null, "Partial/false/mismatched accounting must fail closed");
  }
  const duplicate = structuredClone(next);
  duplicate.conservativeCharges!.push(duplicate.conservativeCharges![0]!);
  duplicate.generation++;
  assert.equal(parseSprint10SpendLedger(duplicate), null);
  const alteredHistory = structuredClone(next);
  alteredHistory.receipts[0]!.status = 500;
  assert.equal(parseSprint10SpendLedger(alteredHistory), null, "Hash must bind original receipt");
  reserveSprint10SpendFile(root, path, {...identity, requestKey: "S4.AFTER.EXPLICIT.APPROVAL"}, time);
  const anotherUnknown = markSprint10SpendUnknownFile(root, path, 2, {...identity, requestKey: "S4.AFTER.EXPLICIT.APPROVAL"}, time, "response_unreadable");
  assert.equal(hasSprint10UnresolvedCharge(anotherUnknown), true, "Approval never applies to future unknown requests");
  assert.equal(anotherUnknown.estimatedOrReservedUsd, 0.6);
  console.log("PASS: append-only full-reserve accounting, immutable history, explicit authority, and future unknown fail-closed");
} finally { rmSync(root, {recursive: true, force: true}); }
