import type { AnalysisScenarioId, SelectedPoint } from "@/src/types/geo";

export type OpenGeoSourceMode = "open_geodata_sample" | "osm_style_fixture" | "fallback_demo";

export type OpenGeoConfidence = "sample" | "low" | "medium" | "high";

export type OpenRoadClass = "motorway" | "trunk" | "primary" | "secondary" | "local" | "service";

export type OpenPoiCategory =
  | "airport"
  | "metro_mobility"
  | "business"
  | "tourism"
  | "retail"
  | "education"
  | "healthcare"
  | "development_anchor";

export type OpenLanduseClass =
  | "residential"
  | "commercial"
  | "mixed_use"
  | "industrial_logistics"
  | "tourism_waterfront"
  | "transport_airport"
  | "open_space";

export type LineGeometry = {
  type: "LineString";
  coordinates: number[][];
};

export type PointGeometry = {
  type: "Point";
  coordinates: number[];
};

export type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

export type OpenRoadFeature = {
  id: string;
  name: string;
  roadClass: OpenRoadClass;
  geometry: LineGeometry;
  sourceMode: OpenGeoSourceMode;
  confidence: OpenGeoConfidence;
  displayPriority: number;
  properties: Record<string, string | number | boolean>;
};

export type OpenPoiFeature = {
  id: string;
  name: string;
  category: OpenPoiCategory;
  subcategory: string;
  coordinates: SelectedPoint;
  scenarioRelevance: AnalysisScenarioId[];
  sourceMode: OpenGeoSourceMode;
  confidence: OpenGeoConfidence;
  properties: Record<string, string | number | boolean>;
};

export type OpenLanduseFeature = {
  id: string;
  name: string;
  landuseClass: OpenLanduseClass;
  geometry: PolygonGeometry;
  sourceMode: OpenGeoSourceMode;
  confidence: OpenGeoConfidence;
  properties: Record<string, string | number | boolean>;
};

export type AccessibilityMetric = {
  areaName: string;
  coordinates: SelectedPoint;
  nearestMajorRoadKm: number;
  nearestAirportKm: number;
  nearestMobilityAnchorKm: number;
  poiCountNearby: number;
  demandAnchorCountNearby: number;
  accessibilityIndex: number;
  mobilityContext: string;
  sourceMode: OpenGeoSourceMode;
  confidence: OpenGeoConfidence;
};

export type OpenGeodataIngestionReport = {
  sourceMode: OpenGeoSourceMode;
  inputFiles: string[];
  featuresRead: number;
  featuresNormalized: {
    roads: number;
    poi: number;
    landuse: number;
    buildings: number;
    accessibilityMetrics: number;
  };
  warnings: string[];
  limitations: string[];
  generatedAt: string;
};

export type OpenGeodataBaseline = {
  sourceMode: OpenGeoSourceMode;
  roads: OpenRoadFeature[];
  poi: OpenPoiFeature[];
  landuse: OpenLanduseFeature[];
  accessibilityMetrics: AccessibilityMetric[];
  ingestionReport: OpenGeodataIngestionReport;
};

