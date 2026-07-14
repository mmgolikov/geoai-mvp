import { spatialDataRequiredCaveatV1 } from "@/src/types/spatial-data-v1";
import type { SpatialProductSourceMode } from "@/src/lib/spatial-b2/source-mode";

export type SpatialAttributionKind = "basemap" | "geoai_overlay" | "dataset" | "source_provider";

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
  schemaVersion: "spatial-attribution-v1";
  sourceMode: SpatialProductSourceMode;
  compactLabel: string;
  basemapAttribution: SpatialAttributionRecord;
  overlayAttributions: SpatialAttributionRecord[];
  activeAttributionIds: string[];
  caveat: string;
};

const accessedAt = "2026-07-14";

export const spatialAttributionRegistry: Record<string, SpatialAttributionRecord> = {
  "mapbox-basemap": {
    id: "mapbox-basemap",
    kind: "basemap",
    sourceName: "Mapbox basemap",
    notice: "Mapbox basemap attribution remains provided by the Mapbox map control.",
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
  openstreetmap: {
    id: "openstreetmap",
    kind: "dataset",
    sourceName: "OpenStreetMap",
    notice: "© OpenStreetMap contributors",
    datasetId: "geoai-controlled-osm-contract-fixture",
    datasetVersion: "fixture-v1",
    licenseName: "Open Database Licence (ODbL)",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    attributionUrl: "https://www.openstreetmap.org/copyright",
    accessedAt
  },
  "overture-maps-foundation": {
    id: "overture-maps-foundation",
    kind: "dataset",
    sourceName: "Overture Maps Foundation",
    notice: "Overture Maps Foundation attribution contract fixture",
    datasetId: "geoai-controlled-overture-contract-fixture",
    datasetVersion: "fixture-v1",
    licenseName: "Theme and upstream-source terms vary by dataset",
    licenseUrl: "https://docs.overturemaps.org/attribution/",
    attributionUrl: "https://docs.overturemaps.org/attribution/",
    accessedAt
  },
  "controlled-overture-source-provider": {
    id: "controlled-overture-source-provider",
    kind: "source_provider",
    sourceName: "Controlled source-provider fixture",
    notice: "Separate upstream-provider attribution record for contract testing only.",
    datasetId: "controlled-provider-record",
    datasetVersion: "fixture-v1",
    licenseName: "Fixture only",
    licenseUrl: null,
    attributionUrl: null,
    accessedAt
  }
};

export function aggregateSpatialAttribution(input: {
  sourceMode: SpatialProductSourceMode;
  activeAttributionIds: string[];
}): SpatialAttributionPayload {
  const activeAttributionIds = [...new Set(input.activeAttributionIds)].sort();
  const overlayAttributions = activeAttributionIds
    .map((id) => spatialAttributionRegistry[id])
    .filter((record): record is SpatialAttributionRecord => Boolean(record) && record.kind !== "basemap");
  const hasOpenContextAttribution = overlayAttributions.some(
    (record) => record.id === "openstreetmap" || record.id === "overture-maps-foundation"
  );

  return {
    schemaVersion: "spatial-attribution-v1",
    sourceMode: input.sourceMode,
    compactLabel: hasOpenContextAttribution
      ? "Open-context overlays · source details"
      : "GeoAI sample layers",
    basemapAttribution: spatialAttributionRegistry["mapbox-basemap"],
    overlayAttributions,
    activeAttributionIds,
    caveat: spatialDataRequiredCaveatV1
  };
}

export function normalizeSpatialAttributionPayload(value: unknown): SpatialAttributionPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Partial<SpatialAttributionPayload>;
  if (
    payload.schemaVersion !== "spatial-attribution-v1" ||
    typeof payload.compactLabel !== "string" ||
    !payload.basemapAttribution ||
    !Array.isArray(payload.overlayAttributions) ||
    !Array.isArray(payload.activeAttributionIds) ||
    typeof payload.caveat !== "string"
  ) {
    return null;
  }

  return payload as SpatialAttributionPayload;
}
