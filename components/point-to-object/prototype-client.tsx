"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import { LiveObjectMap } from "@/components/point-to-object/live-object-map";
import {
  clearPointObjectAnalysis,
  clearPointObjectSelection,
  readPointObjectQuestion,
  readPointObjectSelection,
  writePointObjectQuestion,
  writePointObjectSelection
} from "@/components/point-to-object/live-session";
import type {
  LiveMapLocationKey,
  LiveMapSelection
} from "@/components/point-to-object/live-types";

const MARKET_LABEL: Record<LiveMapLocationKey, string> = {
  dubai: "Dubai",
  singapore: "Singapore"
};

function humanize(value: string): string {
  return value.replaceAll("_", " ").replaceAll(":", " · ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function selectionTitle(selection: LiveMapSelection): string {
  if (selection.object.name) return selection.object.name;
  if (selection.object.featureClass.toLowerCase().includes("building")) return "Selected building footprint";
  if (selection.object.geometry) return `Selected ${humanize(selection.object.featureClass)}`;
  return "Selected map location";
}

export function PointToObjectPrototype() {
  const router = useRouter();
  const [locationKey, setLocationKey] = useState<LiveMapLocationKey>("dubai");
  const [selection, setSelection] = useState<LiveMapSelection | null>(null);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    const restoredSelection = readPointObjectSelection();
    if (restoredSelection) {
      setLocationKey(restoredSelection.locationKey);
      setSelection(restoredSelection);
    }
    setQuestion(readPointObjectQuestion());
  }, []);

  const handleSelection = useCallback((nextSelection: LiveMapSelection | null) => {
    setSelection(nextSelection);
    clearPointObjectAnalysis();
    if (nextSelection) writePointObjectSelection(nextSelection);
  }, []);

  function changeMarket(nextMarket: LiveMapLocationKey) {
    if (nextMarket === locationKey) return;
    setLocationKey(nextMarket);
    setSelection(null);
    clearPointObjectSelection();
    clearPointObjectAnalysis();
  }

  function startAnalysis() {
    if (!selection) return;
    writePointObjectSelection(selection);
    writePointObjectQuestion(question.trim());
    clearPointObjectAnalysis();
    router.push("/prototype/point-to-object/analysis");
  }

  return (
    <main className="min-h-screen bg-white text-ink lg:h-[100svh] lg:overflow-hidden">
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <IdentitySymbol />
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-5">GeoAI</span>
            <span className="block truncate text-[11px] font-semibold text-muted">Location intelligence</span>
          </span>
        </Link>
        <Link href="/prototype/point-to-object/source-offer" className="rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          Data sources
        </Link>
      </header>

      <div className="grid min-h-[calc(100svh-64px)] bg-white lg:h-[calc(100svh-64px)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="relative min-h-[40svh] overflow-hidden border-b border-line lg:h-full lg:min-h-0 lg:border-b-0" aria-label="Interactive location map">
          <LiveObjectMap
            locationKey={locationKey}
            selection={selection}
            onSelection={handleSelection}
            className="min-h-[40svh] lg:min-h-0"
          />
          <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-5rem)] flex-col gap-2 sm:left-5 sm:top-5 sm:flex-row sm:items-center">
            <div className="inline-flex w-fit rounded-xl border border-white/70 bg-white/95 p-1 shadow-[0_10px_30px_rgba(20,35,45,0.14)] backdrop-blur" role="group" aria-label="Map location">
              {(Object.keys(MARKET_LABEL) as LiveMapLocationKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeMarket(key)}
                  aria-pressed={locationKey === key}
                  className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${locationKey === key ? "bg-ink text-white" : "text-muted hover:bg-surface hover:text-ink"}`}
                >
                  {MARKET_LABEL[key]}
                </button>
              ))}
            </div>
            <p className="rounded-xl bg-white/95 px-3 py-2 text-xs font-medium text-[#475467] shadow-[0_10px_30px_rgba(20,35,45,0.12)] backdrop-blur">
              Click a mapped object or any point
            </p>
          </div>
        </section>

        <aside className="min-w-0 border-l border-line bg-white lg:h-full lg:overflow-y-auto">
          <div className="flex min-h-full flex-col p-5 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.11em] text-brand">Location analysis</p>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] sm:text-[28px]">
                Select a place to understand it
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Choose a real object on the map. GeoAI will resolve available open-map context and prepare a structured decision brief.
              </p>
            </div>

            <section className="mt-6 rounded-[18px] border border-line bg-[#f8fafc] p-4" data-testid="selection-card">
              {selection ? (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#667085]">Selected location</p>
                  <h2 className="mt-2 break-words text-lg font-bold tracking-[-0.02em]" data-testid="selected-object">
                    {selectionTitle(selection)}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{humanize(selection.object.featureClass)}</p>
                  <dl className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                    <dt className="text-muted">Coordinates</dt>
                    <dd className="font-semibold tabular-nums">{selection.latitude.toFixed(6)}, {selection.longitude.toFixed(6)}</dd>
                    <dt className="text-muted">Map</dt>
                    <dd className="font-semibold">OpenStreetMap open context</dd>
                  </dl>
                  {selection.nearbyLabels.length ? (
                    <div className="mt-4 border-t border-line pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Visible nearby</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#475467]">
                        {selection.nearbyLabels.slice(0, 4).map((item) => item.name).join(" · ")}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="py-3">
                  <p className="text-sm font-bold">Nothing selected yet</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Click a building footprint or a point on the map to start.</p>
                </div>
              )}
            </section>

            <label className="mt-6 text-xs font-bold text-ink" htmlFor="point-object-question">
              What would you like to know? <span className="font-medium text-muted">Optional</span>
            </label>
            <textarea
              id="point-object-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
              rows={3}
              placeholder="For example: What should a developer validate before considering this location?"
              className="mt-2 w-full resize-none rounded-xl border border-line bg-white p-3 text-sm leading-6 outline-none transition focus:border-brand focus:ring-2 focus:ring-[#bfd8ff]"
            />

            <button
              type="button"
              onClick={startAnalysis}
              disabled={!selection}
              className="mt-4 min-h-12 w-full rounded-control bg-brand px-4 text-sm font-bold text-white transition hover:bg-[#0758b7] disabled:cursor-not-allowed disabled:bg-[#b7c4d7] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Analyze with OpenAI
            </button>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              Starting analysis sends the point to Nominatim for open-map resolution, then sends rounded coordinates, minimized attributes and your question to OpenAI. Raw map geometry is not sent. Do not use confidential or personal locations.
            </p>

            <div className="mt-auto border-t border-line pt-5 text-[11px] leading-5 text-muted">
              <p>Open-map data can be incomplete or out of date. Confirm material decisions with the relevant authority or your own records.</p>
              <p className="mt-2 font-semibold text-[#475467]">
                Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
