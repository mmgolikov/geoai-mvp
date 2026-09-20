import { preflightPointObjectCreate } from "../../src/lib/prototype/point-to-object-create-orchestration";
import { pointObjectCreateAoiHash } from "../../src/lib/prototype/point-to-object-create-aoi-hash";

// Pure geometry only. No network, credentials, persistence or provider execution.
self.onmessage = async (event: MessageEvent<Omit<Parameters<typeof preflightPointObjectCreate>[0], "aoiHash">>) => {
  try {
    const aoiHash = await pointObjectCreateAoiHash(event.data.aoiCoordinates);
    const result = preflightPointObjectCreate({ ...event.data, aoiHash });
    self.postMessage(result.kind === "ready"
      ? { kind: result.kind, achievedCoverage: result.alternatives[0].massing.achievedSiteCoveragePct }
      : result.kind === "suggestion" ? { kind: result.kind, suggestion: result.suggestion }
        : result);
  } catch {
    self.postMessage({ kind: "failed", code: "geometry_validation_failed" });
  }
};
