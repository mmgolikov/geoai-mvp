"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function OnboardingPanel() {
  const { isAuthenticated, isDemo, user, signOut } = useAuth();
  const [tokenStaged, setTokenStaged] = useState(false);
  const [stagePending, setStagePending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const invitation = new URLSearchParams(hash).get("invitation");
    if (!invitation) return;
    setStagePending(true);
    void (async () => {
      try {
        const response = await fetch("/api/onboarding/invitation/stage", {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ token: invitation })
        });
        const result = await response.json() as { ok?: unknown };
        if (!response.ok || result.ok !== true) {
          setMessage("This invitation link is invalid or expired. Ask the project owner for a new invitation.");
          return;
        }
        setTokenStaged(true);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      } catch {
        setMessage("We could not prepare this invitation. Try opening the link again.");
      } finally {
        setStagePending(false);
      }
    })();
  }, []);

  async function acceptInvitation() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/onboarding/invitation", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: "{}"
      });
      const result = await response.json() as { ok?: unknown; data?: unknown };
      if (!response.ok || result.ok !== true) {
        setMessage(response.status === 401
          ? "Sign in with the email or phone number that received this invitation."
          : "This invitation is invalid, expired, already used or belongs to another account.");
        return;
      }
      setTokenStaged(false);
      setMessage("Project added. You can now open your projects or start in the workspace.");
    } catch {
      setMessage("Invitation processing is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  const title = tokenStaged
    ? "Join your GeoAI project"
    : isDemo
      ? "Your demo is ready"
      : isAuthenticated
        ? "Welcome to GeoAI"
        : "Start with GeoAI";

  return (
    <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-4xl place-items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Getting started</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>

        {stagePending ? (
          <p className="mt-5 rounded-xl border border-line bg-surface p-4 text-sm text-muted">Preparing your project invitation…</p>
        ) : null}

        {!stagePending && tokenStaged ? (
          <div className="mt-6 rounded-xl border border-brand/25 bg-[#f1f7f8] p-5">
            <p className="text-sm font-semibold text-ink">A project is ready to be added to your account.</p>
            {!isAuthenticated ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                Sign in with the email or phone number that received the invitation, then return here.
              </p>
            ) : isDemo ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                The demo account cannot join private projects. Sign out and use your verified email or phone number.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted">
                Signed in as <strong className="font-semibold text-ink">{user?.email}</strong>. Confirm to add the project.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {!isAuthenticated ? (
                <Link href="/login?next=/onboarding" className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]">
                  Sign in
                </Link>
              ) : isDemo ? (
                <button type="button" onClick={() => void signOut()} className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]">
                  Sign out of demo
                </button>
              ) : (
                <button type="button" disabled={pending} onClick={() => void acceptInvitation()} className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:opacity-60">
                  {pending ? "Adding project…" : "Add project"}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {!stagePending && !tokenStaged ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-lg font-semibold text-ink">Open the workspace</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {isDemo
                  ? "Explore the sample GeoAI workflow with demonstration projects and browser-only data."
                  : isAuthenticated
                    ? "Your account is ready. Assigned projects will appear automatically."
                    : "Sign in by email, phone or use the ready demo account."}
              </p>
              <Link href={isAuthenticated ? "/workspace" : "/login"} className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]">
                {isAuthenticated ? "Open workspace" : "Sign in"}
              </Link>
            </div>
            <div className="rounded-xl border border-line p-5">
              <h2 className="text-lg font-semibold text-ink">Projects</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Project access is added by invitation or organization assignment. You never need to copy a technical token manually.
              </p>
              <Link href="/projects" className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand">
                View projects
              </Link>
            </div>
          </div>
        ) : null}

        {message ? <p aria-live="polite" className="mt-4 rounded-md bg-surface px-3 py-2 text-sm leading-6 text-muted">{message}</p> : null}
      </div>
    </section>
  );
}
