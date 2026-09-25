"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson";
import type { ExpressionSpecification, FilterSpecification, FitBoundsOptions, GeoJSONSource, Map as MapLibreMap, MapEventType, MapGeoJSONFeature, MapMouseEvent, MapSourceDataEvent } from "maplibre-gl";

import type {
  LiveMapBasemapId,
  LiveMapLocationKey,
  LiveMapNearbyLabel,
  LiveMapSelection,
  Wgs84Position
} from "@/components/point-to-object/live-types";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import type { GeoJsonGeometry } from "@/src/lib/point-to-object/contracts";
import type { ConceptMassingResult, PointObjectCreateAoi } from "@/src/lib/prototype/point-to-object-create";
import { buildConceptEnvironment } from "@/src/lib/prototype/point-to-object-create-environment";
import { ensureConceptEnvironmentLayers, setConceptEnvironmentVisibility, updateConceptEnvironment } from "@/src/lib/prototype/point-to-object-create-environment-renderer";
import { conceptMaterialColor, conceptSurfacePattern, installConceptSurfaceImages } from "@/src/lib/prototype/point-to-object-create-appearance";
import type { PointObjectFindBounds, PointObjectFindCandidate } from "@/src/lib/prototype/point-to-object-find-contract";
import { separateMapMarkerControls } from "@/src/lib/prototype/point-to-object-selection-context";
import { projectResultCoordinateBounds, isCompletedNavigationCamera, type NavigationCamera } from "@/src/lib/prototype/point-to-object-find-viewport";
import {
  buildPointObjectNativeSelectionOutside,
  pointObjectNativeBuilding3dFilter,
  pointObjectReplacementMinimumReliableZoom,
  restorePointObjectMapFilter,
  setPointObjectLayerVisibilityIfChanged,
  snapshotPointObjectMapFilter,
  validatePointObjectReplacementAoi,
  type PointObjectMapFilterSnapshot
} from "@/src/lib/prototype/point-to-object-map-replacement";
import { pointObjectMarket } from "@/src/lib/prototype/point-to-object-markets";
import { clearPointObjectPartitionRenderer, reconcilePointObjectCompleteFootprintRenderer } from "@/src/lib/prototype/point-to-object-map-partition-renderer";
import { pointObjectCompleteFootprintOverlap } from "@/src/lib/prototype/point-to-object-map-partition";
import { pointObjectFindPresentationState, pointObjectFindVerifiedFootprint, pointObjectTilePolygonMemberAt } from "@/src/lib/prototype/point-to-object-map-selection";
import { createPointObjectMapResultOpenGuard, groupExactPointObjectProjectResults } from "@/src/lib/prototype/point-to-object-map-project-groups";

const BASEMAPS: Array<{ id: LiveMapBasemapId; labelKey: "map.style.street" | "map.style.light" | "map.style.contrast"; styleUrl: string }> = [
  { id: "street", labelKey: "map.style.street", styleUrl: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "light", labelKey: "map.style.light", styleUrl: "https://tiles.openfreemap.org/styles/positron" },
  { id: "contrast", labelKey: "map.style.contrast", styleUrl: "https://tiles.openfreemap.org/styles/bright" }
];
export type LiveMapViewMode = "2d" | "3d";
export type LiveMapInteractionMode = "analyse" | "find" | "create";
export type PointObjectReplacementStatus = "idle" | "applied" | "partial" | "zoom-required" | "error";
type MapViewMode = LiveMapViewMode;
const CAMERA: Record<MapViewMode, { pitch: number; bearing: number }> = {
  "2d": { pitch: 0, bearing: 0 },
  "3d": { pitch: 55, bearing: -25 }
};
const BUILDINGS_3D_LAYER_ID = "geoai-buildings-3d";
const HIGHLIGHT_SOURCE_ID = "geoai-live-selection";
const HIGHLIGHT_FILL_LAYER_ID = "geoai-live-selection-fill";
const HIGHLIGHT_NATIVE_FILL_LAYER_ID = "geoai-live-native-selection-fill";
const HIGHLIGHT_LINE_LAYER_ID = "geoai-live-selection-line";
const HIGHLIGHT_POINT_LAYER_ID = "geoai-live-selection-point";
const CREATE_AOI_SOURCE_ID = "geoai-create-aoi";
const CREATE_AOI_FILL_LAYER_ID = "geoai-create-aoi-fill";
const CREATE_AOI_LINE_LAYER_ID = "geoai-create-aoi-line";
const CREATE_AOI_VERTEX_LAYER_ID = "geoai-create-aoi-vertices";
const CONCEPT_SOURCE_ID = "geoai-concept-massing";
const CONCEPT_FILL_LAYER_ID = "geoai-concept-fill";
const CONCEPT_VOLUME_LAYER_ID = "geoai-concept-volume";
const FIND_FOOTPRINT_SOURCE_ID = "geoai-find-footprints";
const FIND_FOOTPRINT_FILL_LAYER_ID = "geoai-find-footprints-fill";
const FIND_FOOTPRINT_LINE_LAYER_ID = "geoai-find-footprints-line";
const FIND_FOOTPRINT_VOLUME_LAYER_ID = "geoai-find-footprints-volume";
const PARTITION_SOURCE_PREFIX = "geoai-existing-partition-source:";
const MAX_GEOMETRY_POSITIONS = 5_000;
const MAX_NEARBY_LABELS = 5;
const EMPTY_CREATE_COORDINATES: Wgs84Position[] = [];
const EMPTY_FIND_RESULTS: LiveMapFindResult[] = [];
const EMPTY_FIND_RESULT_IDS: string[] = [];
const EMPTY_PROJECT_RESULTS: LiveMapProjectResult[] = [];
const BUILDING_FILTER_SNAPSHOTS = new WeakMap<MapLibreMap, Map<string, PointObjectMapFilterSnapshot>>();

const SELECTABLE_SOURCE_LAYERS = new Set([
  "building",
  "poi",
  "park",
  "landuse",
  "landcover",
  "water",
  "water_name",
  "transportation",
  "aeroway"
]);
const NON_OBJECT_POLYGON_SOURCE_LAYERS = new Set([
  "landcover",
  "water",
  "water_name",
  "transportation",
  "aeroway"
]);
const SELECTABLE_LANDUSE_CLASSES = new Set([
  "residential",
  "commercial",
  "industrial",
  "retail",
  "construction",
  "brownfield",
  "farmland",
  "farmyard",
  "forest",
  "recreation_ground",
  "allotments",
  "cemetery"
]);

const NAME_PROPERTY_KEYS = ["name", "name_en", "name:en", "name_int", "ref"] as const;
const CLASS_PROPERTY_KEYS = ["class", "subclass", "type"] as const;

export type LiveObjectMapProps = {
  locationKey?: LiveMapLocationKey;
  selection?: LiveMapSelection | null;
  className?: string;
  overlayBottomInset?: number;
  onSelection: (selection: LiveMapSelection | null) => void;
  onViewportChange?: (selection: LiveMapSelection) => void;
  onVisibleBoundsChange?: (bounds: PointObjectFindBounds, navigationRequestId?: string) => void;
  onCameraMovingChange?: (moving: boolean) => void;
  findResults?: LiveMapFindResult[];
  activeFindResultId?: string | null;
  hoveredFindResultId?: string | null;
  shortlistedFindResultIds?: string[];
  onFindResultSelect?: (id: string) => void;
  onFindResultHover?: (id: string | null) => void;
  projectMarkers?: LiveMapProjectResult[];
  activeProjectMarkerId?: string | null;
  onProjectMarkerSelect?: (id: string) => boolean | void | Promise<boolean | void>;
  navigationTarget?: LiveMapNavigationTarget | null;
  viewModeRequest?: { requestId: string; mode: LiveMapViewMode } | null;
  interactionMode?: LiveMapInteractionMode;
  createDrawing?: boolean;
  createDraftCoordinates?: Wgs84Position[];
  createAoi?: PointObjectCreateAoi | null;
  createAoiFitRequest?: LiveMapCreateAoiFitRequest | null;
  createAreaCleared?: boolean;
  createReplacementRevision?: number;
  conceptMassing?: ConceptMassingResult | null;
  onCreateVertex?: (coordinate: Wgs84Position) => void;
  onCreateFinishDrawing?: () => void;
  onReplacementStatus?: (status: PointObjectReplacementStatus) => void;
};

export type LiveMapFindResult = {
  id: string;
  longitude: number;
  latitude: number;
  label: string;
  number: number;
  geometry?: Polygon | MultiPolygon | null;
  geometryProvenance?: "confirmed_complete_footprint" | null;
  renderHeightM?: number | null;
  renderMinHeightM?: number | null;
  resultKind?: "mapped_building_or_landuse" | "mapped_poi" | "unknown";
};

export type LiveMapProjectResult = Omit<LiveMapFindResult, "number"> & {
  kind: "analyse" | "find" | "create";
  number?: number;
};

type ResultMarkerButton = {
  button: HTMLButtonElement;
  isProjectOverview: boolean;
  primaryResultId: string;
  resultIds: string[];
};

type RenderedResultMarker = ResultMarkerButton & {
  marker: import("maplibre-gl").Marker;
};

type ResultMarkerPresentation = {
  activeFindResultId: string | null;
  activeProjectMarkerId: string | null;
  hoveredFindResultId: string | null;
  projectResultOpening: boolean;
  shortlistedFindResultIds: Set<string>;
};

const RESULT_MARKER_BASE_CLASS = "flex h-11 min-w-11 items-center justify-center rounded-full border-[3px] border-white px-2 text-sm font-bold shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f8c]";
const RESULT_MARKER_BACKGROUND_CLASSES = ["bg-[#087f8c]", "bg-[#e5fafa]", "bg-[#f4fbfb]", "text-white", "text-[#087f8c]", "text-[#344054]"] as const;

function applyResultMarkerPresentation(marker: ResultMarkerButton, presentation: ResultMarkerPresentation) {
  const activeId = marker.isProjectOverview ? presentation.activeProjectMarkerId : presentation.activeFindResultId;
  const active = activeId !== null && marker.resultIds.includes(activeId);
  const hovered = !marker.isProjectOverview && marker.primaryResultId === presentation.hoveredFindResultId;
  const shortlisted = !marker.isProjectOverview && presentation.shortlistedFindResultIds.has(marker.primaryResultId);
  marker.button.dataset.active = String(active);
  marker.button.setAttribute("aria-pressed", String(active));
  marker.button.disabled = marker.isProjectOverview && presentation.projectResultOpening;
  if (marker.isProjectOverview) {
    marker.button.setAttribute("aria-busy", String(presentation.projectResultOpening));
  } else {
    marker.button.dataset.hovered = String(hovered);
    marker.button.dataset.shortlisted = String(shortlisted);
  }
  marker.button.classList.remove(...RESULT_MARKER_BACKGROUND_CLASSES);
  marker.button.classList.add(active ? "bg-[#087f8c]" : hovered || shortlisted ? "bg-[#e5fafa]" : "bg-[#f4fbfb]", active ? "text-white" : hovered || shortlisted ? "text-[#344054]" : "text-[#087f8c]");
  marker.button.classList.toggle("ring-2", active || shortlisted);
  marker.button.classList.toggle("ring-[#087f8c]", active || shortlisted);
  marker.button.style.zIndex = active ? "2" : "1";
}

export type LiveMapCreateAoiFitRequest = {
  requestId: string;
  bounds: [[number, number], [number, number]];
};

export type LiveMapNavigationTarget = {
  requestId: string;
  longitude: number;
  latitude: number;
  zoom?: number;
  boundingBox?: [south: number, north: number, west: number, east: number] | null;
  expectedSourceFeatureId?: `${"node" | "way" | "relation"}/${string}`;
  expectedLabel?: string | null;
  expectedFeatureClass?: string | null;
  exactFindCandidate?: PointObjectFindCandidate;
  resolvedFindContext?: LiveMapSelection["resolvedObject"];
  selectAfterNavigation?: boolean;
  viewMode?: LiveMapViewMode;
};

function safeText(value: unknown, maxLength = 160): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function firstSafeProperty(
  properties: MapGeoJSONFeature["properties"],
  keys: readonly string[],
  maxLength: number
): string | null {
  if (!properties) return null;
  for (const key of keys) {
    const value = safeText(properties[key], maxLength);
    if (value) return value;
  }
  return null;
}

function safeNumericProperty(
  properties: MapGeoJSONFeature["properties"],
  keys: readonly string[],
  maximum = 1_500
): number | null {
  if (!properties) return null;
  for (const key of keys) {
    const raw = properties[key];
    const parsed = typeof raw === "number"
      ? raw
      : typeof raw === "string" && /^\d{1,4}(?:\.\d{1,3})?$/.test(raw.trim())
        ? Number(raw)
        : Number.NaN;
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum) return parsed;
  }
  return null;
}

function basemapById(id: LiveMapBasemapId) {
  return BASEMAPS.find((item) => item.id === id) ?? BASEMAPS[0];
}

function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
}

function safeFeatureId(feature: Pick<MapGeoJSONFeature, "id" | "properties">): string | null {
  if (typeof feature.id === "number" && Number.isFinite(feature.id)) return String(feature.id);
  if (typeof feature.id === "string" && /^[a-zA-Z0-9_:./-]{1,128}$/.test(feature.id)) return feature.id;

  const propertyId = feature.properties?.osm_id ?? feature.properties?.id;
  if (typeof propertyId === "number" && Number.isFinite(propertyId)) return String(propertyId);
  if (typeof propertyId === "string" && /^[a-zA-Z0-9_:./-]{1,128}$/.test(propertyId)) return propertyId;
  return null;
}

function sanitizePosition(position: Position, budget: { remaining: number }): Position | null {
  if (budget.remaining <= 0 || position.length < 2) return null;
  const longitude = position[0];
  const latitude = position[1];
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }
  budget.remaining -= 1;
  return [longitude, latitude];
}

function sanitizeLine(coordinates: Position[], budget: { remaining: number }): Position[] | null {
  const result: Position[] = [];
  for (const position of coordinates) {
    const safePosition = sanitizePosition(position, budget);
    if (!safePosition) return null;
    result.push(safePosition);
  }
  return result;
}

function sanitizePolygon(coordinates: Position[][], budget: { remaining: number }): Position[][] | null {
  const result: Position[][] = [];
  for (const ring of coordinates) {
    const safeRing = sanitizeLine(ring, budget);
    if (!safeRing) return null;
    result.push(safeRing);
  }
  return result;
}

function sanitizeGeometry(geometry: Geometry): GeoJsonGeometry | null {
  const budget = { remaining: MAX_GEOMETRY_POSITIONS };
  if (geometry.type === "Point") {
    const coordinates = sanitizePosition(geometry.coordinates, budget);
    return coordinates ? { type: "Point", coordinates: coordinates as Wgs84Position } : null;
  }
  if (geometry.type === "LineString") {
    const coordinates = sanitizeLine(geometry.coordinates, budget);
    if (!coordinates) return null;
    return { type: "LineString", coordinates: coordinates as Wgs84Position[] };
  }
  if (geometry.type === "Polygon") {
    const coordinates = sanitizePolygon(geometry.coordinates, budget);
    if (!coordinates) return null;
    return { type: "Polygon", coordinates: coordinates as Wgs84Position[][] };
  }
  if (geometry.type === "MultiPolygon") {
    const coordinates: Position[][][] = [];
    for (const polygon of geometry.coordinates) {
      const safePolygon = sanitizePolygon(polygon, budget);
      if (!safePolygon) return null;
      coordinates.push(safePolygon);
    }
    return { type: "MultiPolygon", coordinates: coordinates as Wgs84Position[][][] };
  }
  if (geometry.type === "MultiPoint") {
    const coordinates = sanitizePosition(geometry.coordinates[0] ?? [], budget);
    return coordinates ? { type: "Point", coordinates: coordinates as Wgs84Position } : null;
  }
  if (geometry.type === "MultiLineString") {
    const coordinates = sanitizeLine(geometry.coordinates[0] ?? [], budget);
    return coordinates ? { type: "LineString", coordinates: coordinates as Wgs84Position[] } : null;
  }
  return null;
}

function confirmedFindFootprint(result: LiveMapFindResult): Polygon | MultiPolygon | null {
  if (!result.geometry) return null;
  const geometry = sanitizeGeometry(result.geometry);
  return pointObjectFindVerifiedFootprint(
    geometry?.type === "Polygon" || geometry?.type === "MultiPolygon" ? geometry as Polygon | MultiPolygon : null,
    result.geometryProvenance ?? null,
    result.resultKind
  );
}

function reliableFindHeight(result: LiveMapFindResult): { height: number; base: number } | null {
  const height = result.renderHeightM;
  const base = result.renderMinHeightM ?? 0;
  return typeof height === "number" && Number.isFinite(height) && height > 0 && height <= 1_500 &&
    typeof base === "number" && Number.isFinite(base) && base >= 0 && base < height
    ? { height, base }
    : null;
}

function findFootprintData(
  results: readonly LiveMapFindResult[],
  activeId: string | null,
  hoveredId: string | null,
  shortlistIds: ReadonlySet<string>
): FeatureCollection<Polygon | MultiPolygon> {
  return {
    type: "FeatureCollection",
    features: results.flatMap((result) => {
      const geometry = confirmedFindFootprint(result);
      if (!geometry) return [];
      const height = reliableFindHeight(result);
      const presentationState = pointObjectFindPresentationState(result.id, activeId, hoveredId, shortlistIds);
      return [{
        type: "Feature" as const,
        id: result.id,
        properties: {
          resultId: result.id,
          number: result.number,
          label: result.label,
          presentationState,
          active: presentationState === "active",
          hovered: presentationState === "hover",
          shortlisted: presentationState === "shortlist",
          reliableHeight: Boolean(height),
          renderHeightM: height?.height ?? 0,
          renderMinHeightM: height?.base ?? 0
        },
        geometry
      }];
    })
  };
}

function setFindFootprintLayers(
  map: MapLibreMap,
  results: readonly LiveMapFindResult[],
  activeId: string | null,
  hoveredId: string | null,
  shortlistIds: ReadonlySet<string>,
  interactionMode: LiveMapInteractionMode,
  viewMode: MapViewMode
) {
  (map.getSource(FIND_FOOTPRINT_SOURCE_ID) as GeoJSONSource | undefined)?.setData(findFootprintData(results, activeId, hoveredId, shortlistIds));
  const visible = interactionMode === "find";
  if (map.getLayer(FIND_FOOTPRINT_FILL_LAYER_ID)) map.setLayoutProperty(FIND_FOOTPRINT_FILL_LAYER_ID, "visibility", visible ? "visible" : "none");
  if (map.getLayer(FIND_FOOTPRINT_LINE_LAYER_ID)) map.setLayoutProperty(FIND_FOOTPRINT_LINE_LAYER_ID, "visibility", visible ? "visible" : "none");
  if (map.getLayer(FIND_FOOTPRINT_VOLUME_LAYER_ID)) map.setLayoutProperty(FIND_FOOTPRINT_VOLUME_LAYER_ID, "visibility", visible && viewMode === "3d" ? "visible" : "none");
}

function liveFindResultBounds(results: readonly LiveMapFindResult[]): [number, number, number, number] | null {
  const positions: Position[] = [];
  for (const result of results) {
    const geometry = confirmedFindFootprint(result);
    if (geometry) {
      const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
      for (const polygon of polygons) for (const ring of polygon) positions.push(...ring);
    } else if (Number.isFinite(result.longitude) && Number.isFinite(result.latitude)) {
      positions.push([result.longitude, result.latitude]);
    }
  }
  if (!positions.length) return null;
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  const bounds: [number, number, number, number] = [
    Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)
  ];
  return bounds.every(Number.isFinite) && bounds[2] - bounds[0] <= 30 && bounds[3] - bounds[1] <= 30 ? bounds : null;
}

function sourceLayerOf(feature: MapGeoJSONFeature): string | null {
  const value = safeText(feature.sourceLayer, 80);
  return value && SELECTABLE_SOURCE_LAYERS.has(value) ? value : null;
}

function featureName(feature: Pick<MapGeoJSONFeature, "properties">): string | null {
  return firstSafeProperty(feature.properties, NAME_PROPERTY_KEYS, 160);
}

function featureClass(feature: MapGeoJSONFeature): string {
  const sourceLayer = sourceLayerOf(feature);
  return firstSafeProperty(feature.properties, CLASS_PROPERTY_KEYS, 80) ?? sourceLayer ?? "location";
}

function featureGeometryBounds(feature: Pick<MapGeoJSONFeature, "geometry">): [number, number, number, number] | null {
  const geometry = sanitizeGeometry(feature.geometry);
  if (!geometry || geometry.type === "Point") return null;
  const positions = geometry.type === "LineString"
    ? geometry.coordinates
    : geometry.type === "Polygon"
      ? geometry.coordinates.flat()
      : geometry.coordinates.flat(2);
  if (!positions.length) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [longitude, latitude] of positions) {
    west = Math.min(west, longitude);
    south = Math.min(south, latitude);
    east = Math.max(east, longitude);
    north = Math.max(north, latitude);
  }
  return Number.isFinite(west) ? [west, south, east, north] : null;
}

function featureScore(
  feature: MapGeoJSONFeature,
  zoom: number,
  viewportBounds: [west: number, south: number, east: number, north: number],
  geometry: Geometry = feature.geometry
): number {
  if (feature.source === HIGHLIGHT_SOURCE_ID) return -1;
  const sourceLayer = sourceLayerOf(feature);
  if (!sourceLayer) return -1;

  const isBuilding = sourceLayer === "building" || feature.layer?.id.toLowerCase().includes("building");
  const isPolygon = geometry.type === "Polygon" || geometry.type === "MultiPolygon";
  const name = featureName(feature);
  if (isPolygon) {
    const bounds = featureGeometryBounds({ geometry });
    if (!bounds) return -1;
    if (NON_OBJECT_POLYGON_SOURCE_LAYERS.has(sourceLayer)) return -1;
    const featureClassName = firstSafeProperty(feature.properties, CLASS_PROPERTY_KEYS, 80)?.toLowerCase() ?? null;
    if (sourceLayer === "landuse" && (!featureClassName || !SELECTABLE_LANDUSE_CLASSES.has(featureClassName))) return -1;
    const viewportWidth = Math.max(1e-9, viewportBounds[2] - viewportBounds[0]);
    const viewportHeight = Math.max(1e-9, viewportBounds[3] - viewportBounds[1]);
    // A real building can fill the viewport at close zoom. Keep the relative
    // guard for background/land-use polygons; buildings have metric limits below.
    if (!isBuilding && ((bounds[2] - bounds[0]) / viewportWidth >= 0.8 || (bounds[3] - bounds[1]) / viewportHeight >= 0.8)) return -1;
    const latitude = (bounds[1] + bounds[3]) / 2;
    const widthM = (bounds[2] - bounds[0]) * 111_320 * Math.max(0.01, Math.cos(latitude * Math.PI / 180));
    const heightM = (bounds[3] - bounds[1]) * 110_574;
    // Rendered tile layers can include generalized block/background polygons.
    // Reject implausibly large "buildings" before the scoring preference can
    // make one consume an entire viewport as a selected object.
    if (isBuilding && (widthM > 750 || heightM > 750 || widthM * heightM > 250_000)) return -1;
  }
  if (isPolygon && !isBuilding) {
    if (!name || zoom < 14) return -1;
    const bounds = featureGeometryBounds(feature);
    if (!bounds || bounds[2] - bounds[0] > 0.02 || bounds[3] - bounds[1] > 0.02) return -1;
  }

  let score = 0;
  if (isBuilding) score += 1_000;
  if (isPolygon && isBuilding) score += 400;
  if (name) score += 80;
  if (sourceLayer === "poi") score += 40;
  if (feature.geometry.type === "Point" || feature.geometry.type === "MultiPoint") score += 20;
  return score;
}

function selectFeature(
  features: MapGeoJSONFeature[],
  zoom: number,
  viewportBounds: [west: number, south: number, east: number, north: number],
  clicked: Wgs84Position
) {
  return features
    .map((feature, index) => {
      const isTileMember = sourceLayerOf(feature) === "building" && feature.geometry.type === "MultiPolygon" && feature.geometry.coordinates.length > 1;
      const geometry = isTileMember && feature.geometry.type === "MultiPolygon" ? pointObjectTilePolygonMemberAt(feature.geometry, clicked) : feature.geometry;
      return { feature, index, geometry, isTileMember, score: geometry ? featureScore(feature, zoom, viewportBounds, geometry) : -1 };
    })
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0] ?? null;
}

function representativePosition(geometry: GeoJsonGeometry): Wgs84Position | null {
  const position = geometry.type === "Point"
    ? geometry.coordinates
    : geometry.type === "LineString"
      ? geometry.coordinates[0]
      : geometry.type === "Polygon"
        ? geometry.coordinates[0]?.[0]
        : geometry.type === "MultiPolygon"
          ? geometry.coordinates[0]?.[0]?.[0]
          : null;

  if (!position || typeof position[0] !== "number" || typeof position[1] !== "number") return null;
  return [position[0], position[1]];
}

function pointInRing(point: Wgs84Position, ring: Wgs84Position[]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (!currentPoint || !previousPoint) continue;
    const crosses = (currentPoint[1] > point[1]) !== (previousPoint[1] > point[1]) &&
      point[0] < ((previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])) /
        ((previousPoint[1] - currentPoint[1]) || Number.EPSILON) + currentPoint[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: Wgs84Position, polygon: Wgs84Position[][]): boolean {
  const exterior = polygon[0];
  if (!exterior || !pointInRing(point, exterior)) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function ringBounds(ring: Wgs84Position[]): [number, number, number, number] | null {
  if (!ring.length) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [longitude, latitude] of ring) {
    west = Math.min(west, longitude);
    south = Math.min(south, latitude);
    east = Math.max(east, longitude);
    north = Math.max(north, latitude);
  }
  return [west, south, east, north];
}

function ringCentroid(ring: Wgs84Position[]): Wgs84Position | null {
  let twiceArea = 0;
  let longitudeSum = 0;
  let latitudeSum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    if (!current || !next) continue;
    const cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    longitudeSum += (current[0] + next[0]) * cross;
    latitudeSum += (current[1] + next[1]) * cross;
  }
  if (Math.abs(twiceArea) < Number.EPSILON) return null;
  return [longitudeSum / (3 * twiceArea), latitudeSum / (3 * twiceArea)];
}

function polygonInteriorPoint(polygon: Wgs84Position[][], clicked: Wgs84Position): Wgs84Position | null {
  if (pointInPolygon(clicked, polygon)) return clicked;
  const centroid = ringCentroid(polygon[0] ?? []);
  if (centroid && pointInPolygon(centroid, polygon)) return centroid;
  const bounds = ringBounds(polygon[0] ?? []);
  if (!bounds) return null;
  const [west, south, east, north] = bounds;
  const fractions = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0.05, 0.95];
  for (const yFraction of fractions) {
    for (const xFraction of fractions) {
      const candidate: Wgs84Position = [west + (east - west) * xFraction, south + (north - south) * yFraction];
      if (pointInPolygon(candidate, polygon)) return candidate;
    }
  }
  return null;
}

function objectLookupPosition(geometry: GeoJsonGeometry | null, clicked: Wgs84Position): Wgs84Position {
  if (geometry?.type === "Polygon") return polygonInteriorPoint(geometry.coordinates, clicked) ?? clicked;
  if (geometry?.type === "MultiPolygon") {
    const containing = geometry.coordinates.find((polygon) => pointInPolygon(clicked, polygon));
    if (containing) return clicked;
    const ordered = [...geometry.coordinates].sort((left, right) => {
      const leftBounds = ringBounds(left[0] ?? []);
      const rightBounds = ringBounds(right[0] ?? []);
      const area = (bounds: [number, number, number, number] | null) => bounds
        ? (bounds[2] - bounds[0]) * (bounds[3] - bounds[1])
        : 0;
      return area(rightBounds) - area(leftBounds);
    });
    return ordered[0] ? polygonInteriorPoint(ordered[0], clicked) ?? clicked : clicked;
  }
  return clicked;
}

function collectNearbyLabels(map: MapLibreMap, point: { x: number; y: number }): LiveMapNearbyLabel[] {
  const radius = 72;
  const features = map.queryRenderedFeatures([
    [point.x - radius, point.y - radius],
    [point.x + radius, point.y + radius]
  ]);
  const labels: LiveMapNearbyLabel[] = [];
  const seen = new Set<string>();

  for (const feature of features) {
    if (feature.layer?.type !== "symbol") continue;
    const name = featureName(feature);
    if (!name) continue;
    const key = name.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    const geometry = sanitizeGeometry(feature.geometry);
    if (!geometry) continue;

    seen.add(key);
    labels.push({
      name,
      featureClass: featureClass(feature),
      coordinates: representativePosition(geometry)
    });
    if (labels.length >= MAX_NEARBY_LABELS) break;
  }

  return labels;
}

function selectionCanShowVolume(selection: LiveMapSelection | null): boolean {
  return Boolean(
    selection?.object.geometry &&
    selection.object.geometryProvenance !== "rendered_tile_polygon_member" &&
    selection.object.sourceFeatureId !== null &&
    (selection.object.geometry.type === "Polygon" || selection.object.geometry.type === "MultiPolygon") &&
    selection.object.renderHeightM !== null &&
    selection.object.renderHeightM > 0
  );
}

function currentNativeSelectionGeometry(map: MapLibreMap, selection: LiveMapSelection | null) {
  const fallback = selection?.object.geometry ? [selection.object.geometry] : [];
  if (!selection || !selectionCanShowVolume(selection) || typeof map.querySourceFeatures !== "function") return fallback;
  const insideRing = (ring: Position[], point: Position, includeBoundary = false) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
      const cross = (point[0] - xi) * (yj - yi) - (point[1] - yi) * (xj - xi);
      if (Math.abs(cross) < 1e-14 && point[0] >= Math.min(xi, xj) && point[0] <= Math.max(xi, xj) && point[1] >= Math.min(yi, yj) && point[1] <= Math.max(yi, yj)) return includeBoundary;
      if ((yi > point[1]) !== (yj > point[1]) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const contains = (rings: Position[][], point: Position) => insideRing(rings[0], point) && !rings.slice(1).some(ring => insideRing(ring, point, true));
  const polygons = (geometry: Geometry) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  const candidates = map.querySourceFeatures("openmaptiles", { sourceLayer: "building" }).filter(feature => {
    if (safeFeatureId(feature) !== selection.object.sourceFeatureId || featureName(feature) !== selection.object.name) return false;
    if (safeNumericProperty(feature.properties, ["render_height", "height"]) !== selection.object.renderHeightM) return false;
    if (safeNumericProperty(feature.properties, ["render_min_height", "min_height"]) !== selection.object.renderMinHeightM) return false;
    return polygons(feature.geometry).length > 0;
  });
  if (candidates.length > 64) return fallback;
  const unique = [...new Map(candidates.map(feature => [JSON.stringify(feature.geometry), feature.geometry])).values()];
  const probes = (rings: Position[][]) => rings.flatMap(ring => ring.slice(0, -1).flatMap((point, i) => {
    const next = ring[i + 1]; const dx = next[0] - point[0]; const dy = next[1] - point[1];
    return [point, ...[0.25, 0.5, 0.75].flatMap(fraction => {
      const x = point[0] + dx * fraction; const y = point[1] + dy * fraction;
      // Probe both sides, admitting only the polygon's own interior. This
      // recognizes identical/quantized courtyard edges without treating a
      // shared boundary as positive area or expanding any selection geometry.
      return [[x, y], [x - dy * 0.0001, y + dx * 0.0001], [x + dy * 0.0001, y - dx * 0.0001]];
    })];
  })).filter(point => contains(rings, point));
  const overlaps = (a: Position[][], b: Position[][]) => JSON.stringify(a) === JSON.stringify(b) || probes(a).some(point => contains(b, point)) || probes(b).some(point => contains(a, point));
  const canonicalParts = fallback.flatMap(geometry => polygons(geometry));
  const selected = unique.filter(geometry =>
    polygons(geometry).some(rings => contains(rings, [selection.longitude, selection.latitude])) &&
    polygons(geometry).every(part => canonicalParts.some(known => overlaps(part, known)))
  );
  if (!selected.length) return fallback;
  // Follow positive-area tile-buffer overlap, never edge/vertex contact. Every
  // component must connect; a reused-ID multipart with an outside island stays
  // native. This does not change the canonical selection or provider payload.
  for (let changed = true; changed;) {
    changed = false;
    for (const geometry of unique) {
      if (selected.includes(geometry)) continue;
      if (polygons(geometry).every(part => selected.some(current => polygons(current).some(known => overlaps(part, known))))) {
        selected.push(geometry); changed = true;
      }
    }
  }
  return selected.map(geometry => sanitizeGeometry(geometry)).filter((geometry): geometry is NonNullable<typeof geometry> => geometry !== null);
}

function setSelectedVolumeVisibility(
  map: MapLibreMap,
  selection: LiveMapSelection | null,
  viewMode: MapViewMode,
  showVolume: boolean
) {
  if (!map.getLayer(BUILDINGS_3D_LAYER_ID)) return;
  // Recolor the original source feature instead of extruding a copied footprint
  // at the same depth. Native holes, multipart pieces and per-part heights stay
  // intact, with no overlapping surfaces or invented uniform prism.
  const selected = viewMode === "3d" && showVolume && selectionCanShowVolume(selection);
  const geometries = currentNativeSelectionGeometry(map, selection);
  const spatial: ExpressionSpecification[] = geometries.flatMap(geometry => {
    const outside = geometry.type === "Polygon" || geometry.type === "MultiPolygon" ? buildPointObjectNativeSelectionOutside(geometry) : null;
    return outside ? [["all", ["==", ["distance", geometry], 0], [">", ["distance", outside], 0]] as ExpressionSpecification] : [];
  });
  const nativePredicate: ExpressionSpecification = selectionCanShowVolume(selection) && selection && spatial.length ? ["all",
      ["==", ["to-string", ["coalesce", ["id"], ["get", "osm_id"], ["get", "id"], ""]], selection.object.sourceFeatureId!],
      ["==", ["case", ["has", "render_height"], ["to-number", ["get", "render_height"], -1], ["has", "height"], ["to-number", ["get", "height"], -1], -1], selection.object.renderHeightM ?? -1],
      ["==", ["case", ["has", "render_min_height"], ["to-number", ["get", "render_min_height"], -1], ["has", "min_height"], ["to-number", ["get", "min_height"], -1], -1], selection.object.renderMinHeightM ?? -1],
      // Require whole-feature containment: even a touching same-ID neighbour
      // must remain unhighlighted. Ambiguous/clipped outside pieces stay native.
      ["any", ...spatial]
    ] : ["==", 1, 0];
  const color: string | ExpressionSpecification = selected ? ["case", nativePredicate, "#0f7c88", "#d6dcdf"] : "#d6dcdf";
  map.setPaintProperty(BUILDINGS_3D_LAYER_ID, "fill-extrusion-color", color);
  if (map.getLayer(HIGHLIGHT_NATIVE_FILL_LAYER_ID)) {
    map.setFilter(HIGHLIGHT_NATIVE_FILL_LAYER_ID, nativePredicate as FilterSpecification);
    map.setLayoutProperty(HIGHLIGHT_NATIVE_FILL_LAYER_ID, "visibility", selected ? "none" : "visible");
  }
}

function setHighlight(
  map: MapLibreMap,
  selection: LiveMapSelection | null,
  viewMode: MapViewMode,
  showVolume: boolean
) {
  const source = map.getSource(HIGHLIGHT_SOURCE_ID) as GeoJSONSource | undefined;
  if (!source) return;
  const geometry = selectionCanShowVolume(selection) ? null : selection?.object.geometry ?? (selection
    ? { type: "Point" as const, coordinates: [selection.longitude, selection.latitude] }
    : null);
  const data: Feature<Geometry> | { type: "FeatureCollection"; features: [] } = geometry
    ? {
        type: "Feature",
        properties: {
          geometryProvenance: selection?.object.geometryProvenance ?? null,
          renderHeightM: selection?.object.renderHeightM ?? 0,
          renderMinHeightM: selection?.object.renderMinHeightM ?? 0
        },
        geometry
      }
    : { type: "FeatureCollection", features: [] };
  source.setData(data);
  setSelectedVolumeVisibility(map, selection, viewMode, showVolume);
}

function createAoiData(draft: Wgs84Position[], aoi: PointObjectCreateAoi | null): FeatureCollection {
  const features: Feature[] = [];
  const ring = aoi?.coordinates[0] ?? draft;
  if (aoi && ring.length >= 4) {
    features.push({ type: "Feature", properties: { kind: "aoi" }, geometry: { type: "Polygon", coordinates: aoi.coordinates.map(boundary => boundary.map(([longitude, latitude]) => [longitude, latitude])) } });
  } else if (draft.length >= 3) {
    features.push({ type: "Feature", properties: { kind: "draft-fill" }, geometry: { type: "Polygon", coordinates: [[...draft, draft[0]]] } });
    features.push({ type: "Feature", properties: { kind: "draft" }, geometry: { type: "LineString", coordinates: draft } });
  } else if (draft.length >= 2) {
    features.push({ type: "Feature", properties: { kind: "draft" }, geometry: { type: "LineString", coordinates: draft } });
  }
  for (const coordinate of ring.slice(0, aoi ? -1 : undefined)) {
    features.push({ type: "Feature", properties: { kind: "vertex" }, geometry: { type: "Point", coordinates: coordinate } });
  }
  return { type: "FeatureCollection", features };
}

function buildingLayerIds(map: MapLibreMap): string[] {
  return (map.getStyle().layers ?? []).flatMap((layer) => {
    const candidate = layer as typeof layer & { source?: unknown; "source-layer"?: unknown };
    const isBuildingLayer = candidate.id === BUILDINGS_3D_LAYER_ID || (
      candidate.id !== HIGHLIGHT_NATIVE_FILL_LAYER_ID &&
      (candidate.type === "fill" || candidate.type === "fill-extrusion" || candidate.type === "line") &&
      candidate.source === "openmaptiles" &&
      candidate["source-layer"] === "building"
    );
    return isBuildingLayer ? [candidate.id] : [];
  });
}

function resetBuildingFilterSnapshots(map: MapLibreMap) {
  clearPointObjectPartitionRenderer(map, true);
  BUILDING_FILTER_SNAPSHOTS.delete(map);
}

function snapshotBuildingFilters(map: MapLibreMap): Map<string, PointObjectMapFilterSnapshot> {
  const snapshots = BUILDING_FILTER_SNAPSHOTS.get(map) ?? new Map<string, PointObjectMapFilterSnapshot>();
  for (const layerId of buildingLayerIds(map)) {
    if (!snapshots.has(layerId)) {
      snapshots.set(layerId, snapshotPointObjectMapFilter(map.getFilter(layerId) as FilterSpecification | null | undefined));
    }
  }
  BUILDING_FILTER_SNAPSHOTS.set(map, snapshots);
  return snapshots;
}

function restoreBuildingFilters(map: MapLibreMap) {
  clearPointObjectPartitionRenderer(map);
  const snapshots = BUILDING_FILTER_SNAPSHOTS.get(map);
  if (!snapshots) return;
  for (const [layerId, snapshot] of snapshots) {
    if (map.getLayer(layerId)) map.setFilter(layerId, restorePointObjectMapFilter(snapshot));
  }
}

function applyBuildingReplacement(map: MapLibreMap, aoi: PointObjectCreateAoi): PointObjectReplacementStatus {
  if (map.getZoom() < pointObjectReplacementMinimumReliableZoom) {
    restoreBuildingFilters(map);
    return "zoom-required";
  }
  const snapshots = snapshotBuildingFilters(map);
  const layerIds = buildingLayerIds(map);
  if (!layerIds.length || layerIds.some((layerId) => !snapshots.has(layerId))) {
    restoreBuildingFilters(map);
    return "error";
  }
  try {
    const result = reconcilePointObjectCompleteFootprintRenderer(
      map,
      { type: "Polygon", coordinates: aoi.coordinates },
      layerIds,
      snapshots,
      true
    );
    if (result.coverage === "complete") return "applied";
    if (result.coverage === "partial") return "partial";
    if (result.coverage === "pending") return "idle";
    return "error";
  } catch {
    restoreBuildingFilters(map);
    return "error";
  }
}

function setCreateLayers(
  map: MapLibreMap,
  draft: Wgs84Position[],
  aoi: PointObjectCreateAoi | null,
  suppressExistingBuildings: boolean,
  massing: ConceptMassingResult | null,
  viewMode: MapViewMode
): PointObjectReplacementStatus {
  (map.getSource(CREATE_AOI_SOURCE_ID) as GeoJSONSource | undefined)?.setData(createAoiData(draft, aoi));
  (map.getSource(CONCEPT_SOURCE_ID) as GeoJSONSource | undefined)?.setData(massing?.featureCollection ?? { type: "FeatureCollection", features: [] });
  let replacementStatus: PointObjectReplacementStatus = "idle";
  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) map.setLayoutProperty(BUILDINGS_3D_LAYER_ID, "visibility", viewMode === "3d" ? "visible" : "none");
  if (suppressExistingBuildings && aoi) {
    if (map.getZoom() < pointObjectReplacementMinimumReliableZoom) {
      restoreBuildingFilters(map);
      replacementStatus = "zoom-required";
    } else {
      replacementStatus = applyBuildingReplacement(map, aoi);
    }
  } else {
    restoreBuildingFilters(map);
  }
  const canShowConcept = Boolean(massing &&
    (replacementStatus === "applied" || replacementStatus === "partial") &&
    !visibleNativeConceptConflict(map, massing));
  const environment = aoi && massing ? buildConceptEnvironment(aoi, massing) : null;
  // Partial replacement may retain native buildings away from the new massing,
  // but on a proposed plaza/path. Gate only decoration in that case.
  const canShowEnvironment = Boolean(canShowConcept && environment?.featureCollection.features.length &&
    !visibleNativeConceptConflict(map, environment, 256));
  updateConceptEnvironment(map, environment, canShowEnvironment);
  if (map.getLayer(CONCEPT_FILL_LAYER_ID)) map.setLayoutProperty(CONCEPT_FILL_LAYER_ID, "visibility", canShowConcept && viewMode === "2d" ? "visible" : "none");
  if (map.getLayer(CONCEPT_VOLUME_LAYER_ID)) map.setLayoutProperty(CONCEPT_VOLUME_LAYER_ID, "visibility", canShowConcept && viewMode === "3d" ? "visible" : "none");
  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) map.setLayoutProperty(BUILDINGS_3D_LAYER_ID, "visibility", viewMode === "3d" ? "visible" : "none");
  return replacementStatus;
}

function visibleNativeConceptConflict(
  map: MapLibreMap,
  massing: { featureCollection: { features: Array<{ geometry: Polygon | MultiPolygon }> } },
  maximumComparisons = Infinity
): boolean {
  const layers = buildingLayerIds(map).filter((id) => map.getLayoutProperty(id, "visibility") !== "none");
  if (!layers.length) return false;
  const concepts: Array<Polygon | MultiPolygon> = [];
  for (const feature of massing.featureCollection.features) {
    if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") concepts.push(feature.geometry);
  }
  const positions: Position[] = [];
  for (const geometry of concepts) {
    const polygons: Position[][][] = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    for (const polygon of polygons) for (const ring of polygon) positions.push(...ring);
  }
  if (!positions.length || positions.some((position) => !Number.isFinite(position[0]) || !Number.isFinite(position[1]))) return true;
  let visible: MapGeoJSONFeature[];
  try {
    const projected = positions.map((position) => map.project([position[0], position[1]]));
    const queryBox: [[number, number], [number, number]] = [
      [Math.min(...projected.map((point) => point.x)), Math.min(...projected.map((point) => point.y))],
      [Math.max(...projected.map((point) => point.x)), Math.max(...projected.map((point) => point.y))]
    ];
    // Bound the query to generated geometry. An unknown rendered building in
    // this box is a conflict, while an unrelated unknown elsewhere must not
    // suppress a valid concept.
    visible = map.queryRenderedFeatures(queryBox, { layers });
  } catch {
    return true;
  }
  let comparisons = 0;
  for (const feature of visible) {
    const geometry = sanitizeGeometry(feature.geometry);
    if (geometry?.type !== "Polygon" && geometry?.type !== "MultiPolygon") return true;
    for (const concept of concepts) {
      const conceptPolygons: Polygon[] = concept.type === "Polygon"
        ? [concept]
        : concept.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }));
      for (const conceptPolygon of conceptPolygons) {
        // Decoration is optional: fail closed before adding unbounded exact
        // intersection work to an idle/source refresh. Existing massing policy
        // retains its original behavior (no new comparison limit).
        if (++comparisons > maximumComparisons) return true;
        const overlap = pointObjectCompleteFootprintOverlap(geometry as Polygon | MultiPolygon, conceptPolygon);
        if (!overlap || overlap.overlapSqM > 0.05) return true;
      }
    }
  }
  return false;
}

function installGeoAiLayers(map: MapLibreMap, viewMode: MapViewMode) {
  const labelLayer = firstSymbolLayerId(map);
  for (const layer of map.getStyle().layers ?? []) {
    const candidate = layer as typeof layer & { "source-layer"?: unknown };
    if (candidate.type === "fill-extrusion" && candidate["source-layer"] === "building" && candidate.id !== BUILDINGS_3D_LAYER_ID) {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
  if (!map.getLayer(BUILDINGS_3D_LAYER_ID) && map.getSource("openmaptiles")) {
    map.addLayer({
      id: BUILDINGS_3D_LAYER_ID,
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      filter: pointObjectNativeBuilding3dFilter,
      layout: { visibility: viewMode === "3d" ? "visible" : "none" },
      paint: {
        "fill-extrusion-color": "#d6dcdf",
        "fill-extrusion-height": ["coalesce", ["to-number", ["get", "render_height"]], 0],
        "fill-extrusion-base": ["coalesce", ["to-number", ["get", "render_min_height"]], 0],
        "fill-extrusion-opacity": 1,
        "fill-extrusion-vertical-gradient": true
      }
    }, labelLayer);
  }
  const findColor = "#087f8c";
  if (!map.getSource(FIND_FOOTPRINT_SOURCE_ID)) map.addSource(FIND_FOOTPRINT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });
  if (!map.getLayer(FIND_FOOTPRINT_FILL_LAYER_ID)) map.addLayer({
    id: FIND_FOOTPRINT_FILL_LAYER_ID,
    type: "fill",
    source: FIND_FOOTPRINT_SOURCE_ID,
    layout: { visibility: "none" },
    paint: { "fill-color": findColor, "fill-opacity": ["match", ["get", "presentationState"], "active", 0.48, "hover", 0.38, "shortlist", 0.3, 0.1] }
  }, labelLayer);
  if (!map.getLayer(FIND_FOOTPRINT_VOLUME_LAYER_ID)) map.addLayer({
    id: FIND_FOOTPRINT_VOLUME_LAYER_ID,
    type: "fill-extrusion",
    source: FIND_FOOTPRINT_SOURCE_ID,
    minzoom: 14,
    filter: ["==", ["get", "reliableHeight"], true],
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": findColor,
      "fill-extrusion-height": ["get", "renderHeightM"],
      "fill-extrusion-base": ["get", "renderMinHeightM"],
      "fill-extrusion-opacity": ["match", ["get", "presentationState"], "active", 0.78, "hover", 0.66, "shortlist", 0.5, 0.18]
    }
  }, labelLayer);
  if (!map.getLayer(FIND_FOOTPRINT_LINE_LAYER_ID)) map.addLayer({
    id: FIND_FOOTPRINT_LINE_LAYER_ID,
    type: "line",
    source: FIND_FOOTPRINT_SOURCE_ID,
    layout: { visibility: "none" },
    paint: { "line-color": findColor, "line-width": ["match", ["get", "presentationState"], "active", 4, "hover", 3.5, "shortlist", 3, 1.5] }
  }, labelLayer);
  if (!map.getSource(HIGHLIGHT_SOURCE_ID)) {
    map.addSource(HIGHLIGHT_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
  }
  if (!map.getLayer(HIGHLIGHT_FILL_LAYER_ID)) map.addLayer({
    id: HIGHLIGHT_FILL_LAYER_ID,
    type: "fill",
    source: HIGHLIGHT_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "fill-color": "#087f8c",
      "fill-opacity": 0.28
    }
  }, labelLayer);
  if (!map.getLayer(HIGHLIGHT_NATIVE_FILL_LAYER_ID) && map.getSource("openmaptiles")) map.addLayer({
    id: HIGHLIGHT_NATIVE_FILL_LAYER_ID,
    type: "fill",
    minzoom: pointObjectReplacementMinimumReliableZoom,
    source: "openmaptiles",
    "source-layer": "building",
    filter: ["==", 1, 0],
    paint: { "fill-color": "#087f8c", "fill-opacity": 0.28, "fill-outline-color": "#087f8c" }
  }, labelLayer);
  if (!map.getLayer(HIGHLIGHT_LINE_LAYER_ID)) map.addLayer({
    id: HIGHLIGHT_LINE_LAYER_ID,
    type: "line",
    source: HIGHLIGHT_SOURCE_ID,
    filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]],
    paint: {
      "line-color": "#087f8c",
      "line-width": 3.5
    }
  }, labelLayer);
  if (!map.getLayer(HIGHLIGHT_POINT_LAYER_ID)) map.addLayer({
    id: HIGHLIGHT_POINT_LAYER_ID,
    type: "circle",
    source: HIGHLIGHT_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": "#ffffff",
      "circle-radius": 7,
      "circle-stroke-color": "#087f8c",
      "circle-stroke-width": 3
    }
  }, labelLayer);
  if (!map.getSource(CREATE_AOI_SOURCE_ID)) map.addSource(CREATE_AOI_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  if (!map.getLayer(CREATE_AOI_FILL_LAYER_ID)) map.addLayer({
    id: CREATE_AOI_FILL_LAYER_ID,
    type: "fill",
    source: CREATE_AOI_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": "#12a594", "fill-opacity": 0.16 }
  }, labelLayer);
  if (!map.getLayer(CREATE_AOI_LINE_LAYER_ID)) map.addLayer({
    id: CREATE_AOI_LINE_LAYER_ID,
    type: "line",
    source: CREATE_AOI_SOURCE_ID,
    filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]],
    paint: { "line-color": "#087f8c", "line-width": 3, "line-dasharray": [2, 1] }
  }, labelLayer);
  if (!map.getLayer(CREATE_AOI_VERTEX_LAYER_ID)) map.addLayer({
    id: CREATE_AOI_VERTEX_LAYER_ID,
    type: "circle",
    source: CREATE_AOI_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-color": "#ffffff", "circle-radius": 5, "circle-stroke-color": "#087f8c", "circle-stroke-width": 2 }
  }, labelLayer);
  if (!map.getSource(CONCEPT_SOURCE_ID)) map.addSource(CONCEPT_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  ensureConceptEnvironmentLayers(map, labelLayer);
  installConceptSurfaceImages(map);
  const conceptColor: ExpressionSpecification = conceptMaterialColor;
  if (!map.getLayer(CONCEPT_FILL_LAYER_ID)) map.addLayer({
    id: CONCEPT_FILL_LAYER_ID,
    type: "fill",
    source: CONCEPT_SOURCE_ID,
    minzoom: pointObjectReplacementMinimumReliableZoom,
    layout: { visibility: "none" },
    paint: { "fill-color": conceptColor, "fill-pattern": conceptSurfacePattern, "fill-opacity": 0.95, "fill-outline-color": "#087f8c" }
  }, labelLayer);
  if (!map.getLayer(CONCEPT_VOLUME_LAYER_ID)) map.addLayer({
    id: CONCEPT_VOLUME_LAYER_ID,
    type: "fill-extrusion",
    source: CONCEPT_SOURCE_ID,
    minzoom: pointObjectReplacementMinimumReliableZoom,
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": conceptColor,
      "fill-extrusion-pattern": conceptSurfacePattern,
      "fill-extrusion-height": ["get", "heightM"],
      "fill-extrusion-base": ["get", "baseM"],
      "fill-extrusion-opacity": 0.88,
      "fill-extrusion-vertical-gradient": true
    }
  }, labelLayer);
}

function applyViewMode(map: MapLibreMap, viewMode: MapViewMode, suppressExistingBuildings = false, animate = true, updateCamera = true) {
  const camera = CAMERA[viewMode];
  if (viewMode === "3d") {
    map.dragRotate.enable();
    map.touchPitch.enable();
    map.touchZoomRotate.enableRotation();
    map.keyboard.enableRotation();
  } else {
    map.dragRotate.disable();
    map.touchPitch.disable();
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
  }
  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) {
    if (!suppressExistingBuildings) map.setLayoutProperty(BUILDINGS_3D_LAYER_ID, "visibility", viewMode === "3d" ? "visible" : "none");
  }
  if (!updateCamera) return;
  if (animate) map.easeTo({ ...camera, duration: 550 });
  else map.jumpTo(camera);
}

export function LiveObjectMap({
  locationKey = "dubai",
  selection = null,
  className,
  overlayBottomInset = 0,
  onSelection,
  onViewportChange,
  onVisibleBoundsChange,
  onCameraMovingChange,
  findResults = EMPTY_FIND_RESULTS,
  activeFindResultId = null,
  hoveredFindResultId = null,
  shortlistedFindResultIds = EMPTY_FIND_RESULT_IDS,
  onFindResultSelect,
  onFindResultHover,
  projectMarkers = EMPTY_PROJECT_RESULTS,
  activeProjectMarkerId = null,
  onProjectMarkerSelect,
  navigationTarget = null,
  viewModeRequest = null,
  interactionMode = "analyse",
  createDrawing = false,
  createDraftCoordinates = EMPTY_CREATE_COORDINATES,
  createAoi = null,
  createAoiFitRequest = null,
  createAreaCleared = false,
  createReplacementRevision = 0,
  conceptMassing = null,
  onCreateVertex,
  onCreateFinishDrawing,
  onReplacementStatus
}: LiveObjectMapProps) {
  const { locale, t } = usePointObjectLocale();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [openProjectGroup, setOpenProjectGroup] = useState<LiveMapProjectResult[] | null>(null);
  const [projectResultOpening, setProjectResultOpening] = useState(false);
  const [projectResultOpenError, setProjectResultOpenError] = useState(false);
  const projectResultOpenGuardRef = useRef(createPointObjectMapResultOpenGuard());
  const projectGroupDialogRef = useRef<HTMLDivElement>(null);
  const projectGroupTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!openProjectGroup) return;
    const trigger = projectGroupTriggerRef.current;
    trigger?.setAttribute("aria-expanded", "true");
    projectGroupDialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !projectGroupDialogRef.current?.contains(event.target)) setOpenProjectGroup(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenProjectGroup(null);
      trigger?.focus();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      trigger?.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [openProjectGroup]);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraControlsRef = useRef<HTMLDivElement>(null);
  const cameraOpenRef = useRef(cameraOpen);
  cameraOpenRef.current = cameraOpen;
  const cameraDismissPointerRef = useRef<number | null>(null);
  const cameraMapClickGuardRef = useRef({ active: false, expiresAt: 0 });
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!cameraOpenRef.current || !(event.target instanceof Node) || cameraControlsRef.current?.contains(event.target)) return;
      cameraOpenRef.current = false;
      setCameraOpen(false);
      // Let the same pointer continue through buttons and map drag handlers.
      // Only the MapLibre selection/drawing click synthesized for this outside
      // map pointer is consumed below.
      if (containerRef.current?.contains(event.target)) {
        cameraDismissPointerRef.current = event.pointerId;
        cameraMapClickGuardRef.current = { active: true, expiresAt: Number.POSITIVE_INFINITY };
      }
    };
    const finishPointer = (event: PointerEvent) => {
      if (cameraDismissPointerRef.current !== event.pointerId) return;
      cameraDismissPointerRef.current = null;
      cameraMapClickGuardRef.current.expiresAt = Date.now() + 1_200;
    };
    const cancelPointer = (event: PointerEvent) => {
      if (cameraDismissPointerRef.current !== event.pointerId) return;
      cameraDismissPointerRef.current = null;
      cameraMapClickGuardRef.current = { active: false, expiresAt: 0 };
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !cameraOpenRef.current) return;
      cameraOpenRef.current = false;
      setCameraOpen(false);
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("pointerup", finishPointer, true);
    document.addEventListener("pointercancel", cancelPointer, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("pointerup", finishPointer, true);
      document.removeEventListener("pointercancel", cancelPointer, true);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const overlayBottomInsetRef = useRef(overlayBottomInset);
  useEffect(() => { overlayBottomInsetRef.current = overlayBottomInset; }, [overlayBottomInset]);
  const cameraMovingCallbackRef = useRef(onCameraMovingChange);
  useEffect(() => { cameraMovingCallbackRef.current = onCameraMovingChange; }, [onCameraMovingChange]);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectAtRef = useRef<((point: { x: number; y: number }, clicked: Wgs84Position) => void) | null>(null);
  const handledNavigationTargetRef = useRef<string | null>(null);
  const handledViewModeRequestRef = useRef<string | null>(null);
  const handledCreateAoiFitRequestRef = useRef<string | null>(null);
  const handledProjectOverviewFitRef = useRef<string | null>(null);
  const callbackRef = useRef(onSelection);
  const viewportCallbackRef = useRef(onViewportChange);
  const visibleBoundsCallbackRef = useRef(onVisibleBoundsChange);
  const locationKeyRef = useRef(locationKey);
  const selectionRef = useRef(selection);
  const viewModeRef = useRef<MapViewMode>("3d");
  const basemapIdRef = useRef<LiveMapBasemapId>("street");
  const showSelectedVolumeRef = useRef(true);
  const translationRef = useRef(t);
  const createDrawingRef = useRef(createDrawing);
  const interactionModeRef = useRef<LiveMapInteractionMode>(interactionMode);
  const createVertexCallbackRef = useRef(onCreateVertex);
  const finishDrawingCallbackRef = useRef(onCreateFinishDrawing);
  const findResultCallbackRef = useRef(onFindResultSelect);
  const findResultHoverCallbackRef = useRef(onFindResultHover);
  const findResultsRef = useRef(findResults);
  const activeFindResultIdRef = useRef(activeFindResultId);
  const hoveredFindResultIdRef = useRef(hoveredFindResultId);
  const shortlistedFindResultIdsRef = useRef(new Set(shortlistedFindResultIds));
  const renderedResultMarkersRef = useRef<RenderedResultMarker[]>([]);
  const resultMarkerPresentationRef = useRef<ResultMarkerPresentation>({
    activeFindResultId,
    activeProjectMarkerId,
    hoveredFindResultId,
    projectResultOpening,
    shortlistedFindResultIds: new Set(shortlistedFindResultIds)
  });
  resultMarkerPresentationRef.current = {
    activeFindResultId,
    activeProjectMarkerId,
    hoveredFindResultId,
    projectResultOpening,
    shortlistedFindResultIds: new Set(shortlistedFindResultIds)
  };
  const projectResultCallbackRef = useRef(onProjectMarkerSelect);
  function openProjectResult(id: string) {
    const guard = projectResultOpenGuardRef.current;
    if (guard.isPending()) return;
    setOpenProjectGroup(null);
    setProjectResultOpenError(false);
    setProjectResultOpening(true);
    void guard.run(async () => {
      const navigating = await projectResultCallbackRef.current?.(id);
      if (navigating === false) setProjectResultOpenError(true);
      return navigating;
    })
      .catch(() => setProjectResultOpenError(true))
      .finally(() => setProjectResultOpening(guard.isPending()));
  }
  const replacementStatusCallbackRef = useRef(onReplacementStatus);
  const createDraftRef = useRef(createDraftCoordinates);
  const createAoiRef = useRef(createAoi);
  const createAreaClearedRef = useRef(createAreaCleared);
  const conceptMassingRef = useRef(conceptMassing);
  const styleChangeInProgressRef = useRef(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [viewMode, setViewMode] = useState<MapViewMode>("3d");
  const [basemapId, setBasemapId] = useState<LiveMapBasemapId>("street");
  const [showSelectedVolume, setShowSelectedVolume] = useState(true);
  const hasProjectOverview = projectMarkers.length > 0;
  const projectOverviewSignature = JSON.stringify(projectMarkers.map(({ id, longitude, latitude }) => [id, longitude, latitude]));
  const markerDataSignature = JSON.stringify([findResults, projectMarkers]);
  const markerStructureSignature = JSON.stringify([
    findResults.map(({ id, longitude, latitude, label, number }) => [id, longitude, latitude, label, number]),
    projectMarkers.map(({ id, longitude, latitude, label, number, kind }) => [id, longitude, latitude, label, number, kind])
  ]);
  useEffect(() => { setOpenProjectGroup(null); }, [projectOverviewSignature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const market = pointObjectMarket(locationKey);
    map.setMinZoom(hasProjectOverview ? 0 : 3);
    map.setMaxBounds(hasProjectOverview ? null : [[...market.bounds[0]], [...market.bounds[1]]]);
  }, [hasProjectOverview, isReady, locationKey]);

  useEffect(() => {
    callbackRef.current = onSelection;
  }, [onSelection]);

  useEffect(() => {
    translationRef.current = t;
  }, [t]);

  useEffect(() => {
    viewportCallbackRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    visibleBoundsCallbackRef.current = onVisibleBoundsChange;
  }, [onVisibleBoundsChange]);

  useEffect(() => {
    replacementStatusCallbackRef.current = onReplacementStatus;
  }, [onReplacementStatus]);

  useEffect(() => {
    createVertexCallbackRef.current = onCreateVertex;
  }, [onCreateVertex]);

  useEffect(() => { finishDrawingCallbackRef.current = onCreateFinishDrawing; }, [onCreateFinishDrawing]);
  useEffect(() => { findResultCallbackRef.current = onFindResultSelect; }, [onFindResultSelect]);
  useEffect(() => { findResultHoverCallbackRef.current = onFindResultHover; }, [onFindResultHover]);
  useEffect(() => { projectResultCallbackRef.current = onProjectMarkerSelect; }, [onProjectMarkerSelect]);

  useEffect(() => {
    findResultsRef.current = findResults;
    activeFindResultIdRef.current = activeFindResultId;
    hoveredFindResultIdRef.current = hoveredFindResultId;
    shortlistedFindResultIdsRef.current = new Set(shortlistedFindResultIds);
    const map = mapRef.current;
    if (!map) return;
    let disposed = false;
    const applyLatestFootprints = () => {
      if (disposed || !map.isStyleLoaded()) return false;
      setFindFootprintLayers(map, findResults, activeFindResultId, hoveredFindResultId, shortlistedFindResultIdsRef.current, interactionModeRef.current, viewModeRef.current);
      return true;
    };
    if (applyLatestFootprints()) return;
    // Focusing a marker can start a tile load just before its exact footprint
    // is hydrated. Apply this result signature once when that transient load
    // settles; unconditional idle setData would keep the GeoJSON source busy.
    const applyOnIdle = () => {
      if (applyLatestFootprints()) map.off("idle", applyOnIdle);
    };
    map.on("idle", applyOnIdle);
    return () => {
      disposed = true;
      map.off("idle", applyOnIdle);
    };
  }, [activeFindResultId, hoveredFindResultId, markerDataSignature, shortlistedFindResultIds.join("|")]);

  useEffect(() => {
    const presentation = resultMarkerPresentationRef.current;
    for (const marker of renderedResultMarkersRef.current) applyResultMarkerPresentation(marker, presentation);
  }, [activeFindResultId, activeProjectMarkerId, hoveredFindResultId, projectResultOpening, shortlistedFindResultIds.join("|")]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || (!projectMarkers.length && interactionMode !== "find")) return;
    const isProjectOverview = projectMarkers.length > 0;
    const resultGroups = isProjectOverview ? groupExactPointObjectProjectResults(projectMarkers) : findResults.map(result => ({ key: result.id, results: [result] }));
    let disposed = false;
    let removeMarkerLayout: (() => void) | undefined;
    const renderedMarkers: RenderedResultMarker[] = [];
    void import("maplibre-gl").then(({ Marker }) => {
      if (disposed) return;
      for (const [index, group] of resultGroups.entries()) {
        const result = group.results[0];
        const grouped = isProjectOverview && group.results.length > 1;
        if (!Number.isFinite(result.longitude) || !Number.isFinite(result.latitude) || Math.abs(result.longitude) > 180 || Math.abs(result.latitude) > 85) continue;
        const button = document.createElement("button");
        button.type = "button";
        const number = result.number ?? index + 1;
        if (isProjectOverview) button.dataset.projectResultMarker = result.id;
        else button.dataset.findResultMarker = result.id;
        if (grouped) button.dataset.projectResultGroup = group.key;
        const label = grouped ? (locale === "ru" ? `${group.results.length} сохранённых результата в этой точке` : `${group.results.length} saved results at this location`) : `${number}. ${result.label}`;
        button.setAttribute("aria-label", label);
        if (grouped) { button.setAttribute("aria-haspopup", "dialog"); button.setAttribute("aria-expanded", "false"); }
        button.title = label;
        button.textContent = String(grouped ? group.results.length : number);
        button.className = RESULT_MARKER_BASE_CLASS;
        const markerButton: ResultMarkerButton = {
          button,
          isProjectOverview,
          primaryResultId: result.id,
          resultIds: group.results.map(({ id }) => id)
        };
        applyResultMarkerPresentation(markerButton, resultMarkerPresentationRef.current);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (isProjectOverview && projectResultOpenGuardRef.current.isPending()) return;
          if (grouped) {
            projectGroupTriggerRef.current = button;
            button.setAttribute("aria-expanded", "true");
            setOpenProjectGroup(group.results as LiveMapProjectResult[]);
          } else if (isProjectOverview) openProjectResult(result.id);
          else {
            map.easeTo({ center: [result.longitude, result.latitude], zoom: Math.max(map.getZoom(), 16), offset: [0, -overlayBottomInsetRef.current / 2], duration: 350 });
            findResultCallbackRef.current?.(result.id);
          }
        });
        if (!isProjectOverview) {
          button.addEventListener("mouseenter", () => findResultHoverCallbackRef.current?.(result.id));
          button.addEventListener("mouseleave", () => findResultHoverCallbackRef.current?.(null));
          button.addEventListener("focus", () => findResultHoverCallbackRef.current?.(result.id));
          button.addEventListener("blur", () => findResultHoverCallbackRef.current?.(null));
        }
        const marker = new Marker({ element: button, anchor: "center" }).setLngLat([result.longitude, result.latitude]).addTo(map);
        renderedMarkers.push({ ...markerButton, marker });
      }
      if (disposed) {
        for (const { marker } of renderedMarkers) marker.remove();
        return;
      }
      renderedResultMarkersRef.current = renderedMarkers;
      const separate = () => {
        if (disposed || isProjectOverview) return;
        const offsets = separateMapMarkerControls(renderedMarkers.map(({marker}) => map.project(marker.getLngLat())));
        renderedMarkers.forEach(({marker}, index) => marker.setOffset(offsets[index]));
      };
      separate();
      map.on("moveend", separate);
      removeMarkerLayout = () => map.off("moveend", separate);
      const latestPresentation = resultMarkerPresentationRef.current;
      for (const marker of renderedMarkers) applyResultMarkerPresentation(marker, latestPresentation);
    });
    return () => {
      disposed = true;
      removeMarkerLayout?.();
      if (renderedResultMarkersRef.current === renderedMarkers) renderedResultMarkersRef.current = [];
      for (const { marker } of renderedMarkers) marker.remove();
    };
  }, [markerStructureSignature, interactionMode, isReady, retryVersion, locale]);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = interactionMode === "create" && createDrawingRef.current ? "crosshair" : "";
    if (map.isStyleLoaded()) setFindFootprintLayers(map, findResultsRef.current, activeFindResultIdRef.current, hoveredFindResultIdRef.current, shortlistedFindResultIdsRef.current, interactionMode, viewModeRef.current);
    if (interactionMode !== "analyse" && map.isStyleLoaded()) {
      selectionRef.current = null;
      setHighlight(map, null, viewModeRef.current, showSelectedVolumeRef.current);
    }
  }, [interactionMode]);

  useEffect(() => {
    createDrawingRef.current = createDrawing;
    createDraftRef.current = createDraftCoordinates;
    createAoiRef.current = createAoi;
    createAreaClearedRef.current = createAreaCleared;
    conceptMassingRef.current = conceptMassing;
    const map = mapRef.current;
    if (!map) return;
    const applyCreateState = () => {
      if (createDrawing && viewModeRef.current !== "2d") {
        viewModeRef.current = "2d";
        setViewMode("2d");
        applyViewMode(map, "2d", createAreaCleared);
        const current = selectionRef.current;
        if (current) {
          const nextSelection = { ...current, viewport: { ...current.viewport, ...CAMERA["2d"], viewMode: "2d" as const } };
          selectionRef.current = nextSelection;
          viewportCallbackRef.current?.(nextSelection);
        }
      }
      const replacementStatus = setCreateLayers(map, createDraftCoordinates, createAoi, createAreaCleared, conceptMassing, viewModeRef.current);
      replacementStatusCallbackRef.current?.(replacementStatus);
      map.getCanvas().style.cursor = interactionModeRef.current === "create" && createDrawing ? "crosshair" : "";
    };
    if (map.isStyleLoaded()) applyCreateState();
    else map.once("idle", applyCreateState);
    // Source work can make isStyleLoaded false after style.load. Do not lose a
    // new A/B/reopen state; latest props replace this one-shot pending apply.
    return () => { map.off("idle", applyCreateState); };
  }, [conceptMassing, createAoi, createAreaCleared, createDraftCoordinates, createDrawing, createReplacementRevision]);

  useEffect(() => {
    selectionRef.current = selection;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setHighlight(map, selection, viewModeRef.current, showSelectedVolumeRef.current);
  }, [selection]);

  useEffect(() => {
    locationKeyRef.current = locationKey;
    const map = mapRef.current;
    if (!map) return;
    const view = pointObjectMarket(locationKey);
    setError(null);
    setIsReady(false);
    setHighlight(map, null, viewModeRef.current, showSelectedVolumeRef.current);
    // A location change can coincide with opening the cross-market overview.
    // Do not let this later effect overwrite its intentionally unbounded map.
    map.setMaxBounds(hasProjectOverview ? null : [[...view.bounds[0]], [...view.bounds[1]]]);
    map.easeTo({ center: [...view.center], zoom: view.zoom, ...CAMERA[viewModeRef.current], duration: 650 });
    map.once("idle", () => setIsReady(true));
  }, [locationKey]);

  useEffect(() => {
    if (!navigationTarget || !isReady || handledNavigationTargetRef.current === navigationTarget.requestId) return;
    const map = mapRef.current;
    if (!map || !selectAtRef.current) return;
    handledNavigationTargetRef.current = navigationTarget.requestId;
    if (navigationTarget.viewMode) {
      // Restore mode and fit are one camera operation. A separate mode ease
      // would interrupt the tagged fit when reopening from a 3D map.
      viewModeRef.current = navigationTarget.viewMode;
      setViewMode(navigationTarget.viewMode);
      applyViewMode(map, navigationTarget.viewMode, createAreaClearedRef.current, false, false);
    }
    const coordinates: Wgs84Position = [navigationTarget.longitude, navigationTarget.latitude];
    let selectionCompleted = false;
    const selectAfterMove = () => {
      if (navigationTarget.selectAfterNavigation === false || selectionCompleted || !selectAtRef.current || !map.isStyleLoaded()) return;
      selectionCompleted = true;
      if (navigationTarget.expectedSourceFeatureId) {
        const center = map.getCenter();
        const candidate = navigationTarget.exactFindCandidate?.sourceFeatureId === navigationTarget.expectedSourceFeatureId ? navigationTarget.exactFindCandidate : null;
        const candidateGeometry = candidate?.geometry ? pointObjectFindVerifiedFootprint(candidate.geometry, candidate.geometryProvenance ?? null,
          candidate.observedTags.building || candidate.observedTags.landuse ? "mapped_building_or_landuse" : "mapped_poi") : null;
        const resolved = navigationTarget.resolvedFindContext?.sourceFeatureId === navigationTarget.expectedSourceFeatureId &&
          navigationTarget.resolvedFindContext.coordinateAssociation === "trusted_open_map_identity"
          ? navigationTarget.resolvedFindContext : null;
        // Legacy saved Find cohorts may contain centroids only. A previously
        // acquired, exact-identity complete footprint must survive navigation.
        // Never transfer a neighbour's geometry or promote a POI into a parcel.
        const resolvedGeometry = resolved?.displayGeometry && candidate && (candidate.observedTags.building || candidate.observedTags.landuse)
          ? pointObjectFindVerifiedFootprint(resolved.displayGeometry, resolved.geometryProvenance ?? null, "mapped_building_or_landuse") : null;
        const selectionGeometry = candidateGeometry ?? resolvedGeometry;
        const exactSelection: LiveMapSelection = {
          locationKey: locationKeyRef.current,
          longitude: coordinates[0],
          latitude: coordinates[1],
          clickedAt: new Date().toISOString(),
          object: {
            name: navigationTarget.expectedLabel ?? null,
            featureClass: navigationTarget.expectedFeatureClass ?? "open_map_object",
            sourceFeatureId: navigationTarget.expectedSourceFeatureId,
            geometry: selectionGeometry ? selectionGeometry as LiveMapSelection["object"]["geometry"] : { type: "Point", coordinates },
            ...(selectionGeometry ? {geometryProvenance: "confirmed_complete_footprint" as const} : {}),
            renderHeightM: candidateGeometry ? candidate?.renderHeightM ?? null : resolvedGeometry ? resolved?.renderHeightM ?? null : null,
            renderMinHeightM: candidateGeometry ? candidate?.renderMinHeightM ?? null : resolvedGeometry ? resolved?.renderMinHeightM ?? null : null
          },
          resolvedObject: resolved,
          viewport: {
            center: [center.lng, center.lat],
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing(),
            viewMode: viewModeRef.current,
            basemapId: basemapIdRef.current
          },
          provider: "OpenFreeMap / OpenStreetMap",
          nearbyLabels: []
        };
        selectionRef.current = exactSelection;
        setHighlight(map, exactSelection, viewModeRef.current, showSelectedVolumeRef.current);
        callbackRef.current(exactSelection);
        return;
      }
      const projected = map.project(coordinates);
      selectAtRef.current({ x: projected.x, y: projected.y }, coordinates);
    };
    map.once("moveend", selectAfterMove);
    map.once("idle", selectAfterMove);
    const fallbackTimer = window.setTimeout(selectAfterMove, 1_400);
    if (navigationTarget.boundingBox) {
      const [south, north, west, east] = navigationTarget.boundingBox;
      const fitOptions: FitBoundsOptions = { ...(navigationTarget.viewMode ? CAMERA[navigationTarget.viewMode] : {}), padding: overlayBottomInsetRef.current ? { top: 72, left: 32, right: 56, bottom: 72 + overlayBottomInsetRef.current } : 72, maxZoom: navigationTarget.zoom ?? 18, duration: 650 };
      const camera = map.cameraForBounds([[west, south], [east, north]], fitOptions);
      const center = camera?.center;
      const expectedCamera: NavigationCamera | undefined = center && typeof camera?.zoom === "number" ? {
        center: Array.isArray(center) ? center : ["lng" in center ? center.lng : center.lon, center.lat],
        zoom: camera.zoom,
        bearing: camera.bearing ?? 0,
        pitch: fitOptions.pitch ?? map.getPitch()
      } : undefined;
      map.fitBounds([[west, south], [east, north]], fitOptions, { geoaiNavigationRequestId: navigationTarget.requestId, geoaiNavigationCamera: expectedCamera });
    } else {
      map.easeTo({ center: coordinates, zoom: navigationTarget.zoom ?? 18, offset: [0, -overlayBottomInsetRef.current / 2], duration: 650 });
    }
    return () => {
      map.off("moveend", selectAfterMove);
      map.off("idle", selectAfterMove);
      window.clearTimeout(fallbackTimer);
    };
  }, [isReady, navigationTarget]);

  useEffect(() => {
    if (!projectMarkers.length) {
      handledProjectOverviewFitRef.current = null;
      return;
    }
    const map = mapRef.current;
    const bounds = projectResultCoordinateBounds(projectMarkers);
    if (!map || !isReady || !bounds) return;
    const fit = (duration: number) => {
      map.stop();
      map.setMinZoom(0);
      map.setMaxBounds(null);
      map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
        padding: { top: 88, left: 44, right: 60, bottom: 88 + overlayBottomInsetRef.current },
        maxZoom: 17, pitch: 0, bearing: 0, duration
      });
    };
    // Fit after MapLibre has updated its own transform dimensions, regardless
    // of which container observer initiated the resize. Stop any old wide-screen
    // camera animation so it cannot overwrite the new phone-sized fit.
    const refitAfterResize = () => fit(0);
    map.on("resize", refitAfterResize);
    const firstFit = handledProjectOverviewFitRef.current !== projectOverviewSignature;
    handledProjectOverviewFitRef.current = projectOverviewSignature;
    fit(firstFit ? 450 : 0);
    return () => { map.off("resize", refitAfterResize); };
  }, [isReady, projectOverviewSignature, overlayBottomInset]);

  useEffect(() => {
    if (!viewModeRequest || handledViewModeRequestRef.current === viewModeRequest.requestId) return;
    handledViewModeRequestRef.current = viewModeRequest.requestId;
    changeViewMode(viewModeRequest.mode);
  }, [viewModeRequest]);

  useEffect(() => {
    if (!createAoiFitRequest || !isReady || handledCreateAoiFitRequestRef.current === createAoiFitRequest.requestId) return;
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;
    handledCreateAoiFitRequestRef.current = createAoiFitRequest.requestId;
    const horizontalPadding = Math.max(20, Math.min(72, Math.floor(container.clientWidth * 0.12)));
    const topPadding = Math.max(20, Math.min(72, Math.floor(container.clientHeight * 0.18)));
    const bottomPadding = Math.max(20, Math.min(56, Math.floor(container.clientHeight * 0.14))) + overlayBottomInsetRef.current;
    map.fitBounds(createAoiFitRequest.bounds, {
      padding: { top: topPadding, right: horizontalPadding, bottom: bottomPadding, left: horizontalPadding },
      maxZoom: 18,
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      duration: 650
    });
    container.dispatchEvent(new CustomEvent("geoai:aoi-fit-applied", {
      detail: { requestId: createAoiFitRequest.requestId }
    }));
  }, [createAoiFitRequest, isReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    styleChangeInProgressRef.current = true;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let handleStyleData: (() => void) | null = null;
    let handleStyleReady: (() => void) | null = null;

    void import("maplibre-gl")
      .then((maplibregl) => {
        if (disposed || !containerRef.current) return;
        // v6 uses a separate ESM worker; let the bundler emit its same-origin URL.
        maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
        const view = pointObjectMarket(locationKeyRef.current);
        const restored = selectionRef.current;
        const initialBasemap = restored?.viewport.basemapId ?? basemapIdRef.current;
        const initialViewMode: MapViewMode = restored?.viewport.viewMode ?? viewModeRef.current;
        basemapIdRef.current = initialBasemap;
        viewModeRef.current = initialViewMode;
        setBasemapId(initialBasemap);
        setViewMode(initialViewMode);
        const initialCamera = restored
          ? { pitch: restored.viewport.pitch, bearing: restored.viewport.bearing }
          : CAMERA[initialViewMode];
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: basemapById(initialBasemap).styleUrl,
          center: restored?.locationKey === locationKeyRef.current ? restored.viewport.center : [...view.center],
          zoom: restored?.locationKey === locationKeyRef.current ? restored.viewport.zoom : view.zoom,
          minZoom: 3,
          maxZoom: 20,
          zoomLevelsToOverscale: undefined,
          maxBounds: [[...view.bounds[0]], [...view.bounds[1]]],
          maxPitch: 60,
          pitch: initialCamera.pitch,
          bearing: initialCamera.bearing,
          canvasContextAttributes: { antialias: true },
          dragRotate: true,
          pitchWithRotate: true,
          touchPitch: true,
          touchZoomRotate: true,
          attributionControl: false
        });
        mapRef.current = map;
        applyViewMode(map, initialViewMode, createAreaClearedRef.current, false, false);
        map.addControl(new maplibregl.NavigationControl({ showCompass: false, showZoom: true }), "top-right");
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

        let observedBuildingLayerIds = new Set<string>();
        let buildingLayerReconciliationReady = false;
        let reconcilingBuildingLayers = false;
        let replacementZoomEligible = map.getZoom() >= pointObjectReplacementMinimumReliableZoom;

        handleStyleData = () => {
          if (disposed || reconcilingBuildingLayers || !buildingLayerReconciliationReady || styleChangeInProgressRef.current) return;
          const currentLayerIds = buildingLayerIds(map);
          const addedLayerIds = currentLayerIds.filter((layerId) => !observedBuildingLayerIds.has(layerId));
          const layerSetChanged = addedLayerIds.length > 0 ||
            observedBuildingLayerIds.size !== currentLayerIds.length;
          if (!layerSetChanged) return;
          observedBuildingLayerIds = new Set(currentLayerIds);
          if (!addedLayerIds.length || !createAreaClearedRef.current || !createAoiRef.current) return;

          // Mark the new identity set and enter the guard before setFilter. MapLibre
          // emits styledata for filter mutations, which must not recursively
          // trigger another replacement pass.
          reconcilingBuildingLayers = true;
          try {
            const replacementStatus = setCreateLayers(
              map,
              createDraftRef.current,
              createAoiRef.current,
              createAreaClearedRef.current,
              conceptMassingRef.current,
              viewModeRef.current
            );
            replacementStatusCallbackRef.current?.(replacementStatus);
          } finally {
            reconcilingBuildingLayers = false;
          }
        };

        handleStyleReady = () => {
          if (disposed) return;
          styleChangeInProgressRef.current = true;
          buildingLayerReconciliationReady = false;
          resetBuildingFilterSnapshots(map);
          installGeoAiLayers(map, viewModeRef.current);
          setFindFootprintLayers(map, findResultsRef.current, activeFindResultIdRef.current, hoveredFindResultIdRef.current, shortlistedFindResultIdsRef.current, interactionModeRef.current, viewModeRef.current);
          // Camera state is independent of the style lifecycle. Reinstall only
          // mode-specific handlers and layer visibility here so a basemap load
          // cannot overwrite a user's rotation or a 2D/3D choice made mid-load.
          applyViewMode(map, viewModeRef.current, createAreaClearedRef.current, false, false);
          setHighlight(map, selectionRef.current, viewModeRef.current, showSelectedVolumeRef.current);
          const replacementStatus = setCreateLayers(map, createDraftRef.current, createAoiRef.current, createAreaClearedRef.current, conceptMassingRef.current, viewModeRef.current);
          replacementStatusCallbackRef.current?.(replacementStatus);
          replacementZoomEligible = map.getZoom() >= pointObjectReplacementMinimumReliableZoom;
          observedBuildingLayerIds = new Set(buildingLayerIds(map));
          buildingLayerReconciliationReady = true;
          styleChangeInProgressRef.current = false;
          setError(null);
          setIsReady(true);
        };
        map.on("styledata", handleStyleData);
        map.on("style.load", handleStyleReady);

        const selectAt = (
          point: { x: number; y: number },
          clicked: Wgs84Position
        ) => {
          // Source tiles may still be loading while the installed style already
          // renders an object. Query that visible geometry instead of dropping
          // the user's tap because an unrelated tile is pending.
          if (styleChangeInProgressRef.current) return;
          const visibleBounds = map.getBounds();
          const selected = selectFeature(
            map.queryRenderedFeatures([point.x, point.y]),
            map.getZoom(),
            [visibleBounds.getWest(), visibleBounds.getSouth(), visibleBounds.getEast(), visibleBounds.getNorth()],
            clicked
          );
          const selectedFeature = selected?.feature ?? null;
          const selectedGeometry = selected?.geometry ? sanitizeGeometry(selected.geometry) : null;
          const center = map.getCenter();
          const analysisPosition = objectLookupPosition(selectedGeometry, clicked);
          const nextSelection: LiveMapSelection = {
            locationKey: locationKeyRef.current,
            longitude: analysisPosition[0],
            latitude: analysisPosition[1],
            clickedAt: new Date().toISOString(),
            object: {
              name: selectedFeature ? featureName(selectedFeature) : null,
              featureClass: selectedFeature ? featureClass(selectedFeature) : "location",
              sourceFeatureId: selectedFeature ? safeFeatureId(selectedFeature) : null,
              ...(selected?.isTileMember ? { geometryProvenance: "rendered_tile_polygon_member" as const } : {}),
              geometry: selectedGeometry,
              renderHeightM: selectedFeature && ![true, "true", 1, "1"].includes(selectedFeature.properties?.hide_3d)
                ? safeNumericProperty(selectedFeature.properties, ["render_height", "height"])
                : null,
              renderMinHeightM: selectedFeature
                ? safeNumericProperty(selectedFeature.properties, ["render_min_height", "min_height"])
                : null
            },
            resolvedObject: null,
            viewport: {
              center: [center.lng, center.lat],
              zoom: map.getZoom(),
              pitch: map.getPitch(),
              bearing: map.getBearing(),
              viewMode: viewModeRef.current,
              basemapId: basemapIdRef.current
            },
            provider: "OpenFreeMap / OpenStreetMap",
            nearbyLabels: collectNearbyLabels(map, point)
          };
          selectionRef.current = nextSelection;
          setHighlight(map, nextSelection, viewModeRef.current, showSelectedVolumeRef.current);
          callbackRef.current(nextSelection);
        };
        selectAtRef.current = selectAt;

        const handleClick = (event: MapMouseEvent) => {
          const cameraGuard = cameraMapClickGuardRef.current;
          if (cameraGuard.active && (cameraDismissPointerRef.current !== null || Date.now() <= cameraGuard.expiresAt)) {
            cameraMapClickGuardRef.current = { active: false, expiresAt: 0 };
            return;
          }
          if (cameraGuard.active) cameraMapClickGuardRef.current = { active: false, expiresAt: 0 };
          if (interactionModeRef.current === "find") {
            const layers = [FIND_FOOTPRINT_VOLUME_LAYER_ID, FIND_FOOTPRINT_FILL_LAYER_ID].filter((id) => map.getLayer(id));
            const footprint = layers.length
              ? map.queryRenderedFeatures(event.point, { layers }).find((feature) => typeof feature.properties?.resultId === "string")
              : null;
            const resultId = footprint?.properties?.resultId;
            if (typeof resultId === "string") findResultCallbackRef.current?.(resultId);
            return;
          }
          if (interactionModeRef.current === "create" && createDrawingRef.current) {
            const draft = createDraftRef.current;
            const first = draft.length >= 3 ? map.project(draft[0]) : null;
            if (first && Math.hypot(first.x - event.point.x, first.y - event.point.y) <= 22 && finishDrawingCallbackRef.current) {
              finishDrawingCallbackRef.current();
              return;
            }
            createVertexCallbackRef.current?.([event.lngLat.lng, event.lngLat.lat]);
            return;
          }
          if (interactionModeRef.current !== "analyse") return;
          selectAt(event.point, [event.lngLat.lng, event.lngLat.lat]);
        };

        const publishReadyBuildingReplacement = () => {
          if (disposed || !createAreaClearedRef.current || !createAoiRef.current ||
            map.getZoom() < pointObjectReplacementMinimumReliableZoom) return;
          const snapshots = BUILDING_FILTER_SNAPSHOTS.get(map);
          if (!snapshots) return;
          const result = reconcilePointObjectCompleteFootprintRenderer(
            map,
            { type: "Polygon", coordinates: createAoiRef.current.coordinates },
            buildingLayerIds(map),
            snapshots
          );
          const status: PointObjectReplacementStatus = result.coverage === "complete"
            ? "applied"
            : result.coverage === "partial"
              ? "partial"
              : result.coverage === "pending"
                ? "idle"
                : "error";
          replacementStatusCallbackRef.current?.(status);
          const conceptVisible = Boolean(
            conceptMassingRef.current &&
            (status === "applied" || status === "partial") &&
            !visibleNativeConceptConflict(map, conceptMassingRef.current)
          );
          setPointObjectLayerVisibilityIfChanged(map, CONCEPT_FILL_LAYER_ID, conceptVisible && viewModeRef.current === "2d" ? "visible" : "none");
          setPointObjectLayerVisibilityIfChanged(map, CONCEPT_VOLUME_LAYER_ID, conceptVisible && viewModeRef.current === "3d" ? "visible" : "none");
          const environment = conceptMassingRef.current
            ? buildConceptEnvironment(createAoiRef.current, conceptMassingRef.current) : null;
          const environmentVisible = Boolean(conceptVisible && environment?.featureCollection.features.length &&
            !visibleNativeConceptConflict(map, environment, 256));
          setConceptEnvironmentVisibility(map, environmentVisible);
        };

        const handleMoveEnd = (event: MapEventType["moveend"] & { geoaiNavigationRequestId?: string; geoaiNavigationCamera?: NavigationCamera }) => {
          const visibleBounds = map.getBounds();
          // MapLibre also emits tagged moveend when a gesture interrupts a fit.
          // Its requestId is proof of completion only at the expected final camera.
          const completedRequestId = isCompletedNavigationCamera({ center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }, event.geoaiNavigationCamera)
            ? event.geoaiNavigationRequestId : undefined;
          visibleBoundsCallbackRef.current?.([visibleBounds.getWest(), visibleBounds.getSouth(), visibleBounds.getEast(), visibleBounds.getNorth()], completedRequestId);
          cameraMovingCallbackRef.current?.(false);
          const nextReplacementZoomEligible = map.getZoom() >= pointObjectReplacementMinimumReliableZoom;
          if (nextReplacementZoomEligible !== replacementZoomEligible) {
            replacementZoomEligible = nextReplacementZoomEligible;
            // Source loading makes isStyleLoaded false during many zoom ends.
            // The installed style is still writable; do not consume the zoom
            // transition without restoring/reapplying its layer filters.
            if (createAreaClearedRef.current && createAoiRef.current && !styleChangeInProgressRef.current) {
              const replacementStatus = setCreateLayers(
                map,
                createDraftRef.current,
                createAoiRef.current,
                createAreaClearedRef.current,
                conceptMassingRef.current,
                viewModeRef.current
              );
              replacementStatusCallbackRef.current?.(replacementStatus);
            }
          }
          const current = selectionRef.current;
          if (!current) return;
          const center = map.getCenter();
          const nextSelection: LiveMapSelection = {
            ...current,
            viewport: {
              center: [center.lng, center.lat],
              zoom: map.getZoom(),
              pitch: map.getPitch(),
              bearing: map.getBearing(),
              viewMode: viewModeRef.current,
              basemapId: basemapIdRef.current
            }
          };
          selectionRef.current = nextSelection;
          viewportCallbackRef.current?.(nextSelection);
        };

        const suspendConceptForNativeSourceChange = () => {
          if (!createAreaClearedRef.current || !createAoiRef.current) return;
          if (map.getLayer(CONCEPT_FILL_LAYER_ID)) map.setLayoutProperty(CONCEPT_FILL_LAYER_ID, "visibility", "none");
          if (map.getLayer(CONCEPT_VOLUME_LAYER_ID)) map.setLayoutProperty(CONCEPT_VOLUME_LAYER_ID, "visibility", "none");
          setConceptEnvironmentVisibility(map, false);
          if (map.getZoom() < pointObjectReplacementMinimumReliableZoom) {
            // Low zoom deliberately restores the native source. Later tile
            // loading events must not overwrite that terminal UI state with
            // "preparing", because idle reconciliation is disabled here.
            restoreBuildingFilters(map);
            replacementStatusCallbackRef.current?.("zoom-required");
          } else {
            replacementStatusCallbackRef.current?.("idle");
          }
        };

        const handleMoveStart = () => {
          cameraMovingCallbackRef.current?.(true);
          // A pan/zoom can introduce a new native tile before the next idle
          // reconciliation. Never leave generated geometry over that transient,
          // not-yet-classified source footprint.
          suspendConceptForNativeSourceChange();
        };

        const handleNativeSourceLoading = (event: MapSourceDataEvent) => {
          if (!event.sourceId) return;
          const isBuildingSource = buildingLayerIds(map).some((id) => {
            const layer = map.getLayer(id);
            return Boolean(layer && "source" in layer && layer.source === event.sourceId);
          });
          if (isBuildingSource) suspendConceptForNativeSourceChange();
        };

        let retainedReadyQueued = false;
        const handleRetainedSourceData = (event: MapSourceDataEvent) => {
          if (!event.sourceId?.startsWith(PARTITION_SOURCE_PREFIX) ||
            !map.getSource(event.sourceId) || !map.isSourceLoaded(event.sourceId) || retainedReadyQueued) return;
          retainedReadyQueued = true;
          // Renderer listeners are registered after this long-lived handler.
          // Reconcile in a microtask so applyPrepared has first marked the
          // source ready, then publish the terminal status deterministically.
          queueMicrotask(() => {
            retainedReadyQueued = false;
            // applyPrepared runs in the renderer's sourcedata listener before
            // this microtask. Its native setFilter intentionally reloads the
            // vector tiles; reconciling in that transient window would clear
            // the prepared renderer, restore the baseline filter and start an
            // endless composed -> baseline -> composed reload cycle. The next
            // native idle publishes the terminal status after that reparse.
            const nativeSources = new Set(buildingLayerIds(map).flatMap((id) => {
              const layer = map.getLayer(id);
              return layer && "source" in layer && typeof layer.source === "string" ? [layer.source] : [];
            }));
            if ([...nativeSources].some((sourceId) => !map.isSourceLoaded(sourceId))) return;
            publishReadyBuildingReplacement();
          });
        };

        map.once("load", () => {
          if (disposed) return;
          map.resize();
          const visibleBounds = map.getBounds();
          visibleBoundsCallbackRef.current?.([visibleBounds.getWest(), visibleBounds.getSouth(), visibleBounds.getEast(), visibleBounds.getNorth()]);
          setError(null);
          setIsReady(true);
        });
        map.on("click", handleClick);
        map.on("movestart", handleMoveStart);
        map.on("moveend", handleMoveEnd);
        map.on("sourcedataloading", handleNativeSourceLoading);
        map.on("sourcedata", handleRetainedSourceData);
        let nativeHighlightSignature = "";
        map.on("idle", () => {
          if (disposed || !map.isStyleLoaded()) return;
          publishReadyBuildingReplacement();
          const geometry = currentNativeSelectionGeometry(map, selectionRef.current);
          const signature = JSON.stringify([geometry, viewModeRef.current, showSelectedVolumeRef.current]);
          if (signature === nativeHighlightSignature) return;
          nativeHighlightSignature = signature;
          setSelectedVolumeVisibility(map, selectionRef.current, viewModeRef.current, showSelectedVolumeRef.current);
        });
        map.on("error", (event) => {
          const message = event.error instanceof Error ? event.error.message : "";
          if (/image .+ could not be loaded|sprite/i.test(message)) return;
          if (!disposed) setError(translationRef.current("map.error.partial"));
        });

        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(container);
      })
      .catch(() => {
        if (!disposed) setError(translationRef.current("map.error.full"));
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      const map = mapRef.current;
      mapRef.current = null;
      selectAtRef.current = null;
      if (map) {
        if (handleStyleData) map.off("styledata", handleStyleData);
        if (handleStyleReady) map.off("style.load", handleStyleReady);
        restoreBuildingFilters(map);
        resetBuildingFilterSnapshots(map);
        map.remove();
      }
    };
  }, [retryVersion]);

  function changeViewMode(nextMode: MapViewMode) {
    const map = mapRef.current;
    if (nextMode === viewModeRef.current) {
      // The parent may have pre-armed a Find transition before this request.
      // A mode no-op has no `moveend`, so acknowledge the camera's real state
      // instead of leaving the search action disabled.
      cameraMovingCallbackRef.current?.(mapRef.current?.isMoving() ?? false);
      return;
    }
    viewModeRef.current = nextMode;
    setViewMode(nextMode);
    const current = selectionRef.current;
    if (current) {
      const nextSelection: LiveMapSelection = {
        ...current,
        viewport: { ...current.viewport, ...CAMERA[nextMode], viewMode: nextMode }
      };
      selectionRef.current = nextSelection;
      viewportCallbackRef.current?.(nextSelection);
    }
    if (!map) {
      // The request can arrive before MapLibre initializes; there is no
      // camera operation to finish and the normal visible-bounds guard stays
      // in effect until the map loads.
      cameraMovingCallbackRef.current?.(mapRef.current?.isMoving() ?? false);
      return;
    }
    // MapLibre camera operations remain available while a style is loading.
    // Applying the mode immediately eliminates the style.load/toggle race.
    applyViewMode(map, nextMode, createAreaClearedRef.current);
    if (!map.isStyleLoaded()) return;
    setFindFootprintLayers(map, findResultsRef.current, activeFindResultIdRef.current, hoveredFindResultIdRef.current, shortlistedFindResultIdsRef.current, interactionModeRef.current, nextMode);
    setSelectedVolumeVisibility(map, selectionRef.current, nextMode, showSelectedVolumeRef.current);
    const replacementStatus = setCreateLayers(map, createDraftRef.current, createAoiRef.current, createAreaClearedRef.current, conceptMassingRef.current, nextMode);
    replacementStatusCallbackRef.current?.(replacementStatus);
  }

  function changeBasemap(nextBasemap: LiveMapBasemapId) {
    if (nextBasemap === basemapIdRef.current) return;
    basemapIdRef.current = nextBasemap;
    setBasemapId(nextBasemap);
    const map = mapRef.current;
    if (!map) return;
    const current = selectionRef.current;
    if (current) {
      const center = map.getCenter();
      const nextSelection: LiveMapSelection = {
        ...current,
        viewport: {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          viewMode: viewModeRef.current,
          basemapId: nextBasemap
        }
      };
      selectionRef.current = nextSelection;
      viewportCallbackRef.current?.(nextSelection);
    }
    setError(null);
    setIsReady(false);
    styleChangeInProgressRef.current = true;
    map.setStyle(basemapById(nextBasemap).styleUrl, { diff: false });
  }

  function toggleSelectedVolume() {
    const nextValue = !showSelectedVolumeRef.current;
    showSelectedVolumeRef.current = nextValue;
    setShowSelectedVolume(nextValue);
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setSelectedVolumeVisibility(map, selectionRef.current, viewModeRef.current, nextValue);
  }

  function retryMap() {
    basemapIdRef.current = "street";
    setBasemapId("street");
    const current = selectionRef.current;
    if (current) {
      const nextSelection = { ...current, viewport: { ...current.viewport, basemapId: "street" as const } };
      selectionRef.current = nextSelection;
      viewportCallbackRef.current?.(nextSelection);
    }
    setError(null);
    setIsReady(false);
    setRetryVersion((value) => value + 1);
  }

  function fitFindResults() {
    const map = mapRef.current;
    const bounds = projectMarkers.length ? projectResultCoordinateBounds(projectMarkers) : liveFindResultBounds(findResults);
    if (!map || !bounds) return;
    map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
      padding: { top: 88, left: 44, right: 60, bottom: 88 + overlayBottomInsetRef.current },
      maxZoom: 17,
      duration: 450
    });
  }

  const containerClassName = [
    "relative h-full min-h-0 w-full overflow-hidden bg-[#e8edf0]",
    className
  ].filter(Boolean).join(" ");
  const instructionKey = interactionMode === "find"
    ? "map.instructions.find"
    : interactionMode === "create"
      ? "map.instructions.create"
      : "map.instructions.analyse";
  const readyKey = interactionMode === "find"
    ? "map.ready.find"
    : interactionMode === "create"
      ? "map.ready.create"
      : "map.ready.analyse";

  return (
    <div
      className={containerClassName}
      role="region"
      aria-label={`${t("map.region")} — ${pointObjectMarket(locationKey).label[locale]}`}
      aria-describedby="live-map-instructions"
    >
      {/* MapLibre adds `position: relative` at runtime; pin geometry across CSS import orders. */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        data-testid="live-map-canvas"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <p id="live-map-instructions" className="sr-only">
        {t(instructionKey)}
      </p>
      {openProjectGroup ? (
        <div ref={projectGroupDialogRef} role="dialog" aria-label={locale === "ru" ? "Сохранённые результаты в этой точке" : "Saved results at this location"} data-testid="project-location-picker" className="absolute left-3 right-3 top-40 z-20 max-h-[60%] max-w-sm overflow-y-auto rounded-xl border border-[#d7dee4] bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#087f8c]">{locale === "ru" ? "Выберите результат" : "Choose a saved result"}</p>
            <button type="button" className="min-h-11 min-w-11 rounded-lg border border-[#d7dee4] px-3 text-sm focus-visible:outline-2" onClick={() => { setOpenProjectGroup(null); projectGroupTriggerRef.current?.focus(); }}>{locale === "ru" ? "Закрыть" : "Close"}</button>
          </div>
          <div className="grid gap-2">
            {openProjectGroup.map(result => <button key={result.id} type="button" disabled={projectResultOpening} data-project-location-result={result.id} className="min-h-11 rounded-lg border border-[#d7dee4] px-3 py-2 text-left text-sm font-semibold text-[#087f8c] focus-visible:outline-2" onClick={() => openProjectResult(result.id)}>{result.label}</button>)}
          </div>
        </div>
      ) : null}
      {projectResultOpenError ? <p role="alert" className="absolute left-3 top-28 z-20 rounded-lg border border-[#d7dee4] bg-white p-3 text-sm">{locale === "ru" ? "Не удалось открыть результат. Попробуйте ещё раз." : "Could not open this result. Please try again."}</p> : null}
      {(projectMarkers.length || interactionMode === "find") && (projectMarkers.length ? projectResultCoordinateBounds(projectMarkers) : liveFindResultBounds(findResults)) ? (
        <button type="button" data-testid={projectMarkers.length ? "project-fit-results" : "find-fit-results"} onClick={fitFindResults} className="absolute right-3 top-28 z-10 min-h-11 rounded-xl border border-[#d7dee4] bg-white px-3 text-xs font-bold text-[#087f8c] shadow-sm focus-visible:outline-2 focus-visible:outline-[#087f8c]">
          {locale === "ru" ? "Все результаты" : "Fit results"}
        </button>
      ) : null}
      <div ref={cameraControlsRef} data-map-bottom-controls data-camera-open={cameraOpen} className="absolute bottom-8 left-3 z-10 flex max-w-[calc(100%-6rem)] flex-wrap items-center gap-2 sm:bottom-3">
        <button type="button" data-camera-toggle aria-expanded={cameraOpen} aria-controls="mobile-camera-actions" onClick={() => setCameraOpen((open) => !open)} className="min-h-11 rounded-xl border border-line bg-white px-3 text-xs font-bold text-[#087f8c] focus-visible:outline-2 focus-visible:outline-[#087f8c] lg:hidden">{locale === "ru" ? "Камера" : "Camera"}</button>
        <div className="inline-flex rounded-xl border border-white/80 bg-white/95 p-1 shadow-sm backdrop-blur" role="group" aria-label={t("map.dimension")} data-testid="map-dimension-control">
          {(["2d", "3d"] as MapViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => changeViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`min-h-11 rounded-lg px-3 text-xs font-bold uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${viewMode === mode ? "bg-[#087f8c] text-white" : "text-[#475467] hover:bg-[#f1f4f6]"}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 text-xs font-semibold text-[#475467] shadow-sm backdrop-blur">
          <span>{t("map.style")}</span>
          <select
            value={basemapId}
            onChange={(event) => changeBasemap(event.target.value as LiveMapBasemapId)}
            className="bg-transparent font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"
            aria-label={t("map.style")}
          >
            {BASEMAPS.map((item) => <option key={item.id} value={item.id}>{t(item.labelKey)}</option>)}
          </select>
        </label>
        {viewMode === "3d" && selectionCanShowVolume(selection) ? (
          <button
            type="button"
            onClick={toggleSelectedVolume}
            aria-pressed={showSelectedVolume}
            className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-white/80 px-3 py-2 text-xs font-bold leading-none shadow-sm backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${showSelectedVolume ? "bg-[#087f8c] text-white" : "bg-white/95 text-[#475467]"}`}
          >
            {t("map.volume")}
          </button>
        ) : null}
        {cameraOpen ? <div id="mobile-camera-actions" className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 lg:hidden">
          {([
            [locale === "ru" ? "Повернуть влево" : "Rotate left", -30, 0],
            [locale === "ru" ? "Повернуть вправо" : "Rotate right", 30, 0],
            [locale === "ru" ? "Наклонить вверх" : "Tilt up", 0, 15],
            [locale === "ru" ? "Наклонить вниз" : "Tilt down", 0, -15]
          ] as const).map(([label, bearing, pitch]) => <button key={label} type="button" className="min-h-11 rounded-lg px-2 text-xs font-semibold focus-visible:outline-2" onClick={() => { const map = mapRef.current; if (map) map.easeTo({ bearing: map.getBearing() + bearing, pitch: Math.max(0, Math.min(70, map.getPitch() + pitch)), duration: 200 }); }}>{label}</button>)}
          <button type="button" className="col-span-2 min-h-11 rounded-lg text-xs font-semibold focus-visible:outline-2" onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: 200 })}>{locale === "ru" ? "Север вверх" : "Reset north"}</button>
        </div> : null}
      </div>
      {viewMode === "3d" ? (
        <p data-map-gesture-hint className="pointer-events-none absolute bottom-[62px] left-3 z-10 hidden rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-[#475467] shadow-sm backdrop-blur sm:block">
          {t("map.rotate")}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {selection
          ? t("map.selectedAt", { name: selection.object.name ?? selection.object.featureClass, latitude: selection.latitude.toFixed(6), longitude: selection.longitude.toFixed(6) })
          : isReady ? t(readyKey) : t("map.loading")}
      </p>
      {!isReady && !error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#f4f6f7] text-sm font-medium text-[#52606a]" role="status">
          {t("map.loading")}
        </div>
      ) : null}
      {error ? (
        <div className={`absolute z-20 grid place-items-center p-4 text-center text-sm text-[#52606a] ${isReady ? "left-3 right-3 top-3 rounded-xl border border-[#d7dee4] bg-white/95 shadow-sm" : "inset-0 bg-[#f4f6f7]"}`} role="alert">
          <span>{error}</span>
          <button type="button" onClick={retryMap} className="mt-3 min-h-10 rounded-lg bg-[#087f8c] px-4 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
            {t("map.reload")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
