import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parsePortableReadinessLoadArgs,
  runPortableReadinessLoad
} from "./sprint10-portable-readiness-load.mjs";

const EXPECTED_SHA = "e9c57a738db6d12c61bf0a3bcef80f404a1ce189";
const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "scripts/sprint10-portable-readiness-load.mjs"), "utf8");
const validPayload = Object.freeze({
  status: "ok",
  environment: "self_hosted_candidate",
  releaseCommit: EXPECTED_SHA
});
const response = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { "Content-Type": "application/json" }
});
const fakeClock = () => {
  let tick = 0;
  return () => {
    tick += 1;
    return tick;
  };
};
const compactConfig = Object.freeze({
  expectedSha: EXPECTED_SHA,
  clients: 3,
  iterations: 4,
  timeoutMs: 100,
  totalTimeoutMs: 1_000
});

assert.deepEqual(parsePortableReadinessLoadArgs(["--expected-sha", EXPECTED_SHA]), {
  expectedSha: EXPECTED_SHA,
  clients: 10,
  iterations: 20,
  timeoutMs: 5_000,
  totalTimeoutMs: 60_000
});
for (const args of [
  [],
  ["--expected-sha", "A".repeat(40)],
  ["--expected-sha", "a".repeat(39)],
  ["--expected-sha", EXPECTED_SHA, "--clients", "11"],
  ["--expected-sha", EXPECTED_SHA, "--iterations", "21"],
  ["--expected-sha", EXPECTED_SHA, "--timeout-ms", "5001"],
  ["--expected-sha", EXPECTED_SHA, "--total-timeout-ms", "60001"],
  ["--expected-sha", EXPECTED_SHA, "--clients", "1", "--clients", "2"],
  ["--expected-sha", EXPECTED_SHA, "--url", "http://example.test"]
]) {
  assert.throws(() => parsePortableReadinessLoadArgs(args));
}

let active = 0;
let maximumActive = 0;
let successCalls = 0;
const success = await runPortableReadinessLoad(compactConfig, {
  now: fakeClock(),
  fetchImpl: async (url, options) => {
    successCalls += 1;
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    assert.equal(url, "http://127.0.0.1:3000/api/health");
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "manual");
    await new Promise((resolveImmediate) => setImmediate(resolveImmediate));
    active -= 1;
    return response(validPayload);
  }
});
assert.equal(success.ok, true);
assert.equal(successCalls, 12);
assert.equal(success.summary.expectedRequests, 12);
assert.equal(success.summary.attempted, 12);
assert.equal(success.summary.succeeded, 12);
assert.equal(success.summary.errors, 0);
assert.deepEqual(Object.keys(success.summary), [
  "expectedRequests",
  "attempted",
  "succeeded",
  "p50Ms",
  "p95Ms",
  "maxMs",
  "errors",
  "durationMs"
]);
assert(maximumActive > 1 && maximumActive <= compactConfig.clients);

for (const [label, payload, expectedFailure] of [
  ["wrong SHA", { ...validPayload, releaseCommit: "0".repeat(40) }, "wrong_release"],
  ["wrong runtime", { ...validPayload, environment: "vercel_preview" }, "wrong_runtime"]
]) {
  let calls = 0;
  const result = await runPortableReadinessLoad(compactConfig, {
    now: fakeClock(),
    fetchImpl: async () => {
      calls += 1;
      return response(payload);
    }
  });
  assert.equal(result.ok, false, label);
  assert.equal(result.failureKind, expectedFailure, label);
  assert.equal(calls, 1, `${label} must abort before concurrent load`);
  assert.equal(result.summary.attempted, 1, label);
  assert.equal(result.summary.errors, 1, label);
}

let redirectCalls = 0;
const redirected = await runPortableReadinessLoad(compactConfig, {
  now: fakeClock(),
  fetchImpl: async () => {
    redirectCalls += 1;
    return response({ status: "redirect" }, 307);
  }
});
assert.equal(redirected.ok, false);
assert.equal(redirected.failureKind, "redirect");
assert.equal(redirectCalls, 1);

let timeoutCalls = 0;
const timedOut = await runPortableReadinessLoad({
  ...compactConfig,
  timeoutMs: 10,
  totalTimeoutMs: 100
}, {
  now: fakeClock(),
  fetchImpl: (_url, { signal }) => {
    timeoutCalls += 1;
    return new Promise((_, reject) => {
      const rejectAbort = () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      };
      if (signal.aborted) rejectAbort();
      else signal.addEventListener("abort", rejectAbort, { once: true });
    });
  }
});
assert.equal(timedOut.ok, false);
assert.equal(timedOut.failureKind, "request_timeout");
assert.equal(timeoutCalls, 1);
assert.equal(timedOut.summary.errors, 1);

let totalTimeoutCalls = 0;
const totalTimedOut = await runPortableReadinessLoad({
  ...compactConfig,
  timeoutMs: 100,
  totalTimeoutMs: 10
}, {
  now: fakeClock(),
  fetchImpl: (_url, { signal }) => {
    totalTimeoutCalls += 1;
    return new Promise((_, reject) => {
      const rejectAbort = () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      };
      if (signal.aborted) rejectAbort();
      else signal.addEventListener("abort", rejectAbort, { once: true });
    });
  }
});
assert.equal(totalTimedOut.ok, false);
assert.equal(totalTimedOut.failureKind, "total_timeout");
assert.equal(totalTimeoutCalls, 1);
assert.equal(totalTimedOut.summary.errors, 1);

assert.equal(source.includes("process.env"), false, "probe must not read environment configuration or secrets");
assert.equal((source.match(/https?:\/\//g) ?? []).length, 1, "probe must contain only the fixed loopback URL");
assert(source.includes('redirect: "manual"'), "probe must not follow redirects");
assert(!source.includes("/api/prototype/point-to-object/ai"), "probe must not call the paid AI route");
assert(!source.includes("/login"), "probe must not enter Auth flows");

console.log("portable readiness load offline check passed: strict CLI, bounded concurrency, exact runtime identity, redirect rejection, timeout abort and loopback-only scope");
