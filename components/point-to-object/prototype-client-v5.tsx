"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
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
import { closePolygonRing } from "@/src/lib/polygon-aoi";
import {
  type PointObjectAreaContextGroup,
  type PointObjectAreaContextResult
} from "@/src/lib/prototype/point-to-object-area-context-contract";
import {
  type PointObjectCreateAoi,
  validatePointObjectCreateAoiVertices
} from "@/src/lib/prototype/point-to-object-create";
import {
  POINT_OBJECT_FIND_CAVEAT,
  type PointObjectFindBounds,
  type PointObjectFindCandidate,
  type PointObjectFindGroup,
  type PointObjectFindResult
} from "@/src/lib/prototype/point-to-object-find-contract";
import { pointObjectFindCapability } from "@/src/lib/prototype/point-to-object-find-capabilities";
import {
  isPointObjectFindResult,
  readPointObjectFindSession,
  writePointObjectFindSession
} from "@/src/lib/prototype/point-to-object-find-session";
import { POINT_OBJECT_MARKETS, pointObjectAutocompleteQueryReady } from "@/src/lib/prototype/point-to-object-markets";
import {
  getDefaultRoleForAudience,
  getDefaultScenarioForRole,
  getExploreRolesByAudience,
  getExploreScenariosByRole
} from "@/src/lib/explore/scenarios";
import type { ExploreAudience, ExploreRole, ExploreScenarioId } from "@/src/lib/explore/types";

type ProductMode = "analyse" | "find" | "create";
type Coordinate = [number, number];
type ExactOsmFeatureId = `${"node" | "way" | "relation"}/${string}`;
type FindIntent = {
  audience: ExploreAudience;
  role: ExploreRole;
  scenario: ExploreScenarioId;
};

function exactOsmFeatureId(value: string | null | undefined): ExactOsmFeatureId | null {
  return /^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(value ?? "") ? value as ExactOsmFeatureId : null;
}

const FIND_ROLE_LABELS_RU: Record<ExploreRole, string> = {
  tourist: "Турист",
  resident_expat: "Житель / экспат",
  home_buyer: "Покупатель жилья",
  renter: "Арендатор",
  investor_buyer: "Частный инвестор",
  family_relocation: "Семья при переезде",
  developer: "Девелопер",
  real_estate_fund: "Фонд недвижимости",
  bank_lender: "Банк / кредитор",
  insurer: "Страховая компания",
  government_urban_authority: "Городской орган",
  infrastructure_operator: "Оператор инфраструктуры",
  consultant_broker: "Консультант / брокер",
  family_office: "Family office",
  asset_manager: "Управляющий активами"
};

const FIND_SCENARIO_LABELS_RU: Record<ExploreScenarioId, string> = {
  b2c_point_context: "Контекст точки или объекта",
  b2c_tourist_objects_route: "Туристические объекты",
  b2c_residential_context: "Контекст жилья",
  b2c_new_residential_projects: "Новые жилые проекты",
  b2c_interest_routes: "Места интереса",
  b2b_redevelopment_selected_aoi: "Редевелопмент выбранной зоны",
  b2b_redevelopment_100ha: "Поиск крупной зоны развития",
  b2b_lowrise_luxury_residential: "Малоэтажная жилая застройка",
  b2b_hotel_development: "Гостиничное развитие",
  b2b_commercial_real_estate: "Коммерческая недвижимость"
};

function sameCoordinate(left: Coordinate, right: Coordinate): boolean {
  return Math.abs(left[0] - right[0]) < 1e-9 && Math.abs(left[1] - right[1]) < 1e-9;
}

function sameFindBounds(left: PointObjectFindBounds | null, right: PointObjectFindBounds): boolean {
  return left !== null && left.every((coordinate, index) => Math.abs(coordinate - right[index]) < 1e-6);
}

function formatFindBounds(bounds: PointObjectFindBounds, locale: "en" | "ru"): string {
  return `${locale === "ru" ? "З" : "W"} ${bounds[0].toFixed(4)} · ${locale === "ru" ? "Ю" : "S"} ${bounds[1].toFixed(4)} · ${locale === "ru" ? "В" : "E"} ${bounds[2].toFixed(4)} · ${locale === "ru" ? "С" : "N"} ${bounds[3].toFixed(4)}`;
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

function isAutocompleteResponse(value: unknown): value is { protocol: "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1"; mode: "results"; results: LiveMapSearchResult[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { protocol?: unknown; mode?: unknown; results?: unknown };
  return candidate.protocol === "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1" &&
    candidate.mode === "results" &&
    Array.isArray(candidate.results) &&
    candidate.results.every((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const result = item as Partial<LiveMapSearchResult>;
      return typeof result.id === "string" && typeof result.label === "string" &&
        typeof result.longitude === "number" && Number.isFinite(result.longitude) &&
        typeof result.latitude === "number" && Number.isFinite(result.latitude);
    });
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
  const { user } = useAuth();
  const [locationKey, setLocationKey] = useState<LiveMapLocationKey>("dubai");
  const [selection, setSelection] = useState<LiveMapSelection | null>(null);
  const [question, setQuestion] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [contextStatus, setContextStatus] = useState<"idle" | "loading" | "error">("idle");
  const [contextRetryVersion, setContextRetryVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LiveMapSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [navigationTarget, setNavigationTarget] = useState<LiveMapNavigationTarget | null>(null);
  const [viewModeRequest, setViewModeRequest] = useState<{ requestId: string; mode: LiveMapViewMode } | null>(null);
  const [mode, setMode] = useState<ProductMode>("analyse");
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftCoordinates, setDraftCoordinates] = useState<Coordinate[]>([]);
  const [createAoi, setCreateAoi] = useState<PointObjectCreateAoi | null>(null);
  const [generatedConcept, setGeneratedConcept] = useState<PointObjectGeneratedConcept | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createAreaCleared, setCreateAreaCleared] = useState(false);
  const [createReplacementStatus, setCreateReplacementStatus] = useState<"idle" | "applied" | "error">("idle");
  const [areaContext, setAreaContext] = useState<PointObjectAreaContextResult | null>(null);
  const [areaContextStatus, setAreaContextStatus] = useState<"idle" | "loading" | "error">("idle");
  const [areaContextRetryVersion, setAreaContextRetryVersion] = useState(0);
  const [visibleBounds, setVisibleBounds] = useState<PointObjectFindBounds | null>(null);
  const [findAudience, setFindAudience] = useState<ExploreAudience>("b2b");
  const [findRole, setFindRole] = useState<ExploreRole>("developer");
  const [findScenario, setFindScenario] = useState<ExploreScenarioId>("b2b_redevelopment_selected_aoi");
  const [findGroup, setFindGroup] = useState<PointObjectFindGroup>("construction");
  const [findMinimumLevels, setFindMinimumLevels] = useState("");
  const [findResult, setFindResult] = useState<PointObjectFindResult | null>(null);
  const [findShortlist, setFindShortlist] = useState<PointObjectFindCandidate[]>([]);
  const [findComparisonOpen, setFindComparisonOpen] = useState(false);
  const [findAnalysisTargetSourceFeatureId, setFindAnalysisTargetSourceFeatureId] = useState<PointObjectFindCandidate["sourceFeatureId"] | null>(null);
  const [findStatus, setFindStatus] = useState<"idle" | "loading" | "zoom" | "rate" | "error">("idle");
  const [findResultIntent, setFindResultIntent] = useState<FindIntent | null>(null);
  const [findSessionReady, setFindSessionReady] = useState(false);
  const findRequestRef = useRef<AbortController | null>(null);
  const contextRequestId = useRef(0);
  const searchRequestRef = useRef<AbortController | null>(null);
  const suggestionRequestRef = useRef<AbortController | null>(null);
  const committedSearchQueryRef = useRef("");
  const suggestionRequestIdRef = useRef(0);
  const suggestionCacheRef = useRef(new Map<string, LiveMapSearchResult[]>());
  const findPreferencesInitializedRef = useRef(false);
  const previousLocaleRef = useRef(locale);

  const findRoles = useMemo(() => getExploreRolesByAudience(findAudience), [findAudience]);
  const findScenarios = useMemo(() => getExploreScenariosByRole(findAudience, findRole), [findAudience, findRole]);
  const findCapability = pointObjectFindCapability(findScenario);
  const findIntentKey = `${findAudience}:${findRole}:${findScenario}`;
  const findResultIntentKey = findResultIntent
    ? `${findResultIntent.audience}:${findResultIntent.role}:${findResultIntent.scenario}`
    : null;
  const findMappedMinimumLevels = findMinimumLevels.trim() ? Number(findMinimumLevels) : null;
  const findResultIsStale = findResult !== null && (
    findResultIntentKey !== findIntentKey ||
    findResult.criteria.marketKey !== locationKey ||
    findResult.criteria.locale !== locale ||
    findResult.criteria.group !== findGroup ||
    findResult.criteria.mappedMinimumLevels !== findMappedMinimumLevels ||
    !sameFindBounds(visibleBounds, findResult.criteria.bounds)
  );
  const findResultMarketMismatch = findResult !== null && findResult.criteria.marketKey !== locationKey;

  useEffect(() => {
    const restoredSelection = readPointObjectSelection();
    const restoredFind = readPointObjectFindSession();
    if (restoredSelection) {
      setLocationKey(restoredSelection.locationKey);
      setSelection(restoredSelection);
    }
    if (restoredFind) {
      findPreferencesInitializedRef.current = true;
      if (!restoredSelection || restoredSelection.locationKey === restoredFind.marketKey) setLocationKey(restoredFind.marketKey);
      setFindAudience(restoredFind.audience);
      setFindRole(restoredFind.role);
      setFindScenario(restoredFind.scenario);
      setFindGroup(restoredFind.group);
      setFindMinimumLevels(restoredFind.mappedMinimumLevels);
      setFindResult(restoredFind.result);
      setFindResultIntent(restoredFind.result ? {
        audience: restoredFind.audience,
        role: restoredFind.role,
        scenario: restoredFind.scenario
      } : null);
      setFindShortlist(restoredFind.shortlist);
      setFindComparisonOpen(restoredFind.comparisonOpen);
      setFindAnalysisTargetSourceFeatureId(restoredFind.analysisTargetSourceFeatureId);
    }
    setQuestion(readPointObjectQuestion());
    setFindSessionReady(true);
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (!findSessionReady) return;
    const persistedIntent = findResult && findResultIntent
      ? findResultIntent
      : { audience: findAudience, role: findRole, scenario: findScenario };
    writePointObjectFindSession({
      marketKey: findResult?.criteria.marketKey ?? locationKey,
      locale: findResult?.criteria.locale ?? locale,
      audience: persistedIntent.audience,
      role: persistedIntent.role,
      scenario: persistedIntent.scenario,
      group: findResult?.criteria.group ?? findGroup,
      mappedMinimumLevels: findResult
        ? findResult.criteria.mappedMinimumLevels === null ? "" : String(findResult.criteria.mappedMinimumLevels)
        : findMinimumLevels,
      result: findResult,
      shortlist: findResult ? findShortlist : [],
      comparisonOpen: Boolean(findResult) && findComparisonOpen,
      analysisTargetSourceFeatureId: findResult ? findAnalysisTargetSourceFeatureId : null
    });
  }, [findAnalysisTargetSourceFeatureId, findAudience, findComparisonOpen, findGroup, findMinimumLevels, findResult, findResultIntent, findRole, findScenario, findSessionReady, findShortlist, locale, locationKey]);

  useEffect(() => {
    if (findPreferencesInitializedRef.current || !user) return;
    findPreferencesInitializedRef.current = true;
    const audience = user.profile.defaultAudience;
    const role = getExploreRolesByAudience(audience).some((item) => item.id === user.profile.defaultRole)
      ? user.profile.defaultRole
      : getDefaultRoleForAudience(audience);
    const scenario = getDefaultScenarioForRole(audience, role);
    setFindAudience(audience);
    setFindRole(role);
    setFindScenario(scenario);
    setFindGroup(pointObjectFindCapability(scenario).defaultGroup);
  }, [user]);

  useEffect(() => {
    if (!sessionReady || previousLocaleRef.current === locale) return;
    previousLocaleRef.current = locale;
    contextRequestId.current += 1;
    setSelection((current) => current ? { ...current, resolvedObject: null } : current);
    setSearchResults([]);
    setSearchStatus("idle");
    setSuggestionStatus("idle");
    setActiveSuggestionIndex(-1);
    committedSearchQueryRef.current = "";
    findRequestRef.current?.abort();
    setFindStatus("idle");
  }, [locale, sessionReady]);

  useEffect(() => {
    const query = searchQuery.trim();
    suggestionRequestRef.current?.abort();
    suggestionRequestIdRef.current += 1;
    const requestId = suggestionRequestIdRef.current;
    setActiveSuggestionIndex(-1);
    if (!pointObjectAutocompleteQueryReady(query) || query === committedSearchQueryRef.current) {
      setSuggestionStatus("idle");
      return;
    }
    const cacheKey = `${locationKey}:${locale}:${query.toLocaleLowerCase(locale)}`;
    const cached = suggestionCacheRef.current.get(cacheKey);
    if (cached) {
      setSearchResults(cached);
      setSuggestionStatus(cached.length ? "idle" : "empty");
      return;
    }
    const controller = new AbortController();
    suggestionRequestRef.current = controller;
    const timer = window.setTimeout(() => {
      setSuggestionStatus("loading");
      void fetch("/api/prototype/point-to-object/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketKey: locationKey, locale, query }),
        signal: controller.signal
      }).then(async (response) => {
        const payload: unknown = await response.json();
        if (controller.signal.aborted || requestId !== suggestionRequestIdRef.current) return;
        if (!response.ok || !isAutocompleteResponse(payload)) {
          setSuggestionStatus("error");
          return;
        }
        suggestionCacheRef.current.set(cacheKey, payload.results);
        setSearchResults(payload.results);
        setSuggestionStatus(payload.results.length ? "idle" : "empty");
      }).catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        if (requestId === suggestionRequestIdRef.current) setSuggestionStatus("error");
      });
    }, 600);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locale, locationKey, searchQuery]);

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
        body: JSON.stringify({
          caseKey: selection.locationKey,
          longitude: selection.longitude,
          latitude: selection.latitude,
          locale,
          expectedSourceFeatureId: exactOsmFeatureId(selection.object.sourceFeatureId)
        }),
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
    suggestionRequestRef.current?.abort();
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
    setFindAnalysisTargetSourceFeatureId((current) => nextSelection?.object.sourceFeatureId === current ? current : null);
    setContextStatus(nextSelection ? "loading" : "idle");
    clearPointObjectAnalysis();
  }, []);

  const handleViewportChange = useCallback((nextSelection: LiveMapSelection) => writePointObjectSelection(nextSelection), []);

  function changeMarket(nextMarket: LiveMapLocationKey) {
    if (nextMarket === locationKey) return;
    searchRequestRef.current?.abort();
    suggestionRequestRef.current?.abort();
    findRequestRef.current?.abort();
    committedSearchQueryRef.current = "";
    setLocationKey(nextMarket);
    setSelection(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setSuggestionStatus("idle");
    setActiveSuggestionIndex(-1);
    setNavigationTarget(null);
    setDraftCoordinates([]);
    setCreateAoi(null);
    setGeneratedConcept(null);
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setAreaContext(null);
    setAreaContextStatus("idle");
    setIsDrawing(false);
    setCreateError(null);
    setFindStatus("idle");
    clearPointObjectSelection();
    clearPointObjectAnalysis();
    contextRequestId.current += 1;
    setContextStatus("idle");
  }

  function markFindOutcomeStale() {
    findRequestRef.current?.abort();
    setFindStatus("idle");
  }

  function changeFindAudience(audience: ExploreAudience) {
    const role = getDefaultRoleForAudience(audience);
    const scenario = getDefaultScenarioForRole(audience, role);
    setFindAudience(audience);
    setFindRole(role);
    setFindScenario(scenario);
    setFindGroup(pointObjectFindCapability(scenario).defaultGroup);
    setFindMinimumLevels("");
    markFindOutcomeStale();
  }

  function changeFindRole(role: ExploreRole) {
    const scenario = getDefaultScenarioForRole(findAudience, role);
    setFindRole(role);
    setFindScenario(scenario);
    setFindGroup(pointObjectFindCapability(scenario).defaultGroup);
    setFindMinimumLevels("");
    markFindOutcomeStale();
  }

  function changeFindScenario(scenario: ExploreScenarioId) {
    setFindScenario(scenario);
    setFindGroup(pointObjectFindCapability(scenario).defaultGroup);
    setFindMinimumLevels("");
    markFindOutcomeStale();
  }

  function toggleFindShortlist(candidate: PointObjectFindCandidate) {
    const next = findShortlist.some((item) => item.sourceFeatureId === candidate.sourceFeatureId)
      ? findShortlist.filter((item) => item.sourceFeatureId !== candidate.sourceFeatureId)
      : findShortlist.length >= 3 ? findShortlist : [...findShortlist, candidate];
    setFindShortlist(next);
    if (next.length < 2) setFindComparisonOpen(false);
  }

  async function findInView() {
    if (!visibleBounds || findStatus === "loading" || findCapability.status === "unsupported") return;
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
      if (response.ok && isPointObjectFindResult(payload)) {
        setFindResult(payload);
        setFindResultIntent({ audience: findAudience, role: findRole, scenario: findScenario });
        setFindShortlist([]);
        setFindComparisonOpen(false);
        setFindAnalysisTargetSourceFeatureId(null);
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
    if (findResultMarketMismatch) return;
    const expectedSourceFeatureId = exactOsmFeatureId(candidate.sourceFeatureId);
    if (!expectedSourceFeatureId) {
      setFindStatus("error");
      return;
    }
    setMode("analyse");
    setFindAnalysisTargetSourceFeatureId(expectedSourceFeatureId);
    setNavigationTarget({
      requestId: `find:${candidate.sourceFeatureId}:${Date.now()}`,
      longitude: candidate.longitude,
      latitude: candidate.latitude,
      zoom: 18,
      expectedSourceFeatureId,
      expectedLabel: candidate.label,
      expectedFeatureClass: candidate.group
    });
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
      setCreateReplacementStatus("idle");
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
    const validation = validatePointObjectCreateAoiVertices(vertices);
    if (validation.ok === false) {
      if (validation.code === "too_small") setCreateError(t("create.tooSmall"));
      else if (validation.code === "too_large") setCreateError(t("create.tooLarge"));
      else if (validation.code === "invalid_geometry") setCreateError(t("create.invalid"));
      else setCreateError(t("create.uploadError"));
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
    setCreateReplacementStatus("idle");
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
    setCreateReplacementStatus("idle");
    setAreaContext(null);
    setAreaContextStatus("idle");
    setCreateError(null);
  }

  async function searchPlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2 || searchStatus === "loading") return;
    committedSearchQueryRef.current = query;
    suggestionRequestRef.current?.abort();
    setSuggestionStatus("idle");
    setActiveSuggestionIndex(-1);
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
    const expectedSourceFeatureId = exactOsmFeatureId(result.id);
    if (!expectedSourceFeatureId) {
      setSearchResults([]);
      setSearchStatus("error");
      setSuggestionStatus("error");
      return;
    }
    setMode("analyse");
    setFindAnalysisTargetSourceFeatureId(null);
    committedSearchQueryRef.current = result.label;
    suggestionRequestRef.current?.abort();
    setSearchQuery(result.label);
    setSearchResults([]);
    setSearchStatus("idle");
    setSuggestionStatus("idle");
    setActiveSuggestionIndex(-1);
    setNavigationTarget({
      requestId: `${result.id}:${Date.now()}`,
      longitude: result.longitude,
      latitude: result.latitude,
      zoom: 18,
      boundingBox: result.boundingBox,
      expectedSourceFeatureId,
      expectedLabel: result.label,
      expectedFeatureClass: result.featureType ?? result.category
    });
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchResults.length) {
      if (event.key === "Escape") setSearchResults([]);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % searchResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => current <= 0 ? searchResults.length - 1 : current - 1);
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      chooseSearchResult(searchResults[activeSuggestionIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSearchResults([]);
      setActiveSuggestionIndex(-1);
    }
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
  const selectionContextLabel = !selection?.resolvedObject
    ? t("selection.selected")
    : selection.resolvedObject.coordinateAssociation === "open_map_geometry_contains_point"
      ? t("selection.containing")
      : selection.resolvedObject.coordinateAssociation === "trusted_open_map_identity"
        ? t("selection.exact")
        : t("selection.nearest");
  const relationLabel = selection?.resolvedObject
    ? selection.resolvedObject.coordinateAssociation === "open_map_geometry_contains_point"
      ? t("selection.relation.containing")
      : selection.resolvedObject.coordinateAssociation === "trusted_open_map_identity"
        ? t("selection.relation.exact")
        : t("selection.relation.nearest", { distance: Math.round(selection.resolvedObject.resultCentroidDistanceM) })
    : null;
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
  const findHasInvalidLevels = findMinimumLevels !== "" && (Number(findMinimumLevels) < 1 || Number(findMinimumLevels) > 100);
  const findCtaDisabled = !visibleBounds || findStatus === "loading" || findCapability.status === "unsupported" || findHasInvalidLevels;
  const findMethodologyLabel = locale === "ru" ? "ⓘ Данные и методика" : "ⓘ Data & methodology";
  const findExtentLabel = visibleBounds
    ? formatFindBounds(visibleBounds, locale)
    : (locale === "ru" ? "Границы карты определяются…" : "Map extent is resolving…");
  const findResultExtentLabel = findResult ? formatFindBounds(findResult.criteria.bounds, locale) : null;
  const findFooterStatus = findStatus === "loading"
    ? (locale === "ru" ? "Ищем объекты в текущей видимой области…" : "Searching the current visible area…")
    : findStatus === "zoom"
      ? (locale === "ru" ? "Приблизьте карту: текущая область слишком велика." : "Zoom in: the current area is too large.")
      : findStatus === "rate"
        ? (locale === "ru" ? "Источник временно ограничил запрос. Повторите попытку." : "The source temporarily rate-limited this request. Try again.")
        : findStatus === "error"
          ? (locale === "ru" ? "Не удалось получить объекты. Критерии сохранены." : "Objects could not be loaded. Your criteria are preserved.")
          : findCapability.status === "unsupported"
            ? (locale === "ru" ? "Для этого сценария нужны официальные земельные и градостроительные данные." : "This scenario requires authoritative land and planning data.")
            : findHasInvalidLevels
              ? (locale === "ru" ? "Укажите этажность от 1 до 100." : "Enter mapped levels from 1 to 100.")
              : findResultIsStale
                ? (locale === "ru" ? "Карта или критерии изменились — обновите результаты." : "The map or criteria changed — update the results.")
                : !visibleBounds
                  ? (locale === "ru" ? "Дождитесь загрузки области карты." : "Waiting for the visible map area.")
                  : "";

  return (
    <main className="h-[100svh] min-h-[420px] overflow-hidden bg-white text-ink">
      <PointObjectHeader showDataSources />
      <div className="grid h-[calc(100svh-64px)] min-h-0 grid-rows-[clamp(108px,32svh,360px)_minmax(0,1fr)] bg-white sm:max-lg:landscape:grid-cols-[minmax(0,1fr)_minmax(340px,48%)] sm:max-lg:landscape:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_430px] lg:grid-rows-1">
        <section className="relative h-full min-h-0 overflow-hidden border-b border-line sm:max-lg:landscape:border-b-0 lg:border-b-0" aria-label={t("map.region")}>
          {sessionReady ? <LiveObjectMap locationKey={locationKey} interactionMode={mode} selection={mode === "analyse" ? selection : null} navigationTarget={navigationTarget} viewModeRequest={viewModeRequest} onSelection={handleSelection} onViewportChange={handleViewportChange} onVisibleBoundsChange={setVisibleBounds} createDrawing={mode === "create" && isDrawing} createDraftCoordinates={mode === "create" ? draftCoordinates : []} createAoi={mode === "create" ? createAoi : null} createAreaCleared={mode === "create" && createAreaCleared} conceptMassing={mode === "create" ? generatedConcept?.massing ?? null : null} onCreateVertex={addCreateVertex} onReplacementStatus={setCreateReplacementStatus} className="h-full min-h-0" /> : <div className="grid h-full min-h-0 place-items-center bg-[#f4f6f7] text-sm font-medium text-[#52606a]" role="status">{t("map.loading")}</div>}
          <div className="absolute left-4 top-4 z-10 flex w-[min(650px,calc(100%-5rem))] flex-col gap-2 sm:left-5 sm:top-5 sm:flex-row">
            <label className="flex h-11 w-fit shrink-0 items-center rounded-xl border border-white/70 bg-white/95 px-3 shadow-[0_10px_30px_rgba(20,35,45,0.14)] backdrop-blur">
              <span className="sr-only">{t("city.label")}</span>
              <select value={locationKey} onChange={(event) => changeMarket(event.target.value as LiveMapLocationKey)} aria-label={t("city.label")} className="max-w-[150px] bg-transparent text-sm font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
                {POINT_OBJECT_MARKETS.map((market) => <option key={market.key} value={market.key}>{market.label[locale]}</option>)}
              </select>
            </label>
            <form onSubmit={searchPlace} role="search" className="relative min-w-0 flex-1">
              <div className="flex h-11 overflow-hidden rounded-xl border border-white/70 bg-white/95 shadow-[0_10px_30px_rgba(20,35,45,0.14)] backdrop-blur focus-within:ring-2 focus-within:ring-[#087f8c]">
                <input type="search" value={searchQuery} onChange={(event) => { committedSearchQueryRef.current = ""; setSearchQuery(event.target.value.slice(0, 120)); setSearchResults([]); setSearchStatus("idle"); setActiveSuggestionIndex(-1); }} onKeyDown={handleSearchKeyDown} role="combobox" aria-autocomplete="list" aria-expanded={searchResults.length > 0} aria-controls="point-object-search-results" aria-activedescendant={activeSuggestionIndex >= 0 ? `point-object-search-result-${activeSuggestionIndex}` : undefined} aria-label={t("search.label")} placeholder={t("search.placeholder")} className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-[#98a2b3]" />
                <button type="submit" disabled={searchQuery.trim().length < 2 || searchStatus === "loading"} className="min-w-[76px] bg-[#087f8c] px-3 text-xs font-bold text-white transition hover:bg-[#006c78] disabled:cursor-not-allowed disabled:bg-[#9cb8b9] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white">{searchStatus === "loading" ? t("search.loading") : t("search.action")}</button>
              </div>
              {searchResults.length ? <div id="point-object-search-results" role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-panel" aria-label={t("search.results")}>
                {searchResults.map((result, index) => <button id={`point-object-search-result-${index}`} key={result.id} type="button" role="option" aria-selected={activeSuggestionIndex === index} onMouseEnter={() => setActiveSuggestionIndex(index)} onClick={() => chooseSearchResult(result)} className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${activeSuggestionIndex === index ? "bg-[#e6f5f1]" : "hover:bg-[#f0f9f8]"}`}><span className="block text-sm font-bold text-ink">{result.label}</span>{result.secondaryLabel ? <span className="mt-0.5 block truncate text-[11px] text-muted">{result.secondaryLabel}</span> : null}</button>)}
              </div> : searchStatus === "empty" || searchStatus === "error" ? <p className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-[#475467] shadow-panel" role="status">{searchStatus === "empty" ? t("search.empty") : t("search.error")}</p> : suggestionStatus === "empty" || suggestionStatus === "error" ? <p className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-[#475467] shadow-panel" role="status">{suggestionStatus === "empty" ? t("search.empty") : t("search.error")}</p> : suggestionStatus === "loading" ? <p className="sr-only" role="status">{t("search.loading")}</p> : null}
            </form>
          </div>
        </section>

        <aside className="h-full min-h-0 min-w-0 overflow-hidden border-l border-line bg-white">
          <div className={`flex h-full min-h-0 flex-col p-3 pb-3 sm:p-4 sm:pb-3 lg:p-6 lg:pb-4 ${mode === "find" ? "overflow-hidden" : "overflow-y-auto"}`}>
            <div className="mb-2 grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-[#f2f5f4] p-1" role="tablist" aria-label={t("mode.label")}>
              {(["analyse", "find", "create"] as ProductMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => changeMode(item)} className={`min-h-11 rounded-lg px-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${mode === item ? "bg-white text-[#087f8c] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>{t(`mode.${item}` as "mode.analyse" | "mode.find" | "mode.create")}</button>)}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {mode === "find" ? null : <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{mode === "create" ? t("mode.create") : t("panel.eyebrow")}</p>}
                <h1 className={`${mode === "find" ? "text-[22px] sm:text-2xl" : "mt-2 text-2xl sm:text-[28px]"} font-bold tracking-[-0.035em]`}>{mode === "create" ? t("create.title") : mode === "find" ? t("find.title") : t("panel.title")}</h1>
                {mode === "find" ? null : <p className="mt-2 text-sm leading-5 text-muted">{mode === "create" ? t("create.body") : t("panel.description")}</p>}
              </div>
              <details className="group relative shrink-0">
                <summary
                  aria-label={mode === "find" ? findMethodologyLabel.replace("ⓘ ", "") : t("info.label")}
                  title={mode === "find" ? findMethodologyLabel.replace("ⓘ ", "") : t("info.label")}
                  data-testid={mode === "find" ? "find-data-methodology" : undefined}
                  className={mode === "find"
                    ? "inline-flex min-h-11 max-w-[138px] cursor-pointer list-none items-center justify-center rounded-xl border border-line bg-white px-3 text-center text-[11px] font-bold leading-4 text-[#087f8c] transition hover:border-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"
                    : "grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full border border-line bg-white text-sm font-bold text-[#087f8c] transition hover:border-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"}
                >{mode === "find" ? findMethodologyLabel : "i"}</summary>
                <div data-testid={mode === "find" ? "find-methodology-panel" : undefined} className="absolute right-0 top-12 z-30 max-h-[max(10rem,calc(68svh-12rem))] w-[min(360px,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-line bg-white p-4 text-xs leading-5 text-[#475467] shadow-panel sm:landscape:max-h-[calc(100svh-13rem)] sm:max-lg:landscape:w-[min(360px,calc(48vw-2.5rem))] lg:w-[360px]">
                  {mode === "find" ? <div data-testid="find-methodology-content">
                    <p><strong className="text-ink">{locale === "ru" ? "Источник:" : "Source:"}</strong> OpenStreetMap {locale === "ru" ? "через" : "via"} Overpass API · ODbL 1.0.</p>
                    <p className="mt-2"><strong className="text-ink">{locale === "ru" ? "Текущая область карты:" : "Current map extent:"}</strong></p>
                    <p className="mt-1 font-mono text-[10px] leading-4" data-testid="find-current-extent">{findExtentLabel}</p>
                    {findResultExtentLabel ? <><p className="mt-2"><strong className="text-ink">{locale === "ru" ? "Область возвращённой выборки:" : "Returned sample query extent:"}</strong></p><p className="mt-1 font-mono text-[10px] leading-4" data-testid="find-result-extent">{findResultExtentLabel}</p>{findResultIsStale ? <p className="mt-1 font-semibold text-[#52606a]">{locale === "ru" ? "Текущая карта или критерии отличаются; показанная выборка помечена как устаревшая до обновления." : "The current map or criteria differ; the returned sample is marked stale until refreshed."}</p> : null}</> : null}
                    <p className="mt-2">{locale === "ru" ? "Возвращаются только нанесённые в OSM объекты. Выборка ограничена, может быть неполной или устаревшей и не является полным реестром либо ранжированием." : "Only objects mapped in OSM are returned. The bounded sample may be incomplete or outdated and is not a complete inventory or ranking."}</p>
                    <p className="mt-2">{locale === "ru" ? "OSM не подтверждает право собственности, вакантность, состояние, зонирование, право сноса или допустимость редевелопмента." : "OSM does not establish ownership, vacancy, condition, zoning, demolition rights or redevelopment validation."}</p>
                    <p className="mt-2"><strong className="text-ink">{locale === "ru" ? "Граница сценария:" : "Scenario boundary:"}</strong> {findCapability.limitation[locale]}</p>
                    {findResult?.coverage.capReached ? <p className="mt-2 font-semibold text-[#79520d]">{locale === "ru" ? "Достигнут лимит источника; дополнительные совпадения могут существовать." : "The upstream cap was reached; additional matches may exist."}</p> : null}
                    <p className="mt-2 font-semibold text-ink">{locale === "ru" ? t("boundary") : POINT_OBJECT_FIND_CAVEAT}</p>
                    <p className="mt-2">© OpenStreetMap contributors.</p>
                  </div> : <><p>{t("info.usage")}</p><p className="mt-2">{t("info.source")}</p><p className="mt-2 font-semibold">{t("boundary")}</p></>}
                </div>
              </details>
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

            {mode === "find" ? <section className="mt-2 flex min-h-0 flex-1 flex-col" data-testid="find-drawer">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-testid="find-scroll-region">
              <div className="grid min-h-[52px] grid-cols-2 gap-1 rounded-xl bg-[#e8efed] p-1" role="group" aria-label={locale === "ru" ? "Тип пользователя" : "Audience"}>
                {(["b2b", "b2c"] as ExploreAudience[]).map((audience) => <button key={audience} type="button" aria-pressed={findAudience === audience} onClick={() => changeFindAudience(audience)} className={`min-h-11 rounded-lg text-xs font-bold uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${findAudience === audience ? "bg-[#087f8c] text-white shadow-sm" : "text-[#52606a] hover:bg-white"}`}>{audience}</button>)}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Роль" : "Role"}<select value={findRole} onChange={(event) => changeFindRole(event.target.value as ExploreRole)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-[#087f8c]">{findRoles.map((role) => <option key={role.id} value={role.id}>{locale === "ru" ? FIND_ROLE_LABELS_RU[role.id] : role.label}</option>)}</select></label>
                <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Сценарий" : "Scenario"}<select value={findScenario} onChange={(event) => changeFindScenario(event.target.value as ExploreScenarioId)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-[#087f8c]">{findScenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{locale === "ru" ? FIND_SCENARIO_LABELS_RU[scenario.id] : scenario.title}</option>)}</select></label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Тип объекта" : "Object group"}<select value={findGroup} onChange={(event) => { setFindGroup(event.target.value as PointObjectFindGroup); markFindOutcomeStale(); }} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-[#087f8c]">{findCapability.allowedGroups.map((group) => <option key={group} value={group}>{findGroupLabels[group]}</option>)}</select></label>
                <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Минимальная этажность по OSM" : "Minimum mapped levels"} <span className="font-medium text-muted">({t("question.optional")})</span><input type="number" min={1} max={100} inputMode="numeric" value={findMinimumLevels} onChange={(event) => { setFindMinimumLevels(event.target.value.replace(/\D/g, "").slice(0, 3)); markFindOutcomeStale(); }} placeholder={locale === "ru" ? "Например, 10" : "For example, 10"} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-[#087f8c]" /></label>
              </div>
              {findResult ? <div className="mt-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-muted"><span>{findResult.mode === "empty" ? (locale === "ru" ? "В ограниченной выборке текущего окна совпадений нет." : "No mapped matches in this bounded view sample.") : (locale === "ru" ? `Найдено в выборке: ${findResult.candidates.length}` : `Returned in sample: ${findResult.candidates.length}`)}</span><span>{findResult.coverage.approximateAreaSqKm.toLocaleString(locale)} {locale === "ru" ? "км²" : "km²"}</span></div>
                <div className="mb-3 rounded-lg border border-[#d7e2df] bg-[#f7faf9] px-3 py-2 text-[10px] leading-4 text-[#526b64]" data-testid="find-result-lineage">
                  <div className="flex items-center justify-between gap-2"><strong className="text-[#345c54]">{locale === "ru" ? "Происхождение выборки" : "Sample lineage"}</strong>{findResultIsStale ? <span className="rounded-full bg-[#e8edef] px-2 py-0.5 font-bold uppercase tracking-[0.06em] text-[#52606a]" data-testid="find-result-stale">{locale === "ru" ? "Устарела" : "Stale"}</span> : null}</div>
                  <p className="mt-1">{findResult.source.name} · {findResult.source.service} · {locale === "ru" ? "получено" : "acquired"} <time dateTime={findResult.source.acquiredAt}>{new Date(findResult.source.acquiredAt).toLocaleString(locale)}</time> · {findResult.source.licenceId}</p>
                  <p className="font-mono">{locale === "ru" ? "Область запроса" : "Query extent"}: {findResultExtentLabel}</p>
                  <p>SHA-256 {findResult.source.sourceResponseHash.slice(0, 16)}… · {locale === "ru" ? "ограниченная выборка, не полный реестр" : "bounded sample, not a complete inventory"}</p>
                </div>
                {findShortlist.length >= 2 ? <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-[#e6f5f1] px-3 py-2"><span className="text-xs font-bold text-[#176548]">{locale === "ru" ? `Выбрано: ${findShortlist.length}` : `Selected: ${findShortlist.length}`}</span><button type="button" onClick={() => setFindComparisonOpen((value) => !value)} className="min-h-11 rounded-lg bg-[#087f70] px-3 text-[11px] font-bold text-white">{findComparisonOpen ? (locale === "ru" ? "К списку" : "Back to list") : (locale === "ru" ? "Сравнить" : "Compare")}</button></div> : null}
                {findComparisonOpen && findShortlist.length >= 2 ? <div className="space-y-2" aria-label={locale === "ru" ? "Сравнение объектов" : "Object comparison"}>
                  <p className="text-[10px] leading-4 text-muted">{locale === "ru" ? "Фактическое сопоставление атрибутов OpenStreetMap без оценки, победителя или инвестиционной рекомендации." : "Factual OpenStreetMap attribute comparison without scoring, winner or investment recommendation."}</p>
                  {findShortlist.map((candidate) => <article key={candidate.sourceFeatureId} className="rounded-xl border border-line bg-white p-3"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-ink">{candidate.label}</h3><p className="mt-1 text-[11px] text-muted">{findGroupLabels[candidate.group]} · {candidate.matchedTag.key}={candidate.matchedTag.value}</p></div><button type="button" onClick={() => toggleFindShortlist(candidate)} className="min-h-11 shrink-0 rounded-lg px-2 text-[11px] font-bold text-[#087f70]">{locale === "ru" ? "Убрать" : "Remove"}</button></div><dl className="mt-2 grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-[10px]"><dt className="text-muted">{locale === "ru" ? "Этажность" : "Levels"}</dt><dd className="font-semibold">{candidate.mappedBuildingLevels ?? "—"}</dd><dt className="text-muted">OSM ID</dt><dd className="truncate font-semibold">{candidate.sourceFeatureId}</dd><dt className="text-muted">{locale === "ru" ? "Координаты" : "Coordinates"}</dt><dd className="font-semibold tabular-nums">{candidate.latitude.toFixed(5)}, {candidate.longitude.toFixed(5)}</dd></dl><button type="button" disabled={findResultMarketMismatch} onClick={() => chooseFindCandidate(candidate)} className="mt-3 min-h-11 w-full rounded-lg border border-[#8ebdb4] bg-white px-3 text-xs font-bold text-[#176548] disabled:cursor-not-allowed disabled:opacity-40">{locale === "ru" ? "Открыть анализ" : "Open analysis"}</button></article>)}
                </div> : <ul className="space-y-2">{findResult.candidates.map((candidate) => {
                  const selectedForComparison = findShortlist.some((item) => item.sourceFeatureId === candidate.sourceFeatureId);
                  return <li key={candidate.sourceFeatureId} className="rounded-xl border border-line bg-white p-3"><button type="button" disabled={findResultMarketMismatch} onClick={() => chooseFindCandidate(candidate)} className="min-h-11 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] disabled:cursor-not-allowed disabled:opacity-40"><span className="block text-sm font-bold text-ink">{candidate.label}</span><span className="mt-1 block text-[11px] text-muted">{findGroupLabels[candidate.group]}{candidate.mappedBuildingLevels === null ? "" : ` · ${candidate.mappedBuildingLevels} ${locale === "ru" ? "эт." : "levels"}`} · {candidate.matchedTag.key}={candidate.matchedTag.value}</span></button><button type="button" aria-pressed={selectedForComparison} disabled={!selectedForComparison && findShortlist.length >= 3} onClick={() => toggleFindShortlist(candidate)} className={`mt-2 min-h-11 rounded-lg px-3 text-[11px] font-bold transition disabled:opacity-40 ${selectedForComparison ? "bg-[#087f70] text-white" : "border border-[#8ebdb4] bg-white text-[#176548]"}`}>{selectedForComparison ? (locale === "ru" ? "Выбрано" : "Selected") : (locale === "ru" ? "В сравнение" : "Compare")}</button></li>;
                })}</ul>}
              </div> : null}
              </div>
              <footer className="sticky bottom-0 z-20 shrink-0 border-t border-line bg-white pt-1" data-testid="find-sticky-footer">
                <p
                  className={`flex h-9 items-center overflow-hidden text-[11px] leading-4 ${findStatus === "zoom" || findStatus === "rate" || findStatus === "error" || findHasInvalidLevels ? "text-[#79520d]" : "text-muted"}`}
                  role={findStatus === "zoom" || findStatus === "rate" || findStatus === "error" || findHasInvalidLevels ? "alert" : "status"}
                  aria-live="polite"
                  data-testid="find-footer-status"
                >{findFooterStatus || <span aria-hidden="true">&nbsp;</span>}</p>
                <button
                  type="button"
                  onClick={() => void findInView()}
                  disabled={findCtaDisabled}
                  className="min-h-11 w-full rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white transition hover:bg-[#006c78] disabled:cursor-not-allowed disabled:bg-[#b7c4c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2"
                  data-testid="find-search-cta"
                >{findStatus === "loading" ? (locale === "ru" ? "Ищем…" : "Searching…") : findResultIsStale ? (locale === "ru" ? "Обновить поиск" : "Update search") : (locale === "ru" ? "Искать в видимой области" : "Search this view")}</button>
              </footer>
            </section> : null}

            {mode === "create" ? <div className="mt-5 space-y-4">
              {!createAoi ? <section className="rounded-[18px] border border-[#cfe0da] bg-[#f4faf7] p-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setIsDrawing(true); setDraftCoordinates([]); setCreateError(null); setGeneratedConcept(null); }} className="min-h-11 rounded-xl bg-[#087f70] px-3 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] focus-visible:ring-offset-2">{t("create.draw")}</button>
                  <label className="grid min-h-11 cursor-pointer place-items-center rounded-xl border border-[#9bbdb5] bg-white px-3 text-center text-xs font-bold text-[#345c54] focus-within:ring-2 focus-within:ring-[#087f70]"><span>{t("create.upload")}</span><input type="file" accept="application/geo+json,application/json,.geojson,.json" aria-label={t("create.upload")} onChange={(event) => void uploadCreateArea(event)} className="sr-only focus-visible:outline-none" /></label>
                </div>
                {isDrawing ? <><p className="mt-3 text-xs font-semibold text-[#345c54]">{t("create.drawing", { count: draftCoordinates.length })}</p><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" disabled={draftCoordinates.length < 3} onClick={() => closeCreateArea()} className="min-h-10 rounded-lg bg-[#087f70] px-2 text-xs font-bold text-white disabled:opacity-40">{t("create.close")}</button><button type="button" disabled={!draftCoordinates.length} onClick={() => setDraftCoordinates((current) => current.slice(0, -1))} className="min-h-10 rounded-lg border border-[#b8cbc6] bg-white px-2 text-xs font-bold text-[#345c54] disabled:opacity-40">{t("create.undo")}</button><button type="button" onClick={resetCreate} className="min-h-10 rounded-lg border border-[#b8cbc6] bg-white px-2 text-xs font-bold text-[#345c54]">{t("create.cancel")}</button></div></> : null}
                {createError ? <p className="mt-3 rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-3 py-2 text-xs text-[#79520d]" role="alert">{createError}</p> : null}
              </section> : <><p className="rounded-xl border border-[#cfe0da] bg-[#f4faf7] px-4 py-3 text-xs font-bold text-[#345c54]">{t("create.ready", { area: createAoi.areaSqM >= 10_000 ? `${(createAoi.areaSqM / 10_000).toFixed(2)} ${locale === "ru" ? "га" : "ha"}` : `${Math.round(createAoi.areaSqM).toLocaleString(locale)} ${locale === "ru" ? "м²" : "m²"}` })}</p>
                <section className="rounded-[18px] border border-line bg-[#f8fafc] p-4" aria-live="polite">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#087f70]">{locale === "ru" ? "КОНТЕКСТ ЗОНЫ" : "AREA CONTEXT"}</p><h2 className="mt-1 text-sm font-bold text-ink">{locale === "ru" ? "Сводка объектов внутри полигона" : "Objects inside the polygon"}</h2></div><button type="button" onClick={() => { setCreateReplacementStatus("idle"); setCreateAreaCleared((value) => !value); }} className="min-h-9 shrink-0 rounded-lg border border-[#8ebdb4] bg-white px-3 text-[11px] font-bold text-[#176548]">{createAreaCleared ? (locale === "ru" ? "Показать исходные" : "Show existing") : generatedConcept ? (locale === "ru" ? "Показать концепт" : "Show concept") : (locale === "ru" ? "Очистить 3D" : "Clear 3D")}</button></div>
                  {areaContextStatus === "loading" ? <p className="mt-3 text-xs font-semibold text-[#087f70]" role="status">{locale === "ru" ? "Собираем объекты открытой карты…" : "Reading open-map objects…"}</p> : null}
                  {areaContextStatus === "error" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]" role="alert"><span>{locale === "ru" ? "Контекст зоны временно недоступен." : "Area context is temporarily unavailable."}</span><button type="button" onClick={() => setAreaContextRetryVersion((value) => value + 1)} className="min-h-8 rounded-lg border border-[#d6b36e] bg-white px-2 font-bold">{t("selection.retry")}</button></div> : null}
                  {areaContext ? <><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Объекты" : "Objects"}</span><strong className="mt-1 block text-sm">{areaContext.summary.sampleSize}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Здания" : "Buildings"}</span><strong className="mt-1 block text-sm">{areaContext.summary.mappedBuildingCount}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Медиана этажей" : "Median levels"}</span><strong className="mt-1 block text-sm">{areaContext.summary.medianMappedLevels ?? "—"}</strong></div></div><div className="mt-3 flex flex-wrap gap-1.5">{areaContext.summary.groups.slice(0, 5).map((group) => <span key={group.group} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#475467] ring-1 ring-inset ring-[#d7dee4]">{areaGroupLabels[group.group]} · {group.count}</span>)}</div><p className="mt-3 text-[10px] leading-4 text-muted">{locale === "ru" ? "Учитываются центры объектов, попавшие внутрь зоны; это ограниченная выборка OpenStreetMap, а не полный реестр." : "Uses returned feature centres inside the AOI; this is a bounded OpenStreetMap sample, not a complete inventory."}{areaContext.coverage.capReached ? ` ${locale === "ru" ? "Достигнут лимит ответа." : "The response cap was reached."}` : ""}</p></> : null}
                </section>
                <PointObjectCreatePanel locale={locale} marketKey={locationKey} aoi={createAoi} depth="standard" generated={generatedConcept} onGenerated={(concept) => { setGeneratedConcept(concept); setCreateReplacementStatus("idle"); setCreateAreaCleared(true); }} onReset={() => { setGeneratedConcept(null); setCreateAreaCleared(false); setCreateReplacementStatus("idle"); }} />{createAreaCleared ? <p className={`rounded-xl border px-3 py-2 text-[10px] leading-4 ${createReplacementStatus === "error" ? "border-[#e6bd74] bg-[#fff9ed] text-[#79520d]" : "border-[#d8e2df] bg-[#f8faf9] text-[#62716d]"}`} role="status">{createReplacementStatus === "error" ? (locale === "ru" ? "Безопасное замещение не применилось: исходные здания восстановлены, новая модель скрыта." : "Safe replacement could not be applied: source buildings were restored and the concept is hidden.") : createReplacementStatus === "applied" ? t("create.mask") : (locale === "ru" ? "Подготавливаем замещение зданий…" : "Preparing building replacement…")}</p> : null}<button type="button" onClick={resetCreate} className="min-h-10 w-full rounded-xl border border-[#b8cbc6] bg-white px-3 text-xs font-bold text-[#345c54]">{t("create.cancel")}</button></>}
            </div> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
