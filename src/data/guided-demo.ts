import type { AnalysisScenarioId, ComparisonItem, SelectedDemoObject, SelectedPoint } from "@/src/types/geo";
import type { UploadedCsvRow, UploadedDataset } from "@/src/types/uploaded-data";

export type GuidedDemoPresetId = "dubai-marina-investment" | "dubai-south-development" | "bank-asset-review";

export type GuidedDemoPreset = {
  id: GuidedDemoPresetId;
  title: string;
  clientType: string;
  scenarioId: AnalysisScenarioId;
  selectedAreaLabel: string;
  geometryType: "point" | "polygon";
  center: SelectedPoint;
  featureName?: string;
  recommendedDatasets: string[];
  scriptBullets: string[];
  expectedOutput: string;
  dataHonestyNote: string;
  projectKey: string;
};

export const guidedDemoPresets: GuidedDemoPreset[] = [
  {
    id: "dubai-marina-investment",
    title: "Dubai Marina investment screening",
    clientType: "Fund / family office",
    scenarioId: "investmentSiteSelection",
    selectedAreaLabel: "Dubai Marina Demo Pipeline Area",
    geometryType: "polygon",
    center: { latitude: 25.0822, longitude: 55.1431 },
    featureName: "Dubai Marina Demo Pipeline Area",
    recommendedDatasets: [
      "Demo CSV metrics - local sample / not official",
      "Demo GeoJSON screening sites - local sample / not official boundary"
    ],
    scriptBullets: [
      "Show high-demand coastal asset screening.",
      "Run investment analysis with market, accessibility, risk and evidence context.",
      "Use the memo to explain validation gaps before underwriting."
    ],
    expectedOutput: "Investment memo + due diligence checklist.",
    dataHonestyNote: "Uses local demo sample data only. Official DLD / Dubai Pulse / GeoDubai validation is not connected in this demo.",
    projectKey: "dubai-investment-screening-demo"
  },
  {
    id: "dubai-south-development",
    title: "Dubai South development pipeline",
    clientType: "Developer / master developer",
    scenarioId: "realEstateDevelopment",
    selectedAreaLabel: "Dubai South Demo Growth Node",
    geometryType: "polygon",
    center: { latitude: 24.8887, longitude: 55.1542 },
    featureName: "Dubai South Demo Growth Node",
    recommendedDatasets: [
      "Demo CSV metrics - local sample / not official",
      "Demo GeoJSON screening sites - local sample / not official boundary"
    ],
    scriptBullets: [
      "Show early-stage development pipeline screening.",
      "Explain infrastructure, growth and planning validation needs.",
      "Use comparison to contrast with a mature coastal area."
    ],
    expectedOutput: "Development potential memo + validation checklist.",
    dataHonestyNote: "The growth polygon is a synthetic demo fixture, not official parcel, zoning or planning geometry.",
    projectKey: "developer-land-pipeline-demo"
  },
  {
    id: "bank-asset-review",
    title: "Bank asset review / collateral screening",
    clientType: "Bank / lender",
    scenarioId: "investmentSiteSelection",
    selectedAreaLabel: "Business Bay Demo Infill Area",
    geometryType: "polygon",
    center: { latitude: 25.1853, longitude: 55.2685 },
    featureName: "Business Bay Demo Infill Area",
    recommendedDatasets: [
      "Demo CSV metrics - local sample / not official",
      "Demo GeoJSON screening sites - local sample / not official boundary"
    ],
    scriptBullets: [
      "Show lender-style collateral context.",
      "Review market confidence, access, exposure and evidence trail.",
      "Export a lender-ready review summary."
    ],
    expectedOutput: "Lender-ready review summary.",
    dataHonestyNote: "Sample/offline metrics and local screening geometries support the demo narrative; they are not official evidence.",
    projectKey: "bank-asset-review-demo"
  }
];

const pipelineSitesSample: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Dubai Marina Demo Pipeline Area",
        site_type: "mixed_use_pipeline",
        confidence: "sample",
        note: "Synthetic polygon for upload workflow testing."
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [55.1328, 25.0894],
            [55.1517, 25.0891],
            [55.1542, 25.0769],
            [55.1369, 25.0735],
            [55.1328, 25.0894]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "Business Bay Demo Infill Area",
        site_type: "redevelopment_watch",
        confidence: "sample",
        note: "Synthetic polygon for upload workflow testing."
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [55.2585, 25.1937],
            [55.2781, 25.1905],
            [55.2769, 25.1779],
            [55.2603, 25.1788],
            [55.2585, 25.1937]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "Dubai South Demo Growth Node",
        site_type: "growth_pipeline",
        confidence: "sample",
        note: "Synthetic polygon for upload workflow testing."
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [55.1364, 24.9047],
            [55.1758, 24.9012],
            [55.1721, 24.8731],
            [55.1327, 24.8758],
            [55.1364, 24.9047]
          ]
        ]
      }
    }
  ]
};

const demoMetricRows: UploadedCsvRow[] = [
  {
    name: "Dubai Marina Waterfront Parcel",
    areaName: "Dubai Marina",
    latitude: 25.0839,
    longitude: 55.1416,
    metrics: {
      transaction_count: 128,
      median_price_per_sqm: 31200,
      rental_demand_index: 82,
      pipeline_status: "active pipeline",
      confidence: "sample",
      notes: "Demo user-uploaded metric row for local-only screening."
    },
    raw: {
      site_name: "Dubai Marina Waterfront Parcel",
      area_name: "Dubai Marina",
      latitude: "25.0839",
      longitude: "55.1416",
      transaction_count: "128",
      median_price_per_sqm: "31200",
      rental_demand_index: "82",
      pipeline_status: "active pipeline",
      confidence: "sample",
      notes: "Demo user-uploaded metric row for local-only screening."
    }
  },
  {
    name: "Business Bay Infill Site",
    areaName: "Business Bay",
    latitude: 25.1852,
    longitude: 55.2694,
    metrics: {
      transaction_count: 164,
      median_price_per_sqm: 28400,
      rental_demand_index: 78,
      pipeline_status: "redevelopment watch",
      confidence: "sample",
      notes: "Demo user-uploaded metric row for local-only screening."
    },
    raw: {
      site_name: "Business Bay Infill Site",
      area_name: "Business Bay",
      latitude: "25.1852",
      longitude: "55.2694",
      transaction_count: "164",
      median_price_per_sqm: "28400",
      rental_demand_index: "78",
      pipeline_status: "redevelopment watch",
      confidence: "sample",
      notes: "Demo user-uploaded metric row for local-only screening."
    }
  },
  {
    name: "Dubai South Growth Zone",
    areaName: "Dubai South",
    latitude: 24.8922,
    longitude: 55.1551,
    metrics: {
      transaction_count: 72,
      median_price_per_sqm: 14600,
      rental_demand_index: 61,
      pipeline_status: "early growth",
      confidence: "sample",
      notes: "Demo user-uploaded metric row for local-only screening."
    },
    raw: {
      site_name: "Dubai South Growth Zone",
      area_name: "Dubai South",
      latitude: "24.8922",
      longitude: "55.1551",
      transaction_count: "72",
      median_price_per_sqm: "14600",
      rental_demand_index: "61",
      pipeline_status: "early growth",
      confidence: "sample",
      notes: "Demo user-uploaded metric row for local-only screening."
    }
  }
];

function clonePipelineGeojson(): GeoJSON.FeatureCollection {
  return JSON.parse(JSON.stringify(pipelineSitesSample)) as GeoJSON.FeatureCollection;
}

function getPipelineFeature(preset: GuidedDemoPreset) {
  const geojson = clonePipelineGeojson();
  return geojson.features.find((feature) => feature.properties?.name === preset.featureName) ?? geojson.features[0];
}

function createDemoGeojsonDataset(uploadedAt: string): UploadedDataset {
  const geojson = clonePipelineGeojson();

  return {
    id: "guided-demo-geojson-sites",
    name: "Demo GeoJSON screening sites",
    type: "geojson",
    status: "parsed",
    sourceMode: "sample-fixture",
    uploadedAt,
    featureCount: geojson.features.length,
    confidence: "sample",
    officialStatus: "official-validation-required",
    notes: "Local demo GeoJSON screening geometries. Synthetic sample boundaries, not official parcel, zoning or planning data.",
    visible: true,
    geojson
  };
}

function createDemoCsvDataset(uploadedAt: string): UploadedDataset {
  return {
    id: "guided-demo-csv-metrics",
    name: "Demo CSV metrics",
    type: "csv",
    status: "parsed",
    sourceMode: "sample-fixture",
    uploadedAt,
    rowCount: demoMetricRows.length,
    columns: [
      "site_name",
      "area_name",
      "latitude",
      "longitude",
      "transaction_count",
      "median_price_per_sqm",
      "rental_demand_index",
      "pipeline_status",
      "confidence",
      "notes"
    ],
    confidence: "sample",
    officialStatus: "official-validation-required",
    notes: "Local demo CSV metrics from the sample fixture. Not official DLD / Dubai Pulse data.",
    rows: demoMetricRows
  };
}

function collectGeometryCoordinates(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === "Point") return [geometry.coordinates as [number, number]];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") return geometry.coordinates as [number, number][];
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") return geometry.coordinates.flat(1) as [number, number][];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2) as [number, number][];
  return [];
}

function getGeometryCenter(geometry: GeoJSON.Geometry, fallback: SelectedPoint): SelectedPoint {
  const coordinates = collectGeometryCoordinates(geometry);
  if (coordinates.length === 0) return fallback;

  const total = coordinates.reduce(
    (sum, coordinate) => ({
      longitude: sum.longitude + coordinate[0],
      latitude: sum.latitude + coordinate[1]
    }),
    { longitude: 0, latitude: 0 }
  );

  return {
    longitude: total.longitude / coordinates.length,
    latitude: total.latitude / coordinates.length
  };
}

export function createGuidedDemoDatasets() {
  const uploadedAt = new Date().toISOString();
  return [createDemoCsvDataset(uploadedAt), createDemoGeojsonDataset(uploadedAt)];
}

export function getGuidedDemoPreset(id?: string | null) {
  return guidedDemoPresets.find((preset) => preset.id === id) ?? guidedDemoPresets[0];
}

export function createGuidedDemoSelection(preset: GuidedDemoPreset): SelectedDemoObject {
  const feature = getPipelineFeature(preset);
  const geometry = feature.geometry;
  const center = geometry ? getGeometryCenter(geometry, preset.center) : preset.center;
  const featureName = String(feature.properties?.name ?? preset.selectedAreaLabel);
  const featureId = String(feature.properties?.id ?? featureName.toLowerCase().replace(/[^a-z0-9]+/g, "-"));

  return {
    id: `guided-demo-${featureId}`,
    name: featureName,
    type: "Demo screening geometry",
    layerId: "futureCustomerAssets",
    layerName: "Demo GeoJSON screening sites",
    geometryType: preset.geometryType === "point" ? "point" : "polygon",
    center,
    analysisTarget: {
      id: featureId,
      type: "uploaded-feature",
      label: featureName,
      coordinates: center,
      geometry,
      properties: {
        ...(feature.properties ?? {}),
        guidedDemoPreset: preset.id,
        dataMode: "local demo sample",
        officialStatus: "official-validation-required"
      },
      datasetId: "guided-demo-geojson-sites",
      datasetName: "Demo GeoJSON screening sites",
      sourceMode: "sample-fixture",
      officialStatus: "official-validation-required"
    }
  };
}

export function createGuidedDemoComparisonItems(preset: GuidedDemoPreset): ComparisonItem[] {
  const scenarioLabel = preset.scenarioId === "realEstateDevelopment"
    ? "Real Estate Development"
    : "Investment Site Selection";
  const baseItems = [
    createGuidedDemoSelection(guidedDemoPresets[0]),
    createGuidedDemoSelection(guidedDemoPresets[1]),
    createGuidedDemoSelection(guidedDemoPresets[2])
  ];
  const ordered = [
    ...baseItems.filter((item) => item.name === preset.selectedAreaLabel),
    ...baseItems.filter((item) => item.name !== preset.selectedAreaLabel)
  ].slice(0, 3);

  return ordered.map((item) => ({
    id: `${item.id}-${preset.scenarioId}`,
    name: item.name,
    itemType: "object",
    scenarioId: preset.scenarioId,
    scenarioLabel,
    point: item.center,
    selectedObject: item,
    locationLabel: `${item.center.latitude.toFixed(5)}, ${item.center.longitude.toFixed(5)}`
  }));
}
