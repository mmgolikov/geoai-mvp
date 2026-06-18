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
    name: "Demo Growth / Pipeline Signals",
    category: "development_zone",
    layerId: "developmentZones",
    layerName: "Growth / Pipeline Signals",
    mapType: "polygon",
    color: "#174f63",
    source: source(),
    features: [
      feature({
        id: "dev-dubai-south",
        name: "Dubai South Growth Signal",
        category: "development_zone",
        subtype: "Growth screening signal",
        geometry: polygon([[55.139, 24.934], [55.196, 24.929], [55.222, 24.966], [55.195, 25.002], [55.14, 24.994], [55.121, 24.961], [55.139, 24.934]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
      }),
      feature({
        id: "dev-meydan-mbr",
        name: "Meydan / MBR City Growth Signal",
        category: "development_zone",
        subtype: "Master-planned screening signal",
        geometry: polygon([[55.298, 25.139], [55.35, 25.132], [55.376, 25.158], [55.358, 25.19], [55.306, 25.191], [55.282, 25.162], [55.298, 25.139]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
      }),
      feature({
        id: "dev-jvc-jvt",
        name: "JVC / JVT Residential Pipeline Signal",
        category: "development_zone",
        subtype: "Residential pipeline watch area",
        geometry: polygon([[55.181, 25.051], [55.232, 25.047], [55.251, 25.078], [55.224, 25.106], [55.178, 25.096], [55.162, 25.069], [55.181, 25.051]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"]
      })
    ]
  },
  {
    id: "synthetic-premium-real-estate",
    name: "Demo Market Signal Areas",
    category: "premium_real_estate",
    layerId: "premiumRealEstateAreas",
    layerName: "Market Signal Areas",
    mapType: "polygon",
    color: "#c5a76a",
    source: source(),
    features: [
      feature({
        id: "premium-marina",
        name: "Dubai Marina / JBR Market Signal",
        category: "premium_real_estate",
        subtype: "Market signal area",
        geometry: polygon([[55.123, 25.068], [55.161, 25.061], [55.185, 25.083], [55.176, 25.111], [55.137, 25.114], [55.115, 25.092], [55.123, 25.068]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"]
      }),
      feature({
        id: "premium-downtown-bay",
        name: "Downtown / Business Bay Market Signal",
        category: "premium_real_estate",
        subtype: "Market signal area",
        geometry: polygon([[55.256, 25.178], [55.294, 25.174], [55.309, 25.198], [55.291, 25.219], [55.254, 25.212], [55.241, 25.191], [55.256, 25.178]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"]
      }),
      feature({
        id: "premium-palm-coastal",
        name: "Palm / Coastal Market Signal",
        category: "premium_real_estate",
        subtype: "Coastal market signal area",
        geometry: polygon([[55.111, 25.105], [55.148, 25.098], [55.173, 25.119], [55.163, 25.146], [55.126, 25.15], [55.1, 25.127], [55.111, 25.105]]),
        scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"]
      })
    ]
  },
  {
    id: "synthetic-infrastructure-nodes",
    name: "Demo Spatial Anchors",
    category: "infrastructure_node",
    layerId: "infrastructureNodes",
    layerName: "Spatial Anchors",
    mapType: "point",
    color: "#277da1",
    source: source(),
    features: [
      feature({ id: "infra-dxb", name: "DXB Airport Logistics Node", category: "infrastructure_node", subtype: "Airport hub", geometry: point([55.3657, 25.2532]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "infra-jebel-ali", name: "Jebel Ali Port Node", category: "infrastructure_node", subtype: "Port hub", geometry: point([55.0578, 24.9857]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "infra-metro-burj", name: "Downtown / Burj Khalifa Anchor", category: "infrastructure_node", subtype: "Business / tourism anchor", geometry: point([55.2797, 25.2015]), scenarioRelevance: ["infrastructureUrbanPlanning", "realEstateDevelopment", "investmentSiteSelection"] }),
      feature({ id: "infra-al-maktoum", name: "Al Maktoum Airport Node", category: "infrastructure_node", subtype: "Airport hub", geometry: point([55.1614, 24.8964]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "infra-marina-mobility", name: "Dubai Marina / JBR Anchor", category: "infrastructure_node", subtype: "Business / tourism anchor", geometry: point([55.1488, 25.0796]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"] }),
      feature({ id: "infra-palm-anchor", name: "Palm Jumeirah Anchor", category: "infrastructure_node", subtype: "Tourism anchor", geometry: point([55.1386, 25.1124]), scenarioRelevance: ["investmentSiteSelection", "realEstateDevelopment"] }),
      feature({ id: "infra-business-bay", name: "Business Bay Anchor", category: "infrastructure_node", subtype: "Business anchor", geometry: point([55.2659, 25.1854]), scenarioRelevance: ["investmentSiteSelection", "realEstateDevelopment"] }),
      feature({ id: "infra-jvc-jvt", name: "JVC / JVT Development Anchor", category: "infrastructure_node", subtype: "Development anchor", geometry: point([55.205, 25.071]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"] }),
      feature({ id: "infra-meydan", name: "Meydan / MBR City Anchor", category: "infrastructure_node", subtype: "Development anchor", geometry: point([55.319, 25.163]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"] }),
      feature({ id: "infra-dubai-south-anchor", name: "Dubai South Development Anchor", category: "infrastructure_node", subtype: "Development anchor", geometry: point([55.172, 24.964]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "infrastructureUrbanPlanning"] })
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
      feature({ id: "risk-coastal-marina", name: "Marina Coastal Exposure Signal", category: "coastal_flood_risk", subtype: "Coastal exposure band", geometry: polygon([[55.097, 25.054], [55.166, 25.047], [55.21, 25.079], [55.2, 25.118], [55.13, 25.127], [55.092, 25.094], [55.097, 25.054]]), scenarioRelevance: ["climateRisk"] }),
      feature({ id: "risk-creek-flood", name: "Dubai Creek Drainage Sensitivity Signal", category: "coastal_flood_risk", subtype: "Drainage sensitivity signal", geometry: polygon([[55.318, 25.202], [55.371, 25.193], [55.412, 25.224], [55.394, 25.26], [55.34, 25.262], [55.31, 25.235], [55.318, 25.202]]), scenarioRelevance: ["climateRisk"] }),
      feature({ id: "risk-jebel-ali-coastal", name: "Jebel Ali Coastal Exposure Signal", category: "coastal_flood_risk", subtype: "Coastal exposure band", geometry: polygon([[55.0, 24.951], [55.067, 24.935], [55.112, 24.963], [55.092, 24.997], [55.025, 25.003], [54.991, 24.979], [55.0, 24.951]]), scenarioRelevance: ["climateRisk", "infrastructureUrbanPlanning"] })
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
      feature({ id: "heat-industrial-south", name: "South Industrial Heat Signal", category: "heat_risk", subtype: "Heat exposure signal", geometry: polygon([[55.132, 24.991], [55.205, 24.977], [55.266, 25.013], [55.247, 25.055], [55.166, 25.058], [55.126, 25.028], [55.132, 24.991]]), scenarioRelevance: ["climateRisk"] }),
      feature({ id: "heat-inland-core", name: "Inland Urban Heat Signal", category: "heat_risk", subtype: "Heat exposure signal", geometry: polygon([[55.252, 25.116], [55.315, 25.104], [55.365, 25.138], [55.347, 25.178], [55.28, 25.183], [55.239, 25.151], [55.252, 25.116]]), scenarioRelevance: ["climateRisk"] })
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
      feature({ id: "transport-sheikh-zayed", name: "Coastal Urban Access Corridor", category: "transport_corridor", subtype: "Indicative road / transit corridor", geometry: line([[55.061, 24.993], [55.13, 25.067], [55.206, 25.139], [55.284, 25.204], [55.342, 25.25]]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection"] }),
      feature({ id: "transport-emirates-road", name: "Inland Growth Corridor", category: "transport_corridor", subtype: "Indicative growth corridor", geometry: line([[55.19, 24.906], [55.255, 24.982], [55.334, 25.078], [55.423, 25.175]]), scenarioRelevance: ["infrastructureUrbanPlanning", "realEstateDevelopment"] }),
      feature({ id: "transport-airport-south", name: "Airport Connectivity Corridor", category: "transport_corridor", subtype: "Indicative airport connectivity corridor", geometry: line([[55.362, 25.249], [55.293, 25.174], [55.229, 25.056], [55.164, 24.9]]), scenarioRelevance: ["infrastructureUrbanPlanning", "investmentSiteSelection", "realEstateDevelopment"] })
    ]
  },
  {
    id: "synthetic-asset-boundaries",
    name: "Synthetic Selected AOI Examples",
    category: "asset_boundary",
    layerId: "assetParcelObjects",
    layerName: "Selected AOI Examples",
    mapType: "polygon",
    color: "#6d5dfc",
    source: source(),
    features: [
      feature({ id: "asset-business-bay-block", name: "Business Bay Demo AOI", category: "asset_boundary", subtype: "Demo area of interest", geometry: polygon([[55.2675, 25.1815], [55.2745, 25.1805], [55.2762, 25.1868], [55.2692, 25.1882], [55.2675, 25.1815]]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection"] }),
      feature({ id: "asset-marina-waterfront", name: "Marina Waterfront Demo AOI", category: "asset_boundary", subtype: "Demo area of interest", geometry: polygon([[55.1375, 25.079], [55.1458, 25.0778], [55.148, 25.0848], [55.1396, 25.086], [55.1375, 25.079]]), scenarioRelevance: ["realEstateDevelopment", "investmentSiteSelection", "climateRisk"] })
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
