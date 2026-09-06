import assert from "node:assert/strict";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    }
    if (specifier === "next/cache") {
      const cacheStub = "export const unstable_cache = (callback) => callback;";
      return { url: `data:text/javascript,${encodeURIComponent(cacheStub)}`, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      const absolutePath = path.join(ROOT, specifier.slice(2));
      const candidate = /\.[cm]?[jt]sx?$/.test(absolutePath) ? absolutePath : `${absolutePath}.ts`;
      return nextResolve(pathToFileURL(candidate).href, context);
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Let Node return the canonical resolution error below.
      }
    }
    return nextResolve(specifier, context);
  }
});

const {
  normalizePointObjectAreaContext,
  parsePointObjectAreaContextRequest
} = await import("../src/lib/prototype/point-to-object-area-context-contract");
const { normalizeOverpassUrbanFabric } = await import("../src/lib/prototype/point-to-object-live-evidence");

const point = [55.2715, 25.2065] as [number, number];
const request = parsePointObjectAreaContextRequest({
  marketKey: "dubai",
  locale: "en",
  aoiCoordinates: [[
    [55.2700, 25.2050],
    [55.2730, 25.2050],
    [55.2730, 25.2080],
    [55.2700, 25.2080],
    [55.2700, 25.2050]
  ]]
});
if (!request.ok) throw new Error(request.error);

// Synthetic, real-world-like OSM tag fixture. These rows are not observations
// of Dubai, Singapore or any other actual place.
const elements = [
  { type: "node", id: 1, lat: 25.20651, lon: 55.27151, tags: { amenity: "parking" } },
  { type: "node", id: 2, lat: 25.20652, lon: 55.27152, tags: { amenity: "bench" } },
  { type: "node", id: 3, lat: 25.20653, lon: 55.27153, tags: { amenity: "toilets" } },
  { type: "node", id: 4, lat: 25.20654, lon: 55.27154, tags: { amenity: "waste_basket" } },
  { type: "node", id: 5, lat: 25.20655, lon: 55.27155, tags: { amenity: "fountain" } },
  { type: "node", id: 6, lat: 25.20656, lon: 55.27156, tags: { amenity: "restaurant" } },
  { type: "node", id: 7, lat: 25.20657, lon: 55.27157, tags: { amenity: "cafe" } },
  { type: "node", id: 8, lat: 25.20658, lon: 55.27158, tags: { amenity: "school" } },
  { type: "node", id: 9, lat: 25.20659, lon: 55.27159, tags: { amenity: "clinic" } },
  { type: "node", id: 10, lat: 25.20660, lon: 55.27160, tags: { amenity: "library" } },
  { type: "node", id: 11, lat: 25.20661, lon: 55.27161, tags: { amenity: "parcel_locker" } },
  { type: "way", id: 12, center: { lat: 25.20662, lon: 55.27162 }, tags: { building: "yes", amenity: "parking" } },
  { type: "way", id: 13, center: { lat: 25.20663, lon: 55.27163 }, tags: { building: "yes", amenity: "school" } },
  { type: "way", id: 14, center: { lat: 25.20664, lon: 55.27164 }, tags: { building: "yes", tourism: "museum" } },
  { type: "way", id: 15, center: { lat: 25.20665, lon: 55.27165 }, tags: { building: "yes", tourism: "hotel" } },
  { type: "way", id: 16, center: { lat: 25.20666, lon: 55.27166 }, tags: { building: "office" } },
  { type: "node", id: 17, lat: 25.20667, lon: 55.27167, tags: { shop: "convenience" } }
];

const area = normalizePointObjectAreaContext({ elements }, request.value, "2026-09-06T10:00:00Z");
const fabric = normalizeOverpassUrbanFabric({ elements }, point);
const areaGroups = Object.fromEntries(area.summary.groups.map((item) => [item.group, item.count]));
const pointGroups = Object.fromEntries(fabric.groups.map((item) => [item.group, item.count]));

assert.deepEqual(pointGroups, areaGroups, "Point and AOI context must classify the same representative OSM tags identically.");
assert.deepEqual(areaGroups, {
  retail_daily_needs: 3,
  civic_culture: 2,
  education: 2,
  commercial: 1,
  healthcare: 1,
  hospitality: 1,
  other_built: 1
});
assert.equal(area.summary.sampleSize, 11, "Unclassified street furniture/general amenities must not enter the AOI sample.");
assert.equal(fabric.sampleSize, 11, "Unclassified street furniture/general amenities must not enter the point sample.");
assert.equal(area.features.find((feature) => feature.sourceFeatureId === "way/12")?.group, "other_built",
  "Parking must not become road access; an independently mapped building may remain other built fabric.");
assert.equal(area.features.find((feature) => feature.sourceFeatureId === "way/13")?.group, "education",
  "A specific education amenity must take precedence over a generic building tag.");
for (const excludedId of [1, 2, 3, 4, 5, 11]) {
  assert.equal(area.features.some((feature) => feature.sourceFeatureId === `node/${excludedId}`), false,
    `General amenity node/${excludedId} must not be invented as civic context.`);
}

const nonCivicSubset = elements.filter((element) => [1, 2, 3, 4, 5, 6, 7, 11, 12, 16, 17].includes(element.id));
const nonCivicFabric = normalizeOverpassUrbanFabric({ elements: nonCivicSubset }, point);
assert.equal(nonCivicFabric.districtCharacter.code, "commercial_business",
  "Parking and unclassified amenities must not turn a retail/commercial mapped sample into a civic district.");
assert.equal(nonCivicFabric.groups.some((item) => item.group === "civic_culture"), false);
assert.equal(nonCivicFabric.nearestMajorRoadM, null,
  "Mapped parking must not be reported as proximity to a major road.");
assert.equal(nonCivicFabric.nearestTransitM, null,
  "Mapped parking and general amenities must not be reported as public transport proximity.");

console.log("Point-to-object point/AOI context classification contract passed.");
