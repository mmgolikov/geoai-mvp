"use client";

import Link from "next/link";

import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import { PointObjectHeader } from "@/components/point-to-object/prototype-header";

export default function PointToObjectSourceOfferPage() {
  const { t } = usePointObjectLocale();
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-ink">
      <PointObjectHeader backToMap />
      <article className="mx-auto my-10 w-[calc(100%-2rem)] max-w-3xl rounded-[24px] border border-line bg-white p-6 shadow-soft sm:p-10">
        <header className="border-b border-line pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#087f8c]">GeoAI</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em]">{t("source.title")}</h1>
        </header>
        <div className="mt-7 space-y-5 text-sm leading-7 text-muted">
          <p>{t("source.body")}</p>
          <p>
            {t("source.copyright")}{" "}
            <a className="font-semibold text-[#087f8c] underline underline-offset-4" href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">{t("source.license")}</a>.
          </p>
          <p>{t("source.projection")}</p>
          <p>{t("source.caveat")}</p>
        </div>
        <aside className="mt-8 rounded-2xl border border-[#f2d18d] bg-[#fff9ed] p-4 text-sm font-semibold leading-6 text-[#7a4d00]">
          {t("boundary")}
        </aside>
        <Link href="/prototype/point-to-object" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-control bg-[#087f8c] px-5 text-sm font-semibold text-white">
          {t("source.back")}
        </Link>
      </article>
    </main>
  );
}
