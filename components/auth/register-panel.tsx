"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function RegisterPanel() {
  const { authStatus, register } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const enabled = authStatus.effectiveMode === "supabase_auth";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await register(email);
      setMessage(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-3xl place-items-center px-4 py-12">
      <div className="w-full rounded-lg border border-line bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Account registration</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Create a GeoAI identity</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Registration creates an Auth identity only. Organization, client and project access still require an
          accepted invitation or an administrator assignment.
        </p>

        {enabled ? (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
            <label htmlFor="registration-email" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Work email
            </label>
            <input
              id="registration-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
              placeholder="name@company.com"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send confirmation link"}
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-muted">
            Registration is unavailable in the current deployment mode. {authStatus.caveat}
          </p>
        )}

        {message ? <p className="mt-4 rounded-md bg-surface px-3 py-2 text-sm text-muted">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/login" className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand">
            Back to sign in
          </Link>
          <Link href="/workspace" className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-muted transition hover:border-brand hover:text-ink">
            Public workspace
          </Link>
        </div>
      </div>
    </section>
  );
}
