"use client";

import { useMemo, useState } from "react";
import type { DevkitProject, Claim } from "@/src/lib/devkit/contracts";
import { reviseDevkitInputs } from "@/src/lib/devkit/project-store";
import { getDevkitRegionalPack } from "@/src/lib/devkit/region-data";
import { regionalRecordsForProject } from "@/src/lib/devkit/region-rules";
import { DevkitFindProjectPanel } from "./find-project-panel";

type Props = { project: DevkitProject; locale: "en" | "ru"; onChange: (project: DevkitProject) => void };
const labels: Record<string, [string, string]> = {
  permitted_development: ["Permitted development", "Допустимость строительства"],
  returned_source_centres_inside_aoi: ["Returned source records inside AOI", "Записи источника внутри зоны"],
  mapped_place_source_records_400m: ["Mapped place records · 400 m", "Записи об окружении · 400 м"],
  mapped_source_record_count: ["Mapped source records", "Записи источника"],
  max_height_m: ["Height limit", "Ограничение высоты"],
  max_far: ["Floor-area ratio limit", "Предельная интенсивность застройки"]
};
const claimLabels: Record<Claim["status"], [string, string]> = {
  source_backed: ["Source-backed", "По источнику"], assumption: ["Assumption", "Допущение"],
  derived: ["Calculated", "Расчёт"], generated: ["Generated", "Сгенерировано"],
  unknown: ["Unknown", "Неизвестно"], conflicting: ["Conflicting", "Противоречие"]
};

function AreaDiagram({ project, ru }: { project: DevkitProject; ru: boolean }) {
  const ring = project.aoi?.coordinates[0];
  if (!ring?.length) return <p className="dk-empty">{ru ? "Зона ещё не задана." : "No area selected yet."}</p>;
  const centreLat = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  const scale = Math.cos(centreLat * Math.PI / 180);
  const xs = ring.map(point => point[0] * scale), ys = ring.map(point => -point[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
  const span = Math.max(width, height, 0.000001);
  const xy = (point: number[]) => [30 + ((point[0] * scale - minX) / span) * 300, 20 + ((-point[1] - minY) / span) * 300];
  const points = (coordinates: number[][]) => coordinates.map(point => xy(point).join(",")).join(" ");
  return <figure className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <svg viewBox="0 0 360 350" className="h-64 w-full" role="img" aria-label={ru ? "Зона исследования и отдельные исходные объекты" : "Study area and separate source objects"}>
      <polygon points={points(ring)} fill="#dcf3ed" stroke="#087f8c" strokeWidth="1.4" strokeDasharray="5 4" />
      {project.constraints.filter(item => item.geometry?.type === "Polygon").map(item => item.geometry?.type === "Polygon" && <polygon key={item.id} points={points(item.geometry.coordinates[0])} fill="#fed7aa" fillOpacity="0.55" stroke="#b45309"><title>{item.label}</title></polygon>)}
      {project.objects.map(item => item.geometry?.type === "Polygon" ? <polygon key={item.id} points={points(item.geometry.coordinates[0])} fill={item.kind === "building" ? "#64748b" : "#a7c7a1"} fillOpacity="0.6" stroke="#475569"><title>{item.label}</title></polygon> : item.geometry?.type === "Point" ? <circle key={item.id} cx={xy(item.geometry.coordinates)[0]} cy={xy(item.geometry.coordinates)[1]} r="3" fill="#7c3aed"><title>{item.label}</title></circle> : null)}
      <text x="325" y="25" fill="#475569" fontSize="12">N ↑</text>
    </svg>
    <figcaption className="dk-small">{ru ? "Схема сохранённой геометрии: зона — пунктир, объекты — отдельно. Не кадастровая карта. Отсутствующие объекты не дорисовываются." : "Saved geometry diagram: dashed study area, separate objects. Not a cadastral map. Missing objects are not invented."}</figcaption>
  </figure>;
}

export function DevkitEvidenceStage({ project, locale, onChange }: Props) {
  const ru = locale === "ru", t = (en: string, russian: string) => ru ? russian : en;
  const [error, setError] = useState<string | null>(null);
  const pack = useMemo(() => getDevkitRegionalPack(project.brief.marketKey), [project.brief.marketKey]);
  const known = project.claims.filter(item => item.value !== null && ["source_backed", "derived"].includes(item.status));
  const uncertain = project.claims.filter(item => item.value === null || ["unknown", "conflicting"].includes(item.status));
  const conditional = project.claims.filter(item => item.value !== null && ["assumption", "generated"].includes(item.status));
  const gaps = project.constraints.filter(item => ["unknown", "conflicting"].includes(item.status));
  const total = Math.max(1, project.claims.length);
  const format = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const attached = Boolean(pack && pack.rules.every(rule => project.procedures.some(item => item.id === rule.id)));

  function attachRegionalReferences() {
    if (!pack || !project.aoi) return;
    try {
      const records = regionalRecordsForProject(pack, { id: project.aoi.id, kind: "aoi" });
      const mergedEvidence = [...project.evidence.filter(item => !records.evidence.some(next => next.id === item.id)), ...records.evidence];
      const next = reviseDevkitInputs(project, { evidence: mergedEvidence });
      next.procedures = [...project.procedures.filter(item => !records.procedures.some(p => p.id === item.id)), ...records.procedures];
      onChange(next); setError(null);
    } catch { setError(t("References could not be attached. The prior project remains unchanged.", "Не удалось добавить справочные материалы. Прежний проект не изменён.")); }
  }

  return <div className="dk-stack" data-testid="devkit-evidence-stage">
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <AreaDiagram project={project} ru={ru} />
      <section className="dk-stack" aria-label={t("Evidence overview", "Обзор исходных данных")}>
        <dl className="grid grid-cols-2 gap-3">
          <div className="dk-metric"><dt>{t("Study area", "Зона исследования")}</dt><dd>{project.aoi ? format(project.aoi.areaSqM) : "—"} <small>{t("m²", "м²")}</small></dd></div>
          <div className="dk-metric"><dt>{t("Separate mapped objects", "Отдельные исходные объекты")}</dt><dd>{project.objects.length}</dd></div>
        </dl>
        <div>
          <h3>{t("What supports the decision", "На чём основано решение")}</h3>
          <div className="my-3 flex h-4 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${known.length} ${t("source or calculated", "по источникам или расчётам")}; ${conditional.length} ${t("assumptions", "допущений")}; ${uncertain.length} ${t("unknown or conflicting", "неизвестных или спорных")}`}>
            <span className="bg-teal-700" style={{ width: `${known.length / total * 100}%` }} /><span className="bg-violet-400" style={{ width: `${conditional.length / total * 100}%` }} /><span className="bg-amber-400" style={{ width: `${uncertain.length / total * 100}%` }} />
          </div>
          <ul className="space-y-2 text-sm"><li>{t("Source-backed / calculated", "По источнику / расчёту")}: {known.length}</li><li>{t("Explicit assumptions", "Явные допущения")}: {conditional.length}</li><li>{t("Unknown / conflicting", "Неизвестно / противоречие")}: {uncertain.length}</li></ul>
          <p className="dk-small mt-3">{t("Counts describe this snapshot, not site completeness or a quality score.", "Количество записей относится к этому снимку, а не к полноте обследования или оценке качества участка.")}</p>
        </div>
      </section>
    </div>
    <section className="dk-stack"><h3>{t("Facts and assumptions", "Факты и допущения")}</h3>
      {project.claims.length ? <div className="grid min-w-0 gap-3 sm:grid-cols-2">{project.claims.map(claim => <article key={claim.id} className="dk-list-item">
        <div className="dk-list-item-head"><strong>{labels[claim.field]?.[ru ? 1 : 0] ?? claim.field.replaceAll("_", " ")}</strong><span className="dk-pill" data-tone={claim.value === null || claim.status === "conflicting" ? "warning" : undefined}>{claimLabels[claim.status][ru ? 1 : 0]}</span></div>
        <p className="text-xl font-semibold text-teal-900">{claim.value === null ? t("Unknown", "Неизвестно") : typeof claim.value === "number" ? format(claim.value) : String(claim.value)} {claim.value !== null ? claim.unit : null}</p>
        <p className="dk-small">{claim.explanation}</p><p className="dk-small">{t("Evidence links", "Связанные источники")}: {claim.evidenceIds.length}</p>
      </article>)}</div> : <p className="dk-empty">{t("No source-backed site facts are available in this snapshot.", "В этом снимке пока нет подтверждённых источниками фактов о площадке.")}</p>}
    </section>
    <section className="dk-stack"><h3>{t("Decision gaps and next actions", "Пробелы и следующие действия")}</h3>
      {!project.constraints.length ? <p className="dk-empty">{t("Restrictions have not been established. An empty list is not permission to build.", "Ограничения не установлены. Пустой список не является разрешением на строительство.")}</p> : <ul className="dk-list">{project.constraints.map(item => <li key={item.id} className="dk-list-item"><div className="dk-list-item-head"><strong>{item.label}</strong><span className="dk-pill" data-tone={gaps.includes(item) ? "warning" : undefined}>{item.severity === "critical" ? t("Critical", "Критично") : t("Review", "Проверить")}</span></div><p>{item.impact}</p><p className="text-sm font-medium text-teal-900">{item.nextAction}</p></li>)}</ul>}
    </section>
    <DevkitFindProjectPanel project={project} locale={locale} onChange={onChange} />
    <section className="dk-stack"><div><h3>{t("Regional procedure route · draft", "Региональные процедуры · черновой маршрут")}</h3><p className="dk-small mt-2">{t("Primary references and preparation checklists. The actual plot authority and applicant mandate still require confirmation.", "Первоисточники и подготовительные списки. Компетентный орган для конкретного участка и полномочия заявителя ещё требуют подтверждения.")}</p></div>
      {pack ? <button type="button" className="dk-button" disabled={!project.aoi || attached} onClick={attachRegionalReferences}>{attached ? t("References attached", "Справочные материалы добавлены") : t(`Attach ${pack.rules.length} documented procedures`, `Добавить ${pack.rules.length} документированных процедур`)}</button> : <p className="dk-empty">{t("No qualified regional package is bundled for this city.", "Для этого города проверенный справочный пакет пока не подключён.")}</p>}
      {error && <p role="alert" className="dk-callout">{error}</p>}
      {project.procedures.length > 0 && <ol className="dk-list">{project.procedures.map((item, index) => <li key={item.id} className="dk-list-item"><strong>{index + 1}. {item.label}</strong><p className="dk-small">{item.authority ?? t("Authority unresolved", "Орган не определён")} · {item.version ?? t("Version unknown", "Версия неизвестна")}</p><p className="dk-small">{t("Applicant", "Заявитель")}: {item.applicant ?? t("Needs confirmation", "Требует подтверждения")}</p>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm underline">{t("Primary reference", "Первоисточник")}</a>}<details><summary>{t("Required checks", "Что проверить")}</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{item.missingInputs.map((text, n) => <li key={n}>{text}</li>)}</ul></details></li>)}</ol>}
    </section>
    <details><summary>{t("Source lineage and rights", "Происхождение данных и права")} ({project.evidence.length})</summary><ul className="dk-list mt-3">{project.evidence.map(item => <li key={item.id} className="dk-list-item"><strong>{item.label}</strong><p className="dk-small">{item.excerpt}</p><p className="dk-small">{t("Acquired", "Получено")}: {item.acquiredAt ?? t("Unknown", "Неизвестно")} · {t("Valid at", "Действует на")}: {item.validAt ?? t("Unknown", "Неизвестно")}</p><p className="dk-small">{item.rights.attribution} · {t("Redistribution", "Распространение")}: {item.rights.redistribution}</p>{item.sourceUrl && <a className="inline-flex min-h-11 items-center text-sm underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{t("Open reference", "Открыть источник")}</a>}</li>)}</ul></details>
  </div>;
}
