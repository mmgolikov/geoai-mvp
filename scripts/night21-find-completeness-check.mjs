import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { LIVE_JOURNEY_STEPS, LIVE_JOURNEY_DIAGNOSTIC_SCHEMA, parseLiveJourneyDiagnostic, canonicalLiveJourneyCompletedSteps } from "./sprint10-live-journey-diagnostics.mjs";

const source = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
const between = (start, end) => {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
};
const exactKeys = between("function exactObjectKeys", "function isoTimestamp");
const updateGate = between("function acceptedFindCriteriaUpdate", "async function savedFindArtifactBytes");
const accepts = new Function("record", `${stripTypeScriptTypes(exactKeys + updateGate, { mode: "transform" })}; return acceptedFindCriteriaUpdate;`)(
  value => typeof value === "object" && value !== null && !Array.isArray(value));

// Exercise the actual pre-dispatch predicate: only the explicit mapped-level
// change and the frozen current viewport may cross the existing source gate.
for (const [marketKey, group, bounds] of [
  ["dubai", "hospitality", [55.2, 25.1, 55.21, 25.11]],
  ["singapore", "commercial_office", [103.86, 1.28, 103.861, 1.281]],
  ["dubai", "construction", [55.352, 25.199, 55.369, 25.214]]
]) {
  const original = { marketKey, group, bounds, locale: "en", limit: 12, mappedMinimumLevels: null, mappedMaximumLevels: null };
  const updated = { ...original, mappedMinimumLevels: 2 };
  assert.equal(accepts(updated, original, bounds), true);
  assert.equal(accepts(original, original, bounds), false, "unchanged criteria must be denied");
  for (const [key, value] of Object.entries({ marketKey: "moscow", group: "residential", locale: "ru", limit: 20,
    mappedMinimumLevels: 3, mappedMaximumLevels: 8, bounds: [0, 0, 1, 1] })) {
    assert.equal(accepts({ ...updated, [key]: value }, original, bounds), false, `deny drift in ${key}`);
  }
  for (const key of Object.keys(updated)) {
    const missing = { ...updated }; delete missing[key];
    assert.equal(accepts(missing, original, bounds), false, `deny missing ${key}`);
  }
  assert.equal(accepts({ ...updated, unexpected: true }, original, bounds), false);
  for (const invalid of [null, [], "invalid"]) assert.equal(accepts(invalid, original, bounds), false);
}

const dubai = between("async function runDubaiFind", "async function runFindCohort");
const cohort = between("async function runFindCohort", "function acceptedFindCriteriaUpdate");
const updateReset = between("async function verifyFindCriteriaUpdateAndReset", "async function runSingaporeFind");
const singapore = between("async function runSingaporeFind", "type LiveCreateCase");
const createProgress = new Function("LIVE_JOURNEY_STEPS", "canonicalLiveJourneyCompletedSteps", "guard",
  `${stripTypeScriptTypes(between("function createLiveProgress()", "function cleanupStage("), { mode: "transform" })}; return createLiveProgress;`
)(LIVE_JOURNEY_STEPS, canonicalLiveJourneyCompletedSteps, (condition, message) => assert.ok(condition, message));
const selectionBlock = cohort.slice(cohort.indexOf('progress.start("find_compare_select")'), cohort.indexOf('progress.start("find_compare_compact")'));
async function runSelection(block) {
  const progress = createProgress();
  let count = 0;
  const candidates = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const items = { nth: () => ({ getByRole: () => ({ click: async () => { count++; } }) }),
    getByRole: () => ({ get count() { return count; } }) };
  const expect = value => ({ toHaveCount: async expected => assert.equal(value.count, expected) });
  expect.poll = callback => ({ toBe: async expected => assert.equal(await callback(), expected) });
  const execute = new Function("items", "candidates", "selectedCandidates", "progress", "expect", "localArtifactState", "configuration", "page",
    `return (async () => { ${stripTypeScriptTypes(block, { mode: "transform" })} })();`);
  await execute(items, candidates, candidates, progress, expect, async () => ({ shortlistCount: count }), { userId: "offline" }, {});
  assert.equal(count, 3);
  for (const stage of ["find_shortlist_two", "find_shortlist_three", "find_compare_select"]) assert.ok(progress.completed().includes(stage));
}
await runSelection(selectionBlock);
await assert.rejects(() => runSelection(selectionBlock.replace('progress.complete("find_shortlist_three");\n  progress.start("find_compare_select");',
  'progress.complete("find_shortlist_three");')), /step order is invalid/, "the actual root failure must remain rejected by the unchanged progress guard");
// The other newly added success-path stages are sequential: exercise the real
// strict progress producer over every start/complete call, not allowlist alone.
const updateProgress = createProgress();
for (const [, operation, stage] of updateReset.matchAll(/progress\.(start|complete)\("([a-z_]+)"\)/g)) updateProgress[operation](stage);
assert.match(dubai, /runFindCohort\(page,[\s\S]*?"dubai"/);
assert.match(singapore, /runFindCohort\(page,[\s\S]*?"singapore"/);
assert.match(cohort, /candidates.length < 3/);
assert.match(cohort, /selectedCandidates.slice\(0, 2\)/);
assert.ok(cohort.indexOf('progress.complete("find_shortlist_two")') < cohort.indexOf("candidates.indexOf(selectedCandidates[2])"));
assert.ok(cohort.indexOf('progress.complete("find_shortlist_three")') < cohort.indexOf('name: "Compare selected"'));
assert.match(cohort, /caseKey: marketKey/);
assert.match(cohort, /expect\(saved.marketKey\).toBe\(marketKey\)/);
assert.match(cohort, /const runCandidateAnalysis = configuration.scope === "dubai-find-analysis" \|\| construction/);
assert.ok(cohort.lastIndexOf("verifyFindCriteriaUpdateAndReset(") > cohort.lastIndexOf('progress.complete("find_return_paid_count")'));
assert.match(updateReset, /assertNoReplay\(beforeChange, policy.snapshotJourneyRequests\(\)\)/);
assert.match(updateReset, /expect\(payload.criteria\).toEqual\(updatedRequest\)/);
assert.match(updateReset, /key === "POST \/api\/prototype\/point-to-object\/find" \? 1 : 0/);
assert.match(updateReset, /expect\(savedAfterUpdate\[id\]\).toBe\(bytes\)/);
assert.match(updateReset, /expect\(await savedFindArtifactBytes\(page, configuration.userId\)\).toEqual\(savedAfterUpdate\)/);
assert.match(updateReset, /assertNoReplay\(beforeReset, policy.snapshotJourneyRequests\(\)\)/);
assert.equal((updateReset.match(/await cta.click\(\)/g) ?? []).length, 1, "exactly one explicit source update");
assert.doesNotMatch(updateReset, /route.fulfill|request.post|fetch\(/, "live source results must not be invented");
for (const stage of ["find_shortlist_two", "find_shortlist_three", "find_criteria_stale", "find_criteria_update_request", "find_criteria_update_response", "find_reset_saved_artifacts"]) {
  assert.ok(LIVE_JOURNEY_STEPS.includes(stage));
  assert.ok(source.includes(`progress.start("${stage}")`) && source.includes(`progress.complete("${stage}")`));
  const diagnostic = { schemaVersion: LIVE_JOURNEY_DIAGNOSTIC_SCHEMA, primaryStatus: "failed", primaryStage: stage, cleanupStage: null, completedSteps: [] };
  assert.deepEqual(parseLiveJourneyDiagnostic(diagnostic), diagnostic);
}
console.log("NIGHT21 Find completeness: request admission positive/negative checks, market reuse, ordered 2-to-3/stale/update/reset and strict diagnostics PASS (offline; no live source or AI calls).");
