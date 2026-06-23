import type { PolygonMeasurements, SelectedPoint } from "@/src/types/geo";

export const aoiRequiredCaveat =
  "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type AoiSourceType = "user_drawn" | "uploaded_geojson" | "demo_object" | "imported_sample";
export type AoiDataMode = "user_provided" | "uploaded" | "demo";
export type AoiValidationStatus =
  | "validation_required"
  | "user_provided_unvalidated"
  | "official_validation_planned";

export type ProjectAoi = {
  id: string;
  projectId?: string | null;
  projectKey: string;
  name: string;
  description?: string;
  geometryType: "Polygon";
  geometry: GeoJSON.Polygon;
  centroid: SelectedPoint;
  bbox: [number, number, number, number];
  measurements: PolygonMeasurements;
  sourceType: AoiSourceType;
  dataMode: AoiDataMode;
  validationStatus: AoiValidationStatus;
  createdAt: string;
  updatedAt: string;
  lastAnalyzedAt?: string;
  analysisCount?: number;
  reportCount?: number;
  tags?: string[];
  caveat: string;
};

export type AoiRepositoryMode = "local-fallback" | "browser-local";
