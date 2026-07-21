"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

function profileInitial(value: string | undefined) {
  return value?.trim().charAt(0).toUpperCase() || "G";
}

export function AccessStatusBadge() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const avatar = user?.profile.avatarUrl;
  const label = isAuthenticated
    ? isDemo
      ? "Open demo profile"
      : "Open your profile"
    : "Sign in to GeoAI";

  return (
    <Link
      href={isAuthenticated ? "/profile" : "/login"}
      aria-label={label}
      title={label}
      data-authenticated={isAuthenticated ? "true" : "false"}
      className={`geoai-v32 relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        isAuthenticated
          ? "border-brand bg-surface text-brand ring-4 ring-brand/10 hover:bg-brand/10"
          : "border-line bg-white text-muted hover:border-brand hover:text-brand"
      }`}
    >
      {isAuthenticated && avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
      ) : isAuthenticated ? (
        <span className="text-sm font-semibold" aria-hidden="true">
          {profileInitial(user?.profile.fullName)}
        </span>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.75 19c.55-3.45 2.65-5.25 6.25-5.25s5.7 1.8 6.25 5.25" strokeLinecap="round" />
        </svg>
      )}
      {isAuthenticated ? (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent"
        />
      ) : null}
    </Link>
  );
}
