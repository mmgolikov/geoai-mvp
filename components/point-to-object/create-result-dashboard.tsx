"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { PointObjectIcon } from "@/components/point-to-object/point-object-icons";
import { useModalShell } from "@/components/point-to-object/use-modal-shell";
import type { PointObjectCreateAoi } from "@/src/lib/prototype/point-to-object-create";
import type { PointObjectGeneratedConcept } from "@/src/lib/prototype/point-to-object-create-result";
import { buildConceptEnvironment } from "@/src/lib/prototype/point-to-object-create-environment";
import { conceptWallColor } from "@/src/lib/prototype/point-to-object-create-appearance";
import { CONTEXT_GROUP_LABELS } from "@/src/lib/prototype/point-to-object-normalized-context";
import { createProgrammeSourceContext, pointObjectProgrammeContextReview, pointObjectProgrammeOptionDelta } from "@/src/lib/prototype/point-to-object-programme-context";
import type { PointObjectAreaContextResult } from "@/src/lib/prototype/point-to-object-area-context-contract";
import { PointObjectContextDashboard } from "./context-dashboard";

const CreateResultPreview3D = dynamic(
  () => import("@/components/point-to-object/create-result-preview-3d").then((module) => module.CreateResultPreview3D),
  {
    ssr: false,
    loading: () => <div className="grid min-h-[300px] place-items-center rounded-[24px] border border-[#d7dee4] bg-[#f4fbfb] p-5 text-center text-sm font-semibold text-[#52606a]" role="status">Loading local 3D preview… / Подготовка локального 3D-просмотра…</div>
  }
);

type Props = {
  locale: "en" | "ru";
  aoi: PointObjectCreateAoi;
  generated: PointObjectGeneratedConcept;
  generatedLocale: "en" | "ru" | null;
  areaContext?: PointObjectAreaContextResult | null;
  activeAlternativeId: "A" | "B";
  onAlternativeChange: (id: "A" | "B") => void;
  onBackToEditor: () => void;
  onShowMap: () => void;
};

function ConceptPlanPreview({ aoi, generated, activeAlternativeId, locale }: Pick<Props, "aoi" | "generated" | "activeAlternativeId" | "locale">) {
  const massing = generated.alternatives?.find((alternative) => alternative.id === activeAlternativeId)?.massing ?? generated.massing;
  const environment = useMemo(() => buildConceptEnvironment(aoi, massing), [aoi, massing]);
  const aoiRings = aoi.coordinates;
  const allPoints = [
    ...aoiRings.flat(),
    ...massing.featureCollection.features.flatMap((feature) => feature.geometry.coordinates.flat())
  ];
  const longitudes = allPoints.map((point) => point[0]);
  const latitudes = allPoints.map((point) => point[1]);
  const referenceLatitude = ((Math.min(...latitudes) + Math.max(...latitudes)) / 2) * Math.PI / 180;
  const longitudeScale = 111_320 * Math.max(Math.cos(referenceLatitude), 0.01);
  const project = ([longitude, latitude]: readonly number[]) => [longitude * longitudeScale, latitude * 110_540] as const;
  const projected = allPoints.map(project);
  const west = Math.min(...projected.map(([x]) => x));
  const east = Math.max(...projected.map(([x]) => x));
  const south = Math.min(...projected.map(([, y]) => y));
  const north = Math.max(...projected.map(([, y]) => y));
  const scale = Math.min(84 / Math.max(east - west, 0.01), 84 / Math.max(north - south, 0.01));
  const offsetX = 50 - ((west + east) / 2) * scale;
  const offsetY = 50 + ((south + north) / 2) * scale;
  const point = (coordinate: readonly number[]) => {
    const [x, y] = project(coordinate);
    return `${(offsetX + x * scale).toFixed(3)},${(offsetY - y * scale).toFixed(3)}`;
  };
  const polygonPath = (rings: readonly (readonly (readonly number[])[])[]) => rings
    .filter((ring) => ring.length >= 3)
    .map((ring) => `M${ring.map(point).join("L")}Z`)
    .join(" ");
  return (
    <figure className="rounded-[24px] border border-[#d7dee4] bg-[#f4fbfb] p-4" data-testid="create-result-preview" data-environment-key={environment.key}>
      <figcaption className="mb-3 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-bold text-[#344054]"><PointObjectIcon name="map" className="h-5 w-5 text-[#087f8c]" />{locale === "ru" ? "2D-план объёмной модели" : "2D massing plan"}</span><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#087f8c]">{locale === "ru" ? "Вариант" : "Option"} {activeAlternativeId}</span></figcaption>
      <svg viewBox="0 0 100 100" className="aspect-[4/3] w-full rounded-2xl bg-white" role="img" aria-label={locale === "ru" ? `Пропорциональный 2D-план сгенерированной объёмной модели, вариант ${activeAlternativeId}` : `Proportional 2D plan of generated massing, option ${activeAlternativeId}`}>
        <defs><pattern id="create-result-grid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="#e2ece9" strokeWidth=".4" /></pattern></defs>
        <rect x="2" y="2" width="96" height="96" rx="6" fill="url(#create-result-grid)" />
        <path data-testid="create-preview-aoi" d={polygonPath(aoiRings)} fill="#dff0ea" fillRule="evenodd" stroke="#087f8c" strokeWidth="1.2" strokeDasharray="2 1.5" />
        {environment.featureCollection.features.map(feature => <path key={String(feature.id)} data-testid="create-preview-environment" d={polygonPath(feature.geometry.coordinates)} fill={feature.properties.material === "permeable_surface" ? "#d5d3c7" : "#b9c5c1"} />)}
        {massing.featureCollection.features.map((feature) => {
          const primary = feature.properties.primaryBlock;
          return <path key={feature.properties.id} data-testid="create-preview-building" d={polygonPath(feature.geometry.coordinates)} fill={conceptWallColor(feature.properties.templateId)} fillRule="evenodd" stroke="#087f8c" strokeWidth={primary ? .8 : .4}><title>{feature.properties.label} · {feature.properties.levels} {locale === "ru" ? "эт." : "levels"}</title></path>;
        })}
      </svg>
      <p className="mt-3 text-[11px] leading-5 text-[#667085]">{locale === "ru" ? "Площадки и пешеходные связи — концепция, не фактическая инфраструктура. Показатели зданий не изменены." : "Open areas and pedestrian links are conceptual, not existing infrastructure. Building metrics are unchanged."}{environment.status !== "ready" ? (locale === "ru" ? " Не поместившиеся элементы среды пропущены." : "Environment elements without valid placement were omitted.") : ""}</p>
      <p className="mt-3 text-[11px] leading-5 text-[#667085]">{locale === "ru" ? "Пропорциональная локальная 2D-проекция сохранённой GeoJSON-геометрии. Переключатель выше открывает локальный 3D-вид без новой генерации." : "Aspect-preserving local 2D projection of the saved GeoJSON geometry. The control above opens a local 3D view without generating again."}</p>
    </figure>
  );
}

export function CreateResultDashboard({ locale, aoi, generated, generatedLocale, areaContext, activeAlternativeId, onAlternativeChange, onBackToEditor, onShowMap }: Props) {
  const dialogRef = useModalShell(onBackToEditor);
  const ru = locale === "ru";
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");
  const alternatives = generated.alternatives?.length ? generated.alternatives : [{ id: generated.massing.variantId, label: `Option ${generated.massing.variantId}`, massing: generated.massing }];
  const active = alternatives.find((alternative) => alternative.id === activeAlternativeId) ?? alternatives[0];
  const massing = active.massing;
  const context = useMemo(() => createProgrammeSourceContext(aoi, areaContext), [aoi, areaContext]);
  const programmeReview = useMemo(() => pointObjectProgrammeContextReview(generated.program, context), [generated.program, context]);
  const optionDelta = pointObjectProgrammeOptionDelta(alternatives);
  const useLabels = ru ? { residential: "Жильё", office: "Офисы", retail: "Торговля и сервисы", hospitality: "Гостиницы", civic: "Общественные функции", open_space: "Открытые пространства" } : { residential: "Residential", office: "Offices", retail: "Retail & services", hospitality: "Hospitality", civic: "Civic uses", open_space: "Open space" };
  const signed = (value: number, digits = 0) => `${value > 0 ? "+" : ""}${value.toLocaleString(locale, { maximumFractionDigits: digits })}`;
  const levels = massing.minGeneratedLevels === massing.maxGeneratedLevels ? String(massing.minGeneratedLevels) : `${massing.minGeneratedLevels}–${massing.maxGeneratedLevels}`;
  const generatedTime = useMemo(() => {
    const timestamp = new Date(generated.generatedAt);
    return Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  }, [generated.generatedAt, locale]);

  const kpis = [
    { label: ru ? "Площадь зоны" : "Site area", value: `${Math.round(aoi.areaSqM).toLocaleString(locale)} ${ru ? "м²" : "m²"}` },
    { label: ru ? "Пятно застройки" : "Generated footprint", value: `${Math.round(massing.generatedFootprintAreaSqM).toLocaleString(locale)} ${ru ? "м²" : "m²"}` },
    { label: ru ? "Застройка участка" : "Site coverage", value: `${massing.achievedSiteCoveragePct.toLocaleString(locale, { maximumFractionDigits: 1 })}%` },
    { label: ru ? "Без пятен застройки (включая проходы)" : "Unbuilt ground (including circulation)", value: `${Math.max(0, 100 - massing.achievedSiteCoveragePct).toLocaleString(locale, { maximumFractionDigits: 1 })}%` },
    { label: ru ? "Расчётная площадь этажей" : "Estimated floor area", value: `${Math.round(massing.estimatedFloorAreaSqM).toLocaleString(locale)} ${ru ? "м²" : "m²"}` },
    { label: ru ? "Основные корпуса" : "Primary blocks", value: massing.generatedBlockCount.toLocaleString(locale) },
    { label: ru ? "Этажность" : "Levels", value: levels }
  ];

  return (
    <section ref={dialogRef} className="fixed inset-0 z-[70] overflow-y-auto bg-[#f4fbfb] text-ink" role="dialog" aria-modal="true" aria-labelledby="create-result-dashboard-title" data-testid="create-full-result-dashboard">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3"><button data-modal-initial-focus type="button" onClick={onBackToEditor} className="min-h-11 rounded-xl border border-[#e5fafa] bg-white px-4 text-sm font-bold text-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"><span aria-hidden="true">← </span>{ru ? "К параметрам" : "Back to parameters"}</button><button type="button" onClick={onShowMap} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2"><PointObjectIcon name="map" className="h-4 w-4" />{ru ? "Показать на карте" : "Show on map"}</button></div></header>

      <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
        <section className="rounded-[24px] border border-[#d7dee4] bg-white p-5 shadow-soft sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{ru ? "РЕЗУЛЬТАТ CREATE" : "CREATE RESULT"}</p>
          <h1 id="create-result-dashboard-title" className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{generated.program.title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{generatedLocale === locale ? generated.program.summary : (ru ? "Геометрия сохранена на языке исходной генерации; переключение вариантов и открытие результата не вызывают новый AI-запрос." : "Geometry is preserved from the original generation; switching options and reopening this result do not call AI.")}</p>
          {alternatives.length > 1 ? <div className="mt-5 inline-grid min-w-[260px] grid-cols-2 gap-1 rounded-xl bg-[#e5ebee] p-1" role="tablist" aria-label={ru ? "Варианты концепции" : "Concept options"}>{alternatives.map((alternative) => <button key={alternative.id} type="button" role="tab" aria-selected={alternative.id === activeAlternativeId} onClick={() => onAlternativeChange(alternative.id)} data-testid={`create-dashboard-alternative-${alternative.id.toLowerCase()}`} className={`min-h-11 rounded-lg px-4 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${alternative.id === activeAlternativeId ? "bg-[#087f8c] text-white shadow-sm" : "text-[#52606a] hover:bg-white"}`}>{generatedLocale === locale ? alternative.label : `${ru ? "Вариант" : "Option"} ${alternative.id}`}</button>)}</div> : null}
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.8fr)]">
          <div className="min-w-0 space-y-3" data-testid="create-result-preview-shell" data-preview-mode={previewMode} data-active-variant={active.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7dee4] bg-white p-3 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#52606a]">{ru ? "Просмотр геометрии" : "Geometry view"}</p>
              <div className="inline-grid grid-cols-2 gap-1 rounded-xl bg-[#e5ebee] p-1" role="group" aria-label={ru ? "Режим просмотра" : "Preview mode"}>
                {(["2d", "3d"] as const).map((mode) => <button key={mode} type="button" onClick={() => setPreviewMode(mode)} aria-pressed={previewMode === mode} data-testid={`create-preview-mode-${mode}`} className={`min-h-11 min-w-16 rounded-lg px-3 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${previewMode === mode ? "bg-[#087f8c] text-white shadow-sm" : "text-[#52606a] hover:bg-white"}`}>{mode.toUpperCase()}</button>)}
              </div>
            </div>
            <CreateResultPreview3D locale={locale} aoi={aoi} massing={massing} dimension={previewMode} fallback={<ConceptPlanPreview aoi={aoi} generated={generated} activeAlternativeId={active.id} locale={locale} />} />
          </div>
          <section className="min-w-0 rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7" aria-labelledby="create-result-kpis-title" data-testid="create-result-kpis" data-active-variant={active.id} data-estimated-floor-area-sqm={massing.estimatedFloorAreaSqM}>
            <h2 id="create-result-kpis-title" className="text-xl font-bold">{ru ? "Геометрические показатели" : "Geometric KPIs"}</h2>
            <p className="mt-2 text-xs leading-5 text-muted">{ru ? "Рассчитаны из сохранённой геометрии варианта; это не финансовые и не нормативные показатели." : "Calculated from the saved option geometry; these are not financial or regulatory metrics."}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">{kpis.map((kpi) => <div key={kpi.label} className="rounded-2xl border border-[#dce6e3] bg-[#fbfcfc] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#667085]">{kpi.label}</dt><dd className="mt-2 break-words text-2xl font-bold tabular-nums text-[#087f8c]">{kpi.value}</dd></div>)}</dl>
          </section>
        </div>

        {context ? <PointObjectContextDashboard context={context} locale={locale} programme /> : <section className="rounded-[20px] border border-line bg-white p-5" data-testid="create-context-unavailable"><h2 className="text-lg font-bold">{ru ? "Контекст программы" : "Programme context"}</h2><p className="mt-2 text-sm leading-6 text-muted">{ru ? "Нет подтверждённого сохранённого снимка для этой зоны. Школы, медицина, сервисы и транспорт не оценены; состав программы пока является сценарной гипотезой." : "No verified snapshot is saved for this zone. Education, health, services and transit have not been assessed; programme composition remains a scenario hypothesis."}</p></section>}
        <section className="grid min-w-0 gap-5 rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7 lg:grid-cols-2" data-testid="create-programme-rationale">
          <div className="min-w-0"><h2 className="text-xl font-bold">{ru ? "Состав программы и наблюдаемые функции" : "Programme mix and observed uses"}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{programmeReview.uses[0] ? (ru ? `Ведущая функция — ${useLabels[programmeReview.uses[0].use].toLowerCase()} (${programmeReview.uses[0].scenarioSharePct}% сценарного веса).` : `The programme is led by ${useLabels[programmeReview.uses[0].use].toLowerCase()} (${programmeReview.uses[0].scenarioSharePct}% scenario weight).`) : null} {ru ? "Вес программы не равен доле площади или числу объектов OSM." : "Programme weights are not floor-area shares or OSM record shares."}</p>
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[340px] text-left text-sm"><thead><tr className="border-b border-line text-xs text-muted"><th className="py-2 pr-3">{ru ? "Функция" : "Use"}</th><th className="py-2 pr-3">{ru ? "Сценарий" : "Scenario"}</th><th className="py-2">{ru ? "Записи внутри AOI" : "Records inside AOI"}</th></tr></thead><tbody>{programmeReview.uses.map(item => <tr key={item.use} className="border-b border-[#edf1f0]"><th className="py-3 pr-3 font-semibold">{useLabels[item.use]}</th><td className="py-3 pr-3 tabular-nums">{item.scenarioSharePct}%</td><td className="py-3 tabular-nums" data-evidence-ref={item.evidenceRef ?? undefined}>{item.mappedCount === null ? (ru ? "Нет данных" : "Unavailable") : `${item.mappedCount}${programmeReview.coverage === "partial" ? "+" : ""}`}<span className="block text-[11px] text-muted">{CONTEXT_GROUP_LABELS[locale][item.observedGroup]}</span></td></tr>)}</tbody></table></div>
            <p className="mt-3 text-xs leading-5 text-muted">{ru ? "OSM-группы — ориентир существующих функций, не точное соответствие проектной программе. Ноль означает, что такие записи не вернулись в выборке, а не отсутствие функции." : "OSM groups indicate existing uses, not an exact equivalence to the proposed programme. Zero means no such records returned in this sample, not that the use is absent."}</p>
          </div>
          <div className="min-w-0"><h2 className="text-xl font-bold">{ru ? "Что проверить для этой программы" : "Checks for this programme"}</h2>
            <ul className="mt-3 space-y-3 text-sm leading-6">{programmeReview.checks.map(item => <li key={item.group} data-evidence-ref={item.evidenceRef ?? undefined}><span className="font-semibold">{CONTEXT_GROUP_LABELS[locale][item.group]}: </span>{item.mappedCount === null ? (ru ? "снимок недоступен; нужна проверка на месте и за пределами зоны." : "snapshot unavailable; inspect the site and the surrounding area.") : item.mappedCount > 0 ? (ru ? `${item.mappedCount}${programmeReview.coverage === "partial" ? "+" : ""} записей внутри AOI; проверить действующее назначение, сохранение/замену и доступ.` : `${item.mappedCount}${programmeReview.coverage === "partial" ? "+" : ""} records inside AOI; verify operating use, retention/replacement and access.`) : (ru ? "внутри AOI записи не найдены; проверить окружающую территорию и фактический доступ." : "no records returned inside AOI; check the surrounding area and actual access.")}</li>)}</ul>
            <p className="mt-3 text-xs leading-5 text-muted">{ru ? "Окружающая зона обслуживания не оценена. Вместимость, загрузка и спрос неизвестны; школа/клиника не доказывают достаточность. Права и нормативы требуют отдельной проверки." : "The surrounding service catchment is not assessed. Capacity, utilisation and demand are unknown; a school/clinic record does not prove adequacy. Rights and planning requirements need separate validation."}</p>
          </div>
          {optionDelta ? <div className="min-w-0 border-t border-line pt-4 lg:col-span-2" data-testid="create-programme-option-delta"><h3 className="font-bold">{ru ? "Геометрический выбор A/B" : "A/B geometric trade-off"}</h3><p className="mt-2 text-sm leading-6 text-muted">{ru ? `B относительно A: расчётная площадь этажей ${signed(optionDelta.floorAreaSqM)} м²; застройка участка ${signed(optionDelta.coveragePercentagePoints, 1)} п.п. Это различие сохранённой геометрии, не доказательство большей эффективности или допустимости.` : `B relative to A: estimated floor area ${signed(optionDelta.floorAreaSqM)} m²; site coverage ${signed(optionDelta.coveragePercentagePoints, 1)} percentage points. This compares saved geometry, not proven performance or planning admissibility.`}</p></div> : null}
        </section>
        <section className="grid gap-4 rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7 lg:grid-cols-2">
          <div><h2 className="text-lg font-bold">{ru ? "Программа варианта" : "Option programme"}</h2><dl className="mt-3 grid grid-cols-[minmax(120px,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm"><dt className="text-muted">{ru ? "Стиль" : "Massing style"}</dt><dd className="font-semibold">{generated.program.massingStyle.replaceAll("_", " ")}</dd><dt className="text-muted">{ru ? "Целевая застройка" : "Target coverage"}</dt><dd className="font-semibold">{generated.program.targetSiteCoveragePct}%</dd><dt className="text-muted">{ru ? "Открытое пространство" : "Open space"}</dt><dd className="font-semibold">{generated.program.openSpacePct}%</dd><dt className="text-muted">{ru ? "Отступ" : "Setback"}</dt><dd className="font-semibold">{generated.program.setbackM} {ru ? "м" : "m"}</dd></dl></div>
          <div><h2 className="text-lg font-bold">{ru ? "Границы результата" : "Result boundaries"}</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-[#475467]"><li>• {ru ? "A/B — сохранённые варианты одной генерации; переключение бесплатно." : "A/B are saved options from one generation; switching is free."}</li><li>• {ru ? "Новые альтернативы требуют отдельного явного запуска генерации." : "New alternatives require a separate explicit generation action."}</li><li>• {ru ? "Изменение параметров не удаляет этот последний корректный результат." : "Editing parameters does not delete this last valid result."}</li></ul></div>
        </section>

        <footer className="rounded-[20px] border border-[#d7dee4] bg-[#f4fbfb] p-4 text-xs leading-5 text-[#667085]"><p><strong>{ru ? "Создано" : "Generated"}: {generatedTime}</strong> · {generated.promptVersion}</p><p className="mt-1">{generated.caveat}</p></footer>
      </div>
    </section>
  );
}
