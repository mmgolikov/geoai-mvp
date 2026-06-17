import type { DataSource, EvidenceItem } from "@/src/types/data-source";
import type { AnalysisScenarioId } from "@/src/types/geo";

export const dataSourceRegistry: DataSource[] = [
  {
    id: "synthetic-demo-layers",
    name: "Synthetic Demo Layers",
    category: "demo",
    geography: "Dubai demo extent",
    description: "Hand-authored synthetic layers used for the public GeoAI MVP demo.",
    provider: "GeoAI demo",
    sourceType: "mock",
    status: "mock",
    updateFrequency: "Static demo",
    coverage: {
      geography: "Dubai-focused synthetic geometries",
      spatialResolution: "Simplified demo polygons, lines, and points",
      temporalCoverage: "Prototype baseline"
    },
    licenseNote: {
      type: "synthetic",
      note: "Synthetic internal demo data. Not official and not decision-grade."
    },
    reliabilityLevel: "demo",
    lastUpdated: "2026-06-17",
    usedInScenarios: [
      "realEstateDevelopment",
      "investmentSiteSelection",
      "constructionMonitoring",
      "infrastructureUrbanPlanning",
      "climateRisk",
      "customQuery"
    ]
  },
  {
    id: "dubai-land-department-real-estate",
    name: "Dubai Land Department Real Estate Data",
    category: "real_estate",
    geography: "Dubai",
    description: "Future adapter placeholder for property transactions, ownership, valuation, and market signals.",
    provider: "Dubai Land Department",
    sourceType: "official",
    status: "planned",
    updateFrequency: "To be confirmed",
    coverage: {
      geography: "Dubai",
      spatialResolution: "Parcel or transaction-level where licensed",
      temporalCoverage: "To be confirmed"
    },
    licenseNote: {
      type: "official",
      note: "Requires source access, license review, and usage permissions before integration."
    },
    reliabilityLevel: "high",
    lastUpdated: "Not connected",
    usedInScenarios: ["realEstateDevelopment", "investmentSiteSelection"]
  },
  {
    id: "dubai-pulse-dld-apis",
    name: "Dubai Pulse DLD APIs",
    category: "real_estate",
    geography: "Dubai",
    description: "Future open/official API adapter placeholder for DLD-related public datasets available via Dubai Pulse.",
    provider: "Dubai Pulse / Dubai Land Department",
    sourceType: "official",
    status: "planned",
    updateFrequency: "To be confirmed",
    coverage: {
      geography: "Dubai",
      spatialResolution: "Dataset-dependent",
      temporalCoverage: "Dataset-dependent"
    },
    licenseNote: {
      type: "official",
      note: "Use depends on Dubai Pulse terms, endpoint availability, and dataset-specific restrictions."
    },
    reliabilityLevel: "high",
    lastUpdated: "Not connected",
    usedInScenarios: ["realEstateDevelopment", "investmentSiteSelection"]
  },
  {
    id: "dubai-municipality-gis-planning",
    name: "Dubai Municipality GIS / Planning Data",
    category: "planning_gis",
    geography: "Dubai",
    description: "Future adapter placeholder for zoning, planning, municipal GIS, and development control layers.",
    provider: "Dubai Municipality",
    sourceType: "official",
    status: "planned",
    updateFrequency: "To be confirmed",
    coverage: {
      geography: "Dubai",
      spatialResolution: "Planning layer dependent",
      temporalCoverage: "To be confirmed"
    },
    licenseNote: {
      type: "official",
      note: "Requires official access path and planning-data usage review."
    },
    reliabilityLevel: "high",
    lastUpdated: "Not connected",
    usedInScenarios: ["realEstateDevelopment", "infrastructureUrbanPlanning", "climateRisk"]
  },
  {
    id: "dubai-municipality-open-data",
    name: "Dubai Municipality Open Data",
    category: "planning_gis",
    geography: "Dubai",
    description: "Future placeholder for publicly available municipal open data layers where permitted.",
    provider: "Dubai Municipality / Dubai Data",
    sourceType: "open_data",
    status: "planned",
    updateFrequency: "Dataset-dependent",
    coverage: {
      geography: "Dubai",
      spatialResolution: "Dataset-dependent",
      temporalCoverage: "Dataset-dependent"
    },
    licenseNote: {
      type: "open",
      note: "Open-data terms and attribution requirements must be reviewed per dataset."
    },
    reliabilityLevel: "medium",
    lastUpdated: "Not connected",
    usedInScenarios: ["infrastructureUrbanPlanning", "climateRisk"]
  },
  {
    id: "dubai-2040-urban-master-plan",
    name: "Dubai 2040 Urban Master Plan",
    category: "planning_gis",
    geography: "Dubai",
    description: "Future planning-context placeholder for strategic growth corridors and urban policy context.",
    provider: "Government of Dubai",
    sourceType: "official",
    status: "planned",
    updateFrequency: "Policy update cycle",
    coverage: {
      geography: "Dubai",
      spatialResolution: "Strategic planning zones",
      temporalCoverage: "2040 planning horizon"
    },
    licenseNote: {
      type: "official",
      note: "Use for report evidence requires citation and source-use review."
    },
    reliabilityLevel: "high",
    lastUpdated: "Not connected",
    usedInScenarios: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
  },
  {
    id: "osm-geofabrik",
    name: "OpenStreetMap / Geofabrik",
    category: "infrastructure",
    geography: "UAE / Dubai",
    description: "Future open-data adapter placeholder for roads, POIs, transport context, and infrastructure approximations.",
    provider: "OpenStreetMap contributors / Geofabrik",
    sourceType: "open_data",
    status: "planned",
    updateFrequency: "Frequent open-data extracts",
    coverage: {
      geography: "UAE / Dubai",
      spatialResolution: "Feature-level OSM geometries",
      temporalCoverage: "Current extract dependent"
    },
    licenseNote: {
      type: "open",
      note: "Requires ODbL attribution and compliance handling."
    },
    reliabilityLevel: "medium",
    lastUpdated: "Not connected",
    usedInScenarios: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
  },
  {
    id: "copernicus-sentinel",
    name: "Copernicus Sentinel",
    category: "remote_sensing",
    geography: "Global / Dubai",
    description: "Future remote sensing adapter placeholder for medium-resolution imagery and change context.",
    provider: "Copernicus Programme",
    sourceType: "open_data",
    status: "planned",
    updateFrequency: "Multi-day revisit depending on mission and cloud conditions",
    coverage: {
      geography: "Global",
      spatialResolution: "10m to 20m bands for common Sentinel-2 products",
      temporalCoverage: "Mission archive dependent"
    },
    licenseNote: {
      type: "open",
      note: "Open data with attribution and product-specific usage notes."
    },
    reliabilityLevel: "medium",
    lastUpdated: "Not connected",
    usedInScenarios: ["constructionMonitoring", "climateRisk", "infrastructureUrbanPlanning"]
  },
  {
    id: "usgs-landsat",
    name: "USGS Landsat",
    category: "remote_sensing",
    geography: "Global / Dubai",
    description: "Future remote sensing adapter placeholder for long-run historical imagery and environmental indicators.",
    provider: "USGS / NASA Landsat",
    sourceType: "open_data",
    status: "planned",
    updateFrequency: "Mission revisit cycle",
    coverage: {
      geography: "Global",
      spatialResolution: "30m for common multispectral products",
      temporalCoverage: "Historical archive"
    },
    licenseNote: {
      type: "open",
      note: "Open data; attribution and product citation should be included."
    },
    reliabilityLevel: "medium",
    lastUpdated: "Not connected",
    usedInScenarios: ["climateRisk", "constructionMonitoring"]
  },
  {
    id: "commercial-vhr-imagery",
    name: "Commercial Very High Resolution Imagery",
    category: "remote_sensing",
    geography: "Dubai / customer-defined AOIs",
    description: "Commercial imagery placeholder for high-resolution construction monitoring and site validation.",
    provider: "Commercial imagery provider TBD",
    sourceType: "commercial",
    status: "planned",
    updateFrequency: "Contract-dependent",
    coverage: {
      geography: "Customer-defined AOIs",
      spatialResolution: "Sub-meter to few-meter depending on provider",
      temporalCoverage: "Contract-dependent"
    },
    licenseNote: {
      type: "commercial",
      note: "Requires commercial license, access control, and redistribution review."
    },
    reliabilityLevel: "high",
    lastUpdated: "Not connected",
    usedInScenarios: ["constructionMonitoring", "investmentSiteSelection"]
  },
  {
    id: "customer-uploaded-documents",
    name: "Customer Uploaded Documents",
    category: "documents",
    geography: "Customer-provided",
    description: "Placeholder for customer-provided PDFs, planning documents, investment memos, and site files.",
    provider: "Customer",
    sourceType: "customer",
    status: "planned",
    updateFrequency: "User upload",
    coverage: {
      geography: "Document-dependent",
      spatialResolution: "Document-dependent",
      temporalCoverage: "Document-dependent"
    },
    licenseNote: {
      type: "customer",
      note: "Access and reuse governed by customer agreement and workspace permissions."
    },
    reliabilityLevel: "medium",
    lastUpdated: "Not connected",
    usedInScenarios: [
      "realEstateDevelopment",
      "investmentSiteSelection",
      "constructionMonitoring",
      "infrastructureUrbanPlanning",
      "climateRisk",
      "customQuery"
    ]
  }
];

export function getDataSourceById(sourceId: string) {
  return dataSourceRegistry.find((source) => source.id === sourceId) ?? null;
}

export function getScenarioDataSources(scenarioId: AnalysisScenarioId) {
  return dataSourceRegistry.filter((source) => source.usedInScenarios.includes(scenarioId));
}

export function createEvidenceItem(
  id: string,
  sourceId: string,
  label: string,
  description: string,
  confidence: EvidenceItem["confidence"] = "demo"
): EvidenceItem {
  const source = getDataSourceById(sourceId);

  return {
    id,
    label,
    description,
    sourceId,
    sourceStatus: source?.status ?? "unavailable",
    sourceType: source?.sourceType ?? "mock",
    confidence
  };
}
