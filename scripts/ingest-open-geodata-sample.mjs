import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const samplesDir = path.join(root, "data", "samples");
const normalizedDir = path.join(root, "data", "normalized");
const inputFiles = [
  "dubai_osm_roads_sample.geojson",
  "dubai_osm_poi_sample.geojson",
  "dubai_osm_landuse_sample.geojson",
  "dubai_osm_buildings_sample.geojson"
];

function readGeoJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(samplesDir, fileName), "utf8"));
}

function slug(value, fallback) {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function classifyRoad(properties = {}) {
  const highway = String(properties.highway || "").toLowerCase();
  if (["motorway", "motorway_link"].includes(highway)) return "motorway";
  if (["trunk", "trunk_link"].includes(highway)) return "trunk";
  if (["primary", "primary_link"].includes(highway)) return "primary";
  if (["secondary", "secondary_link"].includes(highway)) return "secondary";
  if (["service", "track"].includes(highway)) return "service";
  return "local";
}

function roadPriority(roadClass) {
  return { motorway: 90, trunk: 82, primary: 72, secondary: 55, local: 35, service: 20 }[roadClass] || 35;
}

function classifyPoi(properties = {}) {
  const raw = Object.values(properties).map((value) => String(value).toLowerCase()).join(" ");
  if (raw.includes("airport") || raw.includes("aerodrome")) return "airport";
  if (raw.includes("metro") || raw.includes("station") || raw.includes("transport")) return "metro_mobility";
  if (raw.includes("tourism") || raw.includes("landmark") || raw.includes("waterfront")) return "tourism";
  if (raw.includes("retail") || raw.includes("mall") || raw.includes("shop")) return "retail";
  if (raw.includes("education") || raw.includes("school") || raw.includes("university")) return "education";
  if (raw.includes("health") || raw.includes("hospital") || raw.includes("clinic")) return "healthcare";
  if (raw.includes("development") || raw.includes("growth")) return "development_anchor";
  return "business";
}

function scenarioRelevance(category) {
  if (["airport", "metro_mobility"].includes(category)) {
    return ["investmentSiteSelection", "realEstateDevelopment", "infrastructureUrbanPlanning"];
  }
  if (category === "development_anchor") {
    return ["investmentSiteSelection", "realEstateDevelopment", "constructionMonitoring"];
  }
  if (["tourism", "business", "retail"].includes(category)) {
    return ["investmentSiteSelection", "realEstateDevelopment"];
  }
  return ["infrastructureUrbanPlanning", "investmentSiteSelection"];
}

function classifyLanduse(properties = {}) {
  const raw = String(properties.landuse || properties.areaClass || "").toLowerCase();
  if (raw.includes("airport") || raw.includes("transport")) return "transport_airport";
  if (raw.includes("industrial") || raw.includes("logistics")) return "industrial_logistics";
  if (raw.includes("commercial") || raw.includes("business")) return "commercial";
  if (raw.includes("tourism") || raw.includes("waterfront") || raw.includes("marina")) return "tourism_waterfront";
  if (raw.includes("mixed")) return "mixed_use";
  if (raw.includes("park") || raw.includes("open")) return "open_space";
  return "residential";
}

function cleanProperties(properties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
  );
}

function normalizeRoads(collection) {
  return collection.features.flatMap((feature, index) => {
    if (feature.geometry?.type !== "LineString") return [];
    const roadClass = classifyRoad(feature.properties);
    return [{
      id: slug(feature.id || feature.properties?.id, `road-${index + 1}`),
      name: String(feature.properties?.name || `Open road ${index + 1}`),
      roadClass,
      geometry: feature.geometry,
      sourceMode: "open_geodata_sample",
      confidence: "sample",
      displayPriority: roadPriority(roadClass),
      properties: cleanProperties(feature.properties)
    }];
  });
}

function normalizePoi(collection) {
  return collection.features.flatMap((feature, index) => {
    if (feature.geometry?.type !== "Point") return [];
    const category = classifyPoi(feature.properties);
    return [{
      id: slug(feature.id || feature.properties?.id, `poi-${index + 1}`),
      name: String(feature.properties?.name || `Open POI ${index + 1}`),
      category,
      subcategory: String(feature.properties?.subcategory || feature.properties?.amenity || category),
      coordinates: {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1]
      },
      scenarioRelevance: scenarioRelevance(category),
      sourceMode: "open_geodata_sample",
      confidence: "sample",
      properties: cleanProperties(feature.properties)
    }];
  });
}

function normalizeLanduse(collection) {
  return collection.features.flatMap((feature, index) => {
    if (feature.geometry?.type !== "Polygon") return [];
    return [{
      id: slug(feature.id || feature.properties?.id, `landuse-${index + 1}`),
      name: String(feature.properties?.name || `Open landuse ${index + 1}`),
      landuseClass: classifyLanduse(feature.properties),
      geometry: feature.geometry,
      sourceMode: "open_geodata_sample",
      confidence: "sample",
      properties: cleanProperties(feature.properties)
    }];
  });
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function lineCentroid(road) {
  const total = road.geometry.coordinates.reduce(
    (sum, coordinate) => ({ longitude: sum.longitude + coordinate[0], latitude: sum.latitude + coordinate[1] }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: total.latitude / road.geometry.coordinates.length,
    longitude: total.longitude / road.geometry.coordinates.length
  };
}

function createMetrics(roads, poi) {
  const areaSeeds = [
    ["Dubai Marina", 25.0796, 55.1488],
    ["Downtown Dubai", 25.2015, 55.2797],
    ["Business Bay", 25.1854, 55.2659],
    ["JVC", 25.071, 55.205],
    ["Meydan / MBR City", 25.163, 55.319],
    ["Dubai South", 24.964, 55.172]
  ];
  const majorRoads = roads.filter((road) => ["motorway", "trunk", "primary"].includes(road.roadClass));
  const airports = poi.filter((item) => item.category === "airport");
  const mobility = poi.filter((item) => ["airport", "metro_mobility"].includes(item.category));
  const demand = poi.filter((item) => ["business", "tourism", "retail", "development_anchor"].includes(item.category));

  return areaSeeds.map(([areaName, latitude, longitude]) => {
    const coordinates = { latitude, longitude };
    const nearestMajorRoadKm = Math.min(...majorRoads.map((road) => haversineKm(coordinates, lineCentroid(road))));
    const nearestAirportKm = Math.min(...airports.map((item) => haversineKm(coordinates, item.coordinates)));
    const nearestMobilityAnchorKm = Math.min(...mobility.map((item) => haversineKm(coordinates, item.coordinates)));
    const poiCountNearby = poi.filter((item) => haversineKm(coordinates, item.coordinates) <= 6).length;
    const demandAnchorCountNearby = demand.filter((item) => haversineKm(coordinates, item.coordinates) <= 7).length;
    const accessibilityIndex = Math.round(Math.min(Math.max(
      92 - nearestMajorRoadKm * 2.3 - nearestMobilityAnchorKm * 1.5 + poiCountNearby * 2.4 + demandAnchorCountNearby * 1.8,
      35
    ), 95));

    return {
      areaName,
      coordinates,
      nearestMajorRoadKm: Number(nearestMajorRoadKm.toFixed(1)),
      nearestAirportKm: Number(nearestAirportKm.toFixed(1)),
      nearestMobilityAnchorKm: Number(nearestMobilityAnchorKm.toFixed(1)),
      poiCountNearby,
      demandAnchorCountNearby,
      accessibilityIndex,
      mobilityContext: `Sample open-baseline context: nearest major road ${nearestMajorRoadKm.toFixed(1)} km, nearest mobility anchor ${nearestMobilityAnchorKm.toFixed(1)} km, ${poiCountNearby} nearby POI anchors.`,
      sourceMode: "open_geodata_sample",
      confidence: "sample"
    };
  });
}

function writeJson(fileName, data) {
  fs.mkdirSync(normalizedDir, { recursive: true });
  fs.writeFileSync(path.join(normalizedDir, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

const roadsInput = readGeoJson("dubai_osm_roads_sample.geojson");
const poiInput = readGeoJson("dubai_osm_poi_sample.geojson");
const landuseInput = readGeoJson("dubai_osm_landuse_sample.geojson");
const buildingsInput = readGeoJson("dubai_osm_buildings_sample.geojson");

const roads = normalizeRoads(roadsInput);
const poi = normalizePoi(poiInput);
const landuse = normalizeLanduse(landuseInput);
const buildings = buildingsInput.features || [];
const metrics = createMetrics(roads, poi);
const generatedAt = new Date().toISOString();
const limitations = [
  "OSM-style local fixture only; not live OSM, official GIS, planning, parcel, zoning, or transport authority data.",
  "Production use requires source attribution, ODbL/compliance review, extract date tracking, and official validation where decision-grade evidence is required."
];

const roadsOutput = { type: "FeatureCollection", sourceMode: "open_geodata_sample", generatedAt, features: roads };
const poiOutput = { type: "FeatureCollection", sourceMode: "open_geodata_sample", generatedAt, features: poi };
const landuseOutput = { type: "FeatureCollection", sourceMode: "open_geodata_sample", generatedAt, features: landuse };
const buildingsOutput = { type: "FeatureCollection", sourceMode: "open_geodata_sample", generatedAt, features: buildings };

writeJson("open_geodata_roads.geojson", roadsOutput);
writeJson("open_geodata_poi.geojson", poiOutput);
writeJson("open_geodata_landuse.geojson", landuseOutput);
writeJson("open_geodata_buildings.geojson", buildingsOutput);
writeJson("open_geodata_roads.json", roadsOutput);
writeJson("open_geodata_poi.json", poiOutput);
writeJson("open_geodata_landuse.json", landuseOutput);
writeJson("open_geodata_buildings.json", buildingsOutput);
writeJson("open_geodata_accessibility_metrics.json", { sourceMode: "open_geodata_sample", generatedAt, items: metrics });
writeJson("open_geodata_ingestion_report.json", {
  sourceMode: "open_geodata_sample",
  inputFiles,
  featuresRead: roadsInput.features.length + poiInput.features.length + landuseInput.features.length + buildingsInput.features.length,
  featuresNormalized: {
    roads: roads.length,
    poi: poi.length,
    landuse: landuse.length,
    buildings: buildings.length,
    accessibilityMetrics: metrics.length
  },
  warnings: buildings.length === 0 ? ["Buildings sample is intentionally empty in v0.1 to avoid map clutter."] : [],
  limitations,
  generatedAt
});

console.log(`Open geodata baseline normalized: ${roads.length} roads, ${poi.length} POI, ${landuse.length} landuse areas, ${metrics.length} accessibility metrics.`);
