import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { dirname, relative, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const d2RuntimeSourceFiles = ["src/data/prototype/d2-overture-places.json"];
const d2SourcePin = {
  file: d2RuntimeSourceFiles[0],
  sha256: "f55ad27098707b5a6efd1ee6d5bd7d8373cff9bd1eddd656207cf70cb15fe67d",
  bytes: 342730
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const isRuntimeData = (file) => /^(?:data|src\/data|public\/data)\//.test(file);
function validateRuntimeData(files, policy, readBytes) {
  const failures = [];
  const allowed = new Set(policy.allowed);
  const unexpected = files.filter((file) => !allowed.has(file));
  if (unexpected.length) failures.push(`unexpected runtime data files: ${unexpected.join(", ")}`);
  let bytes = 0;
  for (const file of files) {
    const content = readBytes(file);
    bytes += content.byteLength;
    if (file === d2SourcePin.file && (content.byteLength !== d2SourcePin.bytes || hash(content) !== d2SourcePin.sha256)) failures.push(`admitted D2 source size/hash mismatch: ${file}`);
  }
  if (bytes > policy.maxBytes) failures.push(`traced data is ${bytes} B, above ${policy.maxBytes} B budget`);
  return failures;
}
// The policy itself is checked before it can certify an actual build. Synthetic
// data here proves refusal behavior only, not a deployed source snapshot.
assert.ok(["data/x", "src/data/x", "public/data/x"].every(isRuntimeData));
assert.equal(isRuntimeData("src/lib/x.ts"), false);
assert.deepEqual(validateRuntimeData(["data/x"], {allowed:["data/x"],maxBytes:1}, () => Buffer.from("x")), []);
assert.match(validateRuntimeData(["src/data/unapproved.json"], {allowed:[],maxBytes:1}, () => Buffer.from("x"))[0], /unexpected/);
assert.match(validateRuntimeData(["public/data/unapproved.json"], {allowed:[],maxBytes:1}, () => Buffer.from("x"))[0], /unexpected/);
assert.match(validateRuntimeData(["data/x"], {allowed:["data/x"],maxBytes:0}, () => Buffer.from("x"))[0], /above/);
assert.match(validateRuntimeData([d2SourcePin.file], {allowed:d2RuntimeSourceFiles,maxBytes:400*1024}, () => Buffer.alloc(d2SourcePin.bytes))[0], /hash mismatch/);
const publicSourceFiles = [
  "data/external/normalized/external_data_manifest.json",
  "data/normalized/dld_source_quality.json",
  "data/normalized/osm_source_quality.json",
  "data/normalized/overture_source_quality.json"
];
const pointToObjectPrototypeFiles = [
  "data/point-to-object-001/NOTICE.md",
  "data/point-to-object-001/rights/osm-20260831/OSM_RIGHTS_DECISION_V1.json",
  "data/point-to-object-001/case-packs/uae-dubai-museum-future-v1/case-pack-manifest.json",
  "data/point-to-object-001/case-packs/uae-dubai-museum-future-v1/normalized-features.geojson",
  "data/point-to-object-001/case-packs/singapore-marina-bay-v1/case-pack-manifest.json",
  "data/point-to-object-001/case-packs/singapore-marina-bay-v1/normalized-features.geojson"
];
const requirements = {
  ".next/server/app/api/context/spatial/route.js.nft.json": [
    "data/normalized/overture_buildings_snapshot.json"
  ],
  ".next/server/app/api/context/demographics/route.js.nft.json": [
    "data/normalized/worldpop_population_context.json"
  ],
  ".next/server/app/api/context/satellite-availability/route.js.nft.json": [
    "data/external/samples/copernicus_sentinel_metadata_sample.json"
  ],
  ".next/server/app/api/data-sources/route.js.nft.json": publicSourceFiles,
  ".next/server/app/api/data-sources/readiness/route.js.nft.json": publicSourceFiles,
  ".next/server/app/api/external-data/manifest/route.js.nft.json": publicSourceFiles,
  ".next/server/app/api/external-data/sources/route.js.nft.json": publicSourceFiles,
  ".next/server/app/api/external-data/status/route.js.nft.json": publicSourceFiles,
  ".next/server/app/api/source-lineage/route.js.nft.json": publicSourceFiles,
  ".next/server/app/api/prototype/point-to-object/ai/route.js.nft.json": d2RuntimeSourceFiles,
  ".next/server/app/api/prototype/point-to-object/cases/route.js.nft.json": pointToObjectPrototypeFiles,
  ".next/server/app/api/prototype/point-to-object/context/route.js.nft.json": d2RuntimeSourceFiles,
  ".next/server/app/api/prototype/point-to-object/resolve/route.js.nft.json": pointToObjectPrototypeFiles
};

const openContextFiles = [
  "data/normalized/open_geodata_accessibility_metrics.json",
  "data/normalized/open_geodata_ingestion_report.json",
  "data/normalized/open_geodata_landuse.json",
  "data/normalized/open_geodata_poi.json",
  "data/normalized/open_geodata_roads.json"
];
const tracePolicies = {
  ".next/server/app/api/context/spatial/route.js.nft.json": {
    allowed: [...openContextFiles, "data/normalized/overture_buildings_snapshot.json"],
    maxBytes: 32 * 1024
  },
  ".next/server/app/api/context/demographics/route.js.nft.json": {
    allowed: [...openContextFiles, "data/normalized/worldpop_population_context.json"],
    maxBytes: 32 * 1024
  },
  ".next/server/app/api/context/satellite-availability/route.js.nft.json": {
    allowed: ["data/external/samples/copernicus_sentinel_metadata_sample.json"],
    maxBytes: 4 * 1024
  },
  ".next/server/app/api/data-sources/route.js.nft.json": { allowed: publicSourceFiles, maxBytes: 24 * 1024 },
  ".next/server/app/api/data-sources/readiness/route.js.nft.json": { allowed: publicSourceFiles, maxBytes: 24 * 1024 },
  ".next/server/app/api/external-data/manifest/route.js.nft.json": { allowed: publicSourceFiles, maxBytes: 24 * 1024 },
  ".next/server/app/api/external-data/sources/route.js.nft.json": { allowed: publicSourceFiles, maxBytes: 24 * 1024 },
  ".next/server/app/api/external-data/status/route.js.nft.json": { allowed: publicSourceFiles, maxBytes: 24 * 1024 },
  ".next/server/app/api/source-lineage/route.js.nft.json": { allowed: publicSourceFiles, maxBytes: 24 * 1024 },
  ".next/server/app/api/prototype/point-to-object/ai/route.js.nft.json": { allowed: d2RuntimeSourceFiles, maxBytes: 400 * 1024 },
  ".next/server/app/api/prototype/point-to-object/cases/route.js.nft.json": { allowed: pointToObjectPrototypeFiles, maxBytes: 7 * 1024 * 1024 },
  ".next/server/app/api/prototype/point-to-object/context/route.js.nft.json": { allowed: d2RuntimeSourceFiles, maxBytes: 400 * 1024 },
  ".next/server/app/api/prototype/point-to-object/resolve/route.js.nft.json": { allowed: pointToObjectPrototypeFiles, maxBytes: 7 * 1024 * 1024 }
};

const failures = [];
for (const [tracePath, requiredFiles] of Object.entries(requirements)) {
  const absoluteTrace = resolve(root, tracePath);
  if (!existsSync(absoluteTrace)) {
    failures.push(`${tracePath}: trace is missing; run npm run build first`);
    continue;
  }
  const trace = JSON.parse(readFileSync(absoluteTrace, "utf8"));
  const traced = new Set((trace.files ?? []).map((file) =>
    relative(root, resolve(dirname(absoluteTrace), file)).replaceAll("\\", "/")
  ));
  for (const requiredFile of requiredFiles) {
    if (!traced.has(requiredFile)) failures.push(`${tracePath}: missing ${requiredFile}`);
  }
  const policy = tracePolicies[tracePath];
  const tracedDataFiles = [...traced].filter(isRuntimeData);
  const dataFailures = validateRuntimeData(tracedDataFiles, policy, (file) => readFileSync(resolve(root, file)));
  failures.push(...dataFailures.map((failure) => `${tracePath}: ${failure}`));
}

// Public assets are not necessarily function-NFT entries. This checks only the
// reviewed source package; actual HTTP delivery is a separate Preview gate.
const licenseFile = resolve(root, "public/data/d2-overture/LICENSES.json");
if (!existsSync(licenseFile)) failures.push("D2 public license source is missing");
else {
  const licenseBytes = readFileSync(licenseFile);
  if (licenseBytes.byteLength !== 5013 || hash(licenseBytes) !== "19a262096d9bf69bd27a1aca479f317719e17f98ae71e3f736923c7e96ce7640") failures.push("D2 public license source size/hash mismatch");
  const license = JSON.parse(licenseBytes);
  if (license.subsetSha256 !== d2SourcePin.sha256 || license.licenseId !== "CDLA-Permissive-2.0" || typeof license.licenseText !== "string" || hash(Buffer.from(license.licenseText)) !== "4531a67d443284d93ffed0803df5b10634aff21c3d77e381f2d48af01d875868") failures.push("D2 source license/subset/full-text binding mismatch");
}

// U4 is currently a source-only adapter, not mounted in an API route. Do not
// invent an NFT delivery requirement for an unimplemented route consumer.
// Its public licence remains a pinned source asset; actual HTTP is separate.
const u4LicenseFile = resolve(root, "public/data/d2-overture-u4/LICENSES.json");
if (!existsSync(u4LicenseFile)) failures.push("D2 U4 public license source is missing");
else {
  const bytes = readFileSync(u4LicenseFile);
  if (bytes.byteLength !== 5025 || hash(bytes) !== "3616d986fa3fac4780ab13742547010c72a90d8f5cd80a1f7c32292f0c98b6ea") failures.push("D2 U4 public license source size/hash mismatch");
  const license = JSON.parse(bytes);
  if (license.appliesToSubset?.sha256 !== "6ce26a323102cf8e01c3107250f648d54180ccd0d1befc7d0900a3472b8ff63d" || license.licenseId !== "CDLA-Permissive-2.0" || typeof license.licenseText !== "string" || hash(Buffer.from(license.licenseText)) !== "4531a67d443284d93ffed0803df5b10634aff21c3d77e381f2d48af01d875868") failures.push("D2 U4 source license/subset/full-text binding mismatch");
}

if (failures.length > 0) {
  console.error("Vercel output-file tracing contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Vercel output-file tracing contract passed: ${Object.keys(requirements).length} route traces include only allowlisted runtime data within their route-specific budgets.`);
