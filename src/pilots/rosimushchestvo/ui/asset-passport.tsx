"use client";

import type { DemoAsset, ScenarioAssessment } from "../domain";
import {
  archetypeLabels,
  axisTone,
  confidenceLabels,
  formatMetric,
  freshnessLabels,
  scenarioGroupLabels,
  useStatusLabels,
  verificationLabels
} from "./formatters";
import styles from "./pilot.module.css";

interface AssetPassportProps {
  asset: DemoAsset;
  assessment: ScenarioAssessment;
  activeScenarioLabel: string;
  roleActionPriority: string;
  onAddAction: () => void;
  actionAlreadyQueued: boolean;
  comparisonSelected: boolean;
  comparisonDisabled: boolean;
  comparisonOrder: number | null;
  onToggleComparison: () => void;
}

export function AssetPassport({
  asset,
  assessment,
  activeScenarioLabel,
  roleActionPriority,
  onAddAction,
  actionAlreadyQueued,
  comparisonSelected,
  comparisonDisabled,
  comparisonOrder,
  onToggleComparison
}: AssetPassportProps) {
  const hasScenarioChangingConflict = asset.conflicts.some((conflict) => conflict.scenarioChanging);

  return (
    <section className={styles.passport} data-testid="asset-passport" data-asset-id={asset.id} aria-labelledby="asset-passport-title">
      <div className={styles.passportHeader}>
        <div>
          <p className={styles.eyebrow}>Паспорт демонстрационного объекта</p>
          <h2 id="asset-passport-title">{asset.title}</h2>
          <p className={styles.passportId}>{asset.id} · Демонстрационный идентификатор {asset.demoRegistryReference}</p>
        </div>
        <span className={styles.statusChip} data-tone={asset.criticalBlocker ? "danger" : asset.verificationStatus === "conflicting" ? "warning" : "neutral"}>
          {asset.criticalBlocker ? "Критический блокирующий фактор" : verificationLabels[asset.verificationStatus]}
        </span>
      </div>

      <p className={styles.activeScenario} data-testid="active-scenario">
        <span aria-hidden="true">◎</span> Активный сценарий: <strong>{activeScenarioLabel}</strong>
      </p>
      <label className={styles.passportCompareCheck}>
        <input
          type="checkbox"
          checked={comparisonSelected}
          disabled={comparisonDisabled}
          onChange={onToggleComparison}
          aria-label={`Добавить текущий объект ${asset.id} к сопоставлению`}
        />
        <span>{comparisonSelected ? `Объект выбран для сравнения №${comparisonOrder}` : "Добавить объект к сравнению"}</span>
      </label>

      <p className={styles.syntheticCallout}>
        <span aria-hidden="true">◇</span> Синтетическая запись; не является сведением RFI или ЕГРН. Условная точка в пределах округа; не является адресом или границей объекта.
      </p>

      {asset.conflicts.length > 0 ? (
        <div className={styles.conflictPanel} role="status">
          <strong><span aria-hidden="true">!</span> Обнаружено противоречие</strong>
          <p>{hasScenarioChangingConflict ? "Конфликт не разрешён автоматически. Сценарий требует проверки." : "Противоречие отмечено для экспертной проверки и не разрешается автоматически."}</p>
        </div>
      ) : null}

      {asset.missingInputs.length > 0 ? (
        <div className={styles.incompletePanel} role="status">
          <strong>Недостаточно данных для подтверждённого сценария</strong>
          <p>Нет подтверждённых данных: {asset.missingInputs.join("; ")}.</p>
        </div>
      ) : null}

      <div className={styles.passportFacts}>
        <div><span>Тип</span><strong>{archetypeLabels[asset.archetype]}</strong></div>
        <div><span>Округ / зона</span><strong>{asset.district} · {asset.zoneLabel}</strong></div>
        <div><span>Площадь</span><strong>{formatMetric(asset.areaSquareMeters, " м²")}</strong></div>
        <div><span>Пешком до метро</span><strong>{formatMetric(asset.metroWalkMinutes, " мин")}</strong></div>
        <div><span>Использование</span><strong>{useStatusLabels[asset.useStatus]}</strong></div>
        <div><span>Свежесть</span><strong>{freshnessLabels[asset.freshness]}</strong></div>
      </div>

      <div className={styles.hypothesisGrid}>
        <article>
          <p className={styles.cardKicker}>Гипотеза</p>
          <h3>{assessment.primaryHypothesis}</h3>
          <p>{scenarioGroupLabels[assessment.group]}</p>
        </article>
        <article>
          <p className={styles.cardKicker}>Альтернатива</p>
          <h3>{assessment.alternativeHypothesis}</h3>
          <p>Требует отдельной экспертной проверки исходных предпосылок.</p>
        </article>
      </div>

      <div className={styles.sectionHeadingCompact}>
        <div>
          <p className={styles.eyebrow}>Независимые показатели</p>
          <h3>Семь осей решения</h3>
        </div>
        <span className={styles.neutralBadge}>без общего балла</span>
      </div>
      <div className={styles.axesGrid}>
        {Object.values(asset.axes).map((axis) => {
          const negative = axis.direction === "higher_is_worse";
          return (
            <article key={axis.key} className={styles.axisCard} data-axis-key={axis.key}>
              <div className={styles.axisTopline}>
                <h4>{axis.label}</h4>
                <strong>{axis.value === null ? "Нет данных" : `${axis.value}/100`}</strong>
              </div>
              <div className={styles.axisTrack} data-tone={axisTone(axis.value, negative)} aria-hidden="true">
                <span style={{ width: `${axis.value ?? 0}%` }} />
              </div>
              {negative ? <p className={styles.negativeDirection}>100 — максимальная тяжесть или риск</p> : null}
              <p>{axis.explanation}</p>
              <dl className={styles.axisReceipt}>
                <div><dt>Основание</dt><dd>{axis.inputRefs.join(", ") || "Нет подтверждённых данных"}</dd></div>
                <div><dt>Метод</dt><dd>{axis.methodVersion}</dd></div>
                <div><dt>Происхождение</dt><dd>Синтетические входные данные</dd></div>
                <div><dt>Достоверность</dt><dd>{confidenceLabels[axis.confidence]}</dd></div>
                <div><dt>Свежесть</dt><dd>{freshnessLabels[axis.freshness]}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className={styles.passportDetailGrid}>
        <article>
          <h3>Факторы и ограничения</h3>
          <ul className={styles.detailList}>
            {assessment.triggeredConditions.map((condition) => <li key={condition}><span aria-hidden="true">✓</span>{condition}</li>)}
            {assessment.blockers.map((blocker) => <li key={blocker} data-tone="danger"><span aria-hidden="true">!</span>{blocker}</li>)}
            {assessment.triggeredConditions.length === 0 && assessment.blockers.length === 0 ? <li><span aria-hidden="true">ⓘ</span>Значимые подтверждённые факторы не выделены.</li> : null}
          </ul>
        </article>
        <article>
          <h3>Условия, которые не выполнены</h3>
          <ul className={styles.detailList}>
            {assessment.failedConditions.map((condition) => <li key={condition}><span aria-hidden="true">○</span>{condition}</li>)}
            {assessment.missingInputs.map((input) => <li key={input} data-tone="warning"><span aria-hidden="true">?</span>{input}</li>)}
            {assessment.failedConditions.length === 0 && assessment.missingInputs.length === 0 ? <li><span aria-hidden="true">✓</span>По демонстрационным правилам обязательные условия соблюдены.</li> : null}
          </ul>
        </article>
      </div>

      {asset.conflicts.length > 0 ? (
        <div className={styles.conflictsSection}>
          <h3>Конфликтующие наблюдения</h3>
          {asset.conflicts.map((conflict) => (
            <article key={conflict.id} className={styles.conflictCard}>
              <div><strong>{conflict.label}</strong><span>{conflict.scenarioChanging ? "Может изменить сценарий" : "Не меняет сценарий"}</span></div>
              <ul>
                {conflict.versions.map((version) => <li key={`${conflict.id}-${version.sourceRef}`}><span>{version.label}</span><strong>{version.value}</strong><small>{version.sourceRef}</small></li>)}
              </ul>
            </article>
          ))}
        </div>
      ) : null}

      <div className={styles.observationsSection}>
        <h3>Наблюдения и происхождение данных</h3>
        <div className={styles.observationGrid}>
          {asset.observations.map((observation) => (
            <article key={observation.id}>
              <span>{observation.label}</span>
              <strong>{observation.value === null ? "Нет подтверждённых данных" : String(observation.value)}</strong>
              <small>{observation.sourceRef} · {freshnessLabels[observation.freshness]}</small>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.nextActionCard}>
        <div>
          <p className={styles.cardKicker}>Следующий проверяемый шаг</p>
          <h3>{assessment.nextAction}</h3>
          <p>Ответственный режим: {assessment.ownerRole} · срок: {assessment.dueInBusinessDays} раб. дн. · достоверность интерпретации: {confidenceLabels[assessment.confidence]}.</p>
          <p className={styles.roleActionEmphasis}>Акцент текущего режима: {roleActionPriority}.</p>
          <small>Метод: детерминированная сценарная группировка; версия правил: {assessment.ruleVersion}; входы: показанные оси, наблюдения, конфликты, блокирующие факторы и пропуски.</small>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onAddAction}>
          {actionAlreadyQueued ? "Добавить в очередь · уже добавлено" : "Добавить в очередь"}
        </button>
      </div>
    </section>
  );
}
