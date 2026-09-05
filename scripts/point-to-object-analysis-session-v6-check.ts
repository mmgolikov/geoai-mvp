import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

async function loadSession(): Promise<Record<string, any>> {
  const file = path.join(process.cwd(), "components/point-to-object/live-session.ts");
  let source = readFileSync(file, "utf8");
  source = source.replace(/import \{ LIVE_POINT_CAVEAT \} from "@\/src\/lib\/point-to-object\/contracts";\n/,
    `const LIVE_POINT_CAVEAT = ${JSON.stringify(CAVEAT)};\n`);
  source = source.replace(/import \{ isPointObjectLocale, isPointObjectMarketKey \} from "@\/src\/lib\/prototype\/point-to-object-markets";\n/,
    `const isPointObjectLocale = (value) => value === "en" || value === "ru";\nconst isPointObjectMarketKey = (value) => ["dubai", "abu_dhabi", "doha", "riyadh", "muscat", "kuala_lumpur", "singapore", "hong_kong", "moscow"].includes(value);\n`);
  source = source.replace(/import \{[\s\S]*?POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION\n\} from "@\/components\/point-to-object\/live-types";\n/,
    `const POINT_OBJECT_ANALYSIS_LEGACY_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V7_2026_09_04";\nconst POINT_OBJECT_ANALYSIS_LEGACY_RESULT_SCHEMA_VERSION = 5;\nconst POINT_OBJECT_ANALYSIS_PROMPT_VERSION = "POINT_OBJECT_AI_PROMPT_V8_2026_09_06";\nconst POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION = 6;\n`);
  const javascript = stripTypeScriptTypes(source, { mode: "transform", sourceMap: false });
  return await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`) as Record<string, any>;
}

const geoContext = {
  radiusM: 400,
  coverage: "available",
  sampleSize: 4,
  capReached: false,
  groups: [{ group: "commercial", count: 4, sharePct: 100, nearestDistanceM: 20 }],
  mappedBuildingCount: 4,
  mappedLevelsKnownCount: 2,
  medianMappedLevels: 10,
  nearestTransitM: 100,
  nearestMajorRoadM: 80,
  districtCharacter: { code: "commercial_business", confidence: "medium", ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1", driverGroups: ["commercial"] }
};
const ref = ["EVD-OBJECT"];
const claim = (statement: string) => ({ statement, evidenceRefs: ref });
const contentV5 = {
  decisionBrief: { headline: "Stored decision", disposition: "hold", summary: "Stored V5 analysis.", reasons: [claim("Reason one"), claim("Reason two"), claim("Reason three")], confidence: "low" },
  signals: Array.from({ length: 4 }, (_, index) => ({ title: `Signal ${index}`, observation: "Observed", implication: "Validate", evidenceClass: "observed", evidenceRefs: ref, confidence: "low" })),
  opportunities: Array.from({ length: 2 }, (_, index) => ({ title: `Option ${index}`, hypothesis: "Hypothesis", rationale: "Rationale", potentialValue: "Unknown", evidenceRefs: ref, evidenceNeeded: ["Official evidence"], confidence: "low" })),
  risks: Array.from({ length: 3 }, (_, index) => ({ title: `Risk ${index}`, statement: "Unknown", decisionImpact: "Hold", severity: "high", evidenceRefs: ref, confidence: "low" })),
  sourceFacts: [claim("Stored source fact")],
  locationContext: [claim("Stored location context")],
  nextValidation: [{ title: "Validate", action: "Check official evidence", source: "Authority", decisionImpact: "Closes gate", priority: "critical", evidenceRefs: ref }],
  answerToQuestion: null,
  geoContext,
  caveat: CAVEAT
};
const request = { depth: "standard", goal: "development_screening", perspective: "developer", horizon: "current", question: null, focused: false, locale: "en" };
const telemetryV5 = {
  provider: "openai",
  schemaVersion: 5,
  model: "gpt-5.6-sol",
  reasoningEffort: "medium",
  depth: "standard",
  promptVersion: "POINT_OBJECT_AI_PROMPT_V7_2026_09_04",
  requestId: "resp_historical",
  latencyMs: 900,
  attempts: 1,
  attemptTrace: [{ attempt: 1, purpose: "initial", model: "gpt-5.6-sol", reasoningEffort: "medium", requestId: "resp_historical", inputTokens: 100, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 20, totalTokens: 120, estimatedCostUsd: null }],
  inputTokens: 100,
  cachedInputTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 20,
  totalTokens: 120,
  estimatedCostUsd: null,
  costRateSource: null,
  stored: false,
  toolCalls: 0
};
const subjectV5 = {
  name: "Stored hotel",
  address: "Dubai",
  featureClass: "tourism:hotel",
  sourceFeatureId: "way/101",
  resolutionMethod: "nominatim_lookup",
  coordinateAssociation: "open_map_geometry_contains_point",
  sourceLabel: "© OpenStreetMap contributors",
  geometryType: "Polygon",
  resultCentroidDistanceM: 5,
  addressParts: { city: "Dubai" },
  tags: { "tag.building": "hotel" },
  metrics: { footprintAreaSqM: 1000, footprintPerimeterM: 140, method: "local_equirectangular_wgs84_approximation", geometryGeneralized: true },
  geoContext
};
const responseV5 = {
  mode: "openai",
  schemaVersion: 5,
  generatedAt: "2026-09-04T12:00:00.000Z",
  evidencePackId: "stored_v5_pack",
  evidencePackHash: "a".repeat(64),
  request,
  content: contentV5,
  subject: subjectV5,
  telemetry: telemetryV5
};

const session = await loadSession();
assert.equal(session.parsePointObjectAiResponse(responseV5), null, "Network/current parser must reject V5 rather than relabel it as current.");
const parsedLegacy = session.parseLegacyPointObjectAiResponse(responseV5);
assert.ok(parsedLegacy, "The exact historical V5 schema/prompt must restore.");
assert.equal(parsedLegacy.schemaVersion, 5);
assert.equal(parsedLegacy.telemetry.promptVersion, "POINT_OBJECT_AI_PROMPT_V7_2026_09_04");
assert.equal(parsedLegacy.telemetry.requestId, "resp_historical");
assert.deepEqual(parsedLegacy.content.geoContext, geoContext, "Nested historical GeoContext must survive restore.");
assert.equal(session.parseLegacyPointObjectAiResponse({ ...responseV5, schemaVersion: 6 }), null);
assert.equal(session.parseLegacyPointObjectAiResponse({ ...responseV5, telemetry: { ...telemetryV5, promptVersion: "POINT_OBJECT_AI_PROMPT_V8_2026_09_06" } }), null,
  "An invalid or current-version payload must not pass the legacy parser.");

const selection = { locationKey: "dubai", longitude: 55.27, latitude: 25.2, clickedAt: "2026-09-04T11:59:00.000Z" };
const key = [selection.locationKey, selection.longitude.toFixed(6), selection.latitude.toFixed(6), selection.clickedAt].join(":");
const values = new Map<string, string>();
values.set("geoai:point-to-object:analysis:v7", JSON.stringify({ selectionFingerprint: key, analysis: responseV5 }));
(globalThis as any).window = { sessionStorage: { getItem: (name: string) => values.get(name) ?? null, setItem: (name: string, value: string) => values.set(name, value), removeItem: (name: string) => values.delete(name) } };
const restored = session.readPointObjectAnalysis(selection);
assert.ok(restored && restored.mode === "openai" && restored.schemaVersion === 5, "A valid stored V5 analysis must be returned directly without any source or paid AI operation.");
assert.equal(restored.telemetry.requestId, "resp_historical", "Historical telemetry must remain historical and exact.");

const clientSource = readFileSync(path.join(process.cwd(), "components/point-to-object/analysis-client.tsx"), "utf8");
assert.match(clientSource, /analysis\.schemaVersion !== POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION\) return;/,
  "Locale changes must not automatically regenerate a restored V5 analysis.");

console.log("point-to-object-analysis-session-v6-check: PASS (strict V6 current path and zero-call V5 restoration)");
