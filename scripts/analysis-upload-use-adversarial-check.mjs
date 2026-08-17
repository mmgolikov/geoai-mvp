import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const modulePath = new URL("../src/lib/analysis-upload-use.ts", import.meta.url);
const source = await readFile(modulePath, "utf8");
const transpiled = ts.transpileModule(source, {
  fileName: modulePath.pathname,
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

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
const module = await import(moduleUrl);
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function dataset(id, projectKey = "project-a", type = "csv") {
  return {
    id,
    projectKey,
    name: `${id}.${type === "csv" ? "csv" : "geojson"}`,
    type,
    status: "parsed",
    sourceMode: "user-uploaded",
    uploadedAt: "2026-08-17T00:00:00.000Z",
    confidence: "user-provided",
    officialStatus: "official-validation-required",
    visible: type === "geojson"
  };
}

const datasets = [
  dataset("applied"),
  dataset("visible", "project-a", "geojson"),
  dataset("selected", "project-a", "geojson"),
  dataset("evidence"),
  dataset("available-only"),
  dataset("foreign-applied", "project-b")
];
const analysis = {
  id: "analysis-a",
  project: { projectKey: "project-a" },
  analysisTarget: {
    sourceMode: "user-uploaded",
    datasetId: "selected"
  },
  evidence: [{
    id: "uploaded-evidence-metrics",
    sourceId: "uploaded-local:evidence",
    description: caveat
  }],
  uploadedDataContext: {
    uploadedDatasets: datasets,
    appliedMetrics: [
      { datasetId: "applied" },
      { datasetId: "foreign-applied" }
    ],
    availableButNotApplied: [{ datasetId: "available-only" }],
    visibleGeojsonLayers: [datasets[1]],
    selectedPoint: { latitude: 25, longitude: 55 }
  }
};

assert.deepEqual(
  module.selectAnalysisUsedUploadedDatasets(analysis).map((item) => item.id),
  ["applied", "visible", "selected", "evidence"],
  "Only project-scoped applied, visible, selected or evidence-referenced uploads may appear as used"
);
assert.equal(
  module.selectAnalysisUsedUploadedDatasets({
    ...analysis,
    analysisTarget: undefined,
    evidence: [],
    uploadedDataContext: {
      ...analysis.uploadedDataContext,
      appliedMetrics: [],
      visibleGeojsonLayers: []
    }
  }).length,
  0,
  "Available-but-not-applied uploads must not appear in Data Used"
);
assert.equal(
  module.selectAnalysisUsedUploadedDatasets({ ...analysis, project: undefined }).length,
  0,
  "Upload lineage without canonical project custody must fail closed"
);

console.log("Analysis upload-use adversarial checks passed: unrelated and cross-project uploads are excluded from Data Used.");
