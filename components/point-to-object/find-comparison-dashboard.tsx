"use client";
import { VerificationExport, useVerificationCapture } from "./verification-export";

import { useEffect, useMemo, useRef, useState } from "react";
import { LiveObjectMap } from "./live-object-map";

import { PointObjectIcon } from "@/components/point-to-object/point-object-icons";
import { useModalShell } from "@/components/point-to-object/use-modal-shell";
import { pointObjectFindCandidateResultKind, type PointObjectFindCandidate, type PointObjectFindResult } from "@/src/lib/prototype/point-to-object-find-contract";
import type { LiveResolvedObjectContext } from "./live-types";
import { parseLiveResolvedObject } from "./live-session";
import { CONTEXT_GROUP_LABELS, normalizedResolvedContext, type PointObjectNormalizedContext } from "@/src/lib/prototype/point-to-object-normalized-context";
import { publicEvidenceReceiptIsCurrent } from "@/src/lib/prototype/point-to-object-evidence-receipt";
import { nominatimLocale } from "@/src/lib/prototype/point-to-object-markets";
import { parsePointObjectComparisonInsightDetailed, comparisonInsightMatchesSubmission, type PointObjectComparisonInsight } from "@/src/lib/prototype/point-to-object-comparison-core";
import { requestPointObjectComparison, PointObjectComparisonRequestError, comparisonFailureDiagnostic, type PointObjectComparisonDiagnostic } from "@/src/lib/prototype/point-to-object-comparison-request";
import { boundPointObjectComparisonInsight } from "@/src/lib/prototype/point-to-object-comparison-state";
import { pointObjectSourceFailure, sourceFailureMessage, sourceRetryAfterSeconds } from "@/src/lib/prototype/point-to-object-source-recovery";
import { PointObjectContextDashboard } from "./context-dashboard";

type Props = {
  verificationEnabled?: boolean;
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

/** Presentation only: aligned observations are not a current or exhaustive inventory.
 * Keep the existing source/AI admission contracts independent of this explanation. */
export function comparisonMetricComparability(contexts: Array<PointObjectNormalizedContext | null>, metricId: string, locale: Props["locale"]): { comparable: boolean; explanation: string } {
  const ru = locale === "ru";
  const blocked = (en: string, russian: string) => ({ comparable: false, explanation: ru ? russian : en });
  if (contexts.length < 2 || contexts.some(context => !context || context.coverage === "unavailable")) return blocked("Not comparable: at least one candidate has no held context sample.", "Несопоставимо: у одного из кандидатов нет сохранённой выборки окружения.");
  const snapshots = contexts as PointObjectNormalizedContext[];
  if (snapshots.some(context => context.capReached || context.coverage === "partial")) return blocked("Not comparable: a sample reached its cap; totals may be truncated.", "Несопоставимо: достигнут предел выборки; количества могут быть усечены.");
  const first = snapshots[0];
  if (snapshots.some(context => context.version !== first.version || context.source.name !== first.source.name || context.scope.kind !== "point_radius" || context.scope.radiusM !== first.scope.radiusM) || !first.scope.radiusM) return blocked("Not comparable: source definitions or query scopes differ or are unknown.", "Несопоставимо: определения источника или области запросов различаются либо неизвестны.");
  if (snapshots.some(context => !context.source.responseHash || !/^[a-f0-9]{64}$/.test(context.source.responseHash))) return blocked("Not comparable: a context source fingerprint is missing; legacy observations are retained only.", "Несопоставимо: нет отпечатка источника окружения; старые наблюдения только сохранены.");
  const acquired = snapshots.map(context => Date.parse(context.source.acquiredAt ?? ""));
  if (acquired.some(time => !Number.isFinite(time))) return blocked("Not comparable: a context acquisition time is unknown.", "Несопоставимо: время получения окружения неизвестно.");
  if (Math.max(...acquired) - Math.min(...acquired) > 15 * 60_000) return blocked("Not comparable: context acquisitions are more than 15 minutes apart.", "Несопоставимо: данные окружения получены с разницей более 15 минут.");
  const observed = snapshots.map(context => context.source.observedAt === null ? null : Date.parse(context.source.observedAt));
  const knownObserved = observed.filter((time): time is number => time !== null);
  if (knownObserved.some(time => !Number.isFinite(time)) || knownObserved.length > 1 && Math.max(...knownObserved) - Math.min(...knownObserved) > 15 * 60_000) return blocked("Not comparable: reported source update times differ by more than 15 minutes or are invalid.", "Несопоставимо: указанные времена обновления источника различаются более чем на 15 минут либо некорректны.");
  const metrics = snapshots.map(context => context.metrics.find(metric => metric.id === metricId));
  if (metrics.some(metric => !metric || metric.status !== "derived" || metric.value === null || !Number.isFinite(metric.value))) return blocked("Not comparable: this metric is unknown or unavailable for a candidate; no delta or ranking.", "Несопоставимо: параметр одного из кандидатов неизвестен или недоступен; без разницы и ранжирования.");
  if (metrics.some(metric => metric!.unit !== metrics[0]!.unit || metric!.method !== metrics[0]!.method)) return blocked("Not comparable: metric units or calculation methods differ.", "Несопоставимо: единицы или методы расчёта различаются.");
  return { comparable: true, explanation: ru
    ? `Сопоставимы только ограниченные выборки: одинаковые метод и радиус, получение в пределах 15 минут. ${knownObserved.length === snapshots.length ? "Указанные обновления источника согласованы; это не гарантия актуальности." : "Свежесть источника неизвестна хотя бы для одного кандидата."}`
    : `Comparable bounded samples only: same method and radius, acquisitions within 15 minutes. ${knownObserved.length === snapshots.length ? "Reported source updates are aligned, not a guarantee of current data." : "Source freshness is unknown for at least one candidate."}` };
}

export function comparisonSnapshotAge(acquiredAt: string | null, asOfMs: number | null, locale: Props["locale"]): string {
  const acquiredMs = Date.parse(acquiredAt ?? "");
  if (!Number.isFinite(acquiredMs) || asOfMs === null) return locale === "ru" ? "Возраст неизвестен" : "Age unknown";
  if (!Number.isFinite(asOfMs) || acquiredMs > asOfMs) return locale === "ru" ? "Несогласованное время" : "Inconsistent timestamp";
  const minutes = Math.floor((asOfMs - acquiredMs) / 60_000);
  if (minutes < 1) return locale === "ru" ? "Менее 1 мин" : "Less than 1 min";
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), remainder = minutes % 60;
  return locale === "ru" ? `${days ? `${days} д ` : ""}${hours ? `${hours} ч ` : ""}${remainder} мин` : `${days ? `${days} d ` : ""}${hours ? `${hours} h ` : ""}${remainder} min`;
}

function ComparisonContextLineage({ context, locale, asOfMs }: { context: PointObjectNormalizedContext | null; locale: Props["locale"]; asOfMs: number | null }) {
  const ru = locale === "ru";
  if (!context) return <span>{ru ? "Снимок окружения недоступен" : "Context snapshot unavailable"}</span>;
  const date = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? <time dateTime={value} title={value}>{value}</time> : (ru ? "Неизвестно" : "Unknown");
  return <details className="max-w-[320px] break-words text-xs leading-5 font-normal" data-testid={`comparison-context-lineage-${context.subjectId}`}>
    <summary className="min-h-11 cursor-pointer rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-[#087f8c]" title={context.source.responseHash ?? undefined}>
      {comparisonSnapshotAge(context.source.acquiredAt, asOfMs, locale)} · {context.source.responseHash ? `${context.source.responseHash.slice(0, 10)}…` : (ru ? "Отпечаток неизвестен" : "Fingerprint unknown")}
    </summary>
    <dl className="space-y-2">
      <div><dt className="font-semibold">{ru ? "Получено окружение" : "Context acquired"}</dt><dd className="break-all">{date(context.source.acquiredAt)}</dd></div>
      <div><dt className="font-semibold">{ru ? "Обновление источника" : "Source update"}</dt><dd className="break-all">{date(context.source.observedAt)}</dd></div>
      <div><dt className="font-semibold">{ru ? "Отпечаток ответа окружения" : "Context response fingerprint"}</dt><dd className="break-all" title={context.source.responseHash ?? undefined}>{context.source.responseHash ?? (ru ? "Неизвестно; старый снимок" : "Unknown; legacy snapshot")}</dd></div>
      <div><dt className="font-semibold">{ru ? "Возраст рассчитан на" : "Age calculated as of"}</dt><dd className="break-all">{date(asOfMs === null ? null : new Date(asOfMs).toISOString())}</dd></div>
    </dl>
    <p className="mt-2">{ru ? "Возраст получения не подтверждает свежесть объектов OSM. Снимок исторический; новый запрос — только через явное обновление." : "Acquisition age does not establish OSM feature freshness. This is a held snapshot; a new request requires explicit refresh."}</p>
  </details>;
}

export function FindComparisonDashboard({ locale, result, candidates, roleLabel, scenarioLabel, role, scenario, contexts, insight, stale, onContextResolved, onInsight, groupLabel, onBackToComparison, onBackToResults, onShowMap, onOpenAnalysis, verificationEnabled = false }: Props) {
  const verification = useVerificationCapture(verificationEnabled);
  const dialogRef = useModalShell(onBackToComparison);
  const ru = locale === "ru";
  const [activeId, setActiveId] = useState<string | null>(candidates[0]?.sourceFeatureId ?? null);
  const levelsCoverage = candidates.filter((candidate) => candidate.mappedBuildingLevels !== null).length;
  const [phase, setPhase] = useState<"idle" | "sources" | "ai">("idle");
  const [error, setError] = useState<string | null>(null);
  const [failureDiagnostic, setFailureDiagnostic] = useState<PointObjectComparisonDiagnostic | null>(null);
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
  // Capture the display clock only after hydration or a held-context update.
  // Locale/view renders must neither reacquire evidence nor start a timer.
  const [displayedAtMs, setDisplayedAtMs] = useState<number | null>(null);
  useEffect(() => { setDisplayedAtMs(Date.now()); }, [contexts]);
  const normalizedContexts = candidates.map(candidate => {
    const context = currentContext(candidate);
    return context ? normalizedResolvedContext(context) : null;
  });

  async function loadContexts() {
    if (controllerRef.current || stale || Date.now() < cooldownUntil) return;
    const controller = new AbortController(); controllerRef.current = controller; setPhase("sources"); setError(null);
    try {
      for (const candidate of candidates) {
        const submittedIntent = { caseKey: result.criteria.marketKey, longitude: candidate.longitude, latitude: candidate.latitude, locale, expectedSourceFeatureId: candidate.sourceFeatureId };
        const captureResponse = verification.begin("context", submittedIntent, { cohort: result });
        // This is an explicit refresh, including after a server cache miss.
        // A current browser receipt does not prove the server still has its pack.
        const response = await fetch("/api/prototype/point-to-object/context", { method: "POST", headers: {"Content-Type":"application/json"}, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18_000)]), body: JSON.stringify(submittedIntent) });
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
        captureResponse(payload);
      }
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : (ru ? "Не удалось получить окружение." : "Could not load surroundings.")); }
    finally { if (controllerRef.current === controller) { controllerRef.current=null; setPhase("idle"); } }
  }

  function buildComparisonIntent() {
    const frozen = candidates.map(candidate => ({ longitude: candidate.longitude, latitude: candidate.latitude, expectedSourceFeatureId: candidate.sourceFeatureId, evidenceReceipt: readyContext(candidate)!.evidenceReceipt! }));
    return { caseKey: result.criteria.marketKey, longitude: frozen[0].longitude, latitude: frozen[0].latitude, locale, role, scenario, depth: "standard", goal: "development_screening", perspective: "developer", horizon: "current", question: null, expectedSourceFeatureId: frozen[0].expectedSourceFeatureId, evidenceReceipt: frozen[0].evidenceReceipt, comparison: frozen, consent: true };
  }

  async function runComparison() {
    if (!ready || controllerRef.current || matchedInsight) return;
    const controller=new AbortController(); controllerRef.current=controller; setPhase("ai"); setError(null);
    setFailureDiagnostic(null);
    const startedAt = Date.now();
    try {
      const submittedIntent = buildComparisonIntent();
      const frozen = submittedIntent.comparison;
      const submittedSource = { cohort: result, contexts: candidates.map(candidate => readyContext(candidate)) };
      const captureResponse = verification.begin("compare", submittedIntent, submittedSource);
      const response=await requestPointObjectComparison({signal:controller.signal,payload:submittedIntent,onDiagnostic: diagnostic => { if (!controller.signal.aborted) setFailureDiagnostic(diagnostic); }});
      if (controller.signal.aborted) return;
      const validation=response.ok ? parsePointObjectComparisonInsightDetailed(response.payload) : null;
      const parsed=validation?.content ?? null;
      const expectedSnapshots = frozen.map(candidate => ({ sourceFeatureId: candidate.expectedSourceFeatureId, evidencePackHash: candidate.evidenceReceipt.evidencePackHash, label: contexts[candidate.expectedSourceFeatureId]?.name }));
      if (!comparisonInsightMatchesSubmission(parsed,{locale,role,scenario},expectedSnapshots)) {
        const diagnostic = response.diagnostic ?? comparisonFailureDiagnostic(submittedIntent,"validation",response.status,parsed ? "COMPARISON_RESPONSE_MISMATCH" : validation?.rejectionCode ?? "COMPARISON_RESPONSE_REJECTED",Date.now()-startedAt);
        setFailureDiagnostic(diagnostic);
        throw new Error(response.status===409 ? (ru ? "Обновите снимки кандидатов перед AI-сравнением." : "Refresh candidate snapshots before AI comparison.") : diagnostic.code === "AI_TIMEOUT" ? (ru ? "AI-сервис завершил запрос по таймауту. Исходные данные сохранены." : "The AI service timed out. Source data is preserved.") : (ru ? "AI-сравнение не завершилось; исходные данные сохранены." : "AI comparison did not complete; source data is preserved."));
      }
      onInsight(parsed);
      captureResponse(response.payload);
    } catch(cause) { if(!controller.signal.aborted) setError(cause instanceof PointObjectComparisonRequestError ? cause.code === "timeout" ? (ru ? "Время ожидания истекло. Данные сохранены; можно повторить запуск." : "Request timed out. Source data is preserved; you can start again.") : (ru ? "AI-сравнение сейчас недоступно. Попробуйте позднее." : "AI comparison is unavailable. Try again later.") : cause instanceof Error ? cause.message : (ru ? "AI-сравнение недоступно." : "AI comparison unavailable.")); }
    finally { if(controllerRef.current===controller){controllerRef.current=null;setPhase("idle");} }
  }
  const sourceTime = useMemo(() => {
    const timestamp = new Date(result.source.acquiredAt);
    return Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  }, [locale, result.source.acquiredAt]);

  return (
    <section ref={dialogRef} className="fixed inset-0 z-[70] overflow-y-auto bg-[#f4fbfb] text-ink" role="dialog" aria-modal="true" aria-labelledby="find-comparison-dashboard-title" data-testid="find-full-comparison-dashboard">
      <VerificationExport enabled={verificationEnabled} locale={locale} preSubmit={ready ? { operation: "compare", intent: buildComparisonIntent(), sourceSnapshot: { cohort: result, contexts: candidates.map(candidate => readyContext(candidate)) } } : null} records={verification.records} captureRefused={verification.captureRefused} currentSelection={{ mode: "compare", marketKey: result.criteria.marketKey, locale, candidateIds: candidates.map(candidate => candidate.sourceFeatureId) }} />
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
          {error && failureDiagnostic ? <details className="mt-2 min-w-0 rounded-xl border border-line p-3 text-xs" data-testid="comparison-failure-diagnostic">
            <summary className="min-h-11 cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2">{ru ? "Диагностика запроса" : "Request diagnostics"} · {failureDiagnostic.httpStatus ?? "—"} · {failureDiagnostic.code}</summary>
            <p className="mt-2 text-muted">{ru ? "Код показывает этап и причину отказа проверки; это не AI-результат. Стоимость этого запроса не установлена." : "The code identifies the failure stage and rejection category; this is not an AI result. The cost of this request is not established."}</p>
            <pre className="mt-2 max-w-full whitespace-pre-wrap break-all" data-testid="comparison-failure-json">{JSON.stringify(failureDiagnostic,null,2)}</pre>
          </details> : null}
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f4fbfb] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#667085]">{ru ? "Объекты" : "Candidates"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{candidates.length}</dd></div>
            <div className="rounded-2xl bg-[#f4fbfb] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#667085]">{ru ? "Область выборки" : "Sample area"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{result.coverage.approximateAreaSqKm.toLocaleString(locale, { maximumFractionDigits: 2 })}<span className="ml-1 text-sm">{ru ? "км²" : "km²"}</span></dd></div>
            <div className="rounded-2xl bg-[#f4fbfb] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#667085]">{ru ? "Этажность указана" : "Levels mapped"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{levelsCoverage}/{candidates.length}</dd></div>
          </dl>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <section className="min-w-0 rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7" aria-labelledby="common-metrics-title">
            <div className="flex items-center gap-2"><PointObjectIcon name="compare" className="h-5 w-5 text-[#087f8c]" /><h2 id="common-metrics-title" className="text-xl font-bold">{ru ? "Общие наблюдаемые параметры" : "Common observed metrics"}</h2></div>
            <p className="mt-2 text-xs leading-5 text-muted">{ru ? "Сравниваются только сохранённые наблюдения, не доступность, вместимость или экономика. Разные области, пределы выборки и неизвестные параметры не дают разницы или рейтинга." : "Compare held observations only, not availability, capacity or economics. Different scopes, sample caps and unknown metrics do not support a delta or ranking."}</p>
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
                    { label: ru ? "Дата, возраст и источник окружения" : "Context date, age and source", value: (candidate: PointObjectFindCandidate) => <ComparisonContextLineage context={normalizedContexts[candidates.indexOf(candidate)]} locale={locale} asOfMs={displayedAtMs} /> },
                    { label: ru ? "Покрытие окружения" : "Surroundings coverage", value: (candidate: PointObjectFindCandidate) => { const context=currentContext(candidate); return !context || context.geoContext.coverage!=="available" ? (ru ? "Недоступно" : "Unavailable") : context.geoContext.capReached ? (ru ? "Частично · предел выборки" : "Partial · sample cap") : `${context.geoContext.sampleSize} ${ru ? "записей · 400 м" : "records · 400 m"}`; } },
                    ...(["transport","retail_daily_needs","education","healthcare","open_space"] as const).map(group=>({label:CONTEXT_GROUP_LABELS[locale][group],group,value:(candidate:PointObjectFindCandidate)=>{const context=currentContext(candidate); if(!context || context.geoContext.coverage!=="available") return "—"; const metrics=normalizedResolvedContext(context).metrics; const count=metrics.find(m=>m.id===`${group}.count`)?.value; const distance=metrics.find(m=>m.id===`${group}.nearest`)?.value; return `${count ?? "—"} ${ru ? "зап." : "records"}${distance==null ? "" : ` · ${distance} ${ru ? "м по прямой" : "m straight-line"}`}`;}}))
                  ].map((row) => <tr key={row.label} className="border-b border-line last:border-b-0"><th scope="row" className="p-3 text-xs font-semibold text-muted">{row.label}{"group" in row ? ["count", "nearest"].map(kind => {
                    const metricId = `${row.group}.${kind}`;
                    const assessment = comparisonMetricComparability(normalizedContexts, metricId, locale);
                    return <details key={kind} className="mt-2 max-w-[240px] break-words text-[11px] font-normal leading-5" data-testid={`comparison-comparability-${metricId}`}>
                      <summary className="min-h-11 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-[#087f8c]" title={assessment.explanation}><strong>{kind === "count" ? (ru ? "Количество" : "Count") : (ru ? "Близость" : "Proximity")}: </strong>{assessment.comparable ? (ru ? "Только выборки" : "Samples only") : (ru ? "Несопоставимо" : "Not comparable")}</summary>
                      <p>{assessment.explanation}</p>
                    </details>;
                  }) : null}</th>{candidates.map((candidate) => <td key={candidate.sourceFeatureId} className="p-3 align-top font-semibold text-[#344054]">{row.value(candidate)}</td>)}</tr>)}
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
