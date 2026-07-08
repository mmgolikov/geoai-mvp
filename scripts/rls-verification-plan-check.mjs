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
      throw new Error(`Unexpected runtime dependency while checking RLS verification plan: ${requireId}`);
    }
  }, { filename: sourcePath });
  moduleCache.set(sourcePath, module.exports);
  return module.exports;
}

const {
  requiredRlsTables,
  rlsVerificationCases,
  getRlsVerificationPlanSummary
} = loadTsModule("src/lib/access/rls-verification-plan.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

assert(Array.isArray(requiredRlsTables), "requiredRlsTables must be an array");
assert(Array.isArray(rlsVerificationCases), "rlsVerificationCases must be an array");
assert(requiredRlsTables.length > 0, "requiredRlsTables must not be empty");
assert(rlsVerificationCases.length > 0, "rlsVerificationCases must not be empty");

for (const table of requiredRlsTables) {
  const tableCases = rlsVerificationCases.filter((item) => item.table === table);
  assert(tableCases.length > 0, `${table} must have verification cases`);
  assert(tableCases.some((item) => item.mode === "positive"), `${table} must have at least one positive case`);
  assert(tableCases.some((item) => item.mode === "negative"), `${table} must have at least one negative case`);
}

for (const item of rlsVerificationCases) {
  assert(requiredRlsTables.includes(item.table), `${item.table} is not in requiredRlsTables`);
  assert(hasText(item.persona), `${item.table} case is missing persona`);
  assert(hasText(item.action), `${item.table} case is missing action`);
  assert(hasText(item.expectedResult), `${item.table} case is missing expected result`);
  assert(item.mode === "positive" || item.mode === "negative", `${item.table} case has invalid mode`);
  assert(hasText(item.diagnosticNote), `${item.table} case is missing diagnostic note`);
  assert(hasText(item.caveat), `${item.table} case is missing caveat`);
}

const serializedPlan = JSON.stringify({
  requiredRlsTables,
  rlsVerificationCases
});

const forbiddenPatterns = [
  /password/i,
  /magic[- ]?link/i,
  /bearer/i,
  /\btoken\b/i,
  /\bjwt\b/i,
  /service[-_ ]?key/i,
  /service[-_ ]?role/i,
  /raw[-_ ]?env/i,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /confidential file/i
];

for (const pattern of forbiddenPatterns) {
  assert(!pattern.test(serializedPlan), `RLS plan contains forbidden fixture pattern: ${pattern}`);
}

const summary = getRlsVerificationPlanSummary();
assert(summary.totalTables === requiredRlsTables.length, "summary totalTables is incorrect");
assert(summary.totalCases === rlsVerificationCases.length, "summary totalCases is incorrect");
assert(summary.positiveCases > 0, "summary positiveCases must be positive");
assert(summary.negativeCases > 0, "summary negativeCases must be positive");
assert(Array.isArray(summary.missingTables), "summary missingTables must be an array");
assert(summary.missingTables.length === 0, `summary has missing tables: ${summary.missingTables.join(", ")}`);
assert(summary.readinessStatus === "mock_validated", `summary readinessStatus must be mock_validated, got ${summary.readinessStatus}`);
assert(summary.previewVerified === false, "summary must not claim Preview verification");

console.log(JSON.stringify({
  ok: true,
  checked: [
    "required table coverage",
    "positive case per table",
    "negative case per table",
    "case required fields",
    "fixture secret/value scan",
    "summary consistency",
    "Preview verification not claimed"
  ],
  totalTables: summary.totalTables,
  totalCases: summary.totalCases,
  positiveCases: summary.positiveCases,
  negativeCases: summary.negativeCases,
  readinessStatus: summary.readinessStatus,
  caveat: summary.caveat
}, null, 2));
