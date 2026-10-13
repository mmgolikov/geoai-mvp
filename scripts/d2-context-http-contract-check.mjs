import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Root-run offline Request→actual route POST→Response.json→actual browser
// parsers. This does not start a server, replay source/AI, or prove Auth.
// No rewriting/copying of route return shape or normalization code.
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(root);
const require = createRequire(import.meta.url);
const ts = require("typescript");
const transport = JSON.parse(readFileSync(path.join(root, "tests/fixtures/d2-context/transport.json"), "utf8"));
const state = globalThis;
const fixturePrefix = "d2-fixture:";
const adapters = {
  "next/server": 'export const NextResponse={json:(body,init={})=>Response.json(body,init)};',
  "@/src/lib/ai/openai-upstream-gate": 'export const getPointObjectSurfaceStatus=()=>({enabled:true});',
  "@/src/lib/auth/require-pilot-identity": 'export const requirePilotIdentity=async()=>({allowed:true});export const requirePilotMutationOrigin=()=>null;',
  "@/src/lib/prototype/point-to-object-evidence-lease": 'export class PublicEvidenceLeaseError extends Error{};export async function acquirePublicEvidenceLease(input){globalThis.__d2RouteLeaseInputs.push(input);return globalThis.__d2RouteLease;}',
  "@/src/lib/prototype/point-to-object-source-admission": 'export class PointObjectSourceAdmissionError extends Error{};export const admitPointObjectContextSourceAcquisition=()=>{};'
};
registerHooks({
  resolve(specifier, context, next) {
    if (Object.hasOwn(adapters, specifier)) return { url: fixturePrefix + encodeURIComponent(specifier), shortCircuit: true };
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3Dfn%3D%3Efn", shortCircuit: true };
    const local = specifier.startsWith("@/") ? pathToFileURL(path.join(root, specifier.slice(2))).href : specifier;
    if (!context.parentURL?.includes("/node_modules/") && (local.startsWith("file:") || local.startsWith("./") || local.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(local)) {
      try { return next(local + ".ts", context); } catch { return next(local + ".tsx", context); }
    }
    return next(local, context);
  },
  load(url, context, next) {
    if (url.startsWith(fixturePrefix)) return { format: "module", source: adapters[decodeURIComponent(url.slice(fixturePrefix.length))], shortCircuit: true };
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: {
        module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX
      } }).outputText
    };
    return next(url, context);
  }
});
let current;
let injectedRequests = 0;
const oldFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const url = new URL(String(input));
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "overpass-api.de", "Unexpected source/network request forbidden");
  injectedRequests++;
  const query = url.searchParams.get("data") ?? "";
  const [lon, lat] = current.anchor;
  const delta = transport.osm.polygonHalfDeltaDegrees;
  const ring = [[lon-delta,lat-delta],[lon+delta,lat-delta],[lon+delta,lat+delta],[lon-delta,lat+delta],[lon-delta,lat-delta]];
  if (query.includes("out body geom 1")) return Response.json({ elements: [{
    type: "way", id: Number(current.sourceFeatureId.split("/")[1]),
    tags: { name: current.label, building: transport.osm.building, height: transport.osm.height, "building:levels": transport.osm.levels },
    geometry: ring.map(([x,y]) => ({ lon:x, lat:y })),
    bounds: { minlon:lon-delta,maxlon:lon+delta,minlat:lat-delta,maxlat:lat+delta }
  }] });
  return Response.json({ osm3s: { timestamp_osm_base: transport.osm.fabricTimestamp },
    elements: [{type:"node",id:transport.osm.nearbyNodeId,lon:lon+.0004,lat,tags:{name:transport.osm.nearbyName,highway:"bus_stop"}}] });
};
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
try {
  const snapshot = readFileSync(path.join(root, transport.realIndependentSnapshot.path));
  assert.equal(createHash("sha256").update(snapshot).digest("hex"), transport.realIndependentSnapshot.sha256);
  const { buildLivePointObjectEvidencePack } = await import("../src/lib/prototype/point-to-object-live-evidence.ts");
  const actualRoute = await import("../app/api/prototype/point-to-object/context/route.ts");
  const live = await import("../components/point-to-object/live-session.ts");
  const oldV1 = JSON.parse(readFileSync(path.join(root, "tests/fixtures/d2-context/legacy-v1.json"), "utf8"));
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => [k,canonical(v)])) : value;
  check(createHash("sha256").update(JSON.stringify(canonical(oldV1.context))).digest("hex") === oldV1.contextCanonicalSha256, "Actual historical V1 context bytes retained");
  const actualLegacy = live.parseLiveResolvedObject(oldV1.context);
  check(actualLegacy && !actualLegacy.normalizedContext.details && !actualLegacy.normalizedContext.independentContext, "Actual old public V1 remains readable without enrichment");
  const anchors = JSON.parse(readFileSync(path.join(root, "tests/fixtures/d2-context/find-anchors.json"), "utf8"));
  const { normalizePointObjectFindCandidates, buildPointObjectFindOverpassQuery } = await import("../src/lib/prototype/point-to-object-find-contract.ts");
  for (const item of anchors.cases) {
    check(createHash("sha256").update(JSON.stringify(canonical(item.geometry))).digest("hex")===item.geometryCanonicalSha256,"Historical selected geometry hash is exact");
    const request={marketKey:"dubai",locale:"en",bounds:[55.27,25.21,55.29,25.23],group:"commercial_office",mappedMinimumLevels:null,mappedMaximumLevels:null,limit:12};
    check(buildPointObjectFindOverpassQuery(request).includes("out body geom"),"Actual Find query requests geometry/bounds, not a nearest POI source");
    const projected=normalizePointObjectFindCandidates({elements:[{type:"way",id:Number(item.sourceFeatureId.split("/")[1]),bounds:item.bounds,
      tags:item.observedTags,geometry:item.geometry.coordinates[0].map(([lon,lat])=>({lon,lat}))}]},request);
    const candidate=projected.candidates.find(c=>c.sourceFeatureId===item.sourceFeatureId);
    check(candidate && candidate.longitude===item.anchor[0] && candidate.latitude===item.anchor[1],"Actual Find bbox-centre normalization reaches frozen anchor exactly: "+item.caseId);
    check(candidate.geometryProvenance==="confirmed_complete_footprint","Verified selected geometry remains distinct from Place points");
  }
  const cases = [];
  for (const item of transport.cases) {
    current = item;
    const pack = await buildLivePointObjectEvidencePack({ longitude:item.anchor[0],latitude:item.anchor[1],
      osmFeatureId:item.sourceFeatureId,locale:"en",expectedCountryCode:"ae",deadlineAtMs:Date.now()+12000 });
    const created = Date.now();
    const receipt = { version:"PUBLIC_EVIDENCE_LEASE_V1",evidencePackHash:pack.evidencePackHash,
      sourceResponseHash:pack.source.sourceResponseHash,acquiredAt:pack.source.acquiredAt,
      createdAt:new Date(created).toISOString(),expiresAt:new Date(created+900000).toISOString(),
      cacheWindow:Math.floor(created/900000),sourceLocale:"en",lookupSourceFeatureId:item.sourceFeatureId };
    state.__d2RouteLease = { pack, receipt };
    state.__d2RouteLeaseInputs = [];
    const intent = {caseKey:"dubai",longitude:item.anchor[0],latitude:item.anchor[1],locale:"en",expectedSourceFeatureId:item.sourceFeatureId};
    const response = await actualRoute.POST(new Request("https://d2.example.test/api/prototype/point-to-object/context", {
      method:"POST",headers:{origin:"https://d2.example.test","content-type":"application/json"},body:JSON.stringify(intent)
    }));
    check(response.status === 200, "Actual route must return successful HTTP fixture");
    check(response.headers.get("cache-control") === "private, no-store, max-age=0", "Actual private no-store header");
    check(response.headers.get("vary") === "Cookie", "Actual cookie variation");
    const envelope = await response.json();
    check(envelope.mode === "resolved" && envelope.schemaVersion === 2, "Actual route envelope, not a hand-authored subject");
    check(JSON.stringify(envelope.evidenceReceipt) === JSON.stringify(envelope.subject.evidenceReceipt), "Envelope and subject carry same public receipt");
    check(envelope.evidenceReceipt.evidencePackHash === pack.evidencePackHash, "Actual pack→receipt→route hash");
    check(state.__d2RouteLeaseInputs.length === 1 && state.__d2RouteLeaseInputs[0].osmFeatureId === item.sourceFeatureId, "Route admits exact lookup identity");
    const parsed = live.parseLiveResolvedObject(envelope.subject);
    check(parsed, "Actual route subject passes real strict browser parser including receipt+normalizedContext");
    check(parsed.normalizedContext?.independentContext?.status === item.expectedIndependentStatus, "Source domain unchanged");
    const selection = {locationKey:"dubai",longitude:item.anchor[0],latitude:item.anchor[1],clickedAt:new Date(created).toISOString(),
      object:{name:item.label,featureClass:"building:office",sourceFeatureId:item.sourceFeatureId,geometry:envelope.subject.displayGeometry,geometryProvenance:"confirmed_complete_footprint",renderHeightM:30.48,renderMinHeightM:null},
      resolvedObject:envelope.subject,viewport:{center:item.anchor,zoom:18,pitch:0,bearing:0,viewMode:"2d",basemapId:"street"},provider:"OpenFreeMap / OpenStreetMap",nearbyLabels:[]};
    check(live.parsePointObjectSelection(JSON.parse(JSON.stringify(selection))), "Actual envelope survives existing selection serializer/parser");
    const legacy = structuredClone(envelope);
    delete legacy.subject.normalizedContext.details;
    delete legacy.subject.normalizedContext.independentContext;
    check(live.parseLiveResolvedObject(legacy.subject), "V1 optional-field absence remains readable");
    check(!live.parseLiveResolvedObject(legacy.subject).normalizedContext.details, "Legacy receives no new detailed facts");
    cases.push({...item,envelope,legacyEnvelope:legacy});
    if (item.expectedIndependentStatus === "available") {
      const edits = [
        ["snapshot hash",s=>s.normalizedContext.independentContext.snapshotHash="0".repeat(64)],
        ["record name",s=>s.normalizedContext.independentContext.places[0].name="FORGED SOURCE NAME"],
        ["record count",s=>s.normalizedContext.independentContext.sampleSize++],
        ["factual provider ID",s=>s.normalizedContext.independentContext.places[0].sources[0].record_id=null],
        ["independent anchor",s=>s.normalizedContext.independentContext.anchor[0]+=.00003],
        ["object source receipt",s=>s.evidenceReceipt.sourceResponseHash="0".repeat(64)],
        ["selected association",s=>s.coordinateAssociation="reverse_nearest_indexed_object_not_point_in_polygon"],
        ["selected geometry",s=>s.displayGeometry.coordinates[0][1][0]+=.00001],
        ["nested geometry",s=>s.normalizedContext.details.geometry.coordinates[0][1][0]+=.00001],
        ["nested tagged height",s=>s.normalizedContext.details.metrics.find(m=>m.id==="height").value=99],
        ["source identity",s=>s.sourceFeatureId="way/910130014"]
      ];
      for (const [name,edit] of edits) {
        const altered = structuredClone(envelope.subject);edit(altered);
        check(live.parseLiveResolvedObject(altered) === null, "Reject actual serialized envelope tamper: "+name);
      }
      const alteredSelection = structuredClone(selection);alteredSelection.longitude += .00003;
      check(live.parsePointObjectSelection(alteredSelection) === null, "Reject held anchor disagreement on reopen");
      const withoutDetails = structuredClone(selection);delete withoutDetails.resolvedObject.normalizedContext.details;
      withoutDetails.longitude += .00003;
      check(live.parsePointObjectSelection(withoutDetails) === null, "Known444 negative: retained independent context without details cannot move outer selection anchor");
      const missingExactLookup = structuredClone(envelope.subject);missingExactLookup.evidenceReceipt.lookupSourceFeatureId=null;
      check(live.parseLiveResolvedObject(missingExactLookup) === null, "Known444 negative: trusted selected V2 must retain exact lookup identity");
      // Legitimate non-exact contexts are projected by the actual route too.
      // They may carry null lookup but never selected metrics/geometry.
      for (const association of ["reverse_nearest_indexed_object_not_point_in_polygon", "open_map_geometry_contains_point"]) {
        const nonexactPack = structuredClone(pack);
        nonexactPack.resolution.coordinateAssociation=association;
        nonexactPack.displayGeometry=null;nonexactPack.selectedObject.metrics=null;
        state.__d2RouteLease={pack:nonexactPack,receipt:{...receipt,lookupSourceFeatureId:null}};
        const nonexactResponse=await actualRoute.POST(new Request("https://d2.example.test/api/prototype/point-to-object/context", {
          method:"POST",headers:{origin:"https://d2.example.test","content-type":"application/json"},body:JSON.stringify({...intent,expectedSourceFeatureId:null})
        }));
        check(nonexactResponse.status===200,"Actual non-exact route fixture returns HTTP200");
        const nonexactEnvelope=await nonexactResponse.json();
        const nonexactParsed=live.parseLiveResolvedObject(nonexactEnvelope.subject);
        check(nonexactParsed && nonexactParsed.normalizedContext.details.metrics.every(m=>m.value===null) && nonexactParsed.normalizedContext.details.geometry===null,
          "Legitimate nearest/contains-null positive preserves unknown selected measurements: "+association);
      }
    } else {
      check(parsed.normalizedContext.independentContext.sampleSize === null && parsed.normalizedContext.independentContext.places.length === 0, "Unsupported is unknown, not zero/nearest case");
    }
    const wrongOrigin = await actualRoute.POST(new Request("https://d2.example.test/api/prototype/point-to-object/context", {
      method:"POST",headers:{origin:"https://foreign.example.test","content-type":"application/json"},body:JSON.stringify(intent)
    }));
    check(wrongOrigin.status === 403, "Actual same-origin boundary retained");
  }
  const result = { classification:transport.classification,baseCommit:transport.baseCommit,checks,
    assertionStatus:"EXECUTED_ONLY_BY_ROOT_WHEN_INVOKED",networkCalls:0,paidCalls:0,injectedOSMTransportRequests:injectedRequests,
    sourceHash:transport.realIndependentSnapshot.sha256,cases };
  if (process.argv.includes("--fixtures")) process.stdout.write(JSON.stringify(result)+"\n");
  else process.stdout.write(JSON.stringify({...result,cases:cases.map(({key,sourceFeatureId,expectedIndependentStatus})=>({key,sourceFeatureId,expectedIndependentStatus})),status:"PASS_OFFLINE_ROUTE_CONTRACT_ONLY"})+"\n");
} finally {
  globalThis.fetch = oldFetch;
  delete state.__d2RouteLease;
  delete state.__d2RouteLeaseInputs;
}
