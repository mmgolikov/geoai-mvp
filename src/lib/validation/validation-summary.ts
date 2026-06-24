import {
  validationRequiredCaveat,
  type AllowedClaimLevel,
  type ValidationEvidence,
  type ValidationSourceCategory,
  type ValidationStatus,
  type ValidationSummary
} from "@/src/types/validation";

export const validationStatuses: ValidationStatus[] = [
  "not_started",
  "evidence_requested",
  "uploaded_unreviewed",
  "evidence_uploaded",
  "in_review",
  "client_validated",
  "official_validated",
  "rejected",
  "expired",
  "not_applicable"
];

const claimRank: Record<AllowedClaimLevel, number> = {
  not_supported: 0,
  screening_only: 1,
  client_provided_evidence: 2,
  official_evidence_uploaded: 3,
  official_validation_recorded: 4
};

export function highestAllowedClaimLevel(evidence: ValidationEvidence[]): AllowedClaimLevel {
  return evidence.reduce<AllowedClaimLevel>((best, item) =>
    claimRank[item.allowedClaimLevel] > claimRank[best] ? item.allowedClaimLevel : best,
    "screening_only"
  );
}

export function buildValidationSummary(evidence: ValidationEvidence[]): ValidationSummary {
  const evidenceByStatus = validationStatuses.reduce((acc, status) => {
    acc[status] = evidence.filter((item) => item.validationStatus === status).length;
    return acc;
  }, {} as Record<ValidationStatus, number>);
  const evidenceBySourceCategory: Partial<Record<ValidationSourceCategory, number>> = {};
  for (const item of evidence) {
    evidenceBySourceCategory[item.sourceCategory] = (evidenceBySourceCategory[item.sourceCategory] ?? 0) + 1;
  }

  const officialValidatedCount = evidenceByStatus.official_validated;
  const clientValidatedCount = evidenceByStatus.client_validated;
  const inReviewCount = evidenceByStatus.in_review + evidenceByStatus.uploaded_unreviewed + evidenceByStatus.evidence_uploaded;
  const expiredCount = evidenceByStatus.expired;
  const rejectedCount = evidenceByStatus.rejected;
  const requiredValidationGaps = [
    officialValidatedCount === 0 ? "Official ownership/title validation" : null,
    officialValidatedCount === 0 ? "Official zoning/planning validation" : null,
    officialValidatedCount === 0 ? "Official cadastral/parcel validation" : null,
    clientValidatedCount + officialValidatedCount === 0 ? "Client or licensed valuation/comparable evidence" : null
  ].filter((item): item is string => Boolean(item));

  return {
    totalEvidence: evidence.length,
    evidenceByStatus,
    evidenceBySourceCategory,
    officialValidatedCount,
    clientValidatedCount,
    inReviewCount,
    expiredCount,
    rejectedCount,
    requiredValidationGaps,
    highestAllowedClaimLevel: highestAllowedClaimLevel(evidence),
    blockers: [
      ...requiredValidationGaps.slice(0, 3),
      rejectedCount > 0 ? `${rejectedCount} validation evidence item(s) rejected.` : null,
      expiredCount > 0 ? `${expiredCount} validation evidence item(s) expired.` : null
    ].filter((item): item is string => Boolean(item)),
    nextActions: [
      "Register client-provided or official evidence metadata.",
      "Review evidence and update validation status conservatively.",
      "Keep official validation items incomplete until official evidence is recorded."
    ],
    caveat: validationRequiredCaveat
  };
}
