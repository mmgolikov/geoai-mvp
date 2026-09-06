import {
  LIVE_POINT_CAPS,
  LIVE_POINT_GEOMETRY_VERSION,
  type AcquisitionReceipt,
  type LivePointContextResult,
  type LivePointEvidenceBundle,
  type LivePointResolution,
  type SnapshotAnchor,
  type TermsReceipt
} from "./contracts";
import { LivePointCoreError } from "./errors";
import { semanticHash } from "./hash";
import {
  assertE1FixtureAuthority,
  assertE1SourceRights,
  type LivePointSnapshotRepository
} from "./repository-core";

function acquisitionReceipt(
  snapshotAnchor: SnapshotAnchor,
  repository: LivePointSnapshotRepository
): AcquisitionReceipt {
  const source = repository.sourceReceiptsById.get(snapshotAnchor.acquisition_receipt_id);
  if (!source) throw new LivePointCoreError("SNAPSHOT_CORRUPT", "Snapshot acquisition receipt is unavailable.");
  const core = {
    source_id: "synthetic_fixture" as const,
    kind: "acquisition" as const,
    source_as_of: source.sourceAsOf,
    retrieved_at: source.retrievedAt,
    query_radius_m: source.queryRadiusM,
    normalized_radius_m: source.normalizedRadiusM,
    runtime_network_used: false as const
  };
  return {
    receipt_id: source.id,
    receipt_hash: semanticHash(core),
    ...core
  };
}

function termsReceipt(repository: LivePointSnapshotRepository): TermsReceipt {
  const source = repository.manifest.termsReceipt;
  const core = {
    license_id: "Synthetic-Non-Runtime-1.0" as const,
    license_url: "urn:geoai:synthetic-non-runtime-fixture",
    rights_status: source.rightsStatus,
    attribution: "GeoAI synthetic non-runtime fixture",
    attribution_url: "urn:geoai:synthetic-non-runtime-fixture",
    allowed_operations: [...source.allowedOperations],
    prohibited_claims: [...source.prohibitedClaims]
  };
  return {
    terms_receipt_id: source.id,
    terms_receipt_hash: semanticHash(core),
    ...core
  };
}

export function buildLivePointEvidenceBundle(
  resolution: LivePointResolution,
  context: LivePointContextResult | null,
  repository: LivePointSnapshotRepository
): LivePointEvidenceBundle {
  if (resolution.status === "outside_coverage" || resolution.status === "no_result") {
    throw new LivePointCoreError(
      "CONTRACT_VALIDATION_FAILED",
      "Outside-coverage or unresolved no-result stages cannot author a success evidence bundle."
    );
  }
  assertE1FixtureAuthority(repository);
  assertE1SourceRights(repository);
  const snapshotAnchor = resolution.snapshot_anchor;
  if (!snapshotAnchor) {
    throw new LivePointCoreError("CONTRACT_VALIDATION_FAILED", "A success evidence bundle requires a snapshot anchor.");
  }
  const selected = resolution.status === "resolved" ? resolution.selected_object : null;
  const object = selected ? repository.objectsById.get(selected.entity_id) : null;
  if (selected && (!object || object.geometryHash !== selected.geometry_hash)) {
    throw new LivePointCoreError("GEOMETRY_HASH_MISMATCH", "Resolved geometry cannot be reloaded from the active snapshot.");
  }
  const geometryByteSize = object ? Buffer.byteLength(JSON.stringify(object.geometry), "utf8") : 0;
  if (geometryByteSize > LIVE_POINT_CAPS.inlineGeometryBytes) {
    throw new LivePointCoreError("INPUT_LIMIT_EXCEEDED", "Selected geometry exceeds the controlled inline geometry cap.");
  }
  const geometryReceipt = selected && object
    ? {
        geometry_id: selected.geometry_id,
        geometry_hash: selected.geometry_hash,
        geometry_type: selected.geometry_type,
        geometry_version: LIVE_POINT_GEOMETRY_VERSION,
        byte_size: geometryByteSize,
        source_feature_id: selected.source_id,
        source_namespace: "SyntheticFixture" as const,
        snapshot_id: snapshotAnchor.snapshot_id,
        origin: "source_vector" as const,
        validation: "valid" as const,
        rights_status: "cleared_for_experiment" as const
      }
    : null;
  const acquisition = acquisitionReceipt(snapshotAnchor, repository);
  const terms = termsReceipt(repository);
  const absenceReceipts = context?.category_summaries
    .flatMap((summary) => summary.absence_receipt ? [summary.absence_receipt] : []) ?? [];
  const missingData = context?.missing_data ?? [];
  const evidenceItems: LivePointEvidenceBundle["evidence_items"] = [
    {
      evidence_id: acquisition.receipt_id,
      kind: "source_identity",
      source_id: "synthetic_fixture",
      snapshot_id: snapshotAnchor.snapshot_id,
      field: "snapshot_acquisition",
      value: snapshotAnchor.source_as_of,
      proof_limit: "Injected synthetic non-runtime context only; not an official, live or real-world identity source."
    }
  ];
  if (selected) {
    evidenceItems.push({
      evidence_id: `evidence_entity_${selected.entity_hash.slice(0, 24)}`,
      kind: "source_identity",
      source_id: selected.source_id,
      snapshot_id: snapshotAnchor.snapshot_id,
      field: "selected_open_context_entity",
      value: selected.entity_id,
      proof_limit: "Open-context source identity only; not a parcel, cadastral, ownership, zoning or valuation record."
    });
  }
  if (geometryReceipt) {
    evidenceItems.push({
      evidence_id: geometryReceipt.geometry_id,
      kind: "geometry",
      source_id: geometryReceipt.source_feature_id,
      snapshot_id: geometryReceipt.snapshot_id,
      field: "source_geometry_hash",
      value: geometryReceipt.geometry_hash,
      proof_limit: "Source-observed screening geometry; official validation is required."
    });
  }
  for (const metric of context?.metrics ?? []) {
    evidenceItems.push({
      evidence_id: metric.metric_id,
      kind: "calculated_metric",
      source_id: metric.source_feature_ids.join(",") || "synthetic_fixture",
      snapshot_id: metric.snapshot_ids[0],
      field: metric.label,
      value: metric.value,
      proof_limit: metric.proof_limit
    });
  }

  const qualityStatus = resolution.status === "ambiguous"
    ? "blocked_by_identity" as const
    : resolution.status === "coordinate_context_only"
      ? "partial_open_context" as const
      : resolution.status === "resolved"
        ? "partial_open_context" as const
        : "insufficient_evidence" as const;
  const core = {
    bundle_version: 1 as const,
    created_at: snapshotAnchor.retrieved_at,
    quality_status: qualityStatus,
    rights_state: "cleared" as const,
    entity_id: selected?.entity_id ?? null,
    entity_hash: selected?.entity_hash ?? null,
    geometry_hash: selected?.geometry_hash ?? null,
    resolution_hash: resolution.resolution_hash,
    context_hash: context?.context_hash ?? null,
    metric_hashes: context?.metrics.map((metric) => metric.metric_hash) ?? [],
    snapshot_anchor: snapshotAnchor,
    geometry_receipt: geometryReceipt,
    acquisition_receipt: acquisition,
    terms_receipt: terms,
    evidence_items: evidenceItems,
    absence_receipts: absenceReceipts,
    missing_data: missingData,
    conflicts: [],
    limitations: [
      "Only an explicitly injected synthetic non-runtime fixture is accepted in this core checkpoint.",
      "Fixture context is partial and not official/live; non-observation is never proof of real-world absence.",
      "No parcel, cadastral, ownership, zoning, planning, valuation or investment conclusion is supported."
    ]
  };
  const bundleHash = semanticHash(core);
  return {
    bundle_id: `bundle_${bundleHash.slice(0, 24)}`,
    bundle_hash: bundleHash,
    ...core
  };
}
