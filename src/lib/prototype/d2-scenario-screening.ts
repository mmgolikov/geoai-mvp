import type { PointObjectAnalysisGoal } from "@/components/point-to-object/live-types";
import type { PointObjectAnalysisScenario } from "./point-to-object-ai-provenance";
import type { PointObjectNormalizedContext } from "./point-to-object-normalized-context";

export type D2ScreeningCard = {
  id: string;
  title: string;
  fact: string;
  consequence: string;
  nextCheck: string;
  evidenceRefs: string[];
};

/** Local screening rules over retained evidence. Never modifies model content,
 * fetches sources, merges providers or estimates floor area from tagged levels. */
export function buildD2ScenarioScreening(context: PointObjectNormalizedContext, subjectName: string, goal: PointObjectAnalysisGoal, scenario: PointObjectAnalysisScenario, locale: "en" | "ru"): D2ScreeningCard[] {
  const ru = locale === "ru";
  const redevelopment = goal === "redevelopment" || goal === "development_screening" || scenario.startsWith("b2b_redevelopment_");
  const fmt = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US", { maximumFractionDigits: 1 });
  const cards: D2ScreeningCard[] = [];
  const details = context.details;
  const exact = details?.association === "selected_record" && details.subjectId === context.subjectId;
  const area = exact ? details.metrics.find(m => m.id === "footprint_area" && m.value !== null) : undefined;
  const levels = exact ? details.metrics.find(m => m.id === "levels" && m.value !== null) : undefined;
  const height = exact ? details.metrics.find(m => m.id === "height" && m.value !== null) : undefined;
  if (area && !details?.semanticWarnings.length) {
    cards.push({
      id: "mapped-envelope",
      title: redevelopment ? (ru ? "Контур для сравнения сохранения и замены" : "Envelope for retention versus replacement") : (ru ? "Измерения для сопоставления актива" : "Measurements for asset matching"),
      fact: `${ru ? "Выбранная картированная запись" : "Selected mapped record"} ${subjectName} · OSM ${context.subjectId}: ${fmt(area.value!)} m²${levels ? ` · ${fmt(levels.value!)} ${ru ? "этажей по тегу" : "tagged levels"}` : ""}${height ? ` · ${fmt(height.value!)} ${ru ? "м по тегу высоты" : "m height tag"}` : ""}.`,
      consequence: redevelopment
        ? (ru ? "Сохранение и переиспользование можно начать сравнивать по этому картированному контуру. Для замены нужен отдельный допустимый объём; теги этажности не подтверждают резерв надстройки или площадь этажей." : "Retention and reuse can use this mapped envelope as the first comparison baseline. Replacement needs a separately validated development envelope; level tags establish neither extension headroom nor floor area.")
        : (ru ? "Контур помогает сопоставить запись с реальным активом. Этажность и высота из тегов не устанавливают состояние, полезную площадь или вместимость." : "The footprint helps match the record to the real asset. Tagged levels and height do not establish condition, usable floor area or capacity."),
      nextCheck: ru ? "Сначала сопоставить контур с активом и участком; затем обмерить конструктив и этажи для варианта переиспользования. До сравнения замены получить действующие ограничения застройки." : "First reconcile the footprint with the asset and parcel; then survey the structure and floors for reuse. Obtain current development controls before comparing replacement.",
      evidenceRefs: [area.evidenceRef, ...(levels || height ? ["EVD-ALLOWED-FIELDS"] : [])]
    });
  } else if ((details && !exact) || details?.semanticWarnings.length) {
    cards.push({
      id: "subject-coverage",
      title: ru ? "Сначала установить измеряемый объект" : "Establish the measurable subject first",
      fact: ru ? `${subjectName}: сохранённые данные не устанавливают постоянный измеренный объём выбранного здания.` : `${subjectName}: retained evidence does not establish a measured permanent envelope for the selected building.`,
      consequence: ru ? "Перенос параметров ближайшей записи или временной конструкции в сравнение сохранения и замены исказит базовый вариант." : "Transferring attributes from a nearby record or temporary structure would distort the retention-versus-replacement baseline.",
      nextCheck: ru ? "Уточнить выбранный актив и его геометрию; получить обмеры до расчёта площадей и вариантов застройки." : "Confirm the selected asset and geometry; obtain measurements before floor-area or development-option calculations.",
      evidenceRefs: ["EVD-OSM-OBJECT", "EVD-GEOMETRY"]
    });
  }
  const independent = context.independentContext?.status === "available" ? context.independentContext : null;
  const independentTransit = independent?.places.find(p => p.group === "transport");
  const road = context.places.find(p => p.group === "access");
  const transit = context.places.find(p => p.group === "transport");
  const access = [transit, road].filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (access.length || independentTransit) {
    cards.push({
      id: "entrances-and-servicing",
      title: ru ? "Развести входы и обслуживание" : "Separate entrances and servicing",
      fact: [...access.map(p => `OSM · ${p.name}${p.distanceM === null ? "" : ` · ${fmt(p.distanceM)} ${ru ? "м по прямой" : "m straight-line"}`}`), ...(independentTransit ? [`Overture Places · ${independentTransit.name} · ${fmt(independentTransit.distanceM)} ${ru ? "м до точки по прямой" : "m straight-line to point"}`] : [])].join("; ") + ".",
      consequence: (redevelopment
        ? (ru ? "Для переиспользования проверить связь существующего входа с этими точками. Для замены проверить место входа и разгрузки до выбора объёма: близость магистрали сама по себе не устанавливает въезд или переход." : "For reuse, test the existing entrance connection to these records. For replacement, test entrance and loading locations before choosing massing: major-road proximity alone establishes neither a vehicle entrance nor a crossing.")
        : (ru ? "Это адресные ориентиры для проверки доступа. Расстояние до центра записи не устанавливает вход, переход или пешеходный маршрут." : "These are named leads for an access check. Distance to a record centre establishes neither an entrance, crossing nor walking route.")) + (independentTransit ? (ru ? ` Отдельная запись Overture ${independentTransit.name} добавляет именованный транспортный ориентир для проверки, не дополнительную единицу мощности.` : ` The separate Overture record ${independentTransit.name} adds a named transit lead to verify, not an additional unit of capacity.`) : ""),
      nextCheck: ru ? `На месте проследить путь от входа к ${transit?.name ?? road?.name ?? independentTransit!.name}${independentTransit && access.length ? ` и входу ${independentTransit.name}` : ""}; отдельно проверить барьеры, переходы и подъезд для обслуживания${road ? ` со стороны ${road.name}` : ""}. Сопоставить связанные записи станций до подсчёта уникальных узлов.` : `Trace the entrance connection to ${transit?.name ?? road?.name ?? independentTransit!.name}${independentTransit && access.length ? ` and the ${independentTransit.name} entrance` : ""} on site; separately check barriers, crossings and servicing access${road ? ` at ${road.name}` : ""}. Reconcile related station records before counting unique nodes.`,
      evidenceRefs: [...access.map(p => p.evidenceRef), ...(independentTransit ? [independentTransit.evidenceRef] : [])]
    });
  }
  const pharmacy = independent?.places.find(p => p.taxonomy.primary === "pharmacy");
  const service = pharmacy ?? independent?.places.find(p => p.group === "daily_services");
  if (service) {
    cards.push({
      id: "programme-service-check",
      title: !redevelopment ? (ru ? "Проверить именованную услугу" : "Verify the named service") : pharmacy ? (ru ? "Проверить аптечную функцию до новой площади" : "Check pharmacy provision before adding space") : (ru ? "Сопоставить новую функцию с именованным сервисом" : "Test a new use against a named service"),
      fact: `Overture Places · ${service.name} · ${fmt(service.distanceM)} ${ru ? "м до точки по прямой" : "m straight-line to point"}.`,
      consequence: redevelopment
        ? (pharmacy ? (ru ? "В вариантах переиспользования и замены аптечную площадь следует проверять как отдельную гипотезу: сохранённая запись даёт конкретную услугу для проверки возможного дублирования. Она не доказывает достаточность предложения или отсутствие спроса." : "In both reuse and replacement options, test pharmacy space as a separate hypothesis: this retained record identifies a specific service to investigate for possible duplication. It proves neither sufficient supply nor absence of demand.") : (ru ? "До закрепления сходной функции в переиспользовании или замене проверить, чем она отличается от этого сервиса. Запись не устанавливает текущую конкуренцию или спрос." : "Before allocating a similar use in reuse or replacement, test how it differs from this named service. The record does not establish current competition or demand."))
        : (ru ? "Именованная запись даёт конкретную проверку услуги для выбранного актива; наличие в каталоге не доказывает работу, доступность или вместимость." : "The named record gives a specific service check for this asset; a catalogue entry does not establish operation, access or capacity."),
      nextCheck: ru ? `Проверить работу ${service.name}, точный вход, этаж и путь от площадки; затем запросить потребности оператора и данные спроса до выделения новой площади.` : `Verify ${service.name}'s operation, exact entrance, floor and connection from the site; then obtain operator requirements and demand evidence before allocating new space.`,
      evidenceRefs: [service.evidenceRef]
    });
  }
  return cards;
}
