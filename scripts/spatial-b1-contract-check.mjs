import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const cache = new Map();
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function resolveModule(id) {
  const relative = id.startsWith("@/") ? id.slice(2) : id;
  const candidates = [relative, `${relative}.ts`, path.join(relative, "index.ts")];
  const file = candidates.find((candidate) => fs.existsSync(path.join(process.cwd(), candidate)));
  if (!file) throw new Error(`Unable to resolve ${id}`);
  return path.join(process.cwd(), file);
}

function load(id) {
  const file = resolveModule(id);
  if (cache.has(file)) return cache.get(file);
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false }
  }).outputText;
  const module = { exports: {} };
  cache.set(file, module.exports);
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: (request) => load(request)
  }, { filename: file });
  cache.set(file, module.exports);
  return module.exports;
}

const types = load("@/src/types/spatial-data-v1");
const keys = load("@/src/lib/spatial-b1/feature-key");
const quality = load("@/src/lib/spatial-b1/quality");
const repository = load("@/src/lib/spatial-b1/repository");
const osm = load("@/src/lib/spatial-b1/adapters/osm");
const overture = load("@/src/lib/spatial-b1/adapters/overture");

const featureKey = keys.buildStableFeatureKeyV1({ role: "aoi", slug: "Dubai Marina / JBR Sample 01" });
assert(featureKey === "geoai:aoi:ae-du:dubai-marina-jbr-sample-01", "stable key normalization failed");
assert(keys.isStableFeatureKeyV1(featureKey), "stable key validation failed");

const polygon = {
  type: "Polygon",
  coordinates: [[[55.13, 25.07], [55.14, 25.07], [55.14, 25.08], [55.13, 25.08], [55.13, 25.07]]]
};
const bowtie = {
  type: "Polygon",
  coordinates: [[[55.13, 25.07], [55.14, 25.08], [55.14, 25.07], [55.13, 25.08], [55.13, 25.07]]]
};
const bbox = [54.95, 24.8, 55.55, 25.36];
const validQuality = quality.validateSpatialGeometryV1(polygon, { bbox });
assert(validQuality.valid && validQuality.ringClosed, "valid polygon gate failed");
assert(!quality.validateSpatialGeometryV1(bowtie, { bbox }).valid, "self-intersection gate failed");

const baseDataset = {
  layerId: "selectedAoi", layerName: "Selected AOI", geography: "Dubai processing envelope",
  snapshotDate: "2026-07-12", accessedAt: "2026-07-13T00:00:00.000Z", validFrom: "2026-07-12", validTo: null,
  sourceReleaseId: "test", licenseId: "test", attribution: "Test", buildMethod: "unit-test", buildVersion: "1",
  checksum: "test", caveat: types.spatialDataRequiredCaveatV1
};
const syntheticDataset = { ...baseDataset, datasetId: "synthetic", datasetVersion: "v1", sourceId: "synthetic", sourceMode: "synthetic_fallback" };
const openDataset = { ...baseDataset, datasetId: "open", datasetVersion: "v1", sourceId: "overture", sourceMode: "open_snapshot" };
const featureBase = {
  type: "Feature", featureKey, sourceFeatureId: "1", sourceAliases: [{ sourceId: "test", sourceFeatureId: "1" }],
  name: "Sample AOI", category: "selected_aoi", subtype: "sample", geometry: polygon,
  centroid: { longitude: 55.135, latitude: 25.075 }, areaSqm: null, geometryRole: "aoi", observedAt: "2026-07-12",
  validFrom: "2026-07-12", validTo: null, freshnessStatus: "current", confidenceLevel: "medium",
  scenarioRelevance: ["investmentSiteSelection"], limitations: [types.spatialDataRequiredCaveatV1], lineage: [], quality: validQuality, metadata: {}
};
const repo = repository.createSpatialBundleRepositoryV1({
  bundleId: "test", bundleVersion: "1", generatedAt: "2026-07-13T00:00:00.000Z", defaultSourceMode: "synthetic_fallback",
  datasets: [syntheticDataset, openDataset],
  features: [
    { ...featureBase, datasetId: "synthetic", datasetVersion: "v1", geometryOrigin: "synthetic", geometryAccuracy: "approximate", validationStatus: "derived_screening" },
    { ...featureBase, datasetId: "open", datasetVersion: "v1", geometryOrigin: "source", geometryAccuracy: "source_exact", validationStatus: "open_context" }
  ],
  metrics: []
});
assert(repo.defaultSourceMode === "synthetic_fallback", "default source changed");
assert(repo.resolveFeature(featureKey)?.datasetId === "open", "source precedence failed");

const context = { dataset: openDataset, countryCode: "ae", regionCode: "du", processingBbox: bbox, observedAt: "2026-07-12", scenarioRelevance: [] };
assert(osm.osmSnapshotAdapterV1.normalizeFeature({ type: "Feature", geometry: polygon, properties: { osm_type: "way", osm_id: "1", building: "yes" } }, context)?.validationStatus === "open_context", "OSM semantics failed");
assert(overture.overtureSnapshotAdapterV1.normalizeFeature({ type: "Feature", id: "building-1", geometry: polygon, properties: { id: "building-1", type: "building" } }, context)?.validationStatus === "open_context", "Overture semantics failed");

const productSources = fs.readFileSync("src/data/demo-layers.ts", "utf8") + fs.readFileSync("src/lib/spatial-data-adapter.ts", "utf8");
assert(!productSources.includes("spatial-b1"), "B1 bundle activated in Product");
assert(types.spatialValidationStatusLabelsV1.open_context === "Open-context geometry", "label changed");

console.log(JSON.stringify({ ok: true, checked: ["keys", "geometry", "precedence", "adapters", "no activation"] }, null, 2));
