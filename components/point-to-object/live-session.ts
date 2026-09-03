import type { GeoJsonGeometry } from "@/src/lib/point-to-object/contracts";
import { LIVE_POINT_CAVEAT } from "@/src/lib/point-to-object/contracts";
import type {
  LiveMapSelection,
  PointObjectAiResponse,
  Wgs84Position
} from "@/components/point-to-object/live-types";

export const POINT_OBJECT_SESSION_KEYS = {
  selection: "geoai:point-to-object:selection:v2",
  question: "geoai:point-to-object:question:v2",
  analysis: "geoai:point-to-object:analysis:v3"
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

export function readPointObjectSelection(): LiveMapSelection | null {
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_SESSION_KEYS.selection);
    if (!raw || raw.length > MAX_SELECTION_BYTES) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !isRecord(value.object) || !isRecord(value.viewport) ||
        (value.locationKey !== "dubai" && value.locationKey !== "singapore") ||
        value.provider !== "OpenFreeMap / OpenStreetMap") return null;
    const point = coordinate([value.longitude, value.latitude]);
    const center = coordinate(value.viewport.center);
    const clickedAt = safeText(value.clickedAt, 80);
    const featureClass = safeText(value.object.featureClass, 80);
    const sourceFeatureId = value.object.sourceFeatureId === null
      ? null
      : safeText(value.object.sourceFeatureId, 128);
    const name = value.object.name === null ? null : safeText(value.object.name, 160);
    if (!point || !center || !clickedAt || !featureClass ||
        typeof value.viewport.zoom !== "number" || !Number.isFinite(value.viewport.zoom) ||
        value.viewport.zoom < 0 || value.viewport.zoom > 24 ||
        (value.object.name !== null && name === null) ||
        (value.object.sourceFeatureId !== null && sourceFeatureId === null)) return null;
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
    return {
      locationKey: value.locationKey,
      longitude: point[0],
      latitude: point[1],
      clickedAt,
      object: { name, featureClass, sourceFeatureId, geometry: restoredGeometry },
      viewport: { center, zoom: value.viewport.zoom },
      provider: "OpenFreeMap / OpenStreetMap",
      nearbyLabels
    };
  } catch {
    return null;
  }
}

export function writePointObjectSelection(selection: LiveMapSelection): void {
  const serialized = JSON.stringify(selection);
  if (serialized.length <= MAX_SELECTION_BYTES) {
    window.sessionStorage.setItem(POINT_OBJECT_SESSION_KEYS.selection, serialized);
  }
}

export function clearPointObjectSelection(): void {
  window.sessionStorage.removeItem(POINT_OBJECT_SESSION_KEYS.selection);
}

export function readPointObjectQuestion(): string {
  const value = window.sessionStorage.getItem(POINT_OBJECT_SESSION_KEYS.question);
  return typeof value === "string" ? value.slice(0, 500) : "";
}

export function writePointObjectQuestion(question: string): void {
  window.sessionStorage.setItem(POINT_OBJECT_SESSION_KEYS.question, question.slice(0, 500));
}

function evidenceRefs(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return null;
  const refs = value.map((item) => nonEmptyText(item, 80));
  return refs.every((item): item is string => item !== null) ? refs : null;
}

function claim(value: unknown, maxStatement = 900): { statement: string; evidenceRefs: string[] } | null {
  if (!isRecord(value)) return null;
  const statement = nonEmptyText(value.statement, maxStatement);
  const refs = evidenceRefs(value.evidenceRefs);
  return statement && refs ? { statement, evidenceRefs: refs } : null;
}

function claims(value: unknown, maxItems: number): Array<{ statement: string; evidenceRefs: string[] }> | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const parsed = value.map((item) => claim(item));
  return parsed.every((item): item is { statement: string; evidenceRefs: string[] } => item !== null) ? parsed : null;
}

export function readPointObjectAnalysis(selection: LiveMapSelection): PointObjectAiResponse | null {
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_SESSION_KEYS.analysis);
    if (!raw || raw.length > MAX_ANALYSIS_BYTES) return null;
    const envelope: unknown = JSON.parse(raw);
    if (!isRecord(envelope) || envelope.selectionFingerprint !== selectionFingerprint(selection)) return null;
    const value = envelope.analysis;
    if (!isRecord(value) || (value.mode !== "openai" && value.mode !== "unavailable")) return null;
    if (value.mode === "unavailable") {
      return {
        mode: "unavailable",
        code: safeText(value.code, 100) ?? undefined,
        error: safeText(value.error, 500) ?? undefined,
        retryable: typeof value.retryable === "boolean" ? value.retryable : undefined
      };
    }
    if (!isRecord(value.content) || !isRecord(value.subject)) return null;
    const confirmedFacts = claims(value.content.confirmedFacts, 6);
    const locationContext = claims(value.content.locationContext, 5);
    const aiInferencesRaw = Array.isArray(value.content.aiInferences) && value.content.aiInferences.length <= 4
      ? value.content.aiInferences
      : null;
    const aiInferences = aiInferencesRaw?.flatMap((item) => {
      const parsed = claim(item);
      if (!parsed || !isRecord(item) || (item.confidence !== "low" && item.confidence !== "medium")) return [];
      return [{ ...parsed, confidence: item.confidence as "low" | "medium" }];
    }) ?? null;
    const observationsRaw = Array.isArray(value.content.decisionObservations) && value.content.decisionObservations.length >= 2 && value.content.decisionObservations.length <= 4
      ? value.content.decisionObservations
      : null;
    const decisionObservations = observationsRaw?.flatMap((item) => {
      const parsed = claim(item);
      if (!parsed || !isRecord(item) || item.validationRequired !== true) return [];
      return [{ ...parsed, validationRequired: true as const }];
    }) ?? null;
    const missingInformation = Array.isArray(value.content.missingInformation)
      ? value.content.missingInformation.map((item) => nonEmptyText(item, 500)).filter((item): item is string => item !== null).slice(0, 8)
      : null;
    const answerToQuestion = value.content.answerToQuestion === null ? null : claim(value.content.answerToQuestion);
    const subjectName = value.subject.name === null ? null : nonEmptyText(value.subject.name, 240);
    const subjectAddress = value.subject.address === null ? null : nonEmptyText(value.subject.address, 500);
    const generatedAt = nonEmptyText(value.generatedAt, 80);
    const evidencePackId = nonEmptyText(value.evidencePackId, 160);
    const evidencePackHash = typeof value.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(value.evidencePackHash)
      ? value.evidencePackHash
      : null;
    const featureClass = nonEmptyText(value.subject.featureClass, 160);
    const sourceFeatureId = nonEmptyText(value.subject.sourceFeatureId, 160);
    const sourceLabel = nonEmptyText(value.subject.sourceLabel, 160);
    const resolutionMethod = value.subject.resolutionMethod === "nominatim_reverse" ? value.subject.resolutionMethod : null;
    const coordinateAssociation = value.subject.coordinateAssociation === "open_map_geometry_contains_point" ||
      value.subject.coordinateAssociation === "reverse_nearest_indexed_object_not_point_in_polygon"
      ? value.subject.coordinateAssociation
      : null;
    if (!confirmedFacts?.length || !locationContext || aiInferencesRaw === null || aiInferences === null || aiInferences.length !== aiInferencesRaw.length ||
        !observationsRaw || !decisionObservations || decisionObservations.length !== observationsRaw.length ||
        !missingInformation || missingInformation.length < 2 ||
        (value.content.answerToQuestion !== null && !answerToQuestion) ||
        value.content.caveat !== LIVE_POINT_CAVEAT || !nonEmptyText(value.content.appearsToBe, 500) ||
        (value.subject.name !== null && !subjectName) || (value.subject.address !== null && !subjectAddress) ||
        !generatedAt || !evidencePackId || !evidencePackHash || !featureClass || !sourceFeatureId || !sourceLabel ||
        !resolutionMethod || !coordinateAssociation) return null;
    return {
      mode: "openai",
      generatedAt,
      evidencePackId,
      evidencePackHash,
      content: {
        appearsToBe: nonEmptyText(value.content.appearsToBe, 500) as string,
        confirmedFacts,
        aiInferences,
        locationContext,
        decisionObservations,
        missingInformation,
        answerToQuestion,
        caveat: LIVE_POINT_CAVEAT
      },
      subject: {
        name: subjectName,
        address: subjectAddress,
        featureClass,
        sourceFeatureId,
        resolutionMethod,
        coordinateAssociation,
        sourceLabel
      }
    };
  } catch {
    return null;
  }
}

export function writePointObjectAnalysis(analysis: PointObjectAiResponse, selection: LiveMapSelection): void {
  const serialized = JSON.stringify({ selectionFingerprint: selectionFingerprint(selection), analysis });
  if (serialized.length <= MAX_ANALYSIS_BYTES) {
    window.sessionStorage.setItem(POINT_OBJECT_SESSION_KEYS.analysis, serialized);
  }
}

export function clearPointObjectAnalysis(): void {
  window.sessionStorage.removeItem(POINT_OBJECT_SESSION_KEYS.analysis);
}
