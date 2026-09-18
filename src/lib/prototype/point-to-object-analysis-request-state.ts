import type {
  PointObjectAnalysisDepth,
  PointObjectAnalysisGoal,
  PointObjectAnalysisHorizon,
  PointObjectAnalysisPerspective,
  PointObjectAnalysisRequestReceipt
} from "@/components/point-to-object/live-types";
import type { ExploreRole, ExploreScenarioId } from "@/src/lib/explore/types";
import type { PointObjectLocale } from "@/src/lib/prototype/point-to-object-markets";

export const POINT_OBJECT_ANALYSIS_METHOD = "grounded_open_evidence_v1" as const;

export type PointObjectAnalysisRequestIdentity = {
  key: string;
  objectKey: string;
  evidenceKey: string;
  role: ExploreRole | "unspecified";
  scenario: ExploreScenarioId | "unspecified";
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

export function pointObjectAnalysisReceiptMatches(
  receipt: PointObjectAnalysisRequestReceipt,
  request: PointObjectAnalysisRequestIdentity
): boolean {
  return receipt.depth === request.depth &&
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
