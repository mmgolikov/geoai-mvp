"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

function getMapboxToken() {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

function hasUsableMapboxToken(token: string) {
  return token.trim().length > 0 && !token.includes("replace_with");
}

function FallbackHeroMap() {
  return (
    <div
      className="relative h-full min-h-0 overflow-hidden bg-[#dceaf2]"
      data-landing-basemap-mode="fallback_city"
      role="img"
      aria-label="Stylized Dubai urban screening map with three candidate areas"
    >
      <div className="absolute inset-0 bg-[linear-gradient(116deg,transparent_0_18%,rgba(255,255,255,0.72)_18%_20%,transparent_20%_47%,rgba(255,255,255,0.76)_47%_50%,transparent_50%),linear-gradient(24deg,transparent_0_36%,rgba(255,255,255,0.68)_36%_39%,transparent_39%)]" />
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,rgba(13,97,250,0.08)_1px,transparent_1px),linear-gradient(rgba(13,97,250,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      {Array.from({ length: 22 }).map((_, index) => {
        const left = 4 + ((index * 17) % 88);
        const top = 8 + ((index * 29) % 78);
        const width = 32 + ((index * 13) % 54);
        const height = 18 + ((index * 11) % 48);
        return (
          <span
            key={index}
            className="absolute rounded-[3px] border border-white/70 bg-[#93aebe]/70 shadow-[0_5px_12px_rgba(6,18,46,0.12)]"
            style={{ left: `${left}%`, top: `${top}%`, width, height }}
            aria-hidden="true"
          />
        );
      })}
      <div className="absolute left-[8%] top-[15%] h-[28%] w-[35%] rotate-[-7deg] rounded-[28%] border-2 border-accent bg-accent/10" />
      <div className="absolute right-[9%] top-[30%] h-[24%] w-[27%] rotate-[5deg] rounded-[30%] border-2 border-brand bg-brand/10" />
      <div className="absolute bottom-[8%] left-[24%] h-[35%] w-[46%] rotate-[7deg] rounded-[34%] border-2 border-brand bg-brand/10" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(244,249,255,0.05),rgba(6,18,46,0.16))]" />
    </div>
  );
}

export function LandingHeroMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const mapboxToken = getMapboxToken();
  const canUseMapbox = hasUsableMapboxToken(mapboxToken);

  useEffect(() => {
    if (!canUseMapbox || !mapContainerRef.current || mapRef.current) return;

    let isMounted = true;

    async function initializeMap() {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (!isMounted || !mapContainerRef.current) return;

        mapboxgl.accessToken = mapboxToken;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          center: [55.2671, 25.1872],
          zoom: 14.65,
          pitch: 58,
          bearing: -23,
          interactive: false,
          attributionControl: true,
          antialias: true
        });

        mapRef.current = map;
        map.on("error", () => setMapFailed(true));
      } catch {
        setMapFailed(true);
      }
    }

    void initializeMap();

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [canUseMapbox, mapboxToken]);

  if (!canUseMapbox || mapFailed) return <FallbackHeroMap />;

  return (
    <div
      className="relative h-full min-h-0 overflow-hidden"
      data-landing-basemap-mode="mapbox_satellite"
      role="img"
      aria-label="Satellite map of Dubai used as a marketing screening illustration"
    >
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(244,249,255,0.02),rgba(6,18,46,0.18))]" />
    </div>
  );
}
