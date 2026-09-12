"use client";

import { useState } from "react";
import type { GroundedClaim, PointObjectGeoContext } from "./live-types";
import { usePointObjectLocale } from "./locale-provider";
import { PointObjectIcon, type PointObjectIconName } from "./point-object-icons";
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

type InfrastructureCard = {
  id: "transport" | "school" | "health" | "parks" | "daily_needs" | "culture" | "tourism";
  group: "transport" | "education" | "healthcare" | "open_space" | "retail_daily_needs" | "civic_culture" | "hospitality";
  icon: PointObjectIconName;
  title: { en: string; ru: string };
};

const INFRASTRUCTURE_CARDS: InfrastructureCard[] = [
  { id: "transport", group: "transport", icon: "transport", title: { en: "Transport", ru: "Транспорт" } },
  { id: "school", group: "education", icon: "school", title: { en: "Education", ru: "Образование" } },
  { id: "health", group: "healthcare", icon: "health", title: { en: "Healthcare", ru: "Медицина" } },
  { id: "parks", group: "open_space", icon: "parks", title: { en: "Green & open spaces", ru: "Зелёные и открытые пространства" } },
  { id: "daily_needs", group: "retail_daily_needs", icon: "daily-needs", title: { en: "Daily needs", ru: "Повседневные нужды" } },
  { id: "culture", group: "civic_culture", icon: "culture", title: { en: "Civic & culture", ru: "Городские и культурные объекты" } },
  { id: "tourism", group: "hospitality", icon: "tourism", title: { en: "Hospitality", ru: "Гостиницы и размещение" } }
];

export function PointObjectDecisionCards({ context, generatedAt, reportPerspective, places, groupLabels, districtLabels }: Props) {
  const { locale } = usePointObjectLocale();
  const [view, setView] = useState<DecisionViewId>("development");
  const preset = decisionViews[view];
  const data = decisionContextSummary(context);
  const ru = locale === "ru";
  const empty = ru ? "Нет данных" : "Not available";
  const distance = (value: number | null) => value === null ? "—" : `${value.toLocaleString(locale)} ${ru ? "м" : "m"}`;
  const missingDistance = data.available
    ? (ru ? "Нет данных в этой выборке." : "No data in this sample.")
    : (ru ? "Источник контекста недоступен." : "Context source unavailable.");
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

  function infrastructureMetric(card: InfrastructureCard) {
    if (!data.available || !context) return { count: null, nearestM: null };
    const group = context.groups.find((item) => item.group === card.group);
    return {
      count: group?.count ?? null,
      nearestM: card.id === "transport" ? context.nearestTransitM : group?.nearestDistanceM ?? null
    };
  }

  function infrastructureSentence(card: InfrastructureCard) {
    const metric = infrastructureMetric(card);
    if (!data.available) return ru ? "Источник контекста недоступен." : "Context source is unavailable.";
    if (card.id === "transport" && metric.nearestM !== null) {
      return metric.count === null
        ? (ru ? "Ближайшая возвращённая точка транспорта; расстояние по прямой, не время в пути. Количество в сводке не указано." : "Nearest returned transit point; straight-line distance, not travel time. This summary does not report a count.")
        : (ru ? `${metric.count} объектов на карте; расстояние по прямой, не время в пути.` : `${metric.count} mapped features; straight-line distance, not travel time.`);
    }
    if (metric.count === null) return ru ? "Совпадающие объекты не вернулись в этой выборке." : "No matching feature was returned in this sample.";
    const countText = ru ? `${metric.count} объектов на карте` : `${metric.count} mapped ${metric.count === 1 ? "feature" : "features"}`;
    return metric.nearestM === null
      ? `${countText}${ru ? " в радиусе выборки." : " within the sample radius."}`
      : `${countText}; ${ru ? "ближайший —" : "nearest is"} ${metric.nearestM.toLocaleString(locale)} ${ru ? "м по прямой." : "m straight-line."}`;
  }

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
        <p className="mt-1 text-sm text-muted">{data.transitM === null ? missingDistance : (ru ? "до ближайшей найденной точки транспорта" : "to the nearest returned transit point")}</p>
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
    <section className="mb-5" aria-labelledby="infrastructure-cards-title" data-testid="infrastructure-cards">
      <div className="mb-3"><h3 id="infrastructure-cards-title" className="text-base font-bold">{ru ? "Инфраструктура в выборке" : "Infrastructure in the sample"}</h3><p className="mt-1 text-xs leading-5 text-muted">{ru ? "Количество и ближайшее прямое расстояние по объектам, вернувшимся из OSM. Это не рейтинг качества и не время в пути." : "Counts and nearest straight-line distance for features returned by OSM. These are not quality scores or travel times."}</p></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{INFRASTRUCTURE_CARDS.map((card) => {
        const metric = infrastructureMetric(card);
        const primaryMetric = card.id === "transport" && metric.nearestM !== null ? `${metric.nearestM.toLocaleString(locale)} ${ru ? "м" : "m"}` : metric.count ?? "—";
        return <article key={card.id} data-infrastructure={card.id} className="min-w-0 rounded-2xl border border-[#d8e3e0] bg-[#fbfcfc] p-4"><div className="flex items-center justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f4ef] text-[#087f8c]"><PointObjectIcon name={card.icon} className="h-5 w-5" /></span><strong className="text-2xl font-bold tabular-nums text-[#087f8c]">{primaryMetric}</strong></div><h4 className="mt-3 text-sm font-bold text-[#243447]">{card.title[locale]}</h4><p className="mt-1 text-xs leading-5 text-[#667085]">{infrastructureSentence(card)}</p></article>;
      })}</div>
    </section>
    <div className="grid gap-3 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-3">{preset.cards.map((id) => <article key={id} data-card={id} className="flex min-w-0 flex-col rounded-[20px] border border-line bg-white p-5 shadow-soft">
      <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#087f8c]">{titles[id]}</h3>
      <div className="flex-1">{body(id)}</div>
    </article>)}</div>
    {context?.capReached ? <p role="note" className="mt-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]">{ru ? "Лимит выборки достигнут. Доли относятся только к полученным объектам, не ко всему району." : "Sample cap reached. Shares describe returned features only, not the entire district."}</p> : null}
    <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer">{ru ? "Происхождение и ограничения" : "Lineage & limitations"}</summary><p className="mt-2">{sourceNote}</p><p className="mt-1">{ru ? "Один снимок результата. Нет измерения пешеходных маршрутов, спроса, стоимости или разрешённого использования." : "One result snapshot. Walking routes, demand, valuation and permitted use are not measured."}</p></details>
  </section>;
}
