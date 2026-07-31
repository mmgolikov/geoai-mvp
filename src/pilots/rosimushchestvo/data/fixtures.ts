import {
  DATASET_SEED,
  DATASET_VERSION,
  DECISION_AXIS_KEYS,
  GENERATOR_VERSION,
  type AssetArchetype,
  type AssetObservation,
  type AssetUseStatus,
  type ConfidenceLevel,
  type DecisionAxis,
  type DecisionAxisKey,
  type DemoAsset,
  type FreshnessStatus,
  type TriState,
  type VerificationStatus
} from "../domain";

export { DATASET_SEED, DATASET_VERSION, GENERATOR_VERSION };

const ARCHETYPES: AssetArchetype[] = [
  "administrative_building",
  "warehouse",
  "land_plot",
  "unfinished_construction",
  "cultural_heritage",
  "social_facility",
  "industrial_site",
  "built_in_premises",
  "mixed_property_complex"
];

const ARCHETYPE_TITLES: Record<AssetArchetype, string> = {
  administrative_building: "административный объект",
  warehouse: "складской объект",
  land_plot: "земельный участок",
  unfinished_construction: "объект незавершённого строительства",
  cultural_heritage: "объект с признаками историко-культурного контекста",
  social_facility: "объект социальной инфраструктуры",
  industrial_site: "производственная площадка",
  built_in_premises: "встроенное помещение",
  mixed_property_complex: "имущественный комплекс"
};

const DISTRICTS = [
  { district: "ЦАО", zone: "условная зона ЦАО", longitude: 37.617, latitude: 55.755 },
  { district: "САО", zone: "условная зона САО", longitude: 37.525, latitude: 55.84 },
  { district: "СВАО", zone: "условная зона СВАО", longitude: 37.64, latitude: 55.87 },
  { district: "ВАО", zone: "условная зона ВАО", longitude: 37.76, latitude: 55.79 },
  { district: "ЮВАО", zone: "условная зона ЮВАО", longitude: 37.77, latitude: 55.69 },
  { district: "ЮАО", zone: "условная зона ЮАО", longitude: 37.63, latitude: 55.64 },
  { district: "ЮЗАО", zone: "условная зона ЮЗАО", longitude: 37.48, latitude: 55.66 },
  { district: "ЗАО", zone: "условная зона ЗАО", longitude: 37.43, latitude: 55.73 },
  { district: "СЗАО", zone: "условная зона СЗАО", longitude: 37.42, latitude: 55.82 },
  { district: "ТиНАО", zone: "условная зона ТиНАО", longitude: 37.32, latitude: 55.51 }
] as const;

type AxisValues = Record<DecisionAxisKey, number | null>;

interface FixtureOverride {
  archetype?: AssetArchetype;
  useStatus?: AssetUseStatus;
  areaSquareMeters?: number | null;
  metroWalkMinutes?: number | null;
  criticalConstraint?: TriState;
  verificationStatus?: VerificationStatus;
  freshness?: FreshnessStatus;
  axes?: Partial<AxisValues>;
  conflicts?: DemoAsset["conflicts"];
  blockers?: string[];
  criticalBlocker?: boolean;
  missingInputs?: string[];
  nonCriticalIncomplete?: boolean;
}

const DEFAULT_AXES: AxisValues = {
  actionReadiness: 48,
  marketDemand: 44,
  transportAccessibility: 56,
  useUpliftPotential: 46,
  constraintSeverity: 44,
  monitoringRisk: 42,
  dataConfidence: 72
};

const FIXTURE_OVERRIDES: Record<number, FixtureOverride> = {
  1: {
    archetype: "administrative_building",
    useStatus: "unused",
    areaSquareMeters: 4200,
    metroWalkMinutes: 8,
    criticalConstraint: "absent",
    axes: {
      actionReadiness: 94,
      marketDemand: 88,
      transportAccessibility: 91,
      useUpliftPotential: 92,
      constraintSeverity: 18,
      monitoringRisk: 24,
      dataConfidence: 93
    }
  },
  3: {
    useStatus: "underused",
    areaSquareMeters: 7600,
    metroWalkMinutes: 18,
    criticalConstraint: "absent",
    axes: {
      actionReadiness: 89,
      marketDemand: 76,
      transportAccessibility: 67,
      useUpliftPotential: 82,
      constraintSeverity: 32,
      monitoringRisk: 35,
      dataConfidence: 78
    }
  },
  6: {
    useStatus: "unused",
    areaSquareMeters: 3100,
    metroWalkMinutes: 11,
    criticalConstraint: "absent",
    axes: {
      actionReadiness: 86,
      marketDemand: 82,
      transportAccessibility: 84,
      useUpliftPotential: 87,
      constraintSeverity: 25,
      monitoringRisk: 30,
      dataConfidence: 84
    }
  },
  9: {
    useStatus: "underused",
    areaSquareMeters: 5200,
    metroWalkMinutes: 21,
    criticalConstraint: "absent",
    verificationStatus: "incomplete",
    nonCriticalIncomplete: true,
    axes: {
      actionReadiness: 69,
      marketDemand: 64,
      transportAccessibility: 58,
      useUpliftPotential: 68,
      constraintSeverity: 39,
      monitoringRisk: 48,
      dataConfidence: 58
    }
  },
  12: {
    useStatus: "unused",
    areaSquareMeters: 12800,
    metroWalkMinutes: 14,
    criticalConstraint: "absent",
    axes: {
      actionReadiness: 81,
      marketDemand: 73,
      transportAccessibility: 71,
      useUpliftPotential: 79,
      constraintSeverity: 43,
      monitoringRisk: 41,
      dataConfidence: 72
    }
  },
  14: {
    useStatus: "unknown",
    areaSquareMeters: 2500,
    metroWalkMinutes: 12,
    criticalConstraint: "unknown",
    verificationStatus: "conflicting",
    axes: {
      actionReadiness: 66,
      marketDemand: 70,
      transportAccessibility: 78,
      useUpliftPotential: 72,
      constraintSeverity: null,
      monitoringRisk: 63,
      dataConfidence: 49
    },
    conflicts: [
      {
        id: "conflict-014-use",
        label: "Фактическое использование",
        versions: [
          { label: "Версия A", value: "Не используется", sourceRef: "obs-014-use-a" },
          { label: "Версия B", value: "Используется частично", sourceRef: "obs-014-use-b" }
        ],
        scenarioChanging: true,
        resolved: false
      }
    ],
    blockers: ["Требуется подтверждение фактического использования и наличия ограничений"]
  },
  18: {
    useStatus: "used",
    areaSquareMeters: 4600,
    metroWalkMinutes: 17,
    criticalConstraint: "absent",
    verificationStatus: "incomplete",
    freshness: "stale",
    nonCriticalIncomplete: true,
    axes: {
      actionReadiness: 65,
      marketDemand: 61,
      transportAccessibility: 66,
      useUpliftPotential: 62,
      constraintSeverity: 41,
      monitoringRisk: 67,
      dataConfidence: 54
    }
  },
  21: {
    useStatus: "unused",
    areaSquareMeters: 6700,
    metroWalkMinutes: 13,
    criticalConstraint: "absent",
    axes: {
      actionReadiness: 75,
      marketDemand: 67,
      transportAccessibility: 73,
      useUpliftPotential: 71,
      constraintSeverity: 54,
      monitoringRisk: 46,
      dataConfidence: 68
    }
  },
  27: {
    useStatus: "unknown",
    areaSquareMeters: null,
    metroWalkMinutes: null,
    criticalConstraint: "unknown",
    verificationStatus: "incomplete",
    freshness: "unknown",
    axes: {
      actionReadiness: null,
      marketDemand: null,
      transportAccessibility: null,
      useUpliftPotential: null,
      constraintSeverity: null,
      monitoringRisk: null,
      dataConfidence: null
    },
    blockers: ["Недостаточно обязательных исходных данных для расчёта сценария"],
    missingInputs: [
      "Статус фактического использования",
      "Площадь",
      "Транспортная доступность",
      "Критические ограничения",
      "Достоверность данных"
    ]
  },
  33: {
    useStatus: "unused",
    areaSquareMeters: 1850,
    metroWalkMinutes: 9,
    criticalConstraint: "absent",
    verificationStatus: "incomplete",
    nonCriticalIncomplete: true,
    axes: {
      actionReadiness: 61,
      marketDemand: 58,
      transportAccessibility: 85,
      useUpliftPotential: 66,
      constraintSeverity: 37,
      monitoringRisk: 51,
      dataConfidence: 57
    }
  },
  35: {
    useStatus: "unused",
    areaSquareMeters: 9300,
    metroWalkMinutes: 16,
    criticalConstraint: "present",
    axes: {
      actionReadiness: 77,
      marketDemand: 74,
      transportAccessibility: 69,
      useUpliftPotential: 80,
      constraintSeverity: 94,
      monitoringRisk: 82,
      dataConfidence: 76
    },
    blockers: ["Подтверждён критический демонстрационный blocker; требуется экспертная проверка"],
    criticalBlocker: true
  }
};

const AXIS_LABELS: Record<DecisionAxisKey, string> = {
  actionReadiness: "Готовность к действию",
  marketDemand: "Рыночный спрос",
  transportAccessibility: "Транспортная доступность",
  useUpliftPotential: "Потенциал повышения использования",
  constraintSeverity: "Тяжесть ограничений",
  monitoringRisk: "Риск мониторинга",
  dataConfidence: "Достоверность данных"
};

const AXIS_REF_SUFFIXES: Record<DecisionAxisKey, string> = {
  actionReadiness: "action-readiness",
  marketDemand: "market-demand",
  transportAccessibility: "transport-accessibility",
  useUpliftPotential: "use-uplift-potential",
  constraintSeverity: "constraint-severity",
  monitoringRisk: "monitoring-risk",
  dataConfidence: "data-confidence"
};

function axisConfidence(value: number | null): ConfidenceLevel {
  if (value === null) return "unknown";
  if (value >= 80) return "high";
  if (value >= 60) return "medium";
  return "low";
}

function makeObservations(
  index: number,
  asset: Pick<
    DemoAsset,
    "areaSquareMeters" | "metroWalkMinutes" | "useStatus" | "criticalConstraint" | "verificationStatus" | "freshness"
  >,
  axes: AxisValues
): AssetObservation[] {
  const suffix = String(index).padStart(3, "0");
  const base: AssetObservation[] = [
    {
      id: `obs-${suffix}-fixture-profile`,
      label: "Профиль синтетической записи",
      value: `${DATASET_VERSION}/${GENERATOR_VERSION}`,
      provenance: "synthetic",
      verificationStatus: asset.verificationStatus,
      freshness: asset.freshness,
      sourceRef: `fixture:${DATASET_SEED}`,
      observedAtLabel: "Срез демонстрационного набора v1"
    },
    {
      id: `obs-${suffix}-area`,
      label: "Площадь, м²",
      value: asset.areaSquareMeters,
      provenance: "synthetic",
      verificationStatus: asset.areaSquareMeters === null ? "incomplete" : asset.verificationStatus,
      freshness: asset.freshness,
      sourceRef: `fixture:${DATASET_SEED}`,
      observedAtLabel: "Срез демонстрационного набора v1"
    },
    {
      id: `obs-${suffix}-metro`,
      label: "Пешком до метро, мин",
      value: asset.metroWalkMinutes,
      provenance: "synthetic",
      verificationStatus: asset.metroWalkMinutes === null ? "incomplete" : asset.verificationStatus,
      freshness: asset.freshness,
      sourceRef: `fixture:${DATASET_SEED}`,
      observedAtLabel: "Синтетическая метрика; маршрут не рассчитывался"
    },
    {
      id: `obs-${suffix}-use`,
      label: "Статус использования",
      value: asset.useStatus,
      provenance: "synthetic",
      verificationStatus: asset.useStatus === "unknown" ? asset.verificationStatus : asset.verificationStatus,
      freshness: asset.freshness,
      sourceRef: `fixture:${DATASET_SEED}`,
      observedAtLabel: "Срез демонстрационного набора v1"
    },
    {
      id: `obs-${suffix}-constraint`,
      label: "Критическое ограничение",
      value: asset.criticalConstraint,
      provenance: "synthetic",
      verificationStatus: asset.criticalConstraint === "unknown" ? "incomplete" : asset.verificationStatus,
      freshness: asset.freshness,
      sourceRef: `fixture:${DATASET_SEED}`,
      observedAtLabel: "Срез демонстрационного набора v1"
    }
  ];

  if (index === 14) {
    base.push(
      {
        id: "obs-014-use-a",
        label: "Фактическое использование — версия A",
        value: "Не используется",
        provenance: "synthetic",
        verificationStatus: "conflicting",
        freshness: "current_for_demo",
        sourceRef: `fixture:${DATASET_SEED}:version-a`,
        observedAtLabel: "Синтетическая конфликтующая версия"
      },
      {
        id: "obs-014-use-b",
        label: "Фактическое использование — версия B",
        value: "Используется частично",
        provenance: "synthetic",
        verificationStatus: "conflicting",
        freshness: "current_for_demo",
        sourceRef: `fixture:${DATASET_SEED}:version-b`,
        observedAtLabel: "Синтетическая конфликтующая версия"
      }
    );
  }

  for (const key of DECISION_AXIS_KEYS) {
    const value = axes[key];
    base.push({
      id: `obs-${suffix}-axis-${AXIS_REF_SUFFIXES[key]}`,
      label: `Синтетический input оси «${AXIS_LABELS[key]}»`,
      value,
      provenance: "synthetic",
      verificationStatus: value === null ? "incomplete" : asset.verificationStatus,
      freshness: asset.freshness,
      sourceRef: `fixture:${DATASET_SEED}:axis:${AXIS_REF_SUFFIXES[key]}`,
      observedAtLabel: "Детерминированный fixture input; не результат внешней модели"
    });
  }

  return base;
}

function makeAxes(index: number, values: AxisValues, freshness: FreshnessStatus): Record<DecisionAxisKey, DecisionAxis> {
  const suffix = String(index).padStart(3, "0");
  return Object.fromEntries(
    DECISION_AXIS_KEYS.map((key) => {
      const negative = key === "constraintSeverity" || key === "monitoringRisk";
      const value = values[key];
      return [
        key,
        {
          key,
          label: AXIS_LABELS[key],
          value,
          direction: negative ? "higher_is_worse" : "higher_is_better",
          explanation: negative
            ? "Синтетическая ось: 100 — максимальная тяжесть или риск."
            : "Синтетическая ось демонстрационного набора; внешняя модель не вызывалась.",
          inputRefs: [`obs-${suffix}-axis-${AXIS_REF_SUFFIXES[key]}`],
          methodVersion: GENERATOR_VERSION,
          provenance: "synthetic",
          confidence: axisConfidence(value),
          freshness
        } satisfies DecisionAxis
      ];
    })
  ) as Record<DecisionAxisKey, DecisionAxis>;
}

function baseFixtureValues(index: number): FixtureOverride {
  const usedStatuses: AssetUseStatus[] = ["used", "underused", "used", "used"];
  return {
    archetype: ARCHETYPES[(index - 1) % ARCHETYPES.length],
    useStatus: usedStatuses[(index - 1) % usedStatuses.length],
    areaSquareMeters: 520 + ((index * 613) % 8200),
    metroWalkMinutes: 16 + ((index * 7) % 24),
    criticalConstraint: "absent",
    verificationStatus: "unverified_demo",
    freshness: "current_for_demo",
    axes: {
      ...DEFAULT_AXES,
      actionReadiness: 40 + ((index * 3) % 17),
      marketDemand: 35 + ((index * 5) % 18),
      useUpliftPotential: 38 + ((index * 7) % 17)
    },
    conflicts: [],
    blockers: [],
    criticalBlocker: false,
    missingInputs: [],
    nonCriticalIncomplete: false
  };
}

function makeAsset(index: number): DemoAsset {
  const base = baseFixtureValues(index);
  const override = FIXTURE_OVERRIDES[index] ?? {};
  const merged = { ...base, ...override, axes: { ...DEFAULT_AXES, ...base.axes, ...override.axes } };
  const archetype = merged.archetype as AssetArchetype;
  const district = DISTRICTS[(index - 1) % DISTRICTS.length];
  const suffix = String(index).padStart(3, "0");
  const verificationStatus = merged.verificationStatus as VerificationStatus;
  const freshness = merged.freshness as FreshnessStatus;
  const partialAsset = {
    areaSquareMeters: merged.areaSquareMeters ?? null,
    metroWalkMinutes: merged.metroWalkMinutes ?? null,
    useStatus: merged.useStatus as AssetUseStatus,
    criticalConstraint: merged.criticalConstraint as TriState,
    verificationStatus,
    freshness
  };
  const observations = makeObservations(index, partialAsset, merged.axes as AxisValues);

  return {
    id: `DEMO-RF-MSK-${suffix}`,
    demoRegistryReference: `77:DEMO:${suffix}`,
    cadastralNumber: null,
    title: `Условный ${ARCHETYPE_TITLES[archetype]} ${suffix}`,
    archetype,
    district: district.district,
    zoneLabel: district.zone,
    coordinates: [
      Number((district.longitude + ((index % 3) - 1) * 0.006).toFixed(6)),
      Number((district.latitude + ((index % 5) - 2) * 0.004).toFixed(6))
    ],
    ...partialAsset,
    axes: makeAxes(index, merged.axes as AxisValues, freshness),
    observations,
    conflicts: merged.conflicts ?? [],
    blockers: merged.blockers ?? [],
    criticalBlocker: merged.criticalBlocker ?? false,
    missingInputs: merged.missingInputs ?? [],
    nonCriticalIncomplete: merged.nonCriticalIncomplete ?? false
  };
}

export function generateDemoAssets(): DemoAsset[] {
  return Array.from({ length: 42 }, (_, index) => makeAsset(index + 1));
}

export const DEMO_ASSETS: DemoAsset[] = generateDemoAssets();

const ASSET_BY_ID = new Map<DemoAsset["id"], DemoAsset>(DEMO_ASSETS.map((asset) => [asset.id, asset]));

export function getAssetById(id: string): DemoAsset | undefined {
  return ASSET_BY_ID.get(id as DemoAsset["id"]);
}
