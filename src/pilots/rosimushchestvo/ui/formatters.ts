import type {
  AssetArchetype,
  AssetUseStatus,
  ConfidenceLevel,
  FreshnessStatus,
  ScenarioGroup,
  SourceAccessStatus,
  VerificationStatus
} from "../domain";

export const archetypeLabels: Record<AssetArchetype, string> = {
  administrative_building: "Административное здание",
  warehouse: "Склад",
  land_plot: "Земельный участок",
  unfinished_construction: "Объект незавершённого строительства",
  cultural_heritage: "Объект культурного наследия",
  social_facility: "Социальный объект",
  industrial_site: "Производственная площадка",
  built_in_premises: "Встроенное помещение",
  mixed_property_complex: "Имущественный комплекс"
};

export const useStatusLabels: Record<AssetUseStatus, string> = {
  unused: "Не используется",
  underused: "Используется не полностью",
  used: "Используется",
  unknown: "Нет подтверждённых данных"
};

export const verificationLabels: Record<VerificationStatus, string> = {
  unverified_demo: "Демонстрационные данные",
  incomplete: "Данные неполные",
  conflicting: "Обнаружено противоречие",
  not_applicable: "Не применимо"
};

export const freshnessLabels: Record<FreshnessStatus, string> = {
  current_for_demo: "Актуально для демонстрации",
  stale: "Требует актуализации",
  unknown: "Свежесть неизвестна"
};

export const confidenceLabels: Record<ConfidenceLevel, string> = {
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
  unknown: "Не определена"
};

export const scenarioGroupLabels: Record<ScenarioGroup, string> = {
  expert_review_only: "Только экспертная проверка",
  start_preliminary_work: "Можно начинать предварительную проработку",
  promising_after_check: "Перспективно после проверки",
  not_in_preliminary_selection: "Не входит в предварительную выборку"
};

export const accessStatusLabels: Record<SourceAccessStatus, string> = {
  fixture_only: "Только демонстрационный набор",
  official_open: "Открытый источник",
  permission_required: "Требуется подтверждение доступа",
  licensed_aggregated_required: "Требуется лицензированный агрегированный доступ",
  licensed_snapshot_required: "Требуется лицензированный снимок",
  unavailable: "Недоступно"
};

export function formatMetric(value: number | null, suffix = ""): string {
  if (value === null) return "Нет подтверждённых данных";
  return `${new Intl.NumberFormat("ru-RU").format(value)}${suffix}`;
}

export function axisTone(value: number | null, negative = false): "positive" | "medium" | "negative" | "unknown" {
  if (value === null) return "unknown";
  const normalized = negative ? 100 - value : value;
  if (normalized >= 70) return "positive";
  if (normalized >= 45) return "medium";
  return "negative";
}
