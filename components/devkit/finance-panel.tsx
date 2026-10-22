"use client";

import { useMemo, useState } from "react";
import type { AreaAllocation, AreaScheduleResult } from "../../src/lib/devkit/areas";
import { buildAreaScheduleFromMeasurement, calculationVersion, parseAreaScheduleResult, toAreaArtifact } from "../../src/lib/devkit/areas";
import type { DerivedArtifact, DevkitProject, VersionRef } from "../../src/lib/devkit/contracts";
import { FINANCE_FIELDS, makeSyntheticFinanceFixture, parseMonthlyFinanceResult, runFinanceSensitivity, runMonthlyFinance, toFinanceArtifact } from "../../src/lib/devkit/finance";
import type { FinanceAssumptions, FinanceField, MonthlyFinanceInput, MonthlyFinanceRow } from "../../src/lib/devkit/finance";

import { measureDesignScene } from "../../src/lib/devkit/design";
import type { DesignScene } from "../../src/lib/devkit/design";

type Props = {
  areas: AreaScheduleResult | null; input: MonthlyFinanceInput | null; locale?: "en" | "ru";
  currentGeometryVersion?: string;
  onInputChange?: (input: MonthlyFinanceInput) => void;
};
const words = {
  en: { title: "Monthly scenario finance", unknown: "Unknown", synthetic: "Synthetic arithmetic example — no market inputs or real-site valuation", manual: "User-provided assumptions — professional review required", noInput: "Select an area schedule and enter explicit monthly assumptions.", area: "Area bridge", gross: "Enclosed gross", saleable: "Saleable equivalent", registered: "Registered", permitted: "Permitted GFA", status: "Calculation status", stale: "Inputs changed. Recalculate and save a new finance revision before using these figures.", conditional: "Conditional scenario · F1 maximum · not an investment decision", metrics: "Scenario outputs", project: "Project NPV", equity: "Equity NPV", projectIrr: "Project IRR, effective annual", equityIrr: "Equity IRR, effective annual", gap: "Peak cash shortfall", debt: "Peak debt", ceiling: "Conditional land ceiling, project NPV=0", calendar: "Monthly cash ledger", cash: "Available cash", restricted: "Escrow balance", projectCf: "Project CF", equityCf: "Equity CF", interest: "Interest paid", month: "Month", sensitivity: "Explicit sensitivity", incomeFactor: "Buyer receipt multiplier", costFactor: "Construction multiplier", delay: "Income delay, months", stress: "Stress scenario", assumptions: "Assumptions and definitions", missing: "Missing inputs", errors: "Calculation errors", edit: "Edit manual monthly inputs", amount: "Amount", currency: "Currency", discount: "Effective annual project discount rate (decimal)", tax: "Tax basis", financial: "Funding feasible", limit: "Debt limit satisfied", yes: "Yes, for entered schedule", no: "No", noMarket: "Sensitivity is a manual scenario, not a market forecast; funding schedules remain unchanged." },
  ru: { title: "Помесячная сценарная экономика", unknown: "Неизвестно", synthetic: "Синтетический расчётный пример — без рыночных данных и оценки реального участка", manual: "Ручные допущения — требуется профессиональная проверка", noInput: "Выберите ведомость площадей и задайте явные помесячные допущения.", area: "Ведомость площадей", gross: "Закрытая общая площадь", saleable: "Продаваемый эквивалент", registered: "Зарегистрированная", permitted: "Разрешённая GFA", status: "Статус расчёта", stale: "Входы изменены. Пересчитайте и сохраните новую финансовую версию перед использованием цифр.", conditional: "Условный сценарий · не выше F1 · не инвестиционное решение", metrics: "Результаты сценария", project: "NPV проекта", equity: "NPV собственного капитала", projectIrr: "IRR проекта, эффективная годовая", equityIrr: "Equity IRR, эффективная годовая", gap: "Максимальный кассовый разрыв", debt: "Пиковый долг", ceiling: "Условный предел земли при NPV проекта=0", calendar: "Помесячный денежный журнал", cash: "Доступные деньги", restricted: "Остаток эскроу", projectCf: "Поток проекта", equityCf: "Поток equity", interest: "Проценты уплачены", month: "Месяц", sensitivity: "Явная чувствительность", incomeFactor: "Множитель поступлений покупателей", costFactor: "Множитель строительства", delay: "Задержка поступлений, месяцев", stress: "Стресс-сценарий", assumptions: "Допущения и определения", missing: "Неизвестные входы", errors: "Ошибки расчёта", edit: "Ручные помесячные входы", amount: "Сумма", currency: "Валюта", discount: "Эффективная годовая ставка проекта (доля)", tax: "Налоговая база", financial: "Достаточность финансирования", limit: "Соблюдение лимита долга", yes: "Да, для введённого графика", no: "Нет", noMarket: "Чувствительность — ручной сценарий, не рыночный прогноз; график финансирования неизменен." }
};
const rowLabels: Record<FinanceField, [string, string]> = {
  land: ["Land / rights", "Земля / права"], construction: ["Construction", "Строительство"], otherProjectCost: ["Other project costs", "Иные затраты проекта"], tax: ["Tax payments", "Налоги"], unrestrictedIncome: ["Unrestricted buyer receipts", "Свободные поступления покупателей"], escrowDeposit: ["Buyer escrow deposits", "Поступления покупателей в эскроу"], escrowRelease: ["Escrow releases", "Раскрытие эскроу"], debtDraw: ["Debt draw", "Привлечение долга"], debtRepay: ["Debt repayment", "Погашение долга"], equityContribution: ["Equity contribution", "Взнос equity"], equityDistribution: ["Equity distribution", "Выплата equity"], financingFee: ["Financing fees", "Комиссии финансирования"]
};
const panel = "rounded-xl border border-slate-200 bg-white p-4 text-slate-800";
const control = "w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export function FinancePanel({ areas, input, locale = "en", currentGeometryVersion, onInputChange }: Props) {
  const t = words[locale], [income, setIncome] = useState("1"), [cost, setCost] = useState("1"), [delay, setDelay] = useState("0");
  const result = useMemo(() => areas && input ? runMonthlyFinance(input, areas, currentGeometryVersion) : null, [areas, input, currentGeometryVersion]);
  const stress = useMemo(() => areas && input ? runFinanceSensitivity(input, areas, [{ id: "manual-ui-stress", incomeMultiplier: income.trim() ? Number(income) : NaN, constructionMultiplier: cost.trim() ? Number(cost) : NaN, incomeDelayMonths: delay.trim() ? Number(delay) : NaN }], currentGeometryVersion)[0] : null, [areas, input, income, cost, delay, currentGeometryVersion]);
  if (!result || !input || !areas) return <section className={panel}><h2 className="font-semibold">{t.title}</h2><p className="mt-2 text-sm">{t.noInput}</p></section>;
  const format = (value: number | null, percent = false) => value === null || !Number.isFinite(value) ? t.unknown : new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2, ...(percent ? { style: "percent" as const } : {}) }).format(value);
  const updateAmount = (period: number, field: FinanceField, raw: string) => {
    if (!onInputChange) return;
    const value = raw.trim() === "" ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) return;
    onInputChange({ ...input, assumptions: { ...input.assumptions, version: `${input.assumptions.version}:manual-edit` }, rows: input.rows.map((row, i) => i === period ? { ...row, [field]: value } : row) });
  };
  const m = result.metrics;
  const metricItems: [string, number | null, boolean?][] = [[t.project, m.projectNpv], [t.equity, m.equityNpv], [t.projectIrr, m.projectIrr.annualEffective, true], [t.equityIrr, m.equityIrr.annualEffective, true], [t.gap, m.peakCashShortfall], [t.debt, m.peakDebt], [t.ceiling, m.conditionalProjectLandCeiling]];
  return <section className={`${panel} space-y-4`} aria-label={t.title}>
    <div><h2 className="text-lg font-semibold">{t.title}</h2><p className="mt-1 text-sm text-amber-800">{input.assumptions.provenance === "synthetic" ? t.synthetic : t.manual}</p><p className="mt-1 text-xs text-slate-600">{t.conditional}</p></div>
    <p className="break-words text-xs">{t.status}: <strong>{result.status}</strong> · {input.assumptions.currency} · {input.assumptions.priceBasis} · {input.startMonth} · {result.rows.length} {locale === "ru" ? "мес." : "months"} · {result.version}</p>
    {result.status === "stale" && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t.stale}</p>}
    <div><h3 className="font-medium">{t.area} · m²</h3><dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{([[t.gross, areas.totals.enclosedGrossM2], [t.saleable, areas.totals.saleableEquivalentM2], [t.registered, areas.totals.registeredM2], [t.permitted, areas.totals.permittedGfaM2]] as [string, number | null][]).map(([label, value]) => <div key={label}><dt className="text-slate-600">{label}</dt><dd className="font-medium">{format(value)}</dd></div>)}</dl></div>
    <div><h3 className="font-medium">{t.metrics} · {input.assumptions.currency}</h3><dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{metricItems.map(([label, value, percent]) => <div className="min-w-0 rounded-lg bg-slate-50 p-3" key={label}><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 break-words font-semibold">{format(value, percent)}</dd></div>)}</dl><p className="mt-2 text-sm">{t.financial}: <strong>{m.fundingFeasible === null ? t.unknown : m.fundingFeasible ? t.yes : t.no}</strong></p><p className="mt-1 text-sm">{t.limit}: <strong>{m.debtLimitSatisfied === null ? t.unknown : m.debtLimitSatisfied ? t.yes : t.no}</strong> ({format(input.assumptions.debtLimit)} {input.assumptions.currency})</p><p className="mt-1 break-words text-xs text-slate-600">IRR: project={m.projectIrr.status}; equity={m.equityIrr.status}; {locale === "ru" ? "месячные границы" : "monthly bounds"} [{m.projectIrr.boundsMonthly.join(", ")}].</p></div>
    <div><h3 className="font-medium">{t.calendar} · {input.assumptions.currency}</h3><div className="mt-2 overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} role="region" aria-label={t.calendar}><table className="w-full min-w-[760px] text-right text-xs"><thead className="bg-slate-50"><tr>{[t.month, t.projectCf, t.equityCf, t.interest, t.cash, t.debt, t.restricted, t.gap].map(label => <th scope="col" className="px-3 py-2" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(row => <tr key={row.period} className="border-t border-slate-100"><th scope="row" className="whitespace-nowrap px-3 py-2 font-normal">{row.month}</th>{[row.projectCashFlow, row.equityCashFlow, row.interestPaid, row.availableCash, row.debtBalance, row.escrowBalance, row.cashShortfall].map((value, i) => <td className="px-3 py-2" key={i}>{format(value)}</td>)}</tr>)}</tbody></table></div></div>
    <div><h3 className="font-medium">{t.sensitivity}</h3><div className="mt-2 grid gap-3 sm:grid-cols-3">{[[t.incomeFactor, income, setIncome], [t.costFactor, cost, setCost], [t.delay, delay, setDelay]].map(([label, value, setter]) => <label className="min-w-0 text-xs" key={label as string}>{label as string}<input className={`${control} mt-1`} type="number" min="0" step={label === t.delay ? "1" : "0.05"} value={value as string} onChange={event => (setter as (v: string) => void)(event.target.value)} /></label>)}</div><p className="mt-2 text-xs text-slate-600">{t.noMarket}</p><p aria-live="polite" className="mt-2 text-sm">{t.stress}: {stress?.error ?? stress?.result?.status ?? t.unknown} · {t.gap}: {format(stress?.result?.metrics.peakCashShortfall ?? null)} {input.assumptions.currency} · {t.project}: {format(stress?.result?.metrics.projectNpv ?? null)}</p></div>
    {onInputChange && <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-medium">{t.edit}</summary><p className="my-2 text-xs text-slate-600">{t.unknown} = {locale === "ru" ? "пустое поле; явный ноль вводится как 0" : "blank field; an explicit zero is entered as 0"}.</p>{input.rows.map((row, period) => <fieldset key={period} className="mt-3 border-t border-slate-100 pt-3"><legend className="text-xs font-semibold">{result.rows[period]?.month}</legend><div className="grid gap-2 sm:grid-cols-3">{FINANCE_FIELDS.map(field => <label key={field} className="text-xs">{rowLabels[field][locale === "ru" ? 1 : 0]}<input className={`${control} mt-1`} type="number" min="0" step="any" value={row[field] ?? ""} onChange={event => updateAmount(period, field, event.target.value)} /></label>)}</div></fieldset>)}</details>}
    <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-medium">{t.assumptions}</summary><dl className="mt-2 space-y-2 break-words text-xs"><div><dt>{t.tax}</dt><dd>{input.assumptions.taxBasis}</dd></div><div><dt>{t.discount}</dt><dd>{format(input.assumptions.projectAnnualDiscountRate)}</dd></div><div><dt>Source / reviewer / valid at</dt><dd>{input.assumptions.sourceRefs.join(", ") || t.unknown} / {input.assumptions.reviewer ?? t.unknown} / {input.assumptions.validAt ?? t.unknown}</dd></div></dl><ul className="mt-3 list-disc space-y-1 pl-5 text-xs">{[...result.conventions, ...input.assumptions.notes, areas.input.methodology].map((note, i) => <li className="break-words" key={i}>{note}</li>)}</ul></details>
    {(result.errors.length > 0 || result.missingInputs.length > 0) && <details className="rounded-lg bg-amber-50 p-3" open={result.errors.length > 0}><summary className="cursor-pointer text-sm">{t.errors}: {result.errors.length} · {t.missing}: {result.missingInputs.length}</summary><ul className="mt-2 list-disc space-y-1 break-words pl-5 text-xs">{[...result.errors, ...result.missingInputs].map(item => <li key={item}>{item}</li>)}</ul></details>}
    <p className="border-t border-slate-200 pt-3 text-xs text-slate-600">{result.caveat}</p>
  </section>;
}
export const DevkitFinancePanel = FinancePanel;


type Mutation = { ok: true; project: DevkitProject } | { ok: false; errors: string[] };
type ScenarioSetup = { currency: FinanceAssumptions["currency"]; startMonth: string; periods: number; createdAt: string };
const allocationFields = ["belowGroundGrossM2", "commonM2", "technicalM2", "parkingM2", "otherNonSaleableM2", "terraceSaleableFactor", "registeredM2", "permittedGfaM2"] as const;
const allocationLabels = {
  belowGroundGrossM2: ["Underground gross m²", "Подземная общая, м²"], commonM2: ["Common space m²", "Общие зоны, м²"], technicalM2: ["Technical space m²", "Технические зоны, м²"], parkingM2: ["Parking m²", "Паркинг, м²"], otherNonSaleableM2: ["Other non-saleable m²", "Прочая непродаваемая, м²"], terraceSaleableFactor: ["Terrace saleable factor, 0…1", "Коэффициент террас, 0…1"], registeredM2: ["Registered area m²", "Зарегистрированная, м²"], permittedGfaM2: ["Permitted GFA m²", "Разрешённая GFA, м²"]
};
function activeMeasurement(project: DevkitProject) {
  const design = project.designVersions.find(d => d.id === project.activeDesignVersionId);
  if (!design || design.inputRevision !== project.inputRevision || design.aoiId !== project.aoi?.id || design.aoiRevision !== project.aoi?.revision) throw new Error("Create a current canonical design before preparing areas.");
  return measureDesignScene(design as DesignScene);
}
function sameVersionRef(actual: VersionRef, expected: VersionRef): boolean {
  return actual?.kind === expected.kind && actual.id === expected.id && actual.revision === expected.revision;
}
function areaMatchesContext(project: DevkitProject, artifact: DerivedArtifact, areas: AreaScheduleResult, measurement: ReturnType<typeof measureDesignScene>): boolean {
  return artifact.kind === "areas" && artifact.id === areas.id && artifact.inputRevision === project.inputRevision &&
    areas.input.projectId === project.id && areas.input.inputRevision === project.inputRevision &&
    artifact.inputs.length === 1 && sameVersionRef(artifact.inputs[0], measurement.designRef) &&
    sameVersionRef(areas.input.design, measurement.designRef) && areas.input.geometryVersion === measurement.geometryRevision;
}
function appendArtifact(project: DevkitProject, artifact: DerivedArtifact): DevkitProject {
  const invalid = new Set([`${artifact.kind}:${artifact.id}`]);
  const previous = project.derivedArtifacts.map(a => {
    if (a.kind === artifact.kind) return { ...a, status: a.id === artifact.id && a.revision < artifact.revision && a.status === "current" ? "stale" as const : a.status };
    if (a.inputs.some(ref => invalid.has(`${ref.kind}:${ref.id}`))) { invalid.add(`${a.kind}:${a.id}`); return { ...a, status: "stale" as const }; }
    return { ...a };
  });
  // A kit may precede its finance entry in the saved array; resolve all descendants.
  for (let i = 0; i < previous.length; i++) for (const a of previous) if (a.kind !== artifact.kind && a.inputs.some(ref => invalid.has(`${ref.kind}:${ref.id}`))) { a.status = "stale"; invalid.add(`${a.kind}:${a.id}`); }
  return { ...project, updatedAt: artifact.createdAt, derivedArtifacts: [...previous, artifact] };
}
function nextArtifactRevision(project: DevkitProject, kind: DerivedArtifact["kind"], id: string) {
  return 1 + Math.max(0, ...project.derivedArtifacts.filter(a => a.kind === kind && a.id === id).map(a => a.revision));
}
export function prepareProjectAreaSchedule(project: DevkitProject, allocations: Record<string, AreaAllocation>, options: { createdAt: string; synthetic?: boolean }): Mutation {
  try {
    if (options.synthetic && project.dataClass !== "synthetic_demo") return { ok: false, errors: ["Synthetic example is available only for an explicitly synthetic project."] };
    const measurement = activeMeasurement(project);
    const areas = buildAreaScheduleFromMeasurement(measurement, {
      projectId: project.id, snapshotId: `${project.id}:input-${project.inputRevision}`, inputRevision: project.inputRevision,
      assumptionsVersion: `allocation-${calculationVersion(allocations)}`, jurisdiction: project.brief.marketKey,
      methodology: options.synthetic ? "EXPLICIT SYNTHETIC: common20% of measured indoor gross, technical10%, underground/parking/other0; residual saleable only for non-civic uses, terrace factor0.5 for those uses; registered/permitted unknown. Not authority definitions." : "User-entered allocation of measured canonical scene. Blank quantities remain unknown. Residual saleability and terrace coefficient are explicit assumptions; registered/permitted values are not inferred.",
      provenance: options.synthetic ? "synthetic" : "derived_geometry", sourceRefs: [`design:${measurement.designRef.id}@${measurement.designRef.revision}`], reviewer: null
    }, allocations);
    if (areas.status === "blocked") return { ok: false, errors: areas.errors };
    const artifact = toAreaArtifact(areas, { revision: nextArtifactRevision(project, "areas", areas.id), createdAt: options.createdAt });
    return { ok: true, project: appendArtifact(project, artifact) };
  } catch (error) { return { ok: false, errors: [error instanceof Error ? error.message : "Area preparation failed."] }; }
}
function selectedAreas(project: DevkitProject) {
  const measurement = activeMeasurement(project);
  const artifact = project.derivedArtifacts.filter(a => a.kind === "areas" && a.inputs.some(ref => ref.kind === "design" && ref.id === measurement.designRef.id && ref.revision === measurement.designRef.revision)).sort((a, b) => b.revision - a.revision)[0];
  const areas = artifact && parseAreaScheduleResult(artifact.data);
  if (!artifact || !areas || !areaMatchesContext(project, artifact, areas, measurement) || artifact.status === "stale" || artifact.status === "blocked") throw new Error("Prepare a current area schedule before creating finance.");
  return { artifact, areas, measurement };
}
export function saveProjectMonthlyFinance(project: DevkitProject, input: MonthlyFinanceInput, createdAt: string): Mutation {
  try {
    const { areas, artifact: areaArtifact, measurement } = selectedAreas(project);
    if (input.areaRef.id !== areaArtifact.id || input.areaRef.revision !== areaArtifact.revision) return { ok: false, errors: ["Finance must reference the latest selected area revision."] };
    const result = runMonthlyFinance(input, areas, measurement.geometryRevision);
    if (result.status === "stale" || result.status === "blocked") return { ok: false, errors: result.errors.length ? result.errors : ["Finance input versions are stale."] };
    const artifact = toFinanceArtifact(result, { revision: nextArtifactRevision(project, "finance", result.id), createdAt });
    return { ok: true, project: appendArtifact(project, artifact) };
  } catch (error) { return { ok: false, errors: [error instanceof Error ? error.message : "Finance save failed."] }; }
}
export function createProjectMonthlyScenario(project: DevkitProject, setup: ScenarioSetup): Mutation {
  try {
    const { areas, artifact } = selectedAreas(project);
    if (!Number.isInteger(setup.periods) || setup.periods < 1 || setup.periods > 120 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(setup.startMonth)) return { ok: false, errors: ["Choose a valid month and 1–120 monthly periods."] };
    const input: MonthlyFinanceInput = {
      projectId: project.id, snapshotId: areas.input.snapshotId, inputRevision: project.inputRevision, areaRef: { kind: "areas", id: artifact.id, revision: artifact.revision }, areaCalculationVersion: areas.version,
      startMonth: setup.startMonth, rows: Array.from({ length: setup.periods }, () => Object.fromEntries(FINANCE_FIELDS.map(field => [field, null])) as MonthlyFinanceRow),
      assumptions: { version: "manual-monthly-input-1", provenance: "user_provided", sourceRefs: [], validAt: null, reviewer: null, currency: setup.currency, priceBasis: "nominal", taxBasis: "Manual tax classification pending; tax payment amounts remain unknown until entered.", notes: ["Manual scenario initialized explicitly. No monetary, tax, interest or funding value has been assumed zero. Price basis nominal; review and edit assumptions before use."], projectAnnualDiscountRate: null, equityAnnualDiscountRate: null, debtAnnualEffectiveRate: null, openingAvailableCash: null, openingDebt: null, openingEscrow: null, debtLimit: null, landPaymentWeights: null }
    };
    return saveProjectMonthlyFinance(project, input, setup.createdAt);
  } catch (error) { return { ok: false, errors: [error instanceof Error ? error.message : "Scenario creation failed."] }; }
}
export function createProjectSyntheticFinanceExample(project: DevkitProject, setup: Omit<ScenarioSetup, "periods">): Mutation {
  try {
    if (project.dataClass !== "synthetic_demo") return { ok: false, errors: ["Synthetic example is available only for an explicitly synthetic project."] };
    const measurement = activeMeasurement(project);
    const allocations = Object.fromEntries(measurement.buildings.map(b => {
      const saleable = b.use !== "civic" && b.use !== "open_space";
      return [b.buildingId, { belowGroundGrossM2: 0, commonM2: b.grossFloorAreaSqM === null ? null : b.grossFloorAreaSqM * 0.2, technicalM2: b.grossFloorAreaSqM === null ? null : b.grossFloorAreaSqM * 0.1, parkingM2: 0, otherNonSaleableM2: 0, residualUse: saleable ? "saleable" : "non_saleable", terraceSaleableFactor: saleable ? 0.5 : 0, registeredM2: null, permittedGfaM2: null } as AreaAllocation];
    }));
    const prepared = prepareProjectAreaSchedule(project, allocations, { createdAt: setup.createdAt, synthetic: true });
    if (!prepared.ok) return prepared;
    const { areas, artifact } = selectedAreas(prepared.project);
    if (areas.totals.saleableEquivalentM2 === null || areas.totals.saleableEquivalentM2 <= 0) return { ok: false, errors: ["A synthetic commercial-receipts example requires known positive saleable area. No revenue is invented for civic/open space."] };
    const input = makeSyntheticFinanceFixture().input;
    const bound: MonthlyFinanceInput = { ...input, projectId: project.id, snapshotId: areas.input.snapshotId, inputRevision: project.inputRevision, areaRef: { kind: "areas", id: artifact.id, revision: artifact.revision }, areaCalculationVersion: areas.version, startMonth: setup.startMonth, assumptions: { ...input.assumptions, currency: setup.currency, version: `explicit-synthetic:${areas.version}`, taxBasis: "Synthetic cash-payment test: tax0 at initialization, not a transaction classification. Edited monthly tax values supersede that initialization amount.", notes: ["INITIAL SYNTHETIC TEMPLATE ONLY; later edited rows are authoritative. 3-month arithmetic example: land100, construction100, buyer receipts260, equity100+50, debt50, financing fee5, equity distribution205, other flows/rates0. No market claim or FX conversion.", "Amounts are fixed arithmetic units in the selected currency, not a price/cost estimate from this concept. Geometry supplies area lineage only; geometry edits require a fresh area/finance revision."] } };
    return saveProjectMonthlyFinance(prepared.project, bound, setup.createdAt);
  } catch (error) { return { ok: false, errors: [error instanceof Error ? error.message : "Synthetic example failed."] }; }
}

const assumptionFields = ["projectAnnualDiscountRate", "equityAnnualDiscountRate", "debtAnnualEffectiveRate", "openingAvailableCash", "openingDebt", "openingEscrow", "debtLimit"] as const;
const assumptionLabels = {
  projectAnnualDiscountRate: ["Project discount, effective annual decimal", "Ставка проекта, эффективная годовая доля"], equityAnnualDiscountRate: ["Equity discount, effective annual decimal", "Ставка equity, эффективная годовая доля"], debtAnnualEffectiveRate: ["Debt rate, effective annual decimal", "Ставка долга, эффективная годовая доля"], openingAvailableCash: ["Opening available cash", "Доступные деньги на начало"], openingDebt: ["Opening debt", "Долг на начало"], openingEscrow: ["Opening escrow", "Эскроу на начало"], debtLimit: ["Debt limit", "Лимит долга"]
};
function blankAllocations(measurement: ReturnType<typeof measureDesignScene> | null, areas: AreaScheduleResult | null): Record<string, AreaAllocation> {
  return Object.fromEntries((measurement?.buildings ?? []).map(b => {
    const previous = areas?.buildings.find(row => row.id === b.buildingId);
    return [b.buildingId, { ...Object.fromEntries(allocationFields.map(field => [field, previous?.[field] ?? null])), residualUse: previous?.residualUse ?? "unknown" } as AreaAllocation];
  }));
}

/** Explicit creation/editor slot; parent still owns persistent project Save. */
export function DevkitFinanceProjectPanel({ project, onChange, locale = "en" }: { project: DevkitProject; onChange?: (project: DevkitProject) => void; locale?: "en" | "ru" }) {
  const design = project.designVersions.find(d => d.id === project.activeDesignVersionId);
  return <FinanceProjectWorkspace key={`${project.id}:${project.inputRevision}:${design?.id}:${design?.revision}`} project={project} onChange={onChange} locale={locale} />;
}
function FinanceProjectWorkspace({ project, onChange, locale }: { project: DevkitProject; onChange?: (project: DevkitProject) => void; locale: "en" | "ru" }) {
  const ru = locale === "ru", t = words[locale], index = ru ? 1 : 0;
  const measured = useMemo(() => { try { return { measurement: activeMeasurement(project), error: null }; } catch (error) { return { measurement: null, error: error instanceof Error ? error.message : "Canonical scene unavailable." }; } }, [project]);
  const measurement = measured.measurement;
  const areaArtifact = project.derivedArtifacts.filter(a => a.kind === "areas" && a.inputs.some(ref => ref.kind === "design" && ref.id === measurement?.designRef.id && ref.revision === measurement?.designRef.revision)).sort((a, b) => b.revision - a.revision)[0];
  const areas = useMemo(() => {
    const parsed = areaArtifact ? parseAreaScheduleResult(areaArtifact.data) : null;
    return areaArtifact && parsed && measurement && areaMatchesContext(project, areaArtifact, parsed, measurement) ? parsed : null;
  }, [areaArtifact, measurement, project]);
  const financeArtifact = areaArtifact ? project.derivedArtifacts.filter(a => a.kind === "finance" && a.inputs.some(ref => ref.kind === "areas" && ref.id === areaArtifact.id && ref.revision === areaArtifact.revision)).sort((a, b) => b.revision - a.revision)[0] : undefined;
  const geometry = measurement && areaArtifact?.status !== "stale" && financeArtifact?.status !== "stale" ? measurement.geometryRevision : "geometry_or_source_inputs_unavailable";
  const saved = useMemo(() => {
    if (!financeArtifact || !areas || !areaArtifact) return null;
    const parsed = parseMonthlyFinanceResult(financeArtifact.data, areas, geometry);
    const expected: VersionRef = { kind: "areas", id: areaArtifact.id, revision: areaArtifact.revision };
    return parsed && financeArtifact.inputRevision === project.inputRevision && parsed.input.projectId === project.id &&
      financeArtifact.inputs.length === 1 && sameVersionRef(financeArtifact.inputs[0], expected) &&
      sameVersionRef(parsed.input.areaRef, expected) ? parsed : null;
  }, [financeArtifact, areas, areaArtifact, geometry, project]);
  const areaKey = `${areaArtifact?.id}:${areaArtifact?.revision}:${areas?.version}:${areaArtifact?.status}`;
  const financeKey = `${areaKey}:${financeArtifact?.id}:${financeArtifact?.revision}:${saved?.version}`;
  const [allocationDraft, setAllocationDraft] = useState<{ key: string; values: Record<string, AreaAllocation> }>(() => ({ key: areaKey, values: blankAllocations(measurement, areas) }));
  const allocations = allocationDraft.key === areaKey ? allocationDraft.values : blankAllocations(measurement, areas);
  const [financeDraft, setFinanceDraft] = useState<{ key: string; input: MonthlyFinanceInput | null }>(() => ({ key: financeKey, input: saved?.input ?? null }));
  const input = financeDraft.key === financeKey ? financeDraft.input : saved?.input ?? null;
  const hasUnsavedFinance = !!input && calculationVersion(input) !== calculationVersion(saved?.input);
  const [currency, setCurrency] = useState<FinanceAssumptions["currency"]>(project.brief.budget.currency);
  const [startMonth, setStartMonth] = useState("2026-10"), [periods, setPeriods] = useState("3"), [notice, setNotice] = useState<string[]>([]);
  const commit = (result: Mutation) => {
    if (!result.ok) { setNotice(result.errors); return; }
    if (!onChange) return;
    onChange(result.project);
    setNotice([ru ? "Добавлено в текущий проект. Для сохранения на устройстве нажмите «Сохранить» в workflow." : "Added to the current project. Use workflow Save to persist on this device."]);
  };
  const updateInput = (next: MonthlyFinanceInput) => setFinanceDraft({ key: financeKey, input: next });
  const button = "rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300";
  return <div className="min-w-0 space-y-4">
    <section className={`${panel} space-y-3`} aria-label={ru ? "Создание площадей и экономики" : "Create areas and finance"}>
      <h2 className="text-lg font-semibold">{ru ? "Подготовить площади и месячный сценарий" : "Prepare areas and a monthly scenario"}</h2>
      <p className="text-sm text-slate-600">{ru ? "Площади берутся из активной канонической сцены. Пустое поле — неизвестно; ноль и доля продаваемой площади вводятся явно. Все результаты условные, без профессиональной приёмки." : "Areas come from the active canonical scene. Blank means unknown; zero and saleability are explicit inputs. All results are conditional, without professional acceptance."}</p>
      {!onChange && <p className="text-sm text-amber-800">{ru ? "Просмотр: изменение проекта не подключено." : "Read-only: project editing is not connected."}</p>}
      {!measurement && <p role="status" className="text-sm text-amber-800">{ru ? "Сначала создайте актуальную каноническую концепцию в разделе Create." : "Create a current canonical concept in Create first."} <span className="break-words text-xs">{measured.error}</span></p>}
      {measurement && <details className="rounded-lg border border-slate-200 p-3" open={!areas}>
        <summary className="cursor-pointer text-sm font-semibold">{ru ? "1. Ручные распределения площадей" : "1. Manual area allocations"}</summary>
        {measurement.buildings.map(b => <fieldset className="mt-3 border-t border-slate-200 pt-3" key={b.buildingId}>
          <legend className="max-w-full break-words text-sm font-medium">{b.buildingId} · {b.use}</legend>
          <p className="mb-2 text-xs">{t.gross}: {b.grossFloorAreaSqM === null ? t.unknown : b.grossFloorAreaSqM.toFixed(2)} m² · {ru ? "Террасы" : "Terraces"}: {b.terraceAreaSqM === null ? t.unknown : b.terraceAreaSqM.toFixed(2)} m²</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{allocationFields.map(field => <label className="min-w-0 text-xs" key={field}>{allocationLabels[field][index]}<input className={`${control} mt-1`} type="number" min="0" max={field === "terraceSaleableFactor" ? "1" : undefined} step="any" value={allocations[b.buildingId]?.[field] ?? ""} onChange={event => { const raw = event.target.value; const value = raw.trim() ? Number(raw) : null; if (value !== null && (!Number.isFinite(value) || value < 0)) return; setAllocationDraft({ key: areaKey, values: { ...allocations, [b.buildingId]: { ...allocations[b.buildingId], [field]: value } } }); }} /></label>)}
            <label className="text-xs">{ru ? "Остаток закрытой площади" : "Residual enclosed space"}<select className={`${control} mt-1`} value={allocations[b.buildingId]?.residualUse ?? "unknown"} onChange={event => setAllocationDraft({ key: areaKey, values: { ...allocations, [b.buildingId]: { ...allocations[b.buildingId], residualUse: event.target.value as AreaAllocation["residualUse"] } } })}><option value="unknown">{t.unknown}</option><option value="saleable">{ru ? "Продаваемый — ручное допущение" : "Saleable — manual assumption"}</option><option value="non_saleable">{ru ? "Непродаваемый" : "Non-saleable"}</option></select></label>
          </div>
        </fieldset>)}
        <button className={`${button} mt-3`} disabled={!onChange || hasUnsavedFinance} type="button" onClick={() => commit(prepareProjectAreaSchedule(project, allocations, { createdAt: new Date().toISOString() }))}>{ru ? "Подготовить ведомость площадей" : "Prepare area schedule"}</button>
      </details>}
      {areas && <p className="text-sm">{t.area}: <strong>{areas.status}</strong> · {t.saleable}: {areas.totals.saleableEquivalentM2 === null ? t.unknown : areas.totals.saleableEquivalentM2.toFixed(2)} m² · {t.missing}: {areas.missingInputs.length}</p>}
      <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs">{t.currency}<select className={`${control} mt-1`} value={currency} onChange={event => setCurrency(event.target.value as FinanceAssumptions["currency"])}>{["AED", "RUB", "USD"].map(value => <option key={value}>{value}</option>)}</select></label><label className="text-xs">{ru ? "Первый месяц" : "First month"}<input className={`${control} mt-1`} type="month" value={startMonth} onChange={event => setStartMonth(event.target.value)} /></label><label className="text-xs">{ru ? "Число месяцев, 1–120" : "Months, 1–120"}<input className={`${control} mt-1`} type="number" min="1" max="120" step="1" value={periods} onChange={event => setPeriods(event.target.value)} /></label></div>
      <button className={button} disabled={!onChange || hasUnsavedFinance || !measurement || !areas || areaArtifact?.status === "stale"} type="button" onClick={() => commit(createProjectMonthlyScenario(project, { currency, startMonth, periods: Number(periods), createdAt: new Date().toISOString() }))}>{ru ? "2. Создать месячный сценарий с неизвестными входами" : "2. Create monthly scenario with unknown inputs"}</button>
      {project.dataClass === "synthetic_demo" && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs text-amber-900">{ru ? "Только учебный пример: общие зоны20%, технические10%, подземная/паркинг/прочие0; продаваемый остаток только у коммерческих функций, террасы×0,5. Земля100, стройка100, поступления260, equity100+50, долг50, комиссия5, выплата205, прочие потоки/ставки0. Цифры — условные единицы выбранной валюты, не оценка этой концепции. Разрешённая и зарегистрированная площади неизвестны." : "Educational only: common20%, technical10%, underground/parking/other0; saleable residual only for commercial uses, terraces×0.5. Land100, construction100, receipts260, equity100+50, debt50, fee5, distribution205, other flows/rates0. Fixed arithmetic units in the chosen currency, not an estimate of this concept. Registered/permitted areas unknown."}</p>
        <button className={`${button} mt-3`} disabled={!onChange || hasUnsavedFinance || !measurement} type="button" onClick={() => commit(createProjectSyntheticFinanceExample(project, { currency, startMonth, createdAt: new Date().toISOString() }))}>{ru ? "Применить эти синтетические допущения и создать 3 месяца" : "Apply these synthetic assumptions and create 3 months"}</button>
      </div>}
      {hasUnsavedFinance && <div className="rounded-lg bg-amber-50 p-3 text-sm"><p>{ru ? "Есть несохранённые месячные правки. Сохраните их перед созданием новой ведомости или сценария." : "Monthly edits are not saved. Save them before replacing the area schedule or scenario."}</p><button className="mt-2 rounded-md border border-slate-400 px-3 py-2 text-sm" type="button" onClick={() => setFinanceDraft({ key: financeKey, input: saved?.input ?? null })}>{ru ? "Отменить несохранённые правки" : "Discard unsaved edits"}</button></div>}
      {notice.length > 0 && <ul role="status" className="list-disc space-y-1 break-words pl-5 text-sm text-amber-900">{notice.map((message, i) => <li key={i}>{message}</li>)}</ul>}
    </section>
    {input && <section className={`${panel} space-y-3`} aria-label={ru ? "Редактор допущений" : "Assumption editor"}>
      <h3 className="font-semibold">{ru ? "Допущения месячного сценария" : "Monthly scenario assumptions"} · {input.assumptions.currency}</h3>
      <p className="text-xs text-slate-600">{ru ? "Пустое поле сохраняется как неизвестное. Доли годовых ставок вводятся десятичным числом: 0,1 означает10%, не месячную ставку. Конвертация валюты не выполняется." : "Blank stays unknown. Effective annual rates are decimals:0.1 means10%, not a monthly rate. No currency conversion."}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assumptionFields.map(field => <label className="text-xs" key={field}>{assumptionLabels[field][index]}<input className={`${control} mt-1`} type="number" step="any" value={input.assumptions[field] ?? ""} onChange={event => { const value = event.target.value.trim() ? Number(event.target.value) : null; if (value !== null && !Number.isFinite(value)) return; updateInput({ ...input, assumptions: { ...input.assumptions, [field]: value, version: `manual-assumptions-${calculationVersion({ field, value, previous: input.assumptions.version })}` } }); }} /></label>)}<label className="text-xs">{ru ? "База цен и ставок" : "Price/rate basis"}<select className={`${control} mt-1`} value={input.assumptions.priceBasis} onChange={event => updateInput({ ...input, assumptions: { ...input.assumptions, priceBasis: event.target.value as "nominal" | "real" } })}><option value="nominal">{ru ? "Номинальная" : "Nominal"}</option><option value="real">{ru ? "Реальная" : "Real"}</option></select></label></div>
      <label className="block text-xs">{t.tax}<textarea className={`${control} mt-1`} rows={2} value={input.assumptions.taxBasis} onChange={event => updateInput({ ...input, assumptions: { ...input.assumptions, taxBasis: event.target.value } })} /></label>
      <button className={button} type="button" disabled={!onChange} onClick={() => commit(saveProjectMonthlyFinance(project, input, new Date().toISOString()))}>{ru ? "Сохранить новую версию сценария в проект" : "Save a new scenario revision to project"}</button>
    </section>}
    <FinancePanel areas={areas} input={input} locale={locale} currentGeometryVersion={geometry} onInputChange={onChange ? updateInput : undefined} />
    {input && onChange && <button className={button} type="button" onClick={() => commit(saveProjectMonthlyFinance(project, input, new Date().toISOString()))}>{ru ? "Сохранить изменённые месячные значения" : "Save edited monthly values"}</button>}
  </div>;
}
