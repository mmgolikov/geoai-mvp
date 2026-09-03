"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import {
  readPointObjectAnalysis,
  readPointObjectQuestion,
  readPointObjectSelection,
  writePointObjectAnalysis,
  writePointObjectQuestion
} from "@/components/point-to-object/live-session";
import type {
  GroundedClaim,
  LiveMapSelection,
  PointObjectAiResponse
} from "@/components/point-to-object/live-types";

function friendlyEvidenceLabel(reference: string): string {
  const labels: Record<string, string> = {
    "EVD-COORDINATES": "clicked coordinates",
    "EVD-OSM-OBJECT": "OpenStreetMap object",
    "EVD-CLASSIFICATION": "open-map classification",
    "EVD-ADDRESS": "open-map address context",
    "EVD-GEOMETRY": "open-map geometry",
    "EVD-ALLOWED-FIELDS": "allowlisted map attributes",
    "EVD-SOURCE": "OpenStreetMap source record"
  };
  return labels[reference] ?? "source evidence";
}

function ClaimList({ items }: { items: GroundedClaim[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {items.map((item, index) => (
        <li key={`${item.statement}-${index}`} className="border-l-2 border-[#b9c9d5] pl-3 text-sm leading-6 text-[#344054]">
          <p>{item.statement}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted">
            Source basis: {[...new Set(item.evidenceRefs.map(friendlyEvidenceLabel))].join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function LoadingAnalysis() {
  return (
    <div className="rounded-[20px] border border-line bg-white p-7 shadow-soft" role="status">
      <div className="h-3 w-28 animate-pulse rounded-full bg-[#dbe3ea]" />
      <div className="mt-5 h-8 w-4/5 animate-pulse rounded-lg bg-[#e9eef2]" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-[#eef2f5]" />
      <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-[#eef2f5]" />
      <p className="mt-6 text-sm font-semibold text-muted">Resolving open-map context and preparing the analysis…</p>
    </div>
  );
}

export function PointToObjectAnalysis() {
  const [selection, setSelection] = useState<LiveMapSelection | null>(null);
  const [analysis, setAnalysis] = useState<PointObjectAiResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [missingSelection, setMissingSelection] = useState(false);
  const initialRequestStarted = useRef(false);
  const analysisRef = useRef<PointObjectAiResponse | null>(null);

  const commitAnalysis = useCallback((nextAnalysis: PointObjectAiResponse, activeSelection: LiveMapSelection) => {
    analysisRef.current = nextAnalysis;
    setAnalysis(nextAnalysis);
    writePointObjectAnalysis(nextAnalysis, activeSelection);
  }, []);

  const requestAnalysis = useCallback(async (activeSelection: LiveMapSelection, activeQuestion: string) => {
    setLoading(true);
    setRequestError(null);
    setAnnouncement("");
    const preserveExisting = analysisRef.current?.mode === "openai";
    try {
      const challengeResponse = await fetch("/api/prototype/point-to-object/ai", {
        method: "GET",
        cache: "no-store"
      });
      const challengePayload = await challengeResponse.json() as {
        mode: "ready" | "unavailable";
        challenge?: string;
        error?: string;
      };
      if (!challengeResponse.ok || challengePayload.mode !== "ready" || !challengePayload.challenge) {
        const unavailable: PointObjectAiResponse = {
          mode: "unavailable",
          error: challengePayload.error ?? "The analysis service is temporarily unavailable.",
          retryable: true
        };
        if (preserveExisting) setRequestError(unavailable.error ?? "The extended analysis could not be completed.");
        else commitAnalysis(unavailable, activeSelection);
        return;
      }

      const response = await fetch("/api/prototype/point-to-object/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseKey: activeSelection.locationKey,
          longitude: activeSelection.longitude,
          latitude: activeSelection.latitude,
          locale: "en",
          question: activeQuestion.trim() || null,
          consent: true,
          challenge: challengePayload.challenge
        })
      });
      const payload = await response.json() as PointObjectAiResponse;
      const normalized: PointObjectAiResponse = payload.mode === "openai"
        ? payload
        : {
            mode: "unavailable",
            error: payload.error ?? "The selected location could not be analyzed right now.",
            retryable: payload.retryable ?? response.status >= 500
          };
      if (normalized.mode === "openai") {
        commitAnalysis(normalized, activeSelection);
        setQuestion("");
        writePointObjectQuestion("");
        setAnnouncement(preserveExisting ? "Analysis updated." : "Analysis complete.");
      } else if (preserveExisting) {
        setRequestError(normalized.error ?? "The extended analysis could not be completed.");
      } else {
        commitAnalysis(normalized, activeSelection);
      }
    } catch {
      const unavailable: PointObjectAiResponse = {
        mode: "unavailable",
        error: "The analysis service could not be reached. Your map selection is still available.",
        retryable: true
      };
      if (preserveExisting) setRequestError(unavailable.error ?? "The extended analysis could not be completed.");
      else commitAnalysis(unavailable, activeSelection);
    } finally {
      setLoading(false);
    }
  }, [commitAnalysis]);

  useEffect(() => {
    if (initialRequestStarted.current) return;
    initialRequestStarted.current = true;
    const restoredSelection = readPointObjectSelection();
    if (!restoredSelection) {
      setMissingSelection(true);
      return;
    }
    const restoredQuestion = readPointObjectQuestion();
    const restoredAnalysis = readPointObjectAnalysis(restoredSelection);
    setSelection(restoredSelection);
    setQuestion(restoredQuestion);
    if (restoredAnalysis) {
      analysisRef.current = restoredAnalysis;
      setAnalysis(restoredAnalysis);
      setAnnouncement("Saved analysis loaded.");
      return;
    }
    void requestAnalysis(restoredSelection, restoredQuestion);
  }, [requestAnalysis]);

  function submitFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || !question.trim() || loading) return;
    writePointObjectQuestion(question.trim());
    void requestAnalysis(selection, question.trim());
  }

  if (missingSelection) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f8fb] p-5 text-ink">
        <section className="w-full max-w-lg rounded-[22px] border border-line bg-white p-7 text-center shadow-soft">
          <IdentitySymbol />
          <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">Select a location first</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Return to the map, choose a building or point, and start the analysis from there.</p>
          <Link href="/prototype/point-to-object" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-bold text-white">
            Open map
          </Link>
        </section>
      </main>
    );
  }

  const content = analysis?.mode === "openai" ? analysis.content : null;
  const subject = analysis?.mode === "openai" ? analysis.subject : null;
  const sourceGeometryContainsPoint = subject?.coordinateAssociation === "open_map_geometry_contains_point";
  const title = subject && !sourceGeometryContainsPoint
    ? "Nearest indexed OpenStreetMap record"
    : subject?.name ?? selection?.object.name ?? "Selected location";
  const resolvedName = subject?.name && subject.name !== title ? subject.name : null;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-ink">
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <IdentitySymbol />
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-5">GeoAI</span>
            <span className="block truncate text-[11px] font-semibold text-muted">Location intelligence</span>
          </span>
        </Link>
        <Link href="/prototype/point-to-object" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          Back to map
        </Link>
      </header>

      <div className="grid w-full gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          <div className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.11em] text-brand">Location analysis</p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] sm:text-3xl">{title}</h1>
            {resolvedName ? <p className="mt-2 text-base font-semibold text-[#344054]">{resolvedName}</p> : null}
            {subject?.address ? <p className="mt-2 text-sm leading-6 text-muted">{subject.address}</p> : null}
            {selection ? (
              <p className="mt-3 text-xs tabular-nums text-[#667085]">
                {selection.latitude.toFixed(6)}, {selection.longitude.toFixed(6)} · OpenStreetMap open context
              </p>
            ) : null}
          </div>

          <div className="mt-5">
            {loading && !content ? <LoadingAnalysis /> : null}
            {loading && content ? (
              <div className="mb-5 rounded-xl border border-[#cfe0f7] bg-[#f4f8fe] px-4 py-3 text-sm font-semibold text-[#24598f]" role="status">
                Extending the analysis while keeping the current result visible…
              </div>
            ) : null}
            {requestError && content ? (
              <div className="mb-5 rounded-xl border border-[#e7c47e] bg-[#fffaf0] px-4 py-3 text-sm text-[#6b4b16]" role="alert">
                {requestError} The previous result is still available below.
              </div>
            ) : null}
            {!loading && analysis?.mode === "unavailable" ? (
              <section className="rounded-[20px] border border-[#e7c47e] bg-[#fffaf0] p-6 shadow-soft" role="alert">
                <h2 className="text-lg font-bold">Analysis is temporarily unavailable</h2>
                <p className="mt-2 text-sm leading-6 text-[#6b4b16]">{analysis.error ?? "Please try again shortly."}</p>
                {selection && analysis.retryable !== false ? (
                  <button type="button" onClick={() => void requestAnalysis(selection, question)} className="mt-5 min-h-11 rounded-control bg-ink px-5 text-sm font-bold text-white">
                    Try again
                  </button>
                ) : null}
              </section>
            ) : null}

            {content ? (
              <div className="space-y-5" data-testid="ai-success">
                <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Overview</p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-[#243447]">{content.appearsToBe}</p>
                  {content.answerToQuestion ? (
                    <div className="mt-5 rounded-2xl bg-[#eef6ff] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">AI answer · validate before use</p>
                      <p className="mt-2 text-sm leading-6 text-[#243447]">{content.answerToQuestion.statement}</p>
                      <p className="mt-2 text-[11px] leading-4 text-muted">
                        Source basis: {[...new Set(content.answerToQuestion.evidenceRefs.map(friendlyEvidenceLabel))].join(", ")}
                      </p>
                    </div>
                  ) : null}
                </section>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                    <h2 className="text-base font-bold">What the source confirms</h2>
                    <ClaimList items={content.confirmedFacts} />
                  </section>
                  <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                    <h2 className="text-base font-bold">Location context</h2>
                    {content.locationContext.length ? <ClaimList items={content.locationContext} /> : <p className="mt-3 text-sm leading-6 text-muted">No additional location context is confirmed by this source record.</p>}
                  </section>
                </div>

                {content.aiInferences.length ? (
                  <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                    <h2 className="text-base font-bold">AI interpretation</h2>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                      {content.aiInferences.map((item, index) => (
                        <li key={`${item.statement}-${index}`} className="rounded-2xl bg-[#f7f9fb] p-4 text-sm leading-6 text-[#344054]">
                          <p>{item.statement}</p>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{item.confidence} confidence · validate before use</p>
                          <p className="mt-1 text-[11px] leading-4 text-muted">
                            Source basis: {[...new Set(item.evidenceRefs.map(friendlyEvidenceLabel))].join(", ")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                  <h2 className="text-base font-bold">What to validate next</h2>
                  <ul className="mt-3 space-y-3">
                    {content.decisionObservations.map((item, index) => (
                      <li key={`${item.statement}-${index}`} className="rounded-xl border border-line p-4 text-sm leading-6 text-[#344054]">
                        <p>{item.statement}</p>
                        <p className="mt-1 text-[11px] font-semibold text-muted">Official or client validation required.</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted">
                          Source basis: {[...new Set(item.evidenceRefs.map(friendlyEvidenceLabel))].join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="min-w-0">
          <div className="space-y-5 xl:sticky xl:top-6">
            <form onSubmit={submitFollowUp} className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
              <label className="text-base font-bold" htmlFor="analysis-follow-up">Run a focused analysis</label>
              <p className="mt-2 text-xs leading-5 text-muted">Ask a new question about the same selected location and source record.</p>
              <textarea
                id="analysis-follow-up"
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
                rows={5}
                placeholder="For example: What information is still needed before a development decision?"
                className="mt-4 w-full resize-y rounded-xl border border-line p-3 text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-[#bfd8ff]"
              />
              <button type="submit" disabled={!question.trim() || loading} className="mt-3 min-h-12 w-full rounded-control bg-brand px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#b7c4d7]">
                {loading ? "Analyzing…" : "Run extended analysis"}
              </button>
            </form>

            {content ? (
              <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                <h2 className="text-base font-bold">Information still needed</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
                  {content.missingInformation.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ) : null}

            <section className="rounded-[18px] border border-line bg-white p-4 text-[11px] leading-5 text-muted">
              <p>
                OpenStreetMap is open community context and may be incomplete or out of date. The page states explicitly whether the returned community polygon contains the point; otherwise it is shown only as the nearest indexed record.
              </p>
              <p className="mt-3 font-semibold text-[#475467]">
                Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
