import type { PointObjectFindGroup } from "./point-to-object-find-contract";
import type { PointObjectLocale } from "./point-to-object-markets";
import type { ExploreScenarioId } from "../explore/types";

export type PointObjectFindCapability = {
  status: "supported" | "partial" | "unsupported";
  defaultGroup: PointObjectFindGroup;
  allowedGroups: readonly PointObjectFindGroup[];
  mappedLevelsPreset: { minimum: number | null; maximum: number | null };
  limitation: Record<PointObjectLocale, string>;
};

const NO_LEVELS_PRESET = { minimum: null, maximum: null } as const;

const ALL_GROUPS = [
  "residential",
  "commercial_office",
  "hospitality",
  "retail",
  "education",
  "healthcare",
  "civic_culture",
  "industrial_logistics",
  "construction"
] as const satisfies readonly PointObjectFindGroup[];

export const POINT_OBJECT_FIND_CAPABILITIES: Record<ExploreScenarioId, PointObjectFindCapability> = {
  b2c_point_context: {
    status: "supported", defaultGroup: "retail", allowedGroups: ALL_GROUPS, mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "Search matches mapped object groups in this view. It does not assess quality, availability, price or personal suitability.",
      ru: "Поиск сопоставляет отмеченные на карте типы объектов в текущей области. Он не оценивает качество, доступность, цену или личную пригодность."
    }
  },
  b2c_tourist_objects_route: {
    status: "partial", defaultGroup: "civic_culture", allowedGroups: ["hospitality", "retail", "civic_culture"], mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "Shows mapped visitor places only; it does not build a route or verify opening hours, popularity, tickets or accessibility.",
      ru: "Показывает только нанесённые туристические места; не строит маршрут и не проверяет часы работы, популярность, билеты или доступность."
    }
  },
  b2c_residential_context: {
    status: "supported", defaultGroup: "residential", allowedGroups: ["residential", "education", "healthcare", "retail"], mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "Shows mapped homes and amenities; it does not verify listings, rent or sale price, school quality, travel time or neighbourhood safety.",
      ru: "Показывает нанесённое жильё и инфраструктуру; не проверяет объявления, цену аренды или покупки, качество школ, время в пути или безопасность района."
    }
  },
  b2c_new_residential_projects: {
    status: "partial", defaultGroup: "construction", allowedGroups: ["construction", "residential"], mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "Construction and residential tags do not prove that a project is new, on sale, permitted, active or available.",
      ru: "Метки строительства и жилья не подтверждают, что проект новый, продаётся, разрешён, активен или доступен."
    }
  },
  b2c_interest_routes: {
    status: "partial", defaultGroup: "civic_culture", allowedGroups: ["civic_culture", "retail", "hospitality"], mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "Shows mapped places of interest only; route order, opening hours, demand and journey feasibility are not calculated.",
      ru: "Показывает только нанесённые места интереса; порядок маршрута, часы работы, спрос и реализуемость поездки не рассчитываются."
    }
  },
  b2b_redevelopment_selected_aoi: {
    status: "partial", defaultGroup: "construction", allowedGroups: ["construction", "industrial_logistics", "residential", "commercial_office"], mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "Mapped use tags cannot establish ownership, vacancy, building condition, zoning, demolition rights or redevelopment potential.",
      ru: "Картографические теги не подтверждают собственность, вакантность, состояние зданий, зонирование, право сноса или потенциал редевелопмента."
    }
  },
  b2b_redevelopment_100ha: {
    status: "unsupported", defaultGroup: "construction", allowedGroups: ["construction"], mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "A 100-hectare development search requires authoritative land parcels, planning controls and infrastructure capacity; OSM tags alone are insufficient, so live search is disabled.",
      ru: "Поиск площадки на 100 га требует официальных земельных участков, градостроительных регламентов и данных о мощности инфраструктуры; одних тегов OSM недостаточно, поэтому live-поиск отключён."
    }
  },
  b2b_lowrise_luxury_residential: {
    status: "partial", defaultGroup: "residential", allowedGroups: ["residential"], mappedLevelsPreset: { minimum: null, maximum: 4 },
    limitation: {
      en: "Mapped residential buildings and explicit levels do not establish luxury class, market price, condition, plot rights or low-rise development suitability.",
      ru: "Жилые здания и явно указанная этажность не подтверждают премиальный класс, рыночную цену, состояние, права на участок или пригодность для малоэтажного проекта."
    }
  },
  b2b_hotel_development: {
    status: "partial", defaultGroup: "hospitality", allowedGroups: ["hospitality", "retail", "civic_culture"], mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "Existing mapped hospitality context does not establish hotel demand, development rights, capacity, competition quality or financial feasibility.",
      ru: "Существующий гостиничный контекст на карте не подтверждает спрос, права застройки, вместимость, качество конкурентов или финансовую реализуемость."
    }
  },
  b2b_commercial_real_estate: {
    status: "partial", defaultGroup: "commercial_office", allowedGroups: ["commercial_office", "retail", "hospitality"], mappedLevelsPreset: NO_LEVELS_PRESET,
    limitation: {
      en: "Mapped commercial uses do not establish vacancy, rents, transactions, tenant quality, planning compliance or investment performance.",
      ru: "Коммерческое назначение на карте не подтверждает вакантность, ставки, сделки, качество арендаторов, градостроительное соответствие или инвестиционные показатели."
    }
  }
};

export function pointObjectFindCapability(scenarioId: ExploreScenarioId): PointObjectFindCapability {
  return POINT_OBJECT_FIND_CAPABILITIES[scenarioId];
}
