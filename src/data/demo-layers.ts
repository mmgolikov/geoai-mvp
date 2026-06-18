import {
  getSpatialFeatureById,
  spatialDatasetRegistry,
  toSpatialSelectionContext
} from "@/src/lib/spatial-data-adapter";
import type { DemoLayerId, DemoLayerType, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";
import type { SpatialFeature, SpatialGeometry } from "@/src/types/spatial-data";

// Compatibility facade for the existing Mapbox layer renderer.
// Source data now comes from Spatial Data Adapter v0.1 seed_geojson datasets.

export type DemoLayerFeature = {
  type: "Feature";
  id: string;
  properties: {
    id: string;
    featureId: string;
    name: string;
    objectType: string;
    layerId: DemoLayerId;
    layerName: string;
    geometryType: DemoLayerType;
    color: string;
    category: string;
    subcategory: string;
    sourceMode: DemoLayerSourceMode;
    confidenceLevel: string;
    relevance: string;
    hoverLabel: string;
    selectedLabel: string;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    fillOpacity: number;
    strokeOpacity: number;
    pointRadius: number;
    layerOrder: number;
    clickPriority: number;
  };
  geometry: SpatialGeometry;
};

export type DemoLayerSourceMode =
  | "demo_normalized"
  | "imported_sample"
  | "seed_static"
  | "planned_official"
  | "customer_future";

export type DemoLayerStyle = {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeOpacity: number;
  lineDasharray?: number[];
  pointRadius?: number;
};

export type DemoLayer = {
  id: DemoLayerId;
  name: string;
  description: string;
  category: string;
  sourceMode: DemoLayerSourceMode;
  type: DemoLayerType;
  color: string;
  style: DemoLayerStyle;
  visibleByDefault: boolean;
  minZoom: number;
  maxZoom: number;
  layerOrder: number;
  clickPriority: number;
  legendLabel: string;
  disclaimer: string;
  features: DemoLayerFeature[];
};

const demoLayerDesign: Record<DemoLayerId, Omit<DemoLayer, "id" | "name" | "type" | "color" | "features">> = {
  coastalFloodRiskZones: {
    description: "Subtle coastal and drainage exposure signals for demo risk screening.",
    category: "Climate / Risk",
    sourceMode: "demo_normalized",
    style: {
      fillColor: "#4f9ecf",
      strokeColor: "#1f6f9f",
      strokeWidth: 0.9,
      fillOpacity: 0.055,
      strokeOpacity: 0.42
    },
    visibleByDefault: false,
    minZoom: 9.2,
    maxZoom: 18,
    layerOrder: 10,
    clickPriority: 25,
    legendLabel: "Coastal exposure signals",
    disclaimer: "Demo-normalized exposure band; not an official flood or coastal hazard boundary."
  },
  heatRiskZones: {
    description: "Subtle urban heat screening signals for climate resilience review.",
    category: "Climate / Risk",
    sourceMode: "demo_normalized",
    style: {
      fillColor: "#d98445",
      strokeColor: "#b75f21",
      strokeWidth: 0.9,
      fillOpacity: 0.055,
      strokeOpacity: 0.42
    },
    visibleByDefault: false,
    minZoom: 9.2,
    maxZoom: 18,
    layerOrder: 20,
    clickPriority: 24,
    legendLabel: "Heat exposure signals",
    disclaimer: "Demo-normalized screening zone; official hazard validation is required."
  },
  developmentZones: {
    description: "Compact growth and pipeline signals for early site-screening workflows.",
    category: "Growth / Pipeline Signals",
    sourceMode: "demo_normalized",
    style: {
      fillColor: "#d5aa63",
      strokeColor: "#a87521",
      strokeWidth: 0.95,
      fillOpacity: 0.07,
      strokeOpacity: 0.45
    },
    visibleByDefault: true,
    minZoom: 9.4,
    maxZoom: 18,
    layerOrder: 30,
    clickPriority: 55,
    legendLabel: "Growth / pipeline signals",
    disclaimer: "Demo-normalized screening overlay; not a planning or zoning boundary."
  },
  premiumRealEstateAreas: {
    description: "Compact market signal areas for investment and development screening.",
    category: "Market Signal Areas",
    sourceMode: "demo_normalized",
    style: {
      fillColor: "#2f9f9a",
      strokeColor: "#087c78",
      strokeWidth: 1,
      fillOpacity: 0.075,
      strokeOpacity: 0.5
    },
    visibleByDefault: true,
    minZoom: 9.6,
    maxZoom: 18,
    layerOrder: 40,
    clickPriority: 70,
    legendLabel: "Market signal areas",
    disclaimer: "Demo-normalized market signal area; not an official market boundary."
  },
  assetParcelObjects: {
    description: "Small selected AOI examples used for investor memo and object-selection flows.",
    category: "Asset Objects",
    sourceMode: "seed_static",
    style: {
      fillColor: "#7165e8",
      strokeColor: "#4d42c4",
      strokeWidth: 1.1,
      fillOpacity: 0.1,
      strokeOpacity: 0.55
    },
    visibleByDefault: true,
    minZoom: 11.2,
    maxZoom: 19,
    layerOrder: 50,
    clickPriority: 82,
    legendLabel: "Selected AOI examples",
    disclaimer: "Demo area of interest only; not an official parcel, title, ownership, or planning boundary."
  },
  transportCorridors: {
    description: "Indicative access corridors representing major demo mobility relationships.",
    category: "Infrastructure",
    sourceMode: "demo_normalized",
    style: {
      fillColor: "#3f7f37",
      strokeColor: "#2f6f2e",
      strokeWidth: 1.7,
      fillOpacity: 0,
      strokeOpacity: 0.46,
      lineDasharray: [1.2, 1.4]
    },
    visibleByDefault: true,
    minZoom: 8.8,
    maxZoom: 18,
    layerOrder: 60,
    clickPriority: 35,
    legendLabel: "Access corridors",
    disclaimer: "Indicative demo corridor; not an official transport alignment."
  },
  infrastructureNodes: {
    description: "Demo airports, mobility hubs, business anchors and development anchors.",
    category: "Anchors / POI",
    sourceMode: "demo_normalized",
    style: {
      fillColor: "#287aa0",
      strokeColor: "#135a78",
      strokeWidth: 1.15,
      fillOpacity: 0.78,
      strokeOpacity: 0.82,
      pointRadius: 4.5
    },
    visibleByDefault: true,
    minZoom: 9.4,
    maxZoom: 18,
    layerOrder: 70,
    clickPriority: 95,
    legendLabel: "Spatial anchors",
    disclaimer: "Demo-normalized anchor point; official source validation is required."
  },
  constructionSites: {
    description: "Demo construction monitoring targets for progress and lender-reporting workflows.",
    category: "Anchors / POI",
    sourceMode: "demo_normalized",
    style: {
      fillColor: "#8e681f",
      strokeColor: "#6e4f11",
      strokeWidth: 1.15,
      fillOpacity: 0.74,
      strokeOpacity: 0.82,
      pointRadius: 4.5
    },
    visibleByDefault: false,
    minZoom: 10.6,
    maxZoom: 18,
    layerOrder: 80,
    clickPriority: 92,
    legendLabel: "Pipeline watch points",
    disclaimer: "Demo construction target; not a live project-control record."
  },
  futureMunicipalityGis: {
    description: "Placeholder for future official GIS validation sources.",
    category: "Planned Official",
    sourceMode: "planned_official",
    style: {
      fillColor: "#64748b",
      strokeColor: "#475569",
      strokeWidth: 1,
      fillOpacity: 0.08,
      strokeOpacity: 0.44
    },
    visibleByDefault: false,
    minZoom: 9,
    maxZoom: 18,
    layerOrder: 90,
    clickPriority: 10,
    legendLabel: "Future official GIS",
    disclaimer: "Planned official integration only; not connected in this MVP."
  },
  futureCustomerAssets: {
    description: "Placeholder for customer-uploaded assets and boundaries.",
    category: "Customer Future",
    sourceMode: "customer_future",
    style: {
      fillColor: "#0f766e",
      strokeColor: "#0b5f59",
      strokeWidth: 1,
      fillOpacity: 0.1,
      strokeOpacity: 0.5
    },
    visibleByDefault: false,
    minZoom: 10,
    maxZoom: 19,
    layerOrder: 100,
    clickPriority: 15,
    legendLabel: "Future customer assets",
    disclaimer: "Future customer data placeholder; no customer geometry is connected."
  }
};

function mapGeometryType(geometryType: SpatialGeometry["type"]): DemoLayerType {
  if (geometryType === "Polygon") return "polygon";
  if (geometryType === "LineString") return "line";
  return "point";
}

function formatSourceMode(sourceMode: DemoLayerSourceMode) {
  return sourceMode.replace(/_/g, "-");
}

function scenarioRelevanceText(feature: SpatialFeature) {
  if (feature.properties.scenarioRelevance.includes("investmentSiteSelection")) {
    return "Relevant for investment site selection and development screening.";
  }

  if (feature.properties.scenarioRelevance.includes("climateRisk")) {
    return "Relevant for climate exposure and resilience screening.";
  }

  if (feature.properties.scenarioRelevance.includes("constructionMonitoring")) {
    return "Relevant for construction monitoring and progress evidence workflows.";
  }

  if (feature.properties.scenarioRelevance.includes("infrastructureUrbanPlanning")) {
    return "Relevant for infrastructure and urban planning review.";
  }

  return "Relevant for early spatial intelligence screening.";
}

function toDemoFeature(feature: SpatialFeature, layerId: DemoLayerId, layerName: string, layer: DemoLayer): DemoLayerFeature {
  return {
    type: "Feature",
    id: feature.id,
    properties: {
      id: feature.id,
      featureId: feature.id,
      name: feature.properties.name,
      objectType: feature.properties.subtype,
      layerId,
      layerName,
      geometryType: mapGeometryType(feature.geometry.type),
      color: layer.color,
      category: layer.category,
      subcategory: feature.properties.subtype,
      sourceMode: layer.sourceMode,
      confidenceLevel: feature.properties.confidenceLevel,
      relevance: scenarioRelevanceText(feature),
      hoverLabel: `${feature.properties.name} · ${layer.legendLabel}`,
      selectedLabel: `Selected: ${feature.properties.name}`,
      fillColor: layer.style.fillColor,
      strokeColor: layer.style.strokeColor,
      strokeWidth: layer.style.strokeWidth,
      fillOpacity: layer.style.fillOpacity,
      strokeOpacity: layer.style.strokeOpacity,
      pointRadius: layer.style.pointRadius ?? 5,
      layerOrder: layer.layerOrder,
      clickPriority: layer.clickPriority
    },
    geometry: feature.geometry
  };
}

export const demoLayers: DemoLayer[] = spatialDatasetRegistry
  .filter((dataset) => dataset.features.length > 0)
  .map((dataset) => {
    const layerId = dataset.layerId as DemoLayerId;
    const design = demoLayerDesign[layerId];
    const layer: DemoLayer = {
      ...design,
      id: layerId,
      name: dataset.layerName,
      type: dataset.mapType as DemoLayerType,
      color: design.style.fillColor,
      features: []
    };

    return {
      ...layer,
      features: dataset.features.map((feature) =>
        toDemoFeature(feature, layerId, dataset.layerName, layer)
      )
    };
  })
  .sort((a, b) => a.layerOrder - b.layerOrder);

export function getLayerSourceModeLabel(layer: Pick<DemoLayer, "sourceMode">) {
  return formatSourceMode(layer.sourceMode);
}

export function getFeatureCenter(feature: DemoLayerFeature): SelectedPoint {
  const spatialFeature = getSpatialFeatureById(feature.id);
  if (spatialFeature) {
    return spatialFeature.properties.centroid;
  }

  if (feature.geometry.type === "Point") {
    return {
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1]
    };
  }

  const coordinates = feature.geometry.type === "LineString"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates[0];
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

export function getSelectedDemoObject(feature: DemoLayerFeature): SelectedDemoObject {
  const spatialFeature = getSpatialFeatureById(feature.id);
  const spatialContext = spatialFeature ? toSpatialSelectionContext(spatialFeature) : undefined;

  return {
    id: feature.properties.id,
    name: feature.properties.name,
    type: feature.properties.objectType,
    layerId: feature.properties.layerId,
    layerName: feature.properties.layerName,
    geometryType: feature.properties.geometryType,
    center: getFeatureCenter(feature),
    spatialContext,
    analysisTarget: {
      id: feature.properties.id,
      type: "demo-feature",
      label: feature.properties.name,
      coordinates: getFeatureCenter(feature),
      geometry: feature.geometry,
      properties: feature.properties,
      datasetName: feature.properties.layerName,
      sourceMode: "demo",
      officialStatus: "not-official"
    }
  };
}

export function getDemoFeatureById(featureId: string) {
  return demoLayers.flatMap((layer) => layer.features).find((feature) => feature.id === featureId) ?? null;
}
