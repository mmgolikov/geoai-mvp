import type { PointObjectGeoContext } from "@/components/point-to-object/live-types";

export const POINT_OBJECT_DASHBOARD_VERSION = "ROLE_DECISION_CARDS_V1" as const;
export type DecisionCardId = "district" | "access" | "daily_needs" | "building_context" | "places" | "next_check";
export type DecisionViewId = "development" | "living";
export const decisionViews = {
  development: {
    audience: "b2b", role: "developer", scenario: "site_screening",
    label: { en: "Development context", ru: "Контекст для девелопмента" },
    question: { en: "What is mapped around this site before a detailed review?", ru: "Что известно об окружении до детальной проверки площадки?" },
    cards: ["district", "access", "building_context", "daily_needs", "places", "next_check"],
    groups: ["commercial", "hospitality", "residential", "retail_daily_needs", "construction"],
    next: { en: "Confirm the site boundary, permitted use and access capacity before choosing a programme.", ru: "Подтвердите границы участка, разрешённое использование и пропускную способность доступа до выбора программы." }
  },
  living: {
    audience: "b2c", role: "family_relocation", scenario: "neighbourhood_shortlist",
    label: { en: "Living & relocation", ru: "Жизнь и переезд" },
    question: { en: "Which everyday needs should I check before visiting?", ru: "Что проверить для повседневной жизни перед визитом?" },
    cards: ["daily_needs", "access", "district", "places", "building_context", "next_check"],
    groups: ["education", "healthcare", "retail_daily_needs", "open_space", "civic_culture"],
    next: { en: "Check actual commute routes, school admission, opening hours and housing costs. Map proximity alone does not establish suitability.", ru: "Проверьте реальные маршруты, приём в школы, часы работы и стоимость жилья. Близость на карте сама по себе не подтверждает пригодность." }
  }
} satisfies Record<DecisionViewId, {
  audience: "b2b" | "b2c"; role: string; scenario: string;
  label: { en: string; ru: string }; question: { en: string; ru: string };
  cards: DecisionCardId[]; groups: string[]; next: { en: string; ru: string };
}>;

/** Null is unavailable, never an inferred zero; shares describe this returned
 * sample only. No scoring, routing time or population inference is performed.
 */
export function decisionContextSummary(context: PointObjectGeoContext | null) {
  const available = context?.coverage === "available";
  return {
    available,
    radiusM: context?.radiusM ?? null,
    sampleSize: available ? context.sampleSize : null,
    buildings: available ? context.mappedBuildingCount : null,
    levels: available && context.mappedLevelsKnownCount > 0 ? context.medianMappedLevels : null,
    transitM: available ? context.nearestTransitM : null,
    roadM: available ? context.nearestMajorRoadM : null,
    groups: available ? context.groups.filter((group) => group.count > 0) : []
  };
}
