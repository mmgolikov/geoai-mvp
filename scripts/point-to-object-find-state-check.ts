import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const selectionSource = readFileSync(new URL("../src/lib/prototype/point-to-object-map-selection.ts", import.meta.url), "utf8");

function exportedBody(name: string): string {
  const start = selectionSource.indexOf(`export function ${name}(`);
  assert.notEqual(start, -1, `${name} must remain exported`);
  const brace = selectionSource.indexOf("{", start);
  let depth = 0;
  for (let index = brace; index < selectionSource.length; index += 1) {
    if (selectionSource[index] === "{") depth += 1;
    if (selectionSource[index] === "}") depth -= 1;
    if (depth === 0) return selectionSource.slice(brace + 1, index);
  }
  throw new Error(`Could not parse ${name}`);
}

const pointObjectFindPresentationState = new Function(
  "resultId", "activeId", "hoveredId", "shortlistIds",
  exportedBody("pointObjectFindPresentationState")
) as (resultId: string, activeId: string | null, hoveredId: string | null, shortlistIds: ReadonlySet<string>) => string;

const verifiedFootprintBody = exportedBody("pointObjectFindVerifiedFootprint");
const pointObjectFindVerifiedFootprint = (geometry: object | null, provenance: string | null, resultKind: string): unknown =>
  new Function("geometry", "provenance", "resultKind", "validatePointObjectReplacementAoi", "structuredClone", verifiedFootprintBody)(
    geometry,
    provenance,
    resultKind,
    (candidate: { coordinates: unknown[] }) => ({ valid: candidate.coordinates.length > 0 }),
    structuredClone
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
