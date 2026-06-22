export type ExternalDataSource = {
  id: string;
  name: string;
  provider: string;
  geography: string;
  category: "market" | "spatial" | "climate" | "satellite" | "official-validation";
  status:
    | "connected-snapshot"
    | "connected-api"
    | "manual-import"
    | "planned-access"
    | "not-configured";
  sourceType:
    | "official-open-data"
    | "open-data"
    | "reanalysis"
    | "satellite-catalog"
    | "customer-uploaded"
    | "planned-official";
  accessMode: "snapshot" | "api-context" | "sample-fallback" | "planned-validation" | "customer-upload";
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
};

export type DataReadinessStatus = "connected" | "snapshot_available" | "sample_fallback" | "planned" | "missing";

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

export const externalDataCaveat =
  "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const commonForbiddenClaims = [
  "live official integration",
  "legal, cadastral, zoning, planning or valuation conclusion",
  "certified flood risk",
  "engineering-grade climate assessment",
  "insurance-grade hazard model"
];

export const externalDataSources: ExternalDataSource[] = [
  {
    id: "dld-dubai-pulse-transactions",
    name: "DLD / Dubai Pulse market snapshot",
    provider: "Dubai Land Department / Dubai Pulse",
    geography: "Dubai",
    category: "market",
    status: "manual-import",
    sourceType: "official-open-data",
    accessMode: "snapshot",
    updateMode: "manual",
    freshness: "static-snapshot",
    usedInAnalysis: false,
    confidence: "requires-validation",
    licenseNote: "Use depends on dataset-specific Dubai Pulse/DLD terms, attribution and redistribution limits.",
    validationStatus: "snapshot-not-live",
    reliabilityTier: "requires-validation",
    officialClaimAllowed: false,
    limitations: [
      "Snapshot/manual import only; no live official DLD feed is connected.",
      "Schema varies by source file and may not include complete transaction semantics.",
      externalDataCaveat
    ],
    allowedUse: [
      "screening-level market context",
      "source lineage and data readiness display",
      "hypothesis support for investor demo memos"
    ],
    forbiddenClaims: commonForbiddenClaims,
    disclaimer: "DLD / Dubai Pulse snapshot context; not a live official transactional feed."
  },
  {
    id: "osm-geofabrik-baseline",
    name: "OSM / Geofabrik open geospatial baseline",
    provider: "OpenStreetMap / Geofabrik-compatible extract",
    geography: "Dubai / UAE",
    category: "spatial",
    status: "manual-import",
    sourceType: "open-data",
    accessMode: "snapshot",
    updateMode: "manual",
    freshness: "static-snapshot",
    usedInAnalysis: false,
    confidence: "medium",
    licenseNote: "Requires ODbL attribution and compliance handling for production use.",
    validationStatus: "snapshot-not-live",
    reliabilityTier: "medium",
    officialClaimAllowed: false,
    limitations: [
      "Open geospatial context only; not official municipal GIS, zoning or parcel boundary data.",
      "Completeness depends on the dated extract or sample fixture.",
      externalDataCaveat
    ],
    allowedUse: ["road/POI/landuse context", "accessibility screening", "source lineage display"],
    forbiddenClaims: commonForbiddenClaims,
    disclaimer: "Open geospatial baseline; not official municipal GIS, zoning or parcel boundary data."
  },
  {
    id: "open-meteo-climate",
    name: "Open-Meteo historical weather",
    provider: "Open-Meteo",
    geography: "Global / Dubai",
    category: "climate",
    status: "connected-api",
    sourceType: "reanalysis",
    accessMode: "api-context",
    updateMode: "api-on-demand",
    freshness: "on-demand-context",
    usedInAnalysis: false,
    confidence: "medium",
    licenseNote: "Open-Meteo API terms and attribution apply; cache and citation policy required for production.",
    validationStatus: "open-context",
    reliabilityTier: "medium",
    officialClaimAllowed: false,
    limitations: [
      "Screening-level heat/rainfall proxy from open climate context.",
      "Not site-specific engineering, drainage, flood or insurance-grade hazard modeling.",
      externalDataCaveat
    ],
    allowedUse: ["climate context", "screening-level heat/rainfall proxy", "resilience due diligence framing"],
    forbiddenClaims: commonForbiddenClaims,
    disclaimer: "Climate context from reanalysis/model data; not a site-specific engineering or insurance assessment."
  },
  {
    id: "copernicus-sentinel-catalog",
    name: "Copernicus / Sentinel imagery availability",
    provider: "Copernicus / Sentinel Hub",
    geography: "Global / Dubai",
    category: "satellite",
    status: "not-configured",
    sourceType: "satellite-catalog",
    accessMode: "planned-validation",
    updateMode: "planned",
    freshness: "planned",
    usedInAnalysis: false,
    confidence: "requires-validation",
    licenseNote: "Open mission data/product-specific license and API access review required.",
    validationStatus: "planned-validation",
    reliabilityTier: "requires-validation",
    officialClaimAllowed: false,
    limitations: [
      "Metadata availability path only; no imagery analytics pipeline is connected.",
      externalDataCaveat
    ],
    allowedUse: ["planned source readiness", "future remote-sensing evidence lineage"],
    forbiddenClaims: commonForbiddenClaims,
    disclaimer: "Satellite imagery availability check only; analytics pipeline planned."
  },
  {
    id: "geodubai-municipality-validation",
    name: "GeoDubai / Dubai Municipality official validation",
    provider: "GeoDubai / Dubai Municipality",
    geography: "Dubai",
    category: "official-validation",
    status: "planned-access",
    sourceType: "planned-official",
    accessMode: "planned-validation",
    updateMode: "planned",
    freshness: "planned",
    usedInAnalysis: false,
    confidence: "requires-validation",
    licenseNote: "Requires official access, permissions and use-case-specific validation.",
    validationStatus: "planned-validation",
    reliabilityTier: "requires-validation",
    officialClaimAllowed: false,
    limitations: [
      "Planned official validation only; not connected in this demo.",
      externalDataCaveat
    ],
    allowedUse: ["validation roadmap", "source gap disclosure"],
    forbiddenClaims: commonForbiddenClaims,
    disclaimer: "Planned official validation source; not connected in this demo."
  },
  {
    id: "dld-api-gateway-validation",
    name: "DLD API Gateway / official validation path",
    provider: "Dubai Land Department",
    geography: "Dubai",
    category: "official-validation",
    status: "planned-access",
    sourceType: "planned-official",
    accessMode: "planned-validation",
    updateMode: "planned",
    freshness: "planned",
    usedInAnalysis: false,
    confidence: "requires-validation",
    licenseNote: "Requires enterprise access path, auth, contract and permission review.",
    validationStatus: "planned-validation",
    reliabilityTier: "requires-validation",
    officialClaimAllowed: false,
    limitations: [
      "Enterprise validation/integration path; not connected in this demo.",
      externalDataCaveat
    ],
    allowedUse: ["future official validation roadmap"],
    forbiddenClaims: commonForbiddenClaims,
    disclaimer: "Enterprise validation/integration path; not connected in this demo."
  }
];

export function getExternalDataSource(id: string) {
  return externalDataSources.find((source) => source.id === id) ?? null;
}

export function getExternalDataSourcesByCategory(category: ExternalDataSource["category"]) {
  return externalDataSources.filter((source) => source.category === category);
}
