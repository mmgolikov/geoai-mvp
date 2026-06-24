export const decisionScoreCaveat =
  "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type DecisionScoreMode = "openai" | "deterministic_fallback";

export type DecisionPosture =
  | "proceed_with_conditions"
  | "compare_alternatives"
  | "validate_first"
  | "monitor"
  | "reject_or_pause";

export type RecommendedUse =
  | "residential"
  | "serviced_apartments"
  | "hotel"
  | "mixed_use"
  | "logistics_light_industrial"
  | "office"
  | "retail"
  | "hold_validate"
  | "compare_first"
  | "unknown";

export type DecisionScoreConfidence = "low" | "medium" | "high";

export type DecisionScoreResult = {
  mode: DecisionScoreMode;
  decisionPosture: DecisionPosture;
  recommendedUse: RecommendedUse;
  suitabilityScore: number;
  riskScore: number;
  confidence: DecisionScoreConfidence;
  evidenceUsed: string[];
  keyDrivers: string[];
  keyRisks: string[];
  validationRequired: string[];
  nextActions: string[];
  caveat: string;
  forbiddenClaimsAvoided: boolean;
  unsupportedClaims: string[];
};

export type DecisionScoreRequest = {
  projectKey?: string | null;
  target?: unknown;
  scenarioId?: string;
  scenarioLabel?: string;
  customQuery?: string;
  deterministicScores?: Record<string, number>;
  marketMetricsContext?: unknown;
  externalDataLineage?: unknown;
  dataRoomContext?: unknown;
  pilotContext?: unknown;
  validationSummary?: unknown;
  validationEvidence?: unknown;
  claimPolicy?: unknown;
  validationGaps?: string[];
  evidence?: Array<{ id?: string; sourceId?: string; title?: string; description?: string }>;
};

export const decisionPostures: DecisionPosture[] = [
  "proceed_with_conditions",
  "compare_alternatives",
  "validate_first",
  "monitor",
  "reject_or_pause"
];

export const recommendedUses: RecommendedUse[] = [
  "residential",
  "serviced_apartments",
  "hotel",
  "mixed_use",
  "logistics_light_industrial",
  "office",
  "retail",
  "hold_validate",
  "compare_first",
  "unknown"
];

export const decisionScoreConfidenceLevels: DecisionScoreConfidence[] = ["low", "medium", "high"];
