import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { acquireLiveRunLock, createLiveSpendLedger, liveRunLockPath, markLiveSpendUnknown, parseLiveDeploymentAuthority, parseLiveProviderTelemetry, parseLiveSpendLedger, rebindLiveSpendLedger, reserveLiveSpend, settleLiveSpend, validateHealthRelease, type LiveSpendLedger } from "../tests/e2e/helpers/sprint09-live-budget.ts";

const host = "geoai-immutable-7f9c.vercel.app";
const commit = "a".repeat(40);
const authority = parseLiveDeploymentAuthority(`https://${host}`, host, commit);
assert.ok(authority, "Exact immutable deployment authority must pass.");
assert.equal(parseLiveDeploymentAuthority("https://geoai-mvp.vercel.app", "geoai-mvp.vercel.app", commit), null,
  "The moving Production alias must fail closed.");
assert.equal(parseLiveDeploymentAuthority(`https://${host}`, "geoai-other.vercel.app", commit), null,
  "A host mismatch must fail closed.");
assert.equal(parseLiveDeploymentAuthority(`https://${host}`, host, "short-sha"), null,
  "A non-immutable commit identifier must fail closed.");
assert.equal(validateHealthRelease({
  releaseCommit: commit,
  deploymentMetadata: { provider: "vercel", deploymentHost: host }
}, authority), true);
assert.equal(validateHealthRelease({
  releaseCommit: "b".repeat(40),
  deploymentMetadata: { provider: "vercel", deploymentHost: host }
}, authority), false, "A stale or different health commit must fail closed.");
let releaseDispatches = 0;
const dispatchAfterReleaseGate = (baseURL: string, expectedHost: string, expectedCommit: string, health: unknown) => {
  const candidate = parseLiveDeploymentAuthority(baseURL, expectedHost, expectedCommit);
  if (candidate && validateHealthRelease(health, candidate)) releaseDispatches += 1;
};
dispatchAfterReleaseGate("https://geoai-mvp.vercel.app", "geoai-mvp.vercel.app", commit, {});
dispatchAfterReleaseGate(`https://${host}`, host, commit, {
  releaseCommit: "b".repeat(40), deploymentMetadata: { provider: "vercel", deploymentHost: host }
});
assert.equal(releaseDispatches, 0, "Alias and stale-health paths must dispatch zero provider calls.");

function analysisPayload(options: {
  depth?: "quick" | "standard" | "deep";
  model?: "gpt-5.6-terra" | "gpt-5.6-sol";
  reasoningEffort?: "low" | "medium" | "high";
  outputTokens?: number;
  estimatedCostUsd?: number;
  requestId?: string;
} = {}) {
  const depth = options.depth ?? "quick";
  const model = options.model ?? "gpt-5.6-terra";
  const reasoningEffort = options.reasoningEffort ?? "low";
  const outputTokens = options.outputTokens ?? 30;
  const estimatedCostUsd = options.estimatedCostUsd ?? (model === "gpt-5.6-terra" ? 0.000529 : 0.000938);
  const requestId = options.requestId ?? "resp_live";
  const costRateSource = model === "gpt-5.6-terra"
    ? "OpenAI gpt-5.6-terra Standard API rate accessed 2026-09-04: USD 2/M ordinary input, USD 0.2/M cached input, USD 2.5/M cache writes, USD 12/M output"
    : "OpenAI gpt-5.6-sol Standard API rate accessed 2026-09-04: USD 4/M ordinary input, USD 0.4/M cached input, USD 5/M cache writes, USD 20/M output";
  return {
    mode: "openai",
    schemaVersion: 6,
    telemetry: {
      provider: "openai",
      schemaVersion: 6,
      model,
      reasoningEffort,
      depth,
      promptVersion: "POINT_OBJECT_AI_PROMPT_V9_2026_09_12",
      requestId,
      latencyMs: 250,
      attempts: 1,
      attemptTrace: [{
        attempt: 1,
        purpose: "focused",
        model,
        reasoningEffort,
        requestId,
        inputTokens: 100,
        cachedInputTokens: 20,
        cacheWriteTokens: 10,
        outputTokens,
        totalTokens: 100 + outputTokens,
        estimatedCostUsd
      }],
      inputTokens: 100,
      cachedInputTokens: 20,
      cacheWriteTokens: 10,
      outputTokens,
      totalTokens: 100 + outputTokens,
      estimatedCostUsd,
      costRateSource,
      stored: false,
      toolCalls: 0
    }
  };
}

const telemetry = parseLiveProviderTelemetry("ai", "quick", analysisPayload());
assert.ok(telemetry, "A complete internally consistent telemetry receipt must pass.");
assert.equal(parseLiveProviderTelemetry("ai", "quick", analysisPayload({ estimatedCostUsd: -0.01 })), null,
  "Negative provider cost must fail closed.");
const badAttempts = analysisPayload() as ReturnType<typeof analysisPayload>;
badAttempts.telemetry.attempts = 2;
assert.equal(parseLiveProviderTelemetry("ai", "quick", badAttempts), null,
  "Attempt count and trace length must agree.");
const badTokens = analysisPayload();
badTokens.telemetry.totalTokens = 129;
assert.equal(parseLiveProviderTelemetry("ai", "quick", badTokens), null,
  "Aggregate token telemetry must reconcile.");
const analysisTelemetryForCreate = analysisPayload().telemetry;
const {
  provider: _provider, schemaVersion: _schemaVersion, depth: _depth, promptVersion: _promptVersion,
  ...createRawTelemetry
} = analysisTelemetryForCreate;
const createTelemetry = parseLiveProviderTelemetry("create", "quick", {
  mode: "openai_concept",
  promptVersion: "POINT_OBJECT_CREATE_PROGRAM_V1_2026_09_04",
  telemetry: {
    ...createRawTelemetry,
    attemptTrace: [{ ...createRawTelemetry.attemptTrace[0], purpose: "initial" }]
  }
});
assert.ok(createTelemetry, "Create telemetry must pass the same token, attempt and pinned-rate reconciliation.");

let ledger = createLiveSpendLedger(authority);
const first = reserveLiveSpend(ledger, "ai", "quick", "2026-09-12T12:00:00.000Z");
if (!first.ok) throw new Error(first.reason);
assert.equal(first.ok, true);
ledger = settleLiveSpend(first.ledger, first.receipt.id, {
  status: 200,
  resultHash: "b".repeat(64),
  telemetry
});
assert.equal(ledger.receipts[0]?.state, "settled");
assert.equal(ledger.estimatedOrReservedUsd, 0.000529);
assert.deepEqual(parseLiveSpendLedger(JSON.parse(JSON.stringify(ledger)), authority), ledger,
  "A settled strict ledger must survive a JSON round trip.");
assert.equal(ledger.receipts[0]?.deploymentHost, authority.deploymentHost);
assert.equal(ledger.receipts[0]?.releaseCommit, authority.releaseCommit);

const productionHost = "geoai-production-91ac.vercel.app";
const productionCommit = "d".repeat(40);
const productionAuthority = parseLiveDeploymentAuthority(`https://${productionHost}`, productionHost, productionCommit);
assert.ok(productionAuthority);
const productionHealth = {
  releaseCommit: productionCommit,
  deploymentMetadata: { provider: "vercel", deploymentHost: productionHost }
};
const previewReceipts = JSON.stringify(ledger.receipts);
const previewCharge = ledger.estimatedOrReservedUsd;
const rebound = rebindLiveSpendLedger(ledger, authority, productionAuthority, productionHealth);
assert.equal(rebound.deploymentHost, productionHost);
assert.equal(rebound.releaseCommit, productionCommit);
assert.equal(JSON.stringify(rebound.receipts), previewReceipts, "Rebind must preserve every historical receipt byte.");
assert.equal(rebound.estimatedOrReservedUsd, previewCharge, "Rebind must not reset or discount prior spend.");
assert.ok(parseLiveSpendLedger(rebound, productionAuthority));
assert.equal(parseLiveSpendLedger(rebound, authority), null, "The rebound ledger must reject its former root authority.");
assert.throws(() => rebindLiveSpendLedger(ledger, productionAuthority, productionAuthority, productionHealth), /current-authority/,
  "A wrong claimed existing authority must fail closed.");
assert.throws(() => rebindLiveSpendLedger(ledger, authority, productionAuthority, {
  releaseCommit: "e".repeat(40), deploymentMetadata: { provider: "vercel", deploymentHost: productionHost }
}), /not verified/, "A mismatched next-deployment health tuple must fail closed.");
const forgedOldReceipt = JSON.parse(JSON.stringify(rebound)) as LiveSpendLedger;
forgedOldReceipt.receipts[0]!.deploymentHost = "geoai-mvp.vercel.app";
assert.equal(parseLiveSpendLedger(forgedOldReceipt, productionAuthority), null,
  "A forged historical receipt authority must invalidate the whole ledger.");

const negativeCost = JSON.parse(JSON.stringify(ledger)) as LiveSpendLedger;
negativeCost.receipts[0]!.estimatedUsd = -1;
negativeCost.estimatedOrReservedUsd = -1;
assert.equal(parseLiveSpendLedger(negativeCost, authority), null, "Negative settled ledger costs must be rejected.");
const extraLedgerField = { ...ledger, unexpected: true };
assert.equal(parseLiveSpendLedger(extraLedgerField, authority), null, "Unknown ledger fields must be rejected.");
const mismatchedAuthority = JSON.parse(JSON.stringify(ledger)) as LiveSpendLedger;
mismatchedAuthority.releaseCommit = "c".repeat(40);
assert.equal(parseLiveSpendLedger(mismatchedAuthority, authority), null, "Ledger authority must be immutable.");

let dispatched = 0;
const dispatchOnlyWhenReserved = (candidate: LiveSpendLedger) => {
  const reservation = reserveLiveSpend(candidate, "ai", "quick", "2026-09-12T12:01:00.000Z");
  if (reservation.ok) dispatched += 1;
  return reservation;
};
const unresolved = markLiveSpendUnknown(first.ledger, first.receipt.id);
assert.equal(dispatchOnlyWhenReserved(unresolved).ok, false);
assert.equal(dispatched, 0, "Unknown spend must cause zero provider dispatches.");
const reboundUnresolved = rebindLiveSpendLedger(unresolved, authority, productionAuthority, productionHealth);
assert.equal(reboundUnresolved.estimatedOrReservedUsd, unresolved.estimatedOrReservedUsd);
assert.equal(dispatchOnlyWhenReserved(reboundUnresolved).ok, false);
assert.equal(dispatched, 0, "Rebinding must not unblock an unknown prior charge.");

let nearCeiling = createLiveSpendLedger(authority);
for (let index = 0; index < 8; index += 1) {
  const reservation = reserveLiveSpend(nearCeiling, "ai", "deep", `2026-09-12T12:0${index}:00.000Z`);
  if (!reservation.ok) throw new Error(reservation.reason);
  assert.ok(reservation.ok);
  const deepCost = 0.100338;
  const deepTelemetry = parseLiveProviderTelemetry("ai", "deep", analysisPayload({
    depth: "deep", model: "gpt-5.6-sol", reasoningEffort: "high", outputTokens: 5_000,
    estimatedCostUsd: deepCost, requestId: `resp_deep_${index}`
  }));
  assert.ok(deepTelemetry);
  nearCeiling = settleLiveSpend(reservation.ledger, reservation.receipt.id, {
    status: 200, resultHash: (index + 1).toString(16).repeat(64), telemetry: deepTelemetry
  });
}
assert.ok(parseLiveSpendLedger(nearCeiling, authority));
assert.equal(dispatchOnlyWhenReserved(nearCeiling).ok, false);
assert.equal(dispatched, 0, "A reserve that could cross USD 2 must cause zero provider dispatches.");

const lockRoot = mkdtempSync(join(realpathSync(tmpdir()), "geoai-sprint09-lock-"));
const artifactsDirectory = join(lockRoot, "artifacts");
mkdirSync(artifactsDirectory, { mode: 0o700 });
const ledgerPath = join(artifactsDirectory, "live-spend-ledger.json");
const helperUrl = pathToFileURL(resolve("tests/e2e/helpers/sprint09-live-budget.ts")).href;
const childProgram = `
const { acquireLiveRunLock } = await import(process.argv[1]);
try {
  const lock = acquireLiveRunLock(process.argv[2]);
  if (process.argv[3] === "hold") {
    process.stdout.write("ready\\n");
    process.stdin.resume();
    await new Promise((resolve) => process.stdin.once("end", resolve));
  } else {
    process.stdout.write("acquired\\n");
  }
  lock.release();
} catch (error) {
  process.stdout.write(\`blocked:\${error instanceof Error ? error.message : String(error)}\\n\`);
  process.exitCode = 23;
}`;
const childArguments = ["--experimental-transform-types", "-e", childProgram, helperUrl, ledgerPath];
const holder = spawn(process.execPath, [...childArguments, "hold"], { stdio: ["pipe", "pipe", "pipe"] });
try {
  await new Promise<void>((resolveReady, rejectReady) => {
    const timer = setTimeout(() => rejectReady(new Error("Run-lock holder did not become ready.")), 5_000);
    let output = "";
    holder.stdout.setEncoding("utf8");
    holder.stdout.on("data", (chunk: string) => {
      output += chunk;
      if (output.includes("ready\n")) { clearTimeout(timer); resolveReady(); }
    });
    holder.once("exit", (code) => { clearTimeout(timer); rejectReady(new Error(`Run-lock holder exited early (${code}).`)); });
  });
  const lockPath = liveRunLockPath(ledgerPath);
  assert.equal(statSync(lockPath).mode & 0o777, 0o600, "The cross-process run lock must be private 0600.");
  const heldBytes = readFileSync(lockPath, "utf8");
  const contender = spawnSync(process.execPath, [...childArguments, "try"], { encoding: "utf8" });
  assert.equal(contender.status, 23, `The second process must fail closed: ${contender.stderr}`);
  assert.match(contender.stdout, /Another live-test run holds the spend ledger lock/);
  assert.equal(readFileSync(lockPath, "utf8"), heldBytes, "A contender must not break or rewrite an existing lock.");
  holder.stdin.end();
  const holderExit = await new Promise<number | null>((resolveExit) => holder.once("exit", resolveExit));
  assert.equal(holderExit, 0, "The lock holder must release cleanly.");
  assert.equal(existsSync(lockPath), false, "A clean holder release must remove its own lock.");
  const reacquired = acquireLiveRunLock(ledgerPath);
  reacquired.release();
} finally {
  if (holder.exitCode === null) holder.kill();
  rmSync(lockRoot, { recursive: true, force: true });
}

console.log("Sprint 09 live budget contract checks passed.");
