import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = pathToFileURL(`${process.cwd()}/`);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, repositoryRoot).href, context);
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* Continue with canonical resolution. */ }
    }
    return nextResolve(specifier, context);
  }
});

// @ts-expect-error -- the pinned Node transform-types runner requires explicit TypeScript extensions.
const provenance = await import("../src/lib/prototype/point-to-object-ai-provenance.ts");
// @ts-expect-error -- the pinned Node transform-types runner requires explicit TypeScript extensions.
const requestState = await import("../src/lib/prototype/point-to-object-analysis-request-state.ts");
// @ts-expect-error -- the pinned Node transform-types runner requires explicit TypeScript extensions.
const session = await import("../components/point-to-object/live-session.ts");
// @ts-expect-error -- the pinned Node transform-types runner requires explicit TypeScript extensions.
const core = await import("../src/lib/prototype/point-to-object-ai-core.ts");

assert.deepEqual(
  provenance.parsePointObjectAnalysisRoleScenario("consultant_broker", "b2b_hotel_development"),
  { role: "consultant_broker", scenario: "b2b_hotel_development" }
);
assert.deepEqual(
  provenance.parsePointObjectAnalysisRoleScenario("developer", "unspecified"),
  { role: "developer", scenario: "unspecified" }
);
assert.deepEqual(
  provenance.parsePointObjectAnalysisRoleScenario("unspecified", "unspecified"),
  { role: "unspecified", scenario: "unspecified" }
);
for (const [role, scenario] of [
  ["developer", "b2c_point_context"],
  ["developer", "b2b_hotel_development"],
  ["unspecified", "b2b_redevelopment_selected_aoi"],
  ["developer\nadmin", "b2b_redevelopment_selected_aoi"],
  ["developer", "b2b_redevelopment_selected_aoi<script>"]
]) {
  assert.equal(provenance.parsePointObjectAnalysisRoleScenario(role, scenario), null,
    `Invalid or untrusted role/scenario must fail closed: ${role}/${scenario}`);
}

assert.equal(provenance.pointObjectAnalysisTargetMatches(null, null), false,
  "a free point and an unbound Find session must not become a provenance match");
assert.equal(provenance.pointObjectAnalysisTargetMatches("way/91011", "way/91010"), false,
  "different valid source identities must not share Find provenance");
assert.equal(provenance.pointObjectAnalysisTargetMatches("way/91010", "way/91010"), true,
  "the exact non-empty valid source identity must preserve the Find handoff");
assert.equal(provenance.pointObjectAnalysisTargetMatches("", ""), false);
assert.equal(provenance.pointObjectAnalysisTargetMatches("untrusted", "untrusted"), false);

const identity = requestState.createPointObjectAnalysisRequestIdentity({
  objectKey: "way/91010",
  evidenceKey: "synthetic-evidence-v1",
  role: "consultant_broker",
  scenario: "b2b_hotel_development",
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "one_to_three_years",
  locale: "en",
  question: null
});
assert.deepEqual(requestState.parsePointObjectAnalysisRequestIdentity(JSON.parse(JSON.stringify(identity))), identity);
assert.equal(requestState.parsePointObjectAnalysisRequestIdentity({ ...identity, role: "root" }), null);
assert.equal(requestState.parsePointObjectAnalysisRequestIdentity({ ...identity, scenario: "b2c_point_context" }), null);

const exactReceipt = {
  role: identity.role,
  scenario: identity.scenario,
  depth: identity.depth,
  goal: identity.goal,
  perspective: identity.perspective,
  horizon: identity.horizon,
  question: identity.question,
  focused: false,
  locale: identity.locale
};
assert.equal(requestState.pointObjectAnalysisReceiptMatches(exactReceipt, identity), true);
assert.equal(requestState.pointObjectAnalysisReceiptMatches({ ...exactReceipt, role: "real_estate_fund" }, identity), false);
assert.equal(requestState.pointObjectAnalysisReceiptMatches({ ...exactReceipt, scenario: "b2b_commercial_real_estate" }, identity), false);
assert.equal(requestState.pointObjectAnalysisReceiptMatches({
  depth: identity.depth,
  goal: identity.goal,
  perspective: identity.perspective,
  horizon: identity.horizon,
  question: null,
  focused: false,
  locale: "en"
}, identity), false, "A legacy unspecified receipt must not match a newly submitted role-specific request.");

const parsedCurrentReceipt = session.parsePointObjectAnalysisRequestReceipt(exactReceipt);
assert.deepEqual(parsedCurrentReceipt, exactReceipt);
assert.deepEqual(session.parsePointObjectAnalysisRequestReceipt({
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "current",
  question: null,
  focused: false,
  locale: "en"
}), {
  role: "unspecified",
  scenario: "unspecified",
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "current",
  question: null,
  focused: false,
  locale: "en"
}, "A pre-provenance saved receipt must restore explicitly as unspecified.");
assert.equal(session.parsePointObjectAnalysisRequestReceipt({ ...exactReceipt, role: "developer" }), null,
  "A role/scenario mismatch must not restore as a trusted receipt.");
assert.equal(session.parsePointObjectAnalysisRequestReceipt({ ...exactReceipt, role: "developer<script>" }), null);

const geoContext = {
  radiusM: 400,
  coverage: "unavailable",
  sampleSize: 0,
  capReached: false,
  groups: [],
  mappedBuildingCount: 0,
  mappedLevelsKnownCount: 0,
  medianMappedLevels: null,
  nearestTransitM: null,
  nearestMajorRoadM: null,
  districtCharacter: {
    code: "low_signal",
    confidence: "low",
    ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1",
    driverGroups: []
  }
};
const evidencePack: any = {
  protocol: "POINT_TO_OBJECT_001_AI_EVIDENCE_PACK_LIVE_V2",
  coordinates: { longitude: 55.27, latitude: 25.2, crs: "EPSG:4326" },
  resolution: {
    matchMethod: "nominatim_lookup",
    coordinateAssociation: "open_map_geometry_contains_point",
    resultCentroidDistanceM: 0
  },
  selectedObject: {
    sourceFeatureId: "way/91010",
    name: "Synthetic Hotel",
    displayAddress: "Synthetic Hotel, Dubai",
    featureClass: "tourism:hotel",
    geometryType: "Polygon",
    geometryHash: "a".repeat(64),
    addressParts: { city: "Dubai" },
    tags: { "tag.building": "hotel" },
    metrics: null
  },
  linkedEntity: null,
  nearbyContext: [],
  geoContext,
  evidence: [
    { id: "EVD-COORDINATES", label: "point", sourceId: "user_point", value: JSON.stringify({ longitude: 55.27, latitude: 25.2, crs: "EPSG:4326" }) },
    { id: "EVD-OSM-OBJECT", label: "object", sourceId: "way/91010", value: JSON.stringify({ sourceFeatureId: "way/91010", name: "Synthetic Hotel" }) },
    { id: "EVD-CLASSIFICATION", label: "class", sourceId: "way/91010", value: JSON.stringify({ sourceFeatureId: "way/91010", featureClass: "tourism:hotel" }) },
    { id: "EVD-ALLOWED-FIELDS", label: "fields", sourceId: "way/91010", value: JSON.stringify({ sourceFeatureId: "way/91010", tags: { "tag.building": "hotel" } }) },
    { id: "EVD-SOURCE", label: "source", sourceId: "SPAT-001", value: "© OpenStreetMap contributors; ODbL 1.0" }
  ]
};
const providerRequest = core.buildPointObjectResponsesRequest(evidencePack, {
  role: "consultant_broker",
  scenario: "b2b_hotel_development",
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "one_to_three_years",
  question: null,
  locale: "en"
}, { model: "gpt-5.6-terra", reasoningEffort: "medium", verbosity: "medium", maxOutputTokens: 5_000 });
const providerPayload = JSON.parse(providerRequest.input[1].content[0].text);
assert.deepEqual(providerPayload.analysisRequest, {
  role: "consultant_broker",
  scenario: "b2b_hotel_development",
  rolePolicy: "decision_lens_only_not_permission_or_evidence",
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "one_to_three_years",
  locale: "en",
  focusedQuestion: null
});
assert.match(providerRequest.input[0].content[0].text, /decision lens only/);
const legacyProviderPayload = JSON.parse(core.buildPointObjectResponsesRequest(evidencePack, {
  depth: "quick",
  goal: "object_profile",
  perspective: "asset_owner",
  horizon: "current",
  question: null,
  locale: "en"
}, { model: "gpt-5.6-luna", reasoningEffort: "low", verbosity: "low", maxOutputTokens: 2_800 }).input[1].content[0].text);
assert.equal(legacyProviderPayload.analysisRequest.role, "unspecified");
assert.equal(legacyProviderPayload.analysisRequest.scenario, "unspecified");

type FixtureGlobals = typeof globalThis & {
  __analysisProvenanceEvidenceCalls?: number;
  __analysisProvenanceProviderCalls?: number;
  __analysisProvenanceProviderRequest?: Record<string, unknown> | null;
};
const fixture = globalThis as FixtureGlobals;
fixture.__analysisProvenanceEvidenceCalls = 0;
fixture.__analysisProvenanceProviderCalls = 0;
fixture.__analysisProvenanceProviderRequest = null;

const routePath = path.join(process.cwd(), "app/api/prototype/point-to-object/ai/route.ts");
const routeSource = readFileSync(routePath, "utf8")
  .replace('import { NextResponse } from "next/server";', `
    const NextResponse = { json(body, init = {}) { return new Response(JSON.stringify(body), {
      status: init.status ?? 200, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
    }); } };
  `)
  .replace('import { getPointObjectUpstreamStatus } from "@/src/lib/ai/openai-upstream-gate";',
    'const getPointObjectUpstreamStatus = () => ({ enabled: true });')
  .replace('import { requirePilotIdentity, requirePilotMutationOrigin } from "@/src/lib/auth/require-pilot-identity";', `
    const requirePilotIdentity = async () => ({ allowed: true });
    const requirePilotMutationOrigin = () => null;
  `)
  .replace(/import \{\s*generatePointObjectAiAnalysis,\s*PointObjectAiServiceError\s*\} from "@\/src\/lib\/prototype\/point-to-object-ai";/, `
    class PointObjectAiServiceError extends Error {}
    const generatePointObjectAiAnalysis = async (_evidencePack, analysisRequest) => {
      globalThis.__analysisProvenanceProviderCalls += 1;
      globalThis.__analysisProvenanceProviderRequest = analysisRequest;
      return {
        mode: "openai", schemaVersion: 6, generatedAt: "2026-09-18T12:00:00.000Z",
        evidencePackId: "fixture-pack", evidencePackHash: "a".repeat(64),
        request: { ...analysisRequest, focused: Boolean(analysisRequest.question) }, content: {}, telemetry: {}
      };
    };
  `)
  .replace('import { LivePointEvidenceError } from "@/src/lib/prototype/point-to-object-live-evidence";', `
    class LivePointEvidenceError extends Error {}
  `)
  .replace('import { reusePublicEvidenceLease, PublicEvidenceLeaseError } from "@/src/lib/prototype/point-to-object-evidence-lease";', `
    class PublicEvidenceLeaseError extends Error {
      code = "EVIDENCE_SNAPSHOT_UNAVAILABLE";
    }
    const reusePublicEvidenceLease = async (_input, receipt) => {
      globalThis.__analysisProvenanceEvidenceCalls += 1;
      return { receipt, pack: {
        selectedObject: { name: "Fixture object", displayAddress: "Dubai", featureClass: "building", sourceFeatureId: "way/123", geometryType: "Polygon", addressParts: {}, tags: {}, metrics: null },
        resolution: { matchMethod: "nominatim_lookup", coordinateAssociation: "open_map_geometry_contains_point", resultCentroidDistanceM: 0 },
        source: { attribution: "Offline fixture" }, geoContext: null, linkedEntity: null
      } };
    };
  `)
  .replace(/from "@\/([^\"]+)";/g, (_match, relative: string) =>
    `from ${JSON.stringify(new URL(`${relative}.ts`, repositoryRoot).href)};`);
const route = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(routeSource, { mode: "transform", sourceMap: false })).toString("base64")}`) as {
  GET(request: Request): Promise<Response>;
  POST(request: Request): Promise<Response>;
};

const origin = "https://fixture.example.test";
const routeUrl = `${origin}/api/prototype/point-to-object/ai`;
async function routeCall(overrides: Record<string, unknown> = {}) {
  const leaseCreatedAt = Date.now();
  const evidenceReceipt = {
    version: "PUBLIC_EVIDENCE_LEASE_V1", evidencePackHash: "a".repeat(64), sourceResponseHash: "b".repeat(64),
    acquiredAt: new Date(leaseCreatedAt).toISOString(), createdAt: new Date(leaseCreatedAt).toISOString(),
    expiresAt: new Date(leaseCreatedAt + 15 * 60_000).toISOString(), cacheWindow: Math.floor(leaseCreatedAt / (15 * 60_000)),
    sourceLocale: "en", lookupSourceFeatureId: "way/123"
  };
  const challengeResponse = await route.GET(new Request(routeUrl));
  assert.equal(challengeResponse.status, 200);
  const challengeBody = await challengeResponse.json() as { challenge: string };
  const cookie = challengeResponse.headers.get("Set-Cookie")?.split(";")[0];
  assert.ok(cookie);
  return route.POST(new Request(routeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie, "x-forwarded-for": "203.0.113.71" },
    body: JSON.stringify({
      caseKey: "dubai",
      longitude: 55.27,
      latitude: 25.2,
      locale: "en",
      role: "consultant_broker",
      scenario: "b2b_hotel_development",
      depth: "standard",
      goal: "development_screening",
      perspective: "developer",
      horizon: "one_to_three_years",
      question: null,
      expectedSourceFeatureId: "way/123",
      evidenceReceipt,
      consent: true,
      challenge: challengeBody.challenge,
      ...overrides
    })
  }));
}

for (const invalid of [
  { role: "developer", scenario: "b2b_hotel_development" },
  { role: "developer\nadmin", scenario: "b2b_redevelopment_selected_aoi" },
  { role: "unspecified", scenario: "b2c_point_context" }
]) {
  const response = await routeCall(invalid);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "AI_REQUEST_INVALID");
}
assert.equal(fixture.__analysisProvenanceEvidenceCalls, 0, "Invalid context must fail before evidence-lease lookup.");
assert.equal(fixture.__analysisProvenanceProviderCalls, 0, "Invalid context must fail before provider invocation.");

const missingLease = await routeCall({ evidenceReceipt: undefined });
assert.equal(missingLease.status, 409, "A missing lease must stop before provider invocation.");
assert.equal(fixture.__analysisProvenanceEvidenceCalls, 0);
assert.equal(fixture.__analysisProvenanceProviderCalls, 0);

const validResponse = await routeCall();
assert.equal(validResponse.status, 200);
const validBody = await validResponse.json();
assert.deepEqual(validBody.request, {
  role: "consultant_broker",
  scenario: "b2b_hotel_development",
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "one_to_three_years",
  question: null,
  locale: "en",
  focused: false
});
assert.deepEqual(fixture.__analysisProvenanceProviderRequest, {
  role: "consultant_broker",
  scenario: "b2b_hotel_development",
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "one_to_three_years",
  question: null,
  locale: "en"
});

const legacyResponse = await routeCall({ role: undefined, scenario: undefined });
assert.equal(legacyResponse.status, 200);
assert.deepEqual((await legacyResponse.json()).request, {
  role: "unspecified",
  scenario: "unspecified",
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "one_to_three_years",
  question: null,
  locale: "en",
  focused: false
});
assert.equal(fixture.__analysisProvenanceEvidenceCalls, 2);
assert.equal(fixture.__analysisProvenanceProviderCalls, 2);

const clientSource = readFileSync(path.join(process.cwd(), "components/point-to-object/analysis-client.tsx"), "utf8");
assert.match(clientSource, /role: requestSnapshot\.role/);
assert.match(clientSource, /scenario: requestSnapshot\.scenario/);
assert.match(clientSource, /latestRoleScenario\.role !== requestSnapshot\.role/,
  "A role change while the provider is running must prevent the stale-context result from committing.");
assert.match(clientSource, /latestRoleScenario\.scenario !== requestSnapshot\.scenario/,
  "A scenario change while the provider is running must prevent the stale-context result from committing.");
const serviceSource = readFileSync(path.join(process.cwd(), "src/lib/prototype/point-to-object-ai.ts"), "utf8");
assert.match(serviceSource, /role: roleScenario\.role/);
assert.match(serviceSource, /scenario: roleScenario\.scenario/);
assert.equal(core.POINT_OBJECT_AI_PROMPT_VERSION, "POINT_OBJECT_AI_PROMPT_V13_2026_09_26");

console.log("point-to-object-analysis-provenance-check: PASS (registry validation, provider lens, exact receipt, legacy unspecified restore and pre-provider rejection)");
