import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Pure synthetic contract checks only. No browser/server/provider, source fetch,
// private state, paid result rewriting or test_1/shared fixture modifications.
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url), ts = require("typescript");
let externalCalls = 0;
globalThis.fetch = async () => { externalCalls++; throw new Error("D2 citation contract forbids network"); };
registerHooks({
  resolve(specifier, context, next) {
    if (/^(?:openai|@supabase\/|https?$|node:https?$|node:net$|server-only$)/.test(specifier)) throw new Error("Forbidden contract import: " + specifier);
    const local = specifier.startsWith("@/") ? pathToFileURL(path.join(root, specifier.slice(2))).href : specifier;
    if (!context.parentURL?.includes("/node_modules/") && (local.startsWith("file:") || local.startsWith("./") || local.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(local)) {
      try { return next(local + ".ts", context); } catch { return next(local + ".tsx", context); }
    }
    return next(local, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: {
        module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX
      } }).outputText };
    return next(url, context);
  }
});
const catalogue = await import("../src/lib/prototype/point-to-object-citation-context.ts");
const normalized = await import("../src/lib/prototype/point-to-object-normalized-context.ts");
const live = await import("../components/point-to-object/live-session.ts");
const observer = await import("../src/lib/prototype/point-to-object-verification-export.ts");
const projects = await import("../src/lib/prototype/point-object-projects-contract.ts");
const fixture = await import("../tests/e2e/helpers/sprint10-analysis-fixture.ts");
const clone = value => structuredClone(value);
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const anchor = [55.27, 25.2], subjectId = "way/91010";
const receipt = fixture.sprint10PublicEvidenceReceipt(subjectId);
const nearby = Array.from({ length: 12 }, (_, index) => {
  const metres = index === 0 ? 548 : index === 1 ? 799 : 50 + index * 20;
  return { evidenceId: "EVD-CONTEXT-" + (index + 1), sourceFeatureId: "node/" + (90180001 + index),
    name: "Synthetic citation record " + (index + 1), categories: [index === 0 ? "university" : "shop"],
    featureClass: index === 0 ? "amenity:university" : "shop:convenience", distanceM: metres,
    method: "overpass_around_query_element_center_haversine", proofLimit: "Synthetic source record only.",
    coordinates: [anchor[0], anchor[1] + metres / 6_371_008.8 * 180 / Math.PI],
    contextGroup: index === 0 ? "education" : "retail_daily_needs" };
});
const pack = {
  evidencePackHash: receipt.evidencePackHash,
  coordinates: { longitude: anchor[0], latitude: anchor[1], crs: "EPSG:4326" },
  selectedObject: { sourceFeatureId: subjectId },
  source: { contextStatus: "available", contextRadiusM: 800, contextResponseHash: "d".repeat(64),
    contextObservedAt: "2026-10-13T10:00:00Z", contextAcquiredAt: "2026-10-13T10:01:00Z",
    fabricObservedAt: "2026-10-13T10:00:00Z", fabricAcquiredAt: "2026-10-13T10:01:00Z", fabricResponseHash: "c".repeat(64) },
  geoContext: clone(fixture.sprint10Selection.resolvedObject.geoContext), nearbyContext: nearby,
  evidence: nearby.map(item => ({ id: item.evidenceId, sourceId: item.sourceFeatureId, label: item.name,
    value: JSON.stringify({ sourceFeatureId: item.sourceFeatureId, name: item.name, categories: item.categories,
      featureClass: item.featureClass, distanceM: item.distanceM, method: item.method }) }))
};
const context = normalized.normalizePointObjectContext(pack), c = context.citationContext;
check(c?.items.length === 12, "All original nearby refs retained, not just 400m rows");
check(context.places.length === 10 && context.places.every(item => item.distanceM <= 400), "400m places remain separately bounded");
check(context.scope.radiusM === 400 && context.sampleSize === pack.geoContext.sampleSize, "KPI scope/denominator unchanged");
check(c.source.responseHash === pack.source.contextResponseHash && c.source.responseHash !== context.source.responseHash, "Nearby and fabric hashes are not conflated");
check(c.source.observedAt === pack.source.contextObservedAt && c.source.acquiredAt === pack.source.contextAcquiredAt, "Database as-of and acquisition dates retained separately");
check(JSON.stringify(c.items.map(item => item.evidenceRef)) === JSON.stringify(nearby.map(item => item.evidenceId)), "Original refs/order not renumbered");
check(catalogue.getPointObjectCitation(c, "EVD-CONTEXT-1").featureClass === "amenity:university" &&
  catalogue.getPointObjectCitation(c, "EVD-CONTEXT-1").distanceM === 548, "Synthetic 548m classification survives, without inventing the real University record");
check(catalogue.getPointObjectCitation(undefined, "EVD-CONTEXT-1") === null && catalogue.getPointObjectCitation(c, "EVD-CONTEXT-13") === null, "Missing catalogue/ref is unavailable, not backfilled");
assert.deepEqual(normalized.parseNormalizedPointObjectContext(clone(context)), context); checks++;
const old = clone(context); delete old.citationContext;
assert.deepEqual(normalized.parseNormalizedPointObjectContext(old), old); checks++;
const missing = clone(pack); missing.source.contextStatus = "unavailable";
check(normalized.normalizePointObjectContext(missing).citationContext === undefined, "Unavailable source does not become empty known catalogue");
const noReceipts = clone(pack); noReceipts.evidence = [];
check(catalogue.citationContextFromEvidence(noReceipts) === undefined, "No source-evidence receipt means no admitted catalogue");
const alteredSourceClass = clone(pack); alteredSourceClass.nearbyContext[0].featureClass = "amenity:hospital";
check(catalogue.citationContextFromEvidence(alteredSourceClass) === undefined, "Class must match original nearby evidence receipt");
const empty = clone(pack); empty.nearbyContext = []; empty.evidence = [];
check(catalogue.citationContextFromEvidence(empty)?.items.length === 0, "A known successful empty bounded sample differs from unavailable legacy/source");
for (const [label, edit] of [
  ["subject", value => { value.subjectId = "way/99999"; }],
  ["anchor", value => { value.scope.anchor[0] += .001; }],
  ["radius", value => { value.scope.radiusM = 400; }],
  ["source", value => { value.source.name = "Overture Places"; }],
  ["source hash", value => { value.source.responseHash = "unknown"; }],
  ["source date", value => { value.source.acquiredAt = "unknown"; }],
  ["official claim", value => { value.source.officialStatus = "official_live"; }],
  ["duplicate ref", value => { value.items[1].evidenceRef = value.items[0].evidenceRef; }],
  ["duplicate ID", value => { value.items[1].id = value.items[0].id; }],
  ["self ID", value => { value.items[0].id = subjectId; }],
  ["unknown ref", value => { value.items[0].evidenceRef = "EVD-CONTEXT-13"; }],
  ["distance", value => { value.items[0].distanceM = 0; }],
  ["outside radius", value => { value.items[0].distanceM = 801; }],
  ["coordinate", value => { value.items[0].coordinates = [0, 0]; }],
  ["method", value => { value.items[0].method = "walking_minutes"; }],
  ["empty class", value => { value.items[0].featureClass = ""; }],
  ["too many categories", value => { value.items[0].categories = Array(9).fill("shop"); }],
  ["unknown group", value => { value.items[0].contextGroup = "official_zone"; }],
  ["oversized name", value => { value.items[0].name = "x".repeat(241); }],
  ["unknown key", value => { value.items[0].capacity = "verified"; }],
  ["count", value => { value.items.push(clone(value.items[0])); }]
]) {
  const bad = clone(c); edit(bad);
  check(catalogue.parsePointObjectCitationContext(bad, subjectId, anchor, receipt.evidencePackHash) === null, "Reject " + label);
  const badContext = clone(context); badContext.citationContext = bad;
  check(normalized.parseNormalizedPointObjectContext(badContext) === null, "Normalized parser rejects " + label);
}
check(catalogue.parsePointObjectCitationContext(c, subjectId, anchor, "f".repeat(64)) === null, "Catalogue pack hash must match expected receipt");
const oversized = clone(c);
for (const item of oversized.items) {
  item.name = "字".repeat(240); item.featureClass = "字".repeat(160); item.categories = Array(8).fill("字".repeat(80));
}
check(new TextEncoder().encode(JSON.stringify(oversized)).byteLength > catalogue.CITATION_CONTEXT_MAX_BYTES &&
  catalogue.parsePointObjectCitationContext(oversized, subjectId, anchor) === null, "UTF-8 aggregate byte cap applies even when individual field lengths pass");
let getterCalls = 0;
const getter = clone(c); Object.defineProperty(getter.source, "acquiredAt", { enumerable: true, get() { getterCalls++; return "2026-10-13T10:00:00Z"; } });
check(catalogue.parsePointObjectCitationContext(getter, subjectId, anchor) === null && getterCalls === 0, "Accessor refused without executing it");
const nestedGetter = clone(context); nestedGetter.citationContext = getter;
check(normalized.parseNormalizedPointObjectContext(nestedGetter) === null && getterCalls === 0, "Normalized consumer refuses nested accessor before JSON serialization");
const topGetter = clone(context); Object.defineProperty(topGetter, "citationContext", { enumerable: true, get() { getterCalls++; return c; } });
check(normalized.parseNormalizedPointObjectContext(topGetter) === null && getterCalls === 0, "Normalized consumer refuses top-level catalogue accessor");
const partialCoordinates = clone(pack); delete partialCoordinates.nearbyContext[0].coordinates;
check(catalogue.citationContextFromEvidence(partialCoordinates)?.items[0].coordinates === null, "Missing coordinates remain unknown, not reconstructed from distance");
const resolved = { ...clone(fixture.sprint10Selection.resolvedObject), normalizedContext: context, evidenceReceipt: receipt };
assert.deepEqual(live.parseLiveResolvedObject(resolved), resolved); checks++;
const badReceipt = clone(resolved); badReceipt.evidenceReceipt.evidencePackHash = "f".repeat(64);
check(live.parseLiveResolvedObject(badReceipt) === null, "Public resolved object rejects catalogue/receipt hash mismatch");
const selection = { ...clone(fixture.sprint10Selection), resolvedObject: resolved };
assert.deepEqual(live.parsePointObjectSelection(selection), selection); checks++;
const moved = clone(selection); moved.longitude += .001;
check(live.parsePointObjectSelection(moved) === null, "Citation-only enrichment binds outer selected anchor too");
const wrongSelectedId = clone(selection); wrongSelectedId.object.sourceFeatureId = "way/99999";
check(live.parsePointObjectSelection(wrongSelectedId) === null, "Citation-only enrichment binds trusted outer selected identity");
const intent = { caseKey: "dubai", longitude: anchor[0], latitude: anchor[1], locale: "en", expectedSourceFeatureId: subjectId };
const snapshot = observer.snapshotVerificationSubmission("context", intent, { context: resolved });
// Export projection deliberately uses null-prototype objects. Its contract is
// JSON data, not the in-memory Object prototype; compare every JSON field.
assert.deepEqual(JSON.parse(JSON.stringify(snapshot.sourceSnapshot.context.normalizedContext.citationContext)), c); checks++;
const bundle = JSON.parse(await observer.createVerificationBundle(true, { records: [], preSubmit: { operation: "context", intent,
  sourceSnapshot: { context: resolved } }, currentSelection: { mode: "analyse", marketKey: "dubai", locale: "en", sourceFeatureId: subjectId,
    longitude: anchor[0], latitude: anchor[1] } }));
assert.deepEqual(bundle.preSubmit.sourceSnapshot.context.normalizedContext.citationContext, c); checks++;
const operation = { kind: "analyse", locale: "en", marketKey: "dubai", label: "Synthetic citation persistence check",
  payload: { selection, analysis: fixture.sprint10AnalysisResponse({ depth: "standard", goal: "object_profile", perspective: "developer",
    horizon: "current", question: "Synthetic question only", locale: "en" }, 1, receipt.evidencePackHash, "POINT_OBJECT_AI_PROMPT_V14_2026_09_26") } };
const parsed = projects.parsePointObjectProjectOperationInput(JSON.parse(JSON.stringify(operation)));
check(parsed !== null, "Saved project operation accepts optional catalogue");
assert.deepEqual(parsed.payload.selection.resolvedObject.normalizedContext.citationContext, c); checks++;
const legacy = clone(operation); delete legacy.payload.selection.resolvedObject.normalizedContext.citationContext;
check(projects.parsePointObjectProjectOperationInput(legacy) !== null, "Legacy saved report remains readable without optional catalogue");
const invalidSave = clone(operation); invalidSave.payload.selection.resolvedObject.normalizedContext.citationContext.subjectId = "way/99999";
check(projects.parsePointObjectProjectOperationInput(invalidSave) === null, "Saved project contract rejects a supplied mismatched catalogue");
check(externalCalls === 0, "Zero external source/provider calls");
console.log(JSON.stringify({ protocol: "D2_CITATION_CONTEXT_PURE_CONTRACT_V1", classification: "SYNTHETIC_NOT_PAID_G2_OR_BROWSER_ACCEPTANCE",
  checks, externalCalls, paidCalls: 0, browserRuns: 0, status: "PASS", caveat: observer.VERIFICATION_CAVEAT }));
