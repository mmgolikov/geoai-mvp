"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getDefaultRoleForAudience,
  getExploreRolesByAudience,
  getExploreRole
} from "@/src/lib/explore/scenarios";
import type { ExploreAudience, ExploreRole } from "@/src/lib/explore/types";
import { maxProfileAvatarBytes } from "@/src/lib/auth/profile-local-store";

type Notice = {
  kind: "success" | "error";
  text: string;
};

function messageClassName(kind: Notice["kind"]) {
  return kind === "success"
    ? "border-[#b7dacb] bg-[#f1faf6] text-[#1f6047]"
    : "border-[#edc9c4] bg-[#fff6f4] text-[#9a3f34]";
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "G";
}

export function ProfilePanel() {
  const {
    isAuthenticated,
    isDemo,
    user,
    saveProfile,
    requestEmailChange,
    changePassword,
    signOut
  } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const loadedProfileSignatureRef = useRef("");
  const [fullName, setFullName] = useState("");
  const [region, setRegion] = useState("Dubai / UAE");
  const [defaultAudience, setDefaultAudience] = useState<ExploreAudience>("b2b");
  const [defaultRole, setDefaultRole] = useState<ExploreRole>("developer");
  const [contactPhone, setContactPhone] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);
  const [accountNotice, setAccountNotice] = useState<Notice | null>(null);
  const [pendingAction, setPendingAction] = useState<"profile" | "email" | "password" | null>(null);
  const availableRoles = getExploreRolesByAudience(defaultAudience);

  useEffect(() => {
    activeUserIdRef.current = user?.id ?? null;
    if (!user) {
      loadedProfileSignatureRef.current = "";
      return;
    }
    const profileSignature = JSON.stringify([
      user.id,
      user.profile.fullName,
      user.profile.region,
      user.profile.defaultAudience,
      user.profile.defaultRole,
      user.profile.contactPhone,
      user.profile.avatarUrl
    ]);
    if (loadedProfileSignatureRef.current === profileSignature) return;
    loadedProfileSignatureRef.current = profileSignature;
    setFullName(user.profile.fullName);
    setRegion(user.profile.region);
    setDefaultAudience(user.profile.defaultAudience);
    setDefaultRole(user.profile.defaultRole);
    setContactPhone(user.profile.contactPhone);
    setAvatarDataUrl(user.profile.avatarUrl?.startsWith("data:image/") ? user.profile.avatarUrl : null);
    setAvatarRemoved(false);
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileNotice(null);
    setAccountNotice(null);
  }, [user]);

  function changeAudience(audience: ExploreAudience) {
    setDefaultAudience(audience);
    setDefaultRole(getDefaultRoleForAudience(audience));
  }

  function handleAvatarFile(file: File | null) {
    setProfileNotice(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > maxProfileAvatarBytes) {
      setProfileNotice({ kind: "error", text: "Choose a JPEG, PNG or WebP photo up to 1 MB." });
      return;
    }
    const userId = activeUserIdRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      if (activeUserIdRef.current === userId && typeof reader.result === "string") {
        setAvatarDataUrl(reader.result);
        setAvatarRemoved(false);
      }
    };
    reader.onerror = () => setProfileNotice({ kind: "error", text: "The browser could not read this photo." });
    reader.readAsDataURL(file);
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("profile");
    setProfileNotice(null);
    try {
      const result = await saveProfile({
        fullName,
        region,
        defaultAudience,
        defaultRole,
        contactPhone,
        avatarDataUrl: avatarRemoved ? null : avatarDataUrl
      });
      setProfileNotice({ kind: result.ok ? "success" : "error", text: result.message });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("email");
    setAccountNotice(null);
    try {
      const result = await requestEmailChange(newEmail);
      setAccountNotice({ kind: result.ok ? "success" : "error", text: result.message });
      if (result.ok) setNewEmail("");
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountNotice(null);
    if (newPassword !== confirmPassword) {
      setAccountNotice({ kind: "error", text: "The password confirmation does not match." });
      return;
    }
    setPendingAction("password");
    try {
      const result = await changePassword(newPassword);
      setAccountNotice({ kind: result.ok ? "success" : "error", text: result.message });
      if (result.ok) {
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setPendingAction(null);
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-3xl place-items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-line bg-white p-7 text-center shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">GeoAI account</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">Sign in to open your profile</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
            Your name, region and default B2B/B2C role are available after email, phone or demo sign-in.
          </p>
          <Link href="/login?next=/profile" className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#113f50]">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  const visibleAvatar = avatarRemoved ? null : avatarDataUrl ?? user.profile.avatarUrl;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Personal account</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">Your profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Set the personal details and working defaults GeoAI should use when Workspace and Projects open.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/workspace" className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]">
            Open workspace
          </Link>
          <button type="button" onClick={() => void signOut()} className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand">
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <form onSubmit={handleProfileSave} className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-[#eaf3f1] text-2xl font-semibold text-brand">
              {visibleAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={visibleAvatar} alt="Profile" className="h-full w-full object-cover" />
              ) : initials(fullName)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-ink">Personal details</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Your profile photo stays on this device for now.
              </p>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  handleAvatarFile(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand">
                  Choose photo
                </button>
                {avatarDataUrl || user.profile.avatarUrl?.startsWith("data:image/") ? (
                  <button type="button" onClick={() => {
                    setAvatarDataUrl(null);
                    setAvatarRemoved(true);
                  }} className="inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold text-muted transition hover:bg-surface hover:text-ink">
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Full name</span>
              <input required maxLength={160} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand" placeholder="First and last name" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Region</span>
              <input required maxLength={120} value={region} onChange={(event) => setRegion(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand" placeholder="Dubai / UAE" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Contact phone</span>
              <input type="tel" autoComplete="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand" placeholder="+971501234567" />
            </label>
          </div>

          <fieldset className="mt-6 rounded-xl border border-line bg-surface p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Default workspace</legend>
            <p className="mt-1 text-sm leading-6 text-muted">This selection becomes the initial audience and role in Workspace and Projects. You can still change it there.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-2" aria-label="Default audience">
                {(["b2b", "b2c"] as ExploreAudience[]).map((audience) => (
                  <button key={audience} type="button" aria-pressed={defaultAudience === audience} onClick={() => changeAudience(audience)} className={`h-11 rounded-md text-sm font-semibold transition ${defaultAudience === audience ? "bg-brand text-white" : "border border-line bg-white text-ink hover:border-brand"}`}>
                    {audience.toUpperCase()}
                  </button>
                ))}
              </div>
              <label className="grid gap-2">
                <span className="sr-only">Default role</span>
                <select value={defaultRole} onChange={(event) => setDefaultRole(event.target.value as ExploreRole)} className="h-11 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand">
                  {availableRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">{getExploreRole(defaultRole).description}</p>
          </fieldset>

          {profileNotice ? <p aria-live="polite" className={`mt-5 rounded-md border px-3 py-2 text-sm leading-6 ${messageClassName(profileNotice.kind)}`}>{profileNotice.text}</p> : null}
          <button disabled={pendingAction !== null} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:opacity-60">
            {pendingAction === "profile" ? "Saving…" : "Save profile"}
          </button>
        </form>

        <aside className="grid content-start gap-6">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-semibold text-ink">Account & security</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Registered email</dt>
                <dd className="mt-1 break-all font-semibold text-ink">{user.email ?? "Not added"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Verified sign-in phone</dt>
                <dd className="mt-1 font-semibold text-ink">{user.phone ?? "Not added"}</dd>
              </div>
            </dl>

            {isDemo ? (
              <div className="mt-5 rounded-xl border border-line bg-surface p-4 text-sm leading-6 text-muted">
                Demo credentials are fixed: <strong className="text-ink">demo@geoai.space</strong> / <strong className="text-ink">111111</strong>.
              </div>
            ) : (
              <>
                <form onSubmit={handleEmailChange} className="mt-6 grid gap-3 border-t border-line pt-5">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Change email</span>
                    <input required type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand" placeholder="new@email.com" />
                  </label>
                  <button disabled={pendingAction !== null} className="h-10 rounded-md border border-brand bg-white px-4 text-sm font-semibold text-brand transition hover:bg-surface disabled:opacity-60">
                    {pendingAction === "email" ? "Sending…" : "Send confirmation"}
                  </button>
                </form>

                <form onSubmit={handlePasswordChange} className="mt-6 grid gap-3 border-t border-line pt-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Change password</span>
                  <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand" placeholder="At least 8 characters" aria-label="New password" />
                  <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand" placeholder="Repeat new password" aria-label="Confirm new password" />
                  <button disabled={pendingAction !== null} className="h-10 rounded-md border border-brand bg-white px-4 text-sm font-semibold text-brand transition hover:bg-surface disabled:opacity-60">
                    {pendingAction === "password" ? "Changing…" : "Change password"}
                  </button>
                </form>
              </>
            )}

            {accountNotice ? <p aria-live="polite" className={`mt-5 rounded-md border px-3 py-2 text-sm leading-6 ${messageClassName(accountNotice.kind)}`}>{accountNotice.text}</p> : null}
          </div>

          <div className="rounded-2xl border border-line bg-[#f1f7f8] p-5 sm:p-6">
            <h2 className="font-semibold text-ink">Phone and photo</h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              You can change the contact phone above. Changing the phone used for sign-in is temporarily unavailable. Your photo stays only on this device.
            </p>
            <p className="mt-3 text-xs leading-5 text-muted">Two-factor authentication is not part of the current MVP flow.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
