import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  RESERVE_USD,
  SPRINT10_ANALYSIS_PROMPT_VERSION,
  createSprint10SpendLedger,
  markSprint10SpendUnknown,
  reserveSprint10Spend,
  settleSprint10Spend,
  sprint10LedgerLockPath
} from "../tests/e2e/helpers/sprint10-live-budget.ts";
import {
  SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN
} from "../tests/e2e/helpers/sprint10-analysis-result-evidence.ts";
import {
  SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE_OPT_IN
} from "../tests/e2e/helpers/sprint10-depth-cycle-evidence.ts";
import {
  LIVE_SCOPE_RECEIPT_PLAN,
  classifyLiveJourneyReport,
  receiptSummary,
  acquireRunLease,
  releaseRunLease,
  runtimeEnvironment,
  validateAnalysisEvidenceCaptureEnvironment,
  validateDepthCycleEvidenceCaptureEnvironment,
  validateLedger,
  validateLiveLedgerPostRun,
  validateLiveLedgerPreflight,
  validateLiveLedgerScopeHeadroom
} from "./sprint10-live-journey-run.mjs";
import { DUBAI_CREATE_PROGRAMME_SCOPES } from "../tests/e2e/helpers/sprint10-live-journey-gate.ts";
import { encodeLiveJourneyDiagnostic, canonicalLiveJourneyCompletedSteps } from "./sprint10-live-journey-diagnostics.mjs";
import { parseLiveJourneyChildReceipt } from "./sprint10-hosted-auth-probe.mjs";

const ledgerId = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-sprint10-runner-check-")));
chmodSync(root, 0o700);
const ledgerPath = join(root, "cycle-ledger.json");
const createdAt = "2026-09-18T00:00:00.000Z";

function writeLedger(ledger) {
  writeFileSync(ledgerPath, `${JSON.stringify(ledger)}\n`, { mode: 0o600 });
  chmodSync(ledgerPath, 0o600);
}

function identity(requestKey) {
  return {
    requestKey,
    phase: "S4",
    candidateHost: "geoai-sprint10-check-geoaidev.vercel.app",
    candidateCommit: "a".repeat(40),
    route: "ai",
    depth: "standard",
    promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
    schemaVersion: 6
  };
}

try {
  assert.deepEqual(Object.fromEntries(Object.entries(LIVE_SCOPE_RECEIPT_PLAN).map(([scope, plan]) => [
    scope,
    plan.map(({ route, depth, reserveUsd }) => ({ route, depth, reserveUsd }))
  ])), {
    ...Object.fromEntries(["dubai-profile-depth-cycle", "dubai-redevelopment-depth-cycle", "dubai-diligence-depth-cycle"].map((scope) => [scope,
      ["standard", "standard", "deep", "quick"].map((depth) => ({ route: "ai", depth, reserveUsd: RESERVE_USD.ai }))
    ])),
    "quality20-analyse": [{ route: "ai", depth: null, reserveUsd: RESERVE_USD.ai }],
    "quality20-find": [],
    "quality20-acquire": [],
    "quality20-create": [{ route: "create", depth: "standard", reserveUsd: RESERVE_USD.create }],
    journey: [
      { route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai },
      { route: "create", depth: "standard", reserveUsd: RESERVE_USD.create }
    ],
    "dubai-analyse": [{ route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai }],
    "dubai-find": [],
    "dubai-find-analysis": [1, 2, 3].map(() => ({ route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai })),
    "singapore-create": [{ route: "create", depth: "standard", reserveUsd: RESERVE_USD.create }],
    "singapore-analyse": [{ route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai }],
    "singapore-find": [],
    "dubai-create": [{ route: "create", depth: "standard", reserveUsd: RESERVE_USD.create }],
    ...Object.fromEntries(DUBAI_CREATE_PROGRAMME_SCOPES.map((scope) => [scope,
      [{ route: "create", depth: "standard", reserveUsd: RESERVE_USD.create }]
    ])),
    "dubai-depth-cycle": [
      { route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai },
      { route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai },
      { route: "ai", depth: "deep", reserveUsd: RESERVE_USD.ai },
      { route: "ai", depth: "quick", reserveUsd: RESERVE_USD.ai }
    ]
  }, "the combined journey and every separately selectable case must retain exact bounded receipt plans");
  const evidencePath = join(root, "analysis-evidence.json");
  const scrubbed = runtimeEnvironment({
    PATH: "/safe/bin",
    HOME: "/safe/home",
    LANG: "C",
    NODE_OPTIONS: "--require=/tmp/not-allowed.cjs",
    GEOAI_SPRINT10_LIVE_PASSWORD: "must-not-propagate",
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE: "must-not-propagate-unvalidated",
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: "/must/not/propagate.json",
    OPENAI_API_KEY: "must-not-propagate"
  });
  assert.deepEqual(scrubbed, { PATH: "/safe/bin", HOME: "/safe/home", LANG: "C" });

  assert.deepEqual(validateAnalysisEvidenceCaptureEnvironment({}, "journey"), {},
    "evidence capture must remain off when both optional fields are absent");
  for (const source of [
    { GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE: SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN },
    { GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: evidencePath },
    {
      GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE: "write-analysis-response",
      GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: evidencePath
    },
    { GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE: "", GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: "" }
  ]) {
    assert.throws(() => validateAnalysisEvidenceCaptureEnvironment(source, "journey"), /exact opt-in/);
  }
  const requestedEvidence = {
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE: SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN,
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: evidencePath,
    GEOAI_SPRINT10_LIVE_PASSWORD: "must-not-propagate",
    OPENAI_API_KEY: "must-not-propagate"
  };
  for (const scope of ["dubai-find", "singapore-create", "singapore-analyse", "singapore-find", "dubai-create",
    ...DUBAI_CREATE_PROGRAMME_SCOPES]) {
    assert.throws(() => validateAnalysisEvidenceCaptureEnvironment(requestedEvidence, scope), /available only/);
  }
  assert.deepEqual(validateAnalysisEvidenceCaptureEnvironment(requestedEvidence, "journey"), {
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE: SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN,
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: evidencePath
  });
  assert.deepEqual(validateAnalysisEvidenceCaptureEnvironment(requestedEvidence, "dubai-analyse"), {
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE: SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN,
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: evidencePath
  });
  const forwardedEvidence = {
    ...runtimeEnvironment({ PATH: "/safe/bin", OPENAI_API_KEY: "must-not-propagate" }),
    ...validateAnalysisEvidenceCaptureEnvironment(requestedEvidence, "journey")
  };
  assert.deepEqual(Object.keys(forwardedEvidence).sort(), [
    "GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE",
    "GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH",
    "PATH"
  ]);
  assert.equal(JSON.stringify(forwardedEvidence).includes("must-not-propagate"), false);

  const depthEvidencePath = join(root, "depth-cycle-evidence.json");
  const requestedDepthEvidence = {
    GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE: SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE_OPT_IN,
    GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_PATH: depthEvidencePath,
    GEOAI_SPRINT10_LIVE_PASSWORD: "must-not-propagate",
    OPENAI_API_KEY: "must-not-propagate"
  };
  assert.deepEqual(validateDepthCycleEvidenceCaptureEnvironment({}, "dubai-depth-cycle"), {});
  assert.deepEqual(validateDepthCycleEvidenceCaptureEnvironment(requestedDepthEvidence, "dubai-depth-cycle"), {
    GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE: SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE_OPT_IN,
    GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_PATH: depthEvidencePath
  });
  for (const scope of ["journey", "dubai-analyse", "dubai-find", "singapore-create", "singapore-analyse", "singapore-find", "dubai-create",
    ...DUBAI_CREATE_PROGRAMME_SCOPES]) {
    assert.throws(() => validateDepthCycleEvidenceCaptureEnvironment(requestedDepthEvidence, scope), /available only/);
  }
  assert.throws(() => validateDepthCycleEvidenceCaptureEnvironment({
    ...requestedDepthEvidence,
    GEOAI_SPRINT10_DEPTH_CYCLE_EVIDENCE_CAPTURE: "wrong-opt-in"
  }, "dubai-depth-cycle"), /exact opt-in/);
  assert.throws(() => validateDepthCycleEvidenceCaptureEnvironment({
    ...requestedDepthEvidence,
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_CAPTURE: SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN,
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: evidencePath
  }, "dubai-depth-cycle"), /cannot be combined/);

  assert.throws(() => validateAnalysisEvidenceCaptureEnvironment({
    ...requestedEvidence,
    GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: "relative-evidence.json"
  }, "journey"), /absolute file path/);
  writeFileSync(evidencePath, "{}\n", { mode: 0o600 });
  assert.throws(() => validateAnalysisEvidenceCaptureEnvironment(requestedEvidence, "journey"), /already exists/);
  unlinkSync(evidencePath);
  const unsafeRoot = realpathSync(mkdtempSync(join(tmpdir(), "geoai-sprint10-evidence-unsafe-")));
  chmodSync(unsafeRoot, 0o755);
  try {
    assert.throws(() => validateAnalysisEvidenceCaptureEnvironment({
      ...requestedEvidence,
      GEOAI_SPRINT10_ANALYSIS_EVIDENCE_PATH: join(unsafeRoot, "analysis-evidence.json")
    }, "journey"), /private 0700 real directory/);
  } finally {
    rmSync(unsafeRoot, { recursive: true, force: true });
  }

  const empty = createSprint10SpendLedger(createdAt, ledgerId);
  writeLedger(empty);
  assert.equal(validateLedger(root, ledgerPath).ledgerId, ledgerId);
  for (const scope of [
    "journey", "dubai-analyse", "dubai-find", "singapore-create",
    "singapore-analyse", "singapore-find", "dubai-create", "dubai-depth-cycle",
    ...DUBAI_CREATE_PROGRAMME_SCOPES
  ]) {
    assert.equal(validateLiveLedgerPreflight(root, ledgerPath, scope).ledgerId, ledgerId);
  }
  assert.throws(() => validateLiveLedgerPreflight(root, ledgerPath, "all"), /scope is not accepted/,
    "an unknown scope must fail before any reservation or browser child");
  assert.equal(validateLiveLedgerPostRun(root, ledgerPath).ledgerId, ledgerId);

  for (const malformed of [
    { ...empty, unexpected: true },
    { ...empty, generation: 1 },
    { ...empty, estimatedOrReservedUsd: 15 },
    { ...empty, ledgerId: "00000000-0000-4000-8000-000000000000" }
  ]) {
    writeLedger(malformed);
    assert.throws(() => validateLedger(root, ledgerPath), /malformed|not accepted/);
  }

  const reservation = reserveSprint10Spend(empty, identity("S4.RUNNER.RESERVED"), "2026-09-18T00:00:01.000Z");
  assert.equal(reservation.ok, true);
  if (!reservation.ok) throw new Error("offline reservation fixture failed");
  writeLedger({
    ...reservation.ledger,
    receipts: [{ ...reservation.ledger.receipts[0], id: 2 }]
  });
  assert.throws(() => validateLedger(root, ledgerPath), /malformed, missing or unsafe/);
  writeLedger(reservation.ledger);
  assert.throws(() => validateLiveLedgerPreflight(root, ledgerPath, "journey"), /unresolved reserved\/unknown charge/);
  const unknown = markSprint10SpendUnknown(
    reservation.ledger,
    reservation.receipt.id,
    identity("S4.RUNNER.RESERVED"),
    "2026-09-18T00:00:02.000Z",
    "response_unreadable"
  );
  writeLedger(unknown);
  assert.throws(() => validateLiveLedgerPostRun(root, ledgerPath), /unresolved reserved\/unknown charge/);
  assert.deepEqual(validateLiveLedgerPostRun(root, ledgerPath, { failureProjection: true }), unknown);
  assert.throws(() => validateLiveLedgerPostRun(root, ledgerPath, { failureProjection: "true" }), /unresolved/);

  // Synthetic three-candidate run: two accepted telemetry settlements, then one
  // dispatched request with no accepted terminal response. No live ledger access.
  let findLedger = createSprint10SpendLedger(createdAt, ledgerId);
  const fixtureAttempt = { attempt: 1, purpose: "initial", model: "gpt-5.6-terra", reasoningEffort: "medium",
    requestId: "resp_offline_find", inputTokens: 100, cachedInputTokens: 0, cacheWriteTokens: 0,
    outputTokens: 10, totalTokens: 110, estimatedCostUsd: 0.00032 };
  for (let index = 1; index <= 3; index += 1) {
    const requestIdentity = identity(`S4.RUNNER.FIND.${index}`);
    const reserved = reserveSprint10Spend(findLedger, requestIdentity, "2026-09-18T00:00:01.000Z");
    assert.equal(reserved.ok, true);
    if (index === 3) {
      findLedger = markSprint10SpendUnknown(reserved.ledger, reserved.receipt.id, requestIdentity,
        "2026-09-18T00:00:02.000Z", "request_failed_after_dispatch");
    } else {
      const { attempt: _attempt, purpose: _purpose, ...totals } = fixtureAttempt;
      findLedger = settleSprint10Spend(reserved.ledger, reserved.receipt.id, requestIdentity, {
        settledAt: "2026-09-18T00:00:02.000Z", status: 200, resultHash: "a".repeat(64),
        telemetry: { ...totals, provider: "openai", route: "ai", depth: "standard", promptVersion: SPRINT10_ANALYSIS_PROMPT_VERSION,
          schemaVersion: 6, latencyMs: 1, attempts: 1, attemptTrace: [fixtureAttempt], stored: false, toolCalls: 0,
          costRateSource: "OpenAI gpt-5.6-terra Standard API rate accessed 2026-09-04: USD 2/M ordinary input, USD 0.2/M cached input, USD 2.5/M cache writes, USD 12/M output" }
      });
    }
  }
  assert.deepEqual(findLedger.receipts.map((receipt) => receipt.state), ["settled", "settled", "unknown"]);
  writeLedger(findLedger);
  const findConfig = { ledgerRoot: root, ledgerPath, baselineReceiptCount: 0, scope: "dubai-find-analysis",
    host: identity("unused").candidateHost, commit: identity("unused").candidateCommit };
  assert.throws(() => receiptSummary(findConfig), /unresolved/);
  const summary = receiptSummary(findConfig, { failureProjection: true });
  assert.equal(summary[2].estimatedUsd, null);
  for (const cleanupStage of [null, "logout_action_missing"]) {
    const report = { error: encodeLiveJourneyDiagnostic({ primaryStatus: "failed", primaryStage: "analyse_paid_network_failed", cleanupStage,
      completedSteps: canonicalLiveJourneyCompletedSteps(["find_local_reopen", "analyse_paid_response", "analyse_local_save", "analyse_local_reopen"]) }) };
    const classified = classifyLiveJourneyReport(report, 1, findConfig, summary);
    assert.equal(classified.receipt.status, cleanupStage ? "FAIL_CLEANUP" : "FAIL");
    assert.deepEqual(parseLiveJourneyChildReceipt({ status: 1, stdout: JSON.stringify(classified.receipt) },
      { scope: findConfig.scope, previewHost: findConfig.host, commit: findConfig.commit }).receipts, summary);
  }
  assert.throws(() => classifyLiveJourneyReport({ stats: { expected: 1, skipped: 0, unexpected: 0, flaky: 0 } }, 0, findConfig, summary), /failed child/);
  assert.throws(() => classifyLiveJourneyReport({ error: encodeLiveJourneyDiagnostic({ primaryStatus: "inconclusive",
    primaryStage: "find_candidate_count", cleanupStage: null, completedSteps: [] }) }, 1, findConfig, summary), /INCONCLUSIVE/);
  assert.throws(() => validateLiveLedgerPreflight(root, ledgerPath, "dubai-find-analysis"), /unresolved/);
  const blockedDispatch = reserveSprint10Spend(findLedger, identity("S4.RUNNER.FIND.REPLAY"), "2026-09-18T00:00:03.000Z");
  assert.equal(blockedDispatch.ok, false);
  assert.match(blockedDispatch.reason, /unknown provider charge/);
  assert.deepEqual(validateLiveLedgerPostRun(root, ledgerPath, { failureProjection: true }), findLedger,
    "Failure reporting must not settle or rewrite any original receipt.");

  assert.deepEqual(validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 13.5 }, "journey"),
    { reserveRequired: 1.5, remainingUsd: 1.5 });
  assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 13.50000001 }, "journey"),
    /insufficient remaining/);
  assert.doesNotThrow(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 13.8 }, "dubai-analyse"));
  assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 13.80000001 }, "dubai-analyse"));
  assert.doesNotThrow(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 14.7 }, "singapore-create"));
  assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 14.70000001 }, "singapore-create"));
  assert.doesNotThrow(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 13.8 }, "singapore-analyse"));
  assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 13.80000001 }, "singapore-analyse"));
  assert.doesNotThrow(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 14.7 }, "dubai-create"));
  assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 14.70000001 }, "dubai-create"));
  assert.doesNotThrow(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 15 }, "dubai-find"));
  assert.doesNotThrow(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 15 }, "singapore-find"));
  assert.doesNotThrow(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 10.2 }, "dubai-depth-cycle"));
  assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 10.20000001 }, "dubai-depth-cycle"));
  assert.throws(() => validateLiveLedgerScopeHeadroom({ ceilingUsd: 15, estimatedOrReservedUsd: 15 }, "journey"));

  writeLedger(empty);
  const cycleLease = sprint10LedgerLockPath(ledgerPath);
  writeFileSync(cycleLease, "offline-stale-cycle-lease\n", { mode: 0o600 });
  assert.throws(() => validateLiveLedgerPreflight(root, ledgerPath, "journey"), /active or stale ledger lease/);
  unlinkSync(cycleLease);
  const runnerLeasePath = join(root, ".cycle-ledger.json.sprint10-live-journey.lock");
  writeFileSync(runnerLeasePath, "offline-stale-runner-lease\n", { mode: 0o600 });
  assert.throws(() => validateLiveLedgerPreflight(root, ledgerPath, "journey"), /active or stale ledger lease/);
  assert.throws(() => validateLiveLedgerPostRun(root, ledgerPath), /active or stale ledger lease/);
  unlinkSync(runnerLeasePath);

  symlinkSync(join(root, "missing-cycle-lease-target"), cycleLease);
  assert.throws(() => validateLiveLedgerPreflight(root, ledgerPath, "journey"), /unsafe ledger lease link/,
    "a dangling canonical ledger lease link must not be treated as absent");
  unlinkSync(cycleLease);
  symlinkSync(join(root, "missing-runner-lease-target"), runnerLeasePath);
  assert.throws(() => validateLiveLedgerPreflight(root, ledgerPath, "journey"), /unsafe ledger lease link/,
    "a dangling runner lease link must not be treated as absent");
  assert.throws(() => validateLiveLedgerPostRun(root, ledgerPath), /unsafe ledger lease link/);
  unlinkSync(runnerLeasePath);

  validateLiveLedgerPreflight(root, ledgerPath, "journey");
  const first = acquireRunLease(root, ledgerPath, "a".repeat(40), "journey");
  assert.throws(() => acquireRunLease(root, ledgerPath, "a".repeat(40), "journey"), /already owns this exact ledger/,
    "a lease appearing after read-only preflight must stop the raced runner without retry");
  assert.equal(validateLiveLedgerPostRun(root, ledgerPath, { allowActiveRunnerLease: true }).ledgerId, ledgerId);
  releaseRunLease(first);
  assert.equal(validateLiveLedgerPostRun(root, ledgerPath).ledgerId, ledgerId);

  chmodSync(ledgerPath, 0o644);
  assert.throws(() => validateLedger(root, ledgerPath), /malformed, missing or unsafe/);
  chmodSync(ledgerPath, 0o600);
  const linked = join(root, "linked-ledger.json");
  symlinkSync(ledgerPath, linked);
  assert.throws(() => validateLedger(root, linked), /malformed, missing or unsafe/);

  console.log(JSON.stringify({
    status: "PASS",
    cases: {
      strictCanonicalLedger: 6,
      unresolvedStops: 2,
      scopeHeadroomBoundaries: 15,
      staleLeaseStops: 6,
      raceAfterPreflight: 1,
      postRunNoFreshHeadroom: 2,
      threeFindReceiptsFailureRoundTrips: 2,
      unknownSpendSuccessAndReplayDenials: 5,
      pathModeSymlink: 2,
      environmentScrub: 2,
      evidenceCaptureOff: 1,
      evidencePairRejections: 4,
      evidenceScopeRejections: 5,
      evidenceScopeAcceptances: 2,
      evidencePathRejections: 3,
      evidenceForwarding: 1,
      depthEvidenceCaptureOff: 1,
      depthEvidencePairRejections: 1,
      depthEvidenceScopeRejections: 7,
      depthEvidenceScopeAcceptances: 1,
      depthEvidenceMutualExclusion: 1
    }
  }));
} finally {
  rmSync(root, { recursive: true, force: true });
}
