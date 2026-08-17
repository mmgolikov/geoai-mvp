import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function executeTypeScriptModule(relativePath, dependencies = {}) {
  const absolutePath = path.join(root, relativePath);
  const source = readFileSync(absolutePath, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: absolutePath,
    reportDiagnostics: true,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });
  const errors = (compiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  assert.equal(
    errors.length,
    0,
    errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("; ")
  );

  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
    throw new Error(`Unexpected runtime dependency '${specifier}' while loading ${relativePath}`);
  };
  const factory = new Function("require", "module", "exports", compiled.outputText);
  factory(localRequire, module, module.exports);
  return module.exports;
}

const releasePolicy = executeTypeScriptModule("src/lib/market-metrics/release-gate.ts");

const canonicalProject = {
  id: null,
  projectKey: "canonical-b2b-project",
  name: "Canonical B2B Project",
  description: "Current application-owned project context.",
  geography: "Dubai / UAE",
  clientType: "developer",
  primaryScenario: "investmentSiteSelection",
  status: "demo",
  dataMode: "demo_normalized",
  metadata: { segment: "b2b", audience: "b2b" }
};
const otherProject = {
  ...canonicalProject,
  projectKey: "canonical-b2c-project",
  name: "Canonical B2C Project",
  clientType: "demo",
  metadata: { segment: "b2c", audience: "b2c" }
};
const point = { latitude: 25.2048, longitude: 55.2708 };
const canonicalDemoObject = {
  id: "demo-object-1",
  name: "Canonical demo object",
  type: "Illustrative screening asset",
  layerId: "developmentZones",
  layerName: "Canonical demo layer",
  geometryType: "point",
  center: point,
  analysisTarget: {
    id: "demo-object-1",
    type: "demo-feature",
    label: "Canonical demo object",
    coordinates: point,
    geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
    sourceMode: "demo",
    officialStatus: "not-official"
  }
};

function polygonMeasurements(ring) {
  const open = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1]
    ? ring.slice(0, -1)
    : ring;
  const longitude = open.reduce((sum, item) => sum + item[0], 0) / open.length;
  const latitude = open.reduce((sum, item) => sum + item[1], 0) / open.length;
  const lngs = open.map((item) => item[0]);
  const lats = open.map((item) => item[1]);
  const centroid = { longitude, latitude };
  return {
    areaSqM: 10_000,
    areaSqKm: 0.01,
    perimeterM: 400,
    perimeterKm: 0.4,
    centroid,
    bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
    vertexCount: open.length
  };
}

const authority = executeTypeScriptModule("src/lib/analysis-restore-authority.ts", {
  "@/src/data/demo-layers": {
    getDemoFeatureById(id) {
      return id === canonicalDemoObject.id ? { id } : null;
    },
    getSelectedDemoObject() {
      return canonicalDemoObject;
    }
  },
  "@/src/data/demo-report-seeds": { seededDemoRecentAnalyses: [] },
  "@/src/data/guided-demo": {
    guidedDemoPresets: [],
    createGuidedDemoSelection() {
      throw new Error("No guided fixture configured in this adversarial harness");
    }
  },
  "@/src/lib/explore/candidates": { generateExploreCandidates: () => [] },
  "@/src/lib/explore/scenarios": {
    getDefaultFilters: () => ({}),
    getDefaultRoleForAudience: (audience) => audience === "b2b" ? "developer" : "home_buyer",
    getExploreScenariosByAudience: () => [],
    isExploreRoleForAudience: () => false
  },
  "@/src/lib/explore/workspace-bridge": {
    exploreCandidateToSelectedObject: () => null,
    exploreScenarioToAnalysisScenario: () => "investmentSiteSelection"
  },
  "@/src/lib/polygon-aoi": {
    closePolygonRing(ring) {
      if (ring.length === 0) return [];
      const first = ring[0];
      const last = ring.at(-1);
      return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
    },
    validatePolygonVertices(ring) {
      if (!Array.isArray(ring) || ring.length < 3) return { valid: false };
      return { valid: true, measurements: polygonMeasurements(ring) };
    }
  },
  "@/src/lib/uploaded-data": {
    readBrowserUploadedDatasets: () => [],
    buildUploadedDataContext(datasets, selectedPoint, selectedObject) {
      return {
        uploadedDatasets: datasets,
        appliedMetrics: [],
        availableButNotApplied: [],
        visibleGeojsonLayers: datasets.filter((item) => item.type === "geojson"),
        selectedPoint,
        selectedObject
      };
    }
  },
  "@/src/lib/aoi-library": { readBrowserAois: () => [] }
});

const scoreLabels = {
  developmentPotential: "Development potential",
  investmentAttractiveness: "Investment attractiveness",
  accessibility: "Accessibility",
  infrastructureReadiness: "Infrastructure readiness",
  climateHeatRisk: "Climate / heat risk",
  overallRisk: "Overall risk"
};
const baselineScores = {
  developmentPotential: 51,
  investmentAttractiveness: 52,
  accessibility: 53,
  infrastructureReadiness: 54,
  climateHeatRisk: 55,
  overallRisk: 56
};

function createBaseline(selectedPoint, scenarioId, customQuery = "", selectedObject, selectedAoi) {
  return {
    id: `baseline-${scenarioId}`,
    scenarioId,
    title: selectedAoi?.name ?? selectedObject?.name ?? "Baseline analysis",
    subtitle: `${selectedPoint.latitude}, ${selectedPoint.longitude}`,
    point: selectedPoint,
    selectedObject: selectedObject ?? undefined,
    selectedAoi: selectedAoi ?? undefined,
    summary: "Current deterministic browser-local baseline.",
    scoreLabels,
    scores: { ...baselineScores },
    keyFactors: ["Baseline factor"],
    opportunities: ["Baseline opportunity"],
    risks: ["Baseline risk"],
    nextActions: ["Validate the screening result"],
    evidence: [{
      id: "baseline-evidence",
      label: "Browser-local baseline",
      description: "Deterministic test baseline.",
      sourceId: "demo-market-context-seed",
      sourceStatus: "mock",
      sourceType: "demo",
      confidence: "low"
    }],
    customQuery: customQuery || undefined
  };
}

const currentMetric = {
  label: "Current local screening metric",
  level: "medium",
  index: 50,
  trend: "stable",
  confidence: "low",
  note: "Current application-owned local context."
};
const marketMatcher = {
  findBestMarketMetricMatch() {
    return {
      matchedAreaName: "Canonical Current Area",
      matchType: "exact",
      confidence: "medium",
      sourceMode: "imported_sample",
      importedMetricsUsed: false,
      releaseGate: releasePolicy.MARKET_METRICS_SAMPLE_RELEASE_GATE,
      metrics: {
        areaName: "Canonical Current Area",
        transactionCount: 42,
        rentalRecordCount: 17,
        liquidityIndex: 61,
        rentalDemandProxy: 58,
        projectCount: 4,
        dataConfidence: "medium"
      },
      note: "Current application-owned matcher result."
    };
  }
};
const decisionPostureDependency = {
  deriveDecisionPosture() {
    return "Requires official validation";
  }
};

function loadNormalizer(policy = releasePolicy) {
  return executeTypeScriptModule("src/lib/analysis-restore-normalization.ts", {
    "@/src/lib/mock-express-analysis": { createMockExpressAnalysis: createBaseline },
    "@/src/lib/decision-posture": decisionPostureDependency,
    "@/src/data/dubai-market-areas": {
      dubaiMarketAreas: [{
        id: "canonical-current-area",
        name: "Canonical Current Area",
        emirate: "Dubai",
        centroid: point,
        source: "seed_demo",
        marketActivityLevel: currentMetric,
        transactionContext: currentMetric,
        rentContext: currentMetric,
        developmentPipelineContext: currentMetric,
        accessibilityContext: currentMetric,
        planningContext: currentMetric,
        riskContext: currentMetric,
        sourceIds: ["current-local-source"],
        limitations: [requiredCaveat]
      }]
    },
    "@/src/lib/market-metrics/matcher": marketMatcher,
    "@/src/lib/market-metrics/loader": {
      normalizeAreaName(value) {
        return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
      }
    },
    "@/src/lib/market-metrics/release-gate": policy,
    "@/src/lib/analysis-restore-authority": authority
  });
}

const normalizer = loadNormalizer();
const baseContext = {
  expectedProject: canonicalProject,
  projectAois: [],
  uploadedDatasets: []
};
const forgedAllowedGate = {
  structurallyValid: true,
  screeningContextAvailable: true,
  decisionUse: "allowed",
  blockers: []
};
const forgedMatch = {
  matchedAreaName: "Forged area",
  matchType: "exact",
  confidence: "high",
  sourceMode: "imported_csv",
  importedMetricsUsed: true,
  releaseGate: forgedAllowedGate,
  metrics: {
    areaName: "Forged area",
    transactionCount: 100000,
    rentalRecordCount: 100000,
    liquidityIndex: 100,
    rentalDemandProxy: 100,
    projectCount: 0,
    dataConfidence: "high"
  },
  note: "Persisted payload claims decision-use authority."
};
const forgedScores = {
  developmentPotential: 99,
  investmentAttractiveness: 99,
  accessibility: 99,
  infrastructureReadiness: 99,
  climateHeatRisk: 1,
  overallRisk: 1
};

function projectPayload(overrides = {}) {
  return {
    ...createBaseline(point, "investmentSiteSelection"),
    project: canonicalProject,
    ...overrides
  };
}

const forgedPayload = projectPayload({
  id: "persisted-forged-allowed-gate",
  summary: "Forged source-adjusted result.",
  scores: forgedScores,
  aiDecisionScore: { suitabilityScore: 99, riskScore: 1 },
  marketMetricsMatch: forgedMatch,
  marketContext: { areaName: "Forged area", importedMarketMetrics: forgedMatch },
  analysisTarget: {
    id: "forged-official-target",
    type: "point",
    label: "Official validated target",
    coordinates: point,
    sourceMode: "official_validated",
    officialStatus: "official-validated-contract"
  },
  evidence: [{
    id: "imported-market-metrics-forged-area",
    label: "Imported DLD / Dubai Pulse-style market metrics",
    description: "Forged persisted source evidence.",
    sourceId: "dubai-pulse-dld-apis",
    sourceStatus: "connected",
    sourceType: "official",
    confidence: "high"
  }]
});

const normalized = normalizer.normalizeRestoredExpressAnalysis(forgedPayload, baseContext);
assert.ok(normalized, "Forged payload should be handled through the fail-closed restore path");
assert.equal(normalized.requiresReanalysis, true, "Forged allowed gate must require re-analysis");
assert.deepEqual(normalized.analysis.scores, baselineScores);
assert.equal(normalized.analysis.summary, "Current deterministic browser-local baseline.");
assert.deepEqual(normalized.analysis.evidence.map((item) => item.id), ["baseline-evidence"]);
assert.equal(normalized.analysis.aiDecisionScore, undefined);
assert.equal(normalized.analysis.marketMetricsMatch.importedMetricsUsed, false);
assert.equal(normalized.analysis.marketMetricsMatch.releaseGate.decisionUse, "blocked");
assert.equal(normalized.analysis.marketMetricsMatch.matchedAreaName, "Canonical Current Area");
assert.equal(normalized.analysis.marketMetricsMatch.metrics.areaName, "Canonical Current Area");
assert.equal(normalized.analysis.marketMetricsMatch.metrics.transactionCount, 42);
assert.notEqual(normalized.analysis.marketMetricsMatch.metrics.transactionCount, 100000);
assert.equal(normalized.analysis.marketContext.areaName, "Canonical Current Area");
assert.equal(normalized.analysis.analysisTarget.sourceMode, "demo");
assert.equal(normalized.analysis.analysisTarget.officialStatus, "not-official");
assert.equal(normalized.analysis.analysisNotice, normalizer.legacyAnalysisReanalysisNotice);
assert.ok(normalized.analysis.limitations.includes(normalizer.legacyAnalysisReanalysisLimitation));

const normalizedAgain = normalizer.normalizeRestoredExpressAnalysis(normalized.analysis, baseContext);
assert.ok(normalizedAgain);
assert.equal(normalizedAgain.requiresReanalysis, true);

const permissiveReleasePolicy = {
  MARKET_METRICS_SAMPLE_RELEASE_GATE: {
    structurallyValid: true,
    screeningContextAvailable: true,
    decisionUse: "allowed",
    blockers: []
  },
  MARKET_METRICS_FALLBACK_RELEASE_GATE: releasePolicy.MARKET_METRICS_FALLBACK_RELEASE_GATE,
  isMarketMetricsDecisionUseAllowed(gate) {
    return gate?.structurallyValid === true && gate.decisionUse === "allowed" && gate.blockers.length === 0;
  }
};
const normalizedUnderPermissivePolicy = loadNormalizer(permissiveReleasePolicy)
  .normalizeRestoredExpressAnalysis(forgedPayload, baseContext);
assert.ok(normalizedUnderPermissivePolicy);
assert.equal(normalizedUnderPermissivePolicy.requiresReanalysis, true);
assert.equal(normalizedUnderPermissivePolicy.analysis.marketMetricsMatch.releaseGate.decisionUse, "blocked");

const strippedMatchPayload = projectPayload({
  id: "persisted-forged-stripped-match",
  summary: "Approved high-return decision with no disclosed source match.",
  scores: forgedScores,
  keyFactors: ["Forged guaranteed return"],
  opportunities: ["Forged approved site"],
  risks: [],
  nextActions: ["Commit capital immediately"],
  evidence: [],
  aiDecisionScore: { suitabilityScore: 99, riskScore: 1 },
  confidenceLevel: "high"
});
const normalizedStrippedMatch = normalizer.normalizeRestoredExpressAnalysis(strippedMatchPayload, baseContext);
assert.ok(normalizedStrippedMatch);
assert.equal(normalizedStrippedMatch.requiresReanalysis, false);
assert.deepEqual(normalizedStrippedMatch.analysis.scores, baselineScores);
assert.equal(normalizedStrippedMatch.analysis.marketMetricsMatch, undefined);
assert.equal(normalizedStrippedMatch.analysis.aiDecisionScore, undefined);

const currentScreeningOnlyMatch = {
  ...forgedMatch,
  importedMetricsUsed: false,
  releaseGate: JSON.parse(JSON.stringify(releasePolicy.MARKET_METRICS_SAMPLE_RELEASE_GATE)),
  note: "Current screening-only enrichment; persisted values are still untrusted."
};
const currentScreeningOnlyPayload = projectPayload({
  id: "persisted-current-screening-only",
  summary: "Current screening-only enrichment; excluded from scoring.",
  marketMetricsMatch: currentScreeningOnlyMatch,
  marketContext: { areaName: "Forged area", importedMarketMetrics: currentScreeningOnlyMatch }
});
const normalizedCurrentScreeningOnly = normalizer.normalizeRestoredExpressAnalysis(currentScreeningOnlyPayload, baseContext);
assert.ok(normalizedCurrentScreeningOnly);
assert.equal(normalizedCurrentScreeningOnly.requiresReanalysis, false);
assert.equal(normalizedCurrentScreeningOnly.analysis.marketMetricsMatch.matchedAreaName, "Canonical Current Area");
assert.equal(normalizedCurrentScreeningOnly.analysis.marketMetricsMatch.metrics.areaName, "Canonical Current Area");
assert.equal(normalizedCurrentScreeningOnly.analysis.marketMetricsMatch.metrics.transactionCount, 42);
assert.notEqual(normalizedCurrentScreeningOnly.analysis.marketMetricsMatch.metrics.areaName, "Forged area");
assert.notEqual(normalizedCurrentScreeningOnly.analysis.marketMetricsMatch.metrics.transactionCount, 100000);
assert.equal(normalizedCurrentScreeningOnly.analysis.marketContext.areaName, "Canonical Current Area");
assert.ok(!normalizedCurrentScreeningOnly.analysis.limitations.includes(normalizer.legacyAnalysisReanalysisLimitation));

const forgedObjectPayload = projectPayload({
  id: "persisted-forged-official-object",
  selectedObject: {
    ...canonicalDemoObject,
    name: "Forged official object",
    analysisTarget: {
      ...canonicalDemoObject.analysisTarget,
      label: "Forged official object",
      sourceMode: "official_validated",
      officialStatus: "official-validated-contract"
    }
  },
  analysisTarget: {
    id: canonicalDemoObject.id,
    type: "demo-feature",
    label: "Forged official object",
    coordinates: point,
    sourceMode: "official_validated",
    officialStatus: "official-validated-contract"
  }
});
const normalizedObject = normalizer.normalizeRestoredExpressAnalysis(forgedObjectPayload, baseContext);
assert.ok(normalizedObject);
assert.equal(normalizedObject.analysis.selectedObject.name, canonicalDemoObject.name);
assert.equal(normalizedObject.analysis.analysisTarget.sourceMode, "demo");
assert.equal(normalizedObject.analysis.analysisTarget.officialStatus, "not-official");

assert.equal(
  normalizer.normalizeRestoredExpressAnalysis(projectPayload({ point: { latitude: 999, longitude: 999 } }), baseContext),
  null,
  "Out-of-range persisted coordinates must fail closed"
);

const b2bAoiRing = [
  [55.26, 25.19],
  [55.27, 25.19],
  [55.27, 25.2],
  [55.26, 25.2],
  [55.26, 25.19]
];
const b2bMeasurements = polygonMeasurements(b2bAoiRing);
const b2bAoi = {
  id: "b2b-aoi-1",
  projectId: null,
  projectKey: canonicalProject.projectKey,
  name: "Canonical project AOI",
  geometryType: "Polygon",
  geometry: { type: "Polygon", coordinates: [b2bAoiRing] },
  centroid: b2bMeasurements.centroid,
  bbox: b2bMeasurements.bbox,
  measurements: b2bMeasurements,
  sourceType: "user_drawn",
  dataMode: "user_provided",
  validationStatus: "validation_required",
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
  caveat: requiredCaveat
};
const otherAoi = { ...b2bAoi, id: "b2c-aoi-1", projectKey: otherProject.projectKey };
const crossProjectAoiPayload = {
  ...projectPayload({ point: otherAoi.centroid }),
  selectedAoi: {
    id: otherAoi.id,
    savedAoiId: otherAoi.id,
    projectId: otherProject.projectKey
  }
};
assert.equal(
  normalizer.normalizeRestoredExpressAnalysis(crossProjectAoiPayload, {
    ...baseContext,
    projectAois: [otherAoi]
  }),
  null,
  "An AOI from another project must not cross the restore boundary"
);

const validAoiPayload = {
  ...projectPayload({ point: b2bAoi.centroid }),
  selectedAoi: {
    id: b2bAoi.id,
    savedAoiId: b2bAoi.id,
    projectId: canonicalProject.projectKey
  },
  analysisTarget: {
    id: b2bAoi.id,
    type: "user-drawn-aoi",
    label: "Forged official AOI",
    sourceMode: "official_validated",
    officialStatus: "official-validated-contract"
  }
};
const normalizedAoi = normalizer.normalizeRestoredExpressAnalysis(validAoiPayload, {
  ...baseContext,
  projectAois: [b2bAoi]
});
assert.ok(normalizedAoi);
assert.equal(normalizedAoi.analysis.selectedAoi.name, b2bAoi.name);
assert.equal(normalizedAoi.analysis.analysisTarget.sourceMode, "user-drawn");
assert.equal(normalizedAoi.analysis.analysisTarget.officialStatus, "official-validation-required");

const uploadedGeometry = {
  type: "Polygon",
  coordinates: [[
    [55.28, 25.18],
    [55.29, 25.18],
    [55.29, 25.19],
    [55.28, 25.19],
    [55.28, 25.18]
  ]]
};
const uploadedCenter = uploadedGeometry.coordinates[0].reduce(
  (sum, coordinate) => ({
    longitude: sum.longitude + coordinate[0] / uploadedGeometry.coordinates[0].length,
    latitude: sum.latitude + coordinate[1] / uploadedGeometry.coordinates[0].length
  }),
  { longitude: 0, latitude: 0 }
);
const uploadedDataset = {
  id: "upload-dataset-1",
  projectKey: canonicalProject.projectKey,
  name: "Current project upload.geojson",
  type: "geojson",
  status: "parsed",
  sourceMode: "user-uploaded",
  uploadedAt: "2026-08-16T00:00:00.000Z",
  confidence: "user-provided",
  officialStatus: "official-validation-required",
  geojson: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "feature-1",
      properties: { id: "feature-1", name: "Canonical uploaded feature", officialStatus: "official_validated" },
      geometry: uploadedGeometry
    }]
  }
};
const uploadedPayload = {
  ...projectPayload({ point: uploadedCenter }),
  selectedObject: {
    id: `uploaded-${uploadedDataset.id}-feature-1`,
    name: "Forged official upload",
    analysisTarget: {
      id: "feature-1",
      datasetId: uploadedDataset.id,
      sourceMode: "official_validated",
      officialStatus: "official-validated-contract"
    }
  }
};
const normalizedUpload = normalizer.normalizeRestoredExpressAnalysis(uploadedPayload, {
  ...baseContext,
  uploadedDatasets: [uploadedDataset]
});
assert.ok(normalizedUpload);
assert.equal(normalizedUpload.analysis.selectedObject.name, "Canonical uploaded feature");
assert.equal(normalizedUpload.analysis.analysisTarget.sourceMode, "user-uploaded");
assert.equal(normalizedUpload.analysis.analysisTarget.officialStatus, "official-validation-required");
assert.equal(normalizedUpload.analysis.analysisTarget.properties.officialStatus, "official-validation-required");

const forgedSegmentProject = {
  ...canonicalProject,
  metadata: { segment: "b2c", audience: "b2c" }
};
assert.equal(
  normalizer.normalizeRestoredExpressAnalysis(projectPayload({ project: forgedSegmentProject }), baseContext),
  null,
  "Same-key opposite-segment project metadata must fail closed"
);
const canonicalProjectRestore = normalizer.normalizeRestoredExpressAnalysis(projectPayload(), baseContext);
assert.ok(canonicalProjectRestore);
assert.strictEqual(canonicalProjectRestore.analysis.project, canonicalProject);

const validHistoryOne = {
  id: "history-valid-1",
  project: canonicalProject,
  projectKey: canonicalProject.projectKey,
  analysis: projectPayload({ id: "analysis-valid-1" })
};
const malformedEvidenceHistory = {
  id: "history-malformed-evidence",
  project: canonicalProject,
  projectKey: canonicalProject.projectKey,
  analysis: projectPayload({ id: "analysis-malformed-evidence", evidence: [{}] })
};
const malformedLimitationsHistory = {
  id: "history-malformed-limitations",
  project: canonicalProject,
  projectKey: canonicalProject.projectKey,
  analysis: projectPayload({ id: "analysis-malformed-limitations", limitations: { forged: true } })
};
const validHistoryTwo = {
  id: "history-valid-2",
  project: canonicalProject,
  projectKey: canonicalProject.projectKey,
  analysis: projectPayload({ id: "analysis-valid-2" })
};
const historyResults = [
  validHistoryOne,
  malformedEvidenceHistory,
  malformedLimitationsHistory,
  validHistoryTwo
].map((item) => normalizer.normalizeRestoredAnalysisHistoryItem(item, baseContext)?.item ?? null)
  .filter(Boolean);
assert.deepEqual(historyResults.map((item) => item.id), ["history-valid-1", "history-valid-2"]);
assert.ok(historyResults.every((item) => item.project === canonicalProject));

const forgedOuterProjectHistory = {
  ...validHistoryOne,
  project: forgedSegmentProject
};
assert.equal(normalizer.normalizeRestoredAnalysisHistoryItem(forgedOuterProjectHistory, baseContext), null);

assert.ok(canonicalProjectRestore.analysis.limitations.includes(requiredCaveat));

console.log("Adversarial analysis restore checks passed.");
console.log("- persisted screening metrics and area names: re-derived from current app-owned matcher");
console.log("- forged decision fields, allowed gates and official target provenance: contained");
console.log("- out-of-range coordinates and opposite-segment project metadata: rejected");
console.log("- current project AOI/uploaded object: canonicalized; cross-project AOI: rejected");
console.log("- malformed evidence/limitations: isolated per history item; valid siblings preserved");
console.log("- current screening-only result: restored without false re-analysis status");
