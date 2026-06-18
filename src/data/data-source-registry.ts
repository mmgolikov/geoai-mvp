import type { DataSource, EvidenceItem } from "@/src/types/data-source";
import type { AnalysisScenarioId } from "@/src/types/geo";

const baseDataSourceRegistry: DataSource[] = [
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
    id: "demo-market-context-seed",
    name: "Demo Market Context / seed_static",
    category: "demo",
    geography: "Dubai demo market areas",
    description: "Seed_static demo-normalized market context used for area matching, qualitative indices and data quality notes.",
    provider: "GeoAI demo",
    sourceType: "mock",
    status: "mock",
    integrationStatus: "active_demo",
    updateFrequency: "Static demo",
    coverage: {
      geography: "Dubai-focused seed areas",
      spatialResolution: "Area-level matching",
      temporalCoverage: "Prototype baseline"
    },
    licenseNote: {
      type: "synthetic",
      note: "Seed/demo-normalized market context. Not official market data and not decision-grade."
    },
    accessNote: "No external access required for the public prototype.",
    usageInGeoAI: "Used to demonstrate how market context, confidence notes and validation paths appear in analysis.",
    limitations: "Does not represent official DLD, rental, transaction, zoning or absorption evidence.",
    recommendedNextStep: "Validate against DLD, Dubai Pulse, customer and/or licensed datasets during pilot setup.",
    maturityLevel: "demo_normalized",
    usedInCurrentPrototype: true,
    plannedForPilot: false,
    decisionGrade: false,
    reliabilityLevel: "demo",
    lastUpdated: "2026-06-18",
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
    id: "open-geodata-baseline-sample",
    name: "Open Geospatial Baseline Context",
    category: "infrastructure",
    geography: "Dubai sample extent",
    description: "Local OSM-style sample baseline for roads, POI anchors, landuse context and accessibility metrics.",
    provider: "Local open-geodata ingestion prototype",
    sourceType: "open_geospatial",
    status: "mock",
    integrationStatus: "active_demo",
    updateFrequency: "Manual sample ingestion",
    coverage: {
      geography: "Dubai-focused sample fixtures",
      spatialResolution: "Road, POI and landuse feature context",
      temporalCoverage: "Prototype fixture baseline"
    },
    licenseNote: {
      type: "open",
      note: "OSM/Geofabrik/Overpass-compatible path. Production use requires ODbL attribution and compliance review."
    },
    accessNote: "No live API access in v0.1; normalized from local sample fixtures only.",
    usageInGeoAI: "Used for indicative road, POI, anchor and accessibility context in maps, prompts and reports.",
    limitations: "Not official GIS, zoning, parcel, planning, transport authority or government boundary data.",
    recommendedNextStep: "Replace fixtures with dated OSM/Geofabrik extracts, attribution metadata and official validation where required.",
    maturityLevel: "open_ready",
    usedInCurrentPrototype: true,
    plannedForPilot: true,
    decisionGrade: false,
    reliabilityLevel: "medium",
    lastUpdated: "2026-06-18",
    usedInScenarios: [
      "realEstateDevelopment",
      "investmentSiteSelection",
      "infrastructureUrbanPlanning",
      "constructionMonitoring",
      "climateRisk",
      "customQuery"
    ]
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

function enrichDataSource(source: DataSource): DataSource {
  const sourceTypeDefaults: Record<DataSource["sourceType"], NonNullable<DataSource["maturityLevel"]>> = {
    mock: "demo_normalized",
    demo: "demo_normalized",
    open_data: "open_ready",
    open_geospatial: "open_ready",
    official: "official_ready",
    commercial: "licensed_commercial_ready",
    customer: "customer_provided"
  };
  const integrationStatus = source.integrationStatus ??
    (source.status === "mock"
      ? "active_demo"
      : source.sourceType === "official"
        ? "official_ready"
        : source.sourceType === "commercial"
          ? "requires_license"
          : source.sourceType === "customer"
            ? "future"
            : "planned");

  return {
    ...source,
    integrationStatus,
    accessNote: source.accessNote ?? "Access path and permissions must be confirmed before pilot integration.",
    usageInGeoAI: source.usageInGeoAI ?? "Planned validation source for GeoAI evidence, analysis and reporting workflows.",
    limitations: source.limitations ?? "Not connected live in the current public prototype.",
    recommendedNextStep: source.recommendedNextStep ?? "Confirm access, licensing, attribution, data schema and QA requirements.",
    maturityLevel: source.maturityLevel ?? sourceTypeDefaults[source.sourceType],
    usedInCurrentPrototype: source.usedInCurrentPrototype ?? source.status === "mock",
    plannedForPilot: source.plannedForPilot ?? source.status !== "mock",
    decisionGrade: source.decisionGrade ?? false
  };
}

export const dataSourceRegistry: DataSource[] = baseDataSourceRegistry.map(enrichDataSource);

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
