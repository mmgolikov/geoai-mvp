import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const client = read("components/point-to-object/prototype-client-v5.tsx");
const analysis = read("components/point-to-object/analysis-client.tsx");
const create = read("components/point-to-object/create-panel.tsx");
const map = read("components/point-to-object/live-object-map.tsx");
const contextRoute = read("app/api/prototype/point-to-object/context/route.ts");
const aiRoute = read("app/api/prototype/point-to-object/ai/route.ts");
const evidence = read("src/lib/prototype/point-to-object-live-evidence.ts");
const session = read("src/lib/prototype/point-to-object-find-session.ts");
const capabilities = read("src/lib/prototype/point-to-object-find-capabilities.ts");
const i18n = read("src/lib/prototype/point-to-object-i18n.ts");
const header = read("components/point-to-object/prototype-header.tsx");

assert.match(client, /expectedSourceFeatureId: exactOsmFeatureId\(selection\.object\.sourceFeatureId\)/);
assert.match(client, /const expectedSourceFeatureId = exactOsmFeatureId\(candidate\.sourceFeatureId\)/);
assert.match(client, /expectedSourceFeatureId,/);
assert.match(map, /if \(navigationTarget\.expectedSourceFeatureId\) \{/);
assert.match(map, /sourceFeatureId: navigationTarget\.expectedSourceFeatureId/);
assert.match(contextRoute, /osmFeatureId: parsed\.value\.expectedSourceFeatureId \?\? null/);
assert.match(aiRoute, /osmFeatureId: body\.expectedSourceFeatureId/);
assert.match(evidence, /new URL\("lookup", endpoint\)/);
assert.match(evidence, /The expected OpenStreetMap object could not be resolved exactly/);
assert.match(evidence, /"trusted_open_map_identity"/);

assert.match(map, /widthM > 750 \|\| heightM > 750 \|\| widthM \* heightM > 250_000/);
assert.match(map, /NON_OBJECT_POLYGON_SOURCE_LAYERS\.has\(sourceLayer\)/);
assert.match(map, /sourceLayer === "landuse"[\s\S]*SELECTABLE_LANDUSE_CLASSES\.has\(featureClassName\)/);
assert.match(map, /\(bounds\[2\] - bounds\[0\]\) \/ viewportWidth >= 0\.8/);
assert.match(map, /interactionModeRef\.current !== "analyse"/);

assert.match(session, /geoai:point-to-object:find:v1/);
assert.match(session, /sourceResponseHash/);
assert.match(session, /shortlist\.some\(\(item\) => !candidateIds\.has\(item\.sourceFeatureId\)\)/);
assert.match(client, /readPointObjectFindSession\(\)/);
assert.match(client, /writePointObjectFindSession\(\{/);
assert.match(client, /Sample lineage/);
assert.match(client, /sourceResponseHash\.slice\(0, 16\)/);
assert.match(session, /analysisTargetSourceFeatureId/);
assert.match(analysis, /findSession\?\.analysisTargetSourceFeatureId === selectedSourceFeatureId/);
assert.match(analysis, /settingsForFindIntent\(findSession\.role, findSession\.scenario\)/);

const findDrawerStart = client.indexOf('data-testid="find-drawer"');
const findDrawerEnd = client.indexOf('{mode === "create"', findDrawerStart);
assert.ok(findDrawerStart >= 0 && findDrawerEnd > findDrawerStart, "Find drawer source must be addressable for deterministic UI checks");
const findDrawer = client.slice(findDrawerStart, findDrawerEnd);
assert.match(client, /ⓘ Data & methodology/);
assert.match(client, /data-testid="find-methodology-content"/);
assert.match(client, /the current visible map extent/);
assert.match(client, /ownership, vacancy, condition, zoning, demolition rights or redevelopment validation/);
assert.match(client, /POINT_OBJECT_FIND_CAVEAT/);
assert.doesNotMatch(client, /t\("find\.body"\)/, "Find must not render a permanent introductory disclaimer");
assert.doesNotMatch(findDrawer, /<details/, "Find drawer must not duplicate the methodology disclosure");
assert.doesNotMatch(findDrawer, /findCapability\.limitation\[locale\]<\/p>/, "Find capability text must not render as a permanent inline disclaimer");
assert.equal((findDrawer.match(/overflow-y-auto/g) ?? []).length, 1, "Find drawer must have exactly one scroll region");
assert.match(findDrawer, /data-testid="find-scroll-region"/);
assert.match(findDrawer, /data-testid="find-sticky-footer"/);
assert.match(findDrawer, /bottom-0[^"]*lg:sticky/, "Find footer must stay pinned inside the desktop drawer without overlaying stacked mobile content");
assert.match(findDrawer, /data-testid="find-search-cta"/);
assert.match(findDrawer, /findResultIsStale[\s\S]*"Update search"/);
assert.match(client, /findResult\.criteria\.bounds/);
assert.match(client, /findResultIntentKey !== findIntentKey/);
assert.match(client, /findResultIsStale \? null : findResult/);
assert.match(findDrawer, /min-h-11 w-full rounded-xl bg-\[#087f8c\]/, "Find CTA must retain a 44px target");
assert.match(client, /sm:pb-3/);
assert.match(map, /sm:bottom-3/, "Desktop map controls and Find CTA must use the same 12px bottom offset");

assert.doesNotMatch(client, /setCreateAreaCleared\(\(value\) => !value\);\s*setGeneratedConcept\(null\)/);
assert.match(client, /generatedConcept \? \(locale === "ru" \? "Показать концепт" : "Show concept"\)/);
assert.match(create, /function invalidateGeneration\(\)[\s\S]*requestIdRef\.current \+= 1;[\s\S]*requestRef\.current\?\.abort\(\);[\s\S]*if \(generated\) onReset\(\);/);
assert.match(create, /function selectTemplate[\s\S]*invalidateGeneration\(\);[\s\S]*setTemplateId/);
assert.match(create, /function updateControl[\s\S]*invalidateGeneration\(\);[\s\S]*setControls/);
assert.match(create, /id="point-object-create-prompt"[\s\S]*onChange=\{\(event\) => \{[\s\S]*invalidateGeneration\(\);[\s\S]*setCustomPrompt/);

for (const scenario of [
  "b2c_point_context", "b2c_tourist_objects_route", "b2c_residential_context",
  "b2c_new_residential_projects", "b2c_interest_routes", "b2b_redevelopment_selected_aoi",
  "b2b_redevelopment_100ha", "b2b_lowrise_luxury_residential", "b2b_hotel_development",
  "b2b_commercial_real_estate"
]) assert.match(capabilities, new RegExp(`${scenario}: \\{`));
assert.match(client, /findCapability\.limitation\[locale\]/);

for (const key of ["map.instructions.analyse", "map.instructions.find", "map.instructions.create"]) {
  assert.equal(i18n.split(`"${key}"`).length, 3, `${key} must exist once per locale`);
}
assert.match(map, /interactionMode === "find"/);
assert.match(header, /sm:hidden[^>]*" aria-hidden="true">←/);
assert.match(header, /hidden sm:inline/);

console.log("point-to-object V5 interaction contract checks passed");
