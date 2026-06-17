"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";

function getMapboxToken() {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

function hasUsableMapboxToken(token: string) {
  return token.trim().length > 0 && !token.includes("replace_with");
}

function FallbackHeroMap() {
  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#e6e8df]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,79,99,0.10)_1px,transparent_1px),linear-gradient(rgba(23,79,99,0.10)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute left-[8%] top-[12%] h-[72%] w-[82%] rounded-[42%] border border-white/70 bg-white/24" />
      <div className="absolute left-[10%] top-[24%] h-24 w-[44%] rotate-[-8deg] rounded-[28px] border border-brand/45 bg-brand/12" />
      <div className="absolute right-[10%] top-[18%] h-28 w-[36%] rounded-[30px] border border-[#c5a76a]/60 bg-[#c5a76a]/18" />
      <div className="absolute bottom-[20%] left-[18%] h-28 w-[46%] rotate-[7deg] rounded-[30px] border border-[#2c7fb8]/50 bg-[#2c7fb8]/12" />
      <div className="absolute left-[52%] top-[48%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
        <span className="h-5 w-5 rounded-full border-4 border-white bg-brand shadow-soft" />
        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
          Selected site: Dubai Marina
        </span>
      </div>
    </div>
  );
}

export function LandingHeroMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const mapboxToken = getMapboxToken();
  const canUseMapbox = hasUsableMapboxToken(mapboxToken);

  useEffect(() => {
    if (!canUseMapbox || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;

    async function initializeMap() {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;

        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        mapboxgl.accessToken = mapboxToken;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [55.1397, 25.078],
          zoom: 11.7,
          pitch: 28,
          bearing: -12,
          interactive: false,
          attributionControl: false
        });

        mapRef.current = map;
        map.on("load", () => {
          markerRef.current = new mapboxgl.Marker({ color: "#174f63" })
            .setLngLat([55.1397, 25.078])
            .addTo(map);
        });
        map.on("error", () => setMapFailed(true));
      } catch {
        setMapFailed(true);
      }
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

  if (!canUseMapbox || mapFailed) {
    return <FallbackHeroMap />;
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(251,250,247,0.08),rgba(251,250,247,0.34))]" />
      <div className="pointer-events-none absolute left-5 top-5 rounded-md border border-white/80 bg-white/92 px-3 py-2 text-xs font-semibold text-muted shadow-sm">
        Demo layers active
      </div>
      <div className="pointer-events-none absolute left-[48%] top-[48%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
        <span className="h-5 w-5 rounded-full border-4 border-white bg-brand shadow-soft" />
        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
          Selected site: Dubai Marina
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-5 left-5 right-5 grid gap-2 sm:grid-cols-3">
        {["Market context", "Spatial layers", "Risk zones"].map((item) => (
          <div key={item} className="rounded-md border border-white/80 bg-white/92 px-3 py-2 text-xs font-semibold text-muted shadow-sm">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
