"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { PointObjectCreatePanel, type PointObjectCreateEditorSnapshot, type PointObjectGeneratedConcept } from "@/components/point-to-object/create-panel";
import { LiveObjectMap, type LiveMapCreateAoiFitRequest, type LiveMapNavigationTarget, type LiveMapViewMode, type PointObjectReplacementStatus } from "@/components/point-to-object/live-object-map";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
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
  consumePointObjectProjectRestore,
  pointObjectProjectIdentity,
  reconcilePointObjectBrowserIdentity,
  savePointObjectOperation
} from "@/src/lib/prototype/point-object-projects";
import {
  type PointObjectCreateAoi,
  validatePointObjectCreateAoiVertices
} from "@/src/lib/prototype/point-to-object-create";
import {
  type PointObjectFindBounds,
  type PointObjectFindCandidate,
  type PointObjectFindGroup,
  type PointObjectFindResult
} from "@/src/lib/prototype/point-to-object-find-contract";
import { pointObjectFindCapability } from "@/src/lib/prototype/point-to-object-find-capabilities";
import {
  isPointObjectFindResult,
  pointObjectFindSessionForProfileAudience,
  readPointObjectFindSession,
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

function sameFindBounds(left: PointObjectFindBounds | null, right: PointObjectFindBounds): boolean {
  return left !== null && left.every((coordinate, index) => Math.abs(coordinate - right[index]) < 1e-6);
}

function boundedRetryAfterSeconds(value: string | null): number {
  const numeric = value?.trim().match(/^\d+$/) ? Number(value) : Number.NaN;
  const seconds = Number.isFinite(numeric)
    ? numeric
    : value ? Math.ceil((Date.parse(value) - Date.now()) / 1_000) : Number.NaN;
  return Number.isFinite(seconds) ? Math.min(600, Math.max(1, seconds)) : 60;
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
  const { locale, setLocale, t } = usePointObjectLocale();
  const { user, isSessionResolved } = useAuth();
  const projectIdentity = useMemo(() => pointObjectProjectIdentity(user), [user]);
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
  const [createAoiFitRequest, setCreateAoiFitRequest] = useState<LiveMapCreateAoiFitRequest | null>(null);
  const [createEditorSnapshot, setCreateEditorSnapshot] = useState<PointObjectCreateEditorSnapshot | null>(null);
  const [generatedConcept, setGeneratedConcept] = useState<PointObjectGeneratedConcept | null>(null);
  const [generatedConceptLocale, setGeneratedConceptLocale] = useState<"en" | "ru" | null>(null);
  const [activeCreateAlternativeId, setActiveCreateAlternativeId] = useState<"A" | "B">("A");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createAreaCleared, setCreateAreaCleared] = useState(false);
  const [createReplacementStatus, setCreateReplacementStatus] = useState<PointObjectReplacementStatus>("idle");
  const [createReplacementRevision, setCreateReplacementRevision] = useState(0);
  const [areaContext, setAreaContext] = useState<PointObjectAreaContextResult | null>(null);
  const [areaContextStatus, setAreaContextStatus] = useState<"idle" | "loading" | "rate" | "error">("idle");
  const [areaContextRetryVersion, setAreaContextRetryVersion] = useState(0);
  const [areaContextRetryAfterSeconds, setAreaContextRetryAfterSeconds] = useState(0);
  const [visibleBounds, setVisibleBounds] = useState<PointObjectFindBounds | null>(null);
  const [findAudience, setFindAudience] = useState<ExploreAudience>("b2b");
  const [findRole, setFindRole] = useState<ExploreRole>("developer");
  const [findScenario, setFindScenario] = useState<ExploreScenarioId>("b2b_redevelopment_selected_aoi");
  const [findGroup, setFindGroup] = useState<PointObjectFindGroup>("construction");
  const [findMinimumLevels, setFindMinimumLevels] = useState("");
  const [findMaximumLevels, setFindMaximumLevels] = useState("");
  const [findResult, setFindResult] = useState<PointObjectFindResult | null>(null);
  const [findShortlist, setFindShortlist] = useState<PointObjectFindCandidate[]>([]);
  const [findComparisonOpen, setFindComparisonOpen] = useState(false);
  const [findAnalysisTargetSourceFeatureId, setFindAnalysisTargetSourceFeatureId] = useState<PointObjectFindCandidate["sourceFeatureId"] | null>(null);
  const [findStatus, setFindStatus] = useState<"idle" | "loading" | "zoom" | "rate" | "error">("idle");
  const [findResultIntent, setFindResultIntent] = useState<FindIntent | null>(null);
  const [findSessionReady, setFindSessionReady] = useState(false);
  const findRequestRef = useRef<AbortController | null>(null);
  const findRequestIdRef = useRef(0);
  const contextRequestId = useRef(0);
  const searchRequestRef = useRef<AbortController | null>(null);
  const suggestionRequestRef = useRef<AbortController | null>(null);
  const committedSearchQueryRef = useRef("");
  const suggestionRequestIdRef = useRef(0);
  const suggestionCacheRef = useRef(new Map<string, LiveMapSearchResult[]>());
  const restoredFindSessionRef = useRef<PointObjectFindSessionState | null>(null);
  const appliedProfileAudienceRef = useRef<string | null>(null);
  const previousLocaleRef = useRef(locale);
  const projectRestoreAppliedRef = useRef(false);
  const suppressRestoredAreaContextRequestRef = useRef(false);

  const findRoles = useMemo(() => getExecutableFindRoles(findAudience), [findAudience]);
  const findScenarios = useMemo(() => getExecutableFindScenarios(findAudience, findRole), [findAudience, findRole]);
  const findCapability = pointObjectFindCapability(findScenario);
  const findIntentKey = `${findAudience}:${findRole}:${findScenario}`;
  const findResultIntentKey = findResultIntent
    ? `${findResultIntent.audience}:${findResultIntent.role}:${findResultIntent.scenario}`
    : null;
  const findMappedMinimumLevels = findMinimumLevels.trim() ? Number(findMinimumLevels) : null;
  const findMappedMaximumLevels = findMaximumLevels.trim() ? Number(findMaximumLevels) : null;
  const findResultIsStale = findResult !== null && (
    findResultIntentKey !== findIntentKey ||
    findResult.criteria.marketKey !== locationKey ||
    findResult.criteria.locale !== locale ||
    findResult.criteria.group !== findGroup ||
    findResult.criteria.mappedMinimumLevels !== findMappedMinimumLevels ||
    findResult.criteria.mappedMaximumLevels !== findMappedMaximumLevels ||
    !sameFindBounds(visibleBounds, findResult.criteria.bounds)
  );
  const findResultMarketMismatch = findResult !== null && findResult.criteria.marketKey !== locationKey;
  const activeConceptMassing = generatedConcept?.alternatives?.find((alternative) => alternative.id === activeCreateAlternativeId)?.massing ?? generatedConcept?.massing ?? null;
  const sourceBuildingsHidden = createAreaCleared && createReplacementStatus === "applied";
  const createReplacementMapProps = { createReplacementRevision };

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
    if (!sessionReady || !isSessionResolved || projectRestoreAppliedRef.current) return;
    reconcilePointObjectBrowserIdentity(projectIdentity);
    projectRestoreAppliedRef.current = true;
    if (!projectIdentity) return;
    const artifact = consumePointObjectProjectRestore(projectIdentity);
    if (!artifact) return;
    setLocale(artifact.locale);
    setLocationKey(artifact.marketKey);
    if (artifact.kind === "find") {
      restoredFindSessionRef.current = artifact.payload.session;
      setMode("find");
      setViewModeRequest({ requestId: `restore-find:${artifact.artifactId}`, mode: "2d" });
      return;
    }
    if (artifact.kind === "create") {
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
      setAreaContext(artifact.payload.areaContext);
      setAreaContextStatus("idle");
      setCreateAreaCleared(true);
      setCreateReplacementStatus("idle");
      setCreateReplacementRevision((revision) => revision + 1);
    }
  }, [isSessionResolved, projectIdentity, sessionReady, setLocale]);

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
      setFindResultIntent(!restoredIntentWasNormalized && restoredFind.result ? {
        audience: restoredFind.audience,
        role: restoredFind.role,
        scenario: restoredFind.scenario
      } : null);
      setFindShortlist(restoredIntentWasNormalized ? [] : restoredFind.shortlist);
      setFindComparisonOpen(restoredIntentWasNormalized ? false : restoredFind.comparisonOpen);
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
      setFindResultIntent(null);
      setFindShortlist([]);
      setFindComparisonOpen(false);
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
      analysisTargetSourceFeatureId: findResult ? findAnalysisTargetSourceFeatureId : null
    });
  }, [findAnalysisTargetSourceFeatureId, findAudience, findComparisonOpen, findGroup, findMaximumLevels, findMinimumLevels, findResult, findResultIntent, findRole, findScenario, findSessionReady, findShortlist, locale, locationKey]);

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
    findRequestIdRef.current += 1;
    findRequestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!createAoi || mode !== "create") {
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
    const controller = new AbortController();
    setAreaContextStatus("loading");
    setAreaContextRetryAfterSeconds(0);
    setAreaContext(null);
    void fetch("/api/prototype/point-to-object/area-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketKey: locationKey, locale, aoiCoordinates: createAoi.coordinates }),
      signal: controller.signal
    }).then(async (response) => {
      const payload: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (response.status === 429) {
        setAreaContextStatus("rate");
        setAreaContextRetryAfterSeconds(boundedRetryAfterSeconds(response.headers.get("retry-after")));
        return;
      }
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

  useEffect(() => {
    if (areaContextStatus !== "rate") return;
    const timer = window.setInterval(() => {
      setAreaContextRetryAfterSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [areaContextStatus]);

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
    setCreateAoiFitRequest(null);
    setCreateEditorSnapshot(null);
    setGeneratedConcept(null);
    setGeneratedConceptLocale(null);
    setActiveCreateAlternativeId("A");
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setCreateReplacementRevision(0);
    setAreaContext(null);
    setAreaContextStatus("idle");
    setAreaContextRetryAfterSeconds(0);
    setIsDrawing(false);
    setCreateError(null);
    setFindStatus("idle");
    clearPointObjectSelection();
    clearPointObjectAnalysis();
    contextRequestId.current += 1;
    setContextStatus("idle");
  }

  function markFindOutcomeStale() {
    findRequestIdRef.current += 1;
    findRequestRef.current?.abort();
    findRequestRef.current = null;
    setFindStatus("idle");
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

  function saveFindArtifact(
    result: PointObjectFindResult,
    shortlist: PointObjectFindCandidate[],
    comparisonOpen: boolean,
    intent: FindIntent = findResultIntent ?? { audience: findAudience, role: findRole, scenario: findScenario }
  ) {
    if (!projectIdentity) return;
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
      analysisTargetSourceFeatureId: null,
      updatedAt: new Date().toISOString()
    };
    void savePointObjectOperation(projectIdentity, {
      kind: "find",
      locale: result.criteria.locale,
      marketKey: result.criteria.marketKey,
      label: `${locale === "ru" ? "Поиск" : "Find"} · ${result.candidates.length} ${locale === "ru" ? "объектов" : "places"}`,
      payload: { session }
    });
  }

  function saveCreateArtifact(concept: PointObjectGeneratedConcept, activeAlternativeId: "A" | "B") {
    if (!projectIdentity || !createAoi) return;
    void savePointObjectOperation(projectIdentity, {
      kind: "create",
      locale,
      marketKey: locationKey,
      label: concept.program.title,
      payload: {
        aoi: createAoi,
        editorSnapshot: createEditorSnapshot,
        generated: concept,
        generatedLocale: locale,
        activeAlternativeId,
        areaContext
      }
    });
  }

  function toggleFindShortlist(candidate: PointObjectFindCandidate) {
    const next = findShortlist.some((item) => item.sourceFeatureId === candidate.sourceFeatureId)
      ? findShortlist.filter((item) => item.sourceFeatureId !== candidate.sourceFeatureId)
      : findShortlist.length >= 3 ? findShortlist : [...findShortlist, candidate];
    setFindShortlist(next);
    const nextComparisonOpen = next.length >= 2 && findComparisonOpen;
    if (next.length < 2) setFindComparisonOpen(false);
    if (findResult && !findResultIsStale) saveFindArtifact(findResult, next, nextComparisonOpen);
  }

  function clearFindShortlist() {
    setFindShortlist([]);
    setFindComparisonOpen(false);
    if (findResult && !findResultIsStale) saveFindArtifact(findResult, [], false);
  }

  function setFindComparison(open: boolean) {
    setFindComparisonOpen(open);
    if (findResult && !findResultIsStale) saveFindArtifact(findResult, findShortlist, open);
  }

  async function findInView() {
    if (!visibleBounds || findStatus === "loading" || findCapability.status === "unsupported") return;
    findRequestRef.current?.abort();
    const controller = new AbortController();
    const requestId = findRequestIdRef.current + 1;
    const requestIntent = { audience: findAudience, role: findRole, scenario: findScenario };
    findRequestIdRef.current = requestId;
    findRequestRef.current = controller;
    setFindStatus("loading");
    try {
      const mappedMinimumLevels = findMinimumLevels.trim() ? Number(findMinimumLevels) : null;
      const mappedMaximumLevels = findMaximumLevels.trim() ? Number(findMaximumLevels) : null;
      const response = await fetch("/api/prototype/point-to-object/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ marketKey: locationKey, locale, bounds: visibleBounds, group: findGroup, mappedMinimumLevels, mappedMaximumLevels, limit: 12 })
      });
      const payload: unknown = await response.json();
      if (controller.signal.aborted || requestId !== findRequestIdRef.current) return;
      if (response.ok && isPointObjectFindResult(payload)) {
        setFindResult(payload);
        setFindResultIntent(requestIntent);
        setFindShortlist([]);
        setFindComparisonOpen(false);
        setFindAnalysisTargetSourceFeatureId(null);
        setFindStatus("idle");
        saveFindArtifact(payload, [], false, requestIntent);
      } else if (response.status === 400) {
        setFindStatus("zoom");
      } else if (response.status === 429) {
        setFindStatus("rate");
      } else {
        setFindStatus("error");
      }
    } catch (error) {
      if (requestId === findRequestIdRef.current && !(error instanceof DOMException && error.name === "AbortError")) setFindStatus("error");
    } finally {
      if (requestId === findRequestIdRef.current && findRequestRef.current === controller) findRequestRef.current = null;
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
      setCreateAoiFitRequest(null);
      setCreateEditorSnapshot(null);
      setGeneratedConcept(null);
      setGeneratedConceptLocale(null);
      setActiveCreateAlternativeId("A");
      setCreateAreaCleared(false);
      setCreateReplacementStatus("idle");
      setCreateReplacementRevision(0);
      setAreaContext(null);
      setAreaContextStatus("idle");
      setAreaContextRetryAfterSeconds(0);
      setCreateError(null);
    }
  }

  function addCreateVertex(coordinate: Coordinate) {
    if (!isDrawing || draftCoordinates.length >= 25) return;
    setDraftCoordinates((current) => current.length >= 25 ? current : [...current, coordinate]);
    setCreateError(null);
  }

  function closeCreateArea(vertices = draftCoordinates, fitUploadedArea = false) {
    const validation = validatePointObjectCreateAoiVertices(vertices);
    if (validation.ok === false) {
      if (validation.code === "too_small") setCreateError(t("create.tooSmall"));
      else if (validation.code === "too_large") setCreateError(t("create.tooLarge"));
      else if (validation.code === "invalid_geometry") setCreateError(t("create.invalid"));
      else setCreateError(t("create.uploadError"));
      return;
    }
    const ring = closePolygonRing(vertices);
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
    setDraftCoordinates(vertices);
    setIsDrawing(false);
    setGeneratedConcept(null);
    setGeneratedConceptLocale(null);
    setActiveCreateAlternativeId("A");
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setCreateReplacementRevision(0);
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
      closeCreateArea(vertices, true);
    } catch {
      setCreateError(t("create.uploadError"));
    }
  }

  function resetCreate() {
    setIsDrawing(false);
    setDraftCoordinates([]);
    setCreateAoi(null);
    setCreateAoiFitRequest(null);
    setCreateEditorSnapshot(null);
    setGeneratedConcept(null);
    setGeneratedConceptLocale(null);
    setActiveCreateAlternativeId("A");
    setCreateAreaCleared(false);
    setCreateReplacementStatus("idle");
    setCreateReplacementRevision(0);
    setAreaContext(null);
    setAreaContextStatus("idle");
    setAreaContextRetryAfterSeconds(0);
    setCreateError(null);
  }

  function toggleCreateMapPresentation() {
    setCreateReplacementStatus("idle");
    if (sourceBuildingsHidden) {
      setCreateAreaCleared(false);
      return;
    }
    setCreateAreaCleared(true);
    setCreateReplacementRevision((revision) => revision + 1);
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
  const findCtaDisabled = !visibleBounds || findStatus === "loading" || findCapability.status === "unsupported" || findHasInvalidLevels;
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
              ? (locale === "ru" ? "Укажите диапазон этажности от 1 до 100; минимум не должен превышать максимум." : "Enter mapped levels from 1 to 100; minimum cannot exceed maximum.")
              : findResultIsStale
                ? (locale === "ru" ? "Карта или критерии изменились — обновите результаты." : "The map or criteria changed — update the results.")
                : !visibleBounds
                  ? (locale === "ru" ? "Дождитесь загрузки области карты." : "Waiting for the visible map area.")
                  : "";

  return (
    <main className="h-[100svh] min-h-[420px] overflow-hidden bg-white text-ink">
      <PointObjectHeader />
      <div className="grid h-[calc(100svh-64px)] min-h-0 grid-rows-[clamp(108px,32svh,360px)_minmax(0,1fr)] bg-white sm:max-lg:landscape:grid-cols-[minmax(0,1fr)_minmax(340px,48%)] sm:max-lg:landscape:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_430px] lg:grid-rows-1">
        <section className="relative h-full min-h-0 overflow-hidden border-b border-line sm:max-lg:landscape:border-b-0 lg:border-b-0" aria-label={t("map.region")}>
          {sessionReady ? <LiveObjectMap {...createReplacementMapProps} locationKey={locationKey} interactionMode={mode} selection={mode === "analyse" ? selection : null} navigationTarget={navigationTarget} viewModeRequest={viewModeRequest} onSelection={handleSelection} onViewportChange={handleViewportChange} onVisibleBoundsChange={setVisibleBounds} createDrawing={mode === "create" && isDrawing} createDraftCoordinates={mode === "create" ? draftCoordinates : []} createAoi={mode === "create" ? createAoi : null} createAoiFitRequest={mode === "create" ? createAoiFitRequest : null} createAreaCleared={mode === "create" && createAreaCleared} conceptMassing={mode === "create" ? activeConceptMassing : null} onCreateVertex={addCreateVertex} onReplacementStatus={setCreateReplacementStatus} className="h-full min-h-0" /> : <div className="grid h-full min-h-0 place-items-center bg-[#f4f6f7] text-sm font-medium text-[#52606a]" role="status">{t("map.loading")}</div>}
          <div className="absolute left-4 top-4 z-10 flex w-[min(650px,calc(100%-5rem))] flex-col gap-2 sm:left-5 sm:top-5 sm:flex-row">
            <label className="flex h-11 w-fit shrink-0 items-center rounded-xl border border-white/70 bg-white/95 px-3 shadow-[0_10px_30px_rgba(20,35,45,0.14)] backdrop-blur">
              <span className="sr-only">{t("city.label")}</span>
              <ReliableSelect value={locationKey} onChange={(event) => changeMarket(event.target.value as LiveMapLocationKey)} aria-label={t("city.label")} data-testid="point-object-city-select" wrapperClassName="max-w-[190px]" className="min-h-10 max-w-[190px] bg-transparent pl-0 text-sm font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">
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

        <aside className="h-full min-h-0 min-w-0 overflow-hidden border-l border-line bg-white">
          <div className={`flex h-full min-h-0 flex-col p-3 pb-3 sm:p-4 sm:pb-3 lg:p-6 lg:pb-4 ${mode === "find" ? "overflow-hidden" : "overflow-y-auto"}`}>
            <div className="mb-2 grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-[#f2f5f4] p-1" role="tablist" aria-label={t("mode.label")}>
              {(["analyse", "find", "create"] as ProductMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => changeMode(item)} className={`min-h-11 rounded-lg px-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${mode === item ? "bg-white text-[#087f8c] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>{t(`mode.${item}` as "mode.analyse" | "mode.find" | "mode.create")}</button>)}
            </div>
            <div className="min-w-0">
                {mode === "find" ? null : <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{mode === "create" ? t("mode.create") : t("panel.eyebrow")}</p>}
                <h1 className={`${mode === "find" ? "text-[22px] sm:text-2xl" : "mt-2 text-2xl sm:text-[28px]"} font-bold tracking-[-0.035em]`}>{mode === "create" ? t("create.title") : mode === "find" ? t("find.title") : t("panel.title")}</h1>
                {mode === "find" ? null : <p className="mt-2 text-sm leading-5 text-muted">{mode === "create" ? t("create.body") : t("panel.description")}</p>}
            </div>

            {mode === "analyse" ? <div className="flex min-h-0 flex-1 flex-col"><section className="mt-4 shrink-0 overflow-hidden rounded-[18px] border border-line bg-[#f8fafc] p-4" data-testid="selection-card">
              {selection ? <><p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#667085]">{t("selection.selected")}</p><h2 className="mt-2 line-clamp-2 break-words text-lg font-bold tracking-[-0.02em]" data-testid="selected-object">{selectionTitle}</h2><p className="mt-1 text-sm text-muted">{humanize(selection.resolvedObject?.featureClass ?? selection.object.featureClass)}</p>
                {selection.resolvedObject ? <p className="mt-1 text-xs font-semibold text-[#087f8c]">{selectionContextLabel}</p> : null}
                {selection.resolvedObject?.address ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#475467]">{selection.resolvedObject.address}</p> : null}
                {contextStatus === "loading" ? <p className="mt-3 text-xs font-semibold text-[#087f8c]" role="status">{t("selection.resolving")}</p> : null}
                {contextStatus === "error" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e7c47e] bg-[#fffaf0] px-3 py-2 text-xs text-[#6b4b16]" role="alert"><span>{t("selection.error")}</span><button type="button" onClick={() => { setContextStatus("loading"); setContextRetryVersion((value) => value + 1); }} className="min-h-9 shrink-0 rounded-lg border border-[#d6b36e] bg-white px-3 font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{t("selection.retry")}</button></div> : null}
                {selectedAttributes.length ? <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3" aria-label={t("selection.attributes")}>{selectedAttributes.map(([key, value]) => <span key={key} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#475467] ring-1 ring-inset ring-[#d7dee4]">{selectionAttributeLabel(key, locale)} · {humanize(value)}</span>)}</div> : null}</> : <div className="py-3"><p className="text-sm font-bold">{t("selection.empty.title")}</p><p className="mt-2 text-sm leading-6 text-muted">{t("selection.empty.body")}</p></div>}
            </section>

            <div className="mt-auto shrink-0 pt-3" data-testid="analyse-composer"><label className="text-xs font-bold text-ink" htmlFor="point-object-question">{t("question.label")}</label><textarea id="point-object-question" value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 500))} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); startAnalysis(); } }} placeholder={t("question.placeholder")} className="mt-1.5 h-[120px] w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-sm leading-5 outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#bfe4e2] lg:h-[132px] lg:min-h-[120px] lg:max-h-[200px] lg:resize-y" /><div className="sticky bottom-0 bg-white pt-2"><button type="button" onClick={startAnalysis} disabled={!selection?.resolvedObject} className="min-h-11 w-full rounded-control bg-[#087f8c] px-4 text-sm font-bold text-white transition hover:bg-[#006c78] disabled:cursor-not-allowed disabled:bg-[#b7c4c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">{selection && !selection.resolvedObject ? t("analyze.resolving") : t("analyze.action")}</button></div></div>
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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted"><span>{findResult.mode === "empty" ? (locale === "ru" ? "По этим условиям ничего не найдено." : "No matches for these filters.") : (locale === "ru" ? `Показано: ${findResult.candidates.length}` : `Showing ${findResult.candidates.length}`)}</span><span className="flex items-center gap-2">{findResultIsStale ? <span className="rounded-full bg-[#e8edef] px-2 py-0.5 font-bold uppercase tracking-[0.06em] text-[#52606a]" data-testid="find-result-stale">{locale === "ru" ? "Устарела" : "Stale"}</span> : null}{findResult.coverage.capReached ? <span className="font-semibold text-[#79520d]">{locale === "ru" ? "Увеличьте масштаб, чтобы сузить результаты." : "Zoom in to narrow results."}</span> : null}</span></div>
                {findShortlist.length > 0 ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#e6f5f1] px-3 py-2" data-testid="find-comparison-toolbar">
                  <span className="text-xs font-bold text-[#176548]">{locale === "ru" ? `Выбрано: ${findShortlist.length}` : `Selected: ${findShortlist.length}`}</span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {findComparisonOpen ? <button type="button" onClick={() => setFindComparison(false)} className="min-h-11 rounded-lg border border-[#8ebdb4] bg-white px-3 text-[11px] font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{locale === "ru" ? "К результатам" : "Back to results"}</button> : <button type="button" disabled={findShortlist.length < 2} onClick={() => setFindComparison(true)} className="min-h-11 rounded-lg bg-[#087f70] px-3 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9bbdb5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{locale === "ru" ? "Сравнить выбранные" : "Compare selected"}</button>}
                    <button type="button" onClick={clearFindShortlist} className="min-h-11 rounded-lg px-3 text-[11px] font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{locale === "ru" ? "Очистить" : "Clear"}</button>
                  </div>
                </div> : null}
                {findComparisonOpen && findShortlist.length >= 2 ? <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-2" role="region" aria-label={locale === "ru" ? "Сравнение объектов" : "Object comparison"} tabIndex={0}>
                  <div className="grid grid-flow-col auto-cols-[minmax(188px,1fr)] gap-2" data-testid="find-comparison-grid">
                    {findShortlist.map((candidate) => {
                      const subtype = readableFindSubtype(candidate.matchedTag.value, candidate.group, locale);
                      const observedAttribute = comparisonObservedAttribute(candidate, locale);
                      return <article key={candidate.sourceFeatureId} className="flex min-w-0 flex-col rounded-xl border border-line bg-white p-3"><div className="flex items-start justify-between gap-1"><div className="min-w-0"><h3 className="break-words text-sm font-bold text-ink">{candidate.label}</h3><p className="mt-1 break-words text-[11px] text-muted">{findGroupLabels[candidate.group]}{subtype ? ` · ${subtype}` : ""}</p></div><button type="button" aria-label={`${locale === "ru" ? "Убрать из сравнения" : "Remove from comparison"}: ${candidate.label}`} onClick={() => toggleFindShortlist(candidate)} className="min-h-11 shrink-0 rounded-lg px-2 text-[11px] font-bold text-[#087f70] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{locale === "ru" ? "Убрать" : "Remove"}</button></div><dl className="mt-3 grid grid-cols-[minmax(72px,auto)_minmax(0,1fr)] gap-x-2 gap-y-2 text-[10px]"><dt className="text-muted">{locale === "ru" ? "Тип" : "Type"}</dt><dd className="break-words font-semibold">{subtype ?? findGroupLabels[candidate.group]}</dd><dt className="text-muted">{locale === "ru" ? "Этажность" : "Levels"}</dt><dd className="font-semibold">{candidate.mappedBuildingLevels ?? (locale === "ru" ? "Не указана" : "Not mapped")}</dd>{observedAttribute ? <><dt className="text-muted">{observedAttribute.label}</dt><dd className="break-words font-semibold">{observedAttribute.value}</dd></> : null}</dl><button type="button" disabled={findResultMarketMismatch} onClick={() => chooseFindCandidate(candidate)} className="mt-auto min-h-11 w-full rounded-lg border border-[#8ebdb4] bg-white px-3 text-xs font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] disabled:cursor-not-allowed disabled:opacity-40">{locale === "ru" ? "Открыть анализ" : "Open analysis"}</button></article>;
                    })}
                  </div>
                </div> : <ul className="space-y-2">{findResult.candidates.map((candidate) => {
                  const selectedForComparison = findShortlist.some((item) => item.sourceFeatureId === candidate.sourceFeatureId);
                  const subtype = readableFindSubtype(candidate.matchedTag.value, candidate.group, locale);
                  return <li key={candidate.sourceFeatureId} className="rounded-xl border border-line bg-white p-3"><button type="button" disabled={findResultMarketMismatch} onClick={() => chooseFindCandidate(candidate)} className="min-h-11 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] disabled:cursor-not-allowed disabled:opacity-40"><span className="block text-sm font-bold text-ink">{candidate.label}</span><span className="mt-1 block text-[11px] text-muted">{findGroupLabels[candidate.group]}{subtype ? ` · ${subtype}` : ""}{candidate.mappedBuildingLevels === null ? "" : ` · ${candidate.mappedBuildingLevels} ${locale === "ru" ? "эт." : "levels"}`}</span></button><button type="button" aria-pressed={selectedForComparison} disabled={!selectedForComparison && findShortlist.length >= 3} onClick={() => toggleFindShortlist(candidate)} className={`mt-2 min-h-11 rounded-lg px-3 text-[11px] font-bold transition disabled:opacity-40 ${selectedForComparison ? "bg-[#087f70] text-white" : "border border-[#8ebdb4] bg-white text-[#176548]"}`}>{selectedForComparison ? (locale === "ru" ? "Выбрано" : "Selected") : (locale === "ru" ? "В сравнение" : "Compare")}</button></li>;
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
                >{findStatus === "loading" ? (locale === "ru" ? "Ищем…" : "Searching…") : findResultIsStale ? (locale === "ru" ? "Обновить поиск" : "Update search") : (locale === "ru" ? "Искать в видимой области" : "Search visible area")}</button>
              </footer>
            </section> : null}

            {mode === "create" ? <div className="mt-5 space-y-4">
              {!createAoi ? <section className="rounded-[18px] border border-[#cfe0da] bg-[#f4faf7] p-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setIsDrawing(true); setDraftCoordinates([]); setCreateError(null); setGeneratedConcept(null); setActiveCreateAlternativeId("A"); setCreateAreaCleared(false); setCreateReplacementStatus("idle"); setCreateReplacementRevision(0); }} className="min-h-11 rounded-xl bg-[#087f70] px-3 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] focus-visible:ring-offset-2">{t("create.draw")}</button>
                  <label className="grid min-h-11 cursor-pointer place-items-center rounded-xl border border-[#9bbdb5] bg-white px-3 text-center text-xs font-bold text-[#345c54] focus-within:ring-2 focus-within:ring-[#087f70]"><span>{t("create.upload")}</span><input type="file" accept="application/geo+json,application/json,.geojson,.json" aria-label={t("create.upload")} onChange={(event) => void uploadCreateArea(event)} className="sr-only focus-visible:outline-none" /></label>
                </div>
                {isDrawing ? <><p className="mt-3 text-xs font-semibold text-[#345c54]">{t("create.drawing", { count: draftCoordinates.length })}</p><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" disabled={draftCoordinates.length < 3} onClick={() => closeCreateArea()} className="min-h-10 rounded-lg bg-[#087f70] px-2 text-xs font-bold text-white disabled:opacity-40">{t("create.close")}</button><button type="button" disabled={!draftCoordinates.length} onClick={() => setDraftCoordinates((current) => current.slice(0, -1))} className="min-h-10 rounded-lg border border-[#b8cbc6] bg-white px-2 text-xs font-bold text-[#345c54] disabled:opacity-40">{t("create.undo")}</button><button type="button" onClick={resetCreate} className="min-h-10 rounded-lg border border-[#b8cbc6] bg-white px-2 text-xs font-bold text-[#345c54]">{t("create.cancel")}</button></div></> : null}
                {createError ? <p className="mt-3 rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-3 py-2 text-xs text-[#79520d]" role="alert">{createError}</p> : null}
              </section> : <><p className="rounded-xl border border-[#cfe0da] bg-[#f4faf7] px-4 py-3 text-xs font-bold text-[#345c54]">{t("create.ready", { area: createAoi.areaSqM >= 10_000 ? `${(createAoi.areaSqM / 10_000).toFixed(2)} ${locale === "ru" ? "га" : "ha"}` : `${Math.round(createAoi.areaSqM).toLocaleString(locale)} ${locale === "ru" ? "м²" : "m²"}` })}</p>
                <section className="rounded-[18px] border border-line bg-[#f8fafc] p-4" aria-live="polite">
                  <div className="flex flex-col items-start gap-3">
                    <div className="w-full min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#087f70]">{locale === "ru" ? "КОНТЕКСТ ЗОНЫ" : "AREA CONTEXT"}</p>
                      <h2 data-testid="create-area-context-heading" className="mt-1 text-sm font-bold text-ink">{locale === "ru" ? "Сводка объектов внутри полигона" : "Objects inside the polygon"}</h2>
                    </div>
                    <button type="button" data-testid="create-map-presentation-toggle" onClick={toggleCreateMapPresentation} className="min-h-11 max-w-full rounded-lg border border-[#8ebdb4] bg-white px-3 text-left text-[11px] font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{sourceBuildingsHidden ? (locale === "ru" ? "Показать исходные" : "Show existing") : activeConceptMassing ? (locale === "ru" ? "Показать созданную концепцию" : "Show generated concept") : (locale === "ru" ? "Скрыть исходные здания" : "Hide existing buildings")}</button>
                  </div>
                  {areaContextStatus === "loading" ? <p className="mt-3 text-xs font-semibold text-[#087f70]" role="status">{locale === "ru" ? "Собираем объекты открытой карты…" : "Reading open-map objects…"}</p> : null}
                  {areaContextStatus === "rate" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]" role="alert"><span>{areaContextRetryAfterSeconds > 0 ? (locale === "ru" ? `Можно повторить через ${areaContextRetryAfterSeconds} с.` : `Retry in ${areaContextRetryAfterSeconds}s.`) : (locale === "ru" ? "Можно повторить запрос." : "Try again.")}</span><button type="button" disabled={areaContextRetryAfterSeconds > 0} onClick={() => setAreaContextRetryVersion((value) => value + 1)} className="min-h-11 shrink-0 rounded-lg border border-[#d6b36e] bg-white px-3 font-bold disabled:cursor-wait disabled:opacity-50">{t("selection.retry")}</button></div> : null}
                  {areaContextStatus === "error" ? <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]" role="alert"><span>{locale === "ru" ? "Контекст зоны временно недоступен." : "Area context is temporarily unavailable."}</span><button type="button" onClick={() => setAreaContextRetryVersion((value) => value + 1)} className="min-h-8 rounded-lg border border-[#d6b36e] bg-white px-2 font-bold">{t("selection.retry")}</button></div> : null}
                  {areaContext ? <><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Объекты на карте" : "Mapped objects"}</span><strong className="mt-1 block text-sm">{areaContext.summary.sampleSize}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Здания на карте" : "Mapped buildings"}</span><strong className="mt-1 block text-sm">{areaContext.summary.mappedBuildingCount}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-muted">{locale === "ru" ? "Медиана этажей" : "Median levels"}</span><strong className="mt-1 block text-sm">{areaContext.summary.medianMappedLevels ?? "—"}</strong></div></div><div className="mt-3 flex flex-wrap gap-1.5">{areaContext.summary.groups.slice(0, 5).map((group) => <span key={group.group} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#475467] ring-1 ring-inset ring-[#d7dee4]">{areaGroupLabels[group.group]} · {group.count}</span>)}</div>{areaContext.coverage.capReached ? <p className="mt-3 text-[10px] font-semibold leading-4 text-[#79520d]">{locale === "ru" ? "Нарисуйте меньшую зону, чтобы сузить список объектов на карте." : "Draw a smaller area to narrow the mapped objects."}</p> : null}</> : null}
                </section>
                <PointObjectCreatePanel locale={locale} marketKey={locationKey} aoi={createAoi} depth="standard" generated={generatedConcept} generatedLocale={generatedConceptLocale} editorSnapshot={createEditorSnapshot} onEditorSnapshotChange={setCreateEditorSnapshot} activeAlternativeId={activeCreateAlternativeId} onGenerated={(concept) => { setGeneratedConcept(concept); setGeneratedConceptLocale(locale); setActiveCreateAlternativeId("A"); setCreateReplacementStatus("idle"); setCreateAreaCleared(true); setCreateReplacementRevision((revision) => revision + 1); saveCreateArtifact(concept, "A"); }} onAlternativeChange={(id) => { setActiveCreateAlternativeId(id); setCreateReplacementStatus("idle"); setCreateAreaCleared(true); setCreateReplacementRevision((revision) => revision + 1); if (generatedConcept) saveCreateArtifact(generatedConcept, id); }} onReset={() => { setGeneratedConcept(null); setGeneratedConceptLocale(null); setActiveCreateAlternativeId("A"); setCreateAreaCleared(false); setCreateReplacementStatus("idle"); setCreateReplacementRevision(0); }} />
                {createAreaCleared && createReplacementStatus !== "applied" ? (
                  <p className={`rounded-xl border px-3 py-2 text-[10px] leading-4 ${createReplacementStatus === "error" ? "border-[#e6bd74] bg-[#fff9ed] text-[#79520d]" : "border-[#d8e2df] bg-[#f8faf9] text-[#62716d]"}`} role="status">
                    {createReplacementStatus === "zoom-required"
                      ? (locale === "ru" ? "Приблизьте карту, чтобы увидеть концепцию." : "Zoom in to view the concept.")
                      : createReplacementStatus === "error"
                        ? (locale === "ru" ? "Безопасное замещение не применилось: исходные здания восстановлены, новая модель скрыта." : "Safe replacement could not be applied: source buildings were restored and the concept is hidden.")
                        : (locale === "ru" ? "Подготавливаем замещение зданий…" : "Preparing building replacement…")}
                  </p>
                ) : null}
                <button type="button" data-testid="create-delete-area" onClick={resetCreate} className="min-h-11 w-full rounded-xl border border-[#b8cbc6] bg-white px-3 text-xs font-bold text-[#345c54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{t("create.deleteArea")}</button></>}
            </div> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
