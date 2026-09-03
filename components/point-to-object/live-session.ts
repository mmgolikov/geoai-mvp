import type { GeoJsonGeometry } from "@/src/lib/point-to-object/contracts";
import { LIVE_POINT_CAVEAT } from "@/src/lib/point-to-object/contracts";
import { POINT_OBJECT_ANALYSIS_PROMPT_VERSION } from "@/components/point-to-object/live-types";
import type {
  GroundedClaim,
  LiveMapBasemapId,
  LiveMapSelection,
  LiveResolvedObjectContext,
  PointObjectAiContent,
  PointObjectAiResponse,
  PointObjectAiSubject,
  PointObjectAiTelemetry,
  PointObjectAnalysisRequestReceipt,
  PointObjectDecisionBrief,
  PointObjectDecisionSignal,
  PointObjectOpportunity,
  PointObjectRisk,
  PointObjectValidationAction,
  Wgs84Position
} from "@/components/point-to-object/live-types";

export const POINT_OBJECT_SESSION_KEYS = {
  selection: "geoai:point-to-object:selection:v3",
  question: "geoai:point-to-object:question:v2",
  analysis: "geoai:point-to-object:analysis:v6"
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
    value.coordinateAssociation === "reverse_nearest_indexed_object_not_point_in_polygon"
    ? value.coordinateAssociation
    : null;
  const resultCentroidDistanceM = finiteNumber(value.resultCentroidDistanceM, 0, 1_000_000);
  const addressParts = stringMap(value.addressParts, 24);
  const tags = stringMap(value.tags, 36);
  if ((value.name !== null && !name) || (value.address !== null && !address) || !featureClass || !sourceFeatureId ||
      geometryType === undefined || !coordinateAssociation || resultCentroidDistanceM === null || !addressParts || !tags) return null;
  return { name, address, featureClass, sourceFeatureId, geometryType, coordinateAssociation, resultCentroidDistanceM, addressParts, tags };
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
    "decisionBrief", "signals", "opportunities", "risks", "sourceFacts", "locationContext", "nextValidation", "answerToQuestion", "caveat"
  ])) return null;
  const decisionBrief = parseDecisionBrief(value.decisionBrief);
  const signals = parseSignals(value.signals);
  const opportunities = parseOpportunities(value.opportunities);
  const risks = parseRisks(value.risks);
  const sourceFacts = claims(value.sourceFacts, 1, 6);
  const locationContext = claims(value.locationContext, 1, 7);
  const nextValidation = parseValidationActions(value.nextValidation);
  const answerToQuestion = value.answerToQuestion === null ? null : claim(value.answerToQuestion);
  if (!decisionBrief || !signals || !opportunities || !risks || !sourceFacts || !locationContext || !nextValidation ||
      (value.answerToQuestion !== null && !answerToQuestion) || value.caveat !== LIVE_POINT_CAVEAT) return null;
  return {
    decisionBrief,
    signals,
    opportunities,
    risks,
    sourceFacts,
    locationContext,
    nextValidation,
    answerToQuestion,
    caveat: LIVE_POINT_CAVEAT
  };
}

function parseRequestReceipt(value: unknown): PointObjectAnalysisRequestReceipt | null {
  if (!isRecord(value) || !hasExactKeys(value, ["depth", "goal", "perspective", "horizon", "question", "focused"])) return null;
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
  return depth && goal && perspective && horizon && (value.question === null || question) && focused !== null && focused === (question !== null)
    ? { depth, goal, perspective, horizon, question, focused }
    : null;
}

function parseSubject(value: unknown): PointObjectAiSubject | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "name", "address", "featureClass", "sourceFeatureId", "resolutionMethod", "coordinateAssociation", "sourceLabel",
    "geometryType", "resultCentroidDistanceM", "addressParts", "tags"
  ])) return null;
  const name = value.name === null ? null : nonEmptyText(value.name, 240);
  const address = value.address === null ? null : nonEmptyText(value.address, 500);
  const featureClass = nonEmptyText(value.featureClass, 160);
  const sourceFeatureId = nonEmptyText(value.sourceFeatureId, 160);
  const sourceLabel = nonEmptyText(value.sourceLabel, 160);
  const resolutionMethod = value.resolutionMethod === "nominatim_reverse" ? value.resolutionMethod : null;
  const coordinateAssociation = value.coordinateAssociation === "open_map_geometry_contains_point" ||
    value.coordinateAssociation === "reverse_nearest_indexed_object_not_point_in_polygon"
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
  if ((value.name !== null && !name) || (value.address !== null && !address) || !featureClass || !sourceFeatureId || !sourceLabel ||
      !resolutionMethod || !coordinateAssociation || geometryType === undefined || resultCentroidDistanceM === null || !addressParts || !tags) return null;
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
    tags
  };
}

function parseTelemetry(value: unknown): PointObjectAiTelemetry | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "provider", "model", "reasoningEffort", "depth", "promptVersion", "requestId", "latencyMs", "attempts",
    "inputTokens", "cachedInputTokens", "outputTokens", "totalTokens", "estimatedCostUsd", "costRateSource", "stored", "toolCalls"
  ])) return null;
  const model = nonEmptyText(value.model, 120);
  const reasoningEffort = value.reasoningEffort === "low" || value.reasoningEffort === "medium" || value.reasoningEffort === "high" || value.reasoningEffort === "xhigh"
    ? value.reasoningEffort
    : null;
  const depth = value.depth === "quick" || value.depth === "standard" || value.depth === "deep" ? value.depth : null;
  const requestId = value.requestId === null ? null : nonEmptyText(value.requestId, 200);
  const latencyMs = integer(value.latencyMs, 0, 300_000);
  const attempts = integer(value.attempts, 1, 2);
  const inputTokens = nullableInteger(value.inputTokens, 100_000_000);
  const cachedInputTokens = nullableInteger(value.cachedInputTokens, 100_000_000);
  const outputTokens = nullableInteger(value.outputTokens, 100_000_000);
  const totalTokens = nullableInteger(value.totalTokens, 200_000_000);
  const estimatedCostUsd = value.estimatedCostUsd === null ? null : finiteNumber(value.estimatedCostUsd, 0, 1_000);
  const costRateSource = value.costRateSource === null ? null : nonEmptyText(value.costRateSource, 500);
  const tokenTupleIsValid = inputTokens !== undefined && outputTokens !== undefined && totalTokens !== undefined &&
    ((inputTokens === null && outputTokens === null && totalTokens === null) ||
      (inputTokens !== null && outputTokens !== null && totalTokens !== null));
  const cachedTokenIsValid = cachedInputTokens !== undefined && (
    cachedInputTokens === null || (typeof inputTokens === "number" && cachedInputTokens <= inputTokens)
  );
  const costTupleIsValid = (estimatedCostUsd === null && costRateSource === null) ||
    (estimatedCostUsd !== null && costRateSource !== null && cachedInputTokens !== null && cachedInputTokens !== undefined);
  if (value.provider !== "openai" || !model || !MODEL_IDENTIFIER.test(model) || !reasoningEffort || !depth ||
      value.promptVersion !== POINT_OBJECT_ANALYSIS_PROMPT_VERSION ||
      (value.requestId !== null && !requestId) || latencyMs === null || attempts === null || !tokenTupleIsValid ||
      !cachedTokenIsValid || !costTupleIsValid || value.stored !== false || value.toolCalls !== 0) return null;
  return {
    provider: "openai",
    model,
    reasoningEffort,
    depth,
    promptVersion: POINT_OBJECT_ANALYSIS_PROMPT_VERSION,
    requestId,
    latencyMs,
    attempts,
    inputTokens: inputTokens as number | null,
    cachedInputTokens: cachedInputTokens as number | null,
    outputTokens: outputTokens as number | null,
    totalTokens: totalTokens as number | null,
    estimatedCostUsd,
    costRateSource,
    stored: false,
    toolCalls: 0
  };
}

function parseAnalysisResponse(value: unknown): PointObjectAiResponse | null {
  if (!isRecord(value) || (value.mode !== "openai" && value.mode !== "unavailable")) return null;
  if (value.mode === "unavailable") {
    if (!hasOnlyKeys(value, ["mode", "code", "error", "retryable"])) return null;
    const code = value.code === undefined ? undefined : nonEmptyText(value.code, 100) ?? null;
    const error = value.error === undefined ? undefined : nonEmptyText(value.error, 500) ?? null;
    const retryable = value.retryable === undefined ? undefined : typeof value.retryable === "boolean" ? value.retryable : null;
    if (code === null || error === null || retryable === null) return null;
    return { mode: "unavailable", code, error, retryable };
  }
  if (!hasExactKeys(value, ["mode", "generatedAt", "evidencePackId", "evidencePackHash", "request", "content", "subject", "telemetry"])) return null;
  const generatedAt = isoTimestamp(value.generatedAt);
  const evidencePackId = nonEmptyText(value.evidencePackId, 160);
  const evidencePackHash = typeof value.evidencePackHash === "string" && /^[a-f0-9]{64}$/.test(value.evidencePackHash)
    ? value.evidencePackHash
    : null;
  const request = parseRequestReceipt(value.request);
  const content = parseContent(value.content);
  const subject = parseSubject(value.subject);
  const telemetry = parseTelemetry(value.telemetry);
  if (!generatedAt || !evidencePackId || !/^[A-Za-z0-9_.:-]+$/.test(evidencePackId) || !evidencePackHash ||
      !request || !content || !subject || !telemetry || telemetry.depth !== request.depth ||
      (request.focused && content.answerToQuestion === null)) return null;
  return {
    mode: "openai",
    generatedAt,
    evidencePackId,
    evidencePackHash,
    request,
    content,
    subject,
    telemetry
  };
}

export function readPointObjectAnalysis(selection: LiveMapSelection): PointObjectAiResponse | null {
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_SESSION_KEYS.analysis);
    if (!raw || raw.length > MAX_ANALYSIS_BYTES) return null;
    const envelope: unknown = JSON.parse(raw);
    if (!isRecord(envelope) || !hasExactKeys(envelope, ["selectionFingerprint", "analysis"]) ||
        envelope.selectionFingerprint !== selectionFingerprint(selection)) return null;
    return parseAnalysisResponse(envelope.analysis);
  } catch {
    return null;
  }
}

export function writePointObjectAnalysis(analysis: PointObjectAiResponse, selection: LiveMapSelection): void {
  try {
    const validatedAnalysis = parseAnalysisResponse(analysis);
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
  } catch {
    // No durable browser state to clear.
  }
}
