import type { RepositoryMode } from "@/src/lib/repositories/repository-mode";

export const reportPackageRequiredCaveat =
  "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export const reportPackageDecisionSupportCaveat =
  "Report packages are decision-support deliverables, not certified valuation, legal, zoning, planning, cadastral or ownership conclusions.";

export const reportPackagePdfWorkflowCaveat =
  "Browser print/save as PDF remains the current PDF workflow.";

export type ReportPackageType =
  | "investment_screening"
  | "development_feasibility"
  | "bank_asset_review"
  | "comparison_memo"
  | "validation_pack"
  | "data_room_summary"
  | "executive_board_pack";

export type ReportPackageStatus =
  | "draft"
  | "generated"
  | "ready_for_review"
  | "validation_required"
  | "superseded";

export type ReportPackageSectionStatus =
  | "complete"
  | "generated"
  | "ready_for_review"
  | "validation_required"
  | "sample_fallback"
  | "missing";

export type ReportPackageSectionType =
  | "executive_memo"
  | "aoi_factsheet"
  | "ai_decision_memo"
  | "deterministic_scoring"
  | "market_context"
  | "source_lineage"
  | "validation_appendix"
  | "evidence_review"
  | "data_room_summary"
  | "pilot_workflow"
  | "comparison_memo"
  | "limitations"
  | "export_manifest";

export type ReportPackageArtifact = {
  label: string;
  route?: string;
  id?: string;
  type: "printable_route" | "json_route" | "geojson_aoi_route" | "report_route" | "evidence_file" | "metadata";
  caveat?: string;
};

export type ReportExportManifest = {
  packageKey: string;
  generatedAt: string;
  artifacts: ReportPackageArtifact[];
  storageMode: RepositoryMode;
  caveats: string[];
};

export type ReportPackageSourceLineageItem = {
  id: string;
  name: string;
  category: string;
  mode: "sample_fallback" | "imported_snapshot" | "api_context" | "permission_required" | "planned_validation" | "generated_by_geoai";
  recordCount?: number | null;
  confidence: string;
  limitation: string;
  caveat: string;
};

export type ReportPackageValidationSummary = {
  totalEvidence: number;
  officialValidatedCount: number;
  clientValidatedCount: number;
  inReviewCount: number;
  highestAllowedClaimLevel: string;
  blockers: string[];
  nextActions: string[];
  caveat: string;
};

export type ReportPackageEvidenceReviewSummary = {
  totalReviews: number;
  reviewedEvidenceCount: number;
  blockerCount: number;
  latestStatus: string;
  reviewNotes: Array<{
    validationEvidenceId: string;
    status: string;
    decision: string | null;
    reviewer: string | null;
    reviewedAt: string | null;
    requiredNextAction: string;
  }>;
  caveat: string;
};

export type ReportPackageSection = {
  id: string;
  type: ReportPackageSectionType;
  title: string;
  summary: string;
  status: ReportPackageSectionStatus;
  content: Record<string, unknown>;
  linkedEntityIds: string[];
  caveat: string;
  order: number;
};

export type ReportPackage = {
  id: string;
  packageKey: string;
  projectId?: string | null;
  projectKey: string;
  title: string;
  packageType: ReportPackageType;
  status: ReportPackageStatus;
  version: string;
  generatedAt: string;
  generatedBy?: string | null;
  linkedAoiIds: string[];
  linkedAnalysisIds: string[];
  linkedReportIds: string[];
  linkedComparisonIds: string[];
  linkedValidationEvidenceIds: string[];
  linkedEvidenceFileIds: string[];
  linkedDataRoomAssetIds: string[];
  sections: ReportPackageSection[];
  sourceLineage: ReportPackageSourceLineageItem[];
  validationSummary: ReportPackageValidationSummary;
  evidenceReviewSummary: ReportPackageEvidenceReviewSummary;
  exportManifest: ReportExportManifest;
  caveat: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportPackageBuildInput = {
  projectKey: string;
  projectId?: string | null;
  packageType?: ReportPackageType;
  analysisId?: string | null;
  reportId?: string | null;
  comparisonId?: string | null;
  aoiId?: string | null;
  includeDataRoom?: boolean;
  includeValidation?: boolean;
  includeEvidenceReview?: boolean;
  includePilotWorkflow?: boolean;
  generatedBy?: string | null;
};
