import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Let Node return the canonical resolution error below.
      }
    }
    return nextResolve(specifier, context);
  }
});

const {
  conceptTemplate,
  generateConceptMassing,
  generateConceptMassingAlternatives,
  validateConceptMassingGeometry,
  validatePointObjectCreateAoiVertices,
  validateRedevelopmentProgram
} = await import("../src/lib/prototype/point-to-object-create");
const {
  boundedPointObjectCreateAttemptTimeout,
  buildPointObjectCreateResponsesRequest,
  createProgramSeed,
  inferPromptMassingStyle,
  parsePointObjectCreateProgram,
  resolvePointObjectCreateModelProfile,
  selectPointObjectCreateRequestedParameters,
  validatePointObjectCreateLockedControlKeys
} = await import("../src/lib/prototype/point-to-object-create-ai-core");
const { calculatePolygonMeasurements } = await import("../src/lib/polygon-aoi");

function geometrySignature(result: ReturnType<typeof generateConceptMassing>) {
  return JSON.stringify(result.featureCollection.features.map((feature) => ({
    coordinates: feature.geometry.coordinates,
    role: feature.properties.volumeRole,
    baseM: feature.properties.baseM,
    heightM: feature.properties.heightM
  })));
}

function featureAreaSqM(feature: ReturnType<typeof generateConceptMassing>["featureCollection"]["features"][number]) {
  return calculatePolygonMeasurements(feature.geometry.coordinates[0].slice(0, -1) as [number, number][]).areaSqM;
}

function assertGeometryContract(
  polygon: [number, number][][],
  program: Parameters<typeof generateConceptMassing>[1],
  result: ReturnType<typeof generateConceptMassing>
) {
  assert.deepEqual(validateConceptMassingGeometry(polygon, program, result), []);
  assert.equal(result.generatedBlockCount, program.blockCount);
  assert.equal(result.generatedFeatureCount, result.featureCollection.features.length);
  assert.ok(Math.abs(result.achievedSiteCoveragePct - program.targetSiteCoveragePct) <= 1,
    "A successful result must honor the requested site-coverage control.");
  assert.equal(new Set(result.featureCollection.features.map((feature) => feature.properties.id)).size, result.generatedFeatureCount);
  const primary = result.featureCollection.features.filter((feature) => feature.properties.primaryBlock);
  assert.equal(primary.length, program.blockCount);
  assert.ok(primary.every((feature) => feature.properties.levels >= program.levelsMin && feature.properties.levels <= program.levelsMax));
  assert.ok(result.featureCollection.features.every((feature) =>
    Number.isFinite(feature.properties.baseM) && Number.isFinite(feature.properties.heightM) &&
    feature.properties.baseM >= 0 && feature.properties.heightM > feature.properties.baseM));
  const modelledFloorArea = result.featureCollection.features.reduce((sum, feature) =>
    sum + featureAreaSqM(feature) * (feature.properties.heightM - feature.properties.baseM) / 3.4, 0);
  assert.ok(Math.abs(modelledFloorArea - result.estimatedFloorAreaSqM) / result.estimatedFloorAreaSqM < 0.025,
    "Modelled floor-area metric must agree with the generated vertical volumes.");
}

const aoi = [[
  [55.278, 25.216],
  [55.281, 25.216],
  [55.281, 25.219],
  [55.278, 25.219],
  [55.278, 25.216]
]] as [number, number][][];

const realisticDrawnAoi = [
  [55.2700, 25.2050],
  [55.2706, 25.2050],
  [55.2706, 25.2056],
  [55.2700, 25.2056]
] as [number, number][];
const realisticValidation = validatePointObjectCreateAoiVertices(realisticDrawnAoi);
assert.equal(realisticValidation.ok, true, "A realistic close-zoom rectangular AOI must remain selectable.");
if (realisticValidation.ok) {
  assert.ok(realisticValidation.measurements.areaSqM > 3_000 && realisticValidation.measurements.areaSqM < 5_000);
}
const tinyValidation = validatePointObjectCreateAoiVertices([
  [55.2700, 25.2050],
  [55.27005, 25.2050],
  [55.27005, 25.20505],
  [55.2700, 25.20505]
]);
assert.equal(tinyValidation.ok, false);
if (tinyValidation.ok === false) assert.equal(tinyValidation.code, "too_small");
const oversizedValidation = validatePointObjectCreateAoiVertices([
  [55.27, 25.20],
  [55.29, 25.20],
  [55.29, 25.22],
  [55.27, 25.22]
]);
assert.equal(oversizedValidation.ok, false);
if (oversizedValidation.ok === false) assert.equal(oversizedValidation.code, "too_large");
const crossingValidation = validatePointObjectCreateAoiVertices([
  [55.2700, 25.2050],
  [55.2710, 25.2060],
  [55.2700, 25.2060],
  [55.2710, 25.2050]
]);
assert.equal(crossingValidation.ok, false);
if (crossingValidation.ok === false) assert.equal(crossingValidation.code, "invalid_geometry");

const programInput = conceptTemplate("residential_mixed_use", "en");
const validated = validateRedevelopmentProgram(programInput);
if (!validated.ok) throw new Error(validated.errors.join("; "));
assert.equal(validated.ok, true);

const first = generateConceptMassing(aoi, validated.value, "geoai-create-check");
const second = generateConceptMassing(aoi, validated.value, "geoai-create-check");
assert.deepEqual(first, second, "Concept massing must be reproducible for the same seed.");
assert.ok(first.generatedBlockCount > 0, "At least one concept block should be generated for a valid AOI.");
assert.ok(first.generatedBlockCount <= validated.value.blockCount);
assert.ok(first.achievedSiteCoveragePct > 0 && first.achievedSiteCoveragePct <= 60);
for (const feature of first.featureCollection.features) {
  assert.equal(feature.properties.kind, "concept_massing");
  assert.ok(feature.properties.heightM > 0);
  assert.deepEqual(feature.geometry.coordinates[0][0], feature.geometry.coordinates[0].at(-1));
}
assertGeometryContract(aoi, validated.value, first);

const alternatives = generateConceptMassingAlternatives(aoi, validated.value, "geoai-create-alternatives", "en");
assert.equal(alternatives.length, 2, "A feasible golden AOI must produce two alternatives from one programme.");
assert.notEqual(geometrySignature(alternatives[0].massing), geometrySignature(alternatives[1].massing),
  "Alternative B must change real geometry or vertical arrangement, not only its label.");
assert.deepEqual(generateConceptMassingAlternatives(aoi, validated.value, "geoai-create-alternatives", "en"), alternatives,
  "Alternative generation must remain deterministic.");

const perimeterValidation = validateRedevelopmentProgram({
  ...programInput,
  massingStyle: "perimeter",
  blockCount: 4,
  levelsMin: 7,
  levelsMax: 7,
  targetSiteCoveragePct: 30
});
if (!perimeterValidation.ok) throw new Error(perimeterValidation.errors.join("; "));
const perimeter = generateConceptMassing(aoi, perimeterValidation.value, "geoai-perimeter");
assertGeometryContract(aoi, perimeterValidation.value, perimeter);
assert.ok(perimeter.featureCollection.features.every((feature) => feature.properties.volumeRole === "perimeter_wing"));
assert.ok(perimeter.featureCollection.features.every((feature) => feature.properties.levels === 7),
  "Fixed min=max height must remain fixed across all primary blocks.");
const perimeterAlternatives = generateConceptMassingAlternatives(aoi, perimeterValidation.value, "geoai-perimeter-alternatives");
assert.equal(perimeterAlternatives.length, 2);
assert.notEqual(geometrySignature(perimeterAlternatives[0].massing), geometrySignature(perimeterAlternatives[1].massing));

const commercialProgram = conceptTemplate("commercial_hub", "en");
const commercialValidation = validateRedevelopmentProgram(commercialProgram);
if (!commercialValidation.ok) throw new Error(commercialValidation.errors.join("; "));
const towers = generateConceptMassing(aoi, commercialValidation.value, "geoai-towers");
assertGeometryContract(aoi, commercialValidation.value, towers);
const podium = towers.featureCollection.features.find((feature) => feature.properties.volumeRole === "podium");
const towerFeatures = towers.featureCollection.features.filter((feature) => feature.properties.volumeRole === "tower");
assert.ok(podium, "Tower family must contain a physical podium feature.");
assert.equal(towerFeatures.length, commercialProgram.blockCount);
assert.equal(towers.generatedFeatureCount, commercialProgram.blockCount + 1);
assert.ok(towerFeatures.every((feature) => feature.properties.baseM === podium.properties.heightM && feature.properties.heightM > feature.properties.baseM),
  "Every tower must start at the podium top and retain a positive vertical span.");
assert.ok(new Set(towerFeatures.map((feature) => feature.properties.levels)).size > 1,
  "A non-fixed tower range must produce a stepped primary skyline.");
const towerAlternatives = generateConceptMassingAlternatives(aoi, commercialValidation.value, "geoai-tower-alternatives");
assert.equal(towerAlternatives.length, 2);
assert.notEqual(geometrySignature(towerAlternatives[0].massing), geometrySignature(towerAlternatives[1].massing));

const civicProgram = conceptTemplate("civic_green", "en");
const civicValidation = validateRedevelopmentProgram(civicProgram);
if (!civicValidation.ok) throw new Error(civicValidation.errors.join("; "));
const campus = generateConceptMassing(aoi, civicValidation.value, "geoai-campus");
assertGeometryContract(aoi, civicValidation.value, campus);
assert.ok(campus.featureCollection.features.every((feature) => feature.properties.volumeRole === "campus_block"));
assert.ok(campus.featureCollection.features.some((feature) => {
  const [firstPoint, secondPoint] = feature.geometry.coordinates[0];
  return Math.abs(firstPoint[0] - secondPoint[0]) > 1e-8 && Math.abs(firstPoint[1] - secondPoint[1]) > 1e-8;
}), "Campus geometry must include genuinely oriented footprints.");
const campusAlternatives = generateConceptMassingAlternatives(aoi, civicValidation.value, "geoai-campus-alternatives");
assert.equal(campusAlternatives.length, 2);
assert.notEqual(geometrySignature(campusAlternatives[0].massing), geometrySignature(campusAlternatives[1].massing));
const overlapCounterexample = structuredClone(campus);
overlapCounterexample.featureCollection.features[1].geometry.coordinates = structuredClone(
  overlapCounterexample.featureCollection.features[0].geometry.coordinates
);
assert.ok(validateConceptMassingGeometry(aoi, civicValidation.value, overlapCounterexample)
  .some((error) => /overlap/.test(error)), "Geometry validation must reject unintended footprint overlap.");

assert.notEqual(geometrySignature(first), geometrySignature(perimeter));
assert.notEqual(geometrySignature(first), geometrySignature(towers));
assert.notEqual(geometrySignature(first), geometrySignature(campus));

const concaveAoi = [[
  [55.2780, 25.2160],
  [55.2820, 25.2160],
  [55.2820, 25.2172],
  [55.2797, 25.2172],
  [55.2797, 25.2200],
  [55.2780, 25.2200],
  [55.2780, 25.2160]
]] as [number, number][][];
const concaveCampus = generateConceptMassing(concaveAoi, civicValidation.value, "geoai-concave-campus");
assertGeometryContract(concaveAoi, civicValidation.value, concaveCampus);

const uShapedAoi = [[
  [55.2780, 25.2160],
  [55.2820, 25.2160],
  [55.2820, 25.2200],
  [55.2810, 25.2200],
  [55.2810, 25.2172],
  [55.2790, 25.2172],
  [55.2790, 25.2200],
  [55.2780, 25.2200],
  [55.2780, 25.2160]
]] as [number, number][][];
const uProgramValidation = validateRedevelopmentProgram({
  ...civicProgram,
  blockCount: 1,
  levelsMin: 4,
  levelsMax: 4,
  targetSiteCoveragePct: 8,
  setbackM: 2
});
if (!uProgramValidation.ok) throw new Error(uProgramValidation.errors.join("; "));
const uValid = generateConceptMassing(uShapedAoi, uProgramValidation.value, "geoai-u-valid");
const edgeCrossingCounterexample = structuredClone(uValid);
edgeCrossingCounterexample.featureCollection.features[0].geometry.coordinates = [[
  [55.2784, 25.2185],
  [55.2816, 25.2185],
  [55.2816, 25.2190],
  [55.2784, 25.2190],
  [55.2784, 25.2185]
]];
assert.ok(validateConceptMassingGeometry(uShapedAoi, uProgramValidation.value, edgeCrossingCounterexample)
  .some((error) => /AOI setback/.test(error)),
"Containment validation must reject a polygon whose corners are inside separate arms but whose edges bridge a concave void.");

const narrowAoi = [[
  [55.2780, 25.2160],
  [55.2818, 25.2160],
  [55.2818, 25.2167],
  [55.2780, 25.2167],
  [55.2780, 25.2160]
]] as [number, number][][];
const narrowProgramValidation = validateRedevelopmentProgram({
  ...civicProgram,
  blockCount: 3,
  levelsMin: 4,
  levelsMax: 4,
  targetSiteCoveragePct: 20,
  setbackM: 4
});
if (!narrowProgramValidation.ok) throw new Error(narrowProgramValidation.errors.join("; "));
const narrowCampus = generateConceptMassing(narrowAoi, narrowProgramValidation.value, "geoai-narrow-campus");
assertGeometryContract(narrowAoi, narrowProgramValidation.value, narrowCampus);
assert.ok(narrowCampus.featureCollection.features.every((feature) => feature.properties.levels === 4));
const heightMutation = structuredClone(narrowCampus);
heightMutation.featureCollection.features[0].properties.heightM = 17;
heightMutation.estimatedFloorAreaSqM = Number(heightMutation.featureCollection.features.reduce((sum, feature) =>
  sum + featureAreaSqM(feature) * (feature.properties.heightM - feature.properties.baseM) / 3.4, 0).toFixed(1));
assert.ok(validateConceptMassingGeometry(narrowAoi, narrowProgramValidation.value, heightMutation)
  .some((error) => /height must equal/.test(error)),
"Geometry validation must reject a tampered 17 m top for a fixed four-level campus even when floor area is recomputed.");

const centralHoleAoi = [
  aoi[0],
  [
    [55.2790, 25.2170],
    [55.2800, 25.2170],
    [55.2800, 25.2180],
    [55.2790, 25.2180],
    [55.2790, 25.2170]
  ]
] as [number, number][][];
assert.throws(() => generateConceptMassing(centralHoleAoi, validated.value, "geoai-central-hole"),
  /exactly one exterior ring/i, "Interior-ring AOIs must fail closed until the Create surface supports holes.");

const outsideAdditionalRingAoi = [
  aoi[0],
  [
    [55.2900, 25.2300],
    [55.2910, 25.2300],
    [55.2910, 25.2310],
    [55.2900, 25.2310],
    [55.2900, 25.2300]
  ]
] as [number, number][][];
assert.throws(() => generateConceptMassing(outsideAdditionalRingAoi, validated.value, "geoai-outside-ring"),
  /exactly one exterior ring/i, "An extra ring outside the AOI must not be silently treated as supported geometry.");

const symmetryCenter = [55.28, 25.218] as const;
const symmetryHalfWidthLng = 17.5 / (111_320 * Math.cos(symmetryCenter[1] * Math.PI / 180));
const symmetryHalfHeightLat = 12.5 / 110_540;
const symmetryFallbackAoi = [[
  [symmetryCenter[0] - symmetryHalfWidthLng, symmetryCenter[1] - symmetryHalfHeightLat],
  [symmetryCenter[0] + symmetryHalfWidthLng, symmetryCenter[1] - symmetryHalfHeightLat],
  [symmetryCenter[0] + symmetryHalfWidthLng, symmetryCenter[1] + symmetryHalfHeightLat],
  [symmetryCenter[0] - symmetryHalfWidthLng, symmetryCenter[1] + symmetryHalfHeightLat],
  [symmetryCenter[0] - symmetryHalfWidthLng, symmetryCenter[1] - symmetryHalfHeightLat]
]] as [number, number][][];
const symmetryProgramValidation = validateRedevelopmentProgram({
  ...civicProgram,
  blockCount: 2,
  levelsMin: 4,
  levelsMax: 8,
  targetSiteCoveragePct: 16,
  openSpacePct: 50,
  setbackM: 4
});
if (!symmetryProgramValidation.ok) throw new Error(symmetryProgramValidation.errors.join("; "));
const symmetryNativeA = generateConceptMassing(symmetryFallbackAoi, symmetryProgramValidation.value, "scan", "A");
assert.throws(() => generateConceptMassing(symmetryFallbackAoi, symmetryProgramValidation.value, "scan", "B"),
  /fit|achieved/i, "The regression must continue to exercise native B placement failure.");
const symmetryAlternatives = generateConceptMassingAlternatives(
  symmetryFallbackAoi,
  symmetryProgramValidation.value,
  "scan"
);
assert.equal(symmetryAlternatives.length, 2,
  "A centrally symmetric AOI must recover a validated reflected B after native B placement fails.");
assertGeometryContract(symmetryFallbackAoi, symmetryProgramValidation.value, symmetryAlternatives[1].massing);
assert.notEqual(geometrySignature(symmetryNativeA), geometrySignature(symmetryAlternatives[1].massing),
  "The reflected B must contain genuinely distinct opposite-diagonal footprints.");

const impossibleCourtyard = validateRedevelopmentProgram({ ...programInput, blockCount: 3 });
if (!impossibleCourtyard.ok) throw new Error(impossibleCourtyard.errors.join("; "));
assert.throws(() => generateConceptMassing(aoi, impossibleCourtyard.value, "geoai-impossible-court"), /at least four/i);
const impossibleTower = validateRedevelopmentProgram({ ...commercialProgram, levelsMin: 1, levelsMax: 1 });
if (!impossibleTower.ok) throw new Error(impossibleTower.errors.join("; "));
assert.throws(() => generateConceptMassing(aoi, impossibleTower.value, "geoai-impossible-tower"), /at least two levels/i);
const impossibleNarrowCampus = validateRedevelopmentProgram({
  ...civicProgram,
  blockCount: 12,
  targetSiteCoveragePct: 40,
  openSpacePct: 50,
  setbackM: 30
});
if (!impossibleNarrowCampus.ok) throw new Error(impossibleNarrowCampus.errors.join("; "));
assert.throws(() => generateConceptMassing(narrowAoi, impossibleNarrowCampus.value, "geoai-impossible-narrow"), /do not fit|cannot be achieved/i,
  "Impossible narrow-site constraints must fail without emitting a partial concept.");

const russian = conceptTemplate("civic_green", "ru");
assert.match(russian.title, /[А-Яа-яЁё]/);
assert.equal(validateRedevelopmentProgram({ ...russian, useMix: [{ use: "civic", sharePct: 90 }] }).ok, false);
assert.equal(validateRedevelopmentProgram({ ...programInput, unexpected: true }).ok, false,
  "Runtime validation must reject top-level fields outside the strict response schema.");
assert.equal(validateRedevelopmentProgram({ ...programInput, targetSiteCoveragePct: 60, openSpacePct: 75 }).ok, false,
  "Contradictory ground coverage and open-space controls must be rejected.");
assert.equal(validateRedevelopmentProgram({
  ...programInput,
  useMix: programInput.useMix.map((item, index) => index === 0 ? { ...item, unsupported: true } : item)
}).ok, false, "Runtime validation must reject nested fields outside the strict response schema.");
assert.equal(validateRedevelopmentProgram({ ...programInput, title: `${"x".repeat(121)}` }).ok, false,
  "Overlong model text must be rejected rather than silently truncated.");
assert.equal(validateRedevelopmentProgram({ ...programInput, summary: "Visit https://example.com for proof." }).ok, false,
  "Model-authored URLs must fail the bounded Create contract.");
assert.equal(validateRedevelopmentProgram({ ...programInput, summary: "Ownership is verified and zoning is approved." }).ok, false,
  "Unsupported authoritative claims must fail the bounded Create contract.");
assert.equal(validateRedevelopmentProgram({ ...russian, summary: "Право собственности подтверждено." }).ok, false,
  "Unsupported Russian authoritative claims must fail the bounded Create contract.");
assert.equal(validateRedevelopmentProgram({ ...programInput, rationale: ["Safe text\u202ehidden"] }).ok, false,
  "Invisible direction controls must fail instead of being normalized into visible output.");

const aiInput = {
  locale: "en" as const,
  templateId: "residential_mixed_use" as const,
  customPrompt: "Create a compact residential concept.",
  aoiAreaSqM: 25_000,
  aoiWidthM: 200,
  aoiHeightM: 125,
  requestedParameters: {
    blockCount: programInput.blockCount,
    levelsMin: programInput.levelsMin,
    levelsMax: programInput.levelsMax,
    targetSiteCoveragePct: programInput.targetSiteCoveragePct,
    openSpacePct: programInput.openSpacePct,
    setbackM: programInput.setbackM
  }
};
const standardProfile = resolvePointObjectCreateModelProfile("standard", null);
assert.ok(standardProfile);
assert.deepEqual(standardProfile, {
  model: "gpt-5.6-sol", reasoningEffort: "medium", maxOutputTokens: 2_200, timeoutMs: 55_000
});
assert.equal(resolvePointObjectCreateModelProfile("quick", "gpt-5.6-sol-2026-09-01")?.model, "gpt-5.6-sol-2026-09-01");
assert.equal(resolvePointObjectCreateModelProfile("standard", "gpt-5.6-terra"), null,
  "A Standard override must not silently reduce its minimum model tier.");
assert.equal(resolvePointObjectCreateModelProfile("quick", "gpt-5.6-terra-malicious"), null,
  "Only exact GPT-5.6 aliases or dated snapshots may override Create routing.");

const responsesRequest = buildPointObjectCreateResponsesRequest(aiInput, standardProfile);
assert.equal(responsesRequest.model, "gpt-5.6-sol");
assert.equal(responsesRequest.service_tier, "default");
assert.equal(responsesRequest.store, false);
assert.deepEqual(responsesRequest.reasoning, { effort: "medium" });
assert.equal(responsesRequest.text.format.type, "json_schema");
assert.equal(responsesRequest.text.format.strict, true);
assert.deepEqual(responsesRequest.text.format.schema.properties.templateId.enum, ["residential_mixed_use"]);
assert.equal("const" in responsesRequest.text.format.schema.properties.templateId, false,
  "The dynamic template constraint must use the broadly supported single-value enum form.");
assert.match(responsesRequest.input[1].content[0].text, /\"locale\":\"en\"/);
assert.equal(inferPromptMassingStyle("Make four towers on a shared podium."), "towers_on_podium");
assert.equal(inferPromptMassingStyle("Создай тихий внутренний двор"), "courtyard");
assert.equal(inferPromptMassingStyle("No explicit spatial form."), null);
assert.equal(inferPromptMassingStyle("Create a campus without towers."), "campus",
  "A negated tower mention must not override the requested campus style.");
assert.equal(inferPromptMassingStyle("Сделай кампус без башен."), "campus",
  "Russian negation must not turn a campus request into towers.");
assert.equal(inferPromptMassingStyle("Не нужен двор, хочу башни."), "towers_on_podium",
  "A negated courtyard mention must not override a positive tower request.");
assert.equal(inferPromptMassingStyle("Сохрани исторический дворец."), null,
  "A substring inside an unrelated word must not force courtyard massing.");
assert.equal(inferPromptMassingStyle("Compare a courtyard and towers."), null,
  "Mixed style intent must remain available to the full programme planner instead of forcing a regex winner.");
const towerPromptRequest = buildPointObjectCreateResponsesRequest({
  ...aiInput,
  customPrompt: "Create towers on a podium.",
  requestedParameters: { levelsMin: 20, levelsMax: 20 }
}, standardProfile);
assert.deepEqual(towerPromptRequest.text.format.schema.properties.massingStyle.enum, ["towers_on_podium"],
  "An explicit supported style prompt must constrain the model programme.");
assert.match(towerPromptRequest.input[1].content[0].text, /\"requestedParameters\":\{\"levelsMin\":20,\"levelsMax\":20\}/);

assert.deepEqual(validatePointObjectCreateLockedControlKeys(undefined), {
  ok: true,
  value: ["blockCount", "levelsMin", "levelsMax", "targetSiteCoveragePct", "openSpacePct", "setbackM"]
});
assert.deepEqual(validatePointObjectCreateLockedControlKeys([]), { ok: true, value: [] });
assert.equal(validatePointObjectCreateLockedControlKeys(["levelsMin", "levelsMin"]).ok, false);
assert.equal(validatePointObjectCreateLockedControlKeys(["unknown"]).ok, false);
assert.equal(selectPointObjectCreateRequestedParameters(aiInput.requestedParameters!, []), null);
assert.deepEqual(
  selectPointObjectCreateRequestedParameters(aiInput.requestedParameters!, ["levelsMin", "levelsMax"]),
  { levelsMin: programInput.levelsMin, levelsMax: programInput.levelsMax }
);

const aoiHash = "aoi-hash";
const seedOne = createProgramSeed(validated.value, aoiHash);
const seedNarrativeOnly = createProgramSeed({ ...validated.value, title: "Changed title", summary: "Changed summary" }, aoiHash);
assert.equal(seedOne, seedNarrativeOnly, "Narrative or locale copy must not alter deterministic geometry.");
assert.equal(
  geometrySignature(generateConceptMassing(aoi, validated.value)),
  geometrySignature(generateConceptMassing(aoi, { ...validated.value, title: "Changed title", summary: "Changed summary" })),
  "Default geometry generation must exclude narrative copy from its seed."
);
assert.notEqual(seedOne, createProgramSeed({ ...validated.value, setbackM: validated.value.setbackM + 1 }, aoiHash));
assert.notEqual(seedOne, createProgramSeed({ ...validated.value, openSpacePct: validated.value.openSpacePct + 1 }, aoiHash));

const fixedTowerBaseValidation = validateRedevelopmentProgram({ ...commercialProgram, levelsMin: 20, levelsMax: 20, openSpacePct: 25 });
const fixedTowerOpenValidation = validateRedevelopmentProgram({ ...commercialProgram, levelsMin: 20, levelsMax: 20, openSpacePct: 35 });
if (!fixedTowerBaseValidation.ok || !fixedTowerOpenValidation.ok) throw new Error("Fixed tower test programmes must validate.");
const fixedTowerBase = generateConceptMassing(aoi, fixedTowerBaseValidation.value, "geoai-open-space-effect");
const fixedTowerOpen = generateConceptMassing(aoi, fixedTowerOpenValidation.value, "geoai-open-space-effect");
assert.notEqual(geometrySignature(fixedTowerBase), geometrySignature(fixedTowerOpen),
  "Open-space control must affect physical massing even when primary heights are fixed.");
assert.ok(fixedTowerBase.featureCollection.features.filter((feature) => feature.properties.primaryBlock)
  .every((feature) => feature.properties.levels === 20));

assert.equal(parsePointObjectCreateProgram(JSON.stringify(programInput), "residential_mixed_use", "en").ok, true);
assert.equal(parsePointObjectCreateProgram(JSON.stringify(programInput), "residential_mixed_use", "ru").ok, false,
  "English narrative must not be accepted for a Russian Create request.");
assert.equal(parsePointObjectCreateProgram(JSON.stringify(russian), "civic_green", "ru").ok, true);
assert.equal(parsePointObjectCreateProgram(JSON.stringify(russian), "civic_green", "en").ok, false,
  "Russian narrative must not be accepted for an English Create request.");

assert.equal(boundedPointObjectCreateAttemptTimeout(35_000, 100_000, 90_000), 10_000);
assert.equal(boundedPointObjectCreateAttemptTimeout(35_000, 100_000, 100_001), null,
  "Expired retry budgets must never reach AbortSignal.timeout as a negative duration.");
assert.equal(boundedPointObjectCreateAttemptTimeout(500, 100_000, 90_000), null);
assert.equal(boundedPointObjectCreateAttemptTimeout(35_000, 100_000, 96_000), null,
  "A repair attempt without a viable five-second budget must fail before making a wasteful provider call.");
assert.throws(() => generateConceptMassing([[
  [55.27, 25.2],
  [55.29, 25.2],
  [55.29, 25.22],
  [55.27, 25.22],
  [55.27, 25.2]
]], validated.value), /1 sq km/);

console.log("point-to-object create checks passed");
