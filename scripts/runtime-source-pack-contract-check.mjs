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
const routeSource = readFileSync(resolve("app/api/external-data/source-connection-pack/route.ts"), "utf8");
const openMeteoSource = readFileSync(resolve("src/lib/external-data/climate-open-meteo.ts"), "utf8");
assert(runtimeSource.includes("out count"), "Overpass request must remain count-only");
assert(runtimeSource.includes("fields: \"-geometry,-bbox,-assets\""), "STAC request must exclude geometry, bbox and assets upstream");
assert(runtimeSource.includes("maximumResponseBytes"), "Upstream response-size guard is missing");
assert(runtimeSource.includes("AbortSignal.timeout"), "Upstream timeout guard is missing");
assert(routeSource.includes("isRuntimeSourcePackAllowed"), "Production fail-closed route guard is missing");
assert(!openMeteoSource.includes("fetch("), "Open-Meteo free endpoint must remain disabled");

console.log(JSON.stringify({
  ok: true,
  checked: [
    "frozen_nasa_contract",
    "frozen_copernicus_metadata_allowlist",
    "frozen_overpass_count_contract",
    "malformed_response_fail_closed",
    "coordinate_and_date_bounds",
    "production_route_guard",
    "timeouts_and_response_budget",
    "open_meteo_license_gate"
  ],
  caveat: "Deterministic fixtures validate adapter contracts; live provider smoke evidence is separate and mutable."
}, null, 2));
