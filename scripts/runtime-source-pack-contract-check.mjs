import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadIsolatedTypeScriptModule(relativePath, imports = {}) {
  const source = readFileSync(resolve(relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: relativePath
  }).outputText;
  const module = { exports: {} };
  const isolatedRequire = (request) => {
    if (request in imports) return imports[request];
    throw new Error(`Isolated contract unexpectedly required ${request}`);
  };
  const evaluate = new Function("exports", "module", "require", output);
  evaluate(module.exports, module, isolatedRequire);
  return module.exports;
}

function fixture(name) {
  return JSON.parse(readFileSync(resolve("data/external/contract-fixtures", name), "utf8"));
}

function expectThrow(run, message) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const parsers = loadIsolatedTypeScriptModule("src/lib/external-data/runtime-source-parsers.ts");
const validation = loadIsolatedTypeScriptModule("src/lib/external-data/runtime-request-validation.ts");
const runtimeContract = loadIsolatedTypeScriptModule(
  "src/lib/external-data/runtime-source-contract.ts",
  {
    "node:crypto": { timingSafeEqual: (left, right) => Buffer.compare(left, right) === 0 },
    "@/src/lib/external-data/public-source-catalog": { publicDataCaveat: "test caveat" }
  }
);

const originalRuntimeEnvironment = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
  GEOAI_ENABLE_PREVIEW_SOURCE_PACK: process.env.GEOAI_ENABLE_PREVIEW_SOURCE_PACK,
  GEOAI_OPERATOR_SOURCE_TOKEN: process.env.GEOAI_OPERATOR_SOURCE_TOKEN
};
try {
  process.env.VERCEL_ENV = "";
  process.env.NODE_ENV = "test";
  process.env.GEOAI_ENABLE_PREVIEW_SOURCE_PACK = "false";
  assert(runtimeContract.getRuntimeSourcePackActivationMode() === "disabled", "Unflagged local runtime must remain disabled");
  process.env.GEOAI_ENABLE_PREVIEW_SOURCE_PACK = "true";
  assert(runtimeContract.getRuntimeSourcePackActivationMode() === "disabled", "Flag alone must not enable anonymous upstream fan-out");
  process.env.GEOAI_OPERATOR_SOURCE_TOKEN = "test-operator-source-token-32-characters";
  assert(runtimeContract.getRuntimeSourcePackActivationMode() === "local_operator_enabled", "Flagged and operator-gated local runtime mode is incorrect");
  assert(runtimeContract.hasRuntimeSourcePackOperatorAccess(new Request("https://example.test", {
    headers: { authorization: `Bearer ${process.env.GEOAI_OPERATOR_SOURCE_TOKEN}` }
  })), "Matching operator token must authorize the controlled source pack");
  assert(!runtimeContract.hasRuntimeSourcePackOperatorAccess(new Request("https://example.test")), "Missing operator token must fail closed");
  assert(!runtimeContract.hasRuntimeSourcePackOperatorAccess(new Request("https://example.test", {
    headers: { authorization: `Bearer ${"é".repeat(process.env.GEOAI_OPERATOR_SOURCE_TOKEN.length)}` }
  })), "Unicode token with matching character count but different byte length must fail closed without throwing");
  process.env.VERCEL_ENV = "preview";
  assert(runtimeContract.getRuntimeSourcePackActivationMode() === "preview_operator_enabled", "Flagged Preview runtime mode is incorrect");
  process.env.VERCEL_ENV = "production";
  assert(runtimeContract.getRuntimeSourcePackActivationMode() === "disabled", "Production must stay disabled even with operator flag");
} finally {
  for (const [key, value] of Object.entries(originalRuntimeEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const nasaPeriod = { from: "2024-01-01", to: "2024-01-07" };
const copernicusExpected = { collection: "sentinel-2-l2a", period: { from: "2026-07-01", to: "2026-07-15" } };
const nasa = parsers.parseNasaPowerPayload(fixture("nasa_power_daily_point.json"), nasaPeriod);
assert(nasa.averageTemperatureC === 24, "NASA temperature aggregation must ignore provider fill values");
assert(nasa.averageSolarRadiationKwhM2Day === 5.54, "NASA solar aggregation changed unexpectedly");
assert(nasa.observationDays === 2, "NASA observation-day count changed unexpectedly");
assert(nasa.observedFrom === "2024-01-01" && nasa.observedTo === "2024-01-02", "NASA lineage must report actual paired observation dates, not the requested interval end");
assert(nasa.providerVersion === null, "Missing NASA provider version must remain null");

const rawCopernicus = fixture("copernicus_stac_search.json");
const copernicus = parsers.parseCopernicusStacPayload(rawCopernicus, copernicusExpected);
assert(parsers.containsForbiddenSpatialFields(rawCopernicus), "Copernicus fixture must exercise geometry/asset stripping");
assert(!parsers.containsForbiddenSpatialFields(copernicus), "Copernicus normalized payload must exclude geometry, bbox and assets");
assert(copernicus.scenes.length === 1 && copernicus.scenes[0].id === "S2_CONTRACT_FIXTURE_001", "Copernicus scene identity was not preserved");
assert(!JSON.stringify(copernicus).includes("provider_internal_field"), "Copernicus provider fields must be allowlisted");

const overpass = parsers.parseOverpassCountPayload(fixture("osm_overpass_counts.json"));
assert(overpass.amenityElements === 177, "Overpass amenity count parser changed unexpectedly");
assert(overpass.publicTransportElements === 4, "Overpass transport count parser changed unexpectedly");
assert(overpass.highwayElements === 1173, "Overpass highway count parser changed unexpectedly");

expectThrow(() => parsers.parseNasaPowerPayload({}, nasaPeriod), "Malformed NASA response must fail closed");
expectThrow(() => parsers.parseCopernicusStacPayload({ type: "Feature" }, copernicusExpected), "Malformed STAC response must fail closed");
expectThrow(() => parsers.parseOverpassCountPayload({ elements: [] }), "Malformed Overpass response must fail closed");
expectThrow(() => parsers.parseNasaPowerPayload({
  type: "Feature",
  properties: { parameter: { T2M: { "20240101": 24 }, ALLSKY_SFC_SW_DWN: { "20240102": 5 } } }
}, nasaPeriod), "NASA parameter dates must align before aggregation");
expectThrow(() => parsers.parseNasaPowerPayload({
  type: "Feature",
  properties: { parameter: { T2M: { "20990231": 24 }, ALLSKY_SFC_SW_DWN: { "20990231": 5 } } }
}, nasaPeriod), "NASA dates must be real calendar days inside the requested interval");
expectThrow(() => parsers.parseCopernicusStacPayload({
  type: "FeatureCollection",
  features: [{ type: "Feature", id: "wrong-collection", collection: "landsat", properties: { datetime: "2026-07-11T00:00:00Z", "eo:cloud_cover": 4 } }]
}, copernicusExpected), "STAC collection must match the allowlisted contract");
expectThrow(() => parsers.parseCopernicusStacPayload({
  type: "FeatureCollection",
  features: [{ type: "Feature", id: "bad-cloud", collection: "sentinel-2-l2a", properties: { datetime: "not-a-date", "eo:cloud_cover": 101 } }]
}, copernicusExpected), "STAC datetime and cloud cover must be semantically valid");
expectThrow(() => parsers.parseCopernicusStacPayload({
  type: "FeatureCollection",
  features: [{ type: "Feature", id: "future-scene", collection: "sentinel-2-l2a", properties: { datetime: "2099-01-01T00:00:00Z", "eo:cloud_cover": 4 } }]
}, copernicusExpected), "STAC datetime must remain inside the requested interval");
expectThrow(() => parsers.parseCopernicusStacPayload({
  type: "FeatureCollection",
  features: [{ type: "Feature", id: "normalized-invalid-day", collection: "sentinel-2-l2a", properties: { datetime: "2026-02-31T00:00:00Z", "eo:cloud_cover": 4 } }]
}, { collection: "sentinel-2-l2a", period: { from: "2026-02-01", to: "2026-03-05" } }), "STAC datetime must be a real calendar day, not Date.parse normalization");
expectThrow(() => parsers.parseOverpassCountPayload({
  elements: [
    { type: "count", tags: { total: null } },
    { type: "count", tags: { total: "" } },
    { type: "count", tags: { total: "1" } }
  ]
}), "Overpass null and empty totals must never coerce to zero");

assert(validation.parseCoordinate(null, "latitude") === null, "Missing latitude must not become zero");
assert(validation.parseCoordinate("", "longitude") === null, "Empty longitude must not become zero");
assert(validation.parseCoordinate("91", "latitude") === null, "Out-of-range latitude must fail");
assert(validation.parseCoordinate("-181", "longitude") === null, "Out-of-range longitude must fail");
assert(validation.parseCoordinate("25.2048", "latitude") === 25.2048, "Valid latitude must pass");
assert("error" in validation.parseBoundedIsoDateRange("2024-01-01", "2025-02-01", 370), "Oversized date range must fail");

const runtimeSource = readFileSync(resolve("src/lib/external-data/runtime-source-pack.ts"), "utf8");
const runtimeContractSource = readFileSync(resolve("src/lib/external-data/runtime-source-contract.ts"), "utf8");
const routeSource = readFileSync(resolve("app/api/external-data/source-connection-pack/route.ts"), "utf8");
const openMeteoSource = readFileSync(resolve("src/lib/external-data/climate-open-meteo.ts"), "utf8");
const legacyEnvironmentSource = readFileSync(resolve("src/lib/context/environment-context-service.ts"), "utf8");
const workspaceSource = readFileSync(resolve("components/workspace-shell.tsx"), "utf8");
const supabaseRegistrySource = readFileSync(resolve("src/lib/external-data/supabase-source-registry.ts"), "utf8");
const publicSourceReadinessSource = readFileSync(resolve("src/lib/external-data/public-source-readiness.ts"), "utf8");
const publicGroupProjector = publicSourceReadinessSource.match(/function toCompactPublicSourceGroup[\s\S]*?\n}/)?.[0] ?? "";
const publicManifestProjector = publicSourceReadinessSource.match(/function toCompactPublicManifestSource[\s\S]*?\n}/)?.[0] ?? "";
assert(runtimeSource.includes("out count"), "Overpass request must remain count-only");
assert(runtimeSource.includes("[out:json][timeout:8]"), "Overpass internal timeout must remain below the HTTP timeout");
assert(runtimeSource.includes("}, 10_000, 1));"), "Overpass must use one upstream attempt without an immediate retry");
assert(runtimeSource.includes("inFlight"), "Same-instance concurrent provider requests must be deduplicated");
assert(runtimeSource.includes("fields: \"-geometry,-bbox,-assets\""), "STAC request must exclude geometry, bbox and assets upstream");
assert(runtimeSource.includes("POWER Daily API"), "NASA POWER service attribution is missing");
assert(runtimeSource.includes("https://power.larc.nasa.gov/docs/referencing/"), "NASA POWER referencing guide is missing");
assert(runtimeSource.includes("Contains modified Copernicus Sentinel data"), "Copernicus prescribed Sentinel notice is missing");
assert(runtimeSource.includes("Contains modified Copernicus Service information"), "Copernicus service-information notice is missing");
assert(runtimeSource.includes("Data © OpenStreetMap contributors, available under ODbL 1.0."), "OSM attribution and licence notice are missing");
assert(runtimeSource.includes("maximumResponseBytes"), "Upstream response-size guard is missing");
assert(runtimeSource.includes("response.body.getReader()") && runtimeSource.includes("reader.cancel()") && runtimeSource.includes("response.body?.cancel()"), "Upstream response cap must cancel declared and streamed oversized bodies");
assert(runtimeSource.includes("if (attempt + 1 < maximumAttempts && retryable) {\n      await response.body?.cancel();"), "Retryable non-OK responses must release their bodies before retry");
assert(runtimeSource.includes("AbortSignal.timeout"), "Upstream timeout guard is missing");
assert(runtimeSource.includes('redirect: "error"'), "Upstream redirects must fail closed");
assert(runtimeSource.includes("allowedRuntimeSourceHosts"), "Runtime source hosts must be allowlisted");
assert(routeSource.includes("isRuntimeSourcePackAllowed"), "Production fail-closed route guard is missing");
assert(routeSource.includes("hasRuntimeSourcePackOperatorAccess"), "Runtime source route must require operator authorization");
assert(runtimeContractSource.includes("process.env.NODE_ENV === \"production\""), "Generic production runtime must fail closed without VERCEL_ENV");
assert(runtimeContractSource.includes("GEOAI_ENABLE_PREVIEW_SOURCE_PACK") && runtimeContractSource.includes("GEOAI_OPERATOR_SOURCE_TOKEN") && runtimeContractSource.includes("isRuntimeSourcePackOperatorEnabled"), "Preview source execution must require flag and operator token");
assert(runtimeContractSource.includes("getRuntimeSourcePackActivationMode"), "Public source status must share the canonical environment/flag decision");
assert(!openMeteoSource.includes("fetch("), "Open-Meteo free endpoint must remain disabled");
assert(!legacyEnvironmentSource.includes("fetch("), "Legacy context services must not bypass the controlled source pack");
assert(!workspaceSource.includes('fetch("/api/analyze"') && !workspaceSource.includes('fetch("/api/ai/decision-score"'), "Browser-local analysis must not send uploaded/AOI context to analysis or AI endpoints");
assert(workspaceSource.includes("isBrowserLocalSelection(selectedObject, selectedAoi)") && workspaceSource.includes("keepSelectionLocal ? null : await fetchClimateScreeningContext"), "User-uploaded and user-drawn target coordinates must remain browser-local");
assert(workspaceSource.includes("climateContext.status !== \"connected\""), "Only connected climate context may become evidence");
assert(supabaseRegistrySource.includes("usedInAnalysis: status === \"snapshot_available\" && acquiredSnapshot"), "Registry status alone must not become analysis lineage");
assert(publicGroupProjector.includes("id: group.id") && publicGroupProjector.includes("validationRequired: true"), "Public source groups must use an explicit DTO allowlist");
assert(publicManifestProjector.includes("id: source.id") && publicManifestProjector.includes("usedInAnalysis: source.usedInAnalysis"), "Public manifest sources must use an explicit DTO allowlist");
assert(!publicGroupProjector.includes("...") && !publicManifestProjector.includes("..."), "Public source DTO projectors must not use object spread/rest");
assert(!publicSourceReadinessSource.includes("map(({ availableFiles"), "Public source projection must not rely on delete-by-rest filtering");

console.log(JSON.stringify({
  ok: true,
  checked: [
    "frozen_nasa_contract",
    "frozen_copernicus_metadata_allowlist",
    "frozen_overpass_count_contract",
    "malformed_response_fail_closed",
    "coordinate_and_date_bounds",
    "production_route_guard",
    "generic_production_fail_closed",
    "preview_operator_opt_in",
    "local_preview_production_activation_mode_matrix",
    "timeouts_and_response_budget",
    "provider_specific_attribution",
    "overpass_single_attempt_and_inflight_dedup",
    "legacy_context_no_bypass",
    "browser_local_analysis_and_private_target_coordinates_not_networked",
    "permission_gated_context_excluded_from_evidence",
    "registry_lineage_requires_acquired_evidence",
    "open_meteo_license_gate",
    "public_source_explicit_dto_allowlist"
  ],
  caveat: "Deterministic fixtures validate adapter contracts; live provider smoke evidence is separate and mutable."
}, null, 2));
