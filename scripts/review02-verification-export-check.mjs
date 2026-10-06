import { readFileSync } from "node:fs";

// Reuse only the established synthetic fixture/loader setup, not its full
// regression matrix. No source/provider/HTTP calls, saved writes or paid tests.
const owner = new URL("./review02-create-source-binding-check.mjs", import.meta.url);
const root = new URL("../", import.meta.url);
const fixture = readFileSync(owner, "utf8").split("  async function roundTrip(")[0]
  .replace('const root = new URL("../", import.meta.url);', `const root = new URL(${JSON.stringify(root.href)});`);
const checks = String.raw`
  browserImportGuardActive = true;
  const exp = await import(new URL("src/lib/prototype/point-to-object-verification-export.ts", root).href);
  browserImportGuardActive = false;
  const f = await import(new URL("tests/e2e/helpers/sprint10-analysis-fixture.ts", root).href);
  const norms = await import(new URL("src/lib/prototype/point-to-object-normalized-context.ts", root).href);
  const lease = f.sprint10PublicEvidenceReceipt("way/91010");
  const context = { ...f.sprint10Selection.resolvedObject, evidenceReceipt: lease };
  context.normalizedContext = norms.normalizedResolvedContext(context, [55.27, 25.2]);
  const contextIntent = { caseKey: "dubai", locale: "en", longitude: 55.27000009, latitude: 25.20000009, expectedSourceFeatureId: "way/91010" };
  const response = { mode: "resolved", schemaVersion: 2, subject: context, evidenceReceipt: lease };
  const analysisIntent = { caseKey: "dubai", longitude: 55.27, latitude: 25.2, locale: "en", role: "developer", scenario: "b2b_redevelopment_selected_aoi", question: null, depth: "standard", goal: "development_screening", perspective: "developer", horizon: "current", expectedSourceFeatureId: "way/91010", evidenceReceipt: lease, consent: true };
  const analysis = f.sprint10AnalysisResponse({ locale: "en", role: analysisIntent.role, scenario: analysisIntent.scenario, question: null, depth: "standard", goal: "development_screening", perspective: "developer", horizon: "current" }, 1, lease.evidencePackHash);
  const aoiHash = await exp.verificationSha256(JSON.stringify(coordinates));
  const boundAlternatives = create.generateConceptMassingAlternatives(coordinates, program, core.createProgramSeed(program, aoiHash), "en");
  const concept = { ...generated, massing: boundAlternatives[0].massing, alternatives: boundAlternatives, areaContextUsed: receipt };
  const createIntent = { marketKey: "dubai", locale: "en", depth: "standard", templateId: "residential_mixed_use", customPrompt: null, controls: { massingStyle: program.massingStyle, blockCount: program.blockCount, levelsMin: program.levelsMin, levelsMax: program.levelsMax, targetSiteCoveragePct: program.targetSiteCoveragePct, openSpacePct: program.openSpacePct, setbackM: program.setbackM }, lockedControlKeys: [], aoiCoordinates: coordinates };
  const findRequest = { marketKey: "dubai", locale: "en", group: "residential", bounds: [55.28,25.21,55.29,25.22], mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 };
  const findContract = await import(new URL("src/lib/prototype/point-to-object-find-contract.ts", root).href);
  const normalizedFind = findContract.normalizePointObjectFindCandidates({ elements: [{ type: "way", id: 1, center: { lon: 55.281, lat: 25.218 }, tags: { building: "apartments" } }] }, findRequest);
  const find = { protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results", criteria: findRequest, candidates: normalizedFind.candidates, ordering: "source_identity_ascending_not_ranked", coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 1, upstreamElementCount: 1, normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" }, source: { ...area.source, freshness: "runtime_response_feature_time_unavailable", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html" }, limitations: [], caveat: exp.VERIFICATION_CAVEAT };
  const secondLease = { ...lease, lookupSourceFeatureId: "way/91011", evidencePackHash: "c".repeat(64) };
  const secondContext = { ...context, sourceFeatureId: "way/91011", evidenceReceipt: secondLease, normalizedContext: { ...context.normalizedContext, subjectId: "way/91011" } };
  const comparison = [{ longitude: 55.27, latitude: 25.2, expectedSourceFeatureId: "way/91010", evidenceReceipt: lease }, { longitude: 55.271, latitude: 25.201, expectedSourceFeatureId: "way/91011", evidenceReceipt: secondLease }];
  const compareIntent = { ...analysisIntent, comparison };
  const refs = ["way/91010:identity", "way/91011:identity"];
  const compare = { mode: "openai_comparison", version: "POINT_OBJECT_COMPARISON_V1", generatedAt: stamp, locale: "en", role: analysisIntent.role, scenario: analysisIntent.scenario, snapshots: comparison.map(c => ({ sourceFeatureId: c.expectedSourceFeatureId, evidencePackHash: c.evidenceReceipt.evidencePackHash, label: context.name })), summary: { statement: "Both mapped records require official validation.", evidenceRefs: refs }, differences: [{ statement: "Mapped context remains bounded for both records.", evidenceRefs: refs }, { statement: "Official controls are absent for both records.", evidenceRefs: refs }], checks: comparison.map(c => ({ candidateId: c.expectedSourceFeatureId, action: "Obtain the official planning record.", evidenceRefs: [c.expectedSourceFeatureId + ":identity"] })), caveat: exp.VERIFICATION_CAVEAT, telemetry: { provider: "openai", model: "fixture-only", requestId: null, latencyMs: 1, attempts: 1, inputTokens: null, outputTokens: null, totalTokens: null, stored: false, toolCalls: 0 } };
  const record = (operation, intent, sourceSnapshot, response) => ({ operation, originalSubmissionIntent: intent, sourceSnapshot, response, submittedAt: stamp, completedAt: stamp });
  const records = [record("context", contextIntent, {}, response), record("find", findRequest, {}, find), record("area-context", area.request, { aoi }, area), record("analyse", analysisIntent, { context }, analysis), record("compare", compareIntent, { contexts: [context, secondContext] }, compare), record("create", createIntent, { aoi, areaContext: area }, concept)];
  const input = { records, preSubmit: { operation: "create", intent: createIntent, sourceSnapshot: { aoi, areaContext: area } }, currentSelection: { mode: "analyse", sourceFeatureId: "way/99999" } };
  for (const item of records) {
    try { await exp.createVerificationBundle(true, { ...input, records: [item] }); }
    catch (error) { throw new Error(item.operation + ": " + error.message); }
  }
  const output = JSON.parse(await exp.createVerificationBundle(true, input));
  equal(output.records.length, 6, "all six operations preserved");
  for (let i = 0; i < records.length; i++) {
    equal(output.records[i].response, JSON.parse(JSON.stringify(records[i].response)), records[i].operation + ": exact public response field names/data preserved");
    equal(output.records[i].payloadSha256, await exp.verificationSha256(exp.canonicalVerificationIntent(records[i].operation, records[i].originalSubmissionIntent)), "canonical local intent SHA");
  }
  equal(output.records[3].response.telemetry, analysis.telemetry, "full telemetry and attempt trace preserved");
  equal(output.records[4].response.telemetry.requestId, null, "missing settlement values remain null");
  equal(output.currentSelection.sourceFeatureId, "way/99999", "later current selection separately labelled, not attached to original response");
  const snapshot = exp.snapshotVerificationSubmission("create", createIntent, { aoi, areaContext: area });
  const unchanged = JSON.stringify(snapshot); const mutable = structuredClone(createIntent);
  exp.snapshotVerificationSubmission("create", mutable, { aoi, areaContext: area }); mutable.controls.blockCount = 77;
  equal(JSON.stringify(snapshot), unchanged, "submission/source frozen before dispatch");
  async function refused(input, pattern, name) { await assert.rejects(() => exp.createVerificationBundle(true, input), pattern, name); checks++; }
  await assert.rejects(() => exp.createVerificationBundle(false, input), /PREVIEW_ONLY/); checks++;
  for (const key of ["headers", "cookie", "challenge", "auth", "cloud", "private", "account", "stack", "unknown"]) {
    await refused({ ...input, records: [record("context", contextIntent, {}, { ...response, [key]: "must not leave UI" })] }, /UNKNOWN_FIELD/, "unknown/credential field " + key);
  }
  for (const value of ["Bearer secretcredential000", "https://user:pass@example.test/x", "https://example.test/?access_token=secret", "https://example.test/?key=secret", "https://example.test/?token=secret", "https://example.test/?api_key=secret"]) {
    await refused({ ...input, records: [record("create", { ...createIntent, customPrompt: value }, { aoi, areaContext: area }, concept)] }, /VALUE_REFUSED/, "credential URL/string refused");
  }
  await refused({ ...input, records: [record("context", contextIntent, {}, { ...response, evidenceReceipt: { ...lease, lookupSourceFeatureId: null } })] }, /CORRESPONDENCE/, "top/nested lease mismatch");
  await refused({ ...input, records: [record("context", { ...contextIntent, expectedSourceFeatureId: "way/99999" }, {}, response)] }, /CORRESPONDENCE/, "original identity mismatch");
  await refused({ ...input, records: [record("analyse", analysisIntent, { context: { ...context, evidenceReceipt: secondLease } }, analysis)] }, /CORRESPONDENCE/, "AI/source lease drift");
  for (const key of Object.keys(receipt)) {
    const changed = { ...receipt, [key]: typeof receipt[key] === "number" ? receipt[key] + 1 : typeof receipt[key] === "boolean" ? !receipt[key] : key === "sourceResponseHash" ? "f".repeat(64) : "incorrect" };
    await refused({ ...input, records: [record("create", createIntent, { aoi, areaContext: area }, { ...concept, areaContextUsed: changed })] }, /RESPONSE|CORRESPONDENCE/, "Create full receipt parity " + key);
  }
  await refused({ ...input, records: [record("create", createIntent, { aoi, areaContext: makeArea(4,"ru") }, concept)] }, /CORRESPONDENCE/, "Create source locale drift");
  const { areaContextUsed: omitted, ...legacy } = concept;
  await refused({ ...input, records: [record("create", createIntent, { aoi, areaContext: area }, legacy)] }, /LEGACY/, "no invented legacy request provenance");
  await refused({ ...input, records: [record("context", contextIntent, {}, { mode: "resolved", schemaVersion: 2, subject: { sourceFeatureId: "way/91010" } })] }, /RESPONSE/, "incomplete public contract");
  await refused({ ...input, records: [record("create", createIntent, { aoi, areaContext: area }, { ...concept, massing: { ...concept.massing, seed: "unbound" } })] }, /SEED_AOI/, "seed/AOI binding");
  await refused({ ...input, records: [record("context", contextIntent, {}, { ...response, subject: { ...context, name: "界".repeat(800000) } })] }, /SIZE/, "UTF-8 response cap refuses, never truncates");
  await refused({ ...input, records: [], preSubmit: { operation: "create", intent: { ...createIntent, customPrompt: "x".repeat(2*1024*1024) }, sourceSnapshot: { aoi } } }, /SIZE/, "intent cap");
  const boundedIntent = { ...createIntent, customPrompt: "x".repeat(1500000) };
  await refused({ ...input, records: [record("create", boundedIntent, { aoi, areaContext: area }, concept), record("create", boundedIntent, { aoi, areaContext: area }, concept)], preSubmit: { operation: "create", intent: boundedIntent, sourceSnapshot: { aoi, areaContext: area } } }, /SIZE/, "whole bundle cap");
  await refused({ records: [], preSubmit: null, currentSelection: null }, /LEGACY_OR_EMPTY/, "old saved state without original handler evidence");
  equal(networkCalls, 0, "zero extra source/provider calls");
  console.log(JSON.stringify({ status: "PASS", checks, operations: 6, providerCalls: 0, sourceCalls: 0, savedWrites: 0, clientServerImportGuard: "PASS" }));
} finally { globalThis.fetch = originalFetch; }
`;
try { await import(`data:text/javascript;base64,${Buffer.from(fixture + checks).toString("base64")}`); }
catch (error) { console.error(error.message); process.exitCode = 1; }
