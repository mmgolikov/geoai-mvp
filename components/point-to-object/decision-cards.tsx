"use client";

import { useState } from "react";
import type { GroundedClaim, PointObjectGeoContext, PointObjectAiContent, PointObjectAnalysisRequestReceipt } from "./live-types";
import { usePointObjectLocale } from "./locale-provider";
import { PointObjectIcon, type PointObjectIconName } from "./point-object-icons";
import { dashboardCategoryRows, dashboardLayout, decisionContextSummary, decisionViews, POINT_OBJECT_DASHBOARD_VERSION, type DecisionCardId, type DashboardModule } from "@/src/lib/prototype/point-to-object-dashboard-registry";
import styles from "./decision-cards.module.css";

type Props = {
  context: PointObjectGeoContext | null;
  generatedAt: string;
  reportPerspective: string;
  places: GroundedClaim[];
  groupLabels: Record<string, string>;
  districtLabels: Record<string, string>;
  request: PointObjectAnalysisRequestReceipt;
  content: Omit<PointObjectAiContent, "initialSemanticBrief">;
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

export function PointObjectDecisionCards({ context, generatedAt, reportPerspective, places, groupLabels, districtLabels, request, content }: Props) {
  const { locale } = usePointObjectLocale();
  const view = request.scenario.startsWith("b2c_") ? "living" : "development";
  const [category, setCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const layout = dashboardLayout(request);
  const rows = dashboardCategoryRows(context);
  const selected = rows.find(row => row.group === category);
  const review = content.depthReview?.depth === request.depth ? content.depthReview : undefined;
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
  const visibleRows = showAll ? rows : rows.slice(0, 6);
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
      case "daily_needs": return rows.length ? <>
        <p className="mt-3 text-xs leading-5 text-muted">{ru ? `Число и доля от всех ${data.sampleSize} полученных объектов OSM в радиусе ${data.radiusM} м. Не доля площади или населения.` : `Counts and shares of all ${data.sampleSize} returned OSM features within ${data.radiusM} m. Not land-area or population shares.`}</p>
        <div className={styles.chart}>{visibleRows.map(group => <button type="button" key={group.group} className={styles.category} aria-pressed={category === group.group} aria-controls="dashboard-category-detail" data-category={group.group} onClick={() => setCategory(category === group.group ? null : group.group)}>
          <span className={styles.categoryLabel}>{groupLabels[group.group] ?? group.group}</span>
          <span className={styles.track} aria-hidden="true"><span style={{ width: `${group.sharePct ?? 0}%` }} /></span>
          <strong className={styles.categoryValue}>{group.count ?? "—"}<small>{group.sharePct === null ? "—" : `${group.sharePct}%`}</small></strong>
        </button>)}</div>
        {rows.length > 6 ? <button type="button" className={styles.localButton} aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? (ru ? "Свернуть категории" : "Show fewer categories") : (ru ? `Все категории (${rows.length})` : `All categories (${rows.length})`)}</button> : null}
        <div className={styles.detail} id="dashboard-category-detail" aria-live="polite">{selected ? <><h4 className="font-bold">{groupLabels[selected.group] ?? selected.group}</h4><dl className={styles.metrics}><div><dt>{ru ? "Объекты" : "Features"}</dt><dd>{selected.count ?? "—"}</dd></div><div><dt>{ru ? "Доля выборки" : "Sample share"}</dt><dd>{selected.sharePct === null ? "—" : `${selected.sharePct}%`}</dd></div><div><dt>{ru ? "Ближайший, по прямой" : "Nearest, straight-line"}</dt><dd>{distance(selected.nearestDistanceM)}</dd></div></dl><p className="text-xs leading-5 text-muted">{ru ? "Агрегат OSM. Геометрия категории и маршрут не предоставлены. Фильтр меняет только локальный вид." : "OSM aggregate. Category geometry and routes are not supplied. This filter changes only the local view."}</p></> : <p className="text-xs leading-5 text-muted">{ru ? "Выберите категорию: количество, основание доли и расстояние. Без нового AI-запроса." : "Select a category to inspect its count, denominator and distance. No new AI request."}</p>}</div>
        {rows.some(row => !row.reconciled) ? <p className="mt-3 text-xs text-[#79520d]" role="note">{ru ? "Часть долей не согласуется с размером выборки и скрыта. Проверьте источник." : "Some shares do not reconcile with the sample denominator and are withheld. Check the source."}</p> : null}
        <details className={styles.tableDisclosure}><summary>{ru ? "Таблица данных и метод" : "Data table & method"}</summary><div className={styles.tableWrap}><table><caption>{ru ? "Выборка OSM · метры по прямой · дата обновления источника неизвестна" : "OSM sample · straight-line metres · source update date unknown"}</caption><thead><tr><th scope="col">{ru ? "Категория" : "Category"}</th><th scope="col">{ru ? "Число" : "Count"}</th><th scope="col">%</th><th scope="col">{ru ? "Ближайший (м)" : "Nearest (m)"}</th></tr></thead><tbody>{rows.map(row => <tr key={row.group}><th scope="row">{groupLabels[row.group] ?? row.group}</th><td>{row.count ?? "—"}</td><td>{row.sharePct ?? "—"}</td><td>{row.nearestDistanceM ?? "—"}</td></tr>)}</tbody></table></div></details>
      </> : <p className="mt-4 text-sm leading-6 text-muted">{data.available ? (ru ? "Категории не возвращены. Отсутствие объектов не установлено." : "No categories returned. Absence of features is not established.") : empty}</p>;
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

  const moduleTitles: Record<DashboardModule, string> = {
    surroundings: ru ? "Функции окружения" : "Surrounding uses", district: titles.district,
    access: titles.access, buildings: titles.building_context,
    coverage: ru ? "Известные и отсутствующие данные" : "Known & missing evidence",
    risks: ru ? "Ограничения и риски" : "Constraints & risks",
    alternatives: ru ? "Альтернативы для проверки" : "Alternatives to validate",
    validation: ru ? "План проверки" : "Validation plan",
    challenge: ru ? "Проверка устойчивости решения" : "Decision challenge"
  };
  const refs = (values: string[]) => <details className={styles.references}><summary>{ru ? "Основание" : "Evidence"}</summary><p>{values.join(" · ") || empty}</p></details>;
  function moduleBody(id: DashboardModule) {
    if ((id === "risks" && !content.risks.length) || (id === "validation" && !content.nextValidation.length)) return <p className="mt-4 text-sm text-muted">{ru ? "Не возвращено в этом снимке. Отсутствие не установлено." : "Not returned in this snapshot. Absence is not established."}</p>;
    if (id === "surroundings") return body("daily_needs");
    if (id === "buildings") return body("building_context");
    if (id === "district" || id === "access") return body(id);
    if (id === "coverage") return <><dl className={styles.coverage}>
      <div><dt>{ru ? "Окружение OSM" : "OSM context"}</dt><dd>{data.available ? context?.capReached ? (ru ? "Частично · лимит" : "Partial · capped") : (ru ? "Выборка получена" : "Sample returned") : empty}</dd></div>
      <div><dt>{ru ? "Этажность зданий" : "Building levels"}</dt><dd>{data.available && context ? `${context.mappedLevelsKnownCount}/${context.mappedBuildingCount}` : "—"}</dd></div>
      <div><dt>{ru ? "Обновление источника" : "Source update date"}</dt><dd>{ru ? "Неизвестно" : "Unknown"}</dd></div>
      <div><dt>{ru ? "Разрешения / права" : "Permission / title"}</dt><dd>{ru ? "Не подтверждены" : "Not validated"}</dd></div>
      <div><dt>{ru ? "Цены / доходность / маршруты" : "Prices / returns / routes"}</dt><dd>{ru ? "Не измерены" : "Not measured"}</dd></div>
    </dl><p className="mt-3 text-xs leading-5 text-muted">{ru ? "Известное/неизвестное — не балл уверенности. Выборка не означает полное покрытие." : "Known/unknown states are not a confidence score. A returned sample is not complete geographic coverage."}</p></>;
    if (id === "risks") return <ul className={styles.items}>{content.risks.map((risk,i) => <li key={i}><h4>{risk.title}</h4><p>{risk.statement}</p><p className="text-muted">{risk.decisionImpact}</p>{refs(risk.evidenceRefs)}</li>)}</ul>;
    if (id === "validation") return <ol className={styles.items}>{content.nextValidation.map((item,i) => <li key={i}><h4>{item.title}</h4><p>{item.action}</p><p className="text-muted">{item.source} · {item.decisionImpact}</p>{refs(item.evidenceRefs)}</li>)}</ol>;
    if (id === "alternatives") return <><p className="mt-3 text-xs leading-5 text-muted">{ru ? "Гипотезы скрининга, не одобренные проекты. Геометрия A/B и экономический результат в этом анализе не представлены." : "Screening hypotheses, not approved proposals. This analysis does not supply A/B geometry or economic outcomes."}</p>{review?.alternatives.length ? <div className={styles.alternatives}>{review.alternatives.map((item,i) => <article key={i}><span className="text-xs text-muted">{ru ? "Гипотеза" : "Hypothesis"} {i+1}</span><h4 className="mt-2 font-bold">{item.title}</h4><p>{item.rationale}</p>{refs(item.evidenceRefs)}</article>)}</div> : content.opportunities.length ? <ul className={styles.items}>{content.opportunities.map((item,i) => <li key={i}><h4>{item.title}</h4><p>{item.hypothesis}</p><p className="text-muted">{item.rationale}</p><details><summary>{ru ? "Необходимые данные" : "Evidence needed"}</summary><p>{item.evidenceNeeded.join(" · ") || empty}</p>{refs(item.evidenceRefs)}</details></li>)}</ul> : <p className="mt-4 text-sm text-muted">{empty}</p>}</>;
    return review ? <><p className="mt-3 text-xs text-muted">{ru ? "Проверка того же снимка; новый сбор данных не подразумевается." : "Challenge the same snapshot; no new source acquisition is implied."}</p><div className={styles.alternatives}><div><h4 className="font-bold">{ru ? "Неопределённости" : "Uncertainties"}</h4>{review.uncertainties.map((item,i) => <details key={i}><summary>{item.title}</summary><p>{item.statement}</p><p>{item.decisionImpact}</p>{refs(item.evidenceRefs)}</details>)}</div><div><h4 className="font-bold">{ru ? "Условия пересмотра" : "Decision triggers"}</h4>{review.decisionTriggers.map((item,i) => <details key={i}><summary>{item.title}</summary><p>{item.action}</p><p>{item.decisionImpact}</p>{refs(item.evidenceRefs)}</details>)}</div></div></> : <p className="mt-4 text-sm text-muted">{ru ? "Соответствующая глубокая проверка не получена. Исходные данные сохранены." : "No matching deep review returned. Original evidence is preserved."}</p>;
  }

  return <section className={styles.dashboard} data-testid="role-decision-cards" data-goal={request.goal} data-depth={request.depth} data-scenario={request.scenario} data-dashboard-version={POINT_OBJECT_DASHBOARD_VERSION} aria-labelledby="decision-dashboard-title">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold text-[#087f8c]">{ru ? "Завершённый анализ" : "Completed analysis"} · {request.depth === "quick" ? (ru ? "Быстрый" : "Quick") : request.depth === "deep" ? (ru ? "Глубокий" : "Deep") : (ru ? "Стандартный" : "Standard")} · {reportPerspective}</p><h2 id="decision-dashboard-title" className="text-2xl font-bold tracking-tight">{layout.label[locale]}</h2><p className="mt-1 text-sm text-muted">{request.goal === "custom" && request.question ? request.question : layout.question[locale]}</p></div>
    </div>
    <p className="mb-3 text-xs leading-5 text-muted">{ru ? "Локальные раскрытия не вызывают AI." : "Local drilldowns do not call AI."} {data.radiusM !== null ? `${ru ? "Выборка в радиусе" : "Sample radius"} ${data.radiusM} ${ru ? "м" : "m"}. ` : ""}{ru ? "Сформирован" : "Report generated"}: {timeLabel}. {ru ? "Дата обновления самого источника неизвестна." : "Source data update time is unknown."}</p>
    <dl className={styles.kpis}><div><dt>{ru ? "Объекты выборки" : "Returned features"}</dt><dd>{data.sampleSize ?? "—"}</dd></div><div><dt>{ru ? "Здания в выборке" : "Buildings in sample"}</dt><dd>{data.buildings ?? "—"}</dd></div><div><dt>{ru ? "Транспорт, по прямой" : "Transit, straight-line"}</dt><dd>{distance(data.transitM)}</dd></div></dl>
    {content.nextValidation[0] ? <aside className={styles.next}><strong>{ru ? "Следующее действие" : "Next action"}</strong><p>{content.nextValidation[0].action}</p><small>{content.nextValidation[0].source}</small></aside> : null}
    <div className={styles.grid}>{layout.modules.map(id => <article key={id} data-module={id} className={`${styles.module} ${id === layout.lead || id === "surroundings" || id === "challenge" || id === "validation" ? styles.wide : ""}`}><h3 className="text-lg font-bold">{moduleTitles[id]}</h3>{moduleBody(id)}</article>)}</div>
    <details className="my-5" data-testid="infrastructure-cards"><summary className="cursor-pointer text-sm font-bold text-[#087f8c]">{ru ? "Все категории инфраструктуры" : "All infrastructure categories"}</summary><section className="mt-3" aria-labelledby="infrastructure-cards-title">
      <div className="mb-3"><h3 id="infrastructure-cards-title" className="text-base font-bold">{ru ? "Инфраструктура в выборке" : "Infrastructure in the sample"}</h3><p className="mt-1 text-xs leading-5 text-muted">{ru ? "Количество и ближайшее прямое расстояние по объектам, вернувшимся из OSM. Это не рейтинг качества и не время в пути." : "Counts and nearest straight-line distance for features returned by OSM. These are not quality scores or travel times."}</p></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{INFRASTRUCTURE_CARDS.map((card) => {
        const metric = infrastructureMetric(card);
        const primaryMetric = card.id === "transport" && metric.nearestM !== null ? `${metric.nearestM.toLocaleString(locale)} ${ru ? "м" : "m"}` : metric.count ?? "—";
        return <article key={card.id} data-infrastructure={card.id} className="min-w-0 rounded-2xl border border-[#d8e3e0] bg-[#fbfcfc] p-4"><div className="flex items-center justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f4ef] text-[#087f8c]"><PointObjectIcon name={card.icon} className="h-5 w-5" /></span><strong className="text-2xl font-bold tabular-nums text-[#087f8c]">{primaryMetric}</strong></div><h4 className="mt-3 text-sm font-bold text-[#243447]">{card.title[locale]}</h4><p className="mt-1 text-xs leading-5 text-[#667085]">{infrastructureSentence(card)}</p></article>;
      })}</div>
    </section></details>
    {context?.capReached ? <p role="note" className="mt-3 rounded-xl border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs text-[#79520d]">{ru ? "Лимит выборки достигнут. Доли относятся только к полученным объектам, не ко всему району." : "Sample cap reached. Shares describe returned features only, not the entire district."}</p> : null}
    <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer">{ru ? "Происхождение и ограничения" : "Lineage & limitations"}</summary><p className="mt-2">{sourceNote}</p><p className="mt-1">{ru ? "Один снимок результата. Нет измерения пешеходных маршрутов, спроса, стоимости или разрешённого использования." : "One result snapshot. Walking routes, demand, valuation and permitted use are not measured."}</p></details>
  </section>;
}
