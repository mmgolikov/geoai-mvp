import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, canonicalize(entry)]));
  return value;
}

function semanticHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

async function loadAiCore(): Promise<Record<string, any>> {
  const file = path.join(process.cwd(), "src/lib/prototype/point-to-object-ai-core.ts");
  let source = readFileSync(file, "utf8");
  source = source.replace(/from "\.\/point-to-object-climate-contract"/,
    `from ${JSON.stringify(pathToFileURL(path.join(process.cwd(), "src/lib/prototype/point-to-object-climate-contract.ts")).href)}`);
  source = source.replace(
    /import \{ LIVE_POINT_CAVEAT \} from "@\/src\/lib\/point-to-object\/contracts";\n/,
    `const LIVE_POINT_CAVEAT = ${JSON.stringify(CAVEAT)};\n`
  );
  source = source.replace(
    /import \{ semanticHash \} from "@\/src\/lib\/point-to-object\/hash";\n/,
    `import { createHash } from "node:crypto";\nconst semanticHash = (value) => { const canonicalize = (entry) => Array.isArray(entry) ? entry.map(canonicalize) : entry && typeof entry === "object" ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)])) : entry; return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex"); };\n`
  );
  source = source.replace(
    /import \{\n  POINT_OBJECT_ANALYSIS_DEPTH_CONTRACT_VERSION,[\s\S]*?\} from "\.\/point-to-object-analysis-depth-contract";\n/,
    `const POINT_OBJECT_ANALYSIS_DEPTH_CONTRACT_VERSION = "POINT_OBJECT_DEPTH_CONTRACT_V1_2026_09_12";\nconst pointObjectAnalysisDepthContract = (depth) => ({\n  quick: { depth: "quick", purpose: "identity_evidence", selectionCounts: { decisionReasons: 2, signals: 3, opportunities: 1, risks: 2 }, reviewCounts: { criteria: 2, alternatives: 0, counterEvidence: 1, decisionTriggers: 1 }, instruction: "quick" },\n  standard: { depth: "standard", purpose: "decision_criteria", selectionCounts: { decisionReasons: 3, signals: 4, opportunities: 2, risks: 3 }, reviewCounts: { criteria: 3, alternatives: 1, counterEvidence: 2, decisionTriggers: 2 }, instruction: "standard" },\n  deep: { depth: "deep", purpose: "decision_challenge", selectionCounts: { decisionReasons: 4, signals: 5, opportunities: 3, risks: 3 }, reviewCounts: { criteria: 4, alternatives: 2, counterEvidence: 3, decisionTriggers: 3 }, instruction: "deep" }\n}[depth]);\n`
  );
  const javascript = stripTypeScriptTypes(source, { mode: "transform", sourceMap: false });
  try {
    return await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`) as Record<string, any>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI core import failed";
    throw new Error(message.slice(-800));
  }
}

function geoContext(sparse = false) {
  return {
    radiusM: 400,
    coverage: sparse ? "unavailable" : "available",
    sampleSize: sparse ? 0 : 16,
    capReached: false,
    groups: sparse ? [] : [
      { group: "transport", count: 4, sharePct: 25, nearestDistanceM: 120 },
      { group: "access", count: 3, sharePct: 18.8, nearestDistanceM: 85 },
      { group: "commercial", count: 3, sharePct: 18.8, nearestDistanceM: 160 },
      { group: "hospitality", count: 2, sharePct: 12.5, nearestDistanceM: 70 },
      { group: "other_built", count: 4, sharePct: 25, nearestDistanceM: 45 }
    ],
    mappedBuildingCount: sparse ? 0 : 4,
    mappedLevelsKnownCount: sparse ? 0 : 2,
    medianMappedLevels: sparse ? null : 22,
    nearestTransitM: sparse ? null : 120,
    nearestMajorRoadM: sparse ? null : 85,
    districtCharacter: {
      code: sparse ? "low_signal" : "commercial_business",
      confidence: sparse ? "low" : "medium",
      ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
      driverGroups: sparse ? [] : ["commercial", "transport"]
    }
  };
}

export function evidencePack(sparse = false, market: "dubai" | "singapore" = "dubai", named = true): any {
  // Synthetic semantic fixtures, not observations of actual buildings or districts.
  const city = market === "singapore" ? "Singapore" : "Dubai";
  const country = market === "singapore" ? "Singapore" : "United Arab Emirates";
  const longitude = market === "singapore" ? 103.86 : 55.27;
  const latitude = market === "singapore" ? 1.28 : 25.2;
  const name = named ? (market === "singapore" ? "Synthetic Marina Hotel" : "Harbour Hotel") : null;
  const displayAddress = named ? `${name}, ${city}` : null;
  const addressParts = named ? { city, country } : {};
  const context = geoContext(sparse);
  const summary = {
    radiusM: context.radiusM,
    coverage: context.coverage,
    sampleSize: context.sampleSize,
    capReached: context.capReached,
    groups: context.groups,
    mappedBuildingCount: context.mappedBuildingCount,
    mappedLevelsKnownCount: context.mappedLevelsKnownCount,
    medianMappedLevels: context.medianMappedLevels,
    nearestTransitM: context.nearestTransitM,
    nearestMajorRoadM: context.nearestMajorRoadM
  };
  const sourceFeatureId = "way/101";
  const metrics = { footprintAreaSqM: 4100, footprintPerimeterM: 280, method: "local_equirectangular_wgs84_approximation", geometryGeneralized: true };
  const nearby = sparse ? [] : [
    {
      evidenceId: "EVD-CONTEXT-1",
      sourceFeatureId: "node/202",
      name: "Metro Gate",
      categories: ["public_transport:station", "railway:station"],
      featureClass: "public_transport:station",
      distanceM: 120,
      method: "overpass_around_query_element_center_haversine",
      proofLimit: "bounded"
    },
    {
      evidenceId: "EVD-CONTEXT-2",
      sourceFeatureId: "way/203",
      name: "Harbour Offices",
      categories: ["commercial", "office"],
      featureClass: "office",
      distanceM: 160,
      method: "overpass_around_query_element_center_haversine",
      proofLimit: "bounded"
    }
  ];
  const evidence: any[] = [
    { id: "EVD-COORDINATES", label: "point", sourceId: "user_point", value: JSON.stringify({ longitude, latitude, crs: "EPSG:4326" }) },
    { id: "EVD-OSM-OBJECT", label: "object", sourceId: sourceFeatureId, value: JSON.stringify({ sourceFeatureId, name }) },
    { id: "EVD-CLASSIFICATION", label: "class", sourceId: sourceFeatureId, value: JSON.stringify({ sourceFeatureId, featureClass: "tourism:hotel" }) },
    { id: "EVD-ADDRESS", label: "address", sourceId: sourceFeatureId, value: JSON.stringify({ sourceFeatureId, displayAddress, addressParts }) },
    { id: "EVD-GEOMETRY", label: "geometry", sourceId: sourceFeatureId, value: JSON.stringify({ sourceFeatureId, geometryType: "Polygon", geometryHash: "a".repeat(64) }) },
    { id: "EVD-OBJECT-METRICS", label: "metrics", sourceId: sourceFeatureId, value: JSON.stringify({ sourceFeatureId, geometryHash: "a".repeat(64), metrics }) },
    { id: "EVD-ALLOWED-FIELDS", label: "fields", sourceId: sourceFeatureId, value: JSON.stringify({ sourceFeatureId, tags: { "tag.building": "hotel", "tag.building:levels": "30", "tag.height": "200", "tag.tourism": "hotel" } }) },
    { id: "EVD-SOURCE", label: "source", sourceId: "SPAT-001", value: "© OpenStreetMap contributors; ODbL 1.0" },
    { id: "EVD-CONTEXT-SUMMARY", label: "context", sourceId: "SPAT-001", value: JSON.stringify(summary) },
    { id: "EVD-DISTRICT-PROFILE", label: "district", sourceId: "derived:POINT_OBJECT_DISTRICT_RULE_V1", value: JSON.stringify({ summaryHash: semanticHash(summary), districtCharacter: context.districtCharacter }) },
    ...nearby.map((item) => ({
      id: item.evidenceId,
      label: item.name,
      sourceId: item.sourceFeatureId,
      value: JSON.stringify({ sourceFeatureId: item.sourceFeatureId, name: item.name, categories: item.categories, featureClass: item.featureClass, distanceM: item.distanceM, method: item.method })
    })),
    ...Array.from({ length: 38 }, (_, index) => ({ id: `EVD-EXTRA-${String(index + 1).padStart(2, "0")}`, label: `bounded extra ${index + 1}`, sourceId: `extra/${index + 1}`, value: `extra ${index + 1}` }))
  ];
  return {
    protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2",
    coordinates: { longitude, latitude, crs: "EPSG:4326" },
    resolution: { matchMethod: "nominatim_lookup", coordinateAssociation: "open_map_geometry_contains_point", resultCentroidDistanceM: 5 },
    selectedObject: {
      sourceFeatureId,
      name,
      displayAddress,
      featureClass: "tourism:hotel",
      geometryType: "Polygon",
      geometryHash: "a".repeat(64),
      addressParts,
      tags: { "tag.building": "hotel", "tag.building:levels": "30", "tag.height": "200", "tag.tourism": "hotel" },
      metrics
    },
    linkedEntity: null,
    nearbyContext: nearby,
    geoContext: context,
    evidence
  };
}

const requests = [
  { depth: "standard", goal: "development_screening", perspective: "developer", horizon: "current", question: null, locale: "en" },
  { depth: "standard", goal: "due_diligence", perspective: "investor", horizon: "long_term", question: null, locale: "en" },
  { depth: "standard", goal: "redevelopment", perspective: "asset_owner", horizon: "one_to_three_years", question: null, locale: "en" }
] as const;

function rawPlan() {
  return {
    decision: { path: "existing_asset_screen", disposition: "continue_screening", confidence: "medium", reasonCodes: ["object_identity_available", "use_classification_available", "nearby_context_available"] },
    signalCodes: ["object_identity", "use_classification", "building_form", "address_context"],
    opportunityCodes: ["existing_asset_repositioning", "redevelopment_envelope_test"],
    risks: [
      { code: "non_official_source", severity: "high", confidence: "medium" },
      { code: "identity_uncertainty", severity: "high", confidence: "low" },
      { code: "geometry_not_parcel", severity: "high", confidence: "low" }
    ],
    answerCode: null,
    focusedAnswer: null,
    caveat: CAVEAT
  };
}

function linkedEntityForPack(coordinatePrecision: number | null = 1 / 3600) {
  const qid = "Q777";
  const source = {
    sourceId: "WIKIDATA-ENTITY",
    dataset: "Wikidata",
    service: "MediaWiki Action API",
    endpointHost: "www.wikidata.org",
    sourceResponseHash: "b".repeat(64),
    sourceResponseBytes: 1200,
    sourceRevisionId: 77,
    entityModifiedAt: "2026-08-30T00:00:00.000Z",
    acquiredAt: "2026-09-06T09:00:00.000Z",
    cacheExpiresAt: "2026-09-07T09:00:00.000Z",
    licenceId: "CC0-1.0",
    licenceUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    accessPolicyUrl: "https://www.wikidata.org/wiki/Wikidata:Data_access/en",
    usagePolicyUrl: "https://www.mediawiki.org/wiki/API:Etiquette",
    officialStatus: "community_structured_data_not_official_asset_record"
  };
  const identityCore = {
    qid,
    osmSourceFeatureId: "way/101",
    osmGeometryHash: "a".repeat(64),
    basis: "polygon_coordinate_inside_or_boundary_tolerance",
    linkedCoordinateDistanceM: 8,
    polygonBoundaryToleranceM: 20,
    nodeOrComplexMaxDistanceM: 250,
    countryMatch: "matched",
    typeMatch: "compatible",
    scope: "linked_community_entity_not_certified_selected_footprint"
  };
  const identity = { identityReceiptHash: semanticHash(identityCore), ...identityCore };
  const statements = [
    ["P31", "entity", { kind: "entity", entityId: "Q27686" }],
    ["P625", "coordinate", { kind: "coordinate", longitude: 55.2708, latitude: 25.2048, precision: coordinatePrecision, globe: "http://www.wikidata.org/entity/Q2" }],
    ["P2048", "height-a", { kind: "quantity", amount: "+321.4", numericValue: 321.4, unit: "metre", unitEntityId: "Q11573", lowerBound: null, upperBound: null }],
    ["P2048", "height-b", { kind: "quantity", amount: "+330", numericValue: 330, unit: "metre", unitEntityId: "Q11573", lowerBound: null, upperBound: null }],
    ["P1101", "floors", { kind: "quantity", amount: "+68", numericValue: 68, unit: "count", unitEntityId: null, lowerBound: null, upperBound: null }]
  ].map(([propertyId, suffix, value]) => {
    const core = {
      identityReceiptHash: identity.identityReceiptHash,
      sourceResponseHash: source.sourceResponseHash,
      sourceRevisionId: source.sourceRevisionId,
      qid,
      propertyId,
      statementId: `${qid}$${suffix}`,
      rank: "normal",
      value,
      qualifiers: []
    };
    return { statementReceiptHash: semanticHash(core), ...core };
  });
  return { contractVersion: "POINT_OBJECT_WIKIDATA_ENTITY_V1", qid, labels: { en: "Linked Harbour Complex", ru: "Комплекс Harbour" }, source, identity, statements, conflictingPropertyIds: ["P2048"] };
}

function wikidataEvidence(entity: any) {
  const sourceId = `wikidata:${entity.qid}`;
  const shared = { qid: entity.qid, sourceResponseHash: entity.source.sourceResponseHash, sourceRevisionId: entity.source.sourceRevisionId, identityReceiptHash: entity.identity.identityReceiptHash };
  return [
    { id: "EVD-WIKIDATA-ENTITY", label: "Linked Wikidata community entity", sourceId, value: JSON.stringify({ ...shared, labels: entity.labels, identity: entity.identity, source: entity.source }) },
    ...["P31", "P625", "P2048", "P1101"].map((propertyId) => ({
      id: `EVD-WIKIDATA-${propertyId}`,
      label: `Wikidata ${propertyId} statement receipt`,
      sourceId,
      value: JSON.stringify({ ...shared, statements: entity.statements.filter((statement: any) => statement.propertyId === propertyId) })
    }))
  ];
}

export const core = await loadAiCore();
const buildRequest = core.buildPointObjectResponsesRequest as Function;
const validate = core.validatePointObjectAiContentDetailed as Function;
const projectionFor = core.buildModelEvidenceProjection as Function;
const profile = { model: "gpt-5.6-sol", reasoningEffort: "high", verbosity: "medium", maxOutputTokens: 4_000 };
const pack = evidencePack();

function syncAllowedFieldsReceipt(candidate: any): void {
  const receipt = candidate.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS");
  receipt.value = JSON.stringify({ sourceFeatureId: candidate.selectedObject.sourceFeatureId, tags: candidate.selectedObject.tags });
}

function syncGeoContextReceipts(candidate: any): void {
  const context = candidate.geoContext;
  const summary = {
    radiusM: context.radiusM,
    coverage: context.coverage,
    sampleSize: context.sampleSize,
    capReached: context.capReached,
    groups: context.groups,
    mappedBuildingCount: context.mappedBuildingCount,
    mappedLevelsKnownCount: context.mappedLevelsKnownCount,
    medianMappedLevels: context.medianMappedLevels,
    nearestTransitM: context.nearestTransitM,
    nearestMajorRoadM: context.nearestMajorRoadM
  };
  candidate.evidence.find((item: any) => item.id === "EVD-CONTEXT-SUMMARY").value = JSON.stringify(summary);
  candidate.evidence.find((item: any) => item.id === "EVD-DISTRICT-PROFILE").value = JSON.stringify({
    summaryHash: semanticHash(summary),
    districtCharacter: context.districtCharacter
  });
}

const projection = projectionFor(pack);
const indexIds = projection.evidenceIndex.map((item: any) => item.id);
for (const mandatory of ["EVD-OSM-OBJECT", "EVD-CLASSIFICATION", "EVD-GEOMETRY", "EVD-CONTEXT-SUMMARY", "EVD-DISTRICT-PROFILE", "EVD-CONTEXT-1"]) {
  assert.equal(indexIds.includes(mandatory), true, `Mandatory receipt ${mandatory} must survive a 49+ receipt pack.`);
}
assert.equal(projection.nearbyContext[0].categories[0], "public_transport:station");
assert.equal(projection.nearbyContext[0].method, "overpass_around_query_element_center_haversine");

const outputs: any[] = [];
for (const request of requests) {
  const requestBody = buildRequest(pack, request, profile);
  const userPayload = JSON.parse(requestBody.input[1].content[0].text);
  assert.equal("requiredSemanticBrief" in userPayload.selectionPolicy, false,
    "The paid model must not echo the deterministic server-rendered brief.");
  assert.equal("semanticBrief" in requestBody.text.format.schema.properties, false);
  const result = validate(rawPlan(), pack, request);
  assert.equal(result.ok, true, result.detail);
  outputs.push(result.content.initialSemanticBrief);
  const visibleRefs = Object.values(result.content.initialSemanticBrief)
    .flatMap((value: any) => value && Array.isArray(value.evidenceRefs) ? value.evidenceRefs : []);
  assert.equal(visibleRefs.every((ref: string) => indexIds.includes(ref)), true, "Every visible semantic reference must resolve to a sanitized evidence receipt.");
}
assert.equal(new Set(outputs.map((item) => item.codes.implication)).size, 3, "Goal/perspective combinations must select different closed implication codes.");
assert.equal(new Set(outputs.map((item) => item.implication.statement)).size, 3, "The same evidence under different goal/perspective/horizon settings must produce materially different implications.");
assert.match(outputs[0].subject.statement, /^Harbour Hotel — hotel; Dubai\.$/);
assert.match(outputs[0].context.statement, /business and office uses — 3.*hotels and visitor accommodation — 2.*Metro Gate.*120 m/);
assert.match(outputs[0].implication.statement, /hotel reuse or repositioning hypothesis.*permitted use.*access capacity/);
assert.match(outputs[1].implication.statement, /Longer-term view:.*investment review.*income history.*comparable transactions/);
assert.match(outputs[2].implication.statement, /1–3 year view:.*reuse choices.*condition.*refurbishment phasing/);

for (const residentialCount of [1, 2, 5, 12, 21]) {
  const residentialPack = evidencePack();
  residentialPack.geoContext.sampleSize = residentialCount;
  residentialPack.geoContext.groups = [
    { group: "residential", count: residentialCount, sharePct: 100, nearestDistanceM: 40 }
  ];
  residentialPack.geoContext.mappedBuildingCount = residentialCount;
  residentialPack.geoContext.mappedLevelsKnownCount = 0;
  residentialPack.geoContext.medianMappedLevels = null;
  residentialPack.geoContext.districtCharacter = {
    code: "residential",
    confidence: "medium",
    ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
    driverGroups: ["residential"]
  };
  syncGeoContextReceipts(residentialPack);
  for (const locale of ["en", "ru"] as const) {
    const result = validate(rawPlan(), residentialPack, { ...requests[0], locale });
    assert.equal(result.ok, true, result.detail);
    const brief = result.content.initialSemanticBrief;
    const expected = locale === "en"
      ? `mapped residential features in the returned sample — ${residentialCount}`
      : `картографические объекты жилого назначения в полученной выборке — ${residentialCount}`;
    assert.ok(brief.context.statement.includes(expected),
      "Residential counts must follow a stable label and never require number-dependent declension.");
    assert.doesNotMatch(JSON.stringify(brief), /\bhomes\b|\bdwellings?\b|жиль(?:ё|я)/iu);
  }
}

for (const residentialCount of [0, null] as const) {
  const candidate = evidencePack();
  candidate.geoContext.groups = candidate.geoContext.groups.filter((group: any) => group.group !== "residential");
  if (residentialCount === 0) candidate.geoContext.groups.push({ group: "residential", count: 0, sharePct: 0, nearestDistanceM: null });
  syncGeoContextReceipts(candidate);
  const result = validate(rawPlan(), candidate, requests[0]);
  assert.equal(result.ok, true, result.detail);
  assert.doesNotMatch(result.content.initialSemanticBrief.context.statement, /mapped residential features|residential features.*0|— 0/i,
    "A zero or absent residential group must not invent a visible residential count.");
}

for (const sanitizedHeight of ["200", "200m", "650ft"] as const) {
  const candidate = evidencePack();
  candidate.selectedObject.tags["tag.height"] = sanitizedHeight;
  syncAllowedFieldsReceipt(candidate);
  for (const locale of ["en", "ru"] as const) {
    const result = validate(rawPlan(), candidate, { ...requests[0], locale });
    assert.equal(result.ok, true, result.detail);
    const rendered = JSON.stringify(result.content);
    const unit = sanitizedHeight.endsWith("ft") ? "ft" : sanitizedHeight.endsWith("m") ? "m" : null;
    const expected = locale === "en"
      ? `OpenStreetMap height tag value: ${sanitizedHeight} (${unit ? `unit stated in tag: ${unit}` : "metres by OSM convention"}; accuracy not independently verified)`
      : `Значение тега высоты OpenStreetMap: ${sanitizedHeight} (${unit ? `единица указана в теге: ${unit}` : "метры по правилу OSM"}; точность не проверена независимо)`;
    assert.ok(rendered.includes(expected), `The sanitized tag value must remain visible in ${locale}: ${sanitizedHeight}`);
    assert.doesNotMatch(rendered, /raw OpenStreetMap|исходный тег|mapped height\s|картированная высота\s/i);
    assert.doesNotMatch(rendered, /200m(?:m|ft)|650ft(?:m|ft)/i,
      "Height rendering must not append or convert a unit for display.");
  }
}

const missingHeightPack = evidencePack();
delete missingHeightPack.selectedObject.tags["tag.height"];
syncAllowedFieldsReceipt(missingHeightPack);
const missingHeight = validate(rawPlan(), missingHeightPack, requests[0]);
assert.equal(missingHeight.ok, true, missingHeight.detail);
assert.doesNotMatch(JSON.stringify(missingHeight.content), /OpenStreetMap height tag value|mapped height\s/i,
  "A missing height tag must stay absent rather than acquire a default value.");

// Two provider samples have different radii. A 759 m place must never be
// narrated as inside the 400 m urban-fabric sample (founder regression).
const mixedRadiusPack = evidencePack();
mixedRadiusPack.nearbyContext[1].distanceM = 759;
const distantItem = mixedRadiusPack.nearbyContext[1];
mixedRadiusPack.evidence.find((entry: any) => entry.id === "EVD-CONTEXT-2").value = JSON.stringify({
  sourceFeatureId: distantItem.sourceFeatureId, name: distantItem.name, categories: distantItem.categories,
  featureClass: distantItem.featureClass, distanceM: distantItem.distanceM, method: distantItem.method
});
for (const locale of ["en", "ru"]) {
  const mixed = validate(rawPlan(), mixedRadiusPack, { ...requests[0], locale });
  assert.equal(mixed.ok, true, mixed.detail);
  const statement = mixed.content.initialSemanticBrief.context.statement;
  const outsideLabel = locale === "en" ? "Further nearby (outside that radius)" : "Другие объекты поблизости (за пределами этого радиуса)";
  assert.ok(statement.includes(outsideLabel));
  assert.ok(statement.indexOf("759") > statement.indexOf(outsideLabel));
  assert.ok(!statement.slice(0, statement.indexOf(outsideLabel)).includes("Harbour Offices"));
}
for (const output of outputs) {
  assert.doesNotMatch(JSON.stringify(output), /linked community entity|bounded open-map subject|mapped records|close .*gates|downside protection|optionality/i);
}

const firstRaw = rawPlan();
assert.deepEqual(validate({ ...firstRaw, semanticBrief: { subjectCode: "coordinate_only" } }, pack, requests[0]),
  { ok: false, code: "SHAPE_INVALID", detail: "root_exact_keys" },
  "A redundant model-authored semantic brief must not enter the strict paid-response contract.");

const nearbyTamper = structuredClone(pack);
nearbyTamper.nearbyContext[0].categories = ["amenity:school"];
assert.equal(projectionFor(nearbyTamper).nearbyContext.some((item: any) => item.evidenceId === "EVD-CONTEXT-1"), false,
  "A nearby category mutation without a matching receipt must fail closed for that record.");

const sparsePack = evidencePack(true);
const sparse = validate(rawPlan(), sparsePack, requests[0]);
assert.equal(sparse.ok, true);
assert.equal(sparse.content.initialSemanticBrief.codes.context, "sparse_open_context");
assert.equal(sparse.content.initialSemanticBrief.codes.access, "mapped_access_unavailable");
assert.match(sparse.content.initialSemanticBrief.context.statement, /insufficient to describe the area character/);
assert.match(sparse.content.initialSemanticBrief.access.statement, /no usable transit or major-road distance was returned/);
assert.doesNotMatch(sparse.content.initialSemanticBrief.implication.statement, /district|demand is|demand exists/i,
  "Sparse context must not invent area character or demand.");

const linkedPack = evidencePack();
linkedPack.linkedEntity = linkedEntityForPack();
linkedPack.evidence.push(...wikidataEvidence(linkedPack.linkedEntity));
const linkedResult = validate(rawPlan(), linkedPack, requests[0]);
assert.equal(linkedResult.ok, true, linkedResult.detail);
assert.ok(projectionFor(linkedPack).linkedEntity,
  "Canonical one-arcsecond P625 must survive the final model projection, not merely the source adapter.");
for (const precision of [null, 0, 1 / 3600 * 1.01, 1]) {
  const rejectedPrecisionPack = evidencePack();
  rejectedPrecisionPack.linkedEntity = linkedEntityForPack(precision);
  rejectedPrecisionPack.evidence.push(...wikidataEvidence(rejectedPrecisionPack.linkedEntity));
  assert.equal(projectionFor(rejectedPrecisionPack).linkedEntity, null,
    `The final model projection must also reject unsupported coordinate resolution ${precision}.`);
}
assert.equal(linkedResult.content.initialSemanticBrief.codes.subject, "linked_named_entity");
assert.equal(linkedResult.content.sourceFacts.some((fact: any) => /linked complex, not selected-building attributes/.test(fact.statement)), true,
  "Visible Wikidata facts must keep the linked complex separate from selected-building attributes.");
const conflictFact = linkedResult.content.sourceFacts.find((fact: any) => /neither value is silently preferred or averaged/.test(fact.statement));
assert.ok(conflictFact && conflictFact.evidenceRefs.includes("EVD-ALLOWED-FIELDS") && conflictFact.evidenceRefs.includes("EVD-WIKIDATA-P2048"),
  `Cross-source height conflict must remain explicit and cite both bounded receipts: ${JSON.stringify(linkedResult.content.sourceFacts)}`);
const linkedIndexIds = projectionFor(linkedPack).evidenceIndex.map((item: any) => item.id);
for (const fact of linkedResult.content.sourceFacts) assert.equal(fact.evidenceRefs.every((ref: string) => linkedIndexIds.includes(ref)), true);

const numericallyEqualPack = structuredClone(linkedPack);
numericallyEqualPack.selectedObject.tags["tag.height"] = " 321.4 m ";
numericallyEqualPack.linkedEntity.statements = numericallyEqualPack.linkedEntity.statements.filter((statement: any) =>
  statement.propertyId !== "P2048" || statement.value.numericValue === 321.4);
numericallyEqualPack.linkedEntity.conflictingPropertyIds = [];
const equalAttributesReceipt = numericallyEqualPack.evidence.find((item: any) => item.id === "EVD-ALLOWED-FIELDS");
equalAttributesReceipt.value = JSON.stringify({
  sourceFeatureId: numericallyEqualPack.selectedObject.sourceFeatureId,
  tags: numericallyEqualPack.selectedObject.tags
});
const equalHeightReceipt = numericallyEqualPack.evidence.find((item: any) => item.id === "EVD-WIKIDATA-P2048");
equalHeightReceipt.value = JSON.stringify({
  qid: numericallyEqualPack.linkedEntity.qid,
  sourceResponseHash: numericallyEqualPack.linkedEntity.source.sourceResponseHash,
  sourceRevisionId: numericallyEqualPack.linkedEntity.source.sourceRevisionId,
  identityReceiptHash: numericallyEqualPack.linkedEntity.identity.identityReceiptHash,
  statements: numericallyEqualPack.linkedEntity.statements.filter((statement: any) => statement.propertyId === "P2048")
});
const numericallyEqual = validate(rawPlan(), numericallyEqualPack, requests[0]);
assert.equal(numericallyEqual.ok, true, numericallyEqual.detail);
assert.equal(numericallyEqual.content.sourceFacts.some((fact: any) => /height.*differs from Wikidata/.test(fact.statement)), false,
  "Numerically equal height values with optional metre units and whitespace must not create a false conflict.");
const linkedTamper = structuredClone(linkedPack);
linkedTamper.evidence.find((item: any) => item.id === "EVD-WIKIDATA-ENTITY").value = linkedTamper.evidence.find((item: any) => item.id === "EVD-WIKIDATA-ENTITY").value.replace("Linked Harbour Complex", "Different entity");
assert.equal(projectionFor(linkedTamper).linkedEntity, null, "A linked-entity receipt mismatch must remove all Wikidata facts from the projection.");

const benchmarkRequests = [
  { depth: "standard", goal: "redevelopment", perspective: "developer", horizon: "current", question: null, locale: "ru" },
  { depth: "standard", goal: "object_profile", perspective: "investor", horizon: "current", question: null, locale: "ru" },
  { depth: "standard", goal: "development_screening", perspective: "developer", horizon: "current", question: null, locale: "ru" }
] as const;
const benchmarkPacks = [pack, evidencePack(false, "singapore"), evidencePack(true, "dubai", false)];
const benchmarks = benchmarkRequests.map((request, index) => {
  const result = validate(rawPlan(), benchmarkPacks[index], request);
  assert.equal(result.ok, true, result.detail);
  const brief = result.content.initialSemanticBrief;
  return [brief.subject.statement, brief.context.statement, brief.access.statement, brief.implication.statement].join(" ");
});
assert.match(benchmarks[1], /Synthetic Marina Hotel.*Singapore/);
assert.doesNotMatch(benchmarks[1], /Dubai|Harbour Hotel/);
assert.match(benchmarks[2], /Выбранная локация/);
assert.match(benchmarks[2], /Для выбранной локации проверьте/);
assert.doesNotMatch(benchmarks[2], /Harbour Hotel|Metro Gate|Harbour Offices/);
console.log(JSON.stringify({ benchmarkScope: "synthetic fixtures; not live geographic observations", benchmarkRu: benchmarks }, null, 2));
console.log("point-to-object-semantic-v6-check: PASS (server brief, utility copy, numeric equality, priority, strict joins and sparse fallback)");
