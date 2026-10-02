"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LiveObjectMap } from "./live-object-map";

import { PointObjectIcon } from "@/components/point-to-object/point-object-icons";
import { useModalShell } from "@/components/point-to-object/use-modal-shell";
import { pointObjectFindCandidateResultKind, type PointObjectFindCandidate, type PointObjectFindResult } from "@/src/lib/prototype/point-to-object-find-contract";
import type { LiveResolvedObjectContext } from "./live-types";
import { parseLiveResolvedObject } from "./live-session";
import { CONTEXT_GROUP_LABELS, normalizedResolvedContext } from "@/src/lib/prototype/point-to-object-normalized-context";
import { publicEvidenceReceiptIsCurrent } from "@/src/lib/prototype/point-to-object-evidence-receipt";
import { nominatimLocale } from "@/src/lib/prototype/point-to-object-markets";
import { parsePointObjectComparisonInsight, type PointObjectComparisonInsight } from "@/src/lib/prototype/point-to-object-comparison-core";
import { requestPointObjectComparison, PointObjectComparisonRequestError } from "@/src/lib/prototype/point-to-object-comparison-request";
import { boundPointObjectComparisonInsight } from "@/src/lib/prototype/point-to-object-comparison-state";
import { pointObjectSourceFailure, sourceFailureMessage, sourceRetryAfterSeconds } from "@/src/lib/prototype/point-to-object-source-recovery";
import { PointObjectContextDashboard } from "./context-dashboard";

type Props = {
  locale: "en" | "ru";
  result: PointObjectFindResult;
  candidates: PointObjectFindCandidate[];
  roleLabel: string;
  scenarioLabel: string;
  role: string;
  scenario: string;
  contexts: Record<string, LiveResolvedObjectContext>;
  insight: PointObjectComparisonInsight | null;
  stale?: boolean;
  onContextResolved: (id: string, context: LiveResolvedObjectContext) => void;
  onInsight: (insight: PointObjectComparisonInsight) => void;
  groupLabel: (candidate: PointObjectFindCandidate) => string;
  onBackToComparison: () => void;
  onBackToResults: () => void;
  onShowMap: () => void;
  onOpenAnalysis: (candidate: PointObjectFindCandidate) => void;
};

function locality(candidate: PointObjectFindCandidate): string | null {
  return candidate.observedTags["addr:district"] ?? candidate.observedTags["addr:suburb"] ?? candidate.observedTags["addr:city"] ?? null;
}

function mappedSubtype(candidate: PointObjectFindCandidate): string {
  return candidate.matchedTag.value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function CandidateMapContext({ candidates, locale, marketKey, activeId, onSelect }: Pick<Props, "candidates" | "locale"> & { marketKey: PointObjectFindResult["criteria"]["marketKey"]; activeId: string | null; onSelect: (id: string) => void }) {
  const results = useMemo(() => candidates.map((candidate,index) => ({
    id:candidate.sourceFeatureId, label:candidate.label, number:index+1, longitude:candidate.longitude, latitude:candidate.latitude,
    geometry:candidate.geometry ?? null, geometryProvenance:candidate.geometryProvenance ?? null,
    renderHeightM:candidate.renderHeightM ?? null, renderMinHeightM:candidate.renderMinHeightM ?? null,
    resultKind:pointObjectFindCandidateResultKind(candidate)
  })),[candidates]);
  const target = useMemo(() => {
    const points = candidates.flatMap(candidate => {
      const geometry = candidate.geometry;
      return [[candidate.longitude,candidate.latitude], ...(geometry ? geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2) : [])];
    });
    const xs=points.map(point=>point[0]), ys=points.map(point=>point[1]);
    const west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys);
    return {requestId:`compare:${candidates.map(c=>c.sourceFeatureId).join("|")}`,longitude:(west+east)/2,latitude:(south+north)/2,
      boundingBox:[south,north,west,east] as [number,number,number,number],selectAfterNavigation:false,viewMode:"2d" as const,zoom:18};
  },[candidates]);
  return <figure className="min-w-0 rounded-[22px] border border-[#d7dee4] bg-[#f4fbfb] p-4" data-testid="find-comparison-map-context">
    <figcaption className="mb-3 flex items-center gap-2 text-sm font-bold text-[#344054]"><PointObjectIcon name="map" className="h-5 w-5 text-[#087f8c]" />{locale === "ru" ? "Объекты на карте" : "Candidates on the map"}</figcaption>
    <div className="h-[420px] overflow-hidden rounded-2xl">
      <LiveObjectMap locationKey={marketKey} interactionMode="find" onSelection={ignoreSelection} navigationTarget={target}
        findResults={results} activeFindResultId={activeId} onFindResultSelect={onSelect} className="h-full min-h-0" />
    </div>
    <ol className="mt-3 grid gap-2">{candidates.map((candidate,index)=><li key={candidate.sourceFeatureId}>
      <button type="button" aria-pressed={activeId===candidate.sourceFeatureId} onClick={()=>onSelect(candidate.sourceFeatureId)}
        className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs focus-visible:outline-2 focus-visible:outline-[#087f8c] ${activeId===candidate.sourceFeatureId ? "border-[#087f8c] bg-white font-bold" : "border-transparent"}`}>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#087f8c] text-white">{index+1}</span>
        <span className="min-w-0 break-words">{candidate.label}<span className="block font-normal text-[#667085]">{candidate.sourceFeatureId} · {candidate.geometry ? (locale==="ru"?"Контур OSM":"OSM footprint") : (locale==="ru"?"Точка; контур недоступен":"Point; footprint unavailable")}</span></span>
      </button></li>)}</ol>
    <p className="mt-3 text-[11px] leading-5 text-[#667085]">{locale==="ru"?"Контуры и точки OSM, не официальные границы. Разнесённые номера остаются связаны с исходными координатами.":"OSM footprints and points, not official boundaries. Separated number controls remain linked to source coordinates."}</p>
  </figure>;
}
const ignoreSelection = () => undefined;

export function FindComparisonDashboard({ locale, result, candidates, roleLabel, scenarioLabel, role, scenario, contexts, insight, stale, onContextResolved, onInsight, groupLabel, onBackToComparison, onBackToResults, onShowMap, onOpenAnalysis }: Props) {
  const dialogRef = useModalShell(onBackToComparison);
  const ru = locale === "ru";
  const [activeId, setActiveId] = useState<string | null>(candidates[0]?.sourceFeatureId ?? null);
  const levelsCoverage = candidates.filter((candidate) => candidate.mappedBuildingLevels !== null).length;
  const [phase, setPhase] = useState<"idle" | "sources" | "ai">("idle");
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => { controllerRef.current?.abort(); }, [locale, role, scenario, candidates]);
  const currentContext = (candidate: PointObjectFindCandidate) => {
    const context = contexts[candidate.sourceFeatureId];
    return context?.sourceFeatureId === candidate.sourceFeatureId && context.coordinateAssociation === "trusted_open_map_identity" ? context : null;
  };
  const readyContext = (candidate: PointObjectFindCandidate) => {
    const context = currentContext(candidate);
    return context && publicEvidenceReceiptIsCurrent(context.evidenceReceipt) && context.evidenceReceipt?.sourceLocale === nominatimLocale(locale) && context.evidenceReceipt.lookupSourceFeatureId === candidate.sourceFeatureId && context.geoContext.coverage === "available" && context.geoContext.sampleSize > 0 && !context.geoContext.capReached && context.normalizedContext?.source.acquiredAt && Number.isFinite(Date.parse(context.normalizedContext.source.acquiredAt)) ? context : null;
  };
  const ready = !stale && candidates.every(candidate => readyContext(candidate));
  const matchedInsight = !stale ? boundPointObjectComparisonInsight(insight, { locale, role, scenario }, candidates, contexts) : null;

  async function loadContexts() {
    if (controllerRef.current || stale || Date.now() < cooldownUntil) return;
    const controller = new AbortController(); controllerRef.current = controller; setPhase("sources"); setError(null);
    try {
      for (const candidate of candidates) {
        // This is an explicit refresh, including after a server cache miss.
        // A current browser receipt does not prove the server still has its pack.
        const response = await fetch("/api/prototype/point-to-object/context", { method: "POST", headers: {"Content-Type":"application/json"}, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18_000)]), body: JSON.stringify({caseKey:result.criteria.marketKey,longitude:candidate.longitude,latitude:candidate.latitude,locale,expectedSourceFeatureId:candidate.sourceFeatureId}) });
        const payload: unknown = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          const seconds = response.status === 429 ? sourceRetryAfterSeconds(response.headers.get("retry-after")) : 0;
          if (seconds) setCooldownUntil(Date.now()+seconds*1_000);
          throw new Error(sourceFailureMessage(pointObjectSourceFailure(response.status,payload),seconds,locale));
        }
        const context = payload && typeof payload === "object" && "mode" in payload && payload.mode === "resolved" && "subject" in payload ? parseLiveResolvedObject(payload.subject) : null;
        if (!context || context.sourceFeatureId !== candidate.sourceFeatureId || context.coordinateAssociation !== "trusted_open_map_identity" || context.evidenceReceipt?.lookupSourceFeatureId !== candidate.sourceFeatureId) throw new Error(ru ? "Точная запись кандидата не подтверждена." : "The candidate's exact source record was not confirmed.");
        onContextResolved(candidate.sourceFeatureId,context);
      }
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : (ru ? "Не удалось получить окружение." : "Could not load surroundings.")); }
    finally { if (controllerRef.current === controller) { controllerRef.current=null; setPhase("idle"); } }
  }

  async function runComparison() {
    if (!ready || controllerRef.current || matchedInsight) return;
    const controller=new AbortController(); controllerRef.current=controller; setPhase("ai"); setError(null);
    try {
      const frozen=candidates.map(candidate => ({longitude:candidate.longitude,latitude:candidate.latitude,expectedSourceFeatureId:candidate.sourceFeatureId,evidenceReceipt:readyContext(candidate)!.evidenceReceipt!}));
      const response=await requestPointObjectComparison({signal:controller.signal,payload:{caseKey:result.criteria.marketKey,longitude:frozen[0].longitude,latitude:frozen[0].latitude,locale,role,scenario,depth:"standard",goal:"development_screening",perspective:"developer",horizon:"current",question:null,expectedSourceFeatureId:frozen[0].expectedSourceFeatureId,evidenceReceipt:frozen[0].evidenceReceipt,comparison:frozen,consent:true}});
      if (controller.signal.aborted) return;
      const parsed=response.ok ? parsePointObjectComparisonInsight(response.payload) : null;
      if (!parsed || parsed.locale!==locale || parsed.role!==role || parsed.scenario!==scenario || parsed.snapshots.length!==frozen.length || !parsed.snapshots.every(snapshot=>frozen.some(candidate=>candidate.expectedSourceFeatureId===snapshot.sourceFeatureId && candidate.evidenceReceipt.evidencePackHash===snapshot.evidencePackHash && contexts[candidate.expectedSourceFeatureId]?.name === snapshot.label))) throw new Error(response.status===409 ? (ru ? "Обновите снимки кандидатов перед AI-сравнением." : "Refresh candidate snapshots before AI comparison.") : (ru ? "AI-сравнение не завершилось; исходные данные сохранены." : "AI comparison did not complete; source data is preserved."));
      onInsight(parsed);
    } catch(cause) { if(!controller.signal.aborted) setError(cause instanceof PointObjectComparisonRequestError ? cause.code === "timeout" ? (ru ? "Время ожидания истекло. Данные сохранены; можно повторить запуск." : "Request timed out. Source data is preserved; you can start again.") : (ru ? "AI-сравнение сейчас недоступно. Попробуйте позднее." : "AI comparison is unavailable. Try again later.") : cause instanceof Error ? cause.message : (ru ? "AI-сравнение недоступно." : "AI comparison unavailable.")); }
    finally { if(controllerRef.current===controller){controllerRef.current=null;setPhase("idle");} }
  }
  const sourceTime = useMemo(() => {
    const timestamp = new Date(result.source.acquiredAt);
    return Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  }, [locale, result.source.acquiredAt]);

  return (
    <section ref={dialogRef} className="fixed inset-0 z-[70] overflow-y-auto bg-[#f4fbfb] text-ink" role="dialog" aria-modal="true" aria-labelledby="find-comparison-dashboard-title" data-testid="find-full-comparison-dashboard">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <button data-modal-initial-focus type="button" onClick={onBackToComparison} className="min-h-11 rounded-xl border border-[#e5fafa] bg-white px-4 text-sm font-bold text-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">← {ru ? "К краткому сравнению" : "Back to compact comparison"}</button>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={onBackToResults} className="min-h-11 rounded-xl px-4 text-sm font-bold text-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{ru ? "К результатам" : "Back to results"}</button><button type="button" onClick={onShowMap} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2"><PointObjectIcon name="map" className="h-4 w-4" />{ru ? "На карту" : "Show map"}</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
        <section className="rounded-[24px] border border-[#d7dee4] bg-white p-5 shadow-soft sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{ru ? "СРАВНИТЕЛЬНЫЙ СКРИНИНГ" : "COMPARATIVE SCREENING"}</p>
          <h1 id="find-comparison-dashboard-title" className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{ru ? "Сравнение выбранных объектов" : "Compare selected candidates"}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{roleLabel} · {scenarioLabel}.</p>
          <p className="mt-3 inline-flex rounded-full bg-[#e5fafa] px-3 py-1.5 text-xs font-bold text-[#344054]" data-testid="find-comparison-basis">{ru ? "Основа: наблюдаемые данные OSM · AI-синтез запускается отдельно" : "Basis: observed OSM data · AI synthesis runs separately"}</p>
          <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={()=>void loadContexts()} disabled={phase!=="idle" || stale} data-testid="comparison-load-context" className="min-h-11 rounded-xl border border-[#d7dee4] bg-white px-4 text-sm font-bold text-[#087f8c] disabled:opacity-50">{phase==="sources" ? (ru ? "Получаем окружение…" : "Loading surroundings…") : (ru ? "Обновить данные окружения" : "Refresh surroundings data")}</button><button type="button" onClick={()=>void runComparison()} disabled={!ready || phase!=="idle" || Boolean(matchedInsight)} data-testid="comparison-run-ai" className="min-h-11 rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white disabled:bg-[#b7c4d7]">{phase==="ai" ? (ru ? "Выполняем AI-сравнение…" : "Running AI comparison…") : matchedInsight ? (ru ? "AI-сравнение сохранено" : "AI comparison saved") : (ru ? "Запустить AI-сравнение" : "Run AI comparison")}</button></div>
          {!ready ? <p className="mt-2 text-xs leading-5 text-muted">{stale ? (ru ? "Обновите поиск после изменения условий." : "Update the search after changing criteria.") : (ru ? "Для AI нужны точные записи и непустые снимки окружения всех кандидатов без достигнутого предела выборки. Получение данных не запускает AI." : "AI needs exact records and nonempty, uncapped surroundings snapshots for every candidate. Loading data does not run AI.")}</p> : null}
          {error ? <p className="mt-3 text-sm text-[#79520d]" role="alert">{error}</p> : null}
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f4fbfb] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#667085]">{ru ? "Объекты" : "Candidates"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{candidates.length}</dd></div>
            <div className="rounded-2xl bg-[#f4fbfb] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#667085]">{ru ? "Область выборки" : "Sample area"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{result.coverage.approximateAreaSqKm.toLocaleString(locale, { maximumFractionDigits: 2 })}<span className="ml-1 text-sm">{ru ? "км²" : "km²"}</span></dd></div>
            <div className="rounded-2xl bg-[#f4fbfb] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#667085]">{ru ? "Этажность указана" : "Levels mapped"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{levelsCoverage}/{candidates.length}</dd></div>
          </dl>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <section className="min-w-0 rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7" aria-labelledby="common-metrics-title">
            <div className="flex items-center gap-2"><PointObjectIcon name="compare" className="h-5 w-5 text-[#087f8c]" /><h2 id="common-metrics-title" className="text-xl font-bold">{ru ? "Общие наблюдаемые параметры" : "Common observed metrics"}</h2></div>
            <div className="mt-4 overflow-x-auto" role="region" aria-label={ru ? "Таблица сравнения" : "Comparison table"} tabIndex={0}>
              <table className="min-w-[680px] w-full border-collapse text-left text-sm">
                <thead><tr className="border-b border-line"><th className="p-3 text-xs text-muted">{ru ? "Параметр" : "Metric"}</th>{candidates.map((candidate, index) => <th key={candidate.sourceFeatureId} className={`p-3 align-bottom ${activeId === candidate.sourceFeatureId ? "bg-[#f4fbfb]" : ""}`}><button type="button" aria-pressed={activeId === candidate.sourceFeatureId} onClick={() => setActiveId(candidate.sourceFeatureId)} className="min-h-11 text-left focus-visible:outline-2 focus-visible:outline-[#087f8c]"><span className="mr-2 inline-grid h-5 min-w-5 place-items-center rounded-full bg-[#087f8c] px-1 text-[10px] text-white">{index + 1}</span>{candidate.label}</button></th>)}</tr></thead>
                <tbody>
                  {[
                    { label: ru ? "Запись OSM" : "OSM record", value: (candidate: PointObjectFindCandidate) => candidate.sourceFeatureId },
                    { label: ru ? "Наблюдаемый тип" : "Observed type", value: (candidate: PointObjectFindCandidate) => `${groupLabel(candidate)} · ${mappedSubtype(candidate)}` },
                    { label: ru ? "Семантика записи" : "Record semantics", value: (candidate: PointObjectFindCandidate) => {
                      const kind = pointObjectFindCandidateResultKind(candidate);
                      return kind === "mapped_building_or_landuse" ? (ru ? "Здание / землепользование на карте" : "Mapped building / land use") : kind === "mapped_poi" ? (ru ? "Точка функции на карте" : "Mapped function / POI") : (ru ? "Не определено" : "Not determined");
                    } },
                    { label: ru ? "Этажность на карте" : "Mapped levels", value: (candidate: PointObjectFindCandidate) => candidate.mappedBuildingLevels?.toLocaleString(locale) ?? "—" },
                    { label: ru ? "Район" : "Locality", value: (candidate: PointObjectFindCandidate) => locality(candidate) ?? "—" },
                    { label: ru ? "Покрытие окружения" : "Surroundings coverage", value: (candidate: PointObjectFindCandidate) => { const context=currentContext(candidate); return !context || context.geoContext.coverage!=="available" ? (ru ? "Недоступно" : "Unavailable") : context.geoContext.capReached ? (ru ? "Частично · предел выборки" : "Partial · sample cap") : `${context.geoContext.sampleSize} ${ru ? "записей · 400 м" : "records · 400 m"}`; } },
                    ...(["transport","retail_daily_needs","education","healthcare","open_space"] as const).map(group=>({label:CONTEXT_GROUP_LABELS[locale][group],value:(candidate:PointObjectFindCandidate)=>{const context=currentContext(candidate); if(!context || context.geoContext.coverage!=="available") return "—"; const metrics=normalizedResolvedContext(context).metrics; const count=metrics.find(m=>m.id===`${group}.count`)?.value; const distance=metrics.find(m=>m.id===`${group}.nearest`)?.value; return `${count ?? "—"} ${ru ? "зап." : "records"}${distance==null ? "" : ` · ${distance} ${ru ? "м по прямой" : "m straight-line"}`}`;}}))
                  ].map((row) => <tr key={row.label} className="border-b border-line last:border-b-0"><th scope="row" className="p-3 text-xs font-semibold text-muted">{row.label}</th>{candidates.map((candidate) => <td key={candidate.sourceFeatureId} className="p-3 font-semibold text-[#344054]">{row.value(candidate)}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          </section>
          <CandidateMapContext candidates={candidates} marketKey={result.criteria.marketKey} locale={locale} activeId={activeId} onSelect={setActiveId} />
        </div>

        {matchedInsight ? <section className="rounded-[24px] border border-line bg-white p-5 sm:p-7" data-testid="comparison-ai-insight"><h2 className="text-xl font-bold">{ru ? "AI-синтез по сценарию" : "Scenario AI synthesis"}</h2><p className="mt-3 text-sm leading-6 text-[#344054]">{matchedInsight.summary.statement}</p><ul className="mt-4 space-y-3">{matchedInsight.differences.map((difference,index)=><li key={index} className="rounded-xl bg-[#f4fbfb] p-3 text-sm leading-6">{difference.statement}<span className="mt-1 block break-all text-[11px] text-muted">{difference.evidenceRefs.join(" · ")}</span></li>)}</ul><div className="mt-4 grid gap-3 md:grid-cols-3">{matchedInsight.checks.map((check,index)=><article key={index} className="rounded-xl border border-line p-3"><h3 className="text-xs font-bold text-[#087f8c]">{candidates.find(c=>c.sourceFeatureId===check.candidateId)?.label ?? check.candidateId}</h3><p className="mt-2 text-sm leading-6">{check.action}</p></article>)}</div><p className="mt-3 text-[11px] text-muted">{matchedInsight.telemetry.model} · {new Date(matchedInsight.generatedAt).toLocaleString(locale)} · {ru ? "Один явный запрос на зафиксированных снимках" : "One explicit request on frozen snapshots"}</p></section> : null}
        {currentContext(candidates.find(c=>c.sourceFeatureId===activeId) ?? candidates[0]) ? <PointObjectContextDashboard locale={locale} context={normalizedResolvedContext(currentContext(candidates.find(c=>c.sourceFeatureId===activeId) ?? candidates[0])!)} /> : null}
        <section className="rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7" aria-labelledby="candidate-tradeoffs-title">
          <h2 id="candidate-tradeoffs-title" className="text-xl font-bold">{ru ? "Что различает объекты — и чего не хватает" : "Observed trade-offs and evidence gaps"}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">{candidates.map((candidate, index) => {
            const kind = pointObjectFindCandidateResultKind(candidate);
            const specificGap = candidate.mappedBuildingLevels === null
              ? (ru ? "Этажность не указана в возвращённой записи." : "No mapped levels in the returned record.")
              : kind === "mapped_poi"
                ? (ru ? "Запись POI не подтверждает физический объект недвижимости." : "The POI record does not establish a physical property asset.")
                : null;
            return <article key={candidate.sourceFeatureId} className="flex min-w-0 flex-col rounded-2xl border border-[#d7e2df] bg-[#fbfcfc] p-4"><p className="text-xs font-bold text-[#087f8c]">{index + 1}</p><h3 className="mt-1 break-words text-base font-bold">{candidate.label}</h3><p className="mt-2 text-sm leading-6 text-[#475467]">{kind === "mapped_building_or_landuse" ? (ru ? "OSM показывает физический объект или землепользование. Это полезная пространственная опора для следующей проверки." : "OSM maps a physical object or land use, providing a spatial basis for the next verification step.") : (ru ? "Возвращена функциональная точка OSM: полезный контекст, но не подтверждённый объект недвижимости." : "OSM returned a functional point: useful context, not a confirmed property asset.")}</p>{specificGap ? <p className="mt-3 text-xs leading-5 text-[#667085]">— {specificGap}</p> : null}<button type="button" onClick={() => onOpenAnalysis(candidate)} className="mt-4 min-h-11 rounded-xl border border-[#d7dee4] bg-white px-3 text-sm font-bold text-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{ru ? "Открыть анализ объекта" : "Open object analysis"}</button></article>;
          })}</div>
          <p className="mt-4 text-sm font-semibold text-[#344054]">{ru ? "Следующий шаг: откройте анализ нужного объекта, чтобы проверить его идентичность, окружение и неопределённости на отдельном экране." : "Next step: open an object analysis to review its identity, surroundings and uncertainties on a dedicated screen."}</p>
        </section>

        <details className="rounded-[20px] border border-[#d7dee4] bg-[#f4fbfb] p-4 text-xs leading-5 text-[#667085]">
          <summary className="cursor-pointer font-bold text-[#344054]">{ru ? "Источник и границы данных" : "Source and data boundaries"}</summary>
          <p className="mt-2"><strong>{result.source.name} · {result.source.service}</strong> · {ru ? "получено" : "acquired"} {sourceTime}. {ru ? "Выборка ограничена и не является полным реестром. Доступность, официальные границы, права, планировочный режим и стоимость не установлены." : "This is a bounded sample, not a complete register. Availability, official boundaries, rights, planning controls and valuation are not established."}</p>
          <p className="mt-1">{result.caveat}</p>
        </details>
      </div>
    </section>
  );
}
