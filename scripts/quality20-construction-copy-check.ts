import assert from "node:assert/strict";
import { createHash } from "node:crypto";
// Installs the existing offline import hooks and checks shared classification.
// @ts-expect-error Node strip-types requires explicit extensions.
await import("./point-to-object-context-classification-check.ts");
// @ts-expect-error Node strip-types requires explicit extensions.
const { normalizeOverpassUrbanFabric } = await import("../src/lib/prototype/point-to-object-live-evidence.ts");
// @ts-expect-error Node strip-types requires explicit extensions.
const { core, evidencePack } = await import("./point-to-object-semantic-v6-check.ts");

const point: [number, number] = [55.36, 25.206];
function fabric(tags: Array<Record<string, string>>) {
  return normalizeOverpassUrbanFabric({ elements: tags.map((entry, i) => ({ type: "way", id: 1000 + i,
    center: { lon: point[0] + i * 0.00001, lat: point[1] }, tags: entry })) }, point);
}
const construction = Array.from({ length: 10 }, () => ({ landuse: "construction" }));
const observed = fabric([...construction, { shop: "convenience" }, { shop: "supermarket" }, { building: "office" }]);
assert.equal(observed.districtCharacter.code, "low_signal");
assert.equal(observed.districtCharacter.confidence, "low");
assert.deepEqual(observed.districtCharacter.driverGroups, ["construction"]);
assert.equal(observed.groups.find(g => g.group === "construction")?.count, 10);
assert.equal(fabric(Array.from({ length: 5 }, () => ({ landuse: "brownfield" }))).districtCharacter.code, "low_signal");
assert.equal(fabric(Array.from({ length: 5 }, () => ({ building: "construction" }))).districtCharacter.code, "low_signal");
assert.equal(fabric([...construction, { landuse: "industrial" }]).districtCharacter.code, "low_signal", "A token industrial feature does not turn construction into industrial use");
assert.equal(fabric([...Array.from({ length: 5 }, () => ({ landuse: "industrial" })), { landuse: "construction" }]).districtCharacter.code, "industrial_logistics");
assert.equal(fabric(Array.from({ length: 5 }, () => ({ building: "residential" }))).districtCharacter.code, "residential");
function canonicalize(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalize);
  return value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)])) : value;
}
const pack = evidencePack();
pack.geoContext = observed;
const { districtCharacter, ...summary } = observed;
pack.evidence.find((item: any) => item.id === "EVD-CONTEXT-SUMMARY").value = JSON.stringify(summary);
pack.evidence.find((item: any) => item.id === "EVD-DISTRICT-PROFILE").value = JSON.stringify({ summaryHash: createHash("sha256").update(JSON.stringify(canonicalize(summary))).digest("hex"), districtCharacter });
const plan = {
  decision: { path: "existing_asset_screen", disposition: "continue_screening", confidence: "medium", reasonCodes: ["object_identity_available", "use_classification_available"] },
  signalCodes: ["object_identity", "use_classification", "building_form"], opportunityCodes: ["existing_asset_repositioning"],
  risks: [{ code: "non_official_source", severity: "high", confidence: "low" }], answerCode: null, focusedAnswer: null,
  caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
};
for (const locale of ["en", "ru"]) {
  const result = core.validatePointObjectAiContentDetailed(plan, pack, { depth: "standard", goal: "custom", perspective: "developer", horizon: "current", question: null, locale });
  assert.equal(result.ok, true, result.detail);
  const text = JSON.stringify(result.content);
  assert.doesNotMatch(text, /active construction|строящихся объектов|industrial and logistics-led|промышленно-логистическая/);
  assert.match(result.content.initialSemanticBrief.implication.statement, locale === "en" ? /mapped construction sites/ : /картографической меткой строительства/);
  assert.match(result.content.sourceFacts.map((v: any) => v.statement).join(" "), locale === "en" ? /not reliably classifiable/ : /не классифицируется надёжно/);
}
console.log("quality20-construction-copy-check: PASS (mapped not active; unknown end use; industrial/residential controls; EN/RU; no network)");
