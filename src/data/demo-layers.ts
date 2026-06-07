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
        [55.098, 24.93],
        [55.205, 24.93],
        [55.225, 24.995],
        [55.118, 25.018],
        [55.098, 24.93]
      ]),
      polygon("dev-creek-east", "Creek East Redevelopment Area", "Redevelopment zone", "developmentZones", "Development Zones", "#174f63", [
        [55.333, 25.185],
        [55.42, 25.19],
        [55.41, 25.245],
        [55.332, 25.238],
        [55.333, 25.185]
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
        [55.125, 25.065],
        [55.18, 25.065],
        [55.185, 25.108],
        [55.13, 25.116],
        [55.125, 25.065]
      ]),
      polygon("premium-downtown", "Downtown Dubai Prime Cluster", "Premium real estate area", "premiumRealEstateAreas", "Premium Real Estate Areas", "#c5a76a", [
        [55.255, 25.178],
        [55.295, 25.18],
        [55.296, 25.212],
        [55.25, 25.212],
        [55.255, 25.178]
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
        [55.09, 25.035],
        [55.205, 25.035],
        [55.215, 25.135],
        [55.1, 25.14],
        [55.09, 25.035]
      ]),
      polygon("risk-creek-flood", "Dubai Creek Flood Sensitivity Zone", "Flood sensitivity zone", "coastalFloodRiskZones", "Coastal / Flood Risk Zones", "#2c7fb8", [
        [55.305, 25.19],
        [55.405, 25.198],
        [55.405, 25.265],
        [55.3, 25.258],
        [55.305, 25.19]
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
        [55.12, 24.98],
        [55.275, 24.985],
        [55.28, 25.06],
        [55.13, 25.062],
        [55.12, 24.98]
      ]),
      polygon("heat-inland-core", "Inland Urban Heat Band", "Heat exposure zone", "heatRiskZones", "Heat Risk Zones", "#d95f02", [
        [55.24, 25.105],
        [55.37, 25.105],
        [55.365, 25.18],
        [55.235, 25.178],
        [55.24, 25.105]
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
