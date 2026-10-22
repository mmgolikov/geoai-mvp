import type { AreaSchedule as AreaArtifact, JsonObject, VersionRef } from "./contracts";

export const AREA_METHOD_VERSION = "explicit-area-bridge-v1";
export const AREA_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
export type Quantity = number | null;
export type AreaBuildingInput = {
  id: string;
  aboveGroundGrossM2: Quantity;
  belowGroundGrossM2: Quantity;
  commonM2: Quantity;
  technicalM2: Quantity;
  parkingM2: Quantity;
  otherNonSaleableM2: Quantity;
  /** Explicit programme assumption: a civic/reserved residual need not be saleable. */
  residualUse: "saleable" | "non_saleable" | "unknown";
  terraceM2: Quantity;
  terraceSaleableFactor: Quantity;
  registeredM2: Quantity;
  permittedGfaM2: Quantity;
};
export type AreaScheduleInput = {
  projectId: string; snapshotId: string; inputRevision: number;
  design: VersionRef & { kind: "design" }; geometryVersion: string;
  assumptionsVersion: string; jurisdiction: string; methodology: string;
  provenance: "synthetic" | "user_provided" | "derived_geometry";
  sourceRefs: string[]; accuracy: string; reviewer: string | null;
  /** Explicit defaults are never inferred from a render or jurisdiction. */
  buildings: AreaBuildingInput[];
};
export type AreaBuildingResult = AreaBuildingInput & {
  enclosedGrossM2: Quantity; residualIndoorM2: Quantity; saleableIndoorM2: Quantity;
  weightedTerraceM2: Quantity; saleableEquivalentM2: Quantity;
  /** Physical envelope tally, not an authority-defined BUA/GFA. */
  physicalGrossIncludingTerracesM2: Quantity;
};
export type AreaScheduleResult = {
  schemaVersion: 1; id: string; version: string; methodVersion: string;
  input: AreaScheduleInput; unit: "m2"; buildings: AreaBuildingResult[];
  totals: Record<"aboveGroundGrossM2" | "belowGroundGrossM2" | "enclosedGrossM2" | "commonM2" | "technicalM2" | "parkingM2" | "otherNonSaleableM2" | "terraceM2" | "saleableIndoorM2" | "weightedTerraceM2" | "saleableEquivalentM2" | "physicalGrossIncludingTerracesM2" | "registeredM2" | "permittedGfaM2", Quantity>;
  status: "calculated" | "partial" | "blocked" | "stale";
  errors: string[]; missingInputs: string[]; caveat: string;
};
/** Change detector only; not a cryptographic provenance/signature claim. */
export function calculationVersion(value: unknown): string {
  const canonical = (item: unknown): string => {
    if (Array.isArray(item)) return `[${item.map(canonical).join(",")}]`;
    if (item && typeof item === "object") return `{${Object.keys(item).sort().map(key => `${JSON.stringify(key)}:${canonical((item as Record<string, unknown>)[key])}`).join(",")}}`;
    return JSON.stringify(item) ?? "null";
  };
  let hash = 2166136261;
  for (const char of canonical(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
export const sumKnown = (values: Quantity[]): Quantity => {
  if (!values.every(v => typeof v === "number" && Number.isFinite(v))) return null;
  const sum = values.reduce<number>((total, v) => total + (v as number), 0);
  return Number.isFinite(sum) ? sum : null;
};

export function buildAreaSchedule(input: AreaScheduleInput, currentGeometryVersion = input.geometryVersion): AreaScheduleResult {
  const errors: string[] = [], missingInputs: string[] = [];
  if (!["synthetic", "user_provided", "derived_geometry"].includes(input.provenance) || !Array.isArray(input.sourceRefs) || !input.sourceRefs.every(ref => typeof ref === "string") || !input.projectId || !input.snapshotId || !input.geometryVersion || !input.assumptionsVersion || !input.methodology || !input.accuracy || !input.jurisdiction || input.design.kind !== "design" || !input.design.id || !Number.isInteger(input.design.revision) || input.design.revision < 1 || !Number.isInteger(input.inputRevision) || input.inputRevision < 1) errors.push("invalid_area_identity_or_method");
  if (!input.buildings.length || input.buildings.length > 500) errors.push("building_count_out_of_bounds");
  const ids = new Set<string>();
  const buildings = input.buildings.map(building => {
    if (!building.id || ids.has(building.id)) errors.push(`duplicate_or_missing_building:${building.id}`);
    ids.add(building.id);
    const b = { ...building };
    const numericFields = ["aboveGroundGrossM2", "belowGroundGrossM2", "commonM2", "technicalM2", "parkingM2", "otherNonSaleableM2", "terraceM2", "terraceSaleableFactor", "registeredM2", "permittedGfaM2"] as const;
    for (const field of numericFields) {
      const value = b[field];
      if (value === null || value === undefined) { b[field] = null; missingInputs.push(`${b.id}.${field}`); }
      else if (!Number.isFinite(value) || value < 0 || value > 1e12 || (field === "terraceSaleableFactor" && value > 1)) { errors.push(`invalid_quantity:${b.id}.${field}`); b[field] = null; }
    }
    if (!["saleable", "non_saleable", "unknown"].includes(b.residualUse)) errors.push(`invalid_residual_use:${b.id}`);
    if (b.residualUse === "unknown") missingInputs.push(`${b.id}.residualUse`);
    const enclosedGrossM2 = sumKnown([b.aboveGroundGrossM2, b.belowGroundGrossM2]);
    const allocated = sumKnown([b.commonM2, b.technicalM2, b.parkingM2, b.otherNonSaleableM2]);
    let residualIndoorM2 = enclosedGrossM2 !== null && allocated !== null ? enclosedGrossM2 - allocated : null;
    if (residualIndoorM2 !== null && residualIndoorM2 < -1e-7) { errors.push(`area_allocations_exceed_gross:${b.id}`); residualIndoorM2 = null; }
    if (residualIndoorM2 !== null) residualIndoorM2 = Math.max(0, residualIndoorM2);
    const saleableIndoorM2 = b.residualUse === "non_saleable" ? 0 : b.residualUse === "saleable" ? residualIndoorM2 : null;
    const weightedTerraceM2 = b.terraceM2 === 0 ? 0 : b.terraceM2 !== null && b.terraceSaleableFactor !== null ? b.terraceM2 * b.terraceSaleableFactor : null;
    return { ...b, enclosedGrossM2, residualIndoorM2, saleableIndoorM2, weightedTerraceM2, saleableEquivalentM2: sumKnown([saleableIndoorM2, weightedTerraceM2]), physicalGrossIncludingTerracesM2: sumKnown([enclosedGrossM2, b.terraceM2]) };
  });
  const fields = ["aboveGroundGrossM2", "belowGroundGrossM2", "enclosedGrossM2", "commonM2", "technicalM2", "parkingM2", "otherNonSaleableM2", "terraceM2", "saleableIndoorM2", "weightedTerraceM2", "saleableEquivalentM2", "physicalGrossIncludingTerracesM2", "registeredM2", "permittedGfaM2"] as const;
  const totals = Object.fromEntries(fields.map(field => [field, buildings.length ? sumKnown(buildings.map(b => b[field])) : null])) as AreaScheduleResult["totals"];
  const version = calculationVersion({ method: AREA_METHOD_VERSION, input });
  return { schemaVersion: 1, id: `areas-${input.design.id}`, version, methodVersion: AREA_METHOD_VERSION, input: structuredClone(input), unit: "m2", buildings, totals, status: errors.length ? "blocked" : currentGeometryVersion !== input.geometryVersion ? "stale" : totals.saleableEquivalentM2 === null ? "partial" : "calculated", errors, missingInputs, caveat: AREA_CAVEAT };
}

export function toAreaArtifact(schedule: AreaScheduleResult, meta: { id?: string; revision: number; createdAt: string }): AreaArtifact {
  return { id: meta.id ?? schedule.id, kind: "areas", revision: meta.revision, inputRevision: schedule.input.inputRevision, inputs: [schedule.input.design], createdAt: meta.createdAt, status: schedule.status === "stale" ? "stale" : schedule.status === "blocked" ? "blocked" : schedule.status === "partial" ? "draft" : "current", methodVersion: schedule.methodVersion, assumptions: [schedule.input.methodology, schedule.input.accuracy, `assumptions:${schedule.input.assumptionsVersion}`, "Physical gross, saleable, registered and permitted areas are separate; unknown is not zero."], missingInputs: schedule.missingInputs, data: JSON.parse(JSON.stringify(schedule)) as JsonObject };
}

/** Structural consumer of create_1.measureDesignScene; never derives saleable area from a footprint alone. */
export type GeometryAreaMeasurement = {
  designRef: VersionRef; geometryRevision: string; methodVersion: string; units: "m2"; accuracy: string;
  buildings: { buildingId: string; grossFloorAreaSqM: Quantity; terraceAreaSqM: Quantity }[];
};
export type AreaAllocation = Pick<AreaBuildingInput, "belowGroundGrossM2" | "commonM2" | "technicalM2" | "parkingM2" | "otherNonSaleableM2" | "residualUse" | "terraceSaleableFactor" | "registeredM2" | "permittedGfaM2">;
export function buildAreaScheduleFromMeasurement(
  measurement: GeometryAreaMeasurement,
  meta: Omit<AreaScheduleInput, "design" | "geometryVersion" | "buildings" | "accuracy">,
  allocations: Record<string, AreaAllocation>,
  currentGeometryVersion = measurement.geometryRevision
): AreaScheduleResult {
  const result = buildAreaSchedule({ ...meta, design: { ...measurement.designRef, kind: "design" }, geometryVersion: measurement.geometryRevision, accuracy: measurement.accuracy, methodology: `${meta.methodology}; geometry method ${measurement.methodVersion}. Measured enclosed scene area is above-ground only; underground scope and saleable allocation are explicit inputs.`, buildings: measurement.buildings.map(building => {
    const allocation = allocations[building.buildingId];
    return { id: building.buildingId, aboveGroundGrossM2: building.grossFloorAreaSqM, terraceM2: building.terraceAreaSqM, belowGroundGrossM2: allocation?.belowGroundGrossM2 ?? null, commonM2: allocation?.commonM2 ?? null, technicalM2: allocation?.technicalM2 ?? null, parkingM2: allocation?.parkingM2 ?? null, otherNonSaleableM2: allocation?.otherNonSaleableM2 ?? null, residualUse: allocation?.residualUse ?? "unknown", terraceSaleableFactor: allocation?.terraceSaleableFactor ?? null, registeredM2: allocation?.registeredM2 ?? null, permittedGfaM2: allocation?.permittedGfaM2 ?? null };
  }) }, currentGeometryVersion);
  if (measurement.units !== "m2" || measurement.designRef.kind !== "design") { result.errors.push("invalid_geometry_measurement_unit_or_design_ref"); result.status = "blocked"; }
  return result;
}

/** Recompute a persisted module payload before exposing its derived quantities. */
export function parseAreaScheduleResult(value: unknown): AreaScheduleResult | null {
  try {
    if (!value || typeof value !== "object") return null;
    const candidate = value as AreaScheduleResult;
    if (candidate.schemaVersion !== 1 || candidate.unit !== "m2" || candidate.methodVersion !== AREA_METHOD_VERSION) return null;
    const canonical = buildAreaSchedule(candidate.input);
    const expected = candidate.status === "stale" && canonical.status !== "blocked" ? { ...canonical, status: "stale" as const } : canonical;
    return calculationVersion(candidate) === calculationVersion(expected) ? expected : null;
  } catch { return null; }
}
