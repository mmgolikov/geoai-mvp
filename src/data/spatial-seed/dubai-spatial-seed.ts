import type { SpatialDataset, SpatialFeature, SpatialLayerCategory } from "@/src/types/spatial-data";

// Synthetic seed_geojson spatial objects for the GeoAI MVP.
// These lightweight geometries are demo-only and are not official parcels,
// planning boundaries, infrastructure records, asset boundaries, or risk zones.

type SeedFeatureInput = {
  id: string;
  name: string;
  category: SpatialLayerCategory;
  subtype: string;
  geometry: SpatialFeature["geometry"];
  scenarioRelevance: SpatialFeature["properties"]["scenarioRelevance"];
  metadata?: SpatialFeature["properties"]["metadata"];
};

function source(registrySourceId = "synthetic-demo-layers") {
  return {
    id: `spatial-${registrySourceId}`,
    name: registrySourceId === "synthetic-demo-layers" ? "Synthetic Dubai Spatial Seed" : "Future spatial source placeholder",
    registrySourceId,
    sourceStatus: registrySourceId === "synthetic-demo-layers" ? "mock" : "planned",
    ingestionMode: registrySourceId === "synthetic-demo-layers" ? "seed_geojson" : "api_ready",
    confidenceLevel: registrySourceId === "synthetic-demo-layers" ? "demo" : "medium",
    limitationNote:
      registrySourceId === "synthetic-demo-layers"
        ? "Seed/demo geometry for MVP demonstration only."
        : "Future source placeholder; geometry is not connected yet."
  } as const;
}

function polygon(coordinates: number[][]): SpatialFeature["geometry"] {
  return { type: "Polygon", coordinates: [coordinates] };
}

function point(coordinates: number[]): SpatialFeature["geometry"] {
  return { type: "Point", coordinates };
}

function line(coordinates: number[][]): SpatialFeature["geometry"] {
  return { type: "LineString", coordinates };
}

function feature(input: SeedFeatureInput): SpatialFeature {
  return {
    type: "Feature",
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      category: input.category,
      subtype: input.subtype,
      sourceId: "synthetic-demo-layers",
      confidenceLevel: "demo",
      geometryStatus: "seed_demo",
      centroid: { latitude: 0, longitude: 0 },
      scenarioRelevance: input.scenarioRelevance,
      limitations: [
        "Seed/demo geometry only; not an official GIS, parcel, planning, or risk boundary.",
        "Geometry requires validation against official or customer-provided spatial datasets."
      ],
      metadata: input.metadata ?? {}
    },
    geometry: input.geometry
  };
}

export const seedSpatialDatasets: SpatialDataset[] = [
  {
    id: "synthetic-development-zones",
    name: "Synthetic Dubai Development Zones",
    category: "development_zone",
    layerId: "developmentZones",
    layerName: "Development Zones",
    mapType: "polygon",
    color: "#174f63",
    source: source(),
    features: [
      feature({
        id: "dev-dubai-south",
        name: "Dubai South Growth Zone",
        category: "development_zone",
        subtype: "Development zone",
        geometry: polygon([[55.096, 24.918], [55.164, 24.898], [55.229, 24.934], [55.244, 24.99], [55.196, 25.036], [55.121, 25.012], [55.096, 24.918]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
      }),
      feature({
        id: "dev-meydan-mbr",
        name: "Meydan / MBR City Growth Zone",
        category: "development_zone",
        subtype: "Master-planned growth zone",
        geometry: polygon([[55.284, 25.126], [55.342, 25.115], [55.386, 25.146], [55.371, 25.194], [55.309, 25.205], [55.266, 25.171], [55.284, 25.126]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
      }),
      feature({
        id: "dev-jvc-jvt",
        name: "JVC / JVT Residential Growth Cluster",
        category: "development_zone",
        subtype: "Residential growth cluster",
        geometry: polygon([[55.171, 25.038], [55.229, 25.028], [55.263, 25.063], [55.245, 25.108], [55.188, 25.116], [55.151, 25.081], [55.171, 25.038]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
      })
    ]
  },
  {
    id: "synthetic-premium-real-estate",
    name: "Synthetic Premium Real Estate Clusters",
    category: "premium_real_estate",
    layerId: "premiumRealEstateAreas",
    layerName: "Premium Real Estate Areas",
    mapType: "polygon",
    color: "#c5a76a",
    source: source(),
    features: [
      feature({
        id: "premium-marina",
        name: "Dubai Marina / JBR / Bluewaters Premium Cluster",
        category: "premium_real_estate",
        subtype: "Premium real estate area",
        geometry: polygon([[55.111, 25.063], [55.154, 25.052], [55.195, 25.074], [55.195, 25.107], [55.154, 25.126], [55.116, 25.107], [55.111, 25.063]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"]
      }),
      feature({
        id: "premium-downtown-bay",
        name: "Downtown Dubai / Business Bay Premium Cluster",
        category: "premium_real_estate",
        subtype: "Premium real estate area",
        geometry: polygon([[55.248, 25.174], [55.289, 25.164], [55.318, 25.193], [55.305, 25.222], [55.262, 25.226], [55.238, 25.2], [55.248, 25.174]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"]
      }),
      feature({
        id: "premium-palm-coastal",
        name: "Palm / Coastal Premium Cluster",
        category: "premium_real_estate",
        subtype: "Premium coastal cluster",
        geometry: polygon([[55.107, 25.097], [55.151, 25.089], [55.181, 25.113], [55.171, 25.15], [55.126, 25.157], [55.094, 25.128], [55.107, 25.097]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"]
      })
    ]
  },
  {
    id: "synthetic-infrastructure-nodes",
    name: "Synthetic Infrastructure Nodes",
    category: "infrastructure_node",
    layerId: "infrastructureNodes",
    layerName: "Infrastructure Nodes",
    mapType: "point",
    color: "#277da1",
    source: source(),
    features: [
      feature({ id: "infra-dxb", name: "DXB Airport Logistics Node", category: "infrastructure_node", subtype: "Airport hub", geometry: point([55.3657, 25.2532]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "infra-jebel-ali", name: "Jebel Ali Port Node", category: "infrastructure_node", subtype: "Port hub", geometry: point([55.0578, 24.9857]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "infra-metro-burj", name: "Downtown Metro Interchange", category: "infrastructure_node", subtype: "Metro node", geometry: point([55.2797, 25.2015]), scenarioRelevance: ["infrastructureUrbanPlanning", "realEstateDevelopment"] }),
      feature({ id: "infra-al-maktoum", name: "Al Maktoum Airport Node", category: "infrastructure_node", subtype: "Airport hub", geometry: point([55.1614, 24.8964]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "infra-marina-mobility", name: "Marina Mobility Hub", category: "infrastructure_node", subtype: "Metro / tram hub", geometry: point([55.1488, 25.0796]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"] })
    ]
  },
  {
    id: "synthetic-construction-sites",
    name: "Synthetic Construction Monitoring Sites",
    category: "construction_site",
    layerId: "constructionSites",
    layerName: "Construction Sites",
    mapType: "point",
    color: "#8a5a13",
    source: source(),
    features: [
      feature({ id: "construct-creek", name: "Creekside Tower Monitoring Target", category: "construction_site", subtype: "Construction monitoring target", geometry: point([55.356, 25.205]), scenarioRelevance: ["constructionMonitoring"] }),
      feature({ id: "construct-south", name: "Dubai South District Works", category: "construction_site", subtype: "Construction monitoring target", geometry: point([55.178, 24.957]), scenarioRelevance: ["constructionMonitoring"] }),
      feature({ id: "construct-business-bay", name: "Business Bay Infill Site", category: "construction_site", subtype: "Construction monitoring target", geometry: point([55.273, 25.184]), scenarioRelevance: ["constructionMonitoring"] })
    ]
  },
  {
    id: "synthetic-coastal-flood",
    name: "Synthetic Coastal / Flood Exposure Zones",
    category: "coastal_flood_risk",
    layerId: "coastalFloodRiskZones",
    layerName: "Coastal / Flood Risk Zones",
    mapType: "polygon",
    color: "#2c7fb8",
    source: source(),
    features: [
      feature({ id: "risk-coastal-marina", name: "Marina Coastal Exposure Band", category: "coastal_flood_risk", subtype: "Coastal exposure zone", geometry: polygon([[55.079, 25.033], [55.135, 25.022], [55.207, 25.056], [55.224, 25.112], [55.178, 25.153], [55.103, 25.136], [55.079, 25.033]]), scenarioRelevance: ["climateRisk"] }),
      feature({ id: "risk-creek-flood", name: "Dubai Creek Flood Sensitivity Zone", category: "coastal_flood_risk", subtype: "Flood sensitivity zone", geometry: polygon([[55.298, 25.19], [55.357, 25.178], [55.42, 25.211], [55.424, 25.258], [55.364, 25.285], [55.307, 25.25], [55.298, 25.19]]), scenarioRelevance: ["climateRisk"] }),
      feature({ id: "risk-jebel-ali-coastal", name: "Jebel Ali Coastal Sensitivity Band", category: "coastal_flood_risk", subtype: "Coastal exposure zone", geometry: polygon([[54.978, 24.944], [55.061, 24.918], [55.13, 24.956], [55.111, 25.003], [55.03, 25.019], [54.974, 24.986], [54.978, 24.944]]), scenarioRelevance: ["climateRisk", "infrastructureUrbanPlanning"] })
    ]
  },
  {
    id: "synthetic-heat-exposure",
    name: "Synthetic Heat Exposure Zones",
    category: "heat_risk",
    layerId: "heatRiskZones",
    layerName: "Heat Risk Zones",
    mapType: "polygon",
    color: "#d95f02",
    source: source(),
    features: [
      feature({ id: "heat-industrial-south", name: "South Industrial Heat Exposure Zone", category: "heat_risk", subtype: "Heat exposure zone", geometry: polygon([[55.11, 24.974], [55.181, 24.954], [55.269, 24.986], [55.292, 25.041], [55.236, 25.087], [55.144, 25.062], [55.11, 24.974]]), scenarioRelevance: ["climateRisk"] }),
      feature({ id: "heat-inland-core", name: "Inland Urban Heat Band", category: "heat_risk", subtype: "Heat exposure zone", geometry: polygon([[55.225, 25.103], [55.296, 25.079], [55.373, 25.113], [55.392, 25.165], [55.332, 25.204], [55.25, 25.181], [55.225, 25.103]]), scenarioRelevance: ["climateRisk"] })
    ]
  },
  {
    id: "synthetic-transport-corridors",
    name: "Synthetic Transport Corridors",
    category: "transport_corridor",
    layerId: "transportCorridors",
    layerName: "Transport Corridors",
    mapType: "line",
    color: "#4d7c0f",
    source: source(),
    features: [
      feature({ id: "transport-sheikh-zayed", name: "Sheikh Zayed Access Corridor", category: "transport_corridor", subtype: "Major road / metro corridor", geometry: line([[55.055, 24.985], [55.126, 25.067], [55.205, 25.139], [55.284, 25.204], [55.346, 25.255]]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "transport-emirates-road", name: "Emirates Road Growth Corridor", category: "transport_corridor", subtype: "Growth access corridor", geometry: line([[55.20, 24.89], [55.264, 24.977], [55.345, 25.077], [55.43, 25.18]]), scenarioRelevance: ["infrastructureUrbanPlanning", "realEstateDevelopment"] }),
      feature({ id: "transport-airport-south", name: "Airport / Dubai South Access Corridor", category: "transport_corridor", subtype: "Airport access corridor", geometry: line([[55.366, 25.253], [55.279, 25.161], [55.207, 25.04], [55.161, 24.896]]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection", "realEstateDevelopment"] })
    ]
  },
  {
    id: "synthetic-asset-boundaries",
    name: "Synthetic Asset / Parcel-like Objects",
    category: "asset_boundary",
    layerId: "assetParcelObjects",
    layerName: "Asset / Parcel-like Objects",
    mapType: "polygon",
    color: "#6d5dfc",
    source: source(),
    features: [
      feature({ id: "asset-business-bay-block", name: "Business Bay Demo Asset Block", category: "asset_boundary", subtype: "Parcel-like demo asset", geometry: polygon([[55.2675, 25.1815], [55.2745, 25.1805], [55.2762, 25.1868], [55.2692, 25.1882], [55.2675, 25.1815]]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"] }),
      feature({ id: "asset-marina-waterfront", name: "Marina Waterfront Demo Asset", category: "asset_boundary", subtype: "Parcel-like demo asset", geometry: polygon([[55.1375, 25.079], [55.1458, 25.0778], [55.148, 25.0848], [55.1396, 25.086], [55.1375, 25.079]]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "climateRisk"] })
    ]
  },
  {
    id: "future-dubai-municipality-gis",
    name: "Future Dubai Municipality GIS Layer",
    category: "future_official_gis",
    layerId: "futureMunicipalityGis",
    layerName: "Future Municipality GIS",
    mapType: "polygon",
    color: "#64748b",
    source: source("dubai-municipality-gis-planning"),
    features: []
  },
  {
    id: "future-customer-assets",
    name: "Future Customer Uploaded Assets",
    category: "future_customer_upload",
    layerId: "futureCustomerAssets",
    layerName: "Future Customer Assets",
    mapType: "polygon",
    color: "#0f766e",
    source: source("customer-uploaded-documents"),
    features: []
  }
];
