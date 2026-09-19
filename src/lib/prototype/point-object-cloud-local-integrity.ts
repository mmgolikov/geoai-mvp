import type { SavedPointObjectArtifact } from "@/src/lib/prototype/point-object-projects-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Browser-local structural comparator for the immutable artifact projection.
 * It intentionally mirrors the server contract's field selection, but it is
 * not the database JSONB digest and must never be compared with immutableHash.
 */
export function pointObjectCloudLocalImmutableProjection(artifact: SavedPointObjectArtifact): unknown {
  const payload = structuredClone(artifact.payload) as Record<string, unknown>;
  if (artifact.kind === "find") {
    const session = { ...(payload.session as Record<string, unknown>) };
    delete session.shortlist;
    delete session.comparisonOpen;
    delete session.comparisonView;
    delete session.analysisTargetSourceFeatureId;
    delete session.updatedAt;
    payload.session = session;
  } else if (artifact.kind === "create") {
    delete payload.activeAlternativeId;
  }
  const { payloadHash: _payloadHash, updatedAt: _updatedAt, viewRevision: _viewRevision, ...fixedEnvelope } = artifact;
  return { ...fixedEnvelope, payload };
}

export function pointObjectCloudLocalImmutableEqual(
  left: SavedPointObjectArtifact,
  right: SavedPointObjectArtifact
): boolean {
  return canonicalJson(pointObjectCloudLocalImmutableProjection(left)) ===
    canonicalJson(pointObjectCloudLocalImmutableProjection(right));
}

export function pointObjectCloudLocalArtifactEqual(
  left: SavedPointObjectArtifact,
  right: SavedPointObjectArtifact
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}
