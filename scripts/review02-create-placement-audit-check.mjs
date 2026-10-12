import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { isBuiltin, registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

// Real production helpers, synthetic held snapshots. No package stubs, browser,
// provider, source request, persistence, or journal access. Missing dependencies
// fail the check; syntax-only inspection must not be reported as a test pass.
const root = new URL("../", import.meta.url);
let browserGuard = true;
const browserGraph = new Set();
registerHooks({
  resolve(specifier, context, next) {
    if (browserGuard && (isBuiltin(specifier) || specifier.startsWith("node:") || specifier === "server-only")) throw new Error(`Server dependency in audit client graph: ${specifier}`);
    const resolved = specifier.startsWith("@/") ? next(new URL(`${specifier.slice(2)}.ts`, root).href, context) :
      (specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier) ? next(`${specifier}.ts`, context) : next(specifier, context);
    if (browserGuard && resolved.url.startsWith(root.href)) browserGraph.add(resolved.url.slice(root.href.length));
    return resolved;
  },
  load(url, context, next) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
    return next(url, context);
  }
});
let checks = 0, networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls++; throw new Error("Requests are forbidden in placement audit checks"); };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const ok = (value, message) => { assert.ok(value, message); checks++; };
const copy = value => structuredClone(value);
function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

try {
  // Narrow source-level copy regression, not a React render/browser acceptance.
  // This mode can run with no app dependency runtime and no fake React package.
  const card = readFileSync(new URL("components/point-to-object/create-placement-audit.tsx", root), "utf8");
  const emptyBlockCopy = card.match(/data-testid="create-placement-no-confirmed-matches"[^>]*>([\s\S]*?)<\/p>/)?.[1];
  ok(emptyBlockCopy, "empty assessed-block copy has an inspectable selector");
  ok(/summary\.unresolvedSourceCount > 0 \?/.test(emptyBlockCopy), "empty block branches on unresolved source centres");
  ok(emptyBlockCopy.includes("No confirmed matches; placement of some centres is unknown."), "EN partial-unknown branch cannot imply a known zero");
  ok(emptyBlockCopy.includes("Подтверждённых совпадений нет; положение части центров неизвестно."), "RU partial-unknown branch cannot imply a known zero");
  ok(emptyBlockCopy.includes("No confirmed matches in the held sample."), "fully assessed empty block remains held-sample-only");
  ok(card.includes('block.status === "unknown" ?'), "unknown geometry retains its distinct branch");
  if (process.argv.includes("--copy-only")) {
    equal(networkCalls, 0, "static copy check makes zero requests");
    console.log(JSON.stringify({ protocol: "REVIEW02_CREATE_PLACEMENT_AUDIT_CHECK_V1", mode: "STATIC_COPY_ONLY_NOT_RENDERED", checks, networkCalls }));
    process.exit(0);
  }
  const { buildCreatePlacementAudit: audit } = await import(new URL("src/lib/prototype/point-to-object-create-placement-audit.ts", root).href);
  ok(![...browserGraph].some(path => path.endsWith("/hash.ts") || path.endsWith("area-context-contract.ts")), "audit client graph excludes server hash/normalizer");
  browserGuard = false;
  const { calculatePolygonMeasurements } = await import(new URL("src/lib/polygon-aoi.ts", root).href);
  const { isPointObjectAreaContextResult } = await import(new URL("src/lib/prototype/point-to-object-create-result.ts", root).href);
  const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
  const ring = (west, south, east, north) => [[west, south], [east, south], [east, north], [west, north], [west, south]];
  const row = (id, longitude, latitude, group = "other_built", tags = { building: "tent" }) => ({ sourceFeatureId: `way/${id}`, longitude, latitude, label: `Held source ${id}`, group, mappedBuildingLevels: null, observedTags: tags, inclusionMethod: "returned_center_inside_aoi" });
  const feature = (id, geometry) => ({ type: "Feature", id, properties: { id, label: `Saved ${id}`, variantId: "A" }, geometry });
  function fixture(rows = [row(1, 55.2705, 25.2055), row(2, 55.2714, 25.2055, "access", {}), row(3, 55.2719, 25.2062), row(4, 55.2702, 25.2055)], marketKey = "dubai", coordinates = [ring(55.27, 25.205, 55.272, 25.2065)]) {
    const measured = calculatePolygonMeasurements(coordinates[0].slice(0, -1));
    const aoi = { id: "create-aoi-placement-check", coordinates, vertexCount: 4, areaSqM: measured.areaSqM, perimeterM: measured.perimeterM };
    const counts = new Map(); for (const item of rows) counts.set(item.group, (counts.get(item.group) ?? 0) + 1);
    const area = { protocol: "POINT_TO_OBJECT_001_AREA_CONTEXT_V1", mode: rows.length ? "results" : "empty", request: { marketKey, locale: "en", aoiCoordinates: copy(coordinates) },
      area: { areaSqM: Math.round(aoi.areaSqM), perimeterM: Math.round(aoi.perimeterM), centroid: { longitude: coordinates[0][0][0], latitude: coordinates[0][0][1] } }, features: rows,
      summary: { sampleSize: rows.length, namedFeatureCount: rows.length, mappedBuildingCount: rows.filter(item => item.observedTags.building).length, mappedLevelsKnownCount: 0, medianMappedLevels: null, nearestTransitM: null, nearestMajorRoadM: null, groups: [...counts].map(([group, count]) => ({ group, count, sharePct: 100 * count / rows.length })) },
      coverage: { kind: "bounded_open_map_polygon_sample", inclusionMethod: "returned_center_inside_aoi", geometryCoverage: "centroid_proxy_not_complete_intersection", upstreamElementCount: rows.length, normalizedInsideCount: rows.length, returnedFeatureCount: rows.length, upstreamQueryLimit: 300, featureReturnLimit: 80, capReached: false, completeInventory: false },
      source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "7".repeat(64), observedAt: null, acquiredAt: "2026-10-06T17:35:39.345Z", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false }, limitations: [], caveat };
    const generated = { areaContextUsed: { sourceResponseHash: area.source.sourceResponseHash, sampleSize: area.summary.sampleSize, mappedBuildingCount: area.summary.mappedBuildingCount, capReached: area.coverage.capReached, inclusionMethod: area.coverage.inclusionMethod, completeInventory: area.coverage.completeInventory } };
    const massing = { variantId: "A", featureCollection: { type: "FeatureCollection", features: [feature("concept-a-1", { type: "Polygon", coordinates: [ring(55.2702, 25.2052, 55.2708, 25.2058)] }), feature("concept-a-2", { type: "Polygon", coordinates: [ring(55.2711, 25.2052, 55.2717, 25.2058)] })] } };
    ok(isPointObjectAreaContextResult(area), "synthetic held snapshot obeys current source schema");
    return { aoi, area, generated, massing };
  }
  const run = f => audit(f.aoi, f.area, f.generated, f.generatedLocale ?? "en", f.massing);
  function reconciles(result) {
    const s = result.summary; ok(s, "spatial summary exists");
    equal(s.uniqueSourceCount, s.insideSourceCount + s.boundaryOnlySourceCount + s.outsideSourceCount + s.unresolvedSourceCount, "source classifications reconcile");
    equal(s.uniqueBlockCount, s.assessedBlockCount + s.unresolvedBlockCount, "block classifications reconcile");
    const pairs = result.blocks.flatMap(block => block.matches);
    equal(pairs.length, s.insidePairCount + s.boundaryPairCount, "pair/card counts reconcile");
    equal(new Set(pairs.map(pair => `${pair.sourceFeatureId}|${pair.conceptBlockId}`)).size, pairs.length, "source/block grain is unique");
  }
  const f = fixture(), positive = run(f);
  equal([positive.status, positive.bindingStatus, positive.calculationCrs], ["available", "matched", "EPSG:32640"], "matched Dubai source uses confirmed frame");
  equal([positive.summary.uniqueSourceCount, positive.summary.insideSourceCount, positive.summary.boundaryOnlySourceCount, positive.summary.outsideSourceCount, positive.summary.affectedBlockCount, positive.summary.insidePairCount, positive.summary.boundaryPairCount], [4, 2, 1, 1, 2, 2, 1], "known centres and boundary stay distinct");
  equal(positive.blocks[0].matches.map(match => match.nextCheck), ["verify_tent", "verify_boundary"], "tent and edge checks are targeted");
  equal(positive.blocks[1].matches[0].nextCheck, "confirm_access", "access centre asks for access continuity");
  reconciles(positive);
  for (const [key, value] of Object.entries({ sourceResponseHash: "8".repeat(64), sampleSize: 5, mappedBuildingCount: 0, capReached: true, inclusionMethod: "invented", completeInventory: true })) {
    const changed = copy(f); changed.generated.areaContextUsed[key] = value;
    const result = run(changed); equal([result.summary, result.blocks], [null, []], `receipt ${key} mismatch emits no facts or actions`);
  }
  for (const changed of [{ ...f, generated: {} }, { ...f, generated: { areaContextUsed: undefined } }, { ...f, generated: { areaContextUsed: null } }, { ...f, area: null }]) equal(run(changed).summary, null, "legacy/undefined/null/missing sources emit no facts");
  const changedLocale = copy(f); changedLocale.area.request.locale = "de"; equal(run(changedLocale).summary, null, "invalid source locale fails closed");
  equal(run({ ...f, generatedLocale: "ru" }), positive, "RU output retains exact EN acquisition snapshot and receipt-bound spatial facts");
  equal(run({ ...f, generatedLocale: "de" }).summary, null, "invalid output locale fails closed");
  const changedAoi = copy(f); changedAoi.area.request.aoiCoordinates[0][0][0] += 0.0001; equal(run(changedAoi).summary, null, "held AOI mismatch fails closed");
  const changedGroups = copy(f); changedGroups.area.summary.groups[0].count++; equal(run(changedGroups).summary, null, "nonreconciling held groups fail closed");
  const changedLimit = copy(f); changedLimit.area.coverage.upstreamQueryLimit = 301; equal(run(changedLimit).summary, null, "producer query bound cannot drift");
  for (const badCoordinate of [NaN, Infinity, 181, undefined]) { const bad = copy(f); bad.area.features[0].longitude = badCoordinate; equal(run(bad).summary, null, "invalid/missing coordinate never becomes outside or zero"); }
  const holes = fixture([row(1, 55.2705, 25.2055), row(2, 55.2704, 25.2055), row(3, 55.2703, 25.2053)]);
  holes.massing.featureCollection.features = [feature("concept-a-1", { type: "Polygon", coordinates: [ring(55.2702, 25.2052, 55.2708, 25.2058), ring(55.2704, 25.2054, 55.2706, 25.2056)] })];
  const holed = run(holes); equal([holed.summary.insideSourceCount, holed.summary.boundaryOnlySourceCount, holed.summary.outsideSourceCount], [1, 1, 1], "hole interior is outside and hole edge remains boundary"); reconciles(holed);
  const multi = fixture(); multi.massing.featureCollection.features = [feature("concept-a-1", { type: "MultiPolygon", coordinates: multi.massing.featureCollection.features.map(feature => feature.geometry.coordinates) })];
  const union = run(multi); equal([union.summary.uniqueBlockCount, union.summary.insidePairCount, union.summary.boundaryPairCount], [1, 2, 1], "MultiPolygon members retain one block identity"); reconciles(union);
  for (const second of [ring(55.2705, 25.2052, 55.2711, 25.2058), ring(55.2708, 25.2052, 55.2714, 25.2058), ring(55.2708, 25.2058, 55.2714, 25.2062)]) {
    const ambiguous = fixture(); ambiguous.massing.featureCollection.features = [feature("concept-a-1", { type: "MultiPolygon", coordinates: [[ring(55.2702, 25.2052, 55.2708, 25.2058)], [second]] })];
    const result = run(ambiguous);
    equal([result.status, result.blocks[0].status, result.blocks[0].matches.length, result.summary.unresolvedBlockCount, result.summary.unresolvedSourceCount], ["partial", "unknown", 0, 1, 4], "overlapping/edge-touching/corner-touching member bboxes fail closed without union claims"); reconciles(result);
  }
  const repeated = fixture([...copy(f.area.features), copy(f.area.features[0])]); const dedup = run(repeated);
  equal([dedup.summary.uniqueSourceCount, dedup.summary.duplicateRecordCount, dedup.summary.insidePairCount], [4, 1, 2], "identical held source duplicates are deduplicated"); reconciles(dedup);
  const conflicting = fixture([...copy(f.area.features), { ...copy(f.area.features[0]), longitude: 55.2719 }]); const conflict = run(conflicting);
  equal([conflict.status, conflict.summary.unresolvedSourceCount, conflict.summary.insidePairCount], ["partial", 1, 1], "conflicting source duplicates are unknown, not arbitrarily selected"); reconciles(conflict);
  const onlyConflict = fixture([row(1, 55.2705, 25.2055), row(1, 55.2714, 25.2055)]), noConfirmed = run(onlyConflict);
  equal([noConfirmed.status, noConfirmed.summary.unresolvedSourceCount, noConfirmed.summary.insidePairCount, noConfirmed.summary.boundaryPairCount], ["partial", 1, 0, 0], "only conflicting source has no confirmed pairs, not a known zero");
  ok(noConfirmed.blocks.every(block => block.status === "assessed" && block.matches.length === 0), "assessed empty blocks coexist with unresolved sources and require partial-unknown copy"); reconciles(noConfirmed);
  for (const geometry of [null, { type: "Polygon", coordinates: [ring(55.2702, 25.2052, 55.2708, 25.2058).slice(0, -1)] }, { type: "Polygon", coordinates: [[[55.2702,25.2052],[55.2708,25.2058],[55.2708,25.2052],[55.2702,25.2058],[55.2702,25.2052]]] }]) {
    const bad = copy(f); bad.massing.featureCollection.features[0].geometry = geometry; const result = run(bad);
    equal([result.status, result.blocks[0].status, result.blocks[0].matches.length, result.summary.unresolvedBlockCount], ["partial", "unknown", 0, 1], "missing/unclosed/self-crossing footprint is unknown"); reconciles(result);
  }
  const duplicateBlock = copy(f); duplicateBlock.massing.featureCollection.features.push(copy(duplicateBlock.massing.featureCollection.features[0])); equal(run(duplicateBlock).summary.uniqueBlockCount, 2, "identical block duplication cannot multiply pairs");
  duplicateBlock.massing.featureCollection.features.at(-1).geometry = copy(duplicateBlock.massing.featureCollection.features[1].geometry); equal(run(duplicateBlock).blocks[0].status, "unknown", "conflicting saved block ID cannot select a footprint");
  const wrongVariant = copy(f); wrongVariant.massing.featureCollection.features[0].properties.variantId = "B"; equal(run(wrongVariant).summary, null, "selected option/footprint mismatch emits no facts");
  const wrongId = copy(f); wrongId.massing.featureCollection.features[0].id = "other"; equal(run(wrongId).summary, null, "feature/property ID mismatch emits no facts");
  const oversized = copy(f); oversized.massing.featureCollection.features = Array.from({ length: 81 }, () => copy(f.massing.featureCollection.features[0])); equal(run(oversized).reason, "input_limit", "more than 80 saved features fails closed before spatial work");
  const empty = fixture([]); const emptyAudit = run(empty); equal([emptyAudit.summary.uniqueSourceCount, emptyAudit.summary.affectedBlockCount, emptyAudit.status], [0, 0, "available"], "verified empty held sample stays sample-only zero"); reconciles(emptyAudit);
  const sg = fixture([row(1, 103.8505, 1.3055)], "singapore", [ring(103.85, 1.305, 103.852, 1.3065)]); sg.massing.featureCollection.features = [feature("concept-a-1", { type: "Polygon", coordinates: [ring(103.8502, 1.3052, 103.8508, 1.3058)] })]; equal([run(sg).calculationCrs, run(sg).summary.insideSourceCount], ["EPSG:32648", 1], "Singapore uses only the existing supported frame");
  const moscow = fixture([row(1, 37.6205, 55.7505)], "moscow", [ring(37.62, 55.75, 37.622, 55.7515)]); equal([run(moscow).bindingStatus, run(moscow).reason, run(moscow).summary], ["matched", "unsupported_frame", null], "source-matched unsupported frame stays unknown");
  const immutable = copy(f), before = JSON.stringify(immutable); freeze(immutable); run(immutable); equal(JSON.stringify(immutable), before, "audit leaves saved source, receipt and geometry unchanged");
  const exportFlag = process.argv.indexOf("--saved-export");
  let savedExport = null;
  if (exportFlag !== -1) {
    const path = process.argv[exportFlag + 1]; assert.ok(path && /REVIEW02_CREATE_PAID_EXPORT_20261006\.json$/.test(path), "only the named public saved Create export is permitted");
    assert.ok(statSync(path).size <= 8 * 1024 * 1024, "saved export read is bounded");
    const records = JSON.parse(readFileSync(path, "utf8")).records;
    const record = records.find(item => item.operation === "create"); assert.ok(record?.sourceSnapshot?.aoi && record?.sourceSnapshot?.areaContext && record?.response);
    const generated = record.response, massing = generated.alternatives?.find(option => option.id === "A")?.massing ?? generated.massing;
    const result = audit(record.sourceSnapshot.aoi, record.sourceSnapshot.areaContext, generated, record.originalSubmissionIntent.locale, massing);
    equal(result.bindingStatus, "matched", "public saved C export source receipt matches"); reconciles(result);
    savedExport = { bindingStatus: result.bindingStatus, status: result.status, variantId: massing.variantId, source: result.source, summary: result.summary, pairs: result.blocks.flatMap(block => block.matches.map(match => ({ sourceFeatureId: match.sourceFeatureId, conceptBlockId: match.conceptBlockId, relation: match.relation, nextCheck: match.nextCheck }))) };
  }
  equal(networkCalls, 0, "no source/provider requests");
  console.log(JSON.stringify({ protocol: "REVIEW02_CREATE_PLACEMENT_AUDIT_CHECK_V1", checks, networkCalls, savedExport }, null, 2));
} finally { globalThis.fetch = originalFetch; }
