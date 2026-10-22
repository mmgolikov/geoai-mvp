import type { DevkitProject, DerivedArtifact, DesignVersion, JsonObject, JsonValue, KitArtifact, VersionRef } from "./contracts";
import { DEVKIT_RENDER_VERSION, escapeExportText as esc, renderCanonicalScene, type ExportCanonicalScene, type ExportPolygon } from "./render-scene";
import { applyDesignVersions, validateDesignScene, type DesignScene } from "./design";
import { parseDevkitProject } from "./project-store";
import { AREA_METHOD_VERSION, parseAreaScheduleResult } from "./areas";
import { FINANCE_METHOD_VERSION, parseMonthlyFinanceResult } from "./finance";

export const DEVKIT_EXPORT_VERSION = "geoai-devkit-kit-1";
export const DEVKIT_TEMPLATE_VERSION = "memo-album-2026-10-22.1";
export const DEVKIT_EXPORT_CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
export const DEVKIT_EXPORT_MAX_BYTES = 8 * 1024 * 1024;
export type DevkitExportFile = { path: string; mediaType: string; content: string; bytes: number; sha256: string };
export type DevkitExportIssue = { code: string; section: string; reference: string | null; detail: string };
export type DevkitKitManifest = {
  format: typeof DEVKIT_EXPORT_VERSION; schemaVersion: 1; templateVersion: string; rendererVersion: string;
  generatedAt: string; projectId: string; projectRevision: number; inputRevision: number; snapshotHash: string;
  status: "coherent_draft" | "partial_draft"; kitMaturity: "K1_candidate" | "K0_incomplete";
  financeMaturity: "conditional_unreviewed" | "unavailable"; review: "not_performed"; submission: "not_submitted";
  storageMode: "browser_local_on_this_device"; dataClass: DevkitProject["dataClass"];
  versions: { designs: VersionRef[]; artifacts: { ref: VersionRef; inputs: VersionRef[]; methodVersion: string; status: string }[]; procedures: { id: string; version: string | null; status: string }[] };
  historicalRefs: VersionRef[];
  selection: "last_appended_saved_design_per_scenario_exact_derivations";
  sections: { id: string; status: "draft" | "partial" | "missing"; references: string[] }[];
  sourceInputs: { evidenceId: string; sourceId: string; responseHash: string | null; acquiredAt: string | null; validAt: string | null; status: string; rights: DevkitProject["evidence"][number]["rights"]; provenance: JsonObject | null }[];
  issues: DevkitExportIssue[]; files: Omit<DevkitExportFile, "content">[];
  integrityScope: "sha256_payload_bytes_manifest_excludes_itself"; caveat: string;
};
export type DevelopmentKit = { manifest: DevkitKitManifest; files: DevkitExportFile[]; artifact: KitArtifact };
export type DevelopmentKitBundle = { format: "GEOAI_DEVKIT_BUNDLE"; schemaVersion: 1; manifest: DevkitKitManifest; files: DevkitExportFile[] };
export type SourceMetadataDraft = {
  manifest: { format: "geoai-devkit-source-metadata-1"; schemaVersion: 1; generatedAt: string; projectId: string; projectRevision: number; originalSnapshotHash: string; status: "metadata_only_draft"; importableProject: false; originalSnapshotIncluded: false; omitted: string[]; files: Omit<DevkitExportFile, "content">[]; caveat: string };
  files: DevkitExportFile[];
};

const refOf = (item: DesignVersion | DerivedArtifact): VersionRef => ({ kind: "kind" in item ? item.kind : "design", id: item.id, revision: item.revision });
const refKey = (ref: VersionRef) => `${ref.kind}:${ref.id}@${ref.revision}`;
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;
export async function devkitSha256(content: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("DEVKIT_EXPORT_CRYPTO_UNAVAILABLE");
  const hash = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Sorted JSON key encoding is an integrity signature, never evidence of correctness or authority. */
export function canonicalDevkitJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalDevkitJson).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value as object).sort().map(key => `${JSON.stringify(key)}:${canonicalDevkitJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  throw new Error("DEVKIT_EXPORT_NON_JSON_INPUT");
}

function assertSnapshot(project: DevkitProject): void {
  if (project.schemaVersion !== 1 || !project.id || !Number.isInteger(project.revision) || project.revision < 1 || !Number.isInteger(project.inputRevision) || project.inputRevision < 1 || project.storageMode !== "browser_local_on_this_device" || !["public_demo", "synthetic_demo"].includes(project.dataClass) || project.caveat !== DEVKIT_EXPORT_CAVEAT) throw new Error("DEVKIT_EXPORT_INVALID_SAVED_SNAPSHOT");
  const raw = canonicalDevkitJson(project);
  if (byteLength(raw) > DEVKIT_EXPORT_MAX_BYTES) throw new Error("DEVKIT_EXPORT_INPUT_TOO_LARGE");
  // Rights travel with originals and derivatives; a local draft is still redistribution.
  if (project.evidence.some(evidence => (evidence.status !== "unavailable" || evidence.excerpt !== null || evidence.rights.redistribution === "not_allowed") && (evidence.rights.redistribution !== "allowed" || evidence.rights.permittedUse === "unknown"))) throw new Error("DEVKIT_EXPORT_RIGHTS_UNRESOLVED");
}

function selectKitInputs(project: DevkitProject): { scoped: DevkitProject; historicalRefs: VersionRef[] } {
  const designs = project.scenarios.flatMap(scenario => {
    const candidates = project.designVersions.filter(design => design.scenarioId === scenario.id);
    const current = candidates.filter(design => design.inputRevision === project.inputRevision);
    const pool = current.length ? current : candidates;
    const last = pool.at(-1);
    return last ? [last] : [];
  });
  const latest = project.derivedArtifacts.filter(item => item.kind !== "kit" && !project.derivedArtifacts.some(other => other.kind === item.kind && other.id === item.id && other.revision > item.revision));
  const selected = new Map<string, DerivedArtifact>();
  for (const design of designs) {
    const exactAreas = latest.filter(item => item.kind === "areas" && item.inputs.some(ref => refKey(ref) === refKey(refOf(design))));
    const fallbackAreas = latest.filter(item => item.kind === "areas" && item.inputs.some(ref => ref.kind === "design" && project.designVersions.some(old => old.id === ref.id && old.revision === ref.revision && old.scenarioId === design.scenarioId)));
    for (const area of exactAreas.length ? exactAreas : fallbackAreas) {
      selected.set(refKey(refOf(area)), area);
      const exactFinance = latest.filter(item => item.kind === "finance" && item.inputs.some(ref => refKey(ref) === refKey(refOf(area))));
      const oldFinance = latest.filter(item => item.kind === "finance" && item.inputs.some(ref => ref.kind === "areas" && fallbackAreas.some(old => old.id === ref.id && old.revision === ref.revision)));
      for (const finance of exactFinance.length ? exactFinance : oldFinance) selected.set(refKey(refOf(finance)), finance);
    }
  }
  // Without any connected result, retain the orphan section so its exact mismatch stays visible.
  for (const kind of ["areas", "finance"] as const) if (![...selected.values()].some(item => item.kind === kind)) latest.filter(item => item.kind === kind).forEach(item => selected.set(refKey(refOf(item)), item));
  const used = new Set([...designs.map(refOf), ...[...selected.values()].map(refOf)].map(refKey));
  return { scoped: { ...project, designVersions: designs, derivedArtifacts: [...selected.values()] }, historicalRefs: [...project.designVersions, ...project.derivedArtifacts].map(refOf).filter(ref => !used.has(refKey(ref))) };
}

/** Produce a plan from the persisted design footprints. Unstored heights are deliberately unknown. */
export function exportSceneFromSnapshot(project: DevkitProject, design: DesignVersion): ExportCanonicalScene {
  if (!project.aoi || design.aoiId !== project.aoi.id || design.aoiRevision !== project.aoi.revision || design.inputRevision !== project.inputRevision) throw new Error("DEVKIT_EXPORT_STALE_DESIGN");
  const canonical = design as DesignScene;
  if (canonical.scene) {
    const errors = validateDesignScene(canonical);
    if (errors.length || canonical.scene.projectId !== project.id || canonicalDevkitJson(canonical.scene.aoi.coordinates) !== canonicalDevkitJson(project.aoi.coordinates)) throw new Error(`DEVKIT_EXPORT_INVALID_CANONICAL_SCENE: ${errors.join("; ")}`);
    // Reuse Create's pure attachment guard for sourceInputIdentity. Its returned candidate is discarded.
    // Export retains the original saved revision/timestamp and never persists this validation candidate.
    applyDesignVersions(project, [canonical], canonical.id);
    const building = (item: DesignScene["scene"]["buildings"][number]) => ({ id: item.id, footprint: item.footprint as ExportPolygon, floors: item.levels, heightM: item.heightM, floorHeightM: item.floorHeightM, topFloorFootprint: item.topFloorFootprint as ExportPolygon, use: item.use });
    return { projectId: project.id, snapshotId: `${project.id}@${project.revision}`, variantId: canonical.scene.variantId, revisionId: `${refKey(refOf(design))} · geometry ${canonical.scene.geometryRevision}`, geometryCrs: canonical.scene.crs,
      aoi: { id: canonical.scene.aoiId, revisionId: String(canonical.scene.aoiRevision), geometry: canonical.scene.aoi as ExportPolygon },
      buildings: canonical.scene.buildings.filter(item => !item.retained).map(building), preservedBuildings: canonical.scene.buildings.filter(item => item.retained).map(building), exclusionZones: canonical.scene.exclusionZones.map(item => ({ id: item.id, geometry: item.geometry as ExportPolygon, reason: item.reason })) };
  }
  const retained = project.objects.filter(object => design.retainedObjectIds.includes(object.id));
  if (retained.some(object => object.geometry?.type !== "Polygon")) throw new Error("DEVKIT_EXPORT_RETAINED_GEOMETRY_MISSING");
  const exclusions = project.constraints.filter(constraint => design.exclusionConstraintIds.includes(constraint.id));
  if (exclusions.length !== design.exclusionConstraintIds.length || exclusions.some(constraint => constraint.geometry?.type !== "Polygon")) throw new Error("DEVKIT_EXPORT_EXCLUSION_GEOMETRY_MISSING");
  if (retained.length !== design.retainedObjectIds.length) throw new Error("DEVKIT_EXPORT_RETAINED_OBJECT_MISSING");
  const fromDesign = (building: DesignVersion["buildings"][number]) => ({ id: building.id, footprint: building.footprint as ExportPolygon, floors: building.levels, heightM: null, use: building.use });
  return {
    projectId: project.id, snapshotId: `${project.id}@${project.revision}`, variantId: design.scenarioId, revisionId: refKey(refOf(design)), geometryCrs: project.aoi.crs,
    aoi: { id: project.aoi.id, revisionId: String(project.aoi.revision), geometry: { type: "Polygon", coordinates: project.aoi.coordinates } },
    buildings: design.buildings.filter(building => !building.retained).map(fromDesign),
    preservedBuildings: [...design.buildings.filter(building => building.retained).map(fromDesign), ...retained.filter(object => !design.buildings.some(building => building.id === object.id)).map(object => ({ id: object.id, footprint: object.geometry as ExportPolygon, floors: null, heightM: null, use: null }))],
    exclusionZones: exclusions.map(constraint => ({ id: constraint.id, geometry: constraint.geometry as ExportPolygon, reason: constraint.impact }))
  };
}

function inspectSnapshot(project: DevkitProject): DevkitExportIssue[] {
  const issues: DevkitExportIssue[] = [];
  const add = (code: string, section: string, reference: string | null, detail: string) => issues.push({ code, section, reference, detail });
  const all = [...project.designVersions, ...project.derivedArtifacts];
  const index = new Map(all.map(item => [refKey(refOf(item)), item]));
  if (index.size !== all.length) throw new Error("DEVKIT_EXPORT_DUPLICATE_VERSION");
  const visited = new Set<string>(), visiting = new Set<string>();
  function visit(item: DesignVersion | DerivedArtifact): void {
    const key = refKey(refOf(item));
    if (visiting.has(key)) { add("DEPENDENCY_CYCLE", "versions", key, "Cyclic dependency cannot establish a coherent draft."); return; }
    if (visited.has(key)) return;
    visiting.add(key);
    if (item.inputRevision !== project.inputRevision) add("STALE_INPUT_REVISION", "versions", key, `Input ${item.inputRevision}; snapshot input ${project.inputRevision}.`);
    if ("kind" in item) {
      if (["stale", "blocked"].includes(item.status)) add("DERIVATION_NOT_CURRENT", item.kind, key, item.status);
      if (item.kind === "areas" && !item.inputs.some(ref => ref.kind === "design")) add("DESIGN_REFERENCE_MISSING", "areas", key, "An area schedule requires its exact design reference.");
      if (item.kind === "finance" && !item.inputs.some(ref => ref.kind === "areas")) add("AREA_REFERENCE_MISSING", "finance", key, "Finance requires its exact area schedule reference.");
      for (const missing of item.missingInputs) add("MISSING_INPUT", item.kind, key, missing);
      for (const ref of item.inputs) {
        const parent = index.get(refKey(ref));
        if (!parent) add("VERSION_REFERENCE_MISMATCH", item.kind, key, `Missing ${refKey(ref)}.`);
        else visit(parent);
      }
      const input = item.data.input;
      if (input && typeof input === "object" && !Array.isArray(input)) {
        if (input.projectId !== undefined && input.projectId !== project.id || input.inputRevision !== undefined && input.inputRevision !== project.inputRevision) add("CALCULATION_SCOPE_MISMATCH", item.kind, key, "Saved calculation project/input revision differs from this snapshot.");
        if (item.kind === "areas") {
          const parentRef = item.inputs.find(ref => ref.kind === "design");
          const design = parentRef ? index.get(refKey(parentRef)) as DesignScene | undefined : undefined;
          if (input.design && canonicalDevkitJson(input.design) !== canonicalDevkitJson(parentRef ?? null)) add("AREA_DESIGN_REFERENCE_MISMATCH", "areas", key, "Area data and envelope reference different design versions.");
          if (input.geometryVersion !== undefined && design?.scene && input.geometryVersion !== design.scene.geometryRevision) add("AREA_GEOMETRY_VERSION_MISMATCH", "areas", key, "Saved areas belong to another canonical geometry revision.");
        }
        if (item.kind === "finance") {
          const parentRef = item.inputs.find(ref => ref.kind === "areas");
          const area = parentRef ? index.get(refKey(parentRef)) as DerivedArtifact | undefined : undefined;
          if (input.areaRef && canonicalDevkitJson(input.areaRef) !== canonicalDevkitJson(parentRef ?? null)) add("FINANCE_AREA_REFERENCE_MISMATCH", "finance", key, "Finance data and envelope reference different area versions.");
          if (input.areaCalculationVersion !== undefined && area && input.areaCalculationVersion !== area.data.version) add("FINANCE_CALCULATION_VERSION_MISMATCH", "finance", key, "Finance uses another area calculation version.");
          const areaInput = area?.data.input;
          if (item.data.geometryVersion !== undefined && areaInput && typeof areaInput === "object" && !Array.isArray(areaInput) && item.data.geometryVersion !== areaInput.geometryVersion) add("FINANCE_GEOMETRY_VERSION_MISMATCH", "finance", key, "Finance and area geometry versions disagree.");
        }
      }
      if (["blocked", "stale", "partial"].includes(String(item.data.status))) add("CALCULATION_NOT_COMPLETE", item.kind, key, String(item.data.status));
      if (Array.isArray(item.data.errors) && item.data.errors.length) add("CALCULATION_ERRORS", item.kind, key, item.data.errors.map(String).join("; "));
      if (item.kind === "areas" && item.methodVersion === AREA_METHOD_VERSION && !parseAreaScheduleResult(item.data)) add("AREA_PAYLOAD_REJECTED", "areas", key, "The saved area payload did not pass its module validator; quantities are withheld from the memo.");
      if (item.kind === "finance" && item.methodVersion === FINANCE_METHOD_VERSION) {
        const areaRef = item.inputs.find(ref => ref.kind === "areas");
        const parent = areaRef ? index.get(refKey(areaRef)) as DerivedArtifact | undefined : undefined;
        const area = parent ? parseAreaScheduleResult(parent.data) : null;
        if (!area || !parseMonthlyFinanceResult(item.data, area)) add("FINANCE_PAYLOAD_REJECTED", "finance", key, "The saved finance payload did not pass its module validator; quantities are withheld from the memo.");
      }
    } else if (!project.aoi || item.aoiId !== project.aoi.id || item.aoiRevision !== project.aoi.revision) add("AOI_VERSION_MISMATCH", "design", key, "AOI identity/revision differs from saved design.");
    visiting.delete(key); visited.add(key);
  }
  all.forEach(visit);
  if (!project.aoi) add("AOI_MISSING", "design", null, "Drawn AOI is absent; this does not establish a parcel.");
  const currentDesigns = project.designVersions.filter(design => design.inputRevision === project.inputRevision && design.aoiId === project.aoi?.id && design.aoiRevision === project.aoi?.revision);
  if (new Set(currentDesigns.map(design => design.scenarioId)).size < 2) add("TWO_ALTERNATIVES_MISSING", "design", null, "Two current scenario alternatives are required for a complete E1 draft.");
  currentDesigns.filter(design => !design.buildings.some(building => !building.retained)).forEach(design => add("DESIGN_GEOMETRY_MISSING", "design", refKey(refOf(design)), "No proposed building geometry is saved for this alternative."));
  if (currentDesigns.length >= 2 && new Set(currentDesigns.map(design => canonicalDevkitJson({ program: design.program, buildings: design.buildings.map(building => ({ footprint: building.footprint, levels: building.levels, use: building.use, retained: building.retained })) })) ).size < 2) add("ALTERNATIVES_IDENTICAL", "design", null, "Distinct labels/IDs alone do not establish two meaningful alternatives.");
  for (const kind of ["areas", "finance"] as const) {
    if (!project.derivedArtifacts.some(item => item.kind === kind)) add("SECTION_MISSING", kind, null, `No saved ${kind} result.`);
    for (const design of currentDesigns) {
      const areaRefs = project.derivedArtifacts.filter(item => item.kind === "areas" && item.inputs.some(ref => refKey(ref) === refKey(refOf(design))));
      if (kind === "areas" && !areaRefs.length) add("DESIGN_AREA_MISSING", kind, refKey(refOf(design)), "No area schedule references this design revision.");
      if (kind === "finance" && !areaRefs.some(area => project.derivedArtifacts.some(item => item.kind === "finance" && item.inputs.some(ref => refKey(ref) === refKey(refOf(area)))))) add("DESIGN_FINANCE_MISSING", kind, refKey(refOf(design)), "No finance run references this design area schedule.");
    }
  }
  if (!project.evidence.length) add("EVIDENCE_MISSING", "sources", null, "No evidence is saved.");
  project.evidence.filter(item => item.status !== "available" || item.trust === "unavailable").forEach(item => add("EVIDENCE_GAP", "sources", item.id, `${item.status}: ${item.label}`));
  project.evidence.filter(item => item.rights.redistribution !== "allowed" || item.rights.permittedUse === "unknown").forEach(item => add("SOURCE_RIGHTS_UNRESOLVED", "sources", item.id, "Only source metadata is retained; reuse rights are unresolved."));
  const evidenceIds = new Set(project.evidence.map(item => item.id));
  for (const item of [...project.claims, ...project.constraints, ...project.objects]) for (const evidenceId of item.evidenceIds) if (!evidenceIds.has(evidenceId)) add("EVIDENCE_REFERENCE_MISSING", "sources", item.id, evidenceId);
  project.claims.filter(claim => ["unknown", "conflicting"].includes(claim.status)).forEach(claim => add("CLAIM_UNRESOLVED", "sources", claim.id, `${claim.field}: ${claim.explanation}`));
  project.constraints.filter(constraint => constraint.severity === "critical" && !["source_backed"].includes(constraint.status)).forEach(constraint => add("CRITICAL_CONSTRAINT_UNRESOLVED", "risks", constraint.id, `${constraint.label}: ${constraint.nextAction}`));
  if (!project.procedures.length) add("PROCEDURE_MISSING", "procedure", null, "Authority, applicant and current template require confirmation.");
  for (const procedure of project.procedures) {
    for (const [field, value] of Object.entries({ authority: procedure.authority, applicant: procedure.applicant, version: procedure.version, sourceUrl: procedure.sourceUrl })) if (!value) add("PROCEDURE_FIELD_MISSING", "procedure", procedure.id, field);
    procedure.missingInputs.forEach(missing => add("MANDATORY_ATTACHMENT_MISSING", "procedure", procedure.id, missing));
  }
  return issues;
}

const cell = (value: unknown) => `<td>${esc(value === null || value === undefined ? "unknown / неизвестно" : typeof value === "object" ? JSON.stringify(value) : value)}</td>`;
function table(headers: string[], rows: unknown[][]): string {
  return `<div class="table-scroll"><table><thead><tr>${headers.map(header => `<th scope="col">${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(cell).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">unknown / неизвестно</td></tr>`}</tbody></table></div>`;
}
function dataView(value: JsonValue, depth = 0): string {
  if (value === null || typeof value !== "object") return esc(value === null ? "unknown / неизвестно" : value);
  if (depth > 5) return `<pre>${esc(json(value))}</pre>`;
  if (Array.isArray(value)) {
    const records = value.filter(item => item && !Array.isArray(item) && typeof item === "object") as JsonObject[];
    if (records.length === value.length && value.length) { const keys = Array.from(new Set(records.flatMap(record => Object.keys(record)))); return keys.length <= 8 ? table(keys, records.map(record => keys.map(key => record[key]))) : records.map((record, index) => `<article><h4>#${index + 1}</h4>${dataView(record, depth + 1)}</article>`).join(""); }
    return `<ul>${value.map(item => `<li>${dataView(item, depth + 1)}</li>`).join("")}</ul>`;
  }
  return `<dl>${Object.entries(value).map(([key, child]) => `<dt>${esc(key)}</dt><dd>${dataView(child, depth + 1)}</dd>`).join("")}</dl>`;
}

function renderMemo(project: DevkitProject, manifest: DevkitKitManifest, images: { design: DesignVersion; svg: string }[], locale: "en" | "ru"): string {
  const ru = locale === "ru", heading = (en: string, russian: string) => ru ? russian : en;
  const title = heading("Development kit · draft memo and album", "Комплект проекта · черновая записка и альбом");
  const section = (name: string, content: string) => `<section><h2>${esc(name)}</h2>${content}</section>`;
  const renderArtifact = (kind: "areas" | "finance") => project.derivedArtifacts.filter(item => item.kind === kind).map(item => {
    const rejected = manifest.issues.some(issue => issue.reference === refKey(refOf(item)) && issue.code.endsWith("PAYLOAD_REJECTED"));
    const contents = rejected ? `<p class="warning">${heading("Saved payload rejected by its module validator; quantities withheld. Original data remain in project.json for diagnosis.", "Сохранённые данные отклонены валидатором модуля; цифры не показаны. Оригинал сохранён в project.json для диагностики.")}</p>` : dataView(item.data);
    return `<article><h3>${esc(refKey(refOf(item)))}</h3><p>${esc(item.status)} · ${esc(item.methodVersion)} · ${esc(item.inputs.map(refKey).join("; "))}</p>${contents}<p>${esc(item.assumptions.join("; "))}</p>${item.missingInputs.length ? `<p class="warning">${esc(item.missingInputs.join("; "))}</p>` : ""}</article>`;
  }).join("") || `<p>${heading("No saved result. Unknown values are not zero.", "Сохранённого результата нет. Неизвестные значения не равны нулю.")}</p>`;
  const sources = table(["Evidence / объект", "Source / источник", "Status / статус", "Dates / даты", "Hash", "Rights / права", "Fragment / фрагмент", "Provenance / происхождение"], project.evidence.map(evidence => [evidence.id + " · " + evidence.subjectId, [evidence.sourceId, evidence.sourceUrl].filter(Boolean).join(" · "), evidence.status + " · " + evidence.trust, `acquired: ${evidence.acquiredAt ?? "unknown"}; valid: ${evidence.validAt ?? "unknown"}`, evidence.responseHash, evidence.rights, evidence.excerpt, evidence.provenance ?? null]));
  const procedure = project.procedures.length ? project.procedures.map(item => `<article><h3>${esc(item.label)}</h3>${table(["Field / поле", "Draft value / черновик"], [["Authority", item.authority], ["Applicant", item.applicant], ["Template version", item.version], ["Source", item.sourceUrl], ["Status", item.status], ["Missing mandatory inputs", item.missingInputs.join("; ") || null], ["Submission", "NOT SUBMITTED / НЕ ПОДАНО"]])}</article>`).join("") : `<p>${heading("Applicable procedure/template not established. Confirm authority and applicant before preparing an official form.", "Применимая процедура и форма не установлены. Сначала подтвердить орган и заявителя.")}</p>`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; base-uri 'none'; form-action 'none'"><title>${esc(project.brief.title)} · ${esc(title)}</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font:14px/1.5 Arial,sans-serif;color:#183242;background:#fff;margin:0 auto;padding:28px;max-width:1160px}h1{font-size:30px;line-height:1.15}h2{font-size:23px;margin-top:0}h3{font-size:17px}p,li,dd,td,th,pre{overflow-wrap:anywhere}.badge{display:inline-block;padding:5px 10px;background:#e6f4f4;border:1px solid #9ac6c9;border-radius:6px;font-weight:bold}.warning{background:#fffbeb;border-left:4px solid #a16207;padding:12px}.meta{color:#465a6c}section{border-top:1px solid #cfd8df;padding-top:22px;margin-top:26px}article{margin:20px 0}figure{margin:14px 0;break-inside:avoid}svg{width:100%;height:auto;max-width:960px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #cad6dc;padding:7px;text-align:left;vertical-align:top}th{background:#f0f6f6}pre{white-space:pre-wrap;font-size:11px}.table-scroll{width:100%;overflow:auto}dt{font-weight:bold}dd{margin:4px 0 14px}footer{margin-top:24px;font-size:11px;color:#465a6c}@media(max-width:600px){body{padding:16px}h1{font-size:24px}h2{font-size:20px}.table-scroll{overflow-x:auto}td,th{min-width:100px}}@media print{body{padding:0;max-width:none;font-size:10pt}.table-scroll{overflow:visible}table{table-layout:fixed;font-size:8pt}td,th{padding:4px}thead{display:table-header-group}tr{break-inside:avoid}section{break-before:auto}h2,h3{break-after:avoid}.no-print{display:none}}</style></head><body><header><p class="meta">GeoAI · ${esc(manifest.templateVersion)}</p><h1>${esc(project.brief.title)}</h1><p>${esc(title)}</p><p class="badge">${esc(manifest.status)} · ${esc(manifest.kitMaturity)} · ${esc(manifest.financeMaturity)}</p><p>${esc(project.id)} @ ${project.revision} · input ${project.inputRevision} · ${esc(manifest.generatedAt)}</p><p class="warning">${esc(DEVKIT_EXPORT_CAVEAT)}</p><p>${heading("Local public/synthetic snapshot. Review not performed. Procedure draft only; not submitted. Use browser Print to save this memo as PDF.", "Локальный публичный/синтетический снимок. Review не выполнен. Обращение — только черновик, не подано. Для PDF используйте печать браузера.")}</p><p>${esc(project.dataClass)} · ${esc(project.storageMode)}</p></header>${section(heading("Decision and assumptions", "Решение и предпосылки"), `<p>${esc(project.brief.objective)}</p><p>${esc(project.brief.strategy)}</p>${table(["Budget amount", "Currency", "Includes land"], [[project.brief.budget.amount, project.brief.budget.currency, project.brief.budget.includesLand]])}<ul>${[...project.brief.requirements, ...project.brief.assumptions].map(item => `<li>${esc(item)}</li>`).join("")}</ul>`)}${section(heading("Versions and open gaps", "Версии и открытые пробелы"), `<p>Snapshot SHA-256: ${esc(manifest.snapshotHash)}</p>${table(["Section", "Status", "References"], manifest.sections.map(item => [item.id, item.status, item.references.join("; ")]))}${table(["Gap", "Section", "Reference", "Required action / detail"], manifest.issues.map(issue => [issue.code, issue.section, issue.reference, issue.detail]))}`)}${section(heading("Canonical design album", "Альбом сохранённой геометрии"), images.map(({ design, svg }) => `<figure><h3>${esc(design.label)} · ${esc(refKey(refOf(design)))}</h3>${svg}<figcaption>${esc(design.assumptions.join("; "))}</figcaption></figure>`).join("") || `<p>${heading("No current scene could be rendered. See version gaps.", "Актуальную сцену отобразить не удалось. См. пробелы версий.")}</p>`)}${section(heading("Area schedules · saved methods", "Ведомости площадей · сохранённые методики"), renderArtifact("areas"))}${section(heading("Monthly finance · conditional scenarios", "Помесячная экономика · условные сценарии"), renderArtifact("finance"))}${section(heading("Risk register and next actions", "Риски и следующие действия"), table(["Object", "Constraint", "Status", "Severity", "Impact", "Next action"], project.constraints.map(item => [item.subjectId, item.label, item.status, item.severity, item.impact, item.nextAction])))}${section(heading("Procedure preparation sheet · draft", "Лист подготовки обращения · черновик"), `<p class="warning">${heading("This preparation sheet is not an official form. Confirm the current official template, authority, applicant powers, attachments and professional reviewer. No signature, submission or receipt is created.", "Этот лист подготовки не является официальной формой. Нужно подтвердить действующий шаблон, орган, полномочия заявителя, приложения и профильного reviewer. Подпись, подача и квитанция не создаются.")}</p>${procedure}`)}${section(heading("Evidence appendix", "Приложение: доказательства"), `${sources}${table(["Claim", "Object", "Field", "Value", "Unit", "Status", "Evidence", "Explanation"], project.claims.map(item => [item.id, item.subjectId, item.field, item.value, item.unit, item.status, item.evidenceIds.join("; "), item.scope ? `${item.explanation} · scope: ${JSON.stringify(item.scope)}` : item.explanation]))}`)}<footer>${esc(DEVKIT_EXPORT_CAVEAT)}<br>${esc(DEVKIT_EXPORT_VERSION)} · ${esc(manifest.rendererVersion)} · integrity hashes do not establish factual verification.</footer></body></html>`;
}

/** One defensive clone, one saved snapshot, no network/storage writes, no hidden recalculation. */
export async function buildDevelopmentKit(savedSnapshot: DevkitProject, options: { locale?: "en" | "ru"; generatedAt?: string } = {}): Promise<DevelopmentKit> {
  const validated = parseDevkitProject(savedSnapshot);
  if (!validated) throw new Error("DEVKIT_EXPORT_INVALID_SAVED_SNAPSHOT");
  const project = structuredClone(validated);
  assertSnapshot(project);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("DEVKIT_EXPORT_INVALID_TIME");
  const locale = options.locale ?? project.brief.locale;
  const { scoped, historicalRefs } = selectKitInputs(project);
  const issues = inspectSnapshot(scoped);
  const images: { design: DesignVersion; svg: string }[] = [];
  for (const design of scoped.designVersions) {
    try { const scene = exportSceneFromSnapshot(project, design); images.push({ design, svg: renderCanonicalScene(scene, { locale, view: (design as DesignScene).scene ? "axonometric" : "plan" }) }); }
    catch (error) { issues.push({ code: "SCENE_NOT_RENDERED", section: "design", reference: refKey(refOf(design)), detail: error instanceof Error ? error.message : "Invalid scene." }); }
  }
  const sectionNames = ["design", "areas", "finance", "sources", "risks", "procedure"];
  const manifest: DevkitKitManifest = {
    format: DEVKIT_EXPORT_VERSION, schemaVersion: 1, templateVersion: DEVKIT_TEMPLATE_VERSION, rendererVersion: DEVKIT_RENDER_VERSION,
    generatedAt, projectId: project.id, projectRevision: project.revision, inputRevision: project.inputRevision,
    snapshotHash: await devkitSha256(canonicalDevkitJson(project)), status: issues.length ? "partial_draft" : "coherent_draft",
    kitMaturity: issues.length ? "K0_incomplete" : "K1_candidate", financeMaturity: project.derivedArtifacts.some(item => item.kind === "finance") ? "conditional_unreviewed" : "unavailable",
    review: "not_performed", submission: "not_submitted", storageMode: project.storageMode, dataClass: project.dataClass,
    versions: { designs: scoped.designVersions.map(refOf), artifacts: scoped.derivedArtifacts.map(item => ({ ref: refOf(item), inputs: item.inputs, methodVersion: item.methodVersion, status: item.status })), procedures: project.procedures.map(item => ({ id: item.id, version: item.version, status: item.status })) },
    historicalRefs, selection: "last_appended_saved_design_per_scenario_exact_derivations",
    sections: sectionNames.map(id => {
      const references = id === "design" ? scoped.designVersions.map(item => refKey(refOf(item))) : id === "sources" ? project.evidence.map(item => item.id) : id === "risks" ? project.constraints.map(item => item.id) : id === "procedure" ? project.procedures.map(item => item.id) : scoped.derivedArtifacts.filter(item => item.kind === id).map(item => refKey(refOf(item)));
      const missing = !references.length && id !== "risks";
      return { id, status: missing ? "missing" : issues.some(issue => issue.section === id || issue.section === "versions") ? "partial" : "draft", references };
    }),
    sourceInputs: project.evidence.map(item => ({ evidenceId: item.id, sourceId: item.sourceId, responseHash: item.responseHash, acquiredAt: item.acquiredAt, validAt: item.validAt, status: item.status, rights: item.rights, provenance: item.provenance ?? null })),
    issues, files: [], integrityScope: "sha256_payload_bytes_manifest_excludes_itself", caveat: DEVKIT_EXPORT_CAVEAT
  };
  const rawFiles = [
    // Foundation import allows compact project bytes plus a bounded envelope; pretty indentation can exceed that budget.
    { path: "project.json", mediaType: "application/json", content: `${JSON.stringify({ format: "GEOAI_DEVKIT_PROJECT", schemaVersion: 1, exportedAt: generatedAt, project })}\n` },
    { path: "sources.json", mediaType: "application/json", content: json({ snapshotHash: manifest.snapshotHash, inputRevision: project.inputRevision, evidence: project.evidence, claims: project.claims, objects: project.objects, constraints: project.constraints, caveat: DEVKIT_EXPORT_CAVEAT }) },
    { path: "procedure-draft.json", mediaType: "application/json", content: json({ snapshotHash: manifest.snapshotHash, status: "draft", submission: "not_submitted", officialForm: false, procedures: project.procedures, missingInputs: issues.filter(issue => issue.section === "procedure"), caveat: DEVKIT_EXPORT_CAVEAT }) },
    ...images.map(({ svg }, index) => ({ path: `scene-${String(index + 1).padStart(2, "0")}.svg`, mediaType: "image/svg+xml", content: svg })),
    { path: "memo-album.html", mediaType: "text/html", content: renderMemo(scoped, manifest, images, locale) }
  ];
  if (rawFiles.reduce((sum, file) => sum + byteLength(file.content), 0) > DEVKIT_EXPORT_MAX_BYTES) throw new Error("DEVKIT_EXPORT_OUTPUT_TOO_LARGE");
  const files: DevkitExportFile[] = [];
  for (const file of rawFiles) files.push({ ...file, bytes: byteLength(file.content), sha256: await devkitSha256(file.content) });
  manifest.files = files.map(({ path, mediaType, bytes, sha256 }) => ({ path, mediaType, bytes, sha256 }));
  const manifestContent = json(manifest);
  files.push({ path: "manifest.json", mediaType: "application/json", content: manifestContent, bytes: byteLength(manifestContent), sha256: await devkitSha256(manifestContent) });
  const artifact: KitArtifact = { id: `kit-${manifest.snapshotHash.slice(0, 24)}`, kind: "kit", revision: 1, inputRevision: project.inputRevision, inputs: [...scoped.designVersions.map(refOf), ...scoped.derivedArtifacts.map(refOf)], createdAt: generatedAt, status: issues.length ? "blocked" : "draft", methodVersion: DEVKIT_EXPORT_VERSION, assumptions: ["Local public/synthetic snapshot; professional review not performed; not submitted."], missingInputs: issues.map(issue => `${issue.code}: ${issue.reference ?? issue.section}: ${issue.detail}`), data: { manifest: manifest as unknown as JsonValue } };
  return { manifest, files, artifact };
}

/** Transport integrity only. The foundation store must still validate/import the returned project.json. */
export async function extractDevelopmentKitProject(serialized: string): Promise<string> {
  if (byteLength(serialized) > DEVKIT_EXPORT_MAX_BYTES * 3) throw new Error("DEVKIT_IMPORT_TOO_LARGE");
  let value: DevelopmentKitBundle;
  try { value = JSON.parse(serialized) as DevelopmentKitBundle; } catch { throw new Error("DEVKIT_IMPORT_INVALID_JSON"); }
  if (value?.format !== "GEOAI_DEVKIT_BUNDLE" || value.schemaVersion !== 1 || value.manifest?.format !== DEVKIT_EXPORT_VERSION || value.manifest.schemaVersion !== 1 || !Array.isArray(value.files) || !Array.isArray(value.manifest.files) || value.files.length > 506) throw new Error("DEVKIT_IMPORT_UNSUPPORTED_BUNDLE");
  const paths = new Set<string>();
  let totalBytes = 0;
  for (const file of value.files) {
    if (!file || typeof file.path !== "string" || !/^(project\.json|sources\.json|procedure-draft\.json|memo-album\.html|manifest\.json|scene-\d+\.svg)$/.test(file.path) || paths.has(file.path) || typeof file.content !== "string" || typeof file.mediaType !== "string") throw new Error("DEVKIT_IMPORT_INVALID_FILE");
    paths.add(file.path); totalBytes += byteLength(file.content);
    if (totalBytes > DEVKIT_EXPORT_MAX_BYTES + 1024 * 1024) throw new Error("DEVKIT_IMPORT_TOO_LARGE");
    if (file.bytes !== byteLength(file.content) || file.sha256 !== await devkitSha256(file.content)) throw new Error("DEVKIT_IMPORT_HASH_MISMATCH");
  }
  for (const required of ["project.json", "sources.json", "procedure-draft.json", "memo-album.html", "manifest.json"]) if (!paths.has(required)) throw new Error("DEVKIT_IMPORT_FILE_MISSING");
  const inventory = value.files.filter(file => file.path !== "manifest.json").map(({ path, mediaType, bytes, sha256 }) => ({ path, mediaType, bytes, sha256 }));
  if (canonicalDevkitJson(inventory) !== canonicalDevkitJson(value.manifest.files)) throw new Error("DEVKIT_IMPORT_INVENTORY_MISMATCH");
  let embeddedManifest: unknown, envelope: { format?: string; schemaVersion?: number; project?: DevkitProject };
  const projectJson = value.files.find(file => file.path === "project.json")!.content;
  try { embeddedManifest = JSON.parse(value.files.find(file => file.path === "manifest.json")!.content); envelope = JSON.parse(projectJson) as typeof envelope; }
  catch { throw new Error("DEVKIT_IMPORT_INVALID_JSON"); }
  if (canonicalDevkitJson(embeddedManifest) !== canonicalDevkitJson(value.manifest)) throw new Error("DEVKIT_IMPORT_MANIFEST_MISMATCH");
  if (envelope.format !== "GEOAI_DEVKIT_PROJECT" || envelope.schemaVersion !== 1 || !envelope.project || envelope.project.id !== value.manifest.projectId || envelope.project.revision !== value.manifest.projectRevision || envelope.project.inputRevision !== value.manifest.inputRevision || await devkitSha256(canonicalDevkitJson(envelope.project)) !== value.manifest.snapshotHash) throw new Error("DEVKIT_IMPORT_SNAPSHOT_MISMATCH");
  return projectJson;
}

/** Explicitly different deliverable: metadata only, no snapshot redaction/import or licensed source content. */
export async function buildSourceMetadataDraft(savedSnapshot: DevkitProject, options: { locale?: "en" | "ru"; generatedAt?: string } = {}): Promise<SourceMetadataDraft> {
  const project = parseDevkitProject(savedSnapshot);
  if (!project || project.revision < 1) throw new Error("DEVKIT_EXPORT_INVALID_SAVED_SNAPSHOT");
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("DEVKIT_EXPORT_INVALID_TIME");
  const ru = (options.locale ?? project.brief.locale) === "ru";
  const manifest: SourceMetadataDraft["manifest"] = { format: "geoai-devkit-source-metadata-1", schemaVersion: 1, generatedAt, projectId: project.id, projectRevision: project.revision, originalSnapshotHash: await devkitSha256(canonicalDevkitJson(project)), status: "metadata_only_draft", importableProject: false, originalSnapshotIncluded: false,
    omitted: ["Full project snapshot/project.json", "Evidence excerpts and all provenance payloads", "Claim values/scope and constraint content", "Spatial objects/AOI/design geometry and renders", "Area and finance payloads/results", "Original source documents/forms and procedure checklist content"], files: [], caveat: DEVKIT_EXPORT_CAVEAT };
  const sources = project.evidence.map(item => ({ evidenceId: item.id, subjectId: item.subjectId, sourceId: item.sourceId, primaryUrl: item.sourceUrl, acquiredAt: item.acquiredAt, validAt: item.validAt, responseHash: item.responseHash, status: item.status, trust: item.trust, rights: item.rights, sourceContentIncluded: false,
    gap: item.rights.redistribution !== "allowed" || item.rights.permittedUse === "unknown" ? "Reuse rights unresolved or restrictive; source content withheld." : "Only source reference metadata included in this draft." }));
  const procedures = project.procedures.map(item => ({ id: item.id, authority: item.authority, primaryUrl: item.sourceUrl, templateVersion: item.version, status: item.status, missingInputCount: item.missingInputs.length, submission: "not_submitted", formIncluded: false }));
  const title = ru ? "Черновик метаданных источников" : "Source metadata draft";
  const notice = ru ? "Это отдельный сокращённый документ. Исходный проект не изменён и не включён. Выдержки, raw content, геометрия, расчёты и формы не экспортируются. Этот файл нельзя импортировать как проект. Полный комплект требует проверки прав." : "This is a separate reduced document. The original project is unchanged and not included. Excerpts, raw content, geometry, calculations and forms are withheld. This file cannot be imported as a project. A full kit requires source-rights review.";
  const html = `<!doctype html><html lang="${ru ? "ru" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${esc(title)}</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0 auto;padding:24px;max-width:1100px;font:14px/1.5 Arial,sans-serif;color:#183242}h1{font-size:26px}p,td,th{overflow-wrap:anywhere}.warning{padding:12px;background:#fffbeb;border-left:4px solid #a16207}.table-scroll{max-width:100%;overflow:auto}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #cad6dc;padding:7px;text-align:left;vertical-align:top}th{background:#f0f6f6}@media(max-width:600px){body{padding:16px}td,th{min-width:100px}}@media print{body{padding:0}.table-scroll{overflow:visible}table{table-layout:fixed;font-size:8pt}thead{display:table-header-group}}</style></head><body><h1>${esc(title)}</h1><p>metadata_only_draft · ${esc(project.id)} @ ${project.revision} · ${esc(generatedAt)}</p><p class="warning">${esc(notice)}</p><p>${esc(DEVKIT_EXPORT_CAVEAT)}</p><h2>${ru ? "Ссылки и права" : "References and rights"}</h2>${table(["Evidence / subject", "Source / primary URL", "Status", "Dates", "Rights", "Gap"], sources.map(item => [`${item.evidenceId} · ${item.subjectId}`, `${item.sourceId} · ${item.primaryUrl ?? "unknown"}`, `${item.status} · ${item.trust}`, `acquired: ${item.acquiredAt ?? "unknown"}; valid: ${item.validAt ?? "unknown"}`, item.rights, item.gap]))}<h2>${ru ? "Ссылки на процедуры · не подано" : "Procedure references · not submitted"}</h2>${table(["ID", "Authority", "Primary URL", "Template version", "Status", "Missing inputs"], procedures.map(item => [item.id, item.authority, item.primaryUrl, item.templateVersion, item.status, item.missingInputCount]))}<h2>${ru ? "Исключено из этого документа" : "Withheld from this document"}</h2><ul>${manifest.omitted.map(item => `<li>${esc(item)}</li>`).join("")}</ul><p>Original snapshot SHA-256: ${esc(manifest.originalSnapshotHash)}</p><p>${ru ? "Хеш связывает документ с исходным локальным снимком; он не подтверждает достоверность, права или согласование." : "The hash links this document to its original local snapshot; it does not establish correctness, rights or approval."}</p></body></html>`;
  const payloads = [{ path: "source-metadata.json", mediaType: "application/json", content: json({ format: manifest.format, schemaVersion: 1, projectId: project.id, projectRevision: project.revision, inputRevision: project.inputRevision, originalSnapshotHash: manifest.originalSnapshotHash, status: manifest.status, importableProject: false, originalSnapshotIncluded: false, sources, procedures, omitted: manifest.omitted, caveat: DEVKIT_EXPORT_CAVEAT }) }, { path: "source-metadata.html", mediaType: "text/html", content: html }];
  const files: DevkitExportFile[] = [];
  for (const file of payloads) files.push({ ...file, bytes: byteLength(file.content), sha256: await devkitSha256(file.content) });
  manifest.files = files.map(({ path, mediaType, bytes, sha256 }) => ({ path, mediaType, bytes, sha256 }));
  const content = json(manifest);
  files.push({ path: "metadata-manifest.json", mediaType: "application/json", content, bytes: byteLength(content), sha256: await devkitSha256(content) });
  return { manifest, files };
}
