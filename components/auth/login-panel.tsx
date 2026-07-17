"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { getSafeAuthRedirectPath } from "@/src/lib/auth/redirect-path";
import { mockDemoEmail, mockDemoPassword } from "@/src/lib/auth/mock-demo-session";

function isPhoneIdentifier(value: string) {
  return value.trim().startsWith("+");
}

export function LoginPanel() {
  const {
    isAuthenticated,
    isDemo,
    user,
    signIn,
    signInWithPassword,
    signInDemo,
    signInWithPhone,
    verifyPhoneCode,
    signOut
  } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const demoSelected = normalizedIdentifier === mockDemoEmail;
  const passwordSelected = password.length > 0;
  function destination() {
    return getSafeAuthRedirectPath(new URL(window.location.href).searchParams.get("next"), "/workspace");
  }

  useEffect(() => {
    if (new URL(window.location.href).searchParams.has("auth_error")) {
      setMessage("The sign-in link is invalid or expired. Request a new email.");
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      if (demoSelected) {
        const result = await signInDemo(identifier, password);
        setMessage(result.message);
        if (result.ok) window.location.assign(destination());
        return;
      }

      if (passwordSelected) {
        const result = await signInWithPassword(identifier, password);
        setMessage(result.message);
        if (result.ok) window.location.assign(destination());
        return;
      }

      if (isPhoneIdentifier(identifier)) {
        const result = await signInWithPhone(identifier);
        setMessage(result.message);
        setPhoneCodeSent(result.ok);
        return;
      }

      const result = await signIn(identifier);
      setMessage(result.message);
    } finally {
      setPending(false);
    }
  }

  async function handlePhoneVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = await verifyPhoneCode(identifier, phoneCode);
      setMessage(result.message);
      if (result.ok) window.location.assign(destination());
    } finally {
      setPending(false);
    }
  }

  function fillDemoCredentials() {
    setIdentifier(mockDemoEmail);
    setPassword(mockDemoPassword);
    setPhoneCodeSent(false);
    setPhoneCode("");
    setMessage(null);
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl place-items-center px-4 py-10">
      <div className="grid w-full overflow-hidden rounded-2xl border border-line bg-white shadow-sm lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">GeoAI access</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">Sign in to GeoAI</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Continue with your email or phone number. New users are created automatically after verification.
          </p>

          {isAuthenticated ? (
            <div className="mt-7 rounded-xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold text-ink">
                {isDemo ? "Demo account is active" : `Signed in as ${user?.email ?? "GeoAI user"}`}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {isDemo
                  ? "This account uses sample data only and cannot access Admin or protected customer data."
                  : "Your available projects are determined by your organization membership."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/profile" className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand">
                  Open profile
                </Link>
                <Link href="/workspace" className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]">
                  Open workspace
                </Link>
                <button type="button" onClick={() => void signOut()} className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand">
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="login-identifier" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Email or phone
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      setPhoneCodeSent(false);
                    }}
                    className="h-12 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                    placeholder="name@company.com or +971501234567"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      Password
                    </label>
                    <span className="text-xs text-muted">Optional for existing email accounts</span>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                    placeholder="Leave empty for a sign-in link or SMS code"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Please wait…" : demoSelected ? "Open demo" : passwordSelected ? "Sign in" : isPhoneIdentifier(identifier) ? "Send code" : "Send sign-in link"}
                </button>
              </form>

              {phoneCodeSent ? (
                <form onSubmit={handlePhoneVerification} className="mt-4 grid gap-3 rounded-xl border border-brand/25 bg-surface p-4">
                  <label htmlFor="phone-code" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    SMS code
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      id="phone-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={phoneCode}
                      onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="h-11 rounded-md border border-line bg-white px-3 text-sm tracking-[0.3em] text-ink outline-none focus:border-brand"
                      placeholder="000000"
                    />
                    <button disabled={pending} className="h-11 rounded-md bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60">
                      Verify
                    </button>
                  </div>
                </form>
              ) : null}

              {message ? <p aria-live="polite" className="mt-4 rounded-md bg-surface px-3 py-2 text-sm leading-6 text-muted">{message}</p> : null}
            </>
          )}
        </div>

        <aside className="border-t border-line bg-[#f1f7f8] p-6 sm:p-9 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Explore first</p>
          <h2 className="mt-3 text-2xl font-semibold text-ink">Use the ready demo account</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Open the sample workspace immediately. Demo activity stays in this browser and never becomes customer or official data.
          </p>
          <div className="mt-6 grid gap-3 rounded-xl border border-brand/20 bg-white p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Email</p>
              <code className="mt-1 block text-sm font-semibold text-ink">{mockDemoEmail}</code>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Password</p>
              <code className="mt-1 block text-sm font-semibold text-ink">{mockDemoPassword}</code>
            </div>
          </div>
          <button type="button" onClick={fillDemoCredentials} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md border border-brand bg-white px-4 text-sm font-semibold text-brand transition hover:bg-surface">
            Use demo credentials
          </button>
          <p className="mt-5 text-xs leading-5 text-muted">
            Phone sign-in becomes operational after an SMS provider is connected. Email and demo access do not depend on it.
          </p>
        </aside>
      </div>
    </section>
  );
}
