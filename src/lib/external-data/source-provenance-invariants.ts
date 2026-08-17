import type {
  SourceConfidenceLevel,
  SourceDerivedConfidence,
  SourceReleaseProvenance
} from "./source-provenance-contract";

const REQUIRED_CAVEAT =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{2,127}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SAFE_RELATIVE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*[\u0000-\u001f\u007f]).+$/;
const confidenceOrder: SourceConfidenceLevel[] = ["insufficient", "low", "medium", "high"];
const dataModes = new Set(["local_snapshot", "open_snapshot", "user_provided_snapshot", "sample_fallback", "metadata_only"]);
const rightsStatuses = new Set(["unreviewed", "approved", "restricted", "prohibited"]);
const validationStatuses = new Set(["unverified", "schema_validated", "source_reviewed", "client_validated", "quarantined"]);
const freshnessStatuses = new Set(["unknown", "current", "aging", "stale", "not_applicable"]);
const custodyStatuses = new Set(["not_recorded", "local_manifest_recorded", "immutable_receipt_recorded", "quarantined"]);
const evidenceStates = new Set(["unverified", "partial", "verified", "not_applicable"]);
const evidenceDimensionKeys = [
  "sourceIdentity",
  "artifactIntegrity",
  "temporalLineage",
  "rights",
  "schema",
  "content",
  "custody"
] as const;

export type SourceProvenanceViolation = {
  path: string;
  code: string;
  message: string;
};

export type SourceProvenanceValidation = {
  valid: boolean;
  violations: SourceProvenanceViolation[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function add(
  violations: SourceProvenanceViolation[],
  path: string,
  code: string,
  message: string
) {
  violations.push({ path, code, message });
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  violations: SourceProvenanceViolation[]
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    add(violations, path, "required_string", `${path} must be a non-empty string.`);
  }
}

function requireIdentifier(
  value: unknown,
  path: string,
  violations: SourceProvenanceViolation[]
) {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) {
    add(violations, path, "invalid_identifier", `${path} must use the canonical lowercase identifier format.`);
  }
}

function requireEnum(
  value: unknown,
  values: ReadonlySet<string>,
  path: string,
  violations: SourceProvenanceViolation[]
) {
  if (typeof value !== "string" || !values.has(value)) {
    add(violations, path, "invalid_enum", `${path} is not a supported contract value.`);
    return false;
  }
  return true;
}

function requireNullableTimestamp(
  value: unknown,
  path: string,
  violations: SourceProvenanceViolation[]
) {
  if (value === null) return;
  if (
    typeof value !== "string" ||
    !ISO_TIMESTAMP_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    add(violations, path, "invalid_timestamp", `${path} must be a canonical UTC ISO timestamp or null.`);
  }
}

function requireSha256(
  value: unknown,
  path: string,
  violations: SourceProvenanceViolation[],
  nullable = false
) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    add(violations, path, "invalid_sha256", `${path} must be a lowercase SHA-256 hex digest${nullable ? " or null" : ""}.`);
  }
}

function requireNonNegativeInteger(
  value: unknown,
  path: string,
  violations: SourceProvenanceViolation[],
  nullable = false
) {
  if (nullable && value === null) return;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    add(violations, path, "invalid_count", `${path} must be a non-negative safe integer${nullable ? " or null" : ""}.`);
  }
}

function requireUniqueStrings(
  value: unknown,
  path: string,
  violations: SourceProvenanceViolation[],
  allowEmpty: boolean
) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    add(violations, path, "invalid_string_array", `${path} must contain only non-empty strings.`);
    return;
  }
  if (!allowEmpty && value.length === 0) {
    add(violations, path, "empty_string_array", `${path} must contain at least one value.`);
  }
  if (new Set(value).size !== value.length) {
    add(violations, path, "duplicate_value", `${path} must not contain duplicate values.`);
  }
}

function confidenceEquals(left: SourceDerivedConfidence, right: SourceDerivedConfidence) {
  return left.method === right.method &&
    left.score === right.score &&
    left.level === right.level &&
    JSON.stringify(left.dimensions) === JSON.stringify(right.dimensions) &&
    JSON.stringify(left.capsApplied) === JSON.stringify(right.capsApplied);
}

function expectedConfidence(release: SourceReleaseProvenance): SourceDerivedConfidence {
  const states = Object.values(release.confidence.dimensions).filter((state) => state !== "not_applicable");
  const weights: Record<string, number> = { unverified: 0, partial: 0.5, verified: 1 };
  const score = states.length === 0
    ? 0
    : Math.round((states.reduce((sum, state) => sum + weights[state], 0) / states.length) * 100);
  let level: SourceConfidenceLevel = score >= 93 ? "high" : score >= 72 ? "medium" : score >= 45 ? "low" : "insufficient";
  const capsApplied: string[] = [];
  const cap = (maximum: SourceConfidenceLevel, reason: string) => {
    const capped = confidenceOrder[Math.min(confidenceOrder.indexOf(level), confidenceOrder.indexOf(maximum))];
    if (capped !== level) {
      level = capped;
      capsApplied.push(reason);
    }
  };

  if (release.rights.status !== "approved") cap("insufficient", "rights_not_approved");
  if (release.validationStatus === "unverified") cap("low", "validation_unverified");
  if (release.validationStatus === "quarantined") cap("insufficient", "release_quarantined");
  if (release.custodyReceipt.status !== "immutable_receipt_recorded") cap("medium", "immutable_custody_receipt_missing");
  if (release.freshness.status === "unknown" || release.freshness.status === "stale") {
    cap("low", `freshness_${release.freshness.status}`);
  }
  if (release.dataMode === "sample_fallback" || release.dataMode === "metadata_only") {
    cap("low", `data_mode_${release.dataMode}`);
  }

  return {
    method: "evidence_dimensions_v1",
    dimensions: release.confidence.dimensions,
    score,
    level,
    capsApplied
  };
}

export function validateSourceReleaseProvenance(input: unknown): SourceProvenanceValidation {
  const violations: SourceProvenanceViolation[] = [];
  if (!isRecord(input)) {
    return {
      valid: false,
      violations: [{ path: "$", code: "invalid_release", message: "Source provenance release must be an object." }]
    };
  }

  const release = input as SourceReleaseProvenance;
  if (release.contractVersion !== "1.0") {
    add(violations, "contractVersion", "unsupported_contract", "contractVersion must be 1.0.");
  }
  for (const [path, value] of [
    ["releaseId", release.releaseId],
    ["sourceGroupId", release.sourceGroupId],
    ["sourceId", release.sourceId]
  ] as const) {
    requireIdentifier(value, path, violations);
  }
  for (const [path, value] of [
    ["releaseVersion", release.releaseVersion],
    ["schemaVersion", release.schemaVersion],
    ["sourceGroupName", release.sourceGroupName],
    ["sourceName", release.sourceName],
    ["nextValidationStep", release.nextValidationStep]
  ] as const) {
    requireNonEmptyString(value, path, violations);
  }
  const dataModeValid = requireEnum(release.dataMode, dataModes, "dataMode", violations);
  const validationStatusValid = requireEnum(
    release.validationStatus,
    validationStatuses,
    "validationStatus",
    violations
  );

  let origin: URL | null = null;
  try {
    origin = new URL(release.originUrl);
  } catch {
    add(violations, "originUrl", "invalid_origin_url", "originUrl must be an absolute HTTPS URL.");
  }
  if (origin) {
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.hash) {
      add(violations, "originUrl", "unsafe_origin_url", "originUrl must use HTTPS without credentials or a fragment.");
    }
    if (release.originHost !== origin.hostname.toLowerCase()) {
      add(violations, "originHost", "origin_host_mismatch", "originHost must exactly match the normalized originUrl hostname.");
    }
  }
  requireNonEmptyString(release.originHost, "originHost", violations);

  if (!isRecord(release.artifact)) {
    add(violations, "artifact", "missing_artifact", "artifact evidence is required.");
  } else {
    if (typeof release.artifact.path !== "string" || !SAFE_RELATIVE_PATH_PATTERN.test(release.artifact.path)) {
      add(violations, "artifact.path", "unsafe_artifact_path", "artifact.path must be a safe repository-relative path.");
    }
    requireNonEmptyString(release.artifact.mediaType, "artifact.mediaType", violations);
    requireSha256(release.artifact.contentSha256, "artifact.contentSha256", violations);
    requireSha256(release.artifact.sourceUriSha256, "artifact.sourceUriSha256", violations, true);
    requireSha256(release.artifact.schemaSha256, "artifact.schemaSha256", violations, true);
    requireNonNegativeInteger(release.artifact.byteCount, "artifact.byteCount", violations);
    requireNonNegativeInteger(release.artifact.recordCount, "artifact.recordCount", violations, true);
    requireNonNegativeInteger(release.artifact.featureCount, "artifact.featureCount", violations, true);
    if (release.artifact.recordCount === null && release.artifact.featureCount === null) {
      add(violations, "artifact", "missing_observation_count", "At least one explicit recordCount or featureCount is required.");
    }
    if (
      release.artifact.byteCount === 0 &&
      ((release.artifact.recordCount ?? 0) > 0 || (release.artifact.featureCount ?? 0) > 0)
    ) {
      add(violations, "artifact.byteCount", "impossible_artifact_size", "A non-empty snapshot cannot have a zero-byte artifact.");
    }
    if (release.dataMode === "open_snapshot" && release.artifact.sourceUriSha256 === null) {
      add(violations, "artifact.sourceUriSha256", "missing_source_uri_hash", "Open snapshots require a hashed source URI receipt.");
    }
  }

  for (const [path, value] of [
    ["generatedAt", release.generatedAt],
    ["extractedAt", release.extractedAt],
    ["publishedAt", release.publishedAt]
  ] as const) {
    requireNullableTimestamp(value, path, violations);
  }
  if (release.extractedAt && release.publishedAt && Date.parse(release.extractedAt) < Date.parse(release.publishedAt)) {
    add(violations, "extractedAt", "timestamp_order", "extractedAt cannot precede publishedAt.");
  }
  if (release.generatedAt && release.extractedAt && Date.parse(release.generatedAt) < Date.parse(release.extractedAt)) {
    add(violations, "generatedAt", "timestamp_order", "generatedAt cannot precede extractedAt.");
  }

  if (!isRecord(release.rights)) {
    add(violations, "rights", "missing_rights", "Rights evidence is required.");
  } else {
    requireEnum(release.rights.status, rightsStatuses, "rights.status", violations);
    requireNonEmptyString(release.rights.licenseNote, "rights.licenseNote", violations);
    requireNonEmptyString(release.rights.attributionNote, "rights.attributionNote", violations);
    requireNullableTimestamp(release.rights.reviewedAt, "rights.reviewedAt", violations);
    if (release.rights.licenseUrl !== null) {
      try {
        const licenseUrl = new URL(release.rights.licenseUrl);
        if (licenseUrl.protocol !== "https:" || licenseUrl.username || licenseUrl.password) throw new Error();
      } catch {
        add(violations, "rights.licenseUrl", "invalid_license_url", "rights.licenseUrl must be a safe HTTPS URL or null.");
      }
    }
    if (release.rights.licenseId !== null) requireNonEmptyString(release.rights.licenseId, "rights.licenseId", violations);
    requireUniqueStrings(release.rights.permittedUses, "rights.permittedUses", violations, release.rights.status !== "approved");
    requireUniqueStrings(release.rights.prohibitedUses, "rights.prohibitedUses", violations, true);
    if (release.rights.status === "approved" && release.rights.reviewedAt === null) {
      add(violations, "rights.reviewedAt", "unreviewed_approved_rights", "Approved rights require an explicit review timestamp.");
    }
    if (release.rights.status === "approved" && release.rights.licenseId === null) {
      add(violations, "rights.licenseId", "missing_approved_license_id", "Approved rights require an explicit license identifier.");
    }
    if (release.rights.status === "approved" && release.rights.licenseUrl === null) {
      add(violations, "rights.licenseUrl", "missing_approved_license_url", "Approved rights require an explicit license URL.");
    }
    if (release.rights.status === "unreviewed" && release.rights.reviewedAt !== null) {
      add(violations, "rights.reviewedAt", "ambiguous_rights_review", "Unreviewed rights must not carry a review timestamp.");
    }
    if (release.rights.status === "prohibited" && release.validationStatus !== "quarantined") {
      add(violations, "validationStatus", "prohibited_release_not_quarantined", "A release with prohibited rights must be quarantined.");
    }
  }

  requireUniqueStrings(release.blockers, "blockers", violations, true);
  if (release.rights?.status !== "approved" && (!Array.isArray(release.blockers) || release.blockers.length === 0)) {
    add(violations, "blockers", "missing_rights_blocker", "Non-approved rights require at least one explicit blocker.");
  }
  if (release.caveat !== REQUIRED_CAVEAT) {
    add(violations, "caveat", "invalid_caveat", "The required data-honesty caveat must be preserved exactly.");
  }

  if (!isRecord(release.freshness)) {
    add(violations, "freshness", "missing_freshness", "Freshness evidence is required.");
  } else {
    const freshnessStatusValid = requireEnum(
      release.freshness.status,
      freshnessStatuses,
      "freshness.status",
      violations
    );
    requireNullableTimestamp(release.freshness.referenceTimestamp, "freshness.referenceTimestamp", violations);
    requireNullableTimestamp(release.freshness.evaluatedAt, "freshness.evaluatedAt", violations);
    requireNonNegativeInteger(release.freshness.maximumAgeDays, "freshness.maximumAgeDays", violations, true);
    if (release.freshness.ageDays !== null && (typeof release.freshness.ageDays !== "number" || !Number.isFinite(release.freshness.ageDays) || release.freshness.ageDays < 0)) {
      add(violations, "freshness.ageDays", "invalid_age", "freshness.ageDays must be a non-negative finite number or null.");
    }
    if (freshnessStatusValid && (release.freshness.status === "unknown" || release.freshness.status === "not_applicable")) {
      if (
        release.freshness.referenceTimestamp !== null ||
        release.freshness.evaluatedAt !== null ||
        release.freshness.maximumAgeDays !== null ||
        release.freshness.ageDays !== null ||
        release.freshness.policyId !== null
      ) {
        add(violations, "freshness", "fabricated_freshness", `${release.freshness.status} freshness must not carry computed evidence.`);
      }
    } else if (freshnessStatusValid) {
      if (!release.freshness.referenceTimestamp || !release.freshness.evaluatedAt || release.freshness.maximumAgeDays === null || release.freshness.ageDays === null || !release.freshness.policyId) {
        add(violations, "freshness", "incomplete_freshness", "Evaluated freshness requires timestamp, evaluation time, age, maximum age and policy evidence.");
      } else {
        const referenceTime = Date.parse(release.freshness.referenceTimestamp);
        const evaluationTime = Date.parse(release.freshness.evaluatedAt);
        const expectedAgeDays = (evaluationTime - referenceTime) / 86_400_000;
        if (expectedAgeDays < 0 || Math.abs(expectedAgeDays - release.freshness.ageDays) > 0.001) {
          add(violations, "freshness.ageDays", "freshness_age_mismatch", "freshness.ageDays must be derived from the explicit reference and evaluation timestamps.");
        }
        if (
          (release.freshness.status === "current" || release.freshness.status === "aging") &&
          release.freshness.ageDays > release.freshness.maximumAgeDays
        ) {
          add(violations, "freshness.status", "freshness_status_mismatch", "Current or aging evidence cannot exceed maximumAgeDays.");
        }
        if (release.freshness.status === "stale" && release.freshness.ageDays <= release.freshness.maximumAgeDays) {
          add(violations, "freshness.status", "freshness_status_mismatch", "Stale evidence must exceed maximumAgeDays.");
        }
      }
    }
  }

  if (!isRecord(release.custodyReceipt)) {
    add(violations, "custodyReceipt", "missing_custody_receipt", "Custody receipt state is required.");
  } else {
    requireEnum(release.custodyReceipt.status, custodyStatuses, "custodyReceipt.status", violations);
    requireNullableTimestamp(release.custodyReceipt.recordedAt, "custodyReceipt.recordedAt", violations);
    requireSha256(release.custodyReceipt.receiptSha256, "custodyReceipt.receiptSha256", violations, true);
    if (release.custodyReceipt.status === "not_recorded") {
      if (release.custodyReceipt.receiptId !== null || release.custodyReceipt.receiptSha256 !== null || release.custodyReceipt.recordedAt !== null) {
        add(violations, "custodyReceipt", "false_custody_receipt", "A not-recorded custody state must not carry receipt evidence.");
      }
    } else if (!release.custodyReceipt.receiptId || !release.custodyReceipt.receiptSha256 || !release.custodyReceipt.recordedAt || !release.custodyReceipt.repository) {
      add(violations, "custodyReceipt", "incomplete_custody_receipt", "A recorded custody state requires receipt id, hash, timestamp and repository.");
    }
    if (release.custodyReceipt.status === "quarantined" && release.validationStatus !== "quarantined") {
      add(violations, "validationStatus", "custody_quarantine_mismatch", "Quarantined custody requires a quarantined validation status.");
    }
  }

  if (!isRecord(release.confidence) || !isRecord(release.confidence.dimensions)) {
    add(violations, "confidence", "missing_confidence", "Derived confidence evidence is required.");
  } else {
    const dimensionKeys = Object.keys(release.confidence.dimensions);
    const dimensionsValid =
      dimensionKeys.length === evidenceDimensionKeys.length &&
      evidenceDimensionKeys.every((key) =>
        Object.hasOwn(release.confidence.dimensions, key) &&
        requireEnum(release.confidence.dimensions[key], evidenceStates, `confidence.dimensions.${key}`, violations)
      );
    if (!dimensionsValid && dimensionKeys.length !== evidenceDimensionKeys.length) {
      add(violations, "confidence.dimensions", "invalid_dimensions", "Confidence must contain exactly the seven evidence dimensions.");
    }
    requireUniqueStrings(release.confidence.capsApplied, "confidence.capsApplied", violations, true);

    const canDerive =
      dimensionsValid &&
      dataModeValid &&
      validationStatusValid &&
      isRecord(release.rights) &&
      rightsStatuses.has(String(release.rights.status)) &&
      isRecord(release.freshness) &&
      freshnessStatuses.has(String(release.freshness.status)) &&
      isRecord(release.custodyReceipt) &&
      custodyStatuses.has(String(release.custodyReceipt.status));
    if (canDerive) {
      const expected = expectedConfidence(release);
      if (!confidenceEquals(release.confidence, expected)) {
        add(violations, "confidence", "confidence_not_derived", "Confidence must exactly match evidence_dimensions_v1 derivation and caps.");
      }
    }
    if (release.confidence.dimensions.temporalLineage === "verified" && release.extractedAt === null && release.publishedAt === null) {
      add(violations, "confidence.dimensions.temporalLineage", "unsupported_temporal_confidence", "Verified temporal lineage requires an explicit extractedAt or publishedAt timestamp.");
    }
    if (
      release.confidence.dimensions.temporalLineage === "verified" &&
      release.freshness.status !== "current" &&
      release.freshness.status !== "aging"
    ) {
      add(violations, "confidence.dimensions.temporalLineage", "unsupported_freshness_confidence", "Verified temporal lineage requires policy-evaluated current or aging freshness evidence.");
    }
    if (release.confidence.dimensions.rights === "verified" && release.rights.status !== "approved") {
      add(violations, "confidence.dimensions.rights", "unsupported_rights_confidence", "Verified rights evidence requires approved rights.");
    }
    if (
      release.confidence.dimensions.rights === "verified" &&
      (!release.rights.licenseId || !release.rights.licenseUrl || !release.rights.reviewedAt)
    ) {
      add(violations, "confidence.dimensions.rights", "incomplete_rights_confidence", "Verified rights evidence requires a license identifier, license URL and review timestamp.");
    }
    if (release.confidence.dimensions.schema === "verified" && release.artifact.schemaSha256 === null) {
      add(violations, "confidence.dimensions.schema", "unsupported_schema_confidence", "Verified schema evidence requires a schema SHA-256 receipt.");
    }
    if (
      release.confidence.dimensions.content === "verified" &&
      (release.artifact.recordCount ?? release.artifact.featureCount ?? 0) === 0
    ) {
      add(violations, "confidence.dimensions.content", "unsupported_content_confidence", "Verified content evidence requires at least one observed record or feature.");
    }
    if (release.confidence.dimensions.custody === "verified" && release.custodyReceipt.status !== "immutable_receipt_recorded") {
      add(violations, "confidence.dimensions.custody", "unsupported_custody_confidence", "Verified custody evidence requires an immutable receipt.");
    }
  }

  return { valid: violations.length === 0, violations };
}

export function assertSourceReleaseProvenance(input: unknown): asserts input is SourceReleaseProvenance {
  const result = validateSourceReleaseProvenance(input);
  if (!result.valid) {
    const detail = result.violations.map((violation) => `${violation.path}:${violation.code}`).join(", ");
    throw new Error(`Source provenance invariants failed: ${detail}`);
  }
}
