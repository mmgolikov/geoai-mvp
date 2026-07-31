"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoAsset } from "../domain";
import styles from "./pilot.module.css";

const MOSCOW_BOUNDS = {
  west: 37.28,
  east: 37.92,
  south: 55.52,
  north: 55.94
};

function pointPosition([longitude, latitude]: readonly [number, number]) {
  const x = ((longitude - MOSCOW_BOUNDS.west) / (MOSCOW_BOUNDS.east - MOSCOW_BOUNDS.west)) * 100;
  const y = (1 - (latitude - MOSCOW_BOUNDS.south) / (MOSCOW_BOUNDS.north - MOSCOW_BOUNDS.south)) * 100;
  return {
    left: `${Math.min(95, Math.max(5, x))}%`,
    top: `${Math.min(92, Math.max(8, y))}%`
  };
}

interface PilotMapProps {
  assets: DemoAsset[];
  selectedAssetId: DemoAsset["id"];
  onSelect: (assetId: DemoAsset["id"]) => void;
  forceError?: boolean;
}

export function PilotMap({ assets, selectedAssetId, onSelect, forceError = false }: PilotMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markerRefs = useRef<import("mapbox-gl").Marker[]>([]);
  const [mapStatus, setMapStatus] = useState<"fallback" | "loading" | "ready" | "error">(
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !forceError ? "loading" : forceError ? "error" : "fallback"
  );

  useEffect(() => {
    if (forceError) {
      setMapStatus("error");
      return;
    }

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    if (!mapboxToken || !mapContainerRef.current) {
      setMapStatus("fallback");
      return;
    }

    let cancelled = false;

    async function mountMap() {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !mapContainerRef.current) return;
        mapboxgl.accessToken = mapboxToken;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [37.6173, 55.7558],
          zoom: 9.4,
          attributionControl: true
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        assets.forEach((asset) => {
          const markerButton = document.createElement("button");
          markerButton.type = "button";
          markerButton.className = styles.mapboxMarker;
          markerButton.dataset.assetId = asset.id;
          markerButton.setAttribute("aria-label", `Открыть ${asset.title}`);
          markerButton.title = `${asset.id} · ${asset.title}`;
          markerButton.dataset.selected = "false";
          markerButton.addEventListener("click", () => onSelect(asset.id));
          markerRefs.current.push(
            new mapboxgl.Marker({ element: markerButton })
              .setLngLat([...asset.coordinates])
              .addTo(map)
          );
        });

        map.once("load", () => {
          if (!cancelled) setMapStatus("ready");
        });
        map.once("error", () => {
          if (!cancelled) setMapStatus("error");
        });
      } catch {
        if (!cancelled) setMapStatus("error");
      }
    }

    void mountMap();
    return () => {
      cancelled = true;
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [assets, forceError, onSelect]);

  useEffect(() => {
    if (mapStatus !== "ready") return;
    markerRefs.current.forEach((marker) => {
      const element = marker.getElement();
      element.dataset.selected = String(element.dataset.assetId === selectedAssetId);
    });
  }, [mapStatus, selectedAssetId]);

  const useFallback = mapStatus !== "ready";

  return (
    <section className={styles.mapPanel} aria-labelledby="pilot-map-title">
      <div className={styles.sectionHeadingCompact}>
        <div>
          <p className={styles.eyebrow}>Пространственный обзор</p>
          <h2 id="pilot-map-title">{useFallback ? "Схема расположения демонстрационных точек" : "Карта демонстрационных точек"}</h2>
        </div>
        <span className={styles.neutralBadge}>{assets.length} объектов</span>
      </div>

      <div
        className={styles.mapFrame}
        data-testid="map-fallback"
        data-map-mode={useFallback ? "fallback" : "mapbox"}
      >
        <div ref={mapContainerRef} className={mapStatus === "ready" ? styles.liveMap : styles.hiddenMap} aria-hidden={mapStatus !== "ready"} />

        {useFallback ? (
          <div className={styles.fallbackPlot} aria-label="Условная схема точек по округам Москвы">
            <div className={styles.fallbackGrid} aria-hidden="true" />
            <span className={styles.fallbackCenterLabel}>Москва · условная схема</span>
            {assets.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                className={styles.fallbackMarker}
                style={pointPosition(asset.coordinates)}
                data-asset-id={asset.id}
                data-selected={asset.id === selectedAssetId}
                aria-pressed={asset.id === selectedAssetId}
                aria-label={`Открыть ${asset.title}, ${asset.district}`}
                title={`${asset.id} · ${asset.title}`}
                onClick={() => onSelect(asset.id)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {mapStatus === "error" ? (
        <p className={styles.inlineState} role="status">
          <span aria-hidden="true">ⓘ</span> <span>Не удалось отобразить карту. Список объектов остаётся доступен</span>
        </p>
      ) : useFallback ? (
        <p className={styles.mapCaveat}>
          Это не картографическая подложка, не адреса и не кадастровые границы. Условная точка в пределах округа; не является адресом или границей объекта.
        </p>
      ) : (
        <p className={styles.mapCaveat}>
          Mapbox используется только как визуальная подложка и не участвует в доказательствах или расчётах.
        </p>
      )}
    </section>
  );
}
