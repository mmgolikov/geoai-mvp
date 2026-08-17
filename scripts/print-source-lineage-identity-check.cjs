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
        target: ts.ScriptTarget.ES2020
      },
      fileName
    }).outputText;
    module._compile(output, fileName);
  };
}

const { SourceLineagePrintSection } = require(path.join(root, "components/reports/report-print-primitives.tsx"));
const requiredCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const lineage = {
  capturedAt: "2026-08-16T00:00:00.000Z",
  externalSources: [
    null,
    {
      id: "valid-external-source",
      name: "Reviewed open context",
      status: "snapshot_available",
      disclaimer: requiredCaveat
    }
  ],
  uploadedSources: [
    {},
    {
      id: "uploaded-demo-survey",
      name: "Demo Tower Survey.geojson",
      type: "GeoJSON",
      note: "User-provided survey context."
    },
    {
      id: "uploaded-fixture-assets",
      name: "Fixture Assets.csv",
      type: "CSV",
      note: "User-provided asset context."
    }
  ],
  demoSources: [
    {
      id: "system-fixture",
      name: "fixture-screening-context",
      note: "Illustrative system context."
    }
  ],
  plannedValidationSources: [],
  disclaimers: [{ invalid: true }, requiredCaveat]
};

const html = renderToStaticMarkup(React.createElement(SourceLineagePrintSection, { lineage }));
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(html.includes("Demo Tower Survey.geojson"), "Uploaded GeoJSON identity was rewritten");
assert(html.includes("Fixture Assets.csv"), "Uploaded CSV identity was rewritten");
assert(
  (html.match(/Illustrative local screening context/g) ?? []).length === 1,
  "Uploaded identities were incorrectly folded into the system illustrative label"
);
assert(html.includes(requiredCaveat), "Printable lineage omitted the exact required caveat");
assert(html.includes("Reviewed open context"), "Valid sibling external source was lost while filtering malformed members");
assert(!html.includes("[object Object]"), "Malformed lineage member leaked into printable output");
assert(
  (html.match(new RegExp(requiredCaveat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length >= 1,
  "Non-string disclaimer prevented the required caveat from rendering"
);

if (failures.length > 0) {
  console.error("Printable source-lineage identity check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Printable source-lineage identity check passed.");
console.log("Uploaded identities preserved: Demo Tower Survey.geojson; Fixture Assets.csv");
console.log(`Caveat: ${requiredCaveat}`);
