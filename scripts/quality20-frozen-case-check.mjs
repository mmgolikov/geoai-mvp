import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { QUALITY20_AMENDMENT, QUALITY20_CASES, validateQuality20Manifest, quality20RequestKey,
  quality20ApprovalSuffix, validateQuality20Ledger, loadQuality20Selection } from "../tests/e2e/helpers/quality20-frozen-case.ts";
import { sprint10PaidPostDecision, dispatchSprint10PaidRequest } from "../tests/e2e/helpers/sprint10-live-journey-gate.ts";
import { LIVE_SCOPE_RECEIPT_PLAN, validateLiveLedgerScopeHeadroom } from "./sprint10-live-journey-run.mjs";

// Synthetic identifiers ONLY for deterministic offline negative tests; never runtime bindings.
const execution = { commit: "a".repeat(40), origin: "https://geoai-offline-test.vercel.app", deploymentId: "dpl_OFFLINE" };
const binding = {
  query: "OFFLINE fixture", locale: "en", question: "OFFLINE fixture question", role: "developer", scenario: "unspecified", goal: "object_profile",
  subject: { sourceIdentity: "way/1001", geometryHash: "b".repeat(64), sourceResponseHash: "c".repeat(64), evidencePackHash: "d".repeat(64), acquiredAt: "2026-09-19T00:00:00.000Z" },
  find: null, create: null
};
const manifest = {
  schemaVersion: "geoai.quality20.frozen-cases.v1", amendment: QUALITY20_AMENDMENT,
  frozenAt: "2026-09-20T00:00:00.000Z", execution,
  cases: QUALITY20_CASES.map((entry) => ({ id: entry.id, binding: entry.id.startsWith("A01-") ? structuredClone(binding) : null }))
};
function validate(value = manifest, id = "A01-Q", scope = "quality20-analyse") {
  const bytes = JSON.stringify(value);
  return validateQuality20Manifest(bytes, createHash("sha256").update(bytes).digest("hex"), id, scope, execution, Date.parse("2026-09-21T00:00:00Z"));
}
const selected = validate();
assert.equal(QUALITY20_CASES.length, 54);
assert.equal(QUALITY20_CASES.filter((c) => c.scope !== "quality20-find").length + 13, 62);
assert.equal(QUALITY20_CASES.filter((c) => /^A0[78]-/.test(c.id) && c.marketKey === "singapore").length, 6);
assert.equal(QUALITY20_CASES.filter((c) => /^A0[1-6]-/.test(c.id) && c.marketKey === "dubai").length, 18);
assert.equal(QUALITY20_CASES.filter((c) => /^A(09|10|11|12)$/.test(c.id)).length, 4);
for (const goal of ["object_profile", "development_screening", "redevelopment", "due_diligence"]) {
  assert.equal(QUALITY20_CASES.filter((c) => c.goal === goal && /-Q$/.test(c.id)).length, 2);
}
assert.match(quality20RequestKey(selected, "ai"), /^Q20:A01-Q:AI:[a-f0-9]{64}$/);
assert.notEqual(quality20RequestKey(selected, "ai"), quality20RequestKey(validate(manifest, "A01-D"), "ai"));
assert.ok(quality20RequestKey(selected, "ai").length <= 96);
assert.equal(quality20ApprovalSuffix(selected), `:A01-Q:${selected.manifestSha256}`);
assert.throws(() => quality20RequestKey(selected, "create"));
assert.throws(() => validate(manifest, "A01-Q", "quality20-create"));
assert.throws(() => validate(manifest, "A02-Q"), /unbound/);
assert.throws(() => validate(manifest, "arbitrary-case"));
assert.throws(() => validateQuality20Manifest(JSON.stringify(manifest), "0".repeat(64), "A01-Q", "quality20-analyse", execution));
function mutated(change) { const value = structuredClone(manifest); change(value); return value; }
for (const change of [
  (m) => m.cases.pop(),
  (m) => m.cases[1].id = m.cases[0].id,
  (m) => m.amendment = "old-dubai-only",
  (m) => m.execution.commit = "e".repeat(40),
  (m) => m.execution.deploymentId = "dpl_WRONG",
  (m) => m.frozenAt = "2099-01-01T00:00:00Z",
  (m) => m.cases[0].binding.subject.sourceIdentity = "UNKNOWN",
  (m) => m.cases[0].binding.subject.geometryHash = null,
  (m) => m.cases[1].binding.subject.evidencePackHash = "f".repeat(64),
  (m) => m.cases[1].binding.question = "Changed question",
  (m) => m.cases.find((c) => c.id === "A02-Q").binding = structuredClone(binding),
  (m) => m.cases[0].binding.unapproved = true
]) assert.throws(() => validate(mutated(change)));
const receipts = Array.from({ length: 13 }, () => ({ state: "settled", identity: { requestKey: "HISTORICAL" } }));
validateQuality20Ledger(selected, receipts);
validateQuality20Ledger(selected, [...receipts, ...Array.from({ length: 48 }, () => ({ state: "settled" }))]);
assert.throws(() => validateQuality20Ledger(selected, receipts.slice(1)));
assert.throws(() => validateQuality20Ledger(selected, [...receipts, ...Array.from({ length: 49 }, () => ({ state: "settled" }))]));
assert.throws(() => validateQuality20Ledger(selected, [...receipts, { state: "unknown" }]));
assert.throws(() => validateQuality20Ledger(selected, [...receipts, { state: "reserved" }]));
assert.throws(() => validateQuality20Ledger(selected, [...receipts, { state: "settled", identity: { requestKey: `Q20:A01-Q:AI:${"0".repeat(64)}` } }]));
assert.throws(() => loadQuality20Selection({}, "quality20-analyse", execution));
assert.equal(loadQuality20Selection({}, "dubai-analyse", execution), null);
assert.throws(() => loadQuality20Selection({ GEOAI_QUALITY20_CASE_ID: "A01-Q" }, "dubai-analyse", execution));
for (const scope of ["quality20-analyse", "quality20-find", "quality20-create"]) {
  for (const route of ["ai", "create"]) {
    const allowed = scope === `quality20-${route === "ai" ? "analyse" : "create"}`;
    assert.equal(sprint10PaidPostDecision(scope, route, 1).ok, allowed);
    assert.equal(sprint10PaidPostDecision(scope, route, 2).ok, false);
  }
  assert.ok(LIVE_SCOPE_RECEIPT_PLAN[scope]);
}
assert.equal(sprint10PaidPostDecision("dubai-depth-cycle", "ai", 4).ok, true);
assert.equal(sprint10PaidPostDecision("dubai-depth-cycle", "ai", 5).ok, false);
assert.throws(() => validateLiveLedgerScopeHeadroom({ estimatedOrReservedUsd: 15, ceilingUsd: 15 }, "quality20-analyse"));
const ordering = [];
await dispatchSprint10PaidRequest({ reserve: () => { ordering.push("reserve"); return { receipt: 1 }; }, dispatch: async () => { ordering.push("dispatch"); }, markUnknown: () => ordering.push("unknown") });
assert.deepEqual(ordering, ["reserve", "dispatch"]);
let calls = 0;
await dispatchSprint10PaidRequest({ reserve: () => { throw new Error("blocked"); }, dispatch: async () => { calls += 1; }, markUnknown: () => {} });
assert.equal(calls, 0);
console.log("PASS: offline frozen-case contract, 54 registered cases / 62 historic-inclusive planned receipts; NO live outcomes.");
