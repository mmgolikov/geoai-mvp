import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const inputPath = process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length) ?? "data/external/raw/osm/dubai_osm_baseline.geojson";
const outputPath = "data/external/normalized/spatial_baseline.real.geojson";
const reportPath = "data/external/normalized/osm_ingestion_report.real.json";
const manifestPath = "data/external/normalized/external_data_manifest.json";
const generatedAt = new Date().toISOString();
const source = {
  id: "osm-geofabrik-baseline",
  name: "OSM / Geofabrik open geospatial baseline",
  status: "snapshot_available",
  sourceType: "open-data",
  updateMode: "manual",
  disclaimer: "Open geospatial baseline; not official municipal GIS, zoning or parcel boundary data."
};
const defaultManifestSources = [
  {
    id: "dld-dubai-pulse-transactions",
    status: "manual_import_ready",
    lastUpdated: null,
    availableFiles: [],
    rowCount: 0,
    usedInAnalysis: false,
    disclaimer: "Open official dataset snapshot; not a live official transactional feed."
  },
  {
    id: "osm-geofabrik-baseline",
    status: "manual_import_ready",
    lastUpdated: null,
    availableFiles: [],
    featureCount: 0,
    usedInAnalysis: false,
    disclaimer: "Open geospatial baseline; not official municipal GIS, zoning or parcel boundary data."
  },
  {
    id: "open-meteo-climate",
    status: "permission_required",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Open-Meteo commercial-use approval is required; no live response or snapshot is claimed."
  },
  {
    id: "copernicus-sentinel-catalog",
    status: "planned",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Public catalogue metadata path only; imagery download and analytics remain gated."
  },
  {
    id: "geodubai-municipality-validation",
    status: "planned",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Planned official validation source; not connected in this demo."
  },
  {
    id: "dld-api-gateway-validation",
    status: "permission_required",
    lastUpdated: null,
    availableFiles: [],
    usedInAnalysis: false,
    disclaimer: "Enterprise validation/integration path; not connected in this demo."
  }
];

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function classifyFeature(properties = {}, geometryType = "") {
  const highway = String(properties.highway ?? "").toLowerCase();
  const building = properties.building;
  const landuse = properties.landuse;
  const water = properties.water ?? properties.natural;
  const amenity = properties.amenity ?? properties.tourism ?? properties.shop;
  const railway = properties.railway ?? properties.public_transport;

  if (highway === "motorway" || highway === "trunk" || highway === "primary") return "major_road";
  if (highway) return "road";
  if (building) return "building";
  if (landuse) return "landuse";
  if (water === "water" || water === "coastline") return "water";
  if (railway) return "transport_anchor";
  if (amenity) return "poi";
  if (geometryType === "Point") return "poi";
  return "other";
}

function updateManifest(featureCount) {
  let manifest = {
    generatedAt,
    version: "0.7",
    summary: "GeoAI Real Data Backbone v0.7 manifest.",
    sources: defaultManifestSources
  };

  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      // Keep default manifest if malformed.
    }
  }

  const nextSource = {
    id: source.id,
    status: featureCount > 0 ? source.status : "manual_import_ready",
    lastUpdated: generatedAt,
    availableFiles: featureCount > 0 ? [outputPath, reportPath] : [reportPath],
    featureCount,
    usedInAnalysis: featureCount > 0,
    disclaimer: source.disclaimer
  };
  const mergedDefaults = defaultManifestSources.map((defaultSource) => ({
    ...defaultSource,
    ...(Array.isArray(manifest.sources) ? manifest.sources.find((item) => item.id === defaultSource.id) : {})
  }));
  const sources = mergedDefaults.filter((item) => item.id !== source.id);

  ensureDir(manifestPath);
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, generatedAt, sources: [nextSource, ...sources] }, null, 2));
}

if (!existsSync(inputPath)) {
  ensureDir(reportPath);
  const report = {
    generatedAt,
    source,
    status: "unavailable",
    inputPath,
    message: "OSM / Geofabrik prepared baseline not found. Existing demo open-geodata sample remains available.",
    featuresRead: 0,
    featuresWritten: 0
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  updateManifest(0);
  console.log(report.message);
  process.exit(0);
}

const input = JSON.parse(readFileSync(inputPath, "utf8"));
const features = Array.isArray(input.features) ? input.features : [];
const normalized = {
  type: "FeatureCollection",
  name: "GeoAI OSM / Geofabrik prepared baseline",
  generatedAt,
  features: features.map((feature, index) => {
    const properties = feature.properties ?? {};

    return {
      ...feature,
      id: feature.id ?? `osm-geofabrik-${index + 1}`,
      properties: {
        ...properties,
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.sourceType,
        layerGroup: "real-external-baseline",
        featureType: classifyFeature(properties, feature.geometry?.type),
        validationStatus: "open-data-not-official-municipal-gis"
      }
    };
  })
};
const report = {
  generatedAt,
  source,
  status: "ok",
  inputPath,
  featuresRead: features.length,
  featuresWritten: normalized.features.length,
  message: "Prepared OSM / Geofabrik baseline normalized. This is open data context, not official municipal GIS, zoning or parcel data."
};

ensureDir(outputPath);
writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
writeFileSync(reportPath, JSON.stringify(report, null, 2));
updateManifest(normalized.features.length);
console.log(`OSM / Geofabrik prepared baseline normalized: ${normalized.features.length} features.`);
