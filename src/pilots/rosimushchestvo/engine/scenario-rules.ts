import {
  RULE_VERSION,
  type ConfidenceLevel,
  type DemoAsset,
  type DerivedReceipt,
  type MainQueryResult,
  type ScenarioAssessment,
  type ScenarioGroup
} from "../domain";
import { DEMO_ASSETS, type CapabilityScenarioId } from "../data";

const GROUP_ORDER: ScenarioGroup[] = [
  "expert_review_only",
  "start_preliminary_work",
  "promising_after_check",
  "not_in_preliminary_selection"
];

const SCENARIO_METHODS: Record<CapabilityScenarioId, string> = {
  registry_quality: "rosim-registry-quality-method-v1",
  non_use: "rosim-non-use-method-v1",
  engagement: "rosim-engagement-method-v1",
  monitoring: "rosim-monitoring-method-v1"
};

interface RuleEvaluation {
  group: ScenarioGroup;
  triggeredConditions: string[];
  failedConditions: string[];
  missingInputs: string[];
  blockers: string[];
  confidence: ConfidenceLevel;
}

function axisValue(asset: DemoAsset, key: keyof DemoAsset["axes"]): number | null {
  return asset.axes[key].value;
}

function atLeast(value: number | null, threshold: number): boolean {
  return value !== null && value >= threshold;
}

function below(value: number | null, threshold: number): boolean {
  return value !== null && value < threshold;
}

function scenarioChangingConflict(asset: DemoAsset): boolean {
  return asset.conflicts.some((conflict) => conflict.scenarioChanging && !conflict.resolved);
}

function nonScenarioChangingConflict(asset: DemoAsset): boolean {
  return asset.conflicts.some((conflict) => !conflict.scenarioChanging && !conflict.resolved);
}

function confidenceFromData(asset: DemoAsset, forceLow = false): ConfidenceLevel {
  const confidence = axisValue(asset, "dataConfidence");
  if (confidence === null) return "unknown";
  if (forceLow || confidence < 60) return "low";
  if (confidence >= 80) return "high";
  return "medium";
}

function classifyEngagement(asset: DemoAsset): RuleEvaluation {
  const triggeredConditions: string[] = [];
  const failedConditions: string[] = [];
  const changingConflict = scenarioChangingConflict(asset);

  if (asset.criticalBlocker) triggeredConditions.push("Есть критический blocker");
  if (asset.missingInputs.length > 0) triggeredConditions.push("Отсутствует обязательный input");
  if (changingConflict) triggeredConditions.push("Неразрешённый конфликт способен изменить сценарий вовлечения");

  if (triggeredConditions.length > 0) {
    return {
      group: "expert_review_only",
      triggeredConditions,
      failedConditions,
      missingInputs: [...asset.missingInputs],
      blockers: [...asset.blockers],
      confidence: confidenceFromData(asset, true)
    };
  }

  const startChecks = [
    [atLeast(axisValue(asset, "actionReadiness"), 70), "Готовность к действию ≥ 70"],
    [atLeast(axisValue(asset, "marketDemand"), 60), "Рыночный спрос ≥ 60"],
    [atLeast(axisValue(asset, "useUpliftPotential"), 60), "Потенциал повышения использования ≥ 60"],
    [below(axisValue(asset, "constraintSeverity"), 60), "Тяжесть ограничений < 60"],
    [atLeast(axisValue(asset, "dataConfidence"), 60), "Достоверность данных ≥ 60"],
    [!asset.criticalBlocker, "Нет критического blocker"],
    [asset.conflicts.length === 0, "Нет неразрешённого конфликта"]
  ] as const;
  for (const [passed, label] of startChecks) {
    (passed ? triggeredConditions : failedConditions).push(label);
  }
  if (startChecks.every(([passed]) => passed)) {
    return {
      group: "start_preliminary_work",
      triggeredConditions,
      failedConditions,
      missingInputs: [],
      blockers: [],
      confidence: confidenceFromData(asset)
    };
  }

  const promisingSignal =
    atLeast(axisValue(asset, "marketDemand"), 55) || atLeast(axisValue(asset, "useUpliftPotential"), 60);
  const checkRequired =
    asset.nonCriticalIncomplete ||
    (axisValue(asset, "dataConfidence") !== null && (axisValue(asset, "dataConfidence") as number) < 60) ||
    nonScenarioChangingConflict(asset);
  (promisingSignal ? triggeredConditions : failedConditions).push("Спрос ≥ 55 или потенциал повышения использования ≥ 60");
  (checkRequired ? triggeredConditions : failedConditions).push(
    "Есть неполные некритичные данные, низкая достоверность или конфликт, не меняющий сценарий"
  );

  return {
    group: promisingSignal && checkRequired ? "promising_after_check" : "not_in_preliminary_selection",
    triggeredConditions,
    failedConditions,
    missingInputs: [],
    blockers: [...asset.blockers],
    confidence: confidenceFromData(asset, checkRequired)
  };
}

function classifyRegistryQuality(asset: DemoAsset): RuleEvaluation {
  const triggeredConditions: string[] = [];
  const failedConditions: string[] = [];
  const missingInputs = [...asset.missingInputs];
  const blockers = [...asset.blockers];
  const changingConflict = scenarioChangingConflict(asset);
  const incomplete = asset.verificationStatus === "incomplete" || asset.nonCriticalIncomplete;

  if (asset.criticalBlocker) blockers.push("Критический blocker исключает автоматическую интерпретацию реестровой записи");
  if (changingConflict) blockers.push("Сценарно значимый конфликт реестровых наблюдений не разрешён");
  if (asset.criticalBlocker) triggeredConditions.push("Есть критический blocker реестровой проверки");
  if (changingConflict) triggeredConditions.push("Обнаружен сценарно значимый конфликт реестровых наблюдений");
  if (missingInputs.length > 0) triggeredConditions.push("Не заполнены обязательные поля реестровой проверки");

  if (asset.criticalBlocker || changingConflict || missingInputs.length > 0) {
    return {
      group: "expert_review_only",
      triggeredConditions,
      failedConditions,
      missingInputs,
      blockers: [...new Set(blockers)],
      confidence: confidenceFromData(asset, true)
    };
  }

  if (incomplete || below(axisValue(asset, "dataConfidence"), 60)) {
    triggeredConditions.push("Есть неполнота записи или достоверность ниже 60");
    failedConditions.push("Полнота и достоверность записи пока не подтверждены");
    return {
      group: "promising_after_check",
      triggeredConditions,
      failedConditions,
      missingInputs: incomplete ? ["Подтверждающие сведения о полноте реестровой записи"] : [],
      blockers: [...new Set(blockers)],
      confidence: "low"
    };
  }

  triggeredConditions.push("Явные конфликты и обязательные пропуски в synthetic записи не выявлены");
  failedConditions.push("Нет основания приоритизировать сверку записи в текущем демонстрационном срезе");
  return {
    group: "not_in_preliminary_selection",
    triggeredConditions,
    failedConditions,
    missingInputs: [],
    blockers: [],
    confidence: confidenceFromData(asset)
  };
}

function classifyNonUse(asset: DemoAsset): RuleEvaluation {
  const triggeredConditions: string[] = [];
  const failedConditions: string[] = [];
  const missingInputs: string[] = [];
  const blockers = [...asset.blockers];
  const uplift = axisValue(asset, "useUpliftPotential");
  const dataConfidence = axisValue(asset, "dataConfidence");

  if (asset.useStatus === "unknown") missingInputs.push("Подтверждение фактического использования");
  if (uplift === null) missingInputs.push("Потенциал повышения использования");
  if (asset.criticalBlocker) blockers.push("Критический blocker не позволяет рекомендовать действие по признаку неиспользования");

  if (asset.criticalBlocker || missingInputs.length > 0 || scenarioChangingConflict(asset)) {
    if (asset.criticalBlocker) triggeredConditions.push("Есть критический blocker сценария неиспользования");
    if (missingInputs.length > 0) triggeredConditions.push("Не подтверждено фактическое использование или потенциал");
    if (scenarioChangingConflict(asset)) triggeredConditions.push("Конфликт наблюдений меняет вывод о фактическом использовании");
    return {
      group: "expert_review_only",
      triggeredConditions,
      failedConditions,
      missingInputs,
      blockers: [...new Set(blockers)],
      confidence: confidenceFromData(asset, true)
    };
  }

  const strongSignal = asset.useStatus === "unused" && atLeast(uplift, 60) && atLeast(dataConfidence, 60);
  const checkSignal =
    (asset.useStatus === "unused" || asset.useStatus === "underused") &&
    atLeast(uplift, 60) &&
    (asset.nonCriticalIncomplete || below(dataConfidence, 60) || asset.useStatus === "underused");
  (asset.useStatus === "unused" ? triggeredConditions : failedConditions).push("Synthetic статус: объект не используется");
  (atLeast(uplift, 60) ? triggeredConditions : failedConditions).push("Потенциал повышения использования ≥ 60");
  (atLeast(dataConfidence, 60) ? triggeredConditions : failedConditions).push("Достоверность данных ≥ 60");

  return {
    group: strongSignal ? "start_preliminary_work" : checkSignal ? "promising_after_check" : "not_in_preliminary_selection",
    triggeredConditions,
    failedConditions,
    missingInputs,
    blockers: [...new Set(blockers)],
    confidence: confidenceFromData(asset, checkSignal)
  };
}

function classifyMonitoring(asset: DemoAsset): RuleEvaluation {
  const triggeredConditions: string[] = [];
  const failedConditions: string[] = [];
  const missingInputs: string[] = [];
  const blockers = [...asset.blockers];
  const risk = axisValue(asset, "monitoringRisk");

  if (risk === null) missingInputs.push("Риск мониторинга");
  if (scenarioChangingConflict(asset)) blockers.push("Конфликт исходных наблюдений требует экспертного определения способа проверки");
  if (asset.criticalBlocker) blockers.push("Критический blocker требует экспертного задания на проверку");

  if (risk === null || scenarioChangingConflict(asset) || asset.criticalBlocker) {
    if (risk === null) triggeredConditions.push("Риск мониторинга неизвестен");
    if (scenarioChangingConflict(asset)) triggeredConditions.push("Конфликт способен изменить приоритет или способ проверки");
    if (asset.criticalBlocker) triggeredConditions.push("Есть критический blocker мониторинга");
    return {
      group: "expert_review_only",
      triggeredConditions,
      failedConditions,
      missingInputs,
      blockers: [...new Set(blockers)],
      confidence: confidenceFromData(asset, true)
    };
  }

  const highPriority = risk >= 65 || asset.freshness === "stale";
  const checkPriority = risk >= 55 || asset.nonCriticalIncomplete;
  (risk >= 65 ? triggeredConditions : failedConditions).push("Риск мониторинга ≥ 65");
  (asset.freshness === "stale" ? triggeredConditions : failedConditions).push("Данные имеют статус stale");
  (asset.nonCriticalIncomplete ? triggeredConditions : failedConditions).push("Есть неполные данные, проверяемые мониторингом");

  return {
    group: highPriority ? "start_preliminary_work" : checkPriority ? "promising_after_check" : "not_in_preliminary_selection",
    triggeredConditions,
    failedConditions,
    missingInputs,
    blockers: [...new Set(blockers)],
    confidence: confidenceFromData(asset, asset.freshness === "stale" || asset.nonCriticalIncomplete)
  };
}

const RULE_SETS: Record<CapabilityScenarioId, (asset: DemoAsset) => RuleEvaluation> = {
  registry_quality: classifyRegistryQuality,
  non_use: classifyNonUse,
  engagement: classifyEngagement,
  monitoring: classifyMonitoring
};

function observationId(asset: DemoAsset, suffix: string): string {
  const observation = asset.observations.find((candidate) => candidate.id.endsWith(suffix));
  if (!observation) throw new Error(`Missing observation ${suffix} for ${asset.id}`);
  return observation.id;
}

function inputRefsFor(asset: DemoAsset, scenario: CapabilityScenarioId): string[] {
  const byScenario: Record<CapabilityScenarioId, string[]> = {
    registry_quality: [
      observationId(asset, "fixture-profile"),
      observationId(asset, "use"),
      observationId(asset, "constraint"),
      ...asset.axes.dataConfidence.inputRefs,
      ...asset.conflicts.flatMap((conflict) => conflict.versions.map((version) => version.sourceRef))
    ],
    non_use: [
      observationId(asset, "use"),
      observationId(asset, "area"),
      ...asset.axes.useUpliftPotential.inputRefs,
      ...asset.axes.dataConfidence.inputRefs
    ],
    engagement: [
      observationId(asset, "use"),
      ...asset.axes.actionReadiness.inputRefs,
      ...asset.axes.marketDemand.inputRefs,
      ...asset.axes.useUpliftPotential.inputRefs,
      ...asset.axes.constraintSeverity.inputRefs,
      ...asset.axes.dataConfidence.inputRefs
    ],
    monitoring: [
      observationId(asset, "fixture-profile"),
      ...asset.axes.monitoringRisk.inputRefs,
      ...asset.axes.dataConfidence.inputRefs,
      ...asset.conflicts.flatMap((conflict) => conflict.versions.map((version) => version.sourceRef))
    ]
  };
  return [...new Set(byScenario[scenario])];
}

function primaryHypothesis(asset: DemoAsset, scenario: CapabilityScenarioId, evaluation: RuleEvaluation): string {
  if (scenario === "registry_quality") {
    if (evaluation.group === "expert_review_only") return "Запись содержит конфликт или обязательный пропуск, требующий экспертной сверки.";
    if (evaluation.group === "promising_after_check") return "Есть проверяемая гипотеза неполноты реестровой записи.";
    return "Приоритетная проблема качества записи в synthetic срезе не выявлена; официальное подтверждение всё равно требуется.";
  }
  if (scenario === "non_use") {
    if (evaluation.group === "expert_review_only") return "Недостаточно согласованных наблюдений для вывода о фактическом использовании.";
    if (evaluation.group === "start_preliminary_work") return "Synthetic признаки допускают предварительную гипотезу неиспользования и потенциала вовлечения.";
    if (evaluation.group === "promising_after_check") return "Есть признаки неполного использования, которые требуют отдельной проверки.";
    return "Synthetic признаки не подтверждают приоритетную гипотезу неиспользования.";
  }
  if (scenario === "monitoring") {
    if (evaluation.group === "expert_review_only") return "Способ и приоритет проверки нельзя определить без экспертного разрешения конфликта или пропуска.";
    if (evaluation.group === "start_preliminary_work") return "Риск, stale-статус или оба признака формируют гипотезу приоритетной проверки.";
    if (evaluation.group === "promising_after_check") return "Неполнота или умеренный риск обосновывают документарную проверку до решения о выезде.";
    return "Synthetic риск не формирует приоритет мониторинга в текущем срезе.";
  }
  if (evaluation.group === "expert_review_only") return "Недостаточно подтверждений для сценарного вывода; требуется экспертная проверка исходных сведений.";
  if (evaluation.group === "start_preliminary_work") return "Объект соответствует раскрытым условиям начала предварительной проработки вовлечения.";
  if (evaluation.group === "promising_after_check") return "Объект может быть перспективен после указанной проверки неполных или низкодостоверных данных.";
  return "Объект не входит в текущую предварительную выборку по раскрытым правилам.";
}

function alternativeHypothesis(scenario: CapabilityScenarioId): string {
  const alternatives: Record<CapabilityScenarioId, string> = {
    registry_quality: "Альтернатива: расхождение вызвано периодом обновления synthetic записи, а не дефектом исходного реестра.",
    non_use: "Альтернатива: объект используется, но synthetic наблюдение не отражает временную или частичную эксплуатацию.",
    engagement: "Альтернатива: synthetic inputs не отражают фактический спрос или ограничения, поэтому вовлечение преждевременно.",
    monitoring: "Альтернатива: повышенный synthetic риск объясняется устареванием данных и снимается документарной проверкой без выезда."
  };
  return alternatives[scenario];
}

function actionFor(scenario: CapabilityScenarioId, evaluation: RuleEvaluation): Pick<
  ScenarioAssessment,
  "nextAction" | "actionType" | "ownerRole" | "dueInBusinessDays"
> {
  if (evaluation.group === "expert_review_only") {
    const expertActions: Record<CapabilityScenarioId, Pick<ScenarioAssessment, "nextAction" | "actionType" | "ownerRole" | "dueInBusinessDays">> = {
      registry_quality: {
        nextAction: "Передать конфликтующие или неполные поля на реестровую и правовую сверку.",
        actionType: "registry_expert_verification",
        ownerRole: "Реестровый / правовой эксперт",
        dueInBusinessDays: 5
      },
      non_use: {
        nextAction: "Запросить подтверждение фактического использования до вывода о неиспользовании.",
        actionType: "use_status_verification",
        ownerRole: "Куратор объекта / портфеля",
        dueInBusinessDays: 5
      },
      engagement: {
        nextAction: "Передать исходные сведения на экспертную проверку и запросить подтверждение.",
        actionType: "engagement_expert_verification",
        ownerRole: "Реестровый / правовой эксперт",
        dueInBusinessDays: 5
      },
      monitoring: {
        nextAction: "Согласовать предмет и безопасный способ проверки до назначения мониторинга или выезда.",
        actionType: "monitoring_scope_verification",
        ownerRole: "Инспектор / мониторинг",
        dueInBusinessDays: 5
      }
    };
    return expertActions[scenario];
  }

  if (scenario === "registry_quality") {
    return {
      nextAction: evaluation.group === "promising_after_check"
        ? "Запросить подтверждающие сведения по неполным полям реестровой записи."
        : "Оставить запись в контрольном портфеле до следующего подтверждённого обновления.",
      actionType: evaluation.group === "promising_after_check" ? "registry_confirmation" : "registry_watch",
      ownerRole: "Реестровый / правовой эксперт",
      dueInBusinessDays: evaluation.group === "promising_after_check" ? 7 : 20
    };
  }
  if (scenario === "non_use") {
    return {
      nextAction: evaluation.group === "start_preliminary_work"
        ? "Проверить фактическое использование и документировать основание для предварительной проработки."
        : evaluation.group === "promising_after_check"
          ? "Уточнить режим и интенсивность использования объекта."
          : "Пересмотреть гипотезу при появлении новых наблюдений об использовании.",
      actionType: evaluation.group === "start_preliminary_work" ? "non_use_confirmation" : "use_status_review",
      ownerRole: "Куратор объекта / портфеля",
      dueInBusinessDays: evaluation.group === "not_in_preliminary_selection" ? 20 : 7
    };
  }
  if (scenario === "monitoring") {
    return {
      nextAction: evaluation.group === "start_preliminary_work"
        ? "Назначить приоритетную документарную проверку и определить необходимость выезда."
        : evaluation.group === "promising_after_check"
          ? "Обновить наблюдения и повторно оценить необходимость выезда."
          : "Оставить объект в плановом мониторинге без приоритетного выезда.",
      actionType: evaluation.group === "start_preliminary_work" ? "priority_monitoring" : "monitoring_review",
      ownerRole: "Инспектор / мониторинг",
      dueInBusinessDays: evaluation.group === "start_preliminary_work" ? 5 : 15
    };
  }
  if (evaluation.group === "start_preliminary_work") {
    return {
      nextAction: "Подготовить карточку предварительной проработки и перечень официальных подтверждений.",
      actionType: "preliminary_engagement",
      ownerRole: "Эксперт по реализации / оценке",
      dueInBusinessDays: 10
    };
  }
  if (evaluation.group === "promising_after_check") {
    return {
      nextAction: "Проверить отмеченные неполные данные до начала предварительной проработки.",
      actionType: "engagement_data_confirmation",
      ownerRole: "Куратор объекта / портфеля",
      dueInBusinessDays: 7
    };
  }
  return {
    nextAction: "Оставить объект в портфеле и пересмотреть при появлении новых подтверждённых сведений.",
    actionType: "engagement_portfolio_review",
    ownerRole: "Куратор объекта / портфеля",
    dueInBusinessDays: 20
  };
}

export function evaluateScenario(
  asset: DemoAsset,
  scenario: CapabilityScenarioId | "any" = "engagement"
): ScenarioAssessment {
  const normalizedScenario: CapabilityScenarioId = scenario === "any" ? "engagement" : scenario;
  const evaluation = RULE_SETS[normalizedScenario](asset);
  return {
    assetId: asset.id,
    group: evaluation.group,
    methodVersion: SCENARIO_METHODS[normalizedScenario],
    ruleVersion: RULE_VERSION,
    inputRefs: inputRefsFor(asset, normalizedScenario),
    provenance: "derived",
    triggeredConditions: evaluation.triggeredConditions,
    failedConditions: evaluation.failedConditions,
    missingInputs: evaluation.missingInputs,
    primaryHypothesis: primaryHypothesis(asset, normalizedScenario, evaluation),
    alternativeHypothesis: alternativeHypothesis(normalizedScenario),
    blockers: evaluation.blockers,
    confidence: evaluation.confidence,
    ...actionFor(normalizedScenario, evaluation)
  };
}

function compareNullableDescending(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

function compareWithinGroup(left: DemoAsset, right: DemoAsset): number {
  return (
    compareNullableDescending(axisValue(left, "actionReadiness"), axisValue(right, "actionReadiness")) ||
    compareNullableDescending(axisValue(left, "useUpliftPotential"), axisValue(right, "useUpliftPotential")) ||
    compareNullableDescending(axisValue(left, "marketDemand"), axisValue(right, "marketDemand")) ||
    left.id.localeCompare(right.id)
  );
}

function derivedReceipt(assessment: ScenarioAssessment): DerivedReceipt {
  return {
    methodVersion: assessment.methodVersion,
    ruleVersion: RULE_VERSION,
    inputRefs: [...assessment.inputRefs],
    confidence: assessment.confidence,
    provenance: "derived"
  };
}

export function evaluateMainQuery(): MainQueryResult {
  const assessed = DEMO_ASSETS.map((asset) => ({ asset, assessment: evaluateScenario(asset, "engagement") }));
  const grouped = Object.fromEntries(
    GROUP_ORDER.map((group) => [
      group,
      assessed.filter((entry) => entry.assessment.group === group).sort((left, right) => compareWithinGroup(left.asset, right.asset))
    ])
  ) as Record<ScenarioGroup, typeof assessed>;
  const ordered = ["start_preliminary_work", "promising_after_check"].flatMap((group) =>
    grouped[group as ScenarioGroup].map((entry) => ({ ...entry, receipt: derivedReceipt(entry.assessment) }))
  );

  return {
    ordered,
    selectedIds: ordered.map((entry) => entry.asset.id),
    groupCounts: Object.fromEntries(GROUP_ORDER.map((group) => [group, grouped[group].length])) as Record<ScenarioGroup, number>
  };
}
