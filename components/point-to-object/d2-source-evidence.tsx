"use client";

import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from "react";
import type { PointObjectAiSubject } from "./live-types";
import type { PointObjectNormalizedContext } from "@/src/lib/prototype/point-to-object-normalized-context";
import type { PointObjectCitationContext } from "@/src/lib/prototype/point-to-object-citation-context";

type EvidenceSubject = Pick<PointObjectAiSubject, "name" | "address" | "featureClass" | "sourceFeatureId" | "sourceLabel" | "climate">;
type EvidenceSelection = { reference: string | null; origin: "citation" | "local" | null };

type EvidenceContext = {
  context: PointObjectNormalizedContext | null;
  subject: EvidenceSubject | null;
  locale: "en" | "ru";
  selectedReference: string | null;
  selectionOrigin: EvidenceSelection["origin"];
  panelId: string;
  selectReference: (reference: string | null, reveal?: boolean) => void;
};
const SourceEvidenceContext = createContext<EvidenceContext | null>(null);
export const useD2SourceEvidence = () => useContext(SourceEvidenceContext);
type Evidence = {
  title: string; source: string; lines: string[]; coordinates?: [number, number] | null;
  distanceM?: number | null; sourceFeatureId?: string; extended?: boolean;
};

function resolveEvidence(context: PointObjectNormalizedContext | null, subject: EvidenceSubject | null, reference: string, ru: boolean): Evidence | null {
  if (!context) return null;
  const fmt = (value: number) => value.toLocaleString(ru ? "ru-RU" : "en-US", { maximumFractionDigits: 2 });
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString(ru ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : (ru ? "неизвестна" : "unknown");
  const sourceDates = (acquired: string | null, observed: string | null) => ru ? `Получено: ${date(acquired)} · дата базы: ${date(observed)}. Полевая дата неизвестна.` : `Acquired: ${date(acquired)} · database as-of: ${date(observed)}. Field observation date unknown.`;
  const citationContext = (context as PointObjectNormalizedContext & { citationContext?: PointObjectCitationContext }).citationContext;
  const citation = citationContext?.items.find(item => item.evidenceRef === reference);
  if (citation && citationContext) return {
    title: citation.name, source: "OpenStreetMap · Overpass API", sourceFeatureId: citation.id,
    coordinates: citation.coordinates, distanceM: citation.distanceM, extended: citation.distanceM > 400,
    lines: [
      `${ru ? "Класс источника" : "Source class"}: ${citation.featureClass} · ${citation.categories.join(" · ")}`,
      ru ? `${fmt(citation.distanceM)} м до возвращённого центра по прямой · haversine. Не маршрут, не вход.` : `${fmt(citation.distanceM)} m straight-line to returned centre · haversine. Not a route or entrance.`,
      citation.distanceM > 400 ? (ru ? "Расширенный контекст 400–800 м; запись не входит в показатели выборки 400 м." : "Extended context at 400–800 m; excluded from the 400 m sample metrics.") : (ru ? "Запись каталога цитат в пределах 400 м; знаменатель показателей задан отдельной выборкой OSM." : "Citation-catalogue record within 400 m; metric denominator comes from the separate OSM sample."),
      sourceDates(citationContext.source.acquiredAt, citationContext.source.observedAt)
    ]
  };
  const place = context.places.find(item => item.evidenceRef === reference);
  if (place) return {
    title: place.name, source: "OpenStreetMap", sourceFeatureId: place.id, coordinates: place.coordinates, distanceM: place.distanceM,
    lines: [
      `${ru ? "Группа нормализации" : "Normalized group"}: ${place.group}. ${ru ? "Исходный класс не сохранён в этой записи." : "Original source class was not retained in this record."}`,
      place.distanceM === null ? (ru ? "Центр записи внутри AOI; расстояние не измерялось." : "Record centre inside AOI; distance was not measured.") : (ru ? `${fmt(place.distanceM)} м до центра по прямой; не маршрут или вход.` : `${fmt(place.distanceM)} m straight-line to centre; not a route or entrance.`),
      sourceDates(context.source.acquiredAt, context.source.observedAt)
    ]
  };
  const independent = context.independentContext;
  const independentPlace = independent?.status === "available" ? independent.places.find(item => item.evidenceRef === reference) : null;
  if (independentPlace && independent) return {
    title: independentPlace.name, source: `Overture Places · ${independent.release}`, sourceFeatureId: independentPlace.id,
    coordinates: independentPlace.coordinates, distanceM: independentPlace.distanceM,
    lines: [
      `${ru ? "Класс источника" : "Source class"}: ${independentPlace.taxonomy.primary}`,
      `${fmt(independentPlace.distanceM)} ${ru ? "м до точки по прямой · haversine, не маршрут." : "m straight-line to point · haversine, not a route."}`,
      `${ru ? "Обновление поставщика" : "Provider update"}: ${date(independentPlace.providerUpdatedAt)}. ${ru ? "Полевая дата, текущая работа, вместимость и доступ неизвестны." : "Field date, current operation, capacity and access unknown."}`,
      ...independentPlace.sources.filter(item => item.property !== "/properties/confidence").map(item => `${item.provider} · ${item.record_id ?? item.resource} · ${date(item.update_time)} · ${item.license}`),
      ru ? "Отдельный источник; не суммируется с OSM и не доказывает уникальный физический объект." : "Separate source; not added to OSM counts and not proof of a unique physical entity."
    ]
  };
  if (["EVD-CONTEXT-SUMMARY", "EVD-DISTRICT-PROFILE"].includes(reference)) return {
    title: ru ? "Выборка OSM · 400 м" : "OSM sample · 400 m", source: "OpenStreetMap",
    lines: [context.sampleSize === null ? (ru ? "Количество неизвестно — источник недоступен." : "Count unknown — source unavailable.") : `${fmt(context.sampleSize)} ${ru ? "возвращённых записей; доли рассчитаны от этого количества, не от площади, населения или спроса." : "returned records; shares use this count, not area, population or demand."}`, sourceDates(context.source.acquiredAt, context.source.observedAt)]
  };
  if (reference === "EVD-OBJECT-METRICS" || reference === "EVD-GEOMETRY" || reference === "EVD-ALLOWED-FIELDS") {
    const details = context.details;
    if (!details) return null;
    const metrics = details.metrics.filter(item => item.evidenceRef === reference || reference === "EVD-GEOMETRY" && item.method !== "explicit_osm_tag");
    const source = details.sources.find(item => item.id === "osm_object");
    const metricLabels: Record<string, string> = ru ? { footprint_area: "Контур", perimeter: "Периметр", height: "Высота по тегу", levels: "Этажность по тегу", aoi_area: "AOI" } : { footprint_area: "Footprint", perimeter: "Perimeter", height: "Tagged height", levels: "Tagged levels", aoi_area: "AOI" };
    return { title: subject?.name ?? context.subjectId, source: source?.name ?? "OpenStreetMap", sourceFeatureId: context.subjectId, lines: [
      details.association === "selected_record" ? (ru ? "Параметры выбранной записи OSM." : "Attributes of the selected OSM record.") : (ru ? "Точная связь с выбранным зданием не установлена; параметры ближайшей записи не перенесены." : "Exact selected-building association unestablished; nearby-record attributes were not transferred."),
      ...metrics.map(item => `${metricLabels[item.id]}: ${item.value === null ? (ru ? "неизвестно, не ноль" : "unknown, not zero") : `${fmt(item.value)} ${item.unit}`} · ${item.method === "explicit_osm_tag" ? (ru ? "тег, не обмер" : "tag, not a survey") : (ru ? "расчёт по картированной геометрии" : "mapped-geometry calculation")}`),
      ru ? "Не кадастровый участок, полезная площадь этажей или разрешённый объём. Распределение высот окружения не сохранено." : "Not a cadastral parcel, usable floor area or permitted volume. No surrounding height distribution was retained.",
      sourceDates(source?.acquiredAt ?? null, source?.observedAt ?? null)
    ] };
  }
  if (["EVD-OSM-OBJECT", "EVD-OBJECT", "EVD-CLASSIFICATION", "EVD-ADDRESS"].includes(reference) && subject?.sourceFeatureId === context.subjectId) return {
    title: subject.name ?? subject.sourceFeatureId, source: subject.sourceLabel, sourceFeatureId: subject.sourceFeatureId,
    lines: [`${ru ? "Класс источника" : "Source class"}: ${subject.featureClass}`, `${ru ? "Адрес источника" : "Source address"}: ${subject.address ?? (ru ? "неизвестен" : "unknown")}`, ru ? "Идентичность записи открытой карты не устанавливает официальный актив, участок или права." : "Open-map record identity does not establish an official asset, parcel or rights."]
  };
  if (["EVD-SOURCE", "EVD-SNAPSHOT", "EVD-COORDINATES"].includes(reference)) return {
    title: ru ? "Сохранённый контекст источника" : "Retained source context", source: "OpenStreetMap", coordinates: context.scope.anchor,
    lines: [sourceDates(context.source.acquiredAt, context.source.observedAt), ru ? "Точка анализа и контекст не являются официальной границей объекта или участка." : "The analysis point and context are not an official object or parcel boundary."]
  };
  if (reference === "EVD-NASA-POWER-CLIMATE" && subject?.climate?.status === "available") return {
    title: `NASA POWER · ${subject.climate.year}`, source: subject.climate.source.attribution,
    lines: [subject.climate.proofLimit, `${ru ? "Период" : "Period"}: ${subject.climate.source.observedStart} – ${subject.climate.source.observedEnd}`, sourceDates(subject.climate.source.acquiredAt, null)]
  };
  return null;
}

export function D2SourceLinks({ references, fallbackLabel }: { references: string[]; fallbackLabel?: (reference: string) => string }) {
  const evidence = useD2SourceEvidence();
  if (!evidence) return null;
  const ru = evidence.locale === "ru";
  return <ul className="mt-2 flex min-w-0 flex-wrap gap-2">{[...new Set(references)].map(reference => {
    const resolved = resolveEvidence(evidence.context, evidence.subject, reference, ru);
    return <li key={reference} className="min-w-0 max-w-full"><button type="button" onClick={() => evidence.selectReference(reference)} aria-controls={evidence.panelId} className="min-h-11 max-w-full break-words rounded-lg border border-[#dce6e3] px-3 py-2 text-start text-[11px] font-semibold leading-5 text-[#087f8c] underline decoration-[#b6d4ce] underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f8c]" data-testid="d2-source-link" data-evidence-ref={reference} data-evidence-available={Boolean(resolved)}>
      {resolved?.title ?? fallbackLabel?.(reference) ?? (ru ? "Цитата отчёта" : "Report citation")}{!resolved ? (ru ? " · источник недоступен" : " · source unavailable") : ""}
    </button></li>;
  })}</ul>;
}

export function D2SourceAvailability({ references }: { references: string[] }) {
  const evidence = useD2SourceEvidence();
  if (!evidence) return null;
  const missing = [...new Set(references)].filter(reference => !resolveEvidence(evidence.context, evidence.subject, reference, evidence.locale === "ru"));
  return missing.length ? <span className="ml-2 font-normal text-[#6b4b16]" data-testid="d2-source-unavailable-count">{evidence.locale === "ru" ? `${missing.length} недоступно` : `${missing.length} unavailable`}</span> : null;
}

export function D2SourceEvidenceProvider({ context, subject, locale, references = [], children }: { context: PointObjectNormalizedContext | null; subject: EvidenceSubject | null; locale: "en" | "ru"; references?: string[]; children: ReactNode }) {
  const panelId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);
  const [selection, setSelection] = useState<EvidenceSelection>({ reference: null, origin: null });
  const { reference: selectedReference, origin: selectionOrigin } = selection;
  const [open, setOpen] = useState(false);
  const selectReference = useCallback((reference: string | null, reveal = true) => {
    setSelection({ reference, origin: reference === null ? null : reveal ? "citation" : "local" });
    if (reference === null) {
      setOpen(false);
      return;
    }
    if (reveal) {
      invokerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
      requestAnimationFrame(() => { panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); panelRef.current?.focus({ preventScroll: true }); });
    }
  }, []);
  const close = () => { setOpen(false); if (invokerRef.current?.isConnected) invokerRef.current.focus(); };
  const ru = locale === "ru";
  const selected = selectedReference ? resolveEvidence(context, subject, selectedReference, ru) : null;
  const missingNearby = [...new Set(references)].filter(reference => /^EVD-CONTEXT-\d+$/.test(reference) && !resolveEvidence(context, subject, reference, ru));
  const anchor = context?.scope.anchor;
  const coordinate = selected?.coordinates;
  const dx = anchor && coordinate ? (coordinate[0] - anchor[0]) * 111_320 * Math.cos(anchor[1] * Math.PI / 180) : 0;
  const dy = anchor && coordinate ? (coordinate[1] - anchor[1]) * 110_540 : 0;
  const extent = Math.max(400, Math.abs(dx) * 1.15, Math.abs(dy) * 1.15);
  return <SourceEvidenceContext.Provider value={{ context, subject, locale, selectedReference, selectionOrigin, panelId, selectReference }}>
    {missingNearby.length ? <div className="mb-5 min-w-0 rounded-xl border border-[#eadbc1] bg-[#fffaf1] p-3 text-xs leading-5 text-[#6b4b16]" data-testid="d2-missing-citation-notice"><p>{ru ? "Не все цитаты отчёта доступны в сохранённом наборе. Исходный ответ сохранён; отсутствующие записи требуют проверки." : "Some report citations are unavailable in the retained evidence. The original answer is preserved; missing records require verification."}</p><D2SourceLinks references={missingNearby} /></div> : null}
    <aside id={panelId} ref={panelRef} tabIndex={-1} hidden={!open || !selectedReference} onKeyDown={event => { if (event.key === "Escape") close(); }} className="mb-5 min-w-0 rounded-[20px] border border-[#9dbfb8] bg-white p-5 outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:p-7" aria-label={ru ? "Доказательство источника" : "Source evidence"} data-testid="d2-source-evidence" data-evidence-ref={selectedReference ?? undefined} data-evidence-available={Boolean(selected)}>
      <div className="flex min-w-0 items-start justify-between gap-3"><h2 className="min-w-0 break-words text-base font-bold text-[#243447]">{selected?.title ?? (ru ? "Цитата недоступна в сохранённом источнике" : "Citation unavailable in retained source")}</h2><button type="button" className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-xs font-semibold text-[#52657a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087f8c]" onClick={close} data-testid="d2-evidence-close">{ru ? "Закрыть" : "Close"}</button></div>
      <p className="mt-1 break-all text-[11px] leading-5 text-[#667085]">{selected?.source ? `${selected.source} · ` : ""}{selected?.sourceFeatureId ? `${selected.sourceFeatureId} · ` : ""}{selectedReference}</p>
      {selected ? <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_180px]"><div className="space-y-2 text-xs leading-6 text-[#344054]">{selected.lines.map((line, index) => <p className="break-words" key={index}>{line}</p>)}{coordinate ? <p className="break-words text-[11px] text-[#667085]">WGS84 [{coordinate.join(", ")}]</p> : null}</div>{anchor && coordinate ? <figure className="min-w-0 max-w-[220px]"><svg viewBox="0 0 180 180" className="w-full rounded-xl bg-[#f4fbfb]" role="img" aria-label={ru ? "Исходная точка и выбранная запись; север сверху" : "Origin and selected record; north at top"} data-testid="d2-evidence-plot"><circle cx="90" cy="90" r={400 / extent * 72} fill="none" stroke="#b6d4ce" /><path d="M90 14V166M14 90H166" stroke="#dce6e3" /><text x="90" y="11" fontSize="9" textAnchor="middle" fill="#52657a">N</text><path d={`M90 90L${90 + dx / extent * 72} ${90 - dy / extent * 72}`} stroke="#087f8c" strokeDasharray="4 3" /><circle cx="90" cy="90" r="3" fill="#243447" data-testid="d2-evidence-origin" /><circle cx={90 + dx / extent * 72} cy={90 - dy / extent * 72} r="6" fill="#087f8c" data-testid="d2-evidence-point" data-source-feature-id={selected.sourceFeatureId} data-evidence-ref={selectedReference ?? undefined} /></svg><figcaption className="mt-2 text-[10px] leading-5 text-[#52657a]">{ru ? "Центр — точка анализа; круг — 400 м. Линия по прямой, не маршрут." : "Centre: analysis point; circle: 400 m. Straight line, not a route."}</figcaption></figure> : null}</div> : <p className="mt-3 text-xs leading-6 text-[#6b4b16]" data-testid="d2-citation-unavailable">{ru ? "Эта ссылка не разрешается в сохранённом наборе. Исходная запись, её класс, координаты и расстояние не восстановлены из текста отчёта. Новый запрос источника не выполнялся; наличие цитаты не доказывает факт." : "This reference cannot be resolved in the retained evidence. Its original record, class, coordinates and distance were not reconstructed from report prose. No source refresh was made; a citation alone does not prove the claim."}</p>}
    </aside>
    {children}
  </SourceEvidenceContext.Provider>;
}
