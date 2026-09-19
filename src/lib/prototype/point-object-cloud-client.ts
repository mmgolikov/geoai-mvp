import {
  parseSavedPointObjectArtifact,
  type SavedPointObjectArtifact
} from "@/src/lib/prototype/point-object-projects-contract";

const ENDPOINT = "/api/prototype/point-to-object/project-artifacts";
const PAGE_SIZE = 4;
const MAX_PAGES = 150;
const hashPattern = /^[a-f0-9]{64}$/;
const cursorPattern = /^[A-Za-z0-9_-]{1,256}$/;
const timestampPattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(?:Z|[+-][0-9]{2}:[0-9]{2})$/;

export type PointObjectCloudClientProject = {
  projectId: string;
  name: string;
  createdAt: string;
};

export type PointObjectCloudClientItem = {
  cloudRevision: number;
  localProject: PointObjectCloudClientProject;
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

export type PointObjectCloudAvailability = "ready" | "unavailable" | "denied" | "failed" | "aborted";

export type PointObjectCloudListResult =
  | { status: "ready"; items: PointObjectCloudClientItem[] }
  | { status: Exclude<PointObjectCloudAvailability, "ready"> };

export type PointObjectCloudPutResult =
  | { status: "saved"; outcome: "created" | "replayed" | "updated"; cloudRevision: number }
  | { status: "conflict"; reason: PointObjectCloudConflictReason | null; cloudRevision: number | null }
  | { status: Exclude<PointObjectCloudAvailability, "ready"> };

export type PointObjectCloudImportOutcome = "imported" | "replayed" | "local_newer" | "conflict" | "capacity" | "failed";

export type PointObjectCloudSyncStatus = PointObjectCloudAvailability | "idle" | "syncing" | "conflict" | "capacity";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type PointObjectCloudSyncSessionInput = {
  identityKey: `user:${string}`;
  fetcher?: FetchLike;
  importArtifact: (
    identityKey: `user:${string}`,
    project: PointObjectCloudClientProject,
    artifact: SavedPointObjectArtifact
  ) => Promise<{ status: PointObjectCloudImportOutcome }>;
  onStatus?: (status: PointObjectCloudSyncStatus) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && timestampPattern.test(value) && Number.isFinite(Date.parse(value));
}

function parseProject(value: unknown): PointObjectCloudClientProject | null {
  if (!isRecord(value) || !hasExactKeys(value, ["projectId", "name", "createdAt"]) ||
      typeof value.projectId !== "string" || !value.projectId.trim() || value.projectId.length > 160 ||
      typeof value.name !== "string" || !value.name.trim() || value.name.length > 120 ||
      /[\u0000-\u001f\u007f]/.test(value.projectId) || /[\u0000-\u001f\u007f]/.test(value.name) ||
      !isTimestamp(value.createdAt)) return null;
  return { projectId: value.projectId.trim(), name: value.name.trim(), createdAt: value.createdAt };
}

function parseListItem(value: unknown): PointObjectCloudClientItem | null {
  if (!isRecord(value) || !hasExactKeys(value, ["cloudRevision", "localProject", "artifact"]) ||
      !Number.isSafeInteger(value.cloudRevision) || Number(value.cloudRevision) < 1) return null;
  const localProject = parseProject(value.localProject);
  const artifact = parseSavedPointObjectArtifact(value.artifact);
  if (!localProject || !artifact) return null;
  return { cloudRevision: Number(value.cloudRevision), localProject, artifact };
}

function requestFailureStatus(response: Response): Exclude<PointObjectCloudAvailability, "ready" | "aborted"> {
  if (response.status === 404) return "unavailable";
  if (response.status === 401 || response.status === 403) return "denied";
  return "failed";
}

function parseConflictReason(value: unknown): PointObjectCloudConflictReason | null {
  const allowed: readonly PointObjectCloudConflictReason[] = [
    "split_key", "missing", "key_conflict", "local_project_identity",
    "immutable_or_readonly", "stale_cloud_revision", "stale_view_revision"
  ];
  return allowed.includes(value as PointObjectCloudConflictReason) ? value as PointObjectCloudConflictReason : null;
}

export async function listPointObjectCloudArtifacts(input: {
  signal: AbortSignal;
  fetcher?: FetchLike;
}): Promise<PointObjectCloudListResult> {
  const fetcher = input.fetcher ?? fetch;
  const items: PointObjectCloudClientItem[] = [];
  const artifactIds = new Set<string>();
  const idempotencyKeys = new Set<string>();
  const projectOrigins = new Map<string, string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) query.set("cursor", cursor);
      const response = await fetcher(`${ENDPOINT}?${query.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: input.signal
      });
      if (!response.ok) return { status: requestFailureStatus(response) };
      const value: unknown = await response.json();
      if (!isRecord(value) || !hasExactKeys(value, ["ok", "persisted", "storageMode", "items", "nextCursor"]) ||
          value.ok !== true || value.persisted !== true || value.storageMode !== "authenticated_supabase_preview" ||
          !Array.isArray(value.items) || value.items.length > PAGE_SIZE ||
          !(value.nextCursor === null || (typeof value.nextCursor === "string" && cursorPattern.test(value.nextCursor)))) {
        return { status: "failed" };
      }
      for (const candidate of value.items) {
        const item = parseListItem(candidate);
        if (!item) return { status: "failed" };
        if (artifactIds.has(item.artifact.artifactId) || idempotencyKeys.has(item.artifact.idempotencyKey)) return { status: "failed" };
        artifactIds.add(item.artifact.artifactId);
        idempotencyKeys.add(item.artifact.idempotencyKey);
        const projectOrigin = JSON.stringify(item.localProject);
        if (projectOrigins.has(item.localProject.projectId) && projectOrigins.get(item.localProject.projectId) !== projectOrigin) return { status: "failed" };
        projectOrigins.set(item.localProject.projectId, projectOrigin);
        items.push(item);
      }
      if (value.nextCursor === null) return { status: "ready", items };
      if (value.items.length !== PAGE_SIZE || cursors.has(value.nextCursor)) return { status: "failed" };
      cursors.add(value.nextCursor);
      cursor = value.nextCursor;
    }
    return { status: "failed" };
  } catch (error) {
    return { status: input.signal.aborted || (error instanceof DOMException && error.name === "AbortError") ? "aborted" : "failed" };
  }
}

export async function putPointObjectCloudArtifact(input: {
  localProject: PointObjectCloudClientProject;
  artifact: SavedPointObjectArtifact;
  expectedCloudRevision: number | null;
  signal: AbortSignal;
  fetcher?: FetchLike;
}): Promise<PointObjectCloudPutResult> {
  const fetcher = input.fetcher ?? fetch;
  try {
    const response = await fetcher(ENDPOINT, {
      method: "PUT",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        schemaVersion: 1,
        localProject: input.localProject,
        artifact: input.artifact,
        expectedCloudRevision: input.expectedCloudRevision
      }),
      signal: input.signal
    });
    const value: unknown = await response.json().catch(() => null);
    if (response.status === 409) {
      const revision = isRecord(value) && isRecord(value.current) && Number.isSafeInteger(value.current.cloudRevision) && Number(value.current.cloudRevision) >= 1
        ? Number(value.current.cloudRevision)
        : null;
      return { status: "conflict", reason: isRecord(value) ? parseConflictReason(value.reason) : null, cloudRevision: revision };
    }
    if (!response.ok) return { status: requestFailureStatus(response) };
    if (!isRecord(value) || !hasExactKeys(value, ["ok", "persisted", "storageMode", "outcome", "cloudRevision", "payloadHash", "immutableHash"]) ||
        value.ok !== true || value.persisted !== true || value.storageMode !== "authenticated_supabase_preview" ||
        !(value.outcome === "created" || value.outcome === "replayed" || value.outcome === "updated") ||
        !Number.isSafeInteger(value.cloudRevision) || Number(value.cloudRevision) < 1 ||
        typeof value.payloadHash !== "string" || !hashPattern.test(value.payloadHash) || value.payloadHash !== input.artifact.payloadHash ||
        typeof value.immutableHash !== "string" || !hashPattern.test(value.immutableHash)) {
      return { status: "failed" };
    }
    return { status: "saved", outcome: value.outcome, cloudRevision: Number(value.cloudRevision) };
  } catch (error) {
    return { status: input.signal.aborted || (error instanceof DOMException && error.name === "AbortError") ? "aborted" : "failed" };
  }
}

/**
 * One identity-bound browser session. Remote reads are additive and local
 * writes stay authoritative when bytes conflict. Existing local archives are
 * never bulk-uploaded; only explicit persist() calls enter the cloud queue.
 */
export function createPointObjectCloudSyncSession(input: PointObjectCloudSyncSessionInput) {
  const controller = new AbortController();
  const revisions = new Map<string, number>();
  let closed = false;
  let status: PointObjectCloudSyncStatus = "syncing";
  let started: Promise<PointObjectCloudAvailability | "conflict" | "capacity"> | null = null;
  let uploadQueue: Promise<void> = Promise.resolve();
  let writesBlocked = false;

  const setStatus = (next: PointObjectCloudSyncStatus) => {
    if (closed) return;
    status = next;
    input.onStatus?.(next);
  };

  const start = () => {
    if (started) return started;
    setStatus("syncing");
    started = (async () => {
      try {
        const listed = await listPointObjectCloudArtifacts({ signal: controller.signal, fetcher: input.fetcher });
        if (closed) return "aborted" as const;
        if (listed.status !== "ready") {
          writesBlocked = true;
          setStatus(listed.status);
          return listed.status;
        }
        for (const item of listed.items) revisions.set(item.artifact.artifactId, item.cloudRevision);
        let importFailure: "conflict" | "capacity" | "failed" | null = null;
        // Server pages are newest-first. Additive local imports prepend, so
        // replay oldest-first to retain newest-first local artifact ordering.
        const ordered = [...listed.items].sort((left, right) =>
          left.artifact.completedAt.localeCompare(right.artifact.completedAt) ||
          left.artifact.artifactId.localeCompare(right.artifact.artifactId));
        for (const item of ordered) {
          if (closed) return "aborted" as const;
          const imported = await input.importArtifact(input.identityKey, item.localProject, item.artifact);
          if (closed) return "aborted" as const;
          if (imported.status === "failed") importFailure = "failed";
          else if (imported.status === "capacity" && importFailure !== "failed") importFailure = "capacity";
          else if (imported.status === "conflict" && importFailure === null) importFailure = "conflict";
        }
        writesBlocked = importFailure !== null;
        const importStatus: "ready" | "conflict" | "capacity" | "failed" = importFailure ?? "ready";
        setStatus(importStatus);
        return importStatus;
      } catch (error) {
        if (closed || controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return "aborted" as const;
        writesBlocked = true;
        setStatus("failed");
        return "failed" as const;
      }
    })();
    return started;
  };

  const persist = (localProject: PointObjectCloudClientProject, artifact: SavedPointObjectArtifact): Promise<PointObjectCloudPutResult | { status: "skipped" }> => {
    const operation = uploadQueue.catch(() => undefined).then(async (): Promise<PointObjectCloudPutResult | { status: "skipped" }> => {
      const availability = await start();
      if (closed || availability !== "ready" || writesBlocked || status !== "ready") return { status: "skipped" };
      const result = await putPointObjectCloudArtifact({
        localProject,
        artifact,
        expectedCloudRevision: revisions.get(artifact.artifactId) ?? null,
        signal: controller.signal,
        fetcher: input.fetcher
      });
      if (closed) return { status: "skipped" };
      if (result.status === "saved") {
        revisions.set(artifact.artifactId, result.cloudRevision);
        setStatus("ready");
      } else if (result.status === "conflict") {
        writesBlocked = true;
        setStatus("conflict");
      } else {
        writesBlocked = true;
        setStatus(result.status);
      }
      return result;
    });
    uploadQueue = operation.then(() => undefined, () => undefined);
    return operation;
  };

  return {
    identityKey: input.identityKey,
    start,
    persist,
    close() {
      closed = true;
      controller.abort();
    },
    getStatus: () => status,
    getExpectedRevision: (artifactId: string) => revisions.get(artifactId) ?? null
  };
}
