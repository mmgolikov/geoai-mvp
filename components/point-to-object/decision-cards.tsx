"use client";

import { useState } from "react";
import type { GroundedClaim, PointObjectGeoContext } from "./live-types";
import { usePointObjectLocale } from "./locale-provider";
import { decisionContextSummary, decisionViews, POINT_OBJECT_DASHBOARD_VERSION, type DecisionCardId, type DecisionViewId } from "@/src/lib/prototype/point-to-object-dashboard-registry";
import styles from "./decision-cards.module.css";

type Props = {
  context: PointObjectGeoContext | null;
  generatedAt: string;
  reportPerspective: string;
  places: GroundedClaim[];
  groupLabels: Record<string, string>;
  districtLabels: Record<string, string>;
};

export function PointObjectDecisionCards({ context, generatedAt, reportPerspective, places, groupLabels, districtLabels }: Props) {
  const { locale } = usePointObjectLocale();
  const [view, setView] = useState<DecisionViewId>("development");
  const preset = decisionViews[view];
  const data = decisionContextSummary(context);
  const ru = locale === "ru";
  const empty = ru ? "Нет данных" : "Not available";
  const distance = (value: number | null) => value === null ? (data.available ? (ru ? "Не найдено в выборке" : "Not returned in sample") : (ru ? "Источник недоступен" : "Context unavailable")) : `${value.toLocaleString(locale)} ${ru ? "м" : "m"}`;
  const titles: Record<DecisionCardId, string> = {
    district: ru ? "Характер района" : "District character",
    access: ru ? "Транспорт рядом" : "Transport nearby",
    daily_needs: view === "living" ? (ru ? "Повседневная инфраструктура" : "Everyday infrastructure") : (ru ? "Функции окружения" : "Surrounding uses"),
    building_context: ru ? "Застройка в выборке" : "Buildings in the sample",
    places: ru ? "Детали окружения" : "Local context",
    next_check: ru ? "Следующая проверка" : "Next check"
  };
  const selectedGroups = data.groups.filter((group) => (preset.groups as readonly string[]).includes(group.group));
  const sourceNote = ru ? "OSM · возвращённая выборка, не полный реестр" : "OSM · returned sample, not a complete register";
  const timestamp = new Date(generatedAt);
  const timeLabel = Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : empty;

  function body(id: DecisionCardId) {
    switch (id) {
      case "district": return <>
        <p className="mt-3 text-xl font-bold leading-7 text-[#173b35]">{data.available && context ? districtLabels[context.districtCharacter.code] ?? empty : empty}</p>
        <p className="mt-3 text-sm leading-6 text-muted">{context && data.available ? context.districtCharacter.driverGroups.map((group) => groupLabels[group] ?? group).join(" · ") || (ru ? "Недостаточный сигнал" : "Insufficient signal") : (ru ? "Нет основания определять тип района." : "No evidence for assigning a district type.")}</p>
        <p className="mt-3 text-xs text-muted">{ru ? "Расчёт по составу объектов, не официальная классификация." : "Derived from mapped feature mix, not an official classification."}</p>
        {data.available && context ? <p className="mt-2 text-xs font-semibold text-muted">{ru ? "Уверенность" : "Confidence"}: {context.districtCharacter.confidence === "medium" ? (ru ? "средняя" : "medium") : (ru ? "низкая — нужна проверка" : "low — needs validation")}</p> : null}
      </>;
      case "access": return <>
        <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-[#087f8c]">{distance(data.transitM)}</p>
        <p className="mt-1 text-sm text-muted">{ru ? "до ближайшей найденной точки транспорта" : "to the nearest returned transit point"}</p>
        <div className="mt-4 flex justify-between gap-3 border-t border-line pt-3 text-sm"><span>{ru ? "Магистраль" : "Major road"}</span><strong className="tabular-nums">{distance(data.roadM)}</strong></div>
        <p className="mt-3 text-xs leading-5 text-muted">{ru ? "По прямой. Это не время пешком или в пути и не оценка качества транспорта." : "Straight-line distance. Not walking time, travel time or a transport-quality score."}</p>
      </>;
      case "daily_needs": return selectedGroups.length ? <><p className="mt-3 text-xs leading-5 text-muted">{ru ? `Доля от всех ${data.sampleSize} полученных объектов. Показана часть категорий, не доля площади.` : `Share of all ${data.sampleSize} returned features. Displayed groups are a subset, not an area share.`}</p><ul className="mt-3 space-y-3">{selectedGroups.map((group) => <li key={group.group}>
        <div className="mb-1 flex justify-between gap-3 text-xs"><span>{groupLabels[group.group] ?? group.group}</span><strong className="tabular-nums">{group.count} · {group.sharePct}%</strong></div>
        <meter className={styles.meter} min={0} max={100} value={group.sharePct} aria-label={`${groupLabels[group.group] ?? group.group}: ${group.sharePct}%`}>{group.sharePct}%</meter>
      </li>)}</ul></> : <p className="mt-4 text-sm leading-6 text-muted">{data.available ? (ru ? "В этой выборке нужные категории не найдены. Это не означает, что объектов нет." : "Relevant categories were not returned in this sample. This does not establish absence.") : empty}</p>;
      case "building_context": return <>
        <p className="mt-3 text-3xl font-bold tabular-nums">{data.buildings ?? "—"}</p>
        <p className="mt-1 text-sm text-muted">{ru ? "найденных зданий" : "returned buildings"}</p>
        <div className="mt-4 flex justify-between gap-3 border-t border-line pt-3 text-sm"><span>{ru ? "Медиана этажей" : "Median levels"}</span><strong>{data.levels ?? "—"}</strong></div>
        <p className="mt-3 text-xs leading-5 text-muted">{data.available && context ? `${context.mappedLevelsKnownCount}/${context.mappedBuildingCount} ${ru ? "зданий с известной этажностью. Не параметры выбранного здания." : "buildings have level data. Not the selected building’s dimensions."}` : empty}</p>
      </>;
      case "places": return places.length ? <ul className="mt-3 space-y-3">{places.slice(0, 2).map((place, index) => <li key={index} className="text-sm leading-6 text-[#344054]">{place.statement}<details className="mt-1 text-[11px] text-muted"><summary className="cursor-pointer">{ru ? "Основание" : "Evidence"}</summary>{place.evidenceRefs.join(" · ")}</details></li>)}</ul> : <p className="mt-4 text-sm leading-6 text-muted">{ru ? "Проверенные именованные ориентиры не возвращены. Не подменяем их случайными подписями карты." : "No evidence-backed named landmarks were returned. Map labels are not substituted as verified facts."}</p>;
      case "next_check": return <>
        <p className="mt-3 text-base font-semibold leading-7 text-[#173b35]">{preset.next[locale]}</p>
        <p className="mt-4 text-xs leading-5 text-muted">{ru ? "Рекомендация для сценария, не подтверждённый вывод об объекте." : "Scenario guidance, not a verified conclusion about the asset."}</p>
      </>;
    }
  }

  return <section data-testid="role-decision-cards" data-dashboard-version={POINT_OBJECT_DASHBOARD_VERSION} aria-labelledby="decision-dashboard-title">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div><h2 id="decision-dashboard-title" className="text-xl font-bold tracking-tight">{ru ? "Локация с первого взгляда" : "Location at a glance"}</h2><p className="mt-1 text-sm text-muted">{preset.question[locale]}</p></div>
      <label className="block text-xs font-semibold text-muted">{ru ? "Профиль просмотра" : "Viewing profile"}<select aria-label={ru ? "Профиль просмотра" : "Viewing profile"} value={view} onChange={(event) => setView(event.target.value as DecisionViewId)} className="mt-1 block min-h-11 max-w-full rounded-xl border border-line bg-white px-3 text-sm text-ink">{Object.entries(decisionViews).map(([key, option]) => <option key={key} value={key}>{option.label[locale]}</option>)}</select></label>
    </div>
    <p className="mb-3 text-xs leading-5 text-muted">{ru ? "Это профиль просмотра фактов, не новый ролевой анализ. Исходный отчёт ниже:" : "This is an evidence viewing profile, not a new role-specific analysis. Original report below:"} {reportPerspective}. {ru ? "Смена профиля не вызывает AI." : "Switching profile does not call AI."} {data.radiusM !== null ? `${ru ? "Выборка в радиусе" : "Sample radius"} ${data.radiusM} ${ru ? "м" : "m"}. ` : ""}{ru ? "Сформирован" : "Report generated"}: {timeLabel}. {ru ? "Дата обновления самого источника неизвестна." : "Source data update time is unknown."}</p>
    <div className="grid gap-3 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-3">{preset.cards.map((id) => <article key={id} data-card={id} className="flex min-w-0 flex-col rounded-[20px] border border-line bg-white p-5 shadow-soft">
      <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#087f8c]">{titles[id]}</h3>
      <div className="flex-1">{body(id)}</div>
      <p className="mt-4 border-t border-line pt-3 text-[10px] leading-4 text-muted">{id === "next_check" ? POINT_OBJECT_DASHBOARD_VERSION : sourceNote}</p>
    </article>)}</div>
    {context?.capReached ? <p role="note" className="mt-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]">{ru ? "Лимит выборки достигнут. Доли относятся только к полученным объектам, не ко всему району." : "Sample cap reached. Shares describe returned features only, not the entire district."}</p> : null}
    <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer">{ru ? "Происхождение и ограничения" : "Lineage & limitations"}</summary><p className="mt-2">{sourceNote}</p><p className="mt-1">{ru ? "Один снимок результата. Нет измерения пешеходных маршрутов, спроса, стоимости или разрешённого использования." : "One result snapshot. Walking routes, demand, valuation and permitted use are not measured."}</p></details>
  </section>;
}
