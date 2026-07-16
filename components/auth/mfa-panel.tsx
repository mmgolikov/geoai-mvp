"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSafeAuthRedirectPath } from "@/src/lib/auth/redirect-path";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

type FactorSummary = {
  id: string;
  friendlyName: string;
  factorType: string;
  status: string;
  createdAt: string | null;
};

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

function validTotpCode(value: string) {
  return /^\d{6}$/.test(value.trim());
}

export function MfaPanel() {
  const { authStatus, refreshSession: refreshAuthSession } = useAuth();
  const [factors, setFactors] = useState<FactorSummary[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [nextLevel, setNextLevel] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [userVerified, setUserVerified] = useState(false);

  const refreshMfaState = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setUserVerified(false);
      setLoading(false);
      return;
    }

    const userResult = await supabase.auth.getUser();
    if (userResult.error || !userResult.data.user || userResult.data.user.is_anonymous !== false) {
      setUserVerified(false);
      setFactors([]);
      setCurrentLevel(null);
      setNextLevel(null);
      setLoading(false);
      return;
    }

    const [factorResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    ]);
    if (factorResult.error || assuranceResult.error) {
      setUserVerified(true);
      setMessage("MFA state is temporarily unavailable.");
      setLoading(false);
      return;
    }

    const mapped = factorResult.data.all.map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name ?? "Authenticator",
      factorType: factor.factor_type,
      status: factor.status,
      createdAt: factor.created_at ?? null
    }));
    const verified = mapped.filter((factor) => factor.status === "verified");
    setFactors(mapped);
    setSelectedFactorId((current) => {
      if (verified.some((factor) => factor.id === current)) return current;
      return verified.length === 1 ? verified[0].id : "";
    });
    setCurrentLevel(assuranceResult.data.currentLevel);
    setNextLevel(assuranceResult.data.nextLevel);
    setUserVerified(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshMfaState();
  }, [refreshMfaState]);

  async function beginEnrollment() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userVerified) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "GeoAI authenticator"
      });
      if (result.error || !result.data.totp) {
        setMessage("A new authenticator could not be enrolled.");
        return;
      }
      setEnrollment({
        factorId: result.data.id,
        qrCode: result.data.totp.qr_code,
        secret: result.data.totp.secret
      });
      setCode("");
      await refreshMfaState();
    } finally {
      setPending(false);
    }
  }

  async function verifyFactor(factorId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !validTotpCode(code)) {
      setMessage("Enter the six-digit code from your authenticator.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim()
      });
      if (result.error) {
        setMessage("The authenticator code could not be verified.");
        return;
      }
      setEnrollment(null);
      setCode("");
      await refreshMfaState();
      await refreshAuthSession();
      setMessage("MFA verification completed. This session is now AAL2.");
    } finally {
      setPending(false);
    }
  }

  async function cancelEnrollment() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !enrollment) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
      if (result.error) {
        setMessage("The pending authenticator could not be removed. Try again before enrolling another factor.");
        return;
      }
      setEnrollment(null);
      setCode("");
      await refreshMfaState();
    } finally {
      setPending(false);
    }
  }

  async function removePendingFactor(factorId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await supabase.auth.mfa.unenroll({ factorId });
      if (result.error) {
        setMessage("The pending authenticator could not be removed.");
        return;
      }
      if (enrollment?.factorId === factorId) setEnrollment(null);
      await refreshMfaState();
    } finally {
      setPending(false);
    }
  }

  async function removeSelectedFactor() {
    const supabase = getSupabaseBrowserClient();
    const selected = factors.find((factor) => factor.id === selectedFactorId && factor.status === "verified");
    if (!supabase || !selected) {
      setMessage("Select one verified factor to remove.");
      return;
    }
    if (currentLevel !== "aal2") {
      setMessage("Verify MFA in this session before removing a verified factor.");
      return;
    }
    const lastVerified = factors.filter((factor) => factor.status === "verified").length === 1;
    if (!window.confirm(lastVerified
      ? "Remove the last verified factor? The session will be refreshed immediately and downgraded to AAL1."
      : `Remove ${selected.friendlyName}?`)) {
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const result = await supabase.auth.mfa.unenroll({ factorId: selected.id });
      if (result.error) {
        setMessage("The selected factor could not be removed.");
        return;
      }
      // Supabase documents that an immediate AAL2 -> AAL1 downgrade after
      // unenrollment requires a manual refresh instead of waiting for expiry.
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.error) {
        await supabase.auth.signOut({ scope: "local" });
        await refreshAuthSession();
        setMessage("The factor was removed, but session refresh failed. Sign in again.");
        return;
      }
      await refreshMfaState();
      await refreshAuthSession();
      setMessage("The factor was removed and the session assurance level was refreshed.");
    } finally {
      setPending(false);
    }
  }

  function continueAfterMfa() {
    const next = getSafeAuthRedirectPath(new URL(window.location.href).searchParams.get("next"));
    window.location.assign(next);
  }

  const verifiedFactors = factors.filter((factor) => factor.status === "verified");
  const pendingFactors = factors.filter((factor) => factor.status !== "verified");
  const needsChallenge = nextLevel === "aal2" && currentLevel !== "aal2";

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Account security</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Multi-factor authentication</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          GeoAI uses a TOTP authenticator as the second factor. Elevated administration RPCs require an AAL2 session.
        </p>

        {loading ? <p className="mt-6 text-sm text-muted">Loading secure session…</p> : null}

        {!loading && (authStatus.effectiveMode !== "supabase_auth" || !userVerified) ? (
          <div className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-muted">
            A verified authenticated session is required. <Link href="/login" className="font-semibold text-brand hover:underline">Sign in</Link>.
          </div>
        ) : null}

        {!loading && userVerified ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Current assurance</p>
                <p className="mt-2 text-xl font-semibold text-ink">{currentLevel ?? "Unknown"}</p>
              </div>
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Verified factors</p>
                <p className="mt-2 text-xl font-semibold text-ink">{verifiedFactors.length}</p>
              </div>
            </div>

            {verifiedFactors.length > 0 ? (
              <div className="mt-6 grid gap-3">
                <label htmlFor="mfa-factor" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Authenticator
                </label>
                <select
                  id="mfa-factor"
                  value={selectedFactorId}
                  onChange={(event) => setSelectedFactorId(event.target.value)}
                  className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand"
                >
                  {verifiedFactors.length > 1 ? <option value="">Select a factor</option> : null}
                  {verifiedFactors.map((factor) => (
                    <option key={factor.id} value={factor.id}>{factor.friendlyName}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {pendingFactors.length > 0 ? (
              <div className="mt-6 rounded-lg border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Pending authenticators</p>
                <div className="mt-3 grid gap-2">
                  {pendingFactors.map((factor) => (
                    <div key={factor.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
                      <span className="min-w-0 break-all text-muted">{factor.friendlyName} · {factor.id}</span>
                      <button type="button" disabled={pending} onClick={() => void removePendingFactor(factor.id)} className="shrink-0 font-semibold text-[#8a3030] hover:underline disabled:opacity-60">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {enrollment ? (
              <div className="mt-6 rounded-lg border border-brand/30 bg-surface p-4">
                <h2 className="text-lg font-semibold text-ink">Verify the new authenticator</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Scan the QR code or enter the secret manually, then provide the current six-digit code.</p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* The QR code is generated by Supabase Auth for this in-memory enrollment only. */}
                  <img src={enrollment.qrCode} alt="Authenticator enrollment QR code" className="h-44 w-44 rounded-md border border-line bg-white p-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Manual secret</p>
                    <code className="mt-2 block break-all rounded-md bg-white p-3 text-sm text-ink">{enrollment.secret}</code>
                  </div>
                </div>
              </div>
            ) : null}

            {(enrollment || needsChallenge) ? (
              <div className="mt-6 grid gap-3">
                <label htmlFor="mfa-code" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Six-digit code
                </label>
                <input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-11 rounded-md border border-line bg-white px-3 text-sm tracking-[0.3em] text-ink outline-none focus:border-brand"
                />
              </div>
            ) : null}

            {message ? <p className="mt-4 rounded-md bg-surface px-3 py-2 text-sm text-muted">{message}</p> : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {!enrollment ? (
                <button type="button" disabled={pending} onClick={() => void beginEnrollment()} className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:opacity-60">
                  Add authenticator
                </button>
              ) : (
                <>
                  <button type="button" disabled={pending} onClick={() => void verifyFactor(enrollment.factorId)} className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:opacity-60">
                    Verify enrollment
                  </button>
                  <button type="button" disabled={pending} onClick={() => void cancelEnrollment()} className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-muted transition hover:border-brand">
                    Cancel enrollment
                  </button>
                </>
              )}
              {needsChallenge && !enrollment ? (
                <button type="button" disabled={pending || !selectedFactorId} onClick={() => void verifyFactor(selectedFactorId)} className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:opacity-60">
                  Verify this session
                </button>
              ) : null}
              {verifiedFactors.length > 0 ? (
                <button type="button" disabled={pending || !selectedFactorId} onClick={() => void removeSelectedFactor()} className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8a5a5] bg-white px-4 text-sm font-semibold text-[#8a3030] transition hover:border-[#8a3030] disabled:opacity-60">
                  Remove selected factor
                </button>
              ) : null}
              {currentLevel === "aal2" ? (
                <button type="button" onClick={continueAfterMfa} className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand">
                  Continue
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
