// Browser-safe observation of already received public contracts. No transport,
// storage, credentials, server imports or source/provider execution belongs here.
import { parseLiveResolvedObject, parsePointObjectAiResponse } from "../../../components/point-to-object/live-session";
import { isPointObjectFindResult } from "./point-to-object-find-session";
import { isPointObjectAreaContextResult, parsePointObjectCreateAoi, parsePointObjectGeneratedConcept } from "./point-to-object-create-result";
import { parsePointObjectComparisonInsight } from "./point-to-object-comparison-core";
import { createProgrammeSourceBinding } from "./point-to-object-programme-context";
import { parsePublicEvidenceReceipt } from "./point-to-object-evidence-receipt";
export const VERIFICATION_RESPONSE_MAX_BYTES = 2 * 1024 * 1024;
export const VERIFICATION_BUNDLE_MAX_BYTES = 4 * 1024 * 1024;
export const VERIFICATION_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
export type VerificationOperation = "context" | "find" | "area-context" | "analyse" | "compare" | "create";
export type VerificationRecord = { operation: VerificationOperation; originalSubmissionIntent: unknown; sourceSnapshot: unknown; response: unknown; submittedAt: string; completedAt: string };
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Shape = "primitive" | "coordinates" | { array: Shape } | { fields: Record<string, Shape> };
const P = "primitive" as const;
const array = (item: Shape): Shape => ({ array: item });
const fields = (names: string, children: Record<string, Shape> = {}): Shape => {
  const result: Record<string, Shape> = Object.create(null);
  for (const name of names.split(/\s+/).filter(Boolean)) result[name] = P;
  for (const name of Object.keys(children)) result[name] = children[name];
  return { fields: result };
};
const numbers: Shape = "coordinates";
const geometry = fields("type", { coordinates: numbers });
const receipt = fields("version evidencePackHash sourceResponseHash acquiredAt createdAt expiresAt cacheWindow sourceLocale lookupSourceFeatureId");
const source = fields("name service sourceResponseHash observedAt acquiredAt licenceId attribution licenceUrl officialStatus runtimeNetworkUsed persistenceUsed freshness usagePolicyUrl responseHash sourceId endpoint referenceUrl dataset apiVersion timeStandard observedStart observedEnd responseBytes endpointHost sourceResponseBytes sourceRevisionId entityModifiedAt cacheExpiresAt accessPolicyUrl");
const publicTagNames = "name name:en name:ru name:ar building building:levels building:min_level building:part height min_height start_date heritage architectural_style wheelchair access surface landuse office shop amenity tourism leisure highway railway public_transport natural water aeroway historic man_made wikidata wikipedia brand operator addr:housenumber addr:street addr:city addr:postcode addr:country addr:suburb addr:district construction";
const tags = fields(`${publicTagNames} ${publicTagNames.split(" ").map(key => `tag.${key}`).join(" ")} classification.category classification.type classification.address_type`);
const address = fields("house_number road pedestrian neighbourhood suburb quarter city_district city town village municipality county state state_district region postcode country country_code borough building residential hamlet island district province allotments industrial commercial amenity tourism leisure shop office historic place");
const metrics = fields("footprintAreaSqM footprintPerimeterM method geometryGeneralized");
const group = fields("group count sharePct nearestDistanceM");
const geoContext = fields("radiusM coverage sampleSize capReached mappedBuildingCount mappedLevelsKnownCount medianMappedLevels nearestTransitM nearestMajorRoadM", {
  groups: array(group), districtCharacter: fields("code confidence ruleVersion", { driverGroups: array(P) })
});
const normalized = fields("version subjectId coverage sampleSize capReached completeInventory", {
  scope: fields("kind radiusM", { anchor: numbers }), source,
  metrics: array(fields("id group value unit status method evidenceRef")),
  places: array(fields("id name group distanceM evidenceRef", { coordinates: numbers })),
  programmeChecks: array(fields("group mappedCount capacity adequacy nextCheck"))
});
const linkedEntity = fields("contractVersion qid", {
  labels: fields("en ru"), source,
  identity: fields("identityReceiptHash qid osmSourceFeatureId osmGeometryHash basis linkedCoordinateDistanceM polygonBoundaryToleranceM nodeOrComplexMaxDistanceM countryMatch typeMatch scope"),
  statements: array(fields("statementReceiptHash identityReceiptHash sourceResponseHash sourceRevisionId qid propertyId statementId rank", {
    value: fields("kind entityId time precision calendarModel amount numericValue unit unitEntityId lowerBound upperBound longitude latitude globe"), qualifiers: array(fields(""))
  })), conflictingPropertyIds: array(P)
});
const climate = fields("version status year sourceId reason proofLimit", {
  requestedPoint: numbers, months: array(fields("month temperatureC maximumTemperatureC relativeHumidityPct")), source
});
const subject = fields("name address featureClass sourceFeatureId geometryType coordinateAssociation resultCentroidDistanceM geometryProvenance renderHeightM renderMinHeightM resolutionMethod sourceLabel", {
  addressParts: address, tags, metrics, geoContext, linkedEntity, climate, displayGeometry: geometry,
  normalizedContext: normalized, fabricDiagnostic: fields("failureCode"), evidenceReceipt: receipt
});
const trace = fields("attempt purpose model reasoningEffort requestId inputTokens cachedInputTokens cacheWriteTokens outputTokens totalTokens estimatedCostUsd");
const telemetry = fields("provider schemaVersion model reasoningEffort depth promptVersion requestId latencyMs attempts inputTokens cachedInputTokens cacheWriteTokens outputTokens totalTokens estimatedCostUsd costRateSource stored toolCalls", { attemptTrace: array(trace) });
const claim = fields("statement", { evidenceRefs: array(P) });
const signal = fields("title observation implication evidenceClass confidence", { evidenceRefs: array(P) });
const request = fields("role scenario depth goal perspective horizon question focused locale");
const content = fields("caveat", {
  initialSemanticBrief: fields("confidence", { codes: fields("subject context access implication"), subject: claim, context: claim, access: claim, implication: claim }),
  decisionBrief: fields("headline disposition summary confidence", { reasons: array(claim) }), signals: array(signal),
  opportunities: array(fields("title hypothesis rationale potentialValue confidence", { evidenceRefs: array(P), evidenceNeeded: array(P) })),
  risks: array(fields("title statement decisionImpact severity confidence", { evidenceRefs: array(P) })),
  sourceFacts: array(claim), locationContext: array(claim),
  nextValidation: array(fields("title action source decisionImpact priority", { evidenceRefs: array(P) })),
  answerToQuestion: fields("statement status scope confidence perspective horizon", { evidenceRefs: array(P), missingEvidence: array(P) }), geoContext,
  depthReview: fields("depth basis purpose", { analyticChecks: array(signal), alternatives: array(fields("title rationale evidenceClass", { evidenceRefs: array(P) })), uncertainties: array(fields("title statement decisionImpact", { evidenceRefs: array(P) })), decisionTriggers: array(fields("title action decisionImpact", { evidenceRefs: array(P) })) })
});
const candidate = fields("sourceFeatureId sourceElementType sourceElementId label name longitude latitude group mappedBuildingLevels evidenceClass geometryProvenance geometryStatus renderHeightM renderMinHeightM", { matchedTag: fields("key value"), observedTags: tags, geometry });
const findIntent = fields("marketKey locale group mappedMinimumLevels mappedMaximumLevels limit", { bounds: numbers });
const areaIntent = fields("marketKey locale", { aoiCoordinates: numbers });
const coverage = fields("kind inclusionMethod geometryCoverage upstreamElementCount normalizedInsideCount returnedFeatureCount upstreamQueryLimit featureReturnLimit capReached completeInventory approximateAreaSqKm normalizedCandidateCount returnedCandidateCount mappedLevelsPolicy");
const find = fields("protocol mode ordering caveat", { criteria: findIntent, candidates: array(candidate), coverage, source, limitations: array(P) });
const area = fields("protocol mode caveat", {
  request: areaIntent, area: fields("areaSqM perimeterM", { centroid: fields("longitude latitude") }),
  features: array(fields("sourceFeatureId longitude latitude label group mappedBuildingLevels inclusionMethod", { observedTags: tags })),
  summary: fields("sampleSize namedFeatureCount mappedBuildingCount mappedLevelsKnownCount medianMappedLevels nearestTransitM nearestMajorRoadM", { groups: array(group) }), coverage, source, limitations: array(P)
});
const aoi = fields("id areaSqM perimeterM vertexCount", { coordinates: numbers });
const controls = fields("massingStyle blockCount levelsMin levelsMax targetSiteCoveragePct openSpacePct setbackM");
const programme = fields("schemaVersion templateId title summary massingStyle blockCount levelsMin levelsMax targetSiteCoveragePct openSpacePct setbackM", { useMix: array(fields("use sharePct")), rationale: array(P) });
const massing = fields("variantId massingStyle requestedBlockCount generatedBlockCount generatedFeatureCount aoiAreaSqM generatedFootprintAreaSqM achievedSiteCoveragePct estimatedFloorAreaSqM minGeneratedLevels maxGeneratedLevels seed", {
  featureCollection: fields("type", { features: array(fields("type id", { geometry, properties: fields("id kind templateId massingStyle variantId volumeRole primaryBlock use levels heightM baseM supportingPodiumId footprintForm label") })) })
});
const createSourceUse = fields("sourceResponseHash sampleSize mappedBuildingCount capReached inclusionMethod completeInventory");
const analysisIntent = fields("caseKey longitude latitude locale role scenario question depth goal perspective horizon expectedSourceFeatureId consent", { evidenceReceipt: receipt });
const intents: Record<VerificationOperation, Shape> = {
  context: fields("caseKey longitude latitude locale expectedSourceFeatureId"), find: findIntent, "area-context": areaIntent,
  analyse: analysisIntent,
  compare: fields("caseKey longitude latitude locale role scenario question depth goal perspective horizon expectedSourceFeatureId consent", { evidenceReceipt: receipt, comparison: array(fields("longitude latitude expectedSourceFeatureId", { evidenceReceipt: receipt })) }),
  create: fields("marketKey locale depth templateId customPrompt", { controls, lockedControlKeys: array(P), aoiCoordinates: numbers })
};
const responses: Record<VerificationOperation, Shape> = {
  context: fields("mode schemaVersion", { subject, evidenceReceipt: receipt }), find, "area-context": area,
  analyse: fields("mode schemaVersion generatedAt evidencePackId evidencePackHash", { request, content, subject, telemetry, answerProvenance: fields("kind rejectionCode") }),
  compare: fields("mode version generatedAt locale role scenario caveat", { snapshots: array(fields("sourceFeatureId evidencePackHash label")), summary: claim, differences: array(claim), checks: array(fields("candidateId action", { evidenceRefs: array(P) })), telemetry }),
  create: fields("mode generatedAt promptVersion caveat", { program: programme, massing, alternatives: array(fields("id label", { massing })), areaContextUsed: createSourceUse, telemetry })
};
const sources = fields("", { context: subject, contexts: array(subject), cohort: find, areaContext: area, aoi });
const selection = fields("mode marketKey locale longitude latitude sourceFeatureId", { aoiCoordinates: numbers, candidateIds: array(P) });
const unsafeValue = /(?:Bearer\s+[A-Za-z0-9._~-]+|\bsk-[A-Za-z0-9_-]{16,}|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
function publicText(value: string): boolean {
  if (unsafeValue.test(value)) return false;
  for (const match of value.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    try {
      const url = new URL(match[0]);
      if (url.username || url.password || [...url.searchParams.keys()].some(key => /(?:token|secret|password|api[-_]?key|^key$|signature|authorization|credential)/i.test(key))) return false;
    } catch { return false; }
  }
  return true;
}

function project(value: unknown, shape: Shape, depth = 0): Json {
  if (depth > 32) throw new Error("EXPORT_DEPTH_REFUSED");
  if (value === null) return null;
  if (shape === "coordinates") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(item => project(item, shape, depth + 1));
    throw new Error("EXPORT_COORDINATES_REFUSED");
  }
  if (shape === P) {
    if (typeof value === "string" && publicText(value)) return value;
    if (typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return value;
    throw new Error("EXPORT_VALUE_REFUSED");
  }
  if ("array" in shape) {
    if (!Array.isArray(value)) throw new Error("EXPORT_ARRAY_REFUSED");
    return value.map(item => project(item, shape.array, depth + 1));
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error("EXPORT_OBJECT_REFUSED");
  const result: Record<string, Json> = Object.create(null);
  for (const key of Object.keys(value).sort()) {
    if (!Object.hasOwn(shape.fields, key)) throw new Error("EXPORT_UNKNOWN_FIELD_REFUSED");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) throw new Error("EXPORT_ACCESSOR_REFUSED");
    if (descriptor.value !== undefined) result[key] = project(descriptor.value, shape.fields[key], depth + 1);
  }
  return result;
}
function sized(value: Json, limit: number): string {
  const json = JSON.stringify(value);
  if (new TextEncoder().encode(json).byteLength > limit) throw new Error("EXPORT_SIZE_REFUSED");
  return json;
}
export function canonicalVerificationIntent(operation: VerificationOperation, intent: unknown): string {
  return sized(project(intent, intents[operation]), VERIFICATION_RESPONSE_MAX_BYTES);
}
// Synchronous public copies are taken before dispatch, never from a later render.
// The caller catches failures so observation cannot change main submission.
export function snapshotVerificationSubmission(operation: VerificationOperation, intent: unknown, sourceSnapshot: unknown) {
  const originalSubmissionIntent = project(intent, intents[operation]);
  const source = project(sourceSnapshot, sources);
  sized(originalSubmissionIntent, VERIFICATION_RESPONSE_MAX_BYTES);
  sized(source, VERIFICATION_BUNDLE_MAX_BYTES);
  return { originalSubmissionIntent, sourceSnapshot: source };
}
export function snapshotVerificationResponse(operation: VerificationOperation, response: unknown) {
  const result = project(response, responses[operation]);
  sized(result, VERIFICATION_RESPONSE_MAX_BYTES);
  return result;
}
export async function verificationSha256(json: string): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}
const row = (value: Json): { [key: string]: Json } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
  return value;
};
function correspondence(operation: VerificationOperation, intent: Json, response: Json, sourceSnapshot: Json) {
  const i = row(intent); const r = row(response); const s = row(sourceSnapshot);
  if (operation === "context") {
    if (r.mode !== "resolved" || r.schemaVersion !== 2) throw new Error("EXPORT_RESPONSE_REFUSED");
    const c = row(r.subject);
    if (i.expectedSourceFeatureId && c.sourceFeatureId !== i.expectedSourceFeatureId) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    const lease = parsePublicEvidenceReceipt(r.evidenceReceipt);
    if (!lease || JSON.stringify(r.evidenceReceipt) !== JSON.stringify(c.evidenceReceipt) || lease.lookupSourceFeatureId !== (i.expectedSourceFeatureId ?? null) || lease.sourceLocale !== (i.locale === "ru" ? "ru,en" : "en")) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    if (c.normalizedContext) {
      const anchor = row(row(c.normalizedContext).scope).anchor;
      if (typeof i.longitude !== "number" || typeof i.latitude !== "number" || JSON.stringify(anchor) !== JSON.stringify([Number(i.longitude.toFixed(6)), Number(i.latitude.toFixed(6))])) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    }
  } else if (operation === "find" || operation === "area-context") {
    if (r.mode !== "results" && r.mode !== "empty") throw new Error("EXPORT_RESPONSE_REFUSED");
    if (JSON.stringify(row(operation === "find" ? r.criteria : r.request)) !== JSON.stringify(i)) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    if (operation === "area-context" && (!parsePointObjectCreateAoi(s.aoi) || JSON.stringify(row(s.aoi).coordinates) !== JSON.stringify(i.aoiCoordinates))) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
  } else if (operation === "analyse") {
    if (r.mode !== "openai" || r.schemaVersion !== 6 || r.evidencePackHash !== row(i.evidenceReceipt).evidencePackHash) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    const q = row(r.request);
    if (!parseLiveResolvedObject(s.context) || JSON.stringify(row(s.context).evidenceReceipt) !== JSON.stringify(i.evidenceReceipt) || row(s.context).sourceFeatureId !== row(r.subject).sourceFeatureId) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    for (const key of ["locale", "role", "scenario", "depth", "goal", "perspective", "horizon", "question"]) if (q[key] !== i[key]) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    if (i.expectedSourceFeatureId && row(r.subject).sourceFeatureId !== i.expectedSourceFeatureId) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
  } else if (operation === "compare") {
    if (r.mode !== "openai_comparison" || r.version !== "POINT_OBJECT_COMPARISON_V1" || r.locale !== i.locale || r.role !== i.role || r.scenario !== i.scenario || !Array.isArray(r.snapshots) || !Array.isArray(i.comparison) || r.snapshots.length !== i.comparison.length) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    for (let index = 0; index < i.comparison.length; index++) {
      const expected = row(i.comparison[index]); const actual = row(r.snapshots[index]);
      if (expected.expectedSourceFeatureId !== actual.sourceFeatureId || row(expected.evidenceReceipt).evidencePackHash !== actual.evidencePackHash) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
      if (!Array.isArray(s.contexts) || !s.contexts.some(context => parseLiveResolvedObject(context) && row(context).sourceFeatureId === expected.expectedSourceFeatureId && JSON.stringify(row(context).evidenceReceipt) === JSON.stringify(expected.evidenceReceipt) && row(context).name === actual.label)) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
    }
  } else {
    if (r.mode !== "openai_concept" || !r.promptVersion || !row(r.massing).seed || !Object.hasOwn(r, "areaContextUsed") || JSON.stringify(row(s.aoi).coordinates) !== JSON.stringify(i.aoiCoordinates)) throw new Error("EXPORT_LEGACY_OR_CORRESPONDENCE_REFUSED");
    const heldAoi = parsePointObjectCreateAoi(s.aoi);
    const generated = heldAoi && parsePointObjectGeneratedConcept(r, heldAoi);
    if (!heldAoi || !generated || (r.areaContextUsed !== null && createProgrammeSourceBinding(heldAoi, isPointObjectAreaContextResult(s.areaContext) ? s.areaContext : null, generated, i.locale === "ru" ? "ru" : i.locale === "en" ? "en" : null).status !== "matched") || (r.areaContextUsed !== null && row(row(s.areaContext).request).marketKey !== i.marketKey)) throw new Error("EXPORT_CORRESPONDENCE_REFUSED");
  }
  if (["analyse", "compare", "create"].includes(operation)) {
    const t = row(r.telemetry);
    if (!t.model || !Number.isInteger(t.attempts) || typeof t.latencyMs !== "number") throw new Error("EXPORT_TELEMETRY_REFUSED");
  }
}
function validResponse(operation: VerificationOperation, response: Json, sourceSnapshot: Json) {
  const r = row(response);
  const valid = operation === "context" ? parseLiveResolvedObject(r.subject) : operation === "find" ? isPointObjectFindResult(r) : operation === "area-context" ? isPointObjectAreaContextResult(r) : operation === "analyse" ? parsePointObjectAiResponse(r) : operation === "compare" ? parsePointObjectComparisonInsight(r) : (() => {
    const aoi = parsePointObjectCreateAoi(row(sourceSnapshot).aoi);
    return aoi && parsePointObjectGeneratedConcept(r, aoi);
  })();
  if (!valid) throw new Error("EXPORT_RESPONSE_REFUSED");
}
export async function createVerificationBundle(enabled: boolean, input: { preSubmit: { operation: VerificationOperation; intent: unknown; sourceSnapshot: unknown } | null; records: readonly VerificationRecord[]; currentSelection: unknown }) {
  if (enabled !== true) throw new Error("EXPORT_PREVIEW_ONLY");
  const currentSelection = project(input.currentSelection, selection);
  const records: Json[] = [];
  for (const record of input.records) {
    if (!Number.isFinite(Date.parse(record.submittedAt)) || !Number.isFinite(Date.parse(record.completedAt)) || record.completedAt < record.submittedAt) throw new Error("EXPORT_TIME_REFUSED");
    const originalSubmissionIntent = project(record.originalSubmissionIntent, intents[record.operation]);
    const sourceSnapshot = project(record.sourceSnapshot, sources);
    const response = project(record.response, responses[record.operation]);
    sized(response, VERIFICATION_RESPONSE_MAX_BYTES);
    validResponse(record.operation, response, sourceSnapshot);
    correspondence(record.operation, originalSubmissionIntent, response, sourceSnapshot);
    if (record.operation === "create") {
      const aoiHash = await verificationSha256(JSON.stringify(row(originalSubmissionIntent).aoiCoordinates));
      const r = row(response); const seed = row(r.massing).seed;
      if (typeof seed !== "string" || !seed.startsWith(`${r.promptVersion}:${aoiHash}:`) || Array.isArray(r.alternatives) && r.alternatives.some(option => typeof row(row(option).massing).seed !== "string" || !(row(row(option).massing).seed as string).startsWith(`${r.promptVersion}:${aoiHash}:`))) throw new Error("EXPORT_SEED_AOI_REFUSED");
    }
    const payloadSha256 = await verificationSha256(sized(originalSubmissionIntent, VERIFICATION_RESPONSE_MAX_BYTES));
    records.push({ operation: record.operation, originalSubmissionIntent, payloadSha256, sourceSnapshot, response, submittedAt: record.submittedAt, completedAt: record.completedAt, correspondence: "captured_by_original_ui_handler_not_server_signed" });
  }
  let preSubmit: Json = null;
  if (input.preSubmit) {
    const intent = project(input.preSubmit.intent, intents[input.preSubmit.operation]);
    preSubmit = { operation: input.preSubmit.operation, intent, payloadSha256: await verificationSha256(sized(intent, VERIFICATION_RESPONSE_MAX_BYTES)), sourceSnapshot: project(input.preSubmit.sourceSnapshot, sources), status: "current_ui_intent_not_yet_submitted" };
  }
  if (!records.length && !preSubmit) throw new Error("EXPORT_LEGACY_OR_EMPTY_REFUSED");
  const bundle: Json = { protocol: "GEOAI_PREVIEW_VERIFICATION_V1", exportedAt: new Date().toISOString(), hashScope: "canonical_ui_intent_excluding_challenge_cookie_headers_not_wire_or_server_signed", preSubmit, currentSelection, records, caveat: VERIFICATION_CAVEAT };
  return sized(bundle, VERIFICATION_BUNDLE_MAX_BYTES);
}
