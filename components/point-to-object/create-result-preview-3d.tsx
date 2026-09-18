"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

import { PointObjectIcon } from "@/components/point-to-object/point-object-icons";
import type { ConceptMassingResult, PointObjectCreateAoi } from "@/src/lib/prototype/point-to-object-create";
import { buildPointObjectCreatePreviewModel } from "@/src/lib/prototype/point-to-object-create-preview";

type Props = {
  locale: "en" | "ru";
  aoi: PointObjectCreateAoi;
  massing: ConceptMassingResult;
  fallback: ReactNode;
};

type PreviewStatus = "initializing" | "ready" | "unsupported" | "error";

const AOI_SOURCE_ID = "create-result-preview-aoi";
const MASSING_SOURCE_ID = "create-result-preview-massing";

const BLANK_STYLE: StyleSpecification = {
  version: 8,
  name: "GeoAI saved concept preview",
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#edf4f2" } }]
};

function webGlAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function CreateResultPreview3D({ locale, aoi, massing, fallback }: Props) {
  const ru = locale === "ru";
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const model = useMemo(() => buildPointObjectCreatePreviewModel(aoi, massing), [aoi, massing]);
  const modelRef = useRef(model);
  modelRef.current = model;
  const [status, setStatus] = useState<PreviewStatus>("initializing");

  const resetCamera = useCallback((duration = 0) => {
    const map = mapRef.current;
    const current = modelRef.current;
    if (!map || !current) return;
    map.fitBounds(current.bounds, { padding: 42, maxZoom: 19, duration });
    map.setPitch(55);
    map.setBearing(-24);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let animationFrame: number | null = null;
    const container = containerRef.current;
    if (!container || !modelRef.current) {
      setStatus("error");
      return;
    }
    if (!webGlAvailable()) {
      setStatus("unsupported");
      return;
    }

    setStatus("initializing");
    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current || !modelRef.current) return;
      try {
        maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
        const current = modelRef.current;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: BLANK_STYLE,
          center: current.center,
          zoom: 16,
          pitch: 55,
          bearing: -24,
          attributionControl: false,
          cooperativeGestures: true,
          scrollZoom: false,
          dragRotate: true,
          touchPitch: true
        });
        mapRef.current = map;
        map.keyboard.enable();

        let failed = false;
        const fail = () => {
          if (cancelled || failed) return;
          failed = true;
          map.off("error", fail);
          map.remove();
          if (mapRef.current === map) mapRef.current = null;
          setStatus("error");
        };
        map.on("error", fail);
        map.once("load", () => {
          if (cancelled || !modelRef.current) return;
          const loaded = modelRef.current;
          map.addSource(AOI_SOURCE_ID, { type: "geojson", data: loaded.aoiFeature });
          map.addLayer({
            id: "create-result-preview-aoi-fill",
            type: "fill",
            source: AOI_SOURCE_ID,
            paint: { "fill-color": "#d5ebe4", "fill-opacity": 0.6 }
          });
          map.addLayer({
            id: "create-result-preview-aoi-line",
            type: "line",
            source: AOI_SOURCE_ID,
            paint: { "line-color": "#087f8c", "line-width": 2.5, "line-dasharray": [2, 1.5] }
          });
          map.addSource(MASSING_SOURCE_ID, { type: "geojson", data: loaded.massingFeatureCollection });
          map.addLayer({
            id: "create-result-preview-volumes",
            type: "fill-extrusion",
            source: MASSING_SOURCE_ID,
            paint: {
              "fill-extrusion-color": [
                "match", ["get", "volumeRole"],
                "podium", "#6ab8a9",
                "tower", "#087f8c",
                "perimeter_wing", "#277f78",
                "courtyard_wing", "#378f83",
                "campus_block", "#4f8fa3",
                "#087f8c"
              ],
              "fill-extrusion-height": ["get", "heightM"],
              "fill-extrusion-base": ["get", "baseM"],
              "fill-extrusion-opacity": 0.9,
              "fill-extrusion-vertical-gradient": true
            }
          });
          resetCamera();
          setStatus("ready");
          animationFrame = window.requestAnimationFrame(() => map.resize());
        });
        resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => map.resize());
        resizeObserver?.observe(containerRef.current);
      } catch {
        mapRef.current?.remove();
        mapRef.current = null;
        if (!cancelled) setStatus("error");
      }
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [resetCamera]);

  useEffect(() => {
    if (status !== "ready" || !model) return;
    (mapRef.current?.getSource(AOI_SOURCE_ID) as GeoJSONSource | undefined)?.setData(model.aoiFeature);
    (mapRef.current?.getSource(MASSING_SOURCE_ID) as GeoJSONSource | undefined)?.setData(model.massingFeatureCollection);
  }, [model, status]);

  if (status === "unsupported" || status === "error") {
    return <div className="space-y-3" data-testid="create-result-preview-3d-fallback" data-preview-status={status}>
      <div className="rounded-2xl border border-[#e1c98d] bg-[#fff9e9] p-4 text-sm leading-6 text-[#6b5524]" role="status">
        <strong>{ru ? "3D-просмотр недоступен." : "3D preview is unavailable."}</strong>{" "}
        {ru ? "Сохранённая геометрия не изменена; ниже доступен исходный 2D-план." : "The saved geometry is unchanged; the original 2D plan remains available below."}
      </div>
      {fallback}
    </div>;
  }

  return <figure
    className="min-w-0 rounded-[24px] border border-[#bdd8d1] bg-[#eaf5f1] p-4"
    data-testid="create-result-preview-3d"
    data-preview-status={status}
    data-preview-variant={massing.variantId}
    data-preview-feature-count={model?.featureCount ?? 0}
    data-preview-max-height-m={model?.maxHeightM ?? "unknown"}
    data-preview-min-base-m={model?.minBaseM ?? "unknown"}
    data-preview-geometry-key={model?.geometryKey ?? "invalid"}
  >
    <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-bold text-[#173b35]"><PointObjectIcon name="map" className="h-5 w-5 text-[#087f8c]" />{ru ? "Интерактивная 3D-модель" : "Interactive 3D massing"}</span>
      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#176548]">{ru ? "Вариант" : "Option"} {massing.variantId}</span>
    </figcaption>
    <div className="relative min-h-[300px] overflow-hidden rounded-2xl bg-[#edf4f2] sm:min-h-[390px]" aria-label={ru ? `3D-просмотр сохранённой геометрии, вариант ${massing.variantId}` : `3D preview of saved geometry, option ${massing.variantId}`} role="region">
      <div ref={containerRef} data-testid="create-result-preview-3d-canvas" className="absolute inset-0" style={{ touchAction: "pan-y" }} />
      {status === "initializing" ? <div className="absolute inset-0 grid place-items-center bg-[#edf4f2]/90 px-5 text-center text-sm font-semibold text-[#52606a]" role="status">{ru ? "Подготовка локальной 3D-сцены…" : "Preparing the local 3D scene…"}</div> : null}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-xl bg-white/95 p-2 shadow-soft" aria-label={ru ? "Управление камерой" : "Camera controls"}>
        <button type="button" disabled={status !== "ready"} onClick={() => mapRef.current?.zoomIn({ duration: 180 })} className="min-h-11 min-w-11 rounded-lg border border-[#b8cbc6] bg-white px-3 text-sm font-bold text-[#176548] disabled:opacity-50" aria-label={ru ? "Приблизить" : "Zoom in"}>+</button>
        <button type="button" disabled={status !== "ready"} onClick={() => mapRef.current?.zoomOut({ duration: 180 })} className="min-h-11 min-w-11 rounded-lg border border-[#b8cbc6] bg-white px-3 text-sm font-bold text-[#176548] disabled:opacity-50" aria-label={ru ? "Отдалить" : "Zoom out"}>−</button>
        <button type="button" disabled={status !== "ready"} onClick={() => resetCamera(250)} className="min-h-11 rounded-lg border border-[#b8cbc6] bg-white px-3 text-xs font-bold text-[#176548] disabled:opacity-50">{ru ? "Сбросить вид" : "Reset view"}</button>
      </div>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-[#62716d]">{ru ? "Локальная сцена использует только сохранённые GeoJSON-контуры и их абсолютные heightM/baseM. Для жестов карты требуется два пальца; прокрутка страницы одним пальцем сохраняется." : "This local scene uses only the saved GeoJSON footprints and their absolute heightM/baseM values. Map gestures require two fingers so one-finger page scrolling remains available."}</p>
  </figure>;
}
