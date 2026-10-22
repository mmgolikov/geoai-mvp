import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url), ts = require("typescript");
const capacityCheckout = process.argv.find(a => a.startsWith("--capacity-checkout="))?.slice(20);
const displayOnly = process.argv.includes("--display-only");
const displayCheckout = process.argv.find(a => a.startsWith("--display-checkout="))?.slice(19);
const readonlyCheckout = capacityCheckout ?? displayCheckout;
registerHooks({
  resolve(specifier, context, next) {
    if (displayOnly && specifier === "./find-project-panel" && context.parentURL?.endsWith("/components/devkit/evidence-stage.tsx")) return { url: "data:text/javascript,export%20function%20DevkitFindProjectPanel()%7Breturn%20null%7D", shortCircuit: true };
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    const aliasRoot = readonlyCheckout && context.parentURL?.startsWith(pathToFileURL(path.resolve(readonlyCheckout) + path.sep).href) ? path.resolve(readonlyCheckout) : root;
    const local = specifier.startsWith("@/") ? pathToFileURL(path.join(aliasRoot, specifier.slice(2))).href : specifier;
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
const staticFile = path.join(root, "src/lib/devkit/region-data.ts");
const staticData = existsSync(staticFile) ? await import(pathToFileURL(staticFile).href) : null;
const staticRegionalData = { status: "NOT_RUN", regions: [] };
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
async function checkRegionalStoreCapacity(checkout) {
  const target = path.resolve(checkout), file = relative => path.join(target, relative);
  const watched = ["src/lib/devkit/contracts.ts", "src/lib/devkit/project-store.ts", "src/lib/devkit/fixtures.ts", "src/lib/devkit/region-rules.ts", "src/lib/devkit/region-data.ts", "components/devkit/evidence-stage.tsx"];
  const sourceHashes = watched.map(relative => ({ path: relative, sha256: hash(readFileSync(file(relative))) }));
  const headBefore = execFileSync("git", ["rev-parse", "HEAD"], { cwd: target, encoding: "utf8" }).trim();
  const targetStore = await import(pathToFileURL(file("src/lib/devkit/project-store.ts")).href);
  const targetFixtures = await import(pathToFileURL(file("src/lib/devkit/fixtures.ts")).href);
  const targetRules = await import(pathToFileURL(file("src/lib/devkit/region-rules.ts")).href);
  const targetData = await import(pathToFileURL(file("src/lib/devkit/region-data.ts")).href);
  const { validatePointObjectCreateAoiVertices } = await import(pathToFileURL(file("src/lib/prototype/point-to-object-create.ts")).href);
  const bytes = value => Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value));
  let capacityChecks = 0;
  const must = (value, message) => { assert.ok(value, message); capacityChecks++; };
  const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const scopeId = "regional-full-payload-check", store = targetStore.createDevkitProjectStore(storage, scopeId), cases = [];
  const mainRaw = () => [...memory.entries()].find(([key]) => !key.endsWith(":previous"))?.[1] ?? "";
  const sourceCases = [
    { id: "dubai-all20", market: "dubai", expected: 20 },
    { id: "moscow-all10", market: "moscow", expected: 10 }
  ];
  const publicCaseFile = process.argv.find(a => a.startsWith("--public-case="))?.slice(14);
  if (publicCaseFile) sourceCases.push({ id: "dubai-public-u4-all20", market: "dubai", expected: 20, publicCaseFile });
  for (const spec of sourceCases) {
    let base = spec.publicCaseFile ? JSON.parse(readFileSync(spec.publicCaseFile, "utf8")) : targetFixtures.createDevkitDemoProject(`regional-capacity-${spec.id}`);
    base.id = `regional-capacity-${spec.id}`;
    if (spec.market === "moscow") {
      const ring = [[37.60,55.74],[37.602,55.74],[37.602,55.742],[37.60,55.742]];
      const measured = validatePointObjectCreateAoiVertices(ring); must(measured.ok, "Synthetic Moscow source-capacity AOI is valid; no real parcel is asserted");
      base.aoi = { ...base.aoi, coordinates: [[...ring, ring[0]]], areaSqM: measured.measurements.areaSqM, perimeterM: measured.measurements.perimeterM, vertexCount: 4, provenance: "synthetic" };
      base.brief.marketKey = "moscow"; base.brief.budget.currency = "RUB";
      base.brief.title = "Synthetic Moscow regional metadata capacity check";
    }
    must(targetStore.parseDevkitProject(base), `${spec.id}: actual baseline project passes target parser without stripping its existing design seed/history`);
    const firstSave = store.save(base, null); must(firstSave.ok, `${spec.id}: baseline actual store save`);
    const originalFacts = JSON.stringify([firstSave.value.aoi, firstSave.value.objects, firstSave.value.claims, firstSave.value.constraints]);
    const pack = targetData.getDevkitRegionalPack(spec.market); must(pack && pack.rules.length === spec.expected, `${spec.id}: complete selected researcher package`);
    const records = targetRules.regionalRecordsForProject(pack, { id: base.aoi.id, kind: "aoi" });
    must(records.evidence.length === spec.expected && records.procedures.length === spec.expected, `${spec.id}: no source/procedure truncation`);
    const attach = project => {
      // Same composition as the inspected EvidenceStage handler; this does not render or click UI.
      const mergedEvidence = [...project.evidence.filter(item => !records.evidence.some(next => next.id === item.id)), ...clone(records.evidence)];
      const next = targetStore.reviseDevkitInputs(project, { evidence: mergedEvidence });
      next.procedures = [...project.procedures.filter(item => !records.procedures.some(p => p.id === item.id)), ...clone(records.procedures)];
      return next;
    };
    const attached = attach(firstSave.value);
    must(attached.inputRevision === firstSave.value.inputRevision + 1 && JSON.stringify([attached.aoi, attached.objects, attached.claims, attached.constraints]) === originalFacts, `${spec.id}: references do not invent parcel/property claims or constraints`);
    must(attached.designVersions.length === firstSave.value.designVersions.length && JSON.stringify(attached.designVersions) === JSON.stringify(firstSave.value.designVersions), `${spec.id}: existing designs/history preserved`);
    must(targetStore.parseDevkitProject(attached), `${spec.id}: complete attached project parses`);
    must(bytes(attached) < targetStore.DEVKIT_MAX_PROJECT_BYTES, `${spec.id}: complete project fits768KiB`);
    const saved = store.save(attached, firstSave.value.revision); must(saved.ok, `${spec.id}: complete attached project saves without silent truncation`);
    const reopened = targetStore.createDevkitProjectStore(storage, scopeId).get(saved.value.id);
    must(reopened.ok && JSON.stringify(reopened.value) === JSON.stringify(saved.value), `${spec.id}: actual store reopened byte-equivalent project values`);
    must(saved.value.evidence.filter(ev => ev.provenance?.moduleVersion === "DEVKIT_REGIONAL_RULES_V1").length === spec.expected && saved.value.procedures.length === spec.expected, `${spec.id}: all source/procedure records survive save`);
    const savedMetadataHash = hash(JSON.stringify(saved.value.evidence.filter(ev => ev.provenance?.moduleVersion === "DEVKIT_REGIONAL_RULES_V1")));
    const second = attach(saved.value), secondSave = store.save(second, saved.value.revision);
    must(secondSave.ok && new Set(secondSave.value.evidence.map(ev => ev.id)).size === secondSave.value.evidence.length && new Set(secondSave.value.procedures.map(p => p.id)).size === secondSave.value.procedures.length, `${spec.id}: repeated composition does not duplicate records`);
    must(hash(JSON.stringify(secondSave.value.evidence.filter(ev => ev.provenance?.moduleVersion === "DEVKIT_REGIONAL_RULES_V1"))) === savedMetadataHash, `${spec.id}: reattach does not rewrite date/version/right/unknown/source metadata`);
    const exported = store.exportProject(base.id); must(exported.ok, `${spec.id}: complete export`);
    const importedMemory = new Map(), importer = targetStore.createDevkitProjectStore({ getItem: key => importedMemory.get(key) ?? null, setItem: (key, value) => importedMemory.set(key, value) }, `import-${spec.id}`);
    const imported = importer.importProject(exported.value);
    must(imported.ok && JSON.stringify(imported.value) === JSON.stringify(secondSave.value), `${spec.id}: complete export/import equality`);
    const projectBytes = bytes(secondSave.value), storeBytes = bytes(mainRaw());
    must(projectBytes <= targetStore.DEVKIT_MAX_PROJECT_BYTES && storeBytes <= targetStore.DEVKIT_MAX_STORE_BYTES, `${spec.id}: actual saved sizes stay within both enforced limits`);
    cases.push({ caseId: spec.id, market: spec.market, regionalEvidence: spec.expected, procedures: spec.expected, totalEvidence: secondSave.value.evidence.length, spatialObjects: secondSave.value.objects.length, existingDesignVersions: secondSave.value.designVersions.length,
      projectBytes, projectHeadroomBytes: targetStore.DEVKIT_MAX_PROJECT_BYTES - projectBytes, storeBytesAfterThisCase: storeBytes,
      totalPhysicalMainPlusBackupBytes: [...memory.values()].reduce((sum, value) => sum + bytes(value), 0), exportBytes: bytes(exported.value), savedMetadataSha256: savedMetadataHash,
      siteFactsUnchanged: true, duplicateIds: false, inputPackageVersion: pack.packageVersion, inputSha256: pack.sourcePackage.compilationProvenance.sourceSha256 });
  }
  const all = targetStore.createDevkitProjectStore(storage, scopeId).list();
  must(all.ok && all.value.length === sourceCases.length, "All complete regional projects coexist in one actual store envelope");
  must(bytes(mainRaw()) <= targetStore.DEVKIT_MAX_STORE_BYTES, "Combined actual store stays below2MiB");
  must(sourceHashes.every(item => hash(readFileSync(file(item.path))) === item.sha256), "All inspected/imported target files stayed byte-stable throughout capacity check");
  return { status: "PASS", checks: capacityChecks, targetCheckout: target, targetHeadAtStart: headBefore,
    targetHeadAtEnd: execFileSync("git", ["rev-parse", "HEAD"], { cwd: target, encoding: "utf8" }).trim(), sourceHashes,
    projectLimitBytes: targetStore.DEVKIT_MAX_PROJECT_BYTES, storeLimitBytes: targetStore.DEVKIT_MAX_STORE_BYTES,
    combinedStoreBytes: bytes(mainRaw()), combinedStoreHeadroomBytes: targetStore.DEVKIT_MAX_STORE_BYTES - bytes(mainRaw()), cases,
    scope: "Actual compiled regional data -> reference records -> inspected UI-equivalent attach composition -> actual revise/store/save/reopen/export/import; in-memory Storage adapter",
    noNetwork: true, noTruncation: true, noInferredSiteProperty: true,
    notQualified: ["rendered browser/button handler", "browser quota", "hosted persistence", "full populated finance/kit payload", "official applicability/legal/source authenticity", "whole-root acceptance"] };
}
async function checkEvidenceDisplay() {
  const target = displayCheckout ? path.resolve(displayCheckout) : root;
  const targetStoreFile = path.join(target, "src/lib/devkit/project-store.ts");
  const targetStore = await import(pathToFileURL(targetStoreFile).href);
  const targetFixtures = await import(pathToFileURL(path.join(target, "src/lib/devkit/fixtures.ts")).href);
  const sourceHash = hash(readFileSync(targetStoreFile));
  const React = await import("react"), { renderToStaticMarkup } = await import("react-dom/server");
  const { DevkitEvidenceStage } = await import("../components/devkit/evidence-stage.tsx");
  let displayChecks = 0;
  const results = [];
  const must = (value, id) => { assert.ok(value, id); displayChecks++; results.push(id); };
  const at = "2026-10-22T16:40:00.000Z";
  function makeCase(id = "display-case") {
    const base = targetFixtures.createDevkitDemoProject(`display-${id}`), c = clone(positiveCase());
    c.id = id; c.aoiId = base.aoi.id;
    for (const item of [...c.evidence, ...c.claims]) item.subjectId = base.aoi.id;
    for (const item of [...c.lineage, ...c.claimBindings]) { item.subject.id = base.aoi.id; item.scope.subject.id = base.aoi.id; }
    return { base, c };
  }
  const projectFor = (base, c) => ({ ...base, ...e.foundationRecordsForEvidenceCase(c) });
  function assess(project) {
    const before = JSON.stringify(project), result = e.assessProjectClaimsForDisplay(project, { asOf: at });
    assert.equal(JSON.stringify(project), before, "Assessment must leave original project, claims and source metadata unchanged");
    return result;
  }
  const render = (project, locale = "en") => renderToStaticMarkup(React.createElement(DevkitEvidenceStage, { project, locale, onChange() { throw new Error("SSR must not edit project"); } }));
  const { base, c } = makeCase();
  const positive = projectFor(base, c), positiveView = assess(positive);
  must(targetStore.parseDevkitProject(positive), "upstream accepts preserved positive project");
  must(positiveView.claims[0].usable && positiveView.claims[0].value === 0 && positiveView.claims[0].state === "source_backed", "explicit supported zero stays usable zero");
  must(positiveView.claims[0].subject.kind === "aoi" && positiveView.claims[0].subject.id === base.aoi.id && positiveView.claims[0].scope.radiusM === 400, "exact subject and400m scope are read from preserved binding");
  const conflictCase = clone(c); conflictCase.claims.push({ ...clone(c.claims[0]), id: "claim-2", value: 3 }); conflictCase.claimBindings.push({ ...clone(c.claimBindings[0]), claimId: "claim-2" });
  const conflict = projectFor(base, conflictCase), conflicting = assess(conflict);
  must(targetStore.parseDevkitProject(conflict) && conflict.claims.every(claim => claim.status === "source_backed"), "upstream structural parser does not resolve semantic source conflicts or rewrite original statuses");
  must(conflicting.claims.every(claim => !claim.usable && claim.state === "conflicting"), "same subject/field/unit/scope conflict is excluded from usable display");
  const conflictHtml = render(conflict);
  must((conflictHtml.match(/data-claim-state="conflicting"/g) ?? []).length === 2 && !conflictHtml.includes('data-claim-usable="true"'), "rendered conflicting cards do not become green known facts");
  const mismatchCase = clone(c); mismatchCase.lineage[0].scope.radiusM = 800;
  const mismatch = projectFor(base, mismatchCase), mismatchView = assess(mismatch);
  must(targetStore.parseDevkitProject(mismatch), "upstream structural parser accepts a non-null claim with an inapplicable evidence scope");
  must(!mismatchView.claims[0].usable && mismatchView.claims[0].state === "unsupported" && mismatchView.claims[0].reasons.includes("evidence_scope_mismatch"), "existing evaluator rejects400m claim borrowing800m evidence");
  const rightsCase = clone(c); rightsCase.sources[0].licence.localUse = "unknown";
  const rights = assess(projectFor(base, rightsCase));
  must(!rights.claims[0].usable && rights.claims[0].state === "unsupported", "unknown local-use rights cannot make a usable source fact");
  const expiredCase = clone(c); expiredCase.lineage[0].validTo = "2026-10-21T00:00:00Z";
  const expiredProject = projectFor(base, expiredCase), expired = assess(expiredProject);
  must(!expired.claims[0].usable && expired.claims[0].state === "stale" && expired.claims[0].value === 0, "expired declared validity changes display verdict but never the source value");
  must(render(expiredProject).includes('data-claim-state="stale"'), "expired basis is labelled in the actual card markup");
  const differentCase = clone(c);
  differentCase.evidence.push({ ...clone(c.evidence[0]), id: "ev-800" });
  differentCase.lineage.push({ ...clone(c.lineage[0]), evidenceId: "ev-800", scope: { ...clone(c.lineage[0].scope), radiusM: 800 } });
  differentCase.claims.push({ ...clone(c.claims[0]), id: "claim-800", value: 3, evidenceIds: ["ev-800"] });
  differentCase.claimBindings.push({ ...clone(c.claimBindings[0]), claimId: "claim-800", scope: { ...clone(c.claimBindings[0].scope), radiusM: 800 } });
  const differentProject = projectFor(base, differentCase), different = assess(differentProject), differentHtml = render(differentProject);
  must(different.claims.every(claim => claim.usable) && different.claims.map(claim => claim.scope.radiusM).join(",") === "400,800", "different400/800 scopes retain separate usable source counts without conflict/denominator merge");
  must(differentHtml.includes("Radius 400 m") && differentHtml.includes("Radius 800 m") && differentHtml.includes(base.aoi.id), "actual card markup shows both exact radii and subject identity");
  const otherSubjectCase = clone(c), poi = { id: "source-poi", kind: "poi", label: "Synthetic source POI", sourceFeatureId: "synthetic-poi", geometry: { type: "Point", coordinates: [55.27,25.2] }, crs: "EPSG:4326", trust: "synthetic", evidenceIds: ["ev-poi"] };
  otherSubjectCase.objects.push(poi); otherSubjectCase.evidence.push({ ...clone(c.evidence[0]), id: "ev-poi", subjectId: poi.id });
  const poiSubject = { id: poi.id, kind: "poi" }, poiScope = { subject: poiSubject, kind: "subject", radiusM: null, geometryHash: null, completeInventory: false };
  otherSubjectCase.lineage.push({ ...clone(c.lineage[0]), evidenceId: "ev-poi", subject: poiSubject, scope: poiScope });
  otherSubjectCase.claims.push({ ...clone(c.claims[0]), id: "claim-poi", subjectId: poi.id, value: 7, evidenceIds: ["ev-poi"] });
  otherSubjectCase.claimBindings.push({ ...clone(c.claimBindings[0]), claimId: "claim-poi", subject: poiSubject, scope: poiScope });
  const subjectProject = projectFor(base, otherSubjectCase), subjects = assess(subjectProject), subjectsHtml = render(subjectProject);
  must(subjects.claims.every(claim => claim.usable) && subjects.claims[0].subject.kind === "aoi" && subjects.claims[1].subject.kind === "poi", "same field on separate AOI/POI subjects is not merged or substituted");
  must(subjectsHtml.includes("Synthetic source POI") && subjectsHtml.includes("source-poi") && subjectsHtml.includes("Study area"), "card subject kind/name/id distinguishes POI from study area");
  const missing = clone(positive); delete missing.evidence[0].provenance; delete missing.claims[0].scope;
  const missingView = assess(missing), missingHtml = render(missing);
  must(!missingView.claims[0].usable && missingView.claims[0].scope === null && missingView.claims[0].state === "unsupported", "legacy missing preservation cannot be reconstructed from field label or status");
  must(missingHtml.includes("Scope: Unknown") && missingHtml.includes('data-claim-state="unsupported"') && missingHtml.includes("Recorded status") && missing.claims[0].status === "source_backed", "legacy card visibly separates unknown basis/scope from original source-backed declaration");
  const oldMetadata = clone(positive); oldMetadata.claims[0].scope.moduleVersion = "DEVKIT_EVIDENCE_V0";
  must(!assess(oldMetadata).claims[0].usable && assess(oldMetadata).claims[0].scope === null, "old unsupported metadata version remains unverified");
  const absent = clone(positive); absent.claims[0].value = null; absent.claims[0].status = "unknown";
  const absentView = assess(absent);
  must(!absentView.claims[0].usable && absentView.claims[0].value === null && absentView.claims[0].state === "unknown", "null stays unknown and never becomes zero");
  must(render(absent).includes('data-claim-state="unknown"') && render(positive).includes('data-claim-usable="true"'), "actual null and explicit zero cards retain distinct display verdicts");
  const twoCasesBase = targetFixtures.createDevkitDemoProject("display-two-cases"), first = clone(c), second = clone(c);
  first.id = "first-preserved-case"; second.id = "second-preserved-case"; second.claims[0].id = "second-claim"; second.claimBindings[0].claimId = "second-claim"; second.claims[0].value = 9; second.evidence[0].id = "second-ev"; second.lineage[0].evidenceId = "second-ev"; second.claims[0].evidenceIds = ["second-ev"];
  const firstRecords = e.foundationRecordsForEvidenceCase(first), secondRecords = e.foundationRecordsForEvidenceCase(second);
  const crossCaseProject = { ...twoCasesBase, evidence: [...firstRecords.evidence, ...secondRecords.evidence], claims: [...firstRecords.claims, ...secondRecords.claims], constraints: [], objects: [] };
  must(assess(crossCaseProject).claims.every(claim => !claim.usable && claim.state === "conflicting"), "existing evaluator also detects overlapping contradictory claims across independently preserved cases");
  const assumption = clone(missing); assumption.claims[0].status = "assumption";
  must(assess(assumption).claims[0].state === "assumption" && !assess(assumption).claims[0].usable, "an explicit assumption remains an assumption and is never a usable source fact");
  const generated = clone(missing); generated.claims[0].status = "generated";
  must(assess(generated).claims[0].state === "generated" && !assess(generated).claims[0].usable, "generated content remains separate from source-backed facts");
  const invalidAsOf = (() => { try { e.assessProjectClaimsForDisplay(positive, { asOf: "invalid" }); return false; } catch { return true; } })();
  must(invalidAsOf, "display assessment requires an explicit valid assessment time");
  const ruHtml = render(differentProject, "ru");
  must(ruHtml.includes("Радиус 400 м") && ruHtml.includes("Радиус 800 м") && ruHtml.includes("Объект") && render(missing, "ru").includes("Область: Неизвестно"), "RU cards expose precise scope/subject and missing-scope unknown");
  must(networkCalls === 0, "targeted assessment/SSR performs zero source/provider network calls");
  must(hash(readFileSync(targetStoreFile)) === sourceHash, "read-only upstream parser source did not change during the check");
  // Only the two changed source files are roots. Missing Root-owned dependencies
  // are read through a virtual overlay; they are not copied or edited.
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const compilerOptions = { ...parsedConfig.options, incremental: false, noEmit: true, skipLibCheck: true };
  const host = ts.createCompilerHost(compilerOptions), nativeRead = host.readFile.bind(host), nativeExists = host.fileExists.bind(host), nativeDir = host.directoryExists?.bind(host);
  const borrowed = new Set();
  const mapped = file => file.startsWith(root + path.sep) ? path.join(target, file.slice(root.length + 1)) : file;
  host.fileExists = file => nativeExists(file) || target !== root && nativeExists(mapped(file));
  host.directoryExists = dir => !!nativeDir?.(dir) || target !== root && !!nativeDir?.(mapped(dir));
  host.readFile = file => { const own = nativeRead(file); if (own !== undefined) return own; const other = mapped(file); if (other !== file) { const text = nativeRead(other); if (text !== undefined) { borrowed.add(other); return text; } } return undefined; };
  host.getSourceFile = (file, languageVersion) => { const text = host.readFile(file); return text === undefined ? undefined : ts.createSourceFile(file, text, languageVersion, true); };
  const program = ts.createProgram([path.join(root, "components/devkit/evidence-stage.tsx"), path.join(root, "src/lib/devkit/evidence.ts")], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error);
  const diagnosticText = ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => "\n" });
  must(diagnostics.length === 0, `targeted TypeScript check using read-only Root dependency overlay: ${diagnosticText}`);
  return { status: "PASS", checks: displayChecks, checkedAt: new Date().toISOString(), assessmentAsOf: at, node: process.version, typescript: ts.version,
    upstreamCheckout: target, upstreamStoreSha256: sourceHash, sourceFiles: ["components/devkit/evidence-stage.tsx", "src/lib/devkit/evidence.ts"].map(file => ({ file, sha256: hash(readFileSync(path.join(root, file))) })),
    evidence: results, networkCalls, targetedTypecheck: "PASS", readOnlyTypeDependencies: [...borrowed],
    scope: "Existing evaluator -> display-only assessment -> EN/RU isolated SSR card markup; original project/claims unchanged",
    limits: ["Find child replaced with null only in isolated SSR test; actual Root helper props checked via read-only type overlay", "no browser/build/CI/API", "no new source/date/rights policy", "no full replay of prior67/52 suites", "no whole-product/runtime acceptance"] };
}
try {
  if (displayOnly) {
    const displayReport = await checkEvidenceDisplay();
    const reportPath = process.argv.find(a => a.startsWith("--display-output="))?.slice(17);
    if (reportPath) writeFileSync(reportPath, `${JSON.stringify(displayReport, null, 2)}\n`);
    console.log(JSON.stringify(displayReport));
  } else {
  if (capacityCheckout) {
    const capacity = await checkRegionalStoreCapacity(capacityCheckout);
    const capacityOutput = process.argv.find(a => a.startsWith("--capacity-output="))?.slice(18);
    if (capacityOutput) writeFileSync(capacityOutput, `${JSON.stringify(capacity, null, 2)}\n`);
    console.log(JSON.stringify({ regionalStoreCapacity: capacity }));
  }
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
  if (staticData) {
    check(staticData.getDevkitRegionalPack("abu_dhabi") === null && staticData.getDevkitRegionalPack("singapore") === null && staticData.getDevkitRegionalPack("__proto__") === null, "Unresearched regions cannot borrow Dubai or Moscow authority/procedures");
    for (const [market, expected] of [["dubai", "AE-DU"], ["moscow", "RU-MOW"]]) {
      const pack = staticData.getDevkitRegionalPack(market);
      check(pack?.jurisdiction === expected && pack.rules.length > 0 && pack.sources.every(source => source.observedAt === null && source.serviceTested !== true) && pack.sourcePackage.compiledMetadataOnly === true, `${market} browser bundle contains conditional researcher metadata and independent time/access states`);
      const original = pack.rules[0].label; pack.rules[0].label = "Consumer edit";
      check(staticData.getDevkitRegionalPack(market).rules[0].label === original, `${market} consumer editing cannot mutate frozen shared source metadata`);
      const rejectRaw = value => !value || typeof value !== "object" || Object.entries(value).every(([key, v]) => !["rawBody", "rawHtml", "fullText", "full_text", "licenseText", "pdfBytes", "base64"].includes(key) && (Array.isArray(v) ? v.every(rejectRaw) : rejectRaw(v)));
      check(rejectRaw(pack), `${market} browser source pack excludes raw documents/forms/terms payloads`);
      staticRegionalData.regions.push({ market, jurisdiction: expected, packageVersion: pack.packageVersion, rules: pack.rules.length, sources: pack.sources.length, inputSha256: pack.sourcePackage.compilationProvenance.sourceSha256 });
    }
    staticRegionalData.status = "PASS";
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
    actualSourceHash: u4.U4_SOURCE_HASH, licenceHash: hash(licenseBytes), regionalReports, persistence, staticRegionalData,
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
  }
} finally { globalThis.fetch = originalFetch; }
