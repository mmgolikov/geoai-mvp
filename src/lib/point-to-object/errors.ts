import type {
  LivePointErrorCode,
  LivePointErrorStatus
} from "./contracts";

const INVALID_INPUT_CODES = new Set<LivePointErrorCode>([
  "INVALID_REQUEST",
  "INVALID_COORDINATE",
  "COORDINATE_ORDER_SUSPECTED",
  "INPUT_LIMIT_EXCEEDED",
  "ANCHOR_MISMATCH",
  "CANDIDATE_ASSERTION_INVALID"
]);
const SOURCE_CODES = new Set<LivePointErrorCode>([
  "SNAPSHOT_MISSING",
  "SNAPSHOT_CORRUPT",
  "SNAPSHOT_HASH_MISMATCH",
  "SNAPSHOT_INDEX_UNAVAILABLE",
  "GEOMETRY_NOT_FOUND",
  "GEOMETRY_HASH_MISMATCH"
]);
const BLOCKED_CODES = new Set<LivePointErrorCode>([
  "RIGHTS_UNKNOWN",
  "RIGHTS_BLOCKED",
  "SOURCE_STALE_BLOCKED",
  "PREVIEW_DISABLED",
  "PRODUCTION_DENIED",
  "ACCESS_DENIED",
  "CANDIDATE_SET_OVERFLOW"
]);

export function errorStatusForCode(code: LivePointErrorCode): LivePointErrorStatus {
  if (INVALID_INPUT_CODES.has(code)) return "invalid_input";
  if (SOURCE_CODES.has(code)) return "source_unavailable";
  if (BLOCKED_CODES.has(code)) return "blocked";
  return "failed";
}

export class LivePointCoreError extends Error {
  readonly code: LivePointErrorCode;
  readonly status: LivePointErrorStatus;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, string | number | boolean | null>> | null;

  constructor(
    code: LivePointErrorCode,
    message: string,
    retryable = false,
    details: Readonly<Record<string, string | number | boolean | null>> | null = null
  ) {
    super(message);
    this.name = "LivePointCoreError";
    this.code = code;
    this.status = errorStatusForCode(code);
    this.retryable = retryable;
    this.details = details;
  }
}
