import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url);
const ts = require("typescript");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3Dfn%3D%3Efn", shortCircuit: true };
    const local = specifier.startsWith("@/") ? pathToFileURL(path.join(root, specifier.slice(2))).href : specifier;
    if ((local.startsWith("file:") || local.startsWith("./") || local.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(local)) {
      try { return next(`${local}.ts`, context); } catch { return next(`${local}.tsx`, context); }
    }
    return next(local, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText };
    return next(url, context);
  }
});
const independent = await import("../src/lib/prototype/point-to-object-independent-context.ts");
const { readIndependentPointObjectContext } = await import("../src/lib/prototype/point-to-object-overture-snapshot.ts");
const { contextDetailsFromEvidence, parseContextDetailsV2, contextExplicitTag } = await import("../src/lib/prototype/point-to-object-context-details-v2.ts");
const { normalizePointObjectContext, normalizedResolvedContext, parseNormalizedPointObjectContext } = await import("../src/lib/prototype/point-to-object-normalized-context.ts");
const { buildLivePointObjectEvidencePack, normalizeOverpassUrbanFabric } = await import("../src/lib/prototype/point-to-object-live-evidence.ts");
const { parseLiveResolvedObject } = await import("../components/point-to-object/live-session.ts");
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { PointObjectContextDashboard } = await import("../components/point-to-object/context-dashboard.tsx");
const { IndependentSourceContext } = await import("../components/point-to-object/independent-source-context.tsx");
let checks = 0;
const check = (v, message) => { assert.ok(v, message); checks++; };
const clone = v => structuredClone(v);
const now = new Date().toISOString();
const data = JSON.parse(readFileSync(path.join(root, "src/data/prototype/d2-overture-places.json"), "utf8"));
const cases = independent.INDEPENDENT_CASES;
const actual = cases.map(c => readIndependentPointObjectContext(c.sourceFeatureId, c.anchor, c.caseId === "U3" ? independent.INDEPENDENT_U3_POLYGON : undefined));
for (const [index, count] of [165, 174, 169].entries()) {
  check(actual[index].status === "available" && actual[index].sampleSize === count, `Actual admitted ${cases[index].caseId} count matches admission`);
  check(independent.parseIndependentContext(actual[index], cases[index].sourceFeatureId, cases[index].anchor, index === 2 ? independent.INDEPENDENT_U3_POLYGON : undefined), "Producer passes its strict source parser");
}
check(actual[2].interiorSampleSize === 0 && actual[2].places.every(p => p.relation === "outside_aoi"), "U3 screened zero and external services remain separate from AOI inventory");
check(actual[2].spatialCoverage.state === "partial_circle_clipped_by_acquisition_extent" && actual[2].spatialCoverage.easternClipApproxM === 27.83, "Independent QA G1 clipping retained, not hidden behind incomplete inventory");
const fullU3 = clone(actual[2]); fullU3.spatialCoverage.state = "full_circle_within_acquisition_extent";
check(independent.parseIndependentContext(fullU3, cases[2].sourceFeatureId, cases[2].anchor, independent.INDEPENDENT_U3_POLYGON) === null, "False full-circle U3 claim fails strict parser");
const binsina = actual[1].places.find(p => p.id === "9cdcd059-192f-4b0d-b2ef-bb0c2717aec3");
check(binsina && Math.abs(binsina.distanceM - 94.96) < 0.02 && binsina.taxonomy.primary === "pharmacy" && binsina.basic_category === "pharmacy_and_drug_store", "Actual new service survives taxonomy and physical distance normalization");
check(binsina.sources.some(s => s.record_id === "1447748162016527") && binsina.providerUpdatedAt === "2026-09-14T00:00:00.000Z" && binsina.observationDate === null, "Meta source ID and provider timestamp preserved; derived update is not observation");
check(actual.every(c => c.places.every(p => p.currentOperation === "unknown" && p.capacity === "unknown")), "No source record claims current operation or capacity");
check(!data.features.some(p => ["21c0f90f-7e29-4b9c-8b79-4c9be6d4699c", "bb169379-5ccc-4c2f-a54c-0297ecd4f9c1"].includes(p.id)), "Known quarantine absent from shipped bytes");
for (const [id, anchor, polygon] of [["way/123", cases[0].anchor], [cases[0].sourceFeatureId, [55.27, 25.20]], [cases[2].sourceFeatureId, cases[2].anchor, [[[55.28,25.21],[55.281,25.21],[55.281,25.211],[55.28,25.211],[55.28,25.21]]]]]) {
  const unsupported = independent.buildIndependentContext(data, id, anchor, now, polygon);
  check(unsupported.status === "unsupported_scope" && unsupported.sampleSize === null && unsupported.interiorSampleSize === null && unsupported.places.length === 0, "Wrong identity/anchor/altered AOI cannot substitute nearest case or zero");
}
for (const edit of [c => c.places[0].currentOperation = "confirmed", c => c.places[0].distanceM = 0, c => c.places[0].providerUpdatedAt = c.places[0].sources.at(-1).update_time, c => c.places[0].sources[0].license = "unknown", c => c.completeInventory = true, c => c.anchor[0] += 0.001, c => c.fetchedAt = now, c => c.places[0].officialLive = true]) {
  const forged = clone(actual[1]); edit(forged);
  check(independent.parseIndependentContext(forged, cases[1].sourceFeatureId, cases[1].anchor) === null, "Contradictory independent source claims fail closed");
}

// OSM is a synthetic transport fixture, NOT a newly verified U2 footprint.
const anchor = cases[1].anchor;
const ring = [[anchor[0]-.0001,anchor[1]-.0001],[anchor[0]+.0001,anchor[1]-.0001],[anchor[0]+.0001,anchor[1]+.0001],[anchor[0]-.0001,anchor[1]+.0001],[anchor[0]-.0001,anchor[1]-.0001]];
const oldFetch = globalThis.fetch;
let injectedRequests = 0;
globalThis.fetch = async url => {
  injectedRequests++;
  const query = new URL(String(url)).searchParams.get("data") ?? "";
  if (query.includes("out body geom 1")) return Response.json({ elements: [{ type: "way", id: 393391114, tags: { name: "Synthetic geometry transport fixture", building: "office", height: "100 ft", "building:levels": "10" }, geometry: ring.map(([lon, lat]) => ({ lon, lat })), bounds: { minlat: anchor[1]-.0001, maxlat: anchor[1]+.0001, minlon: anchor[0]-.0001, maxlon: anchor[0]+.0001 } }] });
  return Response.json({ osm3s: { timestamp_osm_base: "2026-10-13T11:00:00Z" }, elements: [{ type: "node", id: 13, lon: anchor[0]+.0004, lat: anchor[1], tags: { name: "Synthetic bus stop", highway: "bus_stop" } }] });
};
let pack;
try { pack = await buildLivePointObjectEvidencePack({ longitude: anchor[0], latitude: anchor[1], osmFeatureId: cases[1].sourceFeatureId, locale: "en", expectedCountryCode: "ae", deadlineAtMs: Date.now()+12_000 }); }
finally { globalThis.fetch = oldFetch; }
check(injectedRequests === 2, "Admitted enrichment adds no network/provider call");
const normalized = normalizePointObjectContext(pack);
check(parseNormalizedPointObjectContext(normalized), "Actual pack producer plus independent receipt passes normalized parser");
check(normalized.independentContext?.status === "available" && normalized.details?.independentEnrichment === "separate_source_snapshot", "Independent evidence reaches normalized contract without mixed OSM counts");
check(normalized.details.metrics.find(m => m.id === "height")?.value === 30.48 && normalized.details.metrics.find(m => m.id === "levels")?.value === 10, "Height units converted explicitly; levels remain separate");
const publicSubject = { name: pack.selectedObject.name, address: pack.selectedObject.displayAddress, featureClass: pack.selectedObject.featureClass, sourceFeatureId: pack.selectedObject.sourceFeatureId, geometryType: pack.selectedObject.geometryType, coordinateAssociation: pack.resolution.coordinateAssociation, resultCentroidDistanceM: pack.resolution.resultCentroidDistanceM, addressParts: pack.selectedObject.addressParts, tags: pack.selectedObject.tags, metrics: pack.selectedObject.metrics, geoContext: pack.geoContext, normalizedContext: normalized, linkedEntity: null, displayGeometry: pack.displayGeometry, geometryProvenance: "confirmed_complete_footprint" };
const reopened = parseLiveResolvedObject(JSON.parse(JSON.stringify(publicSubject)));
check(reopened && reopened.normalizedContext.independentContext.places.some(p => p.id === binsina.id), "Existing shared strict save/reopen parser preserves new source record");
const legacy = clone(publicSubject); delete legacy.normalizedContext.details; delete legacy.normalizedContext.independentContext;
check(parseLiveResolvedObject(legacy) && normalizedResolvedContext(parseLiveResolvedObject(legacy)).details === undefined, "V1 save remains readable without invented metrics, geometry or enrichment");
const nearestPack = clone(pack); nearestPack.resolution.coordinateAssociation = "reverse_nearest_indexed_object_not_point_in_polygon";
const nearest = contextDetailsFromEvidence(nearestPack);
check(nearest.metrics.every(m => m.value === null) && nearest.geometry === null, "Nearest source cannot donate selected properties");
check(parseContextDetailsV2(nearest, nearest.subjectId, nearest.anchor, "point_radius"), "Honest nearest unknowns remain parseable");
const tempPack = clone(pack); tempPack.selectedObject.tags = { "tag.building": "tent", "tag.leisure": "outdoor_seating", "tag.building:levels": "3" };
check(contextDetailsFromEvidence(tempPack).metrics.find(m => m.id === "levels").value === null, "Tent/seating tags cannot certify permanent floors");
check(contextDetailsFromEvidence(tempPack).semanticWarnings.length === 2, "Temporary shelter and outdoor-seating qualifications retain source-specific interpretation limits");
check(normalizeOverpassUrbanFabric({ elements: [{ type: "node", id: 54, lon: anchor[0], lat: anchor[1], tags: { leisure: "outdoor_seating" } }] }, anchor).groups.every(g => g.group !== "open_space"), "Outdoor seating is not a park");
for (const raw of ["3;5", "approx 10", "-1", "NaN", "1201 m"]) check(contextExplicitTag(raw, "m") === null, "Invalid explicit numeric tag is unknown, not zero or inferred");
for (const edit of [c => c.metrics[0].unit = "count", c => c.metrics[0].method = "explicit_osm_tag", c => c.metrics[0].scope = "user_aoi", c => c.sources[0].officialLiveStatus = "official_live", c => c.geometry.coordinates[0][1] = c.geometry.coordinates[0][3], c => c.metrics[0].officiallyVerified = true]) {
  const bad = clone(normalized.details); edit(bad);
  check(parseContextDetailsV2(bad, bad.subjectId, bad.anchor, "point_radius") === null, "Physical unit/method/scope/geometry contradictions fail closed");
}
for (const locale of ["en", "ru"]) {
  const html = renderToStaticMarkup(React.createElement(PointObjectContextDashboard, { context: reopened.normalizedContext, locale }));
  check(html.includes("BinSina Pharmacy") && html.includes("context-physical-footprint_area") && html.includes("independent-service-brief"), "Free context surface renders physical metrics and new service before paid analysis");
  check(html.includes("/data/d2-overture/LICENSES.json") && html.includes("Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."), "Licence and exact caveat retained in both locales");
  check(html.includes("aria-pressed") && html.includes("tabindex=\"0\"") && html.includes("aria-live=\"polite\""), "Keyboard/select/polite announcement hooks present (not browser certification)");
  const unknownHtml = renderToStaticMarkup(React.createElement(IndependentSourceContext, { context: independent.buildIndependentContext(null, "way/123", anchor, now), locale }));
  check(unknownHtml.includes("unsupported_scope") && !unknownHtml.includes("independent-service-brief"), "Unsupported coverage does not render service claims");
}
const licence = JSON.parse(readFileSync(path.join(root, "public/data/d2-overture/LICENSES.json"), "utf8"));
check(licence.subsetSha256 === independent.OVERTURE_SNAPSHOT_HASH && licence.licenseText.includes("2.1. A Data Recipient may share Data"), "Full sharing licence accompanies admitted data");
console.log(JSON.stringify({ status: "PASS", checks, node: process.version, typescript: ts.version, actualSourceHash: independent.OVERTURE_SNAPSHOT_HASH, admittedCounts: actual.map(c => c.sampleSize), u3Interior: actual[2].interiorSampleSize, networkCalls: 0, injectedRequests, browser: "not run; Control/independent QA owns browser and usefulness", scope: "admitted bytes → server evidence → normalized contract → strict save/reopen → EN/RU server rendering" }));
