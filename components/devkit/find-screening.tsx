"use client";

import { useMemo } from "react";
import {
  DEVKIT_FIND_CAVEAT,
  rankDevkitFindCandidates,
  selectDevkitFindCandidate,
  type DevkitFindCriterion,
  type DevkitFindCriterionKey,
  type DevkitFindSelection,
  type DevkitFindState
} from "../../src/lib/devkit/find-ranking";

export type DevkitFindScreeningProps = {
  state: DevkitFindState;
  locale: "en" | "ru";
  onChange: (state: DevkitFindState) => void;
  onChoose: (selection: DevkitFindSelection) => void;
};

const label: Record<DevkitFindCriterionKey, [string, string]> = {
  redevelopment_tag: ["Mapped redevelopment signal", "Тег redevelopment в OSM"],
  mapped_levels: ["Mapped levels within preference", "Этажность в пределах предпочтения"],
  source_footprint: ["Complete source footprint", "Полный исходный контур"],
  reference_distance: ["Reference-point distance", "Расстояние до опорной точки"]
};
const reasons: Record<string, [string, string]> = {
  explicit_redevelopment_tag: ["Construction/brownfield is mapped; redevelopment rights are unknown.", "Указан construction/brownfield; права на redevelopment неизвестны."],
  different_mapped_use: ["A different physical use is mapped; the redevelopment preference is not met.", "Указано другое физическое использование; предпочтение не выполнено."],
  physical_use_missing: ["No explicit physical-use evidence. A POI is not a parcel.", "Нет явного тега физического использования. POI не равен участку."],
  levels_conflict_or_invalid: ["Raw and normalized levels conflict or cannot be interpreted in levels.", "Исходная и нормализованная этажность конфликтуют либо значение нельзя трактовать в этажах."],
  explicit_levels_unavailable: ["Explicit building:levels is unavailable; height is not converted to floors.", "Явный building:levels недоступен; высота не переводится в этажи."],
  explicit_mapped_levels_only: ["Explicit mapped building:levels; not a permitted height or verified survey.", "Явный building:levels из OSM; не разрешённая высота и не результат обследования."],
  complete_source_footprint: ["Validated source geometry is available for screening, not a legal boundary.", "Проверенная исходная геометрия доступна для screening; не юридическая граница."],
  complete_source_footprint_unavailable: ["Complete source geometry is unavailable or invalid; no area is inferred.", "Полный исходный контур недоступен или невалиден; площадь не выводится."],
  approximate_representative_point_distance: ["Approximate straight-line distance from the source representative point; not walking distance.", "Приблизительное расстояние по прямой от исходной репрезентативной точки; не пешеходный маршрут."]
};
const control = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

function Observation({ item, ru }: { item: DevkitFindCriterion; ru: boolean }) {
  const status = item.status === "met" ? (ru ? "Совпадает" : "Meets") : item.status === "not_met" ? (ru ? "Не совпадает" : "Mismatch") : (ru ? "Неизвестно" : "Unknown");
  const value = item.value === null ? (ru ? "неизвестно" : "unknown") : item.unit === "km" ? `${Number(item.value).toFixed(2)} km` :
    item.unit === "levels" ? `${item.value} ${ru ? "эт." : "levels"}` : item.unit === "geometry" ? (ru ? "исходный контур" : "source footprint") : item.rawValue;
  return <div className="min-w-0 space-y-1 text-xs leading-5">
    <p className="font-semibold text-slate-900">{status} · <span className="font-normal">{value}</span></p>
    <p className="text-slate-700">{reasons[item.reason]?.[ru ? 1 : 0] ?? item.reason}</p>
    {item.rawValue !== null && item.unit === "levels" && <p className="break-words text-slate-700">{ru ? "Исходное значение" : "Raw value"}: {item.rawValue}</p>}
  </div>;
}

/** Controlled, additive UI. Parent persists state in the same project; no fetch/storage or route side effects. */
export function DevkitFindScreening({ state, locale, onChange, onChoose }: DevkitFindScreeningProps) {
  const ru = locale === "ru";
  const evaluation = useMemo(() => {
    try { return { ranking: rankDevkitFindCandidates(state.result, state.criteria, state.inputKind), error: null }; }
    catch (error) { return { ranking: null, error: error instanceof Error ? error.message : "Invalid Find input." }; }
  }, [state.result, state.criteria, state.inputKind]);
  if (!evaluation.ranking) return <section aria-label={ru ? "Отбор кандидатов" : "Candidate screening"} className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
    <p role="alert" className="text-sm text-slate-900">{ru ? "Отбор недоступен: исходные данные или критерии не прошли проверку. Последний сохранённый проект остаётся у владельца проекта." : "Screening unavailable: source data or criteria failed validation. The project owner retains the last saved project."}</p>
    <p className="mt-2 break-words text-xs text-slate-700">{evaluation.error}</p>
    <p className="mt-3 text-xs text-slate-700">{DEVKIT_FIND_CAVEAT}</p>
  </section>;
  const ranking = evaluation.ranking;
  const shortlistIds = new Set(state.shortlist.map(candidate => candidate.sourceFeatureId));
  const comparison = ranking.candidates.filter(row => shortlistIds.has(row.candidate.sourceFeatureId));
  const changeNumber = (key: "maximumMappedLevels" | "maximumReferenceDistanceKm", value: string) => {
    const number = Number(value);
    if (!value || !Number.isFinite(number) || number <= 0 || (key === "maximumMappedLevels" ? !Number.isInteger(number) || number > 100 : number > 50)) return;
    onChange({ ...state, criteria: { ...state.criteria, [key]: number } });
  };
  return <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label={ru ? "Сценарный отбор для девелопера" : "Developer screening scenario"} data-testid="devkit-find-screening">
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">{ru ? "Find · предварительный отбор redevelopment" : "Find · preliminary redevelopment screening"}</h2>
      <p className="text-sm leading-6 text-slate-700">{ru ? "Четыре наблюдаемых критерия в уже полученной выборке. Порядок: больше совпадений → меньше явных несовпадений → ближе к опорной точке → ID для равных результатов. Неизвестные показаны отдельно." : "Four observable criteria within the returned sample. Order: more matches → fewer observed mismatches → nearer the reference point → source ID for ties. Unknowns remain separate."}</p>
      <p className="text-sm leading-6 text-slate-700">{ru ? "Контур оценивает готовность данных к дальнейшему анализу. Это не рейтинг инвестиционной привлекательности и не подтверждение возможности застройки." : "The footprint criterion measures readiness for further analysis. This is not an investment rating or confirmation of development feasibility."}</p>
      {state.inputKind === "synthetic_fixture" && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-950">{ru ? "Синтетический тестовый пример. Сетевой запрос не выполнялся." : "Synthetic test example. No network request was performed."}</p>}
    </div>
    <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-semibold text-slate-900">{ru ? "Предпочтения пользователя, не нормативы" : "User preferences, not regulations"}</legend>
      <label className="grid min-w-0 gap-1 text-sm text-slate-800">{ru ? "Максимальная этажность из OSM" : "Maximum mapped levels"}
        <input type="number" min={1} max={100} step={1} value={state.criteria.maximumMappedLevels} onChange={event => changeNumber("maximumMappedLevels", event.target.value)} className={control} />
      </label>
      <label className="grid min-w-0 gap-1 text-sm text-slate-800">{ru ? "Расстояние до опорной точки, km" : "Reference distance, km"}
        <input type="number" min={0.01} max={50} step={0.1} value={state.criteria.maximumReferenceDistanceKm} onChange={event => changeNumber("maximumReferenceDistanceKm", event.target.value)} className={control} />
      </label>
      <p className="min-w-0 break-words text-xs leading-5 text-slate-700 sm:col-span-2">{ru ? "Опорная точка" : "Reference point"}: {state.criteria.referencePoint.label} · {state.criteria.referencePoint.longitude}, {state.criteria.referencePoint.latitude} (WGS84).</p>
    </fieldset>
    <p className="text-xs leading-5 text-slate-700">{ru ? "Ранжируется только возвращённая выборка; предыдущие фильтры и лимит могли исключить другие объекты. Изменение предпочтений не повторяет поиск." : "Only the returned sample is ranked; prior filters and result limits may have excluded other objects. Changing preferences does not repeat the search."} {ranking.result.coverage.capReached && (ru ? "Достигнут лимит источника." : "Source cap reached.")}</p>
    {ranking.candidates.length === 0 ? <p role="status" className="rounded-lg bg-slate-50 p-4 text-sm text-slate-800">{ru ? "В сохранённом ответе нет кандидатов. Другие объекты не создаются." : "No candidates in the held response. No substitute objects are generated."}</p> :
      <ol className="grid min-w-0 gap-4">
        {ranking.candidates.map((row, index) => {
          const candidate = row.candidate;
          const shortlisted = shortlistIds.has(candidate.sourceFeatureId);
          return <li key={candidate.sourceFeatureId} className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1"><h3 className="break-words text-base font-semibold text-slate-900">{index + 1}. {candidate.label}</h3>
                {state.inputKind === "synthetic_fixture" ? <p className="break-all text-xs text-slate-700">{candidate.sourceFeatureId} · {ru ? "вымышленный ID" : "invented ID"}</p> : <a href={`https://www.openstreetmap.org/${candidate.sourceFeatureId}`} target="_blank" rel="noreferrer" className="break-all text-xs text-teal-800 underline">{candidate.sourceFeatureId}</a>}
                <p className="mt-1 text-xs text-slate-700">{ru ? "Совпадений / несовпадений / неизвестных" : "Matches / mismatches / unknowns"}: {row.metCount} / {row.mismatchCount} / {row.unknownCount}</p>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <button type="button" aria-pressed={shortlisted} disabled={!shortlisted && state.shortlist.length >= 3} className={`${control} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600`} onClick={() => onChange({ ...state, shortlist: shortlisted ? state.shortlist.filter(item => item.sourceFeatureId !== candidate.sourceFeatureId) : [...state.shortlist, candidate] })}>
                  {shortlisted ? (ru ? "Убрать из сравнения" : "Remove from comparison") : (ru ? "Сравнить" : "Compare")}
                </button>
                <button type="button" aria-pressed={state.selectedSourceFeatureId === candidate.sourceFeatureId} className={`${control} border-teal-700 font-semibold text-teal-900`} onClick={() => { const selection = selectDevkitFindCandidate(ranking, candidate.sourceFeatureId); onChange({ ...state, selectedSourceFeatureId: candidate.sourceFeatureId }); onChoose(selection); }}>
                  {state.selectedSourceFeatureId === candidate.sourceFeatureId ? (ru ? "Выбран для проекта" : "Selected for project") : (ru ? "Выбрать для проекта" : "Choose for project")}
                </button>
              </div>
            </div>
            <dl className="grid min-w-0 gap-3 sm:grid-cols-2">{row.criteria.map(item => <div key={item.key} className="min-w-0 rounded-lg bg-slate-50 p-3"><dt className="mb-1 text-xs font-semibold text-slate-900">{label[item.key][ru ? 1 : 0]}</dt><dd><Observation item={item} ru={ru} /></dd></div>)}</dl>
          </li>;
        })}
      </ol>}
    <section aria-label={ru ? "Сравнение shortlist" : "Shortlist comparison"} className="min-w-0 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{ru ? "Сравнение · до трёх кандидатов" : "Comparison · up to three candidates"}</h3>
      {comparison.length < 2 ? <p className="text-sm text-slate-700">{ru ? "Выберите два или три кандидата, чтобы увидеть компромиссы по одинаковым критериям." : "Choose two or three candidates to compare tradeoffs under identical criteria."}</p> :
        <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} aria-label={ru ? "Таблица сравнения, прокручивается горизонтально" : "Comparison table, scrolls horizontally"}>
          <table className="w-full min-w-[540px] table-fixed text-left"><thead><tr><th scope="col" className="w-40 p-3 text-xs text-slate-800">{ru ? "Критерий" : "Criterion"}</th>{comparison.map(row => <th scope="col" key={row.candidate.sourceFeatureId} className="break-words p-3 text-xs text-slate-900">{row.candidate.label}<span className="mt-1 block break-all font-normal">{row.candidate.sourceFeatureId}</span></th>)}</tr></thead>
            <tbody>{ranking.candidates[0]?.criteria.map((criterion, index) => <tr key={criterion.key} className="border-t border-slate-200"><th scope="row" className="p-3 align-top text-xs text-slate-800">{label[criterion.key][ru ? 1 : 0]}</th>{comparison.map(row => <td key={row.candidate.sourceFeatureId} className="break-words p-3 align-top"><Observation item={row.criteria[index]} ru={ru} /></td>)}</tr>)}</tbody>
          </table>
        </div>}
    </section>
    <details className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">
      <summary className="min-h-8 cursor-pointer font-semibold text-slate-900">{ru ? "Источник, даты и границы сравнения" : "Source, dates and comparison limits"}</summary>
      <p className="mt-2">{state.inputKind === "synthetic_fixture" ? (ru ? "GeoAI: синтетический пример. Все даты, ID и хеш ниже вымышлены; ответ OSM не получался." : "GeoAI synthetic fixture. All dates, IDs and the hash below are invented; no OSM response was acquired.") : <>{ranking.result.source.attribution} · {ranking.result.source.licenceId} · <a href={ranking.result.source.licenceUrl} className="text-teal-800 underline">{ru ? "Лицензия" : "Licence"}</a></>}</p>
      <p>{ru ? "Получено" : "Acquired"}: {ranking.result.source.acquiredAt}</p>
      <p>{ru ? "Дата базы OSM, не наблюдения объекта" : "OSM base date, not object observation"}: {ranking.result.source.observedAt ?? (ru ? "неизвестна" : "unknown")}</p>
      <p>{ru ? "Дата наблюдения каждого объекта неизвестна. Единая дата базы не доказывает актуальность всех объектов." : "Each object's observation date is unknown. A common base date does not prove that all objects are current."}</p>
      <p className="break-all">{ru ? "Хеш ответа" : "Response hash"}: {ranking.result.source.sourceResponseHash}</p>
      <p className="break-words">{ru ? "Исходный фильтр и границы" : "Original filter and bounds"}: {ranking.result.criteria.group}; {ranking.result.criteria.bounds.join(", ")}; building:levels {ranking.result.criteria.mappedMinimumLevels ?? "unknown"}–{ranking.result.criteria.mappedMaximumLevels ?? "unknown"}; limit {ranking.result.criteria.limit}.</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">{ranking.result.limitations.map((item, index) => <li className="break-words" key={index}>{item}</li>)}</ul>
    </details>
    <p className="text-xs leading-5 text-slate-700">{ru ? "Выбор передаёт исходную идентичность и доказательства в проект. POI и контур OSM не превращаются в юридический участок. Сохранение выполняет владелец проекта." : "Selection passes the original identity and evidence into the project. A POI or OSM footprint does not become a legal parcel. The project owner handles persistence."}</p>
    <p className="text-xs leading-5 text-slate-700">{DEVKIT_FIND_CAVEAT}</p>
  </section>;
}
