export type CapabilityScenarioId = "registry_quality" | "non_use" | "engagement" | "monitoring";

export interface CapabilityScenario {
  id: CapabilityScenarioId;
  label: string;
  status: "modelled_in_prototype_v1";
  purpose: string;
}

export const CAPABILITY_SCENARIOS: CapabilityScenario[] = [
  {
    id: "registry_quality",
    label: "Качество и сверка реестровой записи",
    status: "modelled_in_prototype_v1",
    purpose: "Выявить пропуски и противоречия, которые требуют подтверждения уполномоченной стороной."
  },
  {
    id: "non_use",
    label: "Признаки неиспользования",
    status: "modelled_in_prototype_v1",
    purpose: "Сформировать проверяемую гипотезу о неиспользовании без юридического вывода."
  },
  {
    id: "engagement",
    label: "Предварительная проработка вовлечения",
    status: "modelled_in_prototype_v1",
    purpose: "Сгруппировать объекты для предварительной проработки по раскрытым правилам."
  },
  {
    id: "monitoring",
    label: "Приоритет мониторинга или выезда",
    status: "modelled_in_prototype_v1",
    purpose: "Определить следующий шаг проверки по риску, свежести и конфликтам."
  }
];
