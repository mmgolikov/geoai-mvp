import {
  type CustomQuery,
  type CustomQueryEvaluation,
  type CustomQueryResult,
  type DemoAsset
} from "../domain";
import { DEMO_ASSETS } from "../data";

type CriterionState = "pass" | "fail" | "unknown";

function validateFinite(
  value: number | null,
  label: string,
  errors: string[],
  min: number,
  minimumError: string,
  max?: number
): void {
  if (value === null) return;
  if (!Number.isFinite(value)) {
    errors.push(`${label}: укажите конечное число.`);
    return;
  }
  if (value < min) errors.push(minimumError);
  if (max !== undefined && value > max) errors.push(`${label}: значение не может быть больше ${max}.`);
}

export function validateCustomQuery(query: CustomQuery): string[] {
  const errors: string[] = [];
  if (!["any", "unused", "underused", "used", "unknown"].includes(query.useStatus)) {
    errors.push("Некорректный статус использования.");
  }
  if (!["any", "exclude_confirmed_present", "absent", "present", "unknown"].includes(query.criticalConstraint)) {
    errors.push("Некорректное условие критического ограничения.");
  }
  if (!["any", "engagement", "monitoring", "registry_quality", "non_use"].includes(query.scenario)) {
    errors.push("Некорректный сценарий.");
  }
  if (!["separate_for_confirmation", "exclude"].includes(query.unknownPolicy)) {
    errors.push("Некорректная политика неизвестных значений.");
  }
  validateFinite(query.minimumAreaSquareMeters, "Минимальная площадь", errors, 0, "Площадь не может быть отрицательной.");
  validateFinite(query.maximumAreaSquareMeters, "Максимальная площадь", errors, 0, "Площадь не может быть отрицательной.");
  validateFinite(query.maximumMetroWalkMinutes, "Время до метро", errors, 0, "Время до метро не может быть отрицательным.");
  validateFinite(
    query.minimumDataConfidence,
    "Минимальная достоверность",
    errors,
    0,
    "Достоверность не может быть отрицательной.",
    100
  );
  if (
    query.minimumAreaSquareMeters !== null &&
    query.maximumAreaSquareMeters !== null &&
    query.minimumAreaSquareMeters > query.maximumAreaSquareMeters
  ) {
    errors.push("Минимальная площадь не может быть больше максимальной.");
  }
  return errors;
}

function compareMinimum(value: number | null, minimum: number | null): CriterionState {
  if (minimum === null) return "pass";
  if (value === null) return "unknown";
  return value >= minimum ? "pass" : "fail";
}

function compareMaximum(value: number | null, maximum: number | null): CriterionState {
  if (maximum === null) return "pass";
  if (value === null) return "unknown";
  return value <= maximum ? "pass" : "fail";
}

function criticalConstraintState(asset: DemoAsset, query: CustomQuery): CriterionState {
  const requested = query.criticalConstraint;
  if (requested === "any") return "pass";
  if (requested === "exclude_confirmed_present") {
    if (asset.criticalConstraint === "unknown") return "unknown";
    return asset.criticalConstraint === "present" ? "fail" : "pass";
  }
  return asset.criticalConstraint === requested ? "pass" : "fail";
}

function scenarioState(asset: DemoAsset, query: CustomQuery): CriterionState {
  if (query.scenario === "any" || query.scenario === "engagement") return "pass";
  if (query.scenario === "registry_quality") {
    return asset.verificationStatus === "conflicting" || asset.verificationStatus === "incomplete" || asset.missingInputs.length > 0
      ? "pass"
      : "fail";
  }
  if (query.scenario === "non_use") {
    if (asset.useStatus === "unknown") return "unknown";
    return asset.useStatus === "unused" || asset.useStatus === "underused" ? "pass" : "fail";
  }
  const monitoringRisk = asset.axes.monitoringRisk.value;
  if (monitoringRisk === null) return "unknown";
  return monitoringRisk >= 55 || asset.freshness === "stale" || asset.conflicts.length > 0 || asset.criticalBlocker
    ? "pass"
    : "fail";
}

function evaluateAsset(asset: DemoAsset, query: CustomQuery): CustomQueryEvaluation {
  const criteria: Array<{ state: CriterionState; pass: string; fail: string; unknown: string }> = [];

  criteria.push({
    state:
      query.useStatus === "any"
        ? "pass"
        : query.useStatus === "unknown"
          ? asset.useStatus === "unknown" ? "pass" : "fail"
          : asset.useStatus === "unknown"
            ? "unknown"
            : asset.useStatus === query.useStatus ? "pass" : "fail",
    pass: "Статус использования соответствует условию",
    fail: "Статус использования не соответствует условию",
    unknown: "Статус использования требует подтверждения"
  });
  criteria.push({
    state: compareMinimum(asset.areaSquareMeters, query.minimumAreaSquareMeters),
    pass: "Минимальная площадь соблюдена",
    fail: "Площадь меньше заданного минимума",
    unknown: "Площадь неизвестна"
  });
  criteria.push({
    state: compareMaximum(asset.areaSquareMeters, query.maximumAreaSquareMeters),
    pass: "Максимальная площадь соблюдена",
    fail: "Площадь больше заданного максимума",
    unknown: "Площадь неизвестна"
  });
  criteria.push({
    state: compareMaximum(asset.metroWalkMinutes, query.maximumMetroWalkMinutes),
    pass: "Синтетическое время до метро соответствует условию",
    fail: "Синтетическое время до метро больше заданного",
    unknown: "Синтетическое время до метро неизвестно"
  });
  criteria.push({
    state: criticalConstraintState(asset, query),
    pass: query.criticalConstraint === "unknown"
      ? "Выбраны объекты с неизвестным статусом критического ограничения"
      : query.criticalConstraint === "present"
        ? "Подтверждённое synthetic наличие критического ограничения соответствует условию"
        : "Статус критического ограничения соответствует условию",
    fail: "Статус критического ограничения не соответствует условию",
    unknown: "Наличие критического ограничения неизвестно и требует проверки"
  });
  criteria.push({
    state: compareMinimum(asset.axes.dataConfidence.value, query.minimumDataConfidence),
    pass: "Достоверность соответствует условию",
    fail: "Достоверность ниже заданного минимума",
    unknown: "Достоверность неизвестна"
  });
  criteria.push({
    state: scenarioState(asset, query),
    pass: "Объект соответствует правилам выбранного сценария",
    fail: "Объект не соответствует правилам выбранного сценария",
    unknown: "Для выбранного сценария недостаточно данных"
  });

  const failures = criteria.filter((criterion) => criterion.state === "fail");
  const unknowns = criteria.filter((criterion) => criterion.state === "unknown");
  if (failures.length > 0) {
    return { asset, group: "does_not_match", reasons: failures.map((criterion) => criterion.fail) };
  }
  if (unknowns.length > 0) {
    return {
      asset,
      group: query.unknownPolicy === "separate_for_confirmation" ? "requires_confirmation" : "does_not_match",
      reasons:
        query.unknownPolicy === "separate_for_confirmation"
          ? unknowns.map((criterion) => criterion.unknown)
          : unknowns.map((criterion) => `${criterion.unknown}; unknown policy исключает объект`)
    };
  }
  return { asset, group: "matches", reasons: criteria.map((criterion) => criterion.pass) };
}

export function evaluateCustomQuery(query: CustomQuery): CustomQueryResult {
  const validationErrors = validateCustomQuery(query);
  if (validationErrors.length > 0) {
    throw new RangeError(validationErrors.join(" "));
  }
  const evaluations = DEMO_ASSETS.map((asset) => evaluateAsset(asset, query));
  return {
    query: { ...query },
    groups: {
      matches: evaluations.filter((evaluation) => evaluation.group === "matches"),
      requires_confirmation: evaluations.filter((evaluation) => evaluation.group === "requires_confirmation"),
      does_not_match: evaluations.filter((evaluation) => evaluation.group === "does_not_match")
    }
  };
}
