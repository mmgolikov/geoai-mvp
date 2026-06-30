"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCandidateAnchor,
  getCandidateCoordinates
} from "@/src/lib/explore/candidates";
import type { ExploreCandidate, ExploreCoordinate } from "@/src/lib/explore/types";
import type {
  AnyLayer,
  GeoJSONSource,
  Map as MapboxMap,
  MapLayerMouseEvent
} from "mapbox-gl";

const sourceId = "geoai-explore-candidates";
const fillLayerId = "geoai-explore-candidate-fill";
const outlineLayerId = "geoai-explore-candidate-outline";
const routeLayerId = "geoai-explore-candidate-route";
const pointLayerId = "geoai-explore-candidate-point";
const clickLayerIds = [pointLayerId, fillLayerId, outlineLayerId, routeLayerId];

type ExploreMapProps = {
  candidates: ExploreCandidate[];
  selectedCandidateId: string | null;
  onCandidateSelect: (candidateId: string) => void;
};

function getMapboxToken() {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

function hasUsableMapboxToken(token: string) {
  return token.startsWith("pk.");
}

function closePolygon(coordinates: ExploreCoordinate[]) {
  if (coordinates.length === 0) {
    return coordinates;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) {
    return coordinates;
  }

  return [...coordinates, first];
}

function toFeature(candidate: ExploreCandidate, selectedCandidateId: string | null): GeoJSON.Feature {
  const properties = {
    id: candidate.id,
    title: candidate.title,
    score: candidate.score,
    sourceType: candidate.sourceType,
    selected: candidate.id === selectedCandidateId,
    geometryKind: candidate.geometry.type
  };

  if (candidate.geometry.type === "point") {
    return {
      type: "Feature",
      properties,
      geometry: {
        type: "Point",
        coordinates: candidate.geometry.point
      }
    };
  }

  if (candidate.geometry.type === "route") {
    return {
      type: "Feature",
      properties,
      geometry: {
        type: "LineString",
        coordinates: candidate.geometry.coordinates
      }
    };
  }

  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [closePolygon(candidate.geometry.coordinates)]
    }
  };
}

function toFeatureCollection(
  candidates: ExploreCandidate[],
  selectedCandidateId: string | null
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: candidates.map((candidate) => toFeature(candidate, selectedCandidateId))
  };
}

function getLayers(): AnyLayer[] {
  return [
    {
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": [
          "case",
          ["boolean", ["get", "selected"], false],
          "#c5a76a",
          "#174f63"
        ],
        "fill-opacity": [
          "case",
          ["boolean", ["get", "selected"], false],
          0.3,
          0.16
        ]
      }
    },
    {
      id: outlineLayerId,
      type: "line",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "line-color": [
          "case",
          ["boolean", ["get", "selected"], false],
          "#9a7b2f",
          "#174f63"
        ],
        "line-width": [
          "case",
          ["boolean", ["get", "selected"], false],
          3,
          1.8
        ],
        "line-opacity": 0.9
      }
    },
    {
      id: routeLayerId,
      type: "line",
      source: sourceId,
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "geometryKind"], "route"]],
      paint: {
        "line-color": [
          "case",
          ["boolean", ["get", "selected"], false],
          "#c5a76a",
          "#174f63"
        ],
        "line-width": [
          "case",
          ["boolean", ["get", "selected"], false],
          5,
          3
        ],
        "line-opacity": 0.88
      }
    },
    {
      id: pointLayerId,
      type: "circle",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": [
          "case",
          ["boolean", ["get", "selected"], false],
          "#c5a76a",
          "#174f63"
        ],
        "circle-radius": [
          "case",
          ["boolean", ["get", "selected"], false],
          9,
          6
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      }
    }
  ];
}

function getAllCoordinates(candidates: ExploreCandidate[]) {
  return candidates.flatMap(getCandidateCoordinates);
}

function fitCandidates(
  map: MapboxMap,
  mapboxgl: typeof import("mapbox-gl").default,
  candidates: ExploreCandidate[]
) {
  const coordinates = getAllCoordinates(candidates);

  if (coordinates.length === 0) {
    map.easeTo({ center: [55.235, 25.12], zoom: 9.4, duration: 400 });
    return;
  }

  const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
  coordinates.forEach((coordinate) => bounds.extend(coordinate));
  map.fitBounds(bounds, {
    padding: 64,
    maxZoom: 12.3,
    duration: 500
  });
}

function getFallbackPosition(anchor: ExploreCoordinate) {
  const minLng = 54.96;
  const maxLng = 55.5;
  const minLat = 24.86;
  const maxLat = 25.31;
  const left = ((anchor[0] - minLng) / (maxLng - minLng)) * 100;
  const top = (1 - (anchor[1] - minLat) / (maxLat - minLat)) * 100;

  return {
    left: `${Math.max(6, Math.min(94, left))}%`,
    top: `${Math.max(8, Math.min(92, top))}%`
  };
}

function FallbackMap({
  candidates,
  selectedCandidateId,
  onCandidateSelect,
  reason
}: ExploreMapProps & { reason: string }) {
  const markers = useMemo(
    () =>
      candidates.map((candidate) => ({
        candidate,
        anchor: getCandidateAnchor(candidate)
      })),
    [candidates]
  );

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-line bg-[#edf4f2]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,79,99,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(23,79,99,0.08)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute left-4 top-4 max-w-[280px] rounded-md border border-line bg-white/92 p-3 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
          Explore map fallback
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          {reason} Candidate positions are shown on a simplified Dubai grid.
        </p>
      </div>
      {markers.map(({ candidate, anchor }, index) => {
        const selected = candidate.id === selectedCandidateId;
        return (
          <button
            key={candidate.id}
            type="button"
            onClick={() => onCandidateSelect(candidate.id)}
            className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-soft transition ${
              selected
                ? "border-[#9a7b2f] bg-accent text-white"
                : "border-white bg-brand text-white hover:bg-[#113f50]"
            }`}
            style={getFallbackPosition(anchor)}
            title={candidate.title}
          >
            {index + 1}
          </button>
        );
      })}
      <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
        {markers.slice(0, 3).map(({ candidate }, index) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => onCandidateSelect(candidate.id)}
            className={`min-w-0 rounded-md border bg-white/94 p-2 text-left shadow-sm transition ${
              candidate.id === selectedCandidateId ? "border-accent" : "border-line hover:border-brand"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Candidate {index + 1}
            </span>
            <span className="safe-line-1 mt-1 block text-xs font-semibold text-ink">
              {candidate.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExploreMap({
  candidates,
  selectedCandidateId,
  onCandidateSelect
}: ExploreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const onCandidateSelectRef = useRef(onCandidateSelect);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");
  const mapboxToken = getMapboxToken();

  useEffect(() => {
    onCandidateSelectRef.current = onCandidateSelect;
  }, [onCandidateSelect]);

  useEffect(() => {
    if (!hasUsableMapboxToken(mapboxToken)) {
      setMapStatus("missing-token");
      return;
    }

    let cancelled = false;
    let cleanupHandlers: Array<() => void> = [];

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current) {
          return;
        }

        mapboxgl.accessToken = mapboxToken;
        mapboxRef.current = mapboxgl;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [55.235, 25.12],
          zoom: 9.4,
          attributionControl: false
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
              type: "geojson",
              data: toFeatureCollection(candidates, selectedCandidateId)
            });
          }

          getLayers().forEach((layer) => {
            if (!map.getLayer(layer.id)) {
              map.addLayer(layer);
            }
          });

          clickLayerIds.forEach((layerId) => {
            const clickHandler = (event: MapLayerMouseEvent) => {
              const candidateId = event.features?.[0]?.properties?.id;
              if (typeof candidateId === "string") {
                onCandidateSelectRef.current(candidateId);
              }
            };
            const enterHandler = () => {
              map.getCanvas().style.cursor = "pointer";
            };
            const leaveHandler = () => {
              map.getCanvas().style.cursor = "";
            };

            map.on("click", layerId, clickHandler);
            map.on("mouseenter", layerId, enterHandler);
            map.on("mouseleave", layerId, leaveHandler);
            cleanupHandlers = [
              ...cleanupHandlers,
              () => map.off("click", layerId, clickHandler),
              () => map.off("mouseenter", layerId, enterHandler),
              () => map.off("mouseleave", layerId, leaveHandler)
            ];
          });

          fitCandidates(map, mapboxgl, candidates);
          setMapStatus("ready");
        });
      } catch {
        setMapStatus("error");
      }
    }

    initializeMap();

    return () => {
      cancelled = true;
      cleanupHandlers.forEach((cleanup) => cleanup());
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;

    if (!map || !mapboxgl || !map.isStyleLoaded()) {
      return;
    }

    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(candidates, selectedCandidateId));
    fitCandidates(map, mapboxgl, candidates);
  }, [candidates, selectedCandidateId]);

  if (mapStatus === "missing-token") {
    return (
      <FallbackMap
        candidates={candidates}
        selectedCandidateId={selectedCandidateId}
        onCandidateSelect={onCandidateSelect}
        reason="Mapbox public token is not configured."
      />
    );
  }

  if (mapStatus === "error") {
    return (
      <FallbackMap
        candidates={candidates}
        selectedCandidateId={selectedCandidateId}
        onCandidateSelect={onCandidateSelect}
        reason="The live map could not be initialized."
      />
    );
  }

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-line bg-[#edf4f2]">
      <div ref={containerRef} className="absolute inset-0" />
      {mapStatus === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/82">
          <div className="rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-muted shadow-sm">
            Loading Explore map
          </div>
        </div>
      ) : null}
      <div className="absolute bottom-4 left-4 max-w-[320px] rounded-md border border-line bg-white/92 p-3 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
          Sample geography
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Markers, polygons and routes are demo context. Select a shape to update the candidate detail panel.
        </p>
      </div>
    </div>
  );
}
