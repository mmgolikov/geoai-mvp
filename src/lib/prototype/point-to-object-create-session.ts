import type { PointObjectAreaContextResult } from "./point-to-object-area-context-contract";
import { createPointObjectCreateEditorScopeKey, restorePointObjectCreateEditorSnapshot, type PointObjectCreateEditorSnapshot } from "./point-to-object-create-editor";
import { isPointObjectAreaContextResult, parsePointObjectCreateAoi, parsePointObjectGeneratedConcept, type PointObjectGeneratedConcept } from "./point-to-object-create-result";
import { validateConceptMassingGeometry, type PointObjectCreateAoi } from "./point-to-object-create";
import { coordinatesMatchPointObjectMarket, isPointObjectLocale, isPointObjectMarketKey, type PointObjectLocale, type PointObjectMarketKey } from "./point-to-object-markets";

export const POINT_OBJECT_CREATE_SESSION_KEY = "geoai:point-to-object:create:v1";
export const POINT_OBJECT_CREATE_SESSION_MAX_BYTES = 768 * 1024;

export type PointObjectCreateSessionState = {
  schemaVersion: 1;
  marketKey: PointObjectMarketKey;
  locale: PointObjectLocale;
  aoi: PointObjectCreateAoi;
  editorSnapshot: PointObjectCreateEditorSnapshot | null;
  generated: PointObjectGeneratedConcept;
  generatedLocale: PointObjectLocale;
  activeAlternativeId: "A" | "B";
  areaContext: PointObjectAreaContextResult | null;
  dashboardOpen: boolean;
  updatedAt: string;
};

type PointObjectCreateSessionInput = Omit<PointObjectCreateSessionState, "schemaVersion" | "updatedAt">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return actual.length === required.length && actual.every((key, index) => key === required[index]);
}

export function parsePointObjectCreateSessionState(value: unknown): PointObjectCreateSessionState | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "marketKey", "locale", "aoi", "editorSnapshot", "generated", "generatedLocale",
    "activeAlternativeId", "areaContext", "dashboardOpen", "updatedAt"
  ]) || value.schemaVersion !== 1 || !isPointObjectMarketKey(value.marketKey) || !isPointObjectLocale(value.locale) ||
      !isPointObjectLocale(value.generatedLocale) || (value.activeAlternativeId !== "A" && value.activeAlternativeId !== "B") ||
      !(value.areaContext === null || isPointObjectAreaContextResult(value.areaContext)) ||
      typeof value.dashboardOpen !== "boolean" || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) return null;
  const marketKey = value.marketKey;
  const aoi = parsePointObjectCreateAoi(value.aoi);
  if (!aoi) return null;
  if (!aoi.coordinates.every((ring) => ring.every(([longitude, latitude]) =>
    coordinatesMatchPointObjectMarket(marketKey, longitude, latitude)))) return null;
  const generated = parsePointObjectGeneratedConcept(value.generated, aoi);
  if (!generated) return null;
  const massings = [generated.massing, ...(generated.alternatives?.map((alternative) => alternative.massing) ?? [])];
  if (massings.some((massing) => validateConceptMassingGeometry(aoi.coordinates, generated.program, massing).length > 0)) return null;
  const alternativeIds = new Set(generated.alternatives?.map((alternative) => alternative.id) ?? [generated.massing.variantId]);
  if (!alternativeIds.has(value.activeAlternativeId)) return null;
  const expectedScopeKey = createPointObjectCreateEditorScopeKey({ aoiId: aoi.id, marketKey });
  const editorSnapshot = value.editorSnapshot === null ? null : restorePointObjectCreateEditorSnapshot(value.editorSnapshot, expectedScopeKey);
  if (value.editorSnapshot !== null && !editorSnapshot) return null;
  if (value.areaContext !== null && (value.areaContext.request.marketKey !== value.marketKey ||
      value.areaContext.request.locale !== value.generatedLocale ||
      JSON.stringify(value.areaContext.request.aoiCoordinates) !== JSON.stringify(aoi.coordinates))) return null;
  return {
    schemaVersion: 1,
    marketKey,
    locale: value.locale,
    aoi,
    editorSnapshot,
    generated,
    generatedLocale: value.generatedLocale,
    activeAlternativeId: value.activeAlternativeId,
    areaContext: value.areaContext as PointObjectAreaContextResult | null,
    dashboardOpen: value.dashboardOpen,
    updatedAt: value.updatedAt
  };
}

export function serializePointObjectCreateSession(state: PointObjectCreateSessionInput): string | null {
  try {
    const parsed = parsePointObjectCreateSessionState({ schemaVersion: 1, ...state, updatedAt: new Date().toISOString() });
    if (!parsed) return null;
    const raw = JSON.stringify(parsed);
    return new TextEncoder().encode(raw).byteLength <= POINT_OBJECT_CREATE_SESSION_MAX_BYTES ? raw : null;
  } catch {
    return null;
  }
}

export function readPointObjectCreateSession(): PointObjectCreateSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(POINT_OBJECT_CREATE_SESSION_KEY);
    if (!raw || new TextEncoder().encode(raw).byteLength > POINT_OBJECT_CREATE_SESSION_MAX_BYTES) return null;
    return parsePointObjectCreateSessionState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writePointObjectCreateSession(state: PointObjectCreateSessionInput): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = serializePointObjectCreateSession(state);
    if (!raw) return false;
    window.sessionStorage.setItem(POINT_OBJECT_CREATE_SESSION_KEY, raw);
    return window.sessionStorage.getItem(POINT_OBJECT_CREATE_SESSION_KEY) === raw;
  } catch {
    return false;
  }
}

/** Clears only the transient guest Create session. Saved project artifacts are not touched. */
export function clearPointObjectCreateSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(POINT_OBJECT_CREATE_SESSION_KEY);
  } catch {
    // Guest persistence is best effort and never changes saved project evidence.
  }
}
