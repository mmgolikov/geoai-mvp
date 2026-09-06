import assert from "node:assert/strict";

// @ts-expect-error Node's strip-types runner requires the physical .ts suffix; production imports remain extensionless.
import { resolvePointObjectRuntimePolicy } from "../src/lib/prototype/point-object-runtime-policy.ts";

function policy(
  environment: Record<string, string | undefined>,
  options: { openAiKeyConfigured?: boolean; generalUpstreamEnabled?: boolean } = {}
) {
  return resolvePointObjectRuntimePolicy(environment, {
    openAiKeyConfigured: options.openAiKeyConfigured ?? false,
    generalUpstreamEnabled: options.generalUpstreamEnabled ?? false
  });
}

const unsupported = policy({});
assert.equal(unsupported.environment, "unsupported");
assert.equal(unsupported.surface.enabled, false);
assert.equal(unsupported.ai.enabled, false);

for (const misconfigured of ["1", "yes", "enabled", "false"]) {
  const result = policy({
    VERCEL_ENV: "production",
    GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE: misconfigured,
    GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI: "true"
  }, { openAiKeyConfigured: true });
  assert.equal(result.surface.enabled, false, `Production surface must reject ${misconfigured}.`);
  assert.equal(result.ai.enabled, false, `Production AI must reject ${misconfigured}.`);
}

const productionDefault = policy({ VERCEL_ENV: "production" }, { openAiKeyConfigured: true });
assert.equal(productionDefault.surface.enabled, false);
assert.equal(productionDefault.ai.enabled, false);
assert.equal(productionDefault.ai.reason, "production_surface_flag_disabled");

const productionSurfaceOnly = policy({
  VERCEL_ENV: "production",
  GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE: "true"
}, { openAiKeyConfigured: true });
assert.equal(productionSurfaceOnly.surface.enabled, true);
assert.equal(productionSurfaceOnly.ai.enabled, false);
assert.equal(productionSurfaceOnly.ai.reason, "production_ai_flag_disabled");

const productionAiOnly = policy({
  VERCEL_ENV: "production",
  GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI: "true"
}, { openAiKeyConfigured: true });
assert.equal(productionAiOnly.surface.enabled, false);
assert.equal(productionAiOnly.ai.enabled, false);

const productionMissingKey = policy({
  VERCEL_ENV: "production",
  GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE: "true",
  GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI: "true"
});
assert.equal(productionMissingKey.surface.enabled, true);
assert.equal(productionMissingKey.ai.enabled, false);
assert.equal(productionMissingKey.ai.reason, "openai_key_missing");

const productionEnabled = policy({
  VERCEL_ENV: "production",
  GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE: " TRUE ",
  GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI: "true"
}, { openAiKeyConfigured: true });
assert.equal(productionEnabled.surface.enabled, true);
assert.equal(productionEnabled.ai.enabled, true);
assert.equal(productionEnabled.ai.scope, "isolated_point_object_production");

const generalGateCannotLeakToProduction = policy({ VERCEL_ENV: "production" }, {
  openAiKeyConfigured: true,
  generalUpstreamEnabled: true
});
assert.equal(generalGateCannotLeakToProduction.surface.enabled, false);
assert.equal(generalGateCannotLeakToProduction.ai.enabled, false);

const previewDefault = policy({ VERCEL_ENV: "preview" }, { openAiKeyConfigured: true });
assert.equal(previewDefault.surface.enabled, false);
assert.equal(previewDefault.ai.enabled, false);

const previewMissingKey = policy({
  VERCEL_ENV: "preview",
  GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI: "true"
});
assert.equal(previewMissingKey.surface.enabled, true);
assert.equal(previewMissingKey.ai.enabled, false);
assert.equal(previewMissingKey.ai.reason, "openai_key_missing");

const previewEnabled = policy({
  VERCEL_ENV: "preview",
  GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI: "true"
}, { openAiKeyConfigured: true });
assert.equal(previewEnabled.surface.enabled, true);
assert.equal(previewEnabled.ai.enabled, true);
assert.equal(previewEnabled.ai.scope, "isolated_point_object_preview");

const governedPreview = policy({ VERCEL_ENV: "preview" }, {
  openAiKeyConfigured: true,
  generalUpstreamEnabled: true
});
assert.equal(governedPreview.surface.enabled, false);
assert.equal(governedPreview.ai.enabled, true);
assert.equal(governedPreview.ai.scope, "general_governed_upstream");

console.log("Point-to-object runtime policy checks passed: Production fail-closed matrix, independent surface/AI flags, key requirement and unchanged Preview semantics.");
