import { createHash } from "node:crypto";
import type { PilotIdentityDecision } from "@/src/lib/auth/require-pilot-identity";

const RATE_WINDOW_MS = 10 * 60_000;
const CONTEXT_CLIENT_MAX = 12;
const CONTEXT_GLOBAL_MAX = 60;
const REVIEW02_PREVIEW_BRANCH = "codex/sprint10-control-20260918";
export type PointObjectSourceAdmissionPolicyInput = {
  environment: Readonly<Record<string, string | undefined>>;
  surfaceEnabled: boolean;
};

/**
 * Control verified deployment protection for this exact Preview branch.
 * These existing server metadata bind the approved tester budget; they do not
 * establish protection or identity, which remain external/route gates.
 * No request headers, new flags, account names or personal allowlist are used.
 */
export function pointObjectContextAcquisitionPolicy(input?: PointObjectSourceAdmissionPolicyInput) {
  const environment = input?.environment;
  const reviewPreview = input?.surfaceEnabled === true && environment?.VERCEL_ENV === "preview" &&
    environment.VERCEL_GIT_COMMIT_REF === REVIEW02_PREVIEW_BRANCH &&
    Boolean(environment.VERCEL_DEPLOYMENT_ID?.trim() || environment.VERCEL_URL?.trim());
  return { scope: reviewPreview ? "review02_preview_testers" as const : "standard" as const,
    clientMaximum: reviewPreview ? CONTEXT_GLOBAL_MAX : CONTEXT_CLIENT_MAX,
    globalMaximum: CONTEXT_GLOBAL_MAX };
}
type RateBucket = { startedAt: number; count: number };
type AllowedIdentity = Extract<PilotIdentityDecision, { allowed: true }>;

export class PointObjectSourceAdmissionError extends Error {
  readonly code = "APPLICATION_RATE_LIMITED";
  readonly httpStatus = 429;
  readonly retryable = true;
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("Live object details are temporarily rate limited.");
    this.name = "PointObjectSourceAdmissionError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Only the identity returned by requirePilotIdentity can select a user bucket.
 * Browser headers, IP addresses and account names cannot select a quota.
 * Public/demo callers share one conservative bucket. The exact approved
 * Preview applies a bounded source-only tester budget to that same bucket.
 */
function sourcePrincipal(identity: AllowedIdentity): string {
  const context = identity.context;
  if (identity.mode === "supabase_auth" && context?.verified && context.status === "verified" &&
      context.user?.id && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(context.user.id) &&
      context.user.is_anonymous === false && context.profile?.id &&
      context.profile.status === "active" && context.profile.identityKind === "user" &&
      context.profile.authUserId === context.user.id) {
    return `user:${createHash("sha256").update(context.user.id).digest("hex")}`;
  }
  // A missing/ambiguous authenticated context never gets a fresh user bucket.
  return "public";
}

/** Application acquisition quota only; provider throttles and AI gates remain separate. */
export function createPointObjectContextSourceAdmission(now: () => number = () => Date.now()) {
  const buckets = new Map<string, RateBucket>();
  return (identity: AllowedIdentity, policyInput?: PointObjectSourceAdmissionPolicyInput): void => {
    const startedAt = now();
    for (const [key, bucket] of buckets) {
      if (startedAt - bucket.startedAt >= RATE_WINDOW_MS) buckets.delete(key);
    }
    const policy = pointObjectContextAcquisitionPolicy(policyInput);
    const keys = [{ key: sourcePrincipal(identity), maximum: policy.clientMaximum },
      { key: "global", maximum: policy.globalMaximum }];
    // Check both limits before consuming either one: a rejected global request
    // must not also spend the user's remaining acquisition allowance.
    for (const { key, maximum } of keys) {
      const bucket = buckets.get(key);
      if (bucket && bucket.count >= maximum) {
        throw new PointObjectSourceAdmissionError(Math.max(1,
          Math.ceil((RATE_WINDOW_MS - (startedAt - bucket.startedAt)) / 1_000)));
      }
    }
    for (const { key } of keys) {
      const bucket = buckets.get(key);
      if (bucket) bucket.count += 1;
      else buckets.set(key, { startedAt, count: 1 });
    }
  };
}

export const admitPointObjectContextSourceAcquisition = createPointObjectContextSourceAdmission();

const acquisitions = new Map<string, Promise<unknown>>();

/** One process-local cache read/fill per public key, with no retained failures. */
export function coalescePointObjectSourceAcquisition<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const existing = acquisitions.get(key);
  if (existing) return existing as Promise<T>;
  // Do not pass Promise.then's undefined argument into Next's cached function:
  // unstable_cache includes invocation arguments in its public snapshot key.
  const pending = Promise.resolve().then(() => operation());
  acquisitions.set(key, pending);
  // Use both outcomes rather than an unobserved rejecting finally() promise.
  void pending.then(() => acquisitions.delete(key), () => acquisitions.delete(key));
  return pending;
}
