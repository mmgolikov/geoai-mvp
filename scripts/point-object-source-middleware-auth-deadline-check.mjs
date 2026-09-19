import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

import {
  createPointObjectSourceMiddlewareAuthDeadline,
  isPointObjectSourceMiddlewareAuthDeadlineError,
  pointObjectSourceMiddlewareRoute
} from "../src/lib/supabase/point-object-source-middleware-auth-deadline.ts";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const require = createRequire(import.meta.url);

async function rejectsWithDeadline(operation) {
  await assert.rejects(operation, (error) => isPointObjectSourceMiddlewareAuthDeadlineError(error));
}

let neverFetchSignal;
const neverFetchDeadline = createPointObjectSourceMiddlewareAuthDeadline("find", {
  timeoutMs: 15,
  emit: () => undefined,
  fetch: (_input, init) => new Promise((_resolve, reject) => {
    neverFetchSignal = init?.signal;
    init?.signal?.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  })
});
await rejectsWithDeadline(neverFetchDeadline.run(neverFetchDeadline.fetch("https://invalid.test/auth")));
assert.equal(neverFetchSignal?.aborted, true, "the physical Supabase fetch must be aborted at the total deadline");
neverFetchDeadline.terminate();

let bodySignal;
const stalledBodyDeadline = createPointObjectSourceMiddlewareAuthDeadline("area-context", {
  timeoutMs: 15,
  emit: () => undefined,
  fetch: async (_input, init) => {
    bodySignal = init?.signal;
    return {
      json: () => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal.reason), { once: true });
      })
    };
  }
});
await rejectsWithDeadline(stalledBodyDeadline.run((async () => {
  const response = await stalledBodyDeadline.fetch("https://invalid.test/auth");
  return response.json();
})()));
assert.equal(bodySignal?.aborted, true, "the same total deadline must cover response-body consumption");
stalledBodyDeadline.terminate();

const edgePrimitives = require("next/dist/compiled/@edge-runtime/primitives");
const nativeAbortController = globalThis.AbortController;
const nativeAbortSignal = globalThis.AbortSignal;
const nativeRequest = globalThis.Request;
try {
  globalThis.AbortController = edgePrimitives.AbortController;
  globalThis.AbortSignal = edgePrimitives.AbortSignal;
  globalThis.Request = edgePrimitives.Request;
  assert.equal(typeof globalThis.AbortSignal.any, "undefined", "the actual Next Edge AbortSignal fixture must lack AbortSignal.any");
  let edgeCombinedSignal;
  const edgeDeadline = createPointObjectSourceMiddlewareAuthDeadline("find", {
    timeoutMs: 100,
    emit: () => undefined,
    fetch: (_input, init) => new Promise((_resolve, reject) => {
      edgeCombinedSignal = init?.signal;
      init?.signal?.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    })
  });
  const callerAbort = new globalThis.AbortController();
  const edgeFetch = edgeDeadline.fetch("https://invalid.test/auth", { signal: callerAbort.signal });
  callerAbort.abort(new DOMException("caller stopped", "AbortError"));
  await assert.rejects(edgeFetch, { name: "AbortError" });
  assert.equal(edgeCombinedSignal instanceof edgePrimitives.AbortSignal, true,
    "the combined fetch signal must be constructed by the actual Next Edge runtime");
  edgeDeadline.terminate();
} finally {
  globalThis.AbortController = nativeAbortController;
  globalThis.AbortSignal = nativeAbortSignal;
  globalThis.Request = nativeRequest;
}

let lateCookieMutations = 0;
let finishLateOperation;
const lateOperation = new Promise((resolve) => { finishLateOperation = resolve; });
const lateCookieDeadline = createPointObjectSourceMiddlewareAuthDeadline("find", { timeoutMs: 15, emit: () => undefined });
const lateSdkCompletion = lateOperation.then(() => {
  lateCookieDeadline.runCookieMutation(() => { lateCookieMutations += 1; });
  return "late";
});
const boundedLateOperation = lateCookieDeadline.run(lateSdkCompletion);
await rejectsWithDeadline(boundedLateOperation);
finishLateOperation();
await lateSdkCompletion;
assert.equal(lateCookieMutations, 0, "late SDK completion must not mutate request or response cookies");
lateCookieDeadline.terminate();

let ordinaryCookieMutations = 0;
const ordinaryDeadline = createPointObjectSourceMiddlewareAuthDeadline("area-context", { timeoutMs: 100, emit: () => undefined });
const ordinaryResult = await ordinaryDeadline.run(Promise.resolve().then(() => {
  ordinaryDeadline.runCookieMutation(() => { ordinaryCookieMutations += 1; });
  return "refreshed";
}));
assert.equal(ordinaryResult, "refreshed");
assert.equal(ordinaryCookieMutations, 1, "ordinary refresh must retain its cookie propagation");
ordinaryDeadline.terminate();

assert.equal(pointObjectSourceMiddlewareRoute("/api/prototype/point-to-object/find"), "find");
assert.equal(pointObjectSourceMiddlewareRoute("/api/prototype/point-to-object/area-context"), "area-context");
for (const pathname of [
  "/api/prototype/point-to-object/create",
  "/api/prototype/point-to-object/context",
  "/api/prototype/point-to-object/suggest",
  "/api/auth/session",
  "/profile"
]) assert.equal(pointObjectSourceMiddlewareRoute(pathname), null, `${pathname} must retain the ordinary middleware path`);

let time = 1_000;
const lines = [];
const traceDeadline = createPointObjectSourceMiddlewareAuthDeadline("find", {
  timeoutMs: 100,
  now: () => time,
  emit: (line) => lines.push(JSON.parse(line))
});
traceDeadline.stage("auth_started");
time = 1_007;
traceDeadline.stage("auth_completed");
traceDeadline.terminate();
traceDeadline.stage("finished");
assert.deepEqual(lines.map((line) => line.stage), ["auth_started", "auth_completed", "finished"]);
for (const line of lines) {
  assert.deepEqual(Object.keys(line).sort(), ["elapsedMs", "event", "route", "stage"]);
  assert.equal(line.event, "point_object_source_middleware_auth");
  assert.equal(line.route, "find");
}

const updater = fs.readFileSync(new URL("../src/lib/supabase/update-session.ts", import.meta.url), "utf8");
assert.match(updater, /const sourceRoute = pointObjectSourceMiddlewareRoute\(request[.]nextUrl[.]pathname\)/);
assert.match(updater, /global: \{ fetch: sourceDeadline[.]fetch \}/,
  "source paths must inject the physically abortable fetch into Supabase");
assert.match(updater, /sourceDeadline[.]runCookieMutation\(apply\)/,
  "source cookie propagation must be guarded after terminal completion");
assert.match(updater, /if \(!sourceDeadline\) \{[\s\S]*?await supabase[.]auth[.]getClaims\(\);[\s\S]*?return response;/,
  "all other paths must retain the ordinary getClaims and response behavior");
assert.match(updater, /status: 503/);
assert.match(updater, /"Cache-Control": "private, no-store, max-age=0"/);
assert.match(updater, /retryable: true/);

await wait(0);
console.log("point-object source middleware auth deadline: abort, body, cookie, refresh and path isolation PASS");
