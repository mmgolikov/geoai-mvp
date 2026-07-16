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
const adapter = load("@/src/lib/spatial-b2/map-layer-adapter");
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

const activationMatrix = {
  productionSynthetic: resolver.resolveSpatialActivation({ ...productionSyntheticRequest, bundle: fixtureBundle }),
  productionOpen: resolver.resolveSpatialActivation({ ...productionOpenRequest, bundle: fixtureBundle }),
  previewFixture: resolver.resolveSpatialActivation({ ...previewOpenRequest, bundle: fixtureBundle }),
  checksumMismatch: resolver.resolveSpatialActivation({
    ...previewOpenRequest,
    bundle: { ...fixtureBundle, bundleChecksum: "sha256:mismatch" }
  }),
  realReleaseNotReady: resolver.resolveSpatialActivation({
    ...previewOpenRequest,
    bundle: { ...fixtureBundle, controlledFixture: false, containsRealGeometry: true, releaseReady: false, deliveryApproved: true, distributionApproved: true, publicRepositoryGeometryApproved: false }
  }),
  realDistributionNotApproved: resolver.resolveSpatialActivation({
    ...previewOpenRequest,
    bundle: { ...fixtureBundle, controlledFixture: false, containsRealGeometry: true, releaseReady: true, deliveryApproved: true, distributionApproved: false, publicRepositoryGeometryApproved: false }
  }),
  unavailableLayer: resolver.resolveSpatialActivation({
    ...previewOpenRequest,
    bundle: { ...fixtureBundle, availableLayerKeys: ["fixture:controlled-osm-anchor"] }
  })
};

assert(activationMatrix.productionSynthetic.effectiveSourceMode === "synthetic_fallback", "Production synthetic mode must remain allowed");
assert(activationMatrix.productionSynthetic.requestAllowed, "Production synthetic request must be accepted");
assert(activationMatrix.productionOpen.effectiveSourceMode === "synthetic_fallback", "Production open request must fail closed");
assert(!activationMatrix.productionOpen.requestAllowed && Boolean(activationMatrix.productionOpen.fallbackReason), "Production rejection reason must be recorded");
assert(activationMatrix.previewFixture.effectiveSourceMode === "open_context_preview", "Preview controlled fixture must activate with a valid checksum");
assert(activationMatrix.previewFixture.openRealGeometryFeatureCount === 0, "Controlled Preview fixture must contain zero real geometry features");
assert(activationMatrix.checksumMismatch.effectiveSourceMode === "synthetic_fallback", "Checksum mismatch must use synthetic fallback");
assert(activationMatrix.realReleaseNotReady.effectiveSourceMode === "synthetic_fallback", "releaseReady=false real bundle must be rejected");
assert(activationMatrix.realDistributionNotApproved.effectiveSourceMode === "synthetic_fallback", "Distribution-unapproved real bundle must be rejected");
assert(activationMatrix.unavailableLayer.layerResults.some((item) => item.requestedLayerKey === "fixture:controlled-overture-area" && item.usedFallback), "Unavailable layer must use its layer-level fallback");

const deliveryInput = (deliveryMethod, publicRepositoryGeometryApproved) => ({
  deliveryMethod,
  releaseReady: true,
  deliveryApproved: true,
  distributionApproved: true,
  publicRepositoryGeometryApproved
});
const deliveryMatrix = {
  releaseAsset: resolver.evaluateSpatialDeliveryPolicy(deliveryInput("release_asset", false)),
  objectStorage: resolver.evaluateSpatialDeliveryPolicy(deliveryInput("object_storage", false)),
  vectorTiles: resolver.evaluateSpatialDeliveryPolicy(deliveryInput("vector_tiles", false)),
  repositoryRejected: resolver.evaluateSpatialDeliveryPolicy(deliveryInput("repository_fixture", false)),
  repositoryApproved: resolver.evaluateSpatialDeliveryPolicy(deliveryInput("repository_fixture", true))
};
assert(deliveryMatrix.releaseAsset.allowed && !deliveryMatrix.releaseAsset.repositoryApprovalRequired, "Approved release assets must not require public-repository approval");
assert(deliveryMatrix.objectStorage.allowed && !deliveryMatrix.objectStorage.repositoryApprovalRequired, "Approved object storage must not require public-repository approval");
assert(deliveryMatrix.vectorTiles.allowed && !deliveryMatrix.vectorTiles.repositoryApprovalRequired, "Approved vector tiles must not require public-repository approval");
assert(!deliveryMatrix.repositoryRejected.allowed && deliveryMatrix.repositoryRejected.repositoryApprovalRequired, "Repository fixture must fail without repository approval");
assert(deliveryMatrix.repositoryApproved.allowed && deliveryMatrix.repositoryApproved.repositoryApprovalRequired, "Repository fixture may pass only with repository approval");

assert(demoLayers.length === 8, "Current synthetic layer count must remain eight");
assert(demoLayers.filter((layer) => layer.visibleByDefault).length === 5, "Current default-visible synthetic layer count must remain five");
assert(activationMatrix.productionSynthetic.syntheticLayerCount === demoLayers.length, "Resolved synthetic catalogue must preserve every current demo layer");
assert(activationMatrix.productionSynthetic.defaultVisibleSyntheticLayerCount === 5, "Resolved catalogue must preserve current default visibility");

const layerKeys = new Set(catalogue.spatialLayerCatalogue.map((entry) => entry.layerKey));
assert(catalogue.spatialLayerCatalogue.every((entry) => layerKeys.has(entry.fallbackLayerKey)), "Every catalogue layer must have an existing fallback");
assert(fixtureBundle.controlledFixture && !fixtureBundle.containsRealGeometry, "Only a controlled non-real fixture may be loaded in B2A");
assert(fixtureBundle.publicRepositoryGeometryApproved === false, "Public repository geometry approval must remain false");
assert(fixtureBundle.bundle.features.every((feature) => feature.metadata.realGeometry === false), "Fixture metadata must mark every geometry as non-real");

const baseFeature = fixtureBundle.bundle.features[0];
const statusFeature = (validationStatus, geometryOrigin, sourceAlignmentStatus) => ({
  ...baseFeature,
  validationStatus,
  geometryOrigin,
  quality: { ...baseFeature.quality, sourceAlignmentStatus },
  metadata: { controlledFixture: false, realGeometry: false }
});
const adapterStatusMatrix = {
  synthetic_fallback: adapter.deriveSpatialProductStatus({ sourceMode: "synthetic_fallback", feature: statusFeature("open_context", "synthetic", "pending_independent_review") }),
  open_context_preview: adapter.deriveSpatialProductStatus({ sourceMode: "open_context_preview", feature: statusFeature("open_context", "synthetic", "pending_independent_review") }),
  licensed_provider: adapter.deriveSpatialProductStatus({ sourceMode: "licensed_provider", feature: statusFeature("open_context", "source", "reviewed_with_conditions") }),
  client_validated: adapter.deriveSpatialProductStatus({ sourceMode: "client_validated", feature: statusFeature("client_validated", "source", "reviewed") }),
  official_validated: adapter.deriveSpatialProductStatus({ sourceMode: "official_validated", feature: statusFeature("official_validated", "source", "reviewed") })
};
assert(adapterStatusMatrix.synthetic_fallback.sourceStatus === "mock" && adapterStatusMatrix.synthetic_fallback.geometryStatus === "seed_demo", "Synthetic mapping must remain mock seed geometry");
assert(adapterStatusMatrix.open_context_preview.officialStatus === "not-official", "Open-context mapping must not be official");
assert(adapterStatusMatrix.licensed_provider.officialStatus === "not-official", "Licensed-provider mapping must not be client or official validated");
assert(adapterStatusMatrix.client_validated.officialStatus === "client-validated-contract", "Explicit client validation must remain distinct from official validation");
assert(adapterStatusMatrix.official_validated.officialStatus === "official-validated-contract", "Official status requires an explicitly official-validated contract record");
const controlledFixtureMapFeature = adapter.adaptControlledFixtureToMapFeature({
  feature: baseFeature,
  dataset: fixtureBundle.bundle.datasets.find((item) => item.datasetId === baseFeature.datasetId),
  catalogueEntry: catalogue.spatialLayerCatalogue.find((item) => item.datasetId === baseFeature.datasetId),
  style: { fillColor: "#174f63", strokeColor: "#ffffff", strokeWidth: 1, fillOpacity: 1, strokeOpacity: 1, pointRadius: 6, layerOrder: 1, clickPriority: 1 }
});
assert(controlledFixtureMapFeature.properties.spatialB2Fixture && controlledFixtureMapFeature.properties.sourceStatus === "mock", "Fixture-only adapter must identify the controlled non-real fixture as mock");

const fixtureDataset = fixtureBundle.bundle.datasets.find((item) => item.datasetId === baseFeature.datasetId);
const fixtureCatalogueEntry = catalogue.spatialLayerCatalogue.find((item) => item.datasetId === baseFeature.datasetId);
const fixtureLineage = selectionLineage.createSpatialSelectionLineage({
  feature: baseFeature,
  dataset: fixtureDataset,
  catalogueEntry: fixtureCatalogueEntry
});
assert(fixtureLineage.sourceId === "controlled-osm-attribution-fixture", "Controlled point source ID must remain distinct");
assert(fixtureLineage.providerFeatureId === "invented-point-01", "Controlled point provider feature ID must remain distinct");
assert(fixtureLineage.sourceRecordId === "invented-point-01", "Controlled point source record ID must be preserved when available");
assert(selectionLineage.canonicalFeatureKeySurvivesVersionChange(
  { canonicalFeatureKey: "geoai:controlled-fixture:stable", datasetVersion: "fixture-v1" },
  { canonicalFeatureKey: "geoai:controlled-fixture:stable", datasetVersion: "fixture-v2" }
), "Canonical key must survive source-version change");

const visibleInput = {
  catalogueLayers: [{ visible: true, attributionIds: ["geoai-sample-layers"] }],
  localOpenGeodataVisible: true,
  userUploadedDataVisible: false
};
const visibleAttributionIds = attribution.deriveVisibleSpatialAttributionIds(visibleInput);
const hiddenFixtureAttributionIds = attribution.deriveVisibleSpatialAttributionIds({ ...visibleInput, localOpenGeodataVisible: false });
const uploadedAttributionIds = attribution.deriveVisibleSpatialAttributionIds({ ...visibleInput, userUploadedDataVisible: true });
const coverage = attribution.findSpatialAttributionCoverageMismatch(visibleInput, visibleAttributionIds);
const deliberateMismatch = attribution.findSpatialAttributionCoverageMismatch(visibleInput, ["geoai-sample-layers"]);
assert(visibleAttributionIds.includes("local-open-geodata-fixture"), "Visible local fixture must have matching attribution");
assert(!hiddenFixtureAttributionIds.includes("local-open-geodata-fixture"), "Hidden local fixture must remove its attribution");
assert(uploadedAttributionIds.includes("user-provided-local-data"), "Visible uploaded data must have user-data attribution");
assert(coverage.missing.length === 0 && coverage.unexpected.length === 0, "Visible layer and active attribution IDs must match exactly");
assert(deliberateMismatch.missing.includes("local-open-geodata-fixture"), "Coverage guard must detect missing visible-fixture attribution");

const mapboxAttribution = attribution.aggregateSpatialAttribution({
  sourceMode: "synthetic_fallback",
  basemapMode: "mapbox",
  activeAttributionIds: visibleAttributionIds
});
const fallbackAttribution = attribution.aggregateSpatialAttribution({
  sourceMode: "synthetic_fallback",
  basemapMode: "fallback_grid",
  activeAttributionIds: hiddenFixtureAttributionIds
});
const controlledAttribution = attribution.aggregateSpatialAttribution({
  sourceMode: "open_context_preview",
  basemapMode: "mapbox",
  activeAttributionIds: activationMatrix.previewFixture.activeAttributionIds
});
assert(mapboxAttribution.basemapAttribution?.id === "mapbox-basemap", "Mapbox mode must include Mapbox attribution");
assert(fallbackAttribution.basemapAttribution === null, "Fallback grid must not include a Mapbox attribution record");
assert(controlledAttribution.overlayAttributions.some((item) => item.id === "controlled-open-context-point-fixture"), "Controlled point attribution must be explicit");
assert(!mapboxAttribution.overlayAttributions.some((item) => /OpenStreetMap|ODbL/i.test(`${item.sourceName} ${item.notice} ${item.licenseName ?? ""}`)), "Legacy local fixture must not infer OpenStreetMap or ODbL provenance");

const normalizedReportSnapshot = reportMapSnapshot.normalizeReportMapSnapshot({
  src: "/report-map-snapshots/dubai-marina-seeded.png",
  width: 382,
  height: 358,
  capturedAt: "2026-07-14T00:00:00.000Z",
  targetLabel: "Controlled report contract",
  source: "seeded-dashboard-map",
  attribution: controlledAttribution,
  selectedFeatureLineage: fixtureLineage
});
assert(normalizedReportSnapshot?.attribution?.activeAttributionIds.length > 0, "Report map snapshot must preserve deterministic attribution");
assert(normalizedReportSnapshot?.selectedFeatureLineage?.providerFeatureId === "invented-point-01", "Report snapshot must preserve provider feature identity");
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
const explorePage = fs.readFileSync(path.join(process.cwd(), "app/explore/page.tsx"), "utf8");
const workspaceShell = fs.readFileSync(path.join(process.cwd(), "components/workspace-shell.tsx"), "utf8");
const mapClient = fs.readFileSync(path.join(process.cwd(), "components/map-workspace-client.tsx"), "utf8");
const landingMap = fs.readFileSync(path.join(process.cwd(), "components/landing-hero-map.tsx"), "utf8");
const reportMapPreview = fs.readFileSync(path.join(process.cwd(), "components/report-map-preview.tsx"), "utf8");
const uploadedDatasetRoute = fs.readFileSync(path.join(process.cwd(), "app/api/uploaded-datasets/route.ts"), "utf8");
const evidenceUploadRoute = fs.readFileSync(path.join(process.cwd(), "app/api/storage/evidence-files/route.ts"), "utf8");
const modalHook = fs.readFileSync(path.join(process.cwd(), "components/use-accessible-modal.ts"), "utf8");
assert(workspacePage.includes("createSpatialSourceRequest"), "Workspace source request must be resolved on the server");
assert(explorePage.includes("createSpatialSourceRequest") && explorePage.includes("spatialSourceRequest={spatialSourceRequest}"), "Explore source request must be resolved and wired on the server");
assert(/spatialSourceRequest:\s*SpatialSourceRequest/.test(workspaceShell) && !workspaceShell.includes("defaultSpatialSourceRequest"), "WorkspaceShell must require a server-resolved source request and have no development fallback");
assert(!/localStorage[^\n]*spatial/i.test(mapClient), "No localStorage spatial source-mode bypass may exist");
assert(!/[?&]spatialMode=.*open_context_preview/.test(mapClient), "Map client must not construct an open-mode URL bypass");
assert(mapClient.includes("removeControlledFixtureLayerFromMap"), "Activation synchronization must remove obsolete controlled fixture layers and sources");
assert(mapClient.includes("syncOpenGeodataVisibility"), "Local fixture visibility must synchronize with the existing map");
assert(!/>OSM</.test(mapClient), "Legacy local fixture must not be labelled as OSM");
assert(mapClient.includes("local fixture") && mapClient.includes("OSM-style sample"), "Legacy fixture must use approved local-fixture wording");
assert(!mapClient.includes("console.error ="), "Map runtime must not monkeypatch global console.error observability");
assert(mapClient.includes("!mapReady") && mapClient.includes("Map did not become ready in time"), "Map watchdog must fail over when readiness stalls, not only when construction fails");
assert(mapClient.includes("Select sample map center"), "Fallback map must expose a keyboard-operable point-selection control");
assert(landingMap.includes("attributionControl: true"), "Landing Mapbox attribution must be visible through the native control");
assert(reportMapPreview.includes("attributionControl: true"), "Live report Mapbox preview must expose native attribution");
assert(!workspaceShell.includes("/api/uploaded-datasets") && !workspaceShell.includes("/api/aois"), "Public-demo uploads and AOIs must remain browser-local");
assert(uploadedDatasetRoute.includes('repositoryModeFields("browser_local")') && !uploadedDatasetRoute.includes("parsedContent"), "Uploaded-dataset API must not persist or accept browser geometry in public demo");
assert(evidenceUploadRoute.indexOf('isPreAuthServerMutationBlocked("upload")') < evidenceUploadRoute.indexOf("request.formData()"), "Evidence upload must deny before parsing multipart data while request identity is unavailable");
assert(modalHook.includes('document.body.style.overflow = "hidden"'), "Accessible dialogs must lock background scrolling");
assert(modalHook.includes('event.key !== "Tab"') && modalHook.includes('event.key === "Escape"'), "Accessible dialogs must trap focus and close on Escape");

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

writeEvidence("source-mode-matrix.json", activationMatrix);
writeEvidence("delivery-policy-matrix.json", deliveryMatrix);
writeEvidence("generic-adapter-status-matrix.json", adapterStatusMatrix);
writeEvidence("layer-catalogue.json", catalogue.spatialLayerCatalogue);
writeEvidence("activation-result.json", activationMatrix.previewFixture);
writeEvidence("fallback-rollback-report.json", {
  productionOpen: activationMatrix.productionOpen,
  checksumMismatch: activationMatrix.checksumMismatch,
  unavailableLayer: activationMatrix.unavailableLayer,
  realReleaseNotReady: activationMatrix.realReleaseNotReady,
  realDistributionNotApproved: activationMatrix.realDistributionNotApproved
});
writeEvidence("attribution-aggregation.json", {
  mapboxAttribution,
  fallbackAttribution,
  controlledAttribution,
  visibleAttributionIds,
  hiddenFixtureAttributionIds,
  uploadedAttributionIds,
  coverage
});
writeEvidence("source-lineage-example.json", fixtureLineage);
writeEvidence("spatial-b2-source-check.json", { passed: assertions.every((item) => item.passed), assertions });

console.log(`Spatial B2A integration check passed (${assertions.length} assertions).`);
