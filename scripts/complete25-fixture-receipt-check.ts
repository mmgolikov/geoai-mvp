import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    try { return next(`${specifier}.ts`, context); } catch { /* canonical resolution */ }
  }
  return next(specifier, context);
} });
const { sprint10PublicEvidenceReceipt } = await import("../tests/e2e/helpers/sprint10-analysis-fixture");
const { parsePublicEvidenceReceipt, publicEvidenceReceiptIsCurrent, PUBLIC_EVIDENCE_LEASE_MS } = await import("../src/lib/prototype/point-to-object-evidence-receipt");
const originalNow = Date.now;
const created = Date.parse("2026-09-25T19:14:59.900Z");
try {
  Date.now = () => created;
  for (const locale of ["en", "ru"] as const) for (const sourceId of ["way/91010", null]) {
    const fixture = sprint10PublicEvidenceReceipt(sourceId, locale);
    const receipt = parsePublicEvidenceReceipt(fixture);
    assert.ok(receipt);
    assert.equal(Date.parse(receipt.createdAt), created);
    assert.equal(Date.parse(receipt.acquiredAt), created);
    assert.equal(Date.parse(receipt.expiresAt), created + PUBLIC_EVIDENCE_LEASE_MS);
    assert.equal(receipt.cacheWindow, Math.floor(created / PUBLIC_EVIDENCE_LEASE_MS));
    assert.equal(receipt.sourceLocale, locale === "ru" ? "ru,en" : "en");
    assert.equal(receipt.lookupSourceFeatureId, sourceId);
    assert.equal(publicEvidenceReceiptIsCurrent(receipt, created - 1), false);
    assert.equal(publicEvidenceReceiptIsCurrent(receipt, created), true);
    assert.equal(publicEvidenceReceiptIsCurrent(receipt, created + 1_000), true, "crossing the cache bucket must not expire a fresh receipt");
    assert.equal(publicEvidenceReceiptIsCurrent(receipt, created + PUBLIC_EVIDENCE_LEASE_MS - 1), true);
    assert.equal(publicEvidenceReceiptIsCurrent(receipt, created + PUBLIC_EVIDENCE_LEASE_MS), false, "the real 15-minute lease remains enforced");
    const oldCreated = Math.floor(created / PUBLIC_EVIDENCE_LEASE_MS) * PUBLIC_EVIDENCE_LEASE_MS;
    const oldReceipt = parsePublicEvidenceReceipt({ ...fixture, acquiredAt: new Date(oldCreated).toISOString(),
      createdAt: new Date(oldCreated).toISOString(), expiresAt: new Date(oldCreated + PUBLIC_EVIDENCE_LEASE_MS).toISOString() });
    assert.ok(oldReceipt);
    assert.equal(publicEvidenceReceiptIsCurrent(oldReceipt, created + 1_000), false, "reproduces the previous boundary failure");
  }
} finally { Date.now = originalNow; }
console.log("PASS: 4 fixture receipts cross the last-second cache boundary; exact creation time and real expiry enforced.");
