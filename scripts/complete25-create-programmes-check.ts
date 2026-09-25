import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import type { ConceptPosition, ConceptTemplateId } from "../src/lib/prototype/point-to-object-create";
import type { PointObjectGeneratedConcept } from "../src/lib/prototype/point-to-object-create-result";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    try { return next(`${specifier}.ts`, context); } catch { /* canonical resolution below */ }
  }
  return next(specifier, context);
} });
const geometry = await import("../src/lib/prototype/point-to-object-create");
const { CONCEPT_TEMPLATE_IDS, conceptTemplate, conceptTemplates, isConceptTemplateId, validateRedevelopmentProgram,
  generateConceptMassingAlternatives, validateConceptMassingGeometry } = geometry;
const { calculatePolygonMeasurements } = await import("../src/lib/polygon-aoi");
const { POINT_OBJECT_CREATE_CONTROL_KEYS, validatePointObjectCreateLockedControlKeys, buildPointObjectCreateResponsesRequest,
  parsePointObjectCreateProgram, POINT_OBJECT_CREATE_DEFAULT_PROFILES } = await import("../src/lib/prototype/point-to-object-create-ai-core");
const { POINT_OBJECT_CREATE_RESULT_CAVEAT, parsePointObjectGeneratedConcept } = await import("../src/lib/prototype/point-to-object-create-result");
const { createPointObjectCreateEditorScopeKey, restorePointObjectCreateEditorSnapshot } = await import("../src/lib/prototype/point-to-object-create-editor");
const { serializePointObjectCreateSession, parsePointObjectCreateSessionState } = await import("../src/lib/prototype/point-to-object-create-session");
const { isPointObjectMarketKey } = await import("../src/lib/prototype/point-to-object-markets");
const { preflightPointObjectCreate } = await import("../src/lib/prototype/point-to-object-create-orchestration");

assert.equal(CONCEPT_TEMPLATE_IDS.length, 5);
assert.equal(new Set(CONCEPT_TEMPLATE_IDS).size, 5);
assert.deepEqual(CONCEPT_TEMPLATE_IDS.slice(0, 3), ["residential_mixed_use", "commercial_hub", "civic_green"]);
for (const locale of ["en", "ru"] as const) {
  assert.deepEqual(conceptTemplates(locale).map(p => p.templateId), [...CONCEPT_TEMPLATE_IDS]);
  for (const id of CONCEPT_TEMPLATE_IDS) assert.ok(validateRedevelopmentProgram(conceptTemplate(id, locale)).ok);
}
// Original numeric/style contracts stay unchanged; saved programmes are parsed
// from their own values, never upgraded to current template defaults.
const originals = {
  residential_mixed_use: ["courtyard", 5, 6, 12, 38, 35, 8],
  commercial_hub: ["towers_on_podium", 4, 14, 32, 42, 25, 10],
  civic_green: ["campus", 6, 3, 8, 28, 50, 12]
};
for (const [id, expected] of Object.entries(originals)) {
  const p = conceptTemplate(id as ConceptTemplateId, "en");
  assert.deepEqual([p.massingStyle, p.blockCount, p.levelsMin, p.levelsMax, p.targetSiteCoveragePct, p.openSpacePct, p.setbackM], expected);
}
for (const invalid of ["", "hotel", "__proto__", "constructor", "residential_quarter ", null, {}, 1]) {
  assert.equal(isConceptTemplateId(invalid), false);
  assert.equal(validateRedevelopmentProgram({ ...conceptTemplate("residential_quarter", "en"), templateId: invalid }).ok, false);
}

// Execute the actual route's pure body validator with its actual dependencies.
// No auth, runtime environment, source broker or provider is invoked by this check.
const routeSource = readFileSync(new URL("../app/api/prototype/point-to-object/create/route.ts", import.meta.url), "utf8");
const validatorSource = routeSource.slice(routeSource.indexOf("function validCoordinates("), routeSource.indexOf("function profileFor("));
assert.ok(validatorSource.includes("function validBody("));
const validBody = new Function("isRecord", "isPointObjectMarketKey", "isConceptTemplateId", "validatePointObjectCreateLockedControlKeys",
  `${stripTypeScriptTypes(validatorSource, { mode: "transform" })}; return validBody;`)(
  (value: unknown) => value !== null && typeof value === "object" && !Array.isArray(value),
  isPointObjectMarketKey, isConceptTemplateId, validatePointObjectCreateLockedControlKeys
) as (value: unknown) => boolean;

const origin: ConceptPosition = [55.28, 25.2];
function aoi(points: number[][]): ConceptPosition[][] {
  const ring = points.map(([x, y]) => [origin[0] + x / (111320 * Math.cos(origin[1] * Math.PI / 180)), origin[1] + y / 110540] as ConceptPosition);
  return [[...ring, ring[0]]];
}
const shapes = {
  rectangle: aoi([[0, 0], [400, 0], [400, 300], [0, 300]]),
  concave: aoi([[0, 0], [900, 0], [900, 350], [380, 350], [380, 950], [0, 950]])
};
function controls(p: ReturnType<typeof conceptTemplate>) {
  return { blockCount: p.blockCount, levelsMin: p.levelsMin, levelsMax: p.levelsMax,
    targetSiteCoveragePct: p.targetSiteCoveragePct, openSpacePct: p.openSpacePct, setbackM: p.setbackM };
}
function inside(point: number[], ring: number[][]): boolean {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
const signatures = new Map<string, string>();
for (const id of CONCEPT_TEMPLATE_IDS) {
  const p = conceptTemplate(id, "en");
  const parsed = validateRedevelopmentProgram(p);
  assert.ok(parsed.ok);
  const requested = buildPointObjectCreateResponsesRequest({ locale: "en", templateId: id, customPrompt: null,
    aoiAreaSqM: 120000, aoiWidthM: 400, aoiHeightM: 300, requestedParameters: controls(p) }, POINT_OBJECT_CREATE_DEFAULT_PROFILES.quick);
  assert.deepEqual(requested.text.format.schema.properties.templateId.enum, [id]);
  assert.equal(parsePointObjectCreateProgram(JSON.stringify(p), id, "en").ok, true);
  assert.equal(parsePointObjectCreateProgram(JSON.stringify({ ...p, templateId: "unknown" }), id, "en").ok, false);
  for (const [shape, coordinates] of Object.entries(shapes)) {
    const start = performance.now();
    const alternatives = generateConceptMassingAlternatives(coordinates, parsed.value, `complete25:${id}:${shape}`);
    assert.equal(alternatives.length, 2);
    assert.notDeepEqual(alternatives[0].massing.featureCollection.features.map(f => f.geometry),
      alternatives[1].massing.featureCollection.features.map(f => f.geometry), "A/B must change geometry");
    assert.deepEqual(generateConceptMassingAlternatives(coordinates, parsed.value, `complete25:${id}:${shape}`), alternatives);
    for (const { massing } of alternatives) {
      assert.deepEqual(validateConceptMassingGeometry(coordinates, parsed.value, massing), []);
      assert.equal(massing.generatedBlockCount, p.blockCount);
      assert.ok(Math.abs(massing.achievedSiteCoveragePct - p.targetSiteCoveragePct) <= 0.1);
      assert.equal(massing.minGeneratedLevels, p.levelsMin);
      assert.equal(massing.maxGeneratedLevels, p.levelsMax);
      for (const f of massing.featureCollection.features) {
        assert.equal(f.properties.templateId, id);
        assert.notEqual(f.properties.use as string, "open_space", "No fabricated landscape extrusion");
        for (const vertex of f.geometry.coordinates[0]) assert.ok(inside(vertex, coordinates[0]), "Independent AOI containment");
      }
      if (id === "residential_quarter" || id === "hospitality_recreation") {
        const primary = massing.featureCollection.features.filter(f => f.properties.primaryBlock);
        const uses = new Set(primary.map(f => f.properties.use));
        assert.deepEqual(uses, new Set([id === "residential_quarter" ? "residential" : "hospitality", "retail"]));
        assert.ok(primary.some(f => f.properties.footprintForm !== "rectangle"), "Programme includes articulated footprints");
        for (const axis of [0, 1]) {
          const centres = primary.map(f => f.geometry.coordinates[0].slice(0, -1)).map(ring => ring.reduce((sum, point) => sum + point[axis], 0) / ring.length);
          const siteSpan = Math.max(...coordinates[0].map(point => point[axis])) - Math.min(...coordinates[0].map(point => point[axis]));
          assert.ok((Math.max(...centres) - Math.min(...centres)) / siteSpan > 0.4, "Buildings distributed across the site, including concave arms");
        }
      }
    }
    const measurements = calculatePolygonMeasurements(coordinates[0].slice(0, -1));
    const area = { id: `create-aoi-complete25-${shape}`, coordinates, ...measurements, vertexCount: coordinates[0].length - 1 };
    const generated: PointObjectGeneratedConcept = { mode: "openai_concept", generatedAt: "2026-09-25T12:00:00.000Z",
      promptVersion: "POINT_OBJECT_CREATE_COMPLETE25_OFFLINE", program: parsed.value, massing: alternatives[0].massing, alternatives,
      telemetry: { model: "offline", reasoningEffort: "none", latencyMs: 1, attempts: 1, estimatedCostUsd: 0 }, caveat: POINT_OBJECT_CREATE_RESULT_CAVEAT };
    assert.ok(parsePointObjectGeneratedConcept(generated, area));
    const scopeKey = createPointObjectCreateEditorScopeKey({ aoiId: area.id, marketKey: "dubai" });
    const editor = { version: 1 as const, scopeKey, templateId: id, controls: controls(p), lockedControlKeys: [...POINT_OBJECT_CREATE_CONTROL_KEYS], customPrompt: "", committedDraftKey: null };
    assert.deepEqual(restorePointObjectCreateEditorSnapshot(editor, scopeKey), editor);
    const raw = serializePointObjectCreateSession({ marketKey: "dubai", locale: "en", aoi: area, editorSnapshot: editor,
      generated, generatedLocale: "en", activeAlternativeId: "B", areaContext: null, dashboardOpen: true });
    assert.ok(raw);
    const restored = parsePointObjectCreateSessionState(JSON.parse(raw));
    assert.equal(restored?.generated.program.templateId, id);
    assert.equal(restored?.editorSnapshot?.templateId, id);
    assert.equal(restored?.activeAlternativeId, "B");
    assert.deepEqual(restored?.generated.alternatives, alternatives);
    const invalid = structuredClone(generated);
    invalid.massing.featureCollection.features[0].properties.templateId = "unknown" as ConceptTemplateId;
    assert.equal(parsePointObjectGeneratedConcept(invalid, area), null);
    assert.equal(restorePointObjectCreateEditorSnapshot({ ...editor, templateId: "unknown" }, scopeKey), null);
    const body = { marketKey: "dubai", locale: "en", depth: "quick", templateId: id, customPrompt: null,
      controls: controls(p), lockedControlKeys: [...POINT_OBJECT_CREATE_CONTROL_KEYS], aoiCoordinates: coordinates, challenge: "fixture" };
    assert.equal(validBody(body), true);
    assert.equal(validBody({ ...body, templateId: "unknown" }), false);
    assert.equal(validBody({ ...body, extra: true }), false);
    if (id === "residential_quarter" || id === "hospitality_recreation") {
      const preflight = preflightPointObjectCreate({ aoiCoordinates: coordinates, aoiHash: "a".repeat(64), locale: "en",
        templateId: id, customPrompt: null, controls: controls(p), lockedControlKeys: [...POINT_OBJECT_CREATE_CONTROL_KEYS] });
      assert.equal(preflight.kind, "ready", `${id}/${shape}: actual local/server preflight`);
    }
    signatures.set(`${id}/${shape}`, JSON.stringify(alternatives[0].massing.featureCollection.features.map(f => ({ geometry: f.geometry, use: f.properties.use, heightM: f.properties.heightM }))));
    console.log(`${id}/${shape}: geometry, A/B, persistence, route validation PASS (${Math.round(performance.now() - start)}ms)`);
  }
}
assert.equal(new Set([...signatures].filter(([key]) => key.endsWith("/rectangle")).map(([, value]) => value)).size, 5);
for (const id of ["residential_quarter", "hospitality_recreation"] as const) {
  const p = conceptTemplate(id, "en");
  const make = (patch: Partial<typeof p>) => {
    const parsed = validateRedevelopmentProgram({ ...p, ...patch });
    assert.ok(parsed.ok);
    return generateConceptMassingAlternatives(shapes.rectangle, parsed.value, "complete25-fixed-seed")[0].massing;
  };
  const initial = make({});
  assert.equal(make({ blockCount: 6 }).generatedBlockCount, 6);
  assert.equal(make({ levelsMin: 6, levelsMax: 9 }).maxGeneratedLevels, 9);
  assert.ok(Math.abs(make({ targetSiteCoveragePct: 20 }).achievedSiteCoveragePct - 20) < 0.1);
  const footprints = (result: typeof initial) => result.featureCollection.features.map(f => f.geometry);
  assert.notDeepEqual(footprints(make({ setbackM: 20 })), footprints(initial), "Setback affects placement");
  assert.notDeepEqual(footprints(make({ openSpacePct: 30 })), footprints(initial), "Open-space allowance affects separation at fixed coverage and seed");
  const impossible = preflightPointObjectCreate({ aoiCoordinates: aoi([[0, 0], [12, 0], [12, 12], [0, 12]]),
    aoiHash: "b".repeat(64), locale: "en", templateId: id, customPrompt: null, controls: controls(p), lockedControlKeys: [...POINT_OBJECT_CREATE_CONTROL_KEYS] });
  assert.notEqual(impossible.kind, "ready", "Infeasible default geometry is not fabricated");
}
console.log("COMPLETE25 five-programme contracts PASS; zero provider or source requests.");
