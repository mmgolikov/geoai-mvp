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
import { CAPABILITY_SCENARIOS, DEMO_ASSETS, ROLE_CONFIGURATIONS, SOURCE_CATALOGUE } from "../data";
import type { CapabilityScenarioId } from "../data";
import { evaluateCustomQuery, evaluateMainQuery, evaluateScenario, getAssetById, validateCustomQuery } from "../engine";
import { AssetPassport } from "./asset-passport";
import { AssetPortfolio } from "./asset-portfolio";
import { accessStatusLabels, freshnessLabels } from "./formatters";
import { PilotMap } from "./pilot-map";
import { QueryPanel } from "./query-panel";
import styles from "./pilot.module.css";

const P0_ROLES: OwnerRole[] = [
  "Руководитель / центральный аппарат",
  "Куратор объекта / портфеля",
  "Аналитик данных"
];

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

function pickP0Sources() {
  const fixture = SOURCE_CATALOGUE.find((source) => source.integrationStatus === "fixture_only");
  const permission = SOURCE_CATALOGUE.find((source) => source.sourceAccessStatus === "permission_required");
  const unavailable = SOURCE_CATALOGUE.find((source) => source.sourceAccessStatus === "unavailable");
  return [fixture, permission, unavailable].filter((source): source is NonNullable<typeof source> => Boolean(source));
}

export function RosimushchestvoPilotShell() {
  const [role, setRole] = useState<OwnerRole>(P0_ROLES[0]);
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
  const queueSectionRef = useRef<HTMLElement | null>(null);

  const assessmentByAsset = useMemo(() => {
    const map = new Map<DemoAsset["id"], ScenarioAssessment>();
    DEMO_ASSETS.forEach((asset) => map.set(asset.id, evaluateScenario(asset, activeScenario)));
    return map;
  }, [activeScenario]);

  const selectedAsset = getAssetById(selectedAssetId) ?? DEMO_ASSETS[0];
  const selectedAssessment = assessmentByAsset.get(selectedAsset.id) ?? evaluateScenario(selectedAsset, activeScenario);
  const roleConfiguration = ROLE_CONFIGURATIONS.find((configuration) => configuration.role === role) ?? ROLE_CONFIGURATIONS[0];
  const visibleSources = useMemo(pickP0Sources, []);
  const activeScenarioLabel = CAPABILITY_SCENARIOS.find((scenario) => scenario.id === activeScenario)?.label ?? "Предварительная проработка вовлечения";

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

  const resetDemo = () => {
    if (!window.confirm("Сбросить запросы, выбранный объект и демонстрационную очередь?")) return;
    setRole(P0_ROLES[0]);
    setActiveScenario("engagement");
    setSelectedAssetId("DEMO-RF-MSK-001");
    setUnknownObject(false);
    setMainResult(null);
    setCustomResult(null);
    setCustomQuery(DEFAULT_CUSTOM_QUERY);
    setValidationErrors([]);
    setQueue([]);
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
              {P0_ROLES.map((roleName) => <option key={roleName} value={roleName}>{roleName}</option>)}
            </select>
            <small>Демонстрационный режим представления; не является механизмом разграничения доступа или RBAC.</small>
          </div>
        </section>

        <section className={styles.roleFocus} aria-label="Настройка режима представления">
          <div><span>Первый фокус</span><strong>{roleConfiguration.firstBlock}</strong></div>
          <div><span>KPI-акцент</span><strong>{roleConfiguration.kpiEmphasis.join(" · ")}</strong></div>
          <div><span>Приоритет действия</span><strong>{roleConfiguration.actionPriority}</strong></div>
        </section>

        <section className={styles.kpiSection} aria-labelledby="portfolio-kpi-title">
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

        <div className={styles.portfolioGrid}>
          <PilotMap assets={DEMO_ASSETS} selectedAssetId={selectedAsset.id} onSelect={selectAsset} forceError={demoState === "map-error"} />
          <AssetPortfolio assets={DEMO_ASSETS} selectedAssetId={selectedAsset.id} assessments={assessmentByAsset} onSelect={selectAsset} />
        </div>

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
        />

        <section className={styles.capabilitiesSection} aria-labelledby="capabilities-title">
          <div className={styles.sectionHeadingCompact}>
            <div><p className={styles.eyebrow}>Сценарии P0</p><h2 id="capabilities-title">Моделируемые возможности</h2></div>
            <span className={styles.neutralBadge}>4 детерминированных сценария</span>
          </div>
          <div className={styles.capabilityGrid}>
            {CAPABILITY_SCENARIOS.map((scenario, index) => (
              <article key={scenario.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{scenario.label}</h3><p>{scenario.purpose}</p></div>
                <small>Моделируется в prototype v1 · без внешнего вызова</small>
              </article>
            ))}
          </div>
        </section>

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
            onAddAction={addSelectedAction}
            actionAlreadyQueued={queue.some((action) => action.objectId === selectedAsset.id && action.actionType === selectedAssessment.actionType)}
          />
        )}

        <EvidenceCatalogue sources={visibleSources} demoState={demoState} />

        <section className={styles.queueSection} data-testid="action-queue" ref={queueSectionRef} aria-labelledby="queue-title">
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
