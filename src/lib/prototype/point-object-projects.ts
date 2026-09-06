import {
  parsePointObjectProjectOperationInput,
  parsePointObjectProjectStore,
  parseSavedPointObjectArtifact,
  type PointObjectCreateProjectPayload,
  type PointObjectFindProjectPayload,
  type PointObjectProjectIdentity,
  type PointObjectProjectOperationInput,
  type PointObjectProjectStore,
  type SavedPointObjectArtifact,
  type SavedPointObjectProject
} from "@/src/lib/prototype/point-object-projects-contract";
import { parsePointObjectFindSessionState } from "@/src/lib/prototype/point-to-object-find-session";
import type { PointObjectLocale } from "@/src/lib/prototype/point-to-object-markets";
import type { GeoAIUser } from "@/src/types/auth";

export type {
  PointObjectAnalyseProjectPayload,
  PointObjectCreateProjectPayload,
  PointObjectFindProjectPayload,
  PointObjectProjectIdentity,
  PointObjectProjectOperationInput,
  PointObjectProjectStore,
  SavedPointObjectArtifact,
  SavedPointObjectProject
} from "@/src/lib/prototype/point-object-projects-contract";

export const POINT_OBJECT_PROJECTS_SCHEMA_VERSION = 1 as const;
export const POINT_OBJECT_PROJECTS_EVENT = "geoai:point-to-object:projects-change";
export const POINT_OBJECT_PROJECT_RESTORE_KEY = "geoai:point-to-object:project-restore:v1";
export const POINT_OBJECT_ANALYSIS_RESTORE_KEY = "geoai:point-to-object:analysis-restore:v1";
export const POINT_OBJECT_BROWSER_IDENTITY_KEY = "geoai:point-to-object:browser-identity:v1";
export const POINT_OBJECT_FIND_SESSION_KEY = "geoai:point-to-object:find:v1";

const STORAGE_PREFIX = "geoai:point-to-object:projects:v1:";
const MAX_STORE_BYTES = 4 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 768 * 1024;
const MAX_PROJECTS = 20;
const MAX_ARTIFACTS_PER_PROJECT = 30;
const MAX_PENDING_OPERATIONS_PER_IDENTITY = 20;

export type PointObjectProjectSaveResult =
  | { status: "saved" | "replayed"; project: SavedPointObjectProject; artifact: SavedPointObjectArtifact }
  | { status: "conflict" | "failed" | "capacity" | "queue_full"; code: PointObjectProjectFailureCode; message: string; idempotencyKey: string };

export type PointObjectProjectFailureCode =
  | "identity_changed"
  | "store_damaged"
  | "storage_inaccessible"
  | "storage_write_failed"
  | "project_capacity"
  | "project_limit"
  | "pending_queue_full"
  | "payload_invalid"
  | "payload_too_large"
  | "idempotency_conflict";

export type PointObjectProjectEventDetail = {
  identityKey: PointObjectProjectIdentity;
  status: "idle" | "saving" | "saved" | "failed" | "conflict" | "capacity" | "damaged";
  message: string;
  code?: PointObjectProjectFailureCode;
  pendingCount: number;
  idempotencyKey?: string;
};

export type PointObjectProjectDestination = {
  identityKey: PointObjectProjectIdentity;
  projectId: string;
  projectName: string;
  projectCreatedAt: string;
};

export type PointObjectProjectStoreReadResult =
  | { status: "missing" | "ready"; store: PointObjectProjectStore; rawPreserved: true }
  | { status: "damaged" | "inaccessible"; store: null; message: string; rawPreserved: true };

type PendingOperation = {
  identityKey: PointObjectProjectIdentity;
  idempotencyKey: string;
  input: PointObjectProjectOperationInput;
  destination: PointObjectProjectDestination;
  createdAt: string;
  lastFailure: PointObjectProjectFailureCode | null;
};

const pendingOperations = new Map<PointObjectProjectIdentity, Map<string, PendingOperation>>();
const operationChains = new Map<PointObjectProjectIdentity, Promise<unknown>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function projectStorageKey(identityKey: PointObjectProjectIdentity): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(identityKey)}`;
}

function emptyStore(identityKey: PointObjectProjectIdentity): PointObjectProjectStore {
  return { schemaVersion: 1, identityKey, activeProjectId: null, projects: [] };
}

export function pointObjectProjectIdentity(user: GeoAIUser | null): PointObjectProjectIdentity | null {
  if (!user || !/^[A-Za-z0-9_.:@-]{1,180}$/.test(user.id)) return null;
  return `${user.isDemoUser ? "demo" : "user"}:${user.id}`;
}

export function inspectPointObjectProjects(identityKey: PointObjectProjectIdentity): PointObjectProjectStoreReadResult {
  if (typeof window === "undefined") return { status: "missing", store: emptyStore(identityKey), rawPreserved: true };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(projectStorageKey(identityKey));
  } catch {
    return { status: "inaccessible", store: null, message: "Browser storage is inaccessible. Existing saved project bytes were not changed.", rawPreserved: true };
  }
  if (!raw) return { status: "missing", store: emptyStore(identityKey), rawPreserved: true };
  if (new TextEncoder().encode(raw).byteLength > MAX_STORE_BYTES) {
    return { status: "damaged", store: null, message: "Saved project data exceeds the supported browser-local size. Original bytes were preserved.", rawPreserved: true };
  }
  try {
    const store = parsePointObjectProjectStore(JSON.parse(raw), identityKey, MAX_PROJECTS, MAX_ARTIFACTS_PER_PROJECT);
    return store
      ? { status: "ready", store, rawPreserved: true }
      : { status: "damaged", store: null, message: "Saved project data is damaged or has an unsupported shape. Original bytes were preserved.", rawPreserved: true };
  } catch {
    return { status: "damaged", store: null, message: "Saved project data is damaged or has invalid JSON. Original bytes were preserved.", rawPreserved: true };
  }
}

export function readPointObjectProjects(identityKey: PointObjectProjectIdentity): PointObjectProjectStore {
  const result = inspectPointObjectProjects(identityKey);
  if (result.store) return result.store;
  throw new Error(result.message);
}

export async function readVerifiedPointObjectProjects(identityKey: PointObjectProjectIdentity): Promise<PointObjectProjectStoreReadResult> {
  const result = inspectPointObjectProjects(identityKey);
  if (!result.store || result.status === "missing") return result;
  try {
    const verification = await Promise.all(result.store.projects.flatMap((project) => project.artifacts).map(verifySavedPointObjectArtifact));
    if (verification.some((verified) => !verified)) {
      return { status: "damaged", store: null, message: "Saved project integrity verification failed. Original bytes were preserved.", rawPreserved: true };
    }
    return result;
  } catch {
    return { status: "inaccessible", store: null, message: "Saved project integrity could not be verified. Original bytes were preserved.", rawPreserved: true };
  }
}

function pendingQueue(identityKey: PointObjectProjectIdentity): Map<string, PendingOperation> {
  const current = pendingOperations.get(identityKey);
  if (current) return current;
  const created = new Map<string, PendingOperation>();
  pendingOperations.set(identityKey, created);
  return created;
}

export function pointObjectPendingOperationCount(identityKey: PointObjectProjectIdentity): number {
  return pendingOperations.get(identityKey)?.size ?? 0;
}

function emit(detail: PointObjectProjectEventDetail): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<PointObjectProjectEventDetail>(POINT_OBJECT_PROJECTS_EVENT, { detail }));
}

function emitState(identityKey: PointObjectProjectIdentity, detail: Omit<PointObjectProjectEventDetail, "identityKey" | "pendingCount">): void {
  emit({ identityKey, pendingCount: pointObjectPendingOperationCount(identityKey), ...detail });
}

function randomId(prefix: string): string {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

function writeStore(store: PointObjectProjectStore): void {
  const raw = JSON.stringify(store);
  if (new TextEncoder().encode(raw).byteLength > MAX_STORE_BYTES) throw new Error("The browser-local project limit has been reached.");
  window.localStorage.setItem(projectStorageKey(store.identityKey), raw);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export async function hashPointObjectOperation(input: PointObjectProjectOperationInput): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson({ kind: input.kind, locale: input.locale, marketKey: input.marketKey, payload: input.payload }));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function defaultProjectName(input: Pick<PointObjectProjectOperationInput, "label">, index: number): string {
  const place = input.label.trim().slice(0, 72);
  return place ? `${place} · Project` : `GeoAI project ${index}`;
}

function currentBrowserIdentity(): PointObjectProjectIdentity | null {
  try {
    const value = window.localStorage.getItem(POINT_OBJECT_BROWSER_IDENTITY_KEY);
    return typeof value === "string" ? value as PointObjectProjectIdentity : null;
  } catch {
    return null;
  }
}

function assertCurrentIdentity(identityKey: PointObjectProjectIdentity): void {
  if (currentBrowserIdentity() !== identityKey) throw new Error("The browser identity changed before the local project operation completed.");
}

export async function createPointObjectProject(identityKey: PointObjectProjectIdentity, locale: PointObjectLocale, name?: string): Promise<SavedPointObjectProject> {
  assertCurrentIdentity(identityKey);
  const read = await readVerifiedPointObjectProjects(identityKey);
  if (!read.store) throw new Error(read.message);
  const store = read.store;
  if (store.projects.length >= MAX_PROJECTS) throw new Error(locale === "ru" ? "Достигнут лимит локальных проектов." : "The local project limit has been reached.");
  const now = new Date().toISOString();
  const project: SavedPointObjectProject = {
    schemaVersion: 1,
    projectId: randomId("project"),
    name: name?.trim().slice(0, 120) || (locale === "ru" ? `Новый проект ${store.projects.length + 1}` : `New project ${store.projects.length + 1}`),
    storageMode: "browser_local_on_this_device",
    createdAt: now,
    updatedAt: now,
    artifacts: []
  };
  assertCurrentIdentity(identityKey);
  writeStore({ ...store, activeProjectId: project.projectId, projects: [project, ...store.projects] });
  emitState(identityKey, { status: "idle", message: locale === "ru" ? "Новый проект выбран на этом устройстве." : "New project selected on this device." });
  return project;
}

export async function selectPointObjectProject(identityKey: PointObjectProjectIdentity, projectId: string): Promise<boolean> {
  assertCurrentIdentity(identityKey);
  const read = await readVerifiedPointObjectProjects(identityKey);
  if (!read.store) throw new Error(read.message);
  const store = read.store;
  if (!store.projects.some((project) => project.projectId === projectId)) return false;
  assertCurrentIdentity(identityKey);
  writeStore({ ...store, activeProjectId: projectId });
  emitState(identityKey, { status: "idle", message: "" });
  return true;
}

export function capturePointObjectProjectDestination(
  identityKey: PointObjectProjectIdentity,
  input: Pick<PointObjectProjectOperationInput, "label"> = { label: "GeoAI" }
): PointObjectProjectDestination {
  const read = inspectPointObjectProjects(identityKey);
  const active = read.store?.projects.find((project) => project.projectId === read.store?.activeProjectId);
  const createdAt = new Date().toISOString();
  return active
    ? { identityKey, projectId: active.projectId, projectName: active.name, projectCreatedAt: active.createdAt }
    : {
        identityKey,
        projectId: randomId("project"),
        projectName: defaultProjectName(input, (read.store?.projects.length ?? 0) + 1),
        projectCreatedAt: createdAt
      };
}

async function commitPendingOperation(pending: PendingOperation): Promise<PointObjectProjectSaveResult> {
  const { identityKey, idempotencyKey, input, destination } = pending;
  try {
    assertCurrentIdentity(identityKey);
    const payloadHash = await hashPointObjectOperation(input);
    const read = await readVerifiedPointObjectProjects(identityKey);
    if (!read.store) {
      pending.lastFailure = read.status === "damaged" ? "store_damaged" : "storage_inaccessible";
      emitState(identityKey, { status: read.status === "damaged" ? "damaged" : "failed", code: pending.lastFailure, idempotencyKey, message: read.message });
      return { status: "failed", code: pending.lastFailure, message: read.message, idempotencyKey };
    }
    const store = read.store;
    const prior = store.projects.flatMap((project) => project.artifacts.map((artifact) => ({ project, artifact })))
      .find(({ artifact }) => artifact.idempotencyKey === idempotencyKey);
    if (prior) {
      if (prior.artifact.payloadHash !== payloadHash) {
        pendingQueue(identityKey).delete(idempotencyKey);
        emitState(identityKey, { status: "conflict", code: "idempotency_conflict", idempotencyKey, message: "Save conflict: this operation key already belongs to a different completed result." });
        return { status: "conflict", code: "idempotency_conflict", message: "Idempotency conflict.", idempotencyKey };
      }
      pendingQueue(identityKey).delete(idempotencyKey);
      emitState(identityKey, { status: "saved", message: input.locale === "ru" ? "Уже сохранено на этом устройстве." : "Already saved on this device." });
      return { status: "replayed", project: prior.project, artifact: prior.artifact };
    }
    let project = store.projects.find((candidate) => candidate.projectId === destination.projectId) ?? null;
    let projects = [...store.projects];
    if (!project) {
      if (projects.length >= MAX_PROJECTS) {
        pending.lastFailure = "project_limit";
        const message = input.locale === "ru" ? "Достигнут лимит локальных проектов. Результат сохранён в очереди повторной записи." : "The local project limit has been reached. The result remains queued for recovery.";
        emitState(identityKey, { status: "capacity", code: "project_limit", idempotencyKey, message });
        return { status: "capacity", code: "project_limit", message, idempotencyKey };
      }
      project = {
        schemaVersion: 1,
        projectId: destination.projectId,
        name: destination.projectName,
        storageMode: "browser_local_on_this_device",
        createdAt: destination.projectCreatedAt,
        updatedAt: destination.projectCreatedAt,
        artifacts: []
      };
      projects = [project, ...projects];
    }
    if (project.artifacts.length >= MAX_ARTIFACTS_PER_PROJECT) {
      pending.lastFailure = "project_capacity";
      const message = input.locale === "ru" ? "В проекте уже 30 результатов. Создайте новый проект, чтобы сохранить этот результат без удаления существующих." : "This project already has 30 results. Create a new project to save this result without deleting existing work.";
      emitState(identityKey, { status: "capacity", code: "project_capacity", idempotencyKey, message });
      return { status: "capacity", code: "project_capacity", message, idempotencyKey };
    }
    const completedAt = new Date().toISOString();
    const artifact: SavedPointObjectArtifact = {
      schemaVersion: 1,
      artifactId: randomId("artifact"),
      idempotencyKey,
      payloadHash,
      completedAt,
      updatedAt: completedAt,
      viewRevision: 0,
      ...input,
      label: input.label.trim().slice(0, 240)
    };
    const updatedProject: SavedPointObjectProject = {
      ...project,
      updatedAt: artifact.completedAt,
      artifacts: [artifact, ...project.artifacts]
    };
    projects = projects.map((candidate) => candidate.projectId === updatedProject.projectId ? updatedProject : candidate);
    if (!projects.some((candidate) => candidate.projectId === updatedProject.projectId)) projects.unshift(updatedProject);
    assertCurrentIdentity(identityKey);
    writeStore({ schemaVersion: 1, identityKey, activeProjectId: updatedProject.projectId, projects });
    pendingQueue(identityKey).delete(idempotencyKey);
    const remaining = [...pendingQueue(identityKey).values()].find((item) => item.lastFailure !== null);
    emitState(identityKey, remaining
      ? { status: remaining.lastFailure === "project_capacity" || remaining.lastFailure === "project_limit" ? "capacity" : "failed", code: remaining.lastFailure ?? undefined, idempotencyKey: remaining.idempotencyKey, message: input.locale === "ru" ? "Новый результат сохранён; более ранняя запись всё ещё ожидает восстановления." : "The new result was saved; an earlier result still needs recovery." }
      : { status: "saved", message: input.locale === "ru" ? "Сохранено на этом устройстве." : "Saved on this device." });
    return { status: "saved", project: updatedProject, artifact };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browser-local save failed.";
    const code: PointObjectProjectFailureCode = /identity changed/i.test(message) ? "identity_changed" : "storage_write_failed";
    pending.lastFailure = code;
    emitState(identityKey, { status: "failed", code, idempotencyKey, message });
    return { status: "failed", code, message, idempotencyKey };
  }
}

function enqueueOperation(pending: PendingOperation): Promise<PointObjectProjectSaveResult> {
  const previous = operationChains.get(pending.identityKey) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(() => commitPendingOperation(pending));
  operationChains.set(pending.identityKey, current);
  void current.finally(() => {
    if (operationChains.get(pending.identityKey) === current) operationChains.delete(pending.identityKey);
  });
  return current;
}

export async function savePointObjectOperation(
  identityKey: PointObjectProjectIdentity,
  input: PointObjectProjectOperationInput,
  idempotencyKey = randomId("operation"),
  destination = capturePointObjectProjectDestination(identityKey, input)
): Promise<PointObjectProjectSaveResult> {
  let immutableInput: PointObjectProjectOperationInput | null = null;
  try {
    const raw = JSON.stringify(input);
    if (new TextEncoder().encode(raw).byteLength > MAX_ARTIFACT_BYTES) {
      return { status: "failed", code: "payload_too_large", message: "The completed result is too large for browser-local project storage.", idempotencyKey };
    }
    immutableInput = parsePointObjectProjectOperationInput(JSON.parse(raw));
  } catch {
    immutableInput = null;
  }
  if (!immutableInput || destination.identityKey !== identityKey) {
    const message = "The completed result failed strict browser-local validation.";
    emitState(identityKey, { status: "failed", code: "payload_invalid", idempotencyKey, message });
    return { status: "failed", code: "payload_invalid", message, idempotencyKey };
  }
  const queue = pendingQueue(identityKey);
  const existing = queue.get(idempotencyKey);
  if (existing && canonicalJson(existing.input) !== canonicalJson(immutableInput)) {
    const message = "Save conflict: this pending operation key already belongs to a different completed result.";
    emitState(identityKey, { status: "conflict", code: "idempotency_conflict", idempotencyKey, message });
    return { status: "conflict", code: "idempotency_conflict", message, idempotencyKey };
  }
  if (!existing && queue.size >= MAX_PENDING_OPERATIONS_PER_IDENTITY) {
    const message = immutableInput.locale === "ru" ? "Очередь локального восстановления заполнена. Новая запись не принята; результат остаётся на текущем экране." : "The local recovery queue is full. The new save was not accepted; keep the current result open.";
    emitState(identityKey, { status: "failed", code: "pending_queue_full", idempotencyKey, message });
    return { status: "queue_full", code: "pending_queue_full", message, idempotencyKey };
  }
  const pending: PendingOperation = existing ?? { identityKey, input: immutableInput, idempotencyKey, destination: { ...destination }, createdAt: new Date().toISOString(), lastFailure: null };
  queue.set(idempotencyKey, pending);
  emitState(identityKey, { status: "saving", idempotencyKey, message: immutableInput.locale === "ru" ? "Сохраняем на этом устройстве…" : "Saving on this device…" });
  return enqueueOperation(pending);
}

export async function retryPendingPointObjectOperations(identityKey: PointObjectProjectIdentity): Promise<PointObjectProjectSaveResult[]> {
  const operations = [...(pendingOperations.get(identityKey)?.values() ?? [])].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const results: PointObjectProjectSaveResult[] = [];
  for (const pending of operations) {
    emitState(identityKey, { status: "saving", idempotencyKey: pending.idempotencyKey, message: pending.input.locale === "ru" ? "Повторяем локальное сохранение…" : "Retrying local save…" });
    results.push(await enqueueOperation(pending));
  }
  return results;
}

export async function retryPendingPointObjectOperation(identityKey: PointObjectProjectIdentity): Promise<PointObjectProjectSaveResult | null> {
  return (await retryPendingPointObjectOperations(identityKey))[0] ?? null;
}

export async function continuePendingPointObjectOperationInNewProject(identityKey: PointObjectProjectIdentity): Promise<PointObjectProjectSaveResult | null> {
  assertCurrentIdentity(identityKey);
  const pending = [...(pendingOperations.get(identityKey)?.values() ?? [])]
    .find((item) => item.lastFailure === "project_capacity");
  if (!pending) return null;
  const read = await readVerifiedPointObjectProjects(identityKey);
  if (!read.store) throw new Error(read.message);
  if (read.store.projects.length >= MAX_PROJECTS) {
    const message = pending.input.locale === "ru" ? "Достигнут лимит локальных проектов." : "The local project limit has been reached.";
    return { status: "capacity", code: "project_limit", message, idempotencyKey: pending.idempotencyKey };
  }
  const now = new Date().toISOString();
  pending.destination = {
    identityKey,
    projectId: randomId("project"),
    projectName: defaultProjectName(pending.input, read.store.projects.length + 1),
    projectCreatedAt: now
  };
  pending.lastFailure = null;
  return enqueueOperation(pending);
}

export async function verifySavedPointObjectArtifact(artifact: SavedPointObjectArtifact): Promise<boolean> {
  return artifact.payloadHash === await hashPointObjectOperation(artifact);
}

async function updateArtifactViewState(
  identityKey: PointObjectProjectIdentity,
  artifactId: string,
  update: (artifact: SavedPointObjectArtifact) => PointObjectProjectOperationInput | null
): Promise<PointObjectProjectSaveResult> {
  try {
    assertCurrentIdentity(identityKey);
    const read = await readVerifiedPointObjectProjects(identityKey);
    if (!read.store) return { status: "failed", code: read.status === "damaged" ? "store_damaged" : "storage_inaccessible", message: read.message, idempotencyKey: artifactId };
    const project = read.store.projects.find((candidate) => candidate.artifacts.some((artifact) => artifact.artifactId === artifactId));
    const prior = project?.artifacts.find((artifact) => artifact.artifactId === artifactId);
    if (!project || !prior) return { status: "failed", code: "payload_invalid", message: "The saved result is no longer available.", idempotencyKey: artifactId };
    const input = update(prior);
    if (!input) return { status: "failed", code: "payload_invalid", message: "The saved view update failed strict validation.", idempotencyKey: prior.idempotencyKey };
    const nextHash = await hashPointObjectOperation(input);
    const updatedAt = new Date().toISOString();
    const updatedArtifact: SavedPointObjectArtifact = { ...prior, ...input, payloadHash: nextHash, updatedAt, viewRevision: prior.viewRevision + 1 };
    const updatedProject: SavedPointObjectProject = {
      ...project,
      updatedAt,
      artifacts: project.artifacts.map((artifact) => artifact.artifactId === artifactId ? updatedArtifact : artifact)
    };
    const nextStore: PointObjectProjectStore = {
      ...read.store,
      projects: read.store.projects.map((candidate) => candidate.projectId === project.projectId ? updatedProject : candidate)
    };
    assertCurrentIdentity(identityKey);
    writeStore(nextStore);
    emitState(identityKey, { status: "saved", message: input.locale === "ru" ? "Состояние проекта обновлено на этом устройстве." : "Project view updated on this device." });
    return { status: "saved", project: updatedProject, artifact: updatedArtifact };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The project view update could not be saved.";
    const code: PointObjectProjectFailureCode = /identity changed/i.test(message) ? "identity_changed" : "storage_write_failed";
    emitState(identityKey, { status: "failed", code, idempotencyKey: artifactId, message });
    return { status: "failed", code, message, idempotencyKey: artifactId };
  }
}

export function updatePointObjectFindViewState(
  identityKey: PointObjectProjectIdentity,
  artifactId: string,
  view: Pick<PointObjectFindProjectPayload["session"], "shortlist" | "comparisonOpen" | "analysisTargetSourceFeatureId">
): Promise<PointObjectProjectSaveResult> {
  return updateArtifactViewState(identityKey, artifactId, (artifact) => {
    if (artifact.kind !== "find") return null;
    const session = parsePointObjectFindSessionState({ ...artifact.payload.session, ...view, updatedAt: new Date().toISOString() });
    if (!session?.result) return null;
    return { kind: "find", locale: artifact.locale, marketKey: artifact.marketKey, label: artifact.label, payload: { session: { ...session, result: session.result } } };
  });
}

export function updatePointObjectCreateViewState(
  identityKey: PointObjectProjectIdentity,
  artifactId: string,
  activeAlternativeId: PointObjectCreateProjectPayload["activeAlternativeId"]
): Promise<PointObjectProjectSaveResult> {
  return updateArtifactViewState(identityKey, artifactId, (artifact) => {
    if (artifact.kind !== "create") return null;
    const input = { ...artifact, payload: { ...artifact.payload, activeAlternativeId } };
    return parsePointObjectProjectOperationInput(input);
  });
}

export function queuePointObjectProjectRestore(identityKey: PointObjectProjectIdentity, artifact: SavedPointObjectArtifact): boolean {
  try {
    assertCurrentIdentity(identityKey);
    window.sessionStorage.setItem(POINT_OBJECT_PROJECT_RESTORE_KEY, JSON.stringify({ schemaVersion: 1, identityKey, artifactId: artifact.artifactId }));
    return true;
  } catch {
    return false;
  }
}

export function clearPointObjectProjectRestore(): void {
  try {
    window.sessionStorage.removeItem(POINT_OBJECT_PROJECT_RESTORE_KEY);
  } catch {
    // A storage-restricted browser has no durable restore pointer to clear.
  }
}

export function queuePointObjectAnalysisRestore(identityKey: PointObjectProjectIdentity, artifact: Extract<SavedPointObjectArtifact, { kind: "analyse" }>): boolean {
  try {
    assertCurrentIdentity(identityKey);
    window.sessionStorage.setItem(POINT_OBJECT_ANALYSIS_RESTORE_KEY, JSON.stringify({ schemaVersion: 1, identityKey, artifactId: artifact.artifactId, locale: artifact.locale, payloadHash: artifact.payloadHash }));
    return true;
  } catch {
    return false;
  }
}

export function consumePointObjectAnalysisRestore(identityKey: PointObjectProjectIdentity): { locale: PointObjectLocale; artifactId: string; payloadHash: string } | null {
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_ANALYSIS_RESTORE_KEY);
    window.sessionStorage.removeItem(POINT_OBJECT_ANALYSIS_RESTORE_KEY);
    if (!raw || raw.length > 2_048) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schemaVersion !== 1 || value.identityKey !== identityKey ||
        (value.locale !== "en" && value.locale !== "ru") || typeof value.artifactId !== "string" ||
        typeof value.payloadHash !== "string" || !/^[a-f0-9]{64}$/.test(value.payloadHash)) return null;
    return { locale: value.locale, artifactId: value.artifactId, payloadHash: value.payloadHash };
  } catch {
    return null;
  }
}

export async function consumePointObjectProjectRestore(identityKey: PointObjectProjectIdentity): Promise<SavedPointObjectArtifact | null> {
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_PROJECT_RESTORE_KEY);
    if (!raw || new TextEncoder().encode(raw).byteLength > 2_048) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schemaVersion !== 1 || value.identityKey !== identityKey || typeof value.artifactId !== "string") {
      window.sessionStorage.removeItem(POINT_OBJECT_PROJECT_RESTORE_KEY);
      return null;
    }
    const read = await readVerifiedPointObjectProjects(identityKey);
    const artifact = read.store?.projects.flatMap((project) => project.artifacts).find((candidate) => candidate.artifactId === value.artifactId) ?? null;
    if (!artifact) window.sessionStorage.removeItem(POINT_OBJECT_PROJECT_RESTORE_KEY);
    return artifact;
  } catch {
    return null;
  }
}

export function reconcilePointObjectBrowserIdentity(identityKey: PointObjectProjectIdentity | null): void {
  if (typeof window === "undefined") return;
  try {
    const previous = window.localStorage.getItem(POINT_OBJECT_BROWSER_IDENTITY_KEY);
    if (previous && previous !== identityKey) {
      for (const key of [
        "geoai:point-to-object:selection:v3",
        "geoai:point-to-object:question:v2",
        "geoai:point-to-object:analysis:v8",
        "geoai:point-to-object:analysis:v7",
        POINT_OBJECT_FIND_SESSION_KEY,
        POINT_OBJECT_PROJECT_RESTORE_KEY,
        POINT_OBJECT_ANALYSIS_RESTORE_KEY
      ]) window.sessionStorage.removeItem(key);
    }
    if (identityKey) window.localStorage.setItem(POINT_OBJECT_BROWSER_IDENTITY_KEY, identityKey);
    else window.localStorage.removeItem(POINT_OBJECT_BROWSER_IDENTITY_KEY);
  } catch {
    // A storage-restricted browser keeps no project or transient project state.
  }
}
