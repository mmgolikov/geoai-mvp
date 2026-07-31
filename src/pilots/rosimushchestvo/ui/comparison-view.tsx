"use client";

import type { CSSProperties } from "react";
import type { DemoAsset, ScenarioAssessment } from "../domain";
import { archetypeLabels, confidenceLabels, formatMetric, scenarioGroupLabels } from "./formatters";
import styles from "./pilot.module.css";

interface ComparisonViewProps {
  assets: DemoAsset[];
  assessments: Map<DemoAsset["id"], ScenarioAssessment>;
  activeScenarioLabel: string;
  onRemove: (assetId: DemoAsset["id"]) => void;
  onBack: () => void;
}

export function ComparisonView({ assets, assessments, activeScenarioLabel, onRemove, onBack }: ComparisonViewProps) {
  return (
    <section className={styles.comparisonSection} data-testid="comparison-view" aria-labelledby="comparison-title">
      <div className={styles.comparisonHeader}>
        <div>
          <p className={styles.eyebrow}>Сопоставление без общего балла</p>
          <h2 id="comparison-title">Сравнение объектов</h2>
          <p>Одинаковые семь осей, блокирующие факторы, гипотезы и следующие действия. Порядок соответствует порядку выбора.</p>
        </div>
        <div>
          <span>Активный сценарий: <strong>{activeScenarioLabel}</strong></span>
          <button type="button" className={styles.secondaryButton} onClick={onBack}>Вернуться в портфель</button>
        </div>
      </div>

      <div className={styles.comparisonGrid} style={{ "--comparison-columns": assets.length } as CSSProperties}>
        {assets.map((asset, index) => {
          const assessment = assessments.get(asset.id);
          if (!assessment) return null;
          return (
            <article key={asset.id} className={styles.comparisonColumn} data-asset-id={asset.id}>
              <div className={styles.comparisonAssetHeader}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{asset.title}</h3><p>{asset.id} · {archetypeLabels[asset.archetype]}</p></div>
                <button type="button" aria-label={`Удалить ${asset.id} из сравнения`} onClick={() => onRemove(asset.id)}>×</button>
              </div>

              <dl className={styles.comparisonFacts}>
                <div><dt>Площадь</dt><dd>{formatMetric(asset.areaSquareMeters, " м²")}</dd></div>
                <div><dt>До метро</dt><dd>{formatMetric(asset.metroWalkMinutes, " мин")}</dd></div>
                <div><dt>Группа</dt><dd>{scenarioGroupLabels[assessment.group]}</dd></div>
                <div><dt>Достоверность</dt><dd>{confidenceLabels[assessment.confidence]}</dd></div>
              </dl>

              <div className={styles.comparisonAxes}>
                {Object.values(asset.axes).map((axis) => (
                  <div key={axis.key} data-axis-key={axis.key}>
                    <span>{axis.label}</span>
                    <strong>{axis.value === null ? "Нет подтверждённых данных" : `${axis.value}/100`}</strong>
                    <div aria-hidden="true"><i style={{ width: `${axis.value ?? 0}%` }} /></div>
                    {axis.direction === "higher_is_worse" ? <small>100 — максимальная тяжесть или риск</small> : null}
                  </div>
                ))}
              </div>

              <div className={styles.comparisonNarrative}>
                <div><span>Гипотеза</span><p>{assessment.primaryHypothesis}</p></div>
                <div><span>Альтернатива</span><p>{assessment.alternativeHypothesis}</p></div>
                <div>
                  <span>Блокирующие факторы</span>
                  {assessment.blockers.length > 0 ? <ul>{assessment.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p>Критические блокирующие факторы не указаны.</p>}
                </div>
                <div className={styles.comparisonNext}><span>Следующий шаг</span><p>{assessment.nextAction}</p><small>{assessment.ownerRole} · {assessment.dueInBusinessDays} раб. дн.</small></div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
