"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSafeAuthRedirectPath } from "@/src/lib/auth/redirect-path";
import { mockDemoEmail, mockDemoPassword } from "@/src/lib/auth/mock-demo-session";

type AuthMethod = "email" | "phone";

function getDestination() {
  if (typeof window === "undefined") return "/workspace";
  return getSafeAuthRedirectPath(new URL(window.location.href).searchParams.get("next"), "/workspace");
}

function JourneyItem({ number, tone, label, text }: { number: string; tone: "brand" | "personal"; label: string; text: string }) {
  return (
    <div className="flex min-h-[58px] items-center gap-3">
      <span className={`inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone === "brand" ? "bg-[#f0f7ff] text-brand" : "bg-[#f5f2ff] text-personal"}`}>{number}</span>
      <span className="min-w-0">
        <strong className={`block text-[10px] font-semibold uppercase ${tone === "brand" ? "text-brand" : "text-personal"}`}>{label}</strong>
        <span className="mt-0.5 block text-sm font-medium text-ink">{text}</span>
      </span>
    </div>
  );
}

export function LoginPanel() {
  const {
    isAuthenticated,
    signIn,
    signInWithPassword,
    signInDemo,
    signInWithPhone,
    verifyPhoneCode
  } = useAuth();
  const [intent, setIntent] = useState<"demo" | "request" | null>(null);
  const [method, setMethod] = useState<AuthMethod>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const demoSelected = method === "email" && normalizedIdentifier === mockDemoEmail;
  const passwordSelected = method === "email" && password.length > 0;

  useEffect(() => {
    const url = new URL(window.location.href);
    const requestedIntent = url.searchParams.get("intent");
    setIntent(requestedIntent === "demo" || requestedIntent === "request" ? requestedIntent : null);
    if (url.searchParams.has("auth_error")) {
      setMessage("The sign-in link is invalid or expired. Request a new email.");
    }
    if (isAuthenticated) window.location.replace(getDestination());
  }, [isAuthenticated]);

  function changeMethod(nextMethod: AuthMethod) {
    setMethod(nextMethod);
    setPhoneCodeSent(false);
    setPhoneCode("");
    setPassword("");
    setIdentifier("");
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      if (method === "phone") {
        const result = await signInWithPhone(identifier);
        setMessage(result.message);
        setPhoneCodeSent(result.ok);
        return;
      }
      if (demoSelected) {
        const result = await signInDemo(identifier, password);
        setMessage(result.message);
        if (result.ok) window.location.assign(getDestination());
        return;
      }
      if (passwordSelected) {
        const result = await signInWithPassword(identifier, password);
        setMessage(result.message);
        if (result.ok) window.location.assign(getDestination());
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
      if (result.ok) window.location.assign(getDestination());
    } finally {
      setPending(false);
    }
  }

  function fillDemoCredentials() {
    setMethod("email");
    setIdentifier(mockDemoEmail);
    setPassword(mockDemoPassword);
    setPhoneCodeSent(false);
    setPhoneCode("");
    setMessage(null);
  }

  const kicker = intent === "demo" ? "GeoAI demo access" : intent === "request" ? "GeoAI access request" : "GeoAI access";

  return (
    <section className="bg-gradient-to-br from-white via-[#fbfdff] to-[#edf6ff] px-4 py-8 sm:px-6 sm:py-10 lg:min-h-[calc(100vh-64px)] lg:py-12">
      <div className="mx-auto grid w-full max-w-[1320px] gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="order-2 overflow-hidden rounded-[28px] border border-line bg-[#f0f7ff] p-6 sm:p-8 lg:order-1 lg:p-11">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">GeoAI access</p>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[46px] sm:leading-[50px]">
            One account.<br />Every decision stays connected.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted">
            Sign in once, open Workspace immediately and keep your preferred audience and role across the system.
          </p>
          <div className="mt-7 grid gap-3 rounded-[20px] border border-line bg-white p-5">
            <JourneyItem number="01" tone="brand" label="Verify" text="Email, password or phone" />
            <JourneyItem number="02" tone="brand" label="Open" text="Workspace starts automatically" />
            <JourneyItem number="03" tone="personal" label="Remember" text="Profile saves role and region" />
          </div>
          <div className="mt-5 flex min-h-[52px] items-center gap-3 rounded-[14px] bg-[#e8fafa] px-4 text-[13px] font-semibold text-ink">
            <span className="text-lg text-accent">✓</span> After authorization: {getDestination()}
          </div>
          <p className="mt-6 text-xs leading-5 text-muted">
            Account preferences sync through the configured account service; the profile photo remains on this device until protected storage is enabled.
          </p>
        </aside>

        <div className="order-1 overflow-hidden rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8 lg:order-2 lg:p-[42px]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">{kicker}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-[40px]">Sign in to GeoAI</h1>
          <h2 className="mt-2 text-xl font-semibold text-ink sm:text-2xl">Continue to GeoAI</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {intent === "demo"
              ? "Sign in or use the ready browser-local demo. Workspace opens automatically after authorization."
              : intent === "request"
                ? "Sign in with an existing email or phone account. New account onboarding requires a separate approved invitation."
                : "Sign in with an existing email or phone account. A saved session opens Workspace automatically."}
          </p>

          {isAuthenticated ? (
            <div className="mt-7 flex min-h-20 items-center gap-4 rounded-2xl border border-accent/30 bg-[#e8fafa] p-5" aria-live="polite">
              <span className="h-3 w-3 animate-pulse rounded-full bg-accent motion-reduce:animate-none" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink">Authorization saved. Opening Workspace…</p>
            </div>
          ) : (
            <>
              <div className="mt-7 grid h-14 grid-cols-2 gap-1.5 rounded-xl bg-[#f0f7ff] p-1" role="group" aria-label="Sign-in method">
                {(["email", "phone"] as AuthMethod[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={method === item}
                    onClick={() => changeMethod(item)}
                    className={`rounded-[10px] text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${method === item ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-white"}`}
                  >
                    {item === "email" ? "Email" : "Phone"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
                <label className="grid gap-2" htmlFor="login-identifier">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Email or phone</span>
                  <input
                    id="login-identifier"
                    type={method === "phone" ? "tel" : "email"}
                    required
                    autoComplete={method === "phone" ? "tel" : "username"}
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      setPhoneCodeSent(false);
                    }}
                    className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/10"
                    placeholder={method === "phone" ? "+971501234567" : "name@company.com"}
                  />
                  <span className="text-[11px] leading-4 text-muted">{method === "phone" ? "Use a full phone number with country code." : "Use the email registered for your account or request a secure sign-in link."}</span>
                </label>

                {method === "email" ? (
                  <label className="grid gap-2" htmlFor="login-password">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Password</span>
                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/10"
                      placeholder="Optional"
                    />
                    <span className="text-[11px] leading-4 text-muted">Leave empty to receive a secure sign-in link.</span>
                  </label>
                ) : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0854dd] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Please wait…" : demoSelected ? "Open demo" : passwordSelected ? "Sign in" : method === "phone" ? "Send code" : "Send sign-in link"}
                </button>
              </form>

              {phoneCodeSent ? (
                <form onSubmit={handlePhoneVerification} className="mt-5 grid gap-3 rounded-2xl border border-accent/30 bg-[#e8fafa] p-4">
                  <label htmlFor="phone-code" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">SMS code</label>
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
                      className="h-12 rounded-[10px] border border-line bg-white px-4 text-sm tracking-[0.3em] text-ink outline-none focus:border-brand"
                      placeholder="000000"
                    />
                    <button disabled={pending} className="h-12 rounded-control bg-brand px-6 text-sm font-semibold text-white disabled:opacity-60">Verify</button>
                  </div>
                </form>
              ) : null}

              {message ? (
                <p aria-live="polite" className="mt-5 rounded-[14px] border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">{message}</p>
              ) : null}

              <div className="mt-5 rounded-2xl bg-[#e8fafa] p-4 text-xs leading-5 text-ink">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
                Public email and phone access is sign-in only. New account onboarding requires a separate approved invitation.
              </div>

              <div className="mt-4 grid gap-4 rounded-2xl bg-[#f5f2ff] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-personal">Guided access</p>
                  <p className="mt-1 text-xs leading-5 text-muted">Use the ready browser-local sample account. It never authorizes protected server resources.</p>
                  <p className="mt-2 text-[11px] font-semibold text-ink"><code>{mockDemoEmail}</code> · <code>{mockDemoPassword}</code></p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="inline-flex h-12 items-center justify-center rounded-control border border-personal bg-white px-5 text-sm font-semibold text-personal transition hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-personal"
                >
                  Use demo credentials
                </button>
              </div>

              <p className="mt-4 text-[10px] leading-4 text-muted">By continuing, you accept the Terms and Privacy Policy.</p>
              <p className="mt-2 text-[10px] leading-4 text-muted">Phone sign-in is limited to existing accounts and becomes operational only after an approved SMS provider is connected. Email and browser-local demo access do not depend on it.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
