import { evidenceReviewCaveat, type EvidenceReviewDecision, type EvidenceReviewStatus } from "@/src/types/evidence-review";
import type { AllowedClaimLevel, ValidationEvidence, ValidationSourceCategory } from "@/src/types/validation";

type PolicyInput = {
  evidence: ValidationEvidence;
  decision: EvidenceReviewDecision;
  currentStatus: EvidenceReviewStatus;
  notes?: string | null;
  expiresAt?: string | null;
  evidenceFileId?: string | null;
};

export type ReviewPolicyResult =
  | {
      ok: true;
      previousStatus: EvidenceReviewStatus;
      nextStatus: EvidenceReviewStatus;
      allowedClaimLevel: AllowedClaimLevel;
      limitations: string[];
      requiredNextAction: string;
    }
  | { ok: false; message: string; caveat: string };

const activeStatuses: EvidenceReviewStatus[] = [
  "uploaded_unreviewed",
  "in_review",
  "needs_more_evidence",
  "client_validated",
  "official_validated"
];

const officialSourceCategories: ValidationSourceCategory[] = [
  "dld_api_gateway",
  "geodubai_municipality",
  "dubai_municipality_planning",
  "dld_public_snapshot",
  "dubai_pulse_snapshot"
];

function normalizeStatus(status: string | null | undefined): EvidenceReviewStatus {
  if (status === "evidence_uploaded") return "uploaded_unreviewed";
  if (
    status === "not_started" ||
    status === "uploaded_unreviewed" ||
    status === "in_review" ||
    status === "needs_more_evidence" ||
    status === "client_validated" ||
    status === "official_validated" ||
    status === "rejected" ||
    status === "expired" ||
    status === "superseded"
  ) {
    return status;
  }
  return "not_started";
}

export function evidenceReviewStatusFromValidation(evidence: ValidationEvidence): EvidenceReviewStatus {
  return normalizeStatus(evidence.validationStatus);
}

export function requiredNextActionForReview(status: EvidenceReviewStatus) {
  switch (status) {
    case "uploaded_unreviewed":
      return "Start evidence review before changing validation posture.";
    case "in_review":
      return "Complete reviewer decision with notes and limitations.";
    case "needs_more_evidence":
      return "Request additional client or official evidence.";
    case "client_validated":
      return "Use only as client-provided screening evidence unless official validation is recorded.";
    case "official_validated":
      return "Retain official reference and monitor expiry.";
    case "rejected":
      return "Do not rely on this evidence; request replacement evidence.";
    case "expired":
      return "Request refreshed evidence before relying on this item.";
    case "superseded":
      return "Use the replacement evidence item.";
    default:
      return "Upload or register validation evidence.";
  }
}

function nextStatusForDecision(decision: EvidenceReviewDecision): EvidenceReviewStatus {
  switch (decision) {
    case "accept_for_screening":
    case "reset_to_review":
      return "in_review";
    case "request_more_evidence":
      return "needs_more_evidence";
    case "mark_client_validated":
      return "client_validated";
    case "mark_official_validated":
      return "official_validated";
    case "reject":
      return "rejected";
    case "expire":
      return "expired";
    case "supersede":
      return "superseded";
  }
}

function allowedClaimLevelForStatus(status: EvidenceReviewStatus): AllowedClaimLevel {
  if (status === "official_validated") return "official_validation_recorded";
  if (status === "client_validated") return "client_provided_evidence";
  if (status === "rejected" || status === "expired" || status === "superseded") return "not_supported";
  return "screening_only";
}

function notesRequired(input: PolicyInput) {
  return !input.notes || input.notes.trim().length < 6;
}

export function validateEvidenceReviewTransition(input: PolicyInput): ReviewPolicyResult {
  const previousStatus = normalizeStatus(input.currentStatus);
  const nextStatus = nextStatusForDecision(input.decision);

  if (previousStatus === "not_started" && !["accept_for_screening", "reset_to_review"].includes(input.decision)) {
    return { ok: false, message: "Start review before applying this evidence decision.", caveat: evidenceReviewCaveat };
  }

  if (previousStatus === "uploaded_unreviewed" && input.decision !== "accept_for_screening" && input.decision !== "reset_to_review") {
    return { ok: false, message: "Uploaded evidence must be marked in review before validation, rejection or expiry decisions.", caveat: evidenceReviewCaveat };
  }

  if (previousStatus === "rejected" && input.decision !== "reset_to_review") {
    return { ok: false, message: "Rejected evidence can only return to review when new evidence or a review reason is provided.", caveat: evidenceReviewCaveat };
  }

  if (activeStatuses.includes(previousStatus) && input.decision === "supersede") {
    return {
      ok: true,
      previousStatus,
      nextStatus,
      allowedClaimLevel: "not_supported",
      limitations: ["Superseded evidence no longer supports validation posture."],
      requiredNextAction: requiredNextActionForReview(nextStatus)
    };
  }

  if (input.decision === "mark_client_validated") {
    if (previousStatus !== "in_review") {
      return { ok: false, message: "Client validation can only be recorded from in-review evidence.", caveat: evidenceReviewCaveat };
    }
    if (notesRequired(input)) {
      return { ok: false, message: "Client validation requires reviewer notes.", caveat: evidenceReviewCaveat };
    }
  }

  if (input.decision === "mark_official_validated") {
    if (previousStatus !== "in_review") {
      return { ok: false, message: "Official validation can only be recorded from in-review evidence.", caveat: evidenceReviewCaveat };
    }
    if (notesRequired(input) || (!input.evidenceFileId && !input.evidence.referenceId)) {
      return { ok: false, message: "Official validation requires notes and a linked file or official reference.", caveat: evidenceReviewCaveat };
    }
    if (!officialSourceCategories.includes(input.evidence.sourceCategory) && input.evidence.accessMode !== "official_portal") {
      return { ok: false, message: "Official validation requires an official source category or official portal evidence.", caveat: evidenceReviewCaveat };
    }
  }

  if (input.decision === "reject" && notesRequired(input)) {
    return { ok: false, message: "Rejected evidence requires a reason.", caveat: evidenceReviewCaveat };
  }

  if (input.decision === "expire" && !input.expiresAt && notesRequired(input)) {
    return { ok: false, message: "Expired evidence requires an expiry date or reviewer note.", caveat: evidenceReviewCaveat };
  }

  return {
    ok: true,
    previousStatus,
    nextStatus,
    allowedClaimLevel: allowedClaimLevelForStatus(nextStatus),
    limitations: [
      evidenceReviewCaveat,
      nextStatus === "client_validated"
        ? "Client-validated evidence supports screening review only unless official validation is also recorded."
        : null,
      input.evidenceFileId ? null : "No binary evidence file is linked to this review decision."
    ].filter((item): item is string => Boolean(item)),
    requiredNextAction: requiredNextActionForReview(nextStatus)
  };
}
