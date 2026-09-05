import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SANITIZER_VERSION = "geoai-p2o-osm-snapshot-minimizer/1.0.0";
const TAG_ALLOWLIST = new Set([
  "alt_name", "amenity", "area", "brand", "building", "building:levels", "building:part",
  "height", "highway", "landuse", "leisure", "name", "natural", "official_name",
  "public_transport", "railway", "ref", "shop", "tourism", "type", "water", "waterway"
]);
const NORMALIZATION_CONTROL_TAGS = new Set([
  "amenity", "area", "building", "building:part", "highway", "landuse", "leisure",
  "natural", "railway", "shop", "tourism", "type", "water", "waterway"
]);

function compareCodeUnits(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number in source snapshot");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort(compareCodeUnits).map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  throw new Error(`Unsupported source value: ${typeof value}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function projectTags(tags = {}) {
  const retained = {};
  const dropped = [];
  for (const [key, value] of Object.entries(tags)) {
    if (TAG_ALLOWLIST.has(key) || key.startsWith("name:")) retained[key] = value;
    else dropped.push(key);
  }
  return { retained, dropped };
}

function projectGeometryPoint(point) {
  return { lat: point.lat, lon: point.lon };
}

function projectMember(member) {
  const projected = { type: member.type, ref: member.ref, role: member.role || "" };
  if (Array.isArray(member.geometry)) projected.geometry = member.geometry.map(projectGeometryPoint);
  return projected;
}

function projectElement(element) {
  const projected = { type: element.type, id: element.id };
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) {
    projected.lat = element.lat;
    projected.lon = element.lon;
  }
  if (Array.isArray(element.nodes)) projected.nodes = element.nodes;
  if (Array.isArray(element.geometry)) projected.geometry = element.geometry.map(projectGeometryPoint);
  if (Array.isArray(element.members)) projected.members = element.members.map(projectMember);
  const { retained, dropped } = projectTags(element.tags);
  if (Object.keys(retained).length) projected.tags = retained;
  return { projected, dropped };
}

function normalizationInput(element) {
  const projected = { type: element.type, id: element.id };
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) {
    projected.lat = element.lat;
    projected.lon = element.lon;
  }
  if (Array.isArray(element.nodes)) projected.nodes = element.nodes;
  if (Array.isArray(element.geometry)) projected.geometry = element.geometry.map(projectGeometryPoint);
  if (Array.isArray(element.members)) projected.members = element.members.map(projectMember);
  const tags = Object.fromEntries(Object.entries(element.tags || {}).filter(([key]) => NORMALIZATION_CONTROL_TAGS.has(key)));
  if (Object.keys(tags).length) projected.tags = tags;
  return projected;
}

async function sanitize(directory) {
  const sourcePath = path.join(directory, "raw-overpass-response.json");
  const targetPath = path.join(directory, "raw-overpass-response.minimized.json");
  const queryPath = path.join(directory, "acquisition-query.overpassql");
  const headersPath = path.join(directory, "acquisition-response-headers.txt");
  const configPath = path.join(directory, "case-config.json");
  const [sourceBytes, queryBytes, headersBytes, configBytes, scriptBytes] = await Promise.all([
    readFile(sourcePath), readFile(queryPath), readFile(headersPath), readFile(configPath), readFile(fileURLToPath(import.meta.url))
  ]);
  const source = JSON.parse(sourceBytes.toString("utf8"));
  const droppedKeys = {};
  const elements = [];
  let normalizationInputParityCount = 0;
  for (const element of source.elements || []) {
    const { projected, dropped } = projectElement(element);
    if (sha256(canonicalize(normalizationInput(element))) !== sha256(canonicalize(normalizationInput(projected)))) {
      throw new Error(`Normalization-input parity failure for ${element.type}/${element.id}`);
    }
    normalizationInputParityCount += 1;
    elements.push(projected);
    for (const key of dropped) droppedKeys[key] = (droppedKeys[key] || 0) + 1;
  }
  const minimized = {
    version: source.version,
    generator: source.generator,
    osm3s: {
      timestamp_osm_base: source.osm3s?.timestamp_osm_base ?? null,
      copyright: source.osm3s?.copyright ?? null
    },
    minimization: {
      version: SANITIZER_VERSION,
      sourceFeatureMetadataAvailability: "unavailable_in_body_snapshot",
      contributorAccountMetadataRetained: false,
      contactMediaEditorNoteAndArbitraryTagsRetained: false,
      retainedTagPolicy: "closed allowlist plus name:*"
    },
    elements
  };
  const minimizedText = `${canonicalize(minimized)}\n`;
  await writeFile(targetPath, minimizedText, "utf8");
  const receipt = {
    protocol: "POINT_TO_OBJECT_001_ACQUISITION_MINIMIZATION_RECEIPT_V1",
    sanitizerVersion: SANITIZER_VERSION,
    caseDirectory: path.basename(directory),
    endpoint: "https://overpass-api.de/api/interpreter",
    method: "POST",
    requestUserAgent: "GeoAI-POINT_TO_OBJECT_001/1.0 (+https://github.com/mmgolikov/geoai-mvp)",
    acquisitionSource: {
      bytes: sourceBytes.byteLength,
      sha256: sha256(sourceBytes),
      retained: false,
      deletionReason: "Privacy/data-minimization boundary: arbitrary contact, media, editor-note and contributor-account fields are outside the runtime evidence contract."
    },
    minimizedSnapshot: {
      path: "raw-overpass-response.json",
      bytes: Buffer.byteLength(minimizedText),
      sha256: sha256(minimizedText),
      elementCount: elements.length,
      sourceDatabaseObservedAtUtc: source.osm3s?.timestamp_osm_base ?? null,
      sourceGenerator: source.generator
    },
    normalizationInputParity: {
      checkedElementCount: normalizationInputParityCount,
      mismatchCount: 0,
      controlTags: [...NORMALIZATION_CONTROL_TAGS].sort(compareCodeUnits),
      geometryAndMemberCoordinatesPreserved: true
    },
    query: { path: "acquisition-query.overpassql", bytes: queryBytes.byteLength, sha256: sha256(queryBytes) },
    responseHeaders: { path: "acquisition-response-headers.txt", bytes: headersBytes.byteLength, sha256: sha256(headersBytes), cookiesRetained: false },
    configAtAcquisition: { path: "case-config.json", bytes: configBytes.byteLength, sha256: sha256(configBytes) },
    minimizationTool: {
      path: "scripts/point-to-object-001-sanitize-osm-snapshot.mjs",
      bytes: scriptBytes.byteLength,
      sha256: sha256(scriptBytes),
      nodeRuntime: process.version
    },
    acquisitionEvidenceLimitations: [
      "client start time was not retained",
      "exact curl client version was not retained",
      "the exact acquired response bytes were deleted after hashing and minimization"
    ],
    droppedTagKeyCounts: Object.fromEntries(Object.entries(droppedKeys).sort(([a], [b]) => compareCodeUnits(a, b))),
    contributorAccountMetadataRetained: false,
    personalOrCustomerDataPurposefullyCollected: false,
    caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  };
  await writeFile(path.join(directory, "acquisition-minimization-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return receipt;
}

const directories = process.argv.slice(2);
if (!directories.length) throw new Error("Usage: node point-to-object-001-sanitize-osm-snapshot.mjs <case-dir> [...]");
const receipts = [];
for (const directory of directories) receipts.push(await sanitize(path.resolve(directory)));
console.log(JSON.stringify(receipts.map((receipt) => ({ caseDirectory: receipt.caseDirectory, minimizedSnapshot: receipt.minimizedSnapshot })), null, 2));
