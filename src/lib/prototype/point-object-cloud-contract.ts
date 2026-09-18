import {
  parseSavedPointObjectArtifact,
  type SavedPointObjectArtifact
} from "@/src/lib/prototype/point-object-projects-contract";

export const POINT_OBJECT_CLOUD_SCHEMA_VERSION = 1 as const;
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

export type PointObjectCloudPutReceipt = {
  status: "created" | "replayed" | "updated" | "conflict";
  id: string | null;
  cloudRevision: number;
  viewRevision: number;
  payloadHash: string;
  immutableHash: string;
  clientPayloadHash: string;
  createdAt: string | null;
  updatedAt: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hashPattern = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
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
  return { projectId: value.projectId, name: value.name.trim(), createdAt: value.createdAt };
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
  if (!parsed || parsed.artifact.payloadHash !== await hashPointObjectCloudFullArtifact(parsed.artifact)) return null;
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
    "status", "id", "cloudRevision", "viewRevision", "payloadHash", "immutableHash", "clientPayloadHash", "createdAt", "updatedAt"
  ]) || !["created", "replayed", "updated", "conflict"].includes(String(value.status)) ||
      !(value.id === null || (typeof value.id === "string" && uuidPattern.test(value.id))) ||
      !Number.isInteger(value.cloudRevision) || Number(value.cloudRevision) < 0 ||
      !Number.isInteger(value.viewRevision) || Number(value.viewRevision) < 0 || Number(value.viewRevision) > 100_000 ||
      typeof value.payloadHash !== "string" || !hashPattern.test(value.payloadHash) ||
      typeof value.immutableHash !== "string" || !hashPattern.test(value.immutableHash) ||
      typeof value.clientPayloadHash !== "string" || !hashPattern.test(value.clientPayloadHash) ||
      !(value.createdAt === null || isTimestamp(value.createdAt)) || !(value.updatedAt === null || isTimestamp(value.updatedAt))) return null;
  return value as PointObjectCloudPutReceipt;
}
