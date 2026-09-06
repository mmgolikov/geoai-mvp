import type { GeoJsonGeometry } from "@/src/lib/point-to-object/contracts";
import { LIVE_POINT_CAVEAT } from "@/src/lib/point-to-object/contracts";
import { isPointObjectLocale, isPointObjectMarketKey } from "@/src/lib/prototype/point-to-object-markets";
import type {
  PointObjectWikidataLinkedEntity,
  PointObjectWikidataPropertyId,
  PointObjectWikidataStatementReceipt,
  PointObjectWikidataStatementValue
} from "@/src/lib/prototype/point-to-object-wikidata-contract";
import {
  POINT_OBJECT_ANALYSIS_LEGACY_PROMPT_VERSION,
  POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION,
  POINT_OBJECT_ANALYSIS_PROMPT_VERSION,
  POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION
} from "@/components/point-to-object/live-types";
import type {
  GroundedClaim,
  LiveMapBasemapId,
  LiveMapSelection,
  LiveResolvedObjectContext,
  PointObjectAiContent,
  PointObjectInitialSemanticBrief,
  PointObjectAiAttemptTrace,
  PointObjectAiResponse,
  PointObjectAiSubject,
  PointObjectAiTelemetry,
  PointObjectAnalysisRequestReceipt,
  PointObjectDecisionBrief,
  PointObjectDecisionSignal,
  PointObjectFocusedAnswer,
  PointObjectOpportunity,
  PointObjectGeoContext,
  PointObjectGeometryMetrics,
  PointObjectSearchResponse,
  PointObjectRisk,
  PointObjectValidationAction,
  Wgs84Position
} from "@/components/point-to-object/live-types";

export const POINT_OBJECT_SESSION_KEYS = {
  selection: "geoai:point-to-object:selection:v3",
  question: "geoai:point-to-object:question:v2",
  analysis: "geoai:point-to-object:analysis:v8",
  legacyAnalysis: "geoai:point-to-object:analysis:v7"
} as const;

const MAX_SELECTION_BYTES = 512 * 1024;
const MAX_ANALYSIS_BYTES = 256 * 1024;
const MAX_GEOMETRY_POSITIONS = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

function nonEmptyText(value: unknown, maxLength: number): string | null {
  const text = safeText(value, maxLength)?.trim() ?? "";
  return text ? text : null;
}

function finiteNumber(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function stringMap(value: unknown, maxEntries: number): Record<string, string> | null {
  if (!isRecord(value) || Object.keys(value).length > maxEntries) return null;
  const output: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_.:+-]{1,80}$/.test(key)) return null;
    const parsed = nonEmptyText(raw, 500);
    if (!parsed) return null;
    output[key] = parsed;
  }
  return output;
}

function parseGeometryMetrics(value: unknown): PointObjectGeometryMetrics | null {
  if (!isRecord(value) || !hasExactKeys(value, ["footprintAreaSqM", "footprintPerimeterM", "method", "geometryGeneralized"])) return null;
  const footprintAreaSqM = finiteNumber(value.footprintAreaSqM, 1, 1_000_000_000);
  const footprintPerimeterM = finiteNumber(value.footprintPerimeterM, 1, 10_000_000);
  return footprintAreaSqM !== null && footprintPerimeterM !== null &&
    value.method === "local_equirectangular_wgs84_approximation" && value.geometryGeneralized === true
    ? { footprintAreaSqM, footprintPerimeterM, method: value.method, geometryGeneralized: true }
    : null;
}

const GEO_CONTEXT_GROUPS = new Set([
  "residential", "commercial", "hospitality", "retail_daily_needs", "education", "healthcare",
  "civic_culture", "transport", "access", "open_space", "industrial", "construction", "other_built"
]);
const DISTRICT_CHARACTERS = new Set([
  "hospitality_tourism", "commercial_business", "residential", "mixed_use_urban", "civic_institutional",
  "industrial_logistics", "open_space_recreation", "low_signal"
]);

function parseGeoContext(value: unknown): PointObjectGeoContext | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "radiusM", "coverage", "sampleSize", "capReached", "groups", "mappedBuildingCount", "mappedLevelsKnownCount",
    "medianMappedLevels", "nearestTransitM", "nearestMajorRoadM", "districtCharacter"
  ]) || value.radiusM !== 400 || (value.coverage !== "available" && value.coverage !== "unavailable") ||
      typeof value.capReached !== "boolean" || !Array.isArray(value.groups) || !isRecord(value.districtCharacter)) return null;
  const sampleSize = integer(value.sampleSize, 0, 10_000);
  const mappedBuildingCount = integer(value.mappedBuildingCount, 0, 10_000);
  const mappedLevelsKnownCount = integer(value.mappedLevelsKnownCount, 0, 10_000);
  const medianMappedLevels = value.medianMappedLevels === null ? null : finiteNumber(value.medianMappedLevels, 0, 200);
  const nearestTransitM = value.nearestTransitM === null ? null : finiteNumber(value.nearestTransitM, 0, 10_000);
  const nearestMajorRoadM = value.nearestMajorRoadM === null ? null : finiteNumber(value.nearestMajorRoadM, 0, 10_000);
  const groups = value.groups.flatMap((item) => {
    if (!isRecord(item) || !hasExactKeys(item, ["group", "count", "sharePct", "nearestDistanceM"]) ||
        typeof item.group !== "string" || !GEO_CONTEXT_GROUPS.has(item.group)) return [];
    const count = integer(item.count, 0, 10_000);
    const sharePct = finiteNumber(item.sharePct, 0, 100);
    const nearestDistanceM = item.nearestDistanceM === null ? null : finiteNumber(item.nearestDistanceM, 0, 10_000);
    return count === null || sharePct === null || (item.nearestDistanceM !== null && nearestDistanceM === null)
      ? []
      : [{ group: item.group as PointObjectGeoContext["groups"][number]["group"], count, sharePct, nearestDistanceM }];
  });
  const district = value.districtCharacter;
  if (sampleSize === null || mappedBuildingCount === null || mappedLevelsKnownCount === null ||
      (value.medianMappedLevels !== null && medianMappedLevels === null) ||
      (value.nearestTransitM !== null && nearestTransitM === null) ||
      (value.nearestMajorRoadM !== null && nearestMajorRoadM === null) || groups.length !== value.groups.length ||
      new Set(groups.map((item) => item.group)).size !== groups.length ||
      !hasExactKeys(district, ["code", "confidence", "ruleVersion", "driverGroups"]) ||
      typeof district.code !== "string" || !DISTRICT_CHARACTERS.has(district.code) ||
      (district.confidence !== "low" && district.confidence !== "medium") ||
      district.ruleVersion !== "POINT_OBJECT_DISTRICT_RULE_V1" || !Array.isArray(district.driverGroups)) return null;
  const driverGroups = district.driverGroups.flatMap((item) => typeof item === "string" && GEO_CONTEXT_GROUPS.has(item)
    ? [item as PointObjectGeoContext["districtCharacter"]["driverGroups"][number]] : []);
  if (driverGroups.length !== district.driverGroups.length || new Set(driverGroups).size !== driverGroups.length) return null;
  return {
    radiusM: 400,
    coverage: value.coverage,
    sampleSize,
    capReached: value.capReached,
    groups,
    mappedBuildingCount,
    mappedLevelsKnownCount,
    medianMappedLevels,
    nearestTransitM,
    nearestMajorRoadM,
    districtCharacter: {
      code: district.code as PointObjectGeoContext["districtCharacter"]["code"],
      confidence: district.confidence,
      ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
      driverGroups
    }
  };
}

const WIKIDATA_PROPERTY_IDS = new Set(["P31", "P571", "P2048", "P1101", "P625", "P17"]);

function parseWikidataStatementValue(value: unknown): PointObjectWikidataStatementValue | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "entity" && hasExactKeys(value, ["kind", "entityId"]) &&
      typeof value.entityId === "string" && /^Q[1-9]\d{0,15}$/.test(value.entityId)) {
    return { kind: "entity", entityId: value.entityId };
  }
  if (value.kind === "time" && hasExactKeys(value, ["kind", "time", "precision", "calendarModel"]) &&
      typeof value.time === "string" && (value.precision === 9 || value.precision === 10 || value.precision === 11) &&
      value.calendarModel === "http://www.wikidata.org/entity/Q1985727") {
    const parts = /^\+(\d{4})-(\d{2})-(\d{2})T00:00:00Z$/.exec(value.time);
    const year = parts ? Number(parts[1]) : 0;
    const month = parts ? Number(parts[2]) : -1;
    const day = parts ? Number(parts[3]) : -1;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const calendarFieldsValid = value.precision === 9
      ? month === 0 && day === 0
      : value.precision === 10
        ? month >= 1 && month <= 12 && day === 0
        : month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
    if (parts && year >= 1 && calendarFieldsValid) {
      return { kind: "time", time: value.time, precision: value.precision, calendarModel: value.calendarModel };
    }
  }
  if (value.kind === "quantity" && hasExactKeys(value, ["kind", "amount", "numericValue", "unit", "unitEntityId", "lowerBound", "upperBound"]) &&
      typeof value.amount === "string" && /^[+-]?\d{1,12}(?:\.\d{1,8})?$/.test(value.amount) &&
      typeof value.numericValue === "number" && Number.isFinite(value.numericValue) &&
      (value.unit === "metre" || value.unit === "count") &&
      (value.unit === "metre" ? value.unitEntityId === "Q11573" : value.unitEntityId === null) &&
      (value.lowerBound === null || typeof value.lowerBound === "string") &&
      (value.upperBound === null || typeof value.upperBound === "string")) {
    return value as PointObjectWikidataStatementValue;
  }
  if (value.kind === "coordinate" && hasExactKeys(value, ["kind", "longitude", "latitude", "precision", "globe"])) {
    const longitude = finiteNumber(value.longitude, -180, 180);
    const latitude = finiteNumber(value.latitude, -90, 90);
    const precision = value.precision === null ? null : finiteNumber(value.precision, 0, 10);
    return longitude !== null && latitude !== null && precision !== null && precision > 0 && precision <= 0.0001 &&
      value.globe === "http://www.wikidata.org/entity/Q2"
      ? { kind: "coordinate", longitude, latitude, precision, globe: value.globe }
      : null;
  }
  return null;
}

function parseWikidataLinkedEntity(value: unknown): PointObjectWikidataLinkedEntity | null {
  if (!isRecord(value) || !hasExactKeys(value, ["contractVersion", "qid", "labels", "source", "identity", "statements", "conflictingPropertyIds"]) ||
      value.contractVersion !== "POINT_OBJECT_WIKIDATA_ENTITY_V1" || typeof value.qid !== "string" || !/^Q[1-9]\d{0,15}$/.test(value.qid) ||
      !isRecord(value.labels) || !hasExactKeys(value.labels, ["en", "ru"]) || !isRecord(value.source) || !isRecord(value.identity) ||
      !Array.isArray(value.statements) || value.statements.length > 32 || !Array.isArray(value.conflictingPropertyIds)) return null;
  const labelEn = value.labels.en === null ? null : nonEmptyText(value.labels.en, 180);
  const labelRu = value.labels.ru === null ? null : nonEmptyText(value.labels.ru, 180);
  if ((value.labels.en !== null && !labelEn) || (value.labels.ru !== null && !labelRu)) return null;
  const source = value.source;
  if (!hasExactKeys(source, ["sourceId", "dataset", "service", "endpointHost", "sourceResponseHash", "sourceResponseBytes", "sourceRevisionId", "entityModifiedAt", "acquiredAt", "cacheExpiresAt", "licenceId", "licenceUrl", "accessPolicyUrl", "usagePolicyUrl", "officialStatus"]) ||
      source.sourceId !== "WIKIDATA-ENTITY" || source.dataset !== "Wikidata" || source.service !== "MediaWiki Action API" || source.endpointHost !== "www.wikidata.org" ||
      typeof source.sourceResponseHash !== "string" || !/^[a-f0-9]{64}$/.test(source.sourceResponseHash) ||
      integer(source.sourceResponseBytes, 1, 256 * 1024) === null || integer(source.sourceRevisionId, 1, Number.MAX_SAFE_INTEGER) === null ||
      (source.entityModifiedAt !== null && !isoTimestamp(source.entityModifiedAt)) || !isoTimestamp(source.acquiredAt) || !isoTimestamp(source.cacheExpiresAt) ||
      source.licenceId !== "CC0-1.0" || source.licenceUrl !== "https://www.wikidata.org/wiki/Wikidata:Licensing" ||
      source.accessPolicyUrl !== "https://www.wikidata.org/wiki/Wikidata:Data_access/en" || source.usagePolicyUrl !== "https://www.mediawiki.org/wiki/API:Etiquette" ||
      source.officialStatus !== "community_structured_data_not_official_asset_record") return null;
  const identity = value.identity;
  if (!hasExactKeys(identity, ["identityReceiptHash", "qid", "osmSourceFeatureId", "osmGeometryHash", "basis", "linkedCoordinateDistanceM", "polygonBoundaryToleranceM", "nodeOrComplexMaxDistanceM", "countryMatch", "typeMatch", "scope"]) ||
      typeof identity.identityReceiptHash !== "string" || !/^[a-f0-9]{64}$/.test(identity.identityReceiptHash) || identity.qid !== value.qid ||
      typeof identity.osmSourceFeatureId !== "string" || !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(identity.osmSourceFeatureId) ||
      (identity.osmGeometryHash !== null && (typeof identity.osmGeometryHash !== "string" || !/^[a-f0-9]{64}$/.test(identity.osmGeometryHash))) ||
      (identity.basis !== "polygon_coordinate_inside_or_boundary_tolerance" && identity.basis !== "node_or_complex_coordinate_within_ceiling") ||
      finiteNumber(identity.linkedCoordinateDistanceM, 0, 1_000_000) === null || identity.polygonBoundaryToleranceM !== 20 || identity.nodeOrComplexMaxDistanceM !== 250 ||
      (identity.countryMatch !== "matched" && identity.countryMatch !== "not_asserted") || identity.typeMatch !== "compatible" ||
      identity.scope !== "linked_community_entity_not_certified_selected_footprint") return null;
  const statements = value.statements.flatMap((raw): PointObjectWikidataStatementReceipt[] => {
    if (!isRecord(raw) || !hasExactKeys(raw, ["statementReceiptHash", "identityReceiptHash", "sourceResponseHash", "sourceRevisionId", "qid", "propertyId", "statementId", "rank", "value", "qualifiers"]) ||
        typeof raw.statementReceiptHash !== "string" || !/^[a-f0-9]{64}$/.test(raw.statementReceiptHash) || raw.identityReceiptHash !== identity.identityReceiptHash ||
        raw.sourceResponseHash !== source.sourceResponseHash || raw.sourceRevisionId !== source.sourceRevisionId || raw.qid !== value.qid ||
        typeof raw.propertyId !== "string" || !WIKIDATA_PROPERTY_IDS.has(raw.propertyId) || typeof raw.statementId !== "string" ||
        !/^[A-Za-z0-9$_.:-]{1,180}$/.test(raw.statementId) || (raw.rank !== "preferred" && raw.rank !== "normal") ||
        !Array.isArray(raw.qualifiers) || raw.qualifiers.length !== 0) return [];
    const statementValue = parseWikidataStatementValue(raw.value);
    return statementValue ? [{ ...raw, propertyId: raw.propertyId as PointObjectWikidataPropertyId, value: statementValue } as PointObjectWikidataStatementReceipt] : [];
  });
  const conflicts = value.conflictingPropertyIds.flatMap((item) => typeof item === "string" && WIKIDATA_PROPERTY_IDS.has(item)
    ? [item as PointObjectWikidataPropertyId] : []);
  if (statements.length !== value.statements.length || new Set(statements.map((statement) => statement.statementId)).size !== statements.length ||
      conflicts.length !== value.conflictingPropertyIds.length || new Set(conflicts).size !== conflicts.length) return null;
  return value as unknown as PointObjectWikidataLinkedEntity;
}

export function parseLiveResolvedObject(value: unknown): LiveResolvedObjectContext | null {
  if (!isRecord(value)) return null;
  const name = value.name === null ? null : nonEmptyText(value.name, 240);
  const address = value.address === null ? null : nonEmptyText(value.address, 500);
  const featureClass = nonEmptyText(value.featureClass, 160);
  const sourceFeatureId = nonEmptyText(value.sourceFeatureId, 160);
  const geometryType = value.geometryType === null || ["Point", "LineString", "MultiLineString", "Polygon", "MultiPolygon"].includes(String(value.geometryType))
    ? value.geometryType as LiveResolvedObjectContext["geometryType"]
    : undefined;
  const coordinateAssociation = value.coordinateAssociation === "open_map_geometry_contains_point" ||
    value.coordinateAssociation === "reverse_nearest_indexed_object_not_point_in_polygon" ||
    value.coordinateAssociation === "trusted_open_map_identity"
    ? value.coordinateAssociation
    : null;
  const resultCentroidDistanceM = finiteNumber(value.resultCentroidDistanceM, 0, 1_000_000);
  const addressParts = stringMap(value.addressParts, 24);
  const tags = stringMap(value.tags, 36);
  const metrics = value.metrics === null ? null : parseGeometryMetrics(value.metrics);
  const geoContext = parseGeoContext(value.geoContext);
  const linkedEntity = value.linkedEntity === null || value.linkedEntity === undefined ? null : parseWikidataLinkedEntity(value.linkedEntity);
  if ((value.name !== null && !name) || (value.address !== null && !address) || !featureClass || !sourceFeatureId ||
      geometryType === undefined || !coordinateAssociation || resultCentroidDistanceM === null || !addressParts || !tags ||
      (value.metrics !== null && !metrics) || !geoContext ||
      (value.linkedEntity !== null && value.linkedEntity !== undefined && !linkedEntity)) return null;
  return { name, address, featureClass, sourceFeatureId, geometryType, coordinateAssociation, resultCentroidDistanceM, addressParts, tags, metrics, geoContext, linkedEntity };
}

export function parsePointObjectSearchResponse(value: unknown): PointObjectSearchResponse | null {
  if (!isRecord(value) || (value.mode !== "results" && value.mode !== "unavailable")) return null;
  if (value.mode === "unavailable") {
    if (!hasOnlyKeys(value, ["mode", "error", "retryable"])) return null;
    const error = value.error === undefined ? undefined : nonEmptyText(value.error, 500) ?? null;
    const retryable = value.retryable === undefined ? undefined : typeof value.retryable === "boolean" ? value.retryable : null;
    if (error === null || retryable === null) return null;
    return { mode: "unavailable", error, retryable };
  }
  if (!hasExactKeys(value, ["mode", "results"]) || !Array.isArray(value.results) || value.results.length > 5) return null;
  const results = value.results.flatMap((item) => {
    if (!isRecord(item) || !hasExactKeys(item, [
      "id", "label", "secondaryLabel", "longitude", "latitude", "category", "featureType", "boundingBox"
    ])) return [];
    const id = nonEmptyText(item.id, 160);
    const label = nonEmptyText(item.label, 240);
    const secondaryLabel = item.secondaryLabel === null ? null : nonEmptyText(item.secondaryLabel, 500);
    const longitude = finiteNumber(item.longitude, -180, 180);
    const latitude = finiteNumber(item.latitude, -90, 90);
    const category = item.category === null ? null : nonEmptyText(item.category, 80);
    const featureType = item.featureType === null ? null : nonEmptyText(item.featureType, 80);
    const box = Array.isArray(item.boundingBox) && item.boundingBox.length === 4
      ? item.boundingBox.map((number, index) => finiteNumber(number, index < 2 ? -90 : -180, index < 2 ? 90 : 180))
      : null;
    const boundingBox = box && box.every((number): number is number => number !== null) && box[0] <= box[1] && box[2] <= box[3]
      ? box as [number, number, number, number]
      : null;
    if (!id || !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(id) || !label ||
        (item.secondaryLabel !== null && !secondaryLabel) || longitude === null || latitude === null ||
        (item.category !== null && !category) || (item.featureType !== null && !featureType) ||
        (item.boundingBox !== null && !boundingBox)) return [];
    return [{ id, label, secondaryLabel, longitude, latitude, category, featureType, boundingBox }];
  });
  return results.length === value.results.length ? { mode: "results", results } : null;
}

function selectionFingerprint(selection: LiveMapSelection): string {
  return [
    selection.locationKey,
    selection.longitude.toFixed(6),
    selection.latitude.toFixed(6),
    selection.clickedAt
  ].join(":");
}

function coordinate(value: unknown): Wgs84Position | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = value[0];
  const latitude = value[1];
  return typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180 &&
    typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    ? [longitude, latitude]
    : null;
}

function geometry(value: unknown): GeoJsonGeometry | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  let positions = 0;
  const normalize = (candidate: unknown, depth: number): unknown | null => {
    if (depth === 0) {
      const point = coordinate(candidate);
      positions += point ? 1 : 0;
      return point && positions <= MAX_GEOMETRY_POSITIONS ? point : null;
    }
    if (!Array.isArray(candidate) || candidate.length === 0) return null;
    const output: unknown[] = [];
    for (const child of candidate) {
      const normalized = normalize(child, depth - 1);
      if (normalized === null) return null;
      output.push(normalized);
    }
    return output;
  };
  const depth = value.type === "Point" ? 0
    : value.type === "LineString" ? 1
      : value.type === "Polygon" ? 2
        : value.type === "MultiPolygon" ? 3
          : null;
  if (depth === null) return null;
  const coordinates = normalize(value.coordinates, depth);
  return coordinates === null ? null : { type: value.type, coordinates } as GeoJsonGeometry;
}

export function parsePointObjectSelection(value: unknown): LiveMapSelection | null {
  if (!isRecord(value) || !isRecord(value.object) || !isRecord(value.viewport) ||
        !isPointObjectMarketKey(value.locationKey) ||
        value.provider !== "OpenFreeMap / OpenStreetMap") return null;
    const point = coordinate([value.longitude, value.latitude]);
    const center = coordinate(value.viewport.center);
    const clickedAt = safeText(value.clickedAt, 80);
    const featureClass = safeText(value.object.featureClass, 80);
    const sourceFeatureId = value.object.sourceFeatureId === null
      ? null
      : safeText(value.object.sourceFeatureId, 128);
    const name = value.object.name === null ? null : safeText(value.object.name, 160);
    const renderHeightM = value.object.renderHeightM === null || value.object.renderHeightM === undefined
      ? null
      : finiteNumber(value.object.renderHeightM, 0, 1_500);
    const renderMinHeightM = value.object.renderMinHeightM === null || value.object.renderMinHeightM === undefined
      ? null
      : finiteNumber(value.object.renderMinHeightM, 0, 1_500);
    if (!point || !center || !clickedAt || !featureClass ||
        typeof value.viewport.zoom !== "number" || !Number.isFinite(value.viewport.zoom) ||
        value.viewport.zoom < 0 || value.viewport.zoom > 24 ||
        (value.object.name !== null && name === null) ||
        (value.object.sourceFeatureId !== null && sourceFeatureId === null) ||
        (value.object.renderHeightM !== null && value.object.renderHeightM !== undefined && renderHeightM === null) ||
        (value.object.renderMinHeightM !== null && value.object.renderMinHeightM !== undefined && renderMinHeightM === null)) return null;
    const restoredGeometry = value.object.geometry === null ? null : geometry(value.object.geometry);
    if (value.object.geometry !== null && restoredGeometry === null) return null;
    const nearbyLabels = Array.isArray(value.nearbyLabels)
      ? value.nearbyLabels.flatMap((item) => {
          if (!isRecord(item)) return [];
          const nearbyName = nonEmptyText(item.name, 160);
          const nearbyClass = nonEmptyText(item.featureClass, 80);
          const nearbyCoordinates = item.coordinates === null ? null : coordinate(item.coordinates);
          if (!nearbyName || !nearbyClass || (item.coordinates !== null && nearbyCoordinates === null)) return [];
          return [{ name: nearbyName, featureClass: nearbyClass, coordinates: nearbyCoordinates }];
        }).slice(0, 5)
      : [];
    const restoredResolvedObject = value.resolvedObject === null || value.resolvedObject === undefined
      ? null
      : parseLiveResolvedObject(value.resolvedObject);
    if (value.resolvedObject !== null && value.resolvedObject !== undefined && !restoredResolvedObject) return null;
    const pitch = value.viewport.pitch === undefined ? 0 : finiteNumber(value.viewport.pitch, 0, 85);
    const bearing = value.viewport.bearing === undefined ? 0 : finiteNumber(value.viewport.bearing, -360, 360);
    const viewMode = value.viewport.viewMode === "2d" || value.viewport.viewMode === "3d"
      ? value.viewport.viewMode
      : pitch === 0 ? "2d" : "3d";
    const basemapId: LiveMapBasemapId = value.viewport.basemapId === "light" || value.viewport.basemapId === "contrast"
      ? value.viewport.basemapId
      : "street";
    if (pitch === null || bearing === null) return null;
  return {
      locationKey: value.locationKey,
      longitude: point[0],
      latitude: point[1],
      clickedAt,
      object: { name, featureClass, sourceFeatureId, geometry: restoredGeometry, renderHeightM, renderMinHeightM },
      resolvedObject: restoredResolvedObject,
      viewport: { center, zoom: value.viewport.zoom, pitch, bearing, viewMode, basemapId },
      provider: "OpenFreeMap / OpenStreetMap",
      nearbyLabels
  };
}

export function readPointObjectSelection(): LiveMapSelection | null {
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_SESSION_KEYS.selection);
    if (!raw || raw.length > MAX_SELECTION_BYTES) return null;
    return parsePointObjectSelection(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writePointObjectSelection(selection: LiveMapSelection): void {
  try {
    const serialized = JSON.stringify(selection);
    if (serialized.length <= MAX_SELECTION_BYTES) {
      window.sessionStorage.setItem(POINT_OBJECT_SESSION_KEYS.selection, serialized);
    }
  } catch {
    // The live experience remains usable when browser session storage is unavailable.
  }
}

export function clearPointObjectSelection(): void {
  try {
    window.sessionStorage.removeItem(POINT_OBJECT_SESSION_KEYS.selection);
  } catch {
    // No durable browser state to clear.
  }
}

export function readPointObjectQuestion(): string {
  try {
    const value = window.sessionStorage.getItem(POINT_OBJECT_SESSION_KEYS.question);
    return typeof value === "string" ? value.slice(0, 500) : "";
  } catch {
    return "";
  }
}

export function writePointObjectQuestion(question: string): void {
  try {
    window.sessionStorage.setItem(POINT_OBJECT_SESSION_KEYS.question, question.slice(0, 500));
  } catch {
    // The current in-memory question remains available.
  }
}

const EVIDENCE_REFERENCE = /^EVD-[A-Z0-9-]{1,72}$/;
const MODEL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function integer(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function nullableInteger(value: unknown, maximum: number): number | null | undefined {
  if (value === null) return null;
  return integer(value, 0, maximum) ?? undefined;
}

function isoTimestamp(value: unknown): string | null {
  const text = nonEmptyText(value, 80);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === text ? text : null;
}

function evidenceRefs(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return null;
  const refs = value.map((item) => nonEmptyText(item, 80));
  if (!refs.every((item): item is string => item !== null && EVIDENCE_REFERENCE.test(item))) return null;
  return new Set(refs).size === refs.length ? refs : null;
}

function claim(value: unknown, maxStatement = 900): GroundedClaim | null {
  if (!isRecord(value) || !hasExactKeys(value, ["statement", "evidenceRefs"])) return null;
  const statement = nonEmptyText(value.statement, maxStatement);
  const refs = evidenceRefs(value.evidenceRefs);
  return statement && refs ? { statement, evidenceRefs: refs } : null;
}

function claims(value: unknown, minimum: number, maximum: number, maxStatement = 900): GroundedClaim[] | null {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) return null;
  const parsed = value.map((item) => claim(item, maxStatement));
  return parsed.every((item): item is GroundedClaim => item !== null) ? parsed : null;
}

const SEMANTIC_SUBJECT_CODES = new Set(["linked_named_entity", "named_open_map_object", "classified_open_map_object", "coordinate_only"]);
const SEMANTIC_CONTEXT_CODES = new Set([
  "hospitality_tourism_mapped", "commercial_business_mapped", "residential_mapped", "mixed_use_urban_mapped",
  "civic_institutional_mapped", "industrial_logistics_mapped", "open_space_recreation_mapped", "sparse_open_context"
]);
const SEMANTIC_ACCESS_CODES = new Set(["mapped_transit_and_road", "mapped_transit_only", "mapped_road_only", "mapped_access_unavailable"]);
const SEMANTIC_IMPLICATION_CODES = new Set([
  "developer_profile_validation", "investor_profile_downside", "asset_owner_profile_baseline",
  "developer_development_sequence", "investor_development_downside", "asset_owner_development_constraints",
  "developer_redevelopment_envelope", "investor_redevelopment_downside", "asset_owner_redevelopment_capital",
  "developer_due_diligence_sequence", "investor_due_diligence_gates", "asset_owner_due_diligence_baseline",
  "developer_custom_validation", "investor_custom_downside", "asset_owner_custom_baseline"
]);

function parseInitialSemanticBrief(value: unknown): PointObjectInitialSemanticBrief | null {
  if (!isRecord(value) || !hasExactKeys(value, ["codes", "subject", "context", "access", "implication", "confidence"]) ||
      !isRecord(value.codes) || !hasExactKeys(value.codes, ["subject", "context", "access", "implication"])) return null;
  const subject = claim(value.subject, 1_400);
  const context = claim(value.context, 1_400);
  const access = claim(value.access, 1_400);
  const implication = claim(value.implication, 1_600);
  if (!subject || !context || !access || !implication ||
      typeof value.codes.subject !== "string" || !SEMANTIC_SUBJECT_CODES.has(value.codes.subject) ||
      typeof value.codes.context !== "string" || !SEMANTIC_CONTEXT_CODES.has(value.codes.context) ||
      typeof value.codes.access !== "string" || !SEMANTIC_ACCESS_CODES.has(value.codes.access) ||
      typeof value.codes.implication !== "string" || !SEMANTIC_IMPLICATION_CODES.has(value.codes.implication) ||
      (value.confidence !== "low" && value.confidence !== "medium")) return null;
  return {
    codes: value.codes as PointObjectInitialSemanticBrief["codes"],
    subject,
    context,
    access,
    implication,
    confidence: value.confidence
  };
}

function parseFocusedAnswer(value: unknown): PointObjectFocusedAnswer | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "status", "scope", "confidence", "perspective", "horizon", "statement", "evidenceRefs", "missingEvidence"
  ])) return null;
  const statement = nonEmptyText(value.statement, 900);
  const refs = evidenceRefs(value.evidenceRefs);
  const missingEvidence = textList(value.missingEvidence, 0, 11, 220);
  const status = value.status === "answered" || value.status === "partial" || value.status === "unsupported"
    ? value.status : null;
  const scope = value.scope === "object_identity" || value.scope === "mapped_use" || value.scope === "mapped_form" ||
    value.scope === "mapped_lifecycle" || value.scope === "address_context" || value.scope === "nearby_context" ||
    value.scope === "screening_implication" || value.scope === "development_hypothesis" || value.scope === "source_limitation"
    ? value.scope : null;
  const confidence = value.confidence === "low" || value.confidence === "medium" ? value.confidence : null;
  const perspective = value.perspective === "developer" || value.perspective === "investor" || value.perspective === "asset_owner"
    ? value.perspective : null;
  const horizon = value.horizon === "current" || value.horizon === "one_to_three_years" || value.horizon === "long_term"
    ? value.horizon : null;
  return statement && refs && missingEvidence && status && scope && confidence && perspective && horizon &&
    (status === "answered" ? missingEvidence.length === 0 : status === "partial" ? missingEvidence.length > 0 : confidence === "low" && missingEvidence.length > 0)
    ? { status, scope, confidence, perspective, horizon, statement, evidenceRefs: refs, missingEvidence }
    : null;
}

function textList(value: unknown, minimum: number, maximum: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) return null;
  const parsed = value.map((item) => nonEmptyText(item, maxLength));
  return parsed.every((item): item is string => item !== null) ? parsed : null;
}

function parseDecisionBrief(value: unknown): PointObjectDecisionBrief | null {
  if (!isRecord(value) || !hasExactKeys(value, ["headline", "disposition", "summary", "reasons", "confidence"])) return null;
  const headline = nonEmptyText(value.headline, 180);
  const summary = nonEmptyText(value.summary, 900);
  const reasons = claims(value.reasons, 2, 4);
  const disposition = value.disposition === "continue_screening" || value.disposition === "hold" || value.disposition === "insufficient_evidence"
    ? value.disposition
    : null;
  const confidence = value.confidence === "low" || value.confidence === "medium" ? value.confidence : null;
  return headline && summary && reasons && disposition && confidence
    ? { headline, disposition, summary, reasons, confidence }
    : null;
}

function parseSignals(value: unknown): PointObjectDecisionSignal[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > 6) return null;
  const parsed = value.map((item): PointObjectDecisionSignal | null => {
    if (!isRecord(item) || !hasExactKeys(item, ["title", "observation", "implication", "evidenceClass", "evidenceRefs", "confidence"])) return null;
    const title = nonEmptyText(item.title, 120);
    const observation = nonEmptyText(item.observation, 600);
    const implication = nonEmptyText(item.implication, 700);
    const refs = evidenceRefs(item.evidenceRefs);
    const evidenceClass = item.evidenceClass === "observed" || item.evidenceClass === "derived" || item.evidenceClass === "hypothesis"
      ? item.evidenceClass
      : null;
    const confidence = item.confidence === "low" || item.confidence === "medium" ? item.confidence : null;
    return title && observation && implication && refs && evidenceClass && confidence
      ? { title, observation, implication, evidenceClass, evidenceRefs: refs, confidence }
      : null;
  });
  return parsed.every((item): item is PointObjectDecisionSignal => item !== null) ? parsed : null;
}

function parseOpportunities(value: unknown): PointObjectOpportunity[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) return null;
  const parsed = value.map((item): PointObjectOpportunity | null => {
    if (!isRecord(item) || !hasExactKeys(item, ["title", "hypothesis", "rationale", "potentialValue", "evidenceRefs", "evidenceNeeded", "confidence"])) return null;
    const title = nonEmptyText(item.title, 120);
    const hypothesis = nonEmptyText(item.hypothesis, 650);
    const rationale = nonEmptyText(item.rationale, 650);
    const potentialValue = nonEmptyText(item.potentialValue, 500);
    const refs = evidenceRefs(item.evidenceRefs);
    const evidenceNeeded = textList(item.evidenceNeeded, 1, 4, 300);
    const confidence = item.confidence === "low" || item.confidence === "medium" ? item.confidence : null;
    return title && hypothesis && rationale && potentialValue && refs && evidenceNeeded && confidence
      ? { title, hypothesis, rationale, potentialValue, evidenceRefs: refs, evidenceNeeded, confidence }
      : null;
  });
  return parsed.every((item): item is PointObjectOpportunity => item !== null) ? parsed : null;
}

function parseRisks(value: unknown): PointObjectRisk[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 5) return null;
  const parsed = value.map((item): PointObjectRisk | null => {
    if (!isRecord(item) || !hasExactKeys(item, ["title", "statement", "decisionImpact", "severity", "evidenceRefs", "confidence"])) return null;
    const title = nonEmptyText(item.title, 120);
    const statement = nonEmptyText(item.statement, 650);
    const decisionImpact = nonEmptyText(item.decisionImpact, 650);
    const refs = evidenceRefs(item.evidenceRefs);
    const severity = item.severity === "low" || item.severity === "medium" || item.severity === "high" ? item.severity : null;
    const confidence = item.confidence === "low" || item.confidence === "medium" ? item.confidence : null;
    return title && statement && decisionImpact && refs && severity && confidence
      ? { title, statement, decisionImpact, severity, evidenceRefs: refs, confidence }
      : null;
  });
  return parsed.every((item): item is PointObjectRisk => item !== null) ? parsed : null;
}

function parseValidationActions(value: unknown): PointObjectValidationAction[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) return null;
  const parsed = value.map((item): PointObjectValidationAction | null => {
    if (!isRecord(item) || !hasExactKeys(item, ["title", "action", "source", "decisionImpact", "priority", "evidenceRefs"])) return null;
    const title = nonEmptyText(item.title, 160);
    const action = nonEmptyText(item.action, 1_000);
    const source = nonEmptyText(item.source, 500);
    const decisionImpact = nonEmptyText(item.decisionImpact, 700);
    const refs = evidenceRefs(item.evidenceRefs);
    const priority = item.priority === "critical" || item.priority === "high" || item.priority === "medium" ? item.priority : null;
    return title && action && source && decisionImpact && refs && priority
      ? { title, action, source, decisionImpact, priority, evidenceRefs: refs }
      : null;
  });
  return parsed.every((item): item is PointObjectValidationAction => item !== null) ? parsed : null;
}

function parseContent(value: unknown): PointObjectAiContent | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "initialSemanticBrief", "decisionBrief", "signals", "opportunities", "risks", "sourceFacts", "locationContext", "nextValidation", "answerToQuestion", "geoContext", "caveat"
  ])) return null;
  const initialSemanticBrief = parseInitialSemanticBrief(value.initialSemanticBrief);
  const decisionBrief = parseDecisionBrief(value.decisionBrief);
  const signals = parseSignals(value.signals);
  const opportunities = parseOpportunities(value.opportunities);
  const risks = parseRisks(value.risks);
  const sourceFacts = claims(value.sourceFacts, 1, 10, 1_600);
  const locationContext = claims(value.locationContext, 1, 7);
  const nextValidation = parseValidationActions(value.nextValidation);
  const answerToQuestion = value.answerToQuestion === null ? null : parseFocusedAnswer(value.answerToQuestion);
  const geoContext = parseGeoContext(value.geoContext);
  if (!initialSemanticBrief || !decisionBrief || !signals || !opportunities || !risks || !sourceFacts || !locationContext || !nextValidation ||
      (value.answerToQuestion !== null && !answerToQuestion) || !geoContext || value.caveat !== LIVE_POINT_CAVEAT) return null;
  return {
    initialSemanticBrief,
    decisionBrief,
    signals,
    opportunities,
    risks,
    sourceFacts,
    locationContext,
    nextValidation,
    answerToQuestion,
    geoContext,
    caveat: LIVE_POINT_CAVEAT
  };
}

function parseLegacyContent(value: unknown): Omit<PointObjectAiContent, "initialSemanticBrief"> | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "decisionBrief", "signals", "opportunities", "risks", "sourceFacts", "locationContext", "nextValidation", "answerToQuestion", "geoContext", "caveat"
  ])) return null;
  const decisionBrief = parseDecisionBrief(value.decisionBrief);
  const signals = parseSignals(value.signals);
  const opportunities = parseOpportunities(value.opportunities);
  const risks = parseRisks(value.risks);
  const sourceFacts = claims(value.sourceFacts, 1, 6);
  const locationContext = claims(value.locationContext, 1, 7);
  const nextValidation = parseValidationActions(value.nextValidation);
  const answerToQuestion = value.answerToQuestion === null ? null : parseFocusedAnswer(value.answerToQuestion);
  const geoContext = parseGeoContext(value.geoContext);
  if (!decisionBrief || !signals || !opportunities || !risks || !sourceFacts || !locationContext || !nextValidation ||
      (value.answerToQuestion !== null && !answerToQuestion) || !geoContext || value.caveat !== LIVE_POINT_CAVEAT) return null;
  return { decisionBrief, signals, opportunities, risks, sourceFacts, locationContext, nextValidation, answerToQuestion, geoContext, caveat: LIVE_POINT_CAVEAT };
}

function parseRequestReceipt(value: unknown): PointObjectAnalysisRequestReceipt | null {
  if (!isRecord(value) || !hasExactKeys(value, ["depth", "goal", "perspective", "horizon", "question", "focused", "locale"])) return null;
  const depth = value.depth === "quick" || value.depth === "standard" || value.depth === "deep" ? value.depth : null;
  const goal = value.goal === "object_profile" || value.goal === "development_screening" || value.goal === "redevelopment" ||
    value.goal === "due_diligence" || value.goal === "custom" ? value.goal : null;
  const perspective = value.perspective === "developer" || value.perspective === "investor" || value.perspective === "asset_owner"
    ? value.perspective
    : null;
  const horizon = value.horizon === "current" || value.horizon === "one_to_three_years" || value.horizon === "long_term"
    ? value.horizon
    : null;
  const question = value.question === null ? null : nonEmptyText(value.question, 500);
  const focused = typeof value.focused === "boolean" ? value.focused : null;
  return depth && goal && perspective && horizon && isPointObjectLocale(value.locale) &&
    (value.question === null || question) && focused !== null && focused === (question !== null)
    ? { depth, goal, perspective, horizon, question, focused, locale: value.locale }
    : null;
}

function parseSubject(value: unknown): PointObjectAiSubject | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "name", "address", "featureClass", "sourceFeatureId", "resolutionMethod", "coordinateAssociation", "sourceLabel",
    "geometryType", "resultCentroidDistanceM", "addressParts", "tags", "metrics", "geoContext", "linkedEntity"
  ])) return null;
  const name = value.name === null ? null : nonEmptyText(value.name, 240);
  const address = value.address === null ? null : nonEmptyText(value.address, 500);
  const featureClass = nonEmptyText(value.featureClass, 160);
  const sourceFeatureId = nonEmptyText(value.sourceFeatureId, 160);
  const sourceLabel = nonEmptyText(value.sourceLabel, 160);
  const resolutionMethod = value.resolutionMethod === "nominatim_reverse" || value.resolutionMethod === "nominatim_lookup" ? value.resolutionMethod : null;
  const coordinateAssociation = value.coordinateAssociation === "open_map_geometry_contains_point" ||
    value.coordinateAssociation === "reverse_nearest_indexed_object_not_point_in_polygon" ||
    value.coordinateAssociation === "trusted_open_map_identity"
    ? value.coordinateAssociation
    : null;
  const geometryType = value.geometryType === null
    ? null
    : value.geometryType === "Point" || value.geometryType === "LineString" || value.geometryType === "MultiLineString" ||
      value.geometryType === "Polygon" || value.geometryType === "MultiPolygon"
      ? value.geometryType
      : undefined;
  const resultCentroidDistanceM = finiteNumber(value.resultCentroidDistanceM, 0, 1_000_000);
  const addressParts = stringMap(value.addressParts, 24);
  const tags = stringMap(value.tags, 36);
  const metrics = value.metrics === null ? null : parseGeometryMetrics(value.metrics);
  const geoContext = parseGeoContext(value.geoContext);
  const linkedEntity = value.linkedEntity === null ? null : parseWikidataLinkedEntity(value.linkedEntity);
  if ((value.name !== null && !name) || (value.address !== null && !address) || !featureClass || !sourceFeatureId || !sourceLabel ||
      !resolutionMethod || !coordinateAssociation || geometryType === undefined || resultCentroidDistanceM === null || !addressParts || !tags ||
      (value.metrics !== null && !metrics) || !geoContext || (value.linkedEntity !== null && !linkedEntity)) return null;
  return {
    name,
    address,
    featureClass,
    sourceFeatureId,
    resolutionMethod,
    coordinateAssociation,
    sourceLabel,
    geometryType,
    resultCentroidDistanceM,
    addressParts,
    tags,
    metrics,
    geoContext,
    linkedEntity
  };
}

function parseLegacySubject(value: unknown): Omit<PointObjectAiSubject, "linkedEntity"> | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "name", "address", "featureClass", "sourceFeatureId", "resolutionMethod", "coordinateAssociation", "sourceLabel",
    "geometryType", "resultCentroidDistanceM", "addressParts", "tags", "metrics", "geoContext"
  ])) return null;
  const projected = parseSubject({ ...value, linkedEntity: null });
  if (!projected) return null;
  const { linkedEntity: _linkedEntity, ...legacy } = projected;
  return legacy;
}

function parseAttemptTrace(value: unknown): PointObjectAiAttemptTrace[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) return null;
  const parsed = value.map((item, index): PointObjectAiAttemptTrace | null => {
    if (!isRecord(item) || !hasExactKeys(item, [
      "attempt", "purpose", "model", "reasoningEffort", "requestId", "inputTokens", "cachedInputTokens",
      "cacheWriteTokens", "outputTokens", "totalTokens", "estimatedCostUsd"
    ])) return null;
    const attempt = integer(item.attempt, 1, 2);
    const purpose = item.purpose === "initial" || item.purpose === "focused" || item.purpose === "repair"
      ? item.purpose
      : null;
    const model = nonEmptyText(item.model, 120);
    const reasoningEffort = item.reasoningEffort === "low" || item.reasoningEffort === "medium" ||
      item.reasoningEffort === "high" || item.reasoningEffort === "xhigh" ? item.reasoningEffort : null;
    const requestId = item.requestId === null ? null : nonEmptyText(item.requestId, 200);
    const inputTokens = nullableInteger(item.inputTokens, 100_000_000);
    const cachedInputTokens = nullableInteger(item.cachedInputTokens, 100_000_000);
    const cacheWriteTokens = nullableInteger(item.cacheWriteTokens, 100_000_000);
    const outputTokens = nullableInteger(item.outputTokens, 100_000_000);
    const totalTokens = nullableInteger(item.totalTokens, 200_000_000);
    const estimatedCostUsd = item.estimatedCostUsd === null ? null : finiteNumber(item.estimatedCostUsd, 0, 1_000);
    const estimatedCostIsValid = item.estimatedCostUsd === null || estimatedCostUsd !== null;
    const tokenTupleIsValid = inputTokens !== undefined && outputTokens !== undefined && totalTokens !== undefined &&
      ((inputTokens === null && outputTokens === null && totalTokens === null) ||
        (typeof inputTokens === "number" && typeof outputTokens === "number" && typeof totalTokens === "number" &&
          totalTokens === inputTokens + outputTokens));
    const cacheTupleIsValid = cachedInputTokens !== undefined && cacheWriteTokens !== undefined && (
      (cachedInputTokens === null && cacheWriteTokens === null) ||
      (typeof cachedInputTokens === "number" && typeof cacheWriteTokens === "number" &&
        typeof inputTokens === "number" && cachedInputTokens + cacheWriteTokens <= inputTokens)
    );
    const costTupleIsValid = estimatedCostUsd === null || (
      typeof inputTokens === "number" && typeof cachedInputTokens === "number" &&
      typeof cacheWriteTokens === "number" && typeof outputTokens === "number"
    );
    if (attempt !== index + 1 || !purpose || !model || !MODEL_IDENTIFIER.test(model) || !reasoningEffort ||
        (item.requestId !== null && !requestId) || !estimatedCostIsValid || !tokenTupleIsValid ||
        !cacheTupleIsValid || !costTupleIsValid) return null;
    if ((index === 0 && purpose === "repair") || (index === 1 && purpose !== "repair")) return null;
    return {
      attempt,
      purpose,
      model,
      reasoningEffort,
      requestId,
      inputTokens: inputTokens as number | null,
      cachedInputTokens: cachedInputTokens as number | null,
      cacheWriteTokens: cacheWriteTokens as number | null,
      outputTokens: outputTokens as number | null,
      totalTokens: totalTokens as number | null,
      estimatedCostUsd
    };
  });
  return parsed.every((item): item is PointObjectAiAttemptTrace => item !== null) ? parsed : null;
}

function sumTraceField(
  trace: PointObjectAiAttemptTrace[],
  field: "inputTokens" | "cachedInputTokens" | "cacheWriteTokens" | "outputTokens" | "totalTokens"
): number | null {
  return trace.every((attempt) => typeof attempt[field] === "number")
    ? trace.reduce((sum, attempt) => sum + (attempt[field] as number), 0)
    : null;
}

type ParsedPointObjectAiTelemetry = Extract<PointObjectAiResponse, { mode: "openai" }>["telemetry"];

function parsePointObjectAiTelemetryFor(
  value: unknown,
  expectedSchemaVersion: typeof POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION | typeof POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION,
  expectedPromptVersion: typeof POINT_OBJECT_ANALYSIS_PROMPT_VERSION | typeof POINT_OBJECT_ANALYSIS_LEGACY_PROMPT_VERSION
): ParsedPointObjectAiTelemetry | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "provider", "schemaVersion", "model", "reasoningEffort", "depth", "promptVersion", "requestId", "latencyMs", "attempts", "attemptTrace",
    "inputTokens", "cachedInputTokens", "cacheWriteTokens", "outputTokens", "totalTokens", "estimatedCostUsd", "costRateSource", "stored", "toolCalls"
  ])) return null;
  const model = nonEmptyText(value.model, 120);
  const reasoningEffort = value.reasoningEffort === "low" || value.reasoningEffort === "medium" || value.reasoningEffort === "high" || value.reasoningEffort === "xhigh"
    ? value.reasoningEffort
    : null;
  const depth = value.depth === "quick" || value.depth === "standard" || value.depth === "deep" ? value.depth : null;
  const requestId = value.requestId === null ? null : nonEmptyText(value.requestId, 200);
  const latencyMs = integer(value.latencyMs, 0, 300_000);
  const attempts = integer(value.attempts, 1, 2);
  const attemptTrace = parseAttemptTrace(value.attemptTrace);
  const inputTokens = nullableInteger(value.inputTokens, 100_000_000);
  const cachedInputTokens = nullableInteger(value.cachedInputTokens, 100_000_000);
  const cacheWriteTokens = nullableInteger(value.cacheWriteTokens, 100_000_000);
  const outputTokens = nullableInteger(value.outputTokens, 100_000_000);
  const totalTokens = nullableInteger(value.totalTokens, 200_000_000);
  const estimatedCostUsd = value.estimatedCostUsd === null ? null : finiteNumber(value.estimatedCostUsd, 0, 1_000);
  const costRateSource = value.costRateSource === null ? null : nonEmptyText(value.costRateSource, 500);
  const estimatedCostIsValid = value.estimatedCostUsd === null || estimatedCostUsd !== null;
  const costRateSourceIsValid = value.costRateSource === null || costRateSource !== null;
  const tokenTupleIsValid = inputTokens !== undefined && outputTokens !== undefined && totalTokens !== undefined &&
    ((inputTokens === null && outputTokens === null && totalTokens === null) ||
      (inputTokens !== null && outputTokens !== null && totalTokens !== null && totalTokens === inputTokens + outputTokens));
  const cacheBreakdownIsValid = cachedInputTokens !== undefined && cacheWriteTokens !== undefined && (
    (cachedInputTokens === null && cacheWriteTokens === null) ||
    (typeof cachedInputTokens === "number" && typeof cacheWriteTokens === "number" &&
      typeof inputTokens === "number" && cachedInputTokens + cacheWriteTokens <= inputTokens)
  );
  const costTupleIsValid = (estimatedCostUsd === null && costRateSource === null) ||
    (estimatedCostUsd !== null && costRateSource !== null && cachedInputTokens !== null && cacheWriteTokens !== null);
  const traceCost = attemptTrace && attemptTrace.every((attempt) => attempt.estimatedCostUsd !== null)
    ? Number(attemptTrace.reduce((sum, attempt) => sum + (attempt.estimatedCostUsd as number), 0).toFixed(8))
    : null;
  const traceMatchesAggregate = Boolean(attemptTrace && attempts === attemptTrace.length &&
    inputTokens === sumTraceField(attemptTrace, "inputTokens") &&
    cachedInputTokens === sumTraceField(attemptTrace, "cachedInputTokens") &&
    cacheWriteTokens === sumTraceField(attemptTrace, "cacheWriteTokens") &&
    outputTokens === sumTraceField(attemptTrace, "outputTokens") &&
    totalTokens === sumTraceField(attemptTrace, "totalTokens") &&
    estimatedCostUsd === traceCost &&
    model === attemptTrace.at(-1)?.model && reasoningEffort === attemptTrace.at(-1)?.reasoningEffort &&
    requestId === attemptTrace.at(-1)?.requestId);
  if (value.provider !== "openai" || value.schemaVersion !== expectedSchemaVersion ||
      !model || !MODEL_IDENTIFIER.test(model) || !reasoningEffort || !depth ||
      value.promptVersion !== expectedPromptVersion ||
      (value.requestId !== null && !requestId) || latencyMs === null || attempts === null || !tokenTupleIsValid ||
      !estimatedCostIsValid || !costRateSourceIsValid || !cacheBreakdownIsValid || !costTupleIsValid ||
      !traceMatchesAggregate || value.stored !== false || value.toolCalls !== 0) return null;
  return {
    provider: "openai",
    schemaVersion: expectedSchemaVersion,
    model,
    reasoningEffort,
    depth,
    promptVersion: expectedPromptVersion,
    requestId,
    latencyMs,
    attempts,
    attemptTrace: attemptTrace as PointObjectAiAttemptTrace[],
    inputTokens: inputTokens as number | null,
    cachedInputTokens: cachedInputTokens as number | null,
    cacheWriteTokens: cacheWriteTokens as number | null,
    outputTokens: outputTokens as number | null,
    totalTokens: totalTokens as number | null,
    estimatedCostUsd,
    costRateSource,
    stored: false,
    toolCalls: 0
  } as ParsedPointObjectAiTelemetry;
}

export function parsePointObjectAiTelemetry(value: unknown): PointObjectAiTelemetry | null {
  return parsePointObjectAiTelemetryFor(
    value,
    POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION,
    POINT_OBJECT_ANALYSIS_PROMPT_VERSION
  ) as PointObjectAiTelemetry | null;
}

export function parsePointObjectAiResponse(value: unknown): PointObjectAiResponse | null {
  if (!isRecord(value) || (value.mode !== "openai" && value.mode !== "unavailable")) return null;
  if (value.mode === "unavailable") {
    if (!hasOnlyKeys(value, ["mode", "code", "error", "retryable"])) return null;
    const code = value.code === undefined ? undefined : nonEmptyText(value.code, 100) ?? null;
    const error = value.error === undefined ? undefined : nonEmptyText(value.error, 500) ?? null;
    const retryable = value.retryable === undefined ? undefined : typeof value.retryable === "boolean" ? value.retryable : null;
    if (code === null || error === null || retryable === null) return null;
    return { mode: "unavailable", code, error, retryable };
  }
  if (!hasExactKeys(value, ["mode", "schemaVersion", "generatedAt", "evidencePackId", "evidencePackHash", "request", "content", "subject", "telemetry"]) ||
      value.schemaVersion !== POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION) return null;
  const generatedAt = isoTimestamp(value.generatedAt);
  const evidencePackId = nonEmptyText(value.evidencePackId, 160);
  const evidencePackHash = typeof value.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(value.evidencePackHash)
    ? value.evidencePackHash
    : null;
  const request = parseRequestReceipt(value.request);
  const content = parseContent(value.content);
  const subject = parseSubject(value.subject);
  const telemetry = parsePointObjectAiTelemetry(value.telemetry);
  if (!generatedAt || !evidencePackId || !/^[A-Za-z0-9_.:-]+$/.test(evidencePackId) || !evidencePackHash ||
      !request || !content || !subject || !telemetry || telemetry.depth !== request.depth ||
      telemetry.attemptTrace[0]?.purpose !== (request.focused ? "focused" : "initial") ||
      (request.focused && content.answerToQuestion === null) ||
      (!request.focused && content.answerToQuestion !== null) ||
      (content.answerToQuestion !== null && (
        content.answerToQuestion.perspective !== request.perspective || content.answerToQuestion.horizon !== request.horizon
      ))) return null;
  return {
    mode: "openai",
    schemaVersion: POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION,
    generatedAt,
    evidencePackId,
    evidencePackHash,
    request,
    content,
    subject,
    telemetry
  };
}

export function parseLegacyPointObjectAiResponse(value: unknown): Extract<PointObjectAiResponse, { mode: "openai"; schemaVersion: 5 }> | null {
  if (!isRecord(value) || !hasExactKeys(value, ["mode", "schemaVersion", "generatedAt", "evidencePackId", "evidencePackHash", "request", "content", "subject", "telemetry"]) ||
      value.mode !== "openai" || value.schemaVersion !== POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION) return null;
  const generatedAt = isoTimestamp(value.generatedAt);
  const evidencePackId = nonEmptyText(value.evidencePackId, 160);
  const evidencePackHash = typeof value.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(value.evidencePackHash) ? value.evidencePackHash : null;
  const request = parseRequestReceipt(value.request);
  const content = parseLegacyContent(value.content);
  const subject = parseLegacySubject(value.subject);
  const telemetry = parsePointObjectAiTelemetryFor(
    value.telemetry,
    POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION,
    POINT_OBJECT_ANALYSIS_LEGACY_PROMPT_VERSION
  );
  if (!generatedAt || !evidencePackId || !/^[A-Za-z0-9_.:-]+$/.test(evidencePackId) || !evidencePackHash ||
      !request || !content || !subject || !telemetry || telemetry.schemaVersion !== 5 ||
      telemetry.promptVersion !== POINT_OBJECT_ANALYSIS_LEGACY_PROMPT_VERSION || telemetry.depth !== request.depth ||
      telemetry.attemptTrace[0]?.purpose !== (request.focused ? "focused" : "initial") ||
      (request.focused && content.answerToQuestion === null) || (!request.focused && content.answerToQuestion !== null) ||
      (content.answerToQuestion !== null && (content.answerToQuestion.perspective !== request.perspective || content.answerToQuestion.horizon !== request.horizon))) return null;
  return {
    mode: "openai",
    schemaVersion: POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION,
    generatedAt,
    evidencePackId,
    evidencePackHash,
    request,
    content,
    subject,
    telemetry: telemetry as Extract<PointObjectAiResponse, { mode: "openai"; schemaVersion: 5 }>["telemetry"]
  };
}

export function readPointObjectAnalysis(selection: LiveMapSelection): PointObjectAiResponse | null {
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_SESSION_KEYS.analysis);
    if (raw && raw.length <= MAX_ANALYSIS_BYTES) {
      const envelope: unknown = JSON.parse(raw);
      if (isRecord(envelope) && hasExactKeys(envelope, ["selectionFingerprint", "analysis"]) &&
          envelope.selectionFingerprint === selectionFingerprint(selection)) {
        const current = parsePointObjectAiResponse(envelope.analysis);
        if (current) return current;
      }
    }
    const legacyRaw = window.sessionStorage.getItem(POINT_OBJECT_SESSION_KEYS.legacyAnalysis);
    if (!legacyRaw || legacyRaw.length > MAX_ANALYSIS_BYTES) return null;
    const legacyEnvelope: unknown = JSON.parse(legacyRaw);
    if (!isRecord(legacyEnvelope) || !hasExactKeys(legacyEnvelope, ["selectionFingerprint", "analysis"]) ||
        legacyEnvelope.selectionFingerprint !== selectionFingerprint(selection)) return null;
    return parseLegacyPointObjectAiResponse(legacyEnvelope.analysis);
  } catch {
    return null;
  }
}

export function writePointObjectAnalysis(analysis: PointObjectAiResponse, selection: LiveMapSelection): void {
  try {
    const validatedAnalysis = parsePointObjectAiResponse(analysis);
    if (!validatedAnalysis) return;
    const serialized = JSON.stringify({ selectionFingerprint: selectionFingerprint(selection), analysis: validatedAnalysis });
    if (serialized.length <= MAX_ANALYSIS_BYTES) {
      window.sessionStorage.setItem(POINT_OBJECT_SESSION_KEYS.analysis, serialized);
    }
  } catch {
    // The current in-memory analysis remains available.
  }
}

export function clearPointObjectAnalysis(): void {
  try {
    window.sessionStorage.removeItem(POINT_OBJECT_SESSION_KEYS.analysis);
    window.sessionStorage.removeItem(POINT_OBJECT_SESSION_KEYS.legacyAnalysis);
  } catch {
    // No durable browser state to clear.
  }
}
