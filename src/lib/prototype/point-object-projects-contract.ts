import { parsePointObjectAiResponse, parsePointObjectSelection } from "@/components/point-to-object/live-session";
import type { LiveMapSelection, PointObjectAiResponse } from "@/components/point-to-object/live-types";
import type { PointObjectAreaContextResult } from "@/src/lib/prototype/point-to-object-area-context-contract";
import type { PointObjectCreateAoi } from "@/src/lib/prototype/point-to-object-create";
import { createPointObjectCreateEditorScopeKey, restorePointObjectCreateEditorSnapshot, type PointObjectCreateEditorSnapshot } from "@/src/lib/prototype/point-to-object-create-editor";
import { isPointObjectAreaContextResult, parsePointObjectCreateAoi, parsePointObjectGeneratedConcept, type PointObjectGeneratedConcept } from "@/src/lib/prototype/point-to-object-create-result";
import type { PointObjectFindResult } from "@/src/lib/prototype/point-to-object-find-contract";
import { parsePointObjectFindSessionState, type PointObjectFindSessionState } from "@/src/lib/prototype/point-to-object-find-session";
import { isPointObjectLocale, isPointObjectMarketKey, type PointObjectLocale, type PointObjectMarketKey } from "@/src/lib/prototype/point-to-object-markets";

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
  updatedAt: string;
  viewRevision: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseAnalysePayload(value: unknown, locale: PointObjectLocale, marketKey: PointObjectMarketKey): PointObjectAnalyseProjectPayload | null {
  if (!isRecord(value)) return null;
  const selection = parsePointObjectSelection(value.selection);
  const analysis = parsePointObjectAiResponse(value.analysis);
  return selection && analysis?.mode === "openai" && selection.locationKey === marketKey && analysis.request.locale === locale
    ? { selection, analysis }
    : null;
}

function parseFindPayload(value: unknown, locale: PointObjectLocale, marketKey: PointObjectMarketKey): PointObjectFindProjectPayload | null {
  if (!isRecord(value)) return null;
  const session = parsePointObjectFindSessionState(value.session);
  return session?.result && session.locale === locale && session.marketKey === marketKey
    ? { session: { ...session, result: session.result } }
    : null;
}

function parseCreatePayload(value: unknown, locale: PointObjectLocale, marketKey: PointObjectMarketKey): PointObjectCreateProjectPayload | null {
  if (!isRecord(value) || !isPointObjectLocale(value.generatedLocale) || value.generatedLocale !== locale ||
      (value.activeAlternativeId !== "A" && value.activeAlternativeId !== "B") ||
      !(value.areaContext === null || isPointObjectAreaContextResult(value.areaContext))) return null;
  const aoi = parsePointObjectCreateAoi(value.aoi);
  if (!aoi) return null;
  const generated = parsePointObjectGeneratedConcept(value.generated, aoi);
  if (!generated) return null;
  if (value.areaContext !== null && (value.areaContext.request.marketKey !== marketKey || value.areaContext.request.locale !== locale ||
      JSON.stringify(value.areaContext.request.aoiCoordinates) !== JSON.stringify(aoi.coordinates))) return null;
  const alternativeIds = new Set(generated.alternatives?.map((item) => item.id) ?? [generated.massing.variantId]);
  if (!alternativeIds.has(value.activeAlternativeId)) return null;
  const expectedScopeKey = createPointObjectCreateEditorScopeKey({ aoiId: aoi.id, marketKey });
  const editorSnapshot = value.editorSnapshot === null ? null : restorePointObjectCreateEditorSnapshot(value.editorSnapshot, expectedScopeKey);
  if (value.editorSnapshot !== null && !editorSnapshot) return null;
  return {
    aoi,
    editorSnapshot,
    generated,
    generatedLocale: value.generatedLocale,
    activeAlternativeId: value.activeAlternativeId,
    areaContext: value.areaContext as PointObjectAreaContextResult | null
  };
}

export function parsePointObjectProjectOperationInput(value: unknown): PointObjectProjectOperationInput | null {
  if (!isRecord(value) || (value.kind !== "analyse" && value.kind !== "find" && value.kind !== "create") ||
      !isPointObjectLocale(value.locale) || !isPointObjectMarketKey(value.marketKey) || !validText(value.label, 240)) return null;
  const payload = value.kind === "analyse"
    ? parseAnalysePayload(value.payload, value.locale, value.marketKey)
    : value.kind === "find"
      ? parseFindPayload(value.payload, value.locale, value.marketKey)
      : parseCreatePayload(value.payload, value.locale, value.marketKey);
  return payload ? { kind: value.kind, locale: value.locale, marketKey: value.marketKey, label: value.label.trim(), payload } as PointObjectProjectOperationInput : null;
}

export function parseSavedPointObjectArtifact(value: unknown): SavedPointObjectArtifact | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !validText(value.artifactId, 160) ||
      !validText(value.idempotencyKey, 200) || typeof value.payloadHash !== "string" || !/^[a-f0-9]{64}$/.test(value.payloadHash) ||
      !validTimestamp(value.completedAt) || !(value.updatedAt === undefined || validTimestamp(value.updatedAt)) ||
      !(value.viewRevision === undefined || (Number.isInteger(value.viewRevision) && Number(value.viewRevision) >= 0 && Number(value.viewRevision) <= 100_000))) return null;
  const input = parsePointObjectProjectOperationInput(value);
  if (!input) return null;
  return {
    schemaVersion: 1,
    artifactId: value.artifactId,
    idempotencyKey: value.idempotencyKey,
    payloadHash: value.payloadHash,
    completedAt: value.completedAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.completedAt,
    viewRevision: typeof value.viewRevision === "number" ? value.viewRevision : 0,
    ...input
  };
}

export function parseSavedPointObjectProject(value: unknown, maximumArtifacts: number): SavedPointObjectProject | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !validText(value.projectId, 160) || !validText(value.name, 120) ||
      value.storageMode !== "browser_local_on_this_device" || !validTimestamp(value.createdAt) || !validTimestamp(value.updatedAt) ||
      !Array.isArray(value.artifacts) || value.artifacts.length > maximumArtifacts) return null;
  const artifacts = value.artifacts.map(parseSavedPointObjectArtifact);
  if (artifacts.some((artifact) => artifact === null)) return null;
  return {
    schemaVersion: 1,
    projectId: value.projectId,
    name: value.name,
    storageMode: "browser_local_on_this_device",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    artifacts: artifacts as SavedPointObjectArtifact[]
  };
}

export function parsePointObjectProjectStore(
  value: unknown,
  identityKey: PointObjectProjectIdentity,
  maximumProjects: number,
  maximumArtifacts: number
): PointObjectProjectStore | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.identityKey !== identityKey || !Array.isArray(value.projects) ||
      value.projects.length > maximumProjects || !(value.activeProjectId === null || validText(value.activeProjectId, 160))) return null;
  const projects = value.projects.map((project) => parseSavedPointObjectProject(project, maximumArtifacts));
  if (projects.some((project) => project === null)) return null;
  const parsed = projects as SavedPointObjectProject[];
  if (new Set(parsed.map((project) => project.projectId)).size !== parsed.length) return null;
  const artifacts = parsed.flatMap((project) => project.artifacts);
  if (new Set(artifacts.map((artifact) => artifact.artifactId)).size !== artifacts.length ||
      new Set(artifacts.map((artifact) => artifact.idempotencyKey)).size !== artifacts.length) return null;
  const activeProjectId = parsed.some((project) => project.projectId === value.activeProjectId)
    ? value.activeProjectId as string
    : parsed[0]?.projectId ?? null;
  return { schemaVersion: 1, identityKey, activeProjectId, projects: parsed };
}
