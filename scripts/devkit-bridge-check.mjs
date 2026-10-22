import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const ts = createRequire(import.meta.url)("typescript");
registerHooks({
  resolve(specifier, context, next) {
    const local = specifier.startsWith("@/") ? pathToFileURL(path.join(root, specifier.slice(2))).href : specifier;
    if (!context.parentURL?.includes("/node_modules/") && /^(file:|\.\.?\/)/.test(local) && !/\.[cm]?[jt]sx?$/.test(local)) {
      try { return next(`${local}.ts`, context); } catch { return next(`${local}.tsx`, context); }
    }
    return next(local, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText };
    return next(url, context);
  }
});
const { createDevkitDemoProject } = await import("../src/lib/devkit/fixtures.ts");
const { bridgeSavedCreateAoi } = await import("../src/lib/devkit/project-bridge.ts");
const create = await import("../src/lib/prototype/point-to-object-create.ts");
const { parseSavedPointObjectArtifact } = await import("../src/lib/prototype/point-object-projects-contract.ts");
const seed = createDevkitDemoProject();
const now = "2026-10-22T14:40:00.000Z";
const { revision, crs, provenance, ...aoi } = seed.aoi;
const program = create.validateRedevelopmentProgram(create.conceptTemplate("residential_mixed_use", "en"));
assert.equal(program.ok, true);
const massing = create.generateConceptMassing(aoi.coordinates, program.value, "devkit-bridge-synthetic", "A");
const artifact = {
  schemaVersion: 1, artifactId: "synthetic-old-create", idempotencyKey: "bridge-fixture", payloadHash: "a".repeat(64), completedAt: now, updatedAt: now, viewRevision: 0,
  kind: "create", locale: "en", marketKey: "dubai", label: "Synthetic bridge fixture, not a paid result",
  payload: { aoi, editorSnapshot: null, generatedLocale: "en", activeAlternativeId: "A", areaContext: null,
    generated: { mode: "openai_concept", generatedAt: now, promptVersion: "POINT_OBJECT_CREATE_SYNTHETIC_TEST_ONLY", program: program.value, massing,
      telemetry: { model: "synthetic-not-a-provider-call", reasoningEffort: "none", latencyMs: 0, attempts: 1, estimatedCostUsd: null }, caveat: seed.caveat } }
};
assert.ok(parseSavedPointObjectArtifact(artifact), "fixture follows the existing producer/parser shape");
const sourceProject = { schemaVersion: 1, projectId: "old-project", name: "Public selected area", storageMode: "browser_local_on_this_device", createdAt: now, updatedAt: now, artifacts: [artifact] };
const original = JSON.stringify(sourceProject);
let assertions = 1, networkCalls = 0;
const savedFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls++; throw new Error("Network not allowed in bridge tests"); };
try {
  const input = { sourceProject, sourceArtifactId: artifact.artifactId, publicInputConfirmed: true, projectId: "new-project", now, locale: "en" };
  for (const locale of ["en", "ru"]) {
    const result = bridgeSavedCreateAoi({ ...input, locale });
    assert.equal(result.ok, true); assertions++;
    assert.deepEqual(result.project.aoi.coordinates, aoi.coordinates); assertions++;
    assert.equal(result.project.aoi.provenance, "user_provided"); assertions++;
    assert.equal(result.project.objects.length, 0, "AOI never becomes parcel/building/POI"); assertions++;
    assert.equal(result.project.claims[0].value, null); assertions++;
    assert.equal(result.project.evidence[0].acquiredAt, null, "copy time is not source acquisition time"); assertions++;
    assert.equal(result.project.evidence[0].responseHash, artifact.payloadHash); assertions++;
    assert.equal(result.project.evidence[0].rights.redistribution, "unknown"); assertions++;
    assert.equal(result.project.designVersions.length, 2); assertions++;
    assert.notDeepEqual(result.project.designVersions[0].program.useMix, result.project.designVersions[1].program.useMix); assertions++;
    assert.equal(result.project.designVersions.every(d => d.buildings.length === 0), true, "old stacked geometry is not flattened or presented as newly generated"); assertions++;
    assert.equal(result.project.derivedArtifacts.length, 0); assertions++;
    result.project.aoi.coordinates[0][0][0] += 1;
    assert.equal(JSON.stringify(sourceProject), original, "new draft does not mutate legacy save"); assertions++;
  }
  for (const delta of [{ publicInputConfirmed: false }, { sourceArtifactId: "foreign-artifact" }, { projectId: "" }, { now: "invalid" }]) {
    assert.equal(bridgeSavedCreateAoi({ ...input, ...delta }).ok, false); assertions++;
  }
  const damaged = structuredClone(sourceProject);
  damaged.artifacts[0].payload.aoi.coordinates[0][1] = [NaN, 2];
  assert.equal(bridgeSavedCreateAoi({ ...input, sourceProject: damaged }).ok, false); assertions++;
  assert.equal(JSON.stringify(sourceProject), original); assertions++;
  assert.equal(networkCalls, 0); assertions++;
} finally { globalThis.fetch = savedFetch; }
console.log(JSON.stringify({ suite: "devkit-bridge", status: "PASS", assertions, networkCalls, boundary: "synthetic offline adapter checks; not browser owner isolation or paid/live acceptance" }));
