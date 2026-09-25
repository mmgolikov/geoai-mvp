import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
registerHooks({ resolve(s, c, next) {
  if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return next(`${s}.ts`, c); } catch { /* original resolver */ } }
  return next(s, c);
} });
// Optional explicit product checkout permits read-only integration testing of
// this helper before the root integrates it. Default is this same repository.
const productModule = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2], "src/lib/prototype/point-to-object-create.ts"))
  : new URL("../src/lib/prototype/point-to-object-create.ts", import.meta.url);
const product = await import(productModule.href);
const { assertIndependentQuality20CreateMassing } = await import("../tests/e2e/helpers/quality20-create-geometry.ts");
const { quality20CreateControls } = await import("../tests/e2e/helpers/quality20-frozen-case.ts");
const programmes = ["residential_mixed_use", "commercial_hub", "civic_green", "residential_quarter", "hospitality_recreation"];
assert.deepEqual(product.CONCEPT_TEMPLATE_IDS, programmes, "Integrate the reviewed five-programme product before runtime verification");
const shapes = { rectangle: [[-250, -250], [250, -250], [250, 250], [-250, 250]],
  concave: [[0, 0], [1000, 0], [1000, 340], [400, 340], [400, 1000], [0, 1000]] };
let checked = 0;
for (const template of programmes) for (const [name, points] of Object.entries(shapes)) {
  // Labelled synthetic fixtures, never acceptance AOIs or the founder polygon.
  const vertices = points.map(([x, y]) => [55.2 + x / (111320 * Math.cos(25.2 * Math.PI / 180)), 25.2 + y / 110540]);
  const coordinates = [[...vertices, vertices[0]]];
  const controls = quality20CreateControls(template);
  const defaults = product.conceptTemplate(template, "en");
  for (const [key, value] of Object.entries(controls)) assert.equal(defaults[key], value, `${template}: preregistered numeric default drift`);
  const validated = product.validateRedevelopmentProgram({ ...defaults, ...controls });
  assert.ok(validated.ok, JSON.stringify(validated));
  const alternatives = product.generateConceptMassingAlternatives(coordinates, validated.value, `COMPLETE25-OFFLINE:${template}:${name}`);
  assert.equal(alternatives.length, 2);
  assert.notDeepEqual(alternatives[0].massing.featureCollection.features.map(f => f.geometry), alternatives[1].massing.featureCollection.features.map(f => f.geometry));
  for (const { massing } of alternatives) {
    assertIndependentQuality20CreateMassing(coordinates, controls, massing);
    checked++;
  }
}
console.log(JSON.stringify({ status: "PASS", programmeShapeCases: 10, actualGeneratedAlternativesIndependentlyChecked: checked,
  source: "local product generator output; independent coordinate oracle, no live API or actual-source bindings" }));
