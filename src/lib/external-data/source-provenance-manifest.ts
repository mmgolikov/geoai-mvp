import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import {
  SOURCE_PROVENANCE_CAVEAT,
  SOURCE_PROVENANCE_CONTRACT_VERSION,
  deriveSourceConfidence,
  evaluateSourceReleaseGate,
  type SourceConfidenceLevel,
  type SourceReleaseDataMode,
  type SourceReleaseGate,
  type SourceReleaseProvenance
} from "@/src/lib/external-data/source-provenance-contract";
import {
  validateSourceReleaseProvenance,
  type SourceProvenanceViolation
} from "@/src/lib/external-data/source-provenance-invariants";
import type {
  SnapshotQualityItem,
  SourceQualityManifest
} from "@/src/lib/external-data/source-quality-manifest";

type SourceOrigin = {
  originUrl: string;
  originHost: string;
  attributionNote: string;
};

const sourceOrigins: Record<string, SourceOrigin> = {
  "dld-dubai-pulse-public-real-estate": {
    originUrl: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
    originHost: "dubailand.gov.ae",
    attributionNote: "Attribution and redistribution terms have not been approved for this local artifact."
  },
  "osm-geofabrik-open-geospatial": {
    originUrl: "https://download.geofabrik.de/asia/gcc-states.html",
    originHost: "download.geofabrik.de",
    attributionNote: "OpenStreetMap and Geofabrik attribution must be approved and attached before external use."
  },
  "overture-maps-open-context": {
    originUrl: "https://docs.overturemaps.org/getting-data/",
    originHost: "docs.overturemaps.org",
    attributionNote: "Overture attribution and downstream obligations must be approved and attached before external use."
  },
  "copernicus-sentinel-metadata": {
    originUrl: "https://dataspace.copernicus.eu/",
    originHost: "dataspace.copernicus.eu",
    attributionNote: "Copernicus product attribution and use terms must be approved before external use."
  }
};

export type SourceProvenanceReleaseEntry = {
  release: SourceReleaseProvenance;
  valid: boolean;
  violations: SourceProvenanceViolation[];
  gate: SourceReleaseGate;
};

export type SourceProvenanceGroup = {
  sourceGroupId: string;
  sourceGroupName: string;
  sourceIds: string[];
  generatedAt: string | null;
  releaseCount: number;
  validReleaseCount: number;
  screeningReleaseCount: number;
  decisionEligibleReleaseCount: number;
  qualityState: "no_release" | "blocked" | "screening_context" | "validated_snapshot";
  confidence: SourceConfidenceLevel;
  rightsStatuses: string[];
  custodyStatuses: string[];
  evidence: {
    hashesComplete: boolean;
    countsComplete: boolean;
    rightsComplete: boolean;
    custodyComplete: boolean;
  };
  blockers: string[];
  nextValidationStep: string;
  caveat: typeof SOURCE_PROVENANCE_CAVEAT;
  releases: SourceProvenanceReleaseEntry[];
};

export type SourceProvenanceManifest = {
  contractVersion: typeof SOURCE_PROVENANCE_CONTRACT_VERSION;
  mode: "strict_local_provenance" | "strict_public_release_summary";
  source: "repository_normalized_files" | "reviewed_repository_snapshot";
  generatedAt: string | null;
  caveat: typeof SOURCE_PROVENANCE_CAVEAT;
  groups: SourceProvenanceGroup[];
};

export type CompactSourceProvenanceGroup = Omit<SourceProvenanceGroup, "releases">;

export type CompactSourceProvenanceManifest = Omit<SourceProvenanceManifest, "groups"> & {
  groups: CompactSourceProvenanceGroup[];
};

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const canonical = new Date(parsed).toISOString();
  return canonical === value ? value : null;
}

function newestTimestamp(values: Array<string | null>) {
  const timestamps = values
    .filter((value): value is string => value !== null)
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;
}

function mediaTypeFor(path: string) {
  switch (extname(path).toLowerCase()) {
    case ".geojson":
      return "application/geo+json";
    case ".csv":
      return "text/csv";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

function releaseDataMode(snapshot: SnapshotQualityItem): SourceReleaseDataMode {
  if (snapshot.status === "sample_fallback") return "sample_fallback";
  if (snapshot.status !== "snapshot_available") return "metadata_only";
  if (
    snapshot.sourceGroupId === "osm-geofabrik-open-geospatial" ||
    snapshot.sourceGroupId === "overture-maps-open-context"
  ) {
    return "open_snapshot";
  }
  return "local_snapshot";
}

function observedCounts(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { recordCount: null, featureCount: null, parsed: false };
  }
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.records)) {
    return { recordCount: record.records.length, featureCount: null, parsed: true };
  }
  if (Array.isArray(record.features)) {
    return { recordCount: null, featureCount: record.features.length, parsed: true };
  }
  if (Array.isArray(record.areas)) {
    return { recordCount: record.areas.length, featureCount: null, parsed: true };
  }
  if (Array.isArray(record.collections)) {
    const count = record.collections.reduce((sum, item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return sum;
      const sceneCount = (item as Record<string, unknown>).sceneCount;
      return sum + (typeof sceneCount === "number" && Number.isSafeInteger(sceneCount) && sceneCount >= 0 ? sceneCount : 0);
    }, 0);
    return { recordCount: count, featureCount: null, parsed: true };
  }
  const declaredRecordCount = typeof record.recordCount === "number" && Number.isSafeInteger(record.recordCount) && record.recordCount >= 0
    ? record.recordCount
    : null;
  const declaredFeatureCount = typeof record.featureCount === "number" && Number.isSafeInteger(record.featureCount) && record.featureCount >= 0
    ? record.featureCount
    : null;
  return {
    recordCount: declaredRecordCount,
    featureCount: declaredFeatureCount,
    parsed: declaredRecordCount !== null || declaredFeatureCount !== null
  };
}

function buildRelease(snapshot: SnapshotQualityItem): SourceProvenanceReleaseEntry | null {
  const relativePath = snapshot.filePath;
  const origin = sourceOrigins[snapshot.sourceGroupId];
  if (!relativePath || !origin) return null;

  const repositoryRoot = resolve(process.cwd());
  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!absolutePath.startsWith(`${repositoryRoot}${sep}`) || !existsSync(absolutePath)) return null;

  const bytes = readFileSync(absolutePath);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    parsed = null;
  }
  const record = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
  const counts = observedCounts(parsed);
  const declaredCount = snapshot.featureCount ?? snapshot.recordCount;
  const observedCount = counts.featureCount ?? counts.recordCount;
  const countMatches =
    declaredCount === null ||
    observedCount === null ||
    declaredCount === observedCount;
  const contentSha256 = sha256(bytes);
  const dataMode = releaseDataMode(snapshot);
  const generatedAt = canonicalTimestamp(record?.generatedAt ?? snapshot.generatedAt);
  const blockers = [
    "Reusable rights and attribution review is not recorded for this artifact.",
    "Immutable custody receipt is not recorded for this artifact.",
    "Source extraction timestamp is not recorded for this artifact.",
    dataMode === "sample_fallback" ? "Repository artifact is limited to screening context." : null,
    !counts.parsed ? "Observed record or feature count could not be derived from the artifact." : null,
    !countMatches ? "Declared record or feature count does not match artifact content." : null
  ].filter((value): value is string => Boolean(value));
  const dimensions = {
    sourceIdentity: "partial" as const,
    artifactIntegrity: "verified" as const,
    temporalLineage: generatedAt ? "partial" as const : "unverified" as const,
    rights: "unverified" as const,
    schema: typeof record?.version === "string" ? "partial" as const : "unverified" as const,
    content: counts.parsed && countMatches ? "verified" as const : counts.parsed ? "partial" as const : "unverified" as const,
    custody: "unverified" as const
  };
  const rights = {
    status: "unreviewed" as const,
    licenseId: null,
    licenseUrl: null,
    licenseNote: snapshot.licenseNote,
    attributionNote: origin.attributionNote,
    reviewedAt: null,
    permittedUses: [],
    prohibitedUses: ["source-backed decision scoring", "external publication", "official validation claim"]
  };
  const freshness = {
    status: "unknown" as const,
    referenceTimestamp: null,
    evaluatedAt: null,
    maximumAgeDays: null,
    ageDays: null,
    policyId: null
  };
  const custodyReceipt = {
    status: "not_recorded" as const,
    receiptId: null,
    receiptSha256: null,
    recordedAt: null,
    repository: null
  };
  const confidence = deriveSourceConfidence({
    dataMode,
    rights,
    validationStatus: "unverified",
    freshness,
    custodyReceipt,
    dimensions
  });
  const release: SourceReleaseProvenance = {
    contractVersion: SOURCE_PROVENANCE_CONTRACT_VERSION,
    releaseId: `${snapshot.sourceId}.${contentSha256.slice(0, 16)}`,
    releaseVersion: typeof record?.version === "string" ? record.version : contentSha256.slice(0, 16),
    schemaVersion: typeof record?.version === "string" ? `geoai-normalized-${record.version}` : "unversioned",
    sourceGroupId: snapshot.sourceGroupId,
    sourceGroupName: snapshot.sourceGroupName,
    sourceId: snapshot.sourceId,
    sourceName: snapshot.sourceName,
    originUrl: origin.originUrl,
    originHost: origin.originHost,
    artifact: {
      path: relativePath,
      mediaType: mediaTypeFor(relativePath),
      contentSha256,
      sourceUriSha256: null,
      schemaSha256: null,
      byteCount: bytes.byteLength,
      recordCount: counts.recordCount,
      featureCount: counts.featureCount
    },
    generatedAt,
    extractedAt: null,
    publishedAt: null,
    rights,
    dataMode,
    confidence,
    validationStatus: "unverified",
    caveat: SOURCE_PROVENANCE_CAVEAT,
    nextValidationStep: snapshot.nextValidationStep,
    blockers,
    freshness,
    custodyReceipt
  };
  const validation = validateSourceReleaseProvenance(release);
  return {
    release,
    valid: validation.valid,
    violations: validation.violations,
    gate: evaluateSourceReleaseGate(release, validation.valid)
  };
}

function highestConfidence(entries: SourceProvenanceReleaseEntry[]): SourceConfidenceLevel {
  const order: SourceConfidenceLevel[] = ["insufficient", "low", "medium", "high"];
  return entries.reduce<SourceConfidenceLevel>((highest, entry) =>
    order.indexOf(entry.release.confidence.level) > order.indexOf(highest)
      ? entry.release.confidence.level
      : highest, "insufficient");
}

function buildGroup(
  sourceGroupId: string,
  sourceGroupName: string,
  snapshots: SnapshotQualityItem[],
  nextValidationStep: string
): SourceProvenanceGroup {
  const releases = snapshots
    .map(buildRelease)
    .filter((entry): entry is SourceProvenanceReleaseEntry => entry !== null);
  const validReleaseCount = releases.filter((entry) => entry.valid).length;
  const screeningReleaseCount = releases.filter((entry) => entry.gate.screeningContextAvailable).length;
  const decisionEligibleReleaseCount = releases.filter((entry) => entry.gate.decisionUse === "allowed").length;
  const qualityState = decisionEligibleReleaseCount > 0
    ? "validated_snapshot"
    : screeningReleaseCount > 0
      ? "screening_context"
      : releases.length > 0
        ? "blocked"
        : "no_release";
  const blockers = Array.from(new Set([
    ...releases.flatMap((entry) => [
      ...entry.gate.blockers,
      ...entry.violations.map((violation) => `${violation.path}: ${violation.message}`)
    ]),
    releases.length === 0 ? "No local normalized artifact is recorded for this source group." : null
  ].filter((value): value is string => Boolean(value))));

  return {
    sourceGroupId,
    sourceGroupName,
    sourceIds: Array.from(new Set(snapshots.map((snapshot) => snapshot.sourceId))),
    generatedAt: newestTimestamp(releases.map((entry) => entry.release.generatedAt)),
    releaseCount: releases.length,
    validReleaseCount,
    screeningReleaseCount,
    decisionEligibleReleaseCount,
    qualityState,
    confidence: highestConfidence(releases),
    rightsStatuses: Array.from(new Set(releases.map((entry) => entry.release.rights.status))),
    custodyStatuses: Array.from(new Set(releases.map((entry) => entry.release.custodyReceipt.status))),
    evidence: {
      hashesComplete: releases.length > 0 && releases.every((entry) => /^[0-9a-f]{64}$/.test(entry.release.artifact.contentSha256)),
      countsComplete: releases.length > 0 && releases.every((entry) => entry.release.artifact.recordCount !== null || entry.release.artifact.featureCount !== null),
      rightsComplete: releases.length > 0 && releases.every((entry) => entry.release.rights.status === "approved"),
      custodyComplete: releases.length > 0 && releases.every((entry) => entry.release.custodyReceipt.status === "immutable_receipt_recorded")
    },
    blockers,
    nextValidationStep,
    caveat: SOURCE_PROVENANCE_CAVEAT,
    releases
  };
}

export function buildSourceProvenanceManifest(
  sourceQuality: SourceQualityManifest
): SourceProvenanceManifest {
  const groups = sourceQuality.groups.map((group) => buildGroup(
    group.sourceGroupId,
    group.sourceGroupName,
    group.snapshots,
    group.nextValidationStep
  ));

  return {
    contractVersion: SOURCE_PROVENANCE_CONTRACT_VERSION,
    mode: "strict_local_provenance",
    source: "repository_normalized_files",
    generatedAt: newestTimestamp(groups.map((group) => group.generatedAt)),
    caveat: SOURCE_PROVENANCE_CAVEAT,
    groups
  };
}

export function compactSourceProvenanceManifest(
  manifest: SourceProvenanceManifest
): CompactSourceProvenanceManifest {
  return {
    contractVersion: manifest.contractVersion,
    mode: manifest.mode,
    source: manifest.source,
    generatedAt: manifest.generatedAt,
    caveat: manifest.caveat,
    groups: manifest.groups.map(({ releases: _releases, ...group }) => group)
  };
}
