import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(new URL("../src/lib/prototype/point-to-object-dashboard-registry.ts", import.meta.url), "utf8");
const module = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);
const { decisionContextSummary: summarize, decisionViews: views } = module;
assert.equal(new Set(Object.values(views).map((view: any) => view.question.en)).size, 2);
assert.notDeepEqual(views.development.cards, views.living.cards);
assert.notDeepEqual(views.development.groups, views.living.groups);
for (const view of Object.values(views) as any[]) {
  assert.equal(view.cards.length, new Set(view.cards).size);
  assert.ok(view.cards.includes("next_check"));
}
const unavailable = summarize(null);
assert.equal(unavailable.available, false);
for (const key of ["sampleSize", "buildings", "levels", "transitM", "roadM"]) assert.equal(unavailable[key], null);
const sparse = { coverage: "unavailable", radiusM: 400, sampleSize: 0, mappedBuildingCount: 0, mappedLevelsKnownCount: 0, medianMappedLevels: null, nearestTransitM: null, nearestMajorRoadM: null, groups: [] };
assert.equal(summarize(sparse).buildings, null, "Unavailable sample is not zero buildings.");
const available = { ...sparse, coverage: "available", sampleSize: 3, mappedBuildingCount: 2, mappedLevelsKnownCount: 0, medianMappedLevels: 0, nearestTransitM: 0, groups: [{ group: "retail_daily_needs", count: 1, sharePct: 33.3, nearestDistanceM: 20 }, { group: "education", count: 0, sharePct: 0, nearestDistanceM: null }] };
const snapshot = JSON.stringify(available);
const output = summarize(available);
assert.equal(output.buildings, 2);
assert.equal(output.levels, null, "No known levels must not be displayed as a measured zero.");
assert.equal(output.transitM, 0, "A genuine zero-distance observation is retained.");
assert.equal(output.roadM, null);
assert.equal(output.groups.length, 1);
assert.equal(output.groups[0].sharePct, 33.3);
assert.equal(JSON.stringify(available), snapshot, "Presentation never mutates the stored evidence.");
console.log("Role decision dashboard contract: PASS (two distinct views, null/zero integrity, shared denominator, immutable evidence).");
