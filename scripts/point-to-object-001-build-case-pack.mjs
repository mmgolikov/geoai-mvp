import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadPointToObjectContract,
  validateRightsDecision
} from "./point-to-object-001-contract-gates.mjs";

const ROUND_DIGITS = 7;
const NORMALIZATION_VERSION = "geoai-p2o-osm-normalization/1.0.1";
const HASH_CONTRACT = "geoai-hash-contract-v1-rfc8785-compatible-subset";
const INDEX_VERSION = "geoai-p2o-bbox-grid-index/1.0.0";
const CONTEXT_CATEGORY_MAP_VERSION = "geoai-p2o-osm-context-category-map/1.0.0";
const GRID_CELL_SIZE_DEGREES = 0.001;
const TAG_ALLOWLIST = new Set([
  "alt_name", "amenity", "area", "brand", "building", "building:levels", "building:part",
  "height", "highway", "landuse", "leisure", "name", "natural", "official_name",
  "public_transport", "railway", "ref", "shop", "tourism", "type", "water", "waterway"
]);

function compareCodeUnits(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function roundCoordinate(value) {
  const rounded = Number(Number(value).toFixed(ROUND_DIGITS));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number in canonical payload");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort(compareCodeUnits).map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical type: ${typeof value}`);
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Canonical(value) {
  return sha256Bytes(canonicalize(value));
}

function coord(point) {
  return [roundCoordinate(point.lon), roundCoordinate(point.lat)];
}

function coordKey(point) {
  return `${point[0].toFixed(ROUND_DIGITS)},${point[1].toFixed(ROUND_DIGITS)}`;
}

function coordinatesEqual(a, b) {
  return coordKey(a) === coordKey(b);
}

function closeRing(ring) {
  if (ring.length && !coordinatesEqual(ring[0], ring.at(-1))) ring.push([...ring[0]]);
  return ring;
}

function signedArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return area / 2;
}

function orientRing(ring, counterClockwise) {
  const closed = closeRing(ring.map((point) => [...point]));
  const isCounterClockwise = signedArea(closed) > 0;
  if (isCounterClockwise !== counterClockwise) closed.reverse();
  return closed;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointOnSegment(point, start, end, tolerance = 1e-10) {
  const cross = (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > tolerance) return false;
  const dot = (point[0] - start[0]) * (end[0] - start[0]) + (point[1] - start[1]) * (end[1] - start[1]);
  if (dot < -tolerance) return false;
  const squaredLength = (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2;
  return dot <= squaredLength + tolerance;
}

function pointRelationToPolygon(point, polygon) {
  for (const ring of polygon) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      if (pointOnSegment(point, ring[index], ring[index + 1])) return "boundary";
    }
  }
  if (!pointInRing(point, polygon[0])) return "outside";
  if (polygon.slice(1).some((hole) => pointInRing(point, hole))) return "outside";
  return "interior";
}

function bboxForCoordinates(coordinates, bbox = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite)) {
    bbox[0] = Math.min(bbox[0], coordinates[0]);
    bbox[1] = Math.min(bbox[1], coordinates[1]);
    bbox[2] = Math.max(bbox[2], coordinates[0]);
    bbox[3] = Math.max(bbox[3], coordinates[1]);
    return bbox;
  }
  for (const child of coordinates) bboxForCoordinates(child, bbox);
  return bbox;
}

function stitchSegments(rawSegments) {
  const pending = rawSegments
    .map((segment) => segment.map(coord))
    .filter((segment) => segment.length >= 2);
  const rings = [];
  while (pending.length) {
    const ring = [...pending.shift()];
    let progressed = true;
    while (!coordinatesEqual(ring[0], ring.at(-1)) && progressed) {
      progressed = false;
      for (let index = 0; index < pending.length; index += 1) {
        const segment = pending[index];
        if (coordinatesEqual(ring.at(-1), segment[0])) {
          ring.push(...segment.slice(1));
        } else if (coordinatesEqual(ring.at(-1), segment.at(-1))) {
          ring.push(...segment.slice(0, -1).reverse());
        } else if (coordinatesEqual(ring[0], segment.at(-1))) {
          ring.unshift(...segment.slice(0, -1));
        } else if (coordinatesEqual(ring[0], segment[0])) {
          ring.unshift(...segment.slice(1).reverse());
        } else {
          continue;
        }
        pending.splice(index, 1);
        progressed = true;
        break;
      }
    }
    rings.push(closeRing(ring));
  }
  return rings;
}

function relationGeometry(element) {
  const members = (element.members || []).filter((member) => Array.isArray(member.geometry));
  const polygonal = element.tags?.type === "multipolygon" || element.tags?.type === "building"
    || element.tags?.building || element.tags?.["building:part"] || element.tags?.landuse
    || element.tags?.leisure || element.tags?.natural || element.tags?.water;
  if (!polygonal) {
    const lines = members.map((member) => member.geometry.map(coord)).filter((line) => line.length >= 2);
    if (!lines.length) return null;
    return lines.length === 1 ? { type: "LineString", coordinates: lines[0] } : { type: "MultiLineString", coordinates: lines };
  }
  const outerSegments = members.filter((member) => ["outer", "outline", ""].includes(member.role || "")).map((member) => member.geometry);
  const innerSegments = members.filter((member) => member.role === "inner").map((member) => member.geometry);
  const stitchedOuters = stitchSegments(outerSegments);
  const stitchedInners = stitchSegments(innerSegments);
  if (stitchedOuters.some((ring) => ring.length < 4 || !coordinatesEqual(ring[0], ring.at(-1)))) return null;
  if (stitchedInners.some((ring) => ring.length < 4 || !coordinatesEqual(ring[0], ring.at(-1)))) return null;
  const outers = stitchedOuters.map((ring) => orientRing(ring, true));
  const inners = stitchedInners.map((ring) => orientRing(ring, false));
  if (!outers.length) return null;
  const polygons = outers.map((outer) => [outer]);
  for (const inner of inners) {
    const owner = polygons.find((polygon) => pointInRing(inner[0], polygon[0]));
    if (!owner) return null;
    owner.push(inner);
  }
  return polygons.length === 1 ? { type: "Polygon", coordinates: polygons[0] } : { type: "MultiPolygon", coordinates: polygons };
}

function isPolygonWay(element, points) {
  if (points.length < 4 || !coordinatesEqual(points[0], points.at(-1))) return false;
  const tags = element.tags || {};
  if (tags.area === "no") return false;
  if (tags.area === "yes") return true;
  if (tags.highway || tags.railway || tags.waterway) return false;
  return Boolean(tags.building || tags["building:part"] || tags.landuse || tags.leisure || tags.natural || tags.water || tags.amenity || tags.shop);
}

function elementGeometry(element) {
  if (element.type === "node" && Number.isFinite(element.lon) && Number.isFinite(element.lat)) {
    return { type: "Point", coordinates: coord(element) };
  }
  if (element.type === "way" && Array.isArray(element.geometry)) {
    const points = element.geometry.map(coord);
    if (points.length < 2) return null;
    if (isPolygonWay(element, points)) return { type: "Polygon", coordinates: [orientRing(points, true)] };
    return { type: "LineString", coordinates: points };
  }
  if (element.type === "relation") return relationGeometry(element);
  return null;
}

function featureClass(tags, geometryType) {
  const polygonal = ["Polygon", "MultiPolygon"].includes(geometryType);
  if (tags["building:part"] && polygonal) return "building_part";
  if (tags.building && polygonal) return "building";
  if (tags.highway) {
    if (geometryType === "Point") return "road_context";
    if (geometryType.includes("Polygon")) return "road_area";
    return "road_segment";
  }
  if (tags.railway || tags.public_transport) return "transport_feature";
  if (tags.water || tags.waterway || tags.natural === "water") return "water_environmental";
  if (["park", "garden", "nature_reserve"].includes(tags.leisure)
    || ["grass", "forest", "recreation_ground"].includes(tags.landuse)
    || ["wood", "grassland", "scrub"].includes(tags.natural)) return "green_space";
  if (tags.amenity || tags.shop || tags.tourism) return "poi_place";
  if (tags.landuse || tags.natural || tags.leisure) return "land_use";
  return geometryType.includes("Polygon") ? "context_polygon" : geometryType.includes("Line") ? "context_line" : "context_point";
}

function contextCategories(tags) {
  const categories = new Set();
  if (tags.amenity === "school") categories.add("school");
  if (["childcare", "kindergarten"].includes(tags.amenity)) categories.add("childcare");
  if (["clinic", "doctors"].includes(tags.amenity)) categories.add("clinic");
  if (tags.amenity === "hospital") categories.add("hospital");
  if (tags.amenity === "pharmacy") categories.add("pharmacy");
  if (["convenience", "greengrocer", "grocery"].includes(tags.shop)) categories.add("grocery");
  if (tags.shop === "supermarket") categories.add("supermarket");
  if (["department_store", "mall"].includes(tags.shop) || tags.amenity === "marketplace") categories.add("retail_anchor");
  if (tags.highway === "bus_stop" || ["platform", "stop_position"].includes(tags.public_transport)) categories.add("public_transport_stop");
  if (["station", "halt", "tram_stop", "subway_entrance"].includes(tags.railway) || tags.public_transport === "station") categories.add("public_transport_station");
  if (["motorway", "trunk", "primary", "secondary"].includes(tags.highway)) categories.add("major_road");
  if (["park", "garden", "nature_reserve"].includes(tags.leisure)
    || ["forest", "recreation_ground", "grass"].includes(tags.landuse)
    || ["wood", "grassland"].includes(tags.natural)) categories.add("park_green_space");
  return [...categories].sort(compareCodeUnits);
}

function cleanTags(tags = {}) {
  const retained = {};
  const dropped = [];
  for (const [key, value] of Object.entries(tags).sort(([a], [b]) => compareCodeUnits(a, b))) {
    if (TAG_ALLOWLIST.has(key) || key.startsWith("name:")) retained[key] = value;
    else dropped.push(key);
  }
  return { retained, dropped };
}

function sourceId(element) {
  return `${element.type}/${element.id}`;
}

function normalizationPolicyRejectionReason(element) {
  if (element.type === "relation" && element.tags?.type === "building") {
    return "UNSUPPORTED_BUILDING_RELATION_SEMANTICS";
  }
  return null;
}

function isIdentityEligible(featureClassValue, geometryType) {
  return ["building", "building_part", "land_use"].includes(featureClassValue)
    && ["Polygon", "MultiPolygon"].includes(geometryType);
}

function runNormalizerPolicyNegativeControls() {
  const ring = [
    { lon: 0, lat: 0 }, { lon: 2, lat: 0 }, { lon: 2, lat: 2 },
    { lon: 0, lat: 2 }, { lon: 0, lat: 0 }
  ];
  const inner = [
    { lon: 0.5, lat: 0.5 }, { lon: 0.5, lat: 1 }, { lon: 1, lat: 1 },
    { lon: 1, lat: 0.5 }, { lon: 0.5, lat: 0.5 }
  ];
  const oneOutlineBuildingRelation = {
    type: "relation", id: 1, tags: { type: "building" },
    members: [{ type: "way", ref: 10, role: "outline", geometry: ring }]
  };
  const overlappingOutlineBuildingRelation = {
    type: "relation", id: 2, tags: { type: "building" },
    members: [
      { type: "way", ref: 20, role: "outline", geometry: ring },
      { type: "way", ref: 21, role: "outline", geometry: ring }
    ]
  };
  const validMultipolygon = {
    type: "relation", id: 3, tags: { type: "multipolygon", building: "yes" },
    members: [
      { type: "way", ref: 30, role: "outer", geometry: ring },
      { type: "way", ref: 31, role: "inner", geometry: inner }
    ]
  };
  const buildingNodeGeometry = elementGeometry({ type: "node", id: 4, lon: 1, lat: 1, tags: { building: "roof" } });
  const openBuildingWayGeometry = elementGeometry({
    type: "way", id: 5, tags: { building: "yes" },
    geometry: [{ lon: 0, lat: 0 }, { lon: 1, lat: 0 }, { lon: 1, lat: 1 }]
  });
  const polygonBuildingWayGeometry = elementGeometry({ type: "way", id: 6, tags: { building: "yes" }, geometry: ring });
  const validMultipolygonGeometry = elementGeometry(validMultipolygon);
  const checks = {
    oneOutlineBuildingRelationRejected:
      normalizationPolicyRejectionReason(oneOutlineBuildingRelation) === "UNSUPPORTED_BUILDING_RELATION_SEMANTICS",
    overlappingOutlineBuildingRelationRejected:
      normalizationPolicyRejectionReason(overlappingOutlineBuildingRelation) === "UNSUPPORTED_BUILDING_RELATION_SEMANTICS",
    validMultipolygonAccepted:
      normalizationPolicyRejectionReason(validMultipolygon) === null
        && validMultipolygonGeometry?.type === "Polygon"
        && basicGeometryCheck(validMultipolygonGeometry).accepted,
    buildingNodeIdentityIneligible:
      buildingNodeGeometry?.type === "Point"
        && featureClass({ building: "roof" }, buildingNodeGeometry.type) === "context_point"
        && !isIdentityEligible("context_point", buildingNodeGeometry.type),
    openBuildingWayIdentityIneligible:
      openBuildingWayGeometry?.type === "LineString"
        && featureClass({ building: "yes" }, openBuildingWayGeometry.type) === "context_line"
        && !isIdentityEligible("context_line", openBuildingWayGeometry.type),
    polygonBuildingWayIdentityEligibleAfterGeometryScreen:
      polygonBuildingWayGeometry?.type === "Polygon"
        && basicGeometryCheck(polygonBuildingWayGeometry).accepted
        && featureClass({ building: "yes" }, polygonBuildingWayGeometry.type) === "building"
        && isIdentityEligible("building", polygonBuildingWayGeometry.type)
  };
  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error(`Normalizer policy negative control failure: ${JSON.stringify(checks)}`);
  }
  return checks;
}

function segmentIntersection(a, b, c, d, tolerance = 1e-12) {
  const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (((o1 > tolerance && o2 < -tolerance) || (o1 < -tolerance && o2 > tolerance))
    && ((o3 > tolerance && o4 < -tolerance) || (o3 < -tolerance && o4 > tolerance))) return true;
  if (Math.abs(o1) <= tolerance && pointOnSegment(c, a, b, tolerance)) return true;
  if (Math.abs(o2) <= tolerance && pointOnSegment(d, a, b, tolerance)) return true;
  if (Math.abs(o3) <= tolerance && pointOnSegment(a, c, d, tolerance)) return true;
  if (Math.abs(o4) <= tolerance && pointOnSegment(b, c, d, tolerance)) return true;
  return false;
}

function ringQualityReason(ring) {
  if (ring.length < 4 || !coordinatesEqual(ring[0], ring.at(-1))) return "OPEN_OR_SHORT_POLYGON_RING";
  for (let index = 0; index < ring.length - 1; index += 1) {
    if (coordinatesEqual(ring[index], ring[index + 1])) return "CONSECUTIVE_DUPLICATE_COORDINATE";
  }
  if (Math.abs(signedArea(ring)) < 1e-14) return "ZERO_AREA_POLYGON_RING";
  const segmentCount = ring.length - 1;
  for (let left = 0; left < segmentCount; left += 1) {
    for (let right = left + 1; right < segmentCount; right += 1) {
      const adjacent = right === left + 1 || (left === 0 && right === segmentCount - 1);
      if (adjacent) continue;
      if (segmentIntersection(ring[left], ring[left + 1], ring[right], ring[right + 1])) {
        return "SELF_INTERSECTING_POLYGON_RING";
      }
    }
  }
  return null;
}

function polygonQualityReason(polygon) {
  for (const ring of polygon) {
    const reason = ringQualityReason(ring);
    if (reason) return reason;
  }
  for (const hole of polygon.slice(1)) {
    if (!pointInRing(hole[0], polygon[0])) return "POLYGON_HOLE_OUTSIDE_OUTER_RING";
  }
  return null;
}

function basicGeometryCheck(geometry) {
  const bbox = bboxForCoordinates(geometry.coordinates);
  if (!bbox.every(Number.isFinite) || bbox[0] < -180 || bbox[2] > 180 || bbox[1] < -90 || bbox[3] > 90) {
    return { accepted: false, reason: "INVALID_OR_OUT_OF_RANGE_COORDINATE", bbox: null };
  }
  if (geometry.type === "Polygon") {
    const reason = polygonQualityReason(geometry.coordinates);
    if (reason) return { accepted: false, reason, bbox };
  }
  if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      const reason = polygonQualityReason(polygon);
      if (reason) return { accepted: false, reason, bbox };
    }
  }
  return { accepted: true, reason: null, bbox };
}

function polygonCentroid(ring) {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const cross = ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    twiceArea += cross;
    x += (ring[index][0] + ring[index + 1][0]) * cross;
    y += (ring[index][1] + ring[index + 1][1]) * cross;
  }
  if (Math.abs(twiceArea) < 1e-18) return null;
  return [roundCoordinate(x / (3 * twiceArea)), roundCoordinate(y / (3 * twiceArea))];
}

function deterministicInteriorPoint(geometry) {
  const polygon = geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates[0] : null;
  if (!polygon) return null;
  const centroid = polygonCentroid(polygon[0]);
  if (centroid && pointRelationToPolygon(centroid, polygon) === "interior") return centroid;
  const bbox = bboxForCoordinates(polygon);
  for (let row = 1; row < 40; row += 1) {
    for (let column = 1; column < 40; column += 1) {
      const candidate = [
        roundCoordinate(bbox[0] + ((bbox[2] - bbox[0]) * column) / 40),
        roundCoordinate(bbox[1] + ((bbox[3] - bbox[1]) * row) / 40)
      ];
      if (pointRelationToPolygon(candidate, polygon) === "interior") return candidate;
    }
  }
  return null;
}

function coverageGeometry(bbox) {
  const [west, south, east, north] = bbox;
  return {
    type: "Polygon",
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
  };
}

function buildGridIndex(features, bbox) {
  const [west, south, east, north] = bbox;
  const maxColumn = Math.max(0, Math.ceil((east - west) / GRID_CELL_SIZE_DEGREES) - 1);
  const maxRow = Math.max(0, Math.ceil((north - south) / GRID_CELL_SIZE_DEGREES) - 1);
  const cells = new Map();
  const clippedFeatures = [];
  for (const feature of features) {
    const [featureWest, featureSouth, featureEast, featureNorth] = feature.bbox;
    const clippedWest = Math.max(west, featureWest);
    const clippedSouth = Math.max(south, featureSouth);
    const clippedEast = Math.min(east, featureEast);
    const clippedNorth = Math.min(north, featureNorth);
    if (clippedWest > clippedEast || clippedSouth > clippedNorth) continue;
    const startColumn = Math.max(0, Math.min(maxColumn, Math.floor((clippedWest - west) / GRID_CELL_SIZE_DEGREES)));
    const endColumn = Math.max(0, Math.min(maxColumn, Math.floor((clippedEast - west) / GRID_CELL_SIZE_DEGREES)));
    const startRow = Math.max(0, Math.min(maxRow, Math.floor((clippedSouth - south) / GRID_CELL_SIZE_DEGREES)));
    const endRow = Math.max(0, Math.min(maxRow, Math.floor((clippedNorth - south) / GRID_CELL_SIZE_DEGREES)));
    for (let row = startRow; row <= endRow; row += 1) {
      for (let column = startColumn; column <= endColumn; column += 1) {
        const cellId = `${column}:${row}`;
        if (!cells.has(cellId)) cells.set(cellId, []);
        cells.get(cellId).push(feature.id);
      }
    }
    if (featureWest < west || featureSouth < south || featureEast > east || featureNorth > north) {
      clippedFeatures.push(feature.id);
    }
  }
  const serializedCells = {};
  for (const cellId of [...cells.keys()].sort(compareCodeUnits)) {
    serializedCells[cellId] = [...new Set(cells.get(cellId))].sort(compareCodeUnits);
  }
  return {
    protocol: "POINT_TO_OBJECT_001_BBOX_GRID_INDEX_V1",
    indexVersion: INDEX_VERSION,
    cellSizeDegrees: GRID_CELL_SIZE_DEGREES,
    coverageBboxWgs84: bbox,
    columnCount: maxColumn + 1,
    rowCount: maxRow + 1,
    semantics: "BBOX_PREFILTER_ONLY_EXACT_TOPOLOGY_REQUIRED",
    featureGeometryMayExtendOutsideCoverage: true,
    indexedFeatureCount: features.length,
    featuresExtendingOutsideCoverageCount: clippedFeatures.length,
    featuresExtendingOutsideCoverageIds: clippedFeatures.sort(compareCodeUnits),
    cells: serializedCells
  };
}

async function buildCasePack(directory) {
  const normalizerPolicyNegativeControls = runNormalizerPolicyNegativeControls();
  const { contract } = await loadPointToObjectContract(process.cwd());
  const configPath = path.join(directory, "case-config.json");
  const queryPath = path.join(directory, "acquisition-query.overpassql");
  const rawPath = path.join(directory, "raw-overpass-response.json");
  const headersPath = path.join(directory, "acquisition-response-headers.txt");
  const [configText, queryText, rawBytes, headersBytes, scriptBytes] = await Promise.all([
    readFile(configPath, "utf8"), readFile(queryPath, "utf8"), readFile(rawPath), readFile(headersPath)
    , readFile(fileURLToPath(import.meta.url))
  ]);
  const config = JSON.parse(configText);
  const rightsPath = path.resolve(process.cwd(), config.rightsDecisionPath);
  const acquisitionReceiptPath = path.join(directory, config.acquisitionReceiptPath);
  const [rightsBytes, acquisitionReceiptBytes] = await Promise.all([readFile(rightsPath), readFile(acquisitionReceiptPath)]);
  const rightsDecision = JSON.parse(rightsBytes.toString("utf8"));
  validateRightsDecision(rightsDecision, contract, `${config.caseId}.rightsDecision`);
  const acquisitionReceipt = JSON.parse(acquisitionReceiptBytes.toString("utf8"));
  if (rightsDecision.rightsState !== config.rightsState || rightsDecision.permissionPhase !== config.permissionPhase) {
    throw new Error(`${config.caseId}: rights decision does not match config`);
  }
  const raw = JSON.parse(rawBytes.toString("utf8"));
  if (raw.osm3s?.timestamp_osm_base !== config.sourceSnapshotObservedAtUtc) {
    throw new Error(`${config.caseId}: configured source timestamp does not match response`);
  }
  const accepted = [];
  const rejected = [];
  const relationMemberships = new Map();
  for (const relation of (raw.elements || []).filter((element) => element.type === "relation")) {
    for (const member of relation.members || []) {
      const memberId = `${member.type}/${member.ref}`;
      if (!relationMemberships.has(memberId)) relationMemberships.set(memberId, []);
      relationMemberships.get(memberId).push({
        relationSourceFeatureId: sourceId(relation),
        role: member.role || "",
        relationType: relation.tags?.type || null
      });
    }
  }
  let droppedTagFieldCount = 0;
  for (const element of raw.elements || []) {
    const policyRejectionReason = normalizationPolicyRejectionReason(element);
    if (policyRejectionReason) {
      rejected.push({
        sourceFeatureId: sourceId(element),
        reason: policyRejectionReason
      });
      continue;
    }
    const geometry = elementGeometry(element);
    if (!geometry) {
      rejected.push({ sourceFeatureId: sourceId(element), reason: "NO_NORMALIZABLE_GEOMETRY" });
      continue;
    }
    const geometryCheck = basicGeometryCheck(geometry);
    if (!geometryCheck.accepted) {
      rejected.push({ sourceFeatureId: sourceId(element), reason: geometryCheck.reason });
      continue;
    }
    const sourceFeatureId = sourceId(element);
    const { retained: tags, dropped: droppedTagKeys } = cleanTags(element.tags);
    droppedTagFieldCount += droppedTagKeys.length;
    const geometryHash = sha256Canonical(geometry);
    const klass = featureClass(tags, geometry.type);
    const classificationWarnings = [];
    if (tags.building && tags["building:part"]) classificationWarnings.push("BUILDING_AND_BUILDING_PART_TAG_CONFLICT");
    if ((tags.building || tags["building:part"]) && !["Polygon", "MultiPolygon"].includes(geometry.type)) {
      classificationWarnings.push("NONPOLYGON_BUILDING_TAG_IDENTITY_INELIGIBLE");
    }
    const identityEligible = isIdentityEligible(klass, geometry.type);
    accepted.push({
      type: "Feature",
      id: `geoai:prototype:${config.casePackId}:${config.sourceNamespace}:${sourceFeatureId}`,
      bbox: geometryCheck.bbox.map(roundCoordinate),
      geometry,
      properties: {
        schemaVersion: "LivePointSnapshotFeatureV2/1.0.0",
        casePackId: config.casePackId,
        caseId: config.caseId,
        sourceId: config.sourceId,
        sourceNamespace: config.sourceNamespace,
        sourceFeatureId,
        sourceSnapshotId: config.sourceSnapshotId,
        sourceReleaseId: config.sourceReleaseId,
        sourceDatabaseObservedAtUtc: config.sourceSnapshotObservedAtUtc,
        sourceFeatureMetadataAvailability: config.sourceFeatureMetadataAvailability,
        sourceFeatureVersion: config.sourceFeatureVersion,
        sourceFeatureObservedAtUtc: config.sourceFeatureObservedAtUtc,
        sourceRetrievedAtUtc: config.acquisitionCompletedAtUtc,
        featureClass: klass,
        geometryRole: klass,
        identityEligibility: {
          eligible: identityEligible,
          policy: "POLYGON_OR_MULTIPOLYGON_AND_CLOSED_IDENTITY_CLASS_ONLY",
          reason: identityEligible ? null : "FEATURE_CLASS_OR_GEOMETRY_TYPE_NOT_IDENTITY_ELIGIBLE"
        },
        geometryHashSha256: geometryHash,
        authorityLevel: "open_context",
        officialStatus: config.officialStatus,
        validationStatus: "source_observed_not_officially_validated",
        rightsState: config.rightsState,
        permissionPhase: config.permissionPhase,
        licenceId: config.licenceId,
        name: tags.name || tags["name:en"] || null,
        names: Object.fromEntries(Object.entries(tags).filter(([key]) => key === "name" || key.startsWith("name:"))),
        tags,
        tagProjectionPolicy: "geoai-p2o-osm-tag-allowlist/1.0.0",
        contextCategoryMapVersion: CONTEXT_CATEGORY_MAP_VERSION,
        contextCategories: contextCategories(tags),
        normalizationStageDroppedSourceTagKeys: droppedTagKeys,
        preMinimizationDroppedSourceTagKeys: "NOT_RETAINED_PER_FEATURE",
        untrustedSourceText: true,
        classificationWarnings,
        memberOfRelations: (relationMemberships.get(sourceFeatureId) || []).sort((a, b) => compareCodeUnits(a.relationSourceFeatureId, b.relationSourceFeatureId)),
        memberRefs: element.type === "relation"
          ? (element.members || []).map((member) => ({ sourceFeatureId: `${member.type}/${member.ref}`, role: member.role || "" }))
            .sort((a, b) => compareCodeUnits(`${a.sourceFeatureId}:${a.role}`, `${b.sourceFeatureId}:${b.role}`))
          : [],
        hierarchyState: "source_relationships_observed_not_validated",
        missingDoesNotMeanAbsent: true,
        buildingDoesNotMeanParcel: Boolean(tags.building || tags["building:part"]),
        mandatoryCaveat: config.mandatoryCaveat
      }
    });
  }
  const acceptedSourceFeatureIds = new Set(accepted.map((feature) => feature.properties.sourceFeatureId));
  const rejectedSourceFeatures = new Map(rejected.map((item) => [item.sourceFeatureId, item.reason]));
  for (const feature of accepted) {
    feature.properties.memberOfRelations = feature.properties.memberOfRelations.map((membership) => {
      const parentRetained = acceptedSourceFeatureIds.has(membership.relationSourceFeatureId);
      const rejectionReason = rejectedSourceFeatures.get(membership.relationSourceFeatureId) || null;
      return {
        ...membership,
        parentRetained,
        parentNormalizationState: parentRetained
          ? "RETAINED"
          : rejectionReason
            ? `REJECTED_${rejectionReason}`
            : "RAW_SOURCE_PARENT_NOT_PRESENT"
      };
    });
  }
  accepted.sort((a, b) => compareCodeUnits(a.properties.sourceFeatureId, b.properties.sourceFeatureId));
  rejected.sort((a, b) => compareCodeUnits(a.sourceFeatureId, b.sourceFeatureId));
  const anchor = accepted.find((feature) => feature.properties.sourceFeatureId === config.anchorSourceFeatureId);
  if (!anchor) throw new Error(`${config.caseId}: anchor ${config.anchorSourceFeatureId} not present`);
  if (anchor.properties.name !== config.anchorExpectedName) {
    throw new Error(`${config.caseId}: anchor name mismatch: ${anchor.properties.name}`);
  }
  const anchorInteriorPoint = deterministicInteriorPoint(anchor.geometry);
  if (!anchorInteriorPoint) throw new Error(`${config.caseId}: no deterministic anchor interior point`);
  const exactCoverageGeometry = coverageGeometry(config.bboxWgs84);
  const exactCoverageGeometryHash = sha256Canonical(exactCoverageGeometry);
  const featureCollection = {
    type: "FeatureCollection",
    schemaVersion: "LivePointSnapshotBundleV2/1.0.0",
    normalizationVersion: NORMALIZATION_VERSION,
    casePackId: config.casePackId,
    caseId: config.caseId,
    sourceSnapshotId: config.sourceSnapshotId,
    sourceReleaseId: config.sourceReleaseId,
    sourceDatabaseObservedAtUtc: config.sourceSnapshotObservedAtUtc,
    coverageBboxWgs84: config.bboxWgs84,
    coverageGeometryWgs84: exactCoverageGeometry,
    coverageGeometryHashSha256: exactCoverageGeometryHash,
    coverageSemantics: "query_selection_bbox_not_completeness; retained feature geometry may extend outside; no radius has source-completeness authority",
    maxRadiusContainedWithinQueryBboxAtAnchorM: config.maxRadiusContainedWithinQueryBboxAtAnchorM,
    defaultRequestedContextRadiusM: config.defaultRequestedContextRadiusM,
    defaultContextCoverageState: config.defaultContextCoverageState,
    calculationCrs: config.calculationCrs,
    contextCategoryMapVersion: CONTEXT_CATEGORY_MAP_VERSION,
    features: accepted
  };
  const normalizedText = `${canonicalize(featureCollection)}\n`;
  const normalizedPath = path.join(directory, "normalized-features.geojson");
  await writeFile(normalizedPath, normalizedText, "utf8");
  const normalizedSha256 = sha256Bytes(normalizedText);
  const gridIndex = buildGridIndex(accepted, config.bboxWgs84);
  gridIndex.casePackId = config.casePackId;
  gridIndex.caseId = config.caseId;
  gridIndex.sourceSnapshotId = config.sourceSnapshotId;
  gridIndex.coverageGeometryHashSha256 = exactCoverageGeometryHash;
  gridIndex.normalizedSha256 = normalizedSha256;
  const gridIndexText = `${canonicalize(gridIndex)}\n`;
  const gridIndexPath = path.join(directory, "spatial-grid-index.json");
  await writeFile(gridIndexPath, gridIndexText, "utf8");
  const classCounts = Object.fromEntries(Object.entries(accepted.reduce((counts, feature) => {
    const klass = feature.properties.featureClass;
    counts[klass] = (counts[klass] || 0) + 1;
    return counts;
  }, {})).sort(([a], [b]) => compareCodeUnits(a, b)));
  const receipt = {
    protocol: "POINT_TO_OBJECT_001_CASE_PACK_NORMALIZATION_RECEIPT_V1",
    casePackId: config.casePackId,
    caseId: config.caseId,
    sourceSnapshotId: config.sourceSnapshotId,
    sourceReleaseId: config.sourceReleaseId,
    normalizationVersion: NORMALIZATION_VERSION,
    hashContract: HASH_CONTRACT,
    raw: {
      path: "raw-overpass-response.json",
      bytes: rawBytes.byteLength,
      sha256: sha256Bytes(rawBytes),
      contentType: "application/json",
      transportContentEncoding: "gzip at acquisition",
      storedRepresentation: "privacy-minimized canonical JSON; exact acquired bytes are not retained",
      elementCount: raw.elements.length,
      sourceGenerator: raw.generator,
      sourceDatabaseObservedAtUtc: raw.osm3s.timestamp_osm_base,
      contributorAccountMetadataPresent: false,
      featureMetadataAvailability: config.sourceFeatureMetadataAvailability
    },
    acquisitionMinimizationReceipt: {
      path: config.acquisitionReceiptPath,
      bytes: acquisitionReceiptBytes.byteLength,
      sha256: sha256Bytes(acquisitionReceiptBytes),
      acquisitionSourceSha256: acquisitionReceipt.acquisitionSource.sha256,
      acquisitionSourceBytes: acquisitionReceipt.acquisitionSource.bytes,
      acquisitionSourceRetained: false
    },
    config: { path: "case-config.json", bytes: Buffer.byteLength(configText), sha256: sha256Bytes(configText) },
    query: { path: "acquisition-query.overpassql", bytes: Buffer.byteLength(queryText), sha256: sha256Bytes(queryText) },
    responseHeaders: { path: "acquisition-response-headers.txt", bytes: headersBytes.byteLength, sha256: sha256Bytes(headersBytes) },
    normalizationTool: { path: "scripts/point-to-object-001-build-case-pack.mjs", bytes: scriptBytes.byteLength, sha256: sha256Bytes(scriptBytes), nodeRuntime: process.version },
    normalized: { path: "normalized-features.geojson", bytes: Buffer.byteLength(normalizedText), sha256: normalizedSha256 },
    spatialIndex: { path: "spatial-grid-index.json", bytes: Buffer.byteLength(gridIndexText), sha256: sha256Bytes(gridIndexText), version: INDEX_VERSION, semantics: gridIndex.semantics },
    coverage: {
      bboxWgs84: config.bboxWgs84,
      geometry: exactCoverageGeometry,
      geometryHashSha256: exactCoverageGeometryHash,
      retainedFeatureGeometryMayExtendOutsideCoverage: true,
      maxRadiusContainedWithinQueryBboxAtAnchorM: config.maxRadiusContainedWithinQueryBboxAtAnchorM,
      contextCompletenessAtContainedRadius: "UNKNOWN",
      defaultRequestedContextRadiusM: config.defaultRequestedContextRadiusM,
      defaultContextCoverageState: config.defaultContextCoverageState,
      absenceClaimAtDefaultRadiusAllowed: false
    },
    counts: {
      raw: raw.elements.length,
      accepted: accepted.length,
      rejected: rejected.length,
      normalizationStageDroppedTagFieldCount: droppedTagFieldCount,
      minimizationStageDroppedTagFieldOccurrences: Object.values(acquisitionReceipt.droppedTagKeyCounts || {}).reduce((sum, count) => sum + count, 0),
      minimizationStageDroppedDistinctTagKeyCount: Object.keys(acquisitionReceipt.droppedTagKeyCounts || {}).length,
      byFeatureClass: classCounts,
      identityEligible: accepted.filter((feature) => feature.properties.identityEligibility.eligible).length,
      nonPolygonBuildingTaggedIdentityIneligible: accepted.filter((feature) =>
        (feature.properties.tags.building || feature.properties.tags["building:part"])
          && !feature.properties.identityEligibility.eligible).length,
      unsupportedBuildingRelationsRejected: rejected.filter((item) => item.reason === "UNSUPPORTED_BUILDING_RELATION_SEMANTICS").length
    },
    rejectionReasons: Object.fromEntries(Object.entries(rejected.reduce((counts, item) => {
      counts[item.reason] = (counts[item.reason] || 0) + 1;
      return counts;
    }, {})).sort(([a], [b]) => compareCodeUnits(a, b))),
    anchor: {
      sourceFeatureId: config.anchorSourceFeatureId,
      featureKey: anchor.id,
      name: anchor.properties.name,
      geometryHashSha256: anchor.properties.geometryHashSha256,
      deterministicInteriorPointWgs84: anchorInteriorPoint,
      boundaryTestPointWgs84: anchor.geometry.type === "Polygon"
        ? anchor.geometry.coordinates[0][0]
        : anchor.geometry.coordinates[0][0][0]
    },
    rights: {
      state: config.rightsState,
      permissionPhase: config.permissionPhase,
      licenceId: config.licenceId,
      limitation: config.rightsLimit,
      attribution: "© OpenStreetMap contributors",
      licenceUrl: "https://www.openstreetmap.org/copyright",
      derivedDatabaseLicence: "ODbL-1.0",
      runtimePublicOverpassDependencyAllowed: false
    },
    rightsDecision: { path: config.rightsDecisionPath, bytes: rightsBytes.byteLength, sha256: sha256Bytes(rightsBytes), decisionId: rightsDecision.decisionId, decisionVersion: rightsDecision.decisionVersion },
    dataMinimization: {
      acquiredUnminimizedSourceRetained: false,
      privacyMinimizedSourceSnapshotRetained: true,
      normalizedProjectionUsesClosedAllowlist: true,
      contributorAccountMetadataRetained: false,
      contactMediaEditorAndNoteFieldsExcludedFromNormalizedProjection: true,
      sourceTextIsUntrusted: true
    },
    pathBases: {
      receiptRelativePaths: "case_pack_directory",
      rightsDecisionPath: "repository_root",
      normalizationToolPath: "repository_root"
    },
    normalizerPolicyNegativeControls,
    geometryQuality: {
      state: "LIMITED_LOCAL_TOPOLOGY_SCREEN",
      checks: ["coordinate range", "ring closure", "consecutive duplicate coordinate", "zero ring area", "ring self-intersection", "hole first-point containment"],
      notProven: ["full GEOS validity for every feature", "multipolygon component overlap", "semantic parent/part hierarchy correctness"],
      routeActivationAllowed: false
    },
    officialStatus: config.officialStatus,
    caveat: config.mandatoryCaveat,
    rejectedFeatures: rejected
  };
  const receiptText = `${JSON.stringify(receipt, null, 2)}\n`;
  await writeFile(path.join(directory, "normalization-receipt.json"), receiptText, "utf8");
  return { config, receipt };
}

const directories = process.argv.slice(2);
if (!directories.length) {
  console.error("Usage: node scripts/point-to-object-001-build-case-pack.mjs <case-pack-dir> [...]");
  process.exit(2);
}

const results = [];
for (const directory of directories) results.push(await buildCasePack(path.resolve(directory)));
console.log(JSON.stringify(results.map(({ config, receipt }) => ({
  caseId: config.caseId,
  rawSha256: receipt.raw.sha256,
  normalizedSha256: receipt.normalized.sha256,
  accepted: receipt.counts.accepted,
  rejected: receipt.counts.rejected,
  anchor: receipt.anchor
})), null, 2));
