export class PointObjectComparisonRequestError extends Error {
  constructor(readonly code: "timeout" | "challenge_unavailable") {
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
}): Promise<{ ok: boolean; status: number; payload: unknown }> {
  const deadline = new AbortController();
  const signal = AbortSignal.any([input.signal, deadline.signal]);
  const fetchImpl = input.fetchImpl ?? fetch;
  const timeout = () => deadline.abort(new PointObjectComparisonRequestError("timeout"));
  const wholeTimer = setTimeout(timeout, input.deadlineMs ?? 75_000);
  const challengeTimer = setTimeout(timeout, input.challengeDeadlineMs ?? 10_000);
  try {
    signal.throwIfAborted();
    const challengeResponse = await abortable(fetchImpl("/api/prototype/point-to-object/ai", {
      method: "GET", cache: "no-store", signal
    }), signal);
    const challenge: unknown = await abortable(challengeResponse.json(), signal);
    signal.throwIfAborted();
    if (!challengeResponse.ok || !challenge || typeof challenge !== "object" ||
        !("mode" in challenge) || challenge.mode !== "ready" ||
        !("challenge" in challenge) || typeof challenge.challenge !== "string" || !challenge.challenge.trim()) {
      throw new PointObjectComparisonRequestError("challenge_unavailable");
    }
    clearTimeout(challengeTimer);
    const response = await abortable(fetchImpl("/api/prototype/point-to-object/ai", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ ...input.payload, challenge: challenge.challenge })
    }), signal);
    const payload: unknown = await abortable(response.json(), signal);
    signal.throwIfAborted();
    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(wholeTimer);
    clearTimeout(challengeTimer);
    deadline.abort();
  }
}
