import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const integrationRoot = resolve(process.argv[2] ?? process.cwd());
const routePath = `${integrationRoot}/app/api/prototype/point-to-object/context/route.ts`;
const original = readFileSync(routePath, "utf8");

function replaceRequired(source, pattern, replacement, label) {
  const updated = source.replace(pattern, replacement);
  assert.notEqual(updated, source, `Unable to isolate ${label} in the integration route.`);
  return updated;
}

const actualEvidencePackHash = "a".repeat(64);
const actualSourceResponseHash = "b".repeat(64);
const created = Math.floor(Date.now() / 900_000) * 900_000;
const actualReceipt = {
  version: "PUBLIC_EVIDENCE_LEASE_V1",
  evidencePackHash: actualEvidencePackHash,
  sourceResponseHash: actualSourceResponseHash,
  acquiredAt: new Date(created).toISOString(),
  createdAt: new Date(created).toISOString(),
  expiresAt: new Date(created + 900_000).toISOString(),
  cacheWindow: Math.floor(created / 900_000),
  sourceLocale: "en",
  lookupSourceFeatureId: "way/123"
};
const clientEvidencePackHash = "c".repeat(64);
const clientSourceResponseHash = "d".repeat(64);
// The real lease returns an explicit profile even when fabric is unavailable.
const actualGeoContext = {
  radiusM: 400, coverage: "unavailable", sampleSize: 0, capReached: false, groups: [],
  mappedBuildingCount: 0, mappedLevelsKnownCount: 0, medianMappedLevels: null,
  nearestTransitM: null, nearestMajorRoadM: null,
  districtCharacter: { code: "low_signal", confidence: "low", ruleVersion: "POINT_OBJECT_DISTRICT_RULE_V1", driverGroups: [] }
};

assert.match(original, /const \{ pack: evidencePack, receipt \} = await acquirePublicEvidenceLease\(\{[\s\S]*osmFeatureId: parsed\.value\.expectedSourceFeatureId \?\? null/,
  "Context must acquire a lease for the exact selected lookup identity.");
assert.match(original, /evidenceReceipt: receipt,[\s\S]*subject: \{\s*evidenceReceipt: receipt,/,
  "Context must expose the same server-issued receipt at the response and subject scopes.");

let transformed = original;
transformed = replaceRequired(transformed,
  'from "@/src/lib/prototype/point-to-object-fabric-diagnostic"',
  `from ${JSON.stringify(pathToFileURL(resolve(integrationRoot, "src/lib/prototype/point-to-object-fabric-diagnostic.ts")).href)}`,
  "actual fabric-diagnostic helper");
transformed = replaceRequired(transformed,
  'import { explicitSourceHeight } from "@/src/lib/prototype/point-to-object-source-geometry";',
  "const explicitSourceHeight = () => ({});",
  "source-height adapter");
transformed = replaceRequired(transformed,
  'import { NextResponse } from "next/server";',
  `const NextResponse = { json(body, init = {}) { return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } }); } };`,
  "NextResponse adapter");
transformed = replaceRequired(transformed,
  'import { getPointObjectSurfaceStatus } from "@/src/lib/ai/openai-upstream-gate";',
  "const getPointObjectSurfaceStatus = () => ({ enabled: true });",
  "runtime-gate adapter");
transformed = replaceRequired(transformed,
  'import { requirePilotIdentity, requirePilotMutationOrigin } from "@/src/lib/auth/require-pilot-identity";',
  `const requirePilotIdentity = async () => globalThis.__quality20IdentityAllowed
    ? { allowed: true, mode: "supabase_auth", context: null }
    : { allowed: false, response: new Response(JSON.stringify({ mode: "unavailable" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
   const requirePilotMutationOrigin = () => null;`,
  "identity adapter");
transformed = replaceRequired(transformed,
  'import { readBoundedJson } from "@/src/lib/http/bounded-json";',
  `const readBoundedJson = async (request) => {
     try { return { ok: true, value: await request.json() }; }
     catch { return { ok: false, status: 400 }; }
   };`,
  "bounded-json adapter");
transformed = replaceRequired(transformed,
  'import { LivePointEvidenceError } from "@/src/lib/prototype/point-to-object-live-evidence";',
  'class LivePointEvidenceError extends Error {}',
  "source-error adapter");
transformed = replaceRequired(transformed,
  'import { acquirePublicEvidenceLease, PublicEvidenceLeaseError } from "@/src/lib/prototype/point-to-object-evidence-lease";',
  `class PublicEvidenceLeaseError extends Error {}
   const acquirePublicEvidenceLease = async (lookup) => {
     globalThis.__quality20AcquisitionCalls += 1;
     globalThis.__quality20LeaseLookup = lookup;
     return {
       receipt: ${JSON.stringify(actualReceipt)},
       pack: {
         evidencePackHash: ${JSON.stringify(actualEvidencePackHash)},
         source: { sourceResponseHash: ${JSON.stringify(actualSourceResponseHash)}, rawProviderPayload: "DO_NOT_EXPOSE_SOURCE_PAYLOAD", fabricStatus: "unavailable", fabricDiagnostic: { failureCode: "timeout" } },
         selectedObject: {
           name: "Synthetic object", displayAddress: "Synthetic address", featureClass: "building",
           sourceFeatureId: "way/123", geometryType: "Polygon", addressParts: {}, tags: {}, metrics: {},
           internalSecret: "DO_NOT_EXPOSE_INTERNAL_FIELD"
         },
         resolution: { coordinateAssociation: "inside", resultCentroidDistanceM: 0 },
         displayGeometry: null, geoContext: ${JSON.stringify(actualGeoContext)}, linkedEntity: null
       }
     };
   };`,
  "leased evidence acquisition adapter");
transformed = replaceRequired(transformed,
  /import \{\s*coordinatesMatchPointObjectMarket,[\s\S]*?type PointObjectMarketKey\s*\} from "@\/src\/lib\/prototype\/point-to-object-markets";/,
  `const coordinatesMatchPointObjectMarket = () => true;
   const isPointObjectLocale = (value) => value === "en" || value === "ru";
   const isPointObjectMarketKey = (value) => value === "dubai";
   const nominatimLocale = (value) => value;
   const pointObjectMarket = () => ({ countryCode: "ae" });`,
  "market adapter");

assert.doesNotMatch(transformed, /from "@\//, "All project aliases must be isolated before executing the route in memory.");
const executable = stripTypeScriptTypes(transformed, { mode: "transform", sourceMap: false });
const route = await import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);

function request(body, origin = "https://preview.example.test", extraHeaders = {}) {
  return new Request("https://preview.example.test/api/prototype/point-to-object/context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "x-forwarded-host": "preview.example.test",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "203.0.113.44",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });
}

const validBody = { caseKey: "dubai", longitude: 55.27, latitude: 25.20, locale: "en", expectedSourceFeatureId: "way/123" };
globalThis.__quality20AcquisitionCalls = 0;
globalThis.__quality20IdentityAllowed = false;
const authDenied = await route.POST(request(validBody));
assert.equal(authDenied.status, 401);
assert.equal(globalThis.__quality20AcquisitionCalls, 0, "Authentication denial must happen before evidence acquisition.");

globalThis.__quality20IdentityAllowed = true;
const originDenied = await route.POST(request(validBody, "https://attacker.example.test"));
assert.equal(originDenied.status, 403);
assert.equal(globalThis.__quality20AcquisitionCalls, 0, "Origin denial must happen before evidence acquisition.");

const clientHashBody = {
  ...validBody,
  evidencePackHash: clientEvidencePackHash,
  sourceResponseHash: clientSourceResponseHash,
  acquiredAt: "1999-01-01T00:00:00.000Z"
};
const clientHashDenied = await route.POST(request(clientHashBody));
assert.equal(clientHashDenied.status, 400, "Client-supplied evidence receipt fields must be rejected as unknown input.");
assert.equal(globalThis.__quality20AcquisitionCalls, 0, "Rejected client hashes must not trigger evidence acquisition.");

const resolved = await route.POST(request(validBody, "https://preview.example.test", {
  "x-evidence-pack-hash": clientEvidencePackHash,
  "x-source-response-hash": clientSourceResponseHash
}));
assert.equal(resolved.status, 200);
assert.equal(globalThis.__quality20AcquisitionCalls, 1);
assert.deepEqual(globalThis.__quality20LeaseLookup, {
  longitude: validBody.longitude, latitude: validBody.latitude, locale: "en",
  osmFeatureId: validBody.expectedSourceFeatureId, expectedCountryCode: "ae"
}, "Lease acquisition must retain the selected lookup identity and server market scope.");
const payload = await resolved.json();
assert.deepEqual(payload.evidenceReceipt, actualReceipt,
  "The public receipt must be exactly the server-issued lease, including hashes, clock window and lookup identity.");
assert.deepEqual(payload.subject.evidenceReceipt, actualReceipt,
  "The subject must carry the same receipt as the top-level response.");
assert.notEqual(payload.evidenceReceipt.evidencePackHash, clientEvidencePackHash);
assert.notEqual(payload.evidenceReceipt.sourceResponseHash, clientSourceResponseHash);
assert.deepEqual(payload.subject.geoContext, actualGeoContext, "Unavailable fabric must retain its explicit source profile, not a null/zero-success substitute.");
assert.deepEqual(payload.subject.fabricDiagnostic, { failureCode: "timeout" }, "The actual helper must project the safe same-pack failure code.");
assert.doesNotMatch(JSON.stringify(payload), /DO_NOT_EXPOSE|rawProviderPayload|internalSecret/,
  "The public response must not expose raw provider data or internal fixture fields.");

console.log("Quality20 evidence receipt actual-route check PASS: exact server lease preserved at both scopes; client hashes rejected; auth/origin negatives acquire nothing; no raw data or secret sentinel exposed.");
