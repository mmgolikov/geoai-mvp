import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const moduleCache = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveModule(id) {
  const relative = id.startsWith("@/") ? id.slice(2) : id;
  const candidates = [relative, `${relative}.ts`, path.join(relative, "index.ts")];
  const file = candidates.find((candidate) => fs.existsSync(path.join(process.cwd(), candidate)));
  if (!file) throw new Error(`Unable to resolve ${id}`);
  return path.join(process.cwd(), file);
}

function load(id) {
  const file = resolveModule(id);
  if (moduleCache.has(file)) return moduleCache.get(file);
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false
    }
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(file, module.exports);
  vm.runInNewContext(
    output,
    { module, exports: module.exports, require: (request) => load(request), Date, Math },
    { filename: file }
  );
  moduleCache.set(file, module.exports);
  return module.exports;
}

const { calculatePolygonMeasurements, maxAoiVertices, validatePolygonVertices } = load(
  "@/src/lib/polygon-aoi"
);

const validDubaiPolygon = [
  [55.2675, 25.1815],
  [55.2745, 25.1805],
  [55.2762, 25.1868],
  [55.2692, 25.1882]
];
const valid = validatePolygonVertices(validDubaiPolygon);
assert(valid.valid, "representative Dubai polygon must pass");
assert(valid.measurements?.areaSqM > 100, "server-authoritative area must be recomputed");
assert(valid.measurements?.bbox.length === 4, "server-authoritative bbox must be recomputed");

const adversarialCases = [
  {
    name: "not enough vertices",
    vertices: [[55.2, 25.1], [55.3, 25.2]],
    expected: "at least 3 vertices"
  },
  {
    name: "NaN longitude",
    vertices: [[Number.NaN, 25.1], [55.3, 25.2], [55.4, 25.1]],
    expected: "finite numbers"
  },
  {
    name: "infinite latitude",
    vertices: [[55.2, 25.1], [55.3, Number.POSITIVE_INFINITY], [55.4, 25.1]],
    expected: "finite numbers"
  },
  {
    name: "longitude outside WGS84",
    vertices: [[181, 25.1], [55.3, 25.2], [55.4, 25.1]],
    expected: "valid WGS84"
  },
  {
    name: "latitude outside WGS84",
    vertices: [[55.2, -91], [55.3, 25.2], [55.4, 25.1]],
    expected: "valid WGS84"
  },
  {
    name: "wrong coordinate arity",
    vertices: [[55.2, 25.1, 7], [55.3, 25.2], [55.4, 25.1]],
    expected: "exactly [longitude, latitude]"
  },
  {
    name: "consecutive duplicate",
    vertices: [[55.2, 25.1], [55.2, 25.1], [55.4, 25.1]],
    expected: "duplicate consecutive vertices"
  },
  {
    name: "self intersection",
    vertices: [[55.2, 25.1], [55.4, 25.3], [55.4, 25.1], [55.2, 25.3]],
    expected: "edges intersect"
  },
  {
    name: "antimeridian crossing",
    vertices: [[179.9, 10], [-179.9, 10], [-179.9, 10.2], [179.9, 10.2]],
    expected: "antimeridian"
  },
  {
    name: "vertex complexity",
    vertices: Array.from({ length: maxAoiVertices + 1 }, (_, index) => [55 + index * 1e-6, 25]),
    expected: `${maxAoiVertices}-vertex`
  }
];

for (const testCase of adversarialCases) {
  const result = validatePolygonVertices(testCase.vertices);
  assert(!result.valid, `${testCase.name} must fail closed`);
  assert(result.message.includes(testCase.expected), `${testCase.name} returned an unexpected reason: ${result.message}`);
}

const measurement = calculatePolygonMeasurements(validDubaiPolygon);
assert(Number.isFinite(measurement.areaSqM), "area output must be finite");
assert(Number.isFinite(measurement.perimeterM), "perimeter output must be finite");
assert(Number.isFinite(measurement.centroid.longitude), "centroid longitude must be finite");
assert(Number.isFinite(measurement.centroid.latitude), "centroid latitude must be finite");

console.log(`AOI integrity contract passed (${adversarialCases.length + 1} geometry personas).`);
