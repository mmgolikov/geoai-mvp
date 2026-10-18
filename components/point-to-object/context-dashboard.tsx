"use client";

import { useId, useRef, useState } from "react";
import { CONTEXT_GROUP_LABELS, type ContextGroup, type PointObjectNormalizedContext } from "@/src/lib/prototype/point-to-object-normalized-context";
import { CONTEXT_DETAILS_CAVEAT, type ContextPhysicalMetric } from "@/src/lib/prototype/point-to-object-context-details-v2";
import { IndependentSourceContext } from "./independent-source-context";
import { normalizeAreaSourceDashboard, type AreaSourceContextV2 } from "@/src/lib/prototype/point-to-object-area-source-context-v2";
import { D2SourceLinks, useD2SourceEvidence } from "./d2-source-evidence";

type Props = { context: PointObjectNormalizedContext; locale: "en" | "ru"; programme?: boolean; showCaveat?: boolean };
const control = "min-h-11 min-w-0 rounded-xl border p-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f8c]";

/** Source-only AOI consumer. Not mounted as a fake selected-building/point AI
 * response; ordinary AOI Analyse intake is a separate integration gate. */
export function PointObjectAreaSourceDashboard({ context, locale }: { context: AreaSourceContextV2; locale: "en" | "ru" }) {
  const ru = locale === "ru";
  const model = normalizeAreaSourceDashboard(context);
  const [west, south, east, north] = model.geometryMeasurements.bbox;
  const boundary = model.binding.geometry.coordinates[0].map(([lon, lat]) =>
    `${20 + (lon - west) / (east - west) * 180},${200 - (lat - south) / (north - south) * 180}`).join(" ");
  const fmt = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US", { maximumFractionDigits: 1 });
  const date = (s: string) => new Date(s).toLocaleString(ru ? "ru-RU" : "en-GB", { timeZone: "UTC", timeZoneName: "short" });
  return <section className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5" data-testid="area-source-context-v2" data-area-source-case={context.caseId}>
    <h3 className="text-base font-bold text-[#243447]">{ru ? "Источники выбранной зоны" : "Selected-area source context"} · {context.caseId}</h3>
    <p className="mt-2 break-words text-xs leading-6 text-[#52657a]" dir="auto">{model.binding.aoiId} · {model.binding.origin === "user_aoi" ? (ru ? "исходный пользовательский AOI" : "original user-drawn AOI") : (ru ? "исходный полигон OSM v1, не кадастровый участок" : "original OSM v1 polygon, not a cadastral parcel")}.</p>
    <figure className="mt-3 max-w-[280px]"><svg viewBox="0 0 220 220" className="w-full rounded-xl bg-[#f8fafc]" role="img" aria-label={ru ? "Исходная граница зоны · схема, не масштабная карта" : "Original area boundary · diagram, not a scale map"}><polygon points={boundary} fill="#087f8c19" stroke="#087f8c" strokeWidth="2" /></svg><figcaption className="mt-2 text-[11px] leading-5 text-[#52657a]">{ru ? "Приблизительные измерения исходного контура" : "Approximate original-boundary measurements"}: {fmt(model.geometryMeasurements.areaSqM)} m² · {fmt(model.geometryMeasurements.perimeterM)} m. {ru ? "WGS84, локальная плоская модель; не разрешённая площадь строительства." : "WGS84, local planar model; not permitted development area."}</figcaption></figure>
    {model.osmContext ? <PointObjectContextDashboard context={model.osmContext} locale={locale} programme showCaveat={false} /> : <div className="mt-4 rounded-xl bg-[#fff8ec] p-3 text-xs leading-6 text-[#6b4b16]" data-testid="area-osm-unknown" aria-live="polite">
      <p>{model.osmInterior.status === "source_error_not_empty" ? (ru ? "Чтение OSM завершилось ошибкой памяти. Количество объектов внутри зоны неизвестно, не ноль." : "The OSM read failed with an out-of-memory error. Interior feature count is unknown, not zero.") : (ru ? "Ответ OSM для зоны не сохранён. Число объектов неизвестно; данные окружения не подставлены внутрь." : "No area OSM response was retained. Interior count is unknown; surrounding data was not substituted.")}</p>
      {model.osmInterior.error ? <p>{ru ? "Историческое чтение" : "Frozen read"}: {date(model.osmInterior.error.acquiredAt)} · {ru ? "это не новое чтение или подтверждение отсутствия объектов" : "not a new read or proof of absence"}.</p> : null}
    </div>}
    <IndependentSourceContext key={`${context.caseId}:${context.independentContext.snapshotHash}`} context={model.independentContext} locale={locale} showCaveat={false} />
    <p className="mt-3 text-[11px] leading-5 text-[#667085]">{ru ? "Снимок источников сохраняется только локально в браузере. AOI не передаётся в точечный AI-анализ. Вместимость, спрос, маршруты и права застройки неизвестны." : "Source snapshots are browser-local only. The AOI is not sent through point AI. Capacity, demand, routes and development rights remain unknown."}</p>
    {model.binding.origin === "mapped_osm_polygon" ? <p className="mt-2 text-[11px] leading-5 text-[#667085]">© OpenStreetMap contributors · <a className="inline-flex min-h-11 items-center text-[#087f8c] underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">ODbL-1.0</a> · {ru ? "права на геометрию отделены от лицензии Places" : "geometry rights are separate from the Places licence"}.</p> : null}
    <p className="mt-2 text-[11px] leading-5 text-[#667085]">{model.caveat}</p>
  </section>;
}

export function PointObjectContextDashboard({ context, locale, programme = false, showCaveat = true }: Props) {
  const ru = locale === "ru";
  const detailId = useId();
  const mapId = useId();
  const mapRef = useRef<HTMLDetailsElement>(null);
  const [mapOpen, setMapOpen] = useState(true);
  const [group, setGroup] = useState<ContextGroup | "all">("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const evidence = useD2SourceEvidence();
  const labels = CONTEXT_GROUP_LABELS[locale];
  const fmt = (value: number) => value.toLocaleString(ru ? "ru-RU" : "en-US", { maximumFractionDigits: 2 });
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString(ru ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : (ru ? "дата неизвестна" : "date unknown");
  const counts = context.metrics.filter(m => m.unit === "count" && m.value !== null && m.value > 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const servicePoints = [...context.places].filter(p => p.distanceM !== null && ["education", "healthcare", "retail_daily_needs", "transport", "access", "open_space", "civic_culture"].includes(p.group))
    .sort((a, b) => a.distanceM! - b.distanceM!)
    .filter((p, index, items) => items.findIndex(item => item.group === p.group) === index);
  const details = context.details;
  const anchor = context.scope.anchor;
  const evidencePlace = context.places.find(p => p.evidenceRef === evidence?.selectedReference);
  const activeGroup = evidencePlace ? "all" : group;
  const places = context.places.filter(p => activeGroup === "all" || p.group === activeGroup).sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity) || a.name.localeCompare(b.name));
  const selected = evidencePlace ?? places.find(p => p.id === selectedPlaceId) ?? places[0] ?? null;
  const scope = context.scope.kind === "aoi_interior" ? (ru ? "Внутри выбранной зоны · не окружение" : "Inside the selected area · not its surroundings") : (ru ? `В радиусе ${context.scope.radiusM} м от точки` : `Within ${context.scope.radiusM} m of the point`);
  const sourceDate = date(context.source.observedAt ?? context.source.acquiredAt);
  const metricLabels: Record<ContextPhysicalMetric["id"], string> = ru ? {
    footprint_area: "Площадь картированного контура", perimeter: "Периметр контура", height: "Высота по тегу", levels: "Этажность по тегу", aoi_area: "Площадь выбранной зоны"
  } : { footprint_area: "Mapped footprint area", perimeter: "Boundary perimeter", height: "Tagged height", levels: "Tagged levels", aoi_area: "Selected area" };
  const geometry = details?.geometry;
  const polygons = geometry ? geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates : [];
  const dx = (longitude: number) => anchor ? (longitude - anchor[0]) * 111_320 * Math.cos(anchor[1] * Math.PI / 180) : 0;
  const dy = (latitude: number) => anchor ? (latitude - anchor[1]) * 110_540 : 0;
  const extent = Math.max(context.scope.kind === "point_radius" ? 400 : 20, ...polygons.flatMap(p => p.flatMap(r => r.flatMap(v => [Math.abs(dx(v[0])) * 1.1, Math.abs(dy(v[1])) * 1.1]))), ...context.places.flatMap(p => p.coordinates ? [Math.abs(dx(p.coordinates[0])) * 1.1, Math.abs(dy(p.coordinates[1])) * 1.1] : []));
  const x = (longitude: number) => 110 + dx(longitude) / extent * 92;
  const y = (latitude: number) => 110 - dy(latitude) / extent * 92;
  const plotPlace = (id: string, reveal = false) => {
    setSelectedPlaceId(id); setSelectedMetricId(null);
    const place = context.places.find(p => p.id === id);
    if (place) evidence?.selectReference(place.evidenceRef, false);
    if (reveal) { setGroup("all"); setMapOpen(true); mapRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  };
  const activeMetric = evidencePlace ? undefined : details?.metrics.find(m => m.id === selectedMetricId && (!evidence?.selectedReference || evidence.selectedReference === m.evidenceRef));
  const selectGroup = (next: ContextGroup | "all") => { setGroup(next); setSelectedMetricId(null); evidence?.selectReference(null, false); };

  return <section className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7" data-testid="normalized-context-dashboard" data-context-scope={context.scope.kind} data-context-details={details?.version ?? "legacy_v1"}>
    <h3 className="text-lg font-bold text-[#243447]">{programme ? (ru ? "Контекст программы" : "Programme context") : (ru ? "Объект, доступ и окружение" : "Object, access & surroundings")}</h3>
    <p className="mt-1 text-xs leading-5 text-[#52657a]">{scope} · {context.sampleSize === null ? (ru ? "источник недоступен" : "source unavailable") : `${fmt(context.sampleSize)} ${ru ? "записей OSM" : "OSM records"}`}{context.capReached ? (ru ? " · достигнут предел выборки" : " · sample cap reached") : ""}.</p>
    {details ? <p className="mt-3 break-words text-[11px] leading-5 text-[#52657a]" data-testid="context-subject-coverage">{details.association === "selected_record" ? (ru ? `Параметры выбранной картированной записи ${context.subjectId}; не всего комплекса или участка. ` : `Attributes of selected mapped record ${context.subjectId}; not the whole complex or parcel. `) : details.association === "user_aoi" ? (ru ? "Измерения границы пользователя. " : "User-boundary measurements. ") : (ru ? "Ближайшая запись не устанавливает параметры выбранного здания. " : "A nearby record does not establish selected-building attributes. ")}{details.association === "selected_record" ? (ru ? `Этажность: ${details.metrics.some(m => m.id === "levels" && m.value !== null) ? "тег сохранён для этой записи" : "неизвестна"}. Высоты окружения не сохранены.` : `Levels: ${details.metrics.some(m => m.id === "levels" && m.value !== null) ? "tag retained for this record" : "unknown"}. Surrounding heights were not retained.`) : ""}</p> : null}
    {details?.semanticWarnings.length ? <p className="mt-2 text-xs leading-5 text-[#6b4b16]" data-testid="context-semantic-limit">{ru ? "Теги outdoor_seating / временных конструкций не доказывают парк, общественную зелёную площадь или постоянную используемую площадь этажей. Исторический снимок не переписан." : "Outdoor-seating / temporary-structure tags do not establish a park, public green area or permanent usable floor area. The historical snapshot has not been rewritten."}</p> : null}
    {details ? <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4" data-testid="context-physical-metrics">{details.metrics.map(m => {
      const source = details.sources.find(s => s.id === m.sourceId);
      return <button type="button" key={m.id} aria-pressed={activeMetric?.id === m.id} aria-expanded={mapOpen} aria-controls={`${mapId} ${detailId}`} onClick={() => { setSelectedMetricId(m.id); setSelectedPlaceId(null); evidence?.selectReference(m.evidenceRef, false); setMapOpen(true); mapRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }} className={`${control} min-h-12 ${activeMetric?.id === m.id ? "border-[#087f8c] bg-[#f4fbfb]" : "border-[#dce6e3] bg-[#f8fafc]"}`} data-testid={`context-physical-${m.id}`}>
        <span className="block text-xs font-bold text-[#52657a]">{metricLabels[m.id]}</span>
        <span className="mt-2 block text-xl font-bold tabular-nums text-[#087f8c]">{m.value === null ? "—" : `${fmt(m.value)} ${m.unit === "levels" ? (ru ? "эт." : "levels") : m.unit}`}</span>
        <span className="mt-1 block text-[11px] leading-4 text-[#52657a]">{m.value === null ? (ru ? "Не установлено · не ноль" : "Unknown · not zero") : m.method === "explicit_osm_tag" ? (ru ? "Тег источника · не обмер" : "Source tag · not surveyed") : m.scope === "user_aoi" ? (ru ? "Расчёт по границе пользователя" : "User-boundary calculation") : (ru ? "Расчёт по геометрии OSM" : "OSM geometry calculation")}</span>
        <span className="mt-2 block text-[10px] leading-4 text-[#667085]">{source?.name} · {date(source?.observedAt ?? source?.acquiredAt ?? null)}</span>
      </button>;
    })}</div> : <p className="mt-4 rounded-xl bg-[#f8fafc] p-3 text-xs leading-5 text-[#52657a]" data-testid="context-legacy-measurements">{ru ? "Сохранённый V1: детальные измерения и геометрия не сохранены. Новые факты, даты и источники не добавлены." : "Saved V1: detailed measurements and geometry were not retained. No new facts, dates or sources have been added."}</p>}
    <div className={`mt-5 grid min-w-0 gap-6 ${context.scope.kind === "point_radius" ? "lg:grid-cols-2" : ""}`}>
      <figure className="min-w-0" data-testid="context-use-chart">
        <figcaption className="text-sm font-bold text-[#344054]">{ru ? "Состав выборки OSM" : "OSM sample mix"}</figcaption>
        <p className="mt-1 text-[11px] leading-5 text-[#52657a]">{context.sampleSize === null ? (ru ? "Знаменатель неизвестен — источник недоступен." : "Denominator unknown — source unavailable.") : (ru ? `Знаменатель: ${fmt(context.sampleSize)} возвращённых записей · ${scope.toLowerCase()}.` : `Denominator: ${fmt(context.sampleSize)} returned records · ${scope.toLowerCase()}.`)} {ru ? "Доли записей, не площади или спроса." : "Record shares, not area or demand."}</p>
        {counts.length ? <ol className="mt-3 space-y-1">{counts.map(m => {
          const share = context.metrics.find(item => item.id === `${m.group}.share`)?.value;
          return <li key={m.id}><button type="button" className="min-h-11 w-full min-w-0 rounded-lg px-1 py-2 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087f8c]" aria-pressed={activeGroup === m.group} aria-controls={mapId} onClick={() => { selectGroup(m.group); setMapOpen(true); }} data-testid="context-mix-bar" data-context-group={m.group}>
            <span className="flex min-w-0 items-start justify-between gap-3 text-xs leading-5 text-[#344054]"><span className="min-w-0 break-words">{labels[m.group]}</span><span className="shrink-0 font-semibold tabular-nums">{fmt(m.value!)} · {share === null || share === undefined ? "—" : `${fmt(share)}%`}</span></span>
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[#edf2f1]" aria-hidden="true">{share !== null && share !== undefined ? <span className="block h-full rounded-full bg-[#087f8c]" style={{ width: `${share}%` }} /> : null}</span>
          </button></li>;
        })}</ol> : <p className="mt-3 text-xs leading-5 text-[#52657a]">{context.sampleSize === null ? (ru ? "Количество неизвестно, не ноль." : "Count unknown, not zero.") : (ru ? "В возвращённой выборке нет записей; это не полная инвентаризация." : "No returned sample records; this is not a complete inventory.")}</p>}
      </figure>
      {context.scope.kind === "point_radius" ? <figure className="min-w-0" data-testid="context-distance-chart">
        <figcaption className="text-sm font-bold text-[#344054]">{ru ? "Именованные точки сервисов и доступа" : "Named service & access points"}</figcaption>
        <p className="mt-1 text-[11px] leading-5 text-[#52657a]">{ru ? "Сохранённые записи OSM · расстояние по прямой до центра · шкала 0–400 м. Выберите запись на схеме." : "Retained OSM records · straight-line distance to centre · 0–400 m scale. Select a record on the diagram."}</p>
        {servicePoints.length ? <ol className="mt-3 space-y-1">{servicePoints.map(p => <li key={p.id}><button type="button" className="min-h-11 w-full min-w-0 rounded-lg px-1 py-2 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087f8c]" aria-pressed={selected?.id === p.id && !activeMetric} aria-controls={`${mapId} ${detailId}`} onClick={() => plotPlace(p.id, true)} data-testid="context-distance-select" data-source-feature-id={p.id}>
          <span className="flex min-w-0 items-start justify-between gap-3 text-xs leading-5 text-[#344054]"><span className="min-w-0 break-words" dir="auto">{p.name}</span><span className="shrink-0 font-semibold tabular-nums">{fmt(p.distanceM!)} {ru ? "м" : "m"}</span></span>
          <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[#edf2f1]" aria-hidden="true"><span className="block h-full rounded-full border border-[#087f8c] bg-[#d4e9e6]" style={{ width: `${Math.min(100, p.distanceM! / 400 * 100)}%` }} /></span>
          <span className="mt-1 block text-[10px] leading-4 text-[#667085]">{labels[p.group]}</span>
        </button></li>)}</ol> : <p className="mt-3 text-xs leading-5 text-[#52657a]">{ru ? "Именованные точки с расстояниями не сохранены. Расстояние и маршрут неизвестны." : "Named points with distances were not retained. Distance and route remain unknown."}</p>}
      </figure> : null}
    </div>
    <details id={mapId} ref={mapRef} open={mapOpen} onToggle={event => setMapOpen(event.currentTarget.open)} className="mt-4" data-testid="context-linked-map"><summary className="min-h-11 cursor-pointer text-sm font-bold leading-[44px] text-[#52657a]">{ru ? "Карта и инфраструктура OSM" : "OSM map & infrastructure"}</summary>
    <div className="mt-3 grid gap-4 lg:grid-cols-2">
      {anchor && (places.some(p => p.coordinates) || geometry) ? <figure className="min-w-0" data-testid="context-spatial-plot">
        <figcaption className="text-sm font-bold text-[#344054]">{ru ? "Контур и записи источника на схеме" : "Boundary & source records on the diagram"}</figcaption>
        <svg viewBox="0 0 220 220" className="mt-2 max-h-[300px] w-full rounded-xl bg-[#f4fbfb]" aria-label={ru ? "Схема источника, север сверху; выберите запись" : "Source diagram, north at top; select a record"}>
          {context.scope.kind === "point_radius" ? <circle cx="110" cy="110" r={400 / extent * 92} fill="none" stroke="#c8d9d6" /> : null}
          <path d="M110 14V206M14 110H206" stroke="#dce6e3" /><text x="110" y="11" textAnchor="middle" fontSize="9" fill="#52657a">N</text>
          {polygons.map((polygon, i) => <path key={i} d={polygon.map(ring => ring.map((p, j) => `${j === 0 ? "M" : "L"}${x(p[0])},${y(p[1])}`).join(" ") + " Z").join(" ")} fillRule="evenodd" fill={activeMetric ? "#087f8c33" : "#087f8c19"} stroke="#087f8c" strokeWidth={activeMetric ? 2.5 : 1.5} data-testid="context-source-boundary" />)}
          {selected?.coordinates && !activeMetric ? <path d={`M110 110L${x(selected.coordinates[0])} ${y(selected.coordinates[1])}`} fill="none" stroke="#087f8c" strokeDasharray="4 3" aria-hidden="true" /> : null}
          <circle cx="110" cy="110" r="3" fill="#243447" />
          {places.filter(p => p.coordinates).map((p, i) => <g key={p.id} role="button" tabIndex={0} aria-label={`${p.name} · ${labels[p.group]}`} aria-pressed={selected?.id === p.id && !activeMetric} onClick={() => plotPlace(p.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); plotPlace(p.id); } }} className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#243447]" data-source-feature-id={p.id}>
            <circle cx={x(p.coordinates![0])} cy={y(p.coordinates![1])} r="22" fill="transparent" />
            <circle cx={x(p.coordinates![0])} cy={y(p.coordinates![1])} r={selected?.id === p.id && !activeMetric ? 10 : 8} fill={selected?.id === p.id && !activeMetric ? "#243447" : "#087f8c"} />
            <text x={x(p.coordinates![0])} y={y(p.coordinates![1]) + 3} textAnchor="middle" fontSize="8" fill="white">{i + 1}</text>
          </g>)}
        </svg>
        <p className="mt-2 text-[11px] leading-5 text-[#667085]">{ru ? "Центры записей, не входы или маршруты. Контур показан только при сохранённой геометрии; точка не доказывает площадь." : "Record centres, not entrances or routes. A boundary is shown only when geometry is held; a point does not establish area."}</p>
      </figure> : <p className="rounded-xl bg-[#f8fafc] p-4 text-xs leading-5 text-[#52657a]">{ru ? "Схему нельзя построить: координаты или геометрия не сохранены." : "The diagram is unavailable: coordinates or geometry were not retained."}</p>}
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-[#344054]">{ru ? "Проверяемые связи с окружением" : "Connections to verify"}</h4>
        <div className="mt-2 flex flex-wrap gap-2" aria-label={ru ? "Фильтр записей карты" : "Map-record filter"}>
          <button type="button" aria-pressed={activeGroup === "all"} onClick={() => selectGroup("all")} className={`${control} border-line text-xs font-semibold`}>{ru ? "Все" : "All"}</button>
          {counts.map(m => <button type="button" key={m.group} aria-pressed={activeGroup === m.group} onClick={() => selectGroup(m.group)} className={`${control} text-xs font-semibold ${activeGroup === m.group ? "border-[#087f8c] bg-[#f4fbfb]" : "border-line"}`}>{labels[m.group]}</button>)}
        </div>
        <ol className="mt-3 max-h-[320px] space-y-2 overflow-y-auto" data-testid="context-place-list">{places.map(p => <li key={p.id}>
          <button type="button" onClick={() => plotPlace(p.id)} aria-pressed={selected?.id === p.id && !activeMetric} aria-controls={detailId} className={`${control} min-h-12 w-full ${selected?.id === p.id && !activeMetric ? "border-[#087f8c] bg-[#f4fbfb]" : "border-line"}`} data-testid="context-place-select">
            <span className="block break-words text-xs font-bold text-[#344054]">{p.name}</span>
            <span className="mt-1 block text-[11px] leading-5 text-[#52657a]">{labels[p.group]} · {p.distanceM === null ? (ru ? "внутри AOI по центру записи · расстояние не измерялось" : "record centre inside AOI · distance not measured") : `${fmt(p.distanceM)} ${ru ? "м до центра по прямой" : "m straight-line to centre"}`} · OSM · {sourceDate}</span>
          </button>
        </li>)}</ol>
        {!places.length ? <p className="mt-3 text-xs leading-5 text-[#52657a]">{context.coverage === "unavailable" ? (ru ? "Данные не получены; это не ноль объектов." : "Data was not returned; this is not zero features.") : (ru ? "В сохранённой выборке нет записей этого типа. Это не доказывает отсутствия сервисов." : "No records of this type in the held sample. This does not establish absence of services.")}</p> : null}
      </div>
    </div>
    <div id={detailId} className="mt-4 rounded-xl bg-[#f4fbfb] p-4 text-xs leading-6 text-[#344054]" aria-live="polite" aria-atomic="true" data-testid="context-selected-detail">
      {activeMetric && details ? <><strong>{metricLabels[activeMetric.id]}</strong><p>{details.association !== "selected_record" && details.association !== "user_aoi" ? (ru ? "Запись относится к окружению точки, не к выбранному объекту. Её параметры не перенесены на выбор." : "This record is point context, not the selected object. Its attributes were not transferred to the selection.") : (ru ? "Контур — картированная или пользовательская граница, не участок и не постоянная площадь этажей. Этажность не определяет высоту; вместимость, GFA и права застройки неизвестны." : "The boundary is mapped or user-drawn, not a parcel or permanent floor area. Levels do not establish height; capacity, GFA and development rights are unknown.")}</p></> : selected ? <><strong className="break-words">{selected.name}</strong><p className="break-all">OpenStreetMap · {selected.id} · {selected.evidenceRef}</p><p>{ru ? "Следующий шаг: подтвердить работающую функцию, точный вход и доступный путь от площадки. Близость центра записи не означает пешеходную доступность или достаточную вместимость." : "Next step: verify the operating function, actual entrance and usable route from the site. Proximity to a record centre does not establish walking access or sufficient capacity."}</p></> : <p>{ru ? "Для решения о площадке сначала установите действующие услуги, входы и физические барьеры. Ранжирование по неподтверждённой доступности не выполнено." : "Before deciding on the site, establish operating services, entrances and physical barriers. No ranking by unverified accessibility was performed."}</p>}
    </div>
    <D2SourceLinks references={activeMetric ? [activeMetric.evidenceRef] : selected ? [selected.evidenceRef] : []} />
    <details className="mt-3" data-testid="context-sample-breakdown"><summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-[#52657a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087f8c]">{ru ? "Сводка OSM · записи, не вместимость" : "OSM breakdown · records, not capacity"}</summary>
    <div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-5">{context.programmeChecks.map(check => {
      const distance = context.metrics.find(m => m.id === `${check.group}.nearest`)?.value;
      return <article key={check.group} className="min-w-0 rounded-xl border border-[#dce6e3] p-3" data-testid={`context-${check.group}`}><p className="text-xs font-bold text-[#52657a]">{labels[check.group]}</p><p className="mt-2 text-xl font-bold tabular-nums text-[#087f8c]">{check.mappedCount === null ? "—" : fmt(check.mappedCount)}</p><p className="mt-1 text-[11px] leading-4 text-[#52657a]">{check.mappedCount === null ? (ru ? "Данные не получены" : "Data not returned") : (ru ? "записей в выборке, не вместимость" : "sample records, not capacity")}</p><p className="mt-2 text-[11px] leading-4 text-[#52657a]">{distance != null ? `${fmt(distance)} ${ru ? "м до центра по прямой" : "m straight-line to centre"}` : (ru ? "Расстояние не установлено" : "Distance not established")}</p><p className="mt-2 text-[10px] leading-4 text-[#667085]">OSM · {sourceDate} · {ru ? "неполное покрытие" : "incomplete coverage"}</p></article>;
    })}</div></details>
    {programme ? <p className="mt-4 text-xs leading-5 text-[#52657a]">{ru ? "Инвентаризация внутри зоны не заменяет обследование окружения. Вместимость, нагрузку и доступ нужно подтвердить у оператора." : "Interior inventory does not replace a surrounding catchment assessment. Confirm capacity, future load and access with the operator."}</p> : null}
    </details>
    {context.independentContext ? <IndependentSourceContext key={`${context.subjectId}:${context.independentContext.snapshotHash}`} context={context.independentContext} locale={locale} showCaveat={false} /> : null}
    <p className="mt-4 text-[11px] leading-5 text-[#667085]">{context.source.attribution} · {ru ? "получено" : "acquired"} {date(context.source.acquiredAt)} · {ru ? "дата базы" : "database date"} {date(context.source.observedAt)} · {ru ? "неполная открытая карта" : "incomplete open map"}.</p>
    {showCaveat ? <p className="mt-2 text-[11px] leading-5 text-[#667085]">{CONTEXT_DETAILS_CAVEAT}</p> : null}
  </section>;
}
