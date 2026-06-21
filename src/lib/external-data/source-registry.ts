export type ExternalDataSource = {
  id: string;
  name: string;
  provider: string;
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
  updateMode: "manual" | "scripted" | "api-on-demand" | "planned";
  lastUpdated?: string;
  usedInAnalysis?: boolean;
  confidence: "high" | "medium" | "low" | "requires-validation";
  disclaimer: string;
};

export const externalDataSources: ExternalDataSource[] = [
  {
    id: "dld-dubai-pulse-transactions",
    name: "DLD / Dubai Pulse transactions",
    provider: "Dubai Land Department / Dubai Pulse",
    category: "market",
    status: "manual-import",
    sourceType: "official-open-data",
    updateMode: "manual",
    usedInAnalysis: false,
    confidence: "requires-validation",
    disclaimer: "Open official dataset snapshot; not a live official transactional feed."
  },
  {
    id: "osm-geofabrik-baseline",
    name: "OSM / Geofabrik open geospatial baseline",
    provider: "OpenStreetMap / Geofabrik-compatible extract",
    category: "spatial",
    status: "manual-import",
    sourceType: "open-data",
    updateMode: "manual",
    usedInAnalysis: false,
    confidence: "medium",
    disclaimer: "Open geospatial baseline; not official municipal GIS, zoning or parcel boundary data."
  },
  {
    id: "open-meteo-climate",
    name: "Open-Meteo historical weather",
    provider: "Open-Meteo",
    category: "climate",
    status: "connected-api",
    sourceType: "reanalysis",
    updateMode: "api-on-demand",
    usedInAnalysis: false,
    confidence: "medium",
    disclaimer: "Climate context from reanalysis/model data; not a site-specific engineering or insurance assessment."
  },
  {
    id: "copernicus-sentinel-catalog",
    name: "Copernicus / Sentinel imagery availability",
    provider: "Copernicus / Sentinel Hub",
    category: "satellite",
    status: "not-configured",
    sourceType: "satellite-catalog",
    updateMode: "planned",
    usedInAnalysis: false,
    confidence: "requires-validation",
    disclaimer: "Satellite imagery availability check only; analytics pipeline planned."
  },
  {
    id: "geodubai-municipality-validation",
    name: "GeoDubai / Dubai Municipality official validation",
    provider: "GeoDubai / Dubai Municipality",
    category: "official-validation",
    status: "planned-access",
    sourceType: "planned-official",
    updateMode: "planned",
    usedInAnalysis: false,
    confidence: "requires-validation",
    disclaimer: "Planned official validation source; not connected in this demo."
  },
  {
    id: "dld-api-gateway-validation",
    name: "DLD API Gateway / official validation path",
    provider: "Dubai Land Department",
    category: "official-validation",
    status: "planned-access",
    sourceType: "planned-official",
    updateMode: "planned",
    usedInAnalysis: false,
    confidence: "requires-validation",
    disclaimer: "Enterprise validation/integration path; not connected in this demo."
  }
];

export function getExternalDataSource(id: string) {
  return externalDataSources.find((source) => source.id === id) ?? null;
}

export function getExternalDataSourcesByCategory(category: ExternalDataSource["category"]) {
  return externalDataSources.filter((source) => source.category === category);
}
