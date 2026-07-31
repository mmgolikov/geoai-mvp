"use client";

import type { CustomQuery, CustomQueryResult, MainQueryResult } from "../domain";
import type { CapabilityScenarioId } from "../data";
import { evaluateScenario } from "../engine";
import { archetypeLabels, scenarioGroupLabels } from "./formatters";
import styles from "./pilot.module.css";

interface QueryPanelProps {
  customQuery: CustomQuery;
  customResult: CustomQueryResult | null;
  mainResult: MainQueryResult | null;
  validationErrors: string[];
  onCustomQueryChange: (query: CustomQuery) => void;
  onRunMainQuery: () => void;
  onRunCustomQuery: () => void;
  onSelectAsset: (assetId: MainQueryResult["selectedIds"][number]) => void;
  forceZeroResults?: boolean;
  activeScenarioLabel: string;
  activeScenario: CapabilityScenarioId;
}

function optionalNumber(rawValue: string): number | null {
  return rawValue.trim() === "" ? null : Number(rawValue);
}

export function QueryPanel({
  customQuery,
  customResult,
  mainResult,
  validationErrors,
  onCustomQueryChange,
  onRunMainQuery,
  onRunCustomQuery,
  onSelectAsset,
  forceZeroResults = false,
  activeScenarioLabel,
  activeScenario
}: QueryPanelProps) {
  const updateQuery = <Key extends keyof CustomQuery>(key: Key, value: CustomQuery[Key]) => {
    onCustomQueryChange({ ...customQuery, [key]: value });
  };

  return (
    <section className={styles.querySection} aria-labelledby="query-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Воспроизводимый анализ</p>
          <h2 id="query-title">Запросы к демонстрационному портфелю</h2>
          <p>Структурированные условия выполняются локально в браузере. Произвольный текст не интерпретируется AI-моделью.</p>
        </div>
      </div>

      <div className={styles.queryGrid}>
        <article className={styles.mainQueryCard}>
          <div>
            <span className={styles.cardNumber}>01</span>
            <p className={styles.cardKicker}>Основной запрос</p>
            <h3>Какие объекты приоритетны для предварительной проработки вовлечения в ближайшие 12 месяцев?</h3>
            <p>Учитываются спрос, ограничения, фактическое использование и готовность документов.</p>
          </div>
          <details className={styles.rulesDisclosure}>
            <summary>Правила группировки и сортировки</summary>
            <ol>
              <li>Сначала объекты только для экспертной проверки: критический блокер, отсутствующее обязательное исходное условие или сценарно значимый конфликт.</li>
              <li>Затем объекты, где можно начинать предварительную проработку по раскрытым порогам семи осей.</li>
              <li>После них — перспективные объекты, которым нужна конкретная проверка.</li>
              <li>Внутри группы: готовность, потенциал повышения использования и спрос по убыванию, затем ID. Неизвестное значение всегда последнее.</li>
            </ol>
          </details>
          <button type="button" className={styles.primaryButton} data-testid="main-query-button" onClick={onRunMainQuery}>
            Выполнить основной запрос
          </button>
        </article>

        <form
          className={styles.customQueryCard}
          data-testid="custom-query-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onRunCustomQuery();
          }}
        >
          <div>
            <span className={styles.cardNumber}>02</span>
            <p className={styles.cardKicker}>Кастомный запрос</p>
            <h3>Задайте проверяемые условия</h3>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Статус использования</span>
              <select name="useStatus" value={customQuery.useStatus} onChange={(event) => updateQuery("useStatus", event.target.value as CustomQuery["useStatus"])}>
                <option value="any">Любой</option>
                <option value="unused">Не используется</option>
                <option value="underused">Используется не полностью</option>
                <option value="used">Используется</option>
                <option value="unknown">Нет подтверждённых данных</option>
              </select>
            </label>
            <label>
              <span>Площадь от, м²</span>
              <input name="minimumAreaSquareMeters" type="number" inputMode="numeric" value={customQuery.minimumAreaSquareMeters ?? ""} onChange={(event) => updateQuery("minimumAreaSquareMeters", optionalNumber(event.target.value))} />
            </label>
            <label>
              <span>Максимальная площадь, м²</span>
              <input name="maximumAreaSquareMeters" type="number" inputMode="numeric" placeholder="Без ограничения" value={customQuery.maximumAreaSquareMeters ?? ""} onChange={(event) => updateQuery("maximumAreaSquareMeters", optionalNumber(event.target.value))} />
            </label>
            <label>
              <span>До метро, не более минут</span>
              <input name="maximumMetroWalkMinutes" type="number" inputMode="numeric" value={customQuery.maximumMetroWalkMinutes ?? ""} onChange={(event) => updateQuery("maximumMetroWalkMinutes", optionalNumber(event.target.value))} />
              <small>Синтетическая метрика, не рассчитанный маршрут.</small>
            </label>
            <label>
              <span>Критические ограничения</span>
              <select name="criticalConstraint" value={customQuery.criticalConstraint} onChange={(event) => updateQuery("criticalConstraint", event.target.value as CustomQuery["criticalConstraint"])}>
                <optgroup label="Операторы отбора">
                  <option value="exclude_confirmed_present">Исключить подтверждённое наличие</option>
                  <option value="any">Любое состояние</option>
                </optgroup>
                <optgroup label="Точное состояние">
                  <option value="absent">Подтверждено отсутствие</option>
                  <option value="present">Подтверждено наличие</option>
                  <option value="unknown">Неизвестно</option>
                </optgroup>
              </select>
              <small>Неизвестное значение хранится отдельно и не считается отсутствием ограничения.</small>
            </label>
            <label>
              <span>Сценарий</span>
              <select name="scenario" value={customQuery.scenario} onChange={(event) => updateQuery("scenario", event.target.value as CustomQuery["scenario"])}>
                <option value="engagement">Предварительная проработка вовлечения</option>
                <option value="non_use">Признаки неиспользования</option>
                <option value="monitoring">Приоритет мониторинга или выезда</option>
                <option value="registry_quality">Качество реестровой записи</option>
                <option value="any">Без сценарного ограничения</option>
              </select>
            </label>
            <label>
              <span>Минимальная достоверность, 0–100</span>
              <input name="minimumDataConfidence" type="number" min="0" max="100" inputMode="numeric" placeholder="Без ограничения" value={customQuery.minimumDataConfidence ?? ""} onChange={(event) => updateQuery("minimumDataConfidence", optionalNumber(event.target.value))} />
            </label>
            <label className={styles.formWide}>
              <span>Политика неизвестных значений</span>
              <select name="unknownPolicy" value={customQuery.unknownPolicy} onChange={(event) => updateQuery("unknownPolicy", event.target.value as CustomQuery["unknownPolicy"])}>
                <option value="separate_for_confirmation">Показывать отдельно как требующие проверки</option>
                <option value="exclude">Исключать из результата</option>
              </select>
              <small>Неизвестное значение не считается отсутствием ограничения и не преобразуется в ноль.</small>
            </label>
          </div>

          {validationErrors.length > 0 ? (
            <div className={styles.validationErrors} role="alert" aria-live="polite">
              <strong>Проверьте условия запроса:</strong>
              <ul>{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          ) : null}

          <button type="submit" className={styles.secondaryButton} data-testid="custom-query-submit">Применить условия</button>
        </form>
      </div>

      {forceZeroResults ? (
        <div className={styles.emptyState} role="status">
          <span aria-hidden="true">⌕</span>
          <div><strong>По заданным условиям объекты не найдены</strong><p>Тестовое демонстрационное состояние воспроизводит пустую выборку.</p></div>
        </div>
      ) : null}

      {!forceZeroResults && mainResult ? (
        <div className={styles.resultSection} data-testid="main-query-results" aria-live="polite">
          <div className={styles.resultHeader}>
            <div><p className={styles.eyebrow}>Предварительная выборка объектов</p><h3>Результат основного запроса</h3></div>
            <div className={styles.resultContext}><strong>{mainResult.ordered.length} объектов</strong><span>Сценарий: {activeScenarioLabel}</span></div>
          </div>
          <div className={styles.resultRows}>
            {mainResult.ordered.map(({ asset, assessment }, index) => (
              <button key={asset.id} type="button" data-main-result-id={asset.id} onClick={() => onSelectAsset(asset.id)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{asset.title}</strong><small>{asset.id} · {archetypeLabels[asset.archetype]}</small></span>
                <span>{scenarioGroupLabels[assessment.group]}</span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          <p className={styles.resultReceipt}>Производная выборка · метод и версия правил раскрыты в паспорте каждого объекта · не является официальным рейтингом.</p>
        </div>
      ) : null}

      {!forceZeroResults && customResult ? (
        <div className={styles.customResults} aria-live="polite">
          <p className={styles.customScenarioContext}>Активный сценарий результата: <strong>{activeScenarioLabel}</strong></p>
          <ResultGroup title="Соответствуют" tone="positive" testId="custom-matches" rowAttribute="data-custom-match-id" items={customResult.groups.matches} onSelectAsset={onSelectAsset} activeScenario={activeScenario} />
          <ResultGroup title="Требуют подтверждения" tone="warning" testId="custom-confirmation" rowAttribute="data-custom-confirmation-id" items={customResult.groups.requires_confirmation} onSelectAsset={onSelectAsset} activeScenario={activeScenario} />
          <ResultGroup title="Не соответствуют" tone="neutral" items={customResult.groups.does_not_match} onSelectAsset={onSelectAsset} activeScenario={activeScenario} collapsed />
        </div>
      ) : null}
    </section>
  );
}

interface ResultGroupProps {
  title: string;
  tone: "positive" | "warning" | "neutral";
  testId?: string;
  rowAttribute?: "data-custom-match-id" | "data-custom-confirmation-id";
  items: CustomQueryResult["groups"]["matches"];
  onSelectAsset: QueryPanelProps["onSelectAsset"];
  collapsed?: boolean;
  activeScenario: CapabilityScenarioId;
}

function ResultGroup({ title, tone, testId, rowAttribute, items, onSelectAsset, activeScenario, collapsed = false }: ResultGroupProps) {
  const content = (
    <div className={styles.customResultRows} data-testid={testId}>
      {items.length === 0 ? <p>По заданным условиям объекты не найдены.</p> : items.map(({ asset, reasons }) => {
        const rowProps = rowAttribute ? { [rowAttribute]: asset.id } : {};
        const assessment = evaluateScenario(asset, activeScenario);
        return (
          <button key={asset.id} type="button" {...rowProps} onClick={() => onSelectAsset(asset.id)}>
            <span><strong>{asset.title}</strong><small>{asset.id}</small></span>
            <span><em>{scenarioGroupLabels[assessment.group]}</em>{reasons.join("; ")}</span>
            <span className={styles.customNextAction}><small>Следующий шаг</small>{assessment.nextAction}</span>
            <span aria-hidden="true">→</span>
          </button>
        );
      })}
    </div>
  );

  if (collapsed) {
    return <details className={styles.customResultGroup} data-tone={tone}><summary>{title}<span>{items.length}</span></summary>{content}</details>;
  }

  return <section className={styles.customResultGroup} data-tone={tone}><div className={styles.customResultTitle}><h3>{title}</h3><span>{items.length}</span></div>{content}</section>;
}
