import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url);
const ts = require("typescript");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3Dfn%3D%3Efn", shortCircuit: true };
    const local = specifier.startsWith("@/") ? pathToFileURL(path.join(root, specifier.slice(2))).href : specifier;
    if (!context.parentURL?.includes("/node_modules/") && (local.startsWith("file:") || local.startsWith("./") || local.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(local)) {
      try { return next(`${local}.ts`, context); } catch { return next(`${local}.tsx`, context); }
    }
    return next(local, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText };
    return next(url, context);
  }
});
const independent = await import("../src/lib/prototype/point-to-object-independent-context.ts");
const { semanticHash } = await import("../src/lib/point-to-object/hash.ts");
const { readIndependentPointObjectContext } = await import("../src/lib/prototype/point-to-object-overture-snapshot.ts");
const { contextDetailsFromEvidence, parseContextDetailsV2, contextExplicitTag } = await import("../src/lib/prototype/point-to-object-context-details-v2.ts");
const { normalizePointObjectContext, normalizedResolvedContext, parseNormalizedPointObjectContext } = await import("../src/lib/prototype/point-to-object-normalized-context.ts");
const { buildLivePointObjectEvidencePack, normalizeOverpassUrbanFabric } = await import("../src/lib/prototype/point-to-object-live-evidence.ts");
const { parseLiveResolvedObject, parsePointObjectAiResponse, parsePointObjectSelection } = await import("../components/point-to-object/live-session.ts");
const ai = await import("../src/lib/prototype/point-to-object-ai-core.ts");
const Ajv2020 = require("ajv/dist/2020.js").default;
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { PointObjectContextDashboard } = await import("../components/point-to-object/context-dashboard.tsx");
const { IndependentSourceContext } = await import("../components/point-to-object/independent-source-context.tsx");
const verification = await import("../src/lib/prototype/point-to-object-verification-export.ts");
let checks = 0;
const check = (v, message) => { assert.ok(v, message); checks++; };
const clone = v => structuredClone(v);
const now = new Date().toISOString();
const data = JSON.parse(readFileSync(path.join(root, "src/data/prototype/d2-overture-places.json"), "utf8"));
const cases = independent.INDEPENDENT_CASES;
check(independent.INDEPENDENT_U3_GEOMETRY_HASH === semanticHash(independent.INDEPENDENT_U3_POLYGON), "Pinned browser-safe geometry hash is bit-identical to canonical server SHA-256");
const runtimeImports = new Set();
function inspectClientImports(file, seen = new Set()) {
  if (seen.has(file)) return;
  seen.add(file);
  const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  for (const match of source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)) {
    const specifier = match[1]; runtimeImports.add(specifier);
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const local = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
      inspectClientImports(/\.tsx?$/.test(local) ? local : existsSync(`${local}.ts`) ? `${local}.ts` : `${local}.tsx`, seen);
    }
  }
}
inspectClientImports(path.join(root, "src/lib/prototype/point-to-object-normalized-context.ts"));
inspectClientImports(path.join(root, "components/point-to-object/context-dashboard.tsx"));
check(![...runtimeImports].some(s => s.startsWith("node:") || s.endsWith("point-to-object/hash") || s === "server-only"), "Real normalized-context runtime import graph contains no Node-only module, crypto polyfill or server-only source loader");
const actual = cases.map(c => readIndependentPointObjectContext(c.sourceFeatureId, c.anchor, c.caseId === "U3" ? independent.INDEPENDENT_U3_POLYGON : undefined));
for (const [index, count] of [165, 174, 169].entries()) {
  check(actual[index].status === "available" && actual[index].sampleSize === count, `Actual admitted ${cases[index].caseId} count matches admission`);
  check(independent.parseIndependentContext(actual[index], cases[index].sourceFeatureId, cases[index].anchor, index === 2 ? independent.INDEPENDENT_U3_POLYGON : undefined), "Producer passes its strict source parser");
}
check(actual[2].interiorSampleSize === 0 && actual[2].places.every(p => p.relation === "outside_aoi"), "U3 screened zero and external services remain separate from AOI inventory");
check(actual[2].spatialCoverage.state === "partial_circle_clipped_by_acquisition_extent" && actual[2].spatialCoverage.easternClipApproxM === 27.83, "Independent QA G1 clipping retained, not hidden behind incomplete inventory");
const fullU3 = clone(actual[2]); fullU3.spatialCoverage.state = "full_circle_within_acquisition_extent";
check(independent.parseIndependentContext(fullU3, cases[2].sourceFeatureId, cases[2].anchor, independent.INDEPENDENT_U3_POLYGON) === null, "False full-circle U3 claim fails strict parser");
const binsina = actual[1].places.find(p => p.id === "9cdcd059-192f-4b0d-b2ef-bb0c2717aec3");
check(binsina && Math.abs(binsina.distanceM - 94.96) < 0.02 && binsina.taxonomy.primary === "pharmacy" && binsina.basic_category === "pharmacy_and_drug_store", "Actual new service survives taxonomy and physical distance normalization");
check(binsina.sources.some(s => s.record_id === "1447748162016527") && binsina.providerUpdatedAt === "2026-09-14T00:00:00.000Z" && binsina.observationDate === null, "Meta source ID and provider timestamp preserved; derived update is not observation");
check(actual.every(c => c.places.every(p => p.currentOperation === "unknown" && p.capacity === "unknown")), "No source record claims current operation or capacity");
check(!data.features.some(p => ["21c0f90f-7e29-4b9c-8b79-4c9be6d4699c", "bb169379-5ccc-4c2f-a54c-0297ecd4f9c1"].includes(p.id)), "Known quarantine absent from shipped bytes");
for (const [id, anchor, polygon] of [["way/123", cases[0].anchor], [cases[0].sourceFeatureId, [55.27, 25.20]], [cases[2].sourceFeatureId, cases[2].anchor, [[[55.28,25.21],[55.281,25.21],[55.281,25.211],[55.28,25.211],[55.28,25.21]]]]]) {
  const unsupported = independent.buildIndependentContext(data, id, anchor, now, polygon);
  check(unsupported.status === "unsupported_scope" && unsupported.sampleSize === null && unsupported.interiorSampleSize === null && unsupported.places.length === 0, "Wrong identity/anchor/altered AOI cannot substitute nearest case or zero");
}
for (const edit of [c => c.places[0].currentOperation = "confirmed", c => c.places[0].distanceM = 0, c => c.places[0].providerUpdatedAt = c.places[0].sources.at(-1).update_time, c => c.places[0].sources[0].license = "unknown", c => c.completeInventory = true, c => c.anchor[0] += 0.001, c => c.fetchedAt = now, c => c.places[0].officialLive = true]) {
  const forged = clone(actual[1]); edit(forged);
  check(independent.parseIndependentContext(forged, cases[1].sourceFeatureId, cases[1].anchor) === null, "Contradictory independent source claims fail closed");
}

// OSM is a synthetic transport fixture, NOT a newly verified U2 footprint.
const anchor = cases[1].anchor;
const ring = [[anchor[0]-.0001,anchor[1]-.0001],[anchor[0]+.0001,anchor[1]-.0001],[anchor[0]+.0001,anchor[1]+.0001],[anchor[0]-.0001,anchor[1]+.0001],[anchor[0]-.0001,anchor[1]-.0001]];
const oldFetch = globalThis.fetch;
let injectedRequests = 0;
globalThis.fetch = async url => {
  injectedRequests++;
  const query = new URL(String(url)).searchParams.get("data") ?? "";
  if (query.includes("out body geom 1")) return Response.json({ elements: [{ type: "way", id: 393391114, tags: { name: "Synthetic geometry transport fixture", building: "office", height: "100 ft", "building:levels": "10" }, geometry: ring.map(([lon, lat]) => ({ lon, lat })), bounds: { minlat: anchor[1]-.0001, maxlat: anchor[1]+.0001, minlon: anchor[0]-.0001, maxlon: anchor[0]+.0001 } }] });
  return Response.json({ osm3s: { timestamp_osm_base: "2026-10-13T11:00:00Z" }, elements: [{ type: "node", id: 13, lon: anchor[0]+.0004, lat: anchor[1], tags: { name: "Synthetic bus stop", highway: "bus_stop" } }] });
};
let pack;
try { pack = await buildLivePointObjectEvidencePack({ longitude: anchor[0], latitude: anchor[1], osmFeatureId: cases[1].sourceFeatureId, locale: "en", expectedCountryCode: "ae", deadlineAtMs: Date.now()+12_000 }); }
finally { globalThis.fetch = oldFetch; }
check(injectedRequests === 2, "Admitted enrichment adds no network/provider call");
const normalized = normalizePointObjectContext(pack);
const projection = ai.buildModelEvidenceProjection(pack);
const projectedBinSina = projection.independentContext?.places.find(p => p.sourceRecordId === binsina.id);
check(projectedBinSina && projectedBinSina.name === binsina.name && Math.abs(projectedBinSina.distanceM - independent.independentDistanceM(projection.independentContext.anchor, binsina.coordinates)) <= 0.011, `Actual AI projection includes strictly pinned admitted service and recomputed point-distance evidence: ${JSON.stringify(projectedBinSina)}`);
check(projection.independentContext.places.length === 20 && projection.independentContext.sampleSize === 174 && projection.independentContext.observationDate === null && projection.independentContext.completeInventory === false, "Bounded projection preserves records versus inventory and unknown observation");
check(projection.evidenceIndex.some(p => p.id === binsina.evidenceRef && p.kind === "admitted_snapshot_place_record_not_selected_asset"), "Record-level eligible ref resolves through actual AI evidence index");
const snapshotReceipt = pack.evidence.find(e => e.id === "EVD-OVERTURE-SNAPSHOT");
for (const edit of [
  p => p.evidence.push(clone(snapshotReceipt)),
  p => p.evidence.push({ id: snapshotReceipt.id, value: null }),
  p => p.evidence.push({ id: binsina.evidenceRef, value: "forged record reference" }),
  p => p.evidence.find(e => e.id === snapshotReceipt.id).sourceId = "another-dataset",
  p => { const e = p.evidence.find(e => e.id === snapshotReceipt.id); const c = JSON.parse(e.value); c.places[0].name = "Another Pharmacy"; e.value = JSON.stringify(c); },
  p => { const e = p.evidence.find(e => e.id === snapshotReceipt.id); const c = JSON.parse(e.value); c.sampleSize++; e.value = JSON.stringify(c); },
  p => p.coordinates.longitude += 0.01,
  p => p.selectedObject.sourceFeatureId = "way/123"
]) {
  const forged = clone(pack); edit(forged);
  const projected = ai.buildModelEvidenceProjection(forged);
  check(!projected.independentContext && !projected.evidenceIndex.some(e => e.id.startsWith("EVD-OVERTURE-")), "Unbound, duplicated or immutable-fact-drifted source has no model payload or eligible refs");
}
const profile = { model: "gpt-5.6-sol", reasoningEffort: "high", verbosity: "medium", maxOutputTokens: 4000 }; // Pure request fixture; no model/API call.
const rawPlan = { decision: { path: "existing_asset_screen", disposition: "continue_screening", confidence: "medium", reasonCodes: ["object_identity_available", "use_classification_available", "nearby_context_available"] }, signalCodes: ["object_identity", "use_classification", "building_form", "address_context"], opportunityCodes: ["existing_asset_repositioning", "redevelopment_envelope_test"], risks: [{ code: "non_official_source", severity: "high", confidence: "medium" }, { code: "identity_uncertainty", severity: "high", confidence: "low" }, { code: "geometry_not_parcel", severity: "high", confidence: "low" }], answerCode: "source_evidence_only", focusedAnswer: null, caveat: pack.caveat };
for (const locale of ["en", "ru"]) {
  const request = { depth: "standard", goal: "custom", perspective: "developer", horizon: "current", locale, question: locale === "en" ? "What does the BinSina Pharmacy record change about testing additional pharmacy space?" : "Как запись BinSina Pharmacy меняет проверку гипотезы дополнительных аптечных площадей?" };
  const body = ai.buildPointObjectResponsesRequest(pack, request, profile);
  const payload = JSON.parse(body.input[1].content[0].text);
  check(payload.evidenceProjection.independentContext.places.some(p => p.evidenceId === binsina.evidenceRef), "Actual Responses request carries admitted record, not just appended raw pack evidence");
  check(payload.selectionPolicy.eligibleFocusedAnswerEvidenceRefs.includes(binsina.evidenceRef) && JSON.stringify(body.text.format.schema).includes(binsina.evidenceRef), "Actual selection policy and strict output schema permit bound record reference");
  check(payload.validationPolicy.independentPlaceContract.version === "D2_ADMITTED_PLACE_MODEL_V1", "Model receives separate snapshot scope and non-authority rules");
  const missing = [...new Set([...payload.validationPolicy.requiredMissingEvidenceCodes, "physical_baseline", "route_access"])];
  const statement = locale === "en" ? "BinSina Pharmacy is a mapped source lead; verify operation and access before testing additional pharmacy space." : "BinSina Pharmacy — запись источника карты; проверьте работу и доступ до проверки гипотезы дополнительных аптечных площадей.";
  const answer = { status: "partial", scope: "screening_implication", perspective: "developer", horizon: "current", statement, evidenceRefs: [binsina.evidenceRef], confidence: "low", missingEvidenceCodes: missing, unsupportedReasonCode: null };
  const plan = { ...rawPlan, depthPlan: { criteriaSignalCodes: payload.selectionPolicy.eligibleDepthCriteriaCodes.slice(0, 3), alternativePaths: payload.selectionPolicy.eligibleDepthAlternativePaths.filter(path => path !== rawPlan.decision.path).slice(0, 1), counterEvidenceRiskCodes: payload.selectionPolicy.eligibleDepthCounterEvidenceCodes.slice(0, 2), decisionTriggerCodes: payload.selectionPolicy.eligibleDepthDecisionTriggerCodes.slice(0, 2) }, focusedAnswer: answer };
  const validateShape = new Ajv2020({ strict: true }).compile(body.text.format.schema);
  check(validateShape(plan), "Admitted-source regression uses actual current strict Responses output schema, not a legacy plan shape");
  const valid = ai.validatePointObjectAiContentDetailed(plan, pack, request);
  check(valid.ok && valid.content.answerToQuestion?.statement === statement, `Evidence-bound ${locale} service implication survives real strict validation without fabricated operation/capacity: ${valid.detail ?? "output mismatch"}`);
  check(valid.content.locationContext.some(item => item.statement.includes("BinSina Pharmacy") && item.evidenceRefs.includes(binsina.evidenceRef)) && valid.content.nextValidation.some(item => item.action.includes("BinSina Pharmacy") && item.evidenceRefs.includes(binsina.evidenceRef)), "Server-rendered output includes actual service lead and consequential verification action");
  // Synthetic metadata tests only the existing save parser, not an API receipt.
  const nullUsage = { requestId: null, inputTokens: null, cachedInputTokens: null, cacheWriteTokens: null, outputTokens: null, totalTokens: null, estimatedCostUsd: null };
  const response = { mode: "openai", schemaVersion: 6, generatedAt: now, evidencePackId: pack.evidencePackId, evidencePackHash: pack.evidencePackHash, request: { ...request, role: "unspecified", scenario: "unspecified", focused: true }, content: valid.content, subject: { name: pack.selectedObject.name, address: pack.selectedObject.displayAddress, featureClass: pack.selectedObject.featureClass, sourceFeatureId: pack.selectedObject.sourceFeatureId, resolutionMethod: "overpass_exact_identity", coordinateAssociation: pack.resolution.coordinateAssociation, sourceLabel: "© OpenStreetMap contributors", geometryType: pack.selectedObject.geometryType, resultCentroidDistanceM: pack.resolution.resultCentroidDistanceM, addressParts: pack.selectedObject.addressParts, tags: pack.selectedObject.tags, metrics: pack.selectedObject.metrics, geoContext: pack.geoContext, linkedEntity: null }, telemetry: { provider: "openai", schemaVersion: 6, model: profile.model, reasoningEffort: profile.reasoningEffort, depth: "standard", promptVersion: ai.POINT_OBJECT_AI_PROMPT_VERSION, latencyMs: 0, attempts: 1, attemptTrace: [{ attempt: 1, purpose: "focused", model: profile.model, reasoningEffort: profile.reasoningEffort, ...nullUsage }], ...nullUsage, costRateSource: null, stored: false, toolCalls: 0 } };
  const savedAnswer = parsePointObjectAiResponse(JSON.parse(JSON.stringify(response)));
  check(savedAnswer?.mode === "openai" && savedAnswer.content.answerToQuestion.statement === statement && savedAnswer.content.answerToQuestion.evidenceRefs.includes(binsina.evidenceRef), "Actual AI save/reopen parser retains source-bound generated interpretation and record ref");
  const exactDistance = locale === "en" ? `${binsina.name} — ${projectedBinSina.distanceM} m straight-line to the mapped point. Verify operation and access before testing additional pharmacy space.` : `${binsina.name} — ${projectedBinSina.distanceM} м по прямой до точки записи. Проверьте работу и доступ до проверки гипотезы дополнительных аптечных площадей.`;
  check(ai.validatePointObjectAiContentDetailed({ ...plan, focusedAnswer: { ...answer, statement: exactDistance } }, pack, request).ok, "Exact cited point-distance clause is usable, not a blanket numeric ban");
  const scalar = locale === "en" ? `Mapped height: ${pack.selectedObject.tags["tag.height"]}. ` : `Высота по карте: ${pack.selectedObject.tags["tag.height"]}. `;
  check(ai.validatePointObjectAiContentDetailed({ ...plan, focusedAnswer: { ...answer, statement: scalar + exactDistance, evidenceRefs: ["EVD-ALLOWED-FIELDS", binsina.evidenceRef] } }, pack, request).ok, "Separately cited exact selected-object scalar remains compatible with independent place distance");
  for (const edit of [
    a => a.statement = `${statement} ${locale === "en" ? "Capacity is 174." : "Вместимость — 174."}`,
    a => a.statement = `${statement} ${locale === "en" ? "This proves 94.96 m height." : "Это подтверждает высоту 94.96 м."}`,
    a => a.statement = statement.replace("BinSina Pharmacy", "Another Pharmacy"),
    a => a.statement = locale === "en" ? "BinSina Pharmacy is currently open and has adequate capacity to meet demand." : "BinSina Pharmacy работает сейчас и имеет достаточную вместимость для спроса.",
    a => a.evidenceRefs = ["EVD-OVERTURE-00000000000000000000000000000001"],
    a => a.scope = "mapped_form",
    a => { a.statement = scalar + exactDistance; } // Source scalar requires its own selected-object citation.
  ]) {
    const forged = clone(answer); edit(forged);
    check(!ai.validatePointObjectAiContentDetailed({ ...plan, focusedAnswer: forged }, pack, request).ok, "Independent evidence cannot supply wrong-name, invented capacity/height, current-operation, forged-ref or selected-form claims");
  }
}
check(parseNormalizedPointObjectContext(normalized), "Actual pack producer plus independent receipt passes normalized parser");
check(normalized.independentContext?.status === "available" && normalized.details?.independentEnrichment === "separate_source_snapshot", "Independent evidence reaches normalized contract without mixed OSM counts");
check(normalized.details.metrics.find(m => m.id === "height")?.value === 30.48 && normalized.details.metrics.find(m => m.id === "levels")?.value === 10, "Height units converted explicitly; levels remain separate");
const publicSubject = { name: pack.selectedObject.name, address: pack.selectedObject.displayAddress, featureClass: pack.selectedObject.featureClass, sourceFeatureId: pack.selectedObject.sourceFeatureId, geometryType: pack.selectedObject.geometryType, coordinateAssociation: pack.resolution.coordinateAssociation, resultCentroidDistanceM: pack.resolution.resultCentroidDistanceM, addressParts: pack.selectedObject.addressParts, tags: pack.selectedObject.tags, metrics: pack.selectedObject.metrics, geoContext: pack.geoContext, normalizedContext: normalized, linkedEntity: null, displayGeometry: pack.displayGeometry, geometryProvenance: "confirmed_complete_footprint" };
const createdAt = new Date().toISOString();
publicSubject.evidenceReceipt = { version: "PUBLIC_EVIDENCE_LEASE_V1", evidencePackHash: pack.evidencePackHash, sourceResponseHash: pack.source.sourceResponseHash, acquiredAt: pack.source.acquiredAt, createdAt, expiresAt: new Date(Date.parse(createdAt) + 15 * 60_000).toISOString(), cacheWindow: Math.floor(Date.parse(createdAt) / (15 * 60_000)), sourceLocale: "en", lookupSourceFeatureId: pack.selectedObject.sourceFeatureId };
const reopened = parseLiveResolvedObject(JSON.parse(JSON.stringify(publicSubject)));
check(reopened && reopened.normalizedContext.independentContext.places.some(p => p.id === binsina.id), "Existing shared strict save/reopen parser preserves new source record");
const contextIntent = { caseKey: "dubai", longitude: anchor[0], latitude: anchor[1], locale: "en", expectedSourceFeatureId: publicSubject.sourceFeatureId };
const observed = verification.snapshotVerificationSubmission("context", contextIntent, { context: reopened });
check(semanticHash(observed.sourceSnapshot.context) === semanticHash(reopened), "Public pre-submit oracle preserves all admitted D2 details/facts/hash/version/scope after actual reopen");
const exported = JSON.parse(await verification.createVerificationBundle(true, {
  preSubmit: null, currentSelection: { mode: "analyse", marketKey: "dubai", sourceFeatureId: reopened.sourceFeatureId },
  records: [{ operation: "context", originalSubmissionIntent: contextIntent, sourceSnapshot: { context: reopened },
    response: { mode: "resolved", schemaVersion: 2, subject: reopened, evidenceReceipt: reopened.evidenceReceipt }, submittedAt: now, completedAt: now }]
}));
check(semanticHash(exported.records[0].response.subject) === semanticHash(reopened) && semanticHash(exported.records[0].sourceSnapshot.context) === semanticHash(reopened), "Actual public verification bundle retains exact reopened new context in response and held snapshot, not a field-stripped equality");
const frozenExport = JSON.stringify(observed);
const mutableExportInput = clone(reopened); verification.snapshotVerificationSubmission("context", contextIntent, { context: mutableExportInput });
mutableExportInput.normalizedContext.independentContext.places[0].name = "Later state";
check(JSON.stringify(observed) === frozenExport, "Observation copies held source facts, never a later mutable state");
for (const edit of [
  s => s.normalizedContext.details.secret = "synthetic forbidden field",
  s => s.normalizedContext.independentContext.token = "synthetic forbidden field",
  s => s.normalizedContext.independentContext.places[0].sources[0].authorization = "synthetic forbidden field",
  s => s.normalizedContext.details.metrics[0].private = true,
  s => s.normalizedContext.independentContext.spatialCoverage.unknown = true
]) {
  const bad = clone(reopened); edit(bad);
  assert.throws(() => verification.snapshotVerificationSubmission("context", contextIntent, { context: bad }), /EXPORT_UNKNOWN_FIELD_REFUSED/); checks++;
}
for (const edit of [
  s => s.normalizedContext.independentContext.places[0].name = "Bearer syntheticcredential000",
  s => s.normalizedContext.independentContext.places[0].sources[0].record_id = "https://example.test/?token=synthetic",
  s => s.normalizedContext.details.sources[0].attribution = "https://user:synthetic@example.test/"
]) {
  const bad = clone(reopened); edit(bad);
  assert.throws(() => verification.snapshotVerificationSubmission("context", contextIntent, { context: bad }), /EXPORT_VALUE_REFUSED/); checks++;
}
const accessor = clone(reopened);
Object.defineProperty(accessor.normalizedContext.details, "metrics", { enumerable: true, get() { throw new Error("Accessor must not run"); } });
assert.throws(() => verification.snapshotVerificationSubmission("context", contextIntent, { context: accessor }), /EXPORT_ACCESSOR_REFUSED/); checks++;
const oversized = clone(reopened); oversized.normalizedContext.independentContext.places[0].name = "界".repeat(800000);
assert.throws(() => verification.snapshotVerificationResponse("context", { mode: "resolved", schemaVersion: 2, subject: oversized, evidenceReceipt: oversized.evidenceReceipt }), /EXPORT_SIZE_REFUSED/); checks++;
const savedSelection = {
  locationKey: "dubai", longitude: anchor[0], latitude: anchor[1], clickedAt: now,
  object: { name: publicSubject.name, featureClass: publicSubject.featureClass, sourceFeatureId: publicSubject.sourceFeatureId, geometry: clone(pack.displayGeometry), geometryProvenance: "confirmed_complete_footprint" },
  resolvedObject: publicSubject, viewport: { center: anchor, zoom: 16 },
  provider: "OpenFreeMap / OpenStreetMap", nearbyLabels: []
};
check(parsePointObjectSelection(clone(savedSelection)), "Actual public selection parser accepts unchanged enriched selection");
const roundedSelection = clone(savedSelection);
roundedSelection.longitude = Number(anchor[0].toFixed(6)); roundedSelection.latitude = Number(anchor[1].toFixed(6));
check(parsePointObjectSelection(roundedSelection), "Six-decimal transport rounding retains exact held source binding");
for (const edit of [
  s => s.longitude += 0.01,
  s => s.latitude += 0.01,
  s => s.object.sourceFeatureId = "way/123",
  s => s.object.geometry.coordinates[0][1][0] += 0.00001
]) {
  const forged = clone(savedSelection); delete forged.resolvedObject.normalizedContext.details; edit(forged);
  check(parsePointObjectSelection(forged) === null, "Removing details cannot detach retained independent context from outer point, source or complete geometry");
}
const nullLookup = clone(publicSubject); nullLookup.evidenceReceipt.lookupSourceFeatureId = null;
check(parseLiveResolvedObject(nullLookup) === null, "Trusted selected V2 measurements require exact selected lookup ID");
for (const edit of [
  c => c.places[0].name = "Different admitted-looking name",
  c => c.places[0].address = "Another street",
  c => c.sampleSize++,
  c => c.places[0].sources[0].record_id = null,
  c => c.places[0].sources[0].record_id = "another-provider-record",
  c => { c.places[0].sources[0].update_time = "2026-09-15T00:00:00.000Z"; c.places[0].providerUpdatedAt = "2026-09-15T00:00:00.000Z"; },
  c => { c.places[0].taxonomy.primary = "hospital"; c.places[0].group = "healthcare"; },
  c => { c.places[0].coordinates[0] += 0.00001; c.places[0].distanceM = Math.round(independent.independentDistanceM(c.anchor, c.places[0].coordinates) * 100) / 100; },
  c => { c.places[0].id = "00000000-0000-0000-0000-000000000001"; c.places[0].evidenceRef = "EVD-OVERTURE-00000000000000000000000000000001"; },
  c => c.places.pop()
]) {
  const forged = clone(publicSubject); edit(forged.normalizedContext.independentContext);
  check(parseLiveResolvedObject(forged) === null, "Immutable admitted facts, IDs, lineage, counts and coordinates cannot drift through actual save/reopen parser");
}
for (const edit of [
  s => s.coordinateAssociation = "reverse_nearest_indexed_object_not_point_in_polygon",
  s => s.coordinateAssociation = "open_map_geometry_contains_point",
  s => s.normalizedContext.details.metrics.find(m => m.id === "height").value = 99,
  s => s.tags["tag.height"] = "99 m",
  s => s.tags["tag.building:levels"] = "11",
  s => s.metrics.footprintAreaSqM++,
  s => s.normalizedContext.details.geometry.coordinates[0][1][0] += 0.00001,
  s => s.evidenceReceipt.sourceResponseHash = "a".repeat(64),
  s => delete s.evidenceReceipt
]) {
  const forged = clone(publicSubject); edit(forged);
  check(parseLiveResolvedObject(forged) === null, "V2 association, scalar, geometry and source receipt must agree with outer saved subject");
}
check(parseLiveResolvedObject(publicSubject)?.normalizedContext.details.metrics.find(m => m.id === "height").value === 30.48, "Rejected imports do not mutate the held valid subject");
const legacy = clone(publicSubject); delete legacy.normalizedContext.details; delete legacy.normalizedContext.independentContext;
check(parseLiveResolvedObject(legacy) && normalizedResolvedContext(parseLiveResolvedObject(legacy)).details === undefined, "V1 save remains readable without invented metrics, geometry or enrichment");
legacy.evidenceReceipt.lookupSourceFeatureId = null;
const legacySelection = clone(savedSelection); legacySelection.resolvedObject = legacy;
check(parsePointObjectSelection(legacySelection), "Genuine unenriched V1 with null lookup remains unchanged and readable");
const legacyObserved = verification.snapshotVerificationSubmission("context", contextIntent, { context: legacy });
check(legacyObserved.sourceSnapshot.context.normalizedContext.details === undefined && legacyObserved.sourceSnapshot.context.normalizedContext.independentContext === undefined, "V1 public export stays V1 without invented D2 facts");
const nearestPack = clone(pack); nearestPack.resolution.coordinateAssociation = "reverse_nearest_indexed_object_not_point_in_polygon";
const nearest = contextDetailsFromEvidence(nearestPack);
check(nearest.metrics.every(m => m.value === null) && nearest.geometry === null, "Nearest source cannot donate selected properties");
check(parseContextDetailsV2(nearest, nearest.subjectId, nearest.anchor, "point_radius"), "Honest nearest unknowns remain parseable");
for (const association of ["reverse_nearest_indexed_object_not_point_in_polygon", "open_map_geometry_contains_point"]) {
  const contextPack = clone(pack); contextPack.resolution.coordinateAssociation = association;
  const contextSubject = clone(publicSubject); contextSubject.coordinateAssociation = association;
  contextSubject.normalizedContext = normalizePointObjectContext(contextPack);
  contextSubject.evidenceReceipt.lookupSourceFeatureId = null;
  check(parseLiveResolvedObject(contextSubject), "Legitimate reverse/contains V2 retains null lookup and unknown selected measurements");
}
const tempPack = clone(pack); tempPack.selectedObject.tags = { "tag.building": "tent", "tag.leisure": "outdoor_seating", "tag.building:levels": "3" };
check(contextDetailsFromEvidence(tempPack).metrics.find(m => m.id === "levels").value === null, "Tent/seating tags cannot certify permanent floors");
check(contextDetailsFromEvidence(tempPack).semanticWarnings.length === 2, "Temporary shelter and outdoor-seating qualifications retain source-specific interpretation limits");
check(normalizeOverpassUrbanFabric({ elements: [{ type: "node", id: 54, lon: anchor[0], lat: anchor[1], tags: { leisure: "outdoor_seating" } }] }, anchor).groups.every(g => g.group !== "open_space"), "Outdoor seating is not a park");
for (const raw of ["3;5", "approx 10", "-1", "NaN", "1201 m"]) check(contextExplicitTag(raw, "m") === null, "Invalid explicit numeric tag is unknown, not zero or inferred");
for (const edit of [c => c.metrics[0].unit = "count", c => c.metrics[0].method = "explicit_osm_tag", c => c.metrics[0].scope = "user_aoi", c => c.sources[0].officialLiveStatus = "official_live", c => c.geometry.coordinates[0][1] = c.geometry.coordinates[0][3], c => c.metrics[0].officiallyVerified = true]) {
  const bad = clone(normalized.details); edit(bad);
  check(parseContextDetailsV2(bad, bad.subjectId, bad.anchor, "point_radius") === null, "Physical unit/method/scope/geometry contradictions fail closed");
}
for (const locale of ["en", "ru"]) {
  const html = renderToStaticMarkup(React.createElement(PointObjectContextDashboard, { context: reopened.normalizedContext, locale }));
  check(html.includes("BinSina Pharmacy") && html.includes("context-physical-footprint_area") && html.includes("independent-service-brief"), "Free context surface renders physical metrics and new service before paid analysis");
  check(html.includes("/data/d2-overture/LICENSES.json") && html.includes("Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."), "Licence and exact caveat retained in both locales");
  check(html.includes("aria-pressed") && html.includes("tabindex=\"0\"") && html.includes("aria-live=\"polite\""), "Keyboard/select/polite announcement hooks present (not browser certification)");
  check(/data-testid="context-linked-map"/.test(html) && /<details[^>]+open=""[^>]+data-testid="context-linked-map"/.test(html), "Linked physical metric map is expanded by default, not an invisible outline");
  const unknownHtml = renderToStaticMarkup(React.createElement(IndependentSourceContext, { context: independent.buildIndependentContext(null, "way/123", anchor, now), locale }));
  check(unknownHtml.includes("unsupported_scope") && !unknownHtml.includes("independent-service-brief"), "Unsupported coverage does not render service claims");
}
const licence = JSON.parse(readFileSync(path.join(root, "public/data/d2-overture/LICENSES.json"), "utf8"));
check(licence.subsetSha256 === independent.OVERTURE_SNAPSHOT_HASH && licence.licenseText.includes("2.1. A Data Recipient may share Data"), "Full sharing licence accompanies admitted data");
console.log(JSON.stringify({ status: "PASS", checks, node: process.version, typescript: ts.version, actualSourceHash: independent.OVERTURE_SNAPSHOT_HASH, admittedCounts: actual.map(c => c.sampleSize), u3Interior: actual[2].interiorSampleSize, networkCalls: 0, injectedRequests, browser: "not run; Control/independent QA owns browser and usefulness", scope: "admitted bytes → server evidence → normalized contract → strict save/reopen → EN/RU server rendering" }));
