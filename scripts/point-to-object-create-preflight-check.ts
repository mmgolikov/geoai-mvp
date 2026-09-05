import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  bindPointObjectCreateProgramToPreflight,
  POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT,
  pointObjectCreatePreflightAllowsProvider,
  preflightPointObjectCreate
} = await import("../src/lib/prototype/point-to-object-create-orchestration");
const {
  buildPointObjectCreateResponsesRequest,
  POINT_OBJECT_CREATE_CONTROL_KEYS,
  resolvePointObjectCreateModelProfile
} = await import("../src/lib/prototype/point-to-object-create-ai-core");
const {
  conceptTemplate,
  validateConceptMassingGeometry
} = await import("../src/lib/prototype/point-to-object-create");
const {
  POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS
} = await import("../src/lib/prototype/point-to-object-create-editor");

const fixedTowerControls = {
  blockCount: 10,
  levelsMin: 10,
  levelsMax: 53,
  targetSiteCoveragePct: 42,
  openSpacePct: 32,
  setbackM: 10
};
const constrainedSquareControls = {
  blockCount: 4,
  levelsMin: 10,
  levelsMax: 53,
  targetSiteCoveragePct: 60,
  openSpacePct: 32,
  setbackM: 20
};
const allFixedKeys = [...POINT_OBJECT_CREATE_CONTROL_KEYS];
const squareAoi = [[
  [37.62, 55.75],
  [37.621596, 55.75],
  [37.621596, 55.750905],
  [37.62, 55.750905],
  [37.62, 55.75]
]] as [number, number][][];
const rotatedLongAoi = [[
  [37.61819284, 55.74902122],
  [37.62245933, 55.75025333],
  [37.62180716, 55.75097878],
  [37.61754067, 55.74974667],
  [37.61819284, 55.74902122]
]] as [number, number][][];
const genuineNonfitAoi = [[
  [37.62, 55.75],
  [37.62063845, 55.75],
  [37.62063845, 55.75036186],
  [37.62, 55.75036186],
  [37.62, 55.75]
]] as [number, number][][];

const ready = preflightPointObjectCreate({
  aoiCoordinates: squareAoi,
  aoiHash: "cycle03:square100:towers",
  locale: "en",
  templateId: "commercial_hub",
  customPrompt: "Create towers on a podium.",
  controls: fixedTowerControls,
  lockedControlKeys: allFixedKeys
});
assert.equal(ready.kind, "ready", "A fully fixed feasible programme must be solved before the provider request.");
if (ready.kind !== "ready") throw new Error("Expected ready Create preflight.");
assert.equal(ready.searchAttempts, 1);
assert.equal(ready.program.massingStyle, "towers_on_podium");
for (const key of POINT_OBJECT_CREATE_CONTROL_KEYS) assert.equal(ready.program[key], fixedTowerControls[key]);
assert.deepEqual(ready.program.useMix, conceptTemplate("commercial_hub", "en").useMix);
assert.ok(ready.alternatives.length >= 1);
for (const alternative of ready.alternatives) {
  assert.deepEqual(validateConceptMassingGeometry(squareAoi, ready.program, alternative.massing), []);
}

const partial = preflightPointObjectCreate({
  aoiCoordinates: genuineNonfitAoi,
  aoiHash: "cycle03:partial-unconstrained",
  locale: "en",
  templateId: "commercial_hub",
  customPrompt: "Create towers on a podium.",
  controls: fixedTowerControls,
  lockedControlKeys: allFixedKeys.slice(0, -1)
});
assert.deepEqual(partial, {
  kind: "not_applicable",
  requestedMassingStyle: "towers_on_podium",
  reason: "numeric_programme_not_fully_fixed"
}, "A genuinely variable programme must not be pre-rejected by fixed-programme geometry.");

const elongated = preflightPointObjectCreate({
  aoiCoordinates: rotatedLongAoi,
  aoiHash: "rotatedLong:towers",
  locale: "en",
  templateId: "commercial_hub",
  customPrompt: "Create towers on a podium.",
  controls: fixedTowerControls,
  lockedControlKeys: allFixedKeys
});
assert.ok(elongated.kind === "ready" || elongated.kind === "suggestion",
  "The elongated baseline must retain either an exact validated result or an actually validated lower-coverage candidate.");
if (elongated.kind !== "ready" && elongated.kind !== "suggestion") throw new Error("Expected a validated elongated result.");
assert.equal(elongated.program.targetSiteCoveragePct,
  elongated.kind === "ready" ? fixedTowerControls.targetSiteCoveragePct : elongated.suggestion.suggestedValue);
for (const alternative of elongated.alternatives) {
  assert.deepEqual(validateConceptMassingGeometry(rotatedLongAoi, elongated.program, alternative.massing), []);
}

const suggestion = preflightPointObjectCreate({
  aoiCoordinates: squareAoi,
  aoiHash: "cycle03:square100:coverage60:setback20",
  locale: "en",
  templateId: "commercial_hub",
  customPrompt: "Create towers on a podium.",
  controls: constrainedSquareControls,
  lockedControlKeys: allFixedKeys
});
assert.equal(suggestion.kind, "suggestion",
  "A 60% fixed target cannot fit inside the square's 60 by 60 metre setback envelope and must expose only a validated lower target.");
if (suggestion.kind !== "suggestion") throw new Error("Expected bounded coverage suggestion.");
assert.equal(suggestion.suggestion.control, "targetSiteCoveragePct");
assert.equal(suggestion.suggestion.basis, "bounded_validated_geometry_candidate");
assert.equal(suggestion.suggestion.requestedValue, constrainedSquareControls.targetSiteCoveragePct);
assert.ok(suggestion.suggestion.suggestedValue < suggestion.suggestion.requestedValue);
assert.ok(Math.abs(suggestion.suggestion.validatedAchievedValue - suggestion.suggestion.suggestedValue) <= 1);
assert.ok(suggestion.suggestion.searchAttempts >= 2);
assert.ok(suggestion.suggestion.searchAttempts <= POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT);
for (const alternative of suggestion.alternatives) {
  assert.deepEqual(validateConceptMassingGeometry(squareAoi, suggestion.program, alternative.massing), []);
}

const exhausted = preflightPointObjectCreate({
  aoiCoordinates: genuineNonfitAoi,
  aoiHash: "cycle03:genuine-nonfit:towers",
  locale: "en",
  templateId: "commercial_hub",
  customPrompt: "Create towers on a podium.",
  controls: fixedTowerControls,
  lockedControlKeys: allFixedKeys
});
assert.deepEqual(exhausted, {
  kind: "failed",
  code: "solver_exhausted",
  searchAttempts: POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT
});

let providerCalls = 0;
for (const preflight of [suggestion, exhausted]) {
  if (pointObjectCreatePreflightAllowsProvider(preflight)) providerCalls += 1;
}
assert.equal(providerCalls, 0, "Suggestion and bounded solver exhaustion must make zero provider calls.");
assert.equal(pointObjectCreatePreflightAllowsProvider(ready), true);
assert.equal(pointObjectCreatePreflightAllowsProvider(partial), true);

const generatedNarrative = {
  ...ready.program,
  title: "Provider-authored bounded title",
  summary: "Provider-authored narrative for the fixed commercial mix.",
  rationale: ["Provider-authored rationale."],
  useMix: [
    { use: "residential" as const, sharePct: 90 },
    { use: "open_space" as const, sharePct: 10 }
  ]
};
const boundProgram = bindPointObjectCreateProgramToPreflight(generatedNarrative, ready);
assert.equal(boundProgram.title, generatedNarrative.title);
assert.equal(boundProgram.summary, generatedNarrative.summary);
assert.deepEqual(boundProgram.rationale, generatedNarrative.rationale);
assert.deepEqual(boundProgram.useMix, ready.program.useMix, "Fixed-programme structural use mix must not be replaced by provider output.");
for (const key of POINT_OBJECT_CREATE_CONTROL_KEYS) assert.equal(boundProgram[key], fixedTowerControls[key]);
assert.equal(boundProgram.massingStyle, "towers_on_podium");

const profile = resolvePointObjectCreateModelProfile("standard", null);
assert.ok(profile);
const request = buildPointObjectCreateResponsesRequest({
  locale: "en",
  templateId: "commercial_hub",
  customPrompt: "Create towers on a podium.",
  aoiAreaSqM: ready.alternatives[0].massing.aoiAreaSqM,
  aoiWidthM: 100,
  aoiHeightM: 100,
  areaContext: null,
  requestedParameters: fixedTowerControls,
  requestedMassingStyle: ready.program.massingStyle,
  requestedUseMix: ready.program.useMix
}, profile);
assert.deepEqual(request.text.format.schema.properties.massingStyle.enum, ["towers_on_podium"]);
const requestPayload = request.input[1].content[0].text;
assert.match(requestPayload, /"requestedMassingStyle":"towers_on_podium"/);
assert.match(requestPayload, /"requestedUseMix":\[\{"use":"office","sharePct":56\}/);
assert.match(request.input[0].content[0].text, /preserve its ordered use\/share pairs exactly/);

assert.deepEqual(POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS, POINT_OBJECT_CREATE_CONTROL_KEYS,
  "The browser editor and API must share the exact six-control fixed contract.");

const routeSource = readFileSync(new URL("../app/api/prototype/point-to-object/create/route.ts", import.meta.url), "utf8");
const postSource = routeSource.slice(routeSource.indexOf("export async function POST"));
const preflightIndex = postSource.indexOf("const preflight = preflightPointObjectCreate(");
const profileIndex = postSource.indexOf("const profile = profileFor(");
const areaContextIndex = postSource.indexOf("await resolvePointObjectAreaContext(");
const providerIndex = postSource.indexOf("let attempt = await callTrackedOpenAi(");
assert.ok(preflightIndex >= 0 && profileIndex > preflightIndex && areaContextIndex > profileIndex && providerIndex > areaContextIndex,
  "Fixed-programme preflight must precede area context and provider work.");
assert.match(postSource, /const startedAt = Date\.now\(\);\s*const deadline = startedAt \+ CREATE_TIMEOUT_MS;[\s\S]*const preflight = preflightPointObjectCreate/);
assert.match(postSource, /geometryPreflightMs > CREATE_PREFLIGHT_BUDGET_MS/);
assert.ok((postSource.match(/providerCalls: 0/g) ?? []).length >= 3,
  "Every deterministic preflight rejection must report zero provider calls.");
assert.match(routeSource, /JSON\.stringify\(program\.value\.useMix\) !== JSON\.stringify\(useMix\)/);
assert.match(postSource, /PointObjectCreateProviderError[\s\S]*usage: error\.usage/);
assert.match(postSource, /const index = attemptUsage\.push\([\s\S]*usage: extractResponsesUsage\(null\)[\s\S]*\) - 1;/,
  "A dispatched transport failure must retain one attempt with unknown usage.");
assert.ok((postSource.match(/telemetry: failureTelemetry\(\)/g) ?? []).length >= 3,
  "Every post-provider error lane must retain bounded usage telemetry when available.");

const panelSource = readFileSync(new URL("../components/point-to-object/create-panel.tsx", import.meta.url), "utf8");
assert.match(panelSource, /new Set\(POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS\)/,
  "Displayed numeric controls must be fixed by default.");
assert.doesNotMatch(panelSource, /edited:\s*"Fixed"|Зафиксировано/,
  "All-fixed mode must not add repeated methodology badges beside every value.");
assert.match(panelSource, /data-testid="create-coverage-suggestion"/);
assert.match(panelSource, /data-testid="create-apply-suggested-coverage"/);
assert.match(panelSource, /controller\.signal\.aborted \|\| requestId !== requestIdRef\.current/,
  "Suggestion responses must be guarded by the active request identity.");
assert.match(panelSource, /Math\.abs\(suggestion\.validatedAchievedValue - suggestion\.suggestedValue\) > 1/);
const applySource = panelSource.slice(panelSource.indexOf("function applySuggestedCoverage"), panelSource.indexOf("return (", panelSource.indexOf("function applySuggestedCoverage")));
assert.match(applySource, /updateControl\("targetSiteCoveragePct", coverageSuggestion\.suggestion\.suggestedValue\)/);
assert.doesNotMatch(applySource, /fetch\(/, "Apply suggestion must be browser-local and must not call an API.");
assert.match(panelSource, /resetParameters: "Reset parameters"/);
assert.match(panelSource, /resetParameters: "Сбросить параметры"/);

console.log("Point-to-Object Create fixed-control and preflight checks passed.");
