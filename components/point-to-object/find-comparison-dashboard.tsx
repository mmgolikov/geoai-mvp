"use client";

import { useMemo } from "react";

import { PointObjectIcon } from "@/components/point-to-object/point-object-icons";
import { useModalShell } from "@/components/point-to-object/use-modal-shell";
import type { PointObjectFindCandidate, PointObjectFindResult } from "@/src/lib/prototype/point-to-object-find-contract";

type Props = {
  locale: "en" | "ru";
  result: PointObjectFindResult;
  candidates: PointObjectFindCandidate[];
  roleLabel: string;
  scenarioLabel: string;
  groupLabel: (candidate: PointObjectFindCandidate) => string;
  onBackToComparison: () => void;
  onBackToResults: () => void;
  onShowMap: () => void;
  onOpenAnalysis: (candidate: PointObjectFindCandidate) => void;
};

function candidateKind(candidate: PointObjectFindCandidate): "mapped_building_or_landuse" | "mapped_poi" | "unknown" {
  if (candidate.matchedTag.key === "building" || candidate.matchedTag.key === "landuse") return "mapped_building_or_landuse";
  if (["office", "shop", "amenity", "tourism"].includes(candidate.matchedTag.key)) return "mapped_poi";
  return "unknown";
}

function locality(candidate: PointObjectFindCandidate): string | null {
  return candidate.observedTags["addr:district"] ?? candidate.observedTags["addr:suburb"] ?? candidate.observedTags["addr:city"] ?? null;
}

function mappedSubtype(candidate: PointObjectFindCandidate): string {
  return candidate.matchedTag.value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function CandidateMapContext({ candidates, bounds, locale }: Pick<Props, "candidates" | "locale"> & { bounds: PointObjectFindResult["criteria"]["bounds"] }) {
  const [west, south, east, north] = bounds;
  const referenceLatitude = ((south + north) / 2) * Math.PI / 180;
  const centerLongitude = (west + east) / 2;
  const centerLatitude = (south + north) / 2;
  const project = (longitude: number, latitude: number) => [
    (longitude - centerLongitude) * 111_320 * Math.max(Math.cos(referenceLatitude), 0.01),
    (latitude - centerLatitude) * 110_540
  ] as const;
  const [minimumX, minimumY] = project(west, south);
  const [maximumX, maximumY] = project(east, north);
  const scale = Math.min(140 / Math.max(maximumX - minimumX, 0.01), 70 / Math.max(maximumY - minimumY, 0.01));
  const points = candidates.map((candidate, index) => ({
    candidate,
    index,
    projected: project(candidate.longitude, candidate.latitude)
  }));
  return (
    <figure className="rounded-[22px] border border-[#cfe0dc] bg-[#edf6f3] p-4" data-testid="find-comparison-map-context">
      <figcaption className="mb-3 flex items-center gap-2 text-sm font-bold text-[#173b35]"><PointObjectIcon name="map" className="h-5 w-5 text-[#087f8c]" />{locale === "ru" ? "Положение в области поиска" : "Position in the search area"}</figcaption>
      <svg viewBox="0 0 160 90" className="aspect-[16/9] w-full overflow-visible rounded-2xl bg-white" role="img" aria-label={locale === "ru" ? "Схема положения сравниваемых объектов в области поиска" : "Diagram of compared candidates within the search area"}>
        <defs><pattern id="comparison-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#dce8e4" strokeWidth=".45" /></pattern></defs>
        <rect x="2" y="2" width="156" height="86" rx="6" fill="url(#comparison-grid)" stroke="#9fc7bd" />
        {points.map(({ candidate, index, projected: [x, y] }) => <g key={candidate.sourceFeatureId} transform={`translate(${Math.min(152, Math.max(8, 80 + x * scale))} ${Math.min(82, Math.max(8, 45 - y * scale))})`}><circle r="5.5" fill="#087f8c" stroke="white" strokeWidth="2" /><text y="1.7" textAnchor="middle" fill="white" fontSize="5" fontWeight="700">{index + 1}</text></g>)}
      </svg>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">{candidates.map((candidate, index) => <li key={candidate.sourceFeatureId} className="flex min-w-0 items-center gap-2 text-xs text-[#475467]"><span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#087f8c] text-[10px] font-bold text-white">{index + 1}</span><span className="truncate">{candidate.label}</span></li>)}</ol>
      <p className="mt-3 text-[11px] leading-5 text-[#62716d]">{locale === "ru" ? "Схема построена по координатам центров из ответа OSM. Это не границы участков или зданий." : "Diagram uses OSM response centroids. It does not show parcel or building boundaries."}</p>
    </figure>
  );
}

export function FindComparisonDashboard({ locale, result, candidates, roleLabel, scenarioLabel, groupLabel, onBackToComparison, onBackToResults, onShowMap, onOpenAnalysis }: Props) {
  const dialogRef = useModalShell(onBackToComparison);
  const ru = locale === "ru";
  const levelsCoverage = candidates.filter((candidate) => candidate.mappedBuildingLevels !== null).length;
  const sourceTime = useMemo(() => {
    const timestamp = new Date(result.source.acquiredAt);
    return Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  }, [locale, result.source.acquiredAt]);

  return (
    <section ref={dialogRef} className="fixed inset-0 z-[70] overflow-y-auto bg-[#f4f7f6] text-ink" role="dialog" aria-modal="true" aria-labelledby="find-comparison-dashboard-title" data-testid="find-full-comparison-dashboard">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <button data-modal-initial-focus type="button" onClick={onBackToComparison} className="min-h-11 rounded-xl border border-[#9fc7bd] bg-white px-4 text-sm font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">← {ru ? "К краткому сравнению" : "Back to compact comparison"}</button>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={onBackToResults} className="min-h-11 rounded-xl px-4 text-sm font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{ru ? "К результатам" : "Back to results"}</button><button type="button" onClick={onShowMap} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2"><PointObjectIcon name="map" className="h-4 w-4" />{ru ? "На карту" : "Show map"}</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
        <section className="rounded-[24px] border border-[#cfe0dc] bg-white p-5 shadow-soft sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{ru ? "СРАВНИТЕЛЬНЫЙ СКРИНИНГ" : "COMPARATIVE SCREENING"}</p>
          <h1 id="find-comparison-dashboard-title" className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{ru ? "Сравнение выбранных объектов" : "Compare selected candidates"}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{roleLabel} · {scenarioLabel}.</p>
          <p className="mt-3 inline-flex rounded-full bg-[#e6f5f1] px-3 py-1.5 text-xs font-bold text-[#176548]" data-testid="find-comparison-basis">{ru ? "Основа: наблюдаемые атрибуты текущей выборки OSM · без отдельного AI-сравнения" : "Basis: observed attributes in this OSM sample · no separate comparison AI run"}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#edf7f3] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#536963]">{ru ? "Объекты" : "Candidates"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{candidates.length}</dd></div>
            <div className="rounded-2xl bg-[#edf7f3] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#536963]">{ru ? "Область выборки" : "Sample area"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{result.coverage.approximateAreaSqKm.toLocaleString(locale, { maximumFractionDigits: 2 })}<span className="ml-1 text-sm">{ru ? "км²" : "km²"}</span></dd></div>
            <div className="rounded-2xl bg-[#edf7f3] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#536963]">{ru ? "Этажность указана" : "Levels mapped"}</dt><dd className="mt-1 text-3xl font-bold tabular-nums text-[#087f8c]">{levelsCoverage}/{candidates.length}</dd></div>
          </dl>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <section className="min-w-0 rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7" aria-labelledby="common-metrics-title">
            <div className="flex items-center gap-2"><PointObjectIcon name="compare" className="h-5 w-5 text-[#087f8c]" /><h2 id="common-metrics-title" className="text-xl font-bold">{ru ? "Общие наблюдаемые параметры" : "Common observed metrics"}</h2></div>
            <div className="mt-4 overflow-x-auto" role="region" aria-label={ru ? "Таблица сравнения" : "Comparison table"} tabIndex={0}>
              <table className="min-w-[680px] w-full border-collapse text-left text-sm">
                <thead><tr className="border-b border-line"><th className="p-3 text-xs text-muted">{ru ? "Параметр" : "Metric"}</th>{candidates.map((candidate, index) => <th key={candidate.sourceFeatureId} className="p-3 align-bottom"><span className="mr-2 inline-grid h-5 min-w-5 place-items-center rounded-full bg-[#087f8c] px-1 text-[10px] text-white">{index + 1}</span>{candidate.label}</th>)}</tr></thead>
                <tbody>
                  {[
                    { label: ru ? "Запись OSM" : "OSM record", value: (candidate: PointObjectFindCandidate) => candidate.sourceFeatureId },
                    { label: ru ? "Наблюдаемый тип" : "Observed type", value: (candidate: PointObjectFindCandidate) => `${groupLabel(candidate)} · ${mappedSubtype(candidate)}` },
                    { label: ru ? "Семантика записи" : "Record semantics", value: (candidate: PointObjectFindCandidate) => candidateKind(candidate) === "mapped_building_or_landuse" ? (ru ? "Здание / землепользование на карте" : "Mapped building / land use") : candidateKind(candidate) === "mapped_poi" ? (ru ? "Точка функции на карте" : "Mapped function / POI") : (ru ? "Не определено" : "Not determined") },
                    { label: ru ? "Этажность на карте" : "Mapped levels", value: (candidate: PointObjectFindCandidate) => candidate.mappedBuildingLevels?.toLocaleString(locale) ?? "—" },
                    { label: ru ? "Район" : "Locality", value: (candidate: PointObjectFindCandidate) => locality(candidate) ?? "—" }
                  ].map((row) => <tr key={row.label} className="border-b border-line last:border-b-0"><th scope="row" className="p-3 text-xs font-semibold text-muted">{row.label}</th>{candidates.map((candidate) => <td key={candidate.sourceFeatureId} className="p-3 font-semibold text-[#344054]">{row.value(candidate)}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          </section>
          <CandidateMapContext candidates={candidates} bounds={result.criteria.bounds} locale={locale} />
        </div>

        <section className="rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7" aria-labelledby="candidate-tradeoffs-title">
          <h2 id="candidate-tradeoffs-title" className="text-xl font-bold">{ru ? "Что различает объекты — и чего не хватает" : "Observed trade-offs and evidence gaps"}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">{candidates.map((candidate, index) => {
            const kind = candidateKind(candidate);
            const specificGap = candidate.mappedBuildingLevels === null
              ? (ru ? "Этажность не указана в возвращённой записи." : "No mapped levels in the returned record.")
              : kind === "mapped_poi"
                ? (ru ? "Запись POI не подтверждает физический объект недвижимости." : "The POI record does not establish a physical property asset.")
                : null;
            return <article key={candidate.sourceFeatureId} className="flex min-w-0 flex-col rounded-2xl border border-[#d7e2df] bg-[#fbfcfc] p-4"><p className="text-xs font-bold text-[#087f8c]">{index + 1}</p><h3 className="mt-1 break-words text-base font-bold">{candidate.label}</h3><p className="mt-2 text-sm leading-6 text-[#475467]">{kind === "mapped_building_or_landuse" ? (ru ? "OSM показывает физический объект или землепользование. Это полезная пространственная опора для следующей проверки." : "OSM maps a physical object or land use, providing a spatial basis for the next verification step.") : (ru ? "Возвращена функциональная точка OSM: полезный контекст, но не подтверждённый объект недвижимости." : "OSM returned a functional point: useful context, not a confirmed property asset.")}</p>{specificGap ? <p className="mt-3 text-xs leading-5 text-[#667085]">— {specificGap}</p> : null}<button type="button" onClick={() => onOpenAnalysis(candidate)} className="mt-4 min-h-11 rounded-xl border border-[#8ebdb4] bg-white px-3 text-sm font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]">{ru ? "Открыть анализ объекта" : "Open object analysis"}</button></article>;
          })}</div>
          <p className="mt-4 text-sm font-semibold text-[#344054]">{ru ? "Следующий шаг: откройте анализ нужного объекта, чтобы проверить его идентичность, окружение и неопределённости на отдельном экране." : "Next step: open an object analysis to review its identity, surroundings and uncertainties on a dedicated screen."}</p>
        </section>

        <details className="rounded-[20px] border border-[#cfe0dc] bg-[#edf7f3] p-4 text-xs leading-5 text-[#536963]">
          <summary className="cursor-pointer font-bold text-[#345c54]">{ru ? "Источник и границы данных" : "Source and data boundaries"}</summary>
          <p className="mt-2"><strong>{result.source.name} · {result.source.service}</strong> · {ru ? "получено" : "acquired"} {sourceTime}. {ru ? "Выборка ограничена и не является полным реестром. Доступность, официальные границы, права, планировочный режим и стоимость не установлены." : "This is a bounded sample, not a complete register. Availability, official boundaries, rights, planning controls and valuation are not established."}</p>
          <p className="mt-1">{result.caveat}</p>
        </details>
      </div>
    </section>
  );
}
