import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const cache = new Map();
const assertions = [];
const assert = (condition, message) => {
  assertions.push({ message, passed: Boolean(condition) });
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
  const evidenceDir = process.env.SPATIAL_B2_EVIDENCE_DIR;
  if (!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

const sourceMode = load("@/src/lib/spatial-b2/source-mode");
const catalogue = load("@/src/lib/spatial-b2/layer-catalogue");
const loader = load("@/src/lib/spatial-b2/bundle-loader");
const resolver = load("@/src/lib/spatial-b2/activation-resolver");
const attribution = load("@/src/lib/spatial-b2/attribution");
const selectionLineage = load("@/src/lib/spatial-b2/selection-lineage");
const reportMapSnapshot = load("@/src/lib/report-map-snapshot");
const demoLayers = load("@/src/data/demo-layers").demoLayers;
const spatialTypes = load("@/src/types/spatial-data-v1");

const fixtureBundle = loader.loadSpatialBundle("static_test_fixture");
const productionSyntheticRequest = sourceMode.createSpatialSourceRequest({
  requestedSourceMode: "synthetic_fallback",
  vercelEnvironment: "production",
  nodeEnvironment: "production"
});
const productionOpenRequest = sourceMode.createSpatialSourceRequest({
  requestedSourceMode: "open_context_preview",
  vercelEnvironment: "production",
  nodeEnvironment: "production"
});
const previewOpenRequest = sourceMode.createSpatialSourceRequest({
  requestedSourceMode: "open_context_preview",
  vercelEnvironment: "preview",
  nodeEnvironment: "production"
});

const matrix = {
  productionSynthetic: resolver.resolveSpatialActivation({ ...productionSyntheticRequest, bundle: fixtureBundle }),
  productionOpen: resolver.resolveSpatialActivation({ ...productionOpenRequest, bundle: fixtureBundle }),
  previewFixture: resolver.resolveSpatialActivation({ ...previewOpenRequest, bundle: fixtureBundle }),
  checksumMismatch: resolver.resolveSpatialActivation({
    ...previewOpenRequest,
    bundle: { ...fixtureBundle, bundleChecksum: "sha256:mismatch" }
  }),
  realReleaseNotReady: resolver.resolveSpatialActivation({
    ...previewOpenRequest,
    bundle: { ...fixtureBundle, controlledFixture: false, containsRealGeometry: true, releaseReady: false, distributionApproved: true, publicRepositoryGeometryApproved: true }
  }),
  realDistributionNotApproved: resolver.resolveSpatialActivation({
    ...previewOpenRequest,
    bundle: { ...fixtureBundle, controlledFixture: false, containsRealGeometry: true, releaseReady: true, distributionApproved: false, publicRepositoryGeometryApproved: true }
  }),
  unavailableLayer: resolver.resolveSpatialActivation({
    ...previewOpenRequest,
    bundle: { ...fixtureBundle, availableLayerKeys: ["fixture:controlled-osm-anchor"] }
  })
};

assert(matrix.productionSynthetic.effectiveSourceMode === "synthetic_fallback", "Production synthetic mode must remain allowed");
assert(matrix.productionSynthetic.requestAllowed, "Production synthetic request must be accepted");
assert(matrix.productionOpen.effectiveSourceMode === "synthetic_fallback", "Production open request must fail closed");
assert(!matrix.productionOpen.requestAllowed && Boolean(matrix.productionOpen.fallbackReason), "Production rejection reason must be recorded");
assert(matrix.previewFixture.effectiveSourceMode === "open_context_preview", "Preview controlled fixture must activate with a valid checksum");
assert(matrix.previewFixture.openRealGeometryFeatureCount === 0, "Controlled Preview fixture must contain zero real geometry features");
assert(matrix.checksumMismatch.effectiveSourceMode === "synthetic_fallback", "Checksum mismatch must use synthetic fallback");
assert(matrix.realReleaseNotReady.effectiveSourceMode === "synthetic_fallback", "releaseReady=false real bundle must be rejected");
assert(matrix.realDistributionNotApproved.effectiveSourceMode === "synthetic_fallback", "Distribution-unapproved real bundle must be rejected");
assert(matrix.unavailableLayer.layerResults.some((item) => item.requestedLayerKey === "fixture:controlled-overture-area" && item.usedFallback), "Unavailable layer must use its layer-level fallback");

assert(demoLayers.length === 8, "Current synthetic layer count must remain eight");
assert(demoLayers.filter((layer) => layer.visibleByDefault).length === 5, "Current default-visible synthetic layer count must remain five");
assert(matrix.productionSynthetic.syntheticLayerCount === demoLayers.length, "Resolved synthetic catalogue must preserve every current demo layer");
assert(matrix.productionSynthetic.defaultVisibleSyntheticLayerCount === 5, "Resolved catalogue must preserve current default visibility");

const layerKeys = new Set(catalogue.spatialLayerCatalogue.map((entry) => entry.layerKey));
assert(catalogue.spatialLayerCatalogue.every((entry) => layerKeys.has(entry.fallbackLayerKey)), "Every catalogue layer must have an existing fallback");
assert(fixtureBundle.controlledFixture && !fixtureBundle.containsRealGeometry, "Only a controlled non-real fixture may be loaded in B2A");
assert(fixtureBundle.publicRepositoryGeometryApproved === false, "Public repository geometry approval must remain false");
assert(fixtureBundle.bundle.features.every((feature) => feature.metadata.realGeometry === false), "Fixture metadata must mark every geometry as non-real");

const previousIdentity = { canonicalFeatureKey: "geoai:controlled-fixture:stable", datasetVersion: "fixture-v1" };
const nextIdentity = { canonicalFeatureKey: "geoai:controlled-fixture:stable", datasetVersion: "fixture-v2" };
assert(selectionLineage.canonicalFeatureKeySurvivesVersionChange(previousIdentity, nextIdentity), "Canonical key must survive source-version change");

const syntheticAttribution = attribution.aggregateSpatialAttribution({
  sourceMode: "synthetic_fallback",
  activeAttributionIds: ["geoai-sample-layers"]
});
const osmAttribution = attribution.aggregateSpatialAttribution({
  sourceMode: "open_context_preview",
  activeAttributionIds: ["openstreetmap"]
});
const overtureAttribution = attribution.aggregateSpatialAttribution({
  sourceMode: "open_context_preview",
  activeAttributionIds: ["controlled-overture-source-provider", "overture-maps-foundation"]
});
assert(syntheticAttribution.basemapAttribution.id === "mapbox-basemap", "Mapbox attribution must remain additive");
assert(!syntheticAttribution.overlayAttributions.some((item) => item.id === "openstreetmap"), "Inactive OSM attribution must not be shown");
assert(osmAttribution.overlayAttributions.map((item) => item.id).join(",") === "openstreetmap", "OSM attribution must be deterministic");
assert(overtureAttribution.overlayAttributions.map((item) => item.id).join(",") === "controlled-overture-source-provider,overture-maps-foundation", "Overture and source-provider attribution must remain separate and deterministic");

const normalizedReportSnapshot = reportMapSnapshot.normalizeReportMapSnapshot({
  src: "/report-map-snapshots/dubai-marina-seeded.png",
  width: 382,
  height: 358,
  capturedAt: "2026-07-14T00:00:00.000Z",
  targetLabel: "Controlled report contract",
  source: "seeded-dashboard-map",
  attribution: overtureAttribution
});
assert(normalizedReportSnapshot?.attribution?.activeAttributionIds.length === 2, "Report map snapshot must preserve a valid deterministic attribution payload");
const rejectedReportAttribution = reportMapSnapshot.normalizeReportMapSnapshot({
  src: "/report-map-snapshots/dubai-marina-seeded.png",
  width: 382,
  height: 358,
  capturedAt: "2026-07-14T00:00:00.000Z",
  targetLabel: "Controlled report contract",
  source: "seeded-dashboard-map",
  attribution: { schemaVersion: "unknown" }
});
assert(!rejectedReportAttribution?.attribution, "Malformed optional report attribution must fail closed without invalidating the map snapshot");

const workspacePage = fs.readFileSync(path.join(process.cwd(), "app/workspace/page.tsx"), "utf8");
const mapClient = fs.readFileSync(path.join(process.cwd(), "components/map-workspace-client.tsx"), "utf8");
assert(workspacePage.includes("createSpatialSourceRequest"), "Workspace source request must be resolved on the server");
assert(!/localStorage[^\n]*spatial/i.test(mapClient), "No localStorage spatial source-mode bypass may exist");
assert(!/[?&]spatialMode=.*open_context_preview/.test(mapClient), "Map client must not construct an open-mode URL bypass");

const requiredCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const b2SourceFiles = [
  "src/lib/spatial-b2/source-mode.ts",
  "src/lib/spatial-b2/layer-catalogue.ts",
  "src/lib/spatial-b2/bundle-loader.ts",
  "src/lib/spatial-b2/activation-resolver.ts",
  "src/lib/spatial-b2/map-layer-adapter.ts",
  "src/lib/spatial-b2/attribution.ts",
  "src/lib/spatial-b2/selection-lineage.ts",
  "components/spatial-data-attribution.tsx",
  "components/spatial-source-lineage-drawer.tsx"
];
const b2Source = b2SourceFiles.map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
assert(spatialTypes.spatialDataRequiredCaveatV1 === requiredCaveat, "Required caveat must remain in the B2A Product contract");
assert(!/open geometry (is )?(active|enabled)/i.test(b2Source), "No Product claim may say open geometry is active");
assert(!/live (DLD|GeoDubai) integration/i.test(b2Source), "No live official integration claim may exist");

writeEvidence("source-mode-matrix.json", matrix);
writeEvidence("layer-catalogue.json", catalogue.spatialLayerCatalogue);
writeEvidence("activation-result.json", matrix.previewFixture);
writeEvidence("fallback-rollback-report.json", {
  productionOpen: matrix.productionOpen,
  checksumMismatch: matrix.checksumMismatch,
  unavailableLayer: matrix.unavailableLayer,
  realReleaseNotReady: matrix.realReleaseNotReady,
  realDistributionNotApproved: matrix.realDistributionNotApproved
});
writeEvidence("attribution-aggregation.json", { syntheticAttribution, osmAttribution, overtureAttribution });
writeEvidence("source-lineage-example.json", {
  canonicalFeatureKey: fixtureBundle.bundle.features[0].featureKey,
  datasetVersion: fixtureBundle.bundle.features[0].datasetVersion,
  sourceAliases: fixtureBundle.bundle.features[0].sourceAliases,
  limitations: fixtureBundle.bundle.features[0].limitations
});
writeEvidence("spatial-b2-source-check.json", { passed: assertions.every((item) => item.passed), assertions });

console.log(`Spatial B2A integration check passed (${assertions.length} assertions).`);
