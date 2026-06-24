import type { GeoAIProject, ProjectClientType } from "@/src/lib/db/types";

export const dataRoomRequiredCaveat =
  "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export const dataRoomStorageCaveat = "Local/API fallback is not durable production storage.";

export type DataRoomAssetType =
  | "aoi"
  | "uploaded_geojson"
  | "uploaded_csv"
  | "uploaded_document"
  | "analysis"
  | "report"
  | "comparison"
  | "external_source"
  | "validation_note";

export type DataRoomSourceType =
  | "user_uploaded"
  | "user_drawn"
  | "generated_by_geoai"
  | "sample_fallback"
  | "public_snapshot"
  | "api_context"
  | "planned_validation"
  | "permission_required";

export type DataRoomValidationStatus =
  | "validation_required"
  | "client_provided_unvalidated"
  | "sample_fallback"
  | "ready_for_review"
  | "planned_official_validation";

export type ValidationChecklistCategory =
  | "market"
  | "parcel"
  | "zoning"
  | "ownership"
  | "planning"
  | "climate"
  | "infrastructure"
  | "client_data"
  | "report";

export type ValidationChecklistStatus =
  | "not_started"
  | "required"
  | "in_review"
  | "completed"
  | "blocked"
  | "not_applicable";

export type ValidationChecklistPriority = "high" | "medium" | "low";

export type PilotDeliverableType =
  | "screening_dashboard"
  | "aoi_library"
  | "comparison_memo"
  | "investment_memo"
  | "validation_checklist"
  | "source_lineage_pack"
  | "data_room_summary";

export type PilotDeliverableStatus =
  | "planned"
  | "in_progress"
  | "generated"
  | "validation_required";

export type DataRoomAsset = {
  id: string;
  projectId?: string | null;
  projectKey: string;
  name: string;
  description?: string;
  assetType: DataRoomAssetType;
  sourceType: DataRoomSourceType;
  linkedAoiIds?: string[];
  linkedAnalysisIds?: string[];
  linkedReportIds?: string[];
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  storageProvider?: "supabase_storage" | "local_metadata_only" | "disabled";
  objectStatus?: string;
  linkedValidationEvidenceIds?: string[];
  downloadAvailable?: boolean;
  validationStatus: DataRoomValidationStatus;
  createdAt: string;
  updatedAt: string;
  caveat: string;
};

export type ValidationChecklistItem = {
  id: string;
  projectId?: string | null;
  projectKey: string;
  title: string;
  category: ValidationChecklistCategory;
  status: ValidationChecklistStatus;
  priority: ValidationChecklistPriority;
  description: string;
  linkedAssetIds?: string[];
  caveat: string;
};

export type PilotDeliverable = {
  id: string;
  projectId?: string | null;
  projectKey: string;
  title: string;
  deliverableType: PilotDeliverableType;
  status: PilotDeliverableStatus;
  linkedReportIds?: string[];
  linkedAnalysisIds?: string[];
  linkedAoiIds?: string[];
  nextAction: string;
  caveat: string;
};

export type DataRoomSummaryCounts = {
  aois: number;
  uploadedDatasets: number;
  uploadedDocuments: number;
  analyses: number;
  reports: number;
  comparisons: number;
  validationItems: number;
  externalSources: number;
};

export type DataRoomReadinessSummary = {
  label: string;
  storageMode: "local_fallback";
  storageNote: string;
  validationNote: string;
  latestAssets: DataRoomAsset[];
  checklistStatus: {
    completed: number;
    required: number;
    inReview: number;
    blocked: number;
    total: number;
  };
};

export type DataRoomDataHonesty = {
  caveat: string;
  storageCaveat: string;
  allowedLabels: string[];
  forbiddenClaims: string[];
};

export type ClientDataRoom = {
  ok: boolean;
  mode: "local_fallback";
  storageCaveat: string;
  projectId?: string | null;
  projectKey: string;
  project?: GeoAIProject | null;
  projectClientType?: ProjectClientType;
  assets: DataRoomAsset[];
  checklist: ValidationChecklistItem[];
  deliverables: PilotDeliverable[];
  summary: DataRoomReadinessSummary & { counts: DataRoomSummaryCounts };
  dataHonesty: DataRoomDataHonesty;
  error?: string | null;
};
