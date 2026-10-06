import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import type { PointObjectAreaContextResult } from "../src/lib/prototype/point-to-object-area-context-contract";
import type { ConceptMassingAlternative, PointObjectCreateAoi, ValidatedRedevelopmentProgram } from "../src/lib/prototype/point-to-object-create";

const root = new URL("../", import.meta.url);
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.ts`, root).href, context);
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`, context);
  return next(specifier, context);
}, load(url, context, next) {
  if (url.startsWith("file:") && url.endsWith(".ts")) return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform", sourceUrl: url }) };
  return next(url, context);
} });
const client = await import(new URL("src/lib/prototype/point-to-object-comparison-request.ts", root).href);
const comparison = await import(new URL("src/lib/prototype/point-to-object-comparison-core.ts", root).href);
const { LIVE_POINT_CAVEAT } = await import(new URL("src/lib/point-to-object/contracts.ts", root).href);
const programme = await import(new URL("src/lib/prototype/point-to-object-programme-context.ts", root).href);
let checks = 0;
function check(value: unknown, message: string) { assert.ok(value, message); checks++; }
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("Real network forbidden in this offline check"); };
const frozenPayload = { locale: "en", role: "developer", scenario: "b2b_redevelopment_selected_aoi", comparison: [
  { expectedSourceFeatureId: "way/101", evidenceReceipt: { evidencePackHash: "a".repeat(64) } },
  { expectedSourceFeatureId: "way/102", evidenceReceipt: { evidencePackHash: "b".repeat(64) } }
] };
const frozenJson = JSON.stringify(frozenPayload);
let dispatches = 0;
const ready = () => Response.json({ mode: "ready", challenge: "offline-public-challenge" });
const post = () => { dispatches++; return Response.json({ mode: "ai_comparison" }); };
const options = { payload: frozenPayload, deadlineMs: 35, challengeDeadlineMs: 15 };
async function timeout(fetchImpl: typeof fetch) {
  const outer = new AbortController();
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  try {
    await assert.rejects(() => Promise.race([
      client.requestPointObjectComparison({ ...options, signal: outer.signal, fetchImpl }),
      new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error("Regression: bounded request failed to settle")), 1_000); })
    ]), (cause: unknown) => cause instanceof Error && cause instanceof client.PointObjectComparisonRequestError && "code" in cause && cause.code === "timeout"); checks++;
  } finally { clearTimeout(watchdog); }
  check(!outer.signal.aborted, "deadline leaves the UI controller available for error/recovery handling");
  check(JSON.stringify(frozenPayload) === frozenJson, "source snapshots survive a deadline unchanged");
}
try {
  let releaseTransport: (response: Response) => void = () => undefined;
  await timeout(async (_url, init) => init?.method === "POST" ? post() : new Promise<Response>(resolve => { releaseTransport = resolve; }));
  releaseTransport(ready()); await new Promise(resolve => setTimeout(resolve, 0));
  check(dispatches === 0, "late challenge transport cannot dispatch POST after timeout");

  let releaseBody: (payload: unknown) => void = () => undefined;
  await timeout(async (_url, init) => init?.method === "POST" ? post() : ({ ok: true, json: () => new Promise(resolve => { releaseBody = resolve; }) } as Response));
  releaseBody({ mode: "ready", challenge: "late-challenge" }); await new Promise(resolve => setTimeout(resolve, 0));
  check(dispatches === 0, "late challenge body cannot dispatch POST after timeout");

  for (const failure of [async () => { throw new Error("challenge transport rejected"); }, async () => ({ ok: true, json: async () => { throw new Error("challenge JSON rejected"); } } as unknown as Response)]) {
    await assert.rejects(() => client.requestPointObjectComparison({ ...options, signal: new AbortController().signal, fetchImpl: failure })); checks++;
    check(dispatches === 0, "rejected challenge does not dispatch provider POST or retry");
  }
  for (const response of [Response.json({ mode: "ready", challenge: "" }), Response.json({ mode: "ready", challenge: "   " }), Response.json({ mode: "disabled", challenge: "x" }), Response.json({ mode: "ready", challenge: "x" }, { status: 503 })]) {
    await assert.rejects(() => client.requestPointObjectComparison({ ...options, signal: new AbortController().signal, fetchImpl: async () => response }),
      (cause: unknown) => cause instanceof Error && cause instanceof client.PointObjectComparisonRequestError && "code" in cause && cause.code === "challenge_unavailable"); checks++;
    check(dispatches === 0, "unusable challenge never dispatches POST");
  }
  await timeout(async (_url, init) => init?.method === "POST" ? new Promise<Response>(() => undefined) : ready());
  await timeout(async (_url, init) => init?.method === "POST" ? ({ ok: true, status: 200, json: () => new Promise(() => undefined) } as Response) : ready());

  const cancelled = new AbortController();
  const pending = client.requestPointObjectComparison({ ...options, signal: cancelled.signal, fetchImpl: async () => new Promise<Response>(() => undefined) });
  cancelled.abort(); await assert.rejects(() => pending, { name: "AbortError" }); checks++;
  let getCalls = 0;
  await assert.rejects(() => client.requestPointObjectComparison({ ...options, signal: cancelled.signal, fetchImpl: async () => { getCalls++; return ready(); } }), { name: "AbortError" }); checks++;
  check(getCalls === 0 && dispatches === 0, "cancel/pre-abort prevents dispatch and permits cleanup");
  const recovered = await client.requestPointObjectComparison({ ...options, signal: new AbortController().signal, fetchImpl: async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== "POST") { getCalls++; return ready(); }
    const body = JSON.parse(String(init.body));
    check(body.challenge === "offline-public-challenge" && JSON.stringify(body.comparison) === JSON.stringify(frozenPayload.comparison), "recovery POST uses the usable challenge and unchanged frozen evidence");
    return post();
  } });
  check(recovered.ok && recovered.status === 200 && getCalls === 1 && dispatches === 1, "next explicit start recovers with one GET/POST, no retry");
  const ui = readFileSync(new URL("components/point-to-object/find-comparison-dashboard.tsx", root), "utf8");
  check(ui.includes("await requestPointObjectComparison(") && /finally\s*\{\s*if\(controllerRef.current===controller\)\{controllerRef.current=null;setPhase\("idle"\)/.test(ui), "the actual UI uses the bounded helper and releases busy state in finally");
  check(ui.includes('data-testid="comparison-failure-json"')&&ui.includes("comparisonInsightMatchesSubmission(parsed"),"actual UI discloses bounded failures separately and retains strict submission binding");

  for(const [status,code] of [[504,"AI_TIMEOUT"],[502,"AI_OUTPUT_INVALID"],[429,"AI_PROVIDER_REJECTED"],[409,"AI_EVIDENCE_REFRESH_REQUIRED"],[403,"AI_RUNTIME_DISABLED"]] as const){
    let starts=0;const seen:unknown[]=[];
    const failed=await client.requestPointObjectComparison({...options,signal:new AbortController().signal,onDiagnostic:(d:unknown)=>seen.push(d),fetchImpl:async (_url,init)=>{
      if(init?.method!=="POST")return ready();starts++;
      return Response.json({mode:"unavailable",code,error:"Bearer private-fixture-value",headers:{authorization:"never expose"},telemetry:{requestId:"private"}},{status});
    }});
    check(!failed.ok&&failed.status===status&&starts===1&&seen.length===1,"one bounded HTTP failure, no automatic retry");
    check(failed.diagnostic?.stage==="response"&&failed.diagnostic.httpStatus===status&&failed.diagnostic.code===code,"preserve sanitized route status/code");
    check(JSON.stringify(failed.diagnostic?.snapshots)===JSON.stringify(frozenPayload.comparison.map(c=>({sourceFeatureId:c.expectedSourceFeatureId,evidencePackHash:c.evidenceReceipt.evidencePackHash}))),"diagnostic preserves submitted order/ID/hash");
    check(!/Bearer|private|authorization|headers|telemetry|challenge|cost/i.test(JSON.stringify(failed.diagnostic)),"diagnostic excludes credentials/raw prose/telemetry and guessed cost");
  }
  let transportStarts=0;const transportSeen:unknown[]=[];
  await assert.rejects(()=>client.requestPointObjectComparison({...options,signal:new AbortController().signal,onDiagnostic:(d:unknown)=>transportSeen.push(d),fetchImpl:async()=>{transportStarts++;throw new Error("Bearer private transport");}}),
    (cause:unknown)=>cause instanceof client.PointObjectComparisonRequestError&&cause.code==="transport_failed"&&cause.diagnostic?.code==="COMPARISON_TRANSPORT_FAILED");checks++;
  check(transportStarts===1&&transportSeen.length===1&&!JSON.stringify(transportSeen).includes("private"),"transport failure is sanitized and never dispatches POST");
  let jsonStarts=0;
  await assert.rejects(()=>client.requestPointObjectComparison({...options,signal:new AbortController().signal,fetchImpl:async (_url,init)=>{
    if(init?.method!=="POST")return ready();jsonStarts++;return {ok:true,status:200,json:async()=>{throw new Error("private parse detail");}} as Response;
  }}),(cause:unknown)=>cause instanceof client.PointObjectComparisonRequestError&&cause.code==="response_unreadable"&&cause.diagnostic?.httpStatus===200);checks++;
  check(jsonStarts===1,"malformed JSON does not retry");
  const unknownDiagnostic=client.comparisonFailureDiagnostic({...frozenPayload,secret:"private"},"response",502,"Bearer private arbitrary code",10);
  check(unknownDiagnostic.code==="COMPARISON_UNAVAILABLE"&&!JSON.stringify(unknownDiagnostic).includes("private"),"unknown error codes and arbitrary fields cannot enter diagnostics");
  const invalidDiagnostic=client.comparisonFailureDiagnostic({comparison:Array(4).fill({expectedSourceFeatureId:"private",evidenceReceipt:{evidencePackHash:"private"}})},"response",999,"AI_TIMEOUT",Number.NaN);
  check(invalidDiagnostic.snapshots.length===0&&invalidDiagnostic.httpStatus===null&&invalidDiagnostic.elapsedMs===null,"invalid or oversized diagnostic inputs remain unknown/bounded");
  const timedSeen:unknown[]=[];
  await assert.rejects(()=>client.requestPointObjectComparison({...options,signal:new AbortController().signal,onDiagnostic:(d:unknown)=>timedSeen.push(d),fetchImpl:async()=>new Promise<Response>(()=>undefined)}),
    (cause:unknown)=>cause instanceof client.PointObjectComparisonRequestError&&cause.code==="timeout"&&cause.diagnostic?.stage==="challenge");checks++;
  check(timedSeen.length===1,"timeout records one diagnostic without resuming the paid POST");
  const observationFailure=await client.requestPointObjectComparison({...options,signal:new AbortController().signal,onDiagnostic:()=>{throw new Error("observation must not alter response");},fetchImpl:async(_url,init)=>init?.method==="POST"?Response.json({code:"AI_TIMEOUT"},{status:504}):ready()});
  check(!observationFailure.ok&&observationFailure.diagnostic?.code==="AI_TIMEOUT","diagnostic callback failure cannot change request outcome");
  // Minimal strict, synthetic response: no provider output is substituted for B.
  const snapshots=frozenPayload.comparison.map((c,index)=>({sourceFeatureId:c.expectedSourceFeatureId,evidencePackHash:c.evidenceReceipt.evidencePackHash,label:`Synthetic source ${index===0?"A":"B"}`}));
  const both=snapshots.map(s=>`${s.sourceFeatureId}:identity`),statement="Mapped context requires official validation for both source records.";
  const wire={mode:"openai_comparison",version:"POINT_OBJECT_COMPARISON_V1",generatedAt:"2026-10-06T12:00:00.000Z",locale:"en",role:frozenPayload.role,scenario:frozenPayload.scenario,snapshots,
    summary:{statement,evidenceRefs:both},differences:[{statement,evidenceRefs:both},{statement:"Exact source records have different identities to verify.",evidenceRefs:both}],checks:snapshots.map(s=>({candidateId:s.sourceFeatureId,action:"Obtain the official planning and ownership evidence.",evidenceRefs:[`${s.sourceFeatureId}:identity`]})),caveat:LIVE_POINT_CAVEAT,
    telemetry:{provider:"openai",model:"synthetic",requestId:null,latencyMs:1,attempts:1,inputTokens:null,outputTokens:null,totalTokens:null,stored:false,toolCalls:0}};
  const parsed=comparison.parsePointObjectComparisonInsight(wire);
  check(parsed!==null,"synthetic response passes the real strict parser");
  check(comparison.parsePointObjectComparisonInsightDetailed(wire).rejectionCode===null,"detailed parser does not add a false rejection to an accepted result");
  const categorizedFailures: Array<[ (r: typeof wire) => void, string ]> = [
    [r=>{r.caveat="wrong";},"COMPARISON_RESPONSE_ENVELOPE_INVALID"],
    [r=>{r.differences=[];},"COMPARISON_OUTPUT_SHAPE_INVALID"],
    [r=>{r.summary.evidenceRefs=[both[0],both[0]];},"COMPARISON_OUTPUT_REFERENCE_INVALID"],
    [r=>{r.summary.evidenceRefs=[both[0],"way/102:private unknown reference"];},"COMPARISON_OUTPUT_UNKNOWN_REF"],
    [r=>{r.summary.statement="Guaranteed best site with private provider prose.";},"COMPARISON_OUTPUT_FORBIDDEN_CLAIM"],
    [r=>{r.checks[0].evidenceRefs=[both[1]];},"COMPARISON_OUTPUT_SOURCE_BINDING"]
  ];
  for(const [mutate,code] of categorizedFailures){
    const invalid=structuredClone(wire);mutate(invalid);
    const rejection=comparison.parsePointObjectComparisonInsightDetailed(invalid);
    check(rejection.content===null&&rejection.rejectionCode===code&&comparison.parsePointObjectComparisonInsight(invalid)===null,"category preserves the same strict rejection, not recovery");
    const diagnostic=client.comparisonFailureDiagnostic(frozenPayload,"validation",200,rejection.rejectionCode,1);
    check(diagnostic.code===code&&!/private|prose|usage|cost|tokens|challenge|headers/.test(JSON.stringify(diagnostic)),"HTTP 200 rejection retains only safe reason/identity metadata");
  }
  for(const code of ["COMPARISON_COMPLETION_INVALID","COMPARISON_OUTPUT_INCOMPLETE","COMPARISON_OUTPUT_TOKEN_LIMIT","COMPARISON_OUTPUT_REFUSED","COMPARISON_OUTPUT_UNREADABLE"]){
    let posts=0;
    const rejection=await client.requestPointObjectComparison({...options,signal:new AbortController().signal,fetchImpl:async(_url,init)=>{
      if(init?.method!=="POST")return ready();posts++;return Response.json({code,error:"private provider prose"},{status:502});
    }});
    check(rejection.diagnostic?.code===code&&posts===1,"HTTP rejection category survives without retry or raw provider prose");
  }
  const conditions={locale:"en" as const,role:frozenPayload.role,scenario:frozenPayload.scenario};
  check(comparison.comparisonInsightMatchesSubmission(parsed,conditions,snapshots),"strict parsed response binds exact submitted order/ID/hash/label/intent");
  const reversed=structuredClone(wire);reversed.snapshots.reverse();
  check(comparison.parsePointObjectComparisonInsight(reversed)!==null,"strict parser alone cannot bind response order to a submission");
  check(!comparison.comparisonInsightMatchesSubmission(comparison.parsePointObjectComparisonInsight(reversed),conditions,snapshots),"ordered submission boundary rejects a valid but reordered response");
  for(const mutate of [(r:typeof wire)=>r.snapshots.reverse(),(r:typeof wire)=>{r.snapshots[0].sourceFeatureId="way/999";},(r:typeof wire)=>{r.snapshots[0].evidencePackHash="f".repeat(64);},(r:typeof wire)=>{r.snapshots[0].label="Changed source name";},(r:typeof wire)=>{r.locale="ru";},(r:typeof wire)=>{r.role="other";},(r:typeof wire)=>{r.scenario="other";}]){const r=structuredClone(wire);mutate(r);check(!comparison.comparisonInsightMatchesSubmission(r,conditions,snapshots),"wrong order/ID/hash/label/locale/role/scenario fails closed");}
  check(!comparison.comparisonInsightMatchesSubmission(null,conditions,snapshots),"null response cannot become a comparison");
  check(!comparison.comparisonInsightMatchesSubmission(parsed,conditions,[snapshots[0],snapshots[0]]),"duplicate submitted identity is rejected");
  for(const mutate of [(r:typeof wire)=>{r.caveat="wrong";},(r:typeof wire)=>{r.summary.statement="Guaranteed best site with 2000 residents.";},(r:typeof wire)=>{r.summary.evidenceRefs=["way/101:unknown"];},(r:typeof wire)=>{r.telemetry.attempts=2;}]){const r=structuredClone(wire);mutate(r);check(comparison.parsePointObjectComparisonInsight(r)===null,"strict caveat/claims/references/single attempt rules remain intact");}

  const aoi = { id: "saved-zone", coordinates: [[[55.27,25.2],[55.28,25.2],[55.28,25.21],[55.27,25.21],[55.27,25.2]]], areaSqM: 10000, perimeterM: 400, vertexCount: 4 } as PointObjectCreateAoi;
  const stamp = "2026-10-02T12:00:00.000Z";
  const area = { request: { marketKey: "dubai", locale: "en", aoiCoordinates: aoi.coordinates }, area: { centroid: { longitude: 55.275, latitude: 25.205 } }, summary: { sampleSize: 4, groups: [{ group: "residential", count: 2, sharePct: 50 }, { group: "education", count: 1, sharePct: 25 }, { group: "retail_daily_needs", count: 1, sharePct: 25 }] }, coverage: { capReached: false }, source: { sourceResponseHash: "c".repeat(64), acquiredAt: stamp, observedAt: null }, features: [] } as unknown as PointObjectAreaContextResult;
  const program = { useMix: [{ use: "residential", sharePct: 72 }, { use: "retail", sharePct: 18 }, { use: "open_space", sharePct: 10 }] } as ValidatedRedevelopmentProgram;
  const context = programme.createProgrammeSourceContext(aoi, area);
  check(context?.source.responseHash === area.source.sourceResponseHash && context.source.acquiredAt === stamp, "programme facts retain exact held source lineage");
  const review = programme.pointObjectProgrammeContextReview(program, context);
  check(review.uses[0].use === "residential" && review.uses[0].scenarioSharePct === 72 && review.uses[0].mappedCount === 2, "actual programme weights and observed record counts stay separate");
  check(review.checks.find((item: { group: string }) => item.group === "education")?.mappedCount === 1, "residential rationale includes observed education inventory");
  check(review.checks.every((item: { capacity: string; adequacy: string }) => item.capacity === "unknown" && item.adequacy === "not_assessed") && review.surroundingCatchment === "not_assessed", "no capacity, demand or surrounding adequacy invented");
  check(review.uses.find((item: { use: string }) => item.use === "open_space")?.mappedCount === 0, "valid empty group is a sample zero, not unavailable");
  const capped = programme.pointObjectProgrammeContextReview(program, programme.createProgrammeSourceContext(aoi, { ...area, coverage: { ...area.coverage, capReached: true } }));
  check(capped.coverage === "partial" && capped.uses[0].mappedCount === 2, "partial records remain lower-bound evidence");
  check(programme.pointObjectProgrammeContextReview(program, null).uses.every((item: { mappedCount: unknown }) => item.mappedCount === null), "missing source never becomes zero");
  const moved = structuredClone(aoi); moved.coordinates[0][0][0] += .001;
  check(programme.createProgrammeSourceContext(moved, area) === null, "another AOI cannot inherit the saved inventory");
  const broken = structuredClone(area); broken.summary.groups[0].count = 3;
  check(programme.createProgrammeSourceContext(aoi, broken) === null, "inconsistent source counts fail closed");
  const office = programme.pointObjectProgrammeContextReview({ ...program, useMix: [{ use: "office", sharePct: 100 }] }, context);
  check(office.checks.some((item: { group: string }) => item.group === "transport") && !office.checks.some((item: { group: string }) => item.group === "education"), "programme changes meaningful verification priorities");
  const alternatives = [{ id: "A", massing: { aoiAreaSqM: 10000, estimatedFloorAreaSqM: 9000, achievedSiteCoveragePct: 23 } }, { id: "B", massing: { aoiAreaSqM: 10000, estimatedFloorAreaSqM: 12000, achievedSiteCoveragePct: 28 } }] as ConceptMassingAlternative[];
  check(JSON.stringify(programme.pointObjectProgrammeOptionDelta(alternatives)) === JSON.stringify({ floorAreaSqM: 3000, coveragePercentagePoints: 5 }), "A/B rationale uses actual saved geometric deltas");
  check(programme.pointObjectProgrammeOptionDelta(alternatives.slice(0,1)) === null, "legacy one-option result cannot invent B");
  const differentZone = structuredClone(alternatives); differentZone[1].massing.aoiAreaSqM = 20000;
  check(programme.pointObjectProgrammeOptionDelta(differentZone) === null, "different-zone massing is not compared");
} finally { globalThis.fetch = originalFetch; }
console.log(JSON.stringify({ status: "PASS", checks, injectedSuccessfulComparisonPosts: dispatches, realNetworkCalls: 0, providerCalls: 0, coverage: "challenge/body/POST deadlines, cancellation, recovery, held programme facts and saved A/B geometry" }));
