import {
  aoiRequiredCaveat,
  type AoiDataMode,
  type AoiSourceType,
  type AoiValidationStatus,
  type ProjectAoi
} from "@/src/types/aoi";
import {
  calculatePolygonMeasurements,
  closePolygonRing,
  maxAoiVertices,
  validatePolygonVertices
} from "@/src/lib/polygon-aoi";
import type { UserDrawnAoi } from "@/src/types/geo";
import { browserDemoStorageKey, isBrowserDemoStorageEnabled } from "@/src/lib/browser-demo-storage";

export const aoiLibraryStorageKey = browserDemoStorageKey("aoi-library-v1");

type AoiImportResult = {
  ok: true;
  aoi: UserDrawnAoi;
  warning?: string;
} | {
  ok: false;
  message: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "aoi";
}

function isLngLatPair(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length < 2) return false;
  const [lng, lat] = value;
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

function normalizePolygonRing(geometry: GeoJSON.Polygon): [number, number][] | string {
  const rings = geometry.coordinates;
  if (!Array.isArray(rings) || rings.length === 0) {
    return "Only Polygon GeoJSON is supported in v1.8.";
  }

  if (rings.length > 1) {
    return "Polygon holes are not supported yet.";
  }

  const ring = rings[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return "Only Polygon GeoJSON is supported in v1.8.";
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = Array.isArray(first) && Array.isArray(last) && first[0] === last[0] && first[1] === last[1];
  const openVertexCount = isClosed ? ring.length - 1 : ring.length;
  if (openVertexCount > maxAoiVertices) {
    return `AOI exceeds the ${maxAoiVertices}-vertex browser screening limit.`;
  }

  const coordinates: [number, number][] = [];
  for (const coordinate of ring) {
    if (!isLngLatPair(coordinate)) {
      return "Invalid coordinates. Expected [longitude, latitude].";
    }
    coordinates.push([coordinate[0], coordinate[1]]);
  }

  return closePolygonRing(coordinates).slice(0, -1);
}

function extractPolygonFeature(parsed: unknown): { geometry: GeoJSON.Polygon; properties?: GeoJSON.GeoJsonProperties; warning?: string } | string {
  if (typeof parsed !== "object" || parsed === null) {
    return "Invalid GeoJSON file.";
  }

  const geojson = parsed as Partial<GeoJSON.GeoJSON>;
  if (geojson.type === "Feature") {
    const feature = parsed as GeoJSON.Feature;
    if (!feature.geometry) return "Only Polygon GeoJSON is supported in v1.8.";
    if (feature.geometry.type === "MultiPolygon") return "MultiPolygon support is planned.";
    if (feature.geometry.type !== "Polygon") return "Only Polygon GeoJSON is supported in v1.8.";
    return { geometry: feature.geometry, properties: feature.properties };
  }

  if (geojson.type === "FeatureCollection") {
    const collection = parsed as GeoJSON.FeatureCollection;
    const polygonFeatures = collection.features.filter((feature) => feature.geometry?.type === "Polygon");
    if (collection.features.some((feature) => feature.geometry?.type === "MultiPolygon")) {
      return "MultiPolygon support is planned.";
    }
    if (polygonFeatures.length === 0) return "Only Polygon GeoJSON is supported in v1.8.";
    if (polygonFeatures.length > 1) {
      return {
        geometry: polygonFeatures[0].geometry as GeoJSON.Polygon,
        properties: polygonFeatures[0].properties,
        warning: "Multiple polygons detected. Imported the first polygon only. MultiPolygon / multiple AOI import is planned."
      };
    }
    return { geometry: polygonFeatures[0].geometry as GeoJSON.Polygon, properties: polygonFeatures[0].properties };
  }

  if (geojson.type === "MultiPolygon") return "MultiPolygon support is planned.";
  if (geojson.type === "Polygon") return { geometry: parsed as GeoJSON.Polygon };

  return "Only Polygon GeoJSON is supported in v1.8.";
}

export function sourceTypeLabel(sourceType: AoiSourceType) {
  if (sourceType === "uploaded_geojson") return "Uploaded GeoJSON";
  if (sourceType === "demo_object") return "Sample geometry";
  if (sourceType === "imported_sample") return "Imported sample";
  return "Drawn AOI";
}

export function validationStatusLabel(status: AoiValidationStatus) {
  if (status === "official_validation_planned") return "Official validation planned";
  if (status === "user_provided_unvalidated") return "User-provided geometry";
  return "Validation required";
}

export function userDrawnAoiSourceLabel(aoi: UserDrawnAoi) {
  return aoi.sourceType === "uploaded_geojson" ? "Uploaded GeoJSON AOI" : "User-drawn AOI";
}

export function userDrawnAoiSourceCode(aoi: UserDrawnAoi) {
  return aoi.sourceType === "uploaded_geojson" ? "uploaded_geojson_polygon" : "user_drawn_polygon";
}

export function safeAoiFilename(name: string) {
  return `geoai-aoi-${slugify(name)}.geojson`;
}

export function projectAoiToUserDrawnAoi(aoi: ProjectAoi): UserDrawnAoi {
  return {
    id: aoi.id,
    name: aoi.name,
    geometryType: "Polygon",
    geometry: aoi.geometry,
    coordinates: closePolygonRing(aoi.geometry.coordinates[0] as [number, number][]),
    centroid: aoi.centroid,
    bbox: aoi.bbox,
    measurements: aoi.measurements,
    source: aoi.sourceType === "uploaded_geojson" ? "uploaded_geojson_polygon" : "user_drawn_polygon",
    dataMode: aoi.dataMode,
    confidence: "validation_required",
    projectId: aoi.projectKey,
    limitations: [
      `${sourceTypeLabel(aoi.sourceType)}; validation required.`,
      aoi.caveat
    ],
    savedAoiId: aoi.id,
    sourceType: aoi.sourceType,
    validationStatus: aoi.validationStatus
  };
}

export function userDrawnAoiToProjectAoi(
  aoi: UserDrawnAoi,
  input: {
    projectId?: string | null;
    projectKey: string;
    name?: string;
    sourceType?: AoiSourceType;
    dataMode?: AoiDataMode;
  }
): ProjectAoi {
  const now = new Date().toISOString();
  const sourceType = input.sourceType ?? aoi.sourceType ?? (aoi.source === "uploaded_geojson_polygon" ? "uploaded_geojson" : "user_drawn");
  const dataMode = input.dataMode ?? aoi.dataMode ?? (sourceType === "uploaded_geojson" ? "uploaded" : "user_provided");

  return {
    id: aoi.savedAoiId ?? aoi.id,
    projectId: input.projectId ?? null,
    projectKey: input.projectKey,
    name: input.name?.trim() || aoi.name,
    geometryType: "Polygon",
    geometry: aoi.geometry,
    centroid: aoi.centroid,
    bbox: aoi.bbox,
    measurements: aoi.measurements,
    sourceType,
    dataMode,
    validationStatus: aoi.validationStatus ?? "validation_required",
    createdAt: now,
    updatedAt: now,
    analysisCount: 0,
    reportCount: 0,
    caveat: aoiRequiredCaveat
  };
}

export function createAoiGeojsonFeature(aoi: ProjectAoi | UserDrawnAoi): GeoJSON.Feature<GeoJSON.Polygon> {
  const sourceType = "sourceType" in aoi && aoi.sourceType
    ? aoi.sourceType
    : aoi.source === "uploaded_geojson_polygon"
      ? "uploaded_geojson"
      : "user_drawn";
  const dataMode = "dataMode" in aoi ? aoi.dataMode : sourceType === "uploaded_geojson" ? "uploaded" : "user_provided";
  const validationStatus = "validationStatus" in aoi && aoi.validationStatus ? aoi.validationStatus : "validation_required";
  const projectId = "projectKey" in aoi ? aoi.projectKey : aoi.projectId ?? null;
  const createdAt = "createdAt" in aoi ? aoi.createdAt : new Date().toISOString();

  return {
    type: "Feature",
    properties: {
      id: aoi.id,
      projectId,
      name: aoi.name,
      sourceType,
      dataMode,
      validationStatus,
      areaSqM: aoi.measurements.areaSqM,
      areaSqKm: aoi.measurements.areaSqKm,
      perimeterM: aoi.measurements.perimeterM,
      perimeterKm: aoi.measurements.perimeterKm,
      centroid: aoi.centroid,
      createdAt,
      caveat: aoiRequiredCaveat
    },
    geometry: aoi.geometry
  };
}

export function parseGeojsonAoi(text: string, input: { projectKey: string; projectId?: string | null; fileName: string }): AoiImportResult {
  if (new TextEncoder().encode(text).byteLength > 5 * 1024 * 1024) {
    return { ok: false, message: "GeoJSON file exceeds the 5 MB AOI import limit." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "Invalid GeoJSON file." };
  }

  const extracted = extractPolygonFeature(parsed);
  if (typeof extracted === "string") return { ok: false, message: extracted };

  const normalizedRing = normalizePolygonRing(extracted.geometry);
  if (typeof normalizedRing === "string") return { ok: false, message: normalizedRing };

  const validation = validatePolygonVertices(normalizedRing);
  if (!validation.valid || !validation.measurements) {
    return { ok: false, message: validation.message };
  }

  const nameFromProperties = typeof extracted.properties?.name === "string"
    ? extracted.properties.name
    : typeof extracted.properties?.title === "string"
      ? extracted.properties.title
      : null;
  const name = nameFromProperties || input.fileName.replace(/\.[^.]+$/, "") || "Uploaded GeoJSON AOI";
  const ring = closePolygonRing(normalizedRing);
  const aoi: UserDrawnAoi = {
    id: `uploaded-aoi-${Date.now()}`,
    name,
    geometryType: "Polygon",
    geometry: { type: "Polygon", coordinates: [ring] },
    coordinates: ring,
    centroid: validation.measurements.centroid,
    bbox: validation.measurements.bbox,
    measurements: validation.measurements,
    source: "uploaded_geojson_polygon",
    dataMode: "uploaded",
    confidence: "validation_required",
    projectId: input.projectKey,
    limitations: [
      "Uploaded GeoJSON AOI; validation required.",
      aoiRequiredCaveat
    ],
    sourceType: "uploaded_geojson",
    validationStatus: "validation_required"
  };

  return { ok: true, aoi, warning: extracted.warning };
}

export function readBrowserAois(): ProjectAoi[] {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return [];
  try {
    const raw = window.localStorage.getItem(aoiLibraryStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ProjectAoi[] => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<ProjectAoi>;
      if (typeof candidate.id !== "string" || typeof candidate.projectKey !== "string" ||
          typeof candidate.name !== "string" || candidate.geometry?.type !== "Polygon") return [];
      const normalized = normalizePolygonRing(candidate.geometry);
      if (typeof normalized === "string") return [];
      const validation = validatePolygonVertices(normalized);
      if (!validation.valid || !validation.measurements) return [];
      const ring = closePolygonRing(normalized);
      return [{
        ...candidate,
        geometry: { type: "Polygon", coordinates: [ring] },
        centroid: validation.measurements.centroid,
        bbox: validation.measurements.bbox,
        measurements: validation.measurements
      } as ProjectAoi];
    });
  } catch {
    return [];
  }
}

export function writeBrowserAois(items: ProjectAoi[]) {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return false;
  const perProject = new Map<string, ProjectAoi[]>();
  for (const item of items) {
    const scoped = perProject.get(item.projectKey) ?? [];
    if (scoped.length < 40) scoped.push(item);
    perProject.set(item.projectKey, scoped);
  }
  try {
    window.localStorage.setItem(aoiLibraryStorageKey, JSON.stringify(Array.from(perProject.values()).flat()));
    return true;
  } catch {
    // Keep the validated AOI available in React state when browser storage is
    // unavailable or over quota; persistence failure must not crash the UI.
    return false;
  }
}
