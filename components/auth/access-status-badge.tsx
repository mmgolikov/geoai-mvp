"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

export function AccessStatusBadge({ compact = false }: { compact?: boolean }) {
  const { authStatus, isAuthenticated, isDemo, roleLabel } = useAuth();
  const label =
    authStatus.effectiveMode === "supabase_auth"
      ? isAuthenticated
        ? "Authenticated"
        : "Sign in available"
      : authStatus.effectiveMode === "disabled"
        ? "Auth off"
        : "Pilot access";

  return (
    <Link
      href="/login"
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand"
      title={authStatus.caveat}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          authStatus.effectiveMode === "supabase_auth" && isAuthenticated
            ? "bg-[#287c5c]"
            : isDemo || authStatus.effectiveMode !== "supabase_auth"
              ? "bg-brand"
              : "bg-[#c99532]"
        }`}
      />
      <span className="truncate">{label}</span>
      {!compact ? <span className="hidden text-muted xl:inline">Role: {roleLabel}</span> : null}
    </Link>
  );
}
