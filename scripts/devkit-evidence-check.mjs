import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url), ts = require("typescript");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    const local = specifier.startsWith("@/") ? pathToFileURL(path.join(root, specifier.slice(2))).href : specifier;
    if (!context.parentURL?.includes("/node_modules/") && (local.startsWith("file:") || local.startsWith("./") || local.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(local)) {
      try { return next(`${local}.ts`, context); } catch { return next(`${local}.tsx`, context); }
    }
    return next(local, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText };
    return next(url, context);
  }
});
const e = await import("../src/lib/devkit/evidence.ts"), r = await import("../src/lib/devkit/region-rules.ts");
const { createDevkitDemoProject } = await import("../src/lib/devkit/fixtures.ts");
const u4 = await import("../src/lib/prototype/point-to-object-u4-independent-context.ts");
const area = await import("../src/lib/prototype/point-to-object-area-source-context-v2.ts");
const { normalizePointObjectAreaContext: produceArea } = await import("../src/lib/prototype/point-to-object-area-context-contract.ts");
const hash = b => createHash("sha256").update(b).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value)), asOf = "2026-10-22T14:45:00.000Z";
const options = { asOf, intendedUse: "local_demo" };
const requestedStore = process.argv.find(a => a.startsWith("--store-module="))?.slice(15);
const storeFile = requestedStore ?? path.join(root, "src/lib/devkit/project-store.ts");
const storeBytes = existsSync(storeFile) ? readFileSync(storeFile) : null;
const projectStore = storeBytes ? await import(pathToFileURL(storeFile).href) : null;
const persistence = { status: "NOT_RUN", moduleSha256: storeBytes ? hash(storeBytes) : null, mode: "in_memory_storage_adapter_only" };
let checks = 0, networkCalls = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls++; throw new Error("Unexpected source network activation"); };
const subject = { id: "synthetic-aoi", kind: "aoi" };
const scope = { subject, kind: "radius", radiusM: 400, geometryHash: null, completeInventory: false };
function positiveCase() {
  return {
    version: e.DEVKIT_EVIDENCE_VERSION, id: "synthetic-evidence-positive", aoiId: subject.id, objects: [],
    sources: [{ id: "synthetic-source", label: "Synthetic author-owned test source", mode: "synthetic", url: null, version: "test-v1", snapshotHash: null,
      licence: { id: "synthetic-demo", url: null, fullTextPath: null, attribution: "GeoAI synthetic fixture", localUse: "allowed", derivativeUse: "allowed", redistribution: "allowed", conditions: ["Synthetic test data only."] } }],
    evidence: [{ id: "ev-1", subjectId: subject.id, label: "Synthetic mapped source record count", sourceId: "synthetic-source", sourceUrl: null, excerpt: "Synthetic count only; not a physical site observation.", acquiredAt: null, validAt: null, responseHash: null, trust: "synthetic", status: "available", rights: { licence: "synthetic-demo", attribution: "GeoAI synthetic fixture", permittedUse: "synthetic_demo", redistribution: "allowed" } }],
    claims: [{ id: "claim-1", subjectId: subject.id, field: "mapped_source_record_count", value: 0, unit: "source_records", status: "source_backed", evidenceIds: ["ev-1"], explanation: "Zero is an explicit synthetic source-record value; no physical absence conclusion." }], constraints: [],
    lineage: [{ evidenceId: "ev-1", sourceId: "synthetic-source", subject, scope, sourceRecordId: null, documentId: null, fragment: "synthetic-input", fetchedAt: null, observedAt: null, validFrom: null, validTo: null, providerUpdatedAt: null, cacheServedAt: null, normalization: { methodVersion: "synthetic-v1", inputHashes: [] }, limitations: ["Synthetic only."] }],
    claimBindings: [{ claimId: "claim-1", subject, scope, validFrom: null, validTo: null, derivedFromClaimIds: [], methodVersion: null }], constraintBindings: [], retainedSource: { synthetic: true }, limitations: ["Synthetic test, no live source or official conclusion."], caveat: e.DEVKIT_EVIDENCE_CAVEAT
  };
}
const outputs = {};
try {
  const positive = positiveCase(), before = JSON.stringify(positive), good = e.evaluateEvidenceCase(positive, options);
  check(good.valid && good.claims[0].usable && good.claims[0].value === 0 && good.decision === "screening_only", "Explicit zero source-record count can be used only in its exact synthetic scope");
  check(JSON.stringify(positive) === before && good.evidence[0].unknownObservation, "Evaluation is pure and observation null survives");
  check(e.serializeEvidenceCase(positive) === JSON.stringify(e.parseEvidenceCase(JSON.parse(e.serializeEvidenceCase(positive)))), "Complete module payload roundtrips without inventing timestamps");
  check(!e.evidenceScopeMatches(scope, { ...scope, radiusM: 800 }) && !e.evidenceScopeMatches(scope, { ...scope, completeInventory: true }), "400 m and partial inventory cannot establish 800 m or completeness");
  const sourceFailure = clone(positive);
  sourceFailure.evidence[0].status = "unavailable"; sourceFailure.evidence[0].trust = "unavailable";
  sourceFailure.claims[0].value = null; sourceFailure.claims[0].status = "unknown";
  sourceFailure.constraints.push({ id: "critical-gap", subjectId: subject.id, label: "Missing planning evidence", status: "unknown", severity: "critical", geometry: null, evidenceIds: ["ev-1"], impact: "Dependent decision on hold.", nextAction: "Obtain relevant official/client evidence." });
  sourceFailure.constraintBindings.push({ constraintId: "critical-gap", subject, confirmation: "unknown", claimIds: ["claim-1"], review: null });
  const failed = e.evaluateEvidenceCase(sourceFailure, options);
  check(failed.valid && failed.decision === "hold" && failed.claims[0].value === null && failed.claims[0].state === "unknown", "Source failure preserves null and blocks only the critical dependent decision");
  const conflict = clone(positive);
  conflict.claims.push({ ...clone(conflict.claims[0]), id: "claim-2", value: 3 });
  conflict.claimBindings.push({ ...clone(conflict.claimBindings[0]), claimId: "claim-2" });
  check(e.evaluateEvidenceCase(conflict, options).claims.every(c => c.state === "conflicting" && !c.usable), "Contradictory scoped source values survive without automatic newer-source selection");
  conflict.claimBindings[1].scope.radiusM = 800;
  check(e.evaluateEvidenceCase(conflict, options).claims.every(c => c.state !== "conflicting"), "Different context radii are different denominators");
  conflict.claimBindings[1].scope.radiusM = 400;
  conflict.claimBindings[0].validTo = "2026-10-21T00:00:00Z"; conflict.claimBindings[1].validFrom = "2026-10-21T00:00:00Z";
  check(e.evaluateEvidenceCase(conflict, options).claims.every(c => c.state !== "conflicting"), "Nonoverlapping half-open effective intervals do not manufacture a simultaneous conflict");
  const stale = clone(positive);
  stale.evidence[0].acquiredAt = asOf; stale.lineage[0].fetchedAt = asOf;
  stale.lineage[0].observedAt = "2020-01-01T00:00:00Z"; stale.lineage[0].providerUpdatedAt = asOf; stale.lineage[0].cacheServedAt = asOf;
  check(e.evaluateEvidenceCase(stale, { ...options, maxObservationAgeDays: { mapped_source_record_count: 30 } }).claims[0].state === "stale", "Fresh fetch/provider/cache time cannot make an old observation fresh");
  stale.lineage[0].observedAt = null;
  check(e.evaluateEvidenceCase(stale, { ...options, maxObservationAgeDays: { mapped_source_record_count: 30 } }).claims[0].reasons.includes("observation_date_unknown"), "Freshness policy fails closed when actual observation time is unknown");
  const rights = clone(positive); rights.sources[0].licence.redistribution = "unknown";
  check(e.evaluateEvidenceCase(rights, options).claims[0].usable && !e.evaluateEvidenceCase(rights, { ...options, intendedUse: "export" }).claims[0].usable, "Local permitted use does not invent redistribution permission");
  rights.evidence[0].rights.licence = null;
  check(!e.parseEvidenceCase(rights), "A source licence cannot silently substitute for a mismatched evidence licence");
  const generated = clone(positive); generated.evidence[0].trust = "generated";
  check(!e.evaluateEvidenceCase(generated, options).claims[0].usable, "A generated interpretation is not an original source fact");
  const badScope = clone(positive); badScope.claimBindings[0].scope.radiusM = 800;
  check(e.evaluateEvidenceCase(badScope, options).claims[0].reasons.includes("evidence_scope_mismatch"), "Claim cannot borrow evidence from a different radius");
  const substitution = clone(positive); substitution.objects.push({ id: "parcel-1", kind: "land_parcel", label: "Synthetic parcel", sourceFeatureId: null, geometry: null, crs: "EPSG:4326", trust: "synthetic", evidenceIds: [] });
  substitution.claims[0].subjectId = "parcel-1"; substitution.claimBindings[0].subject = { id: "parcel-1", kind: "land_parcel" }; substitution.claimBindings[0].scope.subject = substitution.claimBindings[0].subject;
  check(!e.evaluateEvidenceCase(substitution, options).claims[0].usable, "AOI evidence cannot establish a different parcel claim");
  for (const mutate of [c => c.version = "old", c => c.lineage = [], c => c.claimBindings[0].subject.kind = "poi", c => c.aoiId = null, c => c.claims[0].value = Number.NaN, c => c.retainedSource.bad = Infinity, c => c.lineage[0].observedAt = "invalid", c => c.lineage[0].fetchedAt = asOf, c => c.sources.push(clone(c.sources[0]))]) {
    const bad = clone(positive); mutate(bad); check(e.parseEvidenceCase(bad) === null, "Invalid/old/missing-provenance/non-JSON input is rejected without lossy repair");
  }
  const cycle = clone(positive); cycle.claims[0].status = "derived"; cycle.claimBindings[0].derivedFromClaimIds = ["claim-1"]; cycle.claimBindings[0].methodVersion = "cycle-v1";
  check(e.parseEvidenceCase(cycle) === null && !e.evaluateEvidenceCase(cycle, options).valid, "Derived claim cycles cannot pass provenance validation");
  const constraint = clone(sourceFailure); constraint.evidence[0] = clone(positive.evidence[0]); constraint.claims[0] = clone(positive.claims[0]); constraint.constraints[0].status = "source_backed"; constraint.constraintBindings[0].confirmation = "confirmed";
  check(!e.parseEvidenceCase(constraint), "Source-backed provenance alone cannot assert reviewer confirmation");
  constraint.constraintBindings[0].review = { reviewer: "synthetic-reviewer", reviewedAt: "2027-01-01T00:00:00Z", basis: "Synthetic review only." };
  check(e.evaluateEvidenceCase(constraint, options).constraints[0].blocksDecision, "A future review cannot confirm a current decision");
  const rawBytes = readFileSync(path.join(root, "src/data/prototype/d2-overture-u4-places.json"));
  const licenseBytes = readFileSync(path.join(root, "public/data/d2-overture-u4/LICENSES.json"));
  check(hash(rawBytes) === u4.U4_SOURCE_HASH && hash(licenseBytes) === "3616d986fa3fac4780ab13742547010c72a90d8f5cd80a1f7c32292f0c98b6ea", "Actual source and full licence bytes match the pre-existing admitted package");
  const binding = { aoiId: u4.U4_SOURCE_ID, origin: "mapped_osm_polygon", sourceFeatureId: u4.U4_SOURCE_ID, sourceVersion: 1, geometry: clone(u4.U4_GEOMETRY), anchor: clone(u4.U4_ANCHOR), radiusM: 400 };
  const sourceInput = { subjectId: binding.sourceFeatureId, sourceVersion: 1, geometry: binding.geometry, anchor: binding.anchor, radiusM: 400 };
  const prior = u4.buildU4IndependentContext(JSON.parse(rawBytes), sourceInput, asOf);
  const priorArea = area.buildAreaSourceContextV2(binding, null, prior);
  const actual = e.adaptAreaSourceContext(binding, null, priorArea), actualEvaluation = e.evaluateEvidenceCase(actual, options);
  check(actual && actualEvaluation.valid && actual.claims[0].value === 24 && actual.objects.every(o => o.kind === "poi"), "Existing admitted24 maps to separate source-backed POIs, never parcel/building substitutes");
  check(actual.objects.every(o => actual.lineage.find(l => l.evidenceId === o.evidenceIds[0])?.sourceRecordId === o.sourceFeatureId), "Every POI retains its own original record evidence and provider lineage");
  check(actual.lineage.every(l => l.observedAt === null) && actual.lineage[0].fetchedAt === prior.fetchedAt && actual.lineage[0].cacheServedAt === asOf, "FetchedAt, observation and cache time remain separate actual source facts");
  check(actual.retainedSource.osmInterior.sampleSize === null && actual.retainedSource.osmInterior.status === "source_error_not_empty" && actual.claims[1].value === null && actualEvaluation.decision === "hold", "Historical OSM failure and 800 m unknown remain visible alongside positive400m source records");
  check(e.parseEvidenceCase(JSON.parse(e.serializeEvidenceCase(actual))), "Full dated source case survives strict serialized reopen");
  for (const mutate of [b => b.sourceVersion = 2, b => b.sourceFeatureId = "way/254666300", b => b.radiusM = 800, b => b.geometry.coordinates[0][0][0] += 0.00001]) {
    const wrong = clone(binding); mutate(wrong); check(e.adaptAreaSourceContext(wrong, null, priorArea) === null, "Changed native source/version/radius/geometry cannot borrow an admitted case");
  }
  if (projectStore) {
    const { calculatePolygonMeasurements } = await import("../src/lib/polygon-aoi.ts");
    const measurements = calculatePolygonMeasurements(binding.geometry.coordinates[0]);
    const targetAoi = { id: "create-aoi-u4-public-context", revision: 1, crs: "EPSG:4326", provenance: "user_provided", coordinates: clone(binding.geometry.coordinates), vertexCount: binding.geometry.coordinates[0].length - 1, areaSqM: measurements.areaSqM, perimeterM: measurements.perimeterM };
    const linkedCase = e.adaptAreaSourceContext(binding, null, priorArea, targetAoi);
    const linkedProject = { ...createDevkitDemoProject("devkit-u4-source-context-qa"), aoi: targetAoi, dataClass: "public_demo", ...e.foundationRecordsForEvidenceCase(linkedCase), scenarios: [], designVersions: [], activeDesignVersionId: null };
    linkedProject.brief.title = "Public U4 source-context preservation QA only";
    check(projectStore.parseDevkitProject(linkedProject) && e.restoreEvidenceCaseFromProject(linkedProject, linkedCase.id), "Native mapped source ID stays separate from a valid internal AOI through actual foundation project parsing");
    const movedTarget = clone(targetAoi); movedTarget.coordinates[0][0][0] += 0.001;
    check(e.adaptAreaSourceContext(binding, null, priorArea, movedTarget) === null, "Internal AOI mapping cannot borrow another geometry");
    outputs["u4-project-source-preservation-qa.json"] = linkedProject;
  }
  const unavailablePrior = u4.buildU4IndependentContext(null, sourceInput, asOf);
  const unavailableCase = e.adaptAreaSourceContext(binding, null, area.buildAreaSourceContextV2(binding, null, unavailablePrior));
  check(unavailableCase.claims[0].value === null && !unavailableCase.objects.length && !e.evaluateEvidenceCase(unavailableCase, options).claims[0].usable, "Missing snapshot is unavailable/null, never zero or a fallback POI");
  const project = createDevkitDemoProject(), aoi = project.aoi;
  const center = aoi.coordinates[0][0].map((_, i) => (aoi.coordinates[0][0][i] + aoi.coordinates[0][2][i]) / 2);
  const held = produceArea({ elements: [{ type: "node", id: 123, lon: center[0], lat: center[1], tags: { name: "Synthetic interior context", amenity: "cafe" } }] }, { marketKey: "dubai", locale: "en", aoiCoordinates: clone(aoi.coordinates) });
  held.source.acquiredAt = "2026-10-20T10:00:00Z"; held.source.observedAt = null;
  const used = { sourceResponseHash: held.source.sourceResponseHash, sampleSize: held.summary.sampleSize, mappedBuildingCount: held.summary.mappedBuildingCount, capReached: held.coverage.capReached, inclusionMethod: "returned_center_inside_aoi", completeInventory: false };
  const mapped = e.mapExistingAreaContext(project, aoi, held, { areaContextUsed: used });
  check(mapped.status === "retained_context" && mapped.sourceUse === "matched_receipt" && !mapped.objects.length && e.parseEvidenceCase(mapped.evidenceCase), "Saved AOI bridge validates exact context and generation receipt without inventing entities");
  const persistedRecords = e.foundationRecordsForEvidenceCase(mapped.evidenceCase);
  const projectRoundtrip = clone({ ...project, ...persistedRecords });
  const restored = e.restoreEvidenceCaseFromProject(projectRoundtrip, mapped.evidenceCase.id);
  check(restored && JSON.stringify(restored.lineage) === JSON.stringify(mapped.evidenceCase.lineage) && JSON.stringify(restored.retainedSource) === JSON.stringify(mapped.evidenceCase.retainedSource), "Foundation1.1 evidence provenance/claim scope retain full source on project JSON reopen");
  if (projectStore) {
    const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
    const localProject = { ...projectRoundtrip, designVersions: [], activeDesignVersionId: null };
    const store = projectStore.createDevkitProjectStore(storage, "evidence-module-check");
    const saved = store.save(localProject, null); check(saved.ok, "Actual foundation store accepts source provenance/scope without design-seed assumptions");
    const reopened = projectStore.createDevkitProjectStore(storage, "evidence-module-check").get(localProject.id);
    check(reopened.ok && reopened.value && e.restoreEvidenceCaseFromProject(reopened.value, mapped.evidenceCase.id), "New foundation store instance reopens complete retained evidence");
    const exported = store.exportProject(localProject.id), destination = projectStore.createDevkitProjectStore({ getItem: () => null, setItem: () => {} }, "evidence-import-check");
    const imported = exported.ok ? destination.importProject(exported.value) : null;
    check(imported?.ok && JSON.stringify(imported.value.evidence[0].provenance) === JSON.stringify(saved.value.evidence[0].provenance), "Actual foundation export/import preserves provenance without a fresh source/model operation");
    persistence.status = "PASS";
  }
  const noScope = clone(projectRoundtrip); delete noScope.claims[0].scope;
  const noProvenance = clone(projectRoundtrip); delete noProvenance.evidence[0].provenance;
  check(!e.restoreEvidenceCaseFromProject(noScope, mapped.evidenceCase.id) && !e.restoreEvidenceCaseFromProject(noProvenance, mapped.evidenceCase.id), "Reopen never silently reconstructs dropped scope or provenance");
  const changedAoi = clone(projectRoundtrip); changedAoi.aoi.revision++;
  check(!e.restoreEvidenceCaseFromProject(changedAoi, mapped.evidenceCase.id), "A changed AOI revision cannot reuse current evidence scope");
  const forgedRetained = clone(actual); forgedRetained.retainedSource.independentContext.places[0].name = "Changed record";
  check(!e.parseEvidenceCase(forgedRetained), "Edited original admitted source facts fail strict source-consistency reopen");
  check(e.evaluateEvidenceCase(actual, { ...options, intendedUse: "export" }).rightsIssues.some(i => i.sourceId.startsWith("osm-geometry:")), "Places licence does not silently clear separate geometry/combined-export rights");
  check(mapped.evidence[0].acquiredAt === held.source.acquiredAt && mapped.evidenceCase.lineage[0].observedAt === null && mapped.evidenceCase.retainedSource.context.source.sourceResponseHash === held.source.sourceResponseHash, "Bridge retains actual source times/hash and original payload");
  check(e.mapExistingAreaContext(project, aoi, held).sourceUse === "unknown" && e.mapExistingAreaContext(project, aoi, held, { areaContextUsed: null }).sourceUse === "not_used" && e.mapExistingAreaContext(project, aoi, held, { areaContextUsed: { ...used, sourceResponseHash: "a".repeat(64) } }).sourceUse === "mismatch", "Omitted/null/wrong old generation receipt never becomes a fresh source-backed generation");
  check(e.mapExistingAreaContext(project, { ...aoi, coordinates: [[[55.27,25.2],[55.273,25.2],[55.273,25.202],[55.27,25.202],[55.27,25.2]]] }, held).status !== "retained_context" && e.mapExistingAreaContext(project, aoi, null).status === "source_missing", "Wrong geometry or absent source cannot borrow a previous case");
  const regionalSynthetic = { schema_version: "geoai.region-procedures/0.1", package_version: "synthetic-v1", status: "SYNTHETIC", jurisdiction: "AE-DU", caveat: e.DEVKIT_EVIDENCE_CAVEAT,
    sources: [{ source_id: "S1", url: "https://dda.gov.ae/", observed_date: "2026-10-22", verification: "FULL_PUBLIC_TEXT_READ", service_execution: "NOT_TESTED", rights_basis: "Public accessibility is not a licence" }],
    procedures: [{ procedure_id: "test-procedure", name: "Synthetic procedure", jurisdiction: "AE-DU", authority: "DDA", source_ids: ["S1"], source_urls: ["https://dda.gov.ae/"], form: { code: "TEST", issue: "1" }, applicant: ["Authorised owner"], rights: { ai_processing: "NOT_ESTABLISHED" }, access: { api_tested: false, service_execution: "NOT_TESTED" }, date: { checked_on: "2026-10-22", effective_from: null }, unknown: ["Plot authority unknown"], manual_step: "Authorised local reviewer required" }] };
  const parsedRegional = r.parseRegionalRulePack(regionalSynthetic);
  check(parsedRegional.ok && parsedRegional.value.sources[0].observedAt === null && parsedRegional.value.sources[0].fetchedAt === null && parsedRegional.value.sources[0].serviceTested === false, "Website-read date remains a documentary check, never observation/API/service verification");
  check(r.assessRegionalRuleApplicability(parsedRegional.value.rules[0], { jurisdiction: "AE-DU", authority: null, plotIdentityConfirmed: false, authorityConflict: true }).state === "hold_dependent_decision" && r.regionalProceduresForProject(parsedRegional.value)[0].status === "review_required", "Unresolved regional authority retains a usable draft checklist and holds its dependent decision");
  for (const mutate of [p => p.schema_version = "unknown", p => p.procedures[0].source_ids = ["missing"], p => p.sources[0].url = "https://user:pass@example.com/", p => p.procedures[0].jurisdiction = "RU-MOW"]) {
    const bad = clone(regionalSynthetic); mutate(bad); check(!r.parseRegionalRulePack(bad).ok, "Unsupported schema, absent source, credential URL and jurisdiction mismatch fail closed");
  }
  const regionalDir = process.argv.find(a => a.startsWith("--regional-dir="))?.slice(15);
  const regionalReports = [];
  if (regionalDir) for (const [region, registry] of [["uae_1", null], ["moscow_1", "source-verifications.json"]]) {
    const file = path.join(regionalDir, region, "region-procedures.json"), bytes = readFileSync(file), input = JSON.parse(bytes);
    const sourceRegistry = registry ? JSON.parse(readFileSync(path.join(regionalDir, region, registry))) : undefined;
    const result = r.parseRegionalRulePack(input, sourceRegistry);
    check(result.ok, `Actual ${region} published researcher schema is accepted: ${result.ok ? "" : result.message}`);
    const regionalRecords = r.regionalRecordsForProject(result.value, { id: "synthetic-aoi", kind: "aoi" });
    if (projectStore) {
      const regionalProject = createDevkitDemoProject(`devkit-${region}-metadata-qa`);
      const records = r.regionalRecordsForProject(result.value, { id: regionalProject.aoi.id, kind: "aoi" });
      regionalProject.evidence.push(...records.evidence); regionalProject.procedures = records.procedures;
      regionalProject.designVersions = []; regionalProject.activeDesignVersionId = null;
      check(projectStore.parseDevkitProject(regionalProject), `${region} full reference metadata fits the actual foundation contract/store validators`);
    }
    check(regionalRecords.evidence.length === result.value.rules.length && regionalRecords.evidence.every(ev => ev.provenance?.rule && ev.rights.permittedUse === "unknown") && regionalRecords.procedures.every(p => p.status === "review_required"), `${region} project metadata preserves version/rights without creating site constraints`);
    check(result.value.rules.every(rule => rule.confirmation === "review_required" && rule.serviceStatus === "documented_not_executed"), `${region} documentary research never becomes executed/approved service`);
    regionalReports.push({ region, sha256: hash(bytes), schema: input.schema_version, packageVersion: input.package_version, rules: result.value.rules.length, sources: result.value.sources.length });
    outputs[`${region}-normalized.json`] = result.value;
  }
  if (storeBytes) check(hash(readFileSync(storeFile)) === hash(storeBytes), "Foundation store source stayed unchanged throughout this cross-module check");
  check(networkCalls === 0, "All actual source/bridge/region checks perform zero source or provider network calls");
  outputs["synthetic-positive-case.json"] = positive; outputs["synthetic-critical-gap-case.json"] = sourceFailure;
  outputs["u4-retained-source-case.json"] = actual; outputs["retained-aoi-context-case.json"] = mapped.evidenceCase;
  const result = { status: "PASS", checks, node: process.version, typescript: ts.version, networkCalls,
    actualSourceHash: u4.U4_SOURCE_HASH, licenceHash: hash(licenseBytes), regionalReports, persistence,
    scope: "module provenance, source failure, claim scope/conflict/staleness, exact existing source binding, saved AOI bridge and regional metadata",
    notQualified: ["independent QA", "browser/layout/usefulness", "hosted persistence", "CI/build/Preview", "new model acceptance", "official/legal/planning/valuation conclusion"] };
  const outDir = process.argv.find(a => a.startsWith("--out-dir="))?.slice(10);
  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    for (const [name, value] of Object.entries(outputs)) writeFileSync(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
    writeFileSync(path.join(outDir, "LICENSES-U4.json"), licenseBytes);
    writeFileSync(path.join(outDir, "test-results.json"), `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify(result));
} finally { globalThis.fetch = originalFetch; }
