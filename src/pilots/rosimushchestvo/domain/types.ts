export const DATASET_VERSION = "rosim-moscow-demo-v1" as const;
export const DATASET_SEED = "RF-MSK-DEMO-2026-07-31-v1" as const;
export const GENERATOR_VERSION = "rosim-fixture-v1" as const;
export const RULE_VERSION = "rosim-scenario-rules-v1" as const;
export const ACTION_QUEUE_STORAGE_KEY = "geoai:rosimushchestvo-demo:v1:actions" as const;

export type ValueProvenance =
  | "synthetic"
  | "derived"
  | "open_context"
  | "client_provided"
  | "unavailable";

export type VerificationStatus = "unverified_demo" | "incomplete" | "conflicting" | "not_applicable";

export type SourceAccessStatus =
  | "fixture_only"
  | "official_open"
  | "permission_required"
  | "licensed_aggregated_required"
  | "licensed_snapshot_required"
  | "unavailable";

export type SourceIntegrationStatus = "not_connected" | "fixture_only";
export type FreshnessStatus = "current_for_demo" | "stale" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";
export type TriState = "absent" | "present" | "unknown";

export type AssetArchetype =
  | "administrative_building"
  | "warehouse"
  | "land_plot"
  | "unfinished_construction"
  | "cultural_heritage"
  | "social_facility"
  | "industrial_site"
  | "built_in_premises"
  | "mixed_property_complex";

export type AssetUseStatus = "unused" | "underused" | "used" | "unknown";

export type DecisionAxisKey =
  | "actionReadiness"
  | "marketDemand"
  | "transportAccessibility"
  | "useUpliftPotential"
  | "constraintSeverity"
  | "monitoringRisk"
  | "dataConfidence";

export interface LineageRef {
  id: string;
  label: string;
  provenance: ValueProvenance;
  verificationStatus: VerificationStatus;
  freshness: FreshnessStatus;
}

export interface DecisionAxis {
  key: DecisionAxisKey;
  label: string;
  value: number | null;
  direction: "higher_is_better" | "higher_is_worse";
  explanation: string;
  inputRefs: string[];
  methodVersion: string;
  provenance: "synthetic";
  confidence: ConfidenceLevel;
  freshness: FreshnessStatus;
}

export interface AssetObservation {
  id: string;
  label: string;
  value: string | number | boolean | null;
  provenance: ValueProvenance;
  verificationStatus: VerificationStatus;
  freshness: FreshnessStatus;
  sourceRef: string;
  observedAtLabel: string;
}

export interface AssetConflict {
  id: string;
  label: string;
  versions: Array<{ label: string; value: string; sourceRef: string }>;
  scenarioChanging: boolean;
  resolved: false;
}

export interface DemoAsset {
  id: `DEMO-RF-MSK-${string}`;
  demoRegistryReference: `77:DEMO:${string}`;
  cadastralNumber: null;
  title: string;
  archetype: AssetArchetype;
  district: string;
  zoneLabel: string;
  coordinates: readonly [number, number];
  areaSquareMeters: number | null;
  metroWalkMinutes: number | null;
  useStatus: AssetUseStatus;
  criticalConstraint: TriState;
  verificationStatus: VerificationStatus;
  freshness: FreshnessStatus;
  axes: Record<DecisionAxisKey, DecisionAxis>;
  observations: AssetObservation[];
  conflicts: AssetConflict[];
  blockers: string[];
  criticalBlocker: boolean;
  missingInputs: string[];
  nonCriticalIncomplete: boolean;
}

export type ScenarioGroup =
  | "expert_review_only"
  | "start_preliminary_work"
  | "promising_after_check"
  | "not_in_preliminary_selection";

export type OwnerRole =
  | "Руководитель / центральный аппарат"
  | "Территориальное управление"
  | "Куратор объекта / портфеля"
  | "Реестровый / правовой эксперт"
  | "Эксперт по реализации / оценке"
  | "Инспектор / мониторинг"
  | "Аналитик данных"
  | "Аудитор / наблюдатель";

export interface ScenarioAssessment {
  assetId: DemoAsset["id"];
  group: ScenarioGroup;
  methodVersion: string;
  ruleVersion: typeof RULE_VERSION;
  inputRefs: string[];
  provenance: "derived";
  triggeredConditions: string[];
  failedConditions: string[];
  missingInputs: string[];
  primaryHypothesis: string;
  alternativeHypothesis: string;
  blockers: string[];
  confidence: ConfidenceLevel;
  nextAction: string;
  actionType: string;
  ownerRole: OwnerRole;
  dueInBusinessDays: number;
}

export interface DerivedReceipt {
  methodVersion: string;
  ruleVersion: typeof RULE_VERSION;
  inputRefs: string[];
  confidence: ConfidenceLevel;
  provenance: "derived";
}

export interface MainQueryResult {
  ordered: Array<{ asset: DemoAsset; assessment: ScenarioAssessment; receipt: DerivedReceipt }>;
  selectedIds: DemoAsset["id"][];
  groupCounts: Record<ScenarioGroup, number>;
}

export type UnknownPolicy = "separate_for_confirmation" | "exclude";

export interface CustomQuery {
  useStatus: AssetUseStatus | "any";
  minimumAreaSquareMeters: number | null;
  maximumAreaSquareMeters: number | null;
  maximumMetroWalkMinutes: number | null;
  criticalConstraint: TriState | "exclude_confirmed_present" | "any";
  scenario: "engagement" | "monitoring" | "registry_quality" | "non_use" | "any";
  minimumDataConfidence: number | null;
  unknownPolicy: UnknownPolicy;
}

export type CustomMatchGroup = "matches" | "requires_confirmation" | "does_not_match";

export interface CustomQueryEvaluation {
  asset: DemoAsset;
  group: CustomMatchGroup;
  reasons: string[];
}

export interface CustomQueryResult {
  query: CustomQuery;
  groups: Record<CustomMatchGroup, CustomQueryEvaluation[]>;
}

export interface RoleConfiguration {
  role: OwnerRole;
  firstBlock: string;
  kpiEmphasis: string[];
  actionPriority: string;
}

export interface SourceCatalogueEntry {
  id: string;
  sourceName: string;
  integrationStatus: SourceIntegrationStatus;
  sourceAccessStatus: SourceAccessStatus;
  intendedUse: string;
  snapshotRuntimeStatus: string;
  freshness: FreshnessStatus;
  licensePermissionNote: string;
  prototypeLimitation: string;
}

export interface DemoAction {
  objectId: DemoAsset["id"];
  objectTitle: string;
  actionType: string;
  demoAction: string;
  basis: string;
  ownerRole: OwnerRole;
  dueInBusinessDays: number;
  status: "Новая";
}

export type DemoState =
  | "normal"
  | "map-error"
  | "zero-results"
  | "stale"
  | "permission-required"
  | "unavailable"
  | "conflict"
  | "critical";

export const DECISION_AXIS_KEYS: DecisionAxisKey[] = [
  "actionReadiness",
  "marketDemand",
  "transportAccessibility",
  "useUpliftPotential",
  "constraintSeverity",
  "monitoringRisk",
  "dataConfidence"
];

export const DEFAULT_CUSTOM_QUERY: CustomQuery = {
  useStatus: "unused",
  minimumAreaSquareMeters: 1000,
  maximumAreaSquareMeters: null,
  maximumMetroWalkMinutes: 15,
  criticalConstraint: "exclude_confirmed_present",
  scenario: "engagement",
  minimumDataConfidence: null,
  unknownPolicy: "separate_for_confirmation"
};
