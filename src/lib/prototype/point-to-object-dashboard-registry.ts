import type { PointObjectGeoContext, PointObjectAnalysisRequestReceipt } from "@/components/point-to-object/live-types";

export const POINT_OBJECT_DASHBOARD_VERSION = "SCENARIO_DECISION_DASHBOARD_V3" as const;
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

export type DashboardModule = "surroundings" | "district" | "access" | "buildings" | "coverage" | "risks" | "alternatives" | "validation" | "challenge";
type Copy = { en: string; ru: string };
export const dashboardGoals: Record<PointObjectAnalysisRequestReceipt["goal"], { label: Copy; question: Copy; lead: DashboardModule; modules: DashboardModule[] }> = {
  object_profile: {
    label: { en: "Object profile", ru: "Профиль объекта" },
    question: { en: "What is mapped here, and what still needs checking?", ru: "Что известно по карте и что ещё нужно проверить?" },
    lead: "surroundings", modules: ["surroundings", "district", "access", "buildings", "coverage", "validation"]
  },
  development_screening: {
    label: { en: "Development screening", ru: "Скрининг девелопмента" },
    question: { en: "What evidence supports the next site review?", ru: "Какие данные обосновывают следующий этап проверки участка?" },
    lead: "buildings", modules: ["buildings", "access", "surroundings", "risks", "coverage", "validation"]
  },
  redevelopment: {
    label: { en: "Redevelopment", ru: "Редевелопмент" },
    question: { en: "Which alternatives merit validation against the existing context?", ru: "Какие альтернативы стоит проверить с учётом существующего окружения?" },
    lead: "alternatives", modules: ["alternatives", "buildings", "surroundings", "risks", "coverage", "validation"]
  },
  due_diligence: {
    label: { en: "Due diligence", ru: "Предварительная проверка" },
    question: { en: "Which unknowns could change the decision?", ru: "Какие неизвестные могут изменить решение?" },
    lead: "coverage", modules: ["coverage", "risks", "validation", "surroundings", "access", "buildings"]
  },
  custom: {
    label: { en: "Focused question", ru: "Уточняющий вопрос" },
    question: { en: "What can this evidence answer?", ru: "На что позволяют ответить имеющиеся данные?" },
    lead: "coverage", modules: ["coverage", "surroundings", "risks", "validation"]
  }
};

/** Only a completed request may select the layout. Draft controls are not inputs. */
export function dashboardLayout(request: Pick<PointObjectAnalysisRequestReceipt, "goal" | "depth">) {
  const preset = dashboardGoals[request.goal];
  const modules: DashboardModule[] = request.depth === "quick" ? [preset.lead]
    : request.depth === "deep" ? [...new Set<DashboardModule>([...preset.modules, "challenge", "alternatives"])]
      : [...preset.modules];
  const prefersWide = (id: DashboardModule) => (id === preset.lead && id !== "buildings") ||
    id === "surroundings" || id === "challenge" || id === "validation";
  const wideModules: DashboardModule[] = [];
  for (let index = 0; index < modules.length; index++) {
    const id = modules[index], next = modules[index + 1];
    if (!prefersWide(id) && next && !prefersWide(next)) index++;
    else wideModules.push(id);
  }
  return { ...preset, modules, wideModules, depth: request.depth };
}

export type DashboardMetricId = "sample" | "buildings" | "levels" | "levelCoverage" | "transit" | "road";
export const dashboardMetricLabels: Record<DashboardMetricId, Copy> = {
  sample: { en: "Returned features", ru: "Объекты выборки" },
  buildings: { en: "Buildings in sample", ru: "Здания в выборке" },
  levels: { en: "Median mapped levels", ru: "Медиана этажей по карте" },
  levelCoverage: { en: "Buildings with level data", ru: "Здания с этажностью" },
  transit: { en: "Transit, straight-line", ru: "Транспорт, по прямой" },
  road: { en: "Major road, straight-line", ru: "Магистраль, по прямой" }
};

/** Hero measures follow the completed decision, never draft controls. All
 * numbers describe the returned neighbourhood sample, not the selected asset. */
export function dashboardHeroMetrics(request: Pick<PointObjectAnalysisRequestReceipt, "goal" | "scenario">, context: PointObjectGeoContext | null) {
  const data = decisionContextSummary(context);
  const count = (value: number | null, maximum = Infinity) => value !== null && Number.isInteger(value) && value >= 0 && value <= maximum ? value : null;
  const buildings = count(data.buildings, data.sampleSize ?? 0);
  const known = data.available ? count(context?.mappedLevelsKnownCount ?? null, buildings ?? 0) : null;
  const keys: DashboardMetricId[] = request.goal === "redevelopment" ? ["buildings", "levels", "levelCoverage"]
    : request.goal === "development_screening" ? ["buildings", "road", "transit"]
      : request.goal === "due_diligence" ? ["levelCoverage", "sample"]
        : request.goal === "custom" ? ["sample"]
          : request.scenario.startsWith("b2c_") ? ["transit", "sample"] : ["sample", "buildings", "transit"];
  const values: Record<DashboardMetricId, number | string | null> = {
    sample: count(data.sampleSize), buildings,
    levels: known !== null && known > 0 && typeof data.levels === "number" && Number.isFinite(data.levels) && data.levels > 0 ? data.levels : null,
    levelCoverage: known !== null && buildings !== null ? `${known}/${buildings}` : null,
    transit: typeof data.transitM === "number" && Number.isFinite(data.transitM) && data.transitM >= 0 ? data.transitM : null,
    road: typeof data.roadM === "number" && Number.isFinite(data.roadM) && data.roadM >= 0 ? data.roadM : null
  };
  return keys.map(id => ({ id, label: dashboardMetricLabels[id], value: values[id], unit: id === "transit" || id === "road" ? "m" : null }));
}

/** Do not normalise shares to the displayed subset or repair inconsistent evidence. */
export function dashboardCategoryRows(context: PointObjectGeoContext | null, scenario?: PointObjectAnalysisRequestReceipt["scenario"]) {
  if (context?.coverage !== "available") return [];
  const denominatorValid = Number.isInteger(context.sampleSize) && context.sampleSize > 0;
  const uniqueGroups = new Set(context.groups.map(group => group.group)).size === context.groups.length;
  const validTotal = context.groups.every(group => Number.isInteger(group.count) && group.count >= 0) &&
    context.groups.reduce((sum, group) => sum + group.count, 0) <= context.sampleSize;
  const priorities: readonly string[] = scenario?.startsWith("b2c_") ? decisionViews.living.groups : [];
  const priority = (group: string) => priorities.includes(group) ? priorities.indexOf(group) : priorities.length;
  return context.groups.map(group => {
    const countValid = Number.isInteger(group.count) && group.count >= 0 && denominatorValid && group.count <= context.sampleSize;
    const expected = countValid ? group.count / context.sampleSize * 100 : null;
    const reconciled = uniqueGroups && validTotal && expected !== null && Number.isFinite(group.sharePct) && group.sharePct >= 0 && group.sharePct <= 100 && Math.abs(group.sharePct - expected) <= 0.11;
    return { ...group, count: countValid ? group.count : null, sharePct: reconciled ? group.sharePct : null, reconciled,
      nearestDistanceM: typeof group.nearestDistanceM === "number" && Number.isFinite(group.nearestDistanceM) && group.nearestDistanceM >= 0 ? group.nearestDistanceM : null };
  }).sort((a, b) => priority(a.group) - priority(b.group) || (b.count ?? -1) - (a.count ?? -1));
}
