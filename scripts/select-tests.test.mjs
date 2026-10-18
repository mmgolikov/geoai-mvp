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

test("D2 admitted sources retain strict contracts and downstream coverage", () => {
  for (const path of [
    "src/lib/prototype/point-to-object-context-details-v2.ts",
    "src/lib/prototype/point-to-object-independent-context.ts",
    "src/lib/prototype/point-to-object-overture-snapshot.ts",
    "src/lib/prototype/point-to-object-overture-projection-bindings.ts",
    "src/data/prototype/d2-overture-places.json",
    "public/data/d2-overture/LICENSES.json",
    "components/point-to-object/independent-source-context.tsx",
    "scripts/d2-context-vertical-check.mjs",
    "src/lib/prototype/point-to-object-u4-independent-context.ts",
    "src/lib/prototype/point-to-object-u4-snapshot.ts",
    "src/lib/prototype/point-to-object-area-source-context-v2.ts",
    "src/lib/prototype/point-to-object-area-source-snapshot.ts",
    "scripts/d2-area-source-check.mjs",
    "src/data/prototype/d2-overture-u4-places.json",
    "public/data/d2-overture-u4/LICENSES.json",
    "scripts/d2-context-http-contract-check.mjs",
    "tests/e2e/d2-context-vertical.spec.ts",
    "tests/e2e/helpers/d2-context-fixture.ts",
    "tests/fixtures/d2-context/transport.json"
  ]) {
    const plan = selectPlan([path]);
    assert.equal(plan.fullCiRequired, false, path);
    for (const id of ["D2_CONTEXT", "CONTEXT", "ANALYSE", "COMPARE", "CREATE", "STORAGE", "LIMITS"]) assert.ok(plan.components.includes(id), `${path}: ${id}`);
    assert.equal(plan.npmScripts.filter(name => name === "test:d2-context-vertical").length, 1, path);
    assert.equal(plan.npmScripts.filter(name => name === "test:d2-context-http-contract").length, 1, path);
    assert.equal(plan.npmScripts.filter(name => name === "test:d2-area-source").length, 1, path);
    assert.equal(plan.liveReviewRequired, true, path);
    assert.ok(plan.e2eFiles.includes("tests/e2e/point-object-project-restoration-readiness.spec.ts"), path);
    assert.ok(plan.e2eFiles.includes("tests/e2e/d2-context-vertical.spec.ts"), path);
  }
  const workflow = readFileSync(new URL(".github/workflows/geoai-quality-gate.yml", repo), "utf8");
  assert.equal(pkg.scripts["test:d2-context-vertical"], "node scripts/d2-context-vertical-check.mjs");
  assert.equal(workflow.split("npm run test:d2-context-vertical").length - 1, 1);
  assert.ok(workflow.includes("artifacts/d2-context-vertical-check.txt"));
  assert.equal(pkg.scripts["test:d2-context-http-contract"], "node scripts/d2-context-http-contract-check.mjs");
  assert.equal(workflow.split("npm run test:d2-context-http-contract").length - 1, 1);
  assert.ok(workflow.includes("artifacts/d2-context-http-contract-check.txt"));
  assert.equal(pkg.scripts["test:d2-area-source"], "node scripts/d2-area-source-check.mjs");
  assert.equal(workflow.split("npm run test:d2-area-source").length - 1, 1);
  assert.ok(workflow.includes("artifacts/d2-area-source-check.txt"));
  assert.ok(pkg.scripts["test:e2e:point-to-object-v5:demo"].includes("tests/e2e/d2-context-vertical.spec.ts"));
  const webkit = readFileSync(new URL("playwright.product-https.config.ts", repo), "utf8");
  assert.ok(webkit.includes('"d2-context-vertical.spec.ts"'));
  const harness = readFileSync(new URL("scripts/product-https-harness-check.mjs", repo), "utf8");
  assert.ok(harness.includes('"d2-context-vertical.spec.ts"'));
  assert.equal(selectPlan(["src/lib/prototype/point-to-object-unadmitted-source.ts"]).fullCiRequired, true);
});

test("D2 citation and immutable replay checks are selected and wired into both browser gates", () => {
  const paths = [
    "src/lib/prototype/point-to-object-citation-context.ts",
    "src/lib/prototype/d2-scenario-screening.ts",
    "components/point-to-object/d2-source-evidence.tsx",
    "scripts/d2-citation-context-check.mjs",
    "scripts/d2-source-citation-closure-check.mjs",
    "tests/d2-u1-formation-diagnostics.test.mjs",
    "tests/e2e/d2-source-citation-closure.spec.ts",
    "tests/e2e/helpers/d2-citation-fixture.ts",
    "tests/e2e/d2-u1-failure-observation.spec.ts",
    "tests/fixtures/d2-source-citation-closure/recorded-public-result.json",
    "tests/fixtures/d2-u1-retry/formation-diagnostics.json"
  ];
  for (const path of paths) {
    const plan = selectPlan([path]);
    assert.equal(plan.fullCiRequired, false, path);
    for (const id of ["D2_CONTEXT", "CONTEXT", "ANALYSE", "COMPARE", "CREATE", "STORAGE", "LIMITS"]) assert.ok(plan.components.includes(id), path + ": " + id);
    for (const name of ["test:d2-citation-context", "test:d2-source-citation-closure", "test:d2-u1-formation-diagnostics"]) assert.equal(plan.npmScripts.filter(item => item === name).length, 1, path + ": " + name);
    for (const spec of ["d2-source-citation-closure", "d2-u1-failure-observation"]) assert.ok(plan.e2eFiles.includes("tests/e2e/" + spec + ".spec.ts"), path + ": " + spec);
  }
  const workflow = readFileSync(new URL(".github/workflows/geoai-quality-gate.yml", repo), "utf8");
  for (const name of ["test:d2-citation-context", "test:d2-source-citation-closure", "test:d2-u1-formation-diagnostics"]) assert.equal(workflow.split("npm run " + name).length - 1, 1, name);
  const https = readFileSync(new URL("playwright.product-https.config.ts", repo), "utf8");
  const harness = readFileSync(new URL("scripts/product-https-harness-check.mjs", repo), "utf8");
  for (const spec of ["d2-source-citation-closure", "d2-u1-failure-observation"]) {
    const filename = spec + ".spec.ts";
    assert.ok(pkg.scripts["test:e2e:point-to-object-v5:demo"].includes("tests/e2e/" + filename), filename);
    assert.ok(https.includes(JSON.stringify(filename)), filename);
    assert.ok(harness.includes(JSON.stringify(filename)), filename);
  }
});

test("Review02 helpers keep new contracts and downstream journeys in CI", () => {
  for (const path of [
    "src/lib/prototype/point-to-object-normalized-context.ts",
    "src/lib/prototype/point-to-object-comparison-core.ts",
    "src/lib/prototype/point-to-object-source-admission.ts",
    "src/lib/prototype/point-to-object-volume-edges.ts",
    "src/lib/prototype/point-to-object-create-map-conflict.ts",
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
  assert.ok(pkg.scripts["test:review02-map"].includes("scripts/review02-create-map-conflict-check.mjs"), "Create conflict safety stays in the existing CI map gate");
});

test("D2 local browser servers explicitly exercise the Preview-only public verification UI", () => {
  const workflow = readFileSync(new URL(".github/workflows/geoai-quality-gate.yml", repo), "utf8");
  for (const name of ["Browser demo-public product flow", "Optimized HTTPS product WebKit"]) {
    const marker = `      - name: ${name}\n`;
    const offset = workflow.indexOf(marker);
    assert.notEqual(offset, -1, name);
    const next = workflow.indexOf("\n      - name:", offset + marker.length);
    const step = workflow.slice(offset, next < 0 ? undefined : next);
    assert.match(step, /\n        env:\n(?:[^\n]*\n)*?          VERCEL_ENV: preview\n/, name);
    assert.match(step, /GEOAI_ALLOW_DEMO_PUBLIC: "true"/, name);
  }
  assert.equal(workflow.match(/VERCEL_ENV: preview/g)?.length, 2, "Preview flag is bounded to the two local browser-server steps, not hosted configuration");
  for (const path of ["app/prototype/point-to-object/page.tsx", "app/prototype/point-to-object/analysis/page.tsx"]) {
    assert.match(readFileSync(new URL(path, repo), "utf8"), /verificationEnabled=\{process\.env\.VERCEL_ENV === "preview"\}/, path);
  }
});

test("Workspace return regression remains in both product browser gates", () => {
  const spec = "tests/e2e/review02-workspace-return.spec.ts";
  const plan = selectPlan(["components/point-to-object/prototype-client-v5.tsx"]);
  assert.ok(plan.e2eFiles.includes(spec));
  const pkg = JSON.parse(readFileSync(new URL("package.json", repo), "utf8"));
  assert.ok(pkg.scripts["test:e2e:point-to-object-v5:demo"].includes(spec));
  const webkit = readFileSync(new URL("playwright.product-https.config.ts", repo), "utf8");
  assert.ok(webkit.includes('"review02-workspace-return.spec.ts"'));
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
