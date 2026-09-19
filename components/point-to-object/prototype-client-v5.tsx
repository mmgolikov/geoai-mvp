"use client";

import { findRestoreNavigationTarget, matchesRestoredFindViewport, sameFindBounds } from "@/src/lib/prototype/point-to-object-find-viewport";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mobileStyles from "./mobile-workspace.module.css";

import { useAuth } from "@/components/auth/auth-provider";
import { PointObjectCreatePanel, type PointObjectCreateEditorSnapshot, type PointObjectGeneratedConcept } from "@/components/point-to-object/create-panel";
import { CreateResultDashboard } from "@/components/point-to-object/create-result-dashboard";
import { FindComparisonDashboard } from "@/components/point-to-object/find-comparison-dashboard";
import { LiveObjectMap, type LiveMapCreateAoiFitRequest, type LiveMapNavigationTarget, type LiveMapViewMode, type PointObjectReplacementStatus } from "@/components/point-to-object/live-object-map";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import { PointObjectIcon } from "@/components/point-to-object/point-object-icons";
import { PointObjectHeader } from "@/components/point-to-object/prototype-header";
import { ReliableSelect } from "@/components/point-to-object/reliable-select";
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
  capturePointObjectProjectDestination,
  clearPointObjectProjectRestore,
  clearPointObjectProjectOverview,
  consumePointObjectProjectOverview,
  consumePointObjectProjectRestore,
  inspectPointObjectProjects,
  pointObjectProjectIdentity,
  queuePointObjectProjectRestore,
  readVerifiedPointObjectProjects,
  reconcilePointObjectBrowserIdentity,
  savePointObjectOperation,
  updatePointObjectCreateViewState,
  updatePointObjectFindViewState,
  type PointObjectProjectDestination,
  type PointObjectProjectIdentity,
  type PointObjectProjectOverviewMarker
} from "@/src/lib/prototype/point-object-projects";
import {
  isPointObjectAreaContextResult
} from "@/src/lib/prototype/point-to-object-create-result";
import {
  type PointObjectCreateAoi,
  validatePointObjectCreateAoiVertices
} from "@/src/lib/prototype/point-to-object-create";
import {
  clearPointObjectCreateSession,
  readPointObjectCreateSession,
  writePointObjectCreateSession
} from "@/src/lib/prototype/point-to-object-create-session";
import {
  type PointObjectFindBounds,
  type PointObjectFindCandidate,
  type PointObjectFindGroup,
  type PointObjectFindResult
} from "@/src/lib/prototype/point-to-object-find-contract";
import { pointObjectFindCapability } from "@/src/lib/prototype/point-to-object-find-capabilities";
import { pointObjectSourceFailure, sourceFailureMessage, sourceRetryAfterSeconds, type PointObjectSourceFailure } from "@/src/lib/prototype/point-to-object-source-recovery";
import {
  POINT_OBJECT_SOURCE_BROWSER_TIMEOUT_MS,
  pointObjectSourceResponseIsCurrent,
  samePointObjectAreaRequest
} from "@/src/lib/prototype/source-request-deadline";
import {
  isPointObjectFindResult,
  clearPointObjectFindSession,
  pointObjectFindSessionForProfileAudience,
  readPointObjectFindSession,
  type PointObjectFindComparisonView,
  type PointObjectFindSessionState,
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
type CreateSaveContext = {
  identityKey: PointObjectProjectIdentity;
  destination: PointObjectProjectDestination;
  aoi: PointObjectCreateAoi;
  editorSnapshot: PointObjectCreateEditorSnapshot | null;
  locale: "en" | "ru";
  marketKey: LiveMapLocationKey;
  areaContext: PointObjectAreaContextResult | null;
};

const ignoreMapSelection = () => undefined;

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

const FIND_SCENARIO_LABELS: Record<"en" | "ru", Record<ExploreScenarioId, string>> = {
  en: {
    b2c_point_context: "Places and amenities",
    b2c_tourist_objects_route: "Visitor attractions",
    b2c_residential_context: "Homes and amenities",
    b2c_new_residential_projects: "Construction and homes",
    b2c_interest_routes: "Places of interest",
    b2b_redevelopment_selected_aoi: "Buildings and construction sites",
    b2b_redevelopment_100ha: "Large development-zone search unavailable",
    b2b_lowrise_luxury_residential: "Residential buildings",
    b2b_hotel_development: "Hotels and amenities",
    b2b_commercial_real_estate: "Commercial properties"
  },
  ru: {
    b2c_point_context: "Объекты и инфраструктура",
    b2c_tourist_objects_route: "Достопримечательности",
    b2c_residential_context: "Жильё и инфраструктура",
    b2c_new_residential_projects: "Строительство и жильё",
    b2c_interest_routes: "Интересные места",
    b2b_redevelopment_selected_aoi: "Здания и стройплощадки",
    b2b_redevelopment_100ha: "Поиск крупной зоны недоступен",
    b2b_lowrise_luxury_residential: "Жилые здания",
    b2b_hotel_development: "Отели и инфраструктура",
    b2b_commercial_real_estate: "Коммерческие объекты"
  }
};

function sameCoordinate(left: Coordinate, right: Coordinate): boolean {
  return Math.abs(left[0] - right[0]) < 1e-9 && Math.abs(left[1] - right[1]) < 1e-9;
}

function contextRequestKey(selection: LiveMapSelection | null, locale: "en" | "ru"): string | null {
  return selection ? JSON.stringify({ caseKey: selection.locationKey, longitude: selection.longitude, latitude: selection.latitude, locale, expectedSourceFeatureId: exactOsmFeatureId(selection.object.sourceFeatureId) }) : null;
}

function findCandidateContextRequestKey(candidate: PointObjectFindCandidate, caseKey: LiveMapLocationKey, locale: "en" | "ru"): string {
  return JSON.stringify({ caseKey, longitude: candidate.longitude, latitude: candidate.latitude, locale, expectedSourceFeatureId: candidate.sourceFeatureId });
}

function acceptedMappedLevelsInput(value: string): string | null {
  return value === "" || /^\d{1,3}$/.test(value) ? value : null;
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

function createAoiBounds(vertices: Coordinate[]): [[number, number], [number, number]] {
  const longitudes = vertices.map(([longitude]) => longitude);
  const latitudes = vertices.map(([, latitude]) => latitude);
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)]
  ];
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").replaceAll(":", " · ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function readableFindSubtype(value: string, group: PointObjectFindGroup, locale: "en" | "ru"): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "yes" || normalized === group) return null;
  const labels: Record<string, Record<"en" | "ru", string>> = {
    apartments: { en: "Apartment building", ru: "Многоквартирный дом" },
    residential: { en: "Residential building", ru: "Жилое здание" },
    detached: { en: "Detached house", ru: "Отдельный дом" },
    semidetached_house: { en: "Semi-detached house", ru: "Дом на две семьи" },
    commercial: { en: "Commercial building", ru: "Коммерческое здание" },
    office: { en: "Office", ru: "Офис" },
    hotel: { en: "Hotel", ru: "Гостиница" },
    guest_house: { en: "Guest house", ru: "Гостевой дом" },
    university: { en: "University", ru: "Университет" },
    kindergarten: { en: "Kindergarten", ru: "Детский сад" },
    hospital: { en: "Hospital", ru: "Больница" },
    clinic: { en: "Clinic", ru: "Клиника" },
    pharmacy: { en: "Pharmacy", ru: "Аптека" },
    warehouse: { en: "Warehouse", ru: "Склад" }
  };
  return labels[normalized]?.[locale] ?? humanize(normalized);
}

function comparisonObservedAttribute(candidate: PointObjectFindCandidate, locale: "en" | "ru"): { label: string; value: string } | null {
  for (const key of ["addr:district", "addr:suburb", "addr:city"] as const) {
    const value = candidate.observedTags[key]?.trim();
    if (value) return { label: locale === "ru" ? "Район" : "Locality", value };
  }
  return null;
}

function findCandidateResultKind(candidate: PointObjectFindCandidate): "mapped_building_or_landuse" | "mapped_poi" | "unknown" {
  if (candidate.matchedTag.key === "building" || candidate.matchedTag.key === "landuse") return "mapped_building_or_landuse";
  if (["office", "shop", "amenity", "tourism"].includes(candidate.matchedTag.key)) return "mapped_poi";
  return "unknown";
}

function getExecutableFindScenarios(audience: ExploreAudience, role: ExploreRole) {
  return getExploreScenariosByRole(audience, role)
    .filter((scenario) => pointObjectFindCapability(scenario.id).status !== "unsupported");
}

function getExecutableFindRoles(audience: ExploreAudience) {
  return getExploreRolesByAudience(audience)
    .filter((role) => getExecutableFindScenarios(audience, role.id).length > 0);
}

function getDefaultExecutableFindRole(audience: ExploreAudience, preferredRole?: ExploreRole): ExploreRole {
  const executableRoles = getExecutableFindRoles(audience);
  if (preferredRole && executableRoles.some((role) => role.id === preferredRole)) return preferredRole;
  return executableRoles[0]?.id ?? getDefaultRoleForAudience(audience);
}

function getDefaultExecutableFindScenario(audience: ExploreAudience, role: ExploreRole): ExploreScenarioId {
  return getExecutableFindScenarios(audience, role)[0]?.id ?? getDefaultScenarioForRole(audience, role);
}

function visibleSelectionAttributes(tags: Record<string, string>): Array<[string, string]> {
  const priority = ["building:use", "building", "landuse", "amenity", "tourism", "building:levels", "levels", "operator", "brand", "addr:district", "addr:suburb", "addr:city"];
  const entries = Object.entries(tags)
    .filter(([key, value]) => !["classification.category", "classification.type", "classification.address_type", "name"].includes(key) && value.trim() !== "" && !(key === "building" && value === "yes"))
    .sort(([left], [right]) => {
      const leftPriority = priority.indexOf(left);
      const rightPriority = priority.indexOf(right);
      return (leftPriority < 0 ? priority.length : leftPriority) - (rightPriority < 0 ? priority.length : rightPriority);
    });
  return entries.slice(0, 4);
}

function selectionAttributeLabel(key: string, locale: "en" | "ru"): string {
  if (key === "building:levels" || key === "levels") return locale === "ru" ? "Этажность на карте" : "Mapped levels";
  if (key === "building" || key === "building:use" || key === "landuse") return locale === "ru" ? "Тип на карте" : "Mapped type";
  if (key === "operator") return locale === "ru" ? "Оператор" : "Operator";
  if (key === "brand") return locale === "ru" ? "Бренд" : "Brand";
  if (key.startsWith("addr:")) return locale === "ru" ? "Район" : "Locality";
  return humanize(key.replace(/^tag\./, "").replace(/^classification\./, ""));
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

export function PointToObjectPrototypeV5({ initialMode = "analyse" }: { initialMode?: ProductMode } = {}) {
  const router = useRouter();
  const { locale, setLocale, t } = usePointObjectLocale();
  const { user, isSessionResolved } = useAuth();
  const projectIdentity = useMemo(() => pointObjectProjectIdentity(user), [user]);
  const [locationKey, setLocationKey] = useState<LiveMapLocationKey>("dubai");
  const [selection, setSelection] = useState<LiveMapSelection | null>(null);
  const [question, setQuestion] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [contextStatus, setContextStatus] = useState<"idle" | "loading" | "error">("idle");
  const [contextRetryVersion, setContextRetryVersion] = useState(0);
  const [contextFailure, setContextFailure] = useState<PointObjectSourceFailure>("unavailable");
  const [contextRetrySeconds, setContextRetrySeconds] = useState(0);
  const contextCooldownRef = useRef(0);
  const contextCacheRef = useRef(new Map<string, { expiresAt: number; value: NonNullable<ReturnType<typeof parseLiveResolvedObject>> }>());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LiveMapSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [navigationTarget, setNavigationTarget] = useState<LiveMapNavigationTarget | null>(null);
  const [viewModeRequest, setViewModeRequest] = useState<{ requestId: string; mode: LiveMapViewMode } | null>(initialMode === "find" ? { requestId: "initial-find-2d", mode: "2d" } : null);
  const [mode, setMode] = useState<ProductMode>(initialMode);
  const [sheet, setSheet] = useState<"peek" | "half" | "full">("peek");
  const [mobile, setMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(844);
  const effectiveSheet = mobile && viewportHeight < 600 && sheet === "half" ? "full" : sheet;
  const workspaceRef = useRef<HTMLElement>(null);
  const mapToggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const resize = () => {
      setMobile(media.matches);
      setViewportHeight(window.visualViewport?.height ?? window.innerHeight);
      workspaceRef.current?.style.setProperty("--workspace-height", `${window.visualViewport?.height ?? window.innerHeight}px`);
    };
    resize();
    media.addEventListener("change", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      media.removeEventListener("change", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);
  function showMap() {
    setSheet("peek");
    mapToggleRef.current?.focus();
  }
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftCoordinates, setDraftCoordinates] = useState<Coordinate[]>([]);
  const [createAoi, setCreateAoi] = useState<PointObjectCreateAoi | null>(null);
  const selectedCreateVertices = useMemo(() => {
    const vertices = extractSinglePolygon(selection?.object.geometry);
    return vertices && validatePointObjectCreateAoiVertices(vertices).ok ? vertices : null;
  }, [selection?.object.geometry]);
  const [createAoiFitRequest, setCreateAoiFitRequest] = useState<LiveMapCreateAoiFitRequest | null>(null);
  const [createEditorSnapshot, setCreateEditorSnapshot] = useState<PointObjectCreateEditorSnapshot | null>(null);
  const [generatedConcept, setGeneratedConcept] = useState<PointObjectGeneratedConcept | null>(null);
  const [generatedConceptLocale, setGeneratedConceptLocale] = useState<"en" | "ru" | null>(null);
  const [activeCreateAlternativeId, setActiveCreateAlternativeId] = useState<"A" | "B">("A");
  const [createResultDashboardOpen, setCreateResultDashboardOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createAreaCleared, setCreateAreaCleared] = useState(false);
  const [createReplacementStatus, setCreateReplacementStatus] = useState<PointObjectReplacementStatus>("idle");
  const [createReplacementRevision, setCreateReplacementRevision] = useState(0);
  const [areaContext, setAreaContext] = useState<PointObjectAreaContextResult | null>(null);
  const [areaContextStatus, setAreaContextStatus] = useState<"idle" | "loading" | "rate" | "error">("idle");
  const [areaContextRetryVersion, setAreaContextRetryVersion] = useState(0);
  const [areaContextRetryAfterSeconds, setAreaContextRetryAfterSeconds] = useState(0);
  const areaContextCooldownRef = useRef(0);
  const areaContextRequestIdRef = useRef(0);
  const [areaContextFailure, setAreaContextFailure] = useState<PointObjectSourceFailure>("unavailable");
  const [visibleBounds, setVisibleBounds] = useState<PointObjectFindBounds | null>(null);
  const [findExplicitSearchBounds, setFindExplicitSearchBounds] = useState<PointObjectFindBounds | null>(null);
  const [mapMoving, setMapMoving] = useState(false);
  const [, setRestoredFindViewportBounds] = useState<PointObjectFindBounds | null>(null);
  const [findAudience, setFindAudience] = useState<ExploreAudience>("b2b");
  const [findRole, setFindRole] = useState<ExploreRole>("developer");
  const [findScenario, setFindScenario] = useState<ExploreScenarioId>("b2b_redevelopment_selected_aoi");
  const [findGroup, setFindGroup] = useState<PointObjectFindGroup>("construction");
  const [findMinimumLevels, setFindMinimumLevels] = useState("");
  const [findMaximumLevels, setFindMaximumLevels] = useState("");
  const [findResult, setFindResult] = useState<PointObjectFindResult | null>(null);
  const [findResolvedObjects, setFindResolvedObjects] = useState<Record<string, NonNullable<ReturnType<typeof parseLiveResolvedObject>>>>({});
  const [activeFindResultId, setActiveFindResultId] = useState<PointObjectFindCandidate["sourceFeatureId"] | null>(null);
  const [hoveredFindResultId, setHoveredFindResultId] = useState<PointObjectFindCandidate["sourceFeatureId"] | null>(null);
  const [projectOverviewMarkers, setProjectOverviewMarkers] = useState<PointObjectProjectOverviewMarker[]>([]);
  const [activeProjectMarkerId, setActiveProjectMarkerId] = useState<string | null>(null);
  const [findShortlist, setFindShortlist] = useState<PointObjectFindCandidate[]>([]);
  const [findComparisonOpen, setFindComparisonOpen] = useState(false);
  const [findComparisonDashboardOpen, setFindComparisonDashboardOpen] = useState(false);
  const [findAnalysisTargetSourceFeatureId, setFindAnalysisTargetSourceFeatureId] = useState<PointObjectFindCandidate["sourceFeatureId"] | null>(null);
  const [findStatus, setFindStatus] = useState<"idle" | "loading" | "zoom" | "rate" | "error">("idle");
  const [findFailure, setFindFailure] = useState<PointObjectSourceFailure>("unavailable");
  const [findRetrySeconds, setFindRetrySeconds] = useState(0);
  const findCooldownRef = useRef(0);
  const [findResultIntent, setFindResultIntent] = useState<FindIntent | null>(null);
  const [createSavedArtifactId, setCreateSavedArtifactId] = useState<string | null>(null);
  const [findSessionReady, setFindSessionReady] = useState(false);
  const findRequestRef = useRef<AbortController | null>(null);
  const findFootprintRequestRef = useRef<{ sourceFeatureId: string; controller: AbortController } | null>(null);
  const findRequestIdRef = useRef(0);
  const contextRequestId = useRef(0);
  const searchRequestRef = useRef<AbortController | null>(null);
  const suggestionRequestRef = useRef<AbortController | null>(null);
  const committedSearchQueryRef = useRef("");
  const suggestionRequestIdRef = useRef(0);
  const suggestionCacheRef = useRef(new Map<string, LiveMapSearchResult[]>());
  const restoredFindSessionRef = useRef<PointObjectFindSessionState | null>(null);
  const pendingRestoredFindBoundsRef = useRef<{ bounds: PointObjectFindBounds; requestId: string } | null>(null);
  const appliedProfileAudienceRef = useRef<string | null>(null);
  const previousLocaleRef = useRef(locale);
  const projectRestoreAppliedRef = useRef<PointObjectProjectIdentity | null | undefined>(undefined);
  const suppressRestoredAreaContextRequestRef = useRef(false);
  const projectIdentityRef = useRef<PointObjectProjectIdentity | null>(projectIdentity);
  const createSaveContextRef = useRef<CreateSaveContext | null>(null);
  const createGenerationIdentityRef = useRef<PointObjectProjectIdentity | null | undefined>(undefined);
  const createSessionOwnerRef = useRef<PointObjectProjectIdentity | null | undefined>(undefined);
  const restoreRemovedCreateRef = useRef<(() => void) | null>(null);
  const [canRestoreRemovedCreate, setCanRestoreRemovedCreate] = useState(false);
  const findShortlistRef = useRef(findShortlist);
  const findComparisonOpenRef = useRef(findComparisonOpen);
  const findComparisonViewRef = useRef<PointObjectFindComparisonView>("results");
  const findAnalysisTargetRef = useRef(findAnalysisTargetSourceFeatureId);
  const activeCreateAlternativeRef = useRef(activeCreateAlternativeId);
  const findViewSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const findCohortGenerationRef = useRef(0);
  const findSavedBindingRef = useRef<{ generation: number; identityKey: PointObjectProjectIdentity; projectId: string; artifactId: string } | null>(null);
  const createViewSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const findResultRef = useRef(findResult);
  projectIdentityRef.current = projectIdentity;
  findShortlistRef.current = findShortlist;
  findComparisonOpenRef.current = findComparisonOpen;
  findComparisonViewRef.current = findComparisonDashboardOpen ? "dashboard" : findComparisonOpen ? "mini" : "results";
  findAnalysisTargetRef.current = findAnalysisTargetSourceFeatureId;
  activeCreateAlternativeRef.current = activeCreateAlternativeId;
  findResultRef.current = findResult;

  const findRoles = useMemo(() => getExecutableFindRoles(findAudience), [findAudience]);
  const findScenarios = useMemo(() => getExecutableFindScenarios(findAudience, findRole), [findAudience, findRole]);
  const findCapability = pointObjectFindCapability(findScenario);
  const findIntentKey = `${findAudience}:${findRole}:${findScenario}`;
  const findResultIntentKey = findResultIntent
    ? `${findResultIntent.audience}:${findResultIntent.role}:${findResultIntent.scenario}`
    : null;
  const findMappedMinimumLevels = findMinimumLevels.trim() ? Number(findMinimumLevels) : null;
  const findMappedMaximumLevels = findMaximumLevels.trim() ? Number(findMaximumLevels) : null;
  const findResultCriteriaMismatch = findResult !== null && (
    findResultIntentKey !== findIntentKey ||
    findResult.criteria.marketKey !== locationKey ||
    findResult.criteria.locale !== locale ||
    findResult.criteria.group !== findGroup ||
    findResult.criteria.mappedMinimumLevels !== findMappedMinimumLevels ||
    findResult.criteria.mappedMaximumLevels !== findMappedMaximumLevels
  );
  // Camera fits and passive/manual map inspection do not mutate the committed
  // search. A new viewport becomes criteria only after the explicit
  // "Use current map area" action.
  const findSearchAreaChanged = findResult !== null && findExplicitSearchBounds !== null &&
    !sameFindBounds(findExplicitSearchBounds, findResult.criteria.bounds);
  const findResultIsStale = findResult !== null && (findResultCriteriaMismatch || findSearchAreaChanged);
  const findCanUseCurrentMapArea = findResult !== null && visibleBounds !== null &&
    !sameFindBounds(visibleBounds, findResult.criteria.bounds) &&
    (findExplicitSearchBounds === null || !sameFindBounds(visibleBounds, findExplicitSearchBounds));
  const findResultMarketMismatch = findResult !== null && findResult.criteria.marketKey !== locationKey;
  const activeConceptMassing = generatedConcept?.alternatives?.find((alternative) => alternative.id === activeCreateAlternativeId)?.massing ?? generatedConcept?.massing ?? null;
  const createReplacementMapProps = {
    createReplacementRevision,
    onCameraMovingChange: setMapMoving,
    overlayBottomInset: mobile ? sheet === "half" && viewportHeight >= 600 ? Math.min((viewportHeight - 64) / 2, viewportHeight - 284) : 164 : 0
  };

  function clearCanvasForProjectOverview(markers: PointObjectProjectOverviewMarker[]) {
    // This is intentionally limited to transient canvas state. Local saved
    // artifacts and their exact-result receipts remain untouched.
    clearPointObjectSelection();
    clearPointObjectAnalysis();
    writePointObjectQuestion("");
    clearPointObjectFindSession();
    findRequestIdRef.current += 1;
    findRequestRef.current?.abort();
    findFootprintRequestRef.current?.controller.abort();
    findFootprintRequestRef.current = null;
    setSelection(null);
    setQuestion("");
    setMode("analyse");
    setNavigationTarget(null);
    setFindResult(null);
    setFindResolvedObjects({});
    setFindExplicitSearchBounds(null);
    setActiveFindResultId(null);
    setHoveredFindResultId(null);
    setFindResultIntent(null);
    setFindShortlist([]);
    setFindComparisonOpen(false);
    setFindComparisonDashboardOpen(false);
    setFindAnalysisTargetSourceFeatureId(null);
    setFindStatus("idle");
    detachFindSavedArtifact();
    setIsDrawing(false);
    setDraftCoordinates([]);
    setCreateAoi(null);
    setCreateAoiFitRequest(null);
    setGeneratedConcept(null);
    setGeneratedConceptLocale(null);
    setCreateResultDashboardOpen(false);
    setCreateEditorSnapshot(null);
    setCreateSavedArtifactId(null);
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setProjectOverviewMarkers(markers);
    setActiveProjectMarkerId(null);
  }

  function exitProjectOverview() {
    clearPointObjectProjectOverview();
    setProjectOverviewMarkers([]);
    setActiveProjectMarkerId(null);
  }

  async function openProjectOverviewMarker(artifactId: string): Promise<boolean> {
    if (!projectIdentity) return false;
    setActiveProjectMarkerId(artifactId);
    const read = await readVerifiedPointObjectProjects(projectIdentity);
    const artifact = read.store?.projects.flatMap((project) => project.artifacts).find((candidate) => candidate.artifactId === artifactId);
    if (!artifact || !queuePointObjectProjectRestore(projectIdentity, artifact)) {
      setActiveProjectMarkerId(null);
      return false;
    }
    // A reload is deliberate: it consumes the exact verified artifact through
    // the standard restore path rather than reconstructing it from a marker.
    window.location.reload();
    return true;
  }

  useEffect(() => {
    const restoredSelection = readPointObjectSelection();
    restoredFindSessionRef.current = readPointObjectFindSession();
    if (restoredSelection) {
      setLocationKey(restoredSelection.locationKey);
      setSelection(restoredSelection);
    }
    setQuestion(readPointObjectQuestion());
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (!sessionReady || !isSessionResolved || projectRestoreAppliedRef.current === projectIdentity) return;
    reconcilePointObjectBrowserIdentity(projectIdentity);
    contextCacheRef.current.clear();
    findFootprintRequestRef.current?.controller.abort();
    findFootprintRequestRef.current = null;
    setFindResolvedObjects({});
    restoreRemovedCreateRef.current = null;
    setCanRestoreRemovedCreate(false);
    projectRestoreAppliedRef.current = projectIdentity;
    detachFindSavedArtifact();
    setCreateSavedArtifactId(null);
    createSaveContextRef.current = null;
    createGenerationIdentityRef.current = undefined;
    createSessionOwnerRef.current = undefined;
    setIsDrawing(false);
    setDraftCoordinates([]);
    setCreateAoi(null);
    setCreateAoiFitRequest(null);
    setCreateEditorSnapshot(null);
    setGeneratedConcept(null);
    setGeneratedConceptLocale(null);
    setActiveCreateAlternativeId("A");
    setCreateResultDashboardOpen(false);
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setCreateReplacementRevision(0);
    setAreaContext(null);
    setAreaContextStatus("idle");
    setAreaContextRetryAfterSeconds(0);
    setCreateError(null);
    if (!projectIdentity) {
      const restored = readPointObjectCreateSession();
      if (!restored) return;
      createSessionOwnerRef.current = null;
      suppressRestoredAreaContextRequestRef.current = true;
      setLocale(restored.locale);
      setLocationKey(restored.marketKey);
      if (initialMode !== "find") setMode("create");
      setIsDrawing(false);
      setDraftCoordinates(restored.aoi.coordinates[0]?.slice(0, -1) ?? []);
      setCreateAoi(restored.aoi);
      setCreateAoiFitRequest({ requestId: `restore-guest-create:${restored.updatedAt}`, bounds: createAoiBounds(restored.aoi.coordinates[0] ?? []) });
      setCreateEditorSnapshot(restored.editorSnapshot);
      setGeneratedConcept(restored.generated);
      setGeneratedConceptLocale(restored.generatedLocale);
      setActiveCreateAlternativeId(restored.activeAlternativeId);
      setCreateResultDashboardOpen(restored.dashboardOpen);
      setAreaContext(restored.areaContext);
      setAreaContextStatus("idle");
      setCreateAreaCleared(true);
      setCreateReplacementStatus("idle");
      setCreateReplacementRevision((revision) => revision + 1);
      return;
    }
    // A guest result is never adopted into an authenticated owner's projects.
    clearPointObjectCreateSession();
    createSessionOwnerRef.current = projectIdentity;
    void Promise.all([consumePointObjectProjectOverview(projectIdentity), consumePointObjectProjectRestore(projectIdentity)]).then(([overview, artifact]) => {
      if (projectIdentityRef.current !== projectIdentity) return;
      if (overview) {
        clearCanvasForProjectOverview(overview);
        return;
      }
      if (!artifact) return;
      setLocale(artifact.locale);
      setLocationKey(artifact.marketKey);
      if (artifact.kind === "find") {
        const restored = artifact.payload.session;
        const generation = detachFindSavedArtifact();
        const restoredStore = projectIdentity ? inspectPointObjectProjects(projectIdentity).store : null;
        const restoredProject = restoredStore?.projects.find((candidate) => candidate.artifacts.some((item) => item.artifactId === artifact.artifactId));
        if (projectIdentity && restoredProject && restoredStore?.activeProjectId === restoredProject.projectId) {
          findSavedBindingRef.current = { generation, identityKey: projectIdentity, projectId: restoredProject.projectId, artifactId: artifact.artifactId };
        }
        restoredFindSessionRef.current = restored;
        setMode("find");
        setFindAudience(restored.audience);
        setFindRole(restored.role);
        setFindScenario(restored.scenario);
        setFindGroup(restored.group);
        setFindMinimumLevels(restored.mappedMinimumLevels);
        setFindMaximumLevels(restored.mappedMaximumLevels);
        setFindResult(restored.result);
        setFindExplicitSearchBounds(null);
        setActiveFindResultId(null);
        setHoveredFindResultId(null);
        setFindResultIntent({ audience: restored.audience, role: restored.role, scenario: restored.scenario });
        setFindShortlist(restored.shortlist);
        setFindComparisonOpen(restored.comparisonOpen);
        setFindComparisonDashboardOpen(restored.comparisonView === "dashboard");
        setFindAnalysisTargetSourceFeatureId(restored.analysisTargetSourceFeatureId);
        setFindSessionReady(true);
        setRestoredFindViewportBounds(null);
        pendingRestoredFindBoundsRef.current = { bounds: restored.result.criteria.bounds, requestId: `restore-find-bounds:${artifact.artifactId}` };
        // Empty saved searches have the same real query bounds but no object to select.
        setNavigationTarget(findRestoreNavigationTarget(restored.result.criteria.bounds, artifact.artifactId));
        return;
      }
      if (artifact.kind === "create") {
        setCreateSavedArtifactId(artifact.artifactId);
        suppressRestoredAreaContextRequestRef.current = true;
        setMode("create");
        setIsDrawing(false);
        setDraftCoordinates(artifact.payload.aoi.coordinates[0]?.slice(0, -1) ?? []);
        setCreateAoi(artifact.payload.aoi);
        setCreateAoiFitRequest({ requestId: `restore-create:${artifact.artifactId}`, bounds: createAoiBounds(artifact.payload.aoi.coordinates[0] ?? []) });
        setCreateEditorSnapshot(artifact.payload.editorSnapshot);
        setGeneratedConcept(artifact.payload.generated);
        setGeneratedConceptLocale(artifact.payload.generatedLocale);
        setActiveCreateAlternativeId(artifact.payload.activeAlternativeId);
        setCreateResultDashboardOpen(true);
        setAreaContext(artifact.payload.areaContext);
        setAreaContextStatus("idle");
        setCreateAreaCleared(true);
        setCreateReplacementStatus("idle");
        setCreateReplacementRevision((revision) => revision + 1);
      }
    });
  }, [initialMode, isSessionResolved, projectIdentity, sessionReady, setLocale]);

  useEffect(() => {
    if (!sessionReady || !isSessionResolved || projectIdentity || !createAoi || !generatedConcept || !generatedConceptLocale) return;
    persistGuestCreateSession();
  }, [
    activeCreateAlternativeId,
    areaContext,
    createAoi,
    createEditorSnapshot,
    createResultDashboardOpen,
    generatedConcept,
    generatedConceptLocale,
    isSessionResolved,
    locale,
    projectIdentity,
    sessionReady
  ]);

  useEffect(() => {
    if (!sessionReady || !isSessionResolved) return;
    const profileAudience = user?.profile.defaultAudience ?? "b2b";
    if (appliedProfileAudienceRef.current === profileAudience) return;

    const isInitialReconciliation = appliedProfileAudienceRef.current === null;
    const restoredFind = isInitialReconciliation
      ? pointObjectFindSessionForProfileAudience(restoredFindSessionRef.current, profileAudience)
      : null;
    findRequestIdRef.current += 1;
    findRequestRef.current?.abort();
    findRequestRef.current = null;

    if (restoredFind) {
      const restoredRole = getDefaultExecutableFindRole(restoredFind.audience, restoredFind.role);
      const executableScenarios = getExecutableFindScenarios(restoredFind.audience, restoredRole);
      const restoredScenario = executableScenarios.some((scenario) => scenario.id === restoredFind.scenario)
        ? restoredFind.scenario
        : executableScenarios[0]?.id ?? getDefaultExecutableFindScenario(restoredFind.audience, restoredRole);
      const restoredCapability = pointObjectFindCapability(restoredScenario);
      const restoredGroup = restoredCapability.allowedGroups.includes(restoredFind.group)
        ? restoredFind.group
        : restoredCapability.defaultGroup;
      const restoredIntentWasNormalized = restoredRole !== restoredFind.role ||
        restoredScenario !== restoredFind.scenario || restoredGroup !== restoredFind.group;
      const restoredScenarioChanged = restoredRole !== restoredFind.role || restoredScenario !== restoredFind.scenario;
      const restoredSelection = readPointObjectSelection();
      if (!restoredSelection || restoredSelection.locationKey === restoredFind.marketKey) setLocationKey(restoredFind.marketKey);
      setFindAudience(restoredFind.audience);
      setFindRole(restoredRole);
      setFindScenario(restoredScenario);
      setFindGroup(restoredGroup);
      setFindMinimumLevels(restoredScenarioChanged
        ? restoredCapability.mappedLevelsPreset.minimum?.toString() ?? ""
        : restoredFind.mappedMinimumLevels);
      setFindMaximumLevels(restoredScenarioChanged
        ? restoredCapability.mappedLevelsPreset.maximum?.toString() ?? ""
        : restoredFind.mappedMaximumLevels);
      setFindResult(restoredIntentWasNormalized ? null : restoredFind.result);
      setFindExplicitSearchBounds(null);
      setActiveFindResultId(null);
      setHoveredFindResultId(null);
      setFindResultIntent(!restoredIntentWasNormalized && restoredFind.result ? {
        audience: restoredFind.audience,
        role: restoredFind.role,
        scenario: restoredFind.scenario
      } : null);
      setFindShortlist(restoredIntentWasNormalized ? [] : restoredFind.shortlist);
      setFindComparisonOpen(restoredIntentWasNormalized ? false : restoredFind.comparisonOpen);
      setFindComparisonDashboardOpen(!restoredIntentWasNormalized && restoredFind.comparisonView === "dashboard");
      setFindAnalysisTargetSourceFeatureId(restoredIntentWasNormalized ? null : restoredFind.analysisTargetSourceFeatureId);
    } else {
      const role = getDefaultExecutableFindRole(profileAudience, user?.profile.defaultRole);
      const scenario = getDefaultExecutableFindScenario(profileAudience, role);
      const capability = pointObjectFindCapability(scenario);
      setFindAudience(profileAudience);
      setFindRole(role);
      setFindScenario(scenario);
      setFindGroup(capability.defaultGroup);
      setFindMinimumLevels(capability.mappedLevelsPreset.minimum?.toString() ?? "");
      setFindMaximumLevels(capability.mappedLevelsPreset.maximum?.toString() ?? "");
      setFindResult(null);
      setFindExplicitSearchBounds(null);
      setActiveFindResultId(null);
      setHoveredFindResultId(null);
      setFindResultIntent(null);
      setFindShortlist([]);
      setFindComparisonOpen(false);
      setFindComparisonDashboardOpen(false);
      setFindAnalysisTargetSourceFeatureId(null);
      setFindStatus("idle");
    }
    appliedProfileAudienceRef.current = profileAudience;
    setFindSessionReady(true);
  }, [isSessionResolved, sessionReady, user]);

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
      mappedMaximumLevels: findResult
        ? findResult.criteria.mappedMaximumLevels === null ? "" : String(findResult.criteria.mappedMaximumLevels)
        : findMaximumLevels,
      result: findResult,
      shortlist: findResult ? findShortlist : [],
      comparisonOpen: Boolean(findResult) && findComparisonOpen,
      comparisonView: findResult && findShortlist.length >= 2
        ? findComparisonDashboardOpen ? "dashboard" : findComparisonOpen ? "mini" : "results"
        : "results",
      analysisTargetSourceFeatureId: findResult ? findAnalysisTargetSourceFeatureId : null
    });
  }, [findAnalysisTargetSourceFeatureId, findAudience, findComparisonDashboardOpen, findComparisonOpen, findGroup, findMaximumLevels, findMinimumLevels, findResult, findResultIntent, findRole, findScenario, findSessionReady, findShortlist, locale, locationKey]);

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
    findRequestIdRef.current += 1;
    findRequestRef.current?.abort();
    setFindStatus("idle");
    setActiveFindResultId(null);
    setHoveredFindResultId(null);
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

  const unresolvedContextKey = selection?.resolvedObject ? null : contextRequestKey(selection, locale);
  useEffect(() => {
    if (!unresolvedContextKey) {
      setContextStatus("idle");
      return;
    }
    const applyResolved = (resolvedObject: NonNullable<ReturnType<typeof parseLiveResolvedObject>>) => {
      const storedSelection = readPointObjectSelection();
      const confirmedDisplayGeometry = resolvedObject.geometryProvenance === "confirmed_complete_footprint"
        ? resolvedObject.displayGeometry ?? null
        : null;
      if (confirmedDisplayGeometry && findResultRef.current?.candidates.some((candidate) => candidate.sourceFeatureId === resolvedObject.sourceFeatureId)) {
        setFindResolvedObjects((current) => current[resolvedObject.sourceFeatureId] === resolvedObject
          ? current
          : { ...current, [resolvedObject.sourceFeatureId]: resolvedObject });
      }
      setSelection((current) => current && contextRequestKey(current, locale) === unresolvedContextKey ? {
        ...current,
        viewport: storedSelection?.clickedAt === current.clickedAt ? storedSelection.viewport : current.viewport,
        object: confirmedDisplayGeometry ? {
          ...current.object,
          geometry: confirmedDisplayGeometry as LiveMapSelection["object"]["geometry"],
          geometryProvenance: "confirmed_complete_footprint",
          renderHeightM: resolvedObject.renderHeightM ?? null,
          renderMinHeightM: resolvedObject.renderMinHeightM ?? null
        } : current.object,
        resolvedObject
      } : current);
      setContextStatus("idle");
    };
    const cached = contextCacheRef.current.get(unresolvedContextKey);
    if (cached && cached.expiresAt > Date.now()) {
      applyResolved(cached.value);
      return;
    }
    if (contextCooldownRef.current > Date.now()) {
      setContextStatus("error");
      return;
    }
    const requestId = contextRequestId.current + 1;
    contextRequestId.current = requestId;
    const controller = new AbortController();
    const timeoutSignal = AbortSignal.timeout(30_000);
    const onDeadline = () => {
      if (controller.signal.aborted || requestId !== contextRequestId.current) return;
      setContextFailure("timeout");
      setContextStatus("error");
      controller.abort(timeoutSignal.reason);
    };
    // The UI owns its deadline state. Do not depend on a combined fetch signal
    // rejecting promptly in every browser before allowing an explicit retry.
    timeoutSignal.addEventListener("abort", onDeadline, { once: true });
    setContextStatus("loading");
    const timer = window.setTimeout(() => {
      void fetch("/api/prototype/point-to-object/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: unresolvedContextKey,
        signal: controller.signal
      }).then(async (response) => {
        const payload = await response.json() as PointObjectLiveContextResponse;
        if (controller.signal.aborted || requestId !== contextRequestId.current) return;
        if (!response.ok || payload.mode !== "resolved") {
          setContextFailure(pointObjectSourceFailure(response.status, payload));
          if (response.status === 429) {
            const seconds = sourceRetryAfterSeconds(response.headers.get("retry-after"));
            contextCooldownRef.current = Date.now() + seconds * 1_000;
            setContextRetrySeconds(seconds);
          }
          setContextStatus("error");
          return;
        }
        const resolvedObject = parseLiveResolvedObject(payload.subject);
        if (!resolvedObject) {
          setContextFailure("unavailable");
          setContextStatus("error");
          return;
        }
        if (contextCacheRef.current.size >= 24) contextCacheRef.current.delete(contextCacheRef.current.keys().next().value!);
        contextCacheRef.current.set(unresolvedContextKey, { value: resolvedObject, expiresAt: Date.now() + 5 * 60_000 });
        applyResolved(resolvedObject);
      }).catch((error: unknown) => {
        // A replaced selection is a local cancellation. A deadline can surface
        // as AbortError too, so it must leave recoverable error state instead.
        if (controller.signal.aborted || requestId !== contextRequestId.current) return;
        if (requestId === contextRequestId.current) {
          setContextFailure(timeoutSignal.aborted || (error instanceof Error && error.name === "TimeoutError") ? "timeout" : "unavailable");
          setContextStatus("error");
        }
      }).finally(() => timeoutSignal.removeEventListener("abort", onDeadline));
    }, 250);
    return () => {
      window.clearTimeout(timer);
      timeoutSignal.removeEventListener("abort", onDeadline);
      controller.abort();
    };
  }, [unresolvedContextKey, contextRetryVersion, locale, projectIdentity]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setContextRetrySeconds(Math.max(0, Math.ceil((contextCooldownRef.current - Date.now()) / 1_000)));
      setFindRetrySeconds(Math.max(0, Math.ceil((findCooldownRef.current - Date.now()) / 1_000)));
      setAreaContextRetryAfterSeconds(Math.max(0, Math.ceil((areaContextCooldownRef.current - Date.now()) / 1_000)));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    searchRequestRef.current?.abort();
    suggestionRequestRef.current?.abort();
    findRequestIdRef.current += 1;
    findRequestRef.current?.abort();
    findFootprintRequestRef.current?.controller.abort();
  }, []);

  useEffect(() => {
    areaContextRequestIdRef.current += 1;
    const requestId = areaContextRequestIdRef.current;
    if (!createAoi) {
      setAreaContext(null);
      setAreaContextStatus("idle");
      setAreaContextRetryAfterSeconds(0);
      return;
    }
    if (suppressRestoredAreaContextRequestRef.current) {
      suppressRestoredAreaContextRequestRef.current = false;
      setAreaContextStatus("idle");
      setAreaContextRetryAfterSeconds(0);
      return;
    }
    const areaRequest = { marketKey: locationKey, locale, aoiCoordinates: createAoi.coordinates };
    if (areaContextCooldownRef.current > Date.now()) {
      setAreaContext((current) => current && samePointObjectAreaRequest(current.request, areaRequest) ? current : null);
      setAreaContextStatus("rate");
      setAreaContextRetryAfterSeconds(Math.ceil((areaContextCooldownRef.current - Date.now()) / 1_000));
      return;
    }
    const controller = new AbortController();
    const timeoutSignal = AbortSignal.timeout(POINT_OBJECT_SOURCE_BROWSER_TIMEOUT_MS);
    const onDeadline = () => {
      if (!pointObjectSourceResponseIsCurrent(requestId, areaContextRequestIdRef.current, controller.signal)) return;
      setAreaContextFailure("timeout");
      setAreaContextStatus("error");
      controller.abort(timeoutSignal.reason);
    };
    timeoutSignal.addEventListener("abort", onDeadline, { once: true });
    setAreaContextStatus("loading");
    setAreaContextRetryAfterSeconds(0);
    setAreaContext((current) => current && samePointObjectAreaRequest(current.request, areaRequest) ? current : null);
    void fetch("/api/prototype/point-to-object/area-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(areaRequest),
      signal: controller.signal
    }).then(async (response) => {
      const payload: unknown = await response.json();
      if (!pointObjectSourceResponseIsCurrent(requestId, areaContextRequestIdRef.current, controller.signal)) return;
      if (response.status === 429) {
        const seconds = sourceRetryAfterSeconds(response.headers.get("retry-after"));
        areaContextCooldownRef.current = Date.now() + seconds * 1_000;
        setAreaContextFailure(pointObjectSourceFailure(response.status, payload));
        setAreaContextStatus("rate");
        setAreaContextRetryAfterSeconds(seconds);
        return;
      }
      if (!response.ok || !isPointObjectAreaContextResult(payload)) {
        setAreaContextFailure(pointObjectSourceFailure(response.status, payload));
        setAreaContextStatus("error");
        return;
      }
      setAreaContext(payload);
      setAreaContextStatus("idle");
    }).catch((error: unknown) => {
      // Only the local cleanup cancel is silent. Deadline aborts remain
      // actionable rather than leaving the Create panel in Loading forever.
      if (!pointObjectSourceResponseIsCurrent(requestId, areaContextRequestIdRef.current, controller.signal)) return;
      setAreaContextFailure(timeoutSignal.aborted || (error instanceof Error && error.name === "TimeoutError") ? "timeout" : "unavailable");
      setAreaContextStatus("error");
    }).finally(() => timeoutSignal.removeEventListener("abort", onDeadline));
    return () => {
      timeoutSignal.removeEventListener("abort", onDeadline);
      controller.abort();
    };
  }, [areaContextRetryVersion, createAoi, locale, locationKey]);

  const handleSelection = useCallback((nextSelection: LiveMapSelection | null) => {
    clearPointObjectProjectRestore();
    clearPointObjectProjectOverview();
    setProjectOverviewMarkers([]);
    setActiveProjectMarkerId(null);
    setSelection(nextSelection);
    setFindAnalysisTargetSourceFeatureId((current) => nextSelection?.object.sourceFeatureId === current ? current : null);
    if (!nextSelection) setContextStatus("idle");
    clearPointObjectAnalysis();
  }, []);

  const handleViewportChange = useCallback((nextSelection: LiveMapSelection) => writePointObjectSelection(nextSelection), []);
  const handleVisibleBoundsChange = useCallback((bounds: PointObjectFindBounds, navigationRequestId?: string) => {
    const pending = pendingRestoredFindBoundsRef.current;
    // Initial load, resize and interrupted camera transitions may also contain
    // the query. Only the requested restore fit can establish its viewport.
    if (matchesRestoredFindViewport(bounds, pending, navigationRequestId)) {
      pendingRestoredFindBoundsRef.current = null;
      setRestoredFindViewportBounds(bounds);
    }
    setVisibleBounds(bounds);
  }, []);

  function changeMarket(nextMarket: LiveMapLocationKey) {
    if (nextMarket === locationKey) return;
    restoreRemovedCreateRef.current = null;
    setCanRestoreRemovedCreate(false);
    clearPointObjectProjectRestore();
    exitProjectOverview();
    pendingRestoredFindBoundsRef.current = null;
    setRestoredFindViewportBounds(null);
    detachFindSavedArtifact();
    clearPointObjectCreateSession();
    createGenerationIdentityRef.current = undefined;
    createSessionOwnerRef.current = undefined;
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
    setCreateAoiFitRequest(null);
    setCreateEditorSnapshot(null);
    setGeneratedConcept(null);
    setGeneratedConceptLocale(null);
    setActiveCreateAlternativeId("A");
    setCreateResultDashboardOpen(false);
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setCreateReplacementRevision(0);
    setAreaContext(null);
    setAreaContextStatus("idle");
    setAreaContextRetryAfterSeconds(0);
    setIsDrawing(false);
    setCreateError(null);
    setFindStatus("idle");
    setFindExplicitSearchBounds(null);
    setFindComparisonDashboardOpen(false);
    clearPointObjectSelection();
    clearPointObjectAnalysis();
    contextRequestId.current += 1;
    setContextStatus("idle");
  }

  function markFindOutcomeStale() {
    findRequestIdRef.current += 1;
    findRequestRef.current?.abort();
    findRequestRef.current = null;
    findFootprintRequestRef.current?.controller.abort();
    findFootprintRequestRef.current = null;
    setActiveFindResultId(null);
    setHoveredFindResultId(null);
    setFindStatus("idle");
  }

  function detachFindSavedArtifact(): number {
    const generation = findCohortGenerationRef.current + 1;
    findCohortGenerationRef.current = generation;
    findSavedBindingRef.current = null;
    return generation;
  }

  function changeFindRole(role: ExploreRole) {
    const scenario = getDefaultExecutableFindScenario(findAudience, role);
    setFindRole(role);
    setFindScenario(scenario);
    setFindGroup(pointObjectFindCapability(scenario).defaultGroup);
    setFindMinimumLevels(pointObjectFindCapability(scenario).mappedLevelsPreset.minimum?.toString() ?? "");
    setFindMaximumLevels(pointObjectFindCapability(scenario).mappedLevelsPreset.maximum?.toString() ?? "");
    markFindOutcomeStale();
  }

  function changeFindScenario(scenario: ExploreScenarioId) {
    const capability = pointObjectFindCapability(scenario);
    setFindScenario(scenario);
    setFindGroup(capability.defaultGroup);
    setFindMinimumLevels(capability.mappedLevelsPreset.minimum?.toString() ?? "");
    setFindMaximumLevels(capability.mappedLevelsPreset.maximum?.toString() ?? "");
    markFindOutcomeStale();
  }

  function resetFindResults() {
    detachFindSavedArtifact();
    findRequestIdRef.current += 1;
    findRequestRef.current?.abort();
    findRequestRef.current = null;
    findFootprintRequestRef.current?.controller.abort();
    findFootprintRequestRef.current = null;
    setFindResult(null);
    setFindResolvedObjects({});
    setFindExplicitSearchBounds(null);
    setActiveFindResultId(null);
    setHoveredFindResultId(null);
    setFindResultIntent(null);
    setFindShortlist([]);
    setFindComparisonOpen(false);
    setFindComparisonDashboardOpen(false);
    setFindAnalysisTargetSourceFeatureId(null);
    setFindStatus("idle");
    clearPointObjectFindSession();
  }

  async function saveFindArtifact(
    result: PointObjectFindResult,
    shortlist: PointObjectFindCandidate[],
    comparisonOpen: boolean,
    intent: FindIntent,
    identityKey: PointObjectProjectIdentity,
    destination: PointObjectProjectDestination,
    cohortGeneration: number
  ) {
    const session: PointObjectFindSessionState & { result: PointObjectFindResult } = {
      version: 1,
      marketKey: result.criteria.marketKey,
      locale: result.criteria.locale,
      audience: intent.audience,
      role: intent.role,
      scenario: intent.scenario,
      group: result.criteria.group,
      mappedMinimumLevels: result.criteria.mappedMinimumLevels === null ? "" : String(result.criteria.mappedMinimumLevels),
      mappedMaximumLevels: result.criteria.mappedMaximumLevels === null ? "" : String(result.criteria.mappedMaximumLevels),
      result,
      shortlist,
      comparisonOpen: comparisonOpen && shortlist.length >= 2,
      comparisonView: comparisonOpen && shortlist.length >= 2 ? "mini" : "results",
      analysisTargetSourceFeatureId: null,
      updatedAt: new Date().toISOString()
    };
    const saved = await savePointObjectOperation(identityKey, {
      kind: "find",
      locale: result.criteria.locale,
      marketKey: result.criteria.marketKey,
      label: `${locale === "ru" ? "Поиск" : "Find"} · ${result.candidates.length} ${locale === "ru" ? "объектов" : "places"}`,
      payload: { session }
    }, undefined, destination);
    if (projectIdentityRef.current === identityKey && findCohortGenerationRef.current === cohortGeneration &&
        (saved.status === "saved" || saved.status === "replayed")) {
      const binding = { generation: cohortGeneration, identityKey, projectId: saved.project.projectId, artifactId: saved.artifact.artifactId };
      const currentStore = inspectPointObjectProjects(identityKey).store;
      if (binding.projectId !== destination.projectId || currentStore?.activeProjectId !== binding.projectId) return;
      findSavedBindingRef.current = binding;
      if (findShortlistRef.current.length || findComparisonOpenRef.current || findAnalysisTargetRef.current) {
        queueFindViewUpdate(binding, {
          shortlist: findShortlistRef.current,
          comparisonOpen: findComparisonOpenRef.current,
          comparisonView: findComparisonViewRef.current,
          analysisTargetSourceFeatureId: findAnalysisTargetRef.current
        });
      }
    }
  }

  function queueFindViewUpdate(
    binding: { generation: number; identityKey: PointObjectProjectIdentity; projectId: string; artifactId: string },
    view: Pick<PointObjectFindSessionState, "shortlist" | "comparisonOpen" | "comparisonView" | "analysisTargetSourceFeatureId">
  ) {
    const immutableView = structuredClone(view);
    findViewSaveQueueRef.current = findViewSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const current = findSavedBindingRef.current;
        if (!current || current.generation !== binding.generation || current.identityKey !== binding.identityKey ||
            current.projectId !== binding.projectId || current.artifactId !== binding.artifactId) return;
        await updatePointObjectFindViewState(binding.identityKey, binding.artifactId, immutableView);
      });
  }

  function queueCreateViewUpdate(identityKey: PointObjectProjectIdentity, artifactId: string, id: "A" | "B") {
    createViewSaveQueueRef.current = createViewSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => { await updatePointObjectCreateViewState(identityKey, artifactId, id); });
  }

  function persistGuestCreateSession(input: {
    aoi?: PointObjectCreateAoi | null;
    editorSnapshot?: PointObjectCreateEditorSnapshot | null;
    generated?: PointObjectGeneratedConcept | null;
    generatedLocale?: "en" | "ru" | null;
    activeAlternativeId?: "A" | "B";
    dashboardOpen?: boolean;
    areaContext?: PointObjectAreaContextResult | null;
  } = {}) {
    if (projectIdentityRef.current || createSessionOwnerRef.current !== null) return;
    const sessionAoi = input.aoi === undefined ? createAoi : input.aoi;
    const sessionGenerated = input.generated === undefined ? generatedConcept : input.generated;
    const sessionGeneratedLocale = input.generatedLocale === undefined ? generatedConceptLocale : input.generatedLocale;
    if (!sessionAoi || !sessionGenerated || !sessionGeneratedLocale) return;
    const candidateAreaContext = input.areaContext === undefined ? areaContext : input.areaContext;
    const compatibleAreaContext = candidateAreaContext && candidateAreaContext.request.marketKey === locationKey &&
      candidateAreaContext.request.locale === sessionGeneratedLocale &&
      JSON.stringify(candidateAreaContext.request.aoiCoordinates) === JSON.stringify(sessionAoi.coordinates)
      ? candidateAreaContext
      : null;
    writePointObjectCreateSession({
      marketKey: locationKey,
      locale,
      aoi: sessionAoi,
      editorSnapshot: input.editorSnapshot === undefined ? createEditorSnapshot : input.editorSnapshot,
      generated: sessionGenerated,
      generatedLocale: sessionGeneratedLocale,
      activeAlternativeId: input.activeAlternativeId ?? activeCreateAlternativeId,
      areaContext: compatibleAreaContext,
      dashboardOpen: input.dashboardOpen ?? createResultDashboardOpen
    });
  }

  async function saveCreateArtifact(
    concept: PointObjectGeneratedConcept,
    activeAlternativeId: "A" | "B",
    context: CreateSaveContext | null
  ) {
    if (!context || projectIdentityRef.current !== context.identityKey) return;
    const saved = await savePointObjectOperation(context.identityKey, {
      kind: "create",
      locale: context.locale,
      marketKey: context.marketKey,
      label: concept.program.title,
      payload: {
        aoi: context.aoi,
        editorSnapshot: context.editorSnapshot,
        generated: concept,
        generatedLocale: context.locale,
        activeAlternativeId,
        areaContext: context.areaContext
      }
    }, undefined, context.destination);
    if (projectIdentityRef.current === context.identityKey && (saved.status === "saved" || saved.status === "replayed")) {
      setCreateSavedArtifactId(saved.artifact.artifactId);
      if (activeCreateAlternativeRef.current !== activeAlternativeId) {
        queueCreateViewUpdate(context.identityKey, saved.artifact.artifactId, activeCreateAlternativeRef.current);
      }
    }
  }

  function updateFindSavedView(
    shortlist: PointObjectFindCandidate[],
    comparisonOpen: boolean,
    analysisTargetSourceFeatureId = findAnalysisTargetSourceFeatureId,
    comparisonView: PointObjectFindComparisonView = comparisonOpen
      ? findComparisonDashboardOpen ? "dashboard" : "mini"
      : "results"
  ) {
    const binding = findSavedBindingRef.current;
    if (!binding || projectIdentityRef.current !== binding.identityKey || findCohortGenerationRef.current !== binding.generation) return;
    const currentStore = inspectPointObjectProjects(binding.identityKey).store;
    if (currentStore?.activeProjectId !== binding.projectId) return;
    queueFindViewUpdate(binding, {
      shortlist,
      comparisonOpen,
      comparisonView: shortlist.length >= 2 ? comparisonView : "results",
      analysisTargetSourceFeatureId
    });
  }

  function toggleFindShortlist(candidate: PointObjectFindCandidate) {
    if (findResultIsStale) return;
    const next = findShortlist.some((item) => item.sourceFeatureId === candidate.sourceFeatureId)
      ? findShortlist.filter((item) => item.sourceFeatureId !== candidate.sourceFeatureId)
      : findShortlist.length >= 3 ? findShortlist : [...findShortlist, candidate];
    setFindShortlist(next);
    const nextComparisonOpen = next.length >= 2 && findComparisonOpen;
    if (next.length < 2) {
      setFindComparisonOpen(false);
      setFindComparisonDashboardOpen(false);
    }
    if (findResult && !findResultIsStale) updateFindSavedView(next, nextComparisonOpen, findAnalysisTargetSourceFeatureId, nextComparisonOpen ? findComparisonViewRef.current : "results");
  }

  function clearFindShortlist() {
    setFindShortlist([]);
    setFindComparisonOpen(false);
    setFindComparisonDashboardOpen(false);
    if (findResult && !findResultIsStale) updateFindSavedView([], false, null);
  }

  function setFindComparison(open: boolean) {
    setFindComparisonOpen(open);
    setFindComparisonDashboardOpen(false);
    if (findResult && !findResultIsStale) updateFindSavedView(findShortlist, open, findAnalysisTargetSourceFeatureId, open ? "mini" : "results");
  }

  function setFindComparisonDashboard(open: boolean) {
    setFindComparisonOpen(open || findComparisonOpen);
    setFindComparisonDashboardOpen(open);
    if (findResult && !findResultIsStale) updateFindSavedView(findShortlist, open || findComparisonOpen, findAnalysisTargetSourceFeatureId, open ? "dashboard" : "mini");
  }

  async function findInView() {
    if (!isSessionResolved || !findSessionReady || !visibleBounds || findRequestRef.current || findStatus === "loading" || findCapability.status === "unsupported" || findCooldownRef.current > Date.now()) return;
    const cohortGeneration = detachFindSavedArtifact();
    await findViewSaveQueueRef.current.catch(() => undefined);
    if (findCohortGenerationRef.current !== cohortGeneration) return;
    clearPointObjectProjectRestore();
    pendingRestoredFindBoundsRef.current = null;
    setRestoredFindViewportBounds(null);
    const controller = new AbortController();
    const requestId = findRequestIdRef.current + 1;
    const requestIntent = { audience: findAudience, role: findRole, scenario: findScenario };
    const requestBounds = findExplicitSearchBounds ?? visibleBounds;
    const initiatingIdentity = projectIdentityRef.current;
    const destination = initiatingIdentity ? capturePointObjectProjectDestination(initiatingIdentity, { label: locale === "ru" ? "Поиск объектов" : "Find places" }) : null;
    findRequestIdRef.current = requestId;
    findRequestRef.current = controller;
    const timeoutSignal = AbortSignal.timeout(POINT_OBJECT_SOURCE_BROWSER_TIMEOUT_MS);
    let sourceResponseFinished = false;
    const onDeadline = () => {
      if (sourceResponseFinished || !pointObjectSourceResponseIsCurrent(requestId, findRequestIdRef.current, controller.signal)) return;
      setFindFailure("timeout");
      setFindStatus("error");
      controller.abort(timeoutSignal.reason);
    };
    timeoutSignal.addEventListener("abort", onDeadline, { once: true });
    setFindStatus("loading");
    try {
      const mappedMinimumLevels = findMinimumLevels.trim() ? Number(findMinimumLevels) : null;
      const mappedMaximumLevels = findMaximumLevels.trim() ? Number(findMaximumLevels) : null;
      const response = await fetch("/api/prototype/point-to-object/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ marketKey: locationKey, locale, bounds: requestBounds, group: findGroup, mappedMinimumLevels, mappedMaximumLevels, limit: 12 })
      });
      const payload: unknown = await response.json();
      sourceResponseFinished = true;
      if (!pointObjectSourceResponseIsCurrent(requestId, findRequestIdRef.current, controller.signal)) return;
      if (response.ok && isPointObjectFindResult(payload)) {
        findFootprintRequestRef.current?.controller.abort();
        findFootprintRequestRef.current = null;
        setFindResolvedObjects({});
        setFindResult(payload);
        setFindExplicitSearchBounds(null);
        setActiveFindResultId(null);
        setHoveredFindResultId(null);
        setFindResultIntent(requestIntent);
        setFindShortlist([]);
        setFindComparisonOpen(false);
        setFindComparisonDashboardOpen(false);
        setFindAnalysisTargetSourceFeatureId(null);
        setFindStatus("idle");
        if (initiatingIdentity && destination && projectIdentityRef.current === initiatingIdentity) {
          await saveFindArtifact(payload, [], false, requestIntent, initiatingIdentity, destination, cohortGeneration);
        }
      } else if (response.status === 400) {
        setFindStatus("zoom");
      } else if (response.status === 429) {
        const seconds = sourceRetryAfterSeconds(response.headers.get("retry-after"));
        findCooldownRef.current = Date.now() + seconds * 1_000;
        setFindRetrySeconds(seconds);
        setFindFailure(pointObjectSourceFailure(response.status, payload));
        setFindStatus("rate");
      } else {
        setFindFailure(pointObjectSourceFailure(response.status, payload));
        setFindStatus("error");
      }
    } catch (error) {
      if (requestId === findRequestIdRef.current && (timeoutSignal.aborted || !controller.signal.aborted)) {
        setFindFailure(timeoutSignal.aborted || (error instanceof Error && error.name === "TimeoutError") ? "timeout" : "unavailable");
        setFindStatus("error");
      }
    } finally {
      timeoutSignal.removeEventListener("abort", onDeadline);
      if (findRequestRef.current === controller) findRequestRef.current = null;
    }
  }

  async function hydrateFindFootprint(candidate: PointObjectFindCandidate): Promise<void> {
    if (findCandidateResultKind(candidate) !== "mapped_building_or_landuse" ||
        !/^(?:way|relation)\/[1-9]\d{0,19}$/.test(candidate.sourceFeatureId)) return;
    const requestKey = findCandidateContextRequestKey(candidate, locationKey, locale);
    const applyFootprint = (resolvedObject: NonNullable<ReturnType<typeof parseLiveResolvedObject>>) => {
      if (resolvedObject.sourceFeatureId !== candidate.sourceFeatureId ||
          resolvedObject.coordinateAssociation !== "trusted_open_map_identity" ||
          resolvedObject.geometryProvenance !== "confirmed_complete_footprint" ||
          !resolvedObject.displayGeometry ||
          !findResultRef.current?.candidates.some((current) => current.sourceFeatureId === candidate.sourceFeatureId)) return;
      setFindResolvedObjects((current) => ({ ...current, [candidate.sourceFeatureId]: resolvedObject }));
    };
    const cached = contextCacheRef.current.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
      applyFootprint(cached.value);
      return;
    }
    if (findFootprintRequestRef.current?.sourceFeatureId === candidate.sourceFeatureId) return;
    findFootprintRequestRef.current?.controller.abort();
    const controller = new AbortController();
    findFootprintRequestRef.current = { sourceFeatureId: candidate.sourceFeatureId, controller };
    try {
      const response = await fetch("/api/prototype/point-to-object/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestKey,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)])
      });
      const payload: unknown = await response.json();
      if (controller.signal.aborted || !response.ok || !payload || typeof payload !== "object" || !("mode" in payload) || payload.mode !== "resolved" || !("subject" in payload)) return;
      const resolvedObject = parseLiveResolvedObject(payload.subject);
      if (!resolvedObject || resolvedObject.sourceFeatureId !== candidate.sourceFeatureId || resolvedObject.coordinateAssociation !== "trusted_open_map_identity") return;
      if (contextCacheRef.current.size >= 24) contextCacheRef.current.delete(contextCacheRef.current.keys().next().value!);
      contextCacheRef.current.set(requestKey, { value: resolvedObject, expiresAt: Date.now() + 5 * 60_000 });
      applyFootprint(resolvedObject);
    } catch (error) {
      if (!controller.signal.aborted && !(error instanceof DOMException && error.name === "AbortError")) {
        // Geometry is optional. Keep the exact source marker rather than
        // inventing a polygon when the bounded source lookup fails.
      }
    } finally {
      if (findFootprintRequestRef.current?.controller === controller) findFootprintRequestRef.current = null;
    }
  }

  function chooseFindCandidate(candidate: PointObjectFindResult["candidates"][number]) {
    if (findResultMarketMismatch) return;
    if (findResultIsStale) return;
    const expectedSourceFeatureId = exactOsmFeatureId(candidate.sourceFeatureId);
    if (!expectedSourceFeatureId) {
      setFindStatus("error");
      return;
    }
    setMode("analyse");
    setFindComparisonDashboardOpen(false);
    setActiveFindResultId(candidate.sourceFeatureId);
    setFindAnalysisTargetSourceFeatureId(expectedSourceFeatureId);
    updateFindSavedView(findShortlist, findComparisonOpen, expectedSourceFeatureId);
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

  function focusFindResult(value: string) {
    if (findResultIsStale) return;
    const sourceFeatureId = exactOsmFeatureId(value);
    const candidate = sourceFeatureId ? findResult?.candidates.find((candidate) => candidate.sourceFeatureId === sourceFeatureId) : null;
    if (!sourceFeatureId || !candidate) return;
    setActiveFindResultId(sourceFeatureId);
    void hydrateFindFootprint(candidate);
    window.requestAnimationFrame(() => {
      document.getElementById(`find-result-${sourceFeatureId}`)?.focus({ preventScroll: false });
    });
  }

  function changeMode(nextMode: ProductMode) {
    clearPointObjectProjectRestore();
    exitProjectOverview();
    // Enter the Find transition as unavailable before the sheet resize and
    // 2D camera request can emit MapLibre's later `movestart`. Otherwise a
    // pointerdown can land on an enabled CTA just before its click is ignored.
    if (nextMode === "find") setMapMoving(true);
    setMode(nextMode);
    setFindComparisonDashboardOpen(false);
    setCreateResultDashboardOpen(false);
    if (nextMode === "find") {
      setViewModeRequest({ requestId: `find-2d:${Date.now()}`, mode: "2d" });
    }
    if (nextMode !== "create") {
      setIsDrawing(false);
    }
    setSheet("full");
  }

  function addCreateVertex(coordinate: Coordinate) {
    if (!isDrawing || draftCoordinates.length >= 25) return;
    setDraftCoordinates((current) => current.length >= 25 ? current : [...current, coordinate]);
    setCreateError(null);
  }

  function closeCreateArea(vertices = draftCoordinates, fitUploadedArea = false) {
    clearPointObjectProjectRestore();
    const validation = validatePointObjectCreateAoiVertices(vertices);
    if (validation.ok === false) {
      if (validation.code === "too_small") setCreateError(t("create.tooSmall"));
      else if (validation.code === "too_large") setCreateError(t("create.tooLarge"));
      else if (validation.code === "invalid_geometry") setCreateError(t("create.invalid"));
      else setCreateError(t("create.uploadError"));
      return;
    }
    clearPointObjectCreateSession();
    createGenerationIdentityRef.current = undefined;
    createSessionOwnerRef.current = undefined;
    const ring = closePolygonRing(vertices);
    restoreRemovedCreateRef.current = null;
    setCanRestoreRemovedCreate(false);
    const aoiId = `create-aoi-${Date.now()}`;
    setCreateAoi({
      id: aoiId,
      coordinates: [ring],
      areaSqM: validation.measurements.areaSqM,
      perimeterM: validation.measurements.perimeterM,
      vertexCount: vertices.length
    });
    setCreateAoiFitRequest(fitUploadedArea ? {
      requestId: `uploaded:${aoiId}`,
      bounds: createAoiBounds(vertices)
    } : null);
    setCreateEditorSnapshot(null);
    createSaveContextRef.current = null;
    setCreateSavedArtifactId(null);
    setDraftCoordinates(vertices);
    setIsDrawing(false);
    setGeneratedConcept(null);
    setGeneratedConceptLocale(null);
    setActiveCreateAlternativeId("A");
    setCreateResultDashboardOpen(false);
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setCreateReplacementRevision(0);
    setCreateError(null);
    setSheet("full");
  }

  async function uploadCreateArea(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setCreateError(t("create.uploadError"));
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const vertices = extractSinglePolygon(parsed);
      if (!vertices) throw new Error("invalid");
      setDraftCoordinates(vertices);
      closeCreateArea(vertices, true);
    } catch {
      setCreateError(t("create.uploadError"));
    }
  }

  function resetCreate() {
    if (createAoi) {
      restoreRemovedCreateRef.current = () => {
        createSessionOwnerRef.current = projectIdentityRef.current;
        suppressRestoredAreaContextRequestRef.current = true;
        setCreateAoi(createAoi);
        setDraftCoordinates(createAoi.coordinates[0].slice(0, -1));
        setCreateEditorSnapshot(createEditorSnapshot);
        setGeneratedConcept(generatedConcept);
        setGeneratedConceptLocale(generatedConceptLocale);
        setActiveCreateAlternativeId(activeCreateAlternativeId);
        setCreateResultDashboardOpen(false);
        setCreateAreaCleared(createAreaCleared);
        setAreaContext(areaContext);
        setCreateSavedArtifactId(createSavedArtifactId);
        setCreateReplacementRevision((revision) => revision + 1);
        setSheet("full");
        persistGuestCreateSession({
          aoi: createAoi,
          editorSnapshot: createEditorSnapshot,
          generated: generatedConcept,
          generatedLocale: generatedConceptLocale,
          activeAlternativeId: activeCreateAlternativeId,
          dashboardOpen: false,
          areaContext
        });
      };
      setCanRestoreRemovedCreate(true);
    }
    clearPointObjectProjectRestore();
    clearPointObjectCreateSession();
    createSaveContextRef.current = null;
    createGenerationIdentityRef.current = undefined;
    createSessionOwnerRef.current = undefined;
    setCreateSavedArtifactId(null);
    setIsDrawing(false);
    setDraftCoordinates([]);
    setCreateAoi(null);
    setCreateAoiFitRequest(null);
    setCreateEditorSnapshot(null);
    setGeneratedConcept(null);
    setGeneratedConceptLocale(null);
    setActiveCreateAlternativeId("A");
    setCreateResultDashboardOpen(false);
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setCreateReplacementRevision(0);
    setAreaContext(null);
    setAreaContextStatus("idle");
    setAreaContextRetryAfterSeconds(0);
    setCreateError(null);
  }

  function cancelCreateDrawing() {
    setIsDrawing(false);
    setDraftCoordinates(createAoi?.coordinates[0]?.slice(0, -1) ?? []);
    setCreateError(null);
    if (createAoi) setSheet("full");
  }

  function toggleCreateMapPresentation() {
    setCreateReplacementStatus("idle");
    if (createAreaCleared) {
      setCreateAreaCleared(false);
      return;
    }
    setCreateAreaCleared(true);
    setCreateReplacementRevision((revision) => revision + 1);
  }

  function changeCreateAlternative(id: "A" | "B") {
    setActiveCreateAlternativeId(id);
    setCreateReplacementStatus("idle");
    setCreateAreaCleared(true);
    setCreateReplacementRevision((revision) => revision + 1);
    const identityKey = projectIdentityRef.current;
    if (identityKey && createSavedArtifactId) queueCreateViewUpdate(identityKey, createSavedArtifactId, id);
    else persistGuestCreateSession({ activeAlternativeId: id });
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

  const resolvedObjectIsNearest = selection?.resolvedObject?.coordinateAssociation === "reverse_nearest_indexed_object_not_point_in_polygon";
  const selectionTitle = (!resolvedObjectIsNearest ? selection?.resolvedObject?.name : null) ?? selection?.object.name ?? (selection?.object.featureClass.toLowerCase().includes("building")
    ? t("selection.building")
    : selection?.object.geometry ? t("selection.object", { kind: humanize(selection.object.featureClass) }) : t("selection.location"));
  const selectionContextLabel = !selection?.resolvedObject
    ? t("selection.selected")
    : selection.resolvedObject.coordinateAssociation === "open_map_geometry_contains_point"
      ? t("selection.relation.containing")
      : selection.resolvedObject.coordinateAssociation === "trusted_open_map_identity"
        ? t("selection.relation.exact")
        : t("selection.relation.nearest", { distance: Math.round(selection.resolvedObject.resultCentroidDistanceM) });
  const selectedAttributes = visibleSelectionAttributes(selection?.resolvedObject?.tags ?? {});
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
  const findHasInvalidLevels = (findMinimumLevels !== "" && (Number(findMinimumLevels) < 1 || Number(findMinimumLevels) > 100)) ||
    (findMaximumLevels !== "" && (Number(findMaximumLevels) < 1 || Number(findMaximumLevels) > 100)) ||
    (findMinimumLevels !== "" && findMaximumLevels !== "" && Number(findMinimumLevels) > Number(findMaximumLevels));
  const findCtaDisabled = !isSessionResolved || !findSessionReady || !visibleBounds || mapMoving || findStatus === "loading" || findRetrySeconds > 0 || findCapability.status === "unsupported" || findHasInvalidLevels;
  const findFooterStatus = findStatus === "loading"
    ? (locale === "ru" ? "Ищем объекты в текущей видимой области…" : "Searching the current visible area…")
    : findStatus === "zoom"
      ? (locale === "ru" ? "Приблизьте карту: текущая область слишком велика." : "Zoom in: the current area is too large.")
      : findStatus === "rate"
        ? sourceFailureMessage(findFailure, findRetrySeconds, locale)
        : findStatus === "error"
          ? `${sourceFailureMessage(findFailure, 0, locale)} ${locale === "ru" ? "Критерии сохранены." : "Your criteria are preserved."}`
          : findCapability.status === "unsupported"
            ? (locale === "ru" ? "Для этого сценария нужны официальные земельные и градостроительные данные." : "This scenario requires authoritative land and planning data.")
            : findHasInvalidLevels
              ? (locale === "ru" ? "Укажите диапазон этажности от 1 до 100; минимум не должен превышать максимум." : "Enter mapped levels from 1 to 100; minimum cannot exceed maximum.")
              : findResultIsStale
                ? (locale === "ru" ? "Критерии или явно выбранная область изменились — обновите результаты." : "Criteria or the explicitly selected search area changed — update the results.")
                : !isSessionResolved || !findSessionReady
                  ? (locale === "ru" ? "Подготавливаем сохранённые параметры поиска…" : "Preparing saved search settings…")
                  : !visibleBounds
                  ? (locale === "ru" ? "Дождитесь загрузки области карты." : "Waiting for the visible map area.")
                  : "";
  const findPrimaryNeedsSearch = findResult === null || findResultIsStale || (!findComparisonOpen && findShortlist.length < 2);
  const findPrimaryDisabled = findPrimaryNeedsSearch ? findCtaDisabled : false;
  const findPrimaryLabel = findStatus === "loading"
    ? (locale === "ru" ? "Ищем…" : "Searching…")
    : findResultIsStale
      ? (locale === "ru" ? "Обновить поиск" : "Update search")
      : findComparisonOpen
        ? (locale === "ru" ? "Открыть полное сравнение" : "Open full comparison dashboard")
        : findShortlist.length >= 2
          ? (locale === "ru" ? "Сравнить выбранные" : "Compare selected")
          : (locale === "ru" ? "Искать" : "Search");

  function runFindPrimaryAction() {
    if (!findResult || findResultIsStale || findShortlist.length < 2) {
      void findInView();
      return;
    }
    if (findComparisonOpen) {
      setFindComparisonDashboard(true);
      return;
    }
    setFindComparison(true);
  }

  return (
    <main ref={workspaceRef} className={`${mobileStyles.workspace} overflow-hidden bg-white text-ink`}>
      <PointObjectHeader />
      <div className={mobileStyles.shell} data-sheet={effectiveSheet} data-testid="mobile-workspace-shell">
        <section className={`${mobileStyles.map} relative overflow-hidden`} inert={mobile && effectiveSheet === "full"} aria-hidden={mobile && effectiveSheet === "full" ? true : undefined} aria-label={t("map.region")}>
          {sessionReady ? <LiveObjectMap {...createReplacementMapProps} locationKey={locationKey} interactionMode={mode} selection={mode === "analyse" ? selection : null} navigationTarget={navigationTarget} viewModeRequest={viewModeRequest} onSelection={mode === "analyse" ? handleSelection : ignoreMapSelection} onViewportChange={handleViewportChange} onVisibleBoundsChange={handleVisibleBoundsChange} projectMarkers={projectOverviewMarkers.map((marker, index) => ({ id: marker.artifactId, label: marker.label, longitude: marker.longitude, latitude: marker.latitude, kind: marker.kind, number: index + 1 }))} activeProjectMarkerId={activeProjectMarkerId} onProjectMarkerSelect={openProjectOverviewMarker} findResults={mode === "find" && findResult && !findResultCriteriaMismatch ? findResult.candidates.map((candidate, index) => { const resolved = findResolvedObjects[candidate.sourceFeatureId]; return { id: candidate.sourceFeatureId, longitude: candidate.longitude, latitude: candidate.latitude, label: candidate.label, number: index + 1, geometry: resolved?.displayGeometry ?? null, geometryProvenance: resolved?.geometryProvenance ?? null, renderHeightM: resolved?.renderHeightM ?? null, renderMinHeightM: resolved?.renderMinHeightM ?? null, resultKind: findCandidateResultKind(candidate) }; }) : []} activeFindResultId={mode === "find" ? activeFindResultId : null} hoveredFindResultId={mode === "find" ? hoveredFindResultId : null} shortlistedFindResultIds={mode === "find" ? findShortlist.map((candidate) => candidate.sourceFeatureId) : []} onFindResultSelect={focusFindResult} onFindResultHover={(value) => setHoveredFindResultId(value ? exactOsmFeatureId(value) : null)} createDrawing={mode === "create" && isDrawing} createDraftCoordinates={mode === "create" ? draftCoordinates : []} createAoi={mode === "create" ? createAoi : null} createAoiFitRequest={mode === "create" ? createAoiFitRequest : null} createAreaCleared={mode === "create" && createAreaCleared} conceptMassing={mode === "create" ? activeConceptMassing : null} onCreateVertex={addCreateVertex} onCreateFinishDrawing={() => closeCreateArea()} onReplacementStatus={setCreateReplacementStatus} className="h-full min-h-0" /> : <div className="grid h-full min-h-0 place-items-center bg-[#f4f6f7] text-sm font-medium text-[#52606a]" role="status">{t("map.loading")}</div>}
          <div className="absolute left-3 top-3 z-10 flex w-[min(650px,calc(100%-4.5rem))] flex-row gap-2 sm:left-5 sm:top-5">
            <label className="flex h-11 w-fit shrink-0 items-center rounded-xl border border-white/70 bg-white/95 px-3 shadow-[0_10px_30px_rgba(20,35,45,0.14)] backdrop-blur">
              <span className="sr-only">{t("city.label")}</span>
              <ReliableSelect value={locationKey} onChange={(event) => changeMarket(event.target.value as LiveMapLocationKey)} aria-label={t("city.label")} data-testid="point-object-city-select" wrapperClassName="w-[70px] sm:w-auto sm:max-w-[190px]" className="min-h-11 max-w-[190px] bg-transparent pl-0 text-base sm:text-sm font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
                {POINT_OBJECT_MARKETS.map((market) => <option key={market.key} value={market.key}>{market.label[locale]}</option>)}
              </ReliableSelect>
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

        {mode === "create" && isDrawing ? <div className={mobileStyles.drawTools} data-testid="create-map-drawing-tools" data-editing={Boolean(createAoi)}>
          <p className="text-xs font-semibold" aria-live="polite">{t("create.drawing", { count: draftCoordinates.length })}</p>
          <div className="grid grid-cols-3 gap-2"><button disabled={draftCoordinates.length < 3} onClick={() => closeCreateArea()} className="rounded-lg bg-[#087f70] text-xs font-bold text-white disabled:opacity-40">{locale === "ru" ? "Завершить зону" : "Finish area"}</button><button disabled={!draftCoordinates.length} onClick={() => setDraftCoordinates((current) => current.slice(0, -1))}>{t("create.undo")}</button><button onClick={cancelCreateDrawing}>{t("create.cancel")}</button></div>
          {createError ? <p role="alert" className="text-xs text-[#79520d]">{createError}</p> : null}
        </div> : null}
        <aside id="workspace-task" className={`${mobileStyles.sheet} min-h-0 min-w-0 overflow-hidden border-l border-line bg-white`} aria-label={locale === "ru" ? "Задача" : "Task"} onKeyDown={(event) => { if (event.key === "Escape" && !event.defaultPrevented && sheet === "full") { event.stopPropagation(); showMap(); } }}>
          <div className={mobileStyles.drawer}>
            {mobile ? <div className={mobileStyles.controls}>
              <span className={mobileStyles.summary}>{mode === "analyse" ? selectionTitle : t(`mode.${mode}` as "mode.find" | "mode.create")}</span>
              <button ref={mapToggleRef} type="button" aria-controls="workspace-task-content" aria-expanded={sheet !== "peek"} onClick={() => sheet === "peek" ? setSheet("full") : showMap()}>{sheet === "peek" ? (locale === "ru" ? "Открыть задачу" : "Open task") : (locale === "ru" ? "На карту" : "Show map")}</button>
              <button type="button" className={mobileStyles.halfControl} data-testid="mobile-sheet-resize" aria-label={effectiveSheet === "half" ? (locale === "ru" ? "Развернуть задачу на весь экран" : "Expand task to full height") : effectiveSheet === "full" ? (locale === "ru" ? "Уменьшить задачу до половины экрана" : "Reduce task to half height") : (locale === "ru" ? "Открыть задачу на половину экрана" : "Open task at half height")} title={effectiveSheet === "half" ? (locale === "ru" ? "Развернуть" : "Expand") : (locale === "ru" ? "Разделить экран" : "Split view")} onClick={() => setSheet(sheet === "half" ? "full" : "half")}><PointObjectIcon name={effectiveSheet === "half" ? "expand" : "split"} className="h-5 w-5" /><span className="sr-only">{effectiveSheet === "half" ? (locale === "ru" ? "Развернуть" : "Expand") : (locale === "ru" ? "Разделить экран" : "Split view")}</span></button>
            </div> : null}
            <div className="mb-2 grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-[#f2f5f4] p-1" role="tablist" aria-label={t("mode.label")}>
              {(["analyse", "find", "create"] as ProductMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => changeMode(item)} className={`min-h-11 rounded-lg px-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${mode === item ? "bg-white text-[#087f8c] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>{t(`mode.${item}` as "mode.analyse" | "mode.find" | "mode.create")}</button>)}
            </div>
            <div id="workspace-task-content" className={mobileStyles.content} onFocusCapture={(event) => { if (mobile && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) setSheet("full"); }}>
            <div className="min-w-0">
                {mode === "find" ? null : <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{mode === "create" ? t("mode.create") : t("panel.eyebrow")}</p>}
                <h1 className={`${mode === "find" ? "text-[22px] sm:text-2xl" : "mt-2 text-2xl sm:text-[28px]"} font-bold tracking-[-0.035em]`}>{mode === "create" ? t("create.title") : mode === "find" ? t("find.title") : t("panel.title")}</h1>
                {mode === "find" ? null : <p className="mt-2 text-sm leading-5 text-muted">{mode === "create" ? t("create.body") : t("panel.description")}</p>}
            </div>

            {mode === "analyse" ? <div className="flex min-h-0 flex-1 flex-col"><section className="mt-4 shrink-0 overflow-hidden rounded-[18px] border border-line bg-[#f8fafc] p-4" data-testid="selection-card">
              {selection ? <><p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#667085]">{t("selection.selected")}</p><h2 className="mt-2 line-clamp-2 break-words text-lg font-bold tracking-[-0.02em]" data-testid="selected-object">{selectionTitle}</h2><p className="mt-1 text-sm text-muted">{humanize(selection.resolvedObject?.featureClass ?? selection.object.featureClass)}</p>
                {selection.resolvedObject ? <p className="mt-1 text-xs font-semibold text-[#087f8c]">{selectionContextLabel}</p> : null}
                {resolvedObjectIsNearest && selection.resolvedObject?.name ? <p className="mt-1 text-xs text-[#475467]">{locale === "ru" ? "Ближайший объект на карте" : "Nearest mapped object"}: {selection.resolvedObject.name}</p> : null}
                {selection.resolvedObject?.address ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#475467]">{selection.resolvedObject.address}</p> : null}
                {contextStatus === "loading" ? <p className="mt-3 text-xs font-semibold text-[#087f8c]" role="status">{t("selection.resolving")}</p> : null}
                {contextStatus === "error" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e7c47e] bg-[#fffaf0] px-3 py-2 text-xs text-[#6b4b16]" role="alert"><span>{sourceFailureMessage(contextFailure, contextRetrySeconds, locale)}</span><button type="button" disabled={contextRetrySeconds > 0} onClick={() => { if (contextCooldownRef.current > Date.now()) return; setContextStatus("loading"); setContextRetryVersion((value) => value + 1); }} className="min-h-9 shrink-0 rounded-lg border border-[#d6b36e] bg-white px-3 font-bold text-ink disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{t("selection.retry")}</button></div> : null}
                {selectedAttributes.length ? <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3" aria-label={t("selection.attributes")}>{selectedAttributes.map(([key, value]) => <span key={key} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#475467] ring-1 ring-inset ring-[#d7dee4]">{selectionAttributeLabel(key, locale)} · {humanize(value)}</span>)}</div> : null}</> : <div className="py-3"><p className="text-sm font-bold">{t("selection.empty.title")}</p><p className="mt-2 text-sm leading-6 text-muted">{t("selection.empty.body")}</p></div>}
            </section>

            <div className="mt-auto shrink-0 pt-3" data-testid="analyse-composer"><label className="text-xs font-bold text-ink" htmlFor="point-object-question">{t("question.label")}</label><textarea id="point-object-question" value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 500))} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); startAnalysis(); } }} placeholder={t("question.placeholder")} className="mt-1.5 h-[120px] w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-sm leading-5 outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2] lg:h-[132px] lg:min-h-[120px] lg:max-h-[200px] lg:resize-y" /><div className="sticky bottom-0 bg-white pt-2"><button type="button" onClick={startAnalysis} disabled={!selection?.resolvedObject} className="min-h-11 w-full rounded-control bg-[#087f8c] px-4 text-sm font-bold text-white transition hover:bg-[#006c78] disabled:cursor-not-allowed disabled:bg-[#b7c4c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">{selection && !selection.resolvedObject && contextStatus === "loading" ? t("analyze.resolving") : t("analyze.action")}</button></div></div>
            </div> : null}

            {mode === "find" ? <section className="mt-2 flex min-h-0 flex-1 flex-col" data-testid="find-drawer">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-testid="find-scroll-region">
              <div className="mt-3 grid gap-2" data-testid="find-context-controls">
                <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Роль" : "Role"}<ReliableSelect value={findRole} onChange={(event) => changeFindRole(event.target.value as ExploreRole)} data-testid="point-object-find-role-select" wrapperClassName="mt-1" className="min-h-11 rounded-lg border border-line bg-white pl-3 text-sm outline-none focus:border-[#087f8c] focus-visible:ring-2 focus-visible:ring-[#bfe4e2]">{findRoles.map((role) => <option key={role.id} value={role.id}>{locale === "ru" ? FIND_ROLE_LABELS_RU[role.id] : role.label}</option>)}</ReliableSelect></label>
                <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Сценарий" : "Scenario"}<ReliableSelect value={findScenario} onChange={(event) => changeFindScenario(event.target.value as ExploreScenarioId)} data-testid="point-object-find-scenario-select" wrapperClassName="mt-1" className="min-h-11 rounded-lg border border-line bg-white pl-3 text-sm outline-none focus:border-[#087f8c] focus-visible:ring-2 focus-visible:ring-[#bfe4e2]">{findScenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{FIND_SCENARIO_LABELS[locale][scenario.id]}</option>)}</ReliableSelect></label>
                <fieldset className="grid gap-2 rounded-xl border border-line bg-[#fbfcfd] p-3 sm:grid-cols-2 lg:grid-cols-1">
                  <legend className="px-1 text-xs font-bold text-[#475467]">{locale === "ru" ? "Параметры поиска" : "Search settings"}</legend>
                  <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Тип объекта" : "Object type"}<ReliableSelect value={findGroup} onChange={(event) => { setFindGroup(event.target.value as PointObjectFindGroup); markFindOutcomeStale(); }} data-testid="point-object-find-group-select" wrapperClassName="mt-1" className="min-h-11 rounded-lg border border-line bg-white pl-3 text-sm outline-none focus:border-[#087f8c] focus-visible:ring-2 focus-visible:ring-[#bfe4e2]">{findCapability.allowedGroups.map((group) => <option key={group} value={group}>{findGroupLabels[group]}</option>)}</ReliableSelect></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Этажей от" : "Levels from"}<input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={findMinimumLevels} onChange={(event) => { const value = acceptedMappedLevelsInput(event.target.value); if (value !== null) { setFindMinimumLevels(value); markFindOutcomeStale(); } }} placeholder="1" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-[#087f8c]" /></label>
                    <label className="text-xs font-bold text-[#344054]">{locale === "ru" ? "Этажей до" : "Levels to"}<input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={findMaximumLevels} onChange={(event) => { const value = acceptedMappedLevelsInput(event.target.value); if (value !== null) { setFindMaximumLevels(value); markFindOutcomeStale(); } }} placeholder="100" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-[#087f8c]" /></label>
                  </div>
                </fieldset>
              </div>
              {findResult ? <div className="mt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted"><span>{findResult.mode === "empty" ? (locale === "ru" ? "По этим условиям ничего не найдено." : "No matches for these filters.") : (locale === "ru" ? `Показано: ${findResult.candidates.length}` : `Showing ${findResult.candidates.length}`)}</span><span className="flex flex-wrap items-center justify-end gap-2">{findResultIsStale ? <span className="rounded-full bg-[#e8edef] px-2 py-0.5 font-bold uppercase tracking-[0.06em] text-[#52606a]" data-testid="find-result-stale">{locale === "ru" ? "Устарела" : "Stale"}</span> : null}{findCanUseCurrentMapArea && !findSearchAreaChanged ? <button type="button" data-testid="find-use-current-map-area" onClick={() => { if (visibleBounds) setFindExplicitSearchBounds(visibleBounds); }} className="min-h-11 rounded-lg border border-[#8ebdb4] bg-white px-2.5 font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{locale === "ru" ? "Искать в текущей области" : "Use current map area"}</button> : null}{findResult.coverage.capReached ? <span className="font-semibold text-[#79520d]">{locale === "ru" ? "Увеличьте масштаб, чтобы сузить результаты." : "Zoom in to narrow results."}</span> : null}<button type="button" data-testid="find-reset-results" onClick={resetFindResults} className="min-h-11 rounded-lg px-2.5 font-bold text-[#52606a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{locale === "ru" ? "Сбросить результаты" : "Reset results"}</button></span></div>
                {findShortlist.length > 0 ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#e6f5f1] px-3 py-2" data-testid="find-comparison-toolbar">
                  <span className="text-xs font-bold text-[#176548]">{locale === "ru" ? `Выбрано: ${findShortlist.length}` : `Selected: ${findShortlist.length}`}</span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {findComparisonOpen ? <button type="button" disabled={findResultIsStale} onClick={() => setFindComparison(false)} className="min-h-11 rounded-lg border border-[#8ebdb4] bg-white px-3 text-[11px] font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] disabled:cursor-not-allowed disabled:opacity-40">{locale === "ru" ? "К результатам" : "Back to results"}</button> : null}
                    <button type="button" onClick={clearFindShortlist} className="min-h-11 rounded-lg px-3 text-[11px] font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{locale === "ru" ? "Очистить" : "Clear"}</button>
                  </div>
                </div> : null}
                {findComparisonOpen && findShortlist.length >= 2 ? <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-2" role="region" aria-label={locale === "ru" ? "Сравнение объектов" : "Object comparison"} tabIndex={0}>
                  <div className="grid grid-flow-col auto-cols-[minmax(188px,1fr)] gap-2" data-testid="find-comparison-grid">
                    {findShortlist.map((candidate) => {
                      const subtype = readableFindSubtype(candidate.matchedTag.value, candidate.group, locale);
                      const observedAttribute = comparisonObservedAttribute(candidate, locale);
                      return <article key={candidate.sourceFeatureId} className="flex min-w-0 flex-col rounded-xl border border-line bg-white p-3"><div className="flex items-start justify-between gap-1"><div className="min-w-0"><h3 className="break-words text-sm font-bold text-ink">{candidate.label}</h3><p className="mt-1 break-words text-[11px] text-muted">{findGroupLabels[candidate.group]}{subtype ? ` · ${subtype}` : ""}</p></div><button type="button" aria-label={`${locale === "ru" ? "Убрать из сравнения" : "Remove from comparison"}: ${candidate.label}`} disabled={findResultIsStale} onClick={() => toggleFindShortlist(candidate)} className="min-h-11 shrink-0 rounded-lg px-2 text-[11px] font-bold text-[#087f70] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] disabled:opacity-40">{locale === "ru" ? "Убрать" : "Remove"}</button></div><dl className="mt-3 grid grid-cols-[minmax(72px,auto)_minmax(0,1fr)] gap-x-2 gap-y-2 text-[10px]"><dt className="text-muted">{locale === "ru" ? "Тип" : "Type"}</dt><dd className="break-words font-semibold">{subtype ?? findGroupLabels[candidate.group]}</dd><dt className="text-muted">{locale === "ru" ? "Этажность" : "Levels"}</dt><dd className="font-semibold">{candidate.mappedBuildingLevels ?? (locale === "ru" ? "Не указана" : "Not mapped")}</dd>{observedAttribute ? <><dt className="text-muted">{observedAttribute.label}</dt><dd className="break-words font-semibold">{observedAttribute.value}</dd></> : null}</dl><button type="button" disabled={findResultIsStale} onClick={() => chooseFindCandidate(candidate)} className="mt-auto min-h-11 w-full rounded-lg border border-[#8ebdb4] bg-white px-3 text-xs font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] disabled:cursor-not-allowed disabled:opacity-40">{locale === "ru" ? "Открыть анализ" : "Open analysis"}</button></article>;
                    })}
                  </div>
                </div> : <ul className="space-y-2">{findResult.candidates.map((candidate) => {
                  const selectedForComparison = findShortlist.some((item) => item.sourceFeatureId === candidate.sourceFeatureId);
                  const subtype = readableFindSubtype(candidate.matchedTag.value, candidate.group, locale);
                  return <li key={candidate.sourceFeatureId} onMouseEnter={() => setHoveredFindResultId(candidate.sourceFeatureId)} onMouseLeave={() => setHoveredFindResultId(null)} className={`rounded-xl border bg-white p-3 ${activeFindResultId === candidate.sourceFeatureId ? "border-[#087f8c] ring-2 ring-[#bfe4e2]" : selectedForComparison ? "border-[#8ebdb4]" : "border-line"}`}>
                    <button id={`find-result-${candidate.sourceFeatureId}`} type="button" disabled={findResultIsStale} onFocus={() => setHoveredFindResultId(candidate.sourceFeatureId)} onBlur={() => setHoveredFindResultId(null)} onClick={() => focusFindResult(candidate.sourceFeatureId)} className="min-h-11 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] disabled:cursor-not-allowed disabled:opacity-40"><span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e6f5f1] px-1 text-[10px] font-bold text-[#176548]">{findResult.candidates.indexOf(candidate) + 1}</span><span className="text-sm font-bold text-ink">{candidate.label}</span><span className="mt-1 block text-[11px] text-muted">{findGroupLabels[candidate.group]}{subtype ? ` · ${subtype}` : ""}{candidate.mappedBuildingLevels === null ? "" : ` · ${candidate.mappedBuildingLevels} ${locale === "ru" ? "эт." : "levels"}`}</span></button>
                    <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={findResultIsStale} onClick={() => chooseFindCandidate(candidate)} className="min-h-11 rounded-lg border border-[#8ebdb4] bg-white px-3 text-[11px] font-bold text-[#176548] disabled:opacity-40">{locale === "ru" ? "Открыть анализ" : "Open analysis"}</button><button type="button" aria-pressed={selectedForComparison} disabled={findResultIsStale || (!selectedForComparison && findShortlist.length >= 3)} onClick={() => toggleFindShortlist(candidate)} className={`min-h-11 rounded-lg px-3 text-[11px] font-bold transition disabled:opacity-40 ${selectedForComparison ? "bg-[#087f70] text-white" : "border border-[#8ebdb4] bg-white text-[#176548]"}`}>{selectedForComparison ? (locale === "ru" ? "Выбрано" : "Selected") : (locale === "ru" ? "В сравнение" : "Compare")}</button></div>
                  </li>;
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
                  onClick={runFindPrimaryAction}
                  disabled={findPrimaryDisabled}
                  className="min-h-11 w-full rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white transition hover:bg-[#006c78] disabled:cursor-not-allowed disabled:bg-[#b7c4c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2"
                  data-testid="find-search-cta"
                >{findPrimaryLabel}</button>
              </footer>
            </section> : null}

            <div hidden={mode !== "create"} className="mt-5 space-y-4">
              {!createAoi ? <section className="rounded-[18px] border border-[#cfe0da] bg-[#f4faf7] p-4">
                {canRestoreRemovedCreate ? <button type="button" data-testid="create-undo-remove" onClick={() => { restoreRemovedCreateRef.current?.(); restoreRemovedCreateRef.current = null; setCanRestoreRemovedCreate(false); }} className="mb-3 min-h-11 w-full rounded-xl border border-[#9bbdb5] bg-white px-3 text-xs font-bold text-[#345c54]">{locale === "ru" ? "Вернуть удалённую зону" : "Undo area removal"}</button> : null}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setIsDrawing(true); setSheet("peek"); setCreateError(null); }} className="min-h-11 rounded-xl bg-[#087f70] px-3 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] focus-visible:ring-offset-2">{draftCoordinates.length ? (locale === "ru" ? "Редактировать контур" : "Edit drawing") : t("create.draw")}</button>
                  <label className="grid min-h-11 cursor-pointer place-items-center rounded-xl border border-[#9bbdb5] bg-white px-3 text-center text-xs font-bold text-[#345c54] focus-within:ring-2 focus-within:ring-[#087f70]"><span>{t("create.upload")}</span><input type="file" accept="application/geo+json,application/json,.geojson,.json" aria-label={t("create.upload")} onChange={(event) => void uploadCreateArea(event)} className="sr-only focus-visible:outline-none" /></label>
                </div>
                <button type="button" data-testid="create-use-selection" disabled={!selectedCreateVertices} onClick={() => { if (selectedCreateVertices) closeCreateArea(selectedCreateVertices, true); }} className="mt-2 min-h-11 w-full rounded-xl border border-[#9bbdb5] bg-white px-3 text-xs font-bold text-[#345c54] disabled:opacity-50">{locale === "ru" ? "Использовать выбранный объект" : "Use selected object"}</button>
                {!selectedCreateVertices ? <p className="mt-2 text-xs text-muted">{locale === "ru" ? "Выберите объект с поддерживаемой границей или нарисуйте зону." : "Select an object with a supported boundary, or draw an area."}</p> : null}
                <p className="mt-2 text-xs text-muted">GeoJSON · Polygon · WGS84 · ≤1 MB</p>
                {isDrawing ? <><p className="mt-3 text-xs font-semibold text-[#345c54]">{t("create.drawing", { count: draftCoordinates.length })}</p><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" disabled={draftCoordinates.length < 3} onClick={() => closeCreateArea()} className="min-h-11 rounded-lg bg-[#087f70] px-2 text-xs font-bold text-white disabled:opacity-40">{locale === "ru" ? "Завершить зону" : "Finish area"}</button><button type="button" disabled={!draftCoordinates.length} onClick={() => setDraftCoordinates((current) => current.slice(0, -1))} className="min-h-11 rounded-lg border border-[#b8cbc6] bg-white px-2 text-xs font-bold text-[#345c54] disabled:opacity-40">{t("create.undo")}</button><button type="button" onClick={cancelCreateDrawing} className="min-h-11 rounded-lg border border-[#b8cbc6] bg-white px-2 text-xs font-bold text-[#345c54]">{t("create.cancel")}</button></div></> : null}
                {createError ? <p className="mt-3 rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-3 py-2 text-xs text-[#79520d]" role="alert">{createError}</p> : null}
              </section> : <><p className="rounded-xl border border-[#cfe0da] bg-[#f4faf7] px-4 py-3 text-xs font-bold text-[#345c54]">{t("create.ready", { area: createAoi.areaSqM >= 10_000 ? `${(createAoi.areaSqM / 10_000).toFixed(2)} ${locale === "ru" ? "га" : "ha"}` : `${Math.round(createAoi.areaSqM).toLocaleString(locale)} ${locale === "ru" ? "м²" : "m²"}` })}</p>
                <section className="rounded-[18px] border border-line bg-[#f8fafc] p-4" aria-live="polite">
                  <div className="flex flex-col items-start gap-3">
                    <div className="w-full min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#087f70]">{locale === "ru" ? "КОНТЕКСТ ЗОНЫ" : "AREA CONTEXT"}</p>
                      <h2 data-testid="create-area-context-heading" className="mt-1 text-sm font-bold text-ink">{locale === "ru" ? "Сводка объектов внутри полигона" : "Objects inside the polygon"}</h2>
                    </div>
                    <button type="button" data-testid="create-map-presentation-toggle" onClick={toggleCreateMapPresentation} className="min-h-11 max-w-full rounded-lg border border-[#8ebdb4] bg-white px-3 text-left text-[11px] font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{createAreaCleared ? (locale === "ru" ? "Показать исходные" : "Show existing") : activeConceptMassing ? (locale === "ru" ? "Показать созданную концепцию" : "Show generated concept") : (locale === "ru" ? "Скрыть исходные здания" : "Hide existing buildings")}</button>
                  </div>
                  {areaContextStatus === "loading" ? <p className="mt-3 text-xs font-semibold text-[#087f70]" role="status">{locale === "ru" ? "Собираем объекты открытой карты…" : "Reading open-map objects…"}</p> : null}
                  {areaContextStatus === "rate" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]" role="alert"><span>{sourceFailureMessage(areaContextFailure, areaContextRetryAfterSeconds, locale)}</span><button type="button" disabled={areaContextRetryAfterSeconds > 0} onClick={() => setAreaContextRetryVersion((value) => value + 1)} className="min-h-11 shrink-0 rounded-lg border border-[#d6b36e] bg-white px-3 font-bold disabled:cursor-wait disabled:opacity-50">{t("selection.retry")}</button></div> : null}
                  {areaContextStatus === "error" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]" role="alert"><span>{areaContextFailure === "unavailable" ? (locale === "ru" ? "Контекст зоны временно недоступен." : "Area context is temporarily unavailable.") : sourceFailureMessage(areaContextFailure, 0, locale)}</span><button type="button" onClick={() => setAreaContextRetryVersion((value) => value + 1)} className="min-h-8 rounded-lg border border-[#d6b36e] bg-white px-2 font-bold">{t("selection.retry")}</button></div> : null}
                  {areaContext ? <><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Объекты на карте" : "Mapped objects"}</span><strong className="mt-1 block text-sm">{areaContext.summary.sampleSize}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Здания на карте" : "Mapped buildings"}</span><strong className="mt-1 block text-sm">{areaContext.summary.mappedBuildingCount}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Медиана этажей" : "Median levels"}</span><strong className="mt-1 block text-sm">{areaContext.summary.medianMappedLevels ?? "—"}</strong></div></div><div className="mt-3 flex flex-wrap gap-1.5">{areaContext.summary.groups.slice(0, 5).map((group) => <span key={group.group} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#475467] ring-1 ring-inset ring-[#d7dee4]">{areaGroupLabels[group.group]} · {group.count}</span>)}</div>{areaContext.coverage.capReached ? <p className="mt-3 text-[10px] font-semibold leading-4 text-[#79520d]">{locale === "ru" ? "Нарисуйте меньшую зону, чтобы сузить список объектов на карте." : "Draw a smaller area to narrow the mapped objects."}</p> : null}</> : null}
                </section>
                <PointObjectCreatePanel locale={locale} marketKey={locationKey} aoi={createAoi} depth="standard" generated={generatedConcept} generatedLocale={generatedConceptLocale} editorSnapshot={createEditorSnapshot} onEditorSnapshotChange={(snapshot) => { setCreateEditorSnapshot(snapshot); persistGuestCreateSession({ editorSnapshot: snapshot }); }} activeAlternativeId={activeCreateAlternativeId} onGenerationStart={() => { clearPointObjectProjectRestore(); setCreateSavedArtifactId(null); const identityKey = projectIdentityRef.current; createGenerationIdentityRef.current = identityKey; createSaveContextRef.current = identityKey ? { identityKey, destination: capturePointObjectProjectDestination(identityKey, { label: locale === "ru" ? "Созданная концепция" : "Generated concept" }), aoi: structuredClone(createAoi), editorSnapshot: structuredClone(createEditorSnapshot), locale, marketKey: locationKey, areaContext: structuredClone(areaContext) } : null; }} onGenerated={(concept, committedEditorSnapshot) => { if (createGenerationIdentityRef.current !== projectIdentityRef.current) return; createGenerationIdentityRef.current = undefined; createSessionOwnerRef.current = projectIdentityRef.current; const saveContext = createSaveContextRef.current; const committedSaveContext = saveContext ? { ...saveContext, editorSnapshot: structuredClone(committedEditorSnapshot) } : null; setCreateEditorSnapshot(committedEditorSnapshot); setGeneratedConcept(concept); setGeneratedConceptLocale(locale); setActiveCreateAlternativeId("A"); setCreateResultDashboardOpen(false); setCreateReplacementStatus("idle"); setCreateAreaCleared(true); setCreateReplacementRevision((revision) => revision + 1); persistGuestCreateSession({ aoi: createAoi, editorSnapshot: committedEditorSnapshot, generated: concept, generatedLocale: locale, activeAlternativeId: "A", dashboardOpen: false, areaContext }); void saveCreateArtifact(concept, "A", committedSaveContext); }} onAlternativeChange={changeCreateAlternative} onReset={() => { clearPointObjectProjectRestore(); clearPointObjectCreateSession(); createSaveContextRef.current = null; createGenerationIdentityRef.current = undefined; createSessionOwnerRef.current = undefined; setCreateSavedArtifactId(null); setGeneratedConcept(null); setGeneratedConceptLocale(null); setActiveCreateAlternativeId("A"); setCreateResultDashboardOpen(false); setCreateAreaCleared(false); setCreateReplacementStatus("idle"); setCreateReplacementRevision(0); }} />
                {generatedConcept ? <button type="button" data-testid="create-open-result-dashboard" onClick={() => { setCreateResultDashboardOpen(true); persistGuestCreateSession({ dashboardOpen: true }); }} className="min-h-11 w-full rounded-xl bg-[#087f8c] px-3 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">{locale === "ru" ? "Открыть результат" : "Open result"}</button> : null}
                {createAreaCleared && createReplacementStatus !== "applied" ? (
                  <p className={`rounded-xl border px-3 py-2 text-[10px] leading-4 ${createReplacementStatus === "error" ? "border-[#e6bd74] bg-[#fff9ed] text-[#79520d]" : "border-[#d8e2df] bg-[#f8faf9] text-[#62716d]"}`} role="status">
                    {createReplacementStatus === "zoom-required"
                      ? (locale === "ru" ? "Приблизьте карту, чтобы увидеть концепцию." : "Zoom in to view the concept.")
                      : createReplacementStatus === "partial"
                        ? (locale === "ru" ? "Здания, пересекающие зону, скрыты в текущих тайлах карты; полнота исходного набора не подтверждена." : "Buildings intersecting the area are hidden from the current map tiles; source inventory completeness is not confirmed.")
                      : createReplacementStatus === "error"
                        ? (locale === "ru" ? "Безопасное замещение не применилось: исходные здания восстановлены, новая модель скрыта." : "Safe replacement could not be applied: source buildings were restored and the concept is hidden.")
                        : (locale === "ru" ? "Подготавливаем замещение зданий…" : "Preparing building replacement…")}
                  </p>
                ) : null}
                <button type="button" data-testid="create-edit-area" onClick={() => { setDraftCoordinates(createAoi.coordinates[0].slice(0, -1)); setIsDrawing(true); setSheet("peek"); }} className="min-h-11 w-full rounded-xl border border-[#b8cbc6] bg-white px-3 text-xs font-bold text-[#345c54]">{locale === "ru" ? "Изменить границу" : "Edit boundary"}</button><button type="button" data-testid="create-delete-area" onClick={resetCreate} className="min-h-11 w-full rounded-xl border border-[#b8cbc6] bg-white px-3 text-xs font-bold text-[#345c54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{t("create.deleteArea")}</button></>}
            </div>
            </div>
          </div>
        </aside>
      </div>
      {mode === "find" && findResult && findComparisonDashboardOpen && findShortlist.length >= 2 ? <FindComparisonDashboard
        locale={locale}
        result={findResult}
        candidates={findShortlist}
        roleLabel={locale === "ru" ? FIND_ROLE_LABELS_RU[findRole] : findRoles.find((role) => role.id === findRole)?.label ?? findRole}
        scenarioLabel={FIND_SCENARIO_LABELS[locale][findScenario]}
        groupLabel={(candidate) => findGroupLabels[candidate.group]}
        onBackToComparison={() => setFindComparisonDashboard(false)}
        onBackToResults={() => setFindComparison(false)}
        onShowMap={() => { setFindComparisonDashboard(false); setSheet("peek"); }}
        onOpenAnalysis={chooseFindCandidate}
      /> : null}
      {mode === "create" && createAoi && generatedConcept && createResultDashboardOpen ? <CreateResultDashboard
        locale={locale}
        aoi={createAoi}
        generated={generatedConcept}
        generatedLocale={generatedConceptLocale}
        activeAlternativeId={activeCreateAlternativeId}
        onAlternativeChange={changeCreateAlternative}
        onBackToEditor={() => { setCreateResultDashboardOpen(false); persistGuestCreateSession({ dashboardOpen: false }); }}
        onShowMap={() => { setCreateResultDashboardOpen(false); setCreateAreaCleared(true); setCreateReplacementStatus("idle"); setCreateReplacementRevision((revision) => revision + 1); setSheet("peek"); persistGuestCreateSession({ dashboardOpen: false }); }}
      /> : null}
    </main>
  );
}
