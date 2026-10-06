const FAILURE_CODES = ["AI_RUNTIME_DISABLED", "AI_NOT_CONFIGURED", "AI_REQUEST_TOO_LARGE", "AI_REQUEST_INVALID", "AI_CHALLENGE_INVALID", "AI_ORIGIN_REJECTED", "AI_RATE_LIMITED", "AI_OBJECT_CHANGED", "AI_EVIDENCE_REFRESH_REQUIRED", "AI_TIMEOUT", "AI_PROVIDER_REJECTED", "AI_REFUSED", "AI_OUTPUT_INCOMPLETE", "AI_OUTPUT_INVALID", "AI_INTERNAL_ERROR", "COMPARISON_EVIDENCE_INSUFFICIENT", "COMPARISON_SNAPSHOTS_NOT_ALIGNED", "COMPARISON_UNAVAILABLE", "COMPARISON_RESPONSE_REJECTED", "COMPARISON_RESPONSE_MISMATCH", "COMPARISON_RESPONSE_UNREADABLE", "COMPARISON_TRANSPORT_FAILED", "COMPARISON_CHALLENGE_UNAVAILABLE", "COMPARISON_CLIENT_TIMEOUT", "COMPARISON_COMPLETION_INVALID", "COMPARISON_OUTPUT_INCOMPLETE", "COMPARISON_OUTPUT_TOKEN_LIMIT", "COMPARISON_OUTPUT_REFUSED", "COMPARISON_OUTPUT_UNREADABLE", "COMPARISON_OUTPUT_SHAPE_INVALID", "COMPARISON_OUTPUT_REFERENCE_INVALID", "COMPARISON_OUTPUT_UNKNOWN_REF", "COMPARISON_OUTPUT_FORBIDDEN_CLAIM", "COMPARISON_OUTPUT_SOURCE_BINDING", "COMPARISON_RESPONSE_ENVELOPE_INVALID"] as const;
export type PointObjectComparisonDiagnostic = {
  stage: "challenge" | "request" | "response" | "validation";
  httpStatus: number | null;
  code: typeof FAILURE_CODES[number];
  elapsedMs: number | null;
  snapshots: Array<{ sourceFeatureId: string; evidencePackHash: string }>;
};
/** Public, request-bound facts only. Never retain error prose, headers, cookies,
 * challenge, coordinates, raw provider payload or a guessed usage/cost receipt. */
export function comparisonFailureDiagnostic(payload: Record<string, unknown>, stage: PointObjectComparisonDiagnostic["stage"], httpStatus: number | null, code: unknown, elapsedMs: number): PointObjectComparisonDiagnostic {
  const snapshots: PointObjectComparisonDiagnostic["snapshots"] = [];
  const candidates = Array.isArray(payload.comparison) && payload.comparison.length <= 3 ? payload.comparison : [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const id = candidate.expectedSourceFeatureId, hash = candidate.evidenceReceipt?.evidencePackHash;
    if (typeof id === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(id) && typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash)) snapshots.push({ sourceFeatureId: id, evidencePackHash: hash });
  }
  return { stage, httpStatus: Number.isInteger(httpStatus) && httpStatus! >= 100 && httpStatus! <= 599 ? httpStatus : null,
    code: FAILURE_CODES.includes(code as typeof FAILURE_CODES[number]) ? code as typeof FAILURE_CODES[number] : "COMPARISON_UNAVAILABLE",
    elapsedMs: Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs <= 600_000 ? Math.round(elapsedMs) : null, snapshots };
}

export class PointObjectComparisonRequestError extends Error {
  constructor(readonly code: "timeout" | "challenge_unavailable" | "response_unreadable" | "transport_failed", readonly diagnostic?: PointObjectComparisonDiagnostic) {
    super(code);
    this.name = "PointObjectComparisonRequestError";
  }
}

/** Also bounds JSON parsing and transports that do not settle when aborted.
 * An overdue challenge must never resume later and dispatch the paid POST. */
function abortable<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); reject(signal.reason); };
    if (signal.aborted) { pending.catch(() => undefined); abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    pending.then(value => { signal.removeEventListener("abort", abort); resolve(value); },
      cause => { signal.removeEventListener("abort", abort); reject(cause); });
  });
}

export async function requestPointObjectComparison(input: {
  signal: AbortSignal;
  payload: Record<string, unknown>;
  fetchImpl?: typeof fetch;
  deadlineMs?: number;
  challengeDeadlineMs?: number;
  onDiagnostic?: (diagnostic: PointObjectComparisonDiagnostic) => void;
}): Promise<{ ok: boolean; status: number; payload: unknown; diagnostic?: PointObjectComparisonDiagnostic }> {
  const deadline = new AbortController();
  const signal = AbortSignal.any([input.signal, deadline.signal]);
  const fetchImpl = input.fetchImpl ?? fetch;
  const startedAt = Date.now();
  const diagnosticPayload = { comparison: comparisonFailureDiagnostic(input.payload,"request",null,"COMPARISON_UNAVAILABLE",0).snapshots.map(snapshot => ({ expectedSourceFeatureId: snapshot.sourceFeatureId, evidenceReceipt: { evidencePackHash: snapshot.evidencePackHash } })) };
  let stage: PointObjectComparisonDiagnostic["stage"] = "challenge", status: number | null = null;
  const diagnostic = (code: unknown) => comparisonFailureDiagnostic(diagnosticPayload, stage, status, code, Date.now() - startedAt);
  const observe = (value: PointObjectComparisonDiagnostic) => { try { input.onDiagnostic?.(value); } catch { /* Observation cannot change the request outcome. */ } };
  const timeout = () => deadline.abort(new PointObjectComparisonRequestError("timeout", diagnostic("COMPARISON_CLIENT_TIMEOUT")));
  const wholeTimer = setTimeout(timeout, input.deadlineMs ?? 75_000);
  const challengeTimer = setTimeout(timeout, input.challengeDeadlineMs ?? 10_000);
  try {
    signal.throwIfAborted();
    const challengeResponse = await abortable(fetchImpl("/api/prototype/point-to-object/ai", {
      method: "GET", cache: "no-store", signal
    }), signal);
    status = challengeResponse.status;
    const challenge: unknown = await abortable(challengeResponse.json(), signal);
    signal.throwIfAborted();
    if (!challengeResponse.ok || !challenge || typeof challenge !== "object" ||
        !("mode" in challenge) || challenge.mode !== "ready" ||
        !("challenge" in challenge) || typeof challenge.challenge !== "string" || !challenge.challenge.trim()) {
      const code = challenge && typeof challenge === "object" && "code" in challenge ? challenge.code : "COMPARISON_CHALLENGE_UNAVAILABLE";
      throw new PointObjectComparisonRequestError("challenge_unavailable", diagnostic(code));
    }
    clearTimeout(challengeTimer);
    stage = "request"; status = null;
    const response = await abortable(fetchImpl("/api/prototype/point-to-object/ai", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ ...input.payload, challenge: challenge.challenge })
    }), signal);
    stage = "response"; status = response.status;
    const payload: unknown = await abortable(response.json(), signal);
    signal.throwIfAborted();
    if (!response.ok) {
      const failure = diagnostic(payload && typeof payload === "object" && "code" in payload ? payload.code : "COMPARISON_UNAVAILABLE");
      observe(failure);
      return { ok: false, status: response.status, payload, diagnostic: failure };
    }
    return { ok: response.ok, status: response.status, payload };
  } catch (cause) {
    if (input.signal.aborted) throw cause;
    const failure = cause instanceof PointObjectComparisonRequestError ? cause :
      new PointObjectComparisonRequestError(stage === "response" || status !== null ? "response_unreadable" : "transport_failed",
        diagnostic(stage === "response" || status !== null ? "COMPARISON_RESPONSE_UNREADABLE" : "COMPARISON_TRANSPORT_FAILED"));
    observe(failure.diagnostic ?? diagnostic("COMPARISON_UNAVAILABLE"));
    throw failure;
  } finally {
    clearTimeout(wholeTimer);
    clearTimeout(challengeTimer);
    deadline.abort();
  }
}
