import type { DataSource, EvidenceItem } from "@/src/types/data-source";
import type { AnalysisScenarioId } from "@/src/types/geo";

const baseDataSourceRegistry: DataSource[] = [
  {
    id: "synthetic-demo-layers",
    name: "Illustrative local screening layers",
    category: "demo",
    geography: "Illustrative Dubai extent",
    description: "Hand-authored illustrative layers used for local screening workflows.",
    provider: "GeoAI illustrative local context",
    sourceType: "mock",
    status: "mock",
    updateFrequency: "Static local context",
    coverage: {
      geography: "Dubai-focused synthetic geometries",
      spatialResolution: "Simplified illustrative polygons, lines, and points",
      temporalCoverage: "Static local baseline"
    },
    licenseNote: {
      type: "synthetic",
      note: "Illustrative internal data. Not official and not decision-grade."
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
    name: "Illustrative local market context",
    category: "demo",
    geography: "Illustrative Dubai market areas",
    description: "Illustrative local/public-open market context used for area matching, qualitative indices and data-quality notes.",
    provider: "GeoAI illustrative local context",
    sourceType: "mock",
    status: "mock",
    integrationStatus: "active_demo",
    updateFrequency: "Static local context",
    coverage: {
      geography: "Dubai-focused seed areas",
      spatialResolution: "Area-level matching",
      temporalCoverage: "Static local baseline"
    },
    licenseNote: {
      type: "synthetic",
      note: "Illustrative local/public-open market context. Not official market data and not decision-grade."
    },
    accessNote: "No external access is required for this browser-local context.",
    usageInGeoAI: "Used to present how market context, confidence notes and validation paths appear in analysis.",
    limitations: "Does not represent official DLD, rental, transaction, zoning or absorption evidence.",
    recommendedNextStep: "Validate against DLD, Dubai Pulse, customer and/or licensed datasets during a controlled engagement.",
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
    id: "dld-dubai-pulse-transactions",
    name: "Illustrative local Dubai market context",
    category: "real_estate",
    geography: "Dubai",
    description: "Illustrative local records shaped for a future validated Dubai market-data ingestion path.",
    provider: "GeoAI illustrative local context",
    sourceType: "mock",
    status: "mock",
    integrationStatus: "active_demo",
    updateFrequency: "Static local context",
    coverage: {
      geography: "Illustrative Dubai market areas",
      spatialResolution: "Area-level illustrative context",
      temporalCoverage: "Static local baseline"
    },
    licenseNote: {
      type: "synthetic",
      note: "Illustrative local records; no DLD / Dubai Pulse license or origin is asserted."
    },
    accessNote: "Loaded from local illustrative files only; no provider-derived artifact is present.",
    usageInGeoAI: "Used only as illustrative screening context and to exercise lineage/validation workflows.",
    limitations: "Illustrative local fallback only; screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
    recommendedNextStep: "Validate against official DLD/Dubai Pulse access path and licensed transaction semantics before client decisions.",
    maturityLevel: "demo_normalized",
    usedInCurrentPrototype: true,
    plannedForPilot: false,
    decisionGrade: false,
    reliabilityLevel: "demo",
    lastUpdated: "Static local baseline",
    usedInScenarios: ["realEstateDevelopment", "investmentSiteSelection", "customQuery"]
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
    id: "osm-geofabrik-baseline",
    name: "Illustrative local open-geospatial context",
    category: "infrastructure",
    geography: "Dubai / UAE",
    description: "Illustrative local roads, POIs and land-use records shaped for a future validated open-geospatial ingestion path.",
    provider: "GeoAI illustrative local context",
    sourceType: "mock",
    status: "mock",
    integrationStatus: "active_demo",
    updateFrequency: "Static local context",
    coverage: {
      geography: "Illustrative Dubai-focused baseline",
      spatialResolution: "Simplified local roads, POIs and land-use geometries",
      temporalCoverage: "Static local baseline"
    },
    licenseNote: {
      type: "synthetic",
      note: "Illustrative local records; no OpenStreetMap or Geofabrik origin is asserted."
    },
    accessNote: "Loaded from local illustrative GeoJSON only; no provider-derived extract is present.",
    usageInGeoAI: "Used only for illustrative road, POI, anchor and accessibility context.",
    limitations: "Illustrative local context only; not OpenStreetMap/Geofabrik evidence or official municipal GIS, zoning, cadastral, planning or parcel data.",
    recommendedNextStep: "Replace fixtures with dated OSM/Geofabrik extracts and add attribution/QA metadata.",
    maturityLevel: "demo_normalized",
    usedInCurrentPrototype: true,
    plannedForPilot: false,
    decisionGrade: false,
    reliabilityLevel: "demo",
    lastUpdated: "Static local baseline",
    usedInScenarios: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning", "constructionMonitoring", "climateRisk", "customQuery"]
  },
  {
    id: "open-geodata-baseline-sample",
    name: "Open Geospatial Baseline Context",
    category: "infrastructure",
    geography: "Illustrative Dubai extent",
    description: "Illustrative local OSM-style baseline for roads, POI anchors, land-use context and accessibility metrics.",
    provider: "Local open-geodata ingestion path",
    sourceType: "open_geospatial",
    status: "mock",
    integrationStatus: "active_demo",
    updateFrequency: "Manual local ingestion",
    coverage: {
      geography: "Dubai-focused illustrative local fixtures",
      spatialResolution: "Road, POI and landuse feature context",
      temporalCoverage: "Static local fixture baseline"
    },
    licenseNote: {
      type: "open",
      note: "OSM/Geofabrik/Overpass-compatible path. Production use requires ODbL attribution and compliance review."
    },
    accessNote: "No live API access; normalized from illustrative local fixtures only.",
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
    accessNote: source.accessNote ?? "Access path and permissions must be confirmed before controlled integration.",
    usageInGeoAI: source.usageInGeoAI ?? "Planned validation source for GeoAI evidence, analysis and reporting workflows.",
    limitations: source.limitations ?? "Not connected live in the current runtime.",
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
