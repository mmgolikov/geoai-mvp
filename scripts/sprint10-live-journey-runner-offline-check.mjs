import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  acquireRunLease,
  releaseRunLease,
  runtimeEnvironment,
  validateLedger
} from "./sprint10-live-journey-run.mjs";

const ledgerId = "5aa405b3-bbda-48aa-aeea-ca3357be4042";
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-sprint10-runner-check-")));
chmodSync(root, 0o700);
const ledgerPath = join(root, "cycle-ledger.json");

function writeLedger(receipts) {
  writeFileSync(ledgerPath, JSON.stringify({
    schemaVersion: 1,
    cycleId: "GEOAI_FOUR_SPRINTS_2026_09_18",
    ledgerId,
    createdAt: "2026-09-18T00:00:00.000Z",
    ceilingUsd: 15,
    generation: receipts.length,
    receipts,
    estimatedOrReservedUsd: 0
  }), { mode: 0o600 });
  chmodSync(ledgerPath, 0o600);
}

try {
  const scrubbed = runtimeEnvironment({
    PATH: "/safe/bin",
    HOME: "/safe/home",
    LANG: "C",
    NODE_OPTIONS: "--require=/tmp/not-allowed.cjs",
    GEOAI_SPRINT10_LIVE_PASSWORD: "must-not-propagate",
    OPENAI_API_KEY: "must-not-propagate"
  });
  assert.deepEqual(scrubbed, { PATH: "/safe/bin", HOME: "/safe/home", LANG: "C" });

  writeLedger([]);
  assert.equal(validateLedger(root, ledgerPath).ledgerId, ledgerId);

  writeLedger([{ ledgerId, state: "reserved" }]);
  assert.throws(() => validateLedger(root, ledgerPath), /unresolved reserved\/unknown charge/);
  writeLedger([{ ledgerId, state: "unknown" }]);
  assert.throws(() => validateLedger(root, ledgerPath), /unresolved reserved\/unknown charge/);

  writeLedger([]);
  const first = acquireRunLease(root, ledgerPath, "a".repeat(40), "dubai-find");
  assert.throws(() => acquireRunLease(root, ledgerPath, "a".repeat(40), "dubai-find"), /already owns this exact ledger/);
  releaseRunLease(first);
  const second = acquireRunLease(root, ledgerPath, "a".repeat(40), "dubai-find");
  releaseRunLease(second);

  console.log("Sprint 10 live runner offline checks passed (environment scrub, unresolved-receipt stop, exclusive lease).");
} finally {
  rmSync(root, { recursive: true, force: true });
}
