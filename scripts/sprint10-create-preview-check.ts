import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const repositoryRoot = pathToFileURL(`${process.cwd()}/`);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, repositoryRoot).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* Continue with canonical resolution. */ }
    }
    return nextResolve(specifier, context);
  }
});

// @ts-expect-error -- the pinned Node transform-types runner requires explicit TypeScript extensions.
const create = await import("../src/lib/prototype/point-to-object-create.ts");
// @ts-expect-error -- the pinned Node transform-types runner requires explicit TypeScript extensions.
const preview = await import("../src/lib/prototype/point-to-object-create-preview.ts");

const vertices: Array<[number, number]> = [
  [55.2700, 25.2050],
  [55.2720, 25.2050],
  [55.2720, 25.2065],
  [55.2700, 25.2065]
];
const validation = create.validatePointObjectCreateAoiVertices(vertices);
if (!validation.ok) throw new Error(validation.message);
assert.equal(validation.ok, true);
const aoi = {
  id: "create-aoi-sprint10-preview",
  coordinates: [[...vertices, vertices[0]]],
  areaSqM: validation.measurements.areaSqM,
  perimeterM: validation.measurements.perimeterM,
  vertexCount: vertices.length
};
const programValidation = create.validateRedevelopmentProgram(create.conceptTemplate("commercial_hub", "en"));
if (!programValidation.ok) throw new Error(programValidation.errors.join("; "));
assert.equal(programValidation.ok, true);
const alternatives = create.generateConceptMassingAlternatives(aoi.coordinates, programValidation.value, "sprint10-preview-check", "en");
assert.equal(alternatives.length, 2, "The exact fixture must provide both saved A/B alternatives.");
assert.notEqual(
  JSON.stringify(alternatives[0].massing.featureCollection),
  JSON.stringify(alternatives[1].massing.featureCollection),
  "A/B saved geometries must remain distinct."
);

for (const alternative of alternatives) {
  const snapshot = JSON.stringify({ aoi, massing: alternative.massing });
  const model = preview.buildPointObjectCreatePreviewModel(aoi, alternative.massing);
  assert.ok(model, `Preview model ${alternative.id} must be available.`);
  assert.equal(model.featureCount, alternative.massing.generatedFeatureCount);
  assert.equal(model.maxHeightM, Math.max(...alternative.massing.featureCollection.features.map((feature: any) => feature.properties.heightM)));
  assert.equal(model.minBaseM, Math.min(...alternative.massing.featureCollection.features.map((feature: any) => feature.properties.baseM)));
  assert.equal(JSON.stringify({ aoi, massing: alternative.massing }), snapshot, "Preview derivation must not mutate the saved artifact.");
}

const invalidHeight = structuredClone(alternatives[0].massing);
invalidHeight.featureCollection.features[0].properties.heightM = Number.NaN;
assert.equal(preview.buildPointObjectCreatePreviewModel(aoi, invalidHeight), null, "Invalid saved heights fail closed; the preview must not invent a default.");

const dashboardSource = readFileSync(new URL("../components/point-to-object/create-result-dashboard.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("../components/point-to-object/create-result-preview-3d.tsx", import.meta.url), "utf8");
assert.match(dashboardSource, /dynamic\([\s\S]*ssr: false/, "MapLibre preview must remain a client-only dynamic chunk.");
assert.match(dashboardSource, /create-preview-mode-\$\{mode\}/);
assert.match(dashboardSource, /\(\["2d", "3d"\] as const\)/);
assert.match(previewSource, /sources: \{\}/, "The preview style must be local and tile-free.");
assert.doesNotMatch(previewSource, /https?:\/\//, "The preview must not declare an external network source.");
assert.match(previewSource, /"fill-extrusion-height": \["get", "heightM"\]/);
assert.match(previewSource, /"fill-extrusion-base": \["get", "baseM"\]/);
assert.match(previewSource, /cooperativeGestures: true/, "Touch interaction must preserve page scrolling.");
assert.match(previewSource, /mapRef\.current\?\.remove\(\)/, "Unmount/error cleanup must release the MapLibre context and listeners.");

console.log("sprint10-create-preview-check: PASS (exact A/B saved geometry, actual heights, immutability, local MapLibre and fallback contract)");
