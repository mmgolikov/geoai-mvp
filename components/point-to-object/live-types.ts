import type { GeoJsonGeometry } from "@/src/lib/point-to-object/contracts";

export type LiveMapLocationKey = "dubai" | "singapore";
export type LiveMapMarket = LiveMapLocationKey;
export type LiveMapBasemapId = "street" | "light" | "contrast";

export type Wgs84Position = [longitude: number, latitude: number];

export type LiveMapNearbyLabel = {
  name: string;
  featureClass: string;
  coordinates: Wgs84Position | null;
};

export type LiveResolvedObjectContext = {
  name: string | null;
  address: string | null;
  featureClass: string;
  sourceFeatureId: string;
  geometryType: "Point" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon" | null;
  coordinateAssociation:
    | "open_map_geometry_contains_point"
    | "reverse_nearest_indexed_object_not_point_in_polygon";
  resultCentroidDistanceM: number;
  addressParts: Record<string, string>;
  tags: Record<string, string>;
};

export type LiveMapSelection = {
  locationKey: LiveMapLocationKey;
  longitude: number;
  latitude: number;
  clickedAt: string;
  object: {
    name: string | null;
    featureClass: string;
    sourceFeatureId: string | null;
    geometry: GeoJsonGeometry | null;
    renderHeightM: number | null;
    renderMinHeightM: number | null;
  };
  resolvedObject: LiveResolvedObjectContext | null;
  viewport: {
    center: Wgs84Position;
    zoom: number;
    pitch: number;
    bearing: number;
    viewMode: "2d" | "3d";
    basemapId: LiveMapBasemapId;
  };
  provider: "OpenFreeMap / OpenStreetMap";
  nearbyLabels: LiveMapNearbyLabel[];
};

export type LiveObjectSelection = LiveMapSelection;

export type GroundedClaim = {
  statement: string;
  evidenceRefs: string[];
};

export type PointObjectAiContent = {
  appearsToBe: string;
  confirmedFacts: GroundedClaim[];
  aiInferences: Array<GroundedClaim & { confidence: "low" | "medium" }>;
  locationContext: GroundedClaim[];
  decisionObservations: Array<GroundedClaim & { validationRequired: boolean }>;
  missingInformation: string[];
  answerToQuestion: GroundedClaim | null;
  caveat: string;
};

export type PointObjectAiSubject = {
  name: string | null;
  address: string | null;
  featureClass: string;
  sourceFeatureId: string;
  resolutionMethod: "nominatim_reverse";
  coordinateAssociation:
    | "open_map_geometry_contains_point"
    | "reverse_nearest_indexed_object_not_point_in_polygon";
  sourceLabel: string;
  geometryType: LiveResolvedObjectContext["geometryType"];
  resultCentroidDistanceM: number;
  addressParts: Record<string, string>;
  tags: Record<string, string>;
};

export type PointObjectLiveContextResponse =
  | {
      mode: "resolved";
      subject: LiveResolvedObjectContext;
    }
  | {
      mode: "unavailable";
      error?: string;
      retryable?: boolean;
    };

export type PointObjectAiResponse =
  | {
      mode: "openai";
      generatedAt: string;
      evidencePackId: string;
      evidencePackHash: string;
      content: PointObjectAiContent;
      subject: PointObjectAiSubject;
      telemetry?: {
        model: string;
        requestId: string | null;
        latencyMs: number;
        inputTokens: number | null;
        outputTokens: number | null;
        estimatedCostUsd: number | null;
        stored: false;
        toolCalls: 0;
      };
    }
  | {
      mode: "unavailable";
      code?: string;
      error?: string;
      retryable?: boolean;
    };
