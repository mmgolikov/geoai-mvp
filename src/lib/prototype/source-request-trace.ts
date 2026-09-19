import { randomUUID } from "node:crypto";

type SourceStage = "received" | "authenticated" | "body_validated" | "source_started" | "source_completed" | "finished";
type SourceFailure = "deadline" | "upstream" | "internal";

/** Fixed diagnostic fields only: never accepts requests, headers, bodies or errors. */
export function createSourceRequestTrace(
  route: "find" | "area-context",
  emit: (line: string) => void = (line) => console.info(line),
  now: () => number = Date.now
) {
  const requestId = randomUUID();
  const startedAt = now();
  const write = (stage: SourceStage | "failed", failure?: SourceFailure) => {
    try {
      emit(JSON.stringify({
        event: "point_object_source_request",
        route,
        requestId,
        stage,
        elapsedMs: Math.max(0, Math.round(now() - startedAt)),
        ...(failure ? { failure } : {})
      }));
    } catch {
      // A diagnostic sink must not alter the product response or cleanup.
    }
  };
  write("received");
  return {
    stage: (stage: SourceStage) => write(stage),
    failed: (failure: SourceFailure) => write("failed", failure)
  };
}
