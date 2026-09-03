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
  PointObjectAiResponse,
  PointObjectAnalysisDepth,
  PointObjectAnalysisGoal,
  PointObjectAnalysisHorizon,
  PointObjectAnalysisPerspective
} from "@/components/point-to-object/live-types";

type AnalysisSettings = {
  depth: PointObjectAnalysisDepth;
  goal: PointObjectAnalysisGoal;
  perspective: PointObjectAnalysisPerspective;
  horizon: PointObjectAnalysisHorizon;
};

const DEFAULT_SETTINGS: AnalysisSettings = {
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "current"
};

const FOCUSED_ANALYSES: Array<{ label: string; goal: PointObjectAnalysisGoal; question: string }> = [
  { label: "Object profile", goal: "object_profile", question: "Build a concise decision-oriented profile of this object. Separate observed map evidence, derived implications and hypotheses, and identify the most material evidence gaps." },
  { label: "Development screening", goal: "development_screening", question: "Screen this object from the selected perspective. Identify what the available evidence implies, the strongest preliminary opportunities and risks, and what must be validated before further commitment." },
  { label: "Redevelopment", goal: "redevelopment", question: "Assess whether redevelopment or repositioning is a useful hypothesis to investigate for this object. Do not assume development rights, condition, demand or financial feasibility." },
  { label: "Due diligence", goal: "due_diligence", question: "Turn the available evidence into a prioritized due-diligence plan. Explain which unknowns could change the decision most and which sources should be checked first." }
];

const DEPTH_OPTIONS: Array<{ value: PointObjectAnalysisDepth; label: string; description: string }> = [
  { value: "quick", label: "Quick", description: "Fast orientation" },
  { value: "standard", label: "Standard", description: "Balanced · recommended" },
  { value: "deep", label: "Deep", description: "Maximum depth · may take several minutes" }
];

function humanizeAttribute(key: string): string {
  return key.replace(/^tag\./, "").replace(/^classification\./, "").replaceAll("_", " ").replaceAll(":", " · ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function friendlyEvidenceLabel(reference: string): string {
  const labels: Record<string, string> = {
    "EVD-COORDINATES": "map-selected analysis point",
    "EVD-OBJECT": "open-map object",
    "EVD-OSM-OBJECT": "OpenStreetMap object",
    "EVD-CLASSIFICATION": "open-map classification",
    "EVD-ADDRESS": "open-map address context",
    "EVD-GEOMETRY": "open-map geometry",
    "EVD-ALLOWED-FIELDS": "allowlisted map attributes",
    "EVD-SOURCE": "OpenStreetMap source record",
    "EVD-SNAPSHOT": "source snapshot metadata",
    "EVD-RIGHTS": "source rights metadata"
  };
  return labels[reference] ?? "source evidence";
}

function EvidenceRefs({ references }: { references: string[] }) {
  return <p className="mt-2 text-[11px] leading-4 text-muted">Evidence: {[...new Set(references.map(friendlyEvidenceLabel))].join(", ")}</p>;
}

function ClaimList({ items }: { items: GroundedClaim[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {items.map((item, index) => (
        <li key={`${item.statement}-${index}`} className="border-l-2 border-[#b9c9d5] pl-3 text-sm leading-6 text-[#344054]">
          <p>{item.statement}</p>
          <EvidenceRefs references={item.evidenceRefs} />
        </li>
      ))}
    </ul>
  );
}

function LoadingAnalysis({ depth }: { depth: PointObjectAnalysisDepth }) {
  return (
    <div className="rounded-[20px] border border-line bg-white p-7 shadow-soft" role="status">
      <div className="h-3 w-28 animate-pulse rounded-full bg-[#dbe3ea]" />
      <div className="mt-5 h-8 w-4/5 animate-pulse rounded-lg bg-[#e9eef2]" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-[#eef2f5]" />
      <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-[#eef2f5]" />
      <p className="mt-6 text-sm font-semibold text-muted">{depth === "deep" ? "Running a deeper evidence-bound analysis…" : "Preparing the evidence-bound analysis…"}</p>
    </div>
  );
}

function dispositionLabel(value: "continue_screening" | "hold" | "insufficient_evidence"): string {
  if (value === "continue_screening") return "Continue screening";
  if (value === "hold") return "Hold";
  return "Insufficient evidence";
}

function dispositionStyle(value: "continue_screening" | "hold" | "insufficient_evidence"): string {
  if (value === "continue_screening") return "border-[#aad4c2] bg-[#eef9f4] text-[#176548]";
  if (value === "hold") return "border-[#efc47b] bg-[#fff8e9] text-[#80530d]";
  return "border-[#cbd5e1] bg-[#f5f7f9] text-[#475467]";
}

function evidenceClassStyle(value: "observed" | "derived" | "hypothesis"): string {
  if (value === "observed") return "bg-[#edf7f2] text-[#176548]";
  if (value === "derived") return "bg-[#edf4ff] text-[#175cd3]";
  return "bg-[#fff5e8] text-[#8a4b08]";
}

export function PointToObjectAnalysis() {
  const [selection, setSelection] = useState<LiveMapSelection | null>(null);
  const [analysis, setAnalysis] = useState<PointObjectAiResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<PointObjectAnalysisDepth>(DEFAULT_SETTINGS.depth);
  const [goal, setGoal] = useState<PointObjectAnalysisGoal>(DEFAULT_SETTINGS.goal);
  const [perspective, setPerspective] = useState<PointObjectAnalysisPerspective>(DEFAULT_SETTINGS.perspective);
  const [horizon, setHorizon] = useState<PointObjectAnalysisHorizon>(DEFAULT_SETTINGS.horizon);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [missingSelection, setMissingSelection] = useState(false);
  const analysisRef = useRef<PointObjectAiResponse | null>(null);
  const requestSequenceRef = useRef(0);
  const activeRequestRef = useRef<AbortController | null>(null);

  const commitAnalysis = useCallback((nextAnalysis: PointObjectAiResponse, activeSelection: LiveMapSelection) => {
    analysisRef.current = nextAnalysis;
    setAnalysis(nextAnalysis);
    writePointObjectAnalysis(nextAnalysis, activeSelection);
  }, []);

  const requestAnalysis = useCallback(async (activeSelection: LiveMapSelection, activeQuestion: string, settings: AnalysisSettings) => {
    activeRequestRef.current?.abort();
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const isCurrent = () => !controller.signal.aborted && requestSequenceRef.current === requestId;
    setLoading(true);
    setRequestError(null);
    setAnnouncement("");
    const preserveExisting = analysisRef.current?.mode === "openai";
    try {
      const challengeResponse = await fetch("/api/prototype/point-to-object/ai", { method: "GET", cache: "no-store", signal: controller.signal });
      const challengePayload = await challengeResponse.json() as { mode: "ready" | "unavailable"; challenge?: string; error?: string };
      if (!isCurrent()) return;
      if (!challengeResponse.ok || challengePayload.mode !== "ready" || !challengePayload.challenge) {
        const unavailable: PointObjectAiResponse = { mode: "unavailable", error: challengePayload.error ?? "The analysis service is temporarily unavailable.", retryable: true };
        if (preserveExisting) setRequestError(unavailable.error ?? "The focused analysis could not be completed.");
        else commitAnalysis(unavailable, activeSelection);
        return;
      }

      const response = await fetch("/api/prototype/point-to-object/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          caseKey: activeSelection.locationKey,
          longitude: activeSelection.longitude,
          latitude: activeSelection.latitude,
          locale: "en",
          question: activeQuestion.trim() || null,
          depth: settings.depth,
          goal: settings.goal,
          perspective: settings.perspective,
          horizon: settings.horizon,
          expectedSourceFeatureId: activeSelection.resolvedObject?.sourceFeatureId ?? null,
          consent: true,
          challenge: challengePayload.challenge
        })
      });
      const payload = await response.json() as PointObjectAiResponse;
      if (!isCurrent()) return;
      const normalized: PointObjectAiResponse = payload.mode === "openai" ? payload : {
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
        setRequestError(normalized.error ?? "The focused analysis could not be completed.");
      } else {
        commitAnalysis(normalized, activeSelection);
      }
    } catch (error) {
      if (!isCurrent() || (error instanceof DOMException && error.name === "AbortError")) return;
      const unavailable: PointObjectAiResponse = { mode: "unavailable", error: "The analysis service could not be reached. Your map selection is still available.", retryable: true };
      if (preserveExisting) setRequestError(unavailable.error ?? "The focused analysis could not be completed.");
      else commitAnalysis(unavailable, activeSelection);
    } finally {
      if (isCurrent()) {
        activeRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [commitAnalysis]);

  useEffect(() => {
    const restoredSelection = readPointObjectSelection();
    if (!restoredSelection) {
      setMissingSelection(true);
    } else {
      const restoredQuestion = readPointObjectQuestion();
      const restoredAnalysis = readPointObjectAnalysis(restoredSelection);
      setMissingSelection(false);
      setSelection(restoredSelection);
      setQuestion(restoredQuestion);
      if (restoredAnalysis?.mode === "openai") {
        analysisRef.current = restoredAnalysis;
        setAnalysis(restoredAnalysis);
        setDepth(restoredAnalysis.request.depth);
        setGoal(restoredAnalysis.request.goal);
        setPerspective(restoredAnalysis.request.perspective);
        setHorizon(restoredAnalysis.request.horizon);
        setAnnouncement("Saved analysis loaded.");
      } else if (restoredAnalysis) {
        analysisRef.current = restoredAnalysis;
        setAnalysis(restoredAnalysis);
      } else {
        const restoredSettings = restoredQuestion.trim()
          ? { ...DEFAULT_SETTINGS, goal: "custom" as const }
          : DEFAULT_SETTINGS;
        if (restoredQuestion.trim()) setGoal("custom");
        void requestAnalysis(restoredSelection, restoredQuestion, restoredSettings);
      }
    }
    return () => {
      requestSequenceRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
    };
  }, [requestAnalysis]);

  function currentSettings(overrides: Partial<AnalysisSettings> = {}): AnalysisSettings {
    return { depth, goal, perspective, horizon, ...overrides };
  }

  function submitFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || !question.trim() || loading) return;
    writePointObjectQuestion(question.trim());
    void requestAnalysis(selection, question.trim(), currentSettings());
  }

  function selectFocusedAnalysis(focusedGoal: PointObjectAnalysisGoal, focusedQuestion: string) {
    if (loading) return;
    setGoal(focusedGoal);
    setQuestion(focusedQuestion);
    writePointObjectQuestion(focusedQuestion);
  }

  if (missingSelection) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f8fb] p-5 text-ink">
        <section className="w-full max-w-lg rounded-[22px] border border-line bg-white p-7 text-center shadow-soft">
          <IdentitySymbol />
          <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">Select a location first</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Return to the map, choose a building or point, and start the analysis from there.</p>
          <Link href="/prototype/point-to-object" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-bold text-white">Open map</Link>
        </section>
      </main>
    );
  }

  const content = analysis?.mode === "openai" ? analysis.content : null;
  const subject = analysis?.mode === "openai" ? analysis.subject : null;
  const sourceGeometryContainsPoint = subject?.coordinateAssociation === "open_map_geometry_contains_point";
  const title = subject && !sourceGeometryContainsPoint ? "Nearest indexed OpenStreetMap record" : subject?.name ?? selection?.object.name ?? "Selected location";
  const resolvedName = subject?.name && subject.name !== title ? subject.name : null;
  const contextRelation = subject ? sourceGeometryContainsPoint ? "Containing OpenStreetMap context at the analysis point" : `Nearest indexed OpenStreetMap context · about ${Math.round(subject.resultCentroidDistanceM)} m` : null;
  const nearbyMapLabels = selection?.nearbyLabels ?? [];
  const completedDepth = analysis?.mode === "openai" ? analysis.request.depth : depth;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-ink">
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <IdentitySymbol />
          <span className="min-w-0"><span className="block text-lg font-bold leading-5">GeoAI</span><span className="block truncate text-[11px] font-semibold text-muted">Location intelligence</span></span>
        </Link>
        <Link href="/prototype/point-to-object" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">Back to map</Link>
      </header>

      <div className="grid w-full gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0">
          <div className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.11em] text-brand">Location analysis</p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] sm:text-3xl">{title}</h1>
            {resolvedName ? <p className="mt-2 text-base font-semibold text-[#344054]">{resolvedName}</p> : null}
            {contextRelation ? <p className="mt-2 text-xs font-semibold text-brand">{contextRelation}</p> : null}
            {subject?.address ? <p className="mt-2 text-sm leading-6 text-muted">{subject.address}</p> : null}
            {subject && Object.keys(subject.tags).length ? (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="OpenStreetMap attributes">
                {Object.entries(subject.tags).slice(0, 6).map(([key, value]) => <span key={key} className="rounded-full bg-[#f3f6f8] px-2.5 py-1 text-[11px] font-semibold text-[#475467]">{humanizeAttribute(key)} · {value}</span>)}
              </div>
            ) : null}
            {selection ? <p className="mt-3 text-xs tabular-nums text-[#667085]">Analysis point {selection.latitude.toFixed(6)}, {selection.longitude.toFixed(6)} · OpenStreetMap open context</p> : null}
          </div>

          <div className="mt-5">
            {loading && !content ? <LoadingAnalysis depth={depth} /> : null}
            {loading && content ? <div className="mb-5 rounded-xl border border-[#cfe0f7] bg-[#f4f8fe] px-4 py-3 text-sm font-semibold text-[#24598f]" role="status">Running {depth} analysis while keeping the current result visible…</div> : null}
            {requestError && content ? <div className="mb-5 rounded-xl border border-[#e7c47e] bg-[#fffaf0] px-4 py-3 text-sm text-[#6b4b16]" role="alert">{requestError} The previous result is still available below.</div> : null}
            {!loading && analysis?.mode === "unavailable" ? (
              <section className="rounded-[20px] border border-[#e7c47e] bg-[#fffaf0] p-6 shadow-soft" role="alert">
                <h2 className="text-lg font-bold">Analysis is temporarily unavailable</h2>
                <p className="mt-2 text-sm leading-6 text-[#6b4b16]">{analysis.error ?? "Please try again shortly."}</p>
                {selection && analysis.retryable !== false ? <button type="button" onClick={() => void requestAnalysis(selection, question, currentSettings())} className="mt-5 min-h-11 rounded-control bg-ink px-5 text-sm font-bold text-white">Try again</button> : null}
              </section>
            ) : null}

            {content ? (
              <div className="space-y-5" data-testid="ai-success">
                <section className="rounded-[20px] border border-[#c8d9ec] bg-white p-5 shadow-soft sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Decision brief</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${dispositionStyle(content.decisionBrief.disposition)}`}>{dispositionLabel(content.decisionBrief.disposition)}</span>
                    <span className="rounded-full bg-[#f3f6f8] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#475467]">{content.decisionBrief.confidence} confidence</span>
                  </div>
                  <h2 className="mt-4 text-xl font-bold leading-8 tracking-[-0.025em] text-[#172b4d]">{content.decisionBrief.headline}</h2>
                  <p className="mt-3 text-base leading-7 text-[#344054]">{content.decisionBrief.summary}</p>
                  <ClaimList items={content.decisionBrief.reasons} />
                  {content.answerToQuestion ? (
                    <div className="mt-6 rounded-2xl border border-[#cfe0f7] bg-[#eef6ff] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">Answer to your question</p>
                      {analysis?.mode === "openai" && analysis.request.question ? <p className="mt-2 text-xs leading-5 text-[#52657a]">{analysis.request.question}</p> : null}
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#243447]">{content.answerToQuestion.statement}</p>
                      <EvidenceRefs references={content.answerToQuestion.evidenceRefs} />
                    </div>
                  ) : null}
                </section>

                <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div><h2 className="text-base font-bold">Key decision signals</h2><p className="mt-1 text-xs leading-5 text-muted">Observed evidence, derived implications and testable hypotheses are kept separate.</p></div>
                    <span className="text-[11px] font-semibold capitalize text-muted">{completedDepth} analysis</span>
                  </div>
                  <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                    {content.signals.map((item, index) => (
                      <li key={`${item.title}-${index}`} className="rounded-2xl border border-line bg-[#fbfcfd] p-4">
                        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${evidenceClassStyle(item.evidenceClass)}`}>{item.evidenceClass}</span><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">{item.confidence} confidence</span></div>
                        <h3 className="mt-3 text-sm font-bold text-[#243447]">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#475467]">{item.observation}</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-[#243447]">Why it matters: {item.implication}</p>
                        <EvidenceRefs references={item.evidenceRefs} />
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                    <h2 className="text-base font-bold">Opportunity hypotheses</h2>
                    <ul className="mt-4 space-y-3">
                      {content.opportunities.map((item, index) => (
                        <li key={`${item.title}-${index}`} className="rounded-2xl bg-[#f2f8f5] p-4">
                          <h3 className="text-sm font-bold text-[#175c45]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#344054]">{item.hypothesis}</p><p className="mt-2 text-xs leading-5 text-[#475467]">{item.rationale}</p><p className="mt-2 text-xs font-semibold leading-5 text-[#175c45]">Potential value: {item.potentialValue}</p><p className="mt-2 text-[11px] leading-4 text-muted">Evidence needed: {item.evidenceNeeded.join("; ")}</p><EvidenceRefs references={item.evidenceRefs} />
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                    <h2 className="text-base font-bold">Material risks</h2>
                    <ul className="mt-4 space-y-3">
                      {content.risks.map((item, index) => (
                        <li key={`${item.title}-${index}`} className="rounded-2xl bg-[#fff8ee] p-4">
                          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-[#7a4a0c]">{item.title}</h3><span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#8a4b08]">{item.severity}</span></div><p className="mt-2 text-sm leading-6 text-[#344054]">{item.statement}</p><p className="mt-2 text-xs font-semibold leading-5 text-[#6b4b16]">Decision impact: {item.decisionImpact}</p><EvidenceRefs references={item.evidenceRefs} />
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                  <h2 className="text-base font-bold">What to validate next</h2>
                  <p className="mt-1 text-xs leading-5 text-muted">Prioritized checks that can materially change the screening decision.</p>
                  <ol className="mt-4 space-y-3">
                    {content.nextValidation.map((item, index) => (
                      <li key={`${item.title}-${index}`} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[32px_minmax(0,1fr)]">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eef4fb] text-xs font-bold text-brand">{index + 1}</span>
                        <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#243447]">{item.title}</h3><span className="rounded-full bg-[#f3f6f8] px-2 py-0.5 text-[10px] font-bold uppercase text-[#475467]">{item.priority}</span></div><p className="mt-2 text-sm leading-6 text-[#344054]">{item.action}</p><p className="mt-2 text-xs leading-5 text-muted"><span className="font-semibold text-[#475467]">Check:</span> {item.source}</p><p className="mt-1 text-xs leading-5 text-muted"><span className="font-semibold text-[#475467]">Decision impact:</span> {item.decisionImpact}</p></div>
                      </li>
                    ))}
                  </ol>
                </section>

                {nearbyMapLabels.length ? (
                  <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                    <h2 className="text-base font-bold">Visible nearby map labels</h2><p className="mt-1 text-xs leading-5 text-muted">Visual context from the current map view; not used as confirmed analytical evidence.</p>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">{nearbyMapLabels.map((item, index) => <li key={`${item.name}-${index}`} className="rounded-xl bg-[#f7f9fb] p-4"><p className="text-sm font-bold text-[#243447]">{item.name}</p><p className="mt-1 text-xs text-muted">{humanizeAttribute(item.featureClass)} · visible near the selection</p></li>)}</ul>
                  </section>
                ) : null}

                <details className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                  <summary className="cursor-pointer list-none text-sm font-bold text-[#344054]">Source evidence and methodology</summary>
                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div><h3 className="text-sm font-bold">Object source facts</h3><ClaimList items={content.sourceFacts} /></div>
                    <div><h3 className="text-sm font-bold">Address and map context</h3>{content.locationContext.length ? <ClaimList items={content.locationContext} /> : <p className="mt-3 text-sm text-muted">No additional source context was returned.</p>}</div>
                  </div>
                  {analysis?.mode === "openai" ? <div className="mt-5 border-t border-line pt-4 text-[11px] leading-5 text-muted"><p>Analysis engine: {analysis.telemetry.model} · reasoning {analysis.telemetry.reasoningEffort} · {analysis.telemetry.attempts} attempt{analysis.telemetry.attempts === 1 ? "" : "s"} · {analysis.telemetry.latencyMs} ms{analysis.telemetry.estimatedCostUsd === null ? "" : ` · estimated API cost $${analysis.telemetry.estimatedCostUsd.toFixed(4)}`}</p><p>Evidence pack: {analysis.evidencePackId} · prompt {analysis.telemetry.promptVersion}</p></div> : null}
                </details>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="min-w-0"><div className="space-y-5 xl:sticky xl:top-6">
          <form onSubmit={submitFollowUp} className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
            <label className="text-base font-bold" htmlFor="analysis-follow-up">Run a focused analysis</label>
            <p className="mt-2 text-xs leading-5 text-muted">Ask a new question about the same selected location and source record.</p>
            <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Focused analysis options">
              {FOCUSED_ANALYSES.map((item) => <button key={item.goal} type="button" onClick={() => selectFocusedAnalysis(item.goal, item.question)} disabled={loading} aria-pressed={goal === item.goal} className={`min-h-11 rounded-xl border px-3 text-left text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${goal === item.goal ? "border-brand bg-[#eef5ff] text-brand" : "border-line bg-[#f8fafc] text-[#344054] hover:border-[#a8bfd5] hover:bg-white"}`}>{item.label}</button>)}
            </div>
            <textarea id="analysis-follow-up" value={question} onChange={(event) => { setQuestion(event.target.value.slice(0, 500)); setGoal("custom"); }} rows={5} placeholder="For example: What should a developer validate before considering this object?" className="mt-4 w-full resize-y rounded-xl border border-line p-3 text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-[#bfd8ff]" />
            <fieldset className="mt-4">
              <legend className="text-xs font-bold text-[#344054]">Analysis depth</legend>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-[#f2f5f8] p-1">
                {DEPTH_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => setDepth(option.value)} aria-pressed={depth === option.value} className={`min-h-10 rounded-lg px-2 text-xs font-bold transition ${depth === option.value ? "bg-white text-brand shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>{option.label}</button>)}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted">{DEPTH_OPTIONS.find((option) => option.value === depth)?.description}</p>
            </fieldset>
            <details className="mt-4 rounded-xl border border-line bg-[#fbfcfd] p-3">
              <summary className="cursor-pointer text-xs font-bold text-[#475467]">Analysis settings</summary>
              <div className="mt-3 grid gap-3">
                <label className="text-xs font-semibold text-[#475467]">Perspective<select value={perspective} onChange={(event) => setPerspective(event.target.value as PointObjectAnalysisPerspective)} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-[#344054] outline-none focus:border-brand"><option value="developer">Developer</option><option value="investor">Investor</option><option value="asset_owner">Asset owner</option></select></label>
                <label className="text-xs font-semibold text-[#475467]">Time horizon<select value={horizon} onChange={(event) => setHorizon(event.target.value as PointObjectAnalysisHorizon)} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-[#344054] outline-none focus:border-brand"><option value="current">Current</option><option value="one_to_three_years">1–3 years</option><option value="long_term">Long-term</option></select></label>
              </div>
            </details>
            <button type="submit" disabled={!question.trim() || loading} className="mt-4 min-h-12 w-full rounded-control bg-brand px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#b7c4d7]">{loading ? `Running ${depth} analysis…` : "Run focused analysis"}</button>
          </form>
          <section className="rounded-[18px] border border-line bg-white p-4 text-[11px] leading-5 text-muted"><p className="font-semibold text-[#475467]">Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.</p></section>
        </div></aside>
      </div>
    </main>
  );
}
