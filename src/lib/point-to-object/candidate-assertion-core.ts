import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { CandidateAssertionReceipt } from "./contracts";
import { sha256 } from "./hash";

const ASSERTION_TTL_MS = 5 * 60 * 1_000;
const ASSERTION_STORE_CAP = 1_000;
const NONCE_BYTES = 32;
const SIGNING_KEY_BYTES = 32;
const INTENDED_SCOPE = "candidate_selection" as const;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/;
const TENANT_SCOPE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

/** Server-derived only; no client field can set tenant scope. */
export interface CandidateAssertionBinding {
  tenantScope: string;
  requestHash: string;
  pointHash: string;
  resolutionHash: string;
  candidateSetHash: string;
  snapshotId: string;
  candidateId: string;
}

export interface StoredCandidateAssertion extends CandidateAssertionBinding {
  expiresAtMs: number;
}

export type CandidateAssertionConsumeResult =
  | { ok: true; candidateId: string }
  | { ok: false; reason: "invalid" | "access_denied" };

export interface CandidateAssertionService {
  issue(binding: CandidateAssertionBinding): CandidateAssertionReceipt;
  consume(token: string, expected: Omit<CandidateAssertionBinding, "candidateId">): CandidateAssertionConsumeResult;
}

export interface InMemoryCandidateAssertionOptions {
  now?: () => number;
  createNonce?: () => Buffer;
  signingKey?: Buffer;
  store?: Map<string, StoredCandidateAssertion>;
  ttlMs?: number;
  storeCap?: number;
}

export class CandidateAssertionServiceError extends Error {
  readonly code: "CONTRACT_VALIDATION_FAILED" | "INTERNAL_ERROR";

  constructor(code: "CONTRACT_VALIDATION_FAILED" | "INTERNAL_ERROR", message: string) {
    super(message);
    this.name = "CandidateAssertionServiceError";
    this.code = code;
  }
}

function boundedTenantScope(value: string): string {
  if (!TENANT_SCOPE_PATTERN.test(value)) {
    throw new CandidateAssertionServiceError(
      "CONTRACT_VALIDATION_FAILED",
      "Candidate assertion tenant scope is invalid."
    );
  }
  return value;
}

function signNonce(signingKey: Buffer, encodedNonce: string): string {
  return createHmac("sha256", signingKey).update(encodedNonce, "utf8").digest("base64url");
}

function tenantBindingHash(signingKey: Buffer, tenantScope: string): string {
  return createHmac("sha256", signingKey)
    .update("geoai:candidate-assertion:tenant-binding:v1\0", "utf8")
    .update(tenantScope, "utf8")
    .digest("hex");
}

function signaturesEqual(left: string, right: string): boolean {
  try {
    const leftBytes = Buffer.from(left, "base64url");
    const rightBytes = Buffer.from(right, "base64url");
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
  } catch {
    return false;
  }
}

/**
 * Signed, single-use in-process chooser assertions for controlled preview use.
 * The ephemeral HMAC key is neither environment-backed nor persisted. Tamper,
 * replay, expiry, cold start and cross-instance use therefore fail closed.
 */
export class InMemoryCandidateAssertionService implements CandidateAssertionService {
  private readonly now: () => number;
  private readonly createNonce: () => Buffer;
  private readonly signingKey: Buffer;
  private readonly store: Map<string, StoredCandidateAssertion>;
  private readonly ttlMs: number;
  private readonly storeCap: number;

  constructor(options: InMemoryCandidateAssertionOptions = {}) {
    this.now = options.now ?? Date.now;
    this.createNonce = options.createNonce ?? (() => randomBytes(NONCE_BYTES));
    this.signingKey = Buffer.from(options.signingKey ?? randomBytes(SIGNING_KEY_BYTES));
    this.store = options.store ?? new Map<string, StoredCandidateAssertion>();
    this.ttlMs = options.ttlMs ?? ASSERTION_TTL_MS;
    this.storeCap = options.storeCap ?? ASSERTION_STORE_CAP;
    if (this.signingKey.length < SIGNING_KEY_BYTES) {
      throw new CandidateAssertionServiceError(
        "CONTRACT_VALIDATION_FAILED",
        "Candidate assertion signing key is too short."
      );
    }
  }

  issue(binding: CandidateAssertionBinding): CandidateAssertionReceipt {
    this.prune();
    if (this.store.size >= this.storeCap) {
      throw new CandidateAssertionServiceError("INTERNAL_ERROR", "Candidate assertion store capacity is exhausted.");
    }
    const tenantScope = boundedTenantScope(binding.tenantScope);
    const nonceBytes = this.createNonce();
    if (!Buffer.isBuffer(nonceBytes) || nonceBytes.length !== NONCE_BYTES) {
      throw new CandidateAssertionServiceError(
        "INTERNAL_ERROR",
        "Candidate assertion nonce generator returned invalid bytes."
      );
    }
    const encodedNonce = nonceBytes.toString("base64url");
    const token = `${encodedNonce}.${signNonce(this.signingKey, encodedNonce)}`;
    if (!TOKEN_PATTERN.test(token)) {
      throw new CandidateAssertionServiceError(
        "INTERNAL_ERROR",
        "Candidate assertion token generation failed validation."
      );
    }
    const expiresAtMs = this.now() + this.ttlMs;
    this.store.set(sha256(token), { ...binding, tenantScope, expiresAtMs });
    return {
      token,
      tenant_binding_hash: tenantBindingHash(this.signingKey, tenantScope),
      intended_scope: INTENDED_SCOPE,
      expires_at: new Date(expiresAtMs).toISOString(),
      request_hash: binding.requestHash,
      point_hash: binding.pointHash,
      resolution_hash: binding.resolutionHash,
      candidate_set_hash: binding.candidateSetHash,
      snapshot_id: binding.snapshotId
    };
  }

  consume(token: string, expected: Omit<CandidateAssertionBinding, "candidateId">): CandidateAssertionConsumeResult {
    if (!TOKEN_PATTERN.test(token)) return { ok: false, reason: "invalid" };
    const [encodedNonce, suppliedSignature] = token.split(".");
    const expectedSignature = signNonce(this.signingKey, encodedNonce);
    if (!signaturesEqual(suppliedSignature, expectedSignature)) return { ok: false, reason: "invalid" };

    const key = sha256(token);
    const stored = this.store.get(key);
    this.store.delete(key);
    if (!stored || stored.expiresAtMs <= this.now()) return { ok: false, reason: "invalid" };
    if (stored.tenantScope !== expected.tenantScope) return { ok: false, reason: "access_denied" };
    if (stored.requestHash !== expected.requestHash || stored.pointHash !== expected.pointHash ||
        stored.resolutionHash !== expected.resolutionHash || stored.candidateSetHash !== expected.candidateSetHash ||
        stored.snapshotId !== expected.snapshotId) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, candidateId: stored.candidateId };
  }

  private prune(): void {
    const now = this.now();
    for (const [key, assertion] of this.store) {
      if (assertion.expiresAtMs <= now) this.store.delete(key);
    }
  }
}
