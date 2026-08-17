import { readFile } from "node:fs/promises";

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const illustrativeLabel = "Illustrative local screening context";
const routeFiles = [
  "../app/api/data-sources/route.ts",
  "../app/api/data-sources/readiness/route.ts",
  "../app/api/external-data/manifest/route.ts",
  "../app/api/external-data/status/route.ts",
  "../app/api/external-data/sources/route.ts",
  "../app/api/source-lineage/route.ts"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const routes = await Promise.all(routeFiles.map(async (path) => ({
  path,
  source: await readFile(new URL(path, import.meta.url), "utf8")
})));
for (const route of routes) {
  assert(
    route.source.includes("getCompactPublicSourceRegistryResponse"),
    `${route.path} must use the shared compact source response`
  );
  assert(
    route.source.includes("NextResponse.json(getCompactPublicSourceRegistryResponse()"),
    `${route.path} must serialize the shared response without a divergent route projection`
  );
}

const publicReadiness = await readFile(
  new URL("../src/lib/external-data/public-source-readiness.ts", import.meta.url),
  "utf8"
);
for (const field of [
  "sourceGroups",
  "readiness",
  "manifest",
  "lineage",
  "blockers",
  "nextActions",
  "caveat",
  "generatedAt"
]) {
  assert(publicReadiness.includes(field), `Shared public source response is missing ${field}`);
}
for (const field of ["validationStatus", "presentationLabel", "sampleData", "smallSnapshot"]) {
  assert(publicReadiness.includes(field), `Shared public source response is missing ${field}`);
}
for (const rawProjection of [
  "status: group.status",
  "dataMode: group.dataMode",
  "validationStatus: group.validationStatus"
]) {
  assert(publicReadiness.includes(rawProjection), `Public projection must preserve raw machine truth: ${rawProjection}`);
}
assert(
  publicReadiness.includes("ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL"),
  "Public readiness must expose an explicit illustrative screening presentation label"
);
assert(
  !publicReadiness.includes('presentationLabel: "local"'),
  "Public readiness must not collapse source provenance to a neutral local label"
);
assert(
  publicReadiness.includes("copernicusMetadataJson") && publicReadiness.includes("copernicusRecordCount"),
  "Public readiness must not hide the bundled Copernicus illustrative sample and its observed count"
);
assert(publicReadiness.includes("sourceQuality: compactSourceQuality"), "Compact source quality must be nested in the shared manifest");
assert(publicReadiness.includes('location: "manifest.sourceQuality"'), "Anonymous response must reference compact source quality explicitly");
assert(!publicReadiness.includes("1970-01-01T00:00:00.000Z"), "Source timestamps must not use an invented epoch fallback");

const sourceModes = await readFile(
  new URL("../src/lib/external-data/source-modes.ts", import.meta.url),
  "utf8"
);
assert(sourceModes.includes(illustrativeLabel), "Sample presentation label must identify illustrative local screening context");
assert(sourceModes.includes('if (key === "sample_fallback") return "sample-only"'), "sample_fallback must retain its sample-only validation truth");
assert(sourceModes.includes("return ILLUSTRATIVE_LOCAL_SCREENING_CONTEXT_LABEL"), "Sample modes must use the explicit presentation label");

const sourceQuality = await readFile(
  new URL("../src/lib/external-data/source-quality-manifest.ts", import.meta.url),
  "utf8"
);
assert(sourceQuality.includes("sourceValidationStatusFor(status)"), "Quality manifest must retain raw validation status derivation");

const supabaseFallback = await readFile(
  new URL("../src/lib/external-data/supabase-source-registry.ts", import.meta.url),
  "utf8"
);
assert(supabaseFallback.includes("storedProvenanceAllowsDecision"), "Supabase overlay must require a stored provenance decision gate");
assert(supabaseFallback.includes("sourcePresentationLabel"), "Supabase fallback must keep presentation labels separate from raw states");
assert(supabaseFallback.includes("sampleData"), "Supabase fallback must preserve explicit sample provenance flags");

const provenanceContract = await readFile(
  new URL("../src/lib/external-data/source-provenance-contract.ts", import.meta.url),
  "utf8"
);
const provenanceManifest = await readFile(
  new URL("../src/lib/external-data/source-provenance-manifest.ts", import.meta.url),
  "utf8"
);
for (const requirement of [
  "Artifact SHA-256 evidence is missing or invalid.",
  "Observed record or feature count is missing.",
  "Reusable rights and attribution review is not approved.",
  "Immutable custody receipt is not recorded.",
  "Source review or client validation is not recorded.",
  "Current, policy-evaluated freshness evidence is not recorded.",
  "Source-backed decision scoring or ranking is not explicitly permitted.",
  "Rights evidence prohibits source-backed decision scoring or ranking.",
  "Confidence dimension"
]) {
  assert(provenanceContract.includes(requirement), `Decision-use gate is missing: ${requirement}`);
}
assert(
  publicReadiness.includes("provenanceAllowsDecisionUse") &&
    publicReadiness.includes("usedInAnalysis: Boolean(source.usedInAnalysis) && provenanceAllowsDecisionUse(source.id)"),
  "Public usedInAnalysis must remain false when provenance is invalid or decision use is blocked"
);
assert(
  publicReadiness.includes("caveat: SOURCE_PROVENANCE_CAVEAT"),
  "Public source caveats must normalize to the exact required caveat"
);

const sourceRegistry = await readFile(
  new URL("../src/lib/external-data/source-registry.ts", import.meta.url),
  "utf8"
);
assert(sourceRegistry.includes("resolveExternalDataSourceId"), "Legacy source IDs must resolve through one canonical compatibility map");
assert(!sourceRegistry.includes("legacyExternalSources"), "Legacy source aliases must not be appended as duplicate authorities");

const publicCatalog = await readFile(
  new URL("../src/lib/external-data/public-source-catalog.ts", import.meta.url),
  "utf8"
);
for (const requirement of [
  'item.connectionStatus === "sample_fallback"',
  'provider: "GeoAI illustrative local context"',
  'dataQualityTier: "sample" as const',
  "no external provider license, attribution or origin is asserted"
]) {
  assert(publicCatalog.includes(requirement), `Sample/fallback catalog attribution safeguard is missing: ${requirement}`);
}

const dldSnapshot = await readFile(
  new URL("../src/lib/external-data/dld-snapshot.ts", import.meta.url),
  "utf8"
);
assert(
  dldSnapshot.includes('illustrativeFallback ? "seed_static" : "dld_dubai_pulse_snapshot"'),
  "Bundled fallback market context must not identify itself as a DLD / Dubai Pulse snapshot"
);
assert(
  dldSnapshot.includes('illustrativeFallback ? "demo-market-context-seed" : "dld-dubai-pulse-transactions"'),
  "Bundled fallback market context must retain the illustrative local source ID"
);
assert(provenanceManifest.includes("createHash"), "Local provenance manifest must hash repository artifacts");
assert(provenanceManifest.includes("compactSourceProvenanceManifest"), "Public source quality must have a compact projection");
assert(provenanceManifest.includes("releases: _releases"), "Compact projection must remove detailed release records");
assert(
  provenanceManifest.includes("SOURCE_PROVENANCE_CAVEAT"),
  "Strict provenance manifest must source the exact caveat from the provenance contract"
);

const ingestion = await readFile(
  new URL("./ingest-dld-dubai-pulse.mjs", import.meta.url),
  "utf8"
);
for (const requirement of [
  "--allow-remote",
  'url.protocol !== "https:"',
  "allowedRemoteHosts",
  'redirect: "error"',
  "remoteTimeoutMs",
  "maximumInputBytes",
  "allowedRemoteMediaTypes",
  "allowedLocalRoots",
  "sampleData",
  "smallSnapshot",
  'validationStatus: sampleData ? "sample-only" : "snapshot-not-live"',
  "illustrativeLabel"
]) {
  assert(ingestion.includes(requirement), `DLD ingestion safeguard is missing: ${requirement}`);
}
assert(ingestion.includes(caveat), "DLD ingestion must preserve the exact caveat");

const sync = await readFile(
  new URL("./sync-source-readiness-snapshots.mjs", import.meta.url),
  "utf8"
);
assert(sync.includes("!writeRequested || !nonDryRunRequested"), "Source sync must default to dry-run");
assert(sync.includes("legacyDatabaseWriterQuarantined = true"), "Legacy mutable source writer must remain quarantined");
assert(sync.includes("GEOAI_OPERATOR_SUPABASE_SECRET_KEY"), "Source sync writes must require the operator-only secret");
assert(sync.includes("sourceProvenanceManifest"), "Source sync must prepare strict provenance evidence");
assert(sync.includes("presentationLabelFor"), "Source sync must emit explicit presentation labels without replacing raw status fields");
assert(sync.includes("validationStatus: row.quality.validationStatus"), "Source sync preview must preserve raw validation status");
assert(sync.includes(illustrativeLabel), "Source sync must identify illustrative local screening context explicitly");
assert(sync.includes(caveat), "Source sync must preserve the exact caveat");

console.log(
  `Source readiness contract passed: ${routes.length} routes share one compact response; provenance, dry-run and bounded-ingestion gates are present.`
);
