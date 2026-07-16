"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function OnboardingPanel() {
  const { authStatus, isAuthenticated } = useAuth();
  const [token, setToken] = useState("");
  const [tokenStaged, setTokenStaged] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const invitation = new URLSearchParams(hash).get("invitation");
    if (!invitation) return;
    setToken(invitation);
    void (async () => {
      try {
        const response = await fetch("/api/onboarding/invitation/stage", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ token: invitation })
        });
        const result = await response.json() as { ok?: unknown };
        if (!response.ok || result.ok !== true) {
          setMessage("The invitation could not be secured for sign-in. Keep this page open and try again.");
          return;
        }
        setToken("");
        setTokenStaged(true);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      } catch {
        setMessage("The invitation could not be secured for sign-in. Keep this page open and try again.");
      }
    })();
  }, []);

  async function acceptInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/onboarding/invitation", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(token.trim() ? { token: token.trim() } : {})
      });
      const result = await response.json() as { ok?: unknown; data?: unknown; status?: unknown };
      if (!response.ok || result.ok !== true) {
        setMessage(response.status === 401
          ? "Sign in with the invited email address before accepting this invitation."
          : "The invitation is invalid, expired, already used or not valid for this account.");
        return;
      }

      const payload = result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : null;
      setMessage(payload?.status === "expired"
        ? "This invitation has expired. Its expired state was recorded; request a new invitation."
        : "Invitation accepted. Project access will be resolved from the verified membership on your next request.");
      setToken("");
      setTokenStaged(false);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    } catch {
      setMessage("Invitation processing is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Project onboarding</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Accept a GeoAI invitation</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The one-time token arrives in the browser URL fragment, is moved into a short-lived HttpOnly same-site
          cookie for the email sign-in round trip, and is sent only to the same-origin onboarding API. The database
          stores only its SHA-256 hash.
        </p>

        {authStatus.effectiveMode !== "supabase_auth" || !isAuthenticated ? (
          <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-muted">
            A confirmed permanent Auth identity is required. <Link href="/login?next=/onboarding" className="font-semibold text-brand hover:underline">Sign in first</Link>.
          </p>
        ) : null}

        <form onSubmit={acceptInvitation} className="mt-6 grid gap-3">
          {tokenStaged ? (
            <p className="rounded-md border border-line bg-surface px-3 py-3 text-sm text-muted">
              The invitation is secured for this sign-in and will be removed after successful processing.
            </p>
          ) : (
            <>
              <label htmlFor="invitation-token" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                One-time invitation token
              </label>
              <input
                id="invitation-token"
                type="password"
                autoComplete="off"
                required
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand"
              />
            </>
          )}
          <button
            type="submit"
            disabled={pending || (!tokenStaged && token.trim().length === 0)}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Processing…" : "Accept invitation"}
          </button>
        </form>

        {message ? <p className="mt-4 rounded-md bg-surface px-3 py-2 text-sm leading-6 text-muted">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/mfa?next=/onboarding" className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand">
            Manage MFA
          </Link>
          <Link href="/projects" className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-muted transition hover:border-brand hover:text-ink">
            Open projects
          </Link>
        </div>
      </div>
    </section>
  );
}
