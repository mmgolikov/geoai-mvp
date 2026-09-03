"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import type { Feature, Geometry, Position } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";

import type {
  LiveMapLocationKey,
  LiveMapNearbyLabel,
  LiveMapSelection,
  Wgs84Position
} from "@/components/point-to-object/live-types";
import type { GeoJsonGeometry } from "@/src/lib/point-to-object/contracts";

const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const HIGHLIGHT_SOURCE_ID = "geoai-live-selection";
const HIGHLIGHT_FILL_LAYER_ID = "geoai-live-selection-fill";
const HIGHLIGHT_LINE_LAYER_ID = "geoai-live-selection-line";
const HIGHLIGHT_POINT_LAYER_ID = "geoai-live-selection-point";
const MAX_GEOMETRY_POSITIONS = 5_000;
const MAX_NEARBY_LABELS = 5;

const MARKET_VIEW: Record<LiveMapLocationKey, { center: Wgs84Position; zoom: number; label: string }> = {
  dubai: {
    center: [55.2818037, 25.2191],
    zoom: 16.8,
    label: "Dubai, Museum of the Future"
  },
  singapore: {
    center: [103.8605263, 1.2827539],
    zoom: 16.6,
    label: "Singapore, Marina Bay"
  }
};

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

const NAME_PROPERTY_KEYS = ["name", "name_en", "name:en", "name_int", "ref"] as const;
const CLASS_PROPERTY_KEYS = ["class", "subclass", "type"] as const;

export type LiveObjectMapProps = {
  locationKey?: LiveMapLocationKey;
  selection?: LiveMapSelection | null;
  className?: string;
  onSelection: (selection: LiveMapSelection | null) => void;
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

function featureScore(feature: MapGeoJSONFeature): number {
  if (feature.source === HIGHLIGHT_SOURCE_ID) return -1;
  const sourceLayer = sourceLayerOf(feature);
  if (!sourceLayer) return -1;

  let score = 0;
  if (sourceLayer === "building" || feature.layer?.id.toLowerCase().includes("building")) score += 1_000;
  if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") score += 400;
  if (featureName(feature)) score += 80;
  if (sourceLayer === "poi") score += 40;
  if (feature.geometry.type === "Point" || feature.geometry.type === "MultiPoint") score += 20;
  return score;
}

function selectFeature(features: MapGeoJSONFeature[]): MapGeoJSONFeature | null {
  return features
    .map((feature, index) => ({ feature, index, score: featureScore(feature) }))
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

function setHighlight(map: MapLibreMap, geometry: GeoJsonGeometry | null) {
  const source = map.getSource(HIGHLIGHT_SOURCE_ID) as GeoJSONSource | undefined;
  if (!source) return;
  const data: Feature<Geometry> | { type: "FeatureCollection"; features: [] } = geometry
    ? { type: "Feature", properties: {}, geometry }
    : { type: "FeatureCollection", features: [] };
  source.setData(data);
}

function installHighlightLayers(map: MapLibreMap) {
  if (map.getSource(HIGHLIGHT_SOURCE_ID)) return;
  map.addSource(HIGHLIGHT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });
  map.addLayer({
    id: HIGHLIGHT_FILL_LAYER_ID,
    type: "fill",
    source: HIGHLIGHT_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "fill-color": "#116b78",
      "fill-opacity": 0.28
    }
  });
  map.addLayer({
    id: HIGHLIGHT_LINE_LAYER_ID,
    type: "line",
    source: HIGHLIGHT_SOURCE_ID,
    filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]],
    paint: {
      "line-color": "#0b5261",
      "line-width": 3
    }
  });
  map.addLayer({
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
  });
}

export function LiveObjectMap({ locationKey = "dubai", selection = null, className, onSelection }: LiveObjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const callbackRef = useRef(onSelection);
  const locationKeyRef = useRef(locationKey);
  const selectionRef = useRef(selection);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    callbackRef.current = onSelection;
  }, [onSelection]);

  useEffect(() => {
    selectionRef.current = selection;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setHighlight(map, selection?.object.geometry ?? (selection
      ? { type: "Point", coordinates: [selection.longitude, selection.latitude] }
      : null));
  }, [selection]);

  useEffect(() => {
    locationKeyRef.current = locationKey;
    const map = mapRef.current;
    if (!map) return;
    const view = MARKET_VIEW[locationKey];
    setError(null);
    setIsReady(false);
    setHighlight(map, null);
    map.easeTo({ center: view.center, zoom: view.zoom, duration: 650 });
    map.once("idle", () => setIsReady(true));
  }, [locationKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let selectCentreHandler: (() => void) | null = null;

    void import("maplibre-gl")
      .then((maplibregl) => {
        if (disposed || !containerRef.current) return;
        const view = MARKET_VIEW[locationKeyRef.current];
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: OPEN_FREE_MAP_STYLE,
          center: view.center,
          zoom: view.zoom,
          minZoom: 3,
          maxZoom: 20,
          pitch: 0,
          bearing: 0,
          attributionControl: false
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

        const selectAt = (
          point: { x: number; y: number },
          clicked: Wgs84Position
        ) => {
          if (!map.isStyleLoaded()) return;
          const selectedFeature = selectFeature(map.queryRenderedFeatures([point.x, point.y]));
          const selectedGeometry = selectedFeature ? sanitizeGeometry(selectedFeature.geometry) : null;
          const highlightGeometry: GeoJsonGeometry = selectedGeometry ?? { type: "Point", coordinates: clicked };
          const center = map.getCenter();

          setHighlight(map, highlightGeometry);
          callbackRef.current({
            locationKey: locationKeyRef.current,
            longitude: clicked[0],
            latitude: clicked[1],
            clickedAt: new Date().toISOString(),
            object: {
              name: selectedFeature ? featureName(selectedFeature) : null,
              featureClass: selectedFeature ? featureClass(selectedFeature) : "location",
              sourceFeatureId: selectedFeature ? safeFeatureId(selectedFeature) : null,
              geometry: selectedGeometry
            },
            viewport: {
              center: [center.lng, center.lat],
              zoom: map.getZoom()
            },
            provider: "OpenFreeMap / OpenStreetMap",
            nearbyLabels: collectNearbyLabels(map, point)
          });
        };

        const handleClick = (event: MapMouseEvent) => {
          selectAt(event.point, [event.lngLat.lng, event.lngLat.lat]);
        };

        const handleSelectCentre = () => {
          const center = map.getCenter();
          selectAt(map.project(center), [center.lng, center.lat]);
        };

        selectCentreHandler = handleSelectCentre;
        container.addEventListener("geoai:select-map-centre", handleSelectCentre);

        map.once("load", () => {
          if (disposed) return;
          installHighlightLayers(map);
          const restored = selectionRef.current;
          if (restored?.locationKey === locationKeyRef.current) {
            map.jumpTo({ center: restored.viewport.center, zoom: restored.viewport.zoom });
            setHighlight(map, restored.object.geometry ?? {
              type: "Point",
              coordinates: [restored.longitude, restored.latitude]
            });
          }
          map.resize();
          setError(null);
          setIsReady(true);
        });
        map.on("click", handleClick);
        map.on("error", (event) => {
          const message = event.error instanceof Error ? event.error.message : "";
          if (/image .+ could not be loaded|sprite/i.test(message)) return;
          if (!disposed) setError("Some live map data could not be loaded.");
        });

        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(container);
      })
      .catch(() => {
        if (!disposed) setError("The live map could not be loaded.");
      });

    return () => {
      disposed = true;
      if (selectCentreHandler) {
        container.removeEventListener("geoai:select-map-centre", selectCentreHandler);
      }
      resizeObserver?.disconnect();
      const map = mapRef.current;
      mapRef.current = null;
      map?.remove();
    };
  }, [retryVersion]);

  function selectMapCentre() {
    containerRef.current?.dispatchEvent(new Event("geoai:select-map-centre"));
  }

  function retryMap() {
    setError(null);
    setIsReady(false);
    setRetryVersion((value) => value + 1);
  }

  const containerClassName = [
    "relative h-full min-h-[420px] w-full overflow-hidden bg-[#e8edf0]",
    className
  ].filter(Boolean).join(" ");

  return (
    <div
      className={containerClassName}
      role="region"
      aria-label={`Live object map — ${MARKET_VIEW[locationKey].label}`}
      aria-describedby="live-map-instructions"
    >
      <div ref={containerRef} className="absolute inset-0" />
      <p id="live-map-instructions" className="sr-only">
        Click or tap a visible object. Keyboard users can move the map with its controls and select the map centre with the button below.
      </p>
      <button
        type="button"
        onClick={selectMapCentre}
        disabled={!isReady}
        className="absolute bottom-8 left-3 z-10 min-h-10 rounded-lg border border-[#cfd8df] bg-white/95 px-3 text-xs font-bold text-[#243447] shadow-sm backdrop-blur hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Select map centre
      </button>
      <p className="sr-only" aria-live="polite">
        {selection
          ? `${selection.object.name ?? selection.object.featureClass} selected at ${selection.latitude.toFixed(6)}, ${selection.longitude.toFixed(6)}.`
          : isReady ? "Live map ready for selection." : "Live map loading."}
      </p>
      {!isReady && !error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#f4f6f7] text-sm font-medium text-[#52606a]" role="status">
          Loading live map…
        </div>
      ) : null}
      {error ? (
        <div className={`absolute z-20 grid place-items-center p-4 text-center text-sm text-[#52606a] ${isReady ? "left-3 right-3 top-3 rounded-xl border border-[#d7dee4] bg-white/95 shadow-sm" : "inset-0 bg-[#f4f6f7]"}`} role="alert">
          <span>{error}</span>
          <button type="button" onClick={retryMap} className="mt-3 min-h-10 rounded-lg bg-ink px-4 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            Reload map
          </button>
        </div>
      ) : null}
    </div>
  );
}
