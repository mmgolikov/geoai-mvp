#!/usr/bin/env node

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveGeoAIAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(root, request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, fileName) => {
    const source = fs.readFileSync(fileName, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        resolveJsonModule: true,
        target: ts.ScriptTarget.ES2020
      },
      fileName
    }).outputText;
    module._compile(output, fileName);
  };
}

const { UploadedDataPrintBlock } = require(path.join(root, "components/printable-report.tsx"));

function dataset(id, name, projectKey) {
  return {
    id,
    projectKey,
    name,
    type: "csv",
    status: "parsed",
    sourceMode: "user-uploaded",
    uploadedAt: "2026-08-17T00:00:00.000Z",
    confidence: "user-provided",
    officialStatus: "official-validation-required",
    visible: false
  };
}

const analysis = {
  id: "print-upload-adversarial-analysis",
  project: { projectKey: "project-a" },
  analysisTarget: { sourceMode: "user-uploaded", datasetId: "selected" },
  evidence: [{ id: "uploaded-evidence-metrics", sourceId: "uploaded-local:evidence" }],
  uploadedDataContext: {
    uploadedDatasets: [
      dataset("applied", "Applied underwriting context.csv", "project-a"),
      dataset("selected", "Selected geometry.csv", "project-a"),
      dataset("evidence", "Evidence referenced.csv", "project-a"),
      dataset("available-only", "Unrelated confidential portfolio.csv", "project-a"),
      dataset("foreign-applied", "Foreign tenant portfolio.csv", "project-b")
    ],
    appliedMetrics: [
      { datasetId: "applied", note: "Applied to this screening result." },
      { datasetId: "foreign-applied", note: "Must remain outside project custody." }
    ],
    availableButNotApplied: [{ datasetId: "available-only", note: "Not matched." }],
    visibleGeojsonLayers: [],
    selectedPoint: { latitude: 25, longitude: 55 }
  }
};

const html = renderToStaticMarkup(React.createElement(UploadedDataPrintBlock, { analysis }));
const assertions = [
  [html.includes("Source Lineage / Uploaded Data Used"), "print Data Used heading is missing"],
  [html.includes("Applied underwriting context.csv"), "applied upload is missing"],
  [html.includes("Selected geometry.csv"), "selected upload is missing"],
  [html.includes("Evidence referenced.csv"), "evidence-referenced upload is missing"],
  [!html.includes("Unrelated confidential portfolio.csv"), "available-only upload leaked into print"],
  [!html.includes("Foreign tenant portfolio.csv"), "foreign-project upload leaked into print"],
  [!html.includes("Not matched."), "available-only note leaked into print"]
];
const failures = assertions.filter(([passed]) => !passed).map(([, message]) => message);

if (failures.length > 0) {
  console.error("Print upload-use adversarial check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Print upload-use adversarial check passed: only project-scoped uploads used by the analysis render in Data Used.");
