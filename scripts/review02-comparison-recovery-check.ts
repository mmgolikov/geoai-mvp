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
