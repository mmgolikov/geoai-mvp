"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import type { GeoJsonGeometry, LivePointResolution, LivePointWarning, Position } from "@/src/lib/point-to-object/contracts";

type CaseKey = "dubai" | "singapore";

type MapFeature = {
  id: string;
  sourceFeatureId: string;
  name: string | null;
  featureClass: string;
  geometry: GeoJsonGeometry;
  geometryHash: string;
  clickPoint: Position;
};

type ContextFeature = {
  id: string;
  name: string | null;
  categories: string[];
  point: Position;
  distanceM: number;
  method: string;
};

type CasePayload = {
  caseKey: CaseKey;
  caseId: string;
  label: string;
  shortLabel: string;
  jurisdiction: string;
  bbox: [number, number, number, number];
  resolvedPoint: Position;
  ambiguityPoint: Position | null;
  noResultPoint: Position | null;
  features: MapFeature[];
  contextFeatures: ContextFeature[];
  contextCounts: Array<{ category: string; count: number }>;
  source: {
    sourceName: string;
    sourceId: string;
    snapshotId: string;
    observedAt: string;
    acquiredAt: string;
    freshness: string;
    rightsDecisionId: string;
    attribution: string;
    licenceUrl: string;
    sourceOfferPath: string;
    runtimeNetworkUsed: false;
  };
  limitations: string[];
  caveat: string;
};

type ResolutionPayload = {
  case: CasePayload;
  resolution: LivePointResolution;
  warnings: LivePointWarning[];
  selectedFeature: MapFeature | null;
  nearbyContext: ContextFeature[];
};

type AiResponse = {
  mode: "openai" | "unavailable";
  code?: string;
  error?: string;
  generatedAt?: string;
  evidencePackId?: string;
  evidencePackHash?: string;
  content?: {
    appearsToBe: string;
    confirmedFacts: Array<{ statement: string; evidenceRefs: string[] }>;
    aiInferences: Array<{ statement: string; evidenceRefs: string[]; confidence: "low" | "medium" }>;
    locationContext: Array<{ statement: string; evidenceRefs: string[] }>;
    decisionObservations: Array<{ statement: string; evidenceRefs: string[]; validationRequired: boolean }>;
    missingInformation: string[];
    answerToQuestion: { statement: string; evidenceRefs: string[] } | null;
    caveat: string;
  };
  telemetry?: {
    model: string;
    requestId: string | null;
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCostUsd: number | null;
    stored: false;
    toolCalls: 0;
  };
};

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 680;

function project(point: Position, bbox: CasePayload["bbox"]): [number, number] {
  const [west, south, east, north] = bbox;
  return [
    ((point[0] - west) / (east - west)) * VIEW_WIDTH,
    ((north - point[1]) / (north - south)) * VIEW_HEIGHT
  ];
}

function unproject(point: [number, number], bbox: CasePayload["bbox"]): Position {
  const [west, south, east, north] = bbox;
  return [
    west + (point[0] / VIEW_WIDTH) * (east - west),
    north - (point[1] / VIEW_HEIGHT) * (north - south)
  ];
}

function ringPath(ring: Position[], bbox: CasePayload["bbox"]): string {
  return ring.map((point, index) => {
    const [x, y] = project(point, bbox);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function geometryPath(geometry: GeoJsonGeometry, bbox: CasePayload["bbox"]): string {
  if (geometry.type === "Polygon") return geometry.coordinates.map((ring) => ringPath(ring, bbox)).join(" ");
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) => polygon.map((ring) => ringPath(ring, bbox))).join(" ");
  }
  return "";
}

function statusCopy(status: LivePointResolution["status"] | "idle") {
  if (status === "resolved") return { label: "Resolved", tone: "bg-[#e7f6ef] text-[#17603a]", title: "One frozen source object matched" };
  if (status === "ambiguous") return { label: "Ambiguous", tone: "bg-[#fff3d8] text-[#805500]", title: "More than one eligible source object" };
  if (status === "no_result") return { label: "No result", tone: "bg-[#f2f4f7] text-[#475467]", title: "No eligible frozen feature at this point" };
  if (status === "outside_coverage") return { label: "Outside", tone: "bg-[#fdecec] text-[#9f2d2d]", title: "Point is outside controlled coverage" };
  return { label: "Ready", tone: "bg-[#e8f2ff] text-brand", title: "Select a building or click the canvas" };
}

function LoadingBlock() {
  return <div className="flex min-h-[420px] items-center justify-center text-sm font-semibold text-muted" role="status">Verifying frozen evidence…</div>;
}

export function PointToObjectPrototype() {
  const [caseKey, setCaseKey] = useState<CaseKey>("dubai");
  const [caseData, setCaseData] = useState<CasePayload | null>(null);
  const [resolution, setResolution] = useState<ResolutionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [aiConsent, setAiConsent] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState<AiResponse | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const resolvePoint = useCallback(async (activeCase: CaseKey, point: Position) => {
    setResolving(true);
    setError(null);
    setAi(null);
    try {
      const response = await fetch("/api/prototype/point-to-object/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseKey: activeCase, longitude: point[0], latitude: point[1] })
      });
      if (!response.ok) throw new Error("The frozen resolver rejected this point.");
      setResolution(await response.json() as ResolutionPayload);
    } catch (cause) {
      setResolution(null);
      setError(cause instanceof Error ? cause.message : "Resolution failed safely.");
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setAi(null);
    fetch(`/api/prototype/point-to-object/cases?case=${caseKey}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Frozen case authority verification failed.");
        return await response.json() as CasePayload;
      })
      .then(async (payload) => {
        if (!active) return;
        setCaseData(payload);
        await resolvePoint(caseKey, payload.resolvedPoint);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Case load failed safely.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [caseKey, resolvePoint]);

  const highlighted = useMemo(() => {
    if (!resolution) return new Set<string>();
    if (resolution.selectedFeature) return new Set([resolution.selectedFeature.id]);
    return new Set(resolution.resolution.candidates.map((candidate) => candidate.entity_id));
  }, [resolution]);

  const clickedPoint = resolution
    ? [resolution.resolution.clicked_point.longitude, resolution.resolution.clicked_point.latitude] as Position
    : caseData?.resolvedPoint ?? null;
  const status = statusCopy(resolution?.resolution.status ?? "idle");

  function handleCanvasClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!caseData || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const viewPoint: [number, number] = [
      ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT
    ];
    void resolvePoint(caseKey, unproject(viewPoint, caseData.bbox));
  }

  async function requestAi() {
    if (!resolution || resolution.resolution.status !== "resolved" || !aiConsent) return;
    setAiLoading(true);
    setAi(null);
    try {
      const challengeResponse = await fetch("/api/prototype/point-to-object/ai", {
        method: "GET",
        cache: "no-store"
      });
      const challengePayload = await challengeResponse.json() as {
        mode: "ready" | "unavailable";
        challenge?: string;
        code?: string;
        error?: string;
      };
      if (!challengeResponse.ok || challengePayload.mode !== "ready" || !challengePayload.challenge) {
        setAi({
          mode: "unavailable",
          code: challengePayload.code ?? "AI_CHALLENGE_FAILED",
          error: challengePayload.error ?? "The grounded AI browser challenge could not be issued."
        });
        return;
      }
      const response = await fetch("/api/prototype/point-to-object/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseKey,
          longitude: resolution.resolution.clicked_point.longitude,
          latitude: resolution.resolution.clicked_point.latitude,
          question: question.trim() || null,
          consent: true,
          challenge: challengePayload.challenge
        })
      });
      const payload = await response.json() as AiResponse;
      setAi(payload);
    } catch {
      setAi({ mode: "unavailable", code: "AI_NETWORK_FAILED", error: "The grounded AI request could not be completed." });
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <IdentitySymbol />
            <span className="min-w-0">
              <span className="block text-lg font-bold leading-5">GeoAI</span>
              <span className="block truncate text-[11px] font-semibold text-muted">Point-to-object Candidate</span>
            </span>
          </Link>
          <span className="rounded-full border border-[#bfdbff] bg-[#eff6ff] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-brand">Preview · Not Released</span>
        </div>
      </header>

      <section className="mx-auto max-w-[1480px] px-4 py-5 sm:px-7 sm:py-7">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(390px,0.65fr)]">
          <section className="min-w-0 overflow-hidden rounded-[22px] border border-line bg-white shadow-soft" aria-label="Frozen geographic evidence canvas">
            <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-brand">Frozen geographic evidence canvas</p>
                <h1 className="mt-1 text-xl font-bold tracking-[-0.025em] sm:text-2xl">Click a source geometry. Inspect what is actually known.</h1>
                <p className="mt-1 text-xs leading-5 text-muted">Geographic SVG projection · not a street basemap · no live geodata request</p>
              </div>
              <div className="grid grid-cols-2 rounded-xl bg-surface p-1" role="group" aria-label="Case pack">
                {(["dubai", "singapore"] as const).map((key) => (
                  <button key={key} type="button" onClick={() => setCaseKey(key)} aria-pressed={caseKey === key}
                    className={`min-h-11 rounded-lg px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${caseKey === key ? "bg-white text-brand shadow-sm" : "text-muted"}`}>
                    {key === "dubai" ? "Dubai" : "Singapore"}
                  </button>
                ))}
              </div>
            </div>

            {loading || !caseData ? <LoadingBlock /> : (
              <>
                <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3 sm:px-6">
                  <button type="button" onClick={() => void resolvePoint(caseKey, caseData.resolvedPoint)} className="min-h-11 rounded-control bg-brand px-4 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">Resolve anchor</button>
                  {caseData.ambiguityPoint ? <button type="button" onClick={() => void resolvePoint(caseKey, caseData.ambiguityPoint!)} className="min-h-11 rounded-control border border-[#e5bb61] bg-[#fff9ed] px-4 text-sm font-semibold text-[#805500] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">Show ambiguity</button> : null}
                  {caseData.noResultPoint ? <button type="button" onClick={() => void resolvePoint(caseKey, caseData.noResultPoint!)} className="min-h-11 rounded-control border border-line bg-white px-4 text-sm font-semibold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">Show no result</button> : null}
                </div>
                <div className="relative bg-[#edf3f6] p-2 sm:p-4">
                  <svg ref={svgRef} data-testid="p2o-map" role="img" aria-label={`${caseData.label} frozen OpenStreetMap-derived geometry`} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="block aspect-[1.47] max-h-[680px] w-full rounded-[16px] bg-[#e8f0f3]" onClick={handleCanvasClick}>
                    <defs>
                      <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#cddbe1" strokeWidth="1" /></pattern>
                      <filter id="selectedGlow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0969da" floodOpacity="0.34" /></filter>
                    </defs>
                    <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#grid)" />
                    {caseData.contextFeatures.map((item) => {
                      const [x, y] = project(item.point, caseData.bbox);
                      return <circle key={item.id} cx={x} cy={y} r="3.5" fill="#5c8992" opacity="0.46"><title>{item.name ?? item.categories.join(", ")}</title></circle>;
                    })}
                    {caseData.features.map((feature) => {
                      const isHighlighted = highlighted.has(feature.id);
                      return <path key={feature.id} d={geometryPath(feature.geometry, caseData.bbox)} fill={isHighlighted ? "#2d73e0" : "#ffffff"} fillOpacity={isHighlighted ? 0.82 : 0.88} stroke={isHighlighted ? "#0b4db4" : "#93aab2"} strokeWidth={isHighlighted ? 3.8 : 1.4} vectorEffect="non-scaling-stroke" fillRule="evenodd" filter={isHighlighted ? "url(#selectedGlow)" : undefined}
                        onClick={(event) => { event.stopPropagation(); void resolvePoint(caseKey, feature.clickPoint); }} className="cursor-pointer outline-none focus-visible:stroke-[#e66f00]" tabIndex={0} role="button" aria-label={`Select ${feature.name ?? feature.sourceFeatureId}`}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void resolvePoint(caseKey, feature.clickPoint); } }}><title>{feature.name ?? feature.sourceFeatureId}</title></path>;
                    })}
                    {clickedPoint ? (() => { const [x, y] = project(clickedPoint, caseData.bbox); return <g pointerEvents="none"><circle cx={x} cy={y} r="13" fill="#ffffff" stroke="#172033" strokeWidth="3" /><circle cx={x} cy={y} r="4" fill="#e66f00" /></g>; })() : null}
                  </svg>
                  <div className="pointer-events-none absolute bottom-5 left-5 rounded-lg bg-white/90 px-3 py-2 text-[10px] font-semibold text-muted shadow-sm sm:bottom-7 sm:left-7">Real WGS84 source geometry · display projection only</div>
                </div>
                <footer className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[11px] leading-5 text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span><a className="font-bold text-brand underline underline-offset-2" href={caseData.source.licenceUrl} target="_blank" rel="noreferrer">{caseData.source.attribution}</a> · ODbL 1.0</span>
                  <Link className="font-bold text-brand underline underline-offset-2" href="/prototype/point-to-object/source-offer">Source offer and transformation notice</Link>
                </footer>
              </>
            )}
          </section>

          <aside className="min-w-0 space-y-4" aria-live="polite">
            <section className="rounded-[22px] border border-line bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-muted">Deterministic selection</p>
                  <h2 className="mt-1 text-xl font-bold tracking-[-0.025em]">{status.title}</h2>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${status.tone}`}>{resolving ? "Resolving…" : status.label}</span>
              </div>
              {error ? <p className="mt-4 rounded-xl border border-[#efb7b7] bg-[#fff3f3] p-3 text-sm font-semibold text-[#9f2d2d]" role="alert">{error}</p> : null}
              {caseData && resolution ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-surface p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{caseData.label}</p>
                    {resolution.resolution.status === "resolved" ? <>
                      <p data-testid="selected-object" className="mt-2 break-words text-lg font-bold">{resolution.selectedFeature?.name ?? resolution.resolution.selected_object.source_id}</p>
                      <p className="mt-1 break-all text-xs text-muted">{resolution.resolution.selected_object.source_namespace} · {resolution.resolution.selected_object.source_id}</p>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div><dt className="text-muted">Match</dt><dd className="mt-1 font-bold text-ink">{resolution.resolution.selected_object.match_method.replaceAll("_", " ")}</dd></div>
                        <div><dt className="text-muted">Evidence quality</dt><dd className="mt-1 font-bold text-ink">Partial open context</dd></div>
                      </dl>
                    </> : resolution.resolution.status === "ambiguous" ? (
                      <ul className="mt-3 space-y-2">{resolution.resolution.candidates.map((item) => <li key={item.entity_id} className="rounded-xl border border-[#e5bb61] bg-white p-3 text-sm"><strong className="block break-words">{item.display_name ?? item.source_id}</strong><span className="mt-1 block break-all text-xs text-muted">{item.source_namespace} · {item.source_id}</span></li>)}</ul>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted">No eligible building feature was observed at this point in the named frozen snapshot. This does not prove that no object exists.</p>
                    )}
                  </div>
                  <dl className="grid gap-2 text-xs">
                    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2"><dt className="text-muted">Coordinates</dt><dd className="break-all font-semibold">{resolution.resolution.clicked_point.longitude.toFixed(7)}, {resolution.resolution.clicked_point.latitude.toFixed(7)}</dd></div>
                    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2"><dt className="text-muted">Snapshot</dt><dd className="break-all font-semibold">{caseData.source.snapshotId}</dd></div>
                    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2"><dt className="text-muted">Observed</dt><dd className="font-semibold">{caseData.source.observedAt}</dd></div>
                    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2"><dt className="text-muted">Runtime source</dt><dd className="font-semibold">None · frozen repository</dd></div>
                  </dl>
                  {resolution.warnings.length ? <ul className="space-y-2">{resolution.warnings.map((warning) => <li key={warning.code} className="rounded-xl border border-[#f2d18d] bg-[#fff9ed] p-3 text-xs leading-5 text-[#7a4d00]"><strong>{warning.code.replaceAll("_", " ")}</strong><span className="mt-1 block">{warning.message}</span></li>)}</ul> : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-[22px] border border-line bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-brand">Grounded AI interpretation</p>
                  <h2 className="mt-1 text-lg font-bold">Evidence-bound, never the selector</h2>
                </div>
                <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-[10px] font-bold text-[#475467]">Fail-closed</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">Only a server-rebuilt minimized evidence pack may be sent. No raw geometry, live-source request, customer data or secret is included.</p>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-xs leading-5 text-ink">
                <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#0969da]" />
                <span>I understand that a bounded evidence projection and my question would be processed by OpenAI for this Preview.</span>
              </label>
              <label className="mt-4 block text-xs font-bold text-ink" htmlFor="p2o-question">Optional follow-up question</label>
              <textarea id="p2o-question" value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 500))} rows={3} placeholder="What can this evidence support, and what must be validated?" className="mt-2 w-full resize-y rounded-xl border border-line bg-white p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-[#bfd8ff]" />
              <button type="button" onClick={() => void requestAi()} disabled={!aiConsent || aiLoading || resolution?.resolution.status !== "resolved"} className="mt-3 min-h-12 w-full rounded-control bg-brand px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#b7c4d7] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">{aiLoading ? "Requesting grounded analysis…" : "Analyze with OpenAI"}</button>
              {ai?.mode === "unavailable" ? <div className="mt-4 rounded-xl border border-[#f2d18d] bg-[#fff9ed] p-3 text-xs leading-5 text-[#7a4d00]" role="status"><strong className="block">AI unavailable · {ai.code}</strong><span className="mt-1 block">{ai.error}</span></div> : null}
              {ai?.mode === "openai" && ai.content ? <div className="mt-4 space-y-4" data-testid="ai-success">
                <div className="rounded-xl border border-[#b9d9cd] bg-[#eef9f4] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#17603a]">AI-generated · grounded in frozen evidence</p><p className="mt-2 text-sm font-semibold leading-6">{ai.content.appearsToBe}</p></div>
                <div><h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Confirmed source facts</h3><ul className="mt-2 space-y-2">{ai.content.confirmedFacts.map((item, index) => <li key={`${item.statement}-${index}`} className="text-sm leading-6"><span>{item.statement}</span><span className="ml-2 text-[10px] font-bold text-brand">{item.evidenceRefs.join(" · ")}</span></li>)}</ul></div>
                {ai.content.aiInferences.length ? <div><h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">AI inferences</h3><ul className="mt-2 space-y-2">{ai.content.aiInferences.map((item, index) => <li key={`${item.statement}-${index}`} className="rounded-xl bg-surface p-3 text-sm leading-6"><span>{item.statement}</span><span className="mt-1 block text-[10px] font-bold uppercase text-muted">{item.confidence} confidence · {item.evidenceRefs.join(" · ")}</span></li>)}</ul></div> : null}
                {ai.content.locationContext.length ? <div><h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Location context</h3><ul className="mt-2 space-y-2">{ai.content.locationContext.map((item, index) => <li key={`${item.statement}-${index}`} className="text-sm leading-6"><span>{item.statement}</span><span className="ml-2 text-[10px] font-bold text-brand">{item.evidenceRefs.join(" · ")}</span></li>)}</ul></div> : null}
                <div><h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Decision observations</h3><ul className="mt-2 space-y-2">{ai.content.decisionObservations.map((item, index) => <li key={`${item.statement}-${index}`} className="rounded-xl border border-line p-3 text-sm leading-6"><span>{item.statement}</span><span className="mt-1 block text-[10px] font-bold uppercase text-muted">{item.validationRequired ? "Validation required" : "Evidence-bound observation"} · {item.evidenceRefs.join(" · ")}</span></li>)}</ul></div>
                <div><h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Missing information</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">{ai.content.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></div>
                {ai.content.answerToQuestion ? <div className="rounded-xl border border-line p-3"><h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Answer to follow-up</h3><p className="mt-2 text-sm leading-6">{ai.content.answerToQuestion.statement}</p><p className="mt-1 text-[10px] font-bold text-brand">{ai.content.answerToQuestion.evidenceRefs.join(" · ")}</p></div> : null}
                <p className="rounded-xl border border-[#f2d18d] bg-[#fff9ed] p-3 text-xs font-semibold leading-5 text-[#7a4d00]">{ai.content.caveat}</p>
                {ai.telemetry ? <p className="break-all text-[10px] leading-5 text-muted">OpenAI · {ai.telemetry.model} · {ai.telemetry.latencyMs} ms · request {ai.telemetry.requestId ?? "not returned"} · stored=false · tools=0</p> : null}
              </div> : null}
            </section>

            {resolution?.nearbyContext.length ? <section className="rounded-[22px] border border-line bg-white p-5 shadow-soft sm:p-6"><p className="text-[11px] font-bold uppercase tracking-[0.11em] text-muted">Nearest observed source context</p><ul className="mt-3 space-y-2">{resolution.nearbyContext.slice(0, 5).map((item) => <li key={item.id} className="flex items-start justify-between gap-3 border-b border-line py-2 text-xs last:border-0"><span className="min-w-0 break-words font-semibold">{item.name ?? item.categories.join(" / ")}</span><span className="shrink-0 text-muted">{item.distanceM.toFixed(1)} m</span></li>)}</ul><p className="mt-3 text-[11px] leading-5 text-muted">Straight-line source-geometry distance only. Not routing, travel time, service quality or complete coverage.</p></section> : null}
          </aside>
        </div>
        <p className="mt-5 rounded-2xl border border-[#f2d18d] bg-[#fff9ed] px-4 py-3 text-center text-xs font-semibold leading-5 text-[#7a4d00]">Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.</p>
      </section>
    </main>
  );
}
