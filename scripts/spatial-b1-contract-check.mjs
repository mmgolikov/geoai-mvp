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
  vm.runInNewContext(
    output,
    { module, exports: module.exports, require: (request) => load(request) },
    { filename: file }
  );
  cache.set(file, module.exports);
  return module.exports;
}

function writeEvidence(fileName, value) {
  const evidenceDir = process.env.SPATIAL_B1_CONTRACT_EVIDENCE_DIR;
  if (!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

const types = load("@/src/types/spatial-data-v1");
const keys = load("@/src/lib/spatial-b1/feature-key");
const registry = load("@/src/lib/spatial-b1/canonical-feature-registry");
const freshness = load("@/src/lib/spatial-b1/freshness");
const quality = load("@/src/lib/spatial-b1/quality");
const repository = load("@/src/lib/spatial-b1/repository");
const osm = load("@/src/lib/spatial-b1/adapters/osm");
const overture = load("@/src/lib/spatial-b1/adapters/overture");

const expectedCanonicalKeys = [
  "geoai:aoi:ae-du:business-bay-sample-01",
  "geoai:aoi:ae-du:dubai-south-industrial-sample-01",
  "geoai:aoi:ae-du:marina-waterfront-sample-01"
];
const tsRegistry = JSON.parse(JSON.stringify(registry.spatialCanonicalRegistryDocumentV1()));
writeEvidence("canonical-feature-key-registry-typescript.json", tsRegistry);
const tsCanonicalKeys = tsRegistry.selectedAois.map((entry) => entry.featureKey).sort();
assert(JSON.stringify(tsCanonicalKeys) === JSON.stringify(expectedCanonicalKeys), "canonical registry keys changed");
assert(tsRegistry.selectedAois.every((entry) => entry.identityScope === "canonical_registry"), "selected AOI identity scope changed");
assert(tsRegistry.contexts.every((entry) => entry.identityScope === "canonical_registry"), "registered context identity scope changed");
assert(
  tsRegistry.selectedAois.every((entry) => entry.allowedGeometrySources.includes("licensed")),
  "licensed source mode missing from canonical registry"
);

const parityRecords = expectedCanonicalKeys.map((expectedKey) => {
  const tsKey = tsCanonicalKeys.find((key) => key === expectedKey);
  return {
    expectedKey,
    typescriptKey: tsKey,
    byteIdentical: Buffer.from(tsKey ?? "").equals(Buffer.from(expectedKey))
  };
});
const pythonRegistryPath = process.env.SPATIAL_B1_PYTHON_REGISTRY;
if (pythonRegistryPath) {
  const pythonRegistry = JSON.parse(fs.readFileSync(pythonRegistryPath, "utf8"));
  const pythonCanonicalKeys = pythonRegistry.selectedAois.map((entry) => entry.featureKey).sort();
  for (const record of parityRecords) {
    record.pythonKey = pythonCanonicalKeys.find((key) => key === record.expectedKey);
    record.byteIdentical =
      record.byteIdentical && Buffer.from(record.pythonKey ?? "").equals(Buffer.from(record.typescriptKey ?? ""));
  }
  assert(
    JSON.stringify(canonicalize(pythonRegistry)) === JSON.stringify(canonicalize(tsRegistry)),
    "Python and TypeScript registries differ"
  );
}
const parityReport = {
  passed: parityRecords.every((record) => record.byteIdentical),
  failureCount: parityRecords.filter((record) => !record.byteIdentical).length,
  records: parityRecords
};
assert(parityReport.passed, "canonical key parity failed");
writeEvidence("python-typescript-key-parity-report.json", parityReport);

const timestampCases = [
  { caseId: "iso", input: "2026-06-01T12:34:56Z" },
  { caseId: "unix_seconds", input: 1717243696 },
  { caseId: "unix_milliseconds", input: 1717243696000 },
  { caseId: "invalid", input: "not-a-timestamp" },
  { caseId: "null", input: null }
];
const timestampParityRecords = timestampCases.map((testCase) => ({
  caseId: testCase.caseId,
  input: testCase.input,
  typescript: freshness.normalizeSpatialSourceTimestampV1(testCase.input)
}));
const pythonTimestampPath = process.env.SPATIAL_B1_PYTHON_TIMESTAMP_REPORT;
if (pythonTimestampPath) {
  const pythonReport = JSON.parse(fs.readFileSync(pythonTimestampPath, "utf8"));
  for (const record of timestampParityRecords) {
    record.python = pythonReport.cases.find((candidate) => candidate.caseId === record.caseId);
    record.byteIdentical =
      JSON.stringify(canonicalize(record.typescript)) ===
      JSON.stringify(canonicalize({
        sourceUpdatedAtRaw: record.python?.sourceUpdatedAtRaw ?? null,
        sourceUpdatedAtEpoch: record.python?.sourceUpdatedAtEpoch ?? null,
        sourceUpdatedAt: record.python?.sourceUpdatedAt ?? null
      }));
  }
}
const timestampParityReport = {
  passed: timestampParityRecords.every((record) => record.byteIdentical !== false),
  failureCount: timestampParityRecords.filter((record) => record.byteIdentical === false).length,
  records: timestampParityRecords
};
assert(timestampParityReport.passed, "Python and TypeScript timestamp normalization differ");
writeEvidence("python-typescript-freshness-parity-report.json", timestampParityReport);

const featureKey = expectedCanonicalKeys[0];
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
  layerId: "selectedAoi",
  layerName: "Selected AOI",
  geography: "Dubai processing envelope",
  snapshotDate: "2026-07-12",
  datasetReleaseDate: "2026-07-12",
  datasetSnapshotDate: "2026-07-12",
  accessedAt: "2026-07-13T00:00:00.000Z",
  validFrom: "2026-07-12",
  validTo: null,
  sourceReleaseId: "test",
  licenseId: "test",
  licenseUrl: "https://example.com/theme-license",
  attributionUrl: "https://example.com/attribution",
  attribution: "Test evidence only",
  buildMethod: "unit-test",
  buildVersion: "1",
  checksum: "test",
  freshnessPolicyId: "geoai-source-update-age-v1",
  caveat: types.spatialDataRequiredCaveatV1
};
const datasets = {
  synthetic: { ...baseDataset, datasetId: "synthetic", datasetVersion: "v1", sourceId: "synthetic", sourceMode: "synthetic_fallback" },
  open: { ...baseDataset, datasetId: "open", datasetVersion: "v1", sourceId: "overture", sourceMode: "open_snapshot" },
  openOsm: { ...baseDataset, datasetId: "open-osm", datasetVersion: "v1", sourceId: "osm-geofabrik", sourceMode: "open_snapshot" },
  licensed: { ...baseDataset, datasetId: "licensed", datasetVersion: "v1", sourceId: "licensed", sourceMode: "licensed" },
  client: { ...baseDataset, datasetId: "client", datasetVersion: "v1", sourceId: "client", sourceMode: "user_provided" },
  official: { ...baseDataset, datasetId: "official", datasetVersion: "v1", sourceId: "future-official", sourceMode: "official_validated" }
};
const provenance = {
  datasetReleaseDate: "2026-07-12",
  datasetSnapshotDate: "2026-07-12",
  sourceDataset: "test",
  sourceRecordId: "record",
  sourceRecordVersion: "1",
  themeLicenseId: "theme-test",
  themeLicenseUrl: "https://example.com/theme-license",
  sourceRecordLicenseId: "record-test",
  sourceRecordLicenseUrl: "https://example.com/record-license",
  sourceLicenseId: "test",
  sourceAttribution: "Test source attribution",
  attributionUrl: "https://example.com/attribution",
  sourceUpdatedAtRaw: "2026-07-12T00:00:00Z",
  sourceUpdatedAtEpoch: 1783814400,
  sourceUpdatedAt: "2026-07-12T00:00:00Z",
  sourceObservedAt: null,
  accessedAt: "2026-07-13T00:00:00.000Z",
  freshnessStatus: "current",
  freshnessPolicyId: "geoai-source-update-age-v1"
};
const featureBase = {
  type: "Feature",
  featureKey,
  sourceFeatureId: "record",
  sourceAliases: [{ sourceId: "test", sourceFeatureId: "record" }],
  sourceCrosswalks: [{ sourceId: "test", sourceFeatureId: "record", datasetVersion: "v1", validFrom: "2026-07-12", validTo: null, matchMethod: "test", matchConfidence: 1, sourceUpdatedAt: "2026-07-12T00:00:00Z", reviewStatus: "reviewed" }],
  sourceProvenance: [provenance],
  name: "Sample AOI",
  displayName: "Sample AOI",
  canonicalName: "Business Bay Sample 01",
  sourceObjectName: null,
  localName: null,
  englishName: "Sample AOI",
  alternateNames: [],
  identityScope: "canonical_registry",
  identityCrosswalkPolicy: "canonical_registry_provider_version_crosswalk_v1",
  contextArea: "Business Bay / Downtown / Meydan",
  businessNarrative: "Test precedence record.",
  category: "selected_aoi",
  subtype: "sample",
  geometry: polygon,
  centroid: { longitude: 55.135, latitude: 25.075 },
  areaSqm: null,
  geometryRole: "aoi",
  observedAt: null,
  validFrom: "2026-07-12",
  validTo: null,
  freshnessStatus: "current",
  freshnessPolicyId: "geoai-source-update-age-v1",
  sourceUpdatedAtRaw: "2026-07-12T00:00:00Z",
  sourceUpdatedAtEpoch: 1783814400,
  sourceUpdatedAt: "2026-07-12T00:00:00Z",
  confidenceLevel: "medium",
  scenarioRelevance: ["investmentSiteSelection"],
  limitations: [types.spatialDataRequiredCaveatV1],
  lineage: [],
  quality: validQuality,
  metadata: {}
};
const sourceVariants = [
  { id: "synthetic", geometryOrigin: "synthetic", geometryAccuracy: "approximate", validationStatus: "derived_screening" },
  { id: "open", geometryOrigin: "source", geometryAccuracy: "source_exact", validationStatus: "open_context" },
  { id: "licensed", geometryOrigin: "source", geometryAccuracy: "source_exact", validationStatus: "client_validated" },
  { id: "client", geometryOrigin: "user", geometryAccuracy: "source_exact", validationStatus: "client_validated" },
  { id: "official", geometryOrigin: "source", geometryAccuracy: "source_exact", validationStatus: "official_validated" }
];
const precedenceRows = sourceVariants.map((_, index) => {
  const included = sourceVariants.slice(0, index + 1);
  const repo = repository.createSpatialBundleRepositoryV1({
    bundleId: "precedence-test",
    bundleVersion: "1",
    generatedAt: "2026-07-13T00:00:00.000Z",
    defaultSourceMode: "synthetic_fallback",
    datasets: included.map((variant) => datasets[variant.id]),
    features: included.map((variant) => ({
      ...featureBase,
      datasetId: variant.id,
      datasetVersion: "v1",
      geometryOrigin: variant.geometryOrigin,
      geometryAccuracy: variant.geometryAccuracy,
      validationStatus: variant.validationStatus
    })),
    metrics: []
  });
  return {
    identicalFeatureKey: featureKey,
    availableSources: included.map((variant) => variant.id),
    resolvedSource: repo.resolveFeature(featureKey)?.datasetId
  };
});
const precedenceReport = {
  passed: precedenceRows.every((row, index) => row.resolvedSource === sourceVariants[index].id),
  matrix: precedenceRows
};
const crossProviderOpenRepository = repository.createSpatialBundleRepositoryV1({
  bundleId: "cross-provider-identity-test",
  bundleVersion: "1",
  generatedAt: "2026-07-13T00:00:00.000Z",
  defaultSourceMode: "synthetic_fallback",
  datasets: [datasets.synthetic, datasets.open, datasets.openOsm],
  features: [
    { ...featureBase, datasetId: "synthetic", datasetVersion: "v1", geometryOrigin: "synthetic", geometryAccuracy: "approximate", validationStatus: "derived_screening" },
    { ...featureBase, datasetId: "open", datasetVersion: "v1", sourceFeatureId: "overture-alias", geometryOrigin: "source", geometryAccuracy: "source_exact", validationStatus: "open_context" },
    { ...featureBase, datasetId: "open-osm", datasetVersion: "v1", sourceFeatureId: "way/123", geometryOrigin: "source", geometryAccuracy: "source_exact", validationStatus: "open_context" }
  ],
  metrics: []
});
precedenceReport.crossProviderOpenIdentity = {
  canonicalFeatureKey: featureKey,
  sourceDatasetIds: crossProviderOpenRepository.listFeatures().map((feature) => feature.datasetId),
  sourceFeatureIds: crossProviderOpenRepository.listFeatures().map((feature) => feature.sourceFeatureId),
  allVersionsShareCanonicalKey: crossProviderOpenRepository.listFeatures().every((feature) => feature.featureKey === featureKey)
};
precedenceReport.passed = precedenceReport.passed && precedenceReport.crossProviderOpenIdentity.allVersionsShareCanonicalKey;
assert(precedenceReport.passed, "source precedence matrix failed");
writeEvidence("source-precedence-resolver-matrix.json", precedenceReport);

const oldDataset = { ...datasets.open, datasetId: "open-old", datasetVersion: "2026-05-20.0" };
const newDataset = { ...datasets.open, datasetId: "open-new", datasetVersion: "2026-06-17.0" };
const refreshContext = (dataset) => ({
  dataset,
  countryCode: "ae",
  regionCode: "du",
  processingBbox: bbox,
  observedAt: null,
  scenarioRelevance: [],
  canonicalFeatureKey: featureKey,
  canonicalName: "Business Bay Sample 01",
  contextArea: "Business Bay / Downtown / Meydan",
  businessNarrative: "Provider refresh identity test."
});
const oldProviderFeature = overture.overtureSnapshotAdapterV1.normalizeFeature(
  { type: "Feature", id: "old-provider-id", geometry: polygon, properties: { id: "old-provider-id", type: "building", names: { primary: "Test Building" }, sources: [{ dataset: "provider-a", record_id: "old-alias", record_version: "1", update_time: "2026-01-01T00:00:00Z", license: "ODbL-1.0" }] } },
  refreshContext(oldDataset)
);
const newProviderFeature = overture.overtureSnapshotAdapterV1.normalizeFeature(
  { type: "Feature", id: "new-provider-id", geometry: polygon, properties: { id: "new-provider-id", type: "building", names: { primary: "Test Building" }, sources: [{ dataset: "provider-a", record_id: "new-alias", record_version: "2", update_time: "2026-06-01T00:00:00Z", license: "ODbL-1.0" }] } },
  refreshContext(newDataset)
);
assert(oldProviderFeature && newProviderFeature, "provider refresh fixtures failed to normalize");
const refreshReport = {
  passed: oldProviderFeature.featureKey === newProviderFeature.featureKey,
  businessKeyChanged: oldProviderFeature.featureKey !== newProviderFeature.featureKey,
  canonicalFeatureKey: oldProviderFeature.featureKey,
  oldGeometryVersion: oldDataset.datasetVersion,
  newGeometryVersion: newDataset.datasetVersion,
  oldProviderId: oldProviderFeature.sourceFeatureId,
  newProviderId: newProviderFeature.sourceFeatureId,
  oldAliases: oldProviderFeature.sourceAliases,
  newAliases: newProviderFeature.sourceAliases
};
assert(refreshReport.passed && !refreshReport.businessKeyChanged, "provider refresh changed business identity");
assert(oldProviderFeature.identityScope === "canonical_registry", "canonical provider refresh identity scope changed");
assert(oldProviderFeature.sourceProvenance[0].themeLicenseId === "test", "Overture theme licence changed");
assert(oldProviderFeature.sourceProvenance[0].sourceRecordLicenseId === "ODbL-1.0", "Overture source-record licence was flattened");
assert(
  oldProviderFeature.sourceProvenance[0].themeLicenseId !== oldProviderFeature.sourceProvenance[0].sourceRecordLicenseId,
  "theme and source-record licences must remain separate"
);
writeEvidence("provider-id-refresh-stability-report.json", refreshReport);

const context = { dataset: datasets.openOsm, countryCode: "ae", regionCode: "du", processingBbox: bbox, observedAt: null, scenarioRelevance: [] };
const osmNameEnFeature = osm.osmSnapshotAdapterV1.normalizeFeature(
  {
    type: "Feature",
    geometry: polygon,
    properties: {
      "@type": "way",
      "@id": 1,
      "@version": 2,
      "@timestamp": 1717243696,
      building: "yes",
      name: "مبنى تجريبي",
      "name:en": "Dubai Sample Building"
    }
  },
  context
);
assert(osmNameEnFeature?.validationStatus === "open_context", "OSM semantics failed");
assert(osmNameEnFeature.displayName === "Dubai Sample Building", "OSM name:en was not preferred");
assert(osmNameEnFeature.localName === "مبنى تجريبي", "OSM local name was not preserved");
assert(osmNameEnFeature.englishName === "Dubai Sample Building", "OSM English name was not preserved");
assert(osmNameEnFeature.identityScope === "source_stable", "named OSM identity scope changed");
assert(osmNameEnFeature.identityCrosswalkPolicy, "named OSM source-stable identity lacks crosswalk policy");
assert(osmNameEnFeature.sourceUpdatedAt === "2024-06-01T12:08:16.000Z", "OSM epoch seconds were not normalized");
assert(osmNameEnFeature.sourceUpdatedAtRaw === 1717243696, "OSM raw timestamp was not preserved");
assert(osmNameEnFeature.sourceUpdatedAtEpoch === 1717243696, "OSM epoch timestamp was not preserved");
assert(osmNameEnFeature.observedAt === null, "OSM source update time leaked into observedAt");

const line = { type: "LineString", coordinates: [[55.13, 25.07], [55.14, 25.08]] };
const osmCategoryFixtures = [
  { id: 2, geometry: line, properties: { highway: "primary" }, expected: "primary_corridor", layer: "transport" },
  { id: 3, geometry: line, properties: { railway: "subway" }, expected: "metro_corridor", layer: "transport" },
  { id: 4, geometry: { type: "Point", coordinates: [55.135, 25.075] }, properties: { public_transport: "station" }, expected: "transport_station_anchor", layer: "anchors" },
  { id: 5, geometry: { type: "Point", coordinates: [55.135, 25.075] }, properties: { tourism: "museum" }, expected: "tourism_anchor", layer: "anchors" },
  { id: 6, geometry: polygon, properties: { landuse: "industrial" }, expected: "industrial_landuse_context", layer: "landuse" },
  { id: 7, geometry: line, properties: { natural: "coastline" }, expected: "coastline_context", layer: "water" },
  { id: 8, geometry: polygon, properties: { building: "construction" }, expected: "construction_footprint", layer: "construction" },
  { id: 9, geometry: polygon, properties: { building: "yes" }, expected: "building_footprint", layer: "buildings" }
].map((fixture) => {
  const feature = osm.osmSnapshotAdapterV1.normalizeFeature(
    {
      type: "Feature",
      geometry: fixture.geometry,
      properties: { "@type": fixture.geometry.type === "Point" ? "node" : "way", "@id": fixture.id, "@timestamp": 1717243696, ...fixture.properties }
    },
    context
  );
  assert(feature, `OSM category fixture ${fixture.id} failed normalization`);
  return { ...fixture, category: feature.metadata.sourceCategory };
});
assert(osmCategoryFixtures.every((fixture) => fixture.category === fixture.expected), "layer-specific OSM categories changed");
assert(
  osmCategoryFixtures.filter((fixture) => fixture.layer !== "buildings").every((fixture) => !String(fixture.category).includes("building")),
  "wrong-layer OSM feature classified as building"
);
writeEvidence("typescript-layer-category-and-name-en-regression.json", {
  passed: true,
  nameEn: {
    displayName: osmNameEnFeature.displayName,
    localName: osmNameEnFeature.localName,
    englishName: osmNameEnFeature.englishName,
    displayNameSource: osmNameEnFeature.metadata.displayNameSource
  },
  categories: osmCategoryFixtures.map(({ id, expected, layer, category }) => ({ id, expected, layer, category }))
});
assert(osm.osmSnapshotAdapterV1.normalizeFeature({ type: "Feature", id: "generated/1", geometry: polygon, properties: { building: "yes" } }, context) === null, "OSM generated identity was accepted");

const productSources = fs.readFileSync("src/data/demo-layers.ts", "utf8") + fs.readFileSync("src/lib/spatial-data-adapter.ts", "utf8");
assert(!productSources.includes("spatial-b1"), "B1 bundle activated in Product");
assert(types.spatialValidationStatusLabelsV1.open_context === "Open-context geometry", "label changed");

console.log(JSON.stringify({ ok: true, checked: ["canonical registry parity", "timestamp parity", "geometry", "five-level precedence", "provider refresh stability", "layer categories", "multilingual naming", "licence provenance", "adapters", "no activation"] }, null, 2));
