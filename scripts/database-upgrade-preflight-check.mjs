import assert from "node:assert/strict";
import { binding, digest, evaluate, expectedFingerprint, manifest, pendingVersions, targetRef, validatePlan, validateReadback } from "./database-upgrade-preflight.mjs";

const now = Date.now();
const receipt = {
  schemaVersion: "geoai-populated-target-readback-v1", projectRef: targetRef,
  environment: "development", productionProject: false, observedAt: new Date(now).toISOString(), ...binding,
  collection: "read_only_catalog_and_known_health_seed_predicate_no_customer_or_auth_rows",
  healthcheck: structuredClone(expectedFingerprint),
  ledger: manifest.liveAppliedMigrations.map((row) => ({ ...row, statementCount: 1 }))
};
let cases = 0;
const check = (name, change) => {
  const candidate = structuredClone(receipt); change(candidate);
  assert.notEqual(validateReadback(candidate, now).length, 0, name); cases++;
};
assert.deepEqual(validateReadback(receipt, now), []); cases++;
check("other project", (r) => r.projectRef = "bkmfcjzalcvdsdvyxpgi");
check("Production", (r) => r.productionProject = true);
check("wrong environment", (r) => r.environment = "production");
check("wrong schema", (r) => r.schemaVersion = "geoai-empty-target-readback-v1");
check("stale", (r) => r.observedAt = new Date(now - 30 * 60_000 - 1).toISOString());
check("future", (r) => r.observedAt = new Date(now + 1).toISOString());
check("missing timestamp", (r) => delete r.observedAt);
check("wrong SQL tree", (r) => r.sqlTreeSha256 = "0".repeat(64));
check("wrong manifest", (r) => r.manifestSha256 = "0".repeat(64));
check("wrong scope", (r) => r.collection = "unknown");
check("missing seed", (r) => r.healthcheck.known_seed_matches = false);
check("changed grants", (r) => r.healthcheck.caller_privileges.anon.push("INSERT"));
check("extra policy", (r) => r.healthcheck.policies.push(r.healthcheck.policies[0]));
check("RLS off", (r) => r.healthcheck.rls = false);
check("different columns", (r) => r.healthcheck.columns[0].type = "integer");
check("missing ledger", (r) => delete r.ledger);
check("empty ledger", (r) => r.ledger = []);
check("extra version", (r) => r.ledger.push({ version: "20999999999999" }));
check("missing version", (r) => r.ledger.pop());
check("duplicate version", (r) => r.ledger[1] = r.ledger[0]);
check("reordered ledger", (r) => r.ledger.reverse());
check("applied content drift", (r) => r.ledger[0].statementMd5 = "0".repeat(32));
check("statement count drift", (r) => r.ledger[0].statementCount = 2);
check("byte count drift", (r) => r.ledger[0].statementBytes++);
const repaired = structuredClone(receipt);
repaired.ledger.unshift({ version: "20260705100000" });
assert.deepEqual(validateReadback(repaired, now), []); cases++;
const receiptSha = digest(JSON.stringify(repaired));
const plan = {
  schemaVersion: "geoai-supplied-dryrun-plan-v1", resolvedProjectRef: targetRef,
  observedAt: new Date(now).toISOString(), ...binding, readbackSha256: receiptSha,
  argv: ["db", "push", "--linked", "--dry-run", "--include-all"],
  exitCode: 0, versions: [...pendingVersions], rawOutputSha256: "f".repeat(64)
};
assert.deepEqual(validatePlan(plan, repaired, receiptSha, now), []); cases++;
assert.notEqual(validatePlan(plan, receipt, receiptSha, now).length, 0); cases++;
for (const [name, change] of [
  ["no include-all", (p) => p.argv.pop()],
  ["auto apply", (p) => p.argv.push("--yes")],
  ["seed", (p) => p.argv.push("--include-seed")],
  ["roles", (p) => p.argv.push("--include-roles")],
  ["wrong ref", (p) => p.resolvedProjectRef = "wrong"],
  ["reorder", (p) => p.versions.reverse()],
  ["missing migration", (p) => p.versions.pop()],
  ["extra migration", (p) => p.versions.push("20999999999999")],
  ["nonzero exit", (p) => p.exitCode = 1],
  ["unbound readback", (p) => p.readbackSha256 = "0".repeat(64)],
  ["missing output digest", (p) => delete p.rawOutputSha256],
  ["old plan", (p) => p.observedAt = new Date(now - 1).toISOString()],
  ["future plan", (p) => p.observedAt = new Date(now + 1).toISOString()],
  ["wrong SQL", (p) => p.sqlTreeSha256 = "0".repeat(64)]
]) {
  const candidate = structuredClone(plan); change(candidate);
  assert.notEqual(validatePlan(candidate, repaired, receiptSha, now).length, 0, name); cases++;
}
for (const [readback, dryrun] of [[undefined, undefined], [receipt, undefined], [repaired, undefined], [repaired, plan], [{}, plan]]) {
  const result = evaluate(readback, receiptSha, dryrun, now);
  assert.equal(result.hostedApplyReady, false);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.networkOrDatabaseAccessPerformed, false);
  assert.equal(result.remoteStateVerified, false);
  cases++;
}
console.log(`Offline populated-target preflight: ${cases} cases PASS. Synthetic fixtures only; no hosted operation or authorization.`);
