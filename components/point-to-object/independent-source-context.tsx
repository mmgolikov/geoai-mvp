"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { IndependentPlaceGroup, IndependentPointObjectContext } from "@/src/lib/prototype/point-to-object-independent-context";
import type { U4IndependentContext } from "@/src/lib/prototype/point-to-object-u4-independent-context";

type ScreenMarker = { id: string; index: number; x: number; y: number };
type ScreenCluster = { anchor: ScreenMarker; members: ScreenMarker[] };

/** Presentation only: connected components of overlapping 44px hit targets,
 * with 4px clearance. The anchor is an existing point, never a jittered or
 * averaged source coordinate; members retain their original source order. */
export function clusterIndependentSourceMarkers(points: readonly ScreenMarker[], origin?: { x: number; y: number }): ScreenCluster[] {
  const parents = points.map((_, i) => i);
  const root = (i: number): number => { while (parents[i] !== i) i = parents[i]; return i; };
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    if (Math.abs(points[i].x - points[j].x) <= 48 && Math.abs(points[i].y - points[j].y) <= 48) {
      const a = root(i), b = root(j);
      if (a !== b) parents[Math.max(a, b)] = Math.min(a, b);
    }
  }
  const clusters = new Map<number, ScreenMarker[]>();
  points.forEach((point, i) => { const key = root(i); const members = clusters.get(key) ?? []; members.push(point); clusters.set(key, members); });
  return [...clusters.values()].map(members => ({
    // Place a group button on its actual member furthest from the origin so
    // dense near-origin groups do not obscure that glyph. Stable ties retain
    // source order; no member coordinate or number is moved or rewritten.
    anchor: origin ? members.reduce((best, p) => Math.hypot(p.x - origin.x, p.y - origin.y) > Math.hypot(best.x - origin.x, best.y - origin.y) ? p : best, members[0]) : members[0],
    members
  }));
}

export function IndependentSourceContext({ context, locale, showCaveat = true }: { context: IndependentPointObjectContext | U4IndependentContext; locale: "en" | "ru"; showCaveat?: boolean }) {
  const ru = locale === "ru";
  const detailId = useId();
  const briefId = useId();
  const listId = useId();
  const mapId = useId();
  const legendId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(220);
  const [group, setGroup] = useState<IndependentPlaceGroup | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<string[] | null>(null);
  const [mapView, setMapView] = useState<"overview" | "selected">("overview");
  const labels: Record<IndependentPlaceGroup, string> = ru ? { healthcare: "Медицинские записи", education: "Образовательные записи", daily_services: "Повседневные сервисы", transport: "Транспортные записи", hospitality: "Гостиницы", business: "Деловые услуги", civic_culture: "Общественные и культурные", other_service: "Другие услуги" } : { healthcare: "Healthcare records", education: "Education records", daily_services: "Daily services", transport: "Transport records", hospitality: "Hospitality", business: "Business services", civic_culture: "Civic & culture", other_service: "Other services" };
  const shortLabels: Record<IndependentPlaceGroup, string> = ru ? { healthcare: "Медицина", education: "Образование", daily_services: "Сервисы", transport: "Транспорт", hospitality: "Гостиницы", business: "Деловые", civic_culture: "Культура", other_service: "Другие" } : { healthcare: "Healthcare", education: "Education", daily_services: "Services", transport: "Transport", hospitality: "Hotels", business: "Business", civic_culture: "Culture", other_service: "Other" };
  const places = context.places.filter(p => group === "all" || p.group === group);
  const selected = places.find(p => p.id === selectedId) ?? places[0] ?? null;
  const recordIndex = (id: string) => context.places.findIndex(p => p.id === id) + 1;
  const listedPlaces = revealedIds ? places.filter(p => revealedIds.includes(p.id)) : places;
  const groups = [...new Set(context.places.map(p => p.group))];
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString(ru ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : (ru ? "неизвестна" : "unknown");
  const fmt = (value: number) => value.toLocaleString(ru ? "ru-RU" : "en-US", { maximumFractionDigits: 1 });
  const dx = (longitude: number) => (longitude - context.anchor[0]) * 111_320 * Math.cos(context.anchor[1] * Math.PI / 180);
  const dy = (latitude: number) => (latitude - context.anchor[1]) * 110_540;
  const focused = mapView === "selected" && selected !== null;
  const selectedDx = selected ? dx(selected.coordinates[0]) : 0;
  const selectedDy = selected ? dy(selected.coordinates[1]) : 0;
  const extent = focused ? Math.max(5, Math.abs(selectedDx), Math.abs(selectedDy)) : 400;
  const centreX = focused ? selectedDx / 2 : 0;
  const centreY = focused ? selectedDy / 2 : 0;
  const radiusPx = Math.max(1, (plotWidth - 48) / 2);
  const x = (longitude: number) => plotWidth / 2 + (dx(longitude) - centreX) / extent * radiusPx;
  const y = (latitude: number) => plotWidth / 2 - (dy(latitude) - centreY) / extent * radiusPx;
  const originX = x(context.anchor[0]), originY = y(context.anchor[1]);
  const markers = (focused && selected ? [selected] : places).map(p => ({ id: p.id, index: recordIndex(p.id), x: x(p.coordinates[0]), y: y(p.coordinates[1]) }));
  const clusters = clusterIndependentSourceMarkers(markers, { x: originX, y: originY });
  const coincident = focused && markers.length === 1 && Math.hypot(markers[0].x - originX, markers[0].y - originY) < 30;
  const control = "min-h-11 min-w-0 rounded-lg border border-line px-3 py-2 text-start text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f8c]";
  const selectGroup = (next: IndependentPlaceGroup | "all") => { setGroup(next); setRevealedIds(null); setMapView("overview"); };
  const selectPlace = (id: string) => { setSelectedId(id); setMapView("selected"); };

  // One observer on this bounded diagram; no source/API refresh. Initial SSR
  // width is deterministic, then clustering uses actual CSS-pixel distances.
  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const resize = () => { const width = plot.getBoundingClientRect().width; if (width > 0) setPlotWidth(width); };
    resize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(resize);
    observer.observe(plot);
    return () => observer.disconnect();
  }, [context.status]);

  return <section className="mt-5 min-w-0 rounded-2xl border border-[#c8d9ec] bg-[#f8fafc] p-4 sm:p-5" data-testid="independent-source-context" data-source-status={context.status}>
    <h4 className="text-base font-bold text-[#243447]">{ru ? "Независимый снимок услуг · Overture Places" : "Independent service snapshot · Overture Places"}</h4>
    <p className="mt-1 text-[11px] leading-5 text-[#52657a]">{ru ? "Релиз" : "Release"} {context.release} · {ru ? "не live, не официальные данные" : "not live, not official data"} · {context.caseId ?? (ru ? "вне покрытия кейсов" : "outside case coverage")}.</p>
    {context.status !== "available" ? <p className="mt-3 text-xs leading-6 text-[#52657a]" data-testid="independent-source-unknown">{context.status === "unsupported_scope" ? (ru ? "Этот объект или изменённая зона не покрывается допущенным снимком. Окружение неизвестно; ближайший кейс не подставлен." : "This object or altered area is outside the admitted snapshot. Surroundings are unknown; no nearest case was substituted.") : (ru ? "Снимок не удалось проверить или прочитать. Данные неизвестны, не ноль; успешные сохранённые данные не перезаписаны." : "The snapshot could not be validated or read. Data is unknown, not zero; successful held evidence was not overwritten.")}</p> : <>
      {selected ? <div id={briefId} className="mt-3 rounded-xl border border-[#dce6e3] bg-white p-3" data-testid="independent-service-brief" data-overture-id={selected.id} data-record-index={recordIndex(selected.id)} aria-live="polite" aria-atomic="true">
        <p className="break-words text-sm font-bold text-[#243447]" dir="auto">#{recordIndex(selected.id)} · {selected.name} · {fmt(selected.distanceM)} {ru ? "м до точки по прямой" : "m straight-line to point"}</p>
        <p className="mt-1 break-words text-xs leading-5 text-[#52657a]" dir="auto">{selected.address ?? (ru ? "Адрес неизвестен" : "Address unknown")}</p>
        <p className="mt-2 text-xs leading-5 text-[#344054]" data-testid="independent-service-next-action">{selected.taxonomy.primary === "pharmacy" ? (ru ? "Перед предложением собственной аптечной площади проверьте существующую услугу: работа, вход, вертикальный доступ и пешая связь с площадкой." : "Before proposing additional pharmacy space, verify this existing service: operation, entrance, vertical access and walking connection to the site.") : (ru ? "Проверьте роль учреждения, работающую функцию, вход и связь с площадкой перед включением этой услуги в сценарий." : "Verify the establishment role, operating function, entrance and connection to the site before using this service in a scenario.")}</p>
        <p className="mt-1 text-[11px] leading-5 text-[#667085]">{ru ? "Работа, вместимость и маршрут неизвестны; это проверка, не подтверждённое преимущество." : "Operation, capacity and route are unknown; this is a check, not a confirmed advantage."}</p>
      </div> : null}
      <p className="mt-3 text-xs leading-5 text-[#52657a]">{ru ? `${context.places.length} показанных из ${context.sampleSize} допущенных точек в радиусе 400 м. Числа не суммируются с OSM: возможны одни и те же учреждения.` : `${context.places.length} shown from ${context.sampleSize} admitted points within 400 m. Counts are not added to OSM: the same establishments may appear in both.`}</p>
      {context.interiorSampleSize !== null ? <p className="mt-2 text-xs leading-5 text-[#52657a]">{ru ? `${context.interiorSampleSize} допущенных точек внутри точного AOI; это не число реальных объектов. Внешние услуги показаны отдельно и не становятся площадью/составом зоны.` : `${context.interiorSampleSize} admitted points inside the exact AOI; this is not a count of real objects. External services remain separate and do not become the area or composition of the AOI.`}</p> : null}
      {"osmInteriorBaseline" in context ? <p className="mt-2 text-xs leading-5 text-[#6b4b16]" data-testid="u4-osm-interior-error">{ru ? "Сохранённое чтение объектов OSM внутри U4 завершилось ошибкой памяти: количество неизвестно, не ноль. Это историческая квитанция, не новое чтение. Записи отеля, кафе и паба могут быть связанными: не три независимых охвата услуг. Текущая работа и доступ не подтверждены." : "The frozen U4 OSM interior read failed with an out-of-memory error: count unknown, not zero. This is a historical receipt, not a new read. Hotel, cafe and pub records may be associated: not three independent amenity catchments. Current operation and access are unverified."}</p> : null}
      {context.spatialCoverage.state === "partial_circle_clipped_by_acquisition_extent" ? <p className="mt-2 text-xs leading-5 text-[#6b4b16]" data-testid="independent-partial-spatial-coverage">{ru ? "Частичное пространственное покрытие U3: восточный край радиуса 400 м обрезан границей получения примерно на 27,83 м. Количество относится только к полученной части, не полному кругу." : "Partial U3 spatial coverage: the eastern edge of the 400 m radius is clipped by the acquisition extent by about 27.83 m. Counts describe only the acquired portion, not the full circle."}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2" aria-label={ru ? "Категории независимого источника" : "Independent-source categories"}>
        <button type="button" className={control} aria-pressed={group === "all"} onClick={() => selectGroup("all")}>{ru ? "Все" : "All"}</button>
        {groups.map(g => <button type="button" key={g} className={control} aria-label={labels[g]} aria-pressed={group === g} onClick={() => selectGroup(g)}>{shortLabels[g]}</button>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <figure className="min-w-0"><figcaption className="text-xs font-bold text-[#344054]">{ru ? "Точки учреждений · не границы зданий" : "Establishment points · not building boundaries"}</figcaption>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={control} aria-pressed={!focused} aria-controls={mapId} onClick={() => setMapView("overview")} data-testid="independent-map-overview">{ru ? "Обзор 400 м" : "400 m overview"}</button>
            <button type="button" className={control} aria-pressed={focused} aria-controls={mapId} disabled={!selected} onClick={() => setMapView("selected")} data-testid="independent-map-focus">{ru ? "Выбранная запись" : "Focus selected"}</button>
          </div>
          <div ref={plotRef} id={mapId} className="relative mt-2 aspect-square w-full max-w-[300px] rounded-xl bg-white" data-testid="independent-point-plot" data-map-view={focused ? "selected" : "overview"} aria-describedby={legendId}>
            <svg viewBox={`0 0 ${plotWidth} ${plotWidth}`} className="absolute inset-0 h-full w-full" role="img" aria-label={focused ? (ru ? "Исходная точка и выбранная запись; увеличенная схема" : "Origin and selected record; focus diagram") : (ru ? "Показанные записи в радиусе 400 м; север сверху" : "Shown records within 400 m; north at top")}>
              {!focused ? <circle cx={originX} cy={originY} r={radiusPx} fill="none" stroke="#c8d9d6" /> : null}
              <path d={`M${originX} 24V${plotWidth - 24}M24 ${originY}H${plotWidth - 24}`} stroke="#dce6e3" />
              <text x={plotWidth / 2} y="14" textAnchor="middle" fontSize="10" fill="#52657a">{focused ? "N" : "N · 400 m"}</text>
              {markers.map(p => <circle key={p.id} cx={p.x} cy={p.y} r="2" fill="#087f8c" />)}
            </svg>
            {clusters.map(cluster => {
              const containsSelected = cluster.members.some(p => p.id === selected?.id);
              const multiple = cluster.members.length > 1;
              const record = places.find(p => p.id === cluster.anchor.id)!;
              return <button type="button" key={cluster.anchor.id}
                style={{ left: `${cluster.anchor.x / plotWidth * 100}%`, top: `${cluster.anchor.y / plotWidth * 100}%` }}
                className={`absolute z-10 flex h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#243447] ${containsSelected ? "bg-[#243447] ring-2 ring-[#087f8c]" : "bg-[#087f8c]"}`}
                aria-label={multiple ? (ru ? `${cluster.members.length} записей в группе на схеме. Открыть список.` : `${cluster.members.length} records in diagram cluster. Open member list.`) : `#${cluster.anchor.index} · ${record.name}`}
                aria-pressed={multiple ? cluster.members.every(p => revealedIds?.includes(p.id)) : containsSelected}
                aria-expanded={multiple ? cluster.members.every(p => revealedIds?.includes(p.id)) : undefined}
                aria-controls={multiple ? listId : `${briefId} ${detailId}`}
                onClick={() => { if (multiple) { setRevealedIds(cluster.members.map(p => p.id)); setMapView("overview"); } else selectPlace(cluster.anchor.id); }}
                onKeyDown={e => { if (e.key === "Escape") setRevealedIds(null); }}
                data-testid={multiple ? "independent-marker-cluster" : "independent-point-marker"}
                data-cluster-size={cluster.members.length} data-member-ids={cluster.members.map(p => p.id).join(",")} data-record-indexes={cluster.members.map(p => p.index).join(",")}
                data-overture-id={multiple ? undefined : cluster.anchor.id} data-record-index={multiple ? undefined : cluster.anchor.index}
                data-selected-member-index={containsSelected && selected ? recordIndex(selected.id) : undefined}>
                {multiple ? <span><span className="block leading-4">{cluster.members.length}</span><span className="block text-[9px] leading-3">{ru ? "записей" : "records"}</span></span> : cluster.anchor.index}
              </button>;
            })}
            <span aria-hidden="true" className="pointer-events-none absolute z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-[#243447] bg-white ring-2 ring-white" style={{ left: `${originX / plotWidth * 100}%`, top: `${originY / plotWidth * 100}%` }} data-testid="independent-origin" />
          </div>
          <p id={legendId} className="mt-2 text-[11px] leading-5 text-[#52657a]" data-testid="independent-map-legend"><span className="font-bold text-[#243447]">◇</span> {ru ? "Исходная точка" : "Selected-object origin"} · {selected ? `#${recordIndex(selected.id)} ${ru ? "выбрана" : "selected"}` : (ru ? "нет выбранной записи" : "no record selected")}. {focused ? (ru ? "Увеличена выбранная запись; остальные доступны через список. Радиус источника — 400 м." : "Focus view; other records remain accessible through the list. Source scope remains 400 m.") : (ru ? "Экранные группы показывают число записей; выберите любую в списке. Учреждения не объединены." : "Screen clusters show record counts; choose any member in the list. Establishments are not merged.")}{coincident ? (ru ? " Запись и исходная точка совпадают на схеме при этом масштабе; координаты не сдвинуты." : " Record and origin coincide at this display scale; coordinates have not been shifted.") : ""}</p>
        </figure>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-[#344054]" aria-live="polite" data-testid="independent-cluster-status">{revealedIds ? (ru ? `${listedPlaces.length} записей выбранной группы` : `${listedPlaces.length} records in selected cluster`) : (ru ? `${places.length} показанных записей` : `${places.length} shown records`)}</p>{revealedIds ? <button type="button" className={control} onClick={() => setRevealedIds(null)} data-testid="independent-cluster-clear">{ru ? "Весь список" : "Show all"}</button> : null}</div>
          <ol id={listId} className="max-h-[240px] space-y-2 overflow-y-auto" data-testid="independent-place-list">{listedPlaces.map(p => <li key={p.id}><button type="button" onClick={() => selectPlace(p.id)} aria-pressed={selected?.id === p.id} aria-controls={`${briefId} ${detailId} ${mapId}`} className={`${control} min-h-12 w-full ${selected?.id === p.id ? "border-[#087f8c] bg-white" : ""}`} data-testid="independent-place-select" data-overture-id={p.id} data-record-index={recordIndex(p.id)}><span className="block break-words font-bold" dir="auto">{recordIndex(p.id)}. {p.name}</span><span className="mt-1 block leading-5 text-[#52657a]">{fmt(p.distanceM)} {ru ? "м по прямой до точки" : "m straight-line to point"} · {p.taxonomy.primary.replaceAll("_", " ")}</span></button></li>)}</ol>
        </div>
      </div>
      <div id={detailId} className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-[#344054]" aria-live="polite" aria-atomic="true" data-testid="independent-place-detail" data-overture-id={selected?.id}>{selected ? <>
        <strong>{ru ? `Доказательства записи #${recordIndex(selected.id)}` : `Evidence for record #${recordIndex(selected.id)}`}</strong>
        <p className="mt-1">{ru ? "Обновление поставщика" : "Provider update"}: {date(selected.providerUpdatedAt)}. {ru ? "Полевая дата неизвестна; дата релиза и confidence не являются физическим наблюдением." : "Field date unknown; release and confidence dates are not physical observations."}</p>
        <details className="mt-1" data-testid="independent-record-lineage"><summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087f8c]">{ru ? "Метод, происхождение и качество" : "Method, lineage & quality"}</summary><p>{ru ? "Расстояние: haversine от исходного центра до картированной точки, не маршрут. Адрес и близость не доказывают работу, доступ или вместимость; они неизвестны." : "Distance: haversine from original centre to mapped point, not a route. Address and proximity do not establish operation, access or capacity; these remain unknown."}</p><p className="break-all">GERS {selected.id} · {selected.evidenceRef}</p><p className="break-words">WGS84 [{selected.coordinates.join(", ")}]</p><p>{ru ? "Категория источника" : "Source category"}: {selected.taxonomy.hierarchy.join(" → ")} · {selected.basic_category}</p><p>{ru ? "Confidence источника (эвристика, не вероятность текущей работы)" : "Source confidence (heuristic, not probability of current operation)"}: {selected.confidence}</p>{selected.sources.map((s, i) => <p key={i} className="break-words">{s.provider} · {s.record_id ?? s.resource} · {s.property === "/properties/confidence" ? (ru ? "расчёт confidence, не физический источник" : "confidence calculation, not physical source") : (ru ? "запись поставщика" : "provider record")} · {date(s.update_time)} · {s.license}</p>)}</details>
      </> : <p>{ru ? "В показанной части снимка нет записей этой категории; это не отсутствие услуг." : "No records of this category in the displayed subset; this is not absence of services."}</p>}</div>
    </>}
    <p className="mt-3 text-[10px] leading-5 text-[#667085]">{context.attribution}. {ru ? "Имена сохранены на языке источника. Получение началось" : "Names retain their source language. Acquisition started"} {date(context.acquisitionStartedAt)}; {context.fetchedAt ? `${ru ? "завершилось" : "completed"} ${date(context.fetchedAt)}. ` : (ru ? "точное время завершения неизвестно. " : "exact completion time unknown. ")}{ru ? "Не полная инвентаризация." : "Not a complete inventory."} <a className="inline-flex min-h-11 items-center font-semibold text-[#087f8c] underline" href={context.licencePath} target="_blank" rel="noreferrer">CDLA-Permissive-2.0</a></p>
    <details><summary className="min-h-11 cursor-pointer text-[11px] leading-[44px] text-[#52657a]">{ru ? "Граница полученных данных" : "Acquisition extent"}</summary><p className="break-words text-[11px] leading-5 text-[#52657a]">WGS84 bbox [{context.spatialCoverage.acquisitionExtent.join(", ")}] · {context.spatialCoverage.state}. {ru ? "Полный пространственный круг не означает полную инвентаризацию." : "A complete spatial circle is not a complete inventory."}</p></details>
    {showCaveat ? <p className="text-[11px] leading-5 text-[#667085]">Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.</p> : null}
  </section>;
}
