export const exploreRequiredCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type ExploreAudience = "b2c" | "b2b";

export type B2CRole =
  | "tourist"
  | "resident_expat"
  | "home_buyer"
  | "renter"
  | "investor_buyer"
  | "family_relocation";

export type B2BRole =
  | "developer"
  | "real_estate_fund"
  | "bank_lender"
  | "insurer"
  | "government_urban_authority"
  | "infrastructure_operator"
  | "consultant_broker"
  | "family_office"
  | "asset_manager";

export type ExploreRole = B2CRole | B2BRole;

export type InteractionMode = "map_first" | "criteria_first";

export type CandidateSearchStatus = "idle" | "ready" | "searched" | "stale";

export type ExploreScenarioId =
  | "b2c_point_context"
  | "b2c_tourist_objects_route"
  | "b2c_residential_context"
  | "b2c_new_residential_projects"
  | "b2c_interest_routes"
  | "b2b_redevelopment_selected_aoi"
  | "b2b_redevelopment_100ha"
  | "b2b_lowrise_luxury_residential"
  | "b2b_hotel_development"
  | "b2b_commercial_real_estate";

export type CandidateType =
  | "selected_point_context"
  | "tourist_poi"
  | "tourist_route"
  | "residential_project"
  | "residential_cluster"
  | "redevelopment_zone"
  | "development_zone"
  | "hotel_zone"
  | "commercial_zone";

export type CandidateSourceType =
  | "sample"
  | "open_context"
  | "user_provided"
  | "demo_seed"
  | "fallback";

export type ExploreCoordinate = [number, number];

export type ExploreCandidateGeometry =
  | {
      type: "point";
      point: ExploreCoordinate;
    }
  | {
      type: "polygon";
      coordinates: ExploreCoordinate[];
    }
  | {
      type: "route";
      coordinates: ExploreCoordinate[];
    };

export type ExploreScoreBreakdownItem = {
  label: string;
  value: number;
  note: string;
};

export type ExploreEvidenceItem = {
  label: string;
  sourceType: CandidateSourceType;
  description: string;
  confidence: "low" | "medium" | "high";
};

export type ExploreCandidate = {
  id: string;
  scenarioId: ExploreScenarioId;
  audience: ExploreAudience;
  candidateType: CandidateType;
  title: string;
  subtitle: string;
  locationLabel: string;
  geometry: ExploreCandidateGeometry;
  score: number;
  confidence: "low" | "medium" | "high";
  scoreBreakdown: ExploreScoreBreakdownItem[];
  evidence: ExploreEvidenceItem[];
  caveats: string[];
  validationRequired: string[];
  tags: string[];
  recommendedNextAction: string;
  sourceType: CandidateSourceType;
  createdAt: string;
};

export type ExploreRoleDefinition<T extends ExploreRole = ExploreRole> = {
  id: T;
  audience: ExploreAudience;
  label: string;
  description: string;
};

export type ExploreFilterOption = {
  value: string;
  label: string;
};

export type ExploreFilterConfig = {
  id: string;
  label: string;
  type: "select" | "multi_select" | "range" | "toggle";
  options?: ExploreFilterOption[];
  defaultValue: string | string[] | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type ExploreScenario = {
  id: ExploreScenarioId;
  title: string;
  subtitle: string;
  audience: ExploreAudience;
  purpose: string;
  defaultRoleHints: ExploreRole[];
  interactionModes: InteractionMode[];
  defaultInteractionMode: InteractionMode;
  inputSchema: ExploreFilterConfig[];
  candidateTypes: CandidateType[];
  scoringModelLabel: string;
  resultCardSchemaLabel: string;
  openAiPromptContextLabel: string;
  caveats: string[];
  sampleQueries: string[];
  primaryCTA: string;
};

export type ExploreSelectedPointOrArea = {
  label: string;
  coordinates?: ExploreCoordinate;
  areaHint?: string;
};

export type ExploreFilters = Record<string, string | string[] | number | boolean>;

export type ExploreState = {
  selectedAudience: ExploreAudience;
  selectedRole: ExploreRole;
  selectedScenario: ExploreScenarioId;
  interactionMode: InteractionMode;
  naturalLanguageQuery: string;
  filters: ExploreFilters;
  selectedPointOrArea: ExploreSelectedPointOrArea | null;
  candidates: ExploreCandidate[];
  selectedCandidate: ExploreCandidate | null;
  compareList: ExploreCandidate[];
};
