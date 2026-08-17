import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const deliverablePath = "src/lib/report-deliverables.ts";
const serverPagePath = "app/reports/[id]/print/page.tsx";
const browserFallbackPath = "components/reports/print-report-fallback.tsx";
const [deliverableSource, serverPageSource, browserFallbackSource] = await Promise.all([
  readFile(new URL(deliverablePath, root), "utf8"),
  readFile(new URL(serverPagePath, root), "utf8"),
  readFile(new URL(browserFallbackPath, root), "utf8")
]);

const canonicalCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const canonicalProject = {
  id: null,
  projectKey: "canonical-project",
  name: "Canonical Project",
  description: "Application-owned project context.",
  geography: "Dubai / UAE",
  clientType: "developer",
  primaryScenario: "investmentSiteSelection",
  status: "demo",
  dataMode: "demo_normalized",
  metadata: { segment: "b2b", audience: "b2b" }
};
const point = { latitude: 25.2048, longitude: 55.2708 };
const scores = {
  developmentPotential: 61,
  investmentAttractiveness: 62,
  accessibility: 63,
  infrastructureReadiness: 64,
  climateHeatRisk: 45,
  overallRisk: 46
};
const scoreLabels = Object.fromEntries(Object.keys(scores).map((key) => [key, key]));
const evidence = [{
  id: "canonical-evidence",
  label: "Canonical local context",
  title: "Canonical local context",
  description: "Application-owned screening evidence.",
  sourceId: "canonical-source",
  sourceStatus: "mock",
  sourceType: "demo",
  confidence: "low"
}, {
  id: "uploaded-used-dataset-metrics",
  label: "Used project dataset",
  title: "Used project dataset",
  description: "Dataset explicitly referenced by canonical evidence.",
  sourceId: "uploaded-local:used-dataset",
  sourceStatus: "mock",
  sourceType: "customer",
  confidence: "low"
}];
const comparisonEvidence = evidence.filter((item) => item.sourceId !== "uploaded-local:used-dataset");
const selectedObject = {
  id: "canonical-object",
  name: "Canonical screening target",
  type: "Illustrative screening asset",
  layerId: "developmentZones",
  layerName: "Canonical screening layer",
  geometryType: "point",
  center: point,
  analysisTarget: {
    id: "canonical-object",
    type: "demo-feature",
    label: "Canonical screening target",
    coordinates: point,
    geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
    sourceMode: "demo",
    officialStatus: "not-official"
  }
};
const canonicalAnalysis = {
  id: "canonical-analysis",
  scenarioId: "investmentSiteSelection",
  title: "Investment Site Selection",
  subtitle: "Canonical screening result",
  point,
  selectedObject,
  analysisTarget: selectedObject.analysisTarget,
  summary: "Canonical deterministic screening summary.",
  scoreLabels,
  scores,
  keyFactors: ["Canonical driver"],
  opportunities: ["Canonical opportunity"],
  risks: ["Canonical risk"],
  nextActions: ["Validate the screening result"],
  evidence,
  generatedAt: "2026-08-16T00:00:00.000Z",
  project: canonicalProject,
  analysisMode: "mock_fallback",
  confidenceLevel: "medium",
  limitations: [canonicalCaveat]
};
const comparisonItem = {
  id: "object-canonical-object-investmentSiteSelection",
  name: selectedObject.name,
  itemType: "object",
  scenarioId: "investmentSiteSelection",
  scenarioLabel: "Investment Site Selection",
  point,
  selectedObject,
  locationLabel: selectedObject.name
};
const comparisonScorecard = {
  item: comparisonItem,
  scores,
  overallScore: 62,
  riskLevel: "Moderate",
  recommendedUse: "Structured screening review",
  keyConcern: "Official validation remains required"
};
const canonicalComparison = {
  id: "canonical-comparison",
  items: [comparisonScorecard, {
    ...comparisonScorecard,
    item: {
      ...comparisonItem,
      id: "point-25.30000-55.30000-investmentSiteSelection",
      name: "Canonical alternative",
      itemType: "point",
      point: { latitude: 25.3, longitude: 55.3 },
      selectedObject: undefined,
      locationLabel: "Canonical alternative"
    },
    overallScore: 58
  }],
  winner: comparisonScorecard,
  whyPreferred: "Canonical ranking rationale.",
  whenAnotherMayBeBetter: "Validate alternatives if assumptions change.",
  sharedOpportunities: ["Canonical shared opportunity"],
  differentiatedRisks: ["Canonical differentiated risk"],
  nextActions: ["Validate the comparison"],
  evidence: comparisonEvidence,
  project: canonicalProject
};

function executeTypeScriptModule(relativePath, dependencies) {
  const absolutePath = path.resolve(new URL(relativePath, root).pathname);
  const compiled = ts.transpileModule(deliverableSource, {
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

const lineage = {
  capturedAt: "2026-08-16T00:00:00.000Z",
  demoSources: [{ id: "canonical-evidence", name: "Canonical local context", note: "Application-owned screening evidence." }],
  uploadedSources: [],
  externalSources: [],
  plannedValidationSources: [],
  disclaimers: [canonicalCaveat]
};
const module = executeTypeScriptModule(deliverablePath, {
  "@/src/data/demo-projects": { demoProjects: [canonicalProject] },
  "@/src/lib/analysis-restore-authority": {
    createBrowserAnalysisRestoreContext(expectedProject, sourceReference) {
      return {
        expectedProject,
        ...sourceReference,
        projectAois: [],
        uploadedDatasets: [
          {
            id: "used-dataset",
            projectKey: expectedProject.projectKey,
            name: "Used project context.csv",
            type: "csv",
            notes: "Referenced by canonical evidence."
          },
          {
            id: "unused-dataset",
            projectKey: expectedProject.projectKey,
            name: "Unrelated confidential portfolio.csv",
            type: "csv",
            notes: "Available in the project but not used."
          }
        ]
      };
    }
  },
  "@/src/lib/analysis-restore-normalization": {
    normalizeRestoredExpressAnalysis(value, context) {
      return value?.id === canonicalAnalysis.id && context.expectedProject === canonicalProject
        ? { analysis: structuredClone(canonicalAnalysis), requiresReanalysis: false }
        : null;
    }
  },
  "@/src/lib/comparison-restore": {
    normalizeRestoredComparison(value, projectKey, comparisonId, expectedProject) {
      return value?.id === canonicalComparison.id &&
        projectKey === canonicalProject.projectKey &&
        comparisonId === canonicalComparison.id &&
        expectedProject === canonicalProject
        ? structuredClone(canonicalComparison)
        : null;
    }
  },
  "@/src/lib/decision-posture": { deriveDecisionPosture: () => "Requires official validation" },
  "@/src/lib/report-map-snapshot": {
    normalizeReportMapSnapshot(value) {
      return value && typeof value === "object" ? structuredClone(value) : null;
    }
  },
  "@/src/lib/report-id": {
    isCanonicalReportId(value) {
      return typeof value === "string" && value.length > 0 && value.length <= 240 && /^[a-z0-9][a-z0-9._:-]*$/i.test(value);
    }
  },
  "@/src/lib/source-lineage-snapshot": {
    createSourceLineageSnapshot({ uploadedDatasets = [] }) {
      return {
        ...structuredClone(lineage),
        uploadedSources: uploadedDatasets.map((dataset) => ({
          id: dataset.id,
          name: dataset.name,
          type: dataset.type,
          note: dataset.notes ?? "User-provided context."
        }))
      };
    }
  }
});

const forgedStrings = [
  "Certified valuation for Official Parcel 7",
  "Ownership verified and investment guaranteed",
  "Live official DLD integration",
  "Forged score 100",
  "Forged source lineage"
];
const analysisRecord = {
  id: "canonical-analysis-report",
  projectId: null,
  projectKey: canonicalProject.projectKey,
  reportType: "analysis",
  title: forgedStrings[0],
  decisionPosture: forgedStrings[1],
  sourceLineage: { disclaimers: [forgedStrings[4]] },
  createdAt: "2026-08-16T00:00:00.000Z",
  reportPayload: {
    title: forgedStrings[0],
    selectedSite: "Official Parcel 7",
    decisionPosture: forgedStrings[1],
    scoreOverview: { overallRisk: 0, investmentAttractiveness: 100 },
    keyValueDrivers: [forgedStrings[3]],
    evidenceSourceReadiness: [{ description: forgedStrings[2] }],
    sourceLineage: { disclaimers: [forgedStrings[4]] },
    memoJson: { ...canonicalAnalysis, summary: forgedStrings[0], scores: { ...scores, investmentAttractiveness: 100 } },
    mapSnapshot: {
      src: "/report-map-snapshots/seeded-dubai-marina-dashboard.png",
      width: 382,
      height: 358,
      capturedAt: "2026-08-16T00:00:00.000Z",
      targetLabel: "Official Parcel 7",
      source: "seeded-dashboard-map"
    }
  }
};
const analysisReport = module.normalizeReportDeliverable(analysisRecord, {
  expectedReportId: analysisRecord.id,
  expectedProject: canonicalProject
});
assert.ok(analysisReport, "Canonical analysis report was rejected");
assert.equal(analysisReport.decisionPosture, "Requires official validation");
assert.equal(analysisReport.scoreSummary.investmentAttractiveness, scores.investmentAttractiveness);
assert.equal(analysisReport.targetLabel, selectedObject.name);
assert.equal(analysisReport.mapSnapshot.targetLabel, selectedObject.name);
assert.deepEqual(
  analysisReport.sourceLineage.uploadedSources.map((source) => source.name),
  ["Used project context.csv"],
  "Analysis lineage included a project upload that canonical evidence did not use"
);
const analysisOutput = JSON.stringify(analysisReport);
for (const forged of forgedStrings) {
  assert.ok(!analysisOutput.includes(forged), `Persisted analysis field survived canonical rebuilding: ${forged}`);
}

const comparisonRecord = {
  id: "canonical-comparison-report",
  projectId: null,
  projectKey: canonicalProject.projectKey,
  reportType: "comparison",
  title: forgedStrings[0],
  reportPayload: {
    comparisonJson: { ...canonicalComparison, whyPreferred: forgedStrings[1] },
    decisionPosture: forgedStrings[1],
    comparedItems: [{ name: "Official Parcel 7", overallScore: 100 }],
    keyValueDrivers: [forgedStrings[3]],
    generatedAt: "2026-08-16T00:00:00.000Z"
  }
};
const comparisonReport = module.normalizeReportDeliverable(comparisonRecord, {
  expectedReportId: comparisonRecord.id,
  expectedProject: canonicalProject
});
assert.ok(comparisonReport, "Canonical comparison report was rejected");
assert.equal(comparisonReport.winnerLabel, canonicalComparison.winner.item.name);
assert.equal(comparisonReport.comparedItems[0].overallScore, canonicalComparison.items[0].overallScore);
assert.deepEqual(
  comparisonReport.sourceLineage.uploadedSources,
  [],
  "Point/demo comparison lineage included unrelated project uploads"
);
const comparisonOutput = JSON.stringify(comparisonReport);
for (const forged of forgedStrings) {
  assert.ok(!comparisonOutput.includes(forged), `Persisted comparison field survived canonical rebuilding: ${forged}`);
}

assert.equal(
  module.normalizeReportDeliverable(analysisRecord, {
    expectedReportId: "different-report",
    expectedProject: canonicalProject
  }),
  null,
  "Report route identity mismatch was accepted"
);
assert.equal(
  module.normalizeReportDeliverable({ ...analysisRecord, projectKey: "other-project" }, {
    expectedReportId: analysisRecord.id,
    expectedProject: canonicalProject
  }),
  null,
  "Cross-project report record was accepted"
);
assert.equal(
  module.normalizeReportDeliverable({ ...analysisRecord, project_key: "other-project" }, {
    expectedReportId: analysisRecord.id,
    expectedProject: canonicalProject
  }),
  null,
  "Conflicting camel-case and snake-case project identities were accepted"
);
assert.equal(
  module.normalizeReportDeliverable({ ...analysisRecord, reportType: "comparison" }, {
    expectedReportId: analysisRecord.id,
    expectedProject: canonicalProject
  }),
  null,
  "Report type and canonical payload mismatch was accepted"
);

assert.match(serverPageSource, /expectedProject[\s\S]*?normalizeReportDeliverable\(result\.data, \{[\s\S]*?expectedReportId: id,[\s\S]*?expectedProject/);
assert.match(browserFallbackSource, /normalizeReportDeliverable\(parsed, \{[\s\S]*?expectedReportId: reportId,[\s\S]*?canonicalProjects/);
assert.match(browserFallbackSource, /normalizeReportForDisplay\(normalized\)/);
assert.match(browserFallbackSource, /const parsed = seededRecord \?\?/);
assert.doesNotMatch(deliverableSource, /record\.sourceLineage \?\? record\.source_lineage/);
assert.doesNotMatch(deliverableSource, /payload\.decisionPosture/);
assert.doesNotMatch(deliverableSource, /payload\.scoreOverview/);

console.log("Report restore adversarial check passed.");
console.log("Persisted report presentation, score, posture and lineage fields are ignored and rebuilt from canonical analysis/comparison inputs.");
console.log(`Caveat: ${canonicalCaveat}`);
