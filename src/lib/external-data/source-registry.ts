import {
  publicDataCaveat,
  publicSourceCatalog
} from "@/src/lib/external-data/public-source-catalog";
import type {
  PublicSourceAccessMode,
  PublicSourceCatalogItem,
  PublicSourceCategory,
  PublicSourceConnectionStatus
} from "@/src/lib/external-data/public-source-types";
import type { SourceStatus } from "@/src/lib/external-data/source-status";

export type ExternalDataSource = {
  id: string;
  name: string;
  provider: string;
  geography: string;
  category: PublicSourceCategory;
  status: PublicSourceConnectionStatus;
  sourceType:
    | "official-open-data"
    | "open-data"
    | "reanalysis"
    | "satellite-catalog"
    | "customer-uploaded"
    | "planned-official";
  accessMode: PublicSourceAccessMode | "snapshot" | "sample_fallback" | "customer-upload";
  updateMode: "manual" | "scripted" | "api-on-demand" | "planned";
  freshness: "static-snapshot" | "on-demand-context" | "sample" | "planned" | "unknown";
  lastUpdated?: string;
  usedInAnalysis?: boolean;
  confidence: "high" | "medium" | "low" | "requires-validation";
  licenseNote: string;
  validationStatus: "sample-only" | "snapshot-not-live" | "open-context" | "planned-validation" | "customer-provided";
  reliabilityTier: "demo" | "low" | "medium" | "high" | "requires-validation";
  officialClaimAllowed: boolean;
  limitations: string[];
  allowedUse: string[];
  forbiddenClaims: string[];
  disclaimer: string;
  updateCadence: string;
  dataQualityTier: PublicSourceCatalogItem["dataQualityTier"];
};

export type DataReadinessStatus = SourceStatus;

export type DataReadinessResult = {
  sourceId: string;
  sourceName: string;
  status: DataReadinessStatus;
  lastUpdated: string | null;
  recordCount?: number;
  coverageArea: string;
  confidence: ExternalDataSource["confidence"];
  caveat: string;
};

export type SourceLineageItem = {
  sourceId: string;
  sourceName: string;
  category: ExternalDataSource["category"];
  dataMode: DataReadinessStatus | ExternalDataSource["accessMode"];
  usedIn: string;
  confidence: ExternalDataSource["confidence"];
  limitation: string;
  validationRequired: boolean;
};

export const externalDataCaveat = publicDataCaveat;

const legacyIdAliases: Record<string, string> = {
  "dld-dubai-pulse-transactions": "dld-dubai-pulse-public-transactions",
  "osm-geofabrik-baseline": "osm-geofabrik-open-roads",
  "copernicus-sentinel-catalog": "copernicus-sentinel-metadata"
};

function confidenceFromTier(tier: PublicSourceCatalogItem["dataQualityTier"]): ExternalDataSource["confidence"] {
  if (tier === "snapshot" || tier === "open-context" || tier === "screening") return "medium";
  if (tier === "sample") return "low";
  return "requires-validation";
}

function sourceTypeFromCatalog(source: PublicSourceCatalogItem): ExternalDataSource["sourceType"] {
  if (source.category === "official-validation" || source.accessMode === "permissioned" || source.accessMode === "planned-validation") {
    return "planned-official";
  }
  if (source.category === "climate" || source.category === "energy") return "reanalysis";
  if (source.category === "satellite-metadata") return "satellite-catalog";
  if (source.provider.includes("Dubai Land Department") || source.provider.includes("Dubai Pulse")) return "official-open-data";
  return "open-data";
}

function updateModeFromAccess(accessMode: PublicSourceAccessMode): ExternalDataSource["updateMode"] {
  if (accessMode === "open-api" || accessMode === "api-context" || accessMode === "token-optional") return "api-on-demand";
  if (accessMode === "planned-validation" || accessMode === "permissioned") return "planned";
  return "manual";
}

function freshnessFromStatus(status: PublicSourceConnectionStatus): ExternalDataSource["freshness"] {
  if (status === "connected") return "on-demand-context";
  if (status === "snapshot_available" || status === "manual_import_ready") return "static-snapshot";
  if (status === "sample_fallback") return "sample";
  if (status === "planned" || status === "permission_required" || status === "token_required") return "planned";
  return "unknown";
}

function validationStatusFromSource(source: PublicSourceCatalogItem): ExternalDataSource["validationStatus"] {
  if (source.connectionStatus === "sample_fallback") return "sample-only";
  if (source.category === "official-validation" || source.connectionStatus === "permission_required" || source.connectionStatus === "planned") {
    return "planned-validation";
  }
  if (source.accessMode === "open-api" || source.accessMode === "api-context") return "open-context";
  return "snapshot-not-live";
}

function reliabilityFromSource(source: PublicSourceCatalogItem): ExternalDataSource["reliabilityTier"] {
  if (source.dataQualityTier === "requires-validation") return "requires-validation";
  if (source.dataQualityTier === "sample") return "demo";
  if (source.dataQualityTier === "snapshot" || source.dataQualityTier === "open-context" || source.dataQualityTier === "screening") return "medium";
  return "low";
}

function toExternalSource(source: PublicSourceCatalogItem): ExternalDataSource {
  return {
    id: source.id,
    name: source.name,
    provider: source.provider,
    geography: source.geography,
    category: source.category,
    status: source.connectionStatus,
    sourceType: sourceTypeFromCatalog(source),
    accessMode: source.accessMode,
    updateMode: updateModeFromAccess(source.accessMode),
    freshness: freshnessFromStatus(source.connectionStatus),
    usedInAnalysis: source.connectionStatus === "connected" || source.connectionStatus === "snapshot_available",
    confidence: confidenceFromTier(source.dataQualityTier),
    licenseNote: source.licenseNote,
    validationStatus: validationStatusFromSource(source),
    reliabilityTier: reliabilityFromSource(source),
    officialClaimAllowed: source.officialClaimAllowed,
    limitations: source.limitations,
    allowedUse: source.allowedUse,
    forbiddenClaims: source.forbiddenClaims,
    disclaimer: `${source.name}: ${source.limitations[0]} ${source.caveat}`,
    updateCadence: source.updateCadence,
    dataQualityTier: source.dataQualityTier
  };
}

const legacyExternalSources: ExternalDataSource[] = [
  {
    ...toExternalSource(publicSourceCatalog.find((source) => source.id === "dld-dubai-pulse-public-transactions")!),
    id: "dld-dubai-pulse-transactions",
    name: "DLD / Dubai Pulse public snapshot"
  },
  {
    ...toExternalSource(publicSourceCatalog.find((source) => source.id === "osm-geofabrik-open-roads")!),
    id: "osm-geofabrik-baseline",
    name: "OSM / Geofabrik open snapshot"
  },
  {
    ...toExternalSource(publicSourceCatalog.find((source) => source.id === "copernicus-sentinel-metadata")!),
    id: "copernicus-sentinel-catalog",
    name: "Copernicus / Sentinel metadata availability"
  }
];

export const externalDataSources: ExternalDataSource[] = [
  ...legacyExternalSources,
  ...publicSourceCatalog.map(toExternalSource)
];

export function getExternalDataSource(id: string) {
  const resolvedId = legacyIdAliases[id] ?? id;
  return externalDataSources.find((source) => source.id === id || source.id === resolvedId) ?? null;
}

export function getExternalDataSourcesByCategory(category: ExternalDataSource["category"]) {
  return externalDataSources.filter((source) => source.category === category);
}
