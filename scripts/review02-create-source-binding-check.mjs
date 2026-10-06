import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isBuiltin, registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

// Focused owner regression: synthetic server-shaped results, real parsers and
// browser-local persistence. No provider/source/server request is permitted.
const root = new URL("../", import.meta.url);
let browserImportGuardActive = false;
const browserRuntimeModules = new Set();
registerHooks({
  resolve(specifier, context, next) {
    if (browserImportGuardActive && (isBuiltin(specifier) || specifier.startsWith("node:") || specifier === "server-only")) {
      throw new Error(`Browser import graph contains a server runtime dependency: ${specifier}`);
    }
    const resolved = specifier.startsWith("@/") ? next(new URL(`${specifier.slice(2)}.ts`, root).href, context) :
      (specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier) ? next(`${specifier}.ts`, context) :
        next(specifier, context);
    if (browserImportGuardActive && resolved.url.startsWith(root.href)) browserRuntimeModules.add(resolved.url.slice(root.href.length));
    return resolved;
  },
  load(url, context, next) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return {
      format: "module", shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url })
    };
    return next(url, context);
  }
});

let checks = 0;
let networkCalls = 0;
let projectRoundTrips = 0;
const sessionOnly = process.argv.includes("--session-only");
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls++; throw new Error("Network/provider calls forbidden in this focused synthetic check"); };
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
function ok(value, message) { assert.ok(value, message); checks++; }

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
class ProjectEvent extends Event {
  constructor(type, init) { super(type); this.detail = init.detail; }
}
Object.assign(globalThis, {
  CustomEvent: ProjectEvent,
  window: { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage(), dispatchEvent: () => true }
});

try {
  // Run in a fresh process, before the server-side normalizer imports crypto.
  // Resolve the real transitive runtime imports after TS type erasure. No
  // crypto polyfill, mocked package or fallback is used. This guard is NOT a
  // webpack/component/application build; independent web bundling remains QA.
  browserImportGuardActive = true;
  const parser = await import(new URL("src/lib/prototype/point-to-object-create-result.ts", root).href);
  const programme = await import(new URL("src/lib/prototype/point-to-object-programme-context.ts", root).href);
  const browserGraph = [...browserRuntimeModules].sort();
  ok(browserGraph.includes("src/lib/prototype/point-to-object-area-context-limits.ts"), "browser helpers share the immutable import-free limits module");
  ok(!browserGraph.includes("src/lib/prototype/point-to-object-area-context-contract.ts") && !browserGraph.includes("src/lib/point-to-object/hash.ts"), "client helper runtime graph excludes server contract/hash modules");
  await assert.rejects(() => import("node:crypto"), /Browser import graph contains a server runtime dependency: node:crypto/);
  checks++;
  browserImportGuardActive = false;
  const limits = await import(new URL("src/lib/prototype/point-to-object-area-context-limits.ts", root).href);
  const create = await import(new URL("src/lib/prototype/point-to-object-create.ts", root).href);
  const core = await import(new URL("src/lib/prototype/point-to-object-create-ai-core.ts", root).href);
  const areaContract = await import(new URL("src/lib/prototype/point-to-object-area-context-contract.ts", root).href);
  equal([limits.POINT_OBJECT_AREA_UPSTREAM_LIMIT, limits.POINT_OBJECT_AREA_FEATURE_LIMIT], [300, 80], "shared server/browser limits retain exact producer values");
  equal([areaContract.POINT_OBJECT_AREA_UPSTREAM_LIMIT, areaContract.POINT_OBJECT_AREA_FEATURE_LIMIT], [limits.POINT_OBJECT_AREA_UPSTREAM_LIMIT, limits.POINT_OBJECT_AREA_FEATURE_LIMIT], "existing server contract exports the same immutable limits");
  const session = await import(new URL("src/lib/prototype/point-to-object-create-session.ts", root).href);
  const projects = sessionOnly ? null : await import(new URL("src/lib/prototype/point-object-projects.ts", root).href);
  const stamp = "2026-10-05T18:00:00.000Z";
  const coordinates = [[[55.2808, 25.2182], [55.2828, 25.2182], [55.2828, 25.2197], [55.2808, 25.2197], [55.2808, 25.2182]]];
  const validatedAoi = create.validatePointObjectCreateAoiVertices(coordinates[0].slice(0, -1));
  ok(validatedAoi.ok, "synthetic AOI uses actual geometry validation");
  const aoi = { id: "create-aoi-source-binding-regression", coordinates, vertexCount: 4,
    areaSqM: validatedAoi.measurements.areaSqM, perimeterM: validatedAoi.measurements.perimeterM };
  const validatedProgram = create.validateRedevelopmentProgram({ templateId: "residential_mixed_use",
    title: "Synthetic courtyard programme", summary: "Synthetic local regression fixture, not a customer proposal.",
    massingStyle: "courtyard", blockCount: 5, levelsMin: 6, levelsMax: 12,
    targetSiteCoveragePct: 28, openSpacePct: 35, setbackM: 8,
    useMix: [{ use: "residential", sharePct: 72 }, { use: "retail", sharePct: 18 }, { use: "open_space", sharePct: 10 }],
    rationale: ["Synthetic screening fixture; no adequacy conclusion."] });
  ok(validatedProgram.ok, "synthetic programme uses actual validation");
  const program = validatedProgram.value;
  const alternatives = create.generateConceptMassingAlternatives(coordinates, program, core.createProgramSeed(program, "a".repeat(64)), "en");
  equal(alternatives.map(item => item.id), ["A", "B"], "fixture exercises actual local A/B geometry kernel without AI");
  const generated = { mode: "openai_concept", generatedAt: stamp, promptVersion: core.POINT_OBJECT_CREATE_PROMPT_VERSION,
    program, massing: alternatives[0].massing, alternatives,
    telemetry: { model: "gpt-5.6-sol", reasoningEffort: "medium", latencyMs: 1, attempts: 1,
      estimatedCostUsd: null, stored: false, toolCalls: 0 }, caveat: parser.POINT_OBJECT_CREATE_RESULT_CAVEAT };
  function makeArea(count = 4, locale = "en") {
    const elements = Array.from({ length: count }, (_, index) => ({ type: "way", id: index + 1,
      center: { lon: 55.2815 + (index % 10) / 100000, lat: 25.2188 },
      tags: index % 4 === 0 ? { building: "apartments", "building:levels": "6" } :
        index % 4 === 1 ? { amenity: "school" } : index % 4 === 2 ? { shop: "supermarket" } : { leisure: "park" } }));
    return areaContract.normalizePointObjectAreaContext({ osm3s: { timestamp_osm_base: stamp }, elements },
      { marketKey: "dubai", locale, aoiCoordinates: coordinates }, stamp);
  }
  const area = makeArea();
  const receipt = { sourceResponseHash: area.source.sourceResponseHash, sampleSize: area.summary.sampleSize,
    mappedBuildingCount: area.summary.mappedBuildingCount, capReached: area.coverage.capReached,
    inclusionMethod: area.coverage.inclusionMethod, completeInventory: area.coverage.completeInventory };
  ok(parser.isPointObjectAreaContextResult(area), "fixture uses actual bounded source normalizer and validator");
  const geometry = result => JSON.stringify({ massing: result.massing, alternatives: result.alternatives });
  const originalGeometry = geometry(parser.parsePointObjectGeneratedConcept(generated, aoi));
  const originalInput = JSON.stringify({ aoi, area, generated });

  async function roundTrip(name, wireGenerated, heldArea = area, locale = "en") {
    const parsed = parser.parsePointObjectGeneratedConcept(JSON.parse(JSON.stringify(wireGenerated)), aoi);
    ok(parsed, `${name}: response parses without losing valid geometry`);
    equal(geometry(parsed), originalGeometry, `${name}: parser preserves A/B geometry exactly`);
    const state = { marketKey: "dubai", locale, aoi, editorSnapshot: null, generated: parsed,
      generatedLocale: locale, activeAlternativeId: "B", areaContext: heldArea, dashboardOpen: true };
    ok(session.writePointObjectCreateSession(state), `${name}: actual guest session write succeeds`);
    const reopenedSession = session.readPointObjectCreateSession();
    ok(reopenedSession, `${name}: actual guest session read succeeds`);
    equal(geometry(reopenedSession.generated), originalGeometry, `${name}: session preserves paid-for geometry`);
    equal(reopenedSession.activeAlternativeId, "B", `${name}: session preserves chosen alternative`);
    equal(Object.hasOwn(reopenedSession.generated, "areaContextUsed"), Object.hasOwn(parsed, "areaContextUsed"), `${name}: guest session preserves omission/null/invalid distinction`);
    equal(reopenedSession.generated.areaContextUsed, parsed.areaContextUsed, `${name}: receipt survives guest session round-trip`);
    if (!projects) return reopenedSession;
    const identity = `demo:source-binding-${name}`;
    projects.reconcilePointObjectBrowserIdentity(identity);
    const project = await projects.createPointObjectProject(identity, locale, `Source binding ${name}`);
    const saved = await projects.savePointObjectOperation(identity, {
      kind: "create", locale, marketKey: "dubai", label: "Synthetic Create receipt regression",
      payload: { aoi, editorSnapshot: null, generated: parsed, generatedLocale: locale, activeAlternativeId: "B", areaContext: heldArea }
    }, `source-binding-operation-${name}`);
    equal(saved.status, "saved", `${name}: actual browser-local project save succeeds`);
    ok(await projects.verifySavedPointObjectArtifact(saved.artifact), `${name}: saved artifact integrity verifies`);
    const reopened = await projects.readVerifiedPointObjectProjects(identity);
    equal(reopened.status, "ready", `${name}: actual integrity-verified project reopen succeeds`);
    const artifact = reopened.store.projects.find(item => item.projectId === project.projectId).artifacts[0];
    equal(artifact.kind, "create", `${name}: result remains a Create artifact`);
    equal(geometry(artifact.payload.generated), originalGeometry, `${name}: project reopen preserves both geometries`);
    equal(artifact.payload.activeAlternativeId, "B", `${name}: project reopen preserves B selection`);
    equal(Object.hasOwn(artifact.payload.generated, "areaContextUsed"), Object.hasOwn(parsed, "areaContextUsed"), `${name}: omission/null/invalid distinction persists`);
    equal(artifact.payload.generated.areaContextUsed, parsed.areaContextUsed, `${name}: receipt survives hashed project round-trip`);
    projectRoundTrips++;
    return artifact.payload;
  }
  const matched = await roundTrip("matched", { ...generated, areaContextUsed: receipt });
  equal(matched.generated.areaContextUsed, receipt, "all six receipt fields survive with exact original values");
  equal(programme.createProgrammeSourceBinding(aoi, matched.areaContext, matched.generated, "en").status, "matched", "reopened result binds to exact held source");
  const ruArea = makeArea(4, "ru");
  const ruReceipt = { ...receipt, sourceResponseHash: ruArea.source.sourceResponseHash };
  const ru = await roundTrip("matched-ru", { ...generated, areaContextUsed: ruReceipt }, ruArea, "ru");
  equal(programme.createProgrammeSourceBinding(aoi, ru.areaContext, ru.generated, "ru").status, "matched", "RU source/reopen binding uses generation locale");
  const legacy = await roundTrip("legacy", generated);
  equal(programme.createProgrammeSourceBinding(aoi, area, legacy.generated, "en").status, "legacy_unknown", "old save never infers source use from held context");
  const noSource = await roundTrip("null", { ...generated, areaContextUsed: null });
  equal(programme.createProgrammeSourceBinding(aoi, area, noSource.generated, "en").status, "not_used", "explicit null is not legacy unknown or used context");
  const malformed = [undefined, "bad", {}, { ...receipt, extra: "untrusted" }, { ...receipt, sourceResponseHash: "z".repeat(64) },
    { ...receipt, sampleSize: 302 }, { ...receipt, sampleSize: 1.5 }, { ...receipt, mappedBuildingCount: 5 },
    { ...receipt, capReached: "false" }, { ...receipt, inclusionMethod: "radius" }, { ...receipt, completeInventory: true }];
  for (const [index, value] of malformed.entries()) {
    // JSON cannot carry undefined; exercise that malformed in-memory value separately.
    const parsed = parser.parsePointObjectGeneratedConcept({ ...generated, areaContextUsed: value }, aoi);
    equal(parsed.areaContextUsed, { status: "invalid" }, `malformed ${index}: bounded invalid marker, never silently legacy/matched`);
    equal(geometry(parsed), originalGeometry, `malformed ${index}: valid saved geometry remains available`);
    equal(programme.createProgrammeSourceBinding(aoi, area, parsed, "en").status, "invalid_receipt", `malformed ${index}: fail closed`);
    equal(parser.parsePointObjectGeneratedConcept(JSON.parse(JSON.stringify(parsed)), aoi).areaContextUsed, { status: "invalid" }, `malformed ${index}: sentinel survives reparsing`);
  }
  const invalid = await roundTrip("invalid", { ...generated, areaContextUsed: { ...receipt, completeInventory: true } });
  equal(programme.createProgrammeSourceBinding(aoi, area, invalid.generated, "en").status, "invalid_receipt", "invalid metadata preserves result after reopen but cannot bind");
  const missing = await roundTrip("missing", { ...generated, areaContextUsed: receipt }, null);
  equal(programme.createProgrammeSourceBinding(aoi, null, missing.generated, "en").status, "context_missing", "saved receipt alone cannot supply held inventory");
  const mismatched = await roundTrip("wrong-hash", { ...generated, areaContextUsed: { ...receipt, sourceResponseHash: "f".repeat(64) } });
  equal(programme.createProgrammeSourceBinding(aoi, area, mismatched.generated, "en").status, "context_mismatch", "same AOI/counts but different hash does not bind after reopen");

  for (const [name, patch] of [
    ["hash", { sourceResponseHash: "e".repeat(64) }], ["sample", { sampleSize: 3 }],
    ["buildings", { mappedBuildingCount: 0 }], ["cap", { capReached: true }]
  ]) equal(programme.createProgrammeSourceBinding(aoi, area, { areaContextUsed: { ...receipt, ...patch } }, "en").status, "context_mismatch", `${name}: exact receipt comparison required`);
  for (const [name, mutate] of [
    ["AOI coordinates", value => { value.request.aoiCoordinates[0][0][0] += 0.00001; }],
    ["AOI area", value => { value.area.areaSqM += 1; }],
    ["locale", value => { value.request.locale = "ru"; }],
    ["inside count", value => { value.coverage.normalizedInsideCount += 1; }],
    ["query cap", value => { value.coverage.upstreamQueryLimit = 80; }],
    ["return cap", value => { value.coverage.featureReturnLimit = 4; }],
    ["inclusion method", value => { value.coverage.inclusionMethod = "radius"; }],
    ["geometry coverage", value => { value.coverage.geometryCoverage = "complete_intersection"; }],
    ["inventory completeness", value => { value.coverage.completeInventory = true; }]
  ]) {
    const changed = structuredClone(area); mutate(changed);
    equal(programme.createProgrammeSourceBinding(aoi, changed, { areaContextUsed: receipt }, "en").status, "context_mismatch", `${name}: held extent/coverage must remain valid and exact`);
  }
  equal(programme.createProgrammeSourceBinding(aoi, area, { areaContextUsed: receipt }, null).status, "context_mismatch", "unknown generation locale never binds");
  for (const count of [0, 80, 81, 301]) {
    const snapshot = makeArea(count);
    const use = { ...receipt, sourceResponseHash: snapshot.source.sourceResponseHash, sampleSize: snapshot.summary.sampleSize,
      mappedBuildingCount: snapshot.summary.mappedBuildingCount, capReached: snapshot.coverage.capReached };
    equal(programme.createProgrammeSourceBinding(aoi, snapshot, { areaContextUsed: use }, "en").status, "matched", `valid actual producer sample ${count} binds without mistaking return cap for source cap`);
  }
  for (const unbound of [legacy, noSource, invalid, missing, mismatched]) {
    const binding = programme.createProgrammeSourceBinding(aoi, unbound.areaContext, unbound.generated, unbound.generatedLocale);
    const review = programme.pointObjectProgrammeContextReview(program, binding.status === "matched" ? binding.context : null);
    ok(review.uses.every(item => item.mappedCount === null && item.evidenceRef === null), "unbound programme counts stay unknown, not zero or source evidence");
    ok(review.checks.every(item => item.mappedCount === null && item.capacity === "unknown" && item.adequacy === "not_assessed"), "unbound service adequacy never inferred");
    if (unbound.areaContext) ok(binding.context?.source.responseHash === area.source.sourceResponseHash, "held inventory remains separately available with its own lineage");
  }
  const binding = programme.createProgrammeSourceBinding(aoi, area, matched.generated, "en");
  ok(programme.pointObjectProgrammeContextReview(program, binding.context).uses.some(item => item.mappedCount !== null), "matched programme retains bounded inventory facts without claiming adequacy");
  const dashboard = readFileSync(new URL("components/point-to-object/create-result-dashboard.tsx", root), "utf8");
  ok(dashboard.includes('data-testid="create-source-binding"') && dashboard.includes("data-source-binding={sourceBinding.status}"), "actual dashboard exposes binding state for independent browser QA (static wiring only)");
  ok(dashboard.includes("sourceMatched ? context : null") && dashboard.includes("programme={sourceMatched}"), "actual dashboard cannot present unbound inventory as programme grounding (static wiring only)");
  for (const status of ["matched", "legacy_unknown", "not_used", "invalid_receipt", "context_missing", "context_mismatch"]) ok(dashboard.includes(`${status}:`), `dashboard declares EN/RU message for ${status} (static wiring only)`);
  equal(JSON.stringify({ aoi, area, generated }), originalInput, "fixture input/last successful result stays immutable throughout checks");
  equal(networkCalls, 0, "no source/provider/API request or implicit regeneration during parse/save/reopen");
  console.log(JSON.stringify({ protocol: "REVIEW02_CREATE_SOURCE_BINDING_OWNER_V1", result: sessionOnly ? "PARTIAL" : "PASS", contractChecks: "PASS", checks,
    environment: "synthetic Node + in-memory browser storage; not hosted/browser UI acceptance",
    browserImportGraph: { result: "PASS", runtimeModules: browserGraph, nodeCryptoNegative: "PASS", realWebBundle: "NOT_RUN BY OWNER" },
    node: process.version, projectRoundTrips, projectPersistence: sessionOnly ? "NOT_RUN: explicit --session-only; full run requires existing project-consumer dependencies" : "PASS",
    networkCalls, providerCalls: 0, paidCalls: 0, actualInterviews: 0 }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
