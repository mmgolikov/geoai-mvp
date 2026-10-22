"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import type { DevkitProject } from "@/src/lib/devkit/contracts";
import {
  applyDesignVersions, createDesignAlternatives, designSceneFeatureCollection, editDesignBuilding,
  measureDesignScene, restoreDesignRevision, validateDesignScene, type DesignScene, type RetainedBuildingParameters
} from "@/src/lib/devkit/design";
import { projectDesignPosition } from "@/src/lib/devkit/geometry";
import type { ConceptUse } from "@/src/lib/prototype/point-to-object-create";

export type DevkitDesignPanelProps = {
  project: DevkitProject;
  onChange: (project: DevkitProject) => void;
  locale?: "en" | "ru";
};
const COLORS: Record<ConceptUse, string> = {
  residential: "#93b5e4", office: "#88bfb4", retail: "#e3bd83", hospitality: "#c6ade0", civic: "#a5b8cc", open_space: "#a7c7a1"
};
const USE_LABELS: Record<"en" | "ru", Record<ConceptUse, string>> = {
  en: { residential: "Residential", office: "Office", retail: "Retail", hospitality: "Hospitality", civic: "Civic", open_space: "Open space" },
  ru: { residential: "Жильё", office: "Офисы", retail: "Торговля", hospitality: "Гостиницы", civic: "Общественная функция", open_space: "Открытое пространство" }
};
const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900";

/** Deterministic isometric view of the saved scene; unknown heights remain flat/dashed. */
export function DesignScenePreview({ design, locale = "en" }: { design: DesignScene; locale?: "en" | "ru" }) {
  const render = designSceneFeatureCollection(design);
  const frame = design.scene.metricFrame;
  const screen = (point: number[], z = 0): [number, number] => {
    const [x, y] = projectDesignPosition(point, frame);
    return [(x - y) * 0.65, (x + y) * 0.28 - z * 0.85];
  };
  const all = design.scene.aoi.coordinates[0].map(p => screen(p));
  for (const feature of render.features) for (const p of feature.geometry.coordinates[0]) {
    all.push(screen(p, feature.properties.baseM), screen(p, feature.properties.heightM ?? 0));
  }
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const bounds = [Math.min(...xs) - 15, Math.min(...ys) - 15, Math.max(...xs) - Math.min(...xs) + 30, Math.max(...ys) - Math.min(...ys) + 30];
  const points = (ring: number[][], z = 0) => ring.map(p => screen(p, z).join(",")).join(" ");
  const ordered = [...render.features].sort((a, b) => {
    const depth = (coordinates: number[][]) => coordinates.reduce((s, p) => s + screen(p)[1], 0) / coordinates.length;
    return depth(a.geometry.coordinates[0]) - depth(b.geometry.coordinates[0]);
  });
  return <figure className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <svg viewBox={bounds.join(" ")} role="img" aria-label={locale === "ru" ? "Изометрическая модель сохранённой геометрии" : "Isometric view of saved design geometry"} className="h-72 w-full">
      <polygon points={points(design.scene.aoi.coordinates[0])} fill="#f1f5f9" stroke="#64748b" strokeWidth="0.7" />
      {ordered.map(feature => {
        const p = feature.properties, ring = feature.geometry.coordinates[0];
        if (p.kind === "exclusion") return <polygon key={p.id} points={points(ring)} fill="#fee2e2" fillOpacity="0.75" stroke="#b91c1c" strokeWidth="0.8" strokeDasharray="2 2"><title>{p.id}</title></polygon>;
        const color = p.retained ? "#b6bcc5" : COLORS[p.use ?? "civic"];
        if (p.heightM === null) return <polygon key={p.id} points={points(ring)} fill={color} fillOpacity="0.45" stroke="#475569" strokeWidth="1" strokeDasharray="2 2"><title>{`${p.buildingId}: ${locale === "ru" ? "высота неизвестна" : "height unknown"}`}</title></polygon>;
        return <g key={p.id}>
          {ring.slice(0, -1).map((point, index) => <polygon key={index}
            points={[screen(point, p.baseM), screen(ring[index + 1], p.baseM), screen(ring[index + 1], p.heightM!), screen(point, p.heightM!)].map(q => q.join(",")).join(" ")}
            fill={color} fillOpacity="0.7" stroke="#64748b" strokeWidth="0.3" />)}
          <polygon points={points(ring, p.heightM)} fill={color} stroke="#475569" strokeWidth="0.5"><title>{`${p.buildingId}: ${p.heightM.toFixed(1)} m`}</title></polygon>
        </g>;
      })}
    </svg>
    <figcaption className="text-xs leading-5 text-slate-600">
      {locale === "ru" ? "Из той же канонической сцены, что и площади. Красный — исключения; серый — сохраняемые объекты. Неизвестная высота показана плоским пунктирным контуром." : "Uses the same canonical scene as area calculations. Red: exclusions; grey: retained objects. Unknown heights use a flat dashed footprint."}
    </figcaption>
  </figure>;
}

function DesignPanelContent({ project, onChange, locale: requestedLocale }: DevkitDesignPanelProps) {
  const locale = requestedLocale ?? (project.brief.locale === "ru" ? "ru" : "en"), ru = locale === "ru";
  const id = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [allowDraft, setAllowDraft] = useState(false);
  const criticalGaps = project.constraints.filter(c => c.severity === "critical" && ["unknown", "conflicting"].includes(c.status));
  const [retention, setRetention] = useState<Record<string, { selected: boolean; use: string; levels: string; height: string }>>({});
  const [exclusions, setExclusions] = useState<Record<string, boolean>>({});
  const valid = useMemo(() => project.designVersions.filter(d => validateDesignScene(d).length === 0) as DesignScene[], [project.designVersions]);
  const active = valid.find(d => d.id === project.activeDesignVersionId) ?? valid.at(-1);
  const scenarios = project.scenarios.slice(0, 2);
  const seeds = scenarios.map(s => [...project.designVersions].reverse().find(d => d.scenarioId === s.id));
  const seedRetainedIds = [...new Set(seeds.flatMap(d => d?.retainedObjectIds ?? []))];
  const seedExclusionIds = [...new Set(seeds.flatMap(d => d?.exclusionConstraintIds ?? []))];
  const useLabel = (use: string) => USE_LABELS[locale][use as ConceptUse] ?? use;
  const latest = scenarios.map(s => [...valid].reverse().find(d => d.scenarioId === s.id));
  const selected = active?.scene.buildings.find(b => b.id === selectedId) ?? active?.scene.buildings.find(b => !b.retained);
  const measurements = active ? measureDesignScene(active) : null;
  const retainedObjects = project.objects.filter(o => o.kind === "building");
  const retainedSetting = (objectId: string) => {
    if (retention[objectId]) return retention[objectId];
    const prior = active?.scene.buildings.find(b => b.id === objectId && b.retained);
    return { selected: !!prior || seedRetainedIds.includes(objectId), use: prior?.use ?? "", levels: prior?.levels?.toString() ?? "", height: prior?.heightM?.toString() ?? "" };
  };
  const exclusionSelected = (constraintId: string) => exclusions[constraintId] ?? (active ? active.exclusionConstraintIds.includes(constraintId) : seedExclusionIds.includes(constraintId));
  const changeRetained = (objectId: string, field: string, value: string | boolean) => {
    setRetention(previous => ({ ...previous, [objectId]: { ...retainedSetting(objectId), [field]: value } }));
  };
  const generate = () => {
    setErrors([]);
    const retainedBuildings: RetainedBuildingParameters[] = [];
    const missingPreserved = seedRetainedIds.filter(existing => !retainedObjects.some(o => o.id === existing) && !active?.scene.buildings.some(b => b.id === existing && b.retained));
    if (missingPreserved.length) { setErrors([`${ru ? "Нет исходного контура сохраняемого объекта" : "Retained source geometry is missing"}: ${missingPreserved.join(", ")}`]); return; }
    for (const object of retainedObjects) {
      const value = retainedSetting(object.id);
      if (!value.selected) continue;
      if (!value.use) { setErrors([ru ? `Укажите предполагаемое назначение сохраняемого объекта: ${object.label}.` : `Choose an explicit assumed use for retained object: ${object.label}.`]); return; }
      retainedBuildings.push({ objectId: object.id, use: value.use as RetainedBuildingParameters["use"],
        levels: value.levels === "" ? null : Number(value.levels), heightM: value.height === "" ? null : Number(value.height), assumptionIds: ["user_entered_retained_parameters"] });
    }
    // A missing source object must still reach the controller and fail visibly.
    for (const building of active?.scene.buildings.filter(b => b.retained && !retainedObjects.some(o => o.id === b.id)) ?? []) {
      retainedBuildings.push({ objectId: building.id, use: building.use as RetainedBuildingParameters["use"], levels: building.levels, heightM: building.heightM, assumptionIds: [...building.assumptionIds] });
    }
    const exclusionConstraintIds = [...new Set([
      ...project.constraints.filter(c => exclusionSelected(c.id)).map(c => c.id),
      ...((active?.exclusionConstraintIds ?? seedExclusionIds).filter(existing => !project.constraints.some(c => c.id === existing)))
    ])];
    const result = createDesignAlternatives(project, { retainedBuildings, exclusionConstraintIds, allowUnverifiedDraft: allowDraft });
    if (!result.ok) { setErrors(result.errors); return; }
    try { onChange(applyDesignVersions(project, result.designs)); } catch (error) { setErrors([error instanceof Error ? error.message : "Invalid project revision."]); }
  };
  const edit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!active || !selected) return;
    const data = new FormData(event.currentTarget), east = String(data.get("eastM") ?? ""), north = String(data.get("northM") ?? "");
    const result = editDesignBuilding(active, selected.id, {
      levels: Number(data.get("levels")), floorHeightM: Number(data.get("floorHeightM")),
      use: String(data.get("use")) as RetainedBuildingParameters["use"], terraceSharePct: Number(data.get("terraceSharePct")),
      ...((east !== "" || north !== "") ? { translate: { eastM: east === "" ? 0 : Number(east), northM: north === "" ? 0 : Number(north) } } : {})
    }, active.revision);
    if (!result.ok) { setErrors(result.errors); return; }
    setErrors([]);
    try { onChange(applyDesignVersions(project, [result.design])); } catch (error) { setErrors([error instanceof Error ? error.message : "Invalid project revision."]); }
  };
  const undo = () => {
    const parent = active?.scene.parent;
    const prior = parent ? valid.find(d => d.id === parent.id && d.revision === parent.revision) : null;
    if (!prior || !active) return;
    const restored = restoreDesignRevision(project, active, prior, active.revision);
    if (!restored.ok) { setErrors(restored.errors); return; }
    try { setErrors([]); onChange(applyDesignVersions(project, [restored.design])); } catch (error) { setErrors([error instanceof Error ? error.message : "Previous revision unavailable."]); }
  };
  const number = (value: number | null) => value === null ? (ru ? "неизвестно" : "unknown") : new Intl.NumberFormat(ru ? "ru-RU" : "en-GB", { maximumFractionDigits: 0 }).format(value);
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby={`${id}-heading`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h2 id={`${id}-heading`} className="text-lg font-semibold text-slate-900">{ru ? "Две концепции и редактируемая модель" : "Two concepts and editable model"}</h2>
        <p className="mt-1 text-sm text-slate-600">{ru ? "Сначала — программы A/B, затем — корпуса одной сохранённой сцены. Площади и экспорт требуют актуальной версии." : "Generate A/B programmes, then edit buildings in one saved scene. Areas and export require the current revision."}</p></div>
      <button type="button" onClick={generate} disabled={!project.aoi || scenarios.length < 2} className={buttonClass}>{ru ? "Создать геометрию A/B" : "Generate A/B geometry"}</button>
    </div>
    {criticalGaps.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-medium">{ru ? "Критические исходные сведения не подтверждены" : "Critical source inputs are unverified"}</p>
      <ul className="mt-2 list-disc space-y-1 break-words pl-5">{criticalGaps.map(gap => <li key={gap.id}>{gap.label}<span className="block text-xs leading-5">{gap.nextAction}</span></li>)}</ul>
      <label className="mt-3 flex items-start gap-2"><input type="checkbox" name="allowUnverifiedDraft" checked={allowDraft} onChange={e => setAllowDraft(e.target.checked)} className="mt-1" /><span>{ru ? "Разрешаю только концептуальный черновик с этими пробелами. Это не подтверждает права, допустимость строительства или полноту исходных данных." : "Allow a conceptual draft with these gaps. This does not confirm rights, development permission or complete source inputs."}</span></label>
      <p className="mt-2 text-xs leading-5">{ru ? "Без согласия генерация заблокирована. Все неизвестные и требования проверки сохраняются; при изменении исходных данных согласие сбрасывается." : "Generation is blocked without consent. Unknowns and review requirements remain; consent resets when source inputs change."}</p>
    </div>}
    {errors.length > 0 && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"><p className="font-medium">{ru ? "Изменение не применено. Последняя корректная сцена сохранена." : "Change was not applied. The last valid scene is preserved."}</p><ul className="mt-2 list-disc space-y-1 break-words pl-5">{errors.slice(0, 10).map((error, i) => <li key={i}>{error}</li>)}</ul></div>}
    <div className="grid gap-3 sm:grid-cols-2">{seeds.map((seed, index) => seed && <div key={seed.scenarioId} className="min-w-0 rounded-xl border border-slate-200 p-3">
      <p className="break-words text-sm font-semibold text-slate-800">{scenarios[index].label}</p>
      <p className="mt-1 break-words text-xs leading-5 text-slate-600">{seed.program.summary}</p>
      <p className="mt-2 text-xs text-slate-600">{seed.program.blockCount} {ru ? "корпусов" : "buildings"} · {seed.program.levelsMin}–{seed.program.levelsMax} {ru ? "этажей" : "floors"} · {ru ? "целевое покрытие" : "target coverage"} {seed.program.targetSiteCoveragePct}%</p>
      <p className="mt-1 break-words text-xs text-slate-500">{seed.program.useMix.map(item => `${useLabel(item.use)} ${item.sharePct}%`).join(" · ")}</p>
    </div>)}</div>
    <details className="rounded-lg border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-800">{ru ? "Сохраняемые объекты и зоны исключения" : "Retained objects and exclusion zones"}</summary>
      <p className="mt-2 text-xs text-slate-600">{ru ? "Выбор явный. Назначение — введённое допущение; пустая этажность или высота остаётся неизвестной. Контуры и ограничения не удаляются для подбора результата." : "Select explicitly. Use is a user assumption; blank floors or height remain unknown. Constraints are never removed to make a design fit."}</p>
      <div className="mt-3 space-y-3">
        {retainedObjects.length === 0 && <p className="text-sm text-slate-500">{ru ? "Контуры существующих зданий не переданы." : "No existing building footprints supplied."}</p>}
        {retainedObjects.map(object => { const value = retainedSetting(object.id); return <div key={object.id} className="rounded-lg bg-slate-50 p-3">
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={value.selected} onChange={e => changeRetained(object.id, "selected", e.target.checked)} className="mt-1" /><span className="break-words">{object.label}</span></label>
          {value.selected && <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="text-xs">{ru ? "Предполагаемое назначение" : "Assumed use"}<select className={inputClass} value={value.use} onChange={e => changeRetained(object.id, "use", e.target.value)}><option value="">{ru ? "Выберите" : "Choose"}</option>{Object.keys(COLORS).filter(use => use !== "open_space").map(use => <option key={use} value={use}>{useLabel(use)}</option>)}</select></label>
            <label className="text-xs">{ru ? "Этажи, если известны" : "Floors, if known"}<input type="number" min="1" max="80" step="1" className={inputClass} value={value.levels} onChange={e => changeRetained(object.id, "levels", e.target.value)} /></label>
            <label className="text-xs">{ru ? "Высота, м, если известна" : "Height, m, if known"}<input type="number" min="0.1" max="480" step="0.1" className={inputClass} value={value.height} onChange={e => changeRetained(object.id, "height", e.target.value)} /></label>
          </div>}
        </div>; })}
        {project.constraints.map(constraint => <label key={constraint.id} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={exclusionSelected(constraint.id)} onChange={e => setExclusions(previous => ({ ...previous, [constraint.id]: e.target.checked }))} /><span className="break-words">{constraint.label}<span className="block text-xs text-slate-500">{constraint.status} · {constraint.geometry?.type ?? (ru ? "геометрия неизвестна" : "geometry unknown")}</span></span></label>)}
      </div>
    </details>
    <div className="flex flex-wrap gap-2" role="group" aria-label={ru ? "Вариант концепции" : "Concept variant"}>
      {scenarios.map((scenario, index) => <button type="button" key={scenario.id} className={`${buttonClass} ${active?.scenarioId === scenario.id ? "border-blue-700 bg-blue-50" : ""}`} aria-pressed={active?.scenarioId === scenario.id} disabled={!latest[index]} onClick={() => { setErrors([]); setSelectedId(""); onChange({ ...project, activeDesignVersionId: latest[index]!.id }); }}>{scenario.label}</button>)}
    </div>
    {!active ? <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">{ru ? "Есть черновые программы. Каноническая геометрия ещё не создана; пустые корпуса не считаются результатом." : "Draft programmes exist. Canonical geometry has not been generated; empty buildings are not a design result."}</div> : <>
      <div className="grid gap-4 lg:grid-cols-2">
        <DesignScenePreview design={active} locale={locale} />
        <div className="min-w-0 space-y-3">
          <label className="block text-sm font-medium">{ru ? "Выбранный корпус" : "Selected building"}<select className={inputClass} value={selected?.id ?? ""} onChange={e => { setSelectedId(e.target.value); setErrors([]); }}>{active.scene.buildings.map(building => <option key={building.id} value={building.id}>{building.label}{building.retained ? (ru ? " · сохраняемый" : " · retained") : ""}</option>)}</select></label>
          {selected && !selected.retained ? <form key={`${active.id}:${selected.id}`} onSubmit={edit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">{ru ? "Всего этажей" : "Total floors"}<input name="levels" type="number" min="1" max="80" step="1" required defaultValue={selected.levels ?? ""} className={inputClass} /></label>
              <label className="text-xs">{ru ? "Высота этажа, м" : "Floor height, m"}<input name="floorHeightM" type="number" min="2" max="6" step="0.1" required defaultValue={selected.floorHeightM ?? ""} className={inputClass} /></label>
              <label className="text-xs">{ru ? "Назначение" : "Use"}<select name="use" defaultValue={selected.use} className={inputClass}>{Object.keys(COLORS).filter(use => use !== "open_space").map(use => <option key={use} value={use}>{useLabel(use)}</option>)}</select></label>
              <label className="text-xs">{ru ? "Терраса верхнего этажа, %" : "Top-floor terrace, %"}<input name="terraceSharePct" type="number" min="0" max="60" step="1" required defaultValue={selected.terraceSharePct} className={inputClass} /></label>
              <label className="text-xs">{ru ? "Сдвиг на восток, м" : "Move east, m"}<input name="eastM" type="number" step="0.1" className={inputClass} placeholder="0" /></label>
              <label className="text-xs">{ru ? "Сдвиг на север, м" : "Move north, m"}<input name="northM" type="number" step="0.1" className={inputClass} placeholder="0" /></label>
            </div>
            <p className="text-xs leading-5 text-slate-500">{ru ? "Терраса исключается из замкнутой площади верхнего этажа. Это геометрическое допущение, не нормативный коэффициент." : "Terrace is excluded from the enclosed top-floor area. This is a geometry assumption, not a regulatory coefficient."}</p>
            <div className="flex flex-wrap gap-2"><button type="submit" className={buttonClass}>{ru ? "Применить к корпусу" : "Apply to building"}</button><button type="button" onClick={undo} disabled={!active.scene.parent} className={buttonClass}>{ru ? "Вернуть предыдущую версию" : "Restore previous revision"}</button></div>
          </form> : <p className="text-sm text-slate-600">{ru ? "Сохраняемый объект не редактируется в этой операции. Измените исходные сведения отдельной версией проекта." : "Retained objects are immutable here. Change source inputs in a new project revision."}</p>}
        </div>
      </div>
      {measurements && <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
        <div><dt className="text-xs text-slate-600">{ru ? "Пятно всех корпусов, м²" : "All building footprints, m²"}</dt><dd className="mt-1 text-lg font-semibold">{number(measurements.footprintAreaSqM)}</dd></div>
        <div><dt className="text-xs text-slate-600">{ru ? "Замкнутая площадь этажей, м²" : "Enclosed floor area, m²"}</dt><dd className="mt-1 text-lg font-semibold">{number(measurements.grossFloorAreaSqM)}</dd></div>
        <div><dt className="text-xs text-slate-600">{ru ? "Террасы отдельно, м²" : "Terraces separately, m²"}</dt><dd className="mt-1 text-lg font-semibold">{number(measurements.terraceAreaSqM)}</dd></div>
      </dl>}
      <p className="break-words text-xs leading-5 text-slate-500">{ru ? "Версия геометрии" : "Geometry revision"}: {active.scene.geometryRevision} · {ru ? "расчётная аппроксимация; не зарегистрированная или продаваемая площадь" : "screening approximation; not registered or saleable area"}.</p>
    </>}
    <p className="text-xs leading-5 text-slate-600">{project.caveat}</p>
  </section>;
}
export function DevkitDesignPanel(props: DevkitDesignPanelProps) {
  return <DesignPanelContent key={`${props.project.id}:${props.project.inputRevision}`} {...props} />;
}
export const DesignPanel = DevkitDesignPanel;
