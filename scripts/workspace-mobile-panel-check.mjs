import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const moduleCache = new Map();

function toSourcePath(id) {
  if (id.startsWith("@/")) {
    return path.join(process.cwd(), `${id.slice(2)}.ts`);
  }

  return path.join(process.cwd(), id);
}

function loadTsModule(id) {
  const sourcePath = toSourcePath(id);
  if (moduleCache.has(sourcePath)) return moduleCache.get(sourcePath);

  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      verbatimModuleSyntax: false
    }
  });

  const module = { exports: {} };
  moduleCache.set(sourcePath, module.exports);
  vm.runInNewContext(transpiled.outputText, {
    exports: module.exports,
    module,
    require: (requireId) => {
      if (requireId.startsWith("@/")) return loadTsModule(requireId);
      throw new Error(`Unexpected runtime dependency while checking workspace panel UX: ${requireId}`);
    }
  }, { filename: sourcePath });
  moduleCache.set(sourcePath, module.exports);
  return module.exports;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const {
  getDefaultRoleForAudience,
  getDefaultScenarioForRole,
  getExploreScenariosByRole,
  isExploreScenarioForRole
} = loadTsModule("src/lib/explore/scenarios.ts");

function assertScenarioAudience(audience, role) {
  const scenarios = getExploreScenariosByRole(audience, role);
  assert(scenarios.length > 0, `${audience}/${role} should expose scenarios`);
  for (const scenario of scenarios) {
    assert(scenario.audience === audience, `${audience}/${role} leaked ${scenario.audience} scenario ${scenario.id}`);
  }
  return scenarios.map((scenario) => scenario.id);
}

const developerScenarioIds = assertScenarioAudience("b2b", "developer");
assert(developerScenarioIds.includes("b2b_redevelopment_selected_aoi"), "developer scenarios should include redevelopment potential");
assert(!developerScenarioIds.some((id) => id.startsWith("b2c_")), "developer scenarios must not include B2C scenarios");

const fundScenarioIds = assertScenarioAudience("b2b", "real_estate_fund");
assert(fundScenarioIds.includes("b2b_commercial_real_estate"), "fund scenarios should include commercial screening");

const touristScenarioIds = assertScenarioAudience("b2c", "tourist");
assert(touristScenarioIds.includes("b2c_point_context"), "tourist scenarios should include point insight");
assert(!touristScenarioIds.some((id) => id.startsWith("b2b_")), "tourist scenarios must not include B2B scenarios");

const homeBuyerScenarioIds = assertScenarioAudience("b2c", "home_buyer");
assert(homeBuyerScenarioIds.includes("b2c_residential_context"), "home buyer scenarios should include residential context");
assert(!isExploreScenarioForRole("b2c", "home_buyer", "b2b_redevelopment_selected_aoi"), "home buyer must reject B2B redevelopment scenario");

const b2cDefaultRole = getDefaultRoleForAudience("b2c");
const b2cDefaultScenario = getDefaultScenarioForRole("b2c", b2cDefaultRole);
assert(isExploreScenarioForRole("b2c", b2cDefaultRole, b2cDefaultScenario), "B2C default role/scenario should be valid");
assert(!isExploreScenarioForRole("b2c", b2cDefaultRole, "b2b_redevelopment_100ha"), "B2C segment reset should reject B2B default scenario");

const b2bDefaultRole = getDefaultRoleForAudience("b2b");
const b2bDefaultScenario = getDefaultScenarioForRole("b2b", b2bDefaultRole);
assert(isExploreScenarioForRole("b2b", b2bDefaultRole, b2bDefaultScenario), "B2B default role/scenario should be valid");
assert(!isExploreScenarioForRole("b2b", b2bDefaultRole, "b2c_tourist_objects_route"), "B2B segment reset should reject B2C scenario");

const panelSource = fs.readFileSync(path.join(process.cwd(), "components/analysis-panel.tsx"), "utf8");
const scenarioSetupIndex = panelSource.indexOf("Scenario setup");
const candidateSearchIndex = panelSource.indexOf("Candidate Search");
const customQueryIndex = panelSource.indexOf("Custom Query");

assert(scenarioSetupIndex >= 0, "Scenario setup label should render");
assert(candidateSearchIndex > scenarioSetupIndex, "Candidate Search should render after Scenario setup");
assert(customQueryIndex > candidateSearchIndex, "Custom Query should render after Candidate Search");
assert(panelSource.includes("value={customQuery}"), "Custom Query textarea should preserve customQuery value binding");
assert(panelSource.includes("onCustomQueryChange(event.target.value)"), "Custom Query textarea should preserve change binding");
assert(!panelSource.includes("Cuscom query"), "Cuscom query typo must not render");
assert(!panelSource.includes("Custom query"), "Custom Query label should use requested casing");
assert(!panelSource.includes("Details"), "Project Details control must not render");

console.log(JSON.stringify({
  ok: true,
  checked: [
    "B2B developer scenario audience",
    "B2B fund scenario audience",
    "B2C tourist scenario audience",
    "B2C home buyer scenario audience",
    "segment default scenario validity",
    "role invalid scenario rejection",
    "panel label order",
    "Custom Query state binding",
    "Project Details removal"
  ],
  caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
}, null, 2));
