"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import { PointToObjectPrototypeV5 } from "@/components/point-to-object/prototype-client-v5";
import { LiveObjectMap } from "@/components/point-to-object/live-object-map";
import {
  clearPointObjectAnalysis,
  clearPointObjectSelection,
  parseLiveResolvedObject,
  readPointObjectQuestion,
  readPointObjectSelection,
  writePointObjectQuestion,
  writePointObjectSelection
} from "@/components/point-to-object/live-session";
import type {
  LiveMapLocationKey,
  LiveMapSelection,
  PointObjectLiveContextResponse
} from "@/components/point-to-object/live-types";

const MARKET_LABEL: Partial<Record<LiveMapLocationKey, string>> = {
  dubai: "Dubai",
  singapore: "Singapore"
};

function humanize(value: string): string {
  return value.replaceAll("_", " ").replaceAll(":", " · ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function selectionTitle(selection: LiveMapSelection): string {
  if (selection.resolvedObject?.name) {
    return selection.resolvedObject.name;
  }
  if (selection.object.name) return selection.object.name;
  if (selection.object.featureClass.toLowerCase().includes("building")) return "Selected building footprint";
  if (selection.object.geometry) return `Selected ${humanize(selection.object.featureClass)}`;
  return "Selected map location";
}

function relationLabel(selection: LiveMapSelection): string | null {
  const resolved = selection.resolvedObject;
  if (!resolved) return null;
  if (resolved.coordinateAssociation === "open_map_geometry_contains_point") return "Containing OSM context at the analysis point";
  return `Nearest indexed record · about ${Math.round(resolved.resultCentroidDistanceM)} m`;
}

function selectionContextLabel(selection: LiveMapSelection): string {
  if (!selection.resolvedObject) return "Selected location";
  return selection.resolvedObject.coordinateAssociation === "open_map_geometry_contains_point"
    ? "Containing OpenStreetMap context"
    : "Nearest OpenStreetMap context";
}

function attributeLabel(key: string): string {
  return humanize(key.replace(/^tag\./, "").replace(/^classification\./, ""));
}

function visibleAttributes(selection: LiveMapSelection): Array<[string, string]> {
  return Object.entries(selection.resolvedObject?.tags ?? {})
    .filter(([key]) => key !== "classification.category" && key !== "classification.type" && key !== "classification.address_type")
    .slice(0, 5);
}

export function LegacyPointToObjectPrototype() {
  const router = useRouter();
  const [locationKey, setLocationKey] = useState<LiveMapLocationKey>("dubai");
  const [selection, setSelection] = useState<LiveMapSelection | null>(null);
  const [question, setQuestion] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [contextStatus, setContextStatus] = useState<"idle" | "loading" | "error">("idle");
  const [contextRetryVersion, setContextRetryVersion] = useState(0);
  const contextRequestId = useRef(0);

  useEffect(() => {
    const restoredSelection = readPointObjectSelection();
    if (restoredSelection) {
      setLocationKey(restoredSelection.locationKey);
      setSelection(restoredSelection);
    }
    setQuestion(readPointObjectQuestion());
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (selection) writePointObjectSelection(selection);
  }, [selection]);

  useEffect(() => {
    if (!selection || selection.resolvedObject) {
      setContextStatus("idle");
      return;
    }
    const requestId = contextRequestId.current + 1;
    contextRequestId.current = requestId;
    const controller = new AbortController();
    setContextStatus("loading");

    const timer = window.setTimeout(() => {
      void fetch("/api/prototype/point-to-object/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseKey: selection.locationKey,
          longitude: selection.longitude,
          latitude: selection.latitude,
          locale: "en"
        }),
        signal: controller.signal
      }).then(async (response) => {
        const payload = await response.json() as PointObjectLiveContextResponse;
        if (controller.signal.aborted || requestId !== contextRequestId.current) return;
        if (!response.ok || payload.mode !== "resolved") {
          setContextStatus("error");
          return;
        }
        const resolvedObject = parseLiveResolvedObject(payload.subject);
        if (!resolvedObject) {
          setContextStatus("error");
          return;
        }
        const storedSelection = readPointObjectSelection();
        setSelection((current) => {
          if (!current || current.clickedAt !== selection.clickedAt) return current;
          return {
            ...current,
            viewport: storedSelection?.clickedAt === current.clickedAt ? storedSelection.viewport : current.viewport,
            resolvedObject
          };
        });
        setContextStatus("idle");
      }).catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        if (requestId === contextRequestId.current) setContextStatus("error");
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selection, contextRetryVersion]);

  const handleSelection = useCallback((nextSelection: LiveMapSelection | null) => {
    contextRequestId.current += 1;
    setSelection(nextSelection);
    setContextStatus(nextSelection ? "loading" : "idle");
    clearPointObjectAnalysis();
  }, []);

  const handleViewportChange = useCallback((nextSelection: LiveMapSelection) => {
    writePointObjectSelection(nextSelection);
  }, []);

  function changeMarket(nextMarket: LiveMapLocationKey) {
    if (nextMarket === locationKey) return;
    setLocationKey(nextMarket);
    setSelection(null);
    clearPointObjectSelection();
    clearPointObjectAnalysis();
    contextRequestId.current += 1;
    setContextStatus("idle");
  }

  function startAnalysis() {
    if (!selection?.resolvedObject) return;
    const storedSelection = readPointObjectSelection();
    const activeSelection = storedSelection?.clickedAt === selection.clickedAt
      ? { ...selection, viewport: storedSelection.viewport }
      : selection;
    writePointObjectSelection(activeSelection);
    writePointObjectQuestion(question.trim());
    clearPointObjectAnalysis();
    router.push("/prototype/point-to-object/analysis");
  }

  function retryContext() {
    setContextStatus("loading");
    setContextRetryVersion((value) => value + 1);
  }

  const selectedAttributes = selection ? visibleAttributes(selection) : [];

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
          {sessionReady ? (
            <LiveObjectMap
              locationKey={locationKey}
              selection={selection}
              onSelection={handleSelection}
              onViewportChange={handleViewportChange}
              className="min-h-[40svh] lg:min-h-0"
            />
          ) : (
            <div className="grid h-full min-h-[40svh] place-items-center bg-[#f4f6f7] text-sm font-medium text-[#52606a]" role="status">
              Loading live map…
            </div>
          )}
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
          <div className="flex min-h-full flex-col p-5 sm:p-6 lg:h-full lg:min-h-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.11em] text-brand">Location analysis</p>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] sm:text-[28px]">
                Select a place to understand it
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Choose a real object on the map. GeoAI will resolve available open-map context and prepare a structured decision brief.
              </p>
            </div>

            <section className="mt-5 rounded-[18px] border border-line bg-[#f8fafc] p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto" data-testid="selection-card">
              {selection ? (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#667085]">{selectionContextLabel(selection)}</p>
                  <h2 className="mt-2 break-words text-lg font-bold tracking-[-0.02em]" data-testid="selected-object">
                    {selectionTitle(selection)}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {humanize(selection.resolvedObject?.featureClass ?? selection.object.featureClass)}
                  </p>
                  {selection.resolvedObject?.address ? (
                    <p className="mt-2 text-xs leading-5 text-[#475467]">{selection.resolvedObject.address}</p>
                  ) : null}
                  {contextStatus === "loading" ? (
                    <p className="mt-3 text-xs font-semibold text-brand" role="status">Resolving live object details…</p>
                  ) : null}
                  {contextStatus === "error" ? (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e7c47e] bg-[#fffaf0] px-3 py-2 text-xs text-[#6b4b16]" role="alert">
                      <span>Object details could not be loaded.</span>
                      <button type="button" onClick={retryContext} className="min-h-9 shrink-0 rounded-lg border border-[#d6b36e] bg-white px-3 font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">Retry</button>
                    </div>
                  ) : null}
                  <dl className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                    <dt className="text-muted">Analysis point</dt>
                    <dd className="font-semibold tabular-nums">{selection.latitude.toFixed(6)}, {selection.longitude.toFixed(6)}</dd>
                    {selection.resolvedObject ? (
                      <>
                        <dt className="text-muted">OSM object</dt>
                        <dd className="break-words font-semibold">{selection.resolvedObject.sourceFeatureId}</dd>
                        <dt className="text-muted">Relation</dt>
                        <dd className="break-words font-semibold">{relationLabel(selection)}</dd>
                      </>
                    ) : null}
                    <dt className="text-muted">Map</dt>
                    <dd className="font-semibold">OpenStreetMap open context</dd>
                  </dl>
                  {selectedAttributes.length ? (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3" aria-label="OpenStreetMap attributes">
                      {selectedAttributes.map(([key, value]) => (
                        <span key={key} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475467] ring-1 ring-inset ring-[#d7dee4]">
                          {attributeLabel(key)} · {value}
                        </span>
                      ))}
                    </div>
                  ) : null}
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
              disabled={!selection?.resolvedObject}
              className="mt-4 min-h-12 w-full rounded-control bg-brand px-4 text-sm font-bold text-white transition hover:bg-[#0758b7] disabled:cursor-not-allowed disabled:bg-[#b7c4d7] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {selection && !selection.resolvedObject ? "Resolving location…" : "Analyze with OpenAI"}
            </button>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              Uses the selected coordinates, open-map attributes and your question. Do not enter confidential or personal locations.
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

export function PointToObjectPrototype() {
  return <PointToObjectPrototypeV5 />;
}
