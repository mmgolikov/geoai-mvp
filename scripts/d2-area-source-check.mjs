import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url), ts = require("typescript");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    const local = specifier.startsWith("@/") ? pathToFileURL(path.join(root, specifier.slice(2))).href : specifier;
    if (!context.parentURL?.includes("/node_modules/") && (local.startsWith("file:") || local.startsWith("./") || local.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(local)) {
      try { return next(`${local}.ts`, context); } catch { return next(`${local}.tsx`, context); }
    }
    return next(local, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText };
    return next(url, context);
  }
});
const u4 = await import("../src/lib/prototype/point-to-object-u4-independent-context.ts");
const area = await import("../src/lib/prototype/point-to-object-area-source-context-v2.ts");
const old = await import("../src/lib/prototype/point-to-object-independent-context.ts");
const { readU4IndependentContext } = await import("../src/lib/prototype/point-to-object-u4-snapshot.ts");
const { readAreaSourceContextV2 } = await import("../src/lib/prototype/point-to-object-area-source-snapshot.ts");
const { normalizePointObjectAreaContext: produceV1 } = await import("../src/lib/prototype/point-to-object-area-context-contract.ts");
const { normalizePointObjectAreaContext: normalizeV1 } = await import("../src/lib/prototype/point-to-object-normalized-context.ts");
const { semanticHash } = await import("../src/lib/point-to-object/hash.ts");
const React = await import("react"), { renderToStaticMarkup } = await import("react-dom/server");
const { PointObjectAreaSourceDashboard } = await import("../components/point-to-object/context-dashboard.tsx");
let checks = 0, networkCalls = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const clone = structuredClone, hash = b => createHash("sha256").update(b).digest("hex");
const bytes = readFileSync(path.join(root, "src/data/prototype/d2-overture-u4-places.json")), data = JSON.parse(bytes);
check(bytes.length === 30418 && hash(bytes) === u4.U4_SOURCE_HASH && data.features.length === 24, "Actual admitted24 bytes and SHA match G1, not raw60/old265");
check(semanticHash(u4.U4_GEOMETRY) === u4.U4_GEOMETRY_HASH, "Full original mapped polygon retains canonical geometry SHA");
const input = { subjectId: u4.U4_SOURCE_ID, sourceVersion: 1, geometry: clone(u4.U4_GEOMETRY), anchor: clone(u4.U4_ANCHOR), radiusM: 400 };
const savedFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls++; throw new Error("Unexpected source network execution"); };
try {
  // Qualify the actual reader's unavailable branch before its process cache is filled.
  const cwd = process.cwd(); let missing;
  const emptyCwd = mkdtempSync(path.join(tmpdir(), "geoai-d2-area-source-"));
  try {
    process.chdir(emptyCwd);
    missing = readU4IndependentContext(input);
  } finally {
    try { process.chdir(cwd); }
    finally { rmdirSync(emptyCwd); } // Only this test's own empty directory; never recursive.
  }
  check(missing.status === "source_unavailable" && missing.sampleSize === null && missing.places.length === 0, "Missing literal file fails closed, no old265 or fabricated zero fallback");
  const context = readU4IndependentContext(input);
  check(context.status === "available" && context.sampleSize === 24 && context.interiorSampleSize === 0 && context.places.length === 24, "Actual source reader returns separate 24 surroundings and zero admitted interior points");
  check(context.places.every(p => p.relation === "outside_aoi" && p.currentOperation === "unknown" && p.capacity === "unknown" && p.observationDate === null), "Source zero is not emptiness/operation/capacity or physical-observation proof");
  check(context.places.filter(p => p.sources.some(s => s.provider === "meta")).length === 19 && context.places.filter(p => p.sources.some(s => s.provider === "microsoft")).length === 5, "Actual admitted provider grain 19 Meta/5 Microsoft; derived confidence is not another physical provider");
  check(context.places.every(p => p.sources.every(s => s.license === "CDLA-Permissive-2.0" && ["meta", "microsoft", "overture"].includes(s.provider))), "Unadmitted licence/provider records stay absent");
  check(context.osmInteriorBaseline.status === "source_error_not_empty" && context.osmInteriorBaseline.sampleSize === null && context.osmInteriorBaseline.truth === "frozen_prior_receipt_not_a_new_read", "Frozen OSM OOM remains unknown/null and historical");
  check(context.associatedRecordGroups.every(g => g.independentCatchments === "unknown" && !g.physicalMerge) && context.associatedRecordGroups[0].ids.length === 3, "Hotel/cafe/pub retain source-address association without three catchments or physical merge");
  check(context.places.find(p => p.id === "22883c9c-6001-44eb-b458-1a46d6231b70").address.includes("Premier Inn"), "Cafe/operator role clue reaches consumer unchanged");
  check(u4.parseU4IndependentContext(context, input), "U4 producer passes source-pinned save parser");
  for (const change of [i => i.sourceVersion = null, i => i.sourceVersion = 2, i => i.subjectId = "way/254666300", i => i.radiusM = 399, i => i.anchor[0] += 0.000001, i => i.geometry.coordinates[0][3][0] += 0.00001]) {
    const other = clone(input); change(other); const unsupported = readU4IndependentContext(other);
    check(unsupported.status === "unsupported_scope" && unsupported.sampleSize === null && !unsupported.places.length && u4.parseU4IndependentContext(context, other) === null, "Absent native version or changed source/anchor/radius/full polygon cannot borrow U4");
  }
  const rounded = clone(input); rounded.anchor = input.anchor.map(n => Number(n.toFixed(6)));
  check(readU4IndependentContext(rounded).status === "available", "Known six-decimal transport rounding remains supported, not arbitrary anchor movement");
  for (const edit of [c => c.places[0].name = "Another Hotel", c => c.places[0].address = "Another address", c => c.places[0].sources[0].record_id = "another-record", c => c.places[0].distanceM = 0, c => c.sampleSize = 60, c => c.interiorSampleSize = 24, c => c.osmInteriorBaseline.sampleSize = 0, c => c.osmInteriorBaseline.truth = "fresh", c => c.associatedRecordGroups[0].independentCatchments = 3, c => c.places[0].observationDate = c.fetchedAt, c => c.completeInventory = true, c => c.places.pop(), c => c.geometryHash = "a".repeat(64)]) {
    const forged = clone(context); edit(forged);
    check(u4.parseU4IndependentContext(forged, input) === null, "Source fact/count/date/catchment/hash mutations fail strict import");
  }
  const altered = clone(data); altered.features[0].properties.names.primary = "Forged name";
  check(u4.buildU4IndependentContext(altered, input, context.cacheServedAt).status === "source_unavailable", "Submitted self-consistent raw facts cannot replace fixed admission");
  for (const edit of [d => d.release = "future-release", d => d.caseId = "U3", d => d.radiusM = 500, d => d.geometrySha256 = "f".repeat(64), d => d.completeInventory = true, d => d.anchor[0] += .001]) {
    const other = clone(data); edit(other);
    check(u4.buildU4IndependentContext(other, input, context.cacheServedAt).status === "source_unavailable", "Actual source envelope metadata cannot drift while retaining admitted record facts");
  }
  const binding4 = { aoiId: input.subjectId, origin: "mapped_osm_polygon", sourceFeatureId: input.subjectId, sourceVersion: 1, geometry: input.geometry, anchor: input.anchor, radiusM: 400 };
  const area4 = readAreaSourceContextV2(binding4, null);
  check(area4 && area4.osmInterior.sampleSize === null && area4.independentContext.sampleSize === 24 && area4.aiEligibility === "not_admitted_to_point_ai", "Actual partial-area adapter retains identity and source error, never a fake point AI asset");
  const raw4 = area.serializeAreaSourceContextV2(area4), reopened4 = area.parseSavedAreaSourceContextV2(JSON.parse(raw4), binding4, null);
  check(reopened4 && JSON.stringify(reopened4) === raw4, "V2 source snapshot round-trips byte-stably without source refresh or locale rewrite");
  for (const edit of [c => c.osmInterior.sampleSize = 0, c => c.osmInterior.status = "held_successful_v1", c => c.osmInterior.error.responseHash = "b".repeat(64), c => c.osmInterior.error.acquiredAt = new Date().toISOString(), c => c.binding.sourceVersion = 2, c => c.binding.geometry.coordinates[0][2][1] += .00001, c => c.binding.anchor[0] += .001, c => c.caseId = "U3", c => c.aiEligibility = "point_ai", c => c.geometryHash = "c".repeat(64)]) {
    const bad = clone(area4); edit(bad);
    check(area.parseSavedAreaSourceContextV2(bad, binding4, null) === null, "Partial saved error/source/case/full AOI cannot heal, drift or upgrade to point AI");
  }
  const binding3 = { aoiId: old.INDEPENDENT_CASES[2].sourceFeatureId, origin: "user_aoi", sourceFeatureId: null, sourceVersion: null, geometry: { type: "Polygon", coordinates: clone(old.INDEPENDENT_U3_POLYGON) }, anchor: clone(old.INDEPENDENT_CASES[2].anchor), radiusM: 400 };
  // Synthetic OSM payload qualifies compatibility, NOT the original U3 source read.
  const request = { marketKey: "dubai", locale: "en", aoiCoordinates: clone(old.INDEPENDENT_U3_POLYGON) };
  const held = produceV1({ elements: [{ type: "node", id: 100, lon: binding3.anchor[0], lat: binding3.anchor[1], tags: { name: "Synthetic AOI context fixture", amenity: "cafe" } }] }, request);
  const priorBytes = JSON.stringify(held), priorNormalized = JSON.stringify(normalizeV1(held));
  const area3 = readAreaSourceContextV2(binding3, held);
  check(area3 && area3.independentContext.sampleSize === 169 && area3.independentContext.interiorSampleSize === 0 && area3.osmInterior.sampleSize === 1, "U3 successful OSM interior and separate clipped Overture surroundings retain different counts");
  check(JSON.stringify(held) === priorBytes && JSON.stringify(area3.osmInterior.heldV1) === priorBytes && JSON.stringify(area.normalizeAreaSourceDashboard(area3).osmContext) === priorNormalized, "Successful legacy V1 producer, original bytes and normalizer remain unchanged");
  for (const edit of [v => v.area.areaSqM += 1, v => v.area.perimeterM += 1, v => v.area.centroid.longitude += .001, v => v.summary.sampleSize += 1]) {
    const bad = clone(held); edit(bad);
    check(readAreaSourceContextV2(binding3, bad) === null, "V1 metrics/centroid/counts must describe the same full AOI and original normalized inventory");
  }
  check(area.parseSavedAreaSourceContextV2(JSON.parse(area.serializeAreaSourceContextV2(area3)), binding3, held), "U3 actual adapter/save parser preserves original held V1 plus admitted independent records");
  check(area.parseSavedAreaSourceContextV2(held, binding3, held) === null, "A historical V1 is never implicitly upgraded into independent V2 evidence");
  const noOsm = readAreaSourceContextV2(binding3, null);
  check(noOsm.osmInterior.status === "not_retained" && noOsm.osmInterior.sampleSize === null && area.normalizeAreaSourceDashboard(noOsm).osmContext === null, "Absent U3 OSM snapshot stays unknown, not newly successful or donated surrounding zero");
  check(readAreaSourceContextV2(binding4, held) === null, "U3 successful V1 cannot overwrite U4 frozen source failure");
  for (const change of [b => b.aoiId = "new-aoi", b => b.geometry.coordinates[0][1][0] += .00001, b => b.anchor[1] += .001, b => b.origin = "mapped_osm_polygon", b => b.sourceFeatureId = "way/1173254714"]) {
    const other = clone(binding3); change(other);
    check(readAreaSourceContextV2(other, held) === null && area.parseSavedAreaSourceContextV2(area3, other, held) === null, "Changed U3 case/geometry/anchor/origin/source cannot donate the admitted AOI context");
  }
  const drifted3 = clone(area3); drifted3.osmInterior.heldV1.source.sourceResponseHash = "d".repeat(64);
  check(area.parseSavedAreaSourceContextV2(drifted3, binding3, held) === null, "Held original source hash, not imported self-hash, governs saved V1 lineage");
  for (const locale of ["en", "ru"]) for (const ctx of [area3, reopened4]) {
    const html = renderToStaticMarkup(React.createElement(PointObjectAreaSourceDashboard, { context: ctx, locale }));
    check(html.includes("area-source-context-v2") && html.includes("independent-source-context") && html.includes(ctx.independentContext.licencePath) && html.includes(ctx.caveat), "EN/RU area-source renderer exposes separate independent data/licence/exact caveat");
    check(ctx.caseId === "U3" ? html.includes("independent-partial-spatial-coverage") : html.includes("area-osm-unknown") && html.includes("u4-osm-interior-error") && html.includes("ODbL-1.0"), "Clipped U3 and errored U4 remain visually distinct, with separate geometry licence");
  }
  const licenceBytes = readFileSync(path.join(root, "public/data/d2-overture-u4/LICENSES.json")), licence = JSON.parse(licenceBytes);
  check(licenceBytes.length === 5025 && hash(licenceBytes) === "3616d986fa3fac4780ab13742547010c72a90d8f5cd80a1f7c32292f0c98b6ea" && licence.appliesToSubset.sha256 === u4.U4_SOURCE_HASH && licence.licenseText.includes("2.1. A Data Recipient may share Data"), "Unchanged full licence accompanies exact admitted24 source bytes");
  check(networkCalls === 0, "All source/area/save/SSR checks make zero external network/provider calls");
} finally { globalThis.fetch = savedFetch; }
console.log(JSON.stringify({ status: "PASS", checks, node: process.version, typescript: ts.version, u4SourceHash: u4.U4_SOURCE_HASH, networkCalls, scope: "actual admitted bytes → source-only AOI adapter → strict saved snapshot → EN/RU SSR", notQualified: ["ordinary AOI Analyse intake", "AOI AI", "original historical U3 browser reopening", "browser/layout/usefulness", "build/NFT/CI/Preview"], reviewer: "dev_1 author tests, not independent QA" }));
