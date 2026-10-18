// Closed browser-only observation. No transport, source reads, storage, env,
// server imports, response bodies, headers, credentials or upstream inference.
export type ContextRequestDiagnosticOutcome = "client_deadline" | "http_response" | "transport_unknown" | "parse_unknown";
const codes = {
  client_deadline: "CONTEXT_CLIENT_DEADLINE", http_response: "CONTEXT_HTTP_RESPONSE_ERROR",
  transport_unknown: "CONTEXT_TRANSPORT_UNKNOWN", parse_unknown: "CONTEXT_RESPONSE_PARSE_UNKNOWN"
} as const;
const serverCodes = ["AI_EVIDENCE_REFRESH_REQUIRED", "APPLICATION_RATE_LIMITED", "LIVE_POINT_INVALID", "OBJECT_NOT_RESOLVED",
  "NOMINATIM_TIMEOUT", "NOMINATIM_RATE_LIMITED", "NOMINATIM_UNAVAILABLE", "NOMINATIM_RESPONSE_INVALID",
  "OVERPASS_TIMEOUT", "OVERPASS_RATE_LIMITED", "OVERPASS_UNAVAILABLE", "OVERPASS_RESPONSE_INVALID"] as const;
type ServerCode = typeof serverCodes[number];
type Intent = { caseKey: string; expectedSourceFeatureId: string | null; latitude: number; locale: "en" | "ru"; longitude: number };
type Details = { startedAt: string; completedAt: string; elapsedMs: number; httpStatus: number | null;
  outcome: ContextRequestDiagnosticOutcome; serverCode?: unknown };
export type PointObjectContextRequestDiagnostic = {
  protocol: "GEOAI_PREVIEW_CONTEXT_REQUEST_DIAGNOSTIC_V1"; operation: "context"; intent: Intent;
  intentSha256: string | null; hashStatus: "sha256" | "unavailable";
  startedAt: string; completedAt: string; elapsedMs: number;
  timingScope: "client_operation_including_debounce_not_upstream_latency";
  httpStatus: number | null; outcome: ContextRequestDiagnosticOutcome; errorCode: typeof codes[ContextRequestDiagnosticOutcome];
  serverCode: ServerCode | null; proofScope: "client_observation_not_source_evidence"; upstreamCause: "unverified";
};
const markets = ["dubai", "abu_dhabi", "doha", "riyadh", "jeddah", "kuala_lumpur", "singapore", "hong_kong", "moscow"];
const keys = ["protocol", "operation", "intent", "intentSha256", "hashStatus", "startedAt", "completedAt", "elapsedMs",
  "timingScope", "httpStatus", "outcome", "errorCode", "serverCode", "proofScope", "upstreamCause"];
function record(value: unknown, required: string[], optional: string[] = []): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  return required.every(key => Object.hasOwn(value, key)) && Reflect.ownKeys(value).every(key => {
    const descriptor = typeof key === "string" ? Object.getOwnPropertyDescriptor(value, key) : null;
    return typeof key === "string" && (required.includes(key) || optional.includes(key)) && !!descriptor && "value" in descriptor;
  });
}
function intentSnapshot(value: unknown): Intent | null {
  if (!record(value, ["caseKey", "expectedSourceFeatureId", "latitude", "locale", "longitude"]) ||
      typeof value.caseKey !== "string" || !markets.includes(value.caseKey) || (value.locale !== "en" && value.locale !== "ru") ||
      typeof value.longitude !== "number" || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180 ||
      typeof value.latitude !== "number" || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90 ||
      !(value.expectedSourceFeatureId === null || typeof value.expectedSourceFeatureId === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(value.expectedSourceFeatureId))) return null;
  // Same alphabetically sorted public Context intent keys as verification V1;
  // no coordinate rounding, challenge, headers or private caller identity.
  return { caseKey: value.caseKey, expectedSourceFeatureId: value.expectedSourceFeatureId,
    latitude: value.latitude, locale: value.locale as "en" | "ru", longitude: value.longitude };
}
const timestamp = (value: unknown): value is string => typeof value === "string" && value.length <= 32 && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const status = (value: unknown): value is number | null => value === null || typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599;
function outcome(value: unknown): value is ContextRequestDiagnosticOutcome { return typeof value === "string" && Object.hasOwn(codes, value); }
export function contextRequestDiagnosticServerCode(value: unknown): ServerCode | null {
  return typeof value === "string" && (serverCodes as readonly string[]).includes(value) ? value as ServerCode : null;
}
function validDetails(value: Record<string, unknown>): boolean {
  return timestamp(value.startedAt) && timestamp(value.completedAt) && Date.parse(value.completedAt) >= Date.parse(value.startedAt) &&
    typeof value.elapsedMs === "number" && Number.isInteger(value.elapsedMs) && value.elapsedMs >= 0 && value.elapsedMs <= 86_400_000 &&
    outcome(value.outcome) && status(value.httpStatus);
}
export async function createContextRequestDiagnostic(intent: unknown, details: Details): Promise<PointObjectContextRequestDiagnostic | null> {
  try {
    const snapshot = intentSnapshot(intent);
    if (!snapshot || !record(details, ["startedAt", "completedAt", "elapsedMs", "httpStatus", "outcome"], ["serverCode"]) || !validDetails(details)) return null;
    // Freeze public scalars before asynchronous hashing; later caller changes
    // cannot relabel the terminal event or its actually received status.
    const observed = { startedAt: details.startedAt, completedAt: details.completedAt, elapsedMs: details.elapsedMs,
      httpStatus: details.httpStatus, outcome: details.outcome, serverCode: contextRequestDiagnosticServerCode(details.serverCode) };
    let intentSha256: string | null = null;
    try {
      const hash = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(snapshot)));
      intentSha256 = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
    } catch { /* Unavailable hashing stays explicit; never fabricate a digest. */ }
    return { protocol: "GEOAI_PREVIEW_CONTEXT_REQUEST_DIAGNOSTIC_V1", operation: "context", intent: snapshot,
      intentSha256, hashStatus: intentSha256 ? "sha256" : "unavailable", startedAt: observed.startedAt, completedAt: observed.completedAt,
      elapsedMs: observed.elapsedMs, timingScope: "client_operation_including_debounce_not_upstream_latency",
      // A later body-read deadline cannot erase an actually received status.
      // Null means no Response status was observed, never an inferred 504.
      httpStatus: observed.httpStatus, outcome: observed.outcome, errorCode: codes[observed.outcome],
      serverCode: observed.httpStatus === null ? null : observed.serverCode,
      proofScope: "client_observation_not_source_evidence", upstreamCause: "unverified" };
  } catch { return null; }
}
/** Refuse extra fields and non-current intent before displaying diagnostic JSON. */
export function contextRequestDiagnosticJson(value: unknown, currentIntent: unknown): string | null {
  try {
    const current = intentSnapshot(currentIntent);
    if (!current || !record(value, keys) || !validDetails(value) || value.protocol !== "GEOAI_PREVIEW_CONTEXT_REQUEST_DIAGNOSTIC_V1" ||
        value.operation !== "context" || JSON.stringify(intentSnapshot(value.intent)) !== JSON.stringify(current) ||
        !outcome(value.outcome) || value.errorCode !== codes[value.outcome] ||
        value.timingScope !== "client_operation_including_debounce_not_upstream_latency" ||
        value.proofScope !== "client_observation_not_source_evidence" || value.upstreamCause !== "unverified" ||
        !(value.hashStatus === "unavailable" && value.intentSha256 === null || value.hashStatus === "sha256" && typeof value.intentSha256 === "string" && /^[a-f0-9]{64}$/.test(value.intentSha256)) ||
        !(value.serverCode === null || contextRequestDiagnosticServerCode(value.serverCode) === value.serverCode) ||
        (value.httpStatus === null && value.serverCode !== null)) return null;
    const json = JSON.stringify(value, null, 2);
    return new TextEncoder().encode(json).byteLength <= 2048 ? json : null;
  } catch { return null; }
}
export function contextRequestDiagnosticMatchesIntent(value: unknown, intent: unknown): boolean {
  return contextRequestDiagnosticJson(value, intent) !== null;
}
