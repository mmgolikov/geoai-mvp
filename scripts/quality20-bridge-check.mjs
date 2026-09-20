import assert from "node:assert/strict";
import { parseLiveJourneyChildReceipt, buildLiveJourneyChildEnvironment } from "./sprint10-hosted-auth-probe.mjs";
const quality20 = { definition: { id: "A01-Q", depth: "quick" }, manifestSha256: "a".repeat(64) };
const base = { scope: "quality20-analyse", previewHost: "geoai-offline.vercel.app", commit: "b".repeat(40), quality20 };
const observation = { caseId: "A01-Q", entryCoverage: "follow_up_recovery_initial_NONPAID_challenge_aborted", sourceLatencyMs: 1,
  responseMs: 2, renderedMs: 3, evidencePackHash: "e".repeat(64), paidPostCount: 1, reopenPaidPostCount: 0 };
const envelope = { caseId: "A01-Q", manifestSha256: quality20.manifestSha256, depth: "quick", observations: [observation] };
const payload = { status: "PASS", scope: base.scope, previewHost: base.previewHost, commit: base.commit,
  browserLocalPersistenceOnly: true, receipts: [{ id: 14, route: "ai", depth: "quick", state: "settled", estimatedUsd: 0.1 }], quality20: envelope };
const parse = (value, expected = base) => parseLiveJourneyChildReceipt({ status: 0, stdout: JSON.stringify(value) }, expected);
assert.equal(parse(payload).quality20.caseId, "A01-Q");
assert.throws(() => parse({ ...payload, quality20: { ...envelope, caseId: "A02-Q" } }));
assert.throws(() => parse({ ...payload, quality20: { ...envelope, manifestSha256: "c".repeat(64) } }));
assert.throws(() => parse({ ...payload, receipts: [{ ...payload.receipts[0], depth: "standard" }] }));
assert.throws(() => parse({ ...payload, quality20: undefined }));
assert.throws(() => parse({ ...payload, quality20: { ...envelope, observations: [] } }));
assert.throws(() => parse({ ...payload, quality20: { ...envelope, observations: [{ ...observation, sourceLatencyMs: "invented" }] } }));
assert.throws(() => parse({ ...payload, receipts: [...payload.receipts, { ...payload.receipts[0], id: 15 }] }));
const acquisition = { caseId: "A01-Q", planSha256: "d".repeat(64) };
const expectedAcquisition = { ...base, scope: "quality20-acquire", quality20: null, acquisition };
const acquired = { ...payload, scope: "quality20-acquire", status: "ACQUIRED_NOT_ANALYSED", receipts: [],
  quality20: { caseId: acquisition.caseId, manifestSha256: acquisition.planSha256, depth: null, observations: [] } };
assert.equal(parse(acquired, expectedAcquisition).status, "ACQUIRED_NOT_ANALYSED");
assert.throws(() => parse({ ...acquired, status: "PASS" }, expectedAcquisition));
assert.throws(() => parse({ ...acquired, receipts: payload.receipts }, expectedAcquisition));
const settings = { GEOAI_QUALITY20_MANIFEST_PATH: "/private/offline/plan.json", GEOAI_QUALITY20_MANIFEST_SHA256: "a".repeat(64), GEOAI_QUALITY20_CASE_ID: "A01-Q" };
const child = buildLiveJourneyChildEnvironment({ expectedCommitSha: base.commit,
  liveJourney: { scope: base.scope, previewUrl: `https://${base.previewHost}`, ledgerId: "offline", ledgerRoot: "/private/offline", ledgerPath: "/private/offline/ledger.json", liveApproval: "offline", quality20Environment: settings }
}, [{ email: "offline@example.invalid", password: "offline-only-password", userId: "offline" }], { GEOAI_E2E_BASE_URL: `https://${base.previewHost}`, UNRELATED_SECRET: "must-not-forward", OPENAI_API_KEY: "must-not-forward" });
for (const [name, value] of Object.entries(settings)) assert.equal(child[name], value);
assert.equal(child.UNRELATED_SECRET, undefined); assert.equal(child.OPENAI_API_KEY, undefined);
console.log("PASS: offline case-bound bridge parsing, exact depth, nonpaid acquisition status and credential exclusion. No bridge execution.");
