"use client";

import { useEffect, useRef, useState } from "react";
import { demoLayers, getDemoFeatureById, getLayerSourceModeLabel, getSelectedDemoObject } from "@/src/data/demo-layers";
import type { DemoLayer, DemoLayerFeature } from "@/src/data/demo-layers";
import type { GeoJSONSource, Map as MapboxMap, MapboxGeoJSONFeature, Marker as MapboxMarker, Popup as MapboxPopup } from "mapbox-gl";
import type { DemoLayerId, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

const defaultCenter: [number, number] = [55.2708, 25.2048];

function getMapboxToken() {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

function hasUsableMapboxToken(token: string) {
  return token.startsWith("pk.");
}

type MapWorkspaceClientProps = {
  selectedPoint: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  onPointSelect: (point: SelectedPoint) => void;
  onObjectSelect?: (object: SelectedDemoObject) => void;
  className?: string;
  showEmptyOverlay?: boolean;
  showLayerControls?: boolean;
};

const initialLayerVisibility = demoLayers.reduce<Record<DemoLayerId, boolean>>((visibility, layer) => {
  visibility[layer.id] = layer.visibleByDefault;
  return visibility;
}, {} as Record<DemoLayerId, boolean>);

const selectedObjectSourceId = "geoai-selected-object";
const hoverObjectSourceId = "geoai-hover-object";

function getSourceId(layer: DemoLayer) {
  return `geoai-${layer.id}`;
}

function getLayerIds(layer: DemoLayer) {
  if (layer.type === "polygon") {
    return [`${layer.id}-fill`, `${layer.id}-outline`];
  }

  if (layer.type === "line") {
    return [`${layer.id}-line`];
  }

  return [`${layer.id}-circle`];
}

function getInteractiveLayerIds(visibility: Record<DemoLayerId, boolean>) {
  return demoLayers.flatMap((layer) => (visibility[layer.id] ? getLayerIds(layer) : []));
}

function toFeatureCollection(features: unknown[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features as GeoJSON.Feature[]
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFeatureLabel(feature: DemoLayerFeature) {
  return {
    title: feature.properties.name,
    type: `${feature.properties.category} · ${feature.properties.objectType}`,
    source: `${feature.properties.sourceMode.replace(/_/g, "-")} · ${feature.properties.confidenceLevel} confidence`,
    relevance: feature.properties.relevance
  };
}

function sortRenderedFeatures(features: MapboxGeoJSONFeature[] = []) {
  return [...features].sort((a, b) => {
    const priorityA = Number(a.properties?.clickPriority ?? 0);
    const priorityB = Number(b.properties?.clickPriority ?? 0);

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    return Number(b.properties?.layerOrder ?? 0) - Number(a.properties?.layerOrder ?? 0);
  });
}

function setHoverTooltip(
  popup: MapboxPopup | null,
  lngLat: { lng: number; lat: number },
  feature: DemoLayerFeature,
  map: MapboxMap
) {
  if (!popup) {
    return;
  }

  const label = getFeatureLabel(feature);
  popup
    .setLngLat(lngLat)
    .setHTML(
      `<div class="geoai-map-tooltip">
        <div class="geoai-map-tooltip-title">${escapeHtml(label.title)}</div>
        <div class="geoai-map-tooltip-detail">${escapeHtml(label.type)}</div>
        <div class="geoai-map-tooltip-source">${escapeHtml(label.source)}</div>
        <div class="geoai-map-tooltip-note">${escapeHtml(label.relevance)}</div>
      </div>`
    )
    .addTo(map);
}

function getFallbackPoint(clientX: number, clientY: number, rect: DOMRect): SelectedPoint {
  const xRatio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  const yRatio = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);

  return {
    latitude: 25.45 - yRatio * 0.72,
    longitude: 54.85 + xRatio * 0.78
  };
}

function getFallbackMarkerStyle(selectedPoint: SelectedPoint) {
  const left = ((selectedPoint.longitude - 54.85) / 0.78) * 100;
  const top = ((25.45 - selectedPoint.latitude) / 0.72) * 100;

  return {
    left: `${Math.min(Math.max(left, 0), 100)}%`,
    top: `${Math.min(Math.max(top, 0), 100)}%`
  };
}

function addDemoLayerToMap(map: MapboxMap, layer: DemoLayer) {
  const sourceId = getSourceId(layer);

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: toFeatureCollection(layer.features)
    });
  }

  if (layer.type === "polygon") {
    if (!map.getLayer(`${layer.id}-fill`)) {
      map.addLayer({
        id: `${layer.id}-fill`,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": layer.color,
          "fill-opacity": layer.style.fillOpacity
        },
        minzoom: layer.minZoom,
        maxzoom: layer.maxZoom
      });
    }

    if (!map.getLayer(`${layer.id}-outline`)) {
      map.addLayer({
        id: `${layer.id}-outline`,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": layer.color,
          "line-width": layer.style.strokeWidth,
          "line-opacity": layer.style.strokeOpacity
        },
        minzoom: layer.minZoom,
        maxzoom: layer.maxZoom
      });
    }
  }

  if (layer.type === "point" && !map.getLayer(`${layer.id}-circle`)) {
    map.addLayer({
      id: `${layer.id}-circle`,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-color": layer.color,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, Math.max((layer.style.pointRadius ?? 5.2) - 1.2, 3.8), 13, layer.style.pointRadius ?? 5.2],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": layer.style.strokeWidth,
        "circle-opacity": layer.style.fillOpacity
      },
      minzoom: layer.minZoom,
      maxzoom: layer.maxZoom
    });
  }

  if (layer.type === "line" && !map.getLayer(`${layer.id}-line`)) {
    map.addLayer({
      id: `${layer.id}-line`,
      type: "line",
      source: sourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": layer.color,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, Math.max(layer.style.strokeWidth - 0.8, 1.6), 13, layer.style.strokeWidth],
        "line-opacity": layer.style.strokeOpacity,
        ...(layer.style.lineDasharray ? { "line-dasharray": layer.style.lineDasharray } : {})
      },
      minzoom: layer.minZoom,
      maxzoom: layer.maxZoom
    });
  }
}

function addSelectedObjectLayer(map: MapboxMap) {
  if (!map.getSource(selectedObjectSourceId)) {
    map.addSource(selectedObjectSourceId, {
      type: "geojson",
      data: toFeatureCollection([])
    });
  }

  if (!map.getLayer("geoai-selected-fill")) {
    map.addLayer({
      id: "geoai-selected-fill",
      type: "fill",
      source: selectedObjectSourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#174f63"],
        "fill-opacity": 0.3
      }
    });
  }

  if (!map.getLayer("geoai-selected-line")) {
    map.addLayer({
      id: "geoai-selected-line",
      type: "line",
      source: selectedObjectSourceId,
      paint: {
        "line-color": ["coalesce", ["get", "strokeColor"], "#0b5a6e"],
        "line-width": 3,
        "line-opacity": 0.96,
        "line-blur": 0.2
      }
    });
  }

  if (!map.getLayer("geoai-selected-circle")) {
    map.addLayer({
      id: "geoai-selected-circle",
      type: "circle",
      source: selectedObjectSourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": ["coalesce", ["get", "fillColor"], "#0f5f76"],
        "circle-radius": 8.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3
      }
    });
  }
}

function addHoverObjectLayer(map: MapboxMap) {
  if (!map.getSource(hoverObjectSourceId)) {
    map.addSource(hoverObjectSourceId, {
      type: "geojson",
      data: toFeatureCollection([])
    });
  }

  if (!map.getLayer("geoai-hover-fill")) {
    map.addLayer({
      id: "geoai-hover-fill",
      type: "fill",
      source: hoverObjectSourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#174f63"],
        "fill-opacity": 0.19
      }
    });
  }

  if (!map.getLayer("geoai-hover-line")) {
    map.addLayer({
      id: "geoai-hover-line",
      type: "line",
      source: hoverObjectSourceId,
      paint: {
        "line-color": ["coalesce", ["get", "strokeColor"], "#0f5f76"],
        "line-width": 1.8,
        "line-opacity": 0.82
      }
    });
  }

  if (!map.getLayer("geoai-hover-circle")) {
    map.addLayer({
      id: "geoai-hover-circle",
      type: "circle",
      source: hoverObjectSourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": ["coalesce", ["get", "fillColor"], "#0f5f76"],
        "circle-radius": 7.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      }
    });
  }
}

export function MapWorkspaceClient({
  selectedPoint,
  selectedObject = null,
  onPointSelect,
  onObjectSelect,
  className = "relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#dfe8ec]",
  showEmptyOverlay = true,
  showLayerControls = true
}: MapWorkspaceClientProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const hoverPopupRef = useRef<MapboxPopup | null>(null);
  const onPointSelectRef = useRef(onPointSelect);
  const onObjectSelectRef = useRef(onObjectSelect);
  const layerVisibilityRef = useRef(initialLayerVisibility);
  const [layerVisibility, setLayerVisibility] = useState(initialLayerVisibility);
  const [layersExpanded, setLayersExpanded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapResourceError, setMapResourceError] = useState<string | null>(null);
  const mapboxToken = getMapboxToken();
  const canUseMapbox = hasUsableMapboxToken(mapboxToken);

  useEffect(() => {
    onPointSelectRef.current = onPointSelect;
  }, [onPointSelect]);

  useEffect(() => {
    onObjectSelectRef.current = onObjectSelect;
  }, [onObjectSelect]);

  useEffect(() => {
    layerVisibilityRef.current = layerVisibility;
  }, [layerVisibility]);

  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      const message = args.map((arg) => String(arg)).join(" ");
      const isMapboxTileError =
        message.includes("api.mapbox.com") ||
        (message.includes("Failed to fetch") && message.toLowerCase().includes("mapbox"));

      if (isMapboxTileError) {
        setMapResourceError(
          "Map tiles could not be loaded. Check the Mapbox token, internet access, or token domain settings."
        );
        return;
      }

      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    if (!canUseMapbox || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;

    async function initializeMap() {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (!isMounted || !mapContainerRef.current || mapRef.current) {
        return;
      }

      setMapResourceError(null);
      mapboxgl.accessToken = mapboxToken;
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: defaultCenter,
        zoom: 9
      });

      hoverPopupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
        className: "geoai-hover-popup"
      });

      mapRef.current.on("error", () => {
        if (!isMounted) {
          return;
        }

        setMapResourceError(
          "Map tiles could not be loaded. Check the Mapbox token, internet access, or token domain settings."
        );
      });

      mapRef.current.on("load", () => {
        if (isMounted) {
          setMapResourceError(null);
          demoLayers.forEach((layer) => addDemoLayerToMap(mapRef.current as MapboxMap, layer));
          addSelectedObjectLayer(mapRef.current as MapboxMap);
          addHoverObjectLayer(mapRef.current as MapboxMap);
          window.setTimeout(() => mapRef.current?.resize(), 0);
          setIsMapReady(true);
        }
      });

      mapRef.current.on("mousemove", (event) => {
        const interactiveLayers = getInteractiveLayerIds(layerVisibilityRef.current).filter((layerId) =>
          Boolean(mapRef.current?.getLayer(layerId))
        );
        const features = interactiveLayers.length > 0
          ? mapRef.current?.queryRenderedFeatures(event.point, { layers: interactiveLayers })
          : [];
        const orderedFeatures = sortRenderedFeatures(features);
        const featureId = orderedFeatures[0]?.properties?.id as string | undefined;
        const demoFeature = featureId ? getDemoFeatureById(featureId) : null;
        const source = mapRef.current?.getSource(hoverObjectSourceId) as GeoJSONSource | undefined;

        if (source) {
          source.setData(toFeatureCollection(demoFeature ? [demoFeature] : []));
        }

        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = demoFeature ? "pointer" : "";

          if (demoFeature) {
            setHoverTooltip(hoverPopupRef.current, event.lngLat, demoFeature, mapRef.current);
          } else {
            hoverPopupRef.current?.remove();
          }
        }
      });

      mapRef.current.on("mouseleave", () => {
        const source = mapRef.current?.getSource(hoverObjectSourceId) as GeoJSONSource | undefined;
        source?.setData(toFeatureCollection([]));
        hoverPopupRef.current?.remove();

        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = "";
        }
      });

      mapRef.current.on("click", (event) => {
        const interactiveLayers = getInteractiveLayerIds(layerVisibilityRef.current).filter((layerId) =>
          Boolean(mapRef.current?.getLayer(layerId))
        );
        const features = interactiveLayers.length > 0
          ? mapRef.current?.queryRenderedFeatures(event.point, { layers: interactiveLayers })
          : [];
        const orderedFeatures = sortRenderedFeatures(features);
        const featureId = orderedFeatures[0]?.properties?.id as string | undefined;
        const demoFeature = featureId ? getDemoFeatureById(featureId) : null;

        if (demoFeature && onObjectSelectRef.current) {
          onObjectSelectRef.current(getSelectedDemoObject(demoFeature));
          return;
        }

        onPointSelectRef.current({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng
        });
      });
    }

    void initializeMap();

    return () => {
      isMounted = false;
      setIsMapReady(false);
      markerRef.current?.remove();
      markerRef.current = null;
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [canUseMapbox, mapboxToken]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !selectedPoint) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    let isMounted = true;

    async function updateMarker() {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (!isMounted || !mapRef.current || !selectedPoint) {
        return;
      }

      const lngLat: [number, number] = [selectedPoint.longitude, selectedPoint.latitude];

      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#174f63" })
          .setLngLat(lngLat)
          .addTo(mapRef.current);
        return;
      }

      markerRef.current.setLngLat(lngLat);
    }

    void updateMarker();

    return () => {
      isMounted = false;
    };
  }, [canUseMapbox, selectedPoint]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !isMapReady) {
      return;
    }

    window.setTimeout(() => mapRef.current?.resize(), 0);
  }, [canUseMapbox, isMapReady, selectedObject, selectedPoint]);

  useEffect(() => {
    if (!canUseMapbox || !mapContainerRef.current) {
      return;
    }

    const resizeMap = () => {
      window.requestAnimationFrame(() => mapRef.current?.resize());
    };
    const observer = new ResizeObserver(resizeMap);

    observer.observe(mapContainerRef.current);
    resizeMap();

    return () => {
      observer.disconnect();
    };
  }, [canUseMapbox]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !isMapReady) {
      return;
    }

    demoLayers.forEach((layer) => {
      const visibility = layerVisibility[layer.id] ? "visible" : "none";
      getLayerIds(layer).forEach((layerId) => {
        if (mapRef.current?.getLayer(layerId)) {
          mapRef.current.setLayoutProperty(layerId, "visibility", visibility);
        }
      });
    });

    const hoverSource = mapRef.current.getSource(hoverObjectSourceId) as GeoJSONSource | undefined;
    hoverSource?.setData(toFeatureCollection([]));
  }, [canUseMapbox, isMapReady, layerVisibility]);

  useEffect(() => {
    if (!canUseMapbox || !mapRef.current || !isMapReady) {
      return;
    }

    const source = mapRef.current.getSource(selectedObjectSourceId) as GeoJSONSource | undefined;

    if (!source) {
      return;
    }

    const selectedFeature = selectedObject ? getDemoFeatureById(selectedObject.id) : null;
    source.setData(toFeatureCollection(selectedFeature ? [selectedFeature] : []));
  }, [canUseMapbox, isMapReady, selectedObject]);

  function handleFallbackClick(event: React.MouseEvent<HTMLElement>) {
    if (canUseMapbox) {
      return;
    }

    onPointSelect(getFallbackPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()));
  }

  function toggleLayer(layerId: DemoLayerId) {
    setLayerVisibility((currentVisibility) => ({
      ...currentVisibility,
      [layerId]: !currentVisibility[layerId]
    }));
  }

  function setAllLayers(visible: boolean) {
    setLayerVisibility(
      demoLayers.reduce<Record<DemoLayerId, boolean>>((visibility, layer) => {
        visibility[layer.id] = visible;
        return visibility;
      }, {} as Record<DemoLayerId, boolean>)
    );
  }

  const activeLayerCount = Object.values(layerVisibility).filter(Boolean).length;

  return (
    <section
      className={className}
      onClick={handleFallbackClick}
    >
      <div ref={mapContainerRef} className="absolute inset-0" aria-label="GeoAI map workspace" />

      {!canUseMapbox ? (
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,79,99,0.12)_1px,transparent_1px),linear-gradient(rgba(23,79,99,0.12)_1px,transparent_1px)] bg-[size:42px_42px]">
          {showEmptyOverlay ? (
            <>
              <div className="absolute left-6 top-6 max-w-md rounded-lg border border-white/70 bg-white/90 p-5 shadow-soft backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                  Mapbox placeholder
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">
                  Full-screen spatial workspace
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Add `NEXT_PUBLIC_MAPBOX_TOKEN` later to render the live Mapbox
                  basemap. The app stays usable without local environment tokens.
                </p>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/85 px-4 py-3 text-sm text-muted shadow-soft backdrop-blur">
                <span>Dubai / Abu Dhabi demo extent</span>
                <span>Click the map to select a point for express analysis.</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {canUseMapbox && mapResourceError && showEmptyOverlay ? (
        <div className="absolute left-6 top-6 z-10 max-w-md rounded-lg border border-[#f2c6bd] bg-white/95 p-4 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9f3412]">
            Map status
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">{mapResourceError}</p>
        </div>
      ) : null}

      {canUseMapbox && showEmptyOverlay && !selectedPoint && !mapResourceError ? (
        <div className="absolute left-5 top-5 z-10 max-w-sm rounded-lg border border-white/75 bg-white/92 p-4 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Start here
          </p>
          <ol className="mt-2 space-y-1 text-sm leading-6 text-muted">
            <li>1. Select a point or object on the map</li>
            <li>2. Choose a scenario</li>
            <li>3. Run Express Analysis</li>
          </ol>
        </div>
      ) : null}

      {canUseMapbox && showLayerControls ? (
        <div
          className="absolute right-5 top-5 z-10 w-[290px] rounded-lg border border-white/75 bg-white/92 p-3 shadow-soft backdrop-blur"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setLayersExpanded((isExpanded) => !isExpanded)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Spatial layers
              </p>
              <h2 className="mt-1 text-sm font-semibold text-ink">Demo-normalized overlays</h2>
            </div>
            <span className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
              {activeLayerCount} active
            </span>
          </button>

          {layersExpanded ? (
            <div className="mt-3">
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllLayers(true)}
                  className="h-8 flex-1 rounded-md border border-line bg-white text-xs font-semibold text-ink transition hover:border-brand"
                >
                  Show all
                </button>
                <button
                  type="button"
                  onClick={() => setAllLayers(false)}
                  className="h-8 flex-1 rounded-md border border-line bg-white text-xs font-semibold text-ink transition hover:border-brand"
                >
                  Hide all
                </button>
              </div>

              <div className="grid gap-2">
                {demoLayers.map((layer) => (
                  <label key={layer.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: layer.color }} />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-ink">{layer.legendLabel}</span>
                        <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                          {layer.category} · {getLayerSourceModeLabel(layer)}
                        </span>
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility[layer.id]}
                      onChange={() => toggleLayer(layer.id)}
                      className="h-4 w-4 accent-[#174f63]"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs leading-5 text-muted">
                Demo-normalized spatial layers. Not official GIS, parcel, zoning, planning, or risk boundaries.
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {canUseMapbox && showLayerControls && layersExpanded ? (
        <div
          className="absolute bottom-5 left-5 z-10 flex max-w-[720px] flex-wrap gap-2 rounded-lg border border-white/75 bg-white/90 px-3 py-2 shadow-soft backdrop-blur"
          onClick={(event) => event.stopPropagation()}
        >
          {demoLayers.map((layer) => (
            <div key={layer.id} className="flex items-center gap-2 text-xs font-medium text-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: layer.color }} />
              <span>{layer.legendLabel}</span>
            </div>
          ))}
        </div>
      ) : null}

      {!canUseMapbox && selectedPoint ? (
        <div
          className="pointer-events-none absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-brand shadow-soft"
          style={getFallbackMarkerStyle(selectedPoint)}
          aria-hidden="true"
        />
      ) : null}
    </section>
  );
}
