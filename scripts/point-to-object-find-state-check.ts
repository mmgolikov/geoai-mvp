import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* Report the canonical error below. */ }
    }
    return nextResolve(specifier, context);
  }
});

// Execute the actual production helpers and geometry validator, not copied bodies or stubs.
const { pointObjectFindPresentationState, pointObjectFindVerifiedFootprint } =
  await import("../src/lib/prototype/point-to-object-map-selection");
const findContract = readFileSync(new URL("../src/lib/prototype/point-to-object-find-contract.ts", import.meta.url), "utf8");
const kindHelperSource = findContract.slice(
  findContract.indexOf("export type PointObjectFindCandidateResultKind"),
  findContract.indexOf("export type PointObjectFindResult")
);
assert.ok(kindHelperSource.includes("export function pointObjectFindCandidateResultKind"), "production result-kind helper source must be present");
const { pointObjectFindCandidateResultKind } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(kindHelperSource)).toString("base64")}`
);

const polygon = {
  type: "Polygon" as const,
  coordinates: [[[55, 25], [55.001, 25], [55.001, 25.001], [55, 25.001], [55, 25]]]
};
const multiPolygon = {
  type: "MultiPolygon" as const,
  coordinates: [polygon.coordinates, [[[55.002, 25], [55.003, 25], [55.003, 25.001], [55.002, 25.001], [55.002, 25]]]]
};

const shortlist = new Set(["way/2"]);
assert.equal(pointObjectFindPresentationState("way/1", null, null, shortlist), "result");
assert.equal(pointObjectFindPresentationState("way/2", null, null, shortlist), "shortlist");
assert.equal(pointObjectFindPresentationState("way/2", null, "way/2", shortlist), "hover");
assert.equal(pointObjectFindPresentationState("way/2", "way/2", "way/2", shortlist), "active");
assert.equal(pointObjectFindPresentationState("way/1", "way/1", null, shortlist), "active");
assert.equal(pointObjectFindPresentationState("way/1", "way/2", null, shortlist), "result", "changing the active result must clear the old active highlight");
assert.equal(pointObjectFindPresentationState("way/2", null, null, shortlist), "shortlist", "clearing active selection must retain shortlist state");

assert.deepEqual(pointObjectFindVerifiedFootprint(polygon, "confirmed_complete_footprint", "mapped_building_or_landuse"), polygon);
assert.deepEqual(pointObjectFindVerifiedFootprint(multiPolygon, "confirmed_complete_footprint", "mapped_building_or_landuse"), multiPolygon);
assert.equal(pointObjectFindVerifiedFootprint(polygon, "confirmed_complete_footprint", "mapped_poi"), null, "a POI representative point must never acquire invented building geometry");
assert.equal(pointObjectFindVerifiedFootprint(polygon, null, "mapped_building_or_landuse"), null, "unverified geometry must remain a representative point");
assert.equal(pointObjectFindVerifiedFootprint({ type: "Polygon", coordinates: [] }, "confirmed_complete_footprint", "mapped_building_or_landuse"), null);
assert.equal(pointObjectFindVerifiedFootprint({ type: "Polygon", coordinates: [[[55, 25], [NaN, 25], [55, 25]]] }, "confirmed_complete_footprint", "mapped_building_or_landuse"), null);
assert.equal(pointObjectFindVerifiedFootprint({ type: "MultiPolygon", coordinates: [polygon.coordinates, []] }, "confirmed_complete_footprint", "mapped_building_or_landuse"), null, "one invalid member invalidates the returned footprint");
const clonedFootprint = pointObjectFindVerifiedFootprint(polygon, "confirmed_complete_footprint", "mapped_building_or_landuse");
assert.notEqual(clonedFootprint, polygon, "returned geometry cannot mutate the source record");

assert.equal(pointObjectFindCandidateResultKind({
  matchedTag: { key: "tourism", value: "hotel" },
  observedTags: { tourism: "hotel", building: "hotel" }
}), "mapped_building_or_landuse", "a tourism-tagged hotel way keeps its explicit building footprint");
assert.equal(pointObjectFindCandidateResultKind({
  matchedTag: { key: "amenity", value: "hospital" },
  observedTags: { amenity: "hospital", building: "yes" }
}), "mapped_building_or_landuse", "an amenity way with an explicit building tag keeps its footprint");
assert.equal(pointObjectFindCandidateResultKind({
  matchedTag: { key: "tourism", value: "hotel" },
  observedTags: { tourism: "hotel" }
}), "mapped_poi", "a pure tourism POI remains a point fallback");
assert.equal(pointObjectFindCandidateResultKind({
  matchedTag: { key: "amenity", value: "hospital" },
  observedTags: { amenity: "hospital", building: "no", landuse: "false" }
}), "mapped_poi", "negative area pseudo-values cannot relabel a POI as a building or land use");

const client = readFileSync(new URL("../components/point-to-object/prototype-client-v5.tsx", import.meta.url), "utf8");
const map = readFileSync(new URL("../components/point-to-object/live-object-map.tsx", import.meta.url), "utf8");
assert.match(client, /data-testid="find-reset-results"/);
assert.match(client, /function resetFindResults\(\)[\s\S]*setFindResult\(null\)[\s\S]*setFindShortlist\(\[\]\)[\s\S]*clearPointObjectFindSession\(\)/);
assert.match(client, /findResultIsStale[\s\S]*"Update search"/);
assert.match(client, /onClick=\{\(\) => focusFindResult\(candidate\.sourceFeatureId\)\}/);
assert.match(client, /onClick=\{\(\) => chooseFindCandidate\(candidate\)\}/);
assert.match(map, /button\.dataset\.findResultMarker = result\.id/);
assert.doesNotMatch(map, /confirmedFindFootprint\(result as LiveMapFindResult\)\) continue/,
  "verified footprints must keep their numbered representative markers");
assert.match(map, /hoveredFindResultIdRef\.current/);
assert.match(map, /shortlistedFindResultIdsRef\.current/);

console.log("point-to-object Find state checks passed");
