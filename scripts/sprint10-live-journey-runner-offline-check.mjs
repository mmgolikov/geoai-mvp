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
  sprint10LedgerLockPath
} from "../tests/e2e/helpers/sprint10-live-budget.ts";
import {
  SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN
} from "../tests/e2e/helpers/sprint10-analysis-result-evidence.ts";
import {
  LIVE_SCOPE_RECEIPT_PLAN,
  acquireRunLease,
  releaseRunLease,
  runtimeEnvironment,
  validateAnalysisEvidenceCaptureEnvironment,
  validateLedger,
  validateLiveLedgerPostRun,
  validateLiveLedgerPreflight,
  validateLiveLedgerScopeHeadroom
} from "./sprint10-live-journey-run.mjs";

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
    journey: [
      { route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai },
      { route: "create", depth: "standard", reserveUsd: RESERVE_USD.create }
    ],
    "dubai-analyse": [{ route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai }],
    "dubai-find": [],
    "singapore-create": [{ route: "create", depth: "standard", reserveUsd: RESERVE_USD.create }],
    "singapore-analyse": [{ route: "ai", depth: "standard", reserveUsd: RESERVE_USD.ai }],
    "singapore-find": [],
    "dubai-create": [{ route: "create", depth: "standard", reserveUsd: RESERVE_USD.create }]
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
  for (const scope of ["dubai-find", "singapore-create", "singapore-analyse", "singapore-find", "dubai-create"]) {
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
    "singapore-analyse", "singapore-find", "dubai-create"
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
      scopeHeadroomBoundaries: 13,
      staleLeaseStops: 6,
      raceAfterPreflight: 1,
      postRunNoFreshHeadroom: 2,
      pathModeSymlink: 2,
      environmentScrub: 2,
      evidenceCaptureOff: 1,
      evidencePairRejections: 4,
      evidenceScopeRejections: 5,
      evidenceScopeAcceptances: 2,
      evidencePathRejections: 3,
      evidenceForwarding: 1
    }
  }));
} finally {
  rmSync(root, { recursive: true, force: true });
}
