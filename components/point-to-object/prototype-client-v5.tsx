"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { PointObjectCreatePanel, type PointObjectGeneratedConcept } from "@/components/point-to-object/create-panel";
import { LiveObjectMap, type LiveMapNavigationTarget, type LiveMapViewMode } from "@/components/point-to-object/live-object-map";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import { PointObjectHeader } from "@/components/point-to-object/prototype-header";
import {
  clearPointObjectAnalysis,
  clearPointObjectSelection,
  parseLiveResolvedObject,
  readPointObjectQuestion,
  readPointObjectSelection,
  writePointObjectQuestion,
  writePointObjectSelection
} from "@/components/point-to-object/live-session";
import type {
  LiveMapLocationKey,
  LiveMapSearchResult,
  LiveMapSelection,
  PointObjectLiveContextResponse,
  PointObjectSearchResponse
} from "@/components/point-to-object/live-types";
import { closePolygonRing, validatePolygonVertices } from "@/src/lib/polygon-aoi";
import {
  type PointObjectAreaContextGroup,
  type PointObjectAreaContextResult
} from "@/src/lib/prototype/point-to-object-area-context-contract";
import type { PointObjectCreateAoi } from "@/src/lib/prototype/point-to-object-create";
import {
  POINT_OBJECT_FIND_GROUPS,
  type PointObjectFindBounds,
  type PointObjectFindGroup,
  type PointObjectFindResult
} from "@/src/lib/prototype/point-to-object-find-contract";
import { POINT_OBJECT_MARKETS } from "@/src/lib/prototype/point-to-object-markets";

type ProductMode = "analyse" | "find" | "create";
type Coordinate = [number, number];

function sameCoordinate(left: Coordinate, right: Coordinate): boolean {
  return Math.abs(left[0] - right[0]) < 1e-9 && Math.abs(left[1] - right[1]) < 1e-9;
}

function extractSinglePolygon(value: unknown): Coordinate[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as { type?: unknown; coordinates?: unknown; geometry?: unknown; features?: unknown };
  let geometry: unknown = null;
  if (candidate.type === "Polygon") geometry = candidate;
  else if (candidate.type === "Feature") geometry = candidate.geometry;
  else if (candidate.type === "FeatureCollection" && Array.isArray(candidate.features) && candidate.features.length === 1) {
    const feature = candidate.features[0];
    if (feature && typeof feature === "object" && !Array.isArray(feature)) geometry = (feature as { geometry?: unknown }).geometry;
  }
  if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) return null;
  const polygon = geometry as { type?: unknown; coordinates?: unknown };
  if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates) || polygon.coordinates.length !== 1) return null;
  const ring = polygon.coordinates[0];
  if (!Array.isArray(ring) || ring.some((coordinate) => !Array.isArray(coordinate) || coordinate.length !== 2 || !Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1]))) return null;
  const vertices = ring.map((coordinate) => [coordinate[0] as number, coordinate[1] as number] as Coordinate);
  if (vertices.length > 1 && sameCoordinate(vertices[0], vertices[vertices.length - 1])) vertices.pop();
  return vertices;
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").replaceAll(":", " · ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function isSearchResponse(value: unknown): value is PointObjectSearchResponse {
  if (!value || typeof value !== "object" || !("mode" in value)) return false;
  if (value.mode === "unavailable") return true;
  if (value.mode !== "results" || !("results" in value) || !Array.isArray(value.results)) return false;
  return value.results.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<LiveMapSearchResult>;
    return typeof candidate.id === "string" && typeof candidate.label === "string" &&
      typeof candidate.longitude === "number" && Number.isFinite(candidate.longitude) &&
      typeof candidate.latitude === "number" && Number.isFinite(candidate.latitude);
  });
}

function isFindResult(value: unknown): value is PointObjectFindResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { protocol?: unknown; mode?: unknown; candidates?: unknown; coverage?: unknown };
  return candidate.protocol === "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1" &&
    (candidate.mode === "results" || candidate.mode === "empty") &&
    Array.isArray(candidate.candidates) && typeof candidate.coverage === "object" && candidate.coverage !== null;
}

function isAreaContextResult(value: unknown): value is PointObjectAreaContextResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { protocol?: unknown; mode?: unknown; features?: unknown; summary?: unknown; coverage?: unknown };
  return candidate.protocol === "POINT_TO_OBJECT_001_AREA_CONTEXT_V1" &&
    (candidate.mode === "results" || candidate.mode === "empty") &&
    Array.isArray(candidate.features) &&
    typeof candidate.summary === "object" && candidate.summary !== null &&
    typeof candidate.coverage === "object" && candidate.coverage !== null;
}

export function PointToObjectPrototypeV5() {
  const router = useRouter();
  const { locale, t } = usePointObjectLocale();
  const [locationKey, setLocationKey] = useState<LiveMapLocationKey>("dubai");
  const [selection, setSelection] = useState<LiveMapSelection | null>(null);
  const [question, setQuestion] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [contextStatus, setContextStatus] = useState<"idle" | "loading" | "error">("idle");
  const [contextRetryVersion, setContextRetryVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LiveMapSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [navigationTarget, setNavigationTarget] = useState<LiveMapNavigationTarget | null>(null);
  const [viewModeRequest, setViewModeRequest] = useState<{ requestId: string; mode: LiveMapViewMode } | null>(null);
  const [mode, setMode] = useState<ProductMode>("analyse");
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftCoordinates, setDraftCoordinates] = useState<Coordinate[]>([]);
  const [createAoi, setCreateAoi] = useState<PointObjectCreateAoi | null>(null);
  const [generatedConcept, setGeneratedConcept] = useState<PointObjectGeneratedConcept | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createAreaCleared, setCreateAreaCleared] = useState(false);
  const [areaContext, setAreaContext] = useState<PointObjectAreaContextResult | null>(null);
  const [areaContextStatus, setAreaContextStatus] = useState<"idle" | "loading" | "error">("idle");
  const [areaContextRetryVersion, setAreaContextRetryVersion] = useState(0);
  const [visibleBounds, setVisibleBounds] = useState<PointObjectFindBounds | null>(null);
  const [findGroup, setFindGroup] = useState<PointObjectFindGroup>("residential");
  const [findMinimumLevels, setFindMinimumLevels] = useState("");
  const [findResult, setFindResult] = useState<PointObjectFindResult | null>(null);
  const [findStatus, setFindStatus] = useState<"idle" | "loading" | "zoom" | "rate" | "error">("idle");
  const findRequestRef = useRef<AbortController | null>(null);
  const contextRequestId = useRef(0);
  const searchRequestRef = useRef<AbortController | null>(null);
  const previousLocaleRef = useRef(locale);

  useEffect(() => {
    const restoredSelection = readPointObjectSelection();
    if (restoredSelection) {
      setLocationKey(restoredSelection.locationKey);
      setSelection(restoredSelection);
    }
    setQuestion(readPointObjectQuestion());
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (!sessionReady || previousLocaleRef.current === locale) return;
    previousLocaleRef.current = locale;
    contextRequestId.current += 1;
    setSelection((current) => current ? { ...current, resolvedObject: null } : current);
    setSearchResults([]);
    setSearchStatus("idle");
    setFindResult(null);
    setFindStatus("idle");
  }, [locale, sessionReady]);

  useEffect(() => {
    if (selection) writePointObjectSelection(selection);
  }, [selection]);

  useEffect(() => {
    if (!selection || selection.resolvedObject) {
      setContextStatus("idle");
      return;
    }
    const requestId = contextRequestId.current + 1;
    contextRequestId.current = requestId;
    const controller = new AbortController();
    setContextStatus("loading");
    const timer = window.setTimeout(() => {
      void fetch("/api/prototype/point-to-object/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseKey: selection.locationKey, longitude: selection.longitude, latitude: selection.latitude, locale }),
        signal: controller.signal
      }).then(async (response) => {
        const payload = await response.json() as PointObjectLiveContextResponse;
        if (controller.signal.aborted || requestId !== contextRequestId.current) return;
        if (!response.ok || payload.mode !== "resolved") {
          setContextStatus("error");
          return;
        }
        const resolvedObject = parseLiveResolvedObject(payload.subject);
        if (!resolvedObject) {
          setContextStatus("error");
          return;
        }
        const storedSelection = readPointObjectSelection();
        setSelection((current) => current?.clickedAt === selection.clickedAt ? {
          ...current,
          viewport: storedSelection?.clickedAt === current.clickedAt ? storedSelection.viewport : current.viewport,
          resolvedObject
        } : current);
        setContextStatus("idle");
      }).catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        if (requestId === contextRequestId.current) setContextStatus("error");
      });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selection, contextRetryVersion, locale]);

  useEffect(() => () => {
    searchRequestRef.current?.abort();
    findRequestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!createAoi || mode !== "create") {
      setAreaContext(null);
      setAreaContextStatus("idle");
      return;
    }
    const controller = new AbortController();
    setAreaContextStatus("loading");
    setAreaContext(null);
    void fetch("/api/prototype/point-to-object/area-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketKey: locationKey, locale, aoiCoordinates: createAoi.coordinates }),
      signal: controller.signal
    }).then(async (response) => {
      const payload: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || !isAreaContextResult(payload)) {
        setAreaContextStatus("error");
        return;
      }
      setAreaContext(payload);
      setAreaContextStatus("idle");
    }).catch((error: unknown) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      setAreaContextStatus("error");
    });
    return () => controller.abort();
  }, [areaContextRetryVersion, createAoi, locale, locationKey, mode]);

  const handleSelection = useCallback((nextSelection: LiveMapSelection | null) => {
    contextRequestId.current += 1;
    setSelection(nextSelection);
    setContextStatus(nextSelection ? "loading" : "idle");
    clearPointObjectAnalysis();
  }, []);

  const handleViewportChange = useCallback((nextSelection: LiveMapSelection) => writePointObjectSelection(nextSelection), []);

  function changeMarket(nextMarket: LiveMapLocationKey) {
    if (nextMarket === locationKey) return;
    searchRequestRef.current?.abort();
    setLocationKey(nextMarket);
    setSelection(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setNavigationTarget(null);
    setDraftCoordinates([]);
    setCreateAoi(null);
    setGeneratedConcept(null);
    setCreateAreaCleared(false);
    setAreaContext(null);
    setAreaContextStatus("idle");
    setIsDrawing(false);
    setCreateError(null);
    setFindResult(null);
    setFindStatus("idle");
    clearPointObjectSelection();
    clearPointObjectAnalysis();
    contextRequestId.current += 1;
    setContextStatus("idle");
  }

  async function findInView() {
    if (!visibleBounds || findStatus === "loading") return;
    findRequestRef.current?.abort();
    const controller = new AbortController();
    findRequestRef.current = controller;
    setFindStatus("loading");
    try {
      const mappedMinimumLevels = findMinimumLevels.trim() ? Number(findMinimumLevels) : null;
      const response = await fetch("/api/prototype/point-to-object/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ marketKey: locationKey, locale, bounds: visibleBounds, group: findGroup, mappedMinimumLevels, limit: 12 })
      });
      const payload: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (response.ok && isFindResult(payload)) {
        setFindResult(payload);
        setFindStatus("idle");
      } else if (response.status === 400) {
        setFindStatus("zoom");
      } else if (response.status === 429) {
        setFindStatus("rate");
      } else {
        setFindStatus("error");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFindStatus("error");
    } finally {
      if (findRequestRef.current === controller) findRequestRef.current = null;
    }
  }

  function chooseFindCandidate(candidate: PointObjectFindResult["candidates"][number]) {
    setNavigationTarget({ requestId: `find:${candidate.sourceFeatureId}:${Date.now()}`, longitude: candidate.longitude, latitude: candidate.latitude, zoom: 18 });
    setMode("analyse");
  }

  function changeMode(nextMode: ProductMode) {
    setMode(nextMode);
    if (nextMode === "find") {
      setViewModeRequest({ requestId: `find-2d:${Date.now()}`, mode: "2d" });
    }
    if (nextMode !== "create") {
      setIsDrawing(false);
      setDraftCoordinates([]);
      setCreateAoi(null);
      setGeneratedConcept(null);
      setCreateAreaCleared(false);
      setAreaContext(null);
      setAreaContextStatus("idle");
      setCreateError(null);
    }
  }

  function addCreateVertex(coordinate: Coordinate) {
    if (!isDrawing || draftCoordinates.length >= 25) return;
    setDraftCoordinates((current) => current.length >= 25 ? current : [...current, coordinate]);
    setCreateError(null);
  }

  function closeCreateArea(vertices = draftCoordinates) {
    if (vertices.length > 25) {
      setCreateError(t("create.uploadError"));
      return;
    }
    const validation = validatePolygonVertices(vertices);
    if (!validation.valid || !validation.measurements || validation.measurements.areaSqM > 1_000_000) {
      setCreateError(t("create.uploadError"));
      return;
    }
    const ring = closePolygonRing(vertices);
    setCreateAoi({
      id: `create-aoi-${Date.now()}`,
      coordinates: [ring],
      areaSqM: validation.measurements.areaSqM,
      perimeterM: validation.measurements.perimeterM,
      vertexCount: vertices.length
    });
    setDraftCoordinates(vertices);
    setIsDrawing(false);
    setGeneratedConcept(null);
    setCreateAreaCleared(false);
    setCreateError(null);
  }

  async function uploadCreateArea(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || file.size > 1_000_000) {
      setCreateError(t("create.uploadError"));
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const vertices = extractSinglePolygon(parsed);
      if (!vertices) throw new Error("invalid");
      setDraftCoordinates(vertices);
      closeCreateArea(vertices);
    } catch {
      setCreateError(t("create.uploadError"));
    }
  }

  function resetCreate() {
    setIsDrawing(false);
    setDraftCoordinates([]);
    setCreateAoi(null);
    setGeneratedConcept(null);
    setCreateAreaCleared(false);
    setAreaContext(null);
    setAreaContextStatus("idle");
    setCreateError(null);
  }

  async function searchPlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2 || searchStatus === "loading") return;
    searchRequestRef.current?.abort();
    const controller = new AbortController();
    searchRequestRef.current = controller;
    setSearchStatus("loading");
    setSearchResults([]);
    try {
      const response = await fetch("/api/prototype/point-to-object/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketKey: locationKey, locale, query }),
        signal: controller.signal
      });
      const payload: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || !isSearchResponse(payload) || payload.mode !== "results") {
        setSearchStatus("error");
        return;
      }
      setSearchResults(payload.results);
      setSearchStatus(payload.results.length ? "idle" : "empty");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setSearchStatus("error");
    } finally {
      if (searchRequestRef.current === controller) searchRequestRef.current = null;
    }
  }

  function chooseSearchResult(result: LiveMapSearchResult) {
    setSearchQuery(result.label);
    setSearchResults([]);
    setSearchStatus("idle");
    setNavigationTarget({ requestId: `${result.id}:${Date.now()}`, longitude: result.longitude, latitude: result.latitude, zoom: 18 });
  }

  function startAnalysis() {
    if (!selection?.resolvedObject) return;
    const storedSelection = readPointObjectSelection();
    const activeSelection = storedSelection?.clickedAt === selection.clickedAt ? { ...selection, viewport: storedSelection.viewport } : selection;
    writePointObjectSelection(activeSelection);
    writePointObjectQuestion(question.trim());
    clearPointObjectAnalysis();
    router.push("/prototype/point-to-object/analysis");
  }

  const selectionTitle = selection?.resolvedObject?.name ?? selection?.object.name ?? (selection?.object.featureClass.toLowerCase().includes("building")
    ? t("selection.building")
    : selection?.object.geometry ? t("selection.object", { kind: humanize(selection.object.featureClass) }) : t("selection.location"));
  const selectionContextLabel = !selection?.resolvedObject ? t("selection.selected") : selection.resolvedObject.coordinateAssociation === "open_map_geometry_contains_point" ? t("selection.containing") : t("selection.nearest");
  const relationLabel = selection?.resolvedObject ? selection.resolvedObject.coordinateAssociation === "open_map_geometry_contains_point" ? t("selection.relation.containing") : t("selection.relation.nearest", { distance: Math.round(selection.resolvedObject.resultCentroidDistanceM) }) : null;
  const selectedAttributes = Object.entries(selection?.resolvedObject?.tags ?? {}).filter(([key]) => !["classification.category", "classification.type", "classification.address_type"].includes(key)).slice(0, 3);
  const findGroupLabels: Record<PointObjectFindGroup, string> = locale === "ru" ? {
    residential: "Жилая недвижимость", commercial_office: "Офисы и коммерция", hospitality: "Гостиницы", retail: "Ретейл", education: "Образование", healthcare: "Здравоохранение", civic_culture: "Общественные и культурные", industrial_logistics: "Промышленность и логистика", construction: "Строительство"
  } : {
    residential: "Residential", commercial_office: "Commercial & office", hospitality: "Hospitality", retail: "Retail", education: "Education", healthcare: "Healthcare", civic_culture: "Civic & culture", industrial_logistics: "Industrial & logistics", construction: "Construction"
  };
  const areaGroupLabels: Record<PointObjectAreaContextGroup, string> = locale === "ru" ? {
    residential: "Жильё", commercial: "Деловые объекты", hospitality: "Гостиницы", retail_daily_needs: "Торговля и услуги", education: "Образование", healthcare: "Здравоохранение", civic_culture: "Общественные объекты", transport: "Транспорт", access: "Дороги", open_space: "Открытые пространства", industrial: "Промышленность", construction: "Строительство", other_built: "Прочая застройка"
  } : {
    residential: "Residential", commercial: "Commercial", hospitality: "Hospitality", retail_daily_needs: "Retail & services", education: "Education", healthcare: "Healthcare", civic_culture: "Civic", transport: "Transport", access: "Roads", open_space: "Open space", industrial: "Industrial", construction: "Construction", other_built: "Other built"
  };

  return (
    <main className="min-h-screen bg-white text-ink lg:h-[100svh] lg:overflow-hidden">
      <PointObjectHeader showDataSources />
      <div className="grid min-h-[calc(100svh-64px)] bg-white lg:h-[calc(100svh-64px)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="relative min-h-[40svh] overflow-hidden border-b border-line lg:h-full lg:min-h-0 lg:border-b-0" aria-label={t("map.region")}>
          {sessionReady ? <LiveObjectMap locationKey={locationKey} selection={selection} navigationTarget={navigationTarget} viewModeRequest={viewModeRequest} onSelection={handleSelection} onViewportChange={handleViewportChange} onVisibleBoundsChange={setVisibleBounds} createDrawing={mode === "create" && isDrawing} createDraftCoordinates={mode === "create" ? draftCoordinates : []} createAoi={mode === "create" ? createAoi : null} createAreaCleared={mode === "create" && createAreaCleared} conceptMassing={mode === "create" ? generatedConcept?.massing ?? null : null} onCreateVertex={addCreateVertex} className="min-h-[40svh] lg:min-h-0" /> : <div className="grid h-full min-h-[40svh] place-items-center bg-[#f4f6f7] text-sm font-medium text-[#52606a]" role="status">{t("map.loading")}</div>}
          <div className="absolute left-4 top-4 z-10 flex w-[min(650px,calc(100%-5rem))] flex-col gap-2 sm:left-5 sm:top-5 sm:flex-row">
            <label className="flex h-11 w-fit shrink-0 items-center rounded-xl border border-white/70 bg-white/95 px-3 shadow-[0_10px_30px_rgba(20,35,45,0.14)] backdrop-blur">
              <span className="sr-only">{t("city.label")}</span>
              <select value={locationKey} onChange={(event) => changeMarket(event.target.value as LiveMapLocationKey)} aria-label={t("city.label")} className="max-w-[150px] bg-transparent text-sm font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
                {POINT_OBJECT_MARKETS.map((market) => <option key={market.key} value={market.key}>{market.label[locale]}</option>)}
              </select>
            </label>
            <form onSubmit={searchPlace} role="search" className="relative min-w-0 flex-1">
              <div className="flex h-11 overflow-hidden rounded-xl border border-white/70 bg-white/95 shadow-[0_10px_30px_rgba(20,35,45,0.14)] backdrop-blur focus-within:ring-2 focus-within:ring-[#087f8c]">
                <input type="search" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value.slice(0, 120)); setSearchResults([]); setSearchStatus("idle"); }} aria-label={t("search.label")} placeholder={t("search.placeholder")} className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-[#98a2b3]" />
                <button type="submit" disabled={searchQuery.trim().length < 2 || searchStatus === "loading"} className="min-w-[76px] bg-[#087f8c] px-3 text-xs font-bold text-white transition hover:bg-[#006c78] disabled:cursor-not-allowed disabled:bg-[#9cb8b9] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white">{searchStatus === "loading" ? t("search.loading") : t("search.action")}</button>
              </div>
              {searchResults.length ? <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-panel" aria-label={t("search.results")}>
                {searchResults.map((result) => <button key={result.id} type="button" onClick={() => chooseSearchResult(result)} className="block min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-[#f0f9f8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"><span className="block text-sm font-bold text-ink">{result.label}</span>{result.secondaryLabel ? <span className="mt-0.5 block truncate text-[11px] text-muted">{result.secondaryLabel}</span> : null}</button>)}
              </div> : searchStatus === "empty" || searchStatus === "error" ? <p className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-[#475467] shadow-panel" role="status">{searchStatus === "empty" ? t("search.empty") : t("search.error")}</p> : null}
            </form>
          </div>
        </section>

        <aside className="min-w-0 border-l border-line bg-white lg:h-full lg:overflow-hidden">
          <div className={`flex min-h-full flex-col p-5 pb-3 sm:p-6 sm:pb-3 lg:h-full lg:min-h-0 ${mode === "create" ? "lg:overflow-y-auto" : ""}`}>
            <div className="mb-4 grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-[#f2f5f4] p-1" role="tablist" aria-label={t("mode.label")}>
              {(["analyse", "find", "create"] as ProductMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => changeMode(item)} className={`min-h-9 rounded-lg px-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${mode === item ? "bg-white text-[#087f8c] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>{t(`mode.${item}` as "mode.analyse" | "mode.find" | "mode.create")}</button>)}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{mode === "create" ? t("mode.create") : mode === "find" ? t("mode.find") : t("panel.eyebrow")}</p><h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] sm:text-[28px]">{mode === "create" ? t("create.title") : mode === "find" ? t("find.title") : t("panel.title")}</h1><p className="mt-2 text-sm leading-5 text-muted">{mode === "create" ? t("create.body") : mode === "find" ? t("find.body") : t("panel.description")}</p></div>
              <details className="group relative shrink-0"><summary aria-label={t("info.label")} title={t("info.label")} className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full border border-line bg-white text-sm font-bold text-[#087f8c] transition hover:border-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">i</summary><div className="absolute right-0 top-11 z-30 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-line bg-white p-4 text-xs leading-5 text-[#475467] shadow-panel"><p>{t("info.usage")}</p><p className="mt-2">{t("info.source")}</p><p className="mt-2 font-semibold">{t("boundary")}</p></div></details>
            </div>

            {mode === "analyse" ? <><section className="mt-4 min-h-[150px] overflow-hidden rounded-[18px] border border-line bg-[#f8fafc] p-4 lg:min-h-0 lg:flex-1" data-testid="selection-card">
              {selection ? <><p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#667085]">{selectionContextLabel}</p><h2 className="mt-2 break-words text-lg font-bold tracking-[-0.02em]" data-testid="selected-object">{selectionTitle}</h2><p className="mt-1 text-sm text-muted">{humanize(selection.resolvedObject?.featureClass ?? selection.object.featureClass)}</p>
                {selection.resolvedObject?.address ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#475467]">{selection.resolvedObject.address}</p> : null}
                {contextStatus === "loading" ? <p className="mt-3 text-xs font-semibold text-[#087f8c]" role="status">{t("selection.resolving")}</p> : null}
                {contextStatus === "error" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e7c47e] bg-[#fffaf0] px-3 py-2 text-xs text-[#6b4b16]" role="alert"><span>{t("selection.error")}</span><button type="button" onClick={() => { setContextStatus("loading"); setContextRetryVersion((value) => value + 1); }} className="min-h-9 shrink-0 rounded-lg border border-[#d6b36e] bg-white px-3 font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{t("selection.retry")}</button></div> : null}
                <dl className="mt-3 grid grid-cols-[82px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[11px]"><dt className="text-muted">{t("field.analysisPoint")}</dt><dd className="truncate font-semibold tabular-nums">{selection.latitude.toFixed(6)}, {selection.longitude.toFixed(6)}</dd>{selection.resolvedObject ? <><dt className="text-muted">{t("field.osmObject")}</dt><dd className="truncate font-semibold">{selection.resolvedObject.sourceFeatureId}</dd><dt className="text-muted">{t("field.relation")}</dt><dd className="line-clamp-1 font-semibold">{relationLabel}</dd></> : null}</dl>
                {selectedAttributes.length ? <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3" aria-label={t("selection.attributes")}>{selectedAttributes.map(([key, value]) => <span key={key} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#475467] ring-1 ring-inset ring-[#d7dee4]">{humanize(key.replace(/^tag\./, "").replace(/^classification\./, ""))} · {value}</span>)}</div> : null}</> : <div className="py-3"><p className="text-sm font-bold">{t("selection.empty.title")}</p><p className="mt-2 text-sm leading-6 text-muted">{t("selection.empty.body")}</p></div>}
            </section>

            <div className="shrink-0 pt-3"><label className="text-xs font-bold text-ink" htmlFor="point-object-question">{t("question.label")} <span className="font-medium text-muted">{t("question.optional")}</span></label><textarea id="point-object-question" value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 500))} rows={2} placeholder={t("question.placeholder")} className="mt-1.5 w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-sm leading-5 outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2]" /><button type="button" onClick={startAnalysis} disabled={!selection?.resolvedObject} className="mt-2 min-h-11 w-full rounded-control bg-[#087f8c] px-4 text-sm font-bold text-white transition hover:bg-[#006c78] disabled:cursor-not-allowed disabled:bg-[#b7c4c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">{selection && !selection.resolvedObject ? t("analyze.resolving") : t("analyze.action")}</button></div>
            </> : null}

            {mode === "find" ? <section className="mt-5 flex min-h-0 flex-1 flex-col rounded-[18px] border border-line bg-[#f8fafc] p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Тип объекта" : "Object group"}<select value={findGroup} onChange={(event) => { setFindGroup(event.target.value as PointObjectFindGroup); setFindResult(null); setFindStatus("idle"); }} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-[#087f8c]">{POINT_OBJECT_FIND_GROUPS.map((group) => <option key={group} value={group}>{findGroupLabels[group]}</option>)}</select></label>
                <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Минимальная этажность по OSM" : "Minimum mapped levels"} <span className="font-medium text-muted">({t("question.optional")})</span><input type="number" min={1} max={100} inputMode="numeric" value={findMinimumLevels} onChange={(event) => { setFindMinimumLevels(event.target.value.replace(/\D/g, "").slice(0, 3)); setFindResult(null); setFindStatus("idle"); }} placeholder={locale === "ru" ? "Например, 10" : "For example, 10"} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-[#087f8c]" /></label>
              </div>
              <button type="button" onClick={() => void findInView()} disabled={!visibleBounds || findStatus === "loading" || (findMinimumLevels !== "" && (Number(findMinimumLevels) < 1 || Number(findMinimumLevels) > 100))} className="mt-3 min-h-11 w-full rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#b7c4c4]">{findStatus === "loading" ? (locale === "ru" ? "Ищем…" : "Searching…") : (locale === "ru" ? "Искать в видимой области" : "Search this view")}</button>
              {findStatus === "zoom" || findStatus === "rate" || findStatus === "error" ? <div className="mt-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs leading-5 text-[#79520d]" role="alert"><p>{findStatus === "zoom" ? (locale === "ru" ? "Приблизьте карту: видимая область слишком велика для ограниченного запроса." : "Zoom in: the visible area is too large for a bounded request.") : findStatus === "rate" ? (locale === "ru" ? "Лимит запросов временно исчерпан. Параметры сохранены — попробуйте ещё раз позже." : "The request is temporarily rate limited. Your criteria are preserved; try again shortly.") : (locale === "ru" ? "Не удалось получить объекты. Параметры сохранены." : "Objects could not be loaded. Your criteria are preserved.")}</p><button type="button" onClick={() => void findInView()} className="mt-2 min-h-9 rounded-lg border border-[#d6b36e] bg-white px-3 font-bold text-ink">{t("selection.retry")}</button></div> : null}
              {findResult ? <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-muted"><span>{findResult.mode === "empty" ? (locale === "ru" ? "В ограниченной выборке текущего окна совпадений нет." : "No mapped matches in this bounded view sample.") : (locale === "ru" ? `Найдено в выборке: ${findResult.candidates.length}` : `Returned in sample: ${findResult.candidates.length}`)}</span><span>{findResult.coverage.approximateAreaSqKm.toLocaleString(locale)} {locale === "ru" ? "км²" : "km²"}</span></div>
                <ul className="space-y-2">{findResult.candidates.map((candidate) => <li key={candidate.sourceFeatureId}><button type="button" onClick={() => chooseFindCandidate(candidate)} className="w-full rounded-xl border border-line bg-white p-3 text-left transition hover:border-[#76bfc1] hover:bg-[#f3fbfb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"><span className="block text-sm font-bold text-ink">{candidate.label}</span><span className="mt-1 block text-[11px] text-muted">{findGroupLabels[candidate.group]}{candidate.mappedBuildingLevels === null ? "" : ` · ${candidate.mappedBuildingLevels} ${locale === "ru" ? "эт." : "levels"}`} · {candidate.matchedTag.key}={candidate.matchedTag.value}</span></button></li>)}</ul>
              </div> : null}
              <details className="mt-3 shrink-0 rounded-xl border border-line bg-white p-3 text-[10px] leading-4 text-muted"><summary className="cursor-pointer font-bold text-[#475467]">{t("info.label")}</summary><p className="mt-2">{locale === "ru" ? "Это ограниченная выборка OpenStreetMap через Overpass API, а не полный реестр. Результаты не ранжируются; порядок основан на идентификаторе источника." : "This is a bounded OpenStreetMap sample via Overpass API, not a complete inventory. Results are not ranked and use source-identity ordering."}</p>{findResult?.coverage.capReached ? <p className="mt-1 font-semibold text-[#79520d]">{locale === "ru" ? "Достигнут лимит ответа источника; часть совпадений могла не войти." : "The upstream cap was reached; additional matches may exist."}</p> : null}<p className="mt-1">© OpenStreetMap contributors · ODbL 1.0.</p></details>
            </section> : null}

            {mode === "create" ? <div className="mt-5 space-y-4">
              {!createAoi ? <section className="rounded-[18px] border border-[#cfe0da] bg-[#f4faf7] p-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setIsDrawing(true); setDraftCoordinates([]); setCreateError(null); setGeneratedConcept(null); }} className="min-h-11 rounded-xl bg-[#087f70] px-3 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] focus-visible:ring-offset-2">{t("create.draw")}</button>
                  <label className="grid min-h-11 cursor-pointer place-items-center rounded-xl border border-[#9bbdb5] bg-white px-3 text-center text-xs font-bold text-[#345c54] focus-within:ring-2 focus-within:ring-[#087f70]"><span>{t("create.upload")}</span><input type="file" accept="application/geo+json,application/json,.geojson,.json" onChange={(event) => void uploadCreateArea(event)} className="sr-only" /></label>
                </div>
                {isDrawing ? <><p className="mt-3 text-xs font-semibold text-[#345c54]">{t("create.drawing", { count: draftCoordinates.length })}</p><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" disabled={draftCoordinates.length < 3} onClick={() => closeCreateArea()} className="min-h-10 rounded-lg bg-[#087f70] px-2 text-xs font-bold text-white disabled:opacity-40">{t("create.close")}</button><button type="button" disabled={!draftCoordinates.length} onClick={() => setDraftCoordinates((current) => current.slice(0, -1))} className="min-h-10 rounded-lg border border-[#b8cbc6] bg-white px-2 text-xs font-bold text-[#345c54] disabled:opacity-40">{t("create.undo")}</button><button type="button" onClick={resetCreate} className="min-h-10 rounded-lg border border-[#b8cbc6] bg-white px-2 text-xs font-bold text-[#345c54]">{t("create.cancel")}</button></div></> : null}
                {createError ? <p className="mt-3 rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-3 py-2 text-xs text-[#79520d]" role="alert">{createError}</p> : null}
              </section> : <><p className="rounded-xl border border-[#cfe0da] bg-[#f4faf7] px-4 py-3 text-xs font-bold text-[#345c54]">{t("create.ready", { area: createAoi.areaSqM >= 10_000 ? `${(createAoi.areaSqM / 10_000).toFixed(2)} ${locale === "ru" ? "га" : "ha"}` : `${Math.round(createAoi.areaSqM).toLocaleString(locale)} ${locale === "ru" ? "м²" : "m²"}` })}</p>
                <section className="rounded-[18px] border border-line bg-[#f8fafc] p-4" aria-live="polite">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#087f70]">{locale === "ru" ? "КОНТЕКСТ ЗОНЫ" : "AREA CONTEXT"}</p><h2 className="mt-1 text-sm font-bold text-ink">{locale === "ru" ? "Сводка объектов внутри полигона" : "Objects inside the polygon"}</h2></div><button type="button" onClick={() => { if (generatedConcept && createAreaCleared) setGeneratedConcept(null); setCreateAreaCleared((value) => !value); }} className="min-h-9 shrink-0 rounded-lg border border-[#8ebdb4] bg-white px-3 text-[11px] font-bold text-[#176548]">{createAreaCleared ? (locale === "ru" ? "Показать исходные" : "Show existing") : (locale === "ru" ? "Очистить 3D" : "Clear 3D")}</button></div>
                  {areaContextStatus === "loading" ? <p className="mt-3 text-xs font-semibold text-[#087f70]" role="status">{locale === "ru" ? "Собираем объекты открытой карты…" : "Reading open-map objects…"}</p> : null}
                  {areaContextStatus === "error" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]" role="alert"><span>{locale === "ru" ? "Контекст зоны временно недоступен." : "Area context is temporarily unavailable."}</span><button type="button" onClick={() => setAreaContextRetryVersion((value) => value + 1)} className="min-h-8 rounded-lg border border-[#d6b36e] bg-white px-2 font-bold">{t("selection.retry")}</button></div> : null}
                  {areaContext ? <><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Объекты" : "Objects"}</span><strong className="mt-1 block text-sm">{areaContext.summary.sampleSize}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Здания" : "Buildings"}</span><strong className="mt-1 block text-sm">{areaContext.summary.mappedBuildingCount}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Медиана этажей" : "Median levels"}</span><strong className="mt-1 block text-sm">{areaContext.summary.medianMappedLevels ?? "—"}</strong></div></div><div className="mt-3 flex flex-wrap gap-1.5">{areaContext.summary.groups.slice(0, 5).map((group) => <span key={group.group} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#475467] ring-1 ring-inset ring-[#d7dee4]">{areaGroupLabels[group.group]} · {group.count}</span>)}</div><p className="mt-3 text-[10px] leading-4 text-muted">{locale === "ru" ? "Учитываются центры объектов, попавшие внутрь зоны; это ограниченная выборка OpenStreetMap, а не полный реестр." : "Uses returned feature centres inside the AOI; this is a bounded OpenStreetMap sample, not a complete inventory."}{areaContext.coverage.capReached ? ` ${locale === "ru" ? "Достигнут лимит ответа." : "The response cap was reached."}` : ""}</p></> : null}
                </section>
                <PointObjectCreatePanel locale={locale} marketKey={locationKey} aoi={createAoi} depth="standard" generated={generatedConcept} onGenerated={(concept) => { setGeneratedConcept(concept); setCreateAreaCleared(true); }} onReset={() => setGeneratedConcept(null)} />{createAreaCleared ? <p className="rounded-xl border border-[#d8e2df] bg-[#f8faf9] px-3 py-2 text-[10px] leading-4 text-[#62716d]">{t("create.mask")}</p> : null}<button type="button" onClick={resetCreate} className="min-h-10 w-full rounded-xl border border-[#b8cbc6] bg-white px-3 text-xs font-bold text-[#345c54]">{t("create.cancel")}</button></>}
            </div> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
