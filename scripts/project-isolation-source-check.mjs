import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import ts from "typescript";

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(run, message) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

function loadPureTypeScriptModule(path, dependencies = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path
  }).outputText;
  const module = { exports: {} };
  const require = (request) => {
    if (request in dependencies) return dependencies[request];
    throw new Error(`Pure upload contract unexpectedly required ${request}`);
  };
  new Function("exports", "module", "require", output)(module.exports, module, require);
  return module.exports;
}

const demoProjects = read("src/data/demo-projects.ts");
const dataRoom = read("src/lib/data-room/data-room-summary.ts");
const packageBuilder = read("src/lib/report-package/report-package-builder.ts");
const packageRepository = read("src/lib/repositories/report-package-repository.ts");
const uploadedData = read("src/lib/uploaded-data.ts");
const uploadedType = read("src/types/uploaded-data.ts");
const browserArtifacts = read("src/lib/browser-project-artifacts.ts");
const browserDemoStorageSource = read("src/lib/browser-demo-storage.ts");
const aoiLibrary = read("src/lib/aoi-library.ts");
const polygonAoi = read("src/lib/polygon-aoi.ts");
const workspace = read("components/workspace-shell.tsx");
const dashboard = read("components/project-dashboard/project-dashboard.tsx");
const reportPreview = read("components/report-preview.tsx");
const printReportFallback = read("components/reports/print-report-fallback.tsx");
const authProvider = read("components/auth/auth-provider.tsx");

const browserDemoStorage = loadPureTypeScriptModule("src/lib/browser-demo-storage.ts");
const browserArtifactModule = loadPureTypeScriptModule("src/lib/browser-project-artifacts.ts", {
  "@/src/lib/browser-demo-storage": browserDemoStorage
});
const originalAuthMode = process.env.NEXT_PUBLIC_AUTH_MODE;
delete process.env.NEXT_PUBLIC_AUTH_MODE;
assert(browserDemoStorage.isBrowserDemoStorageEnabled(), "Missing auth mode must preserve the explicit public demo default");
process.env.NEXT_PUBLIC_AUTH_MODE = "demo_public";
assert(browserDemoStorage.isBrowserDemoStorageEnabled(), "demo_public must enable namespaced browser persistence");
for (const disabledMode of ["disabled", "supabase_auth", "invalid-mode"]) {
  process.env.NEXT_PUBLIC_AUTH_MODE = disabledMode;
  assert(!browserDemoStorage.isBrowserDemoStorageEnabled(), `${disabledMode} must fail closed for browser persistence`);
}
if (originalAuthMode === undefined) delete process.env.NEXT_PUBLIC_AUTH_MODE;
else process.env.NEXT_PUBLIC_AUTH_MODE = originalAuthMode;
assert(browserDemoStorage.browserDemoStorageKey("contract") === "geoai-public-demo-v2:contract", "Browser demo keys must use the versioned public-demo namespace");
assert(browserDemoStorageSource.includes("storage.removeItem(key)"), "Demo storage cleanup must remove only enumerated namespace keys");

const validBrowserArtifact = {
  id: "analysis-report-contract",
  projectKey: "contract-project",
  projectId: null,
  type: "report",
  title: "Contract report",
  createdAt: "2026-07-16T00:00:00.000Z",
  sourceSummary: "Browser-local screening report; official validation required.",
  reportType: "analysis",
  targetLabel: null,
  injectedPrivateField: "must-not-survive"
};
const normalizedBrowserArtifact = browserArtifactModule.normalizeBrowserProjectArtifact(validBrowserArtifact);
assert(normalizedBrowserArtifact?.id === validBrowserArtifact.id, "Valid browser artifact must pass runtime normalization");
assert(normalizedBrowserArtifact !== null && !("injectedPrivateField" in normalizedBrowserArtifact), "Browser artifact normalization must return only the allowlisted schema");
for (const [patch, label] of [
  [{ projectId: 42 }, "non-string projectId"],
  [{ reportType: "official" }, "unknown reportType"],
  [{ targetLabel: { raw: "private" } }, "non-string targetLabel"],
  [{ sourceSummary: undefined }, "missing sourceSummary"],
  [{ createdAt: "not-a-date" }, "invalid createdAt"],
  [{ createdAt: "2026-02-31T00:00:00.000Z" }, "normalized impossible createdAt"],
  [{ title: "x".repeat(browserArtifactModule.browserProjectArtifactLimits.maximumTitleCharacters + 1) }, "oversized title"],
  [{ sourceSummary: "unsafe\u0000summary" }, "control characters"]
]) {
  assert(browserArtifactModule.normalizeBrowserProjectArtifact({ ...validBrowserArtifact, ...patch }) === null, `Browser artifact schema accepted ${label}`);
}
const browserArtifactAuthMode = process.env.NEXT_PUBLIC_AUTH_MODE;
const originalWindow = globalThis.window;
process.env.NEXT_PUBLIC_AUTH_MODE = "demo_public";
let storedBrowserArtifacts = JSON.stringify([
  validBrowserArtifact,
  { ...validBrowserArtifact, id: "invalid-optional", targetLabel: { raw: "private" } }
]);
globalThis.window = { localStorage: { getItem: () => storedBrowserArtifacts } };
assert(browserArtifactModule.readBrowserProjectArtifacts().length === 1, "Browser artifact reads must quarantine invalid optional fields");
storedBrowserArtifacts = JSON.stringify(Array.from(
  { length: browserArtifactModule.browserProjectArtifactLimits.maximumEntries + 1 },
  (_, index) => ({ ...validBrowserArtifact, id: `bounded-artifact-${index}` })
));
assert(browserArtifactModule.readBrowserProjectArtifacts().length === 0, "Oversized browser artifact indexes must fail closed before normalization");
storedBrowserArtifacts = "x".repeat(browserArtifactModule.browserProjectArtifactLimits.maximumStorageCharacters + 1);
assert(browserArtifactModule.readBrowserProjectArtifacts().length === 0, "Oversized browser artifact storage payloads must fail closed before JSON parsing");
if (originalWindow === undefined) delete globalThis.window;
else globalThis.window = originalWindow;
if (browserArtifactAuthMode === undefined) delete process.env.NEXT_PUBLIC_AUTH_MODE;
else process.env.NEXT_PUBLIC_AUTH_MODE = browserArtifactAuthMode;
assert(browserArtifacts.includes("maximumStorageCharacters") && browserArtifacts.includes("maximumEntriesPerProject"), "Browser artifact index must enforce storage and per-project bounds");
assert(browserArtifacts.includes("normalizeBrowserProjectArtifact(artifact)"), "Browser artifact writes must pass runtime schema validation");
assert(browserDemoStorageSource.includes("legacyBrowserDemoStorageKeys"), "Auth transition cleanup must quarantine exact legacy demo keys");
assert(browserDemoStorageSource.includes('legacyBrowserDemoStoragePrefixes = ["geoai-print-report:"]'), "Auth transition cleanup must quarantine legacy dynamic print-report keys");
assert(authProvider.includes('authStatus.effectiveMode !== "demo_public"') && authProvider.includes("clearBrowserDemoStorage()"), "Auth startup and sign-out must clear browser demo storage");

for (const [path, source] of [
  ["components/workspace-shell.tsx", workspace],
  ["components/project-dashboard/project-dashboard.tsx", dashboard],
  ["components/report-preview.tsx", reportPreview],
  ["components/reports/print-report-fallback.tsx", printReportFallback]
]) {
  assert(source.includes("browserDemoStorageKey") && source.includes("isBrowserDemoStorageEnabled"), `${path} must use the shared browser-demo storage boundary`);
  assert(!/["'`]geoai-(?!public-demo-v2)/.test(source), `${path} contains an unnamespaced legacy GeoAI storage key`);
}
assert(workspace.includes("if (!isBrowserDemoStorageEnabled()) return []"), "Workspace history reads must fail closed outside public demo mode");
assert(workspace.includes("sessionRecord && isBrowserDemoStorageEnabled()"), "Workspace print payload writes must fail closed outside public demo mode");
assert(dashboard.includes("!row.analysis || !isBrowserDemoStorageEnabled()"), "Dashboard analysis handoff writes must fail closed outside public demo mode");
assert(printReportFallback.includes("isBrowserDemoStorageEnabled()"), "Printable report fallback must skip browser reads outside public demo mode");

const demoResolver = demoProjects.match(/export function getDemoProject[\s\S]*?\n}/)?.[0] ?? "";
assert(/if\s*\(!projectKey\)\s*return\s+demoProjects\[0\]\s*\?\?\s*null/.test(demoResolver), "Demo resolver must default only when no project key was supplied");
assert(/find\([\s\S]*?\)\s*\?\?\s*null/.test(demoResolver), "Unknown non-empty demo key must resolve to null");
assert(!/endsWith\("-demo"\)/.test(demoProjects), "Demo identity must not trust an arbitrary key suffix");

assert(dataRoom.includes("requestedIdentity ? null : getDemoProject(null)"), "Data Room must not substitute another project for an unknown identity");
assert(dataRoom.includes("Data Room did not substitute another demo project"), "Data Room missing explicit unknown-project result");
assert(packageBuilder.includes("report package generation did not substitute a demo project"), "Report package builder must fail closed on an unknown project");
assert(!packageBuilder.includes("?? getDemoProject(input.projectKey)"), "Report package builder still falls back to a demo project");
assert(packageRepository.includes("seededPackageDefinitions.filter((item) => item.projectKey === projectKey)"), "Unknown report-package project identity must produce no seed definition");
assert(packageRepository.includes("seededPackageDefinitions.find((item) => item.packageKey === idOrKey)"), "Report-package lookup must resolve a canonical seed directly without rebuilding every project");

assert(/projectKey:\s*string/.test(uploadedType), "UploadedDataset must carry projectKey");
assert(uploadedData.includes('typeof dataset.projectKey === "string"'), "Browser uploads without a project identity must be rejected");
for (const quota of ["maxUploadedCsvRecords", "maxUploadedCsvColumns", "maxUploadedGeojsonFeatures", "maxUploadedGeojsonCoordinatePairs"]) {
  assert(uploadedData.includes(quota), `Browser upload parser is missing structural quota ${quota}`);
}
assert(workspace.includes("uploadedDatasets.filter((dataset) => dataset.projectKey === activeProject.projectKey)"), "Workspace uploads must be filtered by the active projectKey");
assert(dashboard.includes("projectDatasets.filter((item) => belongsToProject(item, activeProject.projectKey))"), "Dashboard uploads must be filtered by the active project identity");
assert(read("components/analysis-panel.tsx").includes("Do not upload confidential, personal or regulated data"), "Browser upload UI must warn against confidential/personal data");
assert(browserArtifacts.includes("projectKey"), "Browser artifact summaries must be project-scoped");
assert(aoiLibrary.includes("maxAoiVertices"), "AOI import must enforce a vertex cap before geometry validation");
assert(aoiLibrary.includes("window.localStorage.setItem") && /window\.localStorage\.setItem[\s\S]*?catch/.test(aoiLibrary), "AOI browser persistence failure must be contained");
assert(polygonAoi.indexOf("vertices.length > maxAoiVertices") < polygonAoi.indexOf("hasSelfIntersection(ring)"), "AOI vertex cap must run before quadratic self-intersection checks");
assert(!workspace.includes("?? getDemoProject(storedProjectKey)"), "Workspace must not map an unknown stored key to demo project zero");
assert(workspace.includes("the active project was not changed"), "Workspace must explain unknown project selection without switching identity");
assert(workspace.includes("limitUploadedDatasetsPerProject(updater(currentItems))"), "Upload retention must be capped independently per project");
assert(workspace.includes("item.id !== datasetId || item.projectKey !== activeProject.projectKey"), "Upload removal must use compound project/id identity");
assert(workspace.includes("item.id === datasetId && item.projectKey === activeProject.projectKey"), "Upload visibility mutation must use compound project/id identity");
assert(workspace.includes("isBrowserLocalSelection(selectedObject, selectedAoi)"), "Derived coordinates for uploaded/user-drawn targets must remain browser-local");

const uploads = loadPureTypeScriptModule("src/lib/uploaded-data.ts", {
  "@/src/lib/browser-demo-storage": browserDemoStorage
});
const featureCollection = (geometry) => JSON.stringify({
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: { name: "contract" }, geometry }]
});
uploads.parseUploadedGeojson(featureCollection({ type: "Point", coordinates: [55.27, 25.2] }), "valid", "valid.geojson");
uploads.parseUploadedGeojson(featureCollection({
  type: "Polygon",
  coordinates: [[[55, 25], [55.1, 25], [55.1, 25.1], [55, 25]]]
}), "valid-polygon", "valid-polygon.geojson");
expectThrow(() => uploads.parseUploadedGeojson(featureCollection({ type: "Point", coordinates: [[0, 0]] }), "nested-point", "nested-point.geojson"), "Nested Point coordinates must fail");
expectThrow(() => uploads.parseUploadedGeojson(featureCollection({ type: "Point", coordinates: [0, 0, [1, 2]] }), "point-tail", "point-tail.geojson"), "Point coordinates with a nested tail must fail");
expectThrow(() => uploads.parseUploadedGeojson(featureCollection({ type: "LineString", coordinates: [[0, 0]] }), "short-line", "short-line.geojson"), "One-position LineString must fail");
expectThrow(() => uploads.parseUploadedGeojson(featureCollection({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1]]] }), "short-ring", "short-ring.geojson"), "Short Polygon ring must fail");
expectThrow(() => uploads.parseUploadedGeojson(featureCollection({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] }), "open-ring", "open-ring.geojson"), "Unclosed Polygon ring must fail");
expectThrow(() => uploads.parseUploadedGeojson(featureCollection({ type: "Point", coordinates: [181, 0] }), "range", "range.geojson"), "Out-of-range longitude must fail");
expectThrow(() => uploads.parseUploadedCsv(`${Array.from({ length: 129 }, (_, index) => index === 0 ? "name" : `c${index}`).join(",")}\n${Array(129).fill("x").join(",")}`), "CSV column quota must fail");
expectThrow(() => uploads.parseUploadedCsv(`name\n${"x".repeat(16_385)}`), "CSV cell quota must fail");
expectThrow(() => uploads.parseUploadedCsv(`name\n${Array.from({ length: 10_001 }, (_, index) => `row-${index}`).join("\n")}`), "CSV record quota must fail");
expectThrow(() => uploads.parseUploadedCsv('name,latitude,longitude\n"unterminated,25.2,55.27'), "Unterminated quoted CSV fields must fail");
expectThrow(() => uploads.parseUploadedCsv("name,name\nfirst,second"), "Duplicate normalized CSV headers must fail");
expectThrow(() => uploads.parseUploadedCsv("name,latitude,longitude\nsite,385.2,415.27"), "Out-of-range CSV coordinates must fail");
expectThrow(() => uploads.parseUploadedCsv("name,latitude,longitude\nsite,25.2"), "Unpaired CSV coordinates must fail");
expectThrow(() => uploads.parseUploadedCsv("name\nsite,unexpected"), "CSV rows wider than the header must fail");
expectThrow(() => uploads.parseUploadedCsv("name,latitude,longitude"), "Header-only CSV must fail");
uploads.parseUploadedCsv('name,latitude,longitude\n"valid, site",25.2,55.27');

const cappedUploads = uploads.limitUploadedDatasetsPerProject([
  ...Array.from({ length: 30 }, (_, index) => ({ id: `a-${index}`, projectKey: "project-a" })),
  ...Array.from({ length: 30 }, (_, index) => ({ id: `b-${index}`, projectKey: "project-b" }))
]);
assert(cappedUploads.length === 48, "Upload retention must keep an independent 24-item window for each project");
assert(cappedUploads.filter((item) => item.projectKey === "project-a").length === 24, "Project A upload cap changed unexpectedly");
assert(cappedUploads.filter((item) => item.projectKey === "project-b").length === 24, "Project B uploads must not be evicted by project A");

const legacyInvalidGeojson = {
  id: "legacy-invalid-geojson",
  projectKey: "palm-jebel-ali-demo",
  name: "legacy.geojson",
  type: "geojson",
  status: "parsed",
  sourceMode: "user-uploaded",
  uploadedAt: "2026-07-16T00:00:00.000Z",
  confidence: "user-provided",
  officialStatus: "official-validation-required",
  visible: true,
  geojson: JSON.parse(featureCollection({ type: "Point", coordinates: [385.2, 415.27] }))
};
const authModeBeforeLegacyRead = process.env.NEXT_PUBLIC_AUTH_MODE;
process.env.NEXT_PUBLIC_AUTH_MODE = "demo_public";
globalThis.window = { localStorage: { getItem: () => JSON.stringify([legacyInvalidGeojson]) } };
const quarantinedLegacy = uploads.readBrowserUploadedDatasets();
delete globalThis.window;
if (authModeBeforeLegacyRead === undefined) delete process.env.NEXT_PUBLIC_AUTH_MODE;
else process.env.NEXT_PUBLIC_AUTH_MODE = authModeBeforeLegacyRead;
assert(quarantinedLegacy.length === 1 && quarantinedLegacy[0].status === "invalid" && !quarantinedLegacy[0].geojson, "Legacy invalid GeoJSON must be quarantined on browser read");

const invalidLegacyCsv = {
  id: "legacy-invalid-csv",
  projectKey: "palm-jebel-ali-demo",
  name: "legacy.csv",
  type: "csv",
  status: "parsed",
  sourceMode: "user-uploaded",
  uploadedAt: "2026-07-16T00:00:00.000Z",
  confidence: "user-provided",
  officialStatus: "official-validation-required",
  rows: [{ name: "periodic", latitude: 385.2, longitude: 415.27, metrics: {}, raw: {} }]
};
const invalidLegacyContext = uploads.buildUploadedDataContext([invalidLegacyCsv], { latitude: 25.2, longitude: 55.27 });
assert(invalidLegacyContext.appliedMetrics.length === 0, "Out-of-range legacy CSV coordinates must never produce a nearest-coordinate match");

console.log("Project isolation/upload contract passed: identities fail closed; browser artifacts are project-scoped; CSV/GeoJSON structural quotas are enforced.");
