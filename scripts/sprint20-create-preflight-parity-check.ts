import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return nextResolve(`${specifier}.ts`, context); } catch { /* canonical error below */ }
  }
  return nextResolve(specifier, context);
} });

const { pointObjectCreateAoiHash } = await import("../src/lib/prototype/point-to-object-create-aoi-hash");
const { preflightPointObjectCreate } = await import("../src/lib/prototype/point-to-object-create-orchestration");
const { POINT_OBJECT_CREATE_CONTROL_KEYS } = await import("../src/lib/prototype/point-to-object-create-ai-core");
const worker = readFileSync("components/point-to-object/create-preflight.worker.ts", "utf8");
const panel = readFileSync("components/point-to-object/create-panel.tsx", "utf8");
const route = readFileSync("app/api/prototype/point-to-object/create/route.ts", "utf8");
assert.match(worker, /await pointObjectCreateAoiHash\(event\.data\.aoiCoordinates\)/);
assert.doesNotMatch(panel, /aoiHash:\s*aoi\.id/);
assert.match(route, /sha256\(JSON\.stringify\(body\.aoiCoordinates\)\)/);
const coordinates: [number, number][][] = [[[55.30,25.20],[55.31,25.20],[55.31,25.205],[55.305,25.205],[55.305,25.21],[55.30,25.21],[55.30,25.20]]];
// Round-trip the exact POST encoding, independently calculate the server hash.
const postCoordinates = JSON.parse(JSON.stringify(coordinates));
const serverHash = createHash("sha256").update(JSON.stringify(postCoordinates)).digest("hex");
const browserHash = await pointObjectCreateAoiHash(coordinates);
assert.equal(browserHash, serverHash);
for (const templateId of ["residential_mixed_use", "commercial_hub", "civic_green"] as const) {
  const input = { aoiCoordinates: postCoordinates, locale: "en" as const, templateId, customPrompt: null,
    controls: { blockCount: 9, levelsMin: 6, levelsMax: 53, targetSiteCoveragePct: 38, openSpacePct: 35, setbackM: 8 },
    lockedControlKeys: [...POINT_OBJECT_CREATE_CONTROL_KEYS] };
  assert.deepEqual(preflightPointObjectCreate({ ...input, aoiHash: browserHash }),
    preflightPointObjectCreate({ ...input, aoiHash: serverHash }), `${templateId}: browser/server result parity`);
}
assert.notEqual(await pointObjectCreateAoiHash([[[55.30,25.20],[55.31,25.20],[55.31,25.21],[55.30,25.20]]]), browserHash);
console.log("Create browser/server POST-coordinate hash and preflight parity PASS (three templates).");
