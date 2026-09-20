import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
  SPRINT10_LIVE_PAID_SCOPE_MATRIX,
  sprint10PaidPostDecision,
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

function validPayload(target: Sprint10RequestIdentity, withRepair = false) {
  const lunaRate = "OpenAI gpt-5.6-luna Standard API rate accessed 2026-09-04: USD 0.2/M ordinary input, USD 0.02/M cached input, USD 0.25/M cache writes, USD 1.2/M output";
  const terraRate = "OpenAI gpt-5.6-terra Standard API rate accessed 2026-09-04: USD 2/M ordinary input, USD 0.2/M cached input, USD 2.5/M cache writes, USD 12/M output";
  const initialAttempt = {
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
  const repairAttempt = {
    attempt: 2,
    purpose: "repair",
    model: "gpt-5.6-terra",
    reasoningEffort: "low",
    requestId: "offline-response-2",
    inputTokens: 80,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 8,
    totalTokens: 88,
    estimatedCostUsd: 0.000256
  };
  const attemptTrace = withRepair ? [initialAttempt, repairAttempt] : [initialAttempt];
  const finalAttempt = attemptTrace.at(-1)!;
  return {
    mode: "openai",
    schemaVersion: 6,
    telemetry: {
      provider: "openai",
      schemaVersion: 6,
      model: finalAttempt.model,
      reasoningEffort: finalAttempt.reasoningEffort,
      depth: target.depth,
      promptVersion: target.promptVersion,
      requestId: finalAttempt.requestId,
      latencyMs: 25,
      attempts: attemptTrace.length,
      attemptTrace,
      inputTokens: attemptTrace.reduce((sum, attempt) => sum + attempt.inputTokens, 0),
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: attemptTrace.reduce((sum, attempt) => sum + attempt.outputTokens, 0),
      totalTokens: attemptTrace.reduce((sum, attempt) => sum + attempt.totalTokens, 0),
      estimatedCostUsd: Number(attemptTrace.reduce((sum, attempt) => sum + attempt.estimatedCostUsd, 0).toFixed(8)),
      costRateSource: withRepair ? `${lunaRate} | ${terraRate}` : lunaRate,
      stored: false,
      toolCalls: 0
    }
  };
}

async function run() {
  const liveSpec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
  const marketSource = readFileSync(new URL("../src/lib/prototype/point-to-object-markets.ts", import.meta.url), "utf8");
  assert.deepEqual(SPRINT10_LIVE_PAID_SCOPE_MATRIX, {
    journey: { ai: 1, create: 1 },
    "dubai-analyse": { ai: 1, create: 0 },
    "dubai-find": { ai: 0, create: 0 },
    "singapore-create": { ai: 0, create: 1 },
    "singapore-analyse": { ai: 1, create: 0 },
    "singapore-find": { ai: 0, create: 0 },
    "dubai-create": { ai: 0, create: 1 },
    "dubai-depth-cycle": { ai: 4, create: 0 },
    "dubai-profile-depth-cycle": { ai: 4, create: 0 },
    "dubai-redevelopment-depth-cycle": { ai: 4, create: 0 },
    "dubai-diligence-depth-cycle": { ai: 4, create: 0 },
    "quality20-analyse": { ai: 1, create: 0 },
    "quality20-find": { ai: 0, create: 0 },
    "quality20-acquire": { ai: 0, create: 0 },
    "quality20-create": { ai: 0, create: 1 }
  }, "Every selectable live scope must have one exact paid-route matrix.");
  assert.deepEqual(sprint10PaidPostDecision("dubai-find", "ai", 1), { ok: false, reason: "route_disallowed" });
  assert.deepEqual(sprint10PaidPostDecision("dubai-find", "create", 1), { ok: false, reason: "route_disallowed" });
  assert.deepEqual(sprint10PaidPostDecision("dubai-analyse", "ai", 1), { ok: true });
  assert.deepEqual(sprint10PaidPostDecision("dubai-analyse", "ai", 2), { ok: false, reason: "occurrence_exceeded" });
  assert.deepEqual(sprint10PaidPostDecision("singapore-create", "create", 1), { ok: true });
  assert.deepEqual(sprint10PaidPostDecision("singapore-analyse", "ai", 1), { ok: true });
  assert.deepEqual(sprint10PaidPostDecision("singapore-analyse", "create", 1), { ok: false, reason: "route_disallowed" });
  assert.deepEqual(sprint10PaidPostDecision("singapore-analyse", "ai", 2), { ok: false, reason: "occurrence_exceeded" });
  assert.deepEqual(sprint10PaidPostDecision("singapore-find", "ai", 1), { ok: false, reason: "route_disallowed" });
  assert.deepEqual(sprint10PaidPostDecision("singapore-find", "create", 1), { ok: false, reason: "route_disallowed" });
  assert.deepEqual(sprint10PaidPostDecision("dubai-create", "create", 1), { ok: true });
  assert.deepEqual(sprint10PaidPostDecision("dubai-create", "ai", 1), { ok: false, reason: "route_disallowed" });
  assert.deepEqual(sprint10PaidPostDecision("dubai-create", "create", 2), { ok: false, reason: "occurrence_exceeded" });
  assert.deepEqual(sprint10PaidPostDecision("dubai-depth-cycle", "ai", 1), { ok: true });
  assert.deepEqual(sprint10PaidPostDecision("dubai-depth-cycle", "ai", 4), { ok: true });
  assert.deepEqual(sprint10PaidPostDecision("dubai-depth-cycle", "ai", 5), { ok: false, reason: "occurrence_exceeded" });
  assert.deepEqual(sprint10PaidPostDecision("dubai-depth-cycle", "create", 1), { ok: false, reason: "route_disallowed" });

  assert.match(liveSpec, /fill\("Marina Bay Sands Tower 1"\)/,
    "Singapore Analyse must keep one exact public place query");
  assert.match(liveSpec, /SINGAPORE_MARINA_BAY_REFERENCE_BOUNDS = \[103[.]855, 1[.]278, 103[.]868, 1[.]289\]/,
    "Singapore Find must remain bounded to the reviewed public reference envelope");
  assert.match(liveSpec, /selectOption\("b2b_commercial_real_estate"\)/,
    "Singapore Find must keep its exact product role/scenario path");
  assert.match(marketSource, /key: "singapore",[\s\S]*?center: \[103[.]8605263, 1[.]2827539\],[\s\S]*?zoom: 16[.]6,/,
    "the offline camera proof must remain bound to the actual Singapore market camera");
  const singaporeFindBody = /async function runSingaporeFind[\s\S]*?\n}\n\ntype LiveCreateCase/.exec(liveSpec)?.[0] ?? "";
  const preDispatchHelper = /async function installFindPreDispatchGate[\s\S]*?\n}\n\nfunction acceptedFindResponse/.exec(liveSpec)?.[0] ?? "";
  const twoDimensionalIndex = singaporeFindBody.indexOf('name: "2d"');
  const zoomInIndex = singaporeFindBody.indexOf('name: "Zoom in"');
  const preDispatchInstallIndex = singaporeFindBody.indexOf('installFindPreDispatchGate(page, acceptedSingaporeFindRequest, "Singapore")');
  const searchClickIndex = singaporeFindBody.indexOf('getByTestId("find-search-cta").click()');
  const preDispatchGuardIndex = preDispatchHelper.indexOf("!accepts(submitted)");
  const transportContinuationIndex = preDispatchHelper.indexOf("await route.fallback()");
  assert.ok(twoDimensionalIndex >= 0 && zoomInIndex > twoDimensionalIndex && preDispatchInstallIndex > zoomInIndex &&
    searchClickIndex > preDispatchInstallIndex && preDispatchGuardIndex >= 0 && transportContinuationIndex > preDispatchGuardIndex,
  "Singapore Find must use real 2D/zoom UI and validate its actual bounded request before transport continuation and CTA dispatch.");
  const worldSize = 512 * (2 ** 17.6);
  const center = [103.8605263, 1.2827539] as const;
  const centerPixel = [
    ((center[0] + 180) / 360) * worldSize,
    ((1 - Math.asinh(Math.tan(center[1] * Math.PI / 180)) / Math.PI) / 2) * worldSize
  ] as const;
  const unproject = (x: number, y: number) => [
    (x / worldSize) * 360 - 180,
    Math.atan(Math.sinh(Math.PI * (1 - 2 * y / worldSize))) * 180 / Math.PI
  ] as const;
  const conservativeSouthWest = unproject(centerPixel[0] - 1440 / 2, centerPixel[1] + 1000 / 2);
  const conservativeNorthEast = unproject(centerPixel[0] + 1440 / 2, centerPixel[1] - 1000 / 2);
  assert.ok(conservativeSouthWest[0] >= 103.855 && conservativeSouthWest[1] >= 1.278 &&
    conservativeNorthEast[0] <= 103.868 && conservativeNorthEast[1] <= 1.289,
  "one real zoom-in at 2D must fit even a conservative full 1440x1000 canvas inside the frozen Marina Bay envelope");
  assert.match(liveSpec, /\[55[.]27015, 25[.]20515\][\s\S]*\[55[.]27065, 25[.]20565\]/,
    "Dubai Create must keep its exact reviewed fixture AOI");
  assert.match(liveSpec, /if \(configuration[.]scope === "singapore-analyse"\)/);
  assert.match(liveSpec, /if \(configuration[.]scope === "singapore-find"\)/);
  assert.match(liveSpec, /if \(configuration[.]scope === "dubai-create"\)/);
  assert.match(liveSpec, /if \(configuration[.]scope === "dubai-depth-cycle"\)/);
  const depthCycleBody = /async function runDubaiDepthCycle[\s\S]*?\n}\n\nasync function runSingaporeAnalyse/.exec(liveSpec)?.[0] ?? "";
  assert.match(depthCycleBody, /screeningDepths = \["standard", "deep", "quick"\]/,
    "the new cycle must keep the exact Standard/Deep/Quick screening sequence after its baseline");
  assert.match(depthCycleBody, /data-in-flight-depth/,
    "the cycle must observe an in-flight depth receipt rather than only submitted/completed payloads");
  assert.match(depthCycleBody, /Running .* analysis while keeping the current result visible/,
    "the cycle must prove that the prior result remains visible while each rerun is loading");
  assert.match(depthCycleBody, /requireLocalArtifactState\(page, configuration[.]userId, "analyse", 4\)/,
    "the four bounded paid results must remain distinct browser-local artifacts");
  assert.doesNotMatch(liveSpec, /configuration[.]scope === "journey" \|\| configuration[.]scope === "(?:singapore-analyse|singapore-find|dubai-create)"/,
    "the existing two-paid-request journey must not silently include any complementary scope");
  assert.match(liveSpec, /selectedScope === "journey" \|\| selectedScope === "dubai-analyse"/,
    "structured semantic evidence capture must remain limited to the reviewed Dubai case");

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

  const repairIdentity = identity(sprint10LiveRequestKey("offline-one-repair", "ai", 1, commit));
  const repairTelemetry = parseSprint10ProviderTelemetry(repairIdentity, validPayload(repairIdentity, true));
  assert.ok(repairTelemetry, "One telemetry-visible provider repair must be accepted by the explicit founder contract.");
  assert.equal(repairTelemetry.attempts, 2);
  assert.deepEqual(repairTelemetry.attemptTrace.map((attempt) => attempt.purpose), ["initial", "repair"]);
  const tooManyAttempts = structuredClone(validPayload(repairIdentity, true));
  tooManyAttempts.telemetry.attempts = 3;
  assert.equal(parseSprint10ProviderTelemetry(repairIdentity, tooManyAttempts), null,
    "More than one provider repair must be rejected by strict telemetry.");

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

  console.log("Sprint 10 live journey offline gate checks passed (scope matrix, reservation ordering, no browser retry, one bounded provider repair, strict telemetry, unknown-charge stop).");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Sprint 10 live journey offline checks failed.");
  process.exitCode = 1;
});
