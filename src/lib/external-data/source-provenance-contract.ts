export const SOURCE_PROVENANCE_CONTRACT_VERSION = "1.0" as const;

export const SOURCE_PROVENANCE_CAVEAT =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion." as const;

export const sourceReleaseDataModes = [
  "local_snapshot",
  "open_snapshot",
  "user_provided_snapshot",
  "sample_fallback",
  "metadata_only"
] as const;

export type SourceReleaseDataMode = (typeof sourceReleaseDataModes)[number];

export const sourceRightsStatuses = [
  "unreviewed",
  "approved",
  "restricted",
  "prohibited"
] as const;

export type SourceRightsStatus = (typeof sourceRightsStatuses)[number];

export const sourceValidationStatuses = [
  "unverified",
  "schema_validated",
  "source_reviewed",
  "client_validated",
  "quarantined"
] as const;

export type SourceValidationStatus = (typeof sourceValidationStatuses)[number];

export const sourceFreshnessStatuses = [
  "unknown",
  "current",
  "aging",
  "stale",
  "not_applicable"
] as const;

export type SourceFreshnessStatus = (typeof sourceFreshnessStatuses)[number];

export const sourceCustodyStatuses = [
  "not_recorded",
  "local_manifest_recorded",
  "immutable_receipt_recorded",
  "quarantined"
] as const;

export type SourceCustodyStatus = (typeof sourceCustodyStatuses)[number];

export const sourceEvidenceStates = ["unverified", "partial", "verified", "not_applicable"] as const;

export type SourceEvidenceState = (typeof sourceEvidenceStates)[number];

export const sourceConfidenceLevels = ["insufficient", "low", "medium", "high"] as const;

export type SourceConfidenceLevel = (typeof sourceConfidenceLevels)[number];

export type SourceEvidenceDimensions = {
  sourceIdentity: SourceEvidenceState;
  artifactIntegrity: SourceEvidenceState;
  temporalLineage: SourceEvidenceState;
  rights: SourceEvidenceState;
  schema: SourceEvidenceState;
  content: SourceEvidenceState;
  custody: SourceEvidenceState;
};

export type SourceDerivedConfidence = {
  method: "evidence_dimensions_v1";
  dimensions: SourceEvidenceDimensions;
  score: number;
  level: SourceConfidenceLevel;
  capsApplied: string[];
};

export type SourceRightsEvidence = {
  status: SourceRightsStatus;
  licenseId: string | null;
  licenseUrl: string | null;
  licenseNote: string;
  attributionNote: string;
  reviewedAt: string | null;
  permittedUses: string[];
  prohibitedUses: string[];
};

export type SourceFreshnessEvidence = {
  status: SourceFreshnessStatus;
  referenceTimestamp: string | null;
  evaluatedAt: string | null;
  maximumAgeDays: number | null;
  ageDays: number | null;
  policyId: string | null;
};

export type SourceCustodyReceipt = {
  status: SourceCustodyStatus;
  receiptId: string | null;
  receiptSha256: string | null;
  recordedAt: string | null;
  repository: string | null;
};

export type SourceArtifactEvidence = {
  path: string;
  mediaType: string;
  contentSha256: string;
  sourceUriSha256: string | null;
  schemaSha256: string | null;
  byteCount: number;
  recordCount: number | null;
  featureCount: number | null;
};

export type SourceReleaseProvenance = {
  contractVersion: typeof SOURCE_PROVENANCE_CONTRACT_VERSION;
  releaseId: string;
  releaseVersion: string;
  schemaVersion: string;
  sourceGroupId: string;
  sourceGroupName: string;
  sourceId: string;
  sourceName: string;
  originUrl: string;
  originHost: string;
  artifact: SourceArtifactEvidence;
  generatedAt: string | null;
  extractedAt: string | null;
  publishedAt: string | null;
  rights: SourceRightsEvidence;
  dataMode: SourceReleaseDataMode;
  confidence: SourceDerivedConfidence;
  validationStatus: SourceValidationStatus;
  caveat: typeof SOURCE_PROVENANCE_CAVEAT;
  nextValidationStep: string;
  blockers: string[];
  freshness: SourceFreshnessEvidence;
  custodyReceipt: SourceCustodyReceipt;
};

export const sourceReleaseUseStates = ["allowed", "blocked"] as const;

export type SourceReleaseUseState = (typeof sourceReleaseUseStates)[number];

export type SourceReleaseGate = {
  structurallyValid: boolean;
  screeningContextAvailable: boolean;
  decisionUse: SourceReleaseUseState;
  blockers: string[];
};

export type SourceConfidenceInput = Pick<
  SourceReleaseProvenance,
  "dataMode" | "rights" | "validationStatus" | "freshness" | "custodyReceipt"
> & {
  dimensions: SourceEvidenceDimensions;
};

const evidenceWeights: Record<Exclude<SourceEvidenceState, "not_applicable">, number> = {
  unverified: 0,
  partial: 0.5,
  verified: 1
};

const confidenceOrder: SourceConfidenceLevel[] = ["insufficient", "low", "medium", "high"];
const decisionEvidenceDimensions: Array<keyof SourceEvidenceDimensions> = [
  "sourceIdentity",
  "artifactIntegrity",
  "temporalLineage",
  "rights",
  "schema",
  "content",
  "custody"
];
const decisionScoringUsePattern =
  /(?:source[- ]backed\s+)?(?:decision|analysis|suitability|candidate)[- ](?:scor(?:e|ing)|rank(?:ing)?|use)|source[- ]backed[- ]scor(?:e|ing)/i;

function minimumConfidence(
  current: SourceConfidenceLevel,
  cap: SourceConfidenceLevel
): SourceConfidenceLevel {
  return confidenceOrder[Math.min(confidenceOrder.indexOf(current), confidenceOrder.indexOf(cap))];
}

export function deriveSourceConfidence(input: SourceConfidenceInput): SourceDerivedConfidence {
  const applicableDimensions = Object.values(input.dimensions).filter(
    (state): state is Exclude<SourceEvidenceState, "not_applicable"> => state !== "not_applicable"
  );
  const score = applicableDimensions.length === 0
    ? 0
    : Math.round(
        (applicableDimensions.reduce((total, state) => total + evidenceWeights[state], 0) /
          applicableDimensions.length) *
          100
      );

  let level: SourceConfidenceLevel = score >= 93
    ? "high"
    : score >= 72
      ? "medium"
      : score >= 45
        ? "low"
        : "insufficient";
  const capsApplied: string[] = [];

  const applyCap = (cap: SourceConfidenceLevel, reason: string) => {
    const capped = minimumConfidence(level, cap);
    if (capped !== level) {
      level = capped;
      capsApplied.push(reason);
    }
  };

  if (input.rights.status !== "approved") {
    applyCap("insufficient", "rights_not_approved");
  }
  if (input.validationStatus === "unverified") {
    applyCap("low", "validation_unverified");
  }
  if (input.validationStatus === "quarantined") {
    applyCap("insufficient", "release_quarantined");
  }
  if (input.custodyReceipt.status !== "immutable_receipt_recorded") {
    applyCap("medium", "immutable_custody_receipt_missing");
  }
  if (input.freshness.status === "unknown" || input.freshness.status === "stale") {
    applyCap("low", `freshness_${input.freshness.status}`);
  }
  if (input.dataMode === "sample_fallback" || input.dataMode === "metadata_only") {
    applyCap("low", `data_mode_${input.dataMode}`);
  }

  return {
    method: "evidence_dimensions_v1",
    dimensions: { ...input.dimensions },
    score,
    level,
    capsApplied
  };
}

/**
 * Decision use is deliberately stricter than structural contract validity.
 * A readable local artifact may support a clearly labelled screening view,
 * while remaining blocked from source-backed scoring until rights, integrity,
 * observation counts, validation and immutable custody are all evidenced.
 */
export function evaluateSourceReleaseGate(
  release: SourceReleaseProvenance,
  structurallyValid: boolean
): SourceReleaseGate {
  const blockers = new Set(release.blockers);
  const hasObservationCount =
    release.artifact.recordCount !== null || release.artifact.featureCount !== null;
  const observationCount = release.artifact.recordCount ?? release.artifact.featureCount ?? 0;

  if (!structurallyValid) blockers.add("Source provenance contract validation failed.");
  if (!/^[0-9a-f]{64}$/.test(release.artifact.contentSha256)) {
    blockers.add("Artifact SHA-256 evidence is missing or invalid.");
  }
  if (!hasObservationCount) blockers.add("Observed record or feature count is missing.");
  if (hasObservationCount && observationCount === 0) {
    blockers.add("Artifact contains no observed records or features.");
  }
  if (release.rights.status !== "approved") {
    blockers.add("Reusable rights and attribution review is not approved.");
  }
  if (
    release.rights.status === "approved" &&
    (!release.rights.licenseId || !release.rights.licenseUrl || !release.rights.reviewedAt)
  ) {
    blockers.add("Approved rights are missing a license identifier, license URL or review timestamp.");
  }
  if (release.rights.permittedUses.length === 0) {
    blockers.add("No permitted source use is recorded.");
  }
  if (!release.rights.permittedUses.some((use) => decisionScoringUsePattern.test(use))) {
    blockers.add("Source-backed decision scoring or ranking is not explicitly permitted.");
  }
  if (release.rights.prohibitedUses.some((use) => decisionScoringUsePattern.test(use))) {
    blockers.add("Rights evidence prohibits source-backed decision scoring or ranking.");
  }
  if (release.custodyReceipt.status !== "immutable_receipt_recorded") {
    blockers.add("Immutable custody receipt is not recorded.");
  }
  if (
    release.custodyReceipt.status === "immutable_receipt_recorded" &&
    (!release.custodyReceipt.receiptId ||
      !release.custodyReceipt.receiptSha256 ||
      !release.custodyReceipt.recordedAt ||
      !release.custodyReceipt.repository)
  ) {
    blockers.add("Immutable custody receipt evidence is incomplete.");
  }
  if (release.freshness.status !== "current" && release.freshness.status !== "aging") {
    blockers.add("Current, policy-evaluated freshness evidence is not recorded.");
  }
  if (
    (release.freshness.status === "current" || release.freshness.status === "aging") &&
    (!release.freshness.referenceTimestamp ||
      !release.freshness.evaluatedAt ||
      release.freshness.maximumAgeDays === null ||
      release.freshness.ageDays === null ||
      !release.freshness.policyId)
  ) {
    blockers.add("Freshness evidence is incomplete.");
  }
  for (const dimension of decisionEvidenceDimensions) {
    if (release.confidence.dimensions[dimension] !== "verified") {
      blockers.add(`Confidence dimension ${dimension} is not verified.`);
    }
  }
  if (
    release.validationStatus !== "source_reviewed" &&
    release.validationStatus !== "client_validated"
  ) {
    blockers.add("Source review or client validation is not recorded.");
  }
  if (release.dataMode === "sample_fallback" || release.dataMode === "metadata_only") {
    blockers.add("This release is limited to screening context.");
  }

  const decisionUse = blockers.size === 0 ? "allowed" : "blocked";
  return {
    structurallyValid,
    screeningContextAvailable:
      structurallyValid &&
      hasObservationCount &&
      observationCount > 0 &&
      release.artifact.byteCount > 0 &&
      release.validationStatus !== "quarantined",
    decisionUse,
    blockers: [...blockers]
  };
}
