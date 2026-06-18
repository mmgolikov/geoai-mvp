"use client";

import { useEffect, useRef, useState } from "react";
import { MapWorkspace } from "@/components/map-workspace";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import type { ComparisonResult, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

type MapMarker = {
  label: string;
  point: SelectedPoint;
};

type MapContextCardProps = {
  title: string;
  subtitle: string;
  selectedPoint?: SelectedPoint | null;
  selectedObject?: SelectedDemoObject | null;
  comparison?: ComparisonResult;
  compact?: boolean;
  reportMode?: boolean;
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

function FallbackMap({ markers }: { markers: MapMarker[] }) {
  return (
    <div className="relative h-full min-h-[220px] bg-[#dfe8ec] bg-[linear-gradient(90deg,rgba(23,79,99,0.12)_1px,transparent_1px),linear-gradient(rgba(23,79,99,0.12)_1px,transparent_1px)] bg-[size:38px_38px]">
      <div className="absolute inset-x-8 top-10 h-20 rotate-[-7deg] rounded-full border border-[#4d7c0f]/40 bg-[#4d7c0f]/10" />
      <div className="absolute bottom-10 left-10 h-24 w-44 rounded-[40%] border border-[#2c7fb8]/45 bg-[#2c7fb8]/12" />
      <div className="absolute right-12 top-20 h-28 w-48 rounded-[45%] border border-[#c5a76a]/55 bg-[#c5a76a]/14" />
      {markers.map((marker) => (
        <div
          key={marker.label}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
          style={getFallbackMarkerStyle(marker.point)}
        >
          <span className="h-4 w-4 rounded-full border-2 border-white bg-brand shadow-soft" />
          <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-ink shadow-sm">
            {marker.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function ComparisonMap({ comparison, compact = false }: { comparison: ComparisonResult; compact?: boolean }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const [mapFailed, setMapFailed] = useState(false);
  const mapboxToken = getMapboxToken();
  const canUseMapbox = hasUsableMapboxToken(mapboxToken);
  const markers = comparison.items.map((item, index) => ({
    label: `Option ${index + 1}`,
    point: item.item.point
  }));

  useEffect(() => {
    if (!canUseMapbox || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;

    async function initializeMap() {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;

        if (!isMounted || !mapContainerRef.current || mapRef.current) {
          return;
        }

        mapboxgl.accessToken = mapboxToken;
        const firstPoint = comparison.items[0]?.item.point;
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: firstPoint ? [firstPoint.longitude, firstPoint.latitude] : defaultCenter,
          zoom: 9.6,
          interactive: !compact
        });

        mapRef.current.on("load", () => {
          if (!mapRef.current) return;

          markersRef.current = markers.map((marker) =>
            new mapboxgl.Marker({ color: "#174f63" })
              .setLngLat([marker.point.longitude, marker.point.latitude])
              .setPopup(new mapboxgl.Popup({ closeButton: false }).setText(marker.label))
              .addTo(mapRef.current as MapboxMap)
          );
          window.setTimeout(() => mapRef.current?.resize(), 0);
        });

        mapRef.current.on("error", () => setMapFailed(true));
      } catch {
        setMapFailed(true);
      }
    }

    void initializeMap();

    return () => {
      isMounted = false;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [canUseMapbox, compact, comparison.items, mapboxToken, markers]);

  if (!canUseMapbox || mapFailed) {
    return <FallbackMap markers={markers} />;
  }

  return <div ref={mapContainerRef} className="absolute inset-0" aria-label="GeoAI comparison map context" />;
}

export function MapContextCard({
  title,
  subtitle,
  selectedPoint = null,
  selectedObject = null,
  comparison,
  compact = false,
  reportMode = false
}: MapContextCardProps) {
  const mapHeightClass = compact
    ? "min-h-[220px]"
    : reportMode
      ? "min-h-[300px] print:h-[220px] print:min-h-[220px] print:flex-none"
      : "min-h-[280px]";

  return (
    <section className="flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm print:h-auto print:min-h-0 print:shadow-none">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
          Map context
        </span>
      </div>
      <div className={`relative h-full min-h-0 w-full flex-1 overflow-hidden bg-[#dfe8ec] ${mapHeightClass}`}>
        {comparison ? (
          <ComparisonMap comparison={comparison} compact={compact || reportMode} />
        ) : selectedPoint ? (
          <MapWorkspace
            selectedPoint={selectedPoint}
            selectedObject={selectedObject}
            onPointSelect={() => undefined}
            className="relative h-full min-h-full w-full overflow-hidden bg-[#dfe8ec]"
            showEmptyOverlay={false}
            showLayerControls={false}
          />
        ) : (
          <FallbackMap markers={[]} />
        )}
      </div>
      <div className="shrink-0 border-t border-line bg-white px-4 py-2 text-xs leading-5 text-muted">
        Demo spatial context only. Synthetic geometries are not official GIS, parcel, planning, or risk boundaries.
      </div>
    </section>
  );
}
