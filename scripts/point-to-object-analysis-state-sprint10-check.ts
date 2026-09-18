import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error -- the pinned Node strip-types runner requires explicit TypeScript extensions.
import { POINT_OBJECT_ANALYSIS_CLIENT_DEADLINE_MS, createPointObjectAnalysisRequestIdentity, pointObjectAnalysisReceiptMatches, pointObjectAnalysisRequestChanged, pointObjectSelectionEvidenceKeys } from "../src/lib/prototype/point-to-object-analysis-request-state.ts";

const source = readFileSync(path.join(process.cwd(), "components/point-to-object/analysis-client.tsx"), "utf8");
const i18n = readFileSync(path.join(process.cwd(), "src/lib/prototype/point-to-object-i18n.ts"), "utf8");
const route = readFileSync(path.join(process.cwd(), "app/api/prototype/point-to-object/ai/route.ts"), "utf8");
const provider = readFileSync(path.join(process.cwd(), "src/lib/prototype/point-to-object-ai.ts"), "utf8");

assert.match(source, /inFlightRequest/, "The client must keep an explicit in-flight request snapshot.");
assert.match(source, /analysis-request-state/, "The UI must expose honest draft, in-flight and completed state for browser verification.");
assert.match(source, /analysis\.cancel/, "An in-flight request must have an explicit cancel action.");
assert.match(i18n, /"analysis\.cancel": "Cancel analysis"/, "The cancel action must have readable English copy.");
assert.doesNotMatch(source, /disabled=!question\.trim\(\) \|\| loading/, "A blank grounded refresh must not be disabled solely because the optional question is blank.");
assert.equal(Number(/export const maxDuration = (\d+);/.exec(route)?.[1]) * 1_000, 120_000);
assert.equal(Number(/const ROUTE_SAFE_BUDGET_MS = ([\d_]+);/.exec(route)?.[1]?.replaceAll("_", "")), 115_000);
assert.equal(Number(/const GENERATION_BUDGET_MS = ([\d_]+);/.exec(provider)?.[1]?.replaceAll("_", "")), 108_000);
assert.equal(POINT_OBJECT_ANALYSIS_CLIENT_DEADLINE_MS, 130_000,
  "Client deadline must allow the 120s route contract plus bounded challenge/transport overhead.");
assert.ok(POINT_OBJECT_ANALYSIS_CLIENT_DEADLINE_MS > 82_000 + 30_000,
  "Client deadline must not pre-empt a Deep initial attempt plus its bounded repair attempt.");
assert.match(source, /readPointObjectCompletedRequestIdentity/, "Restore must use the immutable completed identity snapshot.");
assert.doesNotMatch(source, /setCompletedRequest\(requestIdentity\(restoredSelection/,
  "Restore must not reconstruct historical identity from the current role/scenario state.");

const keys = pointObjectSelectionEvidenceKeys({
  locationKey: "dubai",
  longitude: 55.27,
  latitude: 25.2,
  object: { sourceFeatureId: "way/91010", geometry: { type: "Polygon", coordinates: [] } },
  resolvedObject: { sourceFeatureId: "way/91010", geometryType: "Polygon", tags: { building: "hotel" }, linkedEntity: null }
});
const base = {
  ...keys,
  role: "developer" as const,
  scenario: "b2b_hotel_development" as const,
  goal: "development_screening" as const,
  perspective: "developer" as const,
  horizon: "one_to_three_years" as const,
  locale: "en" as const,
  question: null
};
const depths = ["quick", "standard", "deep"] as const;
for (const completedDepth of depths) {
  const completed = createPointObjectAnalysisRequestIdentity({ ...base, depth: completedDepth });
  assert.equal(pointObjectAnalysisRequestChanged(completed, completed), false);
  assert.equal(pointObjectAnalysisReceiptMatches({
    depth: completed.depth,
    goal: completed.goal,
    perspective: completed.perspective,
    horizon: completed.horizon,
    locale: completed.locale,
    question: completed.question,
    focused: false
  }, completed), true);
  for (const draftDepth of depths) {
    const draft = createPointObjectAnalysisRequestIdentity({ ...base, depth: draftDepth });
    assert.equal(pointObjectAnalysisRequestChanged(draft, completed), draftDepth !== completedDepth,
      `${completedDepth} -> ${draftDepth} transition must be represented exactly.`);
  }
}

const custom = createPointObjectAnalysisRequestIdentity({ ...base, depth: "standard", question: "  Check access  ", goal: "custom" });
assert.equal(custom.question, "Check access");
assert.equal(pointObjectAnalysisRequestChanged(custom, createPointObjectAnalysisRequestIdentity({ ...base, depth: "standard" })), true);
assert.equal(pointObjectAnalysisRequestChanged(
  createPointObjectAnalysisRequestIdentity({ ...base, depth: "standard", role: "investor_buyer" }),
  createPointObjectAnalysisRequestIdentity({ ...base, depth: "standard" })
), true, "Role is part of request identity.");
assert.equal(pointObjectAnalysisRequestChanged(
  createPointObjectAnalysisRequestIdentity({ ...base, depth: "standard", scenario: "b2b_redevelopment_selected_aoi" }),
  createPointObjectAnalysisRequestIdentity({ ...base, depth: "standard" })
), true, "Scenario is part of request identity.");
assert.equal(pointObjectAnalysisRequestChanged(
  createPointObjectAnalysisRequestIdentity({ ...base, depth: "standard", evidenceKey: `${keys.evidenceKey}:changed` }),
  createPointObjectAnalysisRequestIdentity({ ...base, depth: "standard" })
), true, "Evidence scope is part of request identity.");

console.log("point-to-object-analysis-state-sprint10-check: PASS");
