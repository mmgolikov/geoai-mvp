import assert from "node:assert/strict";

import {
  SPRINT10_ANALYSIS_PROMPT_VERSION,
  createSprint10SpendLedger,
  parseSprint10ProviderTelemetry,
  reserveSprint10Spend,
  settleSprint10Spend,
  type Sprint10RequestIdentity
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
} from "../tests/e2e/helpers/sprint10-live-budget.ts";
import {
  dispatchSprint10PaidRequest,
  sprint10LiveRequestKey
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
} from "../tests/e2e/helpers/sprint10-live-journey-gate.ts";

const createdAt = "2026-09-18T00:00:00.000Z";
const host = "geoai-sprint10-check-geoaidev.vercel.app";
const commit = "a".repeat(40);

function identity(requestKey: string): Sprint10RequestIdentity {
  return {
    requestKey,
    phase: "S4",
    candidateHost: host,
    candidateCommit: commit,
    route: "ai",
    depth: "quick",
    promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
    schemaVersion: 6
  };
}

function validPayload(target: Sprint10RequestIdentity) {
  const costRateSource = "OpenAI gpt-5.6-luna Standard API rate accessed 2026-09-04: USD 0.2/M ordinary input, USD 0.02/M cached input, USD 0.25/M cache writes, USD 1.2/M output";
  const attempt = {
    attempt: 1,
    purpose: "initial",
    model: "gpt-5.6-luna",
    reasoningEffort: "low",
    requestId: "offline-response-1",
    inputTokens: 100,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 10,
    totalTokens: 110,
    estimatedCostUsd: 0.000032
  };
  return {
    mode: "openai",
    schemaVersion: 6,
    telemetry: {
      provider: "openai",
      schemaVersion: 6,
      model: attempt.model,
      reasoningEffort: attempt.reasoningEffort,
      depth: target.depth,
      promptVersion: target.promptVersion,
      requestId: attempt.requestId,
      latencyMs: 25,
      attempts: 1,
      attemptTrace: [attempt],
      inputTokens: attempt.inputTokens,
      cachedInputTokens: attempt.cachedInputTokens,
      cacheWriteTokens: attempt.cacheWriteTokens,
      outputTokens: attempt.outputTokens,
      totalTokens: attempt.totalTokens,
      estimatedCostUsd: attempt.estimatedCostUsd,
      costRateSource,
      stored: false,
      toolCalls: 0
    }
  };
}

async function run() {
  const firstIdentity = identity(sprint10LiveRequestKey("offline-valid", "ai", 1, commit));
  const telemetry = parseSprint10ProviderTelemetry(firstIdentity, validPayload(firstIdentity));
  assert.ok(telemetry, "Current V10 telemetry must pass the shared strict parser.");

  let ledger = createSprint10SpendLedger(createdAt, "5aa405b3-bbda-48aa-aeea-ca3357be4042");
  const validReservation = reserveSprint10Spend(ledger, firstIdentity, "2026-09-18T00:00:01.000Z");
  assert.equal(validReservation.ok, true);
  if (!validReservation.ok) throw new Error("The valid offline reservation was rejected.");
  ledger = settleSprint10Spend(validReservation.ledger, validReservation.receipt.id, firstIdentity, {
    settledAt: "2026-09-18T00:00:02.000Z",
    status: 200,
    resultHash: "b".repeat(64),
    telemetry
  });
  assert.equal(ledger.receipts[0]?.state, "settled");

  for (let index = 0; index < 12; index += 1) {
    const target = identity(sprint10LiveRequestKey(`offline-budget-${index}`, "ai", 1, commit));
    const reservation = reserveSprint10Spend(ledger, target, `2026-09-18T00:01:${String(index).padStart(2, "0")}.000Z`);
    if (!reservation.ok) break;
    ledger = reservation.ledger;
  }
  let transportDispatches = 0;
  const blocked = await dispatchSprint10PaidRequest({
    reserve() {
      const target = identity(sprint10LiveRequestKey("offline-over-budget", "ai", 1, commit));
      const reservation = reserveSprint10Spend(ledger, target, "2026-09-18T00:02:00.000Z");
      if (!reservation.ok) throw new Error(reservation.reason);
      return { receipt: reservation.receipt };
    },
    async dispatch() { transportDispatches += 1; },
    markUnknown() { throw new Error("A blocked reservation must not create a receipt."); }
  });
  assert.equal(blocked.ok, false);
  assert.equal(transportDispatches, 0, "Budget refusal must abort before transport dispatch.");

  let unknownMarked = 0;
  await assert.rejects(() => dispatchSprint10PaidRequest({
    reserve: () => ({ receipt: { id: 77 } }),
    async dispatch() { transportDispatches += 1; throw new Error("mock transport abort"); },
    markUnknown() { unknownMarked += 1; }
  }), /charge is unknown/);
  assert.equal(transportDispatches, 1, "A dispatched transport must never be retried automatically.");
  assert.equal(unknownMarked, 1, "A failed dispatched transport must become unknown exactly once.");

  const malformedIdentity = identity(sprint10LiveRequestKey("offline-malformed", "ai", 1, commit));
  let malformedLedger = createSprint10SpendLedger(createdAt, "5aa405b3-bbda-48aa-aeea-ca3357be4042");
  const malformedReservation = reserveSprint10Spend(malformedLedger, malformedIdentity, "2026-09-18T00:03:00.000Z");
  assert.equal(malformedReservation.ok, true);
  if (!malformedReservation.ok) throw new Error("The malformed-telemetry reservation was rejected before settlement.");
  malformedLedger = settleSprint10Spend(malformedReservation.ledger, malformedReservation.receipt.id, malformedIdentity, {
    settledAt: "2026-09-18T00:03:01.000Z",
    status: 200,
    resultHash: "c".repeat(64),
    telemetry: parseSprint10ProviderTelemetry(malformedIdentity, { mode: "openai", schemaVersion: 6, telemetry: {} })
  });
  assert.equal(malformedLedger.receipts[0]?.state, "unknown");
  const later = reserveSprint10Spend(
    malformedLedger,
    identity(sprint10LiveRequestKey("offline-after-unknown", "ai", 1, commit)),
    "2026-09-18T00:03:02.000Z"
  );
  assert.equal(later.ok, false, "Invalid telemetry must stop every later paid request.");

  console.log("Sprint 10 live journey offline gate checks passed (reservation ordering, no retry, strict telemetry, unknown-charge stop).");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Sprint 10 live journey offline checks failed.");
  process.exitCode = 1;
});
