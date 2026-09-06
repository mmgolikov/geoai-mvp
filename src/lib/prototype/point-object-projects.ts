import type { PointObjectGeneratedConcept } from "@/components/point-to-object/create-panel";
import type { LiveMapSelection, PointObjectAiResponse } from "@/components/point-to-object/live-types";
import type { PointObjectAreaContextResult } from "@/src/lib/prototype/point-to-object-area-context-contract";
import type { PointObjectCreateAoi } from "@/src/lib/prototype/point-to-object-create";
import type { PointObjectCreateEditorSnapshot } from "@/src/lib/prototype/point-to-object-create-editor";
import type { PointObjectFindResult } from "@/src/lib/prototype/point-to-object-find-contract";
import type { PointObjectFindSessionState } from "@/src/lib/prototype/point-to-object-find-session";
import type { PointObjectLocale, PointObjectMarketKey } from "@/src/lib/prototype/point-to-object-markets";
import type { GeoAIUser } from "@/src/types/auth";

export const POINT_OBJECT_PROJECTS_SCHEMA_VERSION = 1 as const;
export const POINT_OBJECT_PROJECTS_EVENT = "geoai:point-to-object:projects-change";
export const POINT_OBJECT_PROJECT_RESTORE_KEY = "geoai:point-to-object:project-restore:v1";
export const POINT_OBJECT_BROWSER_IDENTITY_KEY = "geoai:point-to-object:browser-identity:v1";
export const POINT_OBJECT_FIND_SESSION_KEY = "geoai:point-to-object:find:v1";

const STORAGE_PREFIX = "geoai:point-to-object:projects:v1:";
const MAX_STORE_BYTES = 4 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 768 * 1024;
const MAX_PROJECTS = 20;
const MAX_ARTIFACTS_PER_PROJECT = 30;
const STORED_MARKETS_V1 = new Set<PointObjectMarketKey>([
  "dubai", "abu_dhabi", "doha", "riyadh", "jeddah", "kuala_lumpur", "singapore", "hong_kong", "moscow"
]);

export type PointObjectProjectIdentity = `demo:${string}` | `user:${string}`;

export type PointObjectAnalyseProjectPayload = {
  selection: LiveMapSelection;
  analysis: Extract<PointObjectAiResponse, { mode: "openai" }>;
};

export type PointObjectFindProjectPayload = {
  session: PointObjectFindSessionState & { result: PointObjectFindResult };
};

export type PointObjectCreateProjectPayload = {
  aoi: PointObjectCreateAoi;
  editorSnapshot: PointObjectCreateEditorSnapshot | null;
  generated: PointObjectGeneratedConcept;
  generatedLocale: PointObjectLocale;
  activeAlternativeId: "A" | "B";
  areaContext: PointObjectAreaContextResult | null;
};

export type PointObjectProjectOperationInput =
  | { kind: "analyse"; locale: PointObjectLocale; marketKey: PointObjectMarketKey; label: string; payload: PointObjectAnalyseProjectPayload }
  | { kind: "find"; locale: PointObjectLocale; marketKey: PointObjectMarketKey; label: string; payload: PointObjectFindProjectPayload }
  | { kind: "create"; locale: PointObjectLocale; marketKey: PointObjectMarketKey; label: string; payload: PointObjectCreateProjectPayload };

export type SavedPointObjectArtifact = PointObjectProjectOperationInput & {
  schemaVersion: 1;
  artifactId: string;
  idempotencyKey: string;
  payloadHash: string;
  completedAt: string;
};

export type SavedPointObjectProject = {
  schemaVersion: 1;
  projectId: string;
  name: string;
  storageMode: "browser_local_on_this_device";
  createdAt: string;
  updatedAt: string;
  artifacts: SavedPointObjectArtifact[];
};

export type PointObjectProjectStore = {
  schemaVersion: 1;
  identityKey: PointObjectProjectIdentity;
  activeProjectId: string | null;
  projects: SavedPointObjectProject[];
};

export type PointObjectProjectSaveResult =
  | { status: "saved" | "replayed"; project: SavedPointObjectProject; artifact: SavedPointObjectArtifact }
  | { status: "conflict" | "failed"; message: string; idempotencyKey: string };

export type PointObjectProjectEventDetail = {
  identityKey: PointObjectProjectIdentity;
  status: "idle" | "saving" | "saved" | "failed" | "conflict";
  message: string;
};

type PendingOperation = {
  identityKey: PointObjectProjectIdentity;
  idempotencyKey: string;
  input: PointObjectProjectOperationInput;
};

const pendingOperations = new Map<PointObjectProjectIdentity, PendingOperation>();
const operationChains = new Map<PointObjectProjectIdentity, Promise<unknown>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isStoredMarketV1(value: unknown): value is PointObjectMarketKey {
  return typeof value === "string" && STORED_MARKETS_V1.has(value as PointObjectMarketKey);
}

function projectStorageKey(identityKey: PointObjectProjectIdentity): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(identityKey)}`;
}

function emptyStore(identityKey: PointObjectProjectIdentity): PointObjectProjectStore {
  return { schemaVersion: 1, identityKey, activeProjectId: null, projects: [] };
}

function isOperationPayload(kind: unknown, payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  if (kind === "analyse") return isRecord(payload.selection) && isRecord(payload.analysis) && payload.analysis.mode === "openai";
  if (kind === "find") return isRecord(payload.session) && payload.session.version === 1 && isRecord(payload.session.result);
  if (kind === "create") return isRecord(payload.aoi) && isRecord(payload.generated) && payload.generated.mode === "openai_concept" &&
    (payload.generatedLocale === "en" || payload.generatedLocale === "ru") &&
    (payload.activeAlternativeId === "A" || payload.activeAlternativeId === "B");
  return false;
}

function parseArtifact(value: unknown): SavedPointObjectArtifact | null {
  if (!isRecord(value) || value.schemaVersion !== 1 ||
      (value.kind !== "analyse" && value.kind !== "find" && value.kind !== "create") ||
      (value.locale !== "en" && value.locale !== "ru") || !isStoredMarketV1(value.marketKey) ||
      !validText(value.label, 240) || !validText(value.artifactId, 160) ||
      !validText(value.idempotencyKey, 200) || typeof value.payloadHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.payloadHash) || !validTimestamp(value.completedAt) ||
      !isOperationPayload(value.kind, value.payload)) return null;
  return value as unknown as SavedPointObjectArtifact;
}

function parseProject(value: unknown): SavedPointObjectProject | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !validText(value.projectId, 160) ||
      !validText(value.name, 120) || value.storageMode !== "browser_local_on_this_device" ||
      !validTimestamp(value.createdAt) || !validTimestamp(value.updatedAt) || !Array.isArray(value.artifacts) ||
      value.artifacts.length > MAX_ARTIFACTS_PER_PROJECT) return null;
  const artifacts = value.artifacts.map(parseArtifact);
  if (artifacts.some((artifact) => artifact === null)) return null;
  return { ...value, artifacts: artifacts as SavedPointObjectArtifact[] } as SavedPointObjectProject;
}

export function pointObjectProjectIdentity(user: GeoAIUser | null): PointObjectProjectIdentity | null {
  if (!user || !/^[A-Za-z0-9_.:@-]{1,180}$/.test(user.id)) return null;
  return `${user.isDemoUser ? "demo" : "user"}:${user.id}`;
}

export function readPointObjectProjects(identityKey: PointObjectProjectIdentity): PointObjectProjectStore {
  if (typeof window === "undefined") return emptyStore(identityKey);
  try {
    const raw = window.localStorage.getItem(projectStorageKey(identityKey));
    if (!raw) return emptyStore(identityKey);
    if (new TextEncoder().encode(raw).byteLength > MAX_STORE_BYTES) return emptyStore(identityKey);
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schemaVersion !== 1 || value.identityKey !== identityKey ||
        !Array.isArray(value.projects) || value.projects.length > MAX_PROJECTS ||
        !(value.activeProjectId === null || validText(value.activeProjectId, 160))) return emptyStore(identityKey);
    const projects = value.projects.map(parseProject);
    if (projects.some((project) => project === null)) return emptyStore(identityKey);
    const parsedProjects = projects as SavedPointObjectProject[];
    const activeProjectId = parsedProjects.some((project) => project.projectId === value.activeProjectId)
      ? value.activeProjectId as string
      : parsedProjects[0]?.projectId ?? null;
    return { schemaVersion: 1, identityKey, activeProjectId, projects: parsedProjects };
  } catch {
    return emptyStore(identityKey);
  }
}

function emit(detail: PointObjectProjectEventDetail): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<PointObjectProjectEventDetail>(POINT_OBJECT_PROJECTS_EVENT, { detail }));
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

function defaultProjectName(input: PointObjectProjectOperationInput, index: number): string {
  const place = input.label.trim().slice(0, 72);
  return place ? `${place} · Project` : `GeoAI project ${index}`;
}

export function createPointObjectProject(identityKey: PointObjectProjectIdentity, locale: PointObjectLocale, name?: string): SavedPointObjectProject {
  const store = readPointObjectProjects(identityKey);
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
  writeStore({ ...store, activeProjectId: project.projectId, projects: [project, ...store.projects] });
  emit({ identityKey, status: "idle", message: locale === "ru" ? "Новый проект выбран на этом устройстве." : "New project selected on this device." });
  return project;
}

export function selectPointObjectProject(identityKey: PointObjectProjectIdentity, projectId: string): boolean {
  const store = readPointObjectProjects(identityKey);
  if (!store.projects.some((project) => project.projectId === projectId)) return false;
  writeStore({ ...store, activeProjectId: projectId });
  emit({ identityKey, status: "idle", message: "" });
  return true;
}

async function commitPendingOperation(pending: PendingOperation): Promise<PointObjectProjectSaveResult> {
  const { identityKey, idempotencyKey, input } = pending;
  try {
    const payloadRaw = JSON.stringify(input.payload);
    if (new TextEncoder().encode(payloadRaw).byteLength > MAX_ARTIFACT_BYTES) throw new Error("The completed result is too large for browser-local project storage.");
    const payloadHash = await hashPointObjectOperation(input);
    const store = readPointObjectProjects(identityKey);
    const prior = store.projects.flatMap((project) => project.artifacts.map((artifact) => ({ project, artifact })))
      .find(({ artifact }) => artifact.idempotencyKey === idempotencyKey);
    if (prior) {
      if (prior.artifact.payloadHash !== payloadHash) {
        emit({ identityKey, status: "conflict", message: "Save conflict: this operation key already belongs to a different completed result." });
        return { status: "conflict", message: "Idempotency conflict.", idempotencyKey };
      }
      if (pendingOperations.get(identityKey)?.idempotencyKey === idempotencyKey) pendingOperations.delete(identityKey);
      emit({ identityKey, status: "saved", message: input.locale === "ru" ? "Уже сохранено на этом устройстве." : "Already saved on this device." });
      return { status: "replayed", project: prior.project, artifact: prior.artifact };
    }
    let project = store.projects.find((candidate) => candidate.projectId === store.activeProjectId) ?? null;
    let projects = [...store.projects];
    if (!project) {
      const now = new Date().toISOString();
      project = {
        schemaVersion: 1,
        projectId: randomId("project"),
        name: defaultProjectName(input, projects.length + 1),
        storageMode: "browser_local_on_this_device",
        createdAt: now,
        updatedAt: now,
        artifacts: []
      };
      projects = [project, ...projects];
    }
    const artifact: SavedPointObjectArtifact = {
      schemaVersion: 1,
      artifactId: randomId("artifact"),
      idempotencyKey,
      payloadHash,
      completedAt: new Date().toISOString(),
      ...input,
      label: input.label.trim().slice(0, 240)
    };
    const updatedProject: SavedPointObjectProject = {
      ...project,
      updatedAt: artifact.completedAt,
      artifacts: [artifact, ...project.artifacts].slice(0, MAX_ARTIFACTS_PER_PROJECT)
    };
    projects = projects.map((candidate) => candidate.projectId === updatedProject.projectId ? updatedProject : candidate);
    if (!projects.some((candidate) => candidate.projectId === updatedProject.projectId)) projects.unshift(updatedProject);
    writeStore({ schemaVersion: 1, identityKey, activeProjectId: updatedProject.projectId, projects });
    if (pendingOperations.get(identityKey)?.idempotencyKey === idempotencyKey) pendingOperations.delete(identityKey);
    emit({ identityKey, status: "saved", message: input.locale === "ru" ? "Сохранено на этом устройстве." : "Saved on this device." });
    return { status: "saved", project: updatedProject, artifact };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browser-local save failed.";
    emit({ identityKey, status: "failed", message });
    return { status: "failed", message, idempotencyKey };
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
  idempotencyKey = randomId("operation")
): Promise<PointObjectProjectSaveResult> {
  const pending = { identityKey, input, idempotencyKey };
  pendingOperations.set(identityKey, pending);
  emit({ identityKey, status: "saving", message: input.locale === "ru" ? "Сохраняем на этом устройстве…" : "Saving on this device…" });
  return enqueueOperation(pending);
}

export async function retryPendingPointObjectOperation(identityKey: PointObjectProjectIdentity): Promise<PointObjectProjectSaveResult | null> {
  const pending = pendingOperations.get(identityKey);
  if (!pending) return null;
  emit({ identityKey, status: "saving", message: pending.input.locale === "ru" ? "Повторяем локальное сохранение…" : "Retrying local save…" });
  return enqueueOperation(pending);
}

export async function verifySavedPointObjectArtifact(artifact: SavedPointObjectArtifact): Promise<boolean> {
  return artifact.payloadHash === await hashPointObjectOperation(artifact);
}

export function queuePointObjectProjectRestore(identityKey: PointObjectProjectIdentity, artifact: SavedPointObjectArtifact): void {
  window.sessionStorage.setItem(POINT_OBJECT_PROJECT_RESTORE_KEY, JSON.stringify({ schemaVersion: 1, identityKey, artifact }));
}

export function consumePointObjectProjectRestore(identityKey: PointObjectProjectIdentity): SavedPointObjectArtifact | null {
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_PROJECT_RESTORE_KEY);
    window.sessionStorage.removeItem(POINT_OBJECT_PROJECT_RESTORE_KEY);
    if (!raw || new TextEncoder().encode(raw).byteLength > MAX_ARTIFACT_BYTES + 16_384) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schemaVersion !== 1 || value.identityKey !== identityKey) return null;
    return parseArtifact(value.artifact);
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
        POINT_OBJECT_PROJECT_RESTORE_KEY
      ]) window.sessionStorage.removeItem(key);
    }
    if (identityKey) window.localStorage.setItem(POINT_OBJECT_BROWSER_IDENTITY_KEY, identityKey);
    else window.localStorage.removeItem(POINT_OBJECT_BROWSER_IDENTITY_KEY);
  } catch {
    // A storage-restricted browser keeps no project or transient project state.
  }
}
