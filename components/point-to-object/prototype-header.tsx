"use client";

import Link from "next/link";

import { AccessStatusBadgeVisual } from "@/components/auth/access-status-badge-visual";
import { useAuth } from "@/components/auth/auth-provider";
import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";

export type PointObjectHeaderProps = {
  backToMap?: boolean;
  showDataSources?: boolean;
};

export function PointObjectHeader({ backToMap = false, showDataSources = false }: PointObjectHeaderProps) {
  const { locale, setLocale, t } = usePointObjectLocale();
  const { isAuthenticated, user } = useAuth();
  const profileLabel = isAuthenticated ? t("header.profile.open") : t("header.profile.signIn");

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-6">
      <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">
        <IdentitySymbol />
        <span className="min-w-0">
          <span className="block text-lg font-bold leading-5">GeoAI</span>
          <span className="block truncate text-[11px] font-semibold text-muted">{t("brand.subtitle")}</span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {showDataSources ? (
          <Link href="/prototype/point-to-object/source-offer" className="hidden min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-muted hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:inline-flex">
            {t("header.dataSources")}
          </Link>
        ) : null}
        {backToMap ? (
          <Link href="/prototype/point-to-object" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink hover:border-[#087f8c] hover:bg-[#f3fbfb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:px-4 sm:text-sm">
            {t("header.backToMap")}
          </Link>
        ) : null}
        <div className="inline-flex h-10 items-center rounded-xl border border-line bg-[#f8fafc] p-1" role="group" aria-label={t("header.language")}>
          {(["en", "ru"] as const).map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => setLocale(language)}
              aria-pressed={locale === language}
              className={`h-8 min-w-9 rounded-lg px-2 text-[11px] font-bold uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${locale === language ? "bg-[#087f8c] text-white shadow-sm" : "text-[#667085] hover:bg-white hover:text-[#344054]"}`}
            >
              {language}
            </button>
          ))}
        </div>
        <AccessStatusBadgeVisual
          avatar={user?.profile.avatarUrl ?? undefined}
          fullName={user?.profile.fullName}
          href={isAuthenticated ? "/profile" : "/login"}
          isAuthenticated={isAuthenticated}
          label={profileLabel}
          tone="product"
        />
      </div>
    </header>
  );
}
