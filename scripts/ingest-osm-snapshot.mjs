import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const defaultInput = "data/external/osm/dubai_osm_baseline_sample.geojson";
const outputPath = "data/normalized/open_geodata_snapshot.json";
const qualityPath = "data/normalized/open_geodata_snapshot_quality.json";
const manifestPath = "data/external/normalized/external_data_manifest.json";
const caveat = "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function inputStatus(file) {
  return file.includes("_sample.") || file.includes("/samples/") ? "sample_fallback" : "snapshot_available";
}

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function classify(properties = {}, geometryType = "") {
  if (properties.highway) return "road";
  if (properties.railway || properties.public_transport) return "transport";
  if (properties.landuse || properties.zoning) return "landuse";
  if (properties.amenity || properties.tourism || properties.shop || geometryType === "Point") return "poi";
  return "context";
}

function normalizeFeature(feature, index) {
  const properties = feature.properties ?? {};
  const featureType = classify(properties, feature.geometry?.type);

  return {
    id: feature.id ?? `osm-snapshot-${index + 1}`,
    name: properties.name ?? `${featureType} ${index + 1}`,
    featureType,
    geometryType: feature.geometry?.type ?? "Unknown",
    properties: {
      ...properties,
      sourceId: "osm-geofabrik-baseline",
      sourceName: "OSM / Geofabrik open geospatial baseline",
      validationStatus: "open-data-not-official-municipal-gis"
    },
    geometry: feature.geometry,
    limitations: [
      "Open geospatial context only; not official municipal GIS, zoning or parcel boundary data.",
      caveat
    ]
  };
}

function updateManifest(featureCount, generatedAt, inputFile) {
  const status = featureCount > 0 ? inputStatus(inputFile) : "sample_fallback";
  let manifest = {
    generatedAt,
    version: "1.4",
    summary: "GeoAI external data manifest v1.4. Snapshot connectors are optional and fall back safely to demo/sample context.",
    sources: []
  };

  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      // Keep default manifest if malformed.
    }
  }

  const next = {
    id: "osm-geofabrik-baseline",
    status,
    lastUpdated: generatedAt,
    availableFiles: featureCount > 0 ? [inputFile, outputPath, qualityPath] : [qualityPath],
    featureCount,
    recordCount: featureCount,
    coverageArea: "Dubai open geospatial baseline",
    confidence: status === "snapshot_available" ? "medium" : "low",
    usedInAnalysis: featureCount > 0,
    caveat: featureCount > 0
      ? `OSM / Geofabrik ${status === "snapshot_available" ? "snapshot context available" : "sample fallback active"}; ${caveat}`
      : `OSM / Geofabrik snapshot missing; sample fallback active; ${caveat}`,
    disclaimer: "Open geospatial baseline; not official municipal GIS, zoning or parcel boundary data."
  };
  const sources = Array.isArray(manifest.sources) ? manifest.sources.filter((source) => source.id !== next.id) : [];

  ensureDir(manifestPath);
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, generatedAt, version: "1.4", sources: [next, ...sources] }, null, 2));
}

const inputFile = argValue("file") ?? defaultInput;
const generatedAt = new Date().toISOString();

if (!existsSync(inputFile)) {
  ensureDir(qualityPath);
  const report = {
    generatedAt,
    status: "unavailable",
    inputFile,
    message: "No OSM / Geofabrik GeoJSON snapshot found. Sample/demo fallback remains active.",
    caveat
  };
  writeFileSync(qualityPath, JSON.stringify(report, null, 2));
  updateManifest(0, generatedAt, inputFile);
  console.log(report.message);
  process.exit(0);
}

const parsed = JSON.parse(readFileSync(inputFile, "utf8"));
const features = Array.isArray(parsed.features) ? parsed.features.map(normalizeFeature) : [];
const roads = features.filter((feature) => feature.featureType === "road" || feature.featureType === "transport");
const pois = features.filter((feature) => feature.featureType === "poi");
const landuse = features.filter((feature) => feature.featureType === "landuse");
const context = features.filter((feature) => !roads.includes(feature) && !pois.includes(feature) && !landuse.includes(feature));
const normalized = {
  generatedAt,
  version: "1.4",
  source: {
    id: "osm-geofabrik-baseline",
    name: "OSM / Geofabrik open geospatial baseline",
    status: inputStatus(inputFile),
    sourceType: "open-data",
    accessMode: "snapshot",
    disclaimer: "Open geospatial baseline; not official municipal GIS, zoning or parcel boundary data."
  },
  featureCount: features.length,
  roads,
  pois,
  landuse,
  context,
  quality: {
    status: "ok",
    notes: [],
    caveat
  }
};

ensureDir(outputPath);
writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
writeFileSync(qualityPath, JSON.stringify({ generatedAt, status: "ok", inputFile, featuresRead: features.length, caveat }, null, 2));
updateManifest(features.length, generatedAt, inputFile);
console.log(`OSM / Geofabrik snapshot normalized: ${features.length} features.`);
