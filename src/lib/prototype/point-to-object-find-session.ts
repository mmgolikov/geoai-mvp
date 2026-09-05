import type { ExploreAudience, ExploreRole, ExploreScenarioId } from "@/src/lib/explore/types";
import {
  POINT_OBJECT_FIND_CAVEAT,
  POINT_OBJECT_FIND_GROUPS,
  type PointObjectFindCandidate,
  type PointObjectFindGroup,
  type PointObjectFindResult
} from "@/src/lib/prototype/point-to-object-find-contract";
import {
  isPointObjectLocale,
  isPointObjectMarketKey,
  type PointObjectLocale,
  type PointObjectMarketKey
} from "@/src/lib/prototype/point-to-object-markets";

const STORAGE_KEY = "geoai:point-to-object:find:v1";
const MAX_BYTES = 160 * 1024;

const ROLES = new Set<ExploreRole>([
  "tourist", "resident_expat", "home_buyer", "renter", "investor_buyer", "family_relocation",
  "developer", "real_estate_fund", "bank_lender", "insurer", "government_urban_authority",
  "infrastructure_operator", "consultant_broker", "family_office", "asset_manager"
]);
const SCENARIOS = new Set<ExploreScenarioId>([
  "b2c_point_context", "b2c_tourist_objects_route", "b2c_residential_context",
  "b2c_new_residential_projects", "b2c_interest_routes", "b2b_redevelopment_selected_aoi",
  "b2b_redevelopment_100ha", "b2b_lowrise_luxury_residential", "b2b_hotel_development",
  "b2b_commercial_real_estate"
]);
const GROUPS = new Set<PointObjectFindGroup>(POINT_OBJECT_FIND_GROUPS);

export type PointObjectFindSessionState = {
  version: 1;
  marketKey: PointObjectMarketKey;
  locale: PointObjectLocale;
  audience: ExploreAudience;
  role: ExploreRole;
  scenario: ExploreScenarioId;
  group: PointObjectFindGroup;
  mappedMinimumLevels: string;
  mappedMaximumLevels: string;
  result: PointObjectFindResult | null;
  shortlist: PointObjectFindCandidate[];
  comparisonOpen: boolean;
  analysisTargetSourceFeatureId: PointObjectFindCandidate["sourceFeatureId"] | null;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteCoordinate(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= maximum;
}

function isFiniteInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isCandidate(value: unknown): value is PointObjectFindCandidate {
  if (!isRecord(value) || typeof value.sourceFeatureId !== "string" ||
      !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(value.sourceFeatureId) ||
      (value.sourceElementType !== "node" && value.sourceElementType !== "way" && value.sourceElementType !== "relation") ||
      typeof value.sourceElementId !== "string" || !/^[1-9]\d{0,19}$/.test(value.sourceElementId) ||
      typeof value.label !== "string" || !value.label.trim() || value.label.length > 240 ||
      !(value.name === null || (typeof value.name === "string" && value.name.length <= 240)) ||
      !isFiniteCoordinate(value.longitude, 180) || !isFiniteCoordinate(value.latitude, 90) ||
      typeof value.group !== "string" || !GROUPS.has(value.group as PointObjectFindGroup) ||
      !isRecord(value.matchedTag) || typeof value.matchedTag.key !== "string" || typeof value.matchedTag.value !== "string" ||
      !(value.mappedBuildingLevels === null || (Number.isInteger(value.mappedBuildingLevels) && Number(value.mappedBuildingLevels) >= 1 && Number(value.mappedBuildingLevels) <= 200)) ||
      !isRecord(value.observedTags) || Object.keys(value.observedTags).length > 24 ||
      Object.values(value.observedTags).some((item) => typeof item !== "string") ||
      value.evidenceClass !== "observed_in_open_map_source") return false;
  const [elementType, elementId] = value.sourceFeatureId.split("/");
  return elementType === value.sourceElementType && elementId === value.sourceElementId;
}

export function isPointObjectFindResult(value: unknown): value is PointObjectFindResult {
  if (!isRecord(value) || value.protocol !== "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1" ||
      (value.mode !== "results" && value.mode !== "empty") || !Array.isArray(value.candidates) ||
      value.candidates.length > 20 || !value.candidates.every(isCandidate) ||
      value.ordering !== "source_identity_ascending_not_ranked" || !isRecord(value.criteria) ||
      !isPointObjectMarketKey(value.criteria.marketKey) || !isPointObjectLocale(value.criteria.locale) ||
      !Array.isArray(value.criteria.bounds) || value.criteria.bounds.length !== 4 ||
      !value.criteria.bounds.every((item) => isFiniteInRange(item, -180, 180)) ||
      typeof value.criteria.group !== "string" || !GROUPS.has(value.criteria.group as PointObjectFindGroup) ||
      !(value.criteria.mappedMinimumLevels === null || (Number.isInteger(value.criteria.mappedMinimumLevels) && Number(value.criteria.mappedMinimumLevels) >= 1 && Number(value.criteria.mappedMinimumLevels) <= 100)) ||
      !(value.criteria.mappedMaximumLevels === null || (Number.isInteger(value.criteria.mappedMaximumLevels) && Number(value.criteria.mappedMaximumLevels) >= 1 && Number(value.criteria.mappedMaximumLevels) <= 100)) ||
      !Number.isInteger(value.criteria.limit) || Number(value.criteria.limit) < 1 || Number(value.criteria.limit) > 20 ||
      !isRecord(value.coverage) || value.coverage.kind !== "bounded_open_map_sample" ||
      !isFiniteInRange(value.coverage.approximateAreaSqKm, 0, 36) ||
      !Number.isInteger(value.coverage.upstreamElementCount) || Number(value.coverage.upstreamElementCount) < 0 ||
      !Number.isInteger(value.coverage.normalizedCandidateCount) || Number(value.coverage.normalizedCandidateCount) < 0 ||
      !Number.isInteger(value.coverage.returnedCandidateCount) || Number(value.coverage.returnedCandidateCount) < 0 ||
      !Number.isInteger(value.coverage.upstreamQueryLimit) || Number(value.coverage.upstreamQueryLimit) < 1 ||
      typeof value.coverage.capReached !== "boolean" || value.coverage.completeInventory !== false ||
      (value.coverage.mappedLevelsPolicy !== "not_requested" && value.coverage.mappedLevelsPolicy !== "strict_explicit_building_levels_tag_only") ||
      !isRecord(value.source) ||
      value.source.name !== "OpenStreetMap" || value.source.service !== "Overpass API" ||
      typeof value.source.sourceResponseHash !== "string" || !/^[a-f0-9]{64}$/.test(value.source.sourceResponseHash) ||
      !(value.source.observedAt === null || typeof value.source.observedAt === "string") ||
      typeof value.source.acquiredAt !== "string" || value.source.freshness !== "runtime_response_feature_time_unavailable" ||
      value.source.licenceId !== "ODbL-1.0" || typeof value.source.attribution !== "string" ||
      typeof value.source.licenceUrl !== "string" || typeof value.source.usagePolicyUrl !== "string" ||
      value.source.officialStatus !== "open_context_not_official" || value.source.runtimeNetworkUsed !== true ||
      value.source.persistenceUsed !== false || !Array.isArray(value.limitations) || value.limitations.length > 24 ||
      value.limitations.some((item) => typeof item !== "string" || item.length > 1_000) || value.caveat !== POINT_OBJECT_FIND_CAVEAT) return false;
  if (value.criteria.mappedMinimumLevels !== null && value.criteria.mappedMaximumLevels !== null &&
      Number(value.criteria.mappedMinimumLevels) > Number(value.criteria.mappedMaximumLevels)) return false;
  if (value.mode === "empty" && value.candidates.length !== 0) return false;
  if (Number(value.coverage.returnedCandidateCount) !== value.candidates.length) return false;
  return true;
}

function parseState(value: unknown): PointObjectFindSessionState | null {
  if (!isRecord(value) || value.version !== 1 || !isPointObjectMarketKey(value.marketKey) ||
      !isPointObjectLocale(value.locale) || (value.audience !== "b2b" && value.audience !== "b2c") ||
      typeof value.role !== "string" || !ROLES.has(value.role as ExploreRole) ||
      typeof value.scenario !== "string" || !SCENARIOS.has(value.scenario as ExploreScenarioId) ||
      typeof value.group !== "string" || !GROUPS.has(value.group as PointObjectFindGroup) ||
      typeof value.mappedMinimumLevels !== "string" || !/^\d{0,3}$/.test(value.mappedMinimumLevels) ||
      typeof value.mappedMaximumLevels !== "string" || !/^\d{0,3}$/.test(value.mappedMaximumLevels) ||
      !(value.result === null || isPointObjectFindResult(value.result)) || !Array.isArray(value.shortlist) ||
      value.shortlist.length > 3 || !value.shortlist.every(isCandidate) ||
      typeof value.comparisonOpen !== "boolean" ||
      !(value.analysisTargetSourceFeatureId === null || (typeof value.analysisTargetSourceFeatureId === "string" && /^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(value.analysisTargetSourceFeatureId))) ||
      typeof value.updatedAt !== "string") return null;
  const audience = value.audience;
  const role = value.role as ExploreRole;
  const scenario = value.scenario as ExploreScenarioId;
  if ((audience === "b2b") !== scenario.startsWith("b2b_")) return null;
  if ((audience === "b2b") !== !["tourist", "resident_expat", "home_buyer", "renter", "investor_buyer", "family_relocation"].includes(role)) return null;
  const result = value.result as PointObjectFindResult | null;
  const shortlist = value.shortlist as PointObjectFindCandidate[];
  const mappedMinimumLevels = value.mappedMinimumLevels === "" ? null : Number(value.mappedMinimumLevels);
  const mappedMaximumLevels = value.mappedMaximumLevels === "" ? null : Number(value.mappedMaximumLevels);
  if (mappedMinimumLevels !== null && mappedMaximumLevels !== null && mappedMinimumLevels > mappedMaximumLevels) return null;
  if (result && (result.criteria.marketKey !== value.marketKey || result.criteria.locale !== value.locale || result.criteria.group !== value.group ||
      result.criteria.mappedMinimumLevels !== mappedMinimumLevels || result.criteria.mappedMaximumLevels !== mappedMaximumLevels)) return null;
  const candidateIds = new Set(result?.candidates.map((item) => item.sourceFeatureId) ?? []);
  if (shortlist.some((item) => !candidateIds.has(item.sourceFeatureId))) return null;
  if (value.analysisTargetSourceFeatureId !== null && !candidateIds.has(value.analysisTargetSourceFeatureId as PointObjectFindCandidate["sourceFeatureId"])) return null;
  return {
    version: 1,
    marketKey: value.marketKey,
    locale: value.locale,
    audience,
    role,
    scenario,
    group: value.group as PointObjectFindGroup,
    mappedMinimumLevels: value.mappedMinimumLevels,
    mappedMaximumLevels: value.mappedMaximumLevels,
    result,
    shortlist,
    comparisonOpen: value.comparisonOpen && shortlist.length >= 2,
    analysisTargetSourceFeatureId: value.analysisTargetSourceFeatureId as PointObjectFindCandidate["sourceFeatureId"] | null,
    updatedAt: value.updatedAt
  };
}

export function readPointObjectFindSession(): PointObjectFindSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BYTES) return null;
    return parseState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function pointObjectFindSessionForProfileAudience(
  state: PointObjectFindSessionState | null,
  profileAudience: ExploreAudience
): PointObjectFindSessionState | null {
  return state?.audience === profileAudience ? state : null;
}

export function writePointObjectFindSession(state: Omit<PointObjectFindSessionState, "version" | "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify({ version: 1, ...state, updatedAt: new Date().toISOString() });
    if (new TextEncoder().encode(raw).byteLength <= MAX_BYTES) window.sessionStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Session persistence is a best-effort browser convenience, never an evidence source.
  }
}
