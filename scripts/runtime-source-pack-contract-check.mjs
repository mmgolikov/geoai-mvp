import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadIsolatedTypeScriptModule(relativePath) {
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
  const evaluate = new Function("exports", "module", output);
  evaluate(module.exports, module);
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

const nasa = parsers.parseNasaPowerPayload(fixture("nasa_power_daily_point.json"));
assert(nasa.averageTemperatureC === 24, "NASA temperature aggregation must ignore provider fill values");
assert(nasa.averageSolarRadiationKwhM2Day === 5.54, "NASA solar aggregation changed unexpectedly");
assert(nasa.observationDays === 2, "NASA observation-day count changed unexpectedly");
assert(nasa.providerVersion === null, "Missing NASA provider version must remain null");

const rawCopernicus = fixture("copernicus_stac_search.json");
const copernicus = parsers.parseCopernicusStacPayload(rawCopernicus);
assert(parsers.containsForbiddenSpatialFields(rawCopernicus), "Copernicus fixture must exercise geometry/asset stripping");
assert(!parsers.containsForbiddenSpatialFields(copernicus), "Copernicus normalized payload must exclude geometry, bbox and assets");
assert(copernicus.scenes.length === 1 && copernicus.scenes[0].id === "S2_CONTRACT_FIXTURE_001", "Copernicus scene identity was not preserved");
assert(!JSON.stringify(copernicus).includes("provider_internal_field"), "Copernicus provider fields must be allowlisted");

const overpass = parsers.parseOverpassCountPayload(fixture("osm_overpass_counts.json"));
assert(overpass.amenityElements === 177, "Overpass amenity count parser changed unexpectedly");
assert(overpass.publicTransportElements === 4, "Overpass transport count parser changed unexpectedly");
assert(overpass.highwayElements === 1173, "Overpass highway count parser changed unexpectedly");

expectThrow(() => parsers.parseNasaPowerPayload({}), "Malformed NASA response must fail closed");
expectThrow(() => parsers.parseCopernicusStacPayload({ type: "Feature" }), "Malformed STAC response must fail closed");
expectThrow(() => parsers.parseOverpassCountPayload({ elements: [] }), "Malformed Overpass response must fail closed");

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
assert(runtimeSource.includes("AbortSignal.timeout"), "Upstream timeout guard is missing");
assert(routeSource.includes("isRuntimeSourcePackAllowed"), "Production fail-closed route guard is missing");
assert(runtimeContractSource.includes("process.env.NODE_ENV === \"production\""), "Generic production runtime must fail closed without VERCEL_ENV");
assert(!openMeteoSource.includes("fetch("), "Open-Meteo free endpoint must remain disabled");
assert(!legacyEnvironmentSource.includes("fetch("), "Legacy context services must not bypass the controlled source pack");
assert(workspaceSource.includes("climateContext: connectedClimateContext"), "Permission-gated climate context must not enter analysis/AI payloads");
assert(workspaceSource.includes("climateContext.status !== \"connected\""), "Only connected climate context may become evidence");
assert(supabaseRegistrySource.includes("usedInAnalysis: status === \"snapshot_available\" && acquiredSnapshot"), "Registry status alone must not become analysis lineage");

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
    "timeouts_and_response_budget",
    "provider_specific_attribution",
    "overpass_single_attempt_and_inflight_dedup",
    "legacy_context_no_bypass",
    "permission_gated_context_excluded_from_evidence_and_ai",
    "registry_lineage_requires_acquired_evidence",
    "open_meteo_license_gate"
  ],
  caveat: "Deterministic fixtures validate adapter contracts; live provider smoke evidence is separate and mutable."
}, null, 2));
