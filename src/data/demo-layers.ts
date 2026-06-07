import type { DemoLayerId, DemoLayerType, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";

// Synthetic/demo geospatial data only. These simplified Dubai-focused geometries
// are hand-authored for the MVP prototype and are not official planning, risk,
// market, infrastructure, or cadastral datasets.

type DemoGeometry =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "Point";
      coordinates: number[];
    }
  | {
      type: "LineString";
      coordinates: number[][];
    };

export type DemoLayerFeature = {
  type: "Feature";
  id: string;
  properties: {
    id: string;
    name: string;
    objectType: string;
    layerId: DemoLayerId;
    layerName: string;
    geometryType: DemoLayerType;
    color: string;
  };
  geometry: DemoGeometry;
};

export type DemoLayer = {
  id: DemoLayerId;
  name: string;
  type: DemoLayerType;
  color: string;
  features: DemoLayerFeature[];
};

function polygon(id: string, name: string, objectType: string, layerId: DemoLayerId, layerName: string, color: string, coordinates: number[][]): DemoLayerFeature {
  return {
    type: "Feature",
    id,
    properties: {
      id,
      name,
      objectType,
      layerId,
      layerName,
      geometryType: "polygon",
      color
    },
    geometry: {
      type: "Polygon",
      coordinates: [coordinates]
    }
  };
}

function point(id: string, name: string, objectType: string, layerId: DemoLayerId, layerName: string, color: string, coordinates: number[]): DemoLayerFeature {
  return {
    type: "Feature",
    id,
    properties: {
      id,
      name,
      objectType,
      layerId,
      layerName,
      geometryType: "point",
      color
    },
    geometry: {
      type: "Point",
      coordinates
    }
  };
}

function line(id: string, name: string, objectType: string, layerId: DemoLayerId, layerName: string, color: string, coordinates: number[][]): DemoLayerFeature {
  return {
    type: "Feature",
    id,
    properties: {
      id,
      name,
      objectType,
      layerId,
      layerName,
      geometryType: "line",
      color
    },
    geometry: {
      type: "LineString",
      coordinates
    }
  };
}

export const demoLayers: DemoLayer[] = [
  {
    id: "developmentZones",
    name: "Development Zones",
    type: "polygon",
    color: "#174f63",
    features: [
      polygon("dev-dubai-south", "Dubai South Growth Zone", "Development zone", "developmentZones", "Development Zones", "#174f63", [
        [55.092, 24.925],
        [55.139, 24.912],
        [55.193, 24.928],
        [55.231, 24.968],
        [55.214, 25.008],
        [55.162, 25.027],
        [55.112, 25.006],
        [55.098, 24.93]
      ]),
      polygon("dev-creek-east", "Creek East Redevelopment Area", "Redevelopment zone", "developmentZones", "Development Zones", "#174f63", [
        [55.327, 25.188],
        [55.362, 25.176],
        [55.411, 25.191],
        [55.43, 25.224],
        [55.405, 25.253],
        [55.351, 25.247],
        [55.324, 25.22],
        [55.327, 25.188]
      ])
    ]
  },
  {
    id: "premiumRealEstateAreas",
    name: "Premium Real Estate Areas",
    type: "polygon",
    color: "#c5a76a",
    features: [
      polygon("premium-marina", "Dubai Marina Prime Cluster", "Premium real estate area", "premiumRealEstateAreas", "Premium Real Estate Areas", "#c5a76a", [
        [55.119, 25.071],
        [55.144, 25.058],
        [55.174, 25.066],
        [55.192, 25.092],
        [55.179, 25.112],
        [55.142, 25.119],
        [55.121, 25.099],
        [55.119, 25.071]
      ]),
      polygon("premium-downtown", "Downtown Dubai Prime Cluster", "Premium real estate area", "premiumRealEstateAreas", "Premium Real Estate Areas", "#c5a76a", [
        [55.249, 25.181],
        [55.268, 25.172],
        [55.294, 25.182],
        [55.304, 25.202],
        [55.288, 25.219],
        [55.258, 25.215],
        [55.244, 25.199],
        [55.249, 25.181]
      ])
    ]
  },
  {
    id: "infrastructureNodes",
    name: "Infrastructure Nodes",
    type: "point",
    color: "#277da1",
    features: [
      point("infra-dxb", "DXB Airport Logistics Node", "Airport hub", "infrastructureNodes", "Infrastructure Nodes", "#277da1", [55.3657, 25.2532]),
      point("infra-jebel-ali", "Jebel Ali Port Node", "Port hub", "infrastructureNodes", "Infrastructure Nodes", "#277da1", [55.0578, 24.9857]),
      point("infra-metro-burj", "Downtown Metro Interchange", "Metro node", "infrastructureNodes", "Infrastructure Nodes", "#277da1", [55.2797, 25.2015]),
      point("infra-al-maktoum", "Al Maktoum Airport Node", "Airport hub", "infrastructureNodes", "Infrastructure Nodes", "#277da1", [55.1614, 24.8964])
    ]
  },
  {
    id: "constructionSites",
    name: "Construction Sites",
    type: "point",
    color: "#8a5a13",
    features: [
      point("construct-creek", "Creekside Tower Monitoring Target", "Construction monitoring target", "constructionSites", "Construction Sites", "#8a5a13", [55.356, 25.205]),
      point("construct-south", "Dubai South District Works", "Construction monitoring target", "constructionSites", "Construction Sites", "#8a5a13", [55.178, 24.957]),
      point("construct-business-bay", "Business Bay Infill Site", "Construction monitoring target", "constructionSites", "Construction Sites", "#8a5a13", [55.273, 25.184])
    ]
  },
  {
    id: "coastalFloodRiskZones",
    name: "Coastal / Flood Risk Zones",
    type: "polygon",
    color: "#2c7fb8",
    features: [
      polygon("risk-coastal-marina", "Marina Coastal Exposure Band", "Coastal exposure zone", "coastalFloodRiskZones", "Coastal / Flood Risk Zones", "#2c7fb8", [
        [55.086, 25.042],
        [55.126, 25.031],
        [55.179, 25.039],
        [55.222, 25.078],
        [55.214, 25.126],
        [55.166, 25.146],
        [55.111, 25.134],
        [55.088, 25.094],
        [55.086, 25.042]
      ]),
      polygon("risk-creek-flood", "Dubai Creek Flood Sensitivity Zone", "Flood sensitivity zone", "coastalFloodRiskZones", "Coastal / Flood Risk Zones", "#2c7fb8", [
        [55.298, 25.196],
        [55.338, 25.182],
        [55.391, 25.195],
        [55.42, 25.228],
        [55.403, 25.266],
        [55.352, 25.274],
        [55.309, 25.25],
        [55.298, 25.196]
      ])
    ]
  },
  {
    id: "heatRiskZones",
    name: "Heat Risk Zones",
    type: "polygon",
    color: "#d95f02",
    features: [
      polygon("heat-industrial-south", "South Industrial Heat Island", "Heat exposure zone", "heatRiskZones", "Heat Risk Zones", "#d95f02", [
        [55.113, 24.984],
        [55.168, 24.966],
        [55.243, 24.977],
        [55.289, 25.016],
        [55.268, 25.061],
        [55.192, 25.076],
        [55.129, 25.052],
        [55.113, 24.984]
      ]),
      polygon("heat-inland-core", "Inland Urban Heat Band", "Heat exposure zone", "heatRiskZones", "Heat Risk Zones", "#d95f02", [
        [55.233, 25.112],
        [55.286, 25.092],
        [55.35, 25.104],
        [55.382, 25.144],
        [55.356, 25.184],
        [55.291, 25.194],
        [55.238, 25.168],
        [55.233, 25.112]
      ])
    ]
  },
  {
    id: "transportCorridors",
    name: "Transport Corridors",
    type: "line",
    color: "#4d7c0f",
    features: [
      line("transport-sheikh-zayed", "Sheikh Zayed Access Corridor", "Transport corridor", "transportCorridors", "Transport Corridors", "#4d7c0f", [
        [55.055, 24.985],
        [55.13, 25.07],
        [55.21, 25.145],
        [55.285, 25.205],
        [55.345, 25.255]
      ]),
      line("transport-emirates-road", "Emirates Road Growth Corridor", "Transport corridor", "transportCorridors", "Transport Corridors", "#4d7c0f", [
        [55.20, 24.89],
        [55.27, 24.98],
        [55.36, 25.08],
        [55.43, 25.18]
      ])
    ]
  }
];

function averageCoordinate(coordinates: number[][]): SelectedPoint {
  const total = coordinates.reduce(
    (sum, coordinate) => ({
      longitude: sum.longitude + coordinate[0],
      latitude: sum.latitude + coordinate[1]
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: total.latitude / coordinates.length,
    longitude: total.longitude / coordinates.length
  };
}

export function getFeatureCenter(feature: DemoLayerFeature): SelectedPoint {
  if (feature.geometry.type === "Point") {
    return {
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1]
    };
  }

  if (feature.geometry.type === "LineString") {
    return averageCoordinate(feature.geometry.coordinates);
  }

  return averageCoordinate(feature.geometry.coordinates[0]);
}

export function getSelectedDemoObject(feature: DemoLayerFeature): SelectedDemoObject {
  return {
    id: feature.properties.id,
    name: feature.properties.name,
    type: feature.properties.objectType,
    layerId: feature.properties.layerId,
    layerName: feature.properties.layerName,
    geometryType: feature.properties.geometryType,
    center: getFeatureCenter(feature)
  };
}

export function getDemoFeatureById(featureId: string) {
  return demoLayers.flatMap((layer) => layer.features).find((feature) => feature.id === featureId) ?? null;
}
