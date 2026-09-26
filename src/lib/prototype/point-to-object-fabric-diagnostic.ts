/** Public acquisition outcome only; never raw errors, endpoints or source data. */
export type PointObjectFabricDiagnostic = {
  failureCode: "timeout" | "rate_limited" | "invalid_response" | "response_too_large" | "unavailable" | null;
};

export function parsePointObjectFabricDiagnostic(value: unknown, coverage: unknown): PointObjectFabricDiagnostic | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 1 || !Object.prototype.hasOwnProperty.call(row, "failureCode")) return null;
  if (coverage === "available" && row.failureCode === null) return { failureCode: null };
  if (coverage === "unavailable" && typeof row.failureCode === "string" &&
      ["timeout", "rate_limited", "invalid_response", "response_too_large", "unavailable"].includes(row.failureCode)) {
    return { failureCode: row.failureCode as PointObjectFabricDiagnostic["failureCode"] };
  }
  return null;
}

/** Project only consistent metadata from the same already-frozen source pack. */
export function projectPointObjectFabricDiagnostic(source: unknown, coverage: unknown): { fabricDiagnostic?: PointObjectFabricDiagnostic } {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const row = source as Record<string, unknown>;
  if (row.fabricStatus !== coverage) return {};
  const diagnostic = parsePointObjectFabricDiagnostic(row.fabricDiagnostic, coverage);
  // Legacy absence or malformed optional metadata is not a guessed failure cause.
  return diagnostic ? { fabricDiagnostic: diagnostic } : {};
}
