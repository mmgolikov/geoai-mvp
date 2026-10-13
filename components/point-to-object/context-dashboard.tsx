"use client";

import { useId, useState } from "react";
import { CONTEXT_GROUP_LABELS, type ContextGroup, type PointObjectNormalizedContext } from "@/src/lib/prototype/point-to-object-normalized-context";
import { CONTEXT_DETAILS_CAVEAT, type ContextPhysicalMetric } from "@/src/lib/prototype/point-to-object-context-details-v2";
import { IndependentSourceContext } from "./independent-source-context";

type Props = { context: PointObjectNormalizedContext; locale: "en" | "ru"; programme?: boolean };
const control = "min-h-11 min-w-0 rounded-xl border p-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f8c]";

export function PointObjectContextDashboard({ context, locale, programme = false }: Props) {
  const ru = locale === "ru";
  const detailId = useId();
  const [group, setGroup] = useState<ContextGroup | "all">("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const labels = CONTEXT_GROUP_LABELS[locale];
  const fmt = (value: number) => value.toLocaleString(ru ? "ru-RU" : "en-US", { maximumFractionDigits: 2 });
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString(ru ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : (ru ? "дата неизвестна" : "date unknown");
  const counts = context.metrics.filter(m => m.unit === "count" && m.value !== null && m.value > 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const details = context.details;
  const anchor = context.scope.anchor;
  const places = context.places.filter(p => group === "all" || p.group === group).sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity) || a.name.localeCompare(b.name));
  const selected = places.find(p => p.id === selectedPlaceId) ?? places[0] ?? null;
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
  const plotPlace = (id: string) => { setSelectedPlaceId(id); setSelectedMetricId(null); };
  const activeMetric = details?.metrics.find(m => m.id === selectedMetricId);

  return <section className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7" data-testid="normalized-context-dashboard" data-context-scope={context.scope.kind} data-context-details={details?.version ?? "legacy_v1"}>
    <h3 className="text-lg font-bold text-[#243447]">{programme ? (ru ? "Контекст программы" : "Programme context") : (ru ? "Объект, доступ и окружение" : "Object, access & surroundings")}</h3>
    <p className="mt-1 text-xs leading-5 text-[#52657a]">{scope} · {context.sampleSize === null ? (ru ? "источник недоступен" : "source unavailable") : `${fmt(context.sampleSize)} ${ru ? "записей OSM" : "OSM records"}`}{context.capReached ? (ru ? " · достигнут предел выборки" : " · sample cap reached") : ""}.</p>
    {details?.semanticWarnings.length ? <p className="mt-2 text-xs leading-5 text-[#6b4b16]" data-testid="context-semantic-limit">{ru ? "Теги outdoor_seating / временных конструкций не доказывают парк, общественную зелёную площадь или постоянную используемую площадь этажей. Исторический снимок не переписан." : "Outdoor-seating / temporary-structure tags do not establish a park, public green area or permanent usable floor area. The historical snapshot has not been rewritten."}</p> : null}
    {details ? <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4" data-testid="context-physical-metrics">{details.metrics.map(m => {
      const source = details.sources.find(s => s.id === m.sourceId);
      return <button type="button" key={m.id} aria-pressed={activeMetric?.id === m.id} aria-controls={detailId} onClick={() => { setSelectedMetricId(m.id); setSelectedPlaceId(null); }} className={`${control} min-h-12 ${activeMetric?.id === m.id ? "border-[#087f8c] bg-[#f4fbfb]" : "border-[#dce6e3] bg-[#f8fafc]"}`} data-testid={`context-physical-${m.id}`}>
        <span className="block text-xs font-bold text-[#52657a]">{metricLabels[m.id]}</span>
        <span className="mt-2 block text-xl font-bold tabular-nums text-[#087f8c]">{m.value === null ? "—" : `${fmt(m.value)} ${m.unit === "levels" ? (ru ? "эт." : "levels") : m.unit}`}</span>
        <span className="mt-1 block text-[11px] leading-4 text-[#52657a]">{m.value === null ? (ru ? "Не установлено · не ноль" : "Unknown · not zero") : m.method === "explicit_osm_tag" ? (ru ? "Тег источника · не обмер" : "Source tag · not surveyed") : m.scope === "user_aoi" ? (ru ? "Расчёт по границе пользователя" : "User-boundary calculation") : (ru ? "Расчёт по геометрии OSM" : "OSM geometry calculation")}</span>
        <span className="mt-2 block text-[10px] leading-4 text-[#667085]">{source?.name} · {date(source?.observedAt ?? source?.acquiredAt ?? null)}</span>
      </button>;
    })}</div> : <p className="mt-4 rounded-xl bg-[#f8fafc] p-3 text-xs leading-5 text-[#52657a]" data-testid="context-legacy-measurements">{ru ? "Сохранённый V1: детальные измерения и геометрия не сохранены. Новые факты, даты и источники не добавлены." : "Saved V1: detailed measurements and geometry were not retained. No new facts, dates or sources have been added."}</p>}
    {context.independentContext ? <IndependentSourceContext key={`${context.subjectId}:${context.independentContext.snapshotHash}`} context={context.independentContext} locale={locale} /> : null}
    <details className="mt-4"><summary className="min-h-11 cursor-pointer text-sm font-bold leading-[44px] text-[#52657a]">{ru ? "Карта и инфраструктура OSM" : "OSM map & infrastructure"}</summary>
    <div className="mt-3 grid gap-4 lg:grid-cols-2">
      {anchor && (places.some(p => p.coordinates) || geometry) ? <figure className="min-w-0" data-testid="context-spatial-plot">
        <figcaption className="text-sm font-bold text-[#344054]">{ru ? "Контур и записи источника на схеме" : "Boundary & source records on the diagram"}</figcaption>
        <svg viewBox="0 0 220 220" className="mt-2 max-h-[300px] w-full rounded-xl bg-[#f4fbfb]" aria-label={ru ? "Схема источника, север сверху; выберите запись" : "Source diagram, north at top; select a record"}>
          {context.scope.kind === "point_radius" ? <circle cx="110" cy="110" r={400 / extent * 92} fill="none" stroke="#c8d9d6" /> : null}
          <path d="M110 14V206M14 110H206" stroke="#dce6e3" /><text x="110" y="11" textAnchor="middle" fontSize="9" fill="#52657a">N</text>
          {polygons.map((polygon, i) => <path key={i} d={polygon.map(ring => ring.map((p, j) => `${j === 0 ? "M" : "L"}${x(p[0])},${y(p[1])}`).join(" ") + " Z").join(" ")} fillRule="evenodd" fill={activeMetric ? "#087f8c33" : "#087f8c19"} stroke="#087f8c" strokeWidth={activeMetric ? 2.5 : 1.5} data-testid="context-source-boundary" />)}
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
          <button type="button" aria-pressed={group === "all"} onClick={() => setGroup("all")} className={`${control} border-line text-xs font-semibold`}>{ru ? "Все" : "All"}</button>
          {counts.map(m => <button type="button" key={m.group} aria-pressed={group === m.group} onClick={() => setGroup(m.group)} className={`${control} text-xs font-semibold ${group === m.group ? "border-[#087f8c] bg-[#f4fbfb]" : "border-line"}`}>{labels[m.group]}</button>)}
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
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{context.programmeChecks.map(check => {
      const distance = context.metrics.find(m => m.id === `${check.group}.nearest`)?.value;
      return <article key={check.group} className="min-w-0 rounded-xl border border-[#dce6e3] p-3" data-testid={`context-${check.group}`}><p className="text-xs font-bold text-[#52657a]">{labels[check.group]}</p><p className="mt-2 text-xl font-bold tabular-nums text-[#087f8c]">{check.mappedCount === null ? "—" : fmt(check.mappedCount)}</p><p className="mt-1 text-[11px] leading-4 text-[#52657a]">{check.mappedCount === null ? (ru ? "Данные не получены" : "Data not returned") : (ru ? "записей в выборке, не вместимость" : "sample records, not capacity")}</p><p className="mt-2 text-[11px] leading-4 text-[#52657a]">{distance != null ? `${fmt(distance)} ${ru ? "м до центра по прямой" : "m straight-line to centre"}` : (ru ? "Расстояние не установлено" : "Distance not established")}</p><p className="mt-2 text-[10px] leading-4 text-[#667085]">OSM · {sourceDate} · {ru ? "неполное покрытие" : "incomplete coverage"}</p></article>;
    })}</div>
    {counts.length ? <details className="mt-4"><summary className="min-h-11 cursor-pointer text-xs font-bold leading-[44px] text-[#52657a]">{ru ? "Состав возвращённой выборки · не землепользование" : "Returned sample mix · not land-use coverage"}</summary><div className="space-y-2" data-testid="context-use-chart">{counts.map(m => <p key={m.id} className="text-xs text-[#52657a]">{labels[m.group]}: {fmt(m.value!)} · {fmt(context.metrics.find(item => item.id === `${m.group}.share`)?.value ?? 0)}%</p>)}<p className="text-[11px] leading-5 text-[#667085]">{ru ? "Доли записей, не площади, населения или спроса. Ноль в выборке не доказывает отсутствия объекта." : "Shares of records, not area, population or demand. Zero records do not establish absence."}</p></div></details> : null}
    {programme ? <p className="mt-4 text-xs leading-5 text-[#52657a]">{ru ? "Инвентаризация внутри зоны не заменяет обследование окружения. Вместимость, нагрузку и доступ нужно подтвердить у оператора." : "Interior inventory does not replace a surrounding catchment assessment. Confirm capacity, future load and access with the operator."}</p> : null}
    </details>
    <p className="mt-4 text-[11px] leading-5 text-[#667085]">{context.source.attribution} · {ru ? "получено" : "acquired"} {date(context.source.acquiredAt)} · {ru ? "дата базы" : "database date"} {date(context.source.observedAt)} · {ru ? "неполная открытая карта" : "incomplete open map"}.</p>
    <p className="mt-2 text-[11px] leading-5 text-[#667085]">{CONTEXT_DETAILS_CAVEAT}</p>
  </section>;
}
