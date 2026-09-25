import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const cache = new Map();
globalThis.__climateCache = (fn, keys) => async (...args) => { const key = JSON.stringify([keys, args]); if (!cache.has(key)) cache.set(key, await fn(...args)); return structuredClone(cache.get(key)); };
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3DglobalThis.__climateCache", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
    return nextLoad(url, context);
  }
});
const { normalizeNasaPowerMonthly, acquirePointObjectClimate } = await import("../src/lib/prototype/point-to-object-climate.ts");
const { parsePointObjectClimate, CLIMATE_EVIDENCE_ID } = await import("../src/lib/prototype/point-to-object-climate-contract.ts");
const fixture = JSON.parse(readFileSync(new URL("../tests/fixtures/complete25-nasa-monthly.json", import.meta.url), "utf8"));
const input = { longitude:55.27, latitude:25.2, year:2025, acquiredAt:"2026-09-25T00:00:00.000Z", responseHash:"a".repeat(64), responseBytes:1200 };
const valid = normalizeNasaPowerMonthly(fixture, input); assert.equal(valid.status, "available"); assert.equal(valid.months.length, 12); assert.equal(valid.months.at(-1).month,12);
let checks = 1;
for (const mutate of [p=>delete p.properties.parameter.T2M[202512], p=>p.properties.parameter.RH2M[202501]=-999, p=>p.properties.parameter.RH2M[202501]=101,
  p=>p.properties.parameter.T2M[202501]="20", p=>p.properties.parameter.T2M[202501]=Infinity, p=>p.properties.parameter.T2M_MAX[202501]=0,
  p=>p.properties.parameter.T2M[202414]=20, p=>p.parameters.T2M.units="K", p=>p.header.start="20240101", p=>p.header.sources=["OTHER"],
  p=>p.messages=["partial"], p=>p.geometry.coordinates[0]=56, p=>p.geometry.coordinates[0]=NaN, p=>p.header.api.name="Other API"]) {
  const bad = structuredClone(fixture); mutate(bad); assert.equal(normalizeNasaPowerMonthly(bad,input),null); checks++;
}
for (const mutate of [p=>p.months.pop(),p=>p.months[1].month=1,p=>p.source.referenceUrl="https://evil.test",p=>p.source.responseHash="bad",p=>p.extra="unsafe",p=>p.months[0].prompt="unsafe"]) {
  const bad=structuredClone(valid); mutate(bad); assert.equal(parsePointObjectClimate(bad),null); checks++;
}
const originalFetch=globalThis.fetch;
try {
 let calls=0;
 globalThis.fetch=async (url,init)=> { calls++; const u=new URL(url); assert.equal(u.origin,"https://power.larc.nasa.gov"); assert.equal(u.pathname,"/api/temporal/monthly/point"); assert.equal(u.searchParams.get("parameters"),"T2M,T2M_MAX,RH2M"); assert.equal(u.searchParams.get("start"),"2025"); assert.equal(init.redirect,"error"); return Response.json(fixture); };
 const acquired=await acquirePointObjectClimate({...input,now:new Date("2026-01-01T00:00:00Z"),deadlineAtMs:Date.now()+2000}); assert.equal(acquired.status,"available"); assert.equal(calls,1); assert.equal(acquired.source.responseHash,createHash("sha256").update(JSON.stringify(fixture)).digest("hex")); checks++;
 assert.equal((await acquirePointObjectClimate({...input,deadlineAtMs:Date.now()-1})).reason,"budget_exhausted"); assert.equal(calls,1); checks++;
 for (const [response,reason] of [[()=>new Response("bad",{status:503}),"http_error"],[()=>Response.json(fixture,{headers:{"content-length":"65537"}}),"response_too_large"],[()=>new Response("x".repeat(65537),{headers:{"content-type":"application/json"}}),"response_too_large"],[()=>new Response("bad",{headers:{"content-type":"application/json"}}),"invalid_response"]]) {
   globalThis.fetch=async()=>response(); assert.equal((await acquirePointObjectClimate({...input,deadlineAtMs:Date.now()+1000})).reason,reason); checks++;
 }
 globalThis.fetch=async (_u,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener("abort",()=>reject(new Error("abort"))));
 assert.equal((await acquirePointObjectClimate({...input,deadlineAtMs:Date.now()+20})).reason,"timeout"); checks++;
 const { rememberExactFindElements }=await import("../src/lib/prototype/point-to-object-exact-source.ts");
 const { acquirePublicEvidenceLease, reusePublicEvidenceLease }=await import("../src/lib/prototype/point-to-object-evidence-lease.ts");
 const { buildLivePointObjectEvidencePack }=await import("../src/lib/prototype/point-to-object-live-evidence.ts");
 const { buildModelEvidenceProjection }=await import("../src/lib/prototype/point-to-object-ai-core.ts");
 const lookup={longitude:55.27,latitude:25.2,osmFeatureId:"node/1",locale:"en",expectedCountryCode:"ae"};
 rememberExactFindElements({elements:[{type:"node",id:1,lon:55.27,lat:25.2,tags:{amenity:"school",name:"Fixture"}}]},new Date().toISOString());
 let nasa=0, osm=0;
 globalThis.fetch=async url=> { if(new URL(url).hostname==="power.larc.nasa.gov") {nasa++;return Response.json(fixture);} osm++;return Response.json({elements:[]}); };
 const old=await buildLivePointObjectEvidencePack(lookup); assert.equal(old.climate,undefined); assert.equal(nasa,0); const legacyHash=old.evidencePackHash;
 const lease=await acquirePublicEvidenceLease(lookup); assert.equal(lease.pack.climate.status,"available"); assert.equal(nasa,1); assert.notEqual(lease.pack.evidencePackHash,legacyHash); assert.equal(lease.pack.source.sourceResponseHash,old.source.sourceResponseHash);
 const counts=[nasa,osm]; for(const depth of ["quick","standard","deep"]) { const reused=await reusePublicEvidenceLease(lookup,lease.receipt); assert.deepEqual(reused.pack,lease.pack,depth); } assert.deepEqual([nasa,osm],counts); checks+=3;
 const projection=buildModelEvidenceProjection(lease.pack); assert.equal(projection.climate.status,"available"); assert.ok(projection.evidenceIndex.some(e=>e.id===CLIMATE_EVIDENCE_ID));
 for(const mutate of [p=>p.climate.requestedPoint[0]=56,p=>p.climate.months[0].temperatureC=21,p=>p.evidence.push(p.evidence.find(e=>e.id===CLIMATE_EVIDENCE_ID)),p=>p.evidence.find(e=>e.id===CLIMATE_EVIDENCE_ID).sourceId="SPAT-001"]) {const bad=structuredClone(lease.pack);mutate(bad);assert.equal(buildModelEvidenceProjection(bad).climate,undefined);checks++;}
 assert.equal(buildModelEvidenceProjection(old).climate,undefined); checks++;
 cache.clear();
 globalThis.fetch=async url=>new URL(url).hostname==="power.larc.nasa.gov"?new Response("upstream unavailable",{status:503}):Response.json({elements:[]});
 const unavailableLease=await acquirePublicEvidenceLease(lookup);
 assert.equal(unavailableLease.pack.climate.status,"unavailable"); assert.equal(unavailableLease.pack.climate.reason,"http_error");
 assert.deepEqual((await reusePublicEvidenceLease(lookup,unavailableLease.receipt)).pack,unavailableLease.pack);
 assert.equal(buildModelEvidenceProjection(unavailableLease.pack).climate,undefined); checks++;
} finally {globalThis.fetch=originalFetch;}
console.log(`PASS ${checks} climate contract/adapter/production acquisition/frozen depth/legacy/AI binding checks (offline fixtures).`);
if (process.argv.includes("--live")) {
  const receipts=[];
  for(const point of [{city:"Dubai",longitude:55.2708,latitude:25.2048},{city:"Singapore",longitude:103.8545,latitude:1.2865}]) {
    const start=Date.now(); const climate=await acquirePointObjectClimate({...point,deadlineAtMs:start+4000});
    receipts.push({...point,elapsedMs:Date.now()-start,climate});
  }
  console.log("PUBLIC_RECEIPTS="+JSON.stringify({scope:"Two public NASA POWER adapter calls; no paid AI, deployment or end-to-end product acceptance",receipts}));
  assert.ok(receipts.every(r=>r.climate.status==="available"));
}
