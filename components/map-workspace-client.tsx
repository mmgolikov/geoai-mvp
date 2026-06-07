"use client";

import { useEffect, useRef } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import type { SelectedPoint } from "@/src/types/geo";

const defaultCenter: [number, number] = [55.2708, 25.2048];

function getMapboxToken() {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

function hasUsableMapboxToken(token: string) {
  return token.startsWith("pk.");
}

type MapWorkspaceClientProps = {
  selectedPoint: SelectedPoint | null;
  onPointSelect: (point: SelectedPoint) => void;
  className?: string;
  showEmptyOverlay?: boolean;
};

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

export function MapWorkspaceClient({
  selectedPoint,
  onPointSelect,
  className = "relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#dfe8ec]",
  showEmptyOverlay = true
}: MapWorkspaceClientProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const onPointSelectRef = useRef(onPointSelect);
  const mapboxToken = getMapboxToken();
  const canUseMapbox = hasUsableMapboxToken(mapboxToken);

  useEffect(() => {
    onPointSelectRef.current = onPointSelect;
  }, [onPointSelect]);

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

      mapboxgl.accessToken = mapboxToken;
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: defaultCenter,
        zoom: 9
      });

      mapRef.current.on("click", (event) => {
        onPointSelectRef.current({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng
        });
      });
    }

    void initializeMap();

    return () => {
      isMounted = false;
      markerRef.current?.remove();
      markerRef.current = null;
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

  function handleFallbackClick(event: React.MouseEvent<HTMLElement>) {
    if (canUseMapbox) {
      return;
    }

    onPointSelect(getFallbackPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()));
  }

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
