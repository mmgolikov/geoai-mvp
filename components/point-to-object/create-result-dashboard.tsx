"use client";

import { useMemo } from "react";

import { PointObjectIcon } from "@/components/point-to-object/point-object-icons";
import { useModalShell } from "@/components/point-to-object/use-modal-shell";
import type { PointObjectCreateAoi } from "@/src/lib/prototype/point-to-object-create";
import type { PointObjectGeneratedConcept } from "@/src/lib/prototype/point-to-object-create-result";

type Props = {
  locale: "en" | "ru";
  aoi: PointObjectCreateAoi;
  generated: PointObjectGeneratedConcept;
  generatedLocale: "en" | "ru" | null;
  activeAlternativeId: "A" | "B";
  onAlternativeChange: (id: "A" | "B") => void;
  onBackToEditor: () => void;
  onShowMap: () => void;
};

function ConceptPlanPreview({ aoi, generated, activeAlternativeId, locale }: Pick<Props, "aoi" | "generated" | "activeAlternativeId" | "locale">) {
  const massing = generated.alternatives?.find((alternative) => alternative.id === activeAlternativeId)?.massing ?? generated.massing;
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
    <figure className="rounded-[24px] border border-[#bdd8d1] bg-[#eaf5f1] p-4" data-testid="create-result-preview">
      <figcaption className="mb-3 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-bold text-[#173b35]"><PointObjectIcon name="map" className="h-5 w-5 text-[#087f8c]" />{locale === "ru" ? "2D-план объёмной модели" : "2D massing plan"}</span><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#176548]">{locale === "ru" ? "Вариант" : "Option"} {activeAlternativeId}</span></figcaption>
      <svg viewBox="0 0 100 100" className="aspect-[4/3] w-full rounded-2xl bg-white" role="img" aria-label={locale === "ru" ? `Пропорциональный 2D-план сгенерированной объёмной модели, вариант ${activeAlternativeId}` : `Proportional 2D plan of generated massing, option ${activeAlternativeId}`}>
        <defs><pattern id="create-result-grid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="#e2ece9" strokeWidth=".4" /></pattern></defs>
        <rect x="2" y="2" width="96" height="96" rx="6" fill="url(#create-result-grid)" />
        <path data-testid="create-preview-aoi" d={polygonPath(aoiRings)} fill="#dff0ea" fillRule="evenodd" stroke="#087f8c" strokeWidth="1.2" strokeDasharray="2 1.5" />
        {massing.featureCollection.features.map((feature) => {
          const primary = feature.properties.primaryBlock;
          return <path key={feature.properties.id} data-testid="create-preview-building" d={polygonPath(feature.geometry.coordinates)} fill={primary ? "#087f8c" : "#6ab8a9"} fillRule="evenodd" stroke={primary ? "#176548" : "#408f80"} strokeWidth=".8" fillOpacity={primary ? .82 : .58}><title>{feature.properties.label} · {feature.properties.levels} {locale === "ru" ? "эт." : "levels"}</title></path>;
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[#536963]"><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#087f8c]" />{locale === "ru" ? "Основные корпуса" : "Primary blocks"}</span><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#6ab8a9]" />{locale === "ru" ? "Подиумы / вспомогательные объёмы" : "Podiums / supporting volumes"}</span></div>
      <p className="mt-3 text-[11px] leading-5 text-[#62716d]">{locale === "ru" ? "Пропорциональная локальная 2D-проекция сохранённой GeoJSON-геометрии. Интерактивный 2D/3D-просмотр доступен на карте." : "Aspect-preserving local 2D projection of the saved GeoJSON geometry. Interactive 2D/3D viewing is available on the map."}</p>
    </figure>
  );
}

export function CreateResultDashboard({ locale, aoi, generated, generatedLocale, activeAlternativeId, onAlternativeChange, onBackToEditor, onShowMap }: Props) {
  const dialogRef = useModalShell(onBackToEditor);
  const ru = locale === "ru";
  const alternatives = generated.alternatives?.length ? generated.alternatives : [{ id: generated.massing.variantId, label: `Option ${generated.massing.variantId}`, massing: generated.massing }];
  const active = alternatives.find((alternative) => alternative.id === activeAlternativeId) ?? alternatives[0];
  const massing = active.massing;
  const levels = massing.minGeneratedLevels === massing.maxGeneratedLevels ? String(massing.minGeneratedLevels) : `${massing.minGeneratedLevels}–${massing.maxGeneratedLevels}`;
  const generatedTime = useMemo(() => {
    const timestamp = new Date(generated.generatedAt);
    return Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  }, [generated.generatedAt, locale]);

  const kpis = [
    { label: ru ? "Площадь зоны" : "Site area", value: `${Math.round(aoi.areaSqM).toLocaleString(locale)} ${ru ? "м²" : "m²"}` },
    { label: ru ? "Пятно застройки" : "Generated footprint", value: `${Math.round(massing.generatedFootprintAreaSqM).toLocaleString(locale)} ${ru ? "м²" : "m²"}` },
    { label: ru ? "Застройка участка" : "Site coverage", value: `${massing.achievedSiteCoveragePct.toLocaleString(locale, { maximumFractionDigits: 1 })}%` },
    { label: ru ? "Расчётная площадь этажей" : "Estimated floor area", value: `${Math.round(massing.estimatedFloorAreaSqM).toLocaleString(locale)} ${ru ? "м²" : "m²"}` },
    { label: ru ? "Основные корпуса" : "Primary blocks", value: massing.generatedBlockCount.toLocaleString(locale) },
    { label: ru ? "Этажность" : "Levels", value: levels }
  ];

  return (
    <section ref={dialogRef} className="fixed inset-0 z-[70] overflow-y-auto bg-[#f4f7f6] text-ink" role="dialog" aria-modal="true" aria-labelledby="create-result-dashboard-title" data-testid="create-full-result-dashboard">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3"><button data-modal-initial-focus type="button" onClick={onBackToEditor} className="min-h-11 rounded-xl border border-[#9fc7bd] bg-white px-4 text-sm font-bold text-[#176548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"><span aria-hidden="true">← </span>{ru ? "К параметрам" : "Back to parameters"}</button><button type="button" onClick={onShowMap} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2"><PointObjectIcon name="map" className="h-4 w-4" />{ru ? "Показать на карте" : "Show on map"}</button></div></header>

      <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
        <section className="rounded-[24px] border border-[#cfe0dc] bg-white p-5 shadow-soft sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{ru ? "РЕЗУЛЬТАТ CREATE" : "CREATE RESULT"}</p>
          <h1 id="create-result-dashboard-title" className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{generated.program.title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{generatedLocale === locale ? generated.program.summary : (ru ? "Геометрия сохранена на языке исходной генерации; переключение вариантов и открытие результата не вызывают новый AI-запрос." : "Geometry is preserved from the original generation; switching options and reopening this result do not call AI.")}</p>
          {alternatives.length > 1 ? <div className="mt-5 inline-grid min-w-[260px] grid-cols-2 gap-1 rounded-xl bg-[#e7efec] p-1" role="tablist" aria-label={ru ? "Варианты концепции" : "Concept options"}>{alternatives.map((alternative) => <button key={alternative.id} type="button" role="tab" aria-selected={alternative.id === activeAlternativeId} onClick={() => onAlternativeChange(alternative.id)} data-testid={`create-dashboard-alternative-${alternative.id.toLowerCase()}`} className={`min-h-11 rounded-lg px-4 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${alternative.id === activeAlternativeId ? "bg-[#087f8c] text-white shadow-sm" : "text-[#52606a] hover:bg-white"}`}>{generatedLocale === locale ? alternative.label : `${ru ? "Вариант" : "Option"} ${alternative.id}`}</button>)}</div> : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(360px,.8fr)_minmax(0,1.2fr)]">
          <ConceptPlanPreview aoi={aoi} generated={generated} activeAlternativeId={activeAlternativeId} locale={locale} />
          <section className="rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7" aria-labelledby="create-result-kpis-title">
            <h2 id="create-result-kpis-title" className="text-xl font-bold">{ru ? "Геометрические показатели" : "Geometric KPIs"}</h2>
            <p className="mt-2 text-xs leading-5 text-muted">{ru ? "Рассчитаны из сохранённой геометрии варианта; это не финансовые и не нормативные показатели." : "Calculated from the saved option geometry; these are not financial or regulatory metrics."}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">{kpis.map((kpi) => <div key={kpi.label} className="rounded-2xl border border-[#dce6e3] bg-[#fbfcfc] p-4"><dt className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#667085]">{kpi.label}</dt><dd className="mt-2 break-words text-2xl font-bold tabular-nums text-[#087f8c]">{kpi.value}</dd></div>)}</dl>
          </section>
        </div>

        <section className="grid gap-4 rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7 lg:grid-cols-2">
          <div><h2 className="text-lg font-bold">{ru ? "Программа варианта" : "Option programme"}</h2><dl className="mt-3 grid grid-cols-[minmax(120px,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm"><dt className="text-muted">{ru ? "Стиль" : "Massing style"}</dt><dd className="font-semibold">{generated.program.massingStyle.replaceAll("_", " ")}</dd><dt className="text-muted">{ru ? "Целевая застройка" : "Target coverage"}</dt><dd className="font-semibold">{generated.program.targetSiteCoveragePct}%</dd><dt className="text-muted">{ru ? "Открытое пространство" : "Open space"}</dt><dd className="font-semibold">{generated.program.openSpacePct}%</dd><dt className="text-muted">{ru ? "Отступ" : "Setback"}</dt><dd className="font-semibold">{generated.program.setbackM} {ru ? "м" : "m"}</dd></dl></div>
          <div><h2 className="text-lg font-bold">{ru ? "Границы результата" : "Result boundaries"}</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-[#475467]"><li>• {ru ? "A/B — сохранённые варианты одной генерации; переключение бесплатно." : "A/B are saved options from one generation; switching is free."}</li><li>• {ru ? "Новые альтернативы требуют отдельного явного запуска генерации." : "New alternatives require a separate explicit generation action."}</li><li>• {ru ? "Изменение параметров не удаляет этот последний корректный результат." : "Editing parameters does not delete this last valid result."}</li></ul></div>
        </section>

        <footer className="rounded-[20px] border border-[#cfe0dc] bg-[#edf7f3] p-4 text-xs leading-5 text-[#536963]"><p><strong>{ru ? "Создано" : "Generated"}: {generatedTime}</strong> · {generated.promptVersion}</p><p className="mt-1">{generated.caveat}</p></footer>
      </div>
    </section>
  );
}
