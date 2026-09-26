// Public bounded diagnostic only. Never store rejected prose or provider IDs.
export const POINT_OBJECT_FOCUSED_RECOVERY_CODES = [
  "focused_answer_context_value_mismatch",
  "focused_answer_scenario_depth",
  "focused_answer_context_without_context_receipt",
  "focused_answer_novel_number"
] as const;

export type PointObjectFocusedRecoveryCode = typeof POINT_OBJECT_FOCUSED_RECOVERY_CODES[number];
export type PointObjectAnswerProvenance =
  | { kind: "model_validated"; rejectionCode: null }
  | { kind: "deterministic_recovery"; rejectionCode: PointObjectFocusedRecoveryCode };

export function isPointObjectFocusedRecoveryCode(value: unknown): value is PointObjectFocusedRecoveryCode {
  return typeof value === "string" && (POINT_OBJECT_FOCUSED_RECOVERY_CODES as readonly string[]).includes(value);
}

export function parsePointObjectAnswerProvenance(value: unknown): PointObjectAnswerProvenance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 2 || !keys.includes("kind") || !keys.includes("rejectionCode")) return null;
  if (record.kind === "model_validated" && record.rejectionCode === null) return { kind: record.kind, rejectionCode: null };
  if (record.kind === "deterministic_recovery" && isPointObjectFocusedRecoveryCode(record.rejectionCode)) {
    return { kind: record.kind, rejectionCode: record.rejectionCode };
  }
  return null;
}
