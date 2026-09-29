import type { LiveMapSelection } from "@/components/point-to-object/live-types";
import { pointObjectHasSelectedIdentity, pointObjectSelectedLookupId } from "@/src/lib/prototype/point-to-object-trusted-identity";

type Locale = "en" | "ru";

function selectedPolygonAreaSqM(selection: LiveMapSelection): number | null {
  const geometry = selection.object.geometry;
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return null;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let area = 0;
  for (const polygon of polygons) {
    if (!polygon.length) return null;
    for (const [ringIndex, ring] of polygon.entries()) {
      if (ring.length < 4) return null;
      const reference = ring[0];
      const metresPerLongitude = 111_320 * Math.cos(reference[1] * Math.PI / 180);
      let twiceArea = 0;
      for (let index = 0; index < ring.length; index += 1) {
        const current = ring[index];
        const next = ring[(index + 1) % ring.length];
        if (![...current, ...next].every(Number.isFinite)) return null;
        const x = (current[0] - reference[0]) * metresPerLongitude;
        const y = (current[1] - reference[1]) * 110_540;
        const nextX = (next[0] - reference[0]) * metresPerLongitude;
        const nextY = (next[1] - reference[1]) * 110_540;
        twiceArea += x * nextY - nextX * y;
      }
      area += (ringIndex === 0 ? 1 : -1) * Math.abs(twiceArea / 2);
    }
  }
  return Number.isFinite(area) && area > 1 && area <= 1_000_000_000 ? Math.round(area) : null;
}

function mappedHeight(raw: string | undefined): { metres: number; sourceUnit: "metres" | "feet" } | null {
  const match = raw?.normalize("NFKC").trim().match(/^([+-]?\d{1,4}(?:\.\d{1,3})?)\s*(m|metre|meter|metres|meters|ft|feet)?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const feet = match[2]?.toLowerCase() === "ft" || match[2]?.toLowerCase() === "feet";
  return { metres: feet ? Math.round(value * 0.3048 * 100) / 100 : value, sourceUnit: feet ? "feet" : "metres" };
}

function mappedLevels(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw.trim())) return null;
  const levels = Number(raw);
  return Number.isSafeInteger(levels) && levels > 0 ? levels : null;
}

export function PointObjectExpressOverview({ selection, locale }: { selection: LiveMapSelection; locale: Locale }) {
  const ru = locale === "ru";
  const exact = pointObjectHasSelectedIdentity(selection, selection.resolvedObject);
  const resolved = exact ? selection.resolvedObject : null;
  const selectedId = pointObjectSelectedLookupId(selection);
  const renderedArea = selectedPolygonAreaSqM(selection);
  const completeSourceFootprint = resolved?.geometryProvenance === "confirmed_complete_footprint" && Boolean(resolved.displayGeometry);
  const sourceArea = completeSourceFootprint ? resolved?.metrics?.footprintAreaSqM ?? null : null;
  const area = sourceArea ?? renderedArea;
  const areaIsSelectedMapShape = area !== null && sourceArea === null && selection.object.geometryProvenance !== "confirmed_complete_footprint";
  const hasPolygon = selection.object.geometry?.type === "Polygon" || selection.object.geometry?.type === "MultiPolygon";
  const heightRaw = resolved?.tags["tag.height"] ?? resolved?.tags.height;
  const mappedHeightValue = mappedHeight(heightRaw);
  const heightMetres = mappedHeightValue?.metres ?? null;
  const levels = mappedLevels(resolved?.tags["tag.building:levels"] ?? resolved?.tags["building:levels"]);
  const mappedClassRaw = resolved?.tags["tag.building"] ?? resolved?.tags.building ?? selection.object.featureClass;
  const mappedClass = mappedClassRaw === "yes" ? (ru ? "здание" : "building") : mappedClassRaw;
  const context = selection.resolvedObject?.geoContext;
  const contextAvailable = context?.coverage === "available";
  const mappedName = resolved?.name ?? selection.object.name;
  const number = (value: number) => value.toLocaleString(ru ? "ru-RU" : "en-US");
  const groupLabels: Record<string, string> = ru ? {
    residential: "жилых", commercial: "деловых", hospitality: "гостиничных", retail_daily_needs: "торговых и сервисных",
    education: "образовательных", healthcare: "медицинских", civic_culture: "общественных", transport: "транспортных",
    access: "дорожных", open_space: "открытых пространств", industrial: "промышленных", construction: "строящихся", other_built: "прочих построек"
  } : {
    residential: "residential", commercial: "commercial", hospitality: "hospitality", retail_daily_needs: "retail and service",
    education: "education", healthcare: "healthcare", civic_culture: "civic", transport: "transport",
    access: "road", open_space: "open-space", industrial: "industrial", construction: "construction", other_built: "other built"
  };
  const districtLabels: Record<string, string> = ru ? {
    hospitality_tourism: "гостинично-туристический", commercial_business: "деловой", residential: "жилой",
    mixed_use_urban: "смешанный городской", civic_institutional: "общественный", industrial_logistics: "промышленно-логистический",
    open_space_recreation: "рекреационный"
  } : {
    hospitality_tourism: "hospitality and tourism", commercial_business: "commercial and business", residential: "residential",
    mixed_use_urban: "mixed urban", civic_institutional: "civic", industrial_logistics: "industrial and logistics",
    open_space_recreation: "open-space and recreation"
  };
  const topGroups = contextAvailable && context
    ? [...context.groups].filter((group) => group.count > 0).sort((left, right) => right.count - left.count).slice(0, 2)
    : [];
  const climate = selection.resolvedObject?.climate;
  const regionalClimate = climate?.status === "available" &&
    Math.abs(climate.requestedPoint[0] - selection.longitude) < 0.00001 &&
    Math.abs(climate.requestedPoint[1] - selection.latitude) < 0.00001 ? climate : null;
  const monthlyMeanRange = regionalClimate ? {
    min: Math.round(Math.min(...regionalClimate.months.map((month) => month.temperatureC))),
    max: Math.round(Math.max(...regionalClimate.months.map((month) => month.temperatureC)))
  } : null;

  const summary = exact
    ? (ru
      ? `${mappedName || "Выбранный объект"} совпадает с записью OpenStreetMap${area !== null ? `; ${areaIsSelectedMapShape ? "выбранный контур карты, возможно фрагмент" : "картированный контур"} — около ${number(area)} м²` : ""}${heightMetres !== null ? `, ${mappedHeightValue?.sourceUnit === "feet" ? `тег высоты «${heightRaw}» соответствует` : "тег высоты —"} ${number(heightMetres)} м` : ""}. Это исходная физическая картина для скрининга.`
      : `${mappedName || "The selected feature"} matches an OpenStreetMap record${area !== null ? `, with about ${number(area)} m² of ${areaIsSelectedMapShape ? "selected map shape, possibly a fragment" : "mapped footprint"}` : ""}${heightMetres !== null ? ` and ${mappedHeightValue?.sourceUnit === "feet" ? `a “${heightRaw}” height tag equivalent to` : "a height tag of"} ${number(heightMetres)} m` : ""}. This is an initial physical picture for screening.`)
    : hasPolygon
      ? (ru
        ? `Контур выбран на карте${renderedArea !== null ? ` (около ${number(renderedArea)} м² видимой геометрии)` : ""}, но совпадающая запись объекта не подтверждена. Ближайшие заведения и их параметры не считаются свойствами этого здания.`
        : `A map shape is selected${renderedArea !== null ? ` (about ${number(renderedArea)} m² of visible geometry)` : ""}, but a matching object record is unconfirmed. Nearby venues and their attributes are not treated as properties of this building.`)
      : (ru
        ? "Точка выбрана, но контур и запись объекта не подтверждены. Ниже показано только то, что есть в локальном снимке."
        : "The point is selected, but its footprint and object record are unconfirmed. Only locally available map evidence is shown below.");

  const height = heightMetres !== null
    ? mappedHeightValue?.sourceUnit === "feet"
      ? (ru ? `${number(heightMetres)} м после пересчёта тега OSM «${heightRaw}»; не обмер` : `${number(heightMetres)} m converted from OSM tag “${heightRaw}”; not surveyed`)
      : (ru ? `${number(heightMetres)} м по тегу OSM; не обмер` : `${number(heightMetres)} m from an OSM tag; not surveyed`)
    : heightRaw !== undefined
      ? (ru ? `Тег OSM «${heightRaw}»; высота в метрах не установлена` : `OSM tag “${heightRaw}”; height in metres not established`)
      : (ru ? "Высота неизвестна" : "Height unknown");

  return <section className="rounded-[20px] border border-[#c8d9ec] bg-white p-5 shadow-soft sm:p-7" data-testid="express-overview">
    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#087f8c]">{ru ? "ЭКСПРЕСС-ОБЗОР · ОТКРЫТАЯ КАРТА" : "EXPRESS OVERVIEW · OPEN MAP"}</p>
    <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#172b4d]">{ru ? "Что известно о выбранном объекте" : "What we know about this selection"}</h2>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#344054]" data-testid="express-summary">{summary}</p>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <article className="min-w-0 rounded-2xl border border-line bg-[#f8fafc] p-4" data-testid="express-object">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-[#52657a]">{ru ? "Объект" : "Object"}</h3>
        <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#243447]">{mappedName || (ru ? "Без названия на карте" : "Unnamed on the map")}</p>
        <p className="mt-1 break-words text-xs leading-5 text-[#52657a]">{ru ? "Класс на карте" : "Mapped class"}: {mappedClass || (ru ? "не указан" : "not supplied")}</p>
        <p className="mt-1 break-all text-xs leading-5 text-[#52657a]">{selectedId ? `${ru ? "ID выбранного объекта" : "Selected object ID"}: ${selectedId}` : (ru ? "ID выбранного объекта не подтверждён" : "Selected object ID unconfirmed")}</p>
      </article>
      <article className="min-w-0 rounded-2xl border border-line bg-[#f8fafc] p-4" data-testid="express-form">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-[#52657a]">{ru ? "Форма и высота" : "Form & height"}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#243447]">{area !== null
          ? (ru ? `Около ${number(area)} м² ${areaIsSelectedMapShape ? "выбранного контура карты" : "картированного контура"}` : `About ${number(area)} m² of ${areaIsSelectedMapShape ? "selected map shape" : "mapped footprint"}`)
          : (ru ? "Площадь контура неизвестна" : "Footprint area unknown")}</p>
        {area !== null ? <p className="mt-1 text-xs leading-5 text-[#52657a]">{areaIsSelectedMapShape
          ? (ru ? "Только выбранный контур карты; он может быть частью здания." : "Selected map shape only; it may be part of a building.")
          : (ru ? "Расчёт по обобщённой геометрии OSM, не обмер." : "Derived from generalized OSM geometry, not a survey.")}</p> : null}
        <p className="mt-2 break-words text-xs leading-5 text-[#52657a]" data-testid="express-height">{height}</p>
        {levels !== null ? <p className="mt-1 text-xs leading-5 text-[#52657a]">{ru ? `${levels} этажей по карте; это не определяет высоту в метрах.` : `${levels} mapped levels; this does not establish height in metres.`}</p> : null}
      </article>
      <article className="min-w-0 rounded-2xl border border-line bg-[#f8fafc] p-4" data-testid="express-context">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-[#52657a]">{ru ? "Окружение точки" : "Around the point"}</h3>
        {contextAvailable && context ? <>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#243447]">{ru
            ? `${number(context.sampleSize)} объектов вернул источник в радиусе 400 м; ${number(context.mappedBuildingCount)} отмечены как здания.`
            : `${number(context.sampleSize)} features returned within 400 m; ${number(context.mappedBuildingCount)} mapped as buildings.`}</p>
          {topGroups.length ? <p className="mt-1 text-xs leading-5 text-[#52657a]">{ru ? "Среди возвращённых" : "Among those returned"}: {topGroups.map((group) => `${number(group.count)} ${groupLabels[group.group] ?? group.group}`).join(ru ? ", " : ", ")}.</p> : null}
          {context.districtCharacter.code !== "low_signal" ? <p className="mt-1 text-xs leading-5 text-[#52657a]">{ru
            ? `Правило по этой выборке описывает окружение как ${districtLabels[context.districtCharacter.code] ?? "смешанное"}; это не официальное зонирование.`
            : `A sample-based rule suggests a ${districtLabels[context.districtCharacter.code] ?? "mixed"} pattern; this is not official zoning.`}</p> : null}
          <p className="mt-1 text-xs leading-5 text-[#52657a]">{context.nearestTransitM !== null
            ? (ru ? `Ближайшая отмеченная остановка — ${number(context.nearestTransitM)} м по прямой.` : `Nearest mapped transit — ${number(context.nearestTransitM)} m straight-line.`)
            : (ru ? "Данные о ближайшем транспорте не получены." : "Nearest transit was not returned.")}</p>
          {context.nearestMajorRoadM !== null ? <p className="mt-1 text-xs leading-5 text-[#52657a]">{ru
            ? `Ближайшая отмеченная магистраль — ${number(context.nearestMajorRoadM)} м по прямой.`
            : `Nearest mapped major road — ${number(context.nearestMajorRoadM)} m straight-line.`}</p> : null}
          <p className="mt-1 text-xs leading-5 text-[#52657a]">{ru ? "Это выборка открытой карты, не полная инвентаризация." : "This is an open-map sample, not a full inventory."}</p>
        </> : <p className="mt-2 text-sm leading-6 text-[#344054]">{ru
          ? "Данные окружения сейчас недоступны; это не означает, что рядом нет объектов."
          : "Surroundings data is unavailable; this does not mean there are no nearby features."}</p>}
        {monthlyMeanRange ? <p className="mt-2 border-t border-line pt-2 text-xs leading-5 text-[#52657a]" data-testid="express-climate">{ru
          ? `Региональная сетка NASA POWER за ${regionalClimate!.year} год: месячная средняя температура воздуха от ${monthlyMeanRange.min} до ${monthlyMeanRange.max} °C; не измерение на участке.`
          : `NASA POWER regional grid, ${regionalClimate!.year}: monthly mean air temperature ${monthlyMeanRange.min}–${monthlyMeanRange.max} °C; not a site measurement.`}</p> : null}
      </article>
      <article className="min-w-0 rounded-2xl border border-line bg-[#f4fbfb] p-4" data-testid="express-next">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-[#087f8c]">{ru ? "Смысл и следующий шаг" : "Implication & next check"}</h3>
        <p className="mt-2 text-sm leading-6 text-[#344054]">{exact
          ? contextAvailable
            ? (ru ? "Контур и картированное окружение помогают выбрать предмет выездной проверки: реальные габариты, подходы и текущее использование." : "The footprint and mapped surroundings point to useful site checks: actual dimensions, access and current use.")
            : (ru ? "Картированные параметры дают ориентир по объекту; без данных окружения нельзя оценить его связи с соседней застройкой." : "Mapped attributes offer an initial physical reference; without surroundings data, its relationship to nearby development is unknown.")
          : (ru ? "Сначала подтвердите точную запись и границы выбранного здания; соседний POI для этого не подходит." : "First confirm the selected building’s exact record and boundary; a nearby POI cannot stand in for it.")}</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-[#087f8c]">{ru
          ? "Сверьте объект и размеры с официальными или предоставленными владельцем документами. Целевой AI-анализ запускается отдельно."
          : "Check identity and dimensions against official or owner records. Focused AI analysis is a separate action."}</p>
      </article>
    </div>
    <p className="mt-4 text-xs leading-5 text-[#52657a]" data-testid="express-unavailable"><span className="font-semibold">{ru ? "Не установлено этой картой:" : "Not established by this map:"}</span> {ru
      ? "права и ограничения, допустимое использование, спрос, стоимость и экономика проекта."
      : "rights and constraints, permitted use, demand, costs and project economics."}</p>
    <p className="mt-4 border-t border-line pt-3 text-[11px] leading-5 text-muted">Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.</p>
  </section>;
}
