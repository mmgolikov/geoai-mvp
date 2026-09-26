type SessionStage = "middleware_claims" | "claims" | "user" | "profile";
type SessionTimingEvent = {
  event: "auth_session_stage";
  requestId: string;
  stage: SessionStage;
  phase: "start" | "finish" | "error";
  elapsedMs: number;
};

/** Server-only timing. Never record cookies, identities, responses or errors. */
export function createAuthSessionTiming(
  request: Request | undefined,
  requestId: string,
  emit: (event: SessionTimingEvent) => void = event => console.info(JSON.stringify(event)),
  now: () => number = () => performance.now()
) {
  let enabled = false;
  try {
    enabled = !!request && new URL(request.url).pathname === "/api/auth/session" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
  } catch { /* Diagnostics must not change request handling. */ }

  return async function measure<T>(stage: SessionStage, operation: () => PromiseLike<T>): Promise<T> {
    if (!enabled) return operation();
    const started = now();
    const record = (phase: SessionTimingEvent["phase"]) => {
      try {
        emit({ event: "auth_session_stage", requestId, stage, phase,
          elapsedMs: Math.max(0, Math.round(now() - started)) });
      } catch { /* Logging failure must never change identity or authorization. */ }
    };
    record("start");
    try {
      const value = await operation();
      record("finish");
      return value;
    } catch (error) {
      record("error");
      throw error;
    }
  };
}
