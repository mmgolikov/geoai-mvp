import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const typesSource = fs.readFileSync(path.join(root, "src/lib/explore/types.ts"), "utf8");
const scenariosSource = fs.readFileSync(path.join(root, "src/lib/explore/scenarios.ts"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

const requiredDecisionIds = [
  "b2b_development_site_screening",
  "b2b_redevelopment_renovation",
  "b2b_acquisition_investment",
  "b2b_commercial_hospitality",
  "b2b_portfolio_asset_review",
  "b2c_ready_home_purchase",
  "b2c_off_plan_purchase",
  "b2c_investment_property",
  "b2c_rent_relocation",
  "b2c_overseas_buyer",
  "b2c_tourism_context"
];

const legacyScenarioIds = [
  "b2c_point_context",
  "b2c_tourist_objects_route",
  "b2c_residential_context",
  "b2c_new_residential_projects",
  "b2c_interest_routes",
  "b2b_redevelopment_selected_aoi",
  "b2b_redevelopment_100ha",
  "b2b_lowrise_luxury_residential",
  "b2b_hotel_development",
  "b2b_commercial_real_estate"
];

assert(typesSource.includes(requiredCaveat), "Mandatory caveat must remain exact in the Explore contract");

for (const id of requiredDecisionIds) {
  assert(typesSource.includes(`| \"${id}\"`), `Missing decision type ${id}`);
  assert(scenariosSource.includes(`id: \"${id}\"`), `Missing decision definition ${id}`);
}

for (const id of legacyScenarioIds) {
  assert(typesSource.includes(`| \"${id}\"`), `Legacy scenario ID ${id} must remain compatible`);
  assert(scenariosSource.includes(`id: \"${id}\"`), `Legacy scenario ${id} must remain registered`);
}

const b2cRoleBlock = scenariosSource.slice(
  scenariosSource.indexOf("export const b2cRoles"),
  scenariosSource.indexOf("export const b2bRoles")
);
assert(
  b2cRoleBlock.indexOf('id: "home_buyer"') < b2cRoleBlock.indexOf('id: "tourist"'),
  "Home buyer must precede tourism in the B2C role order"
);
assert(
  b2cRoleBlock.indexOf('id: "overseas_buyer"') < b2cRoleBlock.indexOf('id: "tourist"'),
  "Overseas buyer must precede tourism in the B2C role order"
);
assert(
  scenariosSource.includes('return audience === "b2c" ? b2cRoles[0].id : b2bRoles[0].id;'),
  "Default role must continue to derive from the ordered audience catalog"
);

const tourismDecisionStart = scenariosSource.indexOf('id: "b2c_tourism_context"');
const tourismDecision = scenariosSource.slice(tourismDecisionStart, tourismDecisionStart + 700);
assert(tourismDecision.includes('priority: "secondary"'), "Tourism must be explicitly secondary");

for (const market of ["ae", "sa", "qa", "om"]) {
  assert(scenariosSource.includes(`id: \"${market}\"`), `Missing GCC market metadata for ${market}`);
}
for (const countryCode of ["SA", "QA", "OM"]) {
  const marketStart = scenariosSource.indexOf(`countryCode: \"${countryCode}\"`);
  const marketBlock = scenariosSource.slice(marketStart, marketStart + 420);
  assert(marketBlock.includes('sourceReadiness: "metadata_only_no_data"'), `${countryCode} must remain metadata-only`);
  assert(marketBlock.includes("enabledForScreening: false"), `${countryCode} screening must remain disabled`);
}

const uaeStart = scenariosSource.indexOf('countryCode: "AE"');
const uaeBlock = scenariosSource.slice(uaeStart, uaeStart + 520);
assert(uaeBlock.includes('regions: ["Dubai", "Abu Dhabi"]'), "UAE metadata must name Dubai and Abu Dhabi");
assert(uaeBlock.includes('sourceReadiness: "local_open_context_only"'), "UAE must be labeled as local/open context only");

for (const forbiddenClaim of [
  "live DLD integration",
  "live GeoDubai integration",
  "official parcel",
  "official zoning",
  "certified valuation",
  "production-ready",
  "pilot-ready"
]) {
  assert(!scenariosSource.includes(forbiddenClaim), `Forbidden claim found: ${forbiddenClaim}`);
}

console.log(
  `GCC scenario contract: PASS (${requiredDecisionIds.length} decisions, 4 markets, legacy IDs preserved, tourism secondary).`
);
