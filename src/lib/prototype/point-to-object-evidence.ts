import "server-only";

import {
  LIVE_POINT_CAVEAT,
  type Position
} from "@/src/lib/point-to-object/contracts";
import { semanticHash } from "@/src/lib/point-to-object/hash";
import {
  getFrozenFeature,
  getFrozenDisplayTags,
  resolvePrototypePoint,
  type FrozenCaseKey
} from "@/src/lib/point-to-object/frozen-osm-repository";

export type PointObjectEvidenceReference = {
  id: string;
  label: string;
  value: string | number | boolean | null;
  sourceId: string;
  proofLimit: string;
};

export type PointObjectEvidencePack = {
  protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_V1";
  evidencePackId: string;
  evidencePackHash: string;
  caseKey: FrozenCaseKey;
  caseId: string;
  coordinates: { longitude: number; latitude: number; crs: "EPSG:4326" };
  resolution: {
    status: "resolved";
    resolutionId: string;
    resolutionHash: string;
    matchMethod: string;
    evidenceQuality: "partial_open_context";
  };
  selectedObject: {
    entityId: string;
    sourceFeatureId: string;
    name: string | null;
    featureClass: string;
    geometryType: string;
    geometryHash: string;
    tags: Record<string, string>;
  };
  source: {
    name: "OpenStreetMap";
    sourceId: "SPAT-001";
    snapshotId: string;
    snapshotHash: string;
    observedAt: string;
    acquiredAt: string;
    freshness: "frozen_snapshot_feature_time_unavailable";
    rightsDecisionId: string;
    licenceId: "ODbL-1.0";
    attribution: string;
    licenceUrl: string;
    sourceOfferPath: string;
    officialStatus: "open_context_not_official";
    runtimeNetworkUsed: false;
  };
  nearbyContext: Array<{
    evidenceId: string;
    sourceFeatureId: string;
    name: string | null;
    categories: string[];
    featureClass: string;
    distanceM: number;
    method: string;
    proofLimit: string;
  }>;
  evidence: PointObjectEvidenceReference[];
  conflicts: string[];
  missingInformation: string[];
  limitations: string[];
  caveat: typeof LIVE_POINT_CAVEAT;
};

export class PointObjectEvidenceError extends Error {
  constructor(
    public readonly code: "OBJECT_NOT_RESOLVED" | "EVIDENCE_BINDING_FAILED",
    message: string
  ) {
    super(message);
    this.name = "PointObjectEvidenceError";
  }
}

export function buildPointObjectEvidencePack(
  caseKey: FrozenCaseKey,
  point: Position
): PointObjectEvidencePack {
  const resolved = resolvePrototypePoint(caseKey, point);
  if (resolved.resolution.status !== "resolved" || !resolved.selectedFeature ||
      !resolved.resolution.snapshot_anchor) {
    throw new PointObjectEvidenceError(
      "OBJECT_NOT_RESOLVED",
      "AI analysis requires one deterministically resolved frozen-source object."
    );
  }
  const sourceFeature = getFrozenFeature(caseKey, resolved.selectedFeature.id);
  if (!sourceFeature || sourceFeature.properties.sourceFeatureId !== resolved.selectedFeature.sourceFeatureId) {
    throw new PointObjectEvidenceError("EVIDENCE_BINDING_FAILED", "Selected object cannot be rebound to the frozen source feature.");
  }

  const selected = resolved.resolution.selected_object;
  const evidence: PointObjectEvidenceReference[] = [
    {
      id: "EVD-COORDINATES",
      label: "Clicked WGS84 coordinates",
      value: `${point[0].toFixed(7)}, ${point[1].toFixed(7)}`,
      sourceId: "user_point",
      proofLimit: "Submitted point only; it is not an official address or parcel locator."
    },
    {
      id: "EVD-OBJECT",
      label: "Selected frozen source object",
      value: resolved.selectedFeature.name ?? resolved.selectedFeature.sourceFeatureId,
      sourceId: resolved.selectedFeature.sourceFeatureId,
      proofLimit: "OpenStreetMap feature identity in the named snapshot only."
    },
    {
      id: "EVD-GEOMETRY",
      label: "Selected source geometry hash",
      value: resolved.selectedFeature.geometryHash,
      sourceId: resolved.selectedFeature.sourceFeatureId,
      proofLimit: "Open community map geometry; not an official parcel or cadastral boundary."
    },
    {
      id: "EVD-SNAPSHOT",
      label: "Frozen source snapshot",
      value: resolved.case.source.snapshotId,
      sourceId: resolved.case.source.sourceId,
      proofLimit: "Frozen snapshot; per-feature version and observation time are unavailable."
    },
    {
      id: "EVD-RIGHTS",
      label: "Source rights decision",
      value: resolved.case.source.rightsDecisionId,
      sourceId: resolved.case.source.sourceId,
      proofLimit: "ODbL/open-context reuse decision with attribution and source-offer obligations; not legal advice."
    }
  ];
  const nearbyContext = resolved.nearbyContext.slice(0, 6).map((item, index) => {
    const evidenceId = `EVD-CONTEXT-${index + 1}`;
    const sourceFeatureId = item.id.split(":openstreetmap:")[1] ?? item.id;
    const featureClass = item.categories[0] ?? "openstreetmap_object";
    evidence.push({
      id: evidenceId,
      label: item.name ?? item.categories.join(" / "),
      value: JSON.stringify({ sourceFeatureId, name: item.name, featureClass, distanceM: item.distanceM }),
      sourceId: sourceFeatureId,
      proofLimit: "Straight-line source-geometry distance in the frozen snapshot; not routing, travel time or service quality."
    });
    return {
      evidenceId,
      sourceFeatureId,
      name: item.name,
      categories: item.categories,
      featureClass,
      distanceM: item.distanceM,
      method: item.method,
      proofLimit: "Observed frozen-source context only; coverage remains partial and missing records do not prove absence."
    };
  });
  const conflicts = resolved.warnings
    .filter((warning) => warning.code === "SOURCE_CONFLICT")
    .map((warning) => warning.message);
  const core = {
    protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_V1" as const,
    caseKey,
    caseId: resolved.case.caseId,
    coordinates: { longitude: point[0], latitude: point[1], crs: "EPSG:4326" as const },
    resolution: {
      status: "resolved" as const,
      resolutionId: resolved.resolution.resolution_id,
      resolutionHash: resolved.resolution.resolution_hash,
      matchMethod: selected.match_method,
      evidenceQuality: "partial_open_context" as const
    },
    selectedObject: {
      entityId: selected.entity_id,
      sourceFeatureId: sourceFeature.properties.sourceFeatureId,
      name: resolved.selectedFeature.name,
      featureClass: resolved.selectedFeature.featureClass,
      geometryType: resolved.selectedFeature.geometry.type,
      geometryHash: resolved.selectedFeature.geometryHash,
      tags: getFrozenDisplayTags(caseKey, resolved.selectedFeature.id)
    },
    source: {
      name: "OpenStreetMap" as const,
      sourceId: "SPAT-001" as const,
      snapshotId: resolved.case.source.snapshotId,
      snapshotHash: resolved.resolution.snapshot_anchor.snapshot_hash,
      observedAt: resolved.case.source.observedAt,
      acquiredAt: resolved.case.source.acquiredAt,
      freshness: "frozen_snapshot_feature_time_unavailable" as const,
      rightsDecisionId: resolved.case.source.rightsDecisionId,
      licenceId: "ODbL-1.0" as const,
      attribution: resolved.case.source.attribution,
      licenceUrl: resolved.case.source.licenceUrl,
      sourceOfferPath: resolved.case.source.sourceOfferPath,
      officialStatus: "open_context_not_official" as const,
      runtimeNetworkUsed: false as const
    },
    nearbyContext,
    evidence,
    conflicts,
    missingInformation: [
      "Authoritative parcel/cadastral boundary and identifier",
      "Authoritative planning controls, use permissions and approvals",
      "Ownership/title and legal status",
      "Condition, capacity, programme, cost and valuation evidence",
      "Complete context coverage and current per-feature source version"
    ],
    limitations: [
      ...resolved.case.limitations,
      "The AI layer may summarize and question this pack but cannot replace deterministic selection or official validation."
    ],
    caveat: LIVE_POINT_CAVEAT
  };
  const evidencePackHash = semanticHash(core);
  return {
    evidencePackId: `p2o_evidence_${evidencePackHash.slice(0, 24)}`,
    evidencePackHash,
    ...core
  };
}
