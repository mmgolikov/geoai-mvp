"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

export function LoginPanel() {
  const { authStatus, isAuthenticated, user, roleLabel, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const isSupabaseMode = authStatus.effectiveMode === "supabase_auth";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await signIn(email);
    setMessage(result.message);
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-3xl place-items-center px-4 py-12">
      <div className="w-full rounded-lg border border-line bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Access foundation</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">GeoAI project access</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          GeoAI keeps the public demo available by default. Supabase Auth can be enabled later with deployment
          environment variables and project-level governance.
        </p>

        <div className="mt-5 grid gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-ink">Current mode</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
              {authStatus.label}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-ink">Session</span>
            <span className="text-right text-muted">
              {isAuthenticated ? `${user?.name ?? "Signed in"} / ${roleLabel}` : "Public preview"}
            </span>
          </div>
          <p className="text-xs leading-5 text-muted">{authStatus.caveat}</p>
        </div>

        {isSupabaseMode ? (
          <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Email magic link
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
              placeholder="client@example.com"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
            >
              Request magic link
            </button>
          </form>
        ) : (
          <div className="mt-5 rounded-lg border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-ink">Public pilot access is active</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              No sign-in is required for the current pilot screening flow. Client data protection still
              requires future auth, RLS and storage hardening before confidential use.
            </p>
          </div>
        )}

        {message ? <p className="mt-4 rounded-md bg-surface px-3 py-2 text-sm text-muted">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/workspace"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
          >
            Open workspace
          </Link>
          <Link
            href="/projects"
            className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
          >
            View projects
          </Link>
          {isAuthenticated && isSupabaseMode ? (
            <button
              type="button"
              onClick={() => {
                void signOut();
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-muted transition hover:border-brand hover:text-ink"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
