import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { selectPlan } from "./select-tests.mjs";

const repo = new URL("../", import.meta.url);
const registry = JSON.parse(readFileSync(new URL("./impact-map.json", import.meta.url), "utf8"));
const pkg = JSON.parse(readFileSync(new URL("package.json", repo), "utf8"));

test("Create selects a bounded downstream plan", () => {
  const plan = selectPlan(["src/lib/prototype/point-to-object-create.ts"]);
  assert.deepEqual(plan.components, ["CREATE"]);
  assert.deepEqual(plan.baseline, ["lint", "build"]);
  assert.equal(plan.fullCiRequired, false);
  assert.equal(plan.liveReviewRequired, true);
  assert.ok(plan.e2eFiles.includes("tests/e2e/point-to-object-create-reliability.spec.ts"));
  assert.ok(plan.e2eFiles.includes("tests/e2e/sprint20-create-map.spec.ts"), "Map/Model regression");
  assert.ok(plan.e2eFiles.includes("tests/e2e/complete26-create-analogues.spec.ts"), "save/reopen regression");
});

test("Real point-to-object component paths map to their owners", () => {
  for (const [path, owner] of [
    ["components/point-to-object/create-panel.tsx", "CREATE"],
    ["components/point-to-object/analysis-client.tsx", "ANALYSE"],
    ["components/point-to-object/express-overview.tsx", "ANALYSE"],
    ["components/point-to-object/find-comparison-dashboard.tsx", "COMPARE"],
    ["components/point-to-object/use-point-object-cloud-sync.ts", "STORAGE"]
  ]) {
    const plan = selectPlan([path]);
    assert.equal(plan.fullCiRequired, false, path);
    assert.ok(plan.reasons.some(reason => reason.includes(`${path} -> ${owner}`)), path);
  }
  assert.equal(selectPlan(["components/point-to-object/use-point-object-cloud-sync.ts"]).liveReviewRequired, true);
});

test("Find includes the exact Find to Analyse browser journey", () => {
  const plan = selectPlan(["src/lib/prototype/point-to-object-find.ts"]);
  assert.ok(plan.e2eFiles.includes("tests/e2e/quality20-map-find.spec.ts"));
  assert.ok(plan.e2eFiles.includes("tests/e2e/point-to-object-v5-offline-flow.spec.ts"), "current Find comparison flow");
});

test("Context includes transitive consumers", () => {
  const plan = selectPlan(["src/lib/prototype/point-to-object-area-context.ts"]);
  for (const id of ["CONTEXT", "ANALYSE", "FIND", "COMPARE", "CREATE"]) assert.ok(plan.components.includes(id));
  assert.equal(plan.fullCiRequired, false);
});

test("Review02 helpers keep new contracts and downstream journeys in CI", () => {
  for (const path of [
    "src/lib/prototype/point-to-object-normalized-context.ts",
    "src/lib/prototype/point-to-object-comparison-core.ts",
    "src/lib/prototype/point-to-object-source-admission.ts",
    "src/lib/prototype/point-to-object-volume-edges.ts",
    "components/point-to-object/context-dashboard.tsx"
  ]) {
    const plan = selectPlan([path]);
    assert.equal(plan.fullCiRequired, false, path);
    assert.ok(plan.components.includes("REVIEW02"), path);
    for (const name of ["test:review02-data", "test:review02-map"]) {
      assert.equal(plan.npmScripts.filter(item => item === name).length, 1, `${path}: ${name}`);
    }
    assert.ok(plan.e2eFiles.includes("tests/e2e/review29-map-persistence.spec.ts"), path);
    assert.equal(plan.liveReviewRequired, true, path);
  }
  const workflow = readFileSync(new URL(".github/workflows/geoai-quality-gate.yml", repo), "utf8");
  for (const name of ["test:review02-data", "test:review02-map"]) assert.ok(workflow.includes(`npm run ${name}`), name);
});

test("Unknown, schema, and auth require broad coverage", () => {
  for (const path of ["src/lib/new-feature.ts", "supabase/migrations/20260928.sql", "src/lib/auth/request-context.ts", "package-lock.json", "src/lib/prototype/point-to-object-schema.ts"]) {
    const plan = selectPlan([path]);
    assert.equal(plan.fullCiRequired, true, path);
    assert.equal(plan.components.length, Object.keys(registry.components).length, path);
    assert.ok(plan.npmScripts.length > 0, path);
  }
});

test("Ordinary prose needs documentation validation only", () => {
  const plan = selectPlan(["docs/overview.md", "deliverables/brief.txt"]);
  assert.equal(plan.status, "docs_only");
  assert.deepEqual(plan.npmScripts, []);
  assert.deepEqual(plan.e2eFiles, []);
  assert.match(plan.reasons.join(" "), /validate links and claims/);
});

test("Rename examines both old and new paths", () => {
  const plan = selectPlan([{ oldPath: "src/lib/prototype/point-to-object-create.ts", newPath: "src/lib/auth/request-context.ts" }]);
  assert.equal(plan.fullCiRequired, true);
  assert.equal(plan.changedPaths.length, 2);
});

test("Empty input makes no passing claim", () => {
  const plan = selectPlan([]);
  assert.equal(plan.status, "no_changes");
  assert.deepEqual(plan.baseline, []);
  assert.match(plan.reasons[0], /no pass is claimed/);
});

test("Invalid, parent, and absolute paths conservatively require full review", () => {
  for (const path of ["", "../src/lib/prototype/point-to-object-create.ts", "/tmp/point-to-object-create.ts"]) {
    const plan = selectPlan([path]);
    assert.equal(plan.fullCiRequired, true, path);
    assert.equal(plan.components.length, Object.keys(registry.components).length, path);
  }
});

test("Every referenced script and browser file exists", () => {
  for (const [id, spec] of Object.entries(registry.components)) {
    for (const name of spec.scripts) assert.ok(Object.hasOwn(pkg.scripts, name), `${id}: ${name}`);
    for (const path of spec.e2e) assert.ok(existsSync(new URL(path, repo)), `${id}: ${path}`);
    for (const child of spec.dependents) assert.ok(Object.hasOwn(registry.components, child), `${id}: ${child}`);
  }
});
