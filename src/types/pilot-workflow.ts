export const pilotWorkflowCaveat =
  "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export const pilotWorkflowReadinessCaveat =
  "Readiness reflects workflow completeness only; it is not an investment, legal, planning or valuation conclusion.";

export const pilotWorkflowStorageCaveat = "Local/API fallback is not durable production storage.";

export type PilotClientType =
  | "fund"
  | "developer"
  | "bank"
  | "government"
  | "infrastructure_operator"
  | "insurer"
  | "other";

export type PilotUseCase =
  | "investment_screening"
  | "development_site_selection"
  | "construction_monitoring"
  | "asset_portfolio_review"
  | "land_monitoring"
  | "climate_risk_screening";

export type PilotStage =
  | "draft"
  | "configured"
  | "data_collection"
  | "analysis_in_progress"
  | "validation_in_progress"
  | "deliverables_ready_for_review"
  | "completed_with_caveats";

export type ClientInputType =
  | "target_aoi"
  | "asset_list"
  | "investment_thesis"
  | "development_brief"
  | "market_comps"
  | "planning_documents"
  | "ownership_documents"
  | "construction_schedule"
  | "risk_policy"
  | "report_template"
  | "other";

export type ClientInputStatus =
  | "missing"
  | "requested"
  | "provided_unvalidated"
  | "in_review"
  | "accepted_for_screening"
  | "blocked"
  | "not_applicable";

export type PilotPriority = "high" | "medium" | "low";

export type PilotDeliverableType =
  | "workspace_dashboard"
  | "aoi_library"
  | "screening_analysis"
  | "comparison_dashboard"
  | "investment_memo"
  | "development_memo"
  | "validation_checklist"
  | "source_lineage_pack"
  | "client_data_room_summary"
  | "executive_summary";

export type PilotDeliverableWorkflowStatus =
  | "planned"
  | "in_progress"
  | "generated"
  | "ready_for_review"
  | "validation_required"
  | "blocked";

export type PilotReadinessLabel =
  | "setup_required"
  | "data_required"
  | "analysis_ready"
  | "validation_required"
  | "review_ready_with_caveats";

export type PilotWorkflow = {
  id: string;
  projectId?: string | null;
  projectKey: string;
  title: string;
  clientType: PilotClientType;
  useCase: PilotUseCase;
  geography: string;
  decisionQuestion: string;
  pilotStage: PilotStage;
  startedAt: string;
  updatedAt: string;
  targetDecisionDate?: string | null;
  owner?: string | null;
  caveat: string;
};

export type ClientInputItem = {
  id: string;
  projectId?: string | null;
  projectKey: string;
  title: string;
  inputType: ClientInputType;
  required: boolean;
  status: ClientInputStatus;
  priority: PilotPriority;
  linkedDataRoomAssetIds?: string[];
  linkedAoiIds?: string[];
  notes?: string;
  caveat: string;
};

export type PilotDeliverableStatus = {
  id: string;
  projectId?: string | null;
  projectKey: string;
  title: string;
  deliverableType: PilotDeliverableType;
  status: PilotDeliverableWorkflowStatus;
  linkedAnalysisIds?: string[];
  linkedReportIds?: string[];
  linkedComparisonIds?: string[];
  linkedAoiIds?: string[];
  linkedDataRoomAssetIds?: string[];
  nextAction: string;
  caveat: string;
};

export type PilotReadinessDriver = {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  note: string;
};

export type PilotReadinessSummary = {
  score: number;
  label: PilotReadinessLabel;
  drivers: PilotReadinessDriver[];
  blockers: string[];
  nextActions: string[];
  caveat: string;
  storageCaveat: string;
};

export type PilotWorkflowDataHonesty = {
  caveat: string;
  readinessCaveat: string;
  storageCaveat: string;
  forbiddenClaims: string[];
};

export type PilotWorkflowSummary = {
  ok: boolean;
  mode: "local_fallback";
  storageCaveat: string;
  projectId?: string | null;
  projectKey: string;
  workflow: PilotWorkflow | null;
  clientInputs: ClientInputItem[];
  deliverables: PilotDeliverableStatus[];
  readiness: PilotReadinessSummary | null;
  dataHonesty: PilotWorkflowDataHonesty;
  error?: string | null;
};
