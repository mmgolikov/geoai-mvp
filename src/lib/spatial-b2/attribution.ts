import { spatialDataRequiredCaveatV1 } from "@/src/types/spatial-data-v1";
import type { SpatialProductSourceMode } from "@/src/lib/spatial-b2/source-mode";

export type SpatialAttributionKind = "basemap" | "geoai_overlay" | "dataset" | "source_provider" | "user_data";
export type SpatialBasemapMode = "mapbox" | "fallback_grid" | "none";

export type SpatialAttributionRecord = {
  id: string;
  kind: SpatialAttributionKind;
  sourceName: string;
  notice: string;
  datasetId: string | null;
  datasetVersion: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  attributionUrl: string | null;
  accessedAt: string;
};

export type SpatialAttributionPayload = {
  schemaVersion: "spatial-attribution-v2";
  sourceMode: SpatialProductSourceMode;
  basemapMode: SpatialBasemapMode;
  compactLabel: string;
  basemapAttribution: SpatialAttributionRecord | null;
  overlayAttributions: SpatialAttributionRecord[];
  activeAttributionIds: string[];
  caveat: string;
};

export type VisibleSpatialAttributionInput = {
  catalogueLayers: Array<{ visible: boolean; attributionIds: string[] }>;
  localOpenGeodataVisible: boolean;
  userUploadedDataVisible: boolean;
};

const accessedAt = "2026-07-14";

export const spatialAttributionRegistry: Record<string, SpatialAttributionRecord> = {
  "mapbox-basemap": {
    id: "mapbox-basemap",
    kind: "basemap",
    sourceName: "Mapbox basemap",
    notice: "Basemap © Mapbox; underlying map data © OpenStreetMap contributors. The exported image is screening context only.",
    datasetId: null,
    datasetVersion: null,
    licenseName: "Mapbox terms and attribution",
    licenseUrl: "https://www.mapbox.com/legal/tos/",
    attributionUrl: "https://www.mapbox.com/about/maps/",
    accessedAt
  },
  "geoai-sample-layers": {
    id: "geoai-sample-layers",
    kind: "geoai_overlay",
    sourceName: "GeoAI sample layers",
    notice: "Synthetic Dubai sample geometry for screening workflow demonstration.",
    datasetId: "geoai-current-synthetic-dubai-seed",
    datasetVersion: "spatial-demo-v1",
    licenseName: null,
    licenseUrl: null,
    attributionUrl: null,
    accessedAt
  },
  "local-open-geodata-fixture": {
    id: "local-open-geodata-fixture",
    kind: "dataset",
    sourceName: "GeoAI local OSM-style fixture",
    notice: "Local open-geodata sample fixture; not live OSM and no external licence is inferred.",
    datasetId: "geoai-open-geodata-baseline",
    datasetVersion: "local-fixture-v1",
    licenseName: null,
    licenseUrl: null,
    attributionUrl: null,
    accessedAt
  },
  "user-provided-local-data": {
    id: "user-provided-local-data",
    kind: "user_data",
    sourceName: "User-provided local data",
    notice: "User-provided data; official/client validation required; no external licence is inferred automatically.",
    datasetId: null,
    datasetVersion: null,
    licenseName: null,
    licenseUrl: null,
    attributionUrl: null,
    accessedAt
  },
  "controlled-open-context-point-fixture": {
    id: "controlled-open-context-point-fixture",
    kind: "dataset",
    sourceName: "Controlled open-context point fixture",
    notice: "Invented point geometry for attribution and lineage contract testing; no provider geometry is included.",
    datasetId: "geoai-controlled-osm-contract-fixture",
    datasetVersion: "fixture-v1",
    licenseName: "Controlled fixture only",
    licenseUrl: null,
    attributionUrl: null,
    accessedAt
  },
  "controlled-overture-contract-fixture": {
    id: "controlled-overture-contract-fixture",
    kind: "dataset",
    sourceName: "Controlled Overture contract fixture",
    notice: "Invented polygon geometry for provider-attribution contract testing; no Overture feature geometry is included.",
    datasetId: "geoai-controlled-overture-contract-fixture",
    datasetVersion: "fixture-v1",
    licenseName: "Controlled fixture only",
    licenseUrl: null,
    attributionUrl: "https://docs.overturemaps.org/attribution/",
    accessedAt
  },
  "controlled-overture-source-provider": {
    id: "controlled-overture-source-provider",
    kind: "source_provider",
    sourceName: "Controlled source-provider fixture",
    notice: "Separate invented upstream-provider attribution record for contract testing only.",
    datasetId: "controlled-provider-record",
    datasetVersion: "fixture-v1",
    licenseName: "Controlled fixture only",
    licenseUrl: null,
    attributionUrl: null,
    accessedAt
  }
};

export function deriveVisibleSpatialAttributionIds(input: VisibleSpatialAttributionInput) {
  const ids = input.catalogueLayers
    .filter((layer) => layer.visible)
    .flatMap((layer) => layer.attributionIds);

  if (input.localOpenGeodataVisible) ids.push("local-open-geodata-fixture");
  if (input.userUploadedDataVisible) ids.push("user-provided-local-data");

  return [...new Set(ids)].sort();
}

export function findSpatialAttributionCoverageMismatch(input: VisibleSpatialAttributionInput, activeAttributionIds: string[]) {
  const expected = deriveVisibleSpatialAttributionIds(input);
  const active = [...new Set(activeAttributionIds)].sort();
  return {
    expected,
    active,
    missing: expected.filter((id) => !active.includes(id)),
    unexpected: active.filter((id) => !expected.includes(id))
  };
}

export function aggregateSpatialAttribution(input: {
  sourceMode: SpatialProductSourceMode;
  basemapMode: SpatialBasemapMode;
  activeAttributionIds: string[];
}): SpatialAttributionPayload {
  const activeAttributionIds = [...new Set(input.activeAttributionIds)].sort();
  const overlayAttributions = activeAttributionIds
    .map((id) => spatialAttributionRegistry[id])
    .filter((record): record is SpatialAttributionRecord => Boolean(record) && record.kind !== "basemap");
  const hasNonSyntheticAttribution = overlayAttributions.some((record) => record.id !== "geoai-sample-layers");

  return {
    schemaVersion: "spatial-attribution-v2",
    sourceMode: input.sourceMode,
    basemapMode: input.basemapMode,
    compactLabel: hasNonSyntheticAttribution
      ? "Active local/test layers · source details"
      : "GeoAI sample layers",
    basemapAttribution: input.basemapMode === "mapbox" ? spatialAttributionRegistry["mapbox-basemap"] : null,
    overlayAttributions,
    activeAttributionIds,
    caveat: spatialDataRequiredCaveatV1
  };
}

export function normalizeSpatialAttributionPayload(value: unknown): SpatialAttributionPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Partial<SpatialAttributionPayload>;
  if (
    payload.schemaVersion !== "spatial-attribution-v2" ||
    !["mapbox", "fallback_grid", "none"].includes(payload.basemapMode ?? "") ||
    typeof payload.compactLabel !== "string" ||
    (payload.basemapMode === "mapbox" && !payload.basemapAttribution) ||
    (payload.basemapMode !== "mapbox" && payload.basemapAttribution !== null) ||
    !Array.isArray(payload.overlayAttributions) ||
    !Array.isArray(payload.activeAttributionIds) ||
    typeof payload.caveat !== "string"
  ) {
    return null;
  }

  return payload as SpatialAttributionPayload;
}
