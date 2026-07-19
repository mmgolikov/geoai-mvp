import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadPureTypeScriptModule(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path
  }).outputText;
  const module = { exports: {} };
  const require = (request) => {
    throw new Error(`Public report-package projection unexpectedly required ${request}`);
  };
  new Function("exports", "module", "require", output)(module.exports, module, require);
  return module.exports;
}

const projection = loadPureTypeScriptModule("src/lib/report-package/public-report-package-list.ts");
const seedDefinitions = loadPureTypeScriptModule("src/lib/report-package/report-package-seed-definitions.ts");
const routeSource = read("app/api/report-packages/route.ts");
const builderSource = read("src/lib/report-package/report-package-builder.ts");
const reportsRouteSource = read("app/api/reports/route.ts");
const seedReportSource = read("src/data/demo-report-seeds.ts");
const printPageSource = read("app/report-packages/[id]/print/page.tsx");
const secretMarker = "DYNAMIC_STORED_STATE_MUST_NOT_LEAK";
const hugePrivateValue = `${secretMarker}:${"x".repeat(200_000)}`;

function adversarialPackage(index) {
  return {
    id: `seed-package-${index}`,
    packageKey: `report-package-demo-${index}`,
    projectId: `private-project-id-${index}`,
    projectKey: `demo-project-${index}`,
    title: `Demo package ${index}`,
    packageType: "investment_screening",
    status: "validation_required",
    version: "2.8",
    generatedAt: "2026-07-16T00:00:00.000Z",
    generatedBy: hugePrivateValue,
    linkedAoiIds: [hugePrivateValue],
    linkedAnalysisIds: [hugePrivateValue],
    linkedReportIds: [hugePrivateValue],
    linkedComparisonIds: [hugePrivateValue],
    linkedValidationEvidenceIds: [hugePrivateValue],
    linkedEvidenceFileIds: [hugePrivateValue],
    linkedDataRoomAssetIds: [hugePrivateValue],
    sections: [{ id: "private-section", content: { raw: hugePrivateValue } }],
    sourceLineage: [{ rawPath: hugePrivateValue }],
    validationSummary: { highestAllowedClaimLevel: "screening_only", blockers: [hugePrivateValue] },
    evidenceReviewSummary: { reviewNotes: [{ reviewer: hugePrivateValue }] },
    exportManifest: { artifacts: [{ private: hugePrivateValue }] },
    caveat: "Screening-only sample package; official validation required.",
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z"
  };
}

const payload = projection.createReportPackageListProjection({
  packages: Array.from({ length: 5 }, (_, index) => adversarialPackage(index)),
  projectKey: null,
  staticSeedOnly: true,
  ok: true,
  mode: "demo_seed",
  storageCaveat: "Seed records are sample context and require validation.",
  error: null
});
const serialized = JSON.stringify(payload);
const bytes = new TextEncoder().encode(serialized).byteLength;
const expectedSummaryKeys = [
  "caveat",
  "generatedAt",
  "id",
  "jsonPath",
  "packageKey",
  "packageType",
  "printablePath",
  "projectKey",
  "status",
  "title",
  "version"
].sort();

assert(payload.contractVersion === "compact_public_v1", "Public report-package response must use compact_public_v1");
assert(payload.projection === "dashboard_summaries_v1", "Public report-package response must identify its dashboard projection");
assert(payload.sourceMode === "demo_seed", "Public report-package response must contain seed data only");
assert(payload.dynamicStoredStateIncluded === false, "Public report-package response must exclude dynamic stored state");
assert(!("items" in payload) && !("packages" in payload), "Public report-package response must not expose full package collections");
assert(payload.count === payload.summaries.length && payload.count === 5, "Public report-package summary count mismatch");
assert(payload.summaries.every((summary) => JSON.stringify(Object.keys(summary).sort()) === JSON.stringify(expectedSummaryKeys)), "Dashboard summary projection contains an unapproved field");
assert(!serialized.includes(secretMarker), "Heavy/dynamic report-package internals leaked into the public projection");
assert(bytes <= projection.publicReportPackageListMaxBytes, `Public report-package projection exceeds ${projection.publicReportPackageListMaxBytes} bytes`);

const dynamicProjection = projection.createReportPackageListProjection({
  packages: [adversarialPackage(99)],
  projectKey: "demo-project-99",
  staticSeedOnly: false,
  ok: true,
  mode: "local_fallback",
  storageCaveat: "Private request-scoped response.",
  error: null
});
assert(dynamicProjection.dynamicStoredStateIncluded === true, "Authorized projection must declare dynamic-state eligibility");
assert(!("items" in dynamicProjection), "Authorized collection projection must still avoid full package items");
assert(!JSON.stringify(dynamicProjection).includes(secretMarker), "Authorized collection projection leaked full package internals");

assert(routeSource.includes("publicSeedReportPackageSummaries.filter"), "Public report-package list must use committed compact seed summaries");
assert(routeSource.includes("includeStoredState: true") && routeSource.includes("verifiedRequestIdentity"), "Dynamic stored-state access must remain behind verified request identity");
assert(routeSource.includes("await import(\"@/src/lib/repositories/report-package-repository\")"), "Heavy report repository must be loaded lazily");
assert(!/^import .*report-package-repository/m.test(routeSource), "Report-package collection route must not eagerly import the heavy repository");
assert(!routeSource.includes("items: result.data"), "Report-package route still serializes full package items");
assert(routeSource.includes("cacheStaticSeedResponse") && routeSource.includes("staticSeedOnly && result.ok"), "Public cache must be conditional on a successful static-seed response");
assert(routeSource.includes('privateNoStoreJson') && routeSource.includes('from "@/src/lib/http/private-no-store"'), "Non-static report-package responses must use the shared private/no-store boundary");
assert(routeSource.includes("if (cacheStaticSeedResponse)") && routeSource.includes("return publicImmutableSeedJson(payload)"), "Public caching must remain an explicit immutable-seed allowlist branch");
assert(routeSource.includes("payloadBytes > publicReportPackageListMaxBytes"), "Report-package route must enforce the response-size budget");
assert(builderSource.includes("const sourceEvidenceLineage = uniqueLineage"), "Report-package builder must classify acquired evidence separately");
assert(builderSource.includes("const sourceCandidateLineage = uniqueLineage"), "Report-package builder must classify validation-required candidates separately");
assert(builderSource.includes("evidenceUsed: sourceEvidenceLineage.slice"), "AI memo must not call candidate sources evidence used");
assert(builderSource.includes("candidateSourcesRequiringValidation: sourceCandidateLineage.slice"), "AI memo must disclose referenced source candidates");
assert(builderSource.includes("const selectedReport = selectReport(normalizedReports, input)"), "Explicit report selection must use fail-closed resolution");
assert(!builderSource.includes("externalSourceLineage()"), "Report-package builder still attaches unrelated registry sources");
assert(!builderSource.includes("dataRoomSourceLineage(dataRoom)"), "Report-package builder still attaches unrelated Data Room assets as evidence");
assert(builderSource.includes('report?.evidenceAuthority === "committed_demo_seed"'), "Report evidence must require a committed or server-verified authority");
assert(builderSource.includes("trustedEvidenceAuthority &&"), "Global readiness must not promote unverified client source assertions to evidence");
assert(reportsRouteSource.indexOf("if (!hasServerReportEvidenceAttestation())") < reportsRouteSource.indexOf("readBoundedJson(request"), "Report persistence must fail before parsing until server evidence receipts exist");
assert(seedReportSource.includes('evidenceAuthority: "committed_demo_seed"'), "Committed seed reports must declare their evidence authority");
assert(printPageSource.includes('section.type === "market_context"'), "Print package must render market context explicitly");
assert(printPageSource.includes("const evidence = asList(content.evidence)"), "Print market context must render acquired evidence");
assert(printPageSource.includes("const candidates = asList(content.candidates)"), "Print market context must render validation-required candidates");
assert(printPageSource.includes("Evidence used") && printPageSource.includes("Candidates requiring validation"), "Print market context must label evidence and candidates separately");
assert(!printPageSource.includes("content.lineage ?? content.sources"), "Print market context must not silently resolve to an empty legacy lineage field");
assert(seedDefinitions.publicSeedReportPackageSummaries.length === 5, "Public seed summary catalog must cover all five demo projects");
assert(new Set(seedDefinitions.publicSeedReportPackageSummaries.map((item) => item.projectKey)).size === 5, "Public seed summaries contain duplicate project keys");
assert(seedDefinitions.publicSeedReportPackageSummaries.find((item) => item.projectKey === "home-buyer-neighborhood-demo")?.packageKey.includes("seeded-analysis-dubai-hills-home-fit-report"), "Home-buyer seed package points at an unrelated report");
assert(seedDefinitions.publicSeedReportPackageSummaries.find((item) => item.projectKey === "family-relocation-area-demo")?.packageKey.includes("seeded-analysis-town-square-relocation-report"), "Family-relocation seed package points at an unrelated report");

console.log(JSON.stringify({
  ok: true,
  bytes,
  maximumBytes: projection.publicReportPackageListMaxBytes,
  summaryCount: payload.count,
  checked: [
    "no_full_items",
    "allowlisted_dashboard_summary",
    "no_dynamic_stored_state",
    "response_size_budget",
    "static_seed_cache_only",
    "private_dynamic_cache_policy",
    "explicit_evidence_lineage",
    "candidate_not_evidence",
    "fail_closed_report_selection",
    "compact_seed_fast_path",
    "five_project_seed_mapping",
    "server_evidence_attestation_required",
    "print_market_evidence_and_candidates"
  ]
}, null, 2));
