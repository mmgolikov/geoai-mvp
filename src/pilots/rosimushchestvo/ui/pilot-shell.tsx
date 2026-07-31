"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACTION_QUEUE_STORAGE_KEY,
  DEFAULT_CUSTOM_QUERY,
  type CustomQuery,
  type CustomQueryResult,
  type DemoAction,
  type DemoAsset,
  type DemoState,
  type MainQueryResult,
  type OwnerRole,
  type ScenarioAssessment,
  type SourceCatalogueEntry
} from "../domain";
import { CAPABILITY_SCENARIOS, DEMO_ASSETS, FUTURE_CAPABILITY_SCENARIOS, ROLE_CONFIGURATIONS, SOURCE_CATALOGUE } from "../data";
import type { CapabilityScenarioId } from "../data";
import { evaluateCustomQuery, evaluateMainQuery, evaluateScenario, getAssetById, validateCustomQuery } from "../engine";
import { AssetPassport } from "./asset-passport";
import { AssetPortfolio } from "./asset-portfolio";
import { ComparisonView } from "./comparison-view";
import { accessStatusLabels, freshnessLabels } from "./formatters";
import { PilotMap } from "./pilot-map";
import { QueryPanel } from "./query-panel";
import styles from "./pilot.module.css";

const ALL_ROLES: OwnerRole[] = ROLE_CONFIGURATIONS.map((configuration) => configuration.role);

type PresentationBlock = "kpi" | "map" | "query" | "passport" | "evidence" | "queue";

const ROLE_BLOCK_ORDER: Record<OwnerRole, PresentationBlock[]> = {
  "Руководитель / центральный аппарат": ["kpi", "map", "query", "passport", "evidence", "queue"],
  "Территориальное управление": ["map", "queue", "kpi", "passport", "query", "evidence"],
  "Куратор объекта / портфеля": ["passport", "queue", "kpi", "map", "query", "evidence"],
  "Реестровый / правовой эксперт": ["passport", "evidence", "queue", "kpi", "map", "query"],
  "Эксперт по реализации / оценке": ["query", "passport", "kpi", "map", "evidence", "queue"],
  "Инспектор / мониторинг": ["passport", "map", "queue", "evidence", "kpi", "query"],
  "Аналитик данных": ["evidence", "query", "passport", "kpi", "map", "queue"],
  "Аудитор / наблюдатель": ["evidence", "passport", "query", "kpi", "map", "queue"]
};

const ALLOWED_DEMO_STATES = new Set<DemoState>([
  "normal",
  "map-error",
  "zero-results",
  "stale",
  "permission-required",
  "unavailable",
  "conflict",
  "critical"
]);

const STATE_ASSET: Partial<Record<DemoState, DemoAsset["id"]>> = {
  stale: "DEMO-RF-MSK-018",
  conflict: "DEMO-RF-MSK-014",
  critical: "DEMO-RF-MSK-035"
};

function safeDemoState(value: string | null): DemoState {
  return value && ALLOWED_DEMO_STATES.has(value as DemoState) ? value as DemoState : "normal";
}

type StoredDemoAction = Pick<
  DemoAction,
  "objectId" | "actionType" | "demoAction" | "ownerRole" | "dueInBusinessDays" | "status"
>;

const STORED_ACTION_FIELDS = [
  "actionType",
  "demoAction",
  "dueInBusinessDays",
  "objectId",
  "ownerRole",
  "status"
] as const;

function originalScenarioReceipt(action: StoredDemoAction): {
  scenario: CapabilityScenarioId;
  assessment: ScenarioAssessment;
} | null {
  const asset = getAssetById(action.objectId);
  if (!asset) return null;
  for (const capability of CAPABILITY_SCENARIOS) {
    const assessment = evaluateScenario(asset, capability.id);
    if (assessment.actionType === action.actionType) {
      return { scenario: capability.id, assessment };
    }
  }
  return null;
}

function isStoredDemoAction(value: unknown): value is StoredDemoAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Partial<StoredDemoAction>;
  const hasExactFields = Object.keys(value).sort().join("|") === [...STORED_ACTION_FIELDS].sort().join("|");
  const hasSafeShape = hasExactFields
    && typeof action.objectId === "string"
    && Boolean(getAssetById(action.objectId))
    && typeof action.actionType === "string"
    && action.actionType.length > 0
    && action.actionType.length <= 80
    && typeof action.demoAction === "string"
    && action.demoAction.length > 0
    && action.demoAction.length <= 500
    && typeof action.ownerRole === "string"
    && typeof action.dueInBusinessDays === "number"
    && Number.isFinite(action.dueInBusinessDays)
    && action.dueInBusinessDays >= 0
    && Number.isInteger(action.dueInBusinessDays)
    && action.status === "Новая";
  if (!hasSafeShape) return false;
  const receipt = originalScenarioReceipt(action as StoredDemoAction);
  if (!receipt) return false;
  return receipt.assessment.nextAction === action.demoAction
    && receipt.assessment.ownerRole === action.ownerRole
    && receipt.assessment.dueInBusinessDays === action.dueInBusinessDays;
}

function dedupeStoredActions(actions: StoredDemoAction[]): StoredDemoAction[] {
  const uniqueKeys = new Set<string>();
  return actions.filter((action) => {
    const uniqueKey = `${action.objectId}:${action.actionType}`;
    if (uniqueKeys.has(uniqueKey)) return false;
    uniqueKeys.add(uniqueKey);
    return true;
  });
}

function safelyRemoveStoredQueue(): void {
  try {
    window.localStorage.removeItem(ACTION_QUEUE_STORAGE_KEY);
  } catch {
    // Storage can be blocked by browser policy. Browser-local queue remains usable in memory.
  }
}

function safelyWriteStoredQueue(queue: StoredDemoAction[]): void {
  try {
    window.localStorage.setItem(ACTION_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage can be blocked or full. Do not turn a demo persistence limitation into a UI crash.
  }
}

export function RosimushchestvoPilotShell() {
  const [role, setRole] = useState<OwnerRole>(ALL_ROLES[0]);
  const [activeScenario, setActiveScenario] = useState<CapabilityScenarioId>("engagement");
  const [selectedAssetId, setSelectedAssetId] = useState<DemoAsset["id"]>("DEMO-RF-MSK-001");
  const [unknownObject, setUnknownObject] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>("normal");
  const [urlNotice, setUrlNotice] = useState<string | null>(null);
  const [mainResult, setMainResult] = useState<MainQueryResult | null>(null);
  const [customQuery, setCustomQuery] = useState<CustomQuery>(DEFAULT_CUSTOM_QUERY);
  const [customResult, setCustomResult] = useState<CustomQueryResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [queue, setQueue] = useState<StoredDemoAction[]>([]);
  const [queueReady, setQueueReady] = useState(false);
  const [comparisonIds, setComparisonIds] = useState<DemoAsset["id"][]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const queueSectionRef = useRef<HTMLElement | null>(null);

  const assessmentByAsset = useMemo(() => {
    const map = new Map<DemoAsset["id"], ScenarioAssessment>();
    DEMO_ASSETS.forEach((asset) => map.set(asset.id, evaluateScenario(asset, activeScenario)));
    return map;
  }, [activeScenario]);

  const selectedAsset = getAssetById(selectedAssetId) ?? DEMO_ASSETS[0];
  const selectedAssessment = assessmentByAsset.get(selectedAsset.id) ?? evaluateScenario(selectedAsset, activeScenario);
  const roleConfiguration = ROLE_CONFIGURATIONS.find((configuration) => configuration.role === role) ?? ROLE_CONFIGURATIONS[0];
  const activeScenarioLabel = CAPABILITY_SCENARIOS.find((scenario) => scenario.id === activeScenario)?.label ?? "Предварительная проработка вовлечения";
  const presentationOrder = ROLE_BLOCK_ORDER[role];
  const blockOrder = (block: PresentationBlock) => presentationOrder.indexOf(block) + 1;
  const comparisonAssets = comparisonIds.map((assetId) => getAssetById(assetId)).filter((asset): asset is DemoAsset => Boolean(asset));

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const state = safeDemoState(parameters.get("demoState"));
    setDemoState(state);

    const requestedObjectId = parameters.get("object");
    if (requestedObjectId) {
      const requestedAsset = getAssetById(requestedObjectId);
      if (requestedAsset) {
        setSelectedAssetId(requestedAsset.id);
        setUnknownObject(false);
      } else {
        setUnknownObject(true);
      }
    } else if (STATE_ASSET[state]) {
      setSelectedAssetId(STATE_ASSET[state] as DemoAsset["id"]);
    }

    if (parameters.has("filters")) {
      setUrlNotice("Некорректное или неподдерживаемое состояние фильтра сброшено до безопасных значений.");
    }
  }, []);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(ACTION_QUEUE_STORAGE_KEY);
      if (storedValue) {
        const parsed: unknown = JSON.parse(storedValue);
        if (Array.isArray(parsed)) {
          const validActions = dedupeStoredActions(parsed.filter(isStoredDemoAction));
          setQueue(validActions);
          if (validActions.length !== parsed.length) safelyWriteStoredQueue(validActions);
        } else {
          safelyRemoveStoredQueue();
        }
      }
    } catch {
      safelyRemoveStoredQueue();
    } finally {
      setQueueReady(true);
    }
  }, []);

  useEffect(() => {
    if (!queueReady) return;
    safelyWriteStoredQueue(queue);
  }, [queue, queueReady]);

  const selectAsset = useCallback((assetId: DemoAsset["id"]) => {
    setSelectedAssetId(assetId);
    setUnknownObject(false);
    const url = new URL(window.location.href);
    url.searchParams.set("object", assetId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const runMainQuery = () => {
    setActiveScenario("engagement");
    setMainResult(evaluateMainQuery());
    setCustomResult(null);
    setValidationErrors([]);
  };

  const runCustomQuery = () => {
    const errors = validateCustomQuery(customQuery);
    setValidationErrors(errors);
    if (errors.length > 0) return;
    setActiveScenario(customQuery.scenario === "any" ? "engagement" : customQuery.scenario);
    setCustomResult(evaluateCustomQuery(customQuery));
    setMainResult(null);
  };

  const addSelectedAction = () => {
    const existingIndex = queue.findIndex((action) => action.objectId === selectedAsset.id && action.actionType === selectedAssessment.actionType);
    if (existingIndex >= 0) {
      queueSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setQueue((current) => [
      ...current,
      {
        objectId: selectedAsset.id,
        actionType: selectedAssessment.actionType,
        demoAction: selectedAssessment.nextAction,
        ownerRole: selectedAssessment.ownerRole,
        dueInBusinessDays: selectedAssessment.dueInBusinessDays,
        status: "Новая"
      }
    ]);
  };

  const toggleComparison = useCallback((assetId: DemoAsset["id"]) => {
    const next = comparisonIds.includes(assetId)
      ? comparisonIds.filter((id) => id !== assetId)
      : comparisonIds.length >= 4
        ? comparisonIds
        : [...comparisonIds, assetId];
    setComparisonIds(next);
    if (next.length < 2) setComparisonOpen(false);
  }, [comparisonIds]);

  const removeComparison = (assetId: DemoAsset["id"]) => {
    const next = comparisonIds.filter((id) => id !== assetId);
    setComparisonIds(next);
    if (next.length < 2) setComparisonOpen(false);
  };

  const resetDemo = () => {
    if (!window.confirm("Сбросить запросы, выбранный объект и демонстрационную очередь?")) return;
    setRole(ALL_ROLES[0]);
    setActiveScenario("engagement");
    setSelectedAssetId("DEMO-RF-MSK-001");
    setUnknownObject(false);
    setMainResult(null);
    setCustomResult(null);
    setCustomQuery(DEFAULT_CUSTOM_QUERY);
    setValidationErrors([]);
    setQueue([]);
    setComparisonIds([]);
    setComparisonOpen(false);
    safelyRemoveStoredQueue();
    window.history.replaceState(null, "", window.location.pathname);
    setDemoState("normal");
    setUrlNotice(null);
  };

  const incompleteCount = DEMO_ASSETS.filter((asset) => asset.verificationStatus === "incomplete" || asset.missingInputs.length > 0).length;
  const conflictCount = DEMO_ASSETS.filter((asset) => asset.conflicts.length > 0).length;
  const criticalCount = DEMO_ASSETS.filter((asset) => asset.criticalBlocker).length;

  return (
    <main className={styles.root} data-testid="rosim-pilot-root" lang="ru">
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">G</span>
          <span><strong>GeoAI</strong><small>Пространственная аналитика решений</small></span>
        </div>
        <div className={styles.headerMeta}>
          <span>Москва</span>
          <span>Prototype v1</span>
          <button type="button" className={styles.textButton} data-testid="reset-demo" onClick={resetDemo}>Сбросить демонстрацию</button>
        </div>
      </header>

      <div className={styles.page}>
        <section className={styles.disclaimer} data-testid="persistent-disclaimer" aria-label="Ограничение использования результатов">
          <span className={styles.disclaimerIcon} aria-hidden="true">i</span>
          <p><strong>Гипотеза предварительного анализа.</strong> Требуется подтверждение Росимуществом и уполномоченными источниками. Не является юридическим, кадастровым, градостроительным, оценочным или управленческим заключением.</p>
          <span className={styles.datasetBadge}>42 синтетических объекта</span>
        </section>

        {demoState !== "normal" ? <p className={styles.testStateLabel}>Тестовое демонстрационное состояние</p> : null}
        {urlNotice ? <p className={styles.inlineState} role="status">{urlNotice}</p> : null}

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Изолированный демонстрационный контур</p>
            <h1>Росимущество: предварительный анализ портфеля Москвы</h1>
            <p>От объяснимой выборки к паспорту объекта, доказательствам и следующему проверяемому действию.</p>
          </div>
          <div className={styles.roleControl}>
            <label htmlFor="rosim-role">Режим представления</label>
            <select id="rosim-role" name="role" data-testid="role-select" value={role} onChange={(event) => setRole(event.target.value as OwnerRole)}>
              {ALL_ROLES.map((roleName) => <option key={roleName} value={roleName}>{roleName}</option>)}
            </select>
            <small>Демонстрационный режим представления; не является механизмом разграничения доступа или RBAC.</small>
          </div>
        </section>

        <section className={styles.roleFocus} aria-label="Настройка режима представления">
          <div><span>Первый фокус</span><strong>{roleConfiguration.firstBlock}</strong></div>
          <div><span>KPI-акцент</span><strong>{roleConfiguration.kpiEmphasis.join(" · ")}</strong></div>
          <div><span>Приоритет действия</span><strong>{roleConfiguration.actionPriority}</strong></div>
        </section>

        <section className={styles.compareToolbar} aria-label="Управление сравнением">
          <div>
            <span data-testid="compare-count">Выбрано {comparisonIds.length} из 4</span>
            <div className={styles.compareSelectionOrder}>
              {comparisonIds.length === 0 ? <small>Выберите объекты в списке или паспорте.</small> : comparisonIds.map((assetId, index) => (
                <button key={assetId} type="button" onClick={() => toggleComparison(assetId)} aria-label={`Удалить ${assetId} из сравнения`}>
                  <span>{index + 1}</span>{assetId}<b aria-hidden="true">×</b>
                </button>
              ))}
            </div>
          </div>
          <div>
            {comparisonIds.length >= 4 ? <p>Можно сравнить не более 4 объектов</p> : <p>Порядок выбора будет сохранён.</p>}
            <button
              type="button"
              className={styles.primaryButton}
              data-testid="compare-button"
              disabled={comparisonIds.length < 2}
              onClick={() => setComparisonOpen(true)}
            >
              Сравнить
            </button>
          </div>
        </section>

        <div className={styles.orderedContent} data-presentation-priority={roleConfiguration.firstBlock}>
        {comparisonOpen ? (
          <div className={styles.comparisonBlock} style={{ order: 0 }}>
            <ComparisonView
              assets={comparisonAssets}
              assessments={assessmentByAsset}
              activeScenarioLabel={activeScenarioLabel}
              onRemove={removeComparison}
              onBack={() => setComparisonOpen(false)}
            />
          </div>
        ) : (
          <>
        <section className={styles.kpiSection} style={{ order: blockOrder("kpi") }} data-testid="block-kpi" aria-labelledby="portfolio-kpi-title">
          <div className={styles.sectionHeadingCompact}>
            <div><p className={styles.eyebrow}>Портфель</p><h2 id="portfolio-kpi-title">Контрольная панель</h2></div>
            <p className={styles.lineageNote}>Источник KPI: локальный синтетический набор rosim-moscow-demo-v1; расчёт — прямой подсчёт записей.</p>
          </div>
          <div className={styles.kpiGrid}>
            <article><span>Объектов в наборе</span><strong>{DEMO_ASSETS.length}</strong><small>синтетические данные · полный набор</small></article>
            <article><span>В основной выборке</span><strong>8</strong><small>производный вывод · rosim-scenario-rules-v1</small></article>
            <article><span>Конфликты / неполнота</span><strong>{conflictCount + incompleteCount}</strong><small>{conflictCount} конфликтов · {incompleteCount} неполных</small></article>
            <article><span>Критические блокеры</span><strong>{criticalCount}</strong><small>синтетические данные · требуется экспертная проверка</small></article>
          </div>
        </section>

        <div className={styles.portfolioGrid} style={{ order: blockOrder("map") }} data-testid="block-map">
          <PilotMap assets={DEMO_ASSETS} selectedAssetId={selectedAsset.id} onSelect={selectAsset} forceError={demoState === "map-error"} />
          <AssetPortfolio assets={DEMO_ASSETS} selectedAssetId={selectedAsset.id} assessments={assessmentByAsset} onSelect={selectAsset} comparisonIds={comparisonIds} onToggleComparison={toggleComparison} />
        </div>

        <div className={styles.queryBlock} style={{ order: blockOrder("query") }} data-testid="block-query">
        <QueryPanel
          customQuery={customQuery}
          customResult={customResult}
          mainResult={mainResult}
          validationErrors={validationErrors}
          onCustomQueryChange={(nextQuery) => {
            setCustomQuery(nextQuery);
            setValidationErrors([]);
          }}
          onRunMainQuery={runMainQuery}
          onRunCustomQuery={runCustomQuery}
          onSelectAsset={selectAsset}
          forceZeroResults={demoState === "zero-results"}
          activeScenarioLabel={activeScenarioLabel}
          activeScenario={activeScenario}
        />

        <section className={styles.capabilitiesSection} aria-labelledby="capabilities-title">
          <div className={styles.sectionHeadingCompact}>
            <div><p className={styles.eyebrow}>Сценарии P0</p><h2 id="capabilities-title">Моделируемые возможности</h2></div>
            <span className={styles.neutralBadge}>4 детерминированных сценария</span>
          </div>
          <div className={styles.capabilityGrid} data-testid="modelled-capabilities">
            {CAPABILITY_SCENARIOS.map((scenario, index) => (
              <article key={scenario.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{scenario.label}</h3><p>{scenario.purpose}</p></div>
                <small>Моделируется в prototype v1 · без внешнего вызова</small>
              </article>
            ))}
          </div>
          <div className={styles.futureCapabilityGrid} data-testid="future-capabilities">
            {FUTURE_CAPABILITY_SCENARIOS.map((scenario) => (
              <article key={scenario.id} data-capability-id={scenario.id}>
                <div><h3>{scenario.label}</h3><p>{scenario.purpose}</p></div>
                <strong>{scenario.statusLabel}</strong>
              </article>
            ))}
          </div>
        </section>
        </div>

        <div className={styles.passportBlock} style={{ order: blockOrder("passport") }} data-testid="block-passport">
        {unknownObject ? (
          <section className={styles.notFoundState} role="status">
            <span aria-hidden="true">?</span>
            <div><h2>Демонстрационный объект не найден</h2><p>Параметр object не соответствует ни одному ID из фиксированного набора. Показан основной демонстрационный объект.</p></div>
            <button type="button" className={styles.secondaryButton} onClick={() => selectAsset("DEMO-RF-MSK-001")}>Открыть DEMO-RF-MSK-001</button>
          </section>
        ) : (
          <AssetPassport
            asset={selectedAsset}
            assessment={selectedAssessment}
            activeScenarioLabel={activeScenarioLabel}
            roleActionPriority={roleConfiguration.actionPriority}
            onAddAction={addSelectedAction}
            actionAlreadyQueued={queue.some((action) => action.objectId === selectedAsset.id && action.actionType === selectedAssessment.actionType)}
            comparisonSelected={comparisonIds.includes(selectedAsset.id)}
            comparisonDisabled={comparisonIds.length >= 4 && !comparisonIds.includes(selectedAsset.id)}
            comparisonOrder={comparisonIds.includes(selectedAsset.id) ? comparisonIds.indexOf(selectedAsset.id) + 1 : null}
            onToggleComparison={() => toggleComparison(selectedAsset.id)}
          />
        )}
        </div>
          </>
        )}

        <div className={styles.evidenceBlock} style={{ order: blockOrder("evidence") }} data-testid="block-evidence">
          <EvidenceCatalogue sources={SOURCE_CATALOGUE} demoState={demoState} />
        </div>

        <section className={styles.queueSection} style={{ order: blockOrder("queue") }} data-testid="action-queue" ref={queueSectionRef} aria-labelledby="queue-title">
          <div className={styles.sectionHeadingCompact}>
            <div>
              <p className={styles.eyebrow}>Следующие шаги</p>
              <h2 id="queue-title">Демонстрационная очередь действий</h2>
              <p>Демонстрационная очередь. Изменения сохраняются только в этом браузере.</p>
            </div>
            {queue.length > 0 ? <button type="button" className={styles.textButton} onClick={() => setQueue([])}>Очистить очередь</button> : null}
          </div>
          {queue.length === 0 ? (
            <div className={styles.emptyState} role="status"><span aria-hidden="true">＋</span><div><strong>В очереди пока нет действий</strong><p>Добавьте следующий шаг из паспорта выбранного объекта.</p></div></div>
          ) : (
            <div className={styles.queueRows}>
              {queue.map((action) => {
                const asset = getAssetById(action.objectId);
                const originalReceipt = originalScenarioReceipt(action);
                const basis = originalReceipt
                  ? `${originalReceipt.assessment.primaryHypothesis}; ${originalReceipt.assessment.triggeredConditions.join("; ")}`
                  : "Основание недоступно в фиксированном демонстрационном наборе.";
                const scenarioLabel = CAPABILITY_SCENARIOS.find((scenario) => scenario.id === originalReceipt?.scenario)?.label;
                return (
                  <article key={`${action.objectId}-${action.actionType}`} data-asset-id={action.objectId}>
                    <span className={styles.queueStatus}>{action.status}</span>
                    <div><strong>{asset?.title ?? "Демонстрационный объект"}</strong><small>{action.objectId}</small></div>
                    <div><span>Действие</span><strong>{action.demoAction}</strong>{scenarioLabel ? <small>Сценарий: {scenarioLabel}</small> : null}</div>
                    <div><span>Основание</span><p>{basis}</p></div>
                    <div><span>Ответственный / срок</span><p>{action.ownerRole} · {action.dueInBusinessDays} раб. дн.</p></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}

interface EvidenceCatalogueProps {
  sources: readonly SourceCatalogueEntry[];
  demoState: DemoState;
}

function EvidenceCatalogue({ sources, demoState }: EvidenceCatalogueProps) {
  return (
    <section className={styles.evidenceSection} data-testid="evidence-catalogue" aria-labelledby="evidence-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Evidence и происхождение</p>
          <h2 id="evidence-title">Каталог источников и ограничений</h2>
          <p>Возможный источник будущего подключения; в prototype v1 не подключён. Статус источника не подтверждает сведения об объекте.</p>
        </div>
      </div>
      {demoState === "permission-required" ? <p className={styles.inlineState}>Доступ к источнику требует подтверждения.</p> : null}
      {demoState === "unavailable" ? <p className={styles.inlineState}>Источник недоступен в этой версии прототипа.</p> : null}
      <div className={styles.sourceRows}>
        {sources.map((source) => (
          <article key={source.id} data-source-id={source.id}>
            <div><span className={styles.sourceIcon} aria-hidden="true">◎</span><div><h3>{source.sourceName}</h3><p>{source.intendedUse}</p></div></div>
            <dl>
              <div><dt>Интеграция</dt><dd>{source.integrationStatus === "fixture_only" ? "Только демонстрационный набор" : "Не подключён"}</dd></div>
              <div><dt>Доступ</dt><dd>{accessStatusLabels[source.sourceAccessStatus]}</dd></div>
              <div><dt>Исполнение / снимок</dt><dd>{source.snapshotRuntimeStatus}</dd></div>
              <div><dt>Свежесть</dt><dd>{freshnessLabels[source.freshness]}</dd></div>
            </dl>
            <p><strong>Разрешения:</strong> {source.licensePermissionNote}</p>
            <p><strong>Ограничение prototype v1:</strong> {source.prototypeLimitation}</p>
            {source.sourceAccessStatus === "permission_required" ? <span className={styles.sourceStatus}>Доступ к источнику требует подтверждения</span> : null}
            {source.sourceAccessStatus === "unavailable" ? <span className={styles.sourceStatus}>Источник недоступен в этой версии прототипа</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
