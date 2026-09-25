import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    try { return next(`${specifier}.ts`, context); } catch { /* canonical resolution */ }
  }
  return next(specifier, context);
} });
const { CONCEPT_TEMPLATE_IDS, conceptTemplate, generateConceptMassingAlternatives, validateRedevelopmentProgram, validatePointObjectCreateAoiVertices } = await import("../src/lib/prototype/point-to-object-create");
const { buildPointObjectCreatePreviewModel } = await import("../src/lib/prototype/point-to-object-create-preview");
const { fitConceptCamera, projectConceptPosition } = await import("../src/lib/prototype/point-to-object-create-camera");
const vertices: [number, number][] = [[55.278, 25.216], [55.281, 25.216], [55.281, 25.219], [55.278, 25.219]];
const validated = validatePointObjectCreateAoiVertices(vertices);
assert.ok(validated.ok);
const aoi = { id: "camera-aoi", coordinates: [[...vertices, vertices[0]]], ...validated.measurements, vertexCount: 4 };
let count = 0;
for (const programme of CONCEPT_TEMPLATE_IDS) {
  const validatedProgram = validateRedevelopmentProgram(conceptTemplate(programme, "en"));
  assert.ok(validatedProgram.ok);
  for (const { massing } of generateConceptMassingAlternatives(aoi.coordinates, validatedProgram.value, "camera-scene")) {
    const model = buildPointObjectCreatePreviewModel(aoi, massing);
    assert.ok(model);
    const before = JSON.stringify(model);
    for (const viewport of [{ width: 830, height: 520, fieldOfView: 36.86989764584402 }, { width: 326, height: 360, fieldOfView: 36.86989764584402 }]) {
      for (const bearing of [-24, 67]) for (const pitch of [0, 50]) {
        const camera = fitConceptCamera(model, viewport, { bearing, pitch });
        assert.ok(camera, `${programme}/${massing.variantId}/${viewport.width}/${pitch}`);
        const bounds = camera.screenBounds;
        assert.ok(bounds.left >= viewport.width * 0.14 - 0.1 && bounds.right <= viewport.width * 0.86 + 0.1);
        assert.ok(bounds.top > 12 && bounds.bottom < viewport.height - 70);
        const occupancy = Math.max((bounds.right - bounds.left) / viewport.width, (bounds.bottom - bounds.top) / viewport.height);
        assert.ok(occupancy >= 0.68 && occupancy <= 0.73, `proportional ${occupancy} screen occupancy`);
        assert.equal(camera.bearing, bearing);
        assert.equal(camera.pitch, pitch);
        assert.deepEqual(fitConceptCamera(model, viewport, { bearing, pitch }), camera);
        assert.deepEqual(projectConceptPosition([...camera.center, 0], camera, viewport), [viewport.width / 2, viewport.height / 2]);
        count++;
      }
    }
    assert.equal(JSON.stringify(model), before, "camera never changes geometry, heights or metrics");
    const tall = structuredClone(model);
    tall.massingFeatureCollection.features.forEach(feature => { feature.properties.heightM *= 3; });
    const viewport = { width: 830, height: 520, fieldOfView: 36.86989764584402 };
    const standardCamera = fitConceptCamera(model, viewport, { bearing: -24, pitch: 50 });
    const tallCamera = fitConceptCamera(tall, viewport, { bearing: -24, pitch: 50 });
    assert.ok(standardCamera && tallCamera);
    assert.ok(tallCamera.zoom <= standardCamera.zoom + 0.02, "taller saved volumes never lose headroom");
    assert.equal(fitConceptCamera(model, { ...viewport, width: 0 }, { bearing: 0, pitch: 50 }), null);
    assert.equal(fitConceptCamera(model, viewport, { bearing: 0, pitch: 90 }), null);
    assert.equal(fitConceptCamera(model, { ...viewport, fieldOfView: Number.NaN }, { bearing: 0, pitch: 50 }), null);
  }
}
console.log(`COMPLETE25 camera PASS: ${count} programme/variant/viewport/orientation fits; height, occupancy, deterministic, immutable and invalid-input checks.`);
