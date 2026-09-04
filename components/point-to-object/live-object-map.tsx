"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { ExpressionSpecification, FilterSpecification, GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";

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
import type { PointObjectFindBounds } from "@/src/lib/prototype/point-to-object-find-contract";
import {
  buildPointObjectBuildingReplacementFilter,
  restorePointObjectMapFilter,
  snapshotPointObjectMapFilter,
  type PointObjectMapFilterSnapshot
} from "@/src/lib/prototype/point-to-object-map-replacement";
import { pointObjectMarket } from "@/src/lib/prototype/point-to-object-markets";

const BASEMAPS: Array<{ id: LiveMapBasemapId; labelKey: "map.style.street" | "map.style.light" | "map.style.contrast"; styleUrl: string }> = [
  { id: "street", labelKey: "map.style.street", styleUrl: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "light", labelKey: "map.style.light", styleUrl: "https://tiles.openfreemap.org/styles/positron" },
  { id: "contrast", labelKey: "map.style.contrast", styleUrl: "https://tiles.openfreemap.org/styles/bright" }
];
export type LiveMapViewMode = "2d" | "3d";
export type LiveMapInteractionMode = "analyse" | "find" | "create";
export type PointObjectReplacementStatus = "idle" | "applied" | "error";
type MapViewMode = LiveMapViewMode;
const CAMERA: Record<MapViewMode, { pitch: number; bearing: number }> = {
  "2d": { pitch: 0, bearing: 0 },
  "3d": { pitch: 55, bearing: -25 }
};
const BUILDINGS_3D_LAYER_ID = "geoai-buildings-3d";
const HIGHLIGHT_SOURCE_ID = "geoai-live-selection";
const HIGHLIGHT_FILL_LAYER_ID = "geoai-live-selection-fill";
const HIGHLIGHT_VOLUME_LAYER_ID = "geoai-live-selection-volume";
const HIGHLIGHT_LINE_LAYER_ID = "geoai-live-selection-line";
const HIGHLIGHT_POINT_LAYER_ID = "geoai-live-selection-point";
const CREATE_AOI_SOURCE_ID = "geoai-create-aoi";
const CREATE_AOI_FILL_LAYER_ID = "geoai-create-aoi-fill";
const CREATE_AOI_LINE_LAYER_ID = "geoai-create-aoi-line";
const CREATE_AOI_VERTEX_LAYER_ID = "geoai-create-aoi-vertices";
const CONCEPT_SOURCE_ID = "geoai-concept-massing";
const CONCEPT_FILL_LAYER_ID = "geoai-concept-fill";
const CONCEPT_VOLUME_LAYER_ID = "geoai-concept-volume";
const MAX_GEOMETRY_POSITIONS = 5_000;
const MAX_NEARBY_LABELS = 5;
const EMPTY_CREATE_COORDINATES: Wgs84Position[] = [];
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
  onSelection: (selection: LiveMapSelection | null) => void;
  onViewportChange?: (selection: LiveMapSelection) => void;
  onVisibleBoundsChange?: (bounds: PointObjectFindBounds) => void;
  navigationTarget?: LiveMapNavigationTarget | null;
  viewModeRequest?: { requestId: string; mode: LiveMapViewMode } | null;
  interactionMode?: LiveMapInteractionMode;
  createDrawing?: boolean;
  createDraftCoordinates?: Wgs84Position[];
  createAoi?: PointObjectCreateAoi | null;
  createAreaCleared?: boolean;
  conceptMassing?: ConceptMassingResult | null;
  onCreateVertex?: (coordinate: Wgs84Position) => void;
  onReplacementStatus?: (status: PointObjectReplacementStatus) => void;
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

function safeFeatureId(feature: MapGeoJSONFeature): string | null {
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

function sourceLayerOf(feature: MapGeoJSONFeature): string | null {
  const value = safeText(feature.sourceLayer, 80);
  return value && SELECTABLE_SOURCE_LAYERS.has(value) ? value : null;
}

function featureName(feature: MapGeoJSONFeature): string | null {
  return firstSafeProperty(feature.properties, NAME_PROPERTY_KEYS, 160);
}

function featureClass(feature: MapGeoJSONFeature): string {
  const sourceLayer = sourceLayerOf(feature);
  return firstSafeProperty(feature.properties, CLASS_PROPERTY_KEYS, 80) ?? sourceLayer ?? "location";
}

function featureGeometryBounds(feature: MapGeoJSONFeature): [number, number, number, number] | null {
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
  viewportBounds: [west: number, south: number, east: number, north: number]
): number {
  if (feature.source === HIGHLIGHT_SOURCE_ID) return -1;
  const sourceLayer = sourceLayerOf(feature);
  if (!sourceLayer) return -1;

  const isBuilding = sourceLayer === "building" || feature.layer?.id.toLowerCase().includes("building");
  const isPolygon = feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon";
  const name = featureName(feature);
  if (isPolygon) {
    const bounds = featureGeometryBounds(feature);
    if (!bounds) return -1;
    if (NON_OBJECT_POLYGON_SOURCE_LAYERS.has(sourceLayer)) return -1;
    const featureClassName = firstSafeProperty(feature.properties, CLASS_PROPERTY_KEYS, 80)?.toLowerCase() ?? null;
    if (sourceLayer === "landuse" && (!featureClassName || !SELECTABLE_LANDUSE_CLASSES.has(featureClassName))) return -1;
    const viewportWidth = Math.max(1e-9, viewportBounds[2] - viewportBounds[0]);
    const viewportHeight = Math.max(1e-9, viewportBounds[3] - viewportBounds[1]);
    if ((bounds[2] - bounds[0]) / viewportWidth >= 0.8 || (bounds[3] - bounds[1]) / viewportHeight >= 0.8) return -1;
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
  viewportBounds: [west: number, south: number, east: number, north: number]
): MapGeoJSONFeature | null {
  return features
    .map((feature, index) => ({ feature, index, score: featureScore(feature, zoom, viewportBounds) }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.feature ?? null;
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
    (selection.object.geometry.type === "Polygon" || selection.object.geometry.type === "MultiPolygon") &&
    selection.object.renderHeightM !== null &&
    selection.object.renderHeightM > 0
  );
}

function setSelectedVolumeVisibility(
  map: MapLibreMap,
  selection: LiveMapSelection | null,
  viewMode: MapViewMode,
  showVolume: boolean
) {
  if (!map.getLayer(HIGHLIGHT_VOLUME_LAYER_ID)) return;
  map.setLayoutProperty(
    HIGHLIGHT_VOLUME_LAYER_ID,
    "visibility",
    viewMode === "3d" && showVolume && selectionCanShowVolume(selection) ? "visible" : "none"
  );
}

function setHighlight(
  map: MapLibreMap,
  selection: LiveMapSelection | null,
  viewMode: MapViewMode,
  showVolume: boolean
) {
  const source = map.getSource(HIGHLIGHT_SOURCE_ID) as GeoJSONSource | undefined;
  if (!source) return;
  const geometry = selection?.object.geometry ?? (selection
    ? { type: "Point" as const, coordinates: [selection.longitude, selection.latitude] }
    : null);
  const data: Feature<Geometry> | { type: "FeatureCollection"; features: [] } = geometry
    ? {
        type: "Feature",
        properties: {
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
    features.push({ type: "Feature", properties: { kind: "aoi" }, geometry: { type: "Polygon", coordinates: [ring] } });
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
      (candidate.type === "fill" || candidate.type === "fill-extrusion") &&
      candidate.source === "openmaptiles" &&
      candidate["source-layer"] === "building"
    );
    return isBuildingLayer ? [candidate.id] : [];
  });
}

function resetBuildingFilterSnapshots(map: MapLibreMap) {
  BUILDING_FILTER_SNAPSHOTS.delete(map);
}

function snapshotBuildingFilters(map: MapLibreMap): Map<string, PointObjectMapFilterSnapshot> {
  const existing = BUILDING_FILTER_SNAPSHOTS.get(map);
  if (existing) return existing;
  const snapshots = new Map<string, PointObjectMapFilterSnapshot>();
  for (const layerId of buildingLayerIds(map)) {
    snapshots.set(layerId, snapshotPointObjectMapFilter(map.getFilter(layerId) as FilterSpecification | null | undefined));
  }
  BUILDING_FILTER_SNAPSHOTS.set(map, snapshots);
  return snapshots;
}

function restoreBuildingFilters(map: MapLibreMap) {
  const snapshots = BUILDING_FILTER_SNAPSHOTS.get(map);
  if (!snapshots) return;
  for (const [layerId, snapshot] of snapshots) {
    if (map.getLayer(layerId)) map.setFilter(layerId, restorePointObjectMapFilter(snapshot));
  }
}

function applyBuildingReplacement(map: MapLibreMap, aoi: PointObjectCreateAoi): boolean {
  const snapshots = snapshotBuildingFilters(map);
  const layerIds = buildingLayerIds(map);
  if (!layerIds.length || layerIds.some((layerId) => !snapshots.has(layerId))) return false;
  const plans = layerIds.map((layerId) => ({
    layerId,
    plan: buildPointObjectBuildingReplacementFilter(
      restorePointObjectMapFilter(snapshots.get(layerId)!),
      { type: "Polygon", coordinates: aoi.coordinates }
    )
  }));
  if (plans.some(({ plan }) => !plan.applied || !plan.filter)) return false;
  try {
    for (const { layerId, plan } of plans) map.setFilter(layerId, plan.filter);
    return true;
  } catch {
    restoreBuildingFilters(map);
    return false;
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
  if (suppressExistingBuildings && aoi) {
    replacementStatus = applyBuildingReplacement(map, aoi) ? "applied" : "error";
  } else {
    restoreBuildingFilters(map);
  }
  const canShowConcept = Boolean(massing && replacementStatus === "applied");
  if (map.getLayer(CONCEPT_FILL_LAYER_ID)) map.setLayoutProperty(CONCEPT_FILL_LAYER_ID, "visibility", canShowConcept && viewMode === "2d" ? "visible" : "none");
  if (map.getLayer(CONCEPT_VOLUME_LAYER_ID)) map.setLayoutProperty(CONCEPT_VOLUME_LAYER_ID, "visibility", canShowConcept && viewMode === "3d" ? "visible" : "none");
  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) map.setLayoutProperty(BUILDINGS_3D_LAYER_ID, "visibility", viewMode === "3d" ? "visible" : "none");
  return replacementStatus;
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
      layout: { visibility: viewMode === "3d" ? "visible" : "none" },
      paint: {
        "fill-extrusion-color": "#d6dcdf",
        "fill-extrusion-height": ["coalesce", ["to-number", ["get", "render_height"]], 0],
        "fill-extrusion-base": ["coalesce", ["to-number", ["get", "render_min_height"]], 0],
        "fill-extrusion-opacity": 0.82,
        "fill-extrusion-vertical-gradient": true
      }
    }, labelLayer);
  }
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
      "fill-color": "#116b78",
      "fill-opacity": 0.28
    }
  }, labelLayer);
  if (!map.getLayer(HIGHLIGHT_VOLUME_LAYER_ID)) map.addLayer({
    id: HIGHLIGHT_VOLUME_LAYER_ID,
    type: "fill-extrusion",
    source: HIGHLIGHT_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": "#0f7c88",
      "fill-extrusion-height": ["get", "renderHeightM"],
      "fill-extrusion-base": ["get", "renderMinHeightM"],
      "fill-extrusion-opacity": 0.58,
      "fill-extrusion-vertical-gradient": true
    }
  }, labelLayer);
  if (!map.getLayer(HIGHLIGHT_LINE_LAYER_ID)) map.addLayer({
    id: HIGHLIGHT_LINE_LAYER_ID,
    type: "line",
    source: HIGHLIGHT_SOURCE_ID,
    filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]],
    paint: {
      "line-color": "#0b5261",
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
      "circle-stroke-color": "#0b5261",
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
    paint: { "line-color": "#087f70", "line-width": 3, "line-dasharray": [2, 1] }
  }, labelLayer);
  if (!map.getLayer(CREATE_AOI_VERTEX_LAYER_ID)) map.addLayer({
    id: CREATE_AOI_VERTEX_LAYER_ID,
    type: "circle",
    source: CREATE_AOI_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-color": "#ffffff", "circle-radius": 5, "circle-stroke-color": "#087f70", "circle-stroke-width": 2 }
  }, labelLayer);
  if (!map.getSource(CONCEPT_SOURCE_ID)) map.addSource(CONCEPT_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const conceptColor: ExpressionSpecification = ["match", ["get", "use"], "residential", "#77b7a7", "office", "#4f8fa3", "retail", "#d5a54b", "hospitality", "#9c78b5", "civic", "#6f9b68", "#87a7a1"];
  if (!map.getLayer(CONCEPT_FILL_LAYER_ID)) map.addLayer({
    id: CONCEPT_FILL_LAYER_ID,
    type: "fill",
    source: CONCEPT_SOURCE_ID,
    layout: { visibility: "none" },
    paint: { "fill-color": conceptColor, "fill-opacity": 0.68, "fill-outline-color": "#285951" }
  }, labelLayer);
  if (!map.getLayer(CONCEPT_VOLUME_LAYER_ID)) map.addLayer({
    id: CONCEPT_VOLUME_LAYER_ID,
    type: "fill-extrusion",
    source: CONCEPT_SOURCE_ID,
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": conceptColor,
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
  onSelection,
  onViewportChange,
  onVisibleBoundsChange,
  navigationTarget = null,
  viewModeRequest = null,
  interactionMode = "analyse",
  createDrawing = false,
  createDraftCoordinates = EMPTY_CREATE_COORDINATES,
  createAoi = null,
  createAreaCleared = false,
  conceptMassing = null,
  onCreateVertex,
  onReplacementStatus
}: LiveObjectMapProps) {
  const { locale, t } = usePointObjectLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectAtRef = useRef<((point: { x: number; y: number }, clicked: Wgs84Position) => void) | null>(null);
  const handledNavigationTargetRef = useRef<string | null>(null);
  const handledViewModeRequestRef = useRef<string | null>(null);
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
  const replacementStatusCallbackRef = useRef(onReplacementStatus);
  const createDraftRef = useRef(createDraftCoordinates);
  const createAoiRef = useRef(createAoi);
  const createAreaClearedRef = useRef(createAreaCleared);
  const conceptMassingRef = useRef(conceptMassing);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [viewMode, setViewMode] = useState<MapViewMode>("3d");
  const [basemapId, setBasemapId] = useState<LiveMapBasemapId>("street");
  const [showSelectedVolume, setShowSelectedVolume] = useState(true);

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
    interactionModeRef.current = interactionMode;
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = interactionMode === "create" && createDrawingRef.current ? "crosshair" : "";
    if (interactionMode !== "analyse" && map.isStyleLoaded()) {
      selectionRef.current = null;
      setHighlight(map, null, viewModeRef.current, showSelectedVolumeRef.current);
    }
  }, [interactionMode]);

  useEffect(() => {
    createDrawingRef.current = createDrawing;
    createVertexCallbackRef.current = onCreateVertex;
    createDraftRef.current = createDraftCoordinates;
    createAoiRef.current = createAoi;
    createAreaClearedRef.current = createAreaCleared;
    conceptMassingRef.current = conceptMassing;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
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
  }, [conceptMassing, createAoi, createAreaCleared, createDraftCoordinates, createDrawing, onCreateVertex]);

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
    map.setMaxBounds([ [...view.bounds[0]], [...view.bounds[1]] ]);
    map.easeTo({ center: [...view.center], zoom: view.zoom, ...CAMERA[viewModeRef.current], duration: 650 });
    map.once("idle", () => setIsReady(true));
  }, [locationKey]);

  useEffect(() => {
    if (!navigationTarget || !isReady || handledNavigationTargetRef.current === navigationTarget.requestId) return;
    const map = mapRef.current;
    if (!map || !selectAtRef.current) return;
    handledNavigationTargetRef.current = navigationTarget.requestId;
    const coordinates: Wgs84Position = [navigationTarget.longitude, navigationTarget.latitude];
    let selectionCompleted = false;
    const selectAfterMove = () => {
      if (selectionCompleted || !selectAtRef.current || !map.isStyleLoaded()) return;
      selectionCompleted = true;
      if (navigationTarget.expectedSourceFeatureId) {
        const center = map.getCenter();
        const exactSelection: LiveMapSelection = {
          locationKey: locationKeyRef.current,
          longitude: coordinates[0],
          latitude: coordinates[1],
          clickedAt: new Date().toISOString(),
          object: {
            name: navigationTarget.expectedLabel ?? null,
            featureClass: navigationTarget.expectedFeatureClass ?? "open_map_object",
            sourceFeatureId: navigationTarget.expectedSourceFeatureId,
            geometry: { type: "Point", coordinates },
            renderHeightM: null,
            renderMinHeightM: null
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
      map.fitBounds([[west, south], [east, north]], { padding: 72, maxZoom: navigationTarget.zoom ?? 18, duration: 650 });
    } else {
      map.easeTo({ center: coordinates, zoom: navigationTarget.zoom ?? 18, duration: 650 });
    }
    return () => {
      map.off("moveend", selectAfterMove);
      map.off("idle", selectAfterMove);
      window.clearTimeout(fallbackTimer);
    };
  }, [isReady, navigationTarget]);

  useEffect(() => {
    if (!viewModeRequest || handledViewModeRequestRef.current === viewModeRequest.requestId) return;
    handledViewModeRequestRef.current = viewModeRequest.requestId;
    changeViewMode(viewModeRequest.mode);
  }, [viewModeRequest]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    void import("maplibre-gl")
      .then((maplibregl) => {
        if (disposed || !containerRef.current) return;
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

        const handleStyleReady = () => {
          if (disposed) return;
          resetBuildingFilterSnapshots(map);
          installGeoAiLayers(map, viewModeRef.current);
          // Camera state is independent of the style lifecycle. Reinstall only
          // mode-specific handlers and layer visibility here so a basemap load
          // cannot overwrite a user's rotation or a 2D/3D choice made mid-load.
          applyViewMode(map, viewModeRef.current, createAreaClearedRef.current, false, false);
          setHighlight(map, selectionRef.current, viewModeRef.current, showSelectedVolumeRef.current);
          const replacementStatus = setCreateLayers(map, createDraftRef.current, createAoiRef.current, createAreaClearedRef.current, conceptMassingRef.current, viewModeRef.current);
          replacementStatusCallbackRef.current?.(replacementStatus);
          setError(null);
          setIsReady(true);
        };
        map.on("style.load", handleStyleReady);

        const selectAt = (
          point: { x: number; y: number },
          clicked: Wgs84Position
        ) => {
          if (!map.isStyleLoaded()) return;
          const visibleBounds = map.getBounds();
          const selectedFeature = selectFeature(
            map.queryRenderedFeatures([point.x, point.y]),
            map.getZoom(),
            [visibleBounds.getWest(), visibleBounds.getSouth(), visibleBounds.getEast(), visibleBounds.getNorth()]
          );
          const selectedGeometry = selectedFeature ? sanitizeGeometry(selectedFeature.geometry) : null;
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
              geometry: selectedGeometry,
              renderHeightM: selectedFeature
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
          if (interactionModeRef.current === "create" && createDrawingRef.current) {
            createVertexCallbackRef.current?.([event.lngLat.lng, event.lngLat.lat]);
            return;
          }
          if (interactionModeRef.current !== "analyse") return;
          selectAt(event.point, [event.lngLat.lng, event.lngLat.lat]);
        };

        const handleMoveEnd = () => {
          const visibleBounds = map.getBounds();
          visibleBoundsCallbackRef.current?.([visibleBounds.getWest(), visibleBounds.getSouth(), visibleBounds.getEast(), visibleBounds.getNorth()]);
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

        map.once("load", () => {
          if (disposed) return;
          map.resize();
          const visibleBounds = map.getBounds();
          visibleBoundsCallbackRef.current?.([visibleBounds.getWest(), visibleBounds.getSouth(), visibleBounds.getEast(), visibleBounds.getNorth()]);
          setError(null);
          setIsReady(true);
        });
        map.on("click", handleClick);
        map.on("moveend", handleMoveEnd);
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
        resetBuildingFilterSnapshots(map);
        map.remove();
      }
    };
  }, [retryVersion]);

  function changeViewMode(nextMode: MapViewMode) {
    if (nextMode === viewModeRef.current) return;
    viewModeRef.current = nextMode;
    setViewMode(nextMode);
    const map = mapRef.current;
    const current = selectionRef.current;
    if (current) {
      const nextSelection: LiveMapSelection = {
        ...current,
        viewport: { ...current.viewport, ...CAMERA[nextMode], viewMode: nextMode }
      };
      selectionRef.current = nextSelection;
      viewportCallbackRef.current?.(nextSelection);
    }
    if (!map) return;
    // MapLibre camera operations remain available while a style is loading.
    // Applying the mode immediately eliminates the style.load/toggle race.
    applyViewMode(map, nextMode, createAreaClearedRef.current);
    if (!map.isStyleLoaded()) return;
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
      <div ref={containerRef} className="absolute inset-0" />
      <p id="live-map-instructions" className="sr-only">
        {t(instructionKey)}
      </p>
      <div className="absolute bottom-8 left-3 z-10 flex max-w-[calc(100%-6rem)] flex-wrap items-center gap-2 sm:bottom-3">
        <div className="inline-flex rounded-xl border border-white/80 bg-white/95 p-1 shadow-sm backdrop-blur" role="group" aria-label={t("map.dimension")}>
          {(["2d", "3d"] as MapViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => changeViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`min-h-9 rounded-lg px-3 text-xs font-bold uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${viewMode === mode ? "bg-[#087f8c] text-white" : "text-[#475467] hover:bg-[#f1f4f6]"}`}
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
            className={`min-h-11 rounded-xl border border-white/80 px-3 text-xs font-bold shadow-sm backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${showSelectedVolume ? "bg-[#087f8c] text-white" : "bg-white/95 text-[#475467]"}`}
          >
            {t("map.volume")}
          </button>
        ) : null}
      </div>
      {viewMode === "3d" ? (
        <p className="pointer-events-none absolute bottom-[62px] left-3 z-10 hidden rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-[#475467] shadow-sm backdrop-blur sm:block">
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
