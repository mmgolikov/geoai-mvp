import {
  parseSavedPointObjectArtifact,
  type SavedPointObjectArtifact
} from "@/src/lib/prototype/point-object-projects-contract";

export const POINT_OBJECT_CLOUD_SCHEMA_VERSION = 1 as const;
export const POINT_OBJECT_CLOUD_OPERATION_BYTES = 768 * 1024;
// Raw UTF-8 HTTP body ceiling. The operation and SQL JSONB text use different
// representations and have separate fixed caps (768, 832 and 896 KiB).
export const POINT_OBJECT_CLOUD_BODY_BYTES = 832 * 1024;
export const POINT_OBJECT_CLOUD_PAGE_SIZE = 4;

export type PointObjectCloudLocalProject = {
  projectId: string;
  name: string;
  createdAt: string;
};

export type PointObjectCloudPutInput = {
  schemaVersion: 1;
  localProject: PointObjectCloudLocalProject;
  artifact: SavedPointObjectArtifact;
  expectedCloudRevision: number | null;
};

export type PointObjectCloudCursor = {
  createdAt: string;
  id: string;
};

export type PointObjectCloudStoredItem = {
  id: string;
  cloudRevision: number;
  payloadHash: string;
  immutableHash: string;
  createdAt: string;
  updatedAt: string;
  localProject: PointObjectCloudLocalProject;
  artifact: SavedPointObjectArtifact;
};

export type PointObjectCloudConflictReason =
  | "split_key"
  | "missing"
  | "key_conflict"
  | "local_project_identity"
  | "immutable_or_readonly"
  | "stale_cloud_revision"
  | "stale_view_revision";

type PointObjectCloudCurrentReceipt = {
  id: string;
  cloudRevision: number;
  viewRevision: number;
  payloadHash: string;
  immutableHash: string;
  clientPayloadHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PointObjectCloudPutReceipt =
  | (PointObjectCloudCurrentReceipt & {
      status: "created" | "replayed" | "updated";
      conflictReason: null;
    })
  | {
      status: "conflict";
      conflictReason: PointObjectCloudConflictReason;
      id: string | null;
      cloudRevision: number | null;
      viewRevision: number | null;
      payloadHash: string | null;
      immutableHash: string | null;
      clientPayloadHash: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hashPattern = /^[a-f0-9]{64}$/;
const timestampPattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(?:Z|[+-][0-9]{2}:[0-9]{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && timestampPattern.test(value) && Number.isFinite(Date.parse(value));
}

function validBoundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

export function parsePointObjectCloudLocalProject(value: unknown): PointObjectCloudLocalProject | null {
  if (!isRecord(value) || !hasExactKeys(value, ["projectId", "name", "createdAt"]) ||
      !validBoundedText(value.projectId, 160) || !validBoundedText(value.name, 120) || !isTimestamp(value.createdAt)) {
    return null;
  }
  return { projectId: value.projectId.trim(), name: value.name.trim(), createdAt: value.createdAt };
}

export function parsePointObjectCloudPutInput(value: unknown): PointObjectCloudPutInput | null {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "localProject", "artifact", "expectedCloudRevision"]) ||
      value.schemaVersion !== POINT_OBJECT_CLOUD_SCHEMA_VERSION ||
      !(value.expectedCloudRevision === null || (Number.isSafeInteger(value.expectedCloudRevision) && Number(value.expectedCloudRevision) >= 1))) {
    return null;
  }
  const localProject = parsePointObjectCloudLocalProject(value.localProject);
  const artifact = parseSavedPointObjectArtifact(value.artifact);
  if (!localProject || !artifact) return null;
  return {
    schemaVersion: POINT_OBJECT_CLOUD_SCHEMA_VERSION,
    localProject,
    artifact,
    expectedCloudRevision: value.expectedCloudRevision as number | null
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function pointObjectCloudFullProjection(artifact: SavedPointObjectArtifact): unknown {
  return { kind: artifact.kind, locale: artifact.locale, marketKey: artifact.marketKey, payload: artifact.payload };
}

export function pointObjectCloudImmutableProjection(artifact: SavedPointObjectArtifact): unknown {
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

export async function hashPointObjectCloudFullArtifact(artifact: SavedPointObjectArtifact): Promise<string> {
  return sha256(pointObjectCloudFullProjection(artifact));
}

export async function hashPointObjectCloudImmutableArtifact(artifact: SavedPointObjectArtifact): Promise<string> {
  return sha256(pointObjectCloudImmutableProjection(artifact));
}

export async function validatePointObjectCloudPutInput(value: unknown): Promise<PointObjectCloudPutInput | null> {
  const parsed = parsePointObjectCloudPutInput(value);
  if (!parsed) return null;
  const operation = {
    kind: parsed.artifact.kind,
    locale: parsed.artifact.locale,
    marketKey: parsed.artifact.marketKey,
    label: parsed.artifact.label,
    payload: parsed.artifact.payload
  };
  if (!isTimestamp(parsed.artifact.completedAt) || !isTimestamp(parsed.artifact.updatedAt) ||
      Date.parse(parsed.artifact.updatedAt) < Date.parse(parsed.artifact.completedAt) ||
      new TextEncoder().encode(JSON.stringify(operation)).byteLength > POINT_OBJECT_CLOUD_OPERATION_BYTES ||
      parsed.artifact.payloadHash !== await hashPointObjectCloudFullArtifact(parsed.artifact)) return null;
  return parsed;
}

export function encodePointObjectCloudCursor(cursor: PointObjectCloudCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function parsePointObjectCloudCursor(value: string | null): PointObjectCloudCursor | null | "invalid" {
  if (value === null) return null;
  if (!value || value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) return "invalid";
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!isRecord(decoded) || !hasExactKeys(decoded, ["createdAt", "id"]) ||
        !isTimestamp(decoded.createdAt) || typeof decoded.id !== "string" || !uuidPattern.test(decoded.id)) return "invalid";
    return { createdAt: decoded.createdAt, id: decoded.id };
  } catch {
    return "invalid";
  }
}

export async function parsePointObjectCloudStoredItem(value: unknown): Promise<PointObjectCloudStoredItem | null> {
  if (!isRecord(value) || !hasExactKeys(value, [
    "id", "cloudRevision", "payloadHash", "immutableHash", "createdAt", "updatedAt", "localProject", "artifact"
  ]) || typeof value.id !== "string" || !uuidPattern.test(value.id) ||
      !Number.isInteger(value.cloudRevision) || Number(value.cloudRevision) < 1 ||
      typeof value.payloadHash !== "string" || !hashPattern.test(value.payloadHash) ||
      typeof value.immutableHash !== "string" || !hashPattern.test(value.immutableHash) ||
      !isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) return null;
  const localProject = parsePointObjectCloudLocalProject(value.localProject);
  const artifact = parseSavedPointObjectArtifact(value.artifact);
  if (!localProject || !artifact || artifact.payloadHash !== await hashPointObjectCloudFullArtifact(artifact)) return null;
  return {
    id: value.id,
    cloudRevision: Number(value.cloudRevision),
    payloadHash: value.payloadHash,
    immutableHash: value.immutableHash,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    localProject,
    artifact
  };
}

export function parsePointObjectCloudPutReceipt(value: unknown): PointObjectCloudPutReceipt | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "status", "conflictReason", "id", "cloudRevision", "viewRevision", "payloadHash", "immutableHash",
    "clientPayloadHash", "createdAt", "updatedAt"
  ])) return null;

  const validCurrent = typeof value.id === "string" && uuidPattern.test(value.id) &&
    Number.isInteger(value.cloudRevision) && Number(value.cloudRevision) >= 1 &&
    Number.isInteger(value.viewRevision) && Number(value.viewRevision) >= 0 && Number(value.viewRevision) <= 100_000 &&
    typeof value.payloadHash === "string" && hashPattern.test(value.payloadHash) &&
    typeof value.immutableHash === "string" && hashPattern.test(value.immutableHash) &&
    typeof value.clientPayloadHash === "string" && hashPattern.test(value.clientPayloadHash) &&
    isTimestamp(value.createdAt) && isTimestamp(value.updatedAt);

  if (value.status === "created" || value.status === "replayed" || value.status === "updated") {
    return validCurrent && value.conflictReason === null
      ? value as PointObjectCloudPutReceipt
      : null;
  }
  const conflictReasons: readonly PointObjectCloudConflictReason[] = [
    "split_key", "missing", "key_conflict", "local_project_identity",
    "immutable_or_readonly", "stale_cloud_revision", "stale_view_revision"
  ];
  if (value.status !== "conflict" || !conflictReasons.includes(value.conflictReason as PointObjectCloudConflictReason)) return null;
  const absentCurrent = value.id === null && value.cloudRevision === null && value.viewRevision === null &&
    value.payloadHash === null && value.immutableHash === null && value.clientPayloadHash === null &&
    value.createdAt === null && value.updatedAt === null;
  const reasonHasNoCurrent = value.conflictReason === "split_key" || value.conflictReason === "missing";
  return (reasonHasNoCurrent ? absentCurrent : validCurrent) ? value as PointObjectCloudPutReceipt : null;
}
