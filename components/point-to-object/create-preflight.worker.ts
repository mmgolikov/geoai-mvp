import { preflightPointObjectCreate } from "../../src/lib/prototype/point-to-object-create-orchestration";

// Pure geometry only. No network, credentials, persistence or provider execution.
self.onmessage = (event: MessageEvent<Parameters<typeof preflightPointObjectCreate>[0]>) => {
  try {
    const result = preflightPointObjectCreate(event.data);
    self.postMessage(result.kind === "ready"
      ? { kind: result.kind, achievedCoverage: result.alternatives[0].massing.achievedSiteCoveragePct }
      : result.kind === "suggestion" ? { kind: result.kind, suggestion: result.suggestion }
        : result);
  } catch {
    self.postMessage({ kind: "failed", code: "geometry_validation_failed" });
  }
};
