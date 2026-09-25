import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { QUALITY20_CASES, QUALITY20_ORIGINAL_CASE_COUNT, QUALITY20_AMENDMENT, quality20Hash,
  quality20CreateProgrammeTestId, quality20CreateControls, validateQuality20Manifest,
  validateQuality20PaidBody, quality20RequestKey } from "../tests/e2e/helpers/quality20-frozen-case.ts";

assert.equal(QUALITY20_ORIGINAL_CASE_COUNT, 54);
assert.equal(QUALITY20_CASES.length, 58);
// Captured from the unmodified original 54 definitions before this extension.
assert.equal(createHash("sha256").update(JSON.stringify(QUALITY20_CASES.slice(0, 54))).digest("hex"),
  "29e5c20f4bfe8ec59a995f1caa335b5f5826b0f4dac7a398bb77d9665bdc12e9");
assert.deepEqual(QUALITY20_CASES.slice(54).map(c => [c.id, c.programme, c.aoiSlot]), [
  ["C-RQ-01", "residential_quarter", "rectangle"], ["C-RQ-02", "residential_quarter", "concave"],
  ["C-HR-01", "hospitality_recreation", "rectangle"], ["C-HR-02", "hospitality_recreation", "concave"]
]);
assert.equal(new Set(QUALITY20_CASES.map(c => c.id)).size, 58);
assert.equal(QUALITY20_CASES.filter(c => c.scope === "quality20-analyse").length, 43);
assert.equal(QUALITY20_CASES.filter(c => c.scope === "quality20-find").length, 5);
assert.equal(QUALITY20_CASES.filter(c => c.scope === "quality20-create").length, 10);
assert.equal(90 + QUALITY20_CASES.filter(c => c.scope !== "quality20-find").length, 143);

// Synthetic polygons ONLY for the offline contract. No founder/site claim.
const shapes = {
  rectangle: [[55.2, 25.1], [55.21, 25.1], [55.21, 25.11], [55.2, 25.11]],
  concave: [[55.2, 25.1], [55.21, 25.1], [55.21, 25.105], [55.205, 25.105], [55.205, 25.11], [55.2, 25.11]]
};
const execution = { commit: "a".repeat(40), origin: "https://geoai-catalog-offline.vercel.app", deploymentId: "dpl_OFFLINE" };
const cases = QUALITY20_CASES.map(definition => ({ id: definition.id, binding: definition.scope !== "quality20-create" ? null : {
  query: "OFFLINE synthetic AOI", locale: "en", question: "OFFLINE Create contract", role: "developer", scenario: "unspecified", goal: "custom",
  subject: null, find: null, create: { coordinates: shapes[definition.aoiSlot], geometryHash: quality20Hash(shapes[definition.aoiSlot]),
    contextHash: "b".repeat(64), aoiId: `OFFLINE-${definition.aoiSlot}`, prompt: `OFFLINE ${definition.programme}` }
} }));
const manifest = { schemaVersion: "geoai.quality20.frozen-cases.v1", amendment: QUALITY20_AMENDMENT,
  frozenAt: "2026-09-25T10:00:00.000Z", execution, cases };
const select = (value, id = "C-RQ-01") => {
  const bytes = JSON.stringify(value);
  return validateQuality20Manifest(bytes, createHash("sha256").update(bytes).digest("hex"), id,
    "quality20-create", execution, Date.parse("2026-09-25T11:00:00.000Z"));
};
for (const definition of QUALITY20_CASES.filter(c => c.scope === "quality20-create")) {
  const selection = select(manifest, definition.id);
  assert.equal(quality20CreateProgrammeTestId(definition.programme), `create-programme-${definition.programme}`);
  const coordinates = selection.binding.create.coordinates;
  const controls = quality20CreateControls(definition.programme);
  const body = { marketKey: "dubai", locale: "en", depth: "standard", templateId: definition.programme,
    customPrompt: selection.binding.create.prompt, aoiCoordinates: [[...coordinates, coordinates[0]]],
    controls, lockedControlKeys: Object.keys(controls) };
  validateQuality20PaidBody(selection, "create", body);
  assert.match(quality20RequestKey(selection, "create"), new RegExp(`^Q20:${definition.id}:CREATE:[A-F0-9]{64}$`));
  for (const patch of [
    { templateId: "not_registered" }, { controls: { ...controls, blockCount: controls.blockCount + 1 } },
    { controls: { ...controls, setbackM: 0 } }, { lockedControlKeys: Object.keys(controls).slice(1) },
    { lockedControlKeys: [...Object.keys(controls), "blockCount"] }, { controls: undefined },
    { customPrompt: "changed" }, { aoiCoordinates: [[...shapes[definition.aoiSlot === "rectangle" ? "concave" : "rectangle"], coordinates[0]]] }
  ]) assert.throws(() => validateQuality20PaidBody(selection, "create", { ...body, ...patch }));
}
assert.equal(quality20CreateProgrammeTestId(), "create-programme-commercial_hub");
assert.throws(() => quality20CreateProgrammeTestId("UNKNOWN"), /no fallback/);
assert.throws(() => quality20CreateControls("UNKNOWN"));
assert.throws(() => select({ ...manifest, cases: manifest.cases.slice(0, 54) }), /54 cases.*four/);
assert.throws(() => select({ ...manifest, cases: [...manifest.cases.slice(0, -1), manifest.cases[54]] }), /Duplicate/);
const differentAoi = structuredClone(manifest);
const changed = differentAoi.cases.find(c => c.id === "C-HR-01").binding.create;
changed.coordinates = structuredClone(changed.coordinates);
changed.coordinates[0][0] += 0.001;
changed.geometryHash = quality20Hash(changed.coordinates);
assert.throws(() => select(differentAoi), /same frozen AOI/);
console.log("PASS: original54 byte-identical; RQ/HR append4; all10 Create bindings, numeric locks, request identity and shared-AOI negatives. 58 cases/53 paid; no live outcomes.");
