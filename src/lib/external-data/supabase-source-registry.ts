import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { externalDataCaveat } from "@/src/lib/external-data/source-registry";
import { readExternalDataManifest } from "@/src/lib/external-data/data-manifest";
import { normalizeSourceStatus } from "@/src/lib/external-data/source-status";
import {
  ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL,
  normalizeSourceDataMode,
  sourcePresentationLabel,
  sourceValidationStatusFor
} from "@/src/lib/external-data/source-modes";
import {
  buildSourceReadinessGroups,
  sourceReadinessSummary,
  type SourceReadinessGroup
} from "@/src/lib/external-data/source-readiness-groups";
import {
  buildSourceQualityManifest,
  type SourceQualityGroup,
  type SourceQualityManifest
} from "@/src/lib/external-data/source-quality-manifest";
import {
  buildSourceProvenanceManifest,
  type SourceProvenanceGroup,
  type SourceProvenanceManifest
} from "@/src/lib/external-data/source-provenance-manifest";
import { getCompactPublicSourceRegistryReadiness } from "@/src/lib/external-data/public-source-readiness";

type RegistryRow = {
  source_id?: string | null;
  source_name?: string | null;
  category?: string | null;
  access_mode?: string | null;
  connection_status?: string | null;
  source_mode?: string | null;
  data_quality_tier?: string | null;
  record_count?: number | null;
  quality?: unknown;
  lineage?: unknown;
  caveat?: string | null;
  updated_at?: string | null;
};

type SnapshotRow = {
  source_id?: string | null;
  category?: string | null;
  source_mode?: string | null;
  raw_file_name?: string | null;
  normalized_path?: string | null;
  record_count?: number | null;
  quality?: unknown;
  manifest?: unknown;
  imported_at?: string | null;
};

type SourceReadinessGroupWithQuality = SourceReadinessGroup & {
  sourceQuality?: SourceQualityGroup;
  sourceProvenance?: SourceProvenanceGroup;
};

function normalizeRegistryStatus(value: unknown) {
  if (String(value ?? "").trim().toLowerCase() === "connected_context_ready") return "connected" as const;
  return normalizeSourceStatus(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function rowMatchesGroup(sourceId: string | null | undefined, group: SourceReadinessGroup) {
  return Boolean(sourceId && (sourceId === group.id || group.sourceIds.includes(sourceId)));
}

function storedProvenanceAllowsDecision(snapshot: SnapshotRow | undefined) {
  const manifest = asRecord(snapshot?.manifest);
  const provenance = asRecord(manifest?.sourceProvenance);
  const gate = asRecord(provenance?.gate);
  return gate?.structurallyValid === true && gate?.decisionUse === "allowed";
}

function hasAcquiredSnapshot(snapshot: SnapshotRow | undefined) {
  return Boolean(
    snapshot?.normalized_path &&
    typeof snapshot.record_count === "number" &&
    snapshot.record_count > 0 &&
    storedProvenanceAllowsDecision(snapshot)
  );
}

function failClosedDataMode(value: unknown, acquiredSnapshot: boolean) {
  const normalized = normalizeSourceDataMode(value);
  if (!acquiredSnapshot && (normalized === "real_snapshot" || normalized === "imported_snapshot")) {
    return "planned_validation" as const;
  }
  return normalized;
}

function attachSourceEvidence(
  groups: SourceReadinessGroup[],
  sourceQuality: SourceQualityManifest,
  sourceProvenance: SourceProvenanceManifest
): SourceReadinessGroupWithQuality[] {
  const qualityByGroup = new Map(sourceQuality.groups.map((group) => [group.sourceGroupId, group]));
  const provenanceByGroup = new Map(sourceProvenance.groups.map((group) => [group.sourceGroupId, group]));

  return groups.map((group) => ({
    ...group,
    sourceQuality: qualityByGroup.get(group.id),
    sourceProvenance: provenanceByGroup.get(group.id)
  }));
}

function newestKnownTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;
}

function overlaySupabaseRows(
  groups: SourceReadinessGroup[],
  rows: RegistryRow[],
  snapshots: SnapshotRow[]
): SourceReadinessGroup[] {
  return groups.map((group) => {
    const registryRow = rows.find((row) => rowMatchesGroup(row.source_id, group));
    const snapshotRow = snapshots.find((row) => rowMatchesGroup(row.source_id, group));
    const lineage = asRecord(registryRow?.lineage);
    const manifest = asRecord(snapshotRow?.manifest);
    const lineageFiles = asStringArray(lineage?.availableFiles);
    const manifestFiles = asStringArray(manifest?.availableFiles);
    const nextValidationStep = typeof lineage?.nextValidationStep === "string"
      ? lineage.nextValidationStep
      : group.nextValidationStep;
    const acquiredSnapshot = hasAcquiredSnapshot(snapshotRow);
    const requestedStatus = normalizeRegistryStatus(registryRow?.connection_status ?? (acquiredSnapshot ? "snapshot_available" : group.status));
    const status = requestedStatus === "snapshot_available" && !acquiredSnapshot
      ? normalizeRegistryStatus(group.status === "snapshot_available" ? "manual_import_ready" : group.status)
      : requestedStatus;
    const dataMode = failClosedDataMode(snapshotRow?.source_mode ?? registryRow?.source_mode ?? status, acquiredSnapshot);
    const recordCount = snapshotRow?.record_count ?? registryRow?.record_count ?? group.recordCount;
    const validationStatus = status === group.status
      ? group.validationStatus
      : sourceValidationStatusFor(status);
    const sampleData = status === "sample_fallback" || validationStatus === "sample-only";

    return {
      ...group,
      status,
      dataMode,
      validationStatus,
      presentationLabel: sourcePresentationLabel({ dataMode, status, validationStatus }),
      sampleData,
      smallSnapshot: sampleData && recordCount !== null && recordCount < 100,
      recordCount,
      confidence: status === "connected" || status === "snapshot_available"
        ? "medium"
        : group.confidence,
      category: registryRow?.category ?? snapshotRow?.category ?? group.category,
      availableFiles: Array.from(new Set([
        ...group.availableFiles,
        ...lineageFiles,
        ...manifestFiles,
        ...(acquiredSnapshot && snapshotRow?.normalized_path ? [snapshotRow.normalized_path] : [])
      ])),
      lastUpdated: snapshotRow?.imported_at ?? registryRow?.updated_at ?? group.lastUpdated,
      caveat: registryRow?.caveat ?? group.caveat,
      nextValidationStep,
      qualityState: acquiredSnapshot ? "validated_snapshot" : group.qualityState,
      decisionUse: acquiredSnapshot ? "allowed" : "blocked",
      provenanceValid: acquiredSnapshot || group.provenanceValid,
      evidence: acquiredSnapshot
        ? {
            hashesComplete: true,
            countsComplete: true,
            rightsComplete: true,
            custodyComplete: true
          }
        : group.evidence,
      blockers: acquiredSnapshot ? [] : group.blockers
    };
  });
}

async function readRows() {
  const client = await getSupabaseServerClient();
  if (!client) return { rows: [] as RegistryRow[], snapshots: [] as SnapshotRow[], blocker: "Supabase server client is not configured." };

  try {
    const sourceQuery = client.from("source_registry_snapshots").select("*") as Promise<{ data?: RegistryRow[] | null; error?: unknown }>;
    const snapshotQuery = client.from("external_data_snapshots").select("*") as Promise<{ data?: SnapshotRow[] | null; error?: unknown }>;
    const [sourceResponse, snapshotResponse] = await Promise.all([sourceQuery, snapshotQuery]);
    if (sourceResponse.error) return { rows: [] as RegistryRow[], snapshots: [] as SnapshotRow[], blocker: "Source registry query failed." };
    if (snapshotResponse.error) return { rows: [] as RegistryRow[], snapshots: [] as SnapshotRow[], blocker: "External snapshot query failed; registry metadata was not promoted to evidence." };
    return {
      rows: Array.isArray(sourceResponse.data) ? sourceResponse.data : [],
      snapshots: Array.isArray(snapshotResponse.data) ? snapshotResponse.data : [],
      blocker: null as string | null
    };
  } catch {
    return { rows: [] as RegistryRow[], snapshots: [] as SnapshotRow[], blocker: "Source registry is unreachable." };
  }
}

/**
 * Public endpoints must never turn one anonymous request into database
 * discovery queries. This projection is built only from the reviewed,
 * repository-bundled manifest; live registry state belongs in an
 * operator-authenticated control plane.
 */
export function getPublicSourceRegistryReadiness() {
  return getCompactPublicSourceRegistryReadiness();
}

export async function getSourceRegistryReadiness() {
  const fallback = readExternalDataManifest();
  const sourceQuality = fallback.sourceQuality ?? buildSourceQualityManifest();
  const sourceProvenance = fallback.sourceProvenance ?? buildSourceProvenanceManifest(sourceQuality);
  const { rows, snapshots, blocker } = await readRows();
  const fallbackWithEvidence = { ...fallback, sourceQuality, sourceProvenance };
  const fallbackGroups = attachSourceEvidence(buildSourceReadinessGroups(fallbackWithEvidence), sourceQuality, sourceProvenance);
  const sourceGroups = rows.length === 0
    ? fallbackGroups
    : attachSourceEvidence(overlaySupabaseRows(fallbackGroups, rows, snapshots), sourceQuality, sourceProvenance);
  const summary = {
    ...sourceReadinessSummary(sourceGroups),
    qualityGroups: sourceQuality.groups.length
  };
  const generatedAt = newestKnownTimestamp([
    fallback.generatedAt,
    sourceProvenance.generatedAt,
    ...rows.map((row) => row.updated_at),
    ...snapshots.map((snapshot) => snapshot.imported_at)
  ]);

  if (rows.length === 0) {
    return {
      version: "1.3",
      mode: "local_fallback",
      source: "local_manifest_fallback",
      presentationLabel: ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL,
      sourceRegistryCount: 0,
      externalSnapshotCount: snapshots.length,
      manifest: {
        ...fallback,
        sourceQuality,
        sourceProvenance
      },
      sourceQuality,
      sourceProvenance,
      sourceGroups,
      summary,
      readiness: sourceGroups.map((group) => ({
        sourceId: group.id,
        sourceName: group.name,
        status: group.status,
        sourceMode: group.dataMode,
        dataMode: group.dataMode,
        validationStatus: group.validationStatus,
        presentationLabel: group.presentationLabel,
        sampleData: group.sampleData,
        smallSnapshot: group.smallSnapshot,
        lastUpdated: group.lastUpdated,
        recordCount: group.recordCount,
        coverageArea: group.coverageArea,
        confidence: group.confidence,
        sourceQuality: group.sourceQuality,
        sourceProvenance: group.sourceProvenance,
        caveat: group.caveat,
        nextValidationStep: group.nextValidationStep,
        validationRequired: true
      })),
      blockers: Array.from(new Set([
        ...[blocker].filter((value): value is string => Boolean(value)),
        ...sourceGroups.flatMap((group) => group.blockers)
      ])),
      nextActions: sourceGroups.map((group) => group.nextValidationStep),
      sync: {
        helper: "npm run data:sync-source-readiness",
        status: "available",
        writes: ["source_registry_snapshots", "external_data_snapshots"]
      },
      caveat: externalDataCaveat,
      generatedAt
    };
  }

  const snapshotsBySource = new Map(snapshots.filter((item) => item.source_id).map((item) => [item.source_id as string, item]));
  const manifestSources = rows.filter((row) => row.source_id).map((row) => {
    const snapshot = snapshotsBySource.get(row.source_id as string);
    const acquiredSnapshot = hasAcquiredSnapshot(snapshot);
    const requestedStatus = normalizeRegistryStatus(row.connection_status ?? "manual_import_ready");
    const status = requestedStatus === "snapshot_available" && !acquiredSnapshot ? "manual_import_ready" : requestedStatus;
    const sourceMode = failClosedDataMode(acquiredSnapshot ? snapshot?.source_mode ?? "snapshot_available" : row.source_mode ?? status, acquiredSnapshot);
    return {
      id: row.source_id as string,
      status,
      lastUpdated: snapshot?.imported_at ?? row.updated_at ?? null,
      availableFiles: acquiredSnapshot && snapshot?.normalized_path ? [snapshot.normalized_path] : [],
      recordCount: snapshot?.record_count ?? row.record_count ?? undefined,
      coverageArea: row.category ?? "Dubai / UAE screening context",
      confidence: status === "snapshot_available" || status === "connected" ? "medium" : "requires-validation",
      caveat: row.caveat ?? externalDataCaveat,
      sourceMode,
      usedInAnalysis: status === "snapshot_available" && acquiredSnapshot,
      disclaimer: row.caveat ?? externalDataCaveat
    };
  });

  return {
    version: "1.3",
    mode: "supabase",
    source: "supabase_source_registry",
    presentationLabel: "Operator source registry context",
    sourceRegistryCount: rows.length,
    externalSnapshotCount: snapshots.length,
    manifest: {
      generatedAt,
      version: "1.3",
      summary: "GeoAI Data Foundation v1.3 source registry, snapshot readiness and local source-quality metadata.",
      sources: manifestSources,
      sourceQuality,
      sourceProvenance
    },
    sourceQuality,
    sourceProvenance,
    sourceGroups,
    summary,
    readiness: sourceGroups.map((group) => ({
      sourceId: group.id,
      sourceName: group.name,
      status: group.status,
      sourceMode: group.dataMode,
      dataMode: group.dataMode,
      validationStatus: group.validationStatus,
      presentationLabel: group.presentationLabel,
      sampleData: group.sampleData,
      smallSnapshot: group.smallSnapshot,
      lastUpdated: group.lastUpdated,
      recordCount: group.recordCount,
      coverageArea: group.coverageArea,
      confidence: group.confidence,
      sourceQuality: group.sourceQuality,
      sourceProvenance: group.sourceProvenance,
      caveat: group.caveat,
      nextValidationStep: group.nextValidationStep,
      validationRequired: true
    })),
    blockers: Array.from(new Set(sourceGroups.flatMap((group) => group.blockers))),
    nextActions: sourceGroups.map((group) => group.nextValidationStep),
    sync: {
      helper: "npm run data:sync-source-readiness",
      status: "available",
      writes: ["source_registry_snapshots", "external_data_snapshots"]
    },
    caveat: externalDataCaveat,
    generatedAt
  };
}
