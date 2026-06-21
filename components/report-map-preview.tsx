"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { demoLayers, getDemoFeatureById } from "@/src/data/demo-layers";
import { openGeodataBaseline } from "@/src/lib/open-geodata";
import type { OpenLanduseFeature, OpenPoiFeature, OpenRoadFeature } from "@/src/lib/open-geodata";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import type { AnalysisTarget, ComparisonResult, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

type ReportMapPreviewProps = {
  selectedPoint?: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  analysisTarget?: AnalysisTarget | null;
  comparison?: ComparisonResult;
  compact?: boolean;
};

type MapMarker = {
  label: string;
  point: SelectedPoint;
};

const defaultCenter: [number, number] = [55.2708, 25.2048];

function getMapboxToken() {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

function hasUsableMapboxToken(token: string) {
  return token.startsWith("pk.");
}

function getFallbackMarkerStyle(point: SelectedPoint) {
  const left = ((point.longitude - 54.85) / 0.78) * 100;
  const top = ((25.45 - point.latitude) / 0.72) * 100;

  return {
    left: `${Math.min(Math.max(left, 8), 92)}%`,
    top: `${Math.min(Math.max(top, 12), 88)}%`
  };
}

function coordinateToFallbackPosition([longitude, latitude]: [number, number]) {
  const left = ((longitude - 54.85) / 0.78) * 100;
  const top = ((25.45 - latitude) / 0.72) * 100;

  return {
    left: Math.min(Math.max(left, 8), 92),
    top: Math.min(Math.max(top, 12), 88)
  };
}

function getFallbackFeatureStyle(feature: GeoJSON.Feature) {
  const coordinates = collectGeometryCoordinates(feature.geometry);
  if (coordinates.length === 0) return null;

  const positions = coordinates.map(coordinateToFallbackPosition);
  const minLeft = Math.min(...positions.map((position) => position.left));
  const maxLeft = Math.max(...positions.map((position) => position.left));
  const minTop = Math.min(...positions.map((position) => position.top));
  const maxTop = Math.max(...positions.map((position) => position.top));
  const width = Math.max(maxLeft - minLeft, 6);
  const height = Math.max(maxTop - minTop, 6);

  return {
    left: `${minLeft}%`,
    top: `${minTop}%`,
    width: `${width}%`,
    height: `${height}%`
  };
}

function getMarkers({
  selectedPoint,
  selectedObject,
  comparison
}: ReportMapPreviewProps): MapMarker[] {
  if (comparison) {
    return comparison.items.map((item, index) => ({
      label: `Option ${index + 1}`,
      point: item.item.point
    }));
  }

  const point = selectedObject?.center ?? selectedPoint;
  return point ? [{ label: selectedObject?.name ?? "Selected point", point }] : [];
}

function getSelectedFeatures(selectedObject?: SelectedDemoObject | null, comparison?: ComparisonResult) {
  if (comparison) {
    return comparison.items
      .map((item) => {
        const target = item.item.selectedObject?.analysisTarget;
        if (target?.geometry) {
          return {
            type: "Feature",
            id: target.id,
            properties: {
              id: target.id,
              name: target.label,
              fillColor: target.type === "uploaded-feature" ? "#6b7fd7" : "#174f63",
              strokeColor: target.type === "uploaded-feature" ? "#3447a5" : "#0b5a6e"
            },
            geometry: target.geometry
          } satisfies GeoJSON.Feature;
        }

        const demoId = item.item.selectedObject?.id;
        return demoId ? getDemoFeatureById(demoId) : null;
      })
      .filter(Boolean) as GeoJSON.Feature[];
  }

  const target = selectedObject?.analysisTarget;
  if (target?.geometry) {
    return [
      {
        type: "Feature",
        id: target.id,
        properties: {
          id: target.id,
          name: target.label,
          fillColor: target.type === "uploaded-feature" ? "#6b7fd7" : "#174f63",
          strokeColor: target.type === "uploaded-feature" ? "#3447a5" : "#0b5a6e"
        },
        geometry: target.geometry
      } satisfies GeoJSON.Feature
    ];
  }

  const feature = selectedObject ? getDemoFeatureById(selectedObject.id) : null;
  return feature ? [feature] : [];
}

function toFeatureCollection(features: unknown[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features as GeoJSON.Feature[]
  };
}

function collectGeometryCoordinates(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === "Point") return [geometry.coordinates as [number, number]];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") return geometry.coordinates as [number, number][];
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") return geometry.coordinates.flat(1) as [number, number][];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2) as [number, number][];
  return [];
}

function getFeatureBounds(features: GeoJSON.Feature[]) {
  const coordinates = features.flatMap((feature) => collectGeometryCoordinates(feature.geometry));
  if (coordinates.length === 0) {
    return null;
  }

  return coordinates.reduce(
    (bounds, coordinate) => ({
      minLng: Math.min(bounds.minLng, coordinate[0]),
      minLat: Math.min(bounds.minLat, coordinate[1]),
      maxLng: Math.max(bounds.maxLng, coordinate[0]),
      maxLat: Math.max(bounds.maxLat, coordinate[1])
    }),
    {
      minLng: coordinates[0][0],
      minLat: coordinates[0][1],
      maxLng: coordinates[0][0],
      maxLat: coordinates[0][1]
    }
  );
}

function openRoadToFeature(road: OpenRoadFeature): GeoJSON.Feature {
  return {
    type: "Feature",
    id: road.id,
    properties: { id: road.id, name: road.name, kind: "open-road", roadClass: road.roadClass },
    geometry: road.geometry
  };
}

function openPoiToFeature(poi: OpenPoiFeature): GeoJSON.Feature {
  return {
    type: "Feature",
    id: poi.id,
    properties: { id: poi.id, name: poi.name, kind: "open-poi", category: poi.category },
    geometry: {
      type: "Point",
      coordinates: [poi.coordinates.longitude, poi.coordinates.latitude]
    }
  };
}

function openLanduseToFeature(landuse: OpenLanduseFeature): GeoJSON.Feature {
  return {
    type: "Feature",
    id: landuse.id,
    properties: { id: landuse.id, name: landuse.name, kind: "open-landuse", landuseClass: landuse.landuseClass },
    geometry: landuse.geometry
  };
}

function FallbackMap({
  markers,
  message,
  selectedFeatures = []
}: {
  markers: MapMarker[];
  selectedFeatures?: GeoJSON.Feature[];
  message?: string;
}) {
  return (
    <div className="relative h-full min-h-[260px] w-full overflow-hidden bg-[#dfe8ec] bg-[linear-gradient(90deg,rgba(23,79,99,0.12)_1px,transparent_1px),linear-gradient(rgba(23,79,99,0.12)_1px,transparent_1px)] bg-[size:38px_38px]">
      <div className="absolute inset-x-8 top-10 h-20 rotate-[-7deg] rounded-full border border-[#4d7c0f]/40 bg-[#4d7c0f]/10" />
      <div className="absolute bottom-10 left-10 h-24 w-44 rounded-[40%] border border-[#2c7fb8]/45 bg-[#2c7fb8]/12" />
      <div className="absolute right-12 top-20 h-28 w-48 rounded-[45%] border border-[#c5a76a]/55 bg-[#c5a76a]/14" />
      {selectedFeatures.map((feature, index) => {
        const style = getFallbackFeatureStyle(feature);
        if (!style) return null;
        const geometryType = feature.geometry.type;

        return (
          <div
            key={`${feature.id ?? feature.properties?.id ?? "selected"}-${index}`}
            className={`absolute z-10 border-2 border-brand/85 bg-brand/16 shadow-sm ${
              geometryType === "LineString" || geometryType === "MultiLineString"
                ? "h-1 rotate-[-8deg] rounded-full bg-brand/40"
                : geometryType === "Point" || geometryType === "MultiPoint"
                  ? "rounded-full"
                  : "rounded-[28%]"
            }`}
            style={style}
          />
        );
      })}
      <div className="absolute left-4 top-4 rounded-md border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Dubai map context</p>
        {message ? <p className="mt-1 text-xs text-muted">{message}</p> : null}
      </div>
      {markers.map((marker) => (
        <div
          key={marker.label}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
          style={getFallbackMarkerStyle(marker.point)}
        >
          <span className="h-4 w-4 rounded-full border-2 border-white bg-brand shadow-soft" />
          <span className="max-w-[180px] truncate rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-ink shadow-sm">
            {marker.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReportMapPreview({
  selectedPoint = null,
  selectedObject = null,
  analysisTarget = null,
  comparison,
  compact = false
}: ReportMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const [mapFailed, setMapFailed] = useState(false);
  const mapboxToken = getMapboxToken();
  const canUseMapbox = hasUsableMapboxToken(mapboxToken);
  const markers = useMemo(
    () => getMarkers({ selectedPoint, selectedObject, comparison }),
    [comparison, selectedObject, selectedPoint]
  );
  const selectedFeatures = useMemo(
    () => analysisTarget?.geometry
      ? [
          {
            type: "Feature",
            id: analysisTarget.id,
            properties: {
              id: analysisTarget.id,
              name: analysisTarget.label,
              fillColor: analysisTarget.type === "uploaded-feature" ? "#6b7fd7" : "#174f63",
              strokeColor: analysisTarget.type === "uploaded-feature" ? "#3447a5" : "#0b5a6e"
            },
            geometry: analysisTarget.geometry
          } satisfies GeoJSON.Feature
        ]
      : getSelectedFeatures(selectedObject, comparison),
    [analysisTarget, comparison, selectedObject]
  );
  const mapKey = [
    selectedObject?.id ?? "point",
    analysisTarget?.id ?? "no-target",
    selectedPoint?.latitude ?? selectedObject?.center.latitude ?? "no-lat",
    selectedPoint?.longitude ?? selectedObject?.center.longitude ?? "no-lng",
    comparison?.id ?? "single"
  ].join(":");

  useEffect(() => {
    if (!canUseMapbox || !containerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;
    const openContextFeatures = [
      ...openGeodataBaseline.landuse.map(openLanduseToFeature),
      ...openGeodataBaseline.roads.map(openRoadToFeature),
      ...openGeodataBaseline.poi.map(openPoiToFeature)
    ];
    const contextFeatures = demoLayers
      .filter((layer) => layer.visibleByDefault)
      .flatMap((layer) => layer.features);
    const primaryPoint = markers[0]?.point;
    const center: [number, number] = primaryPoint
      ? [primaryPoint.longitude, primaryPoint.latitude]
      : defaultCenter;

    async function initializeMap() {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;

        if (!isMounted || !containerRef.current || mapRef.current) {
          return;
        }

        mapboxgl.accessToken = mapboxToken;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center,
          zoom: comparison ? 9.65 : selectedObject ? 11.8 : 11.2,
          interactive: true,
          attributionControl: false,
          preserveDrawingBuffer: true
        });
        mapRef.current = map;
        map.scrollZoom.enable();
        map.dragPan.enable();
        map.doubleClickZoom.enable();
        map.touchZoomRotate.enable();
        map.keyboard.enable();
        map.addControl(
          new mapboxgl.NavigationControl({
            showCompass: false,
            visualizePitch: false
          }),
          "top-right"
        );

        const resize = () => window.requestAnimationFrame(() => map.resize());
        const observer = new ResizeObserver(resize);
        observer.observe(containerRef.current);
        resize();
        window.setTimeout(resize, 80);

        map.on("load", () => {
          if (!isMounted || !mapRef.current) return;

          map.addSource("geoai-report-context", {
            type: "geojson",
            data: toFeatureCollection(contextFeatures)
          });
          map.addSource("geoai-report-open-context", {
            type: "geojson",
            data: toFeatureCollection(openContextFeatures)
          });
          map.addSource("geoai-report-selected", {
            type: "geojson",
            data: toFeatureCollection(selectedFeatures)
          });

          map.addLayer({
            id: "geoai-report-open-landuse",
            type: "fill",
            source: "geoai-report-open-context",
            filter: ["==", ["get", "kind"], "open-landuse"],
            paint: {
              "fill-color": "#9bb5a6",
              "fill-opacity": 0.04
            }
          });
          map.addLayer({
            id: "geoai-report-open-roads",
            type: "line",
            source: "geoai-report-open-context",
            filter: ["==", ["get", "kind"], "open-road"],
            layout: {
              "line-cap": "round",
              "line-join": "round"
            },
            paint: {
              "line-color": "#536d7a",
              "line-opacity": 0.34,
              "line-width": ["match", ["get", "roadClass"], "motorway", 2, "trunk", 1.8, "primary", 1.6, 1.1]
            }
          });
          map.addLayer({
            id: "geoai-report-open-poi",
            type: "circle",
            source: "geoai-report-open-context",
            filter: ["==", ["get", "kind"], "open-poi"],
            paint: {
              "circle-color": "#1f6b83",
              "circle-opacity": 0.68,
              "circle-radius": compact ? 3.2 : 4.2,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1
            }
          });

          map.addLayer({
            id: "geoai-report-context-fill",
            type: "fill",
            source: "geoai-report-context",
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
              "fill-color": ["coalesce", ["get", "fillColor"], ["get", "color"], "#174f63"],
              "fill-opacity": ["*", ["coalesce", ["get", "fillOpacity"], 0.08], 0.78]
            }
          });
          map.addLayer({
            id: "geoai-report-context-line",
            type: "line",
            source: "geoai-report-context",
            layout: {
              "line-cap": "round",
              "line-join": "round"
            },
            paint: {
              "line-color": ["coalesce", ["get", "strokeColor"], ["get", "color"], "#174f63"],
              "line-opacity": ["*", ["coalesce", ["get", "strokeOpacity"], 0.42], 0.82],
              "line-width": ["coalesce", ["get", "strokeWidth"], 1.2]
            }
          });
          map.addLayer({
            id: "geoai-report-context-points",
            type: "circle",
            source: "geoai-report-context",
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-color": ["coalesce", ["get", "fillColor"], ["get", "color"], "#174f63"],
              "circle-opacity": 0.82,
              "circle-radius": compact ? 3.8 : ["coalesce", ["get", "pointRadius"], 5],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.2
            }
          });
          map.addLayer({
            id: "geoai-report-selected-fill",
            type: "fill",
            source: "geoai-report-selected",
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
              "fill-color": ["coalesce", ["get", "fillColor"], "#174f63"],
              "fill-opacity": 0.3
            }
          });
          map.addLayer({
            id: "geoai-report-selected-line",
            type: "line",
            source: "geoai-report-selected",
            paint: {
              "line-color": ["coalesce", ["get", "strokeColor"], "#0b5a6e"],
              "line-opacity": 0.94,
              "line-width": 3
            }
          });

          markersRef.current = markers.map((marker) =>
            new mapboxgl.Marker({ color: "#174f63" })
              .setLngLat([marker.point.longitude, marker.point.latitude])
              .addTo(map)
          );
          const selectedBounds = getFeatureBounds(selectedFeatures);
          if (selectedBounds) {
            const isPointLike =
              selectedBounds.minLng === selectedBounds.maxLng &&
              selectedBounds.minLat === selectedBounds.maxLat;

            if (isPointLike) {
              map.easeTo({
                center: [selectedBounds.minLng, selectedBounds.minLat],
                zoom: comparison ? 9.8 : selectedObject ? 12.2 : 11.2,
                duration: 0
              });
            } else {
              map.fitBounds(
                [
                  [selectedBounds.minLng, selectedBounds.minLat],
                  [selectedBounds.maxLng, selectedBounds.maxLat]
                ],
                {
                  padding: compact ? 32 : 58,
                  duration: 0,
                  maxZoom: 13.6
                }
              );
            }
          }
          resize();
          window.setTimeout(resize, 120);
        });

        map.on("error", () => {
          if (isMounted) setMapFailed(true);
        });

        return () => observer.disconnect();
      } catch {
        if (isMounted) setMapFailed(true);
      }
    }

    let cleanupObserver: (() => void) | undefined;
    void initializeMap().then((cleanup) => {
      cleanupObserver = cleanup;
    });

    return () => {
      isMounted = false;
      cleanupObserver?.();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [canUseMapbox, compact, comparison, mapKey, mapboxToken, markers, selectedFeatures, selectedObject]);

  if (!canUseMapbox) {
    return <FallbackMap markers={markers} selectedFeatures={selectedFeatures} message="Mapbox token not configured" />;
  }

  if (mapFailed) {
    return <FallbackMap markers={markers} selectedFeatures={selectedFeatures} message="Map preview unavailable" />;
  }

  return <div ref={containerRef} className="absolute inset-0 h-full min-h-[260px] w-full" aria-label="GeoAI report map preview" />;
}
