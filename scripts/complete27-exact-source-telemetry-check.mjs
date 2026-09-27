import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20{}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export%20const%20unstable_cache%3Dfn%3D%3Efn", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts")) return { format: "module", shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
    return nextLoad(url, context);
  }
});
const { runOverpassWithinBudget: run } = await import("../src/lib/prototype/point-to-object-source-budget.ts");
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function fakeClock() {
  let now = 0;
  const timers = [];
  return {
    now: () => now,
    timeout: (ms) => { const controller = new AbortController(); timers.push({ at: now + ms, controller }); return controller.signal; },
    advance: (ms) => { now += ms; for (const timer of timers) if (timer.at <= now) timer.controller.abort(new DOMException("Deadline", "TimeoutError")); },
    timers
  };
}

let checks=0;const ok=(f)=>{f();checks++};const fresh=()=>({phase:'admission',dispatched:false,elapsedMs:0,admissionMs:0,upstreamStatus:null,abortSource:null});
for(const phase of ['headers','body']){
 const clock=fakeClock(),d=fresh();let started=false;
 const result=run(12000,async()=>{},async()=>{started=true;d.phase=phase;if(phase==='body')d.upstreamStatus=200;return new Promise(()=>{});},clock,d);
 await flush();assert(started);clock.advance(4500);await assert.rejects(result,{name:'TimeoutError'});
 ok(()=>assert.deepEqual(d,{phase,dispatched:true,elapsedMs:4500,admissionMs:0,upstreamStatus:phase==='body'?200:null,abortSource:'per_request'}));
}
{
 const clock=fakeClock(),d=fresh();let calls=0;const result=run(12000,()=>new Promise(()=>{}),async()=>{calls++},clock,d);clock.advance(12000);await assert.rejects(result,{name:'TimeoutError'});ok(()=>{assert.equal(calls,0);assert.deepEqual(d,{...fresh(),elapsedMs:12000,admissionMs:12000,abortSource:'shared_deadline'});});
}
{
 const clock=fakeClock(),d=fresh();let release,calls=0;const result=run(12000,()=>new Promise(r=>release=r),async()=>{calls++},clock,d);clock.advance(8001);release();await assert.rejects(result,{name:'TimeoutError'});ok(()=>{assert.equal(calls,0);assert.equal(d.dispatched,false);assert.equal(d.abortSource,'shared_deadline');assert.equal(d.admissionMs,8001);});
}
{
 const clock=fakeClock(),d=fresh();let release;const result=run(12000,()=>new Promise(r=>release=r),async()=>new Promise(()=>{}),clock,d);clock.advance(7800);release();await flush();clock.advance(4200);await assert.rejects(result,{name:'TimeoutError'});ok(()=>{assert.equal(d.dispatched,true);assert.equal(d.abortSource,'shared_deadline');assert.equal(d.phase,'headers');assert.equal(d.admissionMs,7800);});
}
{
 const clock=fakeClock(),d=fresh(),error=new DOMException('PRIVATE','AbortError');await assert.rejects(run(12000,async()=>{},async()=>{throw error},clock,d),e=>e===error);ok(()=>assert.equal(d.abortSource,'transport_abort'));
 const success=fresh();assert.equal(await run(12000,async()=>{},async()=>42,clock,success),42);ok(()=>assert.equal(success.abortSource,null));
}
// Actual adapter: only mandatory failure logs, never optional or success.
const {buildLivePointObjectEvidencePack:build}=await import('../src/lib/prototype/point-to-object-live-evidence.ts');
const oldFetch=globalThis.fetch,oldWarn=console.warn,oldNow=Date.now;let ticks=oldNow(),serial=920000;
Date.now=()=>ticks;let logs=[];console.warn=(...args)=>logs.push(args);
async function acquire(handler){ticks+=2000;const id=++serial;let calls=0;globalThis.fetch=async()=>{calls++;ticks+=1300;return handler(id,calls)};let value,error;try{value=await build({longitude:55.27,latitude:25.2,osmFeatureId:'node/'+id,locale:'en',expectedCountryCode:'ae',deadlineAtMs:Date.now()+12000})}catch(e){error=e}return{value,error,calls};}
try{
 for(const status of [408,504]){logs=[];const r=await acquire(()=>new Response('PRIVATE_BODY',{status}));ok(()=>{assert.equal(r.error.code,'OVERPASS_TIMEOUT');assert.equal(r.error.httpStatus,504);assert.equal(r.calls,1);assert.equal(logs.length,1);const [name,raw]=logs[0],v=JSON.parse(raw);assert.equal(name,'point_object_exact_source_failure');assert.deepEqual(Object.keys(v).sort(),Object.keys(fresh()).sort());assert.equal(v.upstreamStatus,status);assert.equal(v.abortSource,'upstream_http');assert.equal(v.phase,'headers');assert.doesNotMatch(raw,/PRIVATE|https|node|way|query|password|token/i);});}
 for(const [phase,handler,code]of [
  ['headers',()=>{throw new DOMException('PRIVATE_HEADERS','TimeoutError')},'OVERPASS_TIMEOUT'],
  ['body',()=>new Response(new ReadableStream({start(c){c.error(new DOMException('PRIVATE_BODY','TimeoutError'))}})),'OVERPASS_TIMEOUT'],
  ['parse',()=>new Response('PRIVATE_INVALID_JSON'),'OVERPASS_RESPONSE_INVALID']
 ]){logs=[];const r=await acquire(handler);ok(()=>{assert.equal(r.error.code,code);assert.equal(logs.length,1);assert.equal(JSON.parse(logs[0][1]).phase,phase);assert.doesNotMatch(logs[0][1],/PRIVATE/);});}
 logs=[];const good=await acquire((id,n)=>n===1?Response.json({elements:[{type:'node',id,lon:55.27,lat:25.2,tags:{amenity:'school'}}]}):new Response('PRIVATE_OPTIONAL',{status:504}));ok(()=>{assert.equal(good.error,undefined);assert(good.value);assert.equal(good.value.source.contextStatus,'unavailable');assert.equal(logs.length,0);assert.doesNotMatch(JSON.stringify(good.value),/abortSource|elapsedMs|admissionMs|PRIVATE/);});
 console.warn=()=>{throw Error('logger failed')};const failed=await acquire(()=>new Response('PRIVATE',{status:504}));ok(()=>{assert.equal(failed.error.code,'OVERPASS_TIMEOUT');assert.equal(failed.calls,1)});
 const oldTimeout=AbortSignal.timeout;
 try {
  for(const phase of ['headers','body']) {
   const clock=fakeClock(),base=ticks+2000;Date.now=()=>base+clock.now();AbortSignal.timeout=clock.timeout;
   logs=[];console.warn=(...args)=>logs.push(args);let calls=0;
   globalThis.fetch=async()=>{calls++;return phase==='headers'?new Promise(()=>{}):new Response(new ReadableStream({start(){}}));};
   const result=build({longitude:55.27,latitude:25.2,osmFeatureId:'node/'+(++serial),locale:'en',expectedCountryCode:'ae',deadlineAtMs:Date.now()+12000});
   await flush();clock.advance(4500);await assert.rejects(result,e=>e.code==='OVERPASS_TIMEOUT'&&e.httpStatus===504);
   ok(()=>{assert.equal(calls,1);assert.equal(logs.length,1);const d=JSON.parse(logs[0][1]);assert.equal(d.phase,phase);assert.equal(d.abortSource,'per_request');assert.equal(d.elapsedMs,4500);assert.equal(d.upstreamStatus,phase==='body'?200:null);});
   ticks=base+clock.now();
  }
 } finally {AbortSignal.timeout=oldTimeout;}
}finally{globalThis.fetch=oldFetch;console.warn=oldWarn;Date.now=oldNow;}
console.log(JSON.stringify({status:'PASS',checks,networkCalls:0,scope:'exact-source finite failure telemetry; no outcome/budget/retry changes'}));
