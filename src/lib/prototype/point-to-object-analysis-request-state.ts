import type {
  LiveMapSelection,
  PointObjectAiResponse,
  PointObjectAnalysisDepth,
  PointObjectAnalysisGoal,
  PointObjectAnalysisHorizon,
  PointObjectAnalysisPerspective,
  PointObjectLegacyAnalysisRequestReceipt,
  PointObjectAnalysisRequestReceipt
} from "@/components/point-to-object/live-types";
import {
  parsePointObjectAnalysisRoleScenario,
  type PointObjectAnalysisRole,
  type PointObjectAnalysisScenario
} from "@/src/lib/prototype/point-to-object-ai-provenance";
import type { PointObjectLocale } from "@/src/lib/prototype/point-to-object-markets";

export const POINT_OBJECT_ANALYSIS_METHOD = "grounded_open_evidence_v1" as const;

// The POST route has maxDuration=120s and a 115s safe budget that includes
// source acquisition plus the bounded 108s initial/repair generation window.
// The client starts its clock before the challenge GET, so it allows the full
// route duration plus a bounded 10s challenge/response transport margin.
export const POINT_OBJECT_ANALYSIS_CLIENT_DEADLINE_MS = 120_000 + 10_000;

const COMPLETED_IDENTITY_STORAGE_KEY = "geoai:point-to-object:analysis-request-identity:v1";
const COMPLETED_IDENTITY_MAX_BYTES = 48 * 1024;

export type PointObjectAnalysisRequestIdentity = {
  key: string;
  objectKey: string;
  evidenceKey: string;
  role: PointObjectAnalysisRole;
  scenario: PointObjectAnalysisScenario;
  depth: PointObjectAnalysisDepth;
  goal: PointObjectAnalysisGoal;
  perspective: PointObjectAnalysisPerspective;
  horizon: PointObjectAnalysisHorizon;
  locale: PointObjectLocale;
  question: string | null;
  method: typeof POINT_OBJECT_ANALYSIS_METHOD;
};

export type PointObjectAnalysisIdentityInput = Omit<PointObjectAnalysisRequestIdentity, "key" | "question" | "method"> & {
  question: string | null;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function normalizePointObjectAnalysisQuestion(question: string | null): string | null {
  const normalized = question?.trim() ?? "";
  return normalized ? normalized : null;
}

export function createPointObjectAnalysisRequestIdentity(
  input: PointObjectAnalysisIdentityInput
): PointObjectAnalysisRequestIdentity {
  const identity = {
    ...input,
    question: normalizePointObjectAnalysisQuestion(input.question),
    method: POINT_OBJECT_ANALYSIS_METHOD
  };
  return { ...identity, key: canonicalJson(identity) };
}

export function parsePointObjectAnalysisRequestIdentity(value: unknown): PointObjectAnalysisRequestIdentity | null {
  const roleScenario = isRecord(value)
    ? parsePointObjectAnalysisRoleScenario(value.role, value.scenario)
    : null;
  if (!isRecord(value) || !hasExactKeys(value, [
    "key", "objectKey", "evidenceKey", "role", "scenario", "depth", "goal", "perspective",
    "horizon", "locale", "question", "method"
  ]) || typeof value.objectKey !== "string" || !value.objectKey || value.objectKey.length > 240 ||
      typeof value.evidenceKey !== "string" || !value.evidenceKey || value.evidenceKey.length > 32_000 ||
      !roleScenario ||
      (value.depth !== "quick" && value.depth !== "standard" && value.depth !== "deep") ||
      !["object_profile", "development_screening", "redevelopment", "due_diligence", "custom"].includes(String(value.goal)) ||
      (value.perspective !== "developer" && value.perspective !== "investor" && value.perspective !== "asset_owner") ||
      (value.horizon !== "current" && value.horizon !== "one_to_three_years" && value.horizon !== "long_term") ||
      (value.locale !== "en" && value.locale !== "ru") ||
      !(value.question === null || (typeof value.question === "string" && value.question.length >= 1 && value.question.length <= 500)) ||
      value.method !== POINT_OBJECT_ANALYSIS_METHOD || typeof value.key !== "string") return null;
  const reconstructed = createPointObjectAnalysisRequestIdentity({
    objectKey: value.objectKey,
    evidenceKey: value.evidenceKey,
    role: roleScenario.role,
    scenario: roleScenario.scenario,
    depth: value.depth,
    goal: value.goal as PointObjectAnalysisGoal,
    perspective: value.perspective,
    horizon: value.horizon,
    locale: value.locale,
    question: value.question
  });
  return reconstructed.key === value.key ? reconstructed : null;
}

export function pointObjectAnalysisReceiptMatches(
  receipt: PointObjectAnalysisRequestReceipt | PointObjectLegacyAnalysisRequestReceipt,
  request: PointObjectAnalysisRequestIdentity
): boolean {
  const receiptRoleScenario = parsePointObjectAnalysisRoleScenario(
    "role" in receipt ? receipt.role : "unspecified",
    "scenario" in receipt ? receipt.scenario : "unspecified"
  );
  return receiptRoleScenario?.role === request.role &&
    receiptRoleScenario.scenario === request.scenario &&
    receipt.depth === request.depth &&
    receipt.goal === request.goal &&
    receipt.perspective === request.perspective &&
    receipt.horizon === request.horizon &&
    receipt.locale === request.locale &&
    receipt.question === request.question &&
    receipt.focused === Boolean(request.question);
}

export function pointObjectAnalysisRequestChanged(
  draft: PointObjectAnalysisRequestIdentity | null,
  completed: PointObjectAnalysisRequestIdentity | null
): boolean {
  return Boolean(draft && (!completed || draft.key !== completed.key));
}

export function pointObjectSelectionEvidenceKeys(selection: {
  locationKey: string;
  longitude: number;
  latitude: number;
  object: { sourceFeatureId: string | null; geometry: unknown };
  resolvedObject: null | {
    sourceFeatureId: string;
    geometryType: string | null;
    tags: Record<string, string>;
    linkedEntity: null | { identity: { identityReceiptHash: string }; source: { sourceRevisionId: number } };
  };
}): { objectKey: string; evidenceKey: string } {
  const sourceFeatureId = selection.resolvedObject?.sourceFeatureId ?? selection.object.sourceFeatureId;
  const objectKey = sourceFeatureId ?? `point:${selection.locationKey}:${selection.longitude.toFixed(6)}:${selection.latitude.toFixed(6)}`;
  const evidenceKey = canonicalJson({
    locationKey: selection.locationKey,
    coordinate: [Number(selection.longitude.toFixed(6)), Number(selection.latitude.toFixed(6))],
    sourceFeatureId,
    geometry: selection.object.geometry,
    geometryType: selection.resolvedObject?.geometryType ?? null,
    tags: selection.resolvedObject?.tags ?? {},
    linkedIdentityReceiptHash: selection.resolvedObject?.linkedEntity?.identity.identityReceiptHash ?? null,
    linkedSourceRevisionId: selection.resolvedObject?.linkedEntity?.source.sourceRevisionId ?? null
  });
  return { objectKey, evidenceKey };
}

function completedResultKey(analysis: Extract<PointObjectAiResponse, { mode: "openai" }>): string {
  return canonicalJson({
    generatedAt: analysis.generatedAt,
    evidencePackId: analysis.evidencePackId,
    evidencePackHash: analysis.evidencePackHash,
    requestId: analysis.telemetry.requestId
  });
}

export function writePointObjectCompletedRequestIdentity(
  selection: LiveMapSelection,
  analysis: PointObjectAiResponse,
  request: PointObjectAnalysisRequestIdentity | null
): boolean {
  if (typeof window === "undefined" || analysis.mode !== "openai" || !request ||
      !pointObjectAnalysisReceiptMatches(analysis.request, request)) return false;
  const selectionKeys = pointObjectSelectionEvidenceKeys(selection);
  if (selectionKeys.objectKey !== request.objectKey || selectionKeys.evidenceKey !== request.evidenceKey) return false;
  try {
    const serialized = JSON.stringify({
      version: 1,
      resultKey: completedResultKey(analysis),
      request
    });
    if (new TextEncoder().encode(serialized).byteLength > COMPLETED_IDENTITY_MAX_BYTES) return false;
    window.sessionStorage.setItem(COMPLETED_IDENTITY_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function readPointObjectCompletedRequestIdentity(
  selection: LiveMapSelection,
  analysis: PointObjectAiResponse
): PointObjectAnalysisRequestIdentity | null {
  if (typeof window === "undefined" || analysis.mode !== "openai") return null;
  try {
    const raw = window.sessionStorage.getItem(COMPLETED_IDENTITY_STORAGE_KEY);
    if (!raw || new TextEncoder().encode(raw).byteLength > COMPLETED_IDENTITY_MAX_BYTES) return null;
    const envelope: unknown = JSON.parse(raw);
    if (!isRecord(envelope) || !hasExactKeys(envelope, ["version", "resultKey", "request"]) ||
        envelope.version !== 1 || envelope.resultKey !== completedResultKey(analysis)) return null;
    const request = parsePointObjectAnalysisRequestIdentity(envelope.request);
    if (!request || !pointObjectAnalysisReceiptMatches(analysis.request, request)) return null;
    const selectionKeys = pointObjectSelectionEvidenceKeys(selection);
    return selectionKeys.objectKey === request.objectKey && selectionKeys.evidenceKey === request.evidenceKey
      ? request
      : null;
  } catch {
    return null;
  }
}
