import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { performance } from "node:perf_hooks";

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
const {
  createPointObjectCreateDraftKey,
  createPointObjectCreateEditorScopeKey,
  restorePointObjectCreateEditorSnapshot
} = await import("../src/lib/prototype/point-to-object-create-editor");

function geometrySignature(result: ReturnType<typeof generateConceptMassing>) {
  return JSON.stringify(result.featureCollection.features.map((feature) => ({
    coordinates: feature.geometry.coordinates,
    role: feature.properties.volumeRole,
    baseM: feature.properties.baseM,
    heightM: feature.properties.heightM
  })));
}

function footprintFormSignature(result: ReturnType<typeof generateConceptMassing>) {
  return result.featureCollection.features.map((feature) => feature.properties.footprintForm ?? "rectangle").join("|");
}

function featureAreaSqM(feature: ReturnType<typeof generateConceptMassing>["featureCollection"]["features"][number]) {
  return calculatePolygonMeasurements(feature.geometry.coordinates[0].slice(0, -1) as [number, number][]).areaSqM;
}

function featureAspectRatio(feature: ReturnType<typeof generateConceptMassing>["featureCollection"]["features"][number]) {
  const ring = feature.geometry.coordinates[0];
  const lengths = ring.slice(0, -1).map((point, index) => {
    const next = ring[index + 1];
    const latitude = (point[1] + next[1]) / 2 * Math.PI / 180;
    return Math.hypot(
      (next[0] - point[0]) * 111_320 * Math.cos(latitude),
      (next[1] - point[1]) * 110_540
    );
  });
  return Math.max(...lengths) / Math.min(...lengths);
}

function featureMinimumEdgeM(feature: ReturnType<typeof generateConceptMassing>["featureCollection"]["features"][number]) {
  const ring = feature.geometry.coordinates[0];
  return Math.min(...ring.slice(0, -1).map((point, index) => {
    const next = ring[index + 1];
    const latitude = (point[1] + next[1]) / 2 * Math.PI / 180;
    return Math.hypot(
      (next[0] - point[0]) * 111_320 * Math.cos(latitude),
      (next[1] - point[1]) * 110_540
    );
  }));
}

function featureMinimumCaliperM(feature: ReturnType<typeof generateConceptMassing>["featureCollection"]["features"][number]) {
  const ring = feature.geometry.coordinates[0].slice(0, -1);
  const origin = ring[0];
  const latitude = origin[1] * Math.PI / 180;
  const points = ring.map((point) => ({
    x: (point[0] - origin[0]) * 111_320 * Math.cos(latitude),
    y: (point[1] - origin[1]) * 110_540
  }));
  let minimumWidthM = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const length = Math.hypot(deltaX, deltaY);
    if (length <= Number.EPSILON) continue;
    const normalX = -deltaY / length;
    const normalY = deltaX / length;
    const projections = points.map((point) => point.x * normalX + point.y * normalY);
    minimumWidthM = Math.min(minimumWidthM, Math.max(...projections) - Math.min(...projections));
  }
  return minimumWidthM;
}

function carveRectangularTowerFixture(
  feature: ReturnType<typeof generateConceptMassing>["featureCollection"]["features"][number],
  form: "l_shape" | "u_shape"
) {
  const [bottomLeft, bottomRight, , topLeft] = feature.geometry.coordinates[0];
  const normalized = form === "l_shape"
    ? [[0, 0], [1, 0], [1, 0.6], [0.6, 0.6], [0.6, 1], [0, 1]]
    : [[0, 0], [1, 0], [1, 1], [0.68, 1], [0.68, 0.55], [0.32, 0.55], [0.32, 1], [0, 1]];
  const footprint = normalized.map(([horizontal, vertical]): [number, number] => [
    bottomLeft[0] + (bottomRight[0] - bottomLeft[0]) * horizontal +
      (topLeft[0] - bottomLeft[0]) * vertical,
    bottomLeft[1] + (bottomRight[1] - bottomLeft[1]) * horizontal +
      (topLeft[1] - bottomLeft[1]) * vertical
  ]);
  feature.properties.footprintForm = form;
  feature.geometry.coordinates[0] = [...footprint, footprint[0]];
}

function recomputeFloorArea(result: ReturnType<typeof generateConceptMassing>) {
  result.estimatedFloorAreaSqM = Number(result.featureCollection.features.reduce((sum, feature) =>
    sum + featureAreaSqM(feature) *
      (feature.properties.heightM - feature.properties.baseM) / 3.4, 0).toFixed(1));
}

function featureCenter(feature: ReturnType<typeof generateConceptMassing>["featureCollection"]["features"][number]) {
  const ring = feature.geometry.coordinates[0].slice(0, -1);
  const origin = ring[0];
  let twiceArea = 0;
  let longitudeNumerator = 0;
  let latitudeNumerator = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = [ring[index][0] - origin[0], ring[index][1] - origin[1]];
    const nextPoint = ring[(index + 1) % ring.length];
    const next = [nextPoint[0] - origin[0], nextPoint[1] - origin[1]];
    const cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    longitudeNumerator += (current[0] + next[0]) * cross;
    latitudeNumerator += (current[1] + next[1]) * cross;
  }
  return [
    origin[0] + longitudeNumerator / (3 * twiceArea),
    origin[1] + latitudeNumerator / (3 * twiceArea)
  ] as [number, number];
}

function normalizedPrimaryCentroidSpan(
  polygon: [number, number][][],
  result: ReturnType<typeof generateConceptMassing>
) {
  const ring = polygon[0].slice(0, -1);
  const minLongitude = Math.min(...ring.map((point) => point[0]));
  const maxLongitude = Math.max(...ring.map((point) => point[0]));
  const minLatitude = Math.min(...ring.map((point) => point[1]));
  const maxLatitude = Math.max(...ring.map((point) => point[1]));
  const centers = result.featureCollection.features
    .filter((feature) => feature.properties.primaryBlock)
    .map(featureCenter);
  return (Math.max(...centers.map((point) => point[0])) - Math.min(...centers.map((point) => point[0]))) /
      Math.max(Number.EPSILON, maxLongitude - minLongitude) +
    (Math.max(...centers.map((point) => point[1])) - Math.min(...centers.map((point) => point[1]))) /
      Math.max(Number.EPSILON, maxLatitude - minLatitude);
}

function assertTowerPodiumContract(
  polygon: [number, number][][],
  program: Parameters<typeof generateConceptMassing>[1],
  result: ReturnType<typeof generateConceptMassing>,
  expectedPodiumCount: number
) {
  assertGeometryContract(polygon, program, result);
  const podiums = result.featureCollection.features.filter((feature) => feature.properties.volumeRole === "podium");
  const towers = result.featureCollection.features.filter((feature) => feature.properties.volumeRole === "tower");
  const podiumById = new Map(podiums.map((feature) => [feature.properties.id, feature]));
  assert.equal(podiums.length, expectedPodiumCount);
  assert.equal(towers.length, program.blockCount);
  assert.ok(result.generatedFeatureCount <= 24, "Tower concepts must stay within the bounded two-features-per-tower cap.");
  const usedPodiums = new Set<string>();
  for (const tower of towers) {
    assert.equal(typeof tower.properties.supportingPodiumId, "string", "Generated towers must expose explicit support lineage.");
    const support = podiumById.get(tower.properties.supportingPodiumId ?? "");
    assert.ok(support, "Every generated tower must reference an existing podium.");
    assert.equal(tower.properties.baseM, support.properties.heightM);
    assert.ok(tower.properties.heightM > tower.properties.baseM);
    usedPodiums.add(support.properties.id);
  }
  assert.equal(usedPodiums.size, podiums.length, "Every generated podium must support at least one tower.");
  assert.equal(result.minGeneratedLevels, program.levelsMin);
  assert.equal(result.maxGeneratedLevels, program.levelsMax);
  const measuredGroundArea = podiums.reduce((sum, podium) => sum + featureAreaSqM(podium), 0);
  assert.ok(Math.abs(measuredGroundArea - result.generatedFootprintAreaSqM) /
    Math.max(1, result.generatedFootprintAreaSqM) < 0.025,
  "Ground footprint must equal the sum of disjoint podium footprints without stacked tower double-counting.");
}

function controlsFromProgram(program: {
  blockCount: number;
  levelsMin: number;
  levelsMax: number;
  targetSiteCoveragePct: number;
  openSpacePct: number;
  setbackM: number;
}) {
  return {
    blockCount: program.blockCount,
    levelsMin: program.levelsMin,
    levelsMax: program.levelsMax,
    targetSiteCoveragePct: program.targetSiteCoveragePct,
    openSpacePct: program.openSpacePct,
    setbackM: program.setbackM
  };
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

const legacySinglePodium = structuredClone(towers);
for (const feature of legacySinglePodium.featureCollection.features) {
  if (feature.properties.volumeRole === "tower") delete feature.properties.supportingPodiumId;
}
assert.deepEqual(validateConceptMassingGeometry(aoi, commercialValidation.value, legacySinglePodium), [],
  "A legacy result without explicit tower support IDs remains readable only when one podium is unambiguous.");

const cycle03ProgramValidation = validateRedevelopmentProgram({
  ...commercialProgram,
  title: "Synthetic ten-tower control",
  summary: "Synthetic deterministic adversarial geometry fixture.",
  blockCount: 10,
  levelsMin: 10,
  levelsMax: 53,
  targetSiteCoveragePct: 42,
  openSpacePct: 32,
  setbackM: 10,
  useMix: [
    { use: "office", sharePct: 58 },
    { use: "residential", sharePct: 24 },
    { use: "retail", sharePct: 10 },
    { use: "open_space", sharePct: 8 }
  ],
  rationale: ["Exercises adaptive and split podium placement with fixed controls."]
});
if (!cycle03ProgramValidation.ok) throw new Error(cycle03ProgramValidation.errors.join("; "));
const cycle03Program = cycle03ProgramValidation.value;
const cycle03Fixtures = {
  rotatedLong: [[
    [37.61819284, 55.74902122],
    [37.62245933, 55.75025333],
    [37.62180716, 55.75097878],
    [37.61754067, 55.74974667],
    [37.61819284, 55.74902122]
  ]],
  concaveL: [[
    [37.62000000, 55.75000000],
    [37.62399033, 55.75000000],
    [37.62399033, 55.75090465],
    [37.62159613, 55.75090465],
    [37.62159613, 55.75226162],
    [37.62000000, 55.75226162],
    [37.62000000, 55.75000000]
  ]],
  concaveU: [[
    [37.62000000, 55.75000000],
    [37.62478840, 55.75000000],
    [37.62478840, 55.75199023],
    [37.62351149, 55.75199023],
    [37.62351149, 55.75072372],
    [37.62127691, 55.75072372],
    [37.62127691, 55.75199023],
    [37.62000000, 55.75199023],
    [37.62000000, 55.75000000]
  ]],
  geometricNonfit: [[
    [37.62000000, 55.75000000],
    [37.62063845, 55.75000000],
    [37.62063845, 55.75036186],
    [37.62000000, 55.75036186],
    [37.62000000, 55.75000000]
  ]]
} as const satisfies Record<string, readonly (readonly [number, number])[][]>;

const cycle03Timings: Record<string, number> = {};
function generateTimedCycle03Alternatives(
  id: "rotatedLong" | "concaveL" | "concaveU",
  expectedPodiumCount: number
) {
  const polygon = cycle03Fixtures[id].map((ring) => ring.map((point) => [...point] as [number, number]));
  const started = performance.now();
  const generated = generateConceptMassingAlternatives(polygon, cycle03Program, `cycle03:${id}`);
  cycle03Timings[id] = Number((performance.now() - started).toFixed(1));
  assert.ok(cycle03Timings[id] < 2_500, `${id} must complete both alternatives inside the bounded per-case budget.`);
  assert.equal(generated.length, 2);
  assert.notEqual(geometrySignature(generated[0].massing), geometrySignature(generated[1].massing));
  for (const alternative of generated) {
    assertTowerPodiumContract(polygon, cycle03Program, alternative.massing, expectedPodiumCount);
    const shapedTowers = alternative.massing.featureCollection.features.filter((feature) =>
      feature.properties.volumeRole === "tower" && feature.properties.footprintForm !== "rectangle");
    assert.ok(shapedTowers.length >= 1, `${id} must retain at least one accepted non-rectangular tower footprint.`);
    assert.ok(shapedTowers.every((feature) => feature.geometry.coordinates[0].length - 1 > 4),
      "A declared non-rectangular tower must have more than four meaningful exterior vertices.");
    assert.ok(shapedTowers.every((feature) => featureMinimumEdgeM(feature) >= 2.45),
      "Generated articulation must respect the bounded non-rectangular edge floor without slivers.");
    const articulatedTowers = shapedTowers.filter((feature) =>
      feature.properties.footprintForm === "l_shape" || feature.properties.footprintForm === "u_shape");
    assert.ok(articulatedTowers.every((feature) => featureMinimumEdgeM(feature) >=
      (feature.properties.levels >= 40 ? 7.45 : 6.45)),
    "Every accepted L/U tower must meet its level-dependent local arm/neck visual floor.");
  }
  assert.notEqual(footprintFormSignature(generated[0].massing), footprintFormSignature(generated[1].massing),
    `${id} alternatives must use genuinely different deterministic footprint grammars.`);
  return { polygon, generated };
}

const rotatedCycle03 = generateTimedCycle03Alternatives("rotatedLong", 1);
const rotatedPodium = rotatedCycle03.generated[0].massing.featureCollection.features
  .find((feature) => feature.properties.volumeRole === "podium");
assert.ok(rotatedPodium);
assert.ok(featureAspectRatio(rotatedPodium) > 2.5,
  "The elongated rotated AOI must use an adaptive podium aspect ratio instead of the old fixed 1.45 ratio.");

const rotatedA = rotatedCycle03.generated.find((alternative) => alternative.id === "A")?.massing;
const rotatedB = rotatedCycle03.generated.find((alternative) => alternative.id === "B")?.massing;
assert.ok(rotatedA && rotatedB);
const rotatedATowers = rotatedA.featureCollection.features
  .filter((feature) => feature.properties.volumeRole === "tower");
const rotatedBTowers = rotatedB.featureCollection.features
  .filter((feature) => feature.properties.volumeRole === "tower");
const highRiseLFallback = rotatedATowers[8];
const highRiseUFallback = rotatedBTowers[8];
assert.ok(highRiseLFallback.properties.levels >= 40 && highRiseUFallback.properties.levels >= 40,
  "The negative local-width fixtures must remain high-rise towers.");
assert.equal(highRiseLFallback.properties.footprintForm, "rectangle",
  "A high-rise L candidate with a thin local arm must fall back to its valid rectangle.");
assert.equal(highRiseUFallback.properties.footprintForm, "rectangle",
  "A high-rise U candidate with thin local legs must fall back to its valid rectangle.");

const thinHighRiseL = structuredClone(rotatedA);
const thinHighRiseLFeature = thinHighRiseL.featureCollection.features
  .filter((feature) => feature.properties.volumeRole === "tower")[8];
carveRectangularTowerFixture(thinHighRiseLFeature, "l_shape");
recomputeFloorArea(thinHighRiseL);
const thinHighRiseLMetrics = {
  areaSqM: featureAreaSqM(thinHighRiseLFeature),
  globalCaliperM: featureMinimumCaliperM(thinHighRiseLFeature),
  localArmM: featureMinimumEdgeM(thinHighRiseLFeature)
};
assert.ok(thinHighRiseLMetrics.areaSqM >= 90 && thinHighRiseLMetrics.globalCaliperM >= 7.45,
  "The L counterexample must pass the prior high-rise area and whole-envelope caliper checks.");
assert.ok(thinHighRiseLMetrics.localArmM < 7.5,
  "The L counterexample must expose a local arm below the high-rise visual floor.");
assert.ok(validateConceptMassingGeometry(rotatedCycle03.polygon, cycle03Program, thinHighRiseL)
  .some((error) => /geometry-quality floor/.test(error)),
"Validation must reject an L high-rise whose local arm fails even when area and global caliper pass.");

const thinHighRiseU = structuredClone(rotatedB);
const thinHighRiseUFeature = thinHighRiseU.featureCollection.features
  .filter((feature) => feature.properties.volumeRole === "tower")[8];
carveRectangularTowerFixture(thinHighRiseUFeature, "u_shape");
recomputeFloorArea(thinHighRiseU);
const thinHighRiseUMetrics = {
  areaSqM: featureAreaSqM(thinHighRiseUFeature),
  globalCaliperM: featureMinimumCaliperM(thinHighRiseUFeature),
  localArmM: featureMinimumEdgeM(thinHighRiseUFeature)
};
assert.ok(thinHighRiseUMetrics.areaSqM >= 90 && thinHighRiseUMetrics.globalCaliperM >= 7.45,
  "The U counterexample must pass the prior high-rise area and whole-envelope caliper checks.");
assert.ok(thinHighRiseUMetrics.localArmM < 7.5,
  "The U counterexample must expose local legs below the high-rise visual floor.");
assert.ok(validateConceptMassingGeometry(rotatedCycle03.polygon, cycle03Program, thinHighRiseU)
  .some((error) => /geometry-quality floor/.test(error)),
"Validation must reject a U high-rise whose local legs fail even when area and global caliper pass.");
console.log("cycle04 rejected high-rise local-width fixtures", {
  lShape: thinHighRiseLMetrics,
  uShape: thinHighRiseUMetrics
});

const lCycle03 = generateTimedCycle03Alternatives("concaveL", 2);
const uCycle03 = generateTimedCycle03Alternatives("concaveU", 3);
assert.ok([...lCycle03.generated, ...uCycle03.generated].some((alternative) =>
  alternative.massing.featureCollection.features.some((feature) =>
    feature.properties.volumeRole === "tower" &&
    (feature.properties.footprintForm === "l_shape" || feature.properties.footprintForm === "u_shape"))),
"The local-width guard must retain genuinely articulated towers where the complex-site envelopes are large enough.");

const clockwiseL = [[...lCycle03.polygon[0]].reverse()] as [number, number][][];
const clockwiseStarted = performance.now();
const clockwiseLResult = generateConceptMassing(clockwiseL, cycle03Program, "cycle03:concaveL", "A");
cycle03Timings.clockwiseL = Number((performance.now() - clockwiseStarted).toFixed(1));
assert.ok(cycle03Timings.clockwiseL < 2_500);
assertTowerPodiumContract(clockwiseL, cycle03Program, clockwiseLResult, 2);
assert.equal(clockwiseLResult.achievedSiteCoveragePct, lCycle03.generated[0].massing.achievedSiteCoveragePct,
  "Clockwise and counter-clockwise forms must preserve the same feasibility class and requested metrics.");

const missingSupport = structuredClone(lCycle03.generated[0].massing);
const missingSupportTower = missingSupport.featureCollection.features
  .find((feature) => feature.properties.volumeRole === "tower");
assert.ok(missingSupportTower);
delete missingSupportTower.properties.supportingPodiumId;
assert.ok(validateConceptMassingGeometry(lCycle03.polygon, cycle03Program, missingSupport)
  .some((error) => /valid supporting podium/.test(error)),
"Multi-podium results must fail closed when tower support lineage is missing.");
const wrongSupport = structuredClone(lCycle03.generated[0].massing);
const wrongSupportPodiums = wrongSupport.featureCollection.features
  .filter((feature) => feature.properties.volumeRole === "podium");
const wrongSupportTower = wrongSupport.featureCollection.features
  .find((feature) => feature.properties.volumeRole === "tower");
assert.ok(wrongSupportTower && wrongSupportPodiums.length === 2);
wrongSupportTower.properties.supportingPodiumId = wrongSupportPodiums
  .find((feature) => feature.properties.id !== wrongSupportTower.properties.supportingPodiumId)?.properties.id ?? "missing";
assert.ok(validateConceptMassingGeometry(lCycle03.polygon, cycle03Program, wrongSupport)
  .some((error) => /directly above its supporting podium/.test(error)),
"A tower must not be relinked to a different podium without matching containment.");
const overlappingPodiums = structuredClone(uCycle03.generated[0].massing);
const overlappingPodiumFeatures = overlappingPodiums.featureCollection.features
  .filter((feature) => feature.properties.volumeRole === "podium");
assert.equal(overlappingPodiumFeatures.length, 3);
overlappingPodiumFeatures[1].geometry.coordinates = structuredClone(overlappingPodiumFeatures[0].geometry.coordinates);
assert.ok(validateConceptMassingGeometry(uCycle03.polygon, cycle03Program, overlappingPodiums)
  .some((error) => /overlap/.test(error)), "Split podium footprints must remain disjoint.");

let nonfitError: unknown;
const nonfitPolygon = cycle03Fixtures.geometricNonfit
  .map((ring) => ring.map((point) => [...point] as [number, number]));
const nonfitStarted = performance.now();
try {
  generateConceptMassing(nonfitPolygon, cycle03Program, "cycle03:geometric-nonfit", "A");
} catch (error) {
  nonfitError = error;
}
cycle03Timings.geometricNonfit = Number((performance.now() - nonfitStarted).toFixed(1));
assert.ok(cycle03Timings.geometricNonfit < 2_500);
assert.ok(nonfitError instanceof Error && "code" in nonfitError && nonfitError.code === "programme_does_not_fit");
assert.match(nonfitError.message, /bounded/i);
assert.doesNotMatch(nonfitError.message, /mathematically impossible|planning infeasible|site is impossible/i,
  "Bounded solver exhaustion must not be described as legal, planning, or mathematical impossibility.");

const tinyHighRiseProgramValidation = validateRedevelopmentProgram({
  templateId: cycle03Program.templateId,
  title: cycle03Program.title,
  summary: cycle03Program.summary,
  massingStyle: cycle03Program.massingStyle,
  blockCount: cycle03Program.blockCount,
  levelsMin: cycle03Program.levelsMin,
  levelsMax: cycle03Program.levelsMax,
  targetSiteCoveragePct: 25,
  openSpacePct: cycle03Program.openSpacePct,
  setbackM: cycle03Program.setbackM,
  useMix: cycle03Program.useMix,
  rationale: cycle03Program.rationale
});
if (!tinyHighRiseProgramValidation.ok) throw new Error(tinyHighRiseProgramValidation.errors.join("; "));
let tinyHighRiseError: unknown;
const tinyHighRiseStarted = performance.now();
try {
  generateConceptMassingAlternatives(
    nonfitPolygon,
    tinyHighRiseProgramValidation.value,
    "cycle03:tiny-high-rise-quality-floor"
  );
} catch (error) {
  tinyHighRiseError = error;
}
cycle03Timings.tinyHighRiseQualityFloor = Number((performance.now() - tinyHighRiseStarted).toFixed(1));
assert.ok(cycle03Timings.tinyHighRiseQualityFloor < 2_500);
assert.ok(tinyHighRiseError instanceof Error && "code" in tinyHighRiseError &&
  tinyHighRiseError.code === "programme_does_not_fit",
"A lower coverage must not make a ten-tower, 10-53-level concept fit by shrinking towers into metre-wide needles.");
assert.match(tinyHighRiseError.message, /bounded/i);

const tinyTowerMutation = structuredClone(towers);
const tinyTowerFeature = tinyTowerMutation.featureCollection.features
  .find((feature) => feature.properties.volumeRole === "tower");
assert.ok(tinyTowerFeature);
const tinyTowerRing = tinyTowerFeature.geometry.coordinates[0];
const tinyTowerCenter = tinyTowerRing.slice(0, -1).reduce<[number, number]>((sum, point) => [
  sum[0] + point[0] / (tinyTowerRing.length - 1),
  sum[1] + point[1] / (tinyTowerRing.length - 1)
], [0, 0]);
tinyTowerFeature.geometry.coordinates[0] = tinyTowerRing.map((point) => [
  tinyTowerCenter[0] + (point[0] - tinyTowerCenter[0]) * 0.08,
  tinyTowerCenter[1] + (point[1] - tinyTowerCenter[1]) * 0.08
]);
assert.ok(validateConceptMassingGeometry(aoi, commercialValidation.value, tinyTowerMutation)
  .some((error) => /geometry-quality floor/.test(error)),
"Validation must reject implausibly tiny primary tower geometry independently of generator placement.");

const starCenter = [37.62, 55.75] as const;
const metresPerLongitude = 111_320 * Math.cos(starCenter[1] * Math.PI / 180);
const twentyFourVertexRing = Array.from({ length: 24 }, (_, index): [number, number] => {
  const angle = index * Math.PI * 2 / 24;
  const radiusM = index % 2 === 0 ? 180 : 115;
  return [
    starCenter[0] + Math.cos(angle) * radiusM / metresPerLongitude,
    starCenter[1] + Math.sin(angle) * radiusM / 110_540
  ];
});
twentyFourVertexRing.push(twentyFourVertexRing[0]);
const denseStarted = performance.now();
const denseAlternatives = generateConceptMassingAlternatives(
  [twentyFourVertexRing],
  cycle03Program,
  "cycle03:twenty-four-vertex-concave"
);
cycle03Timings.twentyFourVertexConcave = Number((performance.now() - denseStarted).toFixed(1));
assert.ok(cycle03Timings.twentyFourVertexConcave < 2_500,
  "A maximum-complexity accepted AOI must not turn the bounded deterministic search into a timeout.");
assert.equal(denseAlternatives.length, 2);
for (const alternative of denseAlternatives) {
  assertTowerPodiumContract([twentyFourVertexRing], cycle03Program, alternative.massing, 1);
}
console.log("cycle03 geometry timings ms", cycle03Timings);

const civicProgram = conceptTemplate("civic_green", "en");
const civicValidation = validateRedevelopmentProgram(civicProgram);
if (!civicValidation.ok) throw new Error(civicValidation.errors.join("; "));
const campus = generateConceptMassing(aoi, civicValidation.value, "geoai-campus");
assertGeometryContract(aoi, civicValidation.value, campus);
assert.ok(campus.featureCollection.features.every((feature) => feature.properties.volumeRole === "campus_block"));
const shapedCampusFeatures = campus.featureCollection.features
  .filter((feature) => feature.properties.footprintForm !== "rectangle");
assert.ok(shapedCampusFeatures.length >= 3,
  "A spacious campus control must exercise the bounded L/U/chamfered footprint grammar, not only rectangles.");
assert.ok(shapedCampusFeatures.every((feature) => feature.geometry.coordinates[0].length - 1 > 4));
assert.ok(shapedCampusFeatures.every((feature) => featureMinimumEdgeM(feature) >= 2.45));
assert.equal(campus.achievedSiteCoveragePct, civicValidation.value.targetSiteCoveragePct,
  "Campus coverage must be calculated from and match the actual carved footprint geometry.");
assert.ok(campus.featureCollection.features.some((feature) => {
  const [firstPoint, secondPoint] = feature.geometry.coordinates[0];
  return Math.abs(firstPoint[0] - secondPoint[0]) > 1e-8 && Math.abs(firstPoint[1] - secondPoint[1]) > 1e-8;
}), "Campus geometry must include genuinely oriented footprints.");
const campusAlternatives = generateConceptMassingAlternatives(aoi, civicValidation.value, "geoai-campus-alternatives");
assert.equal(campusAlternatives.length, 2);
assert.notEqual(geometrySignature(campusAlternatives[0].massing), geometrySignature(campusAlternatives[1].massing));
for (const squareCampusAoi of [aoi, [[...aoi[0]].reverse()] as [number, number][][]]) {
  const squareCampusAlternatives = generateConceptMassingAlternatives(
    squareCampusAoi,
    civicValidation.value,
    "cycle04-independent:shaped-campus-square"
  );
  assert.equal(squareCampusAlternatives.length, 2);
  for (const alternative of squareCampusAlternatives) {
    assertGeometryContract(squareCampusAoi, civicValidation.value, alternative.massing);
    assert.ok(alternative.massing.featureCollection.features.filter((feature) =>
      feature.properties.footprintForm !== "rectangle").length >= 3,
    "Both roomy-square alternatives must retain real articulation for the independent audit seed and either AOI winding.");
  }
}
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

const cycle04CampusTimings: Record<string, number> = {};
const cycle04CampusSpanScores: Record<string, number> = {};
const cycle04ConcaveStarted = performance.now();
const cycle04ConcaveAlternatives = generateConceptMassingAlternatives(
  concaveAoi,
  civicValidation.value,
  "cycle04:concave-l-campus"
);
cycle04CampusTimings.concaveL = Number((performance.now() - cycle04ConcaveStarted).toFixed(1));
assert.ok(cycle04CampusTimings.concaveL < 2_500);
assert.equal(cycle04ConcaveAlternatives.length, 2);
assert.notEqual(
  footprintFormSignature(cycle04ConcaveAlternatives[0].massing),
  footprintFormSignature(cycle04ConcaveAlternatives[1].massing),
  "Concave-site alternatives must use distinct deterministic footprint grammars."
);
for (const alternative of cycle04ConcaveAlternatives) {
  assertGeometryContract(concaveAoi, civicValidation.value, alternative.massing);
  const spanScore = normalizedPrimaryCentroidSpan(concaveAoi, alternative.massing);
  cycle04CampusSpanScores[`concaveL-${alternative.id}`] = Number(spanScore.toFixed(3));
  assert.ok(spanScore > 1.3,
    "The L-site ensemble must achieve a quantified, two-axis distributed centroid span.");
  const centers = alternative.massing.featureCollection.features
    .filter((feature) => feature.properties.primaryBlock)
    .map(featureCenter);
  assert.ok(centers.some(([longitude, latitude]) => longitude > 55.2797 && latitude < 25.2172),
    "The L-site ensemble must occupy the horizontal arm beyond the shared corner.");
  assert.ok(centers.some(([longitude, latitude]) => longitude < 55.2797 && latitude > 25.2172),
    "The L-site ensemble must occupy the vertical arm beyond the shared corner.");
}

const cycle04UStarted = performance.now();
const cycle04UAlternatives = generateConceptMassingAlternatives(
  uShapedAoi,
  civicValidation.value,
  "cycle04:concave-u-campus"
);
cycle04CampusTimings.concaveU = Number((performance.now() - cycle04UStarted).toFixed(1));
assert.ok(cycle04CampusTimings.concaveU < 2_500);
assert.equal(cycle04UAlternatives.length, 2);
for (const alternative of cycle04UAlternatives) {
  assertGeometryContract(uShapedAoi, civicValidation.value, alternative.massing);
  const spanScore = normalizedPrimaryCentroidSpan(uShapedAoi, alternative.massing);
  cycle04CampusSpanScores[`concaveU-${alternative.id}`] = Number(spanScore.toFixed(3));
  assert.ok(spanScore > 1.3,
    "The U-site ensemble must achieve a quantified, two-axis distributed centroid span.");
  const centers = alternative.massing.featureCollection.features
    .filter((feature) => feature.properties.primaryBlock)
    .map(featureCenter);
  assert.ok(centers.some(([, latitude]) => latitude < 25.2172),
    "The U-site ensemble must retain a block in the connecting base.");
  assert.ok(centers.some(([longitude, latitude]) => longitude < 55.2790 && latitude > 25.2172),
    "The U-site ensemble must occupy the upper left lobe.");
  assert.ok(centers.some(([longitude, latitude]) => longitude > 55.2810 && latitude > 25.2172),
    "The U-site ensemble must occupy the upper right lobe.");
}
assert.deepEqual(
  generateConceptMassingAlternatives(concaveAoi, civicValidation.value, "cycle04:concave-l-campus"),
  cycle04ConcaveAlternatives,
  "Site-responsive non-rectangular alternatives must remain deterministic."
);
console.log("cycle04 campus geometry metrics", {
  timingsMs: cycle04CampusTimings,
  normalizedCentroidSpan: cycle04CampusSpanScores
});

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

const compactCenter = [55.28, 25.218] as const;
const compactWidthLng = 20 / (111_320 * Math.cos(compactCenter[1] * Math.PI / 180));
const compactHeightLat = 20 / 110_540;
const compactFallbackAoi = [[
  [compactCenter[0], compactCenter[1]],
  [compactCenter[0] + compactWidthLng, compactCenter[1]],
  [compactCenter[0] + compactWidthLng, compactCenter[1] + compactHeightLat],
  [compactCenter[0], compactCenter[1] + compactHeightLat],
  [compactCenter[0], compactCenter[1]]
]] as [number, number][][];
const compactFallbackValidation = validateRedevelopmentProgram({
  ...civicProgram,
  blockCount: 1,
  levelsMin: 4,
  levelsMax: 4,
  targetSiteCoveragePct: 8,
  setbackM: 2
});
if (!compactFallbackValidation.ok) throw new Error(compactFallbackValidation.errors.join("; "));
const compactFallback = generateConceptMassing(
  compactFallbackAoi,
  compactFallbackValidation.value,
  "cycle04:compact-safe-fallback",
  "A"
);
assertGeometryContract(compactFallbackAoi, compactFallbackValidation.value, compactFallback);
assert.ok(compactFallback.featureCollection.features.every((feature) =>
  feature.properties.footprintForm === "rectangle" && feature.geometry.coordinates[0].length - 1 === 4),
"A non-rectangular family that would create sub-floor articulation must fall back to the prior valid rectangle.");

const selfIntersectionMutation = structuredClone(campus);
const selfIntersectionFeature = selfIntersectionMutation.featureCollection.features[0];
const selfIntersectionSource = selfIntersectionFeature.geometry.coordinates[0].slice(0, -1);
const selfIntersectionLongitudes = selfIntersectionSource.map((point) => point[0]);
const selfIntersectionLatitudes = selfIntersectionSource.map((point) => point[1]);
const selfIntersectionMinLng = Math.min(...selfIntersectionLongitudes);
const selfIntersectionMaxLng = Math.max(...selfIntersectionLongitudes);
const selfIntersectionMinLat = Math.min(...selfIntersectionLatitudes);
const selfIntersectionMaxLat = Math.max(...selfIntersectionLatitudes);
selfIntersectionFeature.properties.footprintForm = "rectangle";
selfIntersectionFeature.geometry.coordinates[0] = [
  [selfIntersectionMinLng, selfIntersectionMinLat],
  [selfIntersectionMaxLng, selfIntersectionMaxLat],
  [selfIntersectionMinLng, selfIntersectionMaxLat],
  [selfIntersectionMaxLng, selfIntersectionMinLat],
  [selfIntersectionMinLng, selfIntersectionMinLat]
];
assert.ok(validateConceptMassingGeometry(aoi, civicValidation.value, selfIntersectionMutation)
  .some((error) => /self-intersecting/.test(error)),
"Geometry validation must reject a bow-tie footprint independently of area and containment metrics.");

const clockwiseFootprintMutation = structuredClone(campus);
const clockwiseFootprintFeature = clockwiseFootprintMutation.featureCollection.features[0];
const clockwiseFootprintOpenRing = clockwiseFootprintFeature.geometry.coordinates[0].slice(0, -1).reverse();
clockwiseFootprintFeature.geometry.coordinates[0] = [...clockwiseFootprintOpenRing, clockwiseFootprintOpenRing[0]];
assert.ok(validateConceptMassingGeometry(aoi, civicValidation.value, clockwiseFootprintMutation)
  .some((error) => /counter-clockwise/.test(error)),
"Geometry validation must reject reversed exterior-ring winding while opposite AOI winding remains supported.");

const sliverMutation = structuredClone(campus);
const sliverFeature = sliverMutation.featureCollection.features
  .find((feature) => feature.properties.footprintForm !== "rectangle");
assert.ok(sliverFeature);
const sliverStart = sliverFeature.geometry.coordinates[0][0];
sliverFeature.geometry.coordinates[0][1] = [sliverStart[0] + 1e-9, sliverStart[1]];
assert.ok(validateConceptMassingGeometry(aoi, civicValidation.value, sliverMutation)
  .some((error) => /sliver/.test(error)),
"Geometry validation must reject a non-rectangular edge below the explicit articulation floor.");

const falseArticulationMutation = structuredClone(compactFallback);
falseArticulationMutation.featureCollection.features[0].properties.footprintForm = "l_shape";
assert.ok(validateConceptMassingGeometry(compactFallbackAoi, compactFallbackValidation.value, falseArticulationMutation)
  .some((error) => /declared l_shape footprint topology/.test(error)),
"A rectangular ring must not be relabelled as a complex footprint without real geometry.");

const mislabelledChamferMutation = structuredClone(campus);
const mislabelledChamferFeature = mislabelledChamferMutation.featureCollection.features
  .find((feature) => feature.properties.footprintForm === "l_shape");
assert.ok(mislabelledChamferFeature);
mislabelledChamferFeature.properties.footprintForm = "chamfered";
assert.ok(validateConceptMassingGeometry(aoi, civicValidation.value, mislabelledChamferMutation)
  .some((error) => /declared chamfered footprint topology/.test(error)),
"A concave six-vertex L must not bypass local-shape policy by claiming the convex chamfered grammar.");

const missingFormOnArticulation = structuredClone(campus);
const missingFormFeature = missingFormOnArticulation.featureCollection.features
  .find((feature) => feature.properties.footprintForm === "l_shape");
assert.ok(missingFormFeature);
delete missingFormFeature.properties.footprintForm;
assert.ok(validateConceptMassingGeometry(aoi, civicValidation.value, missingFormOnArticulation)
  .some((error) => /declared rectangle footprint topology/.test(error)),
"Missing legacy form metadata must not default an articulated ring into a rectangular policy class.");

const legacyRectangleWithoutForm = structuredClone(compactFallback);
delete legacyRectangleWithoutForm.featureCollection.features[0].properties.footprintForm;
assert.deepEqual(
  validateConceptMassingGeometry(compactFallbackAoi, compactFallbackValidation.value, legacyRectangleWithoutForm),
  [],
  "A convex four-vertex legacy rectangle without footprint-form metadata must remain readable."
);

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

const editorScopeKey = createPointObjectCreateEditorScopeKey({
  aoiId: "editor-aoi",
  marketKey: "dubai"
});
const editorDraftKey = createPointObjectCreateDraftKey({
  scopeKey: editorScopeKey,
  locale: "en",
  depth: "standard",
  templateId: programInput.templateId,
  customPrompt: "  shaded courtyard  ",
  controls: controlsFromProgram(programInput),
  lockedControlKeys: ["levelsMax", "levelsMin"]
});
assert.equal(editorDraftKey, createPointObjectCreateDraftKey({
  scopeKey: editorScopeKey,
  locale: "en",
  depth: "standard",
  templateId: programInput.templateId,
  customPrompt: "shaded courtyard",
  controls: controlsFromProgram(programInput),
  lockedControlKeys: ["levelsMin", "levelsMax"]
}), "Equivalent draft inputs must retain the same no-op key.");
assert.notEqual(editorDraftKey, createPointObjectCreateDraftKey({
  scopeKey: editorScopeKey,
  locale: "en",
  depth: "standard",
  templateId: programInput.templateId,
  customPrompt: "shaded courtyard",
  controls: { ...controlsFromProgram(programInput), setbackM: programInput.setbackM + 1 },
  lockedControlKeys: ["levelsMin", "levelsMax", "setbackM"]
}), "An edited numeric lock must invalidate the committed draft key.");
assert.notEqual(editorDraftKey, createPointObjectCreateDraftKey({
  scopeKey: editorScopeKey,
  locale: "ru",
  depth: "standard",
  templateId: programInput.templateId,
  customPrompt: "shaded courtyard",
  controls: controlsFromProgram(programInput),
  lockedControlKeys: ["levelsMin", "levelsMax"]
}), "A locale change must invalidate generated prose without changing the editor scope.");
const editorSnapshot = {
  version: 1 as const,
  scopeKey: editorScopeKey,
  templateId: programInput.templateId,
  controls: controlsFromProgram(programInput),
  lockedControlKeys: ["levelsMin", "levelsMax"] as const,
  customPrompt: "shaded courtyard",
  committedDraftKey: editorDraftKey
};
assert.deepEqual(restorePointObjectCreateEditorSnapshot(editorSnapshot, editorScopeKey), {
  ...editorSnapshot,
  lockedControlKeys: ["levelsMin", "levelsMax"]
});
assert.equal(restorePointObjectCreateEditorSnapshot(editorSnapshot, `${editorScopeKey}:other`), null,
  "An editor snapshot must never cross an AOI/market scope.");
assert.equal(restorePointObjectCreateEditorSnapshot({ ...editorSnapshot, controls: { ...editorSnapshot.controls, blockCount: 99 } }, editorScopeKey), null,
  "Out-of-range editor memory must fail closed.");

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
