import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { DevkitProject, DesignBuilding, DesignVersion, JsonObject, VersionRef } from "./contracts";
import {
  conceptSiteDefaults, conceptTemplate, generateConceptMassing, validateRedevelopmentProgram,
  type ConceptAlternativeId, type ConceptLocale, type ConceptUse, type RedevelopmentProgramInput
} from "../prototype/point-to-object-create";
import {
  designMetricFrame, designPolygonAreaSqM, designPolygonContained, designPolygonsConflict, designPolygonClearanceM,
  designTerraceTopPlate, translateDesignPolygon, validateDesignPolygon, type DesignMetricFrame
} from "./geometry";

export const DESIGN_METHOD_VERSION = "devkit-design-1";
export const DESIGN_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const USES: readonly ConceptUse[] = ["residential", "office", "retail", "hospitality", "civic", "open_space"];
const FLOOR_HEIGHT_M = 3.4;

export type CanonicalDesignBuilding = DesignBuilding & {
  heightM: number | null;
  floorHeightM: number | null;
  terraceSharePct: number;
  topFloorFootprint: Polygon;
};
export type DesignExclusionZone = { id: string; label: string; geometry: Polygon; reason: string };
export type CanonicalDesignScene = {
  schemaVersion: 1;
  methodVersion: typeof DESIGN_METHOD_VERSION;
  geometryRevision: string;
  projectId: string;
  inputRevision: number;
  aoiId: string;
  aoiRevision: number;
  programmeIdentity: string;
  sourceInputIdentity: string;
  variantId: ConceptAlternativeId;
  parent: VersionRef | null;
  restoredFrom?: VersionRef;
  lineageAction?: "generate" | "edit" | "restore";
  crs: "EPSG:4326";
  metricFrame: DesignMetricFrame;
  aoi: Polygon;
  buildings: CanonicalDesignBuilding[];
  exclusionZones: DesignExclusionZone[];
  constraints: Array<{ id: string; status: string; severity: string }>;
  checks: string[];
  caveat: typeof DESIGN_CAVEAT;
};
/** scene is module-validated JSON; the envelope remains foundation-compatible. */
export type DesignScene = DesignVersion & { scene: JsonObject & CanonicalDesignScene };
export type DesignPairResult =
  | { ok: true; designs: [DesignScene, DesignScene] }
  | { ok: false; code: "invalid_input" | "critical_gap" | "no_fit"; errors: string[]; previous: DesignScene[] };
export type RetainedBuildingParameters = {
  objectId: string;
  /** Explicit source-backed value or user assumption; no use is guessed. */
  use: Exclude<ConceptUse, "open_space">;
  levels: number | null;
  heightM: number | null;
  assumptionIds: string[];
};
export type DesignGenerationOptions = {
  programmes?: Partial<Record<ConceptAlternativeId, RedevelopmentProgramInput>>;
  retainedBuildings?: RetainedBuildingParameters[];
  exclusionConstraintIds?: string[];
  /** Explicitly authorizes a draft despite source gaps, never legal acceptance. */
  allowUnverifiedDraft?: boolean;
  previous?: DesignScene[];
  seed?: string;
  createdAt?: string;
};
export type DesignBuildingPatch = {
  levels?: number;
  floorHeightM?: number;
  use?: Exclude<ConceptUse, "open_space">;
  footprint?: Polygon;
  translate?: { eastM: number; northM: number };
  /** Area share of the top plate opened as a terrace; floors includes this floor. */
  terraceSharePct?: number;
};
export type DesignEditResult =
  | { ok: true; design: DesignScene; invalidated: readonly ["areas", "finance", "kit"] }
  | { ok: false; design: DesignScene; errors: string[] };

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
/** Content identity only, not a cryptographic integrity or authorization token. */
function identity(value: unknown): string {
  const text = stableJson(value);
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ text.charCodeAt(i), 0x85ebca6b);
  }
  return `${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}
function sceneIdentity(scene: Omit<CanonicalDesignScene, "geometryRevision"> | CanonicalDesignScene): string {
  return identity({ methodVersion: scene.methodVersion, projectId: scene.projectId, inputRevision: scene.inputRevision,
    aoiId: scene.aoiId, aoiRevision: scene.aoiRevision, programmeIdentity: scene.programmeIdentity, sourceInputIdentity: scene.sourceInputIdentity, variantId: scene.variantId, crs: scene.crs,
    metricFrame: scene.metricFrame, aoi: scene.aoi, buildings: scene.buildings,
    exclusionZones: scene.exclusionZones, constraints: scene.constraints,
    ...(scene.restoredFrom ? { restoredFrom: scene.restoredFrom } : {}),
    ...(scene.lineageAction ? { lineageAction: scene.lineageAction } : {}) });
}
function sourceInputIdentity(project: DevkitProject): string {
  return identity({ projectId: project.id, brief: project.brief, aoi: project.aoi, objects: project.objects,
    evidence: project.evidence, claims: project.claims, constraints: project.constraints, scenarios: project.scenarios });
}
function jsonScene(scene: CanonicalDesignScene): JsonObject & CanonicalDesignScene {
  return scene as unknown as JsonObject & CanonicalDesignScene;
}
function aoiGeometry(project: DevkitProject): Polygon {
  return { type: "Polygon", coordinates: structuredClone(project.aoi!.coordinates) };
}
function summary(building: CanonicalDesignBuilding): DesignBuilding {
  return { id: building.id, label: building.label, footprint: structuredClone(building.footprint),
    levels: building.levels, use: building.use, retained: building.retained, assumptionIds: [...building.assumptionIds] };
}
function validDate(value: string): boolean { return typeof value === "string" && Number.isFinite(Date.parse(value)); }

export function defaultDesignProgrammes(project: DevkitProject): Record<ConceptAlternativeId, RedevelopmentProgramInput> {
  if (!project.aoi) throw new Error("A drawn AOI is required; a point or parcel label is not an AOI.");
  const locale: ConceptLocale = project.brief.locale === "ru" ? "ru" : "en";
  const latestProgramme = (variant: ConceptAlternativeId, index: number) => {
    const scenarioId = project.scenarios.find(s => s.id === variant)?.id ?? project.scenarios[index]?.id;
    return [...project.designVersions].reverse().find(d => d.scenarioId === scenarioId)?.program;
  };
  return {
    A: structuredClone(latestProgramme("A", 0) ?? conceptSiteDefaults(conceptTemplate("residential_quarter", locale), project.aoi.coordinates)),
    B: structuredClone(latestProgramme("B", 1) ?? conceptSiteDefaults(conceptTemplate("hospitality_recreation", locale), project.aoi.coordinates))
  };
}

function canonicalErrors(scene: CanonicalDesignScene): string[] {
  const errors: string[] = [];
  if (typeof scene.projectId !== "string" || !scene.projectId || !Number.isInteger(scene.inputRevision) || scene.inputRevision < 1 ||
    typeof scene.aoiId !== "string" || !scene.aoiId || !Number.isInteger(scene.aoiRevision) || scene.aoiRevision < 1) return ["Canonical project/AOI identity is missing."];
  if (scene.schemaVersion !== 1 || scene.methodVersion !== DESIGN_METHOD_VERSION || scene.crs !== "EPSG:4326" ||
    !["A", "B"].includes(scene.variantId) || scene.caveat !== DESIGN_CAVEAT) return ["Unsupported canonical design scene."];
  const frame = scene.metricFrame;
  if (!frame || frame.method !== "local_equirectangular_v1" || frame.units !== "m" || frame.accuracy !== "screening_approximation") return ["Unknown design metric frame or units."];
  errors.push(...validateDesignPolygon(scene.aoi));
  if (errors.length) return errors;
  if (stableJson(designMetricFrame(scene.aoi)) !== stableJson(frame)) return ["Metric frame is not bound to the saved AOI."];
  if (!Array.isArray(scene.buildings) || !scene.buildings.length || scene.buildings.length > 60 || !Array.isArray(scene.exclusionZones) || scene.exclusionZones.length > 100) return ["Invalid bounded scene building or exclusion list."];
  if (!Array.isArray(scene.constraints)) return ["Constraint bindings are missing."];
  const ids = new Set<string>();
  for (const zone of scene.exclusionZones) {
    if (!zone || typeof zone.id !== "string" || !zone.id || ids.has(zone.id)) { errors.push("Exclusion IDs must be present and unique."); continue; }
    ids.add(zone.id);
    const invalid = validateDesignPolygon(zone.geometry, frame);
    errors.push(...invalid.map(e => `${zone.id}: ${e}`));
    if (!invalid.length && !designPolygonContained(zone.geometry, scene.aoi, frame)) errors.push(`${zone.id}: exclusion must be contained in the AOI; clipping is not implicit.`);
  }
  ids.clear();
  for (const building of scene.buildings) {
    if (!building || typeof building.id !== "string" || !building.id || ids.has(building.id)) { errors.push("Building IDs must be present and unique."); continue; }
    ids.add(building.id);
    if (!USES.includes(building.use) || building.use === "open_space") errors.push(`${building.id}: an explicit building use is required.`);
    const invalid = validateDesignPolygon(building.footprint, frame);
    errors.push(...invalid.map(e => `${building.id}: ${e}`));
    if (!invalid.length && !designPolygonContained(building.footprint, scene.aoi, frame)) errors.push(`${building.id}: footprint is outside AOI.`);
    if (building.levels !== null && (!Number.isInteger(building.levels) || building.levels < 1 || building.levels > 80)) errors.push(`${building.id}: levels must be an integer 1–80 or explicitly unknown for retained objects.`);
    if (building.heightM !== null && (!Number.isFinite(building.heightM) || building.heightM <= 0 || building.heightM > 480)) errors.push(`${building.id}: invalid height.`);
    if (typeof building.retained !== "boolean" || !Array.isArray(building.assumptionIds)) errors.push(`${building.id}: missing retention/provenance metadata.`);
    if (!building.retained && (building.levels === null || building.floorHeightM === null || building.heightM === null)) errors.push(`${building.id}: generated vertical dimensions cannot be unknown.`);
    if (building.floorHeightM !== null && (!Number.isFinite(building.floorHeightM) || building.floorHeightM < 2 || building.floorHeightM > 6)) errors.push(`${building.id}: floor height must be 2–6 m.`);
    if (!building.retained && building.levels !== null && building.floorHeightM !== null &&
      Math.abs(Number(building.heightM) - building.levels * building.floorHeightM) > 1e-7) errors.push(`${building.id}: height and floor count disagree.`);
    if (building.retained && building.terraceSharePct !== 0) errors.push(`${building.id}: retained building geometry cannot gain an inferred terrace.`);
    try {
      const expectedTop = designTerraceTopPlate(building.footprint, building.terraceSharePct, frame);
      if (stableJson(expectedTop) !== stableJson(building.topFloorFootprint)) errors.push(`${building.id}: saved terrace plate is inconsistent.`);
    } catch (error) { errors.push(`${building.id}: ${error instanceof Error ? error.message : "Invalid terrace."}`); }
    if (!invalid.length) for (const zone of scene.exclusionZones) {
      if (!building.retained && designPolygonsConflict(building.footprint, zone.geometry, frame)) errors.push(`${building.id}: conflicts with exclusion ${zone.id}.`);
    }
  }
  for (let i = 0; i < scene.buildings.length; i++) for (let j = i + 1; j < scene.buildings.length; j++) {
    const a = scene.buildings[i], b = scene.buildings[j];
    if (a?.footprint && b?.footprint && designPolygonsConflict(a.footprint, b.footprint, frame)) errors.push(`${a.id}: overlaps or touches ${b.id}.`);
  }
  if (scene.geometryRevision !== sceneIdentity(scene)) errors.push("Canonical geometry revision does not match saved content.");
  return errors;
}

export function validateDesignScene(value: unknown): string[] {
  try {
    if (!value || typeof value !== "object") return ["Design version is missing."];
    const design = value as DesignScene;
    if (typeof design.id !== "string" || !design.id || typeof design.scenarioId !== "string" || !design.scenarioId ||
      !["draft", "review_required"].includes(design.status) || !Array.isArray(design.retainedObjectIds) || !Array.isArray(design.exclusionConstraintIds) ||
      !design.scene || !Number.isInteger(design.revision) || design.revision < 1 || !validDate(design.createdAt)) return ["A canonical design version and revision are required."];
    const errors = canonicalErrors(design.scene);
    if (errors.length) return errors;
    if (stableJson(design.buildings) !== stableJson(design.scene.buildings.map(summary))) errors.push("Building summaries and canonical scene disagree.");
    if (stableJson([...design.retainedObjectIds].sort()) !== stableJson(design.scene.buildings.filter(b => b.retained).map(b => b.id).sort())) errors.push("Retained object identities disagree.");
    if (stableJson([...design.exclusionConstraintIds].sort()) !== stableJson(design.scene.exclusionZones.map(z => z.id).sort())) errors.push("Exclusion constraint identities disagree.");
    if (design.scene.inputRevision !== design.inputRevision || design.scene.aoiId !== design.aoiId || design.scene.aoiRevision !== design.aoiRevision ||
      design.scene.programmeIdentity !== identity(design.program)) errors.push("Programme or input identity differs from the canonical scene.");
    const validation = validateRedevelopmentProgram(design.program);
    if (!validation.ok) errors.push(...validation.errors);
    if (validation.ok) {
      for (const building of design.scene.buildings.filter(b => !b.retained)) {
        if (designPolygonClearanceM(building.footprint, design.scene.aoi, design.scene.metricFrame) + 0.0001 < design.program.setbackM) errors.push(`${building.id}: violates the requested geometric AOI setback.`);
      }
      const footprint = design.scene.buildings.reduce((sum, b) => sum + designPolygonAreaSqM(b.footprint, design.scene.metricFrame), 0);
      if (footprint / designPolygonAreaSqM(design.scene.aoi, design.scene.metricFrame) * 100 + design.program.openSpacePct > 100.0001) errors.push("Total building footprints leave less than the requested open-space allowance.");
    }
    if (design.scene.buildings.filter(b => !b.retained).length !== design.program.blockCount) errors.push("Generated building count differs from the saved programme.");
    if (!Array.isArray(design.assumptions) || design.assumptions.some(a => typeof a !== "string")) errors.push("Design assumptions are missing.");
    return errors;
  } catch { return ["Malformed design scene; last valid state must be retained."]; }
}

export function createDesignAlternatives(project: DevkitProject, options: DesignGenerationOptions = {}): DesignPairResult {
  const previous = options.previous ?? project.designVersions.filter(d => !validateDesignScene(d).length) as DesignScene[];
  const fail = (code: "invalid_input" | "critical_gap" | "no_fit", errors: string[]): DesignPairResult => ({ ok: false, code, errors, previous });
  if (!project.aoi || project.aoi.crs !== "EPSG:4326") return fail("invalid_input", ["A WGS84 drawn AOI is required; unknown CRS cannot be measured."]);
  const aoi = aoiGeometry(project), errors = validateDesignPolygon(aoi);
  if (errors.length) return fail("invalid_input", errors);
  if (aoi.coordinates[0].length > 26) return fail("invalid_input", ["The reused Create engine supports at most 25 AOI exterior vertices."]);
  const frame = designMetricFrame(aoi), area = designPolygonAreaSqM(aoi, frame);
  if (area < 100 || area > 1_000_000) return fail("invalid_input", ["Create AOI must be 100–1,000,000 m² in the bounded approximate frame."]);
  const critical = project.constraints.filter(c => c.severity === "critical" && ["unknown", "conflicting"].includes(c.status));
  if (critical.length && !options.allowUnverifiedDraft) return fail("critical_gap", critical.map(c => `${c.id}: ${c.label}; ${c.nextAction}`));
  if (!Number.isInteger(project.inputRevision) || project.inputRevision < 1) return fail("invalid_input", ["Project input revision is required."]);
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (!validDate(createdAt)) return fail("invalid_input", ["A valid design creation date is required."]);
  const preserved: CanonicalDesignBuilding[] = [];
  const priorScene = [...previous].reverse().find(d => d.scene?.variantId === "A") ?? previous.at(-1);
  const latestSeeds = project.scenarios.map(s => [...project.designVersions].reverse().find(d => d.scenarioId === s.id)).filter((d): d is DesignVersion => !!d);
  const retainedParameters = options.retainedBuildings ?? priorScene?.scene.buildings.filter(b => b.retained).map(b => ({
    objectId: b.id, use: b.use as Exclude<ConceptUse, "open_space">, levels: b.levels, heightM: b.heightM, assumptionIds: [...b.assumptionIds]
  })) ?? [];
  if (options.retainedBuildings === undefined && latestSeeds.some(d => d.retainedObjectIds.some(id => !retainedParameters.some(p => p.objectId === id)))) {
    return fail("invalid_input", ["Preserved seed objects require explicit use/height/floor parameters; no preserved object may be silently omitted."]);
  }
  if (new Set(retainedParameters.map(p => p.objectId)).size !== retainedParameters.length) return fail("invalid_input", ["Retained building IDs must be unique."]);
  for (const parameters of retainedParameters) {
    const object = project.objects.find(o => o.id === parameters.objectId && o.kind === "building");
    if (!object || object.geometry?.type !== "Polygon") return fail("invalid_input", [`${parameters.objectId}: a building Polygon is required; points are not footprints.`]);
    preserved.push({ id: object.id, label: object.label, footprint: structuredClone(object.geometry), levels: parameters.levels,
      heightM: parameters.heightM, floorHeightM: null, use: parameters.use, retained: true,
      assumptionIds: [...parameters.assumptionIds], terraceSharePct: 0, topFloorFootprint: structuredClone(object.geometry) });
  }
  const exclusionIds = options.exclusionConstraintIds ?? [...new Set(latestSeeds.flatMap(d => d.exclusionConstraintIds))];
  if (new Set(exclusionIds).size !== exclusionIds.length) return fail("invalid_input", ["Exclusion IDs must be unique."]);
  const zones: DesignExclusionZone[] = [];
  for (const id of exclusionIds) {
    const constraint = project.constraints.find(c => c.id === id);
    if (!constraint || constraint.geometry?.type !== "Polygon") return fail("invalid_input", [`${id}: an exclusion Polygon is required; missing geometry cannot be discarded.`]);
    zones.push({ id, label: constraint.label, geometry: structuredClone(constraint.geometry), reason: constraint.impact });
  }
  const defaults = defaultDesignProgrammes(project);
  const programmes = { A: options.programmes?.A ?? defaults.A, B: options.programmes?.B ?? defaults.B };
  for (const program of [programmes.A, programmes.B]) {
    const validation = validateRedevelopmentProgram(program);
    if (!validation.ok) return fail("invalid_input", validation.errors);
  }
  const a = programmes.A, b = programmes.B;
  const meaningfulProgramme = (p: RedevelopmentProgramInput) => ({ useMix: [...p.useMix].sort((l, r) => l.use.localeCompare(r.use)),
    massingStyle: p.massingStyle, blockCount: p.blockCount, levelsMin: p.levelsMin, levelsMax: p.levelsMax,
    targetSiteCoveragePct: p.targetSiteCoveragePct, openSpacePct: p.openSpacePct });
  if (stableJson(meaningfulProgramme(a)) === stableJson(meaningfulProgramme(b))) {
    return fail("invalid_input", ["A/B must have different functional programmes or density/height/open-space controls; relabelling is insufficient."]);
  }
  const designs: DesignScene[] = [];
  for (const variantId of ["A", "B"] as const) {
    const program = programmes[variantId], validation = validateRedevelopmentProgram(program);
    if (!validation.ok) return fail("invalid_input", validation.errors);
    if (program.massingStyle === "towers_on_podium") return fail("invalid_input", ["Stacked podium/tower editing is not supported by the E1 adapter; the legacy Create engine remains available."]);
    const scenario = project.scenarios.find(s => s.id === variantId) ?? project.scenarios[variantId === "A" ? 0 : 1];
    if (!scenario) return fail("invalid_input", [`Scenario ${variantId} must exist before creating its design.`]);
    const prior = [...previous].reverse().find(d => d.scene?.variantId === variantId);
    const revision = (prior?.revision ?? 0) + 1;
    const assumptions = ["Programme hypothesis; no market-demand or development-permission inference.",
      "Local equirectangular area approximation in metres; not a survey or registered area.",
      "Generated floor area uses constant floor plates except an explicitly inset top floor; no saleable coefficient.",
      "Requested coverage applies to new generated buildings; measured footprint also includes retained buildings. Open space is an unbuilt-area allowance, not designed landscape.",
      "Only geometric containment/contact are checked; fire access, daylight, structure, services and statutory compliance require professional review.",
      ...critical.map(c => `Unverified draft override: ${c.id} (${c.status}): ${c.label}`)];
    let accepted: DesignScene | null = null;
    let lastErrors: string[] = [];
    // Reuse the existing deterministic planner; never remove a constraint/building to fit.
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const massing = generateConceptMassing(aoi.coordinates as [number, number][][], validation.value,
          `${options.seed ?? project.id}:E1:${attempt}`, variantId);
        const buildings: CanonicalDesignBuilding[] = massing.featureCollection.features.map((feature, index) => ({
          id: `${project.id}:${variantId}:building-${index + 1}`, label: feature.properties.label,
          footprint: structuredClone(feature.geometry), levels: feature.properties.levels, use: feature.properties.use,
          retained: false, assumptionIds: ["generated_programme", "assumed_floor_height_3_4m"],
          heightM: feature.properties.heightM, floorHeightM: FLOOR_HEIGHT_M,
          terraceSharePct: 0, topFloorFootprint: structuredClone(feature.geometry)
        }));
        buildings.push(...structuredClone(preserved));
        const scene: CanonicalDesignScene = {
          schemaVersion: 1, methodVersion: DESIGN_METHOD_VERSION, geometryRevision: "", projectId: project.id,
          inputRevision: project.inputRevision, aoiId: project.aoi.id, aoiRevision: project.aoi.revision, programmeIdentity: identity(program), sourceInputIdentity: sourceInputIdentity(project), variantId,
          parent: prior ? { kind: "design", id: prior.id, revision: prior.revision } : null, lineageAction: "generate",
          crs: "EPSG:4326", metricFrame: structuredClone(frame), aoi: structuredClone(aoi), buildings,
          exclusionZones: structuredClone(zones), constraints: project.constraints.map(c => ({ id: c.id, status: c.status, severity: c.severity })),
          checks: ["single_ring_geometry", "AOI_containment", "no_building_contact", "preserved_objects", "exclusion_zones", "height_floor_consistency"], caveat: DESIGN_CAVEAT
        };
        scene.geometryRevision = sceneIdentity(scene);
        const design: DesignScene = {
          id: `${project.id}:design-${variantId}:r${revision}:${scene.geometryRevision}`, revision, scenarioId: scenario.id,
          label: program.title, createdAt, inputRevision: project.inputRevision, aoiId: project.aoi.id, aoiRevision: project.aoi.revision,
          program: structuredClone(program), buildings: buildings.map(summary), retainedObjectIds: preserved.map(p => p.id),
          exclusionConstraintIds: [...exclusionIds], assumptions, status: "review_required", scene: jsonScene(scene)
        };
        lastErrors = validateDesignScene(design);
        if (!lastErrors.length) { accepted = design; break; }
      } catch (error) { lastErrors = [error instanceof Error ? error.message : "Deterministic massing failed."]; }
    }
    if (!accepted) return fail("no_fit", [`Variant ${variantId}: bounded planner found no valid scene; previous designs and every constraint are retained.`, ...lastErrors]);
    designs.push(accepted);
  }
  return { ok: true, designs: designs as [DesignScene, DesignScene] };
}

export function editDesignBuilding(design: DesignScene, buildingId: string, patch: DesignBuildingPatch, expectedRevision: number, createdAt = new Date().toISOString()): DesignEditResult {
  const fail = (errors: string[]): DesignEditResult => ({ ok: false, design, errors });
  if (design.revision !== expectedRevision) return fail(["Design revision conflict; refresh before editing."]);
  const originalErrors = validateDesignScene(design);
  if (originalErrors.length) return fail(originalErrors);
  const index = design.scene.buildings.findIndex(b => b.id === buildingId);
  if (index < 0) return fail(["Selected building does not exist in this variant."]);
  if (design.scene.buildings[index].retained) return fail(["Preserved buildings are immutable in this operation; change the explicit source input in a new project revision."]);
  const allowed = ["levels", "floorHeightM", "use", "footprint", "translate", "terraceSharePct"];
  if (!patch || typeof patch !== "object" || !Object.keys(patch).length || Object.keys(patch).some(k => !allowed.includes(k))) return fail(["Provide a supported nonempty selected-building edit."]);
  if (patch.footprint && patch.translate) return fail(["Choose either a replacement footprint or translation in one edit."]);
  if (!validDate(createdAt)) return fail(["Invalid design revision date."]);
  const next = structuredClone(design), building = next.scene.buildings[index];
  try {
    if (patch.levels !== undefined) building.levels = patch.levels;
    if (patch.floorHeightM !== undefined) building.floorHeightM = patch.floorHeightM;
    if (patch.use !== undefined) building.use = patch.use;
    if (patch.footprint !== undefined) building.footprint = structuredClone(patch.footprint);
    if (patch.translate) building.footprint = translateDesignPolygon(building.footprint, patch.translate.eastM, patch.translate.northM, next.scene.metricFrame);
    if (patch.terraceSharePct !== undefined) building.terraceSharePct = patch.terraceSharePct;
    building.heightM = Number(building.levels) * Number(building.floorHeightM);
    building.topFloorFootprint = designTerraceTopPlate(building.footprint, building.terraceSharePct, next.scene.metricFrame);
    building.assumptionIds = [...new Set([...building.assumptionIds.filter(id => !id.startsWith("assumed_floor_height_") && !id.startsWith("user_assumed_floor_height_m:")),
      `user_assumed_floor_height_m:${building.floorHeightM}`, "user_edited_concept_parameters"])];
    next.scene.parent = { kind: "design", id: design.id, revision: design.revision };
    next.scene.lineageAction = "edit";
    delete next.scene.restoredFrom;
    next.scene.geometryRevision = sceneIdentity(next.scene);
    next.revision++;
    next.id = `${design.id.replace(/:r\d+:[a-f0-9]+$/, "")}:r${next.revision}:${next.scene.geometryRevision}`;
    next.createdAt = createdAt;
    next.buildings = next.scene.buildings.map(summary);
    const errors = validateDesignScene(next);
    if (errors.length) return fail(errors);
    return { ok: true, design: next, invalidated: ["areas", "finance", "kit"] };
  } catch (error) { return fail([error instanceof Error ? error.message : "Invalid edit; last valid design retained."]); }
}

/** Restoring history is a new current revision, never selection of an old stale ID. */
export function restoreDesignRevision(
  project: DevkitProject, current: DesignScene, prior: DesignScene, expectedRevision: number,
  createdAt = new Date().toISOString()
): DesignEditResult {
  const fail = (errors: string[]): DesignEditResult => ({ ok: false, design: current, errors });
  if (current.revision !== expectedRevision) return fail(["Design revision conflict; refresh before restoring."]);
  const errors = [...validateDesignScene(current), ...validateDesignScene(prior), ...validateDesignProjectLineage(project)];
  if (errors.length) return fail(errors);
  if (!validDate(createdAt)) return fail(["Invalid restoration date."]);
  const sameVersion = (a: DesignVersion, b: DesignVersion) => a.id === b.id && a.revision === b.revision;
  const currentIndex = project.designVersions.findIndex(d => sameVersion(d, current));
  const priorIndex = project.designVersions.findIndex(d => sameVersion(d, prior));
  const siblings = project.designVersions.filter(d => d.scenarioId === current.scenarioId && d.inputRevision === project.inputRevision);
  if (currentIndex < 0 || priorIndex < 0 || priorIndex >= currentIndex ||
    stableJson(project.designVersions[currentIndex]) !== stableJson(current) || stableJson(project.designVersions[priorIndex]) !== stableJson(prior) ||
    !siblings.length || !sameVersion(siblings[siblings.length - 1], current)) {
    return fail(["Restoration requires the current latest design and an earlier immutable version in this project."]);
  }
  if (prior.scenarioId !== current.scenarioId || prior.scene.variantId !== current.scene.variantId) return fail(["Cannot restore another concept into this variant."]);
  const inputIdentity = sourceInputIdentity(project);
  for (const design of [current, prior]) {
    if (!project.aoi || design.scene.projectId !== project.id || design.inputRevision !== project.inputRevision ||
      design.aoiId !== project.aoi.id || design.aoiRevision !== project.aoi.revision ||
      stableJson(design.scene.aoi) !== stableJson(aoiGeometry(project)) || design.scene.sourceInputIdentity !== inputIdentity) {
      return fail(["Historical geometry belongs to different project inputs or AOI; it cannot become the current design."]);
    }
  }
  const next = structuredClone(prior);
  next.revision = Math.max(...siblings.map(d => d.revision)) + 1;
  next.scene.parent = { kind: "design", id: current.id, revision: current.revision };
  next.scene.restoredFrom = { kind: "design", id: prior.id, revision: prior.revision };
  next.scene.lineageAction = "restore";
  next.scene.geometryRevision = sceneIdentity(next.scene);
  next.id = `${current.id.replace(/:r\d+:[a-f0-9]+$/, "")}:r${next.revision}:${next.scene.geometryRevision}`;
  next.createdAt = createdAt;
  next.status = "review_required";
  next.assumptions = [...prior.assumptions, `Restored from ${prior.id} revision ${prior.revision}; dependent artifacts require new derivation.`];
  next.buildings = next.scene.buildings.map(summary);
  const restoredErrors = validateDesignScene(next);
  if (restoredErrors.length) return fail(restoredErrors);
  return { ok: true, design: next, invalidated: ["areas", "finance", "kit"] };
}

export type DesignGeometryMeasurement = {
  designRef: VersionRef; geometryRevision: string; methodVersion: typeof DESIGN_METHOD_VERSION;
  units: "m2"; accuracy: "screening_approximation";
  buildings: Array<{ buildingId: string; use: ConceptUse; retained: boolean; levels: number | null;
    footprintAreaSqM: number; grossFloorAreaSqM: number | null; terraceAreaSqM: number | null; assumptions: string[] }>;
  footprintAreaSqM: number; grossFloorAreaSqM: number | null; terraceAreaSqM: number | null; missingInputs: string[];
};
export function measureDesignScene(design: DesignScene): DesignGeometryMeasurement {
  const errors = validateDesignScene(design);
  if (errors.length) throw new Error(errors.join(" "));
  const buildings = design.scene.buildings.map(building => {
    const footprint = designPolygonAreaSqM(building.footprint, design.scene.metricFrame);
    const top = designPolygonAreaSqM(building.topFloorFootprint, design.scene.metricFrame);
    return { buildingId: building.id, use: building.use, retained: building.retained, levels: building.levels,
      footprintAreaSqM: footprint, grossFloorAreaSqM: building.levels === null ? null : footprint * (building.levels - 1) + top,
      terraceAreaSqM: building.retained ? null : footprint - top, assumptions: building.retained ? ["Retained footprint repeated per known level; floor plates not surveyed."] : ["Constant lower floor plates; terrace excluded from enclosed gross area."] };
  });
  return {
    designRef: { kind: "design", id: design.id, revision: design.revision }, geometryRevision: design.scene.geometryRevision,
    methodVersion: DESIGN_METHOD_VERSION, units: "m2", accuracy: "screening_approximation", buildings,
    footprintAreaSqM: buildings.reduce((sum, b) => sum + b.footprintAreaSqM, 0),
    grossFloorAreaSqM: buildings.some(b => b.grossFloorAreaSqM === null) ? null : buildings.reduce((sum, b) => sum + Number(b.grossFloorAreaSqM), 0),
    terraceAreaSqM: buildings.some(b => b.terraceAreaSqM === null) ? null : buildings.reduce((sum, b) => sum + Number(b.terraceAreaSqM), 0),
    missingInputs: [
      ...buildings.filter(b => b.levels === null).map(b => `${b.buildingId}: retained floor count unknown; total gross area is unavailable.`),
      ...buildings.filter(b => b.retained).map(b => `${b.buildingId}: retained terraces/floor plates are not surveyed; terrace area is unknown.`)
    ]
  };
}

export type DesignRenderProperties = {
  id: string; buildingId: string | null; kind: "building" | "terrace_top" | "exclusion"; use: ConceptUse | null;
  baseM: number; heightM: number | null; retained: boolean; designId: string; designRevision: number; geometryRevision: string;
};
export function designSceneFeatureCollection(design: DesignScene): FeatureCollection<Polygon, DesignRenderProperties> {
  const errors = validateDesignScene(design);
  if (errors.length) throw new Error(errors.join(" "));
  const features: Array<Feature<Polygon, DesignRenderProperties>> = [];
  for (const building of design.scene.buildings) {
    const terrace = building.terraceSharePct > 0 && building.levels !== null && building.floorHeightM !== null;
    const properties: DesignRenderProperties = { id: building.id, buildingId: building.id, kind: "building", use: building.use,
      baseM: 0, heightM: terrace ? (building.levels! - 1) * building.floorHeightM! : building.heightM,
      retained: building.retained, designId: design.id, designRevision: design.revision, geometryRevision: design.scene.geometryRevision };
    // A single-level terrace has no lower enclosed prism; its top plate starts at datum.
    if (!terrace || building.levels! > 1) features.push({ type: "Feature", id: building.id, geometry: structuredClone(building.footprint), properties });
    if (terrace) features.push({ type: "Feature", id: `${building.id}:top`, geometry: structuredClone(building.topFloorFootprint), properties: {
      ...properties, id: `${building.id}:top`, kind: "terrace_top", baseM: (building.levels! - 1) * building.floorHeightM!, heightM: building.heightM
    } });
  }
  for (const zone of design.scene.exclusionZones) features.push({ type: "Feature", id: `exclusion:${zone.id}`, geometry: structuredClone(zone.geometry), properties: {
    id: `exclusion:${zone.id}`, buildingId: null, kind: "exclusion", use: null, baseM: 0, heightM: 0, retained: false,
    designId: design.id, designRevision: design.revision, geometryRevision: design.scene.geometryRevision
  } });
  return { type: "FeatureCollection", features };
}

/** Context gate for apply/save/reopen/export. Bounded JSON alone is not verified lineage. */
export function validateDesignProjectLineage(project: DevkitProject): string[] {
  try {
    const errors: string[] = [];
    const history = project.designVersions;
    const currentInputs = sourceInputIdentity(project);
    const sameVersion = (d: DesignVersion, ref: VersionRef) => d.id === ref.id && d.revision === ref.revision;
    const validRef = (ref: VersionRef) => ref && ref.kind === "design" && typeof ref.id === "string" && !!ref.id && Number.isInteger(ref.revision) && ref.revision >= 1;
    for (let index = 0; index < history.length; index++) {
      const design = history[index];
      if (!design.scene) continue; // Programme seeds make no geometry/lineage claim.
      const geometryErrors = validateDesignScene(design);
      if (geometryErrors.length) { errors.push(`${design.id}: ${geometryErrors.join(" ")}`); continue; }
      const scene = (design as DesignScene).scene;
      if (scene.lineageAction !== undefined && !["generate", "edit", "restore"].includes(scene.lineageAction)) errors.push(`${design.id}: unknown lineage action.`);
      if (scene.projectId !== project.id || design.inputRevision > project.inputRevision) errors.push(`${design.id}: foreign project or future input lineage.`);
      if (design.inputRevision === project.inputRevision && (!project.aoi || design.aoiId !== project.aoi.id || design.aoiRevision !== project.aoi.revision ||
        stableJson(scene.aoi) !== stableJson(aoiGeometry(project)) || scene.sourceInputIdentity !== currentInputs)) errors.push(`${design.id}: current-input geometry is bound to different source content.`);
      const earlier = history.slice(0, index).filter(d => d.scene && d.scenarioId === design.scenarioId);
      const latestPrior = earlier.at(-1);
      if (scene.parent === null) {
        if (latestPrior) errors.push(`${design.id}: a previous canonical design exists but parent lineage is missing.`);
      } else if (!validRef(scene.parent)) errors.push(`${design.id}: malformed parent reference.`);
      else {
        const parentIndex = history.findIndex(d => sameVersion(d, scene.parent!));
        const parent = history[parentIndex] as DesignScene | undefined;
        if (parentIndex < 0 || !parent?.scene) errors.push(`${design.id}: exact parent revision is missing.`);
        else if (parentIndex >= index) errors.push(`${design.id}: cyclic or forward parent lineage.`);
        else if (parent.scenarioId !== design.scenarioId || parent.scene.projectId !== project.id || parent.scene.variantId !== scene.variantId ||
          !latestPrior || !sameVersion(latestPrior, scene.parent)) errors.push(`${design.id}: parent must be the latest earlier canonical revision of this project/scenario.`);
        else if (parent.inputRevision > design.inputRevision) errors.push(`${design.id}: parent has future source inputs.`);
        else if (parent.inputRevision < design.inputRevision) {
          if (scene.lineageAction !== "generate") errors.push(`${design.id}: crossing source revisions requires fresh generation, not copying/editing historical geometry.`);
        } else if (parent.aoiId !== design.aoiId || parent.aoiRevision !== design.aoiRevision || parent.scene.sourceInputIdentity !== scene.sourceInputIdentity) {
          errors.push(`${design.id}: same-input parent refers to different AOI/source content.`);
        }
      }
      if (scene.restoredFrom !== undefined) {
        if (!validRef(scene.restoredFrom) || scene.lineageAction !== "restore") errors.push(`${design.id}: invalid restoration lineage.`);
        else {
          const sourceIndex = history.findIndex(d => sameVersion(d, scene.restoredFrom!));
          const source = history[sourceIndex] as DesignScene | undefined;
          if (sourceIndex < 0 || sourceIndex >= index || !source?.scene || source.scenarioId !== design.scenarioId || source.scene.projectId !== project.id ||
            source.inputRevision !== design.inputRevision || source.aoiId !== design.aoiId || source.aoiRevision !== design.aoiRevision || source.scene.sourceInputIdentity !== scene.sourceInputIdentity) {
            errors.push(`${design.id}: restoration source must be an earlier same-project/scenario/input revision.`);
          } else if (stableJson(source.scene.buildings) !== stableJson(scene.buildings) || stableJson(source.program) !== stableJson(design.program) ||
            stableJson(source.scene.exclusionZones) !== stableJson(scene.exclusionZones)) errors.push(`${design.id}: restored geometry/programme differs from its declared source.`);
        }
      } else if (scene.lineageAction === "restore") errors.push(`${design.id}: restoration source reference is missing.`);
    }
    return errors;
  } catch { return ["Malformed project design lineage; preserve the last qualified snapshot."]; }
}

/** Append history and mark only affected artifact descendants stale. Parent owns persistence. */
export function applyDesignVersions(project: DevkitProject, designs: DesignScene[], activeId = designs[0]?.id): DevkitProject {
  for (const design of designs) {
    const errors = validateDesignScene(design);
    if (errors.length) throw new Error(errors.join(" "));
    if (!project.aoi || design.scene.projectId !== project.id || design.inputRevision !== project.inputRevision || design.aoiId !== project.aoi.id || design.aoiRevision !== project.aoi.revision ||
      stableJson(design.scene.aoi) !== stableJson(aoiGeometry(project)) || design.scene.sourceInputIdentity !== sourceInputIdentity(project)) {
      throw new Error("Cannot attach geometry from different project inputs or AOI revision.");
    }
    if (!project.scenarios.some(s => s.id === design.scenarioId)) throw new Error("Design scenario is not in this project.");
  }
  const replacedScenarios = new Set(designs.map(d => d.scenarioId));
  const obsolete = new Set(project.designVersions.filter(d => replacedScenarios.has(d.scenarioId) && !designs.some(n => n.id === d.id && n.revision === d.revision)).map(d => `design:${d.id}:${d.revision}`));
  const key = (ref: VersionRef) => `${ref.kind}:${ref.id}:${ref.revision}`;
  let changed = true;
  while (changed) {
    changed = false;
    for (const artifact of project.derivedArtifacts) {
      const artifactKey = key(artifact);
      if (!obsolete.has(artifactKey) && artifact.inputs.some(ref => obsolete.has(key(ref)))) { obsolete.add(artifactKey); changed = true; }
    }
  }
  const history = [...project.designVersions];
  for (const design of designs) {
    const existing = history.find(d => d.id === design.id && d.revision === design.revision);
    if (existing && stableJson(existing) !== stableJson(design)) throw new Error("Design identity collision; previous history retained.");
    if (!existing) history.push(structuredClone(design));
  }
  if (activeId && !history.some(d => d.id === activeId)) throw new Error("Active design revision is absent.");
  const active = history.find(d => d.id === activeId);
  if (active) {
    const siblings = history.filter(d => d.scenarioId === active.scenarioId && d.inputRevision === project.inputRevision);
    const latest = siblings.at(-1);
    if (!latest || latest.id !== active.id || latest.revision !== active.revision) throw new Error("Historical design is stale; restore it as a new revision instead of making it current.");
  }
  const lineageErrors = validateDesignProjectLineage({ ...project, designVersions: history });
  if (lineageErrors.length) throw new Error(lineageErrors.join(" "));
  return { ...project, updatedAt: new Date().toISOString(), designVersions: history,
    activeDesignVersionId: activeId ?? project.activeDesignVersionId,
    derivedArtifacts: project.derivedArtifacts.map(a => obsolete.has(key(a)) ? { ...a, status: "stale" } : a) };
}
