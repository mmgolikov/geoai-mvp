export type CapabilityScenarioId = "registry_quality" | "non_use" | "engagement" | "monitoring";

export interface CapabilityScenario {
  id: CapabilityScenarioId;
  label: string;
  status: "modelled_in_prototype_v1";
  purpose: string;
}

export type FutureCapabilityScenarioId =
  | "public_social_transfer"
  | "redevelopment"
  | "construction_obligations"
  | "maintenance_capex"
  | "property_lot";

export interface FutureCapabilityScenario {
  id: FutureCapabilityScenarioId;
  label: string;
  status: "not_modelled_in_prototype_v1";
  statusLabel: "Не моделируется в prototype v1";
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

export const FUTURE_CAPABILITY_SCENARIOS: FutureCapabilityScenario[] = [
  {
    id: "public_social_transfer",
    label: "Передача для публичной или социальной функции",
    status: "not_modelled_in_prototype_v1",
    statusLabel: "Не моделируется в prototype v1",
    purpose: "Потребность территории, доступность и ограничения."
  },
  {
    id: "redevelopment",
    label: "Редевелопмент / предпроектная проработка",
    status: "not_modelled_in_prototype_v1",
    statusLabel: "Не моделируется в prototype v1",
    purpose: "Потенциал территории и список обязательных проверок."
  },
  {
    id: "construction_obligations",
    label: "Контроль стройки и договорных обязательств",
    status: "not_modelled_in_prototype_v1",
    statusLabel: "Не моделируется в prototype v1",
    purpose: "Изменение контура, этапность, просрочки и сигнал инспектору."
  },
  {
    id: "maintenance_capex",
    label: "Управление содержанием и CAPEX",
    status: "not_modelled_in_prototype_v1",
    statusLabel: "Не моделируется в prototype v1",
    purpose: "Критичность, нагрузка и плановый следующий шаг."
  },
  {
    id: "property_lot",
    label: "Формирование имущественного лота",
    status: "not_modelled_in_prototype_v1",
    statusLabel: "Не моделируется в prototype v1",
    purpose: "Связанные участки и ОКС, а также блокирующие факторы объединения."
  }
];
