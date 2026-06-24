export const validationRequiredCaveat =
  "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export type ValidationSourceCategory =
  | "dld_public_snapshot"
  | "dld_api_gateway"
  | "dubai_pulse_snapshot"
  | "geodubai_municipality"
  | "dubai_municipality_planning"
  | "client_uploaded_document"
  | "client_uploaded_dataset"
  | "licensed_market_data"
  | "licensed_valuation"
  | "field_inspection"
  | "satellite_observation"
  | "internal_bank_record"
  | "broker_comparable"
  | "developer_document"
  | "other";

export type ValidationAccessMode =
  | "open_snapshot"
  | "manual_import"
  | "permission_required"
  | "client_provided"
  | "licensed"
  | "official_portal"
  | "planned_validation"
  | "unavailable";

export type ValidationStatus =
  | "not_started"
  | "evidence_requested"
  | "uploaded_unreviewed"
  | "evidence_uploaded"
  | "in_review"
  | "client_validated"
  | "official_validated"
  | "rejected"
  | "expired"
  | "not_applicable";

export type ValidationConfidence = "unknown" | "low" | "medium" | "high";

export type AllowedClaimLevel =
  | "screening_only"
  | "client_provided_evidence"
  | "official_evidence_uploaded"
  | "official_validation_recorded"
  | "not_supported";

export type ValidationEvidence = {
  id: string;
  organizationId?: string | null;
  projectId?: string | null;
  projectKey: string;
  linkedAoiIds?: string[];
  linkedAnalysisIds?: string[];
  linkedReportIds?: string[];
  linkedDataRoomAssetIds?: string[];
  linkedEvidenceFileIds?: string[];
  sourceCategory: ValidationSourceCategory;
  sourceName: string;
  accessMode: ValidationAccessMode;
  validationStatus: ValidationStatus;
  confidence: ValidationConfidence;
  allowedClaimLevel: AllowedClaimLevel;
  title: string;
  description: string;
  documentDate?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  expiryDate?: string | null;
  referenceId?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  sourceUrl?: string | null;
  limitations: string[];
  allowedClaims: string[];
  forbiddenClaims: string[];
  caveat: string;
  createdAt: string;
  updatedAt: string;
};

export type OfficialConnectorCurrentStatus =
  | "manual_snapshot_ready"
  | "permission_required"
  | "planned_validation"
  | "client_document_required";

export type OfficialConnectorReadiness = {
  id: string;
  name: string;
  provider: string;
  sourceCategory: ValidationSourceCategory;
  accessMode: ValidationAccessMode;
  currentStatus: OfficialConnectorCurrentStatus;
  credentialRequired: boolean;
  agreementRequired: boolean;
  currentImplementation: string;
  whatItCanSupport: string[];
  whatItCannotSupport: string[];
  allowedClaims: string[];
  forbiddenClaims: string[];
  nextStep: string;
  caveat: string;
};

export type ValidationSummary = {
  totalEvidence: number;
  evidenceByStatus: Record<ValidationStatus, number>;
  evidenceBySourceCategory: Partial<Record<ValidationSourceCategory, number>>;
  officialValidatedCount: number;
  clientValidatedCount: number;
  inReviewCount: number;
  expiredCount: number;
  rejectedCount: number;
  requiredValidationGaps: string[];
  highestAllowedClaimLevel: AllowedClaimLevel;
  blockers: string[];
  nextActions: string[];
  caveat: string;
};

export type ClaimPolicy = {
  allowedClaimLevel: AllowedClaimLevel;
  allowedPhrases: string[];
  forbiddenPhrases: string[];
  requiredCaveats: string[];
  unsupportedClaims: string[];
  confidenceCap: ValidationConfidence;
};
