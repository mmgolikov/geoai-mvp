import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const publicSourceFiles = [
  "data/external/normalized/external_data_manifest.json",
  "data/normalized/dld_source_quality.json",
  "data/normalized/osm_source_quality.json",
  "data/normalized/overture_source_quality.json"
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
  ".next/server/app/api/source-lineage/route.js.nft.json": publicSourceFiles
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
  ".next/server/app/api/source-lineage/route.js.nft.json": { allowed: publicSourceFiles, maxBytes: 24 * 1024 }
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
  const tracedDataFiles = [...traced].filter((file) => file.startsWith("data/"));
  const allowed = new Set(policy.allowed);
  const unexpected = tracedDataFiles.filter((file) => !allowed.has(file));
  if (unexpected.length > 0) failures.push(`${tracePath}: unexpected runtime data files: ${unexpected.join(", ")}`);
  const tracedDataBytes = tracedDataFiles.reduce((total, file) => total + statSync(resolve(root, file)).size, 0);
  if (tracedDataBytes > policy.maxBytes) {
    failures.push(`${tracePath}: traced data is ${tracedDataBytes} B, above ${policy.maxBytes} B budget`);
  }
}

if (failures.length > 0) {
  console.error("Vercel output-file tracing contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Vercel output-file tracing contract passed: ${Object.keys(requirements).length} route traces include only allowlisted runtime data within 4/24/32 KB budgets.`);
