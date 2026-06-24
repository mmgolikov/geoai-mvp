import type { AllowedClaimLevel, ValidationStatus } from "@/src/types/validation";

export const evidenceReviewCaveat =
  "Uploaded evidence requires review; it is not a legal, cadastral, zoning, planning, ownership or valuation conclusion.";

export type EvidenceReviewStatus =
  | "not_started"
  | "uploaded_unreviewed"
  | "in_review"
  | "needs_more_evidence"
  | "client_validated"
  | "official_validated"
  | "rejected"
  | "expired"
  | "superseded";

export type EvidenceReviewDecision =
  | "accept_for_screening"
  | "request_more_evidence"
  | "mark_client_validated"
  | "mark_official_validated"
  | "reject"
  | "expire"
  | "supersede"
  | "reset_to_review";

export type EvidenceReviewRecord = {
  id: string;
  organizationId?: string | null;
  projectId?: string | null;
  projectKey: string;
  validationEvidenceId: string;
  evidenceFileId?: string | null;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewerRole?: string | null;
  decision: EvidenceReviewDecision;
  previousStatus: EvidenceReviewStatus;
  nextStatus: EvidenceReviewStatus;
  notes: string;
  limitations: string[];
  allowedClaimLevel: AllowedClaimLevel;
  effectiveFrom?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  caveat: string;
};

export type EvidenceReviewSummary = {
  validationEvidenceId: string;
  latestStatus: EvidenceReviewStatus;
  latestDecision?: EvidenceReviewDecision | null;
  latestReviewer?: string | null;
  latestReviewedAt?: string | null;
  expiresAt?: string | null;
  isExpired: boolean;
  allowedClaimLevel: AllowedClaimLevel;
  requiredNextAction: string;
  caveat: string;
};

export function reviewStatusToValidationStatus(status: EvidenceReviewStatus): ValidationStatus {
  if (status === "uploaded_unreviewed") return "uploaded_unreviewed";
  if (status === "needs_more_evidence") return "evidence_requested";
  if (status === "superseded") return "expired";
  return status as ValidationStatus;
}
