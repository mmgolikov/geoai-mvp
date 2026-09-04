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
  validateRedevelopmentProgram
} = await import("../src/lib/prototype/point-to-object-create");
const {
  boundedPointObjectCreateAttemptTimeout,
  buildPointObjectCreateResponsesRequest,
  parsePointObjectCreateProgram,
  resolvePointObjectCreateModelProfile
} = await import("../src/lib/prototype/point-to-object-create-ai-core");

const aoi = [[
  [55.278, 25.216],
  [55.281, 25.216],
  [55.281, 25.219],
  [55.278, 25.219],
  [55.278, 25.216]
]] as [number, number][][];

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

const russian = conceptTemplate("civic_green", "ru");
assert.match(russian.title, /[А-Яа-яЁё]/);
assert.equal(validateRedevelopmentProgram({ ...russian, useMix: [{ use: "civic", sharePct: 90 }] }).ok, false);
assert.equal(validateRedevelopmentProgram({ ...programInput, unexpected: true }).ok, false,
  "Runtime validation must reject top-level fields outside the strict response schema.");
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
