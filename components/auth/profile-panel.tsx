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
    ? "border-[#91d4d9] bg-[#e8fafa] text-[#05636e]"
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > maxProfileAvatarBytes) {
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
        <div className="w-full rounded-[28px] border border-line bg-white p-7 text-center shadow-soft sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">GeoAI account</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink">Sign in to open your profile</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
            Your name, region and default B2B/B2C role are available after email, phone or browser-local demo sign-in.
          </p>
          <Link href="/login?next=/profile" className="mt-6 inline-flex h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0854dd]">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  const visibleAvatar = avatarRemoved ? null : avatarDataUrl ?? user.profile.avatarUrl;

  return (
    <section className="bg-gradient-to-br from-white via-[#fbfdff] to-[#edf6ff] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Personal account</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-ink sm:text-[46px]">Your profile</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Set the personal details and working defaults GeoAI should use when Workspace and Projects open.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/workspace" className="inline-flex h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0854dd]">
              Open workspace
            </Link>
            <button type="button" onClick={() => void signOut()} className="inline-flex h-12 items-center justify-center rounded-control border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-brand">
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
          <form onSubmit={handleProfileSave} className="overflow-hidden rounded-[26px] border border-line bg-white p-5 shadow-soft sm:p-7 lg:p-9">
            <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-accent bg-[#e8fafa] text-2xl font-bold text-accent">
                {visibleAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={visibleAvatar} alt="Profile" className="h-full w-full object-cover" />
                ) : initials(fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold text-ink">Personal details</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Add a profile photo and the name shown across GeoAI.</p>
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
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="inline-flex h-9 items-center rounded-[11px] border border-line bg-white px-4 text-xs font-semibold text-ink transition hover:border-brand">
                    Choose photo
                  </button>
                  {avatarDataUrl || user.profile.avatarUrl?.startsWith("data:image/") ? (
                    <button type="button" onClick={() => {
                      setAvatarDataUrl(null);
                      setAvatarRemoved(true);
                    }} className="inline-flex h-9 items-center rounded-[11px] px-4 text-xs font-semibold text-muted transition hover:bg-surface hover:text-ink">
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Full name</span>
                <input required maxLength={160} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="First and last name" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Region</span>
                <input required maxLength={120} value={region} onChange={(event) => setRegion(event.target.value)} className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="Dubai / UAE" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Contact phone</span>
                <input type="tel" autoComplete="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="+971501234567" />
              </label>
            </div>

            <fieldset className="mt-6 rounded-[18px] border border-line bg-surface p-4 sm:p-[18px]">
              <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">Default workspace</legend>
              <p className="mt-1 text-sm leading-6 text-muted">This audience and role become the initial Workspace and Projects context. They are preferences, not permissions.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.05fr]">
                <div className="grid h-12 grid-cols-2 gap-1 rounded-xl bg-[#f0f7ff] p-1" role="group" aria-label="Default audience">
                  {(["b2b", "b2c"] as ExploreAudience[]).map((audience) => (
                    <button
                      key={audience}
                      type="button"
                      aria-pressed={defaultAudience === audience}
                      onClick={() => changeAudience(audience)}
                      className={`rounded-[10px] text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${defaultAudience === audience ? audience === "b2b" ? "bg-brand text-white" : "bg-personal text-white" : audience === "b2c" ? "bg-[#f5f2ff] text-personal" : "text-muted hover:bg-white"}`}
                    >
                      {audience.toUpperCase()}
                    </button>
                  ))}
                </div>
                <label className="grid gap-2">
                  <span className="sr-only">Default role</span>
                  <select value={defaultRole} onChange={(event) => setDefaultRole(event.target.value as ExploreRole)} className="h-12 rounded-[10px] border border-line bg-white px-4 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10">
                    {availableRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-3 grid min-h-[50px] grid-cols-[48px_1fr] items-center gap-3 rounded-xl bg-[#f5f2ff] p-3">
                <span className="text-[10px] font-semibold uppercase text-personal">Role</span>
                <p className="text-xs leading-5 text-ink">{getExploreRole(defaultRole).description}</p>
              </div>
            </fieldset>

            {profileNotice ? <p aria-live="polite" className={`mt-5 rounded-[14px] border px-4 py-3 text-sm leading-6 ${messageClassName(profileNotice.kind)}`}>{profileNotice.text}</p> : null}

            <button disabled={pendingAction !== null} className="mt-6 h-12 w-full rounded-control bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0854dd] disabled:opacity-60">
              {pendingAction === "profile" ? "Saving…" : "Save profile"}
            </button>
          </form>

          <aside className="grid content-start gap-5">
            <div className="overflow-hidden rounded-[26px] border border-line bg-white p-5 shadow-soft sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">Account & security</p>
              <h2 className="mt-4 text-2xl font-semibold text-ink">Sign-in details</h2>
              <dl className="mt-5 rounded-[14px] bg-[#e8fafa] p-4 text-sm">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Registered email</dt>
                  <dd className="mt-2 break-all font-semibold text-ink">{user.email ?? "Not added"}</dd>
                </div>
                <div className="mt-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Verified sign-in phone</dt>
                  <dd className="mt-2 font-semibold text-accent">{user.phone ?? "Not added"}</dd>
                </div>
              </dl>

              {isDemo ? (
                <div className="mt-5 rounded-[14px] border border-line bg-surface p-4 text-sm leading-6 text-muted">
                  Demo credentials are fixed: <strong className="text-ink">demo@geoai.space</strong> / <strong className="text-ink">111111</strong>. Demo changes stay browser-local.
                </div>
              ) : (
                <>
                  <form onSubmit={handleEmailChange} className="mt-6 grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Change email</span>
                      <input required type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="h-[52px] rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="new@email.com" />
                    </label>
                    <button disabled={pendingAction !== null} className="h-[42px] rounded-[11px] border border-brand bg-white px-4 text-sm font-semibold text-brand transition hover:bg-surface disabled:opacity-60">
                      {pendingAction === "email" ? "Sending…" : "Send confirmation"}
                    </button>
                  </form>

                  <form onSubmit={handlePasswordChange} className="mt-6 grid gap-3 border-t border-line pt-5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Change password</span>
                    <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-12 rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="At least 8 characters" aria-label="New password" />
                    <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 rounded-[10px] border border-line bg-white px-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="Repeat new password" aria-label="Confirm new password" />
                    <button disabled={pendingAction !== null} className="h-[42px] rounded-[11px] border border-brand bg-white px-4 text-sm font-semibold text-brand transition hover:bg-surface disabled:opacity-60">
                      {pendingAction === "password" ? "Changing…" : "Change password"}
                    </button>
                  </form>
                </>
              )}

              {accountNotice ? <p aria-live="polite" className={`mt-5 rounded-[14px] border px-4 py-3 text-sm leading-6 ${messageClassName(accountNotice.kind)}`}>{accountNotice.text}</p> : null}
            </div>

            <div className="rounded-[22px] border border-line bg-[#f5f2ff] p-5 sm:p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-personal">Phone and photo</h2>
              <p className="mt-3 text-xs leading-5 text-ink">Contact phone above is used for project communication and can be edited independently.</p>
              <p className="mt-3 text-xs leading-5 text-muted">Changing the sign-in phone requires verification. The profile photo remains on this device until protected storage is enabled.</p>
              <p className="mt-3 text-xs leading-5 text-muted">Two-factor authentication is not part of the current MVP flow.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
