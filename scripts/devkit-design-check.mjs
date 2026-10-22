import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) return next(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return next(`${specifier}.ts`, context); } catch { /* Try the original module. */ }
  }
  return next(specifier, context);
} });
const { conceptTemplate, conceptSiteDefaults } = await import("../src/lib/prototype/point-to-object-create.ts");
const { createDevkitDemoProject, createDevkitCriticalGapProject } = await import("../src/lib/devkit/fixtures.ts");
const { createDesignAlternatives, defaultDesignProgrammes, validateDesignScene, editDesignBuilding,
  measureDesignScene, designSceneFeatureCollection, applyDesignVersions } = await import("../src/lib/devkit/design.ts");
const { designMetricFrame, designPolygonAreaSqM, designPolygonContained, designPolygonsConflict,
  unprojectDesignPosition, validateDesignPolygon } = await import("../src/lib/devkit/geometry.ts");
let calls = 0;
globalThis.fetch = async () => { calls++; throw new Error("Devkit design checks are offline only."); };
const report = [];
function check(name, fn) { fn(); report.push({ name, status: "PASS" }); }
const createdAt = "2026-10-22T15:00:00.000Z";
const project = createDevkitDemoProject("design-check");
const templateOverrides = process.argv.includes("--template-overrides");
// Explicit controlled test fixture only; never repairs shared inputs inside the adapter.
if (templateOverrides) {
  project.designVersions[0].program = conceptSiteDefaults(conceptTemplate("residential_quarter", "en"), project.aoi.coordinates);
  project.designVersions[1].program = conceptSiteDefaults(conceptTemplate("hospitality_recreation", "en"), project.aoi.coordinates);
}
const frozen = JSON.stringify(project);
const start = performance.now();
const result = createDesignAlternatives(project, { createdAt, seed: "design-check" });
assert.ok(result.ok, JSON.stringify(result));
const [a, b] = result.designs;
check("A/B use approved seeds and have substantive different programmes", () => {
  assert.deepEqual(a.program, project.designVersions[0].program);
  assert.deepEqual(b.program, project.designVersions[1].program);
  assert.notDeepEqual(a.program.useMix, b.program.useMix);
  assert.notDeepEqual(a.scene.buildings, b.scene.buildings);
  assert.equal(a.buildings.filter(x => !x.retained).length, a.program.blockCount);
  assert.equal(b.buildings.filter(x => !x.retained).length, b.program.blockCount);
  assert.deepEqual(validateDesignScene(a), []);
  assert.deepEqual(validateDesignScene(b), []);
  assert.equal(JSON.stringify(project), frozen);
  assert.ok(a.scene.buildings.every(x => !b.scene.buildings.some(y => y.id === x.id)));
});
check("Relabelled identical programmes do not count as alternatives", () => {
  const duplicate = structuredClone(project);
  duplicate.designVersions[1].program = { ...structuredClone(duplicate.designVersions[0].program), title: "Different title only", templateId: "civic_green" };
  assert.equal(createDesignAlternatives(duplicate).ok, false);
});
check("Malformed programme returns a failure instead of throwing or mutating", () => {
  const invalid = createDesignAlternatives(project, { programmes: { A: { useMix: null } }, previous: [a, b] });
  assert.equal(invalid.ok, false); assert.equal(invalid.code, "invalid_input");
  assert.strictEqual(invalid.previous[0], a);
});
check("Empty programme seed is not accepted geometry", () => assert.ok(validateDesignScene(project.designVersions[0]).length));
const beforeA = JSON.stringify(a), beforeB = JSON.stringify(b);
const selected = a.scene.buildings[0];
const edit = editDesignBuilding(a, selected.id, { levels: selected.levels + 1, floorHeightM: 3.8, terraceSharePct: 25 }, a.revision, createdAt);
assert.ok(edit.ok, JSON.stringify(edit));
check("Selected building edit preserves neighbours, prior snapshot and B", () => {
  assert.equal(JSON.stringify(a), beforeA);
  assert.equal(JSON.stringify(b), beforeB);
  assert.deepEqual(edit.design.scene.buildings.slice(1), a.scene.buildings.slice(1));
  assert.notEqual(edit.design.id, a.id);
  assert.notEqual(edit.design.scene.geometryRevision, a.scene.geometryRevision);
  assert.equal(edit.design.revision, a.revision + 1);
  assert.deepEqual(edit.design.scene.parent, { kind: "design", id: a.id, revision: a.revision });
  assert.deepEqual(edit.invalidated, ["areas", "finance", "kit"]);
});
check("Terrace area, floor count and canonical render use the same plate", () => {
  const measurements = measureDesignScene(edit.design), building = measurements.buildings[0];
  assert.ok(Math.abs(building.terraceAreaSqM / building.footprintAreaSqM - 0.25) < 1e-9);
  assert.ok(Math.abs(building.grossFloorAreaSqM - (building.footprintAreaSqM * building.levels - building.terraceAreaSqM)) < 1e-6);
  const top = designSceneFeatureCollection(edit.design).features.find(f => f.properties.buildingId === selected.id && f.properties.kind === "terrace_top");
  assert.deepEqual(top.geometry, edit.design.scene.buildings[0].topFloorFootprint);
  assert.equal(top.properties.heightM, (selected.levels + 1) * 3.8);
  assert.equal(top.properties.geometryRevision, measurements.geometryRevision);
});
check("Overlap, outside AOI, stale revision and unsupported edit retain exact last valid scene", () => {
  for (const [patch, expected] of [
    [{ footprint: a.scene.buildings[1].footprint }, a.revision],
    [{ translate: { eastM: 10000, northM: 0 } }, a.revision],
    [{ levels: 0 }, a.revision], [{ levels: 10 }, 999], [{ bogus: true }, a.revision],
    [{ levels: NaN }, a.revision], [{ terraceSharePct: 61 }, a.revision]
  ]) {
    const invalid = editDesignBuilding(a, selected.id, patch, expected, createdAt);
    assert.equal(invalid.ok, false);
    assert.strictEqual(invalid.design, a);
  }
});
check("Canonical A/B and edit survive lossless JSON roundtrip", () => {
  for (const design of [a, b, edit.design]) {
    const restored = JSON.parse(JSON.stringify(design));
    assert.deepEqual(validateDesignScene(restored), []);
    assert.deepEqual(measureDesignScene(restored), measureDesignScene(design));
    assert.deepEqual(designSceneFeatureCollection(restored), designSceneFeatureCollection(design));
  }
});
check("Tampered canonical quantities or programme do not validate", () => {
  const tampered = structuredClone(a); tampered.scene.buildings[0].heightM++;
  assert.ok(validateDesignScene(tampered).length);
  const tamperedProgramme = structuredClone(a); tamperedProgramme.program.levelsMax++;
  assert.ok(validateDesignScene(tamperedProgramme).length);
});
check("Critical missing evidence blocks geometry; explicit override stays marked draft", () => {
  const gap = createDevkitCriticalGapProject();
  const blocked = createDesignAlternatives(gap, { previous: [a, b], createdAt });
  assert.equal(blocked.ok, false); assert.equal(blocked.code, "critical_gap");
  assert.strictEqual(blocked.previous[0], a);
  const draft = createDesignAlternatives(gap, { allowUnverifiedDraft: true, createdAt,
    ...(templateOverrides ? { programmes: { A: project.designVersions[0].program, B: project.designVersions[1].program } } : {}) });
  assert.ok(draft.ok, JSON.stringify(draft));
  assert.ok(draft.designs.every(d => d.status === "review_required" && d.assumptions.some(x => x.includes("Unverified draft override"))));
});
const frame = designMetricFrame(a.scene.aoi);
const polygon = points => ({ type: "Polygon", coordinates: [[...points.map(p => unprojectDesignPosition(p, frame)), unprojectDesignPosition(points[0], frame)]] });
check("Concave AOI edge crossing is rejected despite all child vertices inside", () => {
  const parent = polygon([[0,0],[100,0],[100,100],[60,100],[60,40],[40,40],[40,100],[0,100]]);
  const child = polygon([[20,60],[80,60],[80,80],[20,80]]);
  assert.equal(designPolygonContained(child, parent, frame), false);
  assert.equal(designPolygonContained(polygon([[2,2],[10,2],[10,10],[2,10]]), parent, frame), true);
});
check("Area units, edge contact, crossing and unsupported geometry are explicit", () => {
  const square = polygon([[0,0],[100,0],[100,100],[0,100]]);
  assert.ok(Math.abs(designPolygonAreaSqM(square, frame) - 10000) < 1e-5);
  assert.equal(designPolygonsConflict(square, polygon([[100,0],[120,0],[120,20],[100,20]]), frame), true);
  assert.equal(designPolygonsConflict(polygon([[40,-10],[60,-10],[60,110],[40,110]]), polygon([[-10,40],[110,40],[110,60],[-10,60]]), frame), true);
  assert.equal(designPolygonsConflict(square, polygon([[101,0],[120,0],[120,20],[101,20]]), frame), false);
  assert.ok(validateDesignPolygon({ ...square, coordinates: [...square.coordinates, square.coordinates[0]] }).length);
  assert.ok(validateDesignPolygon(polygon([[0,0],[100,100],[100,0],[0,100]])).length);
  const wrongCrs = structuredClone(project); wrongCrs.aoi.crs = "unknown";
  assert.equal(createDesignAlternatives(wrongCrs).ok, false);
});
const protectedProject = structuredClone(project);
const xs = a.scene.aoi.coordinates[0].map(p => p[0]), ys = a.scene.aoi.coordinates[0].map(p => p[1]);
const lonMin = Math.min(...xs), latMin = Math.min(...ys), lonMax = Math.max(...xs), latMax = Math.max(...ys);
function cornerBox(lon, lat) { return { type: "Polygon", coordinates: [[[lon,lat],[lon+0.00001,lat],[lon+0.00001,lat+0.00001],[lon,lat+0.00001],[lon,lat]]] }; }
protectedProject.objects.push({ id: "retained-1", kind: "building", label: "Synthetic retained building", sourceFeatureId: null,
  geometry: cornerBox(lonMin + 0.00001, latMin + 0.00001), crs: "EPSG:4326", trust: "synthetic", evidenceIds: [] });
protectedProject.constraints.push({ id: "exclude-1", subjectId: protectedProject.aoi.id, label: "Synthetic exclusion", status: "assumed", severity: "warning",
  geometry: cornerBox(lonMax - 0.00003, latMax - 0.00003), evidenceIds: [], impact: "Do not build here", nextAction: "Review source" });
const retainedParameters = [{ objectId: "retained-1", use: "civic", levels: null, heightM: null, assumptionIds: ["synthetic_use"] }];
const protectedResult = createDesignAlternatives(protectedProject, { retainedBuildings: retainedParameters, exclusionConstraintIds: ["exclude-1"], createdAt });
assert.ok(protectedResult.ok, JSON.stringify(protectedResult));
check("Preserved geometry and exclusion survive; unknown floors remain null", () => {
  const design = protectedResult.designs[0];
  assert.deepEqual(design.scene.buildings.find(x => x.retained).footprint, protectedProject.objects[0].geometry);
  assert.deepEqual(design.scene.exclusionZones[0].geometry, protectedProject.constraints[0].geometry);
  const measurement = measureDesignScene(design);
  assert.equal(measurement.grossFloorAreaSqM, null);
  assert.equal(measurement.terraceAreaSqM, null);
  assert.equal(measurement.buildings.find(x => x.retained).terraceAreaSqM, null);
  assert.equal(measurement.buildings.find(x => x.retained).levels, null);
  assert.ok(measurement.missingInputs.length);
  assert.equal(designSceneFeatureCollection(design).features.find(f => f.properties.retained).properties.heightM, null);
  assert.equal(editDesignBuilding(design, "retained-1", { levels: 4 }, design.revision).ok, false);
});
check("Regeneration does not silently discard retained/excluded objects", () => {
  const attached = applyDesignVersions(protectedProject, protectedResult.designs);
  const regenerated = createDesignAlternatives(attached, { createdAt });
  assert.ok(regenerated.ok, JSON.stringify(regenerated));
  assert.deepEqual(regenerated.designs[0].retainedObjectIds, ["retained-1"]);
  assert.deepEqual(regenerated.designs[0].exclusionConstraintIds, ["exclude-1"]);
});
check("Impossible exclusion preserves all prior designs and does not mutate input", () => {
  const impossible = structuredClone(protectedProject);
  impossible.constraints[0].geometry = structuredClone(a.scene.aoi);
  const before = JSON.stringify(impossible);
  const blocked = createDesignAlternatives(impossible, { retainedBuildings: retainedParameters, exclusionConstraintIds: ["exclude-1"], previous: protectedResult.designs, createdAt });
  assert.equal(blocked.ok, false); assert.equal(blocked.code, "no_fit");
  assert.strictEqual(blocked.previous, protectedResult.designs);
  assert.equal(JSON.stringify(impossible), before);
});
check("Only changed variant dependency descendants become stale", () => {
  const attached = applyDesignVersions(project, [a, b]);
  const artifact = (kind, id, inputs) => ({ kind, id, revision: 1, inputRevision: 1, inputs, createdAt, status: "current", methodVersion: "synthetic", assumptions: [], missingInputs: [], data: {} });
  attached.derivedArtifacts = [artifact("areas", "areas-a", [{kind:"design",id:a.id,revision:a.revision}]),
    artifact("areas", "areas-b", [{kind:"design",id:b.id,revision:b.revision}]),
    artifact("finance", "finance-a", [{kind:"areas",id:"areas-a",revision:1}]),
    artifact("kit", "kit-a", [{kind:"finance",id:"finance-a",revision:1}])];
  const changed = applyDesignVersions(attached, [edit.design]);
  assert.equal(changed.derivedArtifacts[0].status, "stale");
  assert.equal(changed.derivedArtifacts[1].status, "current");
  assert.strictEqual(changed.derivedArtifacts[1], attached.derivedArtifacts[1]);
  assert.equal(changed.derivedArtifacts[2].status, "stale");
  assert.equal(changed.derivedArtifacts[3].status, "stale");
  assert.ok(changed.designVersions.some(d => d.id === a.id));
  const wrongProject = { ...attached, id: "another-project" };
  assert.throws(() => applyDesignVersions(wrongProject, [edit.design]));
  assert.throws(() => applyDesignVersions({ ...attached, inputRevision: 2 }, [edit.design]));
  const changedWithoutRevision = structuredClone(attached); changedWithoutRevision.brief.strategy = "Changed input without revision";
  assert.throws(() => applyDesignVersions(changedWithoutRevision, [edit.design]));
});
if (process.argv.includes("--ssr")) {
  const ts = await import("typescript");
  registerHooks({ load(url, context, next) {
    if (url.endsWith(".tsx")) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      fileName: new URL(url).pathname, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
    }).outputText };
    return next(url, context);
  } });
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { DevkitDesignPanel } = await import("../components/devkit/design-panel.tsx");
  check("EN/RU component SSR renders draft and canonical scene without browser or network", () => {
    const warnings = [], originalError = console.error;
    console.error = (...args) => warnings.push(args.map(String).join(" "));
    try {
    const draftHtml = renderToStaticMarkup(createElement(DevkitDesignPanel, { project, onChange() {}, locale: "en" }));
    assert.ok(draftHtml.includes("empty buildings are not a design result"));
    assert.ok(!draftHtml.includes("<svg"));
    const changedProject = applyDesignVersions(applyDesignVersions(project, [a, b]), [edit.design]);
    for (const locale of ["en", "ru"]) {
      const html = renderToStaticMarkup(createElement(DevkitDesignPanel, { project: changedProject, onChange() {}, locale }));
      assert.ok(html.includes("<svg")); assert.ok(html.includes('name="terraceSharePct"'));
      assert.ok(html.includes(locale === "ru" ? "Применить к корпусу" : "Apply to building"));
      assert.ok(html.includes(edit.design.scene.geometryRevision));
    }
    for (const locale of ["en", "ru"]) {
      const gapHtml = renderToStaticMarkup(createElement(DevkitDesignPanel, { project: createDevkitCriticalGapProject(), onChange() {}, locale }));
      const consent = gapHtml.match(/<input[^>]*name="allowUnverifiedDraft"[^>]*>/)?.[0];
      assert.ok(consent, "Critical gap draft consent must be available");
      assert.ok(!/\bchecked\b/.test(consent), "Draft override must be off on initial render/remount");
      assert.ok(gapHtml.includes(locale === "ru" ? "Это не подтверждает права" : "This does not confirm rights"));
    }
    assert.deepEqual(warnings, [], "SSR must not emit React render warnings");
    } finally { console.error = originalError; }
  });
}
assert.equal(calls, 0);
const output = { status: templateOverrides ? "PASS_TARGETED_WITH_SHARED_FIXTURE_BLOCKER" : "PASS", sharedFixturePositive: templateOverrides ? "BLOCKED" : "PASS", methodVersion: "devkit-design-1", checks: report, checkCount: report.length,
  elapsedMs: Math.round(performance.now() - start), networkCalls: calls, runtime: process.version,
  scope: "Synthetic offline module checks; not browser, full build, CI, hosted persistence or statutory validation." };
const exampleIndex = process.argv.indexOf("--example");
if (exampleIndex >= 0) {
  const snapshot = applyDesignVersions(applyDesignVersions(project, [a, b]), [edit.design]);
  writeFileSync(process.argv[exampleIndex + 1], `${JSON.stringify({
    schemaVersion: 1, dataClass: "synthetic_demo", source: templateOverrides ? "explicit_template_overrides" : "shared_foundation_fixture",
    project: snapshot, measurements: [measureDesignScene(edit.design), measureDesignScene(b)],
    sceneFeatures: [designSceneFeatureCollection(edit.design), designSceneFeatureCollection(b)]
  }, null, 2)}\n`);
}
const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0) writeFileSync(process.argv[outputIndex + 1], `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output));
