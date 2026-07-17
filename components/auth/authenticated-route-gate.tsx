"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSafeAuthRedirectPath } from "@/src/lib/auth/redirect-path";

export function AuthenticatedRouteGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { authStatus, isAuthenticated, isSessionResolved } = useAuth();
  const requiresSession = authStatus.effectiveMode === "supabase_auth";

  useEffect(() => {
    if (!requiresSession || !isSessionResolved || isAuthenticated) return;
    const requestedPath = `${window.location.pathname}${window.location.search}`;
    const next = getSafeAuthRedirectPath(requestedPath, "/workspace");
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isAuthenticated, isSessionResolved, requiresSession, router]);

  if (authStatus.effectiveMode === "demo_public") return children;

  if (authStatus.effectiveMode === "disabled" && isSessionResolved) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-line bg-white p-7 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">GeoAI access</p>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Access is temporarily unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Authentication is not configured for this environment. Return to the landing page and try again later.
          </p>
          <Link href="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#113f50]">
            Return to landing
          </Link>
        </section>
      </main>
    );
  }

  if (!isSessionResolved || !isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface px-4 py-10" aria-live="polite">
        <div className="flex items-center gap-3 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-brand" aria-hidden="true" />
          {isSessionResolved ? "Opening sign in…" : "Restoring your session…"}
        </div>
      </main>
    );
  }

  return children;
}
