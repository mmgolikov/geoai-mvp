import assert from "node:assert/strict";
import { createSourceRequestTrace } from "../src/lib/prototype/source-request-trace.ts";

let time = 1_000;
const lines = [];
const trace = createSourceRequestTrace("area-context", (line) => lines.push(JSON.parse(line)), () => time);
time = 1_007;
trace.stage("authenticated");
trace.failed("deadline");
trace.stage("finished");
assert.deepEqual(lines.map((line) => line.stage), ["received", "authenticated", "failed", "finished"]);
assert.equal(new Set(lines.map((line) => line.requestId)).size, 1);
assert.match(String(lines[0].requestId), /^[a-f0-9-]{36}$/);
assert.equal(lines[1].elapsedMs, 7);
assert.equal(lines[2].failure, "deadline");
for (const line of lines) {
  assert.deepEqual(Object.keys(line).sort(), ["elapsedMs", "event", "requestId", "route", "stage", ...(line.stage === "failed" ? ["failure"] : [])].sort());
}
const broken = createSourceRequestTrace("find", () => { throw new Error("sink unavailable"); });
assert.doesNotThrow(() => { broken.failed("internal"); broken.stage("finished"); });
console.log("source request trace: fixed fields, correlated stages and sink-failure isolation PASS");
