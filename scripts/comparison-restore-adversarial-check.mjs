import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const restorePath = "src/lib/comparison-restore.ts";
const workspacePath = "components/workspace-shell.tsx";
const [restoreSource, workspaceSource] = await Promise.all([
  readFile(new URL(restorePath, root), "utf8"),
  readFile(new URL(workspacePath, root), "utf8")
]);

const transpiled = ts.transpileModule(restoreSource, {
  fileName: restorePath,
  reportDiagnostics: true,
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    strict: true
  }
});
const errors = (transpiled.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
);
assert.equal(
  errors.length,
  0,
  errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("; ")
);

assert.match(restoreSource, /createMockComparison\(items, customQuery\)/);
assert.match(restoreSource, /return \{ \.\.\.rebuilt, id: comparisonId, project: expectedProject \}/);
assert.match(restoreSource, /matchesSeededComparisonOverride\(rebuilt, comparisonId, expectedProject, customQuery\)/);
assert.match(restoreSource, /getDemoFeatureById\(id\)/);
assert.match(restoreSource, /generateExploreCandidates\(\{/);
assert.match(restoreSource, /getExploreScenariosByAudience\(audience\)/);
assert.match(restoreSource, /exploreCandidateToSelectedObject\(candidate\)/);
assert.match(restoreSource, /readBrowserUploadedDatasets\(\)\.find/);
assert.match(restoreSource, /candidate\.projectKey === expectedProject\.projectKey/);
assert.match(restoreSource, /readMatchingAoiProjectIdentity\(value\.projectId, expectedProject\)/);
assert.match(restoreSource, /projectId: projectIdentity/);
assert.match(restoreSource, /readBrowserAois\(\)\.find/);
assert.match(restoreSource, /coordinateListsMatch\(normalizedPersistedCoordinates, canonicalCoordinates\)/);
assert.doesNotMatch(restoreSource, /return isRestorableComparison\(parsed/);
assert.match(
  workspaceSource,
  /readBrowserComparisonRecord\(requestedProjectKey, comparisonId, activeProject\)/
);

function dataModule(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

const browserStorageModule = dataModule(`
  export const browserDemoStorageKey = (name) => \`test:\${name}\`;
  export const isBrowserDemoStorageEnabled = () => true;
`);
const demoLayerModule = dataModule(`
  const feature = {
    type: "Feature",
    id: "registry-development-1",
    properties: {
      id: "registry-development-1",
      name: "Canonical development site",
      objectType: "Development screening area",
      layerId: "developmentZones",
      layerName: "Canonical development registry",
      geometryType: "polygon"
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[55.19, 25.04], [55.21, 25.04], [55.21, 25.06], [55.19, 25.06], [55.19, 25.04]]]
    }
  };
  export const getDemoFeatureById = (id) => id === feature.id ? feature : null;
  export const getSelectedDemoObject = (selected) => ({
    id: selected.properties.id,
    name: selected.properties.name,
    type: selected.properties.objectType,
    layerId: selected.properties.layerId,
    layerName: selected.properties.layerName,
    geometryType: selected.properties.geometryType,
    center: { latitude: 25.05, longitude: 55.2 },
    spatialContext: {
      featureId: selected.properties.id,
      featureName: selected.properties.name,
      datasetId: "canonical-development-dataset",
      datasetName: selected.properties.layerName,
      category: "development_zone",
      subtype: "development screening area",
      geometryType: "Polygon",
      centroid: { latitude: 25.05, longitude: 55.2 },
      sourceId: "canonical-demo-registry",
      sourceStatus: "snapshot_available",
      geometryStatus: "seed_demo",
      confidenceLevel: "demo",
      limitations: ["Official validation required."],
      scenarioRelevance: ["investmentSiteSelection"]
    },
    analysisTarget: {
      id: selected.properties.id,
      type: "demo-feature",
      label: selected.properties.name,
      coordinates: { latitude: 25.05, longitude: 55.2 },
      geometry: selected.geometry,
      datasetName: selected.properties.layerName,
      sourceMode: "demo",
      officialStatus: "not-official"
    }
  });
`);
const guidedDemoModule = dataModule(`
  export const guidedDemoPresets = [{
    id: "dubai-south-development",
    title: "Dubai South development pipeline",
    scenarioId: "realEstateDevelopment",
    selectedAreaLabel: "Dubai South growth corridor",
    geometryType: "polygon",
    center: { latitude: 24.8887, longitude: 55.1542 },
    projectKey: "developer-land-pipeline-demo"
  }];
  export const createGuidedDemoSelection = (preset) => ({
    id: "guided-demo-dubai-south-growth-corridor",
    name: preset.selectedAreaLabel,
    type: "Illustrative screening geometry",
    layerId: "futureCustomerAssets",
    layerName: "Local screening geometries",
    geometryType: "polygon",
    center: preset.center,
    analysisTarget: {
      id: "dubai-south-growth-corridor",
      type: "uploaded-feature",
      label: preset.selectedAreaLabel,
      coordinates: preset.center,
      datasetId: "guided-demo-geojson-sites",
      datasetName: "Local screening geometries",
      sourceMode: "sample-fixture",
      officialStatus: "official-validation-required"
    }
  });
`);
const seededReportsModule = dataModule(`
  export const seededDemoRecentAnalyses = [];
  export const seededDemoComparisonSummaries = [];
`);
const aoiLibraryModule = dataModule(`
  export const readBrowserAois = () => globalThis.__comparisonAoiRegistry ?? [];
`);
const exploreCandidatesModule = dataModule(`
  const candidates = [
    {
      id: "b2b-100ha-dubai-south",
      scenarioId: "b2b_redevelopment_100ha",
      audience: "b2b",
      candidateType: "development_zone",
      title: "Dubai South large-zone hypothesis",
      geometry: { type: "polygon", coordinates: [[55.105, 24.952], [55.205, 24.956], [55.21, 24.875], [55.116, 24.868], [55.105, 24.952]] },
      center: { latitude: 24.91275, longitude: 55.159 },
      score: 84,
      confidence: "medium",
      sourceType: "demo_seed",
      caveats: ["Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."]
    },
    {
      id: "b2b-100ha-expo-jebel-ali",
      scenarioId: "b2b_redevelopment_100ha",
      audience: "b2b",
      candidateType: "redevelopment_zone",
      title: "Expo to Jebel Ali transition hypothesis",
      geometry: { type: "polygon", coordinates: [[55.002, 24.999], [55.094, 25.004], [55.101, 24.927], [55.009, 24.921], [55.002, 24.999]] },
      center: { latitude: 24.96275, longitude: 55.0515 },
      score: 80,
      confidence: "medium",
      sourceType: "demo_seed",
      caveats: ["Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."]
    },
    {
      id: "b2b-100ha-al-warsan",
      scenarioId: "b2b_redevelopment_100ha",
      audience: "b2b",
      candidateType: "development_zone",
      title: "Al Warsan expansion hypothesis",
      geometry: { type: "polygon", coordinates: [[55.392, 25.19], [55.481, 25.191], [55.482, 25.113], [55.397, 25.112], [55.392, 25.19]] },
      center: { latitude: 25.1515, longitude: 55.438 },
      score: 76,
      confidence: "medium",
      sourceType: "demo_seed",
      caveats: ["Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."]
    }
  ];
  export function generateExploreCandidates(input) {
    globalThis.__lastExploreGeneratorInput = structuredClone(input);
    return input.audience === "b2b" && input.scenarioId === "b2b_redevelopment_100ha"
      ? structuredClone(candidates)
      : [];
  }
`);
const exploreScenariosModule = dataModule(`
  const b2bScenario = {
    id: "b2b_redevelopment_100ha",
    audience: "b2b",
    defaultRoleHints: ["developer", "real_estate_fund"],
    interactionModes: ["criteria_first", "map_first"],
    sampleQueries: ["Find redevelopment zones over 100 hectares."],
    inputSchema: []
  };
  const b2cScenario = {
    id: "b2c_point_context",
    audience: "b2c",
    defaultRoleHints: ["home_buyer"],
    interactionModes: ["criteria_first", "map_first"],
    sampleQueries: ["Find a home context."],
    inputSchema: []
  };
  export const getDefaultFilters = () => ({});
  export const getDefaultRoleForAudience = (audience) => audience === "b2b" ? "developer" : "home_buyer";
  export const getExploreScenariosByAudience = (audience) => audience === "b2b" ? [b2bScenario] : [b2cScenario];
  export const isExploreRoleForAudience = (audience, role) =>
    audience === "b2b"
      ? ["developer", "real_estate_fund", "bank_lender", "government_urban_authority", "family_office"].includes(role)
      : ["home_buyer", "family_relocation"].includes(role);
`);
const exploreBridgeModule = dataModule(`
  export const exploreScenarioToAnalysisScenario = (scenarioId) =>
    scenarioId === "b2b_redevelopment_100ha" ? "investmentSiteSelection" : "customQuery";
  export function exploreCandidateToSelectedObject(candidate) {
    return {
      id: \`explore-\${candidate.id}\`,
      name: candidate.title,
      type: candidate.candidateType.replace(/_/g, " "),
      layerId: "developmentZones",
      layerName: "GeoAI Explore candidates",
      geometryType: "polygon",
      center: candidate.center,
      analysisTarget: {
        id: candidate.id,
        type: "demo-feature",
        label: candidate.title,
        coordinates: candidate.center,
        geometry: { type: "Polygon", coordinates: [candidate.geometry.coordinates] },
        properties: {
          scenarioId: candidate.scenarioId,
          sourceType: candidate.sourceType,
          score: candidate.score,
          confidence: candidate.confidence,
          caveat: candidate.caveats[0]
        },
        datasetId: "geoai-explore-candidates",
        datasetName: "GeoAI Explore candidates",
        sourceMode: "demo",
        officialStatus: "official-validation-required"
      }
    };
  }
`);
const uploadedDataModule = dataModule(`
  export const readBrowserUploadedDatasets = () => globalThis.__comparisonUploadedDatasets ?? [];
`);
const comparisonModule = dataModule(`
  const format = (point) => \`\${point.latitude.toFixed(5)}, \${point.longitude.toFixed(5)}\`;
  export function createComparisonItem(point, selectedObject, scenarioId, selectedAoi) {
    const itemType = selectedAoi ? "aoi" : selectedObject ? "object" : "point";
    return {
      id: selectedAoi
        ? \`aoi-\${selectedAoi.id}-\${scenarioId}\`
        : selectedObject
          ? \`object-\${selectedObject.id}-\${scenarioId}\`
          : \`point-\${point.latitude.toFixed(5)}-\${point.longitude.toFixed(5)}-\${scenarioId}\`,
      name: selectedAoi ? selectedAoi.name : selectedObject ? selectedObject.name : \`Map point \${format(point)}\`,
      itemType,
      scenarioId,
      scenarioLabel: "Investment Site Selection",
      point,
      selectedObject: selectedObject ?? undefined,
      selectedAoi: selectedAoi ?? undefined,
      locationLabel: \`Map point / \${format(point)}\`
    };
  }
  export function createMockComparison(items, customQuery = "") {
    const scorecards = items.map((item) => {
      const overallScore = item.selectedObject?.layerId === "premiumRealEstateAreas"
        ? 99
        : item.selectedObject?.layerId === "developmentZones"
          ? 64
          : item.selectedObject?.layerId === "futureCustomerAssets"
            ? 67
            : item.point.longitude > 55.5
              ? 72
              : 61;
      const scores = {
        developmentPotential: overallScore,
        investmentAttractiveness: overallScore,
        accessibility: overallScore,
        infrastructureReadiness: overallScore,
        climateHeatRisk: 35,
        overallRisk: 42
      };
      return {
        item,
        scores,
        overallScore,
        riskLevel: "Moderate",
        recommendedUse: "Canonical screening result",
        keyConcern: "Official validation required",
        marketMetricsMatch: {
          matchedAreaName: "Screening context",
          matchType: "partial",
          confidence: "medium",
          sourceMode: "imported_sample",
          importedMetricsUsed: false,
          releaseGate: {
            structurallyValid: true,
            screeningContextAvailable: true,
            decisionUse: "blocked",
            blockers: ["Current source release gate blocks decision scoring"]
          },
          metrics: { transactionCount: 10 },
          note: "Available as screening context; excluded from scoring."
        }
      };
    }).sort((left, right) => right.overallScore - left.overallScore);
    const winner = scorecards[0];
    return {
      id: \`comparison-\${scorecards.map((item) => item.item.id).join("-")}\`,
      items: scorecards,
      winner,
      whyPreferred: \`\${winner.item.name} is the canonical rebuilt winner.\`,
      whenAnotherMayBeBetter: "Validate current evidence.",
      sharedOpportunities: ["Canonical opportunity"],
      differentiatedRisks: ["Canonical risk"],
      nextActions: ["Validate evidence"],
      evidence: [],
      customQuery: customQuery || undefined
    };
  }
`);
const polygonModule = dataModule(`
  export const closePolygonRing = (vertices) => {
    if (vertices.length === 0) return vertices;
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    return first[0] === last[0] && first[1] === last[1] ? vertices : [...vertices, first];
  };
  export const validatePolygonVertices = (vertices) => {
    const ring = closePolygonRing(vertices);
    const open = ring.slice(0, -1);
    if (open.length < 3) return { valid: false, message: "At least three vertices required" };
    const longitude = open.reduce((sum, point) => sum + point[0], 0) / open.length;
    const latitude = open.reduce((sum, point) => sum + point[1], 0) / open.length;
    const lngs = open.map((point) => point[0]);
    const lats = open.map((point) => point[1]);
    return {
      valid: true,
      message: "Valid",
      measurements: {
        areaSqM: 4_000_000,
        areaSqKm: 4,
        perimeterM: 8_000,
        perimeterKm: 8,
        centroid: { latitude, longitude },
        bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
        vertexCount: open.length
      }
    };
  };
`);

const executableSource = transpiled.outputText
  .replace("@/src/data/demo-layers", demoLayerModule)
  .replace("@/src/data/demo-report-seeds", seededReportsModule)
  .replace("@/src/data/guided-demo", guidedDemoModule)
  .replace("@/src/lib/aoi-library", aoiLibraryModule)
  .replace("@/src/lib/browser-demo-storage", browserStorageModule)
  .replace("@/src/lib/explore/candidates", exploreCandidatesModule)
  .replace("@/src/lib/explore/scenarios", exploreScenariosModule)
  .replace("@/src/lib/explore/workspace-bridge", exploreBridgeModule)
  .replace("@/src/lib/mock-comparison", comparisonModule)
  .replace("@/src/lib/polygon-aoi", polygonModule)
  .replace("@/src/lib/uploaded-data", uploadedDataModule);
const restoreModule = await import(dataModule(executableSource));

const storage = new Map();
globalThis.__comparisonUploadedDatasets = [];
globalThis.__comparisonAoiRegistry = [];
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  }
};

const project = {
  id: "project-b2b-1",
  projectKey: "adversarial-b2b-project",
  name: "Adversarial B2B Project",
  description: "Test project",
  geography: "Dubai / UAE",
  clientType: "fund",
  primaryScenario: "investmentSiteSelection",
  status: "demo",
  dataMode: "local_screening",
  metadata: { segment: "b2b", audience: "b2b" }
};
const scenarioId = "investmentSiteSelection";
const pointA = { latitude: 25, longitude: 55 };
const pointB = { latitude: 25.1, longitude: 56 };
const itemA = {
  id: "point-25.00000-55.00000-investmentSiteSelection",
  name: "Forged first",
  itemType: "point",
  scenarioId,
  scenarioLabel: "forged",
  point: pointA,
  locationLabel: "forged"
};
const itemB = {
  id: "point-25.10000-56.00000-investmentSiteSelection",
  name: "Forged second",
  itemType: "point",
  scenarioId,
  scenarioLabel: "forged",
  point: pointB,
  locationLabel: "forged"
};
const comparisonId = `comparison-${itemB.id}-${itemA.id}`;
const allowedClaim = {
  matchedAreaName: "Forged official source",
  importedMetricsUsed: true,
  releaseGate: {
    structurallyValid: true,
    screeningContextAvailable: true,
    decisionUse: "allowed",
    blockers: []
  },
  metrics: { transactionCount: 999999 }
};
const forgedA = {
  item: itemA,
  scores: {
    developmentPotential: 100,
    investmentAttractiveness: 100,
    accessibility: 100,
    infrastructureReadiness: 100,
    climateHeatRisk: 1,
    overallRisk: 1
  },
  overallScore: 100,
  riskLevel: "Low",
  recommendedUse: "Forged winner",
  keyConcern: "None",
  marketMetricsMatch: allowedClaim
};
const forgedB = {
  item: itemB,
  scores: {
    developmentPotential: 1,
    investmentAttractiveness: 1,
    accessibility: 1,
    infrastructureReadiness: 1,
    climateHeatRisk: 100,
    overallRisk: 100
  },
  overallScore: 1,
  riskLevel: "Elevated",
  recommendedUse: "Forged loser",
  keyConcern: "Everything",
  marketMetricsMatch: allowedClaim
};
const forged = {
  id: comparisonId,
  items: [forgedA, forgedB],
  winner: forgedA,
  whyPreferred: "Forged 100/1 ranking",
  whenAnotherMayBeBetter: "Never",
  sharedOpportunities: ["Forged"],
  differentiatedRisks: [],
  nextActions: [],
  evidence: [],
  project: structuredClone(project)
};

function assertCanonical(result) {
  assert.ok(result, "Forged comparison should be safely rebuilt from valid selection items");
  assert.equal(result.winner.item.id, itemB.id, "Persisted forged winner must be discarded");
  assert.equal(result.winner.overallScore, 72, "Winner score must come from the canonical builder");
  assert.equal(result.items.find((item) => item.item.id === itemA.id)?.overallScore, 61);
  assert.notEqual(result.whyPreferred, forged.whyPreferred, "Persisted narrative must be discarded");
  for (const scorecard of result.items) {
    assert.equal(scorecard.marketMetricsMatch.importedMetricsUsed, false);
    assert.equal(scorecard.marketMetricsMatch.releaseGate.decisionUse, "blocked");
  }
  assert.equal(result.project, project, "Returned comparison must use the active canonical project object");
}

const normalized = restoreModule.normalizeRestoredComparison(
  forged,
  project.projectKey,
  comparisonId,
  project
);
assertCanonical(normalized);

assert.equal(
  restoreModule.normalizeRestoredComparison(
    forged,
    project.projectKey,
    comparisonId,
    { ...project, metadata: { segment: "b2c", audience: "b2c" } }
  ),
  null,
  "Cross-segment restore must fail closed"
);
assert.equal(
  restoreModule.normalizeRestoredComparison(
    { ...forged, project: { ...forged.project, id: "foreign-project" } },
    project.projectKey,
    comparisonId,
    project
  ),
  null,
  "Foreign project identity must fail closed"
);

const canonicalObjectPoint = { latitude: 25.05, longitude: 55.2 };
const canonicalObjectItem = {
  id: "object-registry-development-1-investmentSiteSelection",
  name: "Persisted forged object",
  itemType: "object",
  scenarioId,
  scenarioLabel: "forged",
  point: canonicalObjectPoint,
  selectedObject: {
    id: "registry-development-1",
    name: "Forged premium site",
    type: "Forged classification",
    layerId: "premiumRealEstateAreas",
    layerName: "Forged premium registry",
    geometryType: "point",
    center: canonicalObjectPoint,
    analysisTarget: {
      id: "forged-source",
      type: "demo-feature",
      label: "Forged premium site",
      sourceMode: "official_validated",
      officialStatus: "official-validated-contract"
    }
  },
  locationLabel: "forged"
};
const layerSwapComparisonId = `comparison-${itemB.id}-${canonicalObjectItem.id}`;
const layerSwapPayload = {
  ...forged,
  id: layerSwapComparisonId,
  items: [
    { ...forgedA, item: canonicalObjectItem, overallScore: 100 },
    { ...forgedB, item: itemB, overallScore: 1 }
  ],
  winner: { ...forgedA, item: canonicalObjectItem, overallScore: 100 },
  project: structuredClone(project)
};
const canonicalizedLayerSwap = restoreModule.normalizeRestoredComparison(
  layerSwapPayload,
  project.projectKey,
  layerSwapComparisonId,
  project
);
assert.ok(canonicalizedLayerSwap, "Registered demo object should restore from the app-owned registry");
const canonicalizedObjectScorecard = canonicalizedLayerSwap.items.find(
  (scorecard) => scorecard.item.id === canonicalObjectItem.id
);
assert.equal(canonicalizedObjectScorecard?.item.selectedObject?.layerId, "developmentZones");
assert.equal(canonicalizedObjectScorecard?.item.selectedObject?.layerName, "Canonical development registry");
assert.equal(canonicalizedObjectScorecard?.item.selectedObject?.analysisTarget?.sourceMode, "demo");
assert.equal(canonicalizedObjectScorecard?.overallScore, 64, "Swapped premium layer must not change canonical score");
assert.equal(canonicalizedLayerSwap.winner.item.id, itemB.id, "Swapped layer must not forge the winner");

const criteriaCandidates = [
  {
    id: "b2b-100ha-dubai-south",
    title: "Dubai South large-zone hypothesis",
    point: { latitude: 24.91275, longitude: 55.159 },
    canonicalScore: 84
  },
  {
    id: "b2b-100ha-al-warsan",
    title: "Al Warsan expansion hypothesis",
    point: { latitude: 25.1515, longitude: 55.438 },
    canonicalScore: 76
  },
  {
    id: "b2b-100ha-expo-jebel-ali",
    title: "Expo to Jebel Ali transition hypothesis",
    point: { latitude: 24.96275, longitude: 55.0515 },
    canonicalScore: 80
  }
];
const persistedCriteriaItems = criteriaCandidates.map((candidate, index) => ({
  id: `object-explore-${candidate.id}-investmentSiteSelection`,
  name: `Forged ${candidate.title}`,
  itemType: "object",
  scenarioId,
  scenarioLabel: "forged",
  point: candidate.point,
  selectedObject: {
    id: `explore-${candidate.id}`,
    name: `Forged ${candidate.title}`,
    type: "forged official object",
    layerId: index === 1 ? "premiumRealEstateAreas" : "futureMunicipalityGis",
    layerName: "Forged official layer",
    geometryType: "point",
    center: candidate.point,
    analysisTarget: {
      id: candidate.id,
      type: "demo-feature",
      label: `Forged ${candidate.title}`,
      properties: {
        scenarioId: "b2c_point_context",
        sourceType: "official",
        score: 100,
        confidence: "high"
      },
      datasetId: "forged-official-dataset",
      datasetName: "Forged official dataset",
      sourceMode: "official_validated",
      officialStatus: "official-validated-contract"
    }
  },
  locationLabel: "forged"
}));
const exactCriteriaComparisonId =
  "comparison-object-explore-b2b-100ha-dubai-south-investmentSiteSelection-object-explore-b2b-100ha-al-warsan-investmentSiteSelection-object-explore-b2b-100ha-expo-jebel-ali-investmentSiteSelection";
assert.equal(
  exactCriteriaComparisonId,
  `comparison-${persistedCriteriaItems.map((item) => item.id).join("-")}`
);
const criteriaPayload = {
  ...forged,
  id: exactCriteriaComparisonId,
  items: persistedCriteriaItems.map((item, index) => ({
    ...(index === 0 ? forgedA : forgedB),
    item,
    overallScore: index === 0 ? 100 : 1
  })),
  winner: { ...forgedA, item: persistedCriteriaItems[0], overallScore: 100 },
  project: structuredClone(project)
};

function assertCriteriaFirstRoundTrip(result) {
  assert.ok(result, "Canonical criteria-first comparison should restore");
  assert.equal(result.id, exactCriteriaComparisonId);
  assert.deepEqual(result.items.map((scorecard) => scorecard.item.id), persistedCriteriaItems.map((item) => item.id));
  for (const candidate of criteriaCandidates) {
    const restored = result.items.find((scorecard) => scorecard.item.selectedObject?.id === `explore-${candidate.id}`);
    assert.ok(restored?.item.selectedObject, `${candidate.id} should resolve from the Product explore generator`);
    assert.equal(restored.item.selectedObject.name, candidate.title);
    assert.equal(restored.item.selectedObject.layerId, "developmentZones");
    assert.equal(restored.item.selectedObject.layerName, "GeoAI Explore candidates");
    assert.equal(restored.item.selectedObject.analysisTarget?.datasetId, "geoai-explore-candidates");
    assert.equal(restored.item.selectedObject.analysisTarget?.sourceMode, "demo");
    assert.equal(restored.item.selectedObject.analysisTarget?.officialStatus, "official-validation-required");
    assert.equal(restored.item.selectedObject.analysisTarget?.properties?.scenarioId, "b2b_redevelopment_100ha");
    assert.equal(restored.item.selectedObject.analysisTarget?.properties?.sourceType, "demo_seed");
    assert.equal(restored.item.selectedObject.analysisTarget?.properties?.score, candidate.canonicalScore);
    assert.notEqual(restored.item.selectedObject.analysisTarget?.properties?.score, 100);
    assert.equal(restored.overallScore, 64, "Persisted comparison and candidate scores must be discarded");
    assert.equal(restored.marketMetricsMatch.importedMetricsUsed, false);
    assert.equal(restored.marketMetricsMatch.releaseGate.decisionUse, "blocked");
  }
  assert.equal(globalThis.__lastExploreGeneratorInput.audience, "b2b");
  assert.equal(globalThis.__lastExploreGeneratorInput.role, "real_estate_fund");
  assert.equal(globalThis.__lastExploreGeneratorInput.interactionMode, "criteria_first");
}

const normalizedCriteria = restoreModule.normalizeRestoredComparison(
  criteriaPayload,
  project.projectKey,
  exactCriteriaComparisonId,
  project
);
assertCriteriaFirstRoundTrip(normalizedCriteria);

const b2cProject = {
  ...project,
  id: "project-b2c-1",
  projectKey: "home-buyer-neighborhood-demo",
  clientType: "demo",
  metadata: { segment: "b2c", audience: "b2c", role: "home_buyer" }
};
assert.equal(
  restoreModule.normalizeRestoredComparison(
    { ...criteriaPayload, project: structuredClone(b2cProject) },
    b2cProject.projectKey,
    exactCriteriaComparisonId,
    b2cProject
  ),
  null,
  "B2B criteria-first objects must not resolve inside a B2C project boundary"
);

const foreignGuidedScenarioId = "realEstateDevelopment";
const foreignGuidedObject = {
  id: "guided-demo-dubai-south-growth-corridor",
  name: "Persisted foreign guided target",
  type: "Illustrative screening geometry",
  layerId: "futureCustomerAssets",
  layerName: "Local screening geometries",
  geometryType: "polygon",
  center: { latitude: 24.8887, longitude: 55.1542 }
};
const foreignGuidedItem = {
  id: `object-${foreignGuidedObject.id}-${foreignGuidedScenarioId}`,
  name: foreignGuidedObject.name,
  itemType: "object",
  scenarioId: foreignGuidedScenarioId,
  scenarioLabel: "Real Estate Development",
  point: foreignGuidedObject.center,
  selectedObject: foreignGuidedObject,
  locationLabel: foreignGuidedObject.name
};
const sameScenarioPoint = {
  id: "point-25.10000-56.00000-realEstateDevelopment",
  name: "Map point 25.10000, 56.00000",
  itemType: "point",
  scenarioId: foreignGuidedScenarioId,
  scenarioLabel: "Real Estate Development",
  point: pointB,
  locationLabel: "Map point / 25.10000, 56.00000"
};
const foreignGuidedComparisonId = `comparison-${foreignGuidedItem.id}-${sameScenarioPoint.id}`;
assert.equal(
  restoreModule.normalizeRestoredComparison(
    {
      ...forged,
      id: foreignGuidedComparisonId,
      items: [
        { ...forgedA, item: foreignGuidedItem },
        { ...forgedB, item: sameScenarioPoint }
      ],
      winner: { ...forgedA, item: foreignGuidedItem },
      project: structuredClone(b2cProject)
    },
    b2cProject.projectKey,
    foreignGuidedComparisonId,
    b2cProject
  ),
  null,
  "A guided target owned by a B2B project must not restore inside a B2C project"
);

const aoiCoordinates = [
  [55.2, 25],
  [55.22, 25],
  [55.22, 25.02],
  [55.2, 25.02],
  [55.2, 25]
];
const aoiCenter = { latitude: 25.01, longitude: 55.21 };

function createPersistedAoi({
  id,
  projectId,
  source = "user_drawn_polygon",
  dataMode = "user_provided"
}) {
  return {
    id,
    name: source === "uploaded_geojson_polygon" ? "Uploaded project AOI" : "Browser project AOI",
    geometryType: "Polygon",
    geometry: { type: "Polygon", coordinates: [aoiCoordinates] },
    coordinates: aoiCoordinates,
    centroid: aoiCenter,
    bbox: [55.2, 25, 55.22, 25.02],
    measurements: {
      areaSqM: 999,
      areaSqKm: 999,
      perimeterM: 1,
      perimeterKm: 1,
      centroid: { latitude: 0, longitude: 0 },
      bbox: [0, 0, 0, 0],
      vertexCount: 999
    },
    source,
    dataMode,
    confidence: "validation_required",
    projectId,
    savedAoiId: id,
    sourceType: source === "uploaded_geojson_polygon" ? "uploaded_geojson" : "user_drawn",
    validationStatus: "validation_required",
    limitations: ["Persisted claims must be rebuilt."]
  };
}

function createAoiPayload(aoi) {
  const aoiItem = {
    id: `aoi-${aoi.id}-${scenarioId}`,
    name: aoi.name,
    itemType: "aoi",
    scenarioId,
    scenarioLabel: "forged",
    point: aoiCenter,
    selectedAoi: aoi,
    locationLabel: "forged"
  };
  const comparisonId = `comparison-${itemB.id}-${aoiItem.id}`;
  return {
    aoiItem,
    comparisonId,
    payload: {
      ...forged,
      id: comparisonId,
      items: [
        { ...forgedA, item: aoiItem, overallScore: 100 },
        { ...forgedB, item: itemB, overallScore: 1 }
      ],
      winner: { ...forgedA, item: aoiItem, overallScore: 100 },
      project: structuredClone(project)
    }
  };
}

function assertAoiRoundTrip(result, fixture, expected) {
  assert.ok(result, `${expected.label} should restore`);
  const restored = result.items.find((scorecard) => scorecard.item.id === fixture.aoiItem.id)?.item.selectedAoi;
  assert.ok(restored, `${expected.label} should remain attached to its comparison item`);
  assert.equal(restored.projectId, expected.projectIdentity);
  assert.equal(restored.source, expected.source);
  assert.equal(restored.dataMode, expected.dataMode);
  assert.equal(restored.sourceType, expected.sourceType);
  assert.equal(restored.validationStatus, "validation_required");
  assert.equal(restored.savedAoiId, restored.id);
  assert.ok(Math.abs(restored.centroid.latitude - aoiCenter.latitude) <= 1e-9);
  assert.ok(Math.abs(restored.centroid.longitude - aoiCenter.longitude) <= 1e-9);
  assert.equal(restored.measurements.areaSqKm, 4, "Persisted AOI measurements must be recomputed");
  assert.equal(result.winner.item.id, itemB.id, "Persisted AOI winner and score must be discarded");
}

const browserAoiFixture = createAoiPayload(createPersistedAoi({
  id: "browser-aoi-1",
  projectId: project.projectKey
}));
const normalizedBrowserAoi = restoreModule.normalizeRestoredComparison(
  browserAoiFixture.payload,
  project.projectKey,
  browserAoiFixture.comparisonId,
  project
);
assertAoiRoundTrip(normalizedBrowserAoi, browserAoiFixture, {
  label: "Browser project-key AOI",
  projectIdentity: project.projectKey,
  source: "user_drawn_polygon",
  dataMode: "user_provided",
  sourceType: "user_drawn"
});

const idBackedAoiFixture = createAoiPayload(createPersistedAoi({
  id: "database-aoi-1",
  projectId: project.id
}));
assertAoiRoundTrip(
  restoreModule.normalizeRestoredComparison(
    idBackedAoiFixture.payload,
    project.projectKey,
    idBackedAoiFixture.comparisonId,
    project
  ),
  idBackedAoiFixture,
  {
    label: "Exact project-ID AOI",
    projectIdentity: project.id,
    source: "user_drawn_polygon",
    dataMode: "user_provided",
    sourceType: "user_drawn"
  }
);

const uploadedAoiFixture = createAoiPayload(createPersistedAoi({
  id: "uploaded-aoi-1",
  projectId: project.projectKey,
  source: "uploaded_geojson_polygon",
  dataMode: "uploaded"
}));
globalThis.__comparisonAoiRegistry = [{
  id: "uploaded-aoi-1",
  projectId: project.id,
  projectKey: project.projectKey,
  name: "Uploaded project AOI",
  geometryType: "Polygon",
  geometry: { type: "Polygon", coordinates: [aoiCoordinates] },
  centroid: aoiCenter,
  bbox: [55.2, 25, 55.22, 25.02],
  measurements: {
    areaSqM: 4_000_000,
    areaSqKm: 4,
    perimeterM: 8_000,
    perimeterKm: 8,
    centroid: aoiCenter,
    bbox: [55.2, 25, 55.22, 25.02],
    vertexCount: 4
  },
  sourceType: "uploaded_geojson",
  dataMode: "uploaded",
  validationStatus: "validation_required",
  createdAt: "2026-08-17T00:00:00.000Z",
  updatedAt: "2026-08-17T00:00:00.000Z",
  caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
}];
const normalizedUploadedAoi = restoreModule.normalizeRestoredComparison(
  uploadedAoiFixture.payload,
  project.projectKey,
  uploadedAoiFixture.comparisonId,
  project
);
assertAoiRoundTrip(normalizedUploadedAoi, uploadedAoiFixture, {
  label: "Uploaded GeoJSON AOI",
  projectIdentity: project.projectKey,
  source: "uploaded_geojson_polygon",
  dataMode: "uploaded",
  sourceType: "uploaded_geojson"
});

const shiftedUploadedAoiPayload = structuredClone(uploadedAoiFixture.payload);
shiftedUploadedAoiPayload.items[0].item.selectedAoi.coordinates[0][0] += 0.05;
assert.equal(
  restoreModule.normalizeRestoredComparison(
    shiftedUploadedAoiPayload,
    project.projectKey,
    uploadedAoiFixture.comparisonId,
    project
  ),
  null,
  "Uploaded AOI with the same id/project/source but shifted persisted coordinates must fail closed"
);

globalThis.__comparisonAoiRegistry = [];
assert.equal(
  restoreModule.normalizeRestoredComparison(
    uploadedAoiFixture.payload,
    project.projectKey,
    uploadedAoiFixture.comparisonId,
    project
  ),
  null,
  "Uploaded AOI must fail closed when its current project-scoped canonical registry geometry is unavailable"
);
globalThis.__comparisonAoiRegistry = [{
  id: "uploaded-aoi-1",
  projectId: project.id,
  projectKey: project.projectKey,
  name: "Uploaded project AOI",
  geometryType: "Polygon",
  geometry: { type: "Polygon", coordinates: [aoiCoordinates] },
  sourceType: "uploaded_geojson",
  dataMode: "uploaded"
}];

const foreignProjectAoiPayload = structuredClone(browserAoiFixture.payload);
foreignProjectAoiPayload.items[0].item.selectedAoi.projectId = "foreign-project-key";
assert.equal(
  restoreModule.normalizeRestoredComparison(
    foreignProjectAoiPayload,
    project.projectKey,
    browserAoiFixture.comparisonId,
    project
  ),
  null,
  "Foreign-project AOI must fail closed instead of being rebound to the active project"
);

const unknownProjectAoiPayload = structuredClone(browserAoiFixture.payload);
delete unknownProjectAoiPayload.items[0].item.selectedAoi.projectId;
assert.equal(
  restoreModule.normalizeRestoredComparison(
    unknownProjectAoiPayload,
    project.projectKey,
    browserAoiFixture.comparisonId,
    project
  ),
  null,
  "AOI without project custody must fail closed"
);

const uploadedGeometry = {
  type: "Polygon",
  coordinates: [[[55.3, 25.2], [55.4, 25.2], [55.4, 25.3], [55.3, 25.3], [55.3, 25.2]]]
};
const uploadedCenter = { latitude: 25.24, longitude: 55.34 };
const uploadedDataset = {
  id: "upload-sites-123",
  projectKey: project.projectKey,
  name: "Investor sites.geojson",
  type: "geojson",
  status: "parsed",
  sourceMode: "user-uploaded",
  uploadedAt: "2026-08-16T00:00:00.000Z",
  featureCount: 1,
  confidence: "user-provided",
  officialStatus: "official-validation-required",
  visible: true,
  geojson: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "site-1",
      properties: {
        id: "site-1",
        name: "Uploaded Site One",
        uploadedDatasetId: "upload-sites-123",
        uploadedDatasetName: "Investor sites.geojson",
        uploadedFeatureKind: "user-uploaded",
        sourceMode: "user-uploaded",
        confidenceLevel: "user-provided",
        officialStatus: "official-validation-required"
      },
      geometry: uploadedGeometry
    }]
  }
};
globalThis.__comparisonUploadedDatasets = [uploadedDataset];

const uploadedObject = {
  id: "uploaded-upload-sites-123-site-1",
  name: "Uploaded Site One",
  type: "Uploaded screening geometry",
  layerId: "futureCustomerAssets",
  layerName: "Investor sites.geojson",
  geometryType: "polygon",
  center: uploadedCenter,
  spatialContext: {
    sourceId: "forged-official-source",
    sourceMode: "official_validated"
  },
  analysisTarget: {
    id: "site-1",
    type: "uploaded-feature",
    label: "Uploaded Site One",
    coordinates: uploadedCenter,
    geometry: uploadedGeometry,
    properties: uploadedDataset.geojson.features[0].properties,
    datasetId: "upload-sites-123",
    datasetName: "Investor sites.geojson",
    sourceMode: "user-uploaded",
    officialStatus: "official-validation-required"
  }
};
const uploadedItem = {
  id: "object-uploaded-upload-sites-123-site-1-investmentSiteSelection",
  name: "Uploaded Site One",
  itemType: "object",
  scenarioId,
  scenarioLabel: "Investment Site Selection",
  point: uploadedCenter,
  selectedObject: uploadedObject,
  locationLabel: "Uploaded geometry"
};
const uploadedComparisonId = `comparison-${itemB.id}-${uploadedItem.id}`;
const uploadedPayload = {
  ...forged,
  id: uploadedComparisonId,
  items: [
    { ...forgedA, item: uploadedItem, overallScore: 100 },
    { ...forgedB, item: itemB, overallScore: 1 }
  ],
  winner: { ...forgedA, item: uploadedItem, overallScore: 100 },
  project: structuredClone(project)
};

function assertUploadedRoundTrip(result) {
  assert.ok(result, "Valid project-scoped uploaded target should restore");
  const restored = result.items.find((scorecard) => scorecard.item.id === uploadedItem.id);
  assert.ok(restored?.item.selectedObject, "Uploaded object should remain attached to the comparison item");
  assert.equal(restored.item.selectedObject.layerId, "futureCustomerAssets");
  assert.equal(restored.item.selectedObject.analysisTarget?.sourceMode, "user-uploaded");
  assert.equal(restored.item.selectedObject.analysisTarget?.datasetId, uploadedDataset.id);
  assert.equal(restored.item.selectedObject.analysisTarget?.datasetName, uploadedDataset.name);
  assert.deepEqual(restored.item.selectedObject.analysisTarget?.geometry, uploadedGeometry);
  assert.equal(restored.item.selectedObject.spatialContext?.datasetId, uploadedDataset.id);
  assert.equal(restored.item.selectedObject.spatialContext?.datasetName, uploadedDataset.name);
  assert.equal(restored.item.selectedObject.spatialContext?.sourceId, "customer-uploaded-documents");
  assert.equal(restored.item.selectedObject.spatialContext?.geometryOrigin, "user");
  assert.equal(restored.item.selectedObject.spatialContext?.sourceMode, undefined);
  assert.equal(
    restored.item.selectedObject.spatialContext?.caveat,
    "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  );
  assert.equal(restored.overallScore, 67, "Persisted uploaded-object score must be discarded");
  assert.equal(result.winner.item.id, itemB.id, "Persisted uploaded-object winner must be discarded");
  assert.equal(restored.marketMetricsMatch.importedMetricsUsed, false);
  assert.equal(restored.marketMetricsMatch.releaseGate.decisionUse, "blocked");
}

const normalizedUpload = restoreModule.normalizeRestoredComparison(
  uploadedPayload,
  project.projectKey,
  uploadedComparisonId,
  project
);
assertUploadedRoundTrip(normalizedUpload);

const alteredGeometryPayload = structuredClone(uploadedPayload);
alteredGeometryPayload.items[0].item.selectedObject.analysisTarget.geometry.coordinates[0][0][0] = 55.9;
assert.equal(
  restoreModule.normalizeRestoredComparison(
    alteredGeometryPayload,
    project.projectKey,
    uploadedComparisonId,
    project
  ),
  null,
  "Uploaded geometry that diverges from the validated project dataset must fail closed"
);

globalThis.__comparisonUploadedDatasets = [{ ...uploadedDataset, projectKey: "foreign-project" }];
assert.equal(
  restoreModule.normalizeRestoredComparison(
    uploadedPayload,
    project.projectKey,
    uploadedComparisonId,
    project
  ),
  null,
  "Uploaded dataset from another project must fail closed"
);
globalThis.__comparisonUploadedDatasets = [uploadedDataset];

assert.equal(
  restoreModule.writeBrowserComparisonRecord(project.projectKey, forged),
  true,
  "Write boundary should canonicalize a structurally valid comparison"
);
const storageKey = `test:comparison-v1:${project.projectKey}:${comparisonId}`;
const persistedAfterWrite = JSON.parse(storage.get(storageKey));
assert.equal(persistedAfterWrite.winner.item.id, itemB.id);
assert.equal(persistedAfterWrite.items.some((item) => item.overallScore === 100), false);
assert.equal(persistedAfterWrite.items.some((item) => item.marketMetricsMatch.importedMetricsUsed), false);

storage.set(storageKey, JSON.stringify(forged));
assertCanonical(
  restoreModule.readBrowserComparisonRecord(project.projectKey, comparisonId, project)
);

assert.equal(
  restoreModule.writeBrowserComparisonRecord(project.projectKey, normalizedUpload),
  true,
  "Canonical uploaded comparison should be writable"
);
const uploadedStorageKey = `test:comparison-v1:${project.projectKey}:${uploadedComparisonId}`;
assertUploadedRoundTrip(
  restoreModule.readBrowserComparisonRecord(project.projectKey, uploadedComparisonId, project)
);
assert.equal(JSON.parse(storage.get(uploadedStorageKey)).items.some((item) => item.overallScore === 100), false);

assert.equal(
  restoreModule.writeBrowserComparisonRecord(project.projectKey, normalizedCriteria),
  true,
  "Canonical criteria-first comparison should be writable"
);
assertCriteriaFirstRoundTrip(
  restoreModule.readBrowserComparisonRecord(project.projectKey, exactCriteriaComparisonId, project)
);

assert.equal(
  restoreModule.writeBrowserComparisonRecord(project.projectKey, normalizedBrowserAoi),
  true,
  "Valid browser AOI comparison should be writable"
);
assertAoiRoundTrip(
  restoreModule.readBrowserComparisonRecord(
    project.projectKey,
    browserAoiFixture.comparisonId,
    project
  ),
  browserAoiFixture,
  {
    label: "Browser project-key AOI storage round-trip",
    projectIdentity: project.projectKey,
    source: "user_drawn_polygon",
    dataMode: "user_provided",
    sourceType: "user_drawn"
  }
);

assert.equal(
  restoreModule.writeBrowserComparisonRecord(project.projectKey, normalizedUploadedAoi),
  true,
  "Valid uploaded AOI comparison should be writable"
);
assertAoiRoundTrip(
  restoreModule.readBrowserComparisonRecord(
    project.projectKey,
    uploadedAoiFixture.comparisonId,
    project
  ),
  uploadedAoiFixture,
  {
    label: "Uploaded GeoJSON AOI storage round-trip",
    projectIdentity: project.projectKey,
    source: "uploaded_geojson_polygon",
    dataMode: "uploaded",
    sourceType: "uploaded_geojson"
  }
);

delete globalThis.window;
delete globalThis.__comparisonUploadedDatasets;
delete globalThis.__lastExploreGeneratorInput;
delete globalThis.__comparisonAoiRegistry;

console.log("Comparison restore adversarial checks passed.");
console.log("- forged 100/1 scores and winner: discarded and rebuilt");
console.log("- forged importedMetricsUsed/allowed gate: discarded and blocked");
console.log("- project and B2B/B2C segment mismatch: rejected fail-closed");
console.log("- registered object layerId swap: canonical registry classification restored");
console.log("- uploaded target provenance/geometry/dataset identity: validated and preserved");
console.log("- altered geometry and cross-project uploaded dataset: rejected fail-closed");
console.log("- exact criteria-first explore comparison: canonical browser round-trip restored");
console.log("- tampered explore layer/score/provenance: discarded; B2B/B2C boundary enforced");
console.log("- foreign guided-demo target: rejected across project and segment boundaries");
console.log("- browser and uploaded AOI custody: valid project key/ID round-trips preserved");
console.log("- foreign or missing AOI project identity: rejected fail-closed without rebinding");
console.log("- uploaded AOI shifted persisted coordinates or missing canonical registry: rejected fail-closed");
