import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";

// Offline integration of the real context response projection with the real
// browser parser. Auth/provider adapters alone are replaced: no HTTP/AI calls.
const root = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* normal resolution */ }
    }
    return nextResolve(specifier, context);
  }
});

const { parseLiveResolvedObject } = await import(new URL("components/point-to-object/live-session.ts", root).href);
const geoContext = {
  radiusM: 400, coverage: "unavailable", sampleSize: 0, capReached: false, groups: [],
  mappedBuildingCount: 0, mappedLevelsKnownCount: 0, medianMappedLevels: null,
  nearestTransitM: null, nearestMajorRoadM: null,
  districtCharacter: { code: "low_signal", confidence: "low", ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1", driverGroups: [] }
};
const footprint = { type: "Polygon", coordinates: [[[55.283, 25.217], [55.284, 25.217], [55.284, 25.218], [55.283, 25.217]]] };
const fixtures = globalThis as typeof globalThis & { __review29ContextPack: Record<string, unknown> };
const makePack = (displayGeometry: unknown, tags: Record<string, string>) => ({
  source: { fabricStatus: "unavailable", fabricDiagnostic: { failureCode: "timeout" } },
  selectedObject: {
    name: "Offline hotel fixture", displayAddress: "Dubai", featureClass: "tourism:hotel",
    sourceFeatureId: "way/393391115", geometryType: "Polygon", addressParts: { city: "Dubai" },
    tags, metrics: null
  },
  resolution: { coordinateAssociation: displayGeometry ? "trusted_open_map_identity" : "reverse_nearest_indexed_object_not_point_in_polygon", resultCentroidDistanceM: 30 },
  displayGeometry, geoContext, linkedEntity: null
});
let source = readFileSync(new URL("app/api/prototype/point-to-object/context/route.ts", root), "utf8")
  .replace('import { NextResponse } from "next/server";',
    'const NextResponse = { json: (body, init = {}) => new Response(JSON.stringify(body), { status: init.status ?? 200, headers: init.headers }) };')
  .replace('import { getPointObjectSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";',
    'const getPointObjectSurfaceStatus = () => ({ enabled: true });')
  .replace('import { requirePilotIdentity, requirePilotMutationOrigin } from "@/src/lib/auth/require-pilot-identity";',
    'const requirePilotIdentity = async () => ({ allowed: true }); const requirePilotMutationOrigin = () => null;')
  .replace('import { LivePointEvidenceError } from "@/src/lib/prototype/point-to-object-live-evidence";',
    'class LivePointEvidenceError extends Error {}')
  .replace('import { acquirePublicEvidenceLease, PublicEvidenceLeaseError } from "@/src/lib/prototype/point-to-object-evidence-lease";',
    'class PublicEvidenceLeaseError extends Error {} const acquirePublicEvidenceLease = async () => ({ pack: globalThis.__review29ContextPack });');
source = stripTypeScriptTypes(source, { mode: "transform", sourceMap: false });
const route = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const oldFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("Network is forbidden in this offline regression"); };
let checks = 0;
async function project(displayGeometry: unknown, tags: Record<string, string>) {
  fixtures.__review29ContextPack = makePack(displayGeometry, tags);
  const response = await route.POST(new Request("https://preview.example.test/api/prototype/point-to-object/context", {
    method: "POST", headers: { origin: "https://preview.example.test", "content-type": "application/json" },
    body: JSON.stringify({ caseKey: "dubai", longitude: 55.283676, latitude: 25.217637, locale: "en" })
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, "resolved");
  const parsed = parseLiveResolvedObject(body.subject);
  assert.ok(parsed, "A successful context route response must pass the real browser parser");
  checks++;
  return { parsed, raw: body.subject };
}
try {
  // Public reverse lookup at the founder's coordinate supplied height=355 but
  // cannot bind that nearby source footprint to an arbitrary selected tile.
  const reverse = await project(null, { height: "355", building: "hotel", "building:levels": "54" });
  assert.equal(reverse.parsed.tags.height, "355", "Preserve source facts; do not promote them to selected volume metadata");
  assert.equal(reverse.parsed.displayGeometry, null);
  assert.equal(reverse.parsed.renderHeightM ?? null, null);
  assert.equal(reverse.parsed.renderMinHeightM ?? null, null);
  const exact = await project(footprint, { height: "355", min_height: "4", building: "hotel" });
  assert.equal(exact.parsed.renderHeightM, 355);
  assert.equal(exact.parsed.renderMinHeightM, 4);
  assert.equal(exact.parsed.geometryProvenance, "confirmed_complete_footprint");
  await project(null, { amenity: "bar" });
  const invalidHeight = await project(footprint, { height: "unknown" });
  assert.equal(invalidHeight.parsed.renderHeightM ?? null, null);
  assert.equal(parseLiveResolvedObject({ ...reverse.raw, renderHeightM: 355 }), null,
    "Keep the client fail-closed against unbound rendering height");
  assert.equal(parseLiveResolvedObject({ ...exact.raw, geometryProvenance: null }), null);
  assert.equal(parseLiveResolvedObject({ ...exact.raw, renderMinHeightM: 355 }), null);
  checks += 3;
  console.log(`review29 context route/browser contract: ${checks}/7 PASS; no network or paid calls`);
} finally {
  globalThis.fetch = oldFetch;
}
