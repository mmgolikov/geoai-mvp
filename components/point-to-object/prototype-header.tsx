"use client";

import Link from "next/link";
import { useState } from "react";

import { AccessStatusBadgeVisual } from "@/components/auth/access-status-badge-visual";
import { useAuth } from "@/components/auth/auth-provider";
import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
// Keep the navigation link mounted through hydration; replacing a lazy fallback
// link discards keyboard focus between Tab/focus and Enter.
import { PointObjectProjectControl } from "@/components/point-to-object/project-control";

export type PointObjectHeaderProps = {
  backToMap?: boolean;
};

export function PointObjectHeader({ backToMap = false }: PointObjectHeaderProps) {
  const { locale, setLocale, t } = usePointObjectLocale();
  const { isAuthenticated, user } = useAuth();
  const profileLabel = isAuthenticated ? t("header.profile.open") : t("header.profile.signIn");
  const [navigationPending, setNavigationPending] = useState(false);

  return (
    <header data-point-object-header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-3 [&_[data-authenticated]]:h-11 [&_[data-authenticated]]:w-11 [&_[data-authenticated]]:rounded-xl sm:gap-3 sm:px-6">
      <Link href="/" className="flex min-w-0 items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2 sm:gap-3">
        <IdentitySymbol />
        <span className="min-w-0">
          <span className="block whitespace-nowrap text-lg font-bold leading-5">GeoAI</span>
          <span className="hidden truncate text-[11px] font-semibold text-muted sm:block">{t("brand.subtitle")}</span>
        </span>
      </Link>

      <div data-point-object-header-actions className="flex shrink-0 items-center gap-2">
        <PointObjectProjectControl />
        {backToMap ? (
          <Link href="/prototype/point-to-object" aria-label={t("header.backToMap")} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white px-0 text-xs font-semibold text-ink hover:border-[#087f8c] hover:bg-[#f3fbfb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:w-auto sm:px-4 sm:text-sm">
            <span className="text-lg leading-none sm:hidden" aria-hidden="true">←</span>
            <span className="hidden sm:inline">{t("header.backToMap")}</span>
          </Link>
        ) : null}
        <div className="inline-flex h-11 items-center rounded-xl border border-line bg-[#f8fafc] p-1" role="group" aria-label={t("header.language")}>
          {(["en", "ru"] as const).map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => setLocale(language)}
              aria-pressed={locale === language}
              className={`h-9 min-w-9 rounded-lg px-2 text-[11px] font-bold uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${locale === language ? "bg-[#087f8c] text-white shadow-sm" : "text-[#667085] hover:bg-white hover:text-[#344054]"}`}
            >
              {language}
            </button>
          ))}
        </div>
        <span aria-busy={navigationPending} onClickCapture={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setNavigationPending(true); }}>
          <AccessStatusBadgeVisual
            avatar={user?.profile.avatarUrl ?? undefined}
            fullName={user?.profile.fullName}
            href={isAuthenticated ? "/profile" : "/login?next=/profile"}
            isAuthenticated={isAuthenticated}
            label={profileLabel}
            tone="product"
          />
        </span>
        {navigationPending ? <span className="pointer-events-none fixed right-3 top-[68px] z-50 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-[#345c54] shadow-soft" role="status">{locale === "ru" ? "Открываем профиль…" : "Opening profile…"}</span> : null}
      </div>
    </header>
  );
}
