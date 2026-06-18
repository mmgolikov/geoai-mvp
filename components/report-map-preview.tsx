"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { demoLayers, getDemoFeatureById } from "@/src/data/demo-layers";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import type { ComparisonResult, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

type ReportMapPreviewProps = {
  selectedPoint?: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
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
      .map((item) => item.item.selectedObject?.id)
      .filter((id): id is string => Boolean(id))
      .map((id) => getDemoFeatureById(id))
      .filter((feature): feature is NonNullable<ReturnType<typeof getDemoFeatureById>> => Boolean(feature));
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

function FallbackMap({
  markers,
  message
}: {
  markers: MapMarker[];
  message?: string;
}) {
  return (
    <div className="relative h-full min-h-[260px] w-full overflow-hidden bg-[#dfe8ec] bg-[linear-gradient(90deg,rgba(23,79,99,0.12)_1px,transparent_1px),linear-gradient(rgba(23,79,99,0.12)_1px,transparent_1px)] bg-[size:38px_38px]">
      <div className="absolute inset-x-8 top-10 h-20 rotate-[-7deg] rounded-full border border-[#4d7c0f]/40 bg-[#4d7c0f]/10" />
      <div className="absolute bottom-10 left-10 h-24 w-44 rounded-[40%] border border-[#2c7fb8]/45 bg-[#2c7fb8]/12" />
      <div className="absolute right-12 top-20 h-28 w-48 rounded-[45%] border border-[#c5a76a]/55 bg-[#c5a76a]/14" />
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
    () => getSelectedFeatures(selectedObject, comparison),
    [comparison, selectedObject]
  );
  const mapKey = [
    selectedObject?.id ?? "point",
    selectedPoint?.latitude ?? selectedObject?.center.latitude ?? "no-lat",
    selectedPoint?.longitude ?? selectedObject?.center.longitude ?? "no-lng",
    comparison?.id ?? "single"
  ].join(":");

  useEffect(() => {
    if (!canUseMapbox || !containerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;
    const contextFeatures = demoLayers.flatMap((layer) => layer.features);
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
          style: "mapbox://styles/mapbox/light-v11",
          center,
          zoom: comparison ? 9.4 : selectedObject ? 12 : 11.4,
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
          map.addSource("geoai-report-selected", {
            type: "geojson",
            data: toFeatureCollection(selectedFeatures)
          });

          map.addLayer({
            id: "geoai-report-context-fill",
            type: "fill",
            source: "geoai-report-context",
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
              "fill-color": ["coalesce", ["get", "fillColor"], ["get", "color"], "#174f63"],
              "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.1]
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
              "line-opacity": ["coalesce", ["get", "strokeOpacity"], 0.42],
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
    return <FallbackMap markers={markers} message="Mapbox token not configured" />;
  }

  if (mapFailed) {
    return <FallbackMap markers={markers} message="Map preview unavailable" />;
  }

  return <div ref={containerRef} className="absolute inset-0 h-full min-h-[260px] w-full" aria-label="GeoAI report map preview" />;
}
