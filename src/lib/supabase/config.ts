// Global anon clients are not request-scoped authorization. Keep application
// repositories disconnected until AUTH-01 replaces this foundation with a
// caller-JWT client and proves the RLS persona matrix.
export const requestScopedSupabaseRepositoriesEnabled: boolean = false;

export const approvedHostedSupabaseTargets = {
  development: {
    ref: "pphdqkurxneyagvnnjdt",
    name: "geoai-dev"
  },
  auth_rehearsal: {
    ref: "bkmfcjzalcvdsdvyxpgi",
    name: "geoai-auth-rehearsal"
  }
} as const;

export type ApprovedHostedSupabaseTarget = keyof typeof approvedHostedSupabaseTargets;
export type SupabaseTargetResolution =
  | {
      status: "approved";
      kind: "hosted";
      target: ApprovedHostedSupabaseTarget;
      ref: string;
      url: string;
    }
  | {
      status: "approved";
      kind: "local";
      target: "local";
      ref: null;
      url: string;
    }
  | {
      status: "missing" | "target_mismatch";
      kind: null;
      target: null;
      ref: null;
      url: null;
    };

function resolveHostedTarget(parsed: URL) {
  if (
    parsed.protocol !== "https:" ||
    parsed.port ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    return null;
  }

  const projectRef = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1] ?? null;
  if (!projectRef) return null;

  for (const [target, definition] of Object.entries(approvedHostedSupabaseTargets) as Array<
    [ApprovedHostedSupabaseTarget, (typeof approvedHostedSupabaseTargets)[ApprovedHostedSupabaseTarget]]
  >) {
    if (definition.ref === projectRef) {
      return { target, ref: definition.ref };
    }
  }

  return null;
}

export function resolveSupabaseTarget(): SupabaseTargetResolution {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawUrl) {
    return { status: "missing", kind: null, target: null, ref: null, url: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { status: "target_mismatch", kind: null, target: null, ref: null, url: null };
  }

  const hosted = resolveHostedTarget(parsed);
  if (hosted) {
    return {
      status: "approved",
      kind: "hosted",
      target: hosted.target,
      ref: hosted.ref,
      url: parsed.origin
    };
  }

  const localAllowed = process.env.NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE?.trim().toLowerCase() === "true";
  if (
    localAllowed &&
    parsed.origin === "http://127.0.0.1:54321" &&
    parsed.pathname === "/" &&
    !parsed.username &&
    !parsed.password &&
    !parsed.search &&
    !parsed.hash
  ) {
    return {
      status: "approved",
      kind: "local",
      target: "local",
      ref: null,
      url: parsed.origin
    };
  }

  return { status: "target_mismatch", kind: null, target: null, ref: null, url: null };
}

export function getSupabaseUrl() {
  const target = resolveSupabaseTarget();
  return target.status === "approved" ? target.url : null;
}

export function getSupabasePublishableKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return value && /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(value) ? value : null;
}

export function isSupabaseConfigured() {
  return requestScopedSupabaseRepositoriesEnabled && Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
