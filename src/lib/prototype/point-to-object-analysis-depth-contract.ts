export type PointObjectAnalysisDepth = "quick" | "standard" | "deep";

export type PointObjectDepthPurpose = "identity_evidence" | "decision_criteria" | "decision_challenge";

export type PointObjectDepthSelectionCounts = {
  decisionReasons: number;
  signals: number;
  opportunities: number;
  risks: number;
};

export type PointObjectDepthPlanCounts = {
  criteria: number;
  alternatives: number;
  counterEvidence: number;
  decisionTriggers: number;
};

export type PointObjectAnalysisDepthContract = {
  depth: PointObjectAnalysisDepth;
  purpose: PointObjectDepthPurpose;
  selectionCounts: PointObjectDepthSelectionCounts;
  reviewCounts: PointObjectDepthPlanCounts;
  instruction: string;
};

export type PointObjectDepthAnalyticCheck = {
  title: string;
  observation: string;
  implication: string;
  evidenceClass: "observed" | "derived" | "hypothesis";
  evidenceRefs: string[];
  confidence: "low" | "medium";
};

export type PointObjectDepthAlternative = {
  title: string;
  rationale: string;
  evidenceClass: "hypothesis";
  evidenceRefs: string[];
};

export type PointObjectDepthUncertainty = {
  title: string;
  statement: string;
  decisionImpact: string;
  evidenceRefs: string[];
};

export type PointObjectDepthDecisionTrigger = {
  title: string;
  action: string;
  decisionImpact: string;
  evidenceRefs: string[];
};

export type PointObjectDepthReview = {
  depth: PointObjectAnalysisDepth;
  basis: "structured_review_of_existing_evidence";
  purpose: PointObjectDepthPurpose;
  analyticChecks: PointObjectDepthAnalyticCheck[];
  alternatives: PointObjectDepthAlternative[];
  uncertainties: PointObjectDepthUncertainty[];
  decisionTriggers: PointObjectDepthDecisionTrigger[];
};

export const POINT_OBJECT_ANALYSIS_DEPTH_CONTRACT_VERSION = "POINT_OBJECT_DEPTH_CONTRACT_V1_2026_09_12" as const;

const DEPTH_CONTRACTS: Record<PointObjectAnalysisDepth, PointObjectAnalysisDepthContract> = {
  quick: {
    depth: "quick",
    purpose: "identity_evidence",
    selectionCounts: { decisionReasons: 2, signals: 3, opportunities: 1, risks: 2 },
    reviewCounts: { criteria: 2, alternatives: 0, counterEvidence: 1, decisionTriggers: 1 },
    instruction: "Prioritise resolved identity, directly observed mapped evidence, source sufficiency and the single safest next decision gate. Do not select alternative decision paths."
  },
  standard: {
    depth: "standard",
    purpose: "decision_criteria",
    selectionCounts: { decisionReasons: 3, signals: 4, opportunities: 2, risks: 3 },
    reviewCounts: { criteria: 3, alternatives: 1, counterEvidence: 2, decisionTriggers: 2 },
    instruction: "Prioritise criteria relevant to the requested goal, perspective and horizon, their implications, one supported alternative path and the evidence gates that control the next decision."
  },
  deep: {
    depth: "deep",
    purpose: "decision_challenge",
    selectionCounts: { decisionReasons: 4, signals: 5, opportunities: 3, risks: 3 },
    reviewCounts: { criteria: 4, alternatives: 2, counterEvidence: 3, decisionTriggers: 3 },
    instruction: "Challenge the primary path with distinct supported alternative paths, counter-evidence and uncertainties, then select the evidence gates most likely to change the decision. Do not manufacture additional facts or research."
  }
};

export function pointObjectAnalysisDepthContract(depth: PointObjectAnalysisDepth): PointObjectAnalysisDepthContract {
  return DEPTH_CONTRACTS[depth];
}
