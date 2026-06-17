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
        geometry: polygon([[55.092, 24.925], [55.139, 24.912], [55.193, 24.928], [55.231, 24.968], [55.214, 25.008], [55.162, 25.027], [55.112, 25.006], [55.098, 24.93], [55.092, 24.925]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
      }),
      feature({
        id: "dev-creek-east",
        name: "Creek East Redevelopment Area",
        category: "development_zone",
        subtype: "Redevelopment zone",
        geometry: polygon([[55.327, 25.188], [55.362, 25.176], [55.411, 25.191], [55.43, 25.224], [55.405, 25.253], [55.351, 25.247], [55.324, 25.22], [55.327, 25.188]]),
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
        name: "Dubai Marina Prime Cluster",
        category: "premium_real_estate",
        subtype: "Premium real estate area",
        geometry: polygon([[55.119, 25.071], [55.144, 25.058], [55.174, 25.066], [55.192, 25.092], [55.179, 25.112], [55.142, 25.119], [55.121, 25.099], [55.119, 25.071]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"]
      }),
      feature({
        id: "premium-downtown",
        name: "Downtown Dubai Prime Cluster",
        category: "premium_real_estate",
        subtype: "Premium real estate area",
        geometry: polygon([[55.249, 25.181], [55.268, 25.172], [55.294, 25.182], [55.304, 25.202], [55.288, 25.219], [55.258, 25.215], [55.244, 25.199], [55.249, 25.181]]),
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
      feature({ id: "infra-al-maktoum", name: "Al Maktoum Airport Node", category: "infrastructure_node", subtype: "Airport hub", geometry: point([55.1614, 24.8964]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] })
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
      feature({ id: "risk-coastal-marina", name: "Marina Coastal Exposure Band", category: "coastal_flood_risk", subtype: "Coastal exposure zone", geometry: polygon([[55.086, 25.042], [55.126, 25.031], [55.179, 25.039], [55.222, 25.078], [55.214, 25.126], [55.166, 25.146], [55.111, 25.134], [55.088, 25.094], [55.086, 25.042]]), scenarioRelevance: ["climateRisk"] }),
      feature({ id: "risk-creek-flood", name: "Dubai Creek Flood Sensitivity Zone", category: "coastal_flood_risk", subtype: "Flood sensitivity zone", geometry: polygon([[55.298, 25.196], [55.338, 25.182], [55.391, 25.195], [55.42, 25.228], [55.403, 25.266], [55.352, 25.274], [55.309, 25.25], [55.298, 25.196]]), scenarioRelevance: ["climateRisk"] })
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
      feature({ id: "heat-industrial-south", name: "South Industrial Heat Island", category: "heat_risk", subtype: "Heat exposure zone", geometry: polygon([[55.113, 24.984], [55.168, 24.966], [55.243, 24.977], [55.289, 25.016], [55.268, 25.061], [55.192, 25.076], [55.129, 25.052], [55.113, 24.984]]), scenarioRelevance: ["climateRisk"] }),
      feature({ id: "heat-inland-core", name: "Inland Urban Heat Band", category: "heat_risk", subtype: "Heat exposure zone", geometry: polygon([[55.233, 25.112], [55.286, 25.092], [55.35, 25.104], [55.382, 25.144], [55.356, 25.184], [55.291, 25.194], [55.238, 25.168], [55.233, 25.112]]), scenarioRelevance: ["climateRisk"] })
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
      feature({ id: "transport-sheikh-zayed", name: "Sheikh Zayed Access Corridor", category: "transport_corridor", subtype: "Transport corridor", geometry: line([[55.055, 24.985], [55.13, 25.07], [55.21, 25.145], [55.285, 25.205], [55.345, 25.255]]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "transport-emirates-road", name: "Emirates Road Growth Corridor", category: "transport_corridor", subtype: "Transport corridor", geometry: line([[55.20, 24.89], [55.27, 24.98], [55.36, 25.08], [55.43, 25.18]]), scenarioRelevance: ["infrastructureUrbanPlanning", "realEstateDevelopment"] })
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
