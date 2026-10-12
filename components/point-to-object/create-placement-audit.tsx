"use client";

import { useMemo } from "react";
import type { ConceptMassingResult, PointObjectCreateAoi } from "@/src/lib/prototype/point-to-object-create";
import type { PointObjectGeneratedConcept } from "@/src/lib/prototype/point-to-object-create-result";
import type { PointObjectAreaContextResult } from "@/src/lib/prototype/point-to-object-area-context-contract";
import { buildCreatePlacementAudit, type CreatePlacementAction } from "@/src/lib/prototype/point-to-object-create-placement-audit";
import { CONTEXT_GROUP_LABELS } from "@/src/lib/prototype/point-to-object-normalized-context";

type Props = { locale: "en" | "ru"; aoi: PointObjectCreateAoi; generated: PointObjectGeneratedConcept; generatedLocale: "en" | "ru" | null; areaContext?: PointObjectAreaContextResult | null; massing: ConceptMassingResult };

export function CreatePlacementAudit({ locale, aoi, generated, generatedLocale, areaContext, massing }: Props) {
  const audit = useMemo(() => buildCreatePlacementAudit(aoi, areaContext, generated, generatedLocale, massing), [aoi, areaContext, generated, generatedLocale, massing]);
  const ru = locale === "ru";
  if (audit.bindingStatus !== "matched") return null;
  const checks: Record<CreatePlacementAction, string> = ru ? {
    verify_boundary: "Уточнить положение центра и фактические границы у края корпуса до изменения концепции.",
    verify_tent: "Проверить использование и реальные границы палатки; определить сохранение/перенос и доступ.",
    confirm_access: "Подтвердить положение входа или транспортной функции и сохранить доступ при изменении корпуса.",
    retain_or_relocate: "Проверить фактические границы и использование; согласовать сохранение/перенос и доступ."
  } : {
    verify_boundary: "Check the centre position and actual extent at the footprint edge before changing the concept.",
    verify_tent: "Verify tent use and its actual footprint; confirm retention/relocation and access.",
    confirm_access: "Confirm the access or transport location and maintain access when changing this footprint.",
    retain_or_relocate: "Verify the actual extent and use; confirm retention/relocation and access."
  };
  const summary = audit.summary;
  const timestamp = audit.source ? new Date(audit.source.acquiredAt).toLocaleString(ru ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : null;
  return <section className="min-w-0 rounded-[24px] border border-line bg-white p-5 shadow-soft sm:p-7" data-testid="create-placement-audit" data-audit-status={audit.status} data-active-variant={massing.variantId} data-source-hash={audit.source?.responseHash} aria-labelledby="create-placement-audit-title">
    <h2 id="create-placement-audit-title" className="text-xl font-bold">{ru ? "Что проверить под корпусами" : "Checks beneath saved footprints"}</h2>
    {summary ? <>
      <p className="mt-2 text-sm leading-6 text-[#475467]" data-testid="create-placement-summary" data-unique-source-count={summary.uniqueSourceCount} data-inside-source-count={summary.insideSourceCount} data-boundary-source-count={summary.boundaryOnlySourceCount} data-affected-block-count={summary.affectedBlockCount} data-inside-pair-count={summary.insidePairCount} data-boundary-pair-count={summary.boundaryPairCount}>
        {ru ? `${summary.insideSourceCount} из ${summary.uniqueSourceCount} уникальных центров OSM — внутри пятен корпусов; ${summary.boundaryOnlySourceCount} — только у границы. Затронуты ${summary.affectedBlockCount} из ${summary.uniqueBlockCount} сохранённых пятен, ${summary.insidePairCount + summary.boundaryPairCount} пар «центр–корпус».` : `${summary.insideSourceCount} of ${summary.uniqueSourceCount} unique OSM centres are inside footprints; ${summary.boundaryOnlySourceCount} are only at an edge. ${summary.affectedBlockCount} of ${summary.uniqueBlockCount} saved footprints have matches, across ${summary.insidePairCount + summary.boundaryPairCount} centre–footprint pairs.`}
      </p>
      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        {audit.blocks.map(block => <article key={block.id} className="min-w-0 rounded-2xl border border-[#dce6e3] bg-[#fbfcfc] p-4" data-testid="create-placement-block" data-block-id={block.id} data-block-status={block.status}>
          <h3 className="break-words text-sm font-bold text-[#344054]">{block.label}</h3><p className="mt-1 break-all text-[11px] text-muted">{block.id}</p>
          {block.status === "unknown" ? <p className="mt-2 text-sm leading-5 text-muted">{ru ? "Геометрия не проверена; положение относительно центров неизвестно." : "Geometry is not verified; centre placement is unknown."}</p> : block.matches.length ? <ul className="mt-3 space-y-3">{block.matches.map(match => <li key={match.sourceFeatureId} className="min-w-0 text-sm leading-5" data-testid="create-placement-match" data-source-id={match.sourceFeatureId} data-relation={match.relation} data-next-check={match.nextCheck}>
            <p className="break-words font-semibold">{match.label}</p><p className="mt-0.5 break-words text-xs text-muted">{CONTEXT_GROUP_LABELS[locale][match.group]} · {match.sourceFeatureId} · {match.relation === "boundary" ? (ru ? "у границы" : "at an edge") : (ru ? "центр внутри" : "centre inside")}</p><p className="mt-1 text-[#475467]">{checks[match.nextCheck]}</p>
          </li>)}</ul> : <p className="mt-2 text-sm leading-5 text-muted" data-testid="create-placement-no-confirmed-matches" data-placement-partially-unknown={summary.unresolvedSourceCount > 0}>{summary.unresolvedSourceCount > 0 ? (ru ? "Подтверждённых совпадений нет; положение части центров неизвестно." : "No confirmed matches; placement of some centres is unknown.") : (ru ? "В сохранённой выборке подтверждённых совпадений нет." : "No confirmed matches in the held sample.")}</p>}
        </article>)}
      </div>
      {summary.unresolvedSourceCount || summary.unresolvedBlockCount ? <p className="mt-3 text-xs leading-5 text-muted" data-testid="create-placement-unknown">{ru ? `Не разрешено: ${summary.unresolvedSourceCount} центров и ${summary.unresolvedBlockCount} пятен. Нужна проверка исходной записи или геометрии.` : `Unresolved: ${summary.unresolvedSourceCount} centres and ${summary.unresolvedBlockCount} footprints. Check the source record or geometry.`}</p> : null}
      {summary.duplicateRecordCount ? <p className="mt-2 text-xs text-muted">{ru ? `Повторных записей: ${summary.duplicateRecordCount}; каждый OSM ID учитывается один раз на корпус.` : `${summary.duplicateRecordCount} repeated records; each OSM ID is counted once per footprint.`}</p> : null}
    </> : <p className="mt-2 text-sm leading-6 text-muted">{audit.reason === "unsupported_frame" ? (ru ? "Для этого рынка расчётная система координат ещё не поддерживается; совпадения не оценены." : "The calculation frame is not supported for this market; placement has not been assessed.") : (ru ? "Сохранённая геометрия не позволяет выполнить ограниченную проверку; совпадения неизвестны." : "The saved geometry cannot be checked within this audit's bounds; placement is unknown.")}</p>}
    <p className="mt-3 text-xs leading-5 text-muted">{ru ? "Центр записи — точечный ориентир, не границы здания. Проверка точки в сохранённом Polygon/MultiPolygon учитывает отверстия; полоса 0,5 м выделена отдельно. Ноль совпадений не исключает конфликтов на месте." : "A record centre is a point proxy, not a building boundary. Point-in-saved-Polygon/MultiPolygon checks include holes; the 0.5 m edge band is separate. Zero sample matches does not rule out site conflicts."}</p>
    {audit.source ? <p className="mt-1 text-xs leading-5 text-muted">{ru ? "Снимок OSM" : "OSM snapshot"}: <time dateTime={audit.source.acquiredAt}>{timestamp} UTC</time>{audit.source.capReached ? (ru ? " · ограниченная выборка" : " · capped sample") : ""}</p> : null}
  </section>;
}
