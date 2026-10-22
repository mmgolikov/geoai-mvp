import type { FinanceRun as FinanceArtifact, JsonObject, VersionRef } from "./contracts";
import { AREA_CAVEAT, buildAreaSchedule, calculationVersion, sumKnown } from "./areas";
import type { AreaScheduleResult, Quantity } from "./areas";

export const FINANCE_METHOD_VERSION = "monthly-available-cash-v1";
export const FINANCE_CONVENTIONS = [
  "Regular monthly periods; first row is t=0, subsequent rows t=1,2,...; not XIRR/XNPV.",
  "All amounts in the stated currency and price basis; taxes are explicit manual cash payments, not an inferred tax model.",
  "Effective annual discount/debt rates convert by (1+r)^(1/12)-1; debt interest is paid on opening principal, draws begin accruing next month.",
  "Project CF = unrestricted buyer receipts + escrow releases - land - construction - other project costs - tax; excludes debt/equity flows, interest and financing fees.",
  "Buyer receipts = unrestricted receipts + escrow deposits; escrow release is a transfer, not new buyer revenue. Escrow is unavailable until explicitly released.",
  "Equity CF = owner distributions - owner contributions; debt draws/repayments and fees appear only in project cash ledger.",
  "No automatic borrowing, equity injection, tax assumption, terminal value, asset sale or escrow release. Negative available cash is an unresolved funding shortfall.",
  "Monthly amounts retain calculation precision; UI rounding is display only. This is a conditional scenario, not a valuation or investment recommendation."
] as const;
export const FINANCE_FIELDS = ["land", "construction", "otherProjectCost", "tax", "unrestrictedIncome", "escrowDeposit", "escrowRelease", "debtDraw", "debtRepay", "equityContribution", "equityDistribution", "financingFee"] as const;
export type FinanceField = typeof FINANCE_FIELDS[number];
export type MonthlyFinanceRow = Record<FinanceField, Quantity>;
export type FinanceAssumptions = {
  version: string; provenance: "synthetic" | "user_provided"; sourceRefs: string[];
  validAt: string | null; reviewer: string | null; currency: "AED" | "RUB" | "USD";
  priceBasis: "nominal" | "real"; taxBasis: string; notes: string[];
  projectAnnualDiscountRate: Quantity; equityAnnualDiscountRate: Quantity; debtAnnualEffectiveRate: Quantity;
  openingAvailableCash: Quantity; openingDebt: Quantity; openingEscrow: Quantity; debtLimit: Quantity;
  /** Explicit shares of a hypothetical total land payment; sum must be one. */
  landPaymentWeights: number[] | null;
};
export type MonthlyFinanceInput = {
  projectId: string; snapshotId: string; inputRevision: number;
  areaRef: VersionRef & { kind: "areas" }; areaCalculationVersion: string;
  startMonth: string; assumptions: FinanceAssumptions; rows: MonthlyFinanceRow[];
};
export type IrrResult = {
  status: "unique_in_bounds" | "unknown" | "no_sign_change" | "ambiguous_sign_changes" | "out_of_bounds" | "incomplete_terminal_balances";
  monthly: Quantity; annualEffective: Quantity; boundsMonthly: [number, number];
};
export type MonthlyCashLedger = MonthlyFinanceRow & {
  period: number; month: string; openingAvailableCash: Quantity; openingDebt: Quantity; openingEscrow: Quantity;
  projectCost: Quantity; buyerReceipts: Quantity; projectCashFlow: Quantity; equityCashFlow: Quantity;
  interestPaid: Quantity; availableCash: Quantity; debtBalance: Quantity; escrowBalance: Quantity;
  cashShortfall: Quantity;
};
export type MonthlyFinanceResult = {
  schemaVersion: 1; id: string; version: string; methodVersion: string; input: MonthlyFinanceInput;
  geometryVersion: string; areaCalculationVersion: string;
  status: "calculated" | "partial" | "blocked" | "stale"; financialMaturity: "F0" | "F1";
  usableForDecision: false; conventions: readonly string[]; errors: string[]; missingInputs: string[];
  rows: MonthlyCashLedger[];
  metrics: {
    projectNpv: Quantity; equityNpv: Quantity; projectIrr: IrrResult; equityIrr: IrrResult;
    selectedPeriodProjectNetCash: Quantity; selectedPeriodEquityNetCash: Quantity;
    totalBuyerReceipts: Quantity; totalProjectCost: Quantity; totalFinancingCost: Quantity;
    cashSurplusBeforeFinance: Quantity; /** Buyer receipts less project cost, not accounting profit. */
    surplusToReceipts: Quantity; /** Denominator explicitly total buyer receipts. */
    peakDebt: Quantity; peakCashShortfall: Quantity; additionalEquityRequiredAtFixedSchedule: Quantity;
    closingCash: Quantity; closingDebt: Quantity; closingEscrow: Quantity;
    fundingFeasible: boolean | null; debtLimitSatisfied: boolean | null;
    conditionalProjectLandCeiling: Quantity;
  };
  caveat: string;
};
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const add = (...v: Quantity[]) => sumKnown(v);
const negate = (v: Quantity): Quantity => v === null ? null : -v;
const multiply = (a: Quantity, b: Quantity): Quantity => a === null || b === null || !Number.isFinite(a * b) ? null : a * b;
const effectiveMonthly = (rate: Quantity): Quantity => finite(rate) && rate > -1 ? Math.expm1(Math.log1p(rate) / 12) : null;
export function calculateNpv(flows: Quantity[], annualEffectiveRate: Quantity): Quantity {
  const rate = effectiveMonthly(annualEffectiveRate);
  if (rate === null || flows.length === 0 || !flows.every(finite)) return null;
  const npv = flows.reduce<number>((total, value, i) => total + (value as number) * Math.exp(-i * Math.log1p(rate)), 0);
  return Number.isFinite(npv) ? npv : null;
}
/** A non-conventional flow is deliberately not assigned one arbitrary IRR root. */
export function calculateIrr(flows: Quantity[], bounds: [number, number] = [-0.999, 10]): IrrResult {
  const result = (status: IrrResult["status"], monthly: Quantity = null): IrrResult => {
    const annual = monthly === null ? null : Math.expm1(12 * Math.log1p(monthly));
    return { status, monthly, annualEffective: annual !== null && Number.isFinite(annual) ? annual : null, boundsMonthly: [...bounds] };
  };
  if (flows.length < 2 || !flows.every(finite)) return result("unknown");
  const signs = (flows as number[]).filter(v => v !== 0).map(Math.sign);
  const changes = signs.slice(1).filter((sign, i) => sign !== signs[i]).length;
  if (changes === 0) return result("no_sign_change");
  if (changes > 1) return result("ambiguous_sign_changes");
  const activeFlows = [...flows] as number[];
  while (activeFlows.length && activeFlows[activeFlows.length - 1] === 0) activeFlows.pop();
  while (activeFlows.length && activeFlows[0] === 0) activeFlows.shift();
  let [low, high] = bounds;
  if (!finite(low) || !finite(high) || low <= -1 || high <= low) return result("out_of_bounds");
  // Scale by the last period to avoid overflow close to -100% monthly.
  const evaluate = (r: number) => {
    const log = Math.log1p(r), anchor = log < 0 ? activeFlows.length - 1 : 0;
    return activeFlows.reduce((sum, flow, i) => sum + flow * Math.exp(-(i - anchor) * log), 0);
  };
  let a = evaluate(low), b = evaluate(high);
  if (!finite(a) || !finite(b)) return result("out_of_bounds");
  if (a === 0) return result("unique_in_bounds", low);
  if (b === 0) return result("unique_in_bounds", high);
  if (Math.sign(a) === Math.sign(b)) return result("out_of_bounds");
  for (let i = 0; i < 160; i++) {
    const middle = low + (high - low) / 2, value = evaluate(middle);
    if (!finite(value)) return result("out_of_bounds");
    if (value === 0 || high - low < 1e-12) return result("unique_in_bounds", middle);
    if (Math.sign(value) === Math.sign(a)) { low = middle; a = value; }
    else { high = middle; b = value; }
  }
  return result("out_of_bounds");
}
/** NPV-zero land price for an explicit unlevered payment pattern. May be negative. */
export function calculateLandCeiling(projectFlowsExcludingLand: Quantity[], paymentWeights: number[] | null, annualEffectiveRate: Quantity): Quantity {
  if (!paymentWeights || paymentWeights.length !== projectFlowsExcludingLand.length || !paymentWeights.every(v => finite(v) && v >= 0) || Math.abs(paymentWeights.reduce((a, b) => a + b, 0) - 1) > 1e-8) return null;
  const value = calculateNpv(projectFlowsExcludingLand, annualEffectiveRate), factor = calculateNpv(paymentWeights, annualEffectiveRate);
  return value !== null && factor !== null && factor > 0 && Number.isFinite(value / factor) ? value / factor : null;
}
const maxKnown = (values: Quantity[]): Quantity => values.length && values.every(finite) ? Math.max(...values as number[]) : null;
const monthAt = (start: string, i: number): string => {
  const [year, month] = start.split("-").map(Number), offset = year * 12 + month - 1 + i;
  return `${Math.floor(offset / 12).toString().padStart(4, "0")}-${(offset % 12 + 1).toString().padStart(2, "0")}`;
};

export function runMonthlyFinance(input: MonthlyFinanceInput, areas: AreaScheduleResult, currentGeometryVersion = areas.input.geometryVersion): MonthlyFinanceResult {
  const errors: string[] = [], missingInputs: string[] = [];
  const canonicalAreas = buildAreaSchedule(areas.input, currentGeometryVersion);
  const stale = canonicalAreas.status === "stale" || input.areaCalculationVersion !== canonicalAreas.version || input.inputRevision !== areas.input.inputRevision;
  if (input.projectId !== areas.input.projectId || input.snapshotId !== areas.input.snapshotId || input.areaRef.kind !== "areas" || input.areaRef.id !== areas.id || !Number.isInteger(input.areaRef.revision) || input.areaRef.revision < 1) errors.push("area_identity_mismatch");
  if (canonicalAreas.status === "blocked" || areas.version !== canonicalAreas.version || calculationVersion(areas.totals) !== calculationVersion(canonicalAreas.totals)) errors.push("invalid_or_mutated_area_schedule");
  if (canonicalAreas.totals.saleableEquivalentM2 === null) missingInputs.push("areas.saleableEquivalentM2");
  const a = input.assumptions;
  if (!Array.isArray(a.notes) || !a.notes.every(note => typeof note === "string") || !Array.isArray(a.sourceRefs) || !a.sourceRefs.every(ref => typeof ref === "string") || !a.version || !["synthetic", "user_provided"].includes(a.provenance) || !["AED", "RUB", "USD"].includes(a.currency) || !["nominal", "real"].includes(a.priceBasis) || !a.taxBasis || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.startMonth) || !Number.isInteger(input.inputRevision) || input.inputRevision < 1) errors.push("invalid_finance_identity_calendar_or_basis");
  if (input.rows.length < 1 || input.rows.length > 600) errors.push("monthly_period_count_out_of_bounds_1_600");
  const amount = (value: unknown, field: string): Quantity => {
    if (value === null || value === undefined) { missingInputs.push(field); return null; }
    if (!finite(value) || value < 0 || value > 1e12) { errors.push(`invalid_amount:${field}`); return null; }
    return value;
  };
  const rate = (value: unknown, field: string, debt = false): Quantity => {
    if (value === null || value === undefined) { missingInputs.push(field); return null; }
    if (!finite(value) || value <= -1 || value > 100 || (debt && value < 0)) { errors.push(`invalid_effective_annual_rate:${field}`); return null; }
    return value;
  };
  const projectRate = rate(a.projectAnnualDiscountRate, "projectAnnualDiscountRate");
  const equityRate = rate(a.equityAnnualDiscountRate, "equityAnnualDiscountRate");
  const debtRate = effectiveMonthly(rate(a.debtAnnualEffectiveRate, "debtAnnualEffectiveRate", true));
  let cash = amount(a.openingAvailableCash, "openingAvailableCash"), debt = amount(a.openingDebt, "openingDebt"), escrow = amount(a.openingEscrow, "openingEscrow");
  const debtLimit = amount(a.debtLimit, "debtLimit");
  const openingDebt = debt, openingEscrow = escrow, openingCash = cash;
  const rows: MonthlyCashLedger[] = input.rows.slice(0, 600).map((raw, period) => {
    const values = Object.fromEntries(FINANCE_FIELDS.map(key => [key, amount(raw[key], `rows[${period}].${key}`)])) as MonthlyFinanceRow;
    const beforeCash = cash, beforeDebt = debt, beforeEscrow = escrow;
    const projectCost = add(values.land, values.construction, values.otherProjectCost, values.tax);
    const buyerReceipts = add(values.unrestrictedIncome, values.escrowDeposit);
    const projectCashFlow = add(values.unrestrictedIncome, values.escrowRelease, negate(projectCost));
    const equityCashFlow = add(values.equityDistribution, negate(values.equityContribution));
    const interestPaid = beforeDebt === 0 ? 0 : multiply(beforeDebt, debtRate);
    debt = add(beforeDebt, values.debtDraw, negate(values.debtRepay));
    escrow = add(beforeEscrow, values.escrowDeposit, negate(values.escrowRelease));
    cash = add(beforeCash, projectCashFlow, values.debtDraw, negate(values.debtRepay), values.equityContribution, negate(values.equityDistribution), negate(interestPaid), negate(values.financingFee));
    if (debt !== null && debt < -1e-7) errors.push(`repayment_exceeds_debt:period${period}`);
    if (escrow !== null && escrow < -1e-7) errors.push(`release_exceeds_escrow:period${period}`);
    if (cash !== null && cash < -1e-7 && values.equityDistribution !== null && values.equityDistribution > 0) errors.push(`distribution_while_unfunded:period${period}`);
    return { ...values, period, month: /^\d{4}-(0[1-9]|1[0-2])$/.test(input.startMonth) ? monthAt(input.startMonth, period) : "unknown", openingAvailableCash: beforeCash, openingDebt: beforeDebt, openingEscrow: beforeEscrow, projectCost, buyerReceipts, projectCashFlow, equityCashFlow, interestPaid, availableCash: cash, debtBalance: debt, escrowBalance: escrow, cashShortfall: cash === null ? null : Math.max(0, -cash) };
  });
  const projectFlows = rows.map(row => row.projectCashFlow), equityFlows = rows.map(row => row.equityCashFlow);
  let projectIrr = calculateIrr(projectFlows), equityIrr = calculateIrr(equityFlows);
  // No assumed disposal/escrow release/final repayment to manufacture a full-life return.
  const closed = (value: Quantity) => value !== null && Math.abs(value) <= 1e-7;
  if (!closed(openingEscrow) || !closed(escrow)) projectIrr = { ...projectIrr, status: "incomplete_terminal_balances", monthly: null, annualEffective: null };
  if (![openingDebt, openingCash, debt, cash, openingEscrow, escrow].every(closed)) equityIrr = { ...equityIrr, status: "incomplete_terminal_balances", monthly: null, annualEffective: null };
  const totalBuyerReceipts = sumKnown(rows.map(row => row.buyerReceipts)), totalProjectCost = sumKnown(rows.map(row => row.projectCost));
  const surplus = add(totalBuyerReceipts, negate(totalProjectCost));
  const peakDebt = maxKnown([openingDebt, ...rows.map(row => row.debtBalance)]);
  const peakCashShortfall = maxKnown([openingCash === null ? null : Math.max(0, -openingCash), ...rows.map(row => row.cashShortfall)]);
  const allFinite = rows.every(row => [...FINANCE_FIELDS, "interestPaid", "availableCash", "debtBalance", "escrowBalance"].every(key => finite(row[key as keyof MonthlyCashLedger])));
  if (!allFinite && !missingInputs.length && !errors.length) errors.push("non_finite_calculation");
  const status = errors.length ? "blocked" : stale ? "stale" : missingInputs.length ? "partial" : "calculated";
  const invalid = status === "blocked";
  return {
    schemaVersion: 1, id: `finance-${input.areaRef.id}`, version: calculationVersion({ method: FINANCE_METHOD_VERSION, input, areaVersion: canonicalAreas.version }), methodVersion: FINANCE_METHOD_VERSION,
    input: structuredClone(input), geometryVersion: areas.input.geometryVersion, areaCalculationVersion: canonicalAreas.version,
    status, financialMaturity: status === "calculated" ? "F1" : "F0", usableForDecision: false,
    conventions: FINANCE_CONVENTIONS, errors, missingInputs: [...new Set(missingInputs)], rows,
    metrics: {
      projectNpv: invalid ? null : calculateNpv(projectFlows, projectRate), equityNpv: invalid ? null : calculateNpv(equityFlows, equityRate),
      projectIrr: invalid ? { ...projectIrr, status: "unknown", monthly: null, annualEffective: null } : projectIrr,
      equityIrr: invalid ? { ...equityIrr, status: "unknown", monthly: null, annualEffective: null } : equityIrr,
      selectedPeriodProjectNetCash: invalid ? null : sumKnown(projectFlows), selectedPeriodEquityNetCash: invalid ? null : sumKnown(equityFlows),
      totalBuyerReceipts, totalProjectCost, totalFinancingCost: sumKnown(rows.map(row => add(row.interestPaid, row.financingFee))),
      cashSurplusBeforeFinance: invalid ? null : surplus,
      surplusToReceipts: invalid || surplus === null || totalBuyerReceipts === null || totalBuyerReceipts <= 0 ? null : surplus / totalBuyerReceipts,
      peakDebt, peakCashShortfall, additionalEquityRequiredAtFixedSchedule: invalid ? null : peakCashShortfall,
      closingCash: cash, closingDebt: debt, closingEscrow: escrow,
      fundingFeasible: invalid || peakCashShortfall === null || peakDebt === null || debtLimit === null ? null : peakCashShortfall <= 1e-7 && peakDebt <= debtLimit + 1e-7,
      debtLimitSatisfied: invalid || debtLimit === null || peakDebt === null ? null : peakDebt <= debtLimit + 1e-7,
      conditionalProjectLandCeiling: invalid ? null : calculateLandCeiling(rows.map(row => add(row.projectCashFlow, row.land)), a.landPaymentWeights, projectRate)
    }, caveat: AREA_CAVEAT
  };
}

export type FinanceSensitivity = { id: string; incomeMultiplier: number; constructionMultiplier: number; incomeDelayMonths: number };
export function runFinanceSensitivity(input: MonthlyFinanceInput, areas: AreaScheduleResult, scenarios: FinanceSensitivity[], currentGeometryVersion = areas.input.geometryVersion): { scenario: FinanceSensitivity; result: MonthlyFinanceResult | null; error: string | null }[] {
  return scenarios.map(scenario => {
    if (![scenario.incomeMultiplier, scenario.constructionMultiplier].every(v => finite(v) && v >= 0 && v <= 100) || !Number.isInteger(scenario.incomeDelayMonths) || scenario.incomeDelayMonths < 0 || input.rows.length + scenario.incomeDelayMonths > 600) return { scenario, result: null, error: "invalid_sensitivity_or_horizon" };
    const rows = Array.from({ length: input.rows.length + scenario.incomeDelayMonths }, () => Object.fromEntries(FINANCE_FIELDS.map(key => [key, 0])) as MonthlyFinanceRow);
    for (let i = 0; i < input.rows.length; i++) for (const key of FINANCE_FIELDS) {
      const income = ["unrestrictedIncome", "escrowDeposit", "escrowRelease"].includes(key), target = i + (income ? scenario.incomeDelayMonths : 0);
      const factor = income ? scenario.incomeMultiplier : key === "construction" ? scenario.constructionMultiplier : 1;
      rows[target][key] = multiply(input.rows[i][key], factor);
    }
    const next: MonthlyFinanceInput = { ...input, rows, assumptions: { ...input.assumptions, version: `${input.assumptions.version}:${scenario.id}`, landPaymentWeights: input.assumptions.landPaymentWeights ? [...input.assumptions.landPaymentWeights, ...Array(scenario.incomeDelayMonths).fill(0)] : null, notes: [...input.assumptions.notes, `Explicit sensitivity ${scenario.id}; financing schedule unchanged, no automatic funding.`] } };
    return { scenario, result: runMonthlyFinance(next, areas, currentGeometryVersion), error: null };
  });
}
export function toFinanceArtifact(result: MonthlyFinanceResult, meta: { id?: string; revision: number; createdAt: string }): FinanceArtifact {
  return { id: meta.id ?? result.id, kind: "finance", revision: meta.revision, inputRevision: result.input.inputRevision, inputs: [result.input.areaRef], createdAt: meta.createdAt, status: result.status === "stale" ? "stale" : result.status === "blocked" ? "blocked" : result.status === "partial" ? "draft" : "current", methodVersion: result.methodVersion, assumptions: [...result.conventions, ...result.input.assumptions.notes, `Finance maturity ${result.financialMaturity}; not kit maturity or professional review.`], missingInputs: result.missingInputs, data: JSON.parse(JSON.stringify(result)) as JsonObject };
}

/** Safe arithmetic fixture only; amounts/rates are not sourced market inputs. */
export function makeSyntheticFinanceFixture(): { areas: AreaScheduleResult; input: MonthlyFinanceInput } {
  const areas = buildAreaSchedule({ projectId: "synthetic-finance-project", snapshotId: "synthetic-snapshot-1", inputRevision: 1, design: { kind: "design", id: "synthetic-design-A", revision: 1 }, geometryVersion: "synthetic-geometry-1", assumptionsVersion: "synthetic-area-assumptions-1", jurisdiction: "synthetic/no-authority", methodology: "Manual synthetic: enclosed gross200, common40, technical20, parking0, other0; residual saleable140. Terrace20 times explicitly assumed factor0.5 =10; saleable equivalent150. Registered/permitted unknown.", provenance: "synthetic", sourceRefs: [], accuracy: "Exact arithmetic on synthetic quantities, not site measurement.", reviewer: null, buildings: [{ id: "synthetic-building", aboveGroundGrossM2: 200, belowGroundGrossM2: 0, commonM2: 40, technicalM2: 20, parkingM2: 0, otherNonSaleableM2: 0, residualUse: "saleable", terraceM2: 20, terraceSaleableFactor: 0.5, registeredM2: null, permittedGfaM2: null }] });
  const row = (patch: Partial<MonthlyFinanceRow>): MonthlyFinanceRow => ({ land: 0, construction: 0, otherProjectCost: 0, tax: 0, unrestrictedIncome: 0, escrowDeposit: 0, escrowRelease: 0, debtDraw: 0, debtRepay: 0, equityContribution: 0, equityDistribution: 0, financingFee: 0, ...patch });
  return { areas, input: { projectId: areas.input.projectId, snapshotId: areas.input.snapshotId, inputRevision: 1, areaRef: { kind: "areas", id: areas.id, revision: 1 }, areaCalculationVersion: areas.version, startMonth: "2026-01", assumptions: { version: "synthetic-finance-assumptions-1", provenance: "synthetic", sourceRefs: [], validAt: null, reviewer: null, currency: "USD", priceBasis: "nominal", taxBasis: "Synthetic test: tax0 explicitly; no inference for an actual transaction.", notes: ["SYNTHETIC manual arithmetic units. No market rates, no real-site valuation.", "NPV at zero: project60; equity55; fee5. Cash0, debt0, peak debt50.", "Amounts are manually entered, not estimated from area or a selling price."], projectAnnualDiscountRate: 0, equityAnnualDiscountRate: 0, debtAnnualEffectiveRate: 0, openingAvailableCash: 0, openingDebt: 0, openingEscrow: 0, debtLimit: 50, landPaymentWeights: [1, 0, 0] }, rows: [row({ land: 100, equityContribution: 100 }), row({ construction: 100, equityContribution: 50, debtDraw: 50 }), row({ unrestrictedIncome: 260, debtRepay: 50, financingFee: 5, equityDistribution: 205 })] } };
}

export type AreaRatePlan = {
  version: string; currency: FinanceAssumptions["currency"]; areaRevision: number; sourceRefs: string[];
  /** Explicit manual/synthetic rates, never marketplace defaults. */
  pricePerSaleableM2: Quantity; constructionCostPerEnclosedGrossM2: Quantity;
  buyerReceiptShares: number[]; constructionPaymentShares: number[];
  escrowFraction: Quantity; escrowReleaseShares: number[] | null;
};
/** Connects edited geometry/area quantities to revenue and construction. Other costs/funding stay explicit. */
export function applyAreaRatePlan(template: MonthlyFinanceInput, areas: AreaScheduleResult, plan: AreaRatePlan): { input: MonthlyFinanceInput | null; errors: string[] } {
  const errors: string[] = [], n = template.rows.length;
  const sharesValid = (values: number[] | null) => !!values && values.length === n && values.every(v => finite(v) && v >= 0) && Math.abs(values.reduce((a, b) => a + b, 0) - 1) <= 1e-8;
  if (!plan.version || plan.currency !== template.assumptions.currency || !Number.isInteger(plan.areaRevision) || plan.areaRevision < 1) errors.push("invalid_rate_plan_identity_or_currency");
  if (!sharesValid(plan.buyerReceiptShares) || !sharesValid(plan.constructionPaymentShares)) errors.push("invalid_rate_plan_payment_shares");
  for (const value of [plan.pricePerSaleableM2, plan.constructionCostPerEnclosedGrossM2]) if (value !== null && (!finite(value) || value < 0 || value > 1e12)) errors.push("invalid_unit_rate");
  if (plan.escrowFraction !== null && (!finite(plan.escrowFraction) || plan.escrowFraction < 0 || plan.escrowFraction > 1)) errors.push("invalid_escrow_fraction");
  if (plan.escrowReleaseShares !== null && !sharesValid(plan.escrowReleaseShares)) errors.push("invalid_escrow_release_shares");
  if (areas.status === "blocked" || areas.status === "stale") errors.push("area_rate_plan_requires_valid_current_area");
  if (template.projectId !== areas.input.projectId || template.snapshotId !== areas.input.snapshotId) errors.push("rate_plan_project_snapshot_mismatch");
  if (errors.length) return { input: null, errors };
  const revenue = multiply(areas.totals.saleableEquivalentM2, plan.pricePerSaleableM2), construction = multiply(areas.totals.enclosedGrossM2, plan.constructionCostPerEnclosedGrossM2);
  const rows = template.rows.map((row, i) => ({ ...row,
    construction: multiply(construction, plan.constructionPaymentShares[i]),
    unrestrictedIncome: multiply(multiply(revenue, plan.escrowFraction === null ? null : 1 - plan.escrowFraction), plan.buyerReceiptShares[i]),
    escrowDeposit: multiply(multiply(revenue, plan.escrowFraction), plan.buyerReceiptShares[i]),
    escrowRelease: plan.escrowFraction === 0 ? 0 : plan.escrowReleaseShares === null ? null : multiply(multiply(revenue, plan.escrowFraction), plan.escrowReleaseShares[i])
  }));
  return { errors: [], input: { ...template, inputRevision: areas.input.inputRevision, areaRef: { kind: "areas", id: areas.id, revision: plan.areaRevision }, areaCalculationVersion: areas.version, rows, assumptions: { ...template.assumptions, version: `${template.assumptions.version}:area-rates:${plan.version}:${areas.version}`, sourceRefs: [...new Set([...template.assumptions.sourceRefs, ...plan.sourceRefs])], notes: [...template.assumptions.notes, `Explicit area rate plan ${JSON.stringify(plan)}. Construction uses enclosed gross; revenue uses saleable equivalent. Other costs and funding unchanged; no automatic sale of civic space or funding.`] } } };
}

/** Foundation stores bounded JSON; finance additionally recomputes all financial semantics. */
export function parseMonthlyFinanceResult(value: unknown, areas: AreaScheduleResult, currentGeometryVersion = areas.input.geometryVersion): MonthlyFinanceResult | null {
  try {
    if (!value || typeof value !== "object") return null;
    const candidate = value as MonthlyFinanceResult;
    if (candidate.schemaVersion !== 1 || candidate.methodVersion !== FINANCE_METHOD_VERSION) return null;
    const baseline = runMonthlyFinance(candidate.input, areas);
    if (candidate.status === "stale" && baseline.status !== "blocked") { baseline.status = "stale"; baseline.financialMaturity = "F0"; }
    if (calculationVersion(candidate) !== calculationVersion(baseline)) return null;
    return runMonthlyFinance(candidate.input, areas, currentGeometryVersion);
  } catch { return null; }
}
