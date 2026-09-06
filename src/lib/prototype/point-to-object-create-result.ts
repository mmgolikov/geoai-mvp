import type { Feature, Polygon } from "geojson";
import type { PointObjectAreaContextGroup, PointObjectAreaContextResult } from "./point-to-object-area-context-contract";
import { isPointObjectLocale, isPointObjectMarketKey } from "./point-to-object-markets";

import {
  validatePointObjectCreateAoiVertices,
  validateRedevelopmentProgram,
  type ConceptMassingAlternative,
  type ConceptMassingProperties,
  type ConceptMassingResult,
  type PointObjectCreateAoi,
  type ValidatedRedevelopmentProgram
} from "./point-to-object-create";

export const POINT_OBJECT_CREATE_RESULT_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const AREA_CONTEXT_GROUPS: readonly PointObjectAreaContextGroup[] = ["residential", "commercial", "hospitality", "retail_daily_needs", "education", "healthcare", "civic_culture", "transport", "access", "open_space", "industrial", "construction", "other_built"];
// Producer seeds combine a bounded prompt/version namespace, a 64-character AOI hash,
// bounded programme identity JSON and a short variant/fallback suffix. Keep headroom
// for the current 389-character output and compatible legacy values without accepting
// unbounded saved/server payloads.
const MAX_MASSING_SEED_LENGTH = 1_024;

export type PointObjectGeneratedConcept = {
  mode: "openai_concept";
  generatedAt: string;
  promptVersion: string;
  program: ValidatedRedevelopmentProgram;
  massing: ConceptMassingResult;
  alternatives?: ConceptMassingAlternative[];
  telemetry: {
    model: string;
    reasoningEffort: string;
    requestId?: string | null;
    latencyMs: number;
    attempts: number;
    inputTokens?: number | null;
    cachedInputTokens?: number | null;
    cacheWriteTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
    estimatedCostUsd: number | null;
    costRateSource?: string | null;
    stored?: false;
    toolCalls?: 0;
    attemptTrace?: unknown[];
  };
  caveat: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isPointObjectAreaContextResult(value: unknown): value is PointObjectAreaContextResult {
  if (!isRecord(value) || value.protocol !== "POINT_TO_OBJECT_001_AREA_CONTEXT_V1" ||
      (value.mode !== "results" && value.mode !== "empty") || !isRecord(value.request) ||
      !isPointObjectMarketKey(value.request.marketKey) || !isPointObjectLocale(value.request.locale) ||
      !Array.isArray(value.request.aoiCoordinates) || value.request.aoiCoordinates.length !== 1 ||
      !Array.isArray(value.request.aoiCoordinates[0]) || value.request.aoiCoordinates[0].length < 4 || value.request.aoiCoordinates[0].length > 26 ||
      !value.request.aoiCoordinates[0].every((point) => Array.isArray(point) && point.length === 2 && finite(point[0], -180, 180) && finite(point[1], -90, 90)) ||
      !isRecord(value.area) || !finite(value.area.areaSqM, 0, 1_000_000_000) || !finite(value.area.perimeterM, 0, 1_000_000_000) ||
      !isRecord(value.area.centroid) || !finite(value.area.centroid.longitude, -180, 180) || !finite(value.area.centroid.latitude, -90, 90) ||
      !Array.isArray(value.features) || value.features.length > 80 || !isRecord(value.summary) || !isRecord(value.coverage) ||
      !isRecord(value.source) || !Array.isArray(value.limitations) || value.limitations.length > 24 ||
      value.limitations.some((item) => typeof item !== "string" || !item.trim() || item.length > 1_000) ||
      value.caveat !== POINT_OBJECT_CREATE_RESULT_CAVEAT) return false;
  if (!value.features.every((feature) => isRecord(feature) && typeof feature.sourceFeatureId === "string" &&
      /^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(feature.sourceFeatureId) && finite(feature.longitude, -180, 180) &&
      finite(feature.latitude, -90, 90) && typeof feature.label === "string" && Boolean(feature.label.trim()) && feature.label.length <= 240 &&
      typeof feature.group === "string" && AREA_CONTEXT_GROUPS.includes(feature.group as PointObjectAreaContextGroup) &&
      (feature.mappedBuildingLevels === null || (Number.isInteger(feature.mappedBuildingLevels) && Number(feature.mappedBuildingLevels) >= 1 && Number(feature.mappedBuildingLevels) <= 300)) &&
      isRecord(feature.observedTags) && Object.keys(feature.observedTags).length <= 24 && Object.values(feature.observedTags).every((item) => typeof item === "string" && item.length <= 240) &&
      feature.inclusionMethod === "returned_center_inside_aoi")) return false;
  const summary = value.summary;
  if (!Number.isInteger(summary.sampleSize) || Number(summary.sampleSize) < value.features.length ||
      !Number.isInteger(summary.namedFeatureCount) || Number(summary.namedFeatureCount) < 0 ||
      !Number.isInteger(summary.mappedBuildingCount) || Number(summary.mappedBuildingCount) < 0 ||
      !Number.isInteger(summary.mappedLevelsKnownCount) || Number(summary.mappedLevelsKnownCount) < 0 ||
      !(summary.medianMappedLevels === null || finite(summary.medianMappedLevels, 0, 300)) ||
      !(summary.nearestTransitM === null || finite(summary.nearestTransitM, 0, 1_000_000_000)) ||
      !(summary.nearestMajorRoadM === null || finite(summary.nearestMajorRoadM, 0, 1_000_000_000)) ||
      !Array.isArray(summary.groups) || summary.groups.length > AREA_CONTEXT_GROUPS.length ||
      !summary.groups.every((group) => isRecord(group) && typeof group.group === "string" && AREA_CONTEXT_GROUPS.includes(group.group as PointObjectAreaContextGroup) &&
        Number.isInteger(group.count) && Number(group.count) > 0 && finite(group.sharePct, 0, 100))) return false;
  const coverage = value.coverage;
  if (coverage.kind !== "bounded_open_map_polygon_sample" || coverage.inclusionMethod !== "returned_center_inside_aoi" ||
      coverage.geometryCoverage !== "centroid_proxy_not_complete_intersection" || !Number.isInteger(coverage.upstreamElementCount) || Number(coverage.upstreamElementCount) < 0 ||
      !Number.isInteger(coverage.normalizedInsideCount) || Number(coverage.normalizedInsideCount) < 0 ||
      !Number.isInteger(coverage.returnedFeatureCount) || Number(coverage.returnedFeatureCount) !== value.features.length ||
      !Number.isInteger(coverage.upstreamQueryLimit) || Number(coverage.upstreamQueryLimit) < 1 || coverage.featureReturnLimit !== 80 ||
      typeof coverage.capReached !== "boolean" || coverage.completeInventory !== false) return false;
  const source = value.source;
  if (source.name !== "OpenStreetMap" || source.service !== "Overpass API" || typeof source.sourceResponseHash !== "string" || !/^[a-f0-9]{64}$/.test(source.sourceResponseHash) ||
      !(source.observedAt === null || isoTimestamp(source.observedAt)) || !isoTimestamp(source.acquiredAt) || source.licenceId !== "ODbL-1.0" ||
      source.attribution !== "© OpenStreetMap contributors" || source.licenceUrl !== "https://www.openstreetmap.org/copyright" ||
      source.officialStatus !== "open_context_not_official" || source.runtimeNetworkUsed !== true || source.persistenceUsed !== false) return false;
  return (value.mode === "empty") === (value.features.length === 0);
}

function samePoint(left: readonly number[], right: readonly number[]): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

export function parsePointObjectCreateAoi(value: unknown): PointObjectCreateAoi | null {
  if (!isRecord(value) || typeof value.id !== "string" || !/^create-aoi-[A-Za-z0-9_.:-]{1,120}$/.test(value.id) ||
      !Array.isArray(value.coordinates) || value.coordinates.length !== 1 || !Array.isArray(value.coordinates[0]) ||
      !Number.isInteger(value.vertexCount) || !finite(value.areaSqM, 100, 1_000_000) || !finite(value.perimeterM, 1, 10_000_000)) return null;
  const ring = value.coordinates[0];
  if (ring.length < 4 || ring.length > 26 || !ring.every((point) => Array.isArray(point) && point.length === 2 &&
      finite(point[0], -180, 180) && finite(point[1], -90, 90)) || !samePoint(ring[0], ring[ring.length - 1])) return null;
  const openRing = ring.slice(0, -1) as Array<[number, number]>;
  if (value.vertexCount !== openRing.length) return null;
  const validation = validatePointObjectCreateAoiVertices(openRing);
  if (!validation.ok || Math.abs(validation.measurements.areaSqM - value.areaSqM) > 0.1 ||
      Math.abs(validation.measurements.perimeterM - value.perimeterM) > 0.1) return null;
  return {
    id: value.id,
    coordinates: [ring as Array<[number, number]>],
    areaSqM: value.areaSqM,
    perimeterM: value.perimeterM,
    vertexCount: value.vertexCount
  };
}

function isFeature(value: unknown): value is Feature<Polygon, ConceptMassingProperties> {
  if (!isRecord(value) || value.type !== "Feature" || !isRecord(value.geometry) || value.geometry.type !== "Polygon" ||
      !Array.isArray(value.geometry.coordinates) || value.geometry.coordinates.length !== 1 || !isRecord(value.properties)) return false;
  const properties = value.properties;
  const ring = value.geometry.coordinates[0];
  return Array.isArray(ring) && ring.length >= 4 && ring.length <= 32 &&
    ring.every((point) => Array.isArray(point) && point.length === 2 && finite(point[0], -180, 180) && finite(point[1], -90, 90)) &&
    samePoint(ring[0], ring[ring.length - 1]) && typeof value.id === "string" && value.id === properties.id && typeof properties.id === "string" &&
    properties.kind === "concept_massing" &&
    (properties.templateId === "residential_mixed_use" || properties.templateId === "commercial_hub" || properties.templateId === "civic_green") &&
    (properties.massingStyle === "perimeter" || properties.massingStyle === "courtyard" || properties.massingStyle === "towers_on_podium" || properties.massingStyle === "campus") &&
    (properties.variantId === "A" || properties.variantId === "B") &&
    (properties.volumeRole === "perimeter_wing" || properties.volumeRole === "courtyard_wing" || properties.volumeRole === "podium" || properties.volumeRole === "tower" || properties.volumeRole === "campus_block") &&
    typeof properties.primaryBlock === "boolean" &&
    (properties.use === "residential" || properties.use === "office" || properties.use === "retail" || properties.use === "hospitality" || properties.use === "civic") &&
    Number.isInteger(properties.levels) && Number(properties.levels) >= 1 && Number(properties.levels) <= 300 && finite(properties.heightM, 0.1, 1_000) && finite(properties.baseM, 0, 1_000) &&
    (properties.supportingPodiumId === undefined || properties.supportingPodiumId === null || (typeof properties.supportingPodiumId === "string" && properties.supportingPodiumId.length <= 240)) &&
    (properties.footprintForm === undefined || properties.footprintForm === "rectangle" || properties.footprintForm === "chamfered" || properties.footprintForm === "l_shape" || properties.footprintForm === "u_shape") &&
    typeof properties.label === "string" && properties.label.length > 0 && properties.label.length <= 240;
}

function isMassingShape(value: unknown, program: ValidatedRedevelopmentProgram): value is ConceptMassingResult {
  if (!isRecord(value) || !isRecord(value.featureCollection) || value.featureCollection.type !== "FeatureCollection" ||
      !Array.isArray(value.featureCollection.features) || value.featureCollection.features.length < 1 ||
      value.featureCollection.features.length > 24 || !value.featureCollection.features.every(isFeature) ||
      (value.variantId !== "A" && value.variantId !== "B") ||
      value.massingStyle !== program.massingStyle || value.requestedBlockCount !== program.blockCount) return false;
  for (const key of ["requestedBlockCount", "generatedBlockCount", "generatedFeatureCount", "minGeneratedLevels", "maxGeneratedLevels"] as const) {
    if (!Number.isInteger(value[key]) || Number(value[key]) < 1 || Number(value[key]) > 100) return false;
  }
  for (const key of ["aoiAreaSqM", "generatedFootprintAreaSqM", "achievedSiteCoveragePct", "estimatedFloorAreaSqM"] as const) {
    if (!finite(value[key], 0, 1_000_000_000)) return false;
  }
  const features = value.featureCollection.features;
  const primary = features.filter((feature) => feature.properties.primaryBlock);
  const primaryLevels = primary.map((feature) => feature.properties.levels);
  return features.every((feature) => feature.properties.variantId === value.variantId && feature.properties.massingStyle === value.massingStyle) &&
    value.generatedFeatureCount === features.length && value.generatedBlockCount === primary.length && primary.length > 0 &&
    value.minGeneratedLevels === Math.min(...primaryLevels) && value.maxGeneratedLevels === Math.max(...primaryLevels) &&
    finite(value.achievedSiteCoveragePct, 0, 100) && Number(value.generatedFootprintAreaSqM) <= Number(value.aoiAreaSqM) &&
    Math.abs(Number(value.achievedSiteCoveragePct) - Number(value.generatedFootprintAreaSqM) / Number(value.aoiAreaSqM) * 100) <= 1 &&
    typeof value.seed === "string" && value.seed.length > 0 && value.seed.length <= MAX_MASSING_SEED_LENGTH;
}

function validTelemetry(value: unknown): value is PointObjectGeneratedConcept["telemetry"] {
  if (!isRecord(value) || typeof value.model !== "string" || !value.model || value.model.length > 120 ||
      typeof value.reasoningEffort !== "string" || !value.reasoningEffort || value.reasoningEffort.length > 40 ||
      !finite(value.latencyMs, 0, 600_000) || !Number.isInteger(value.attempts) || Number(value.attempts) < 1 || Number(value.attempts) > 8 ||
      !(value.estimatedCostUsd === null || finite(value.estimatedCostUsd, 0, 1_000))) return false;
  if (!(value.requestId === undefined || value.requestId === null || (typeof value.requestId === "string" && value.requestId.length <= 180))) return false;
  for (const key of ["inputTokens", "cachedInputTokens", "cacheWriteTokens", "outputTokens", "totalTokens"] as const) {
    const item = value[key];
    if (!(item === undefined || item === null || (Number.isInteger(item) && Number(item) >= 0 && Number(item) <= 100_000_000))) return false;
  }
  if (!(value.costRateSource === undefined || value.costRateSource === null || (typeof value.costRateSource === "string" && value.costRateSource.length <= 1_000))) return false;
  if (!(value.stored === undefined || value.stored === false) || !(value.toolCalls === undefined || value.toolCalls === 0)) return false;
  return value.attemptTrace === undefined || (Array.isArray(value.attemptTrace) && value.attemptTrace.length <= 8);
}

export function parsePointObjectGeneratedConcept(value: unknown, aoi: PointObjectCreateAoi): PointObjectGeneratedConcept | null {
  if (!isRecord(value) || value.mode !== "openai_concept" || !isoTimestamp(value.generatedAt) ||
      typeof value.promptVersion !== "string" || !/^POINT_OBJECT_CREATE_[A-Z0-9_]{1,120}$/.test(value.promptVersion) ||
      !validTelemetry(value.telemetry) || value.caveat !== POINT_OBJECT_CREATE_RESULT_CAVEAT) return null;
  if (!isRecord(value.program) || value.program.schemaVersion !== 1) return null;
  const { schemaVersion: _schemaVersion, ...programInput } = value.program;
  const program = validateRedevelopmentProgram(programInput);
  if (!program.ok) return null;
  const massing = value.massing;
  if (!isMassingShape(massing, program.value)) return null;
  if (Math.abs(massing.aoiAreaSqM - aoi.areaSqM) / Math.max(aoi.areaSqM, 1) > 0.5) return null;
  const alternatives = value.alternatives;
  if (!(alternatives === undefined || (Array.isArray(alternatives) && alternatives.length >= 1 && alternatives.length <= 2))) return null;
  const parsedAlternatives: ConceptMassingAlternative[] | undefined = alternatives?.flatMap((item) => {
    if (!isRecord(item) || (item.id !== "A" && item.id !== "B") || typeof item.label !== "string" ||
        !item.label || item.label.length > 240 || !isMassingShape(item.massing, program.value) || item.massing.variantId !== item.id) return [];
    return [{ id: item.id, label: item.label, massing: item.massing }];
  });
  if (alternatives && (parsedAlternatives?.length !== alternatives.length || new Set(parsedAlternatives.map((item) => item.id)).size !== parsedAlternatives.length)) return null;
  if (parsedAlternatives && !parsedAlternatives.some((item) => item.id === massing.variantId)) return null;
  return {
    mode: "openai_concept",
    generatedAt: value.generatedAt,
    promptVersion: value.promptVersion,
    program: program.value,
    massing,
    alternatives: parsedAlternatives,
    telemetry: value.telemetry,
    caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT
  };
}
