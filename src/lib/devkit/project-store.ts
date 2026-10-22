import {
  DEVKIT_CAVEAT, type AOI, type Claim, type Constraint, type DerivedArtifact, type DesignBuilding,
  type DesignVersion, type DevkitExport, type DevkitProject, type DevkitResult, type DevkitStorage,
  type DevkitStoreFailure, type Evidence, type ProjectBrief, type SpatialObject, type VersionRef
} from "./contracts";
import { validatePointObjectCreateAoiVertices, validateRedevelopmentProgram } from "../prototype/point-to-object-create";
import { isPointObjectLocale, isPointObjectMarketKey } from "../prototype/point-to-object-markets";

export const DEVKIT_MAX_PROJECT_BYTES = 768 * 1024;
export const DEVKIT_MAX_STORE_BYTES = 2 * 1024 * 1024;
const MAX_PROJECTS = 12;
const PREFIX = "geoai:devkit:projects:v1:";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;
const text = (value: unknown, max = 2_000): value is string => typeof value === "string" && value.length <= max;
const id = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/.test(value);
const integer = (value: unknown, min = 1, max = 1_000_000): value is number => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
const finite = (value: unknown, min = 0, max = 1e15): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const timestamp = (value: unknown): value is string => typeof value === "string" && value.length <= 32 && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const nullableText = (value: unknown, max = 2_000) => value === null || text(value, max);
const nullableTimestamp = (value: unknown) => value === null || timestamp(value);
const enumeration = (value: unknown, values: readonly string[]) => typeof value === "string" && values.includes(value);
const list = (value: unknown, max: number, valid: (item: unknown) => boolean): value is unknown[] => Array.isArray(value) && value.length <= max && value.every(valid);
const strings = (value: unknown, max = 100) => list(value, max, item => text(item));
const ids = (value: unknown, max = 500) => list(value, max, id) && new Set(value).size === value.length;
const unique = <T>(values: T[], key: (value: T) => string) => new Set(values.map(key)).size === values.length;
const url = (value: unknown) => value === null || typeof value === "string" && value.length <= 2_000 && (() => {
  try { const parsed = new URL(value); return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
    ![...parsed.searchParams.keys()].some(key => /^(?:token|key|api[_-]?key|access[_-]?token|secret|password|authorization|x-amz-(?:signature|credential|security-token))$/i.test(key)); } catch { return false; }
})();
const trust = (value: unknown) => enumeration(value, ["public_source", "user_provided", "synthetic", "derived", "generated", "unavailable"]);
function shape(value: unknown, keys: string[], optional: string[] = []): boolean {
  return !!value && typeof value === "object" && !Array.isArray(value) && keys.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => keys.includes(key) || optional.includes(key));
}
const optionalObject = (value: object, key: string) => !Object.hasOwn(value, key) || (() => {
  const item: unknown = (value as Record<string, unknown>)[key];
  return !!item && typeof item === "object" && !Array.isArray(item);
})();
/** Refuse accessors, non-JSON objects, cycles, secrets-shaped keys and bombs. */
function safeJson(value: unknown): boolean {
  let count = 0;
  const parents = new Set<object>();
  function visit(item: unknown, depth: number): boolean {
    if (++count > 150_000 || depth > 32) return false;
    if (item === null || typeof item === "boolean") return true;
    if (typeof item === "number") return Number.isFinite(item);
    if (typeof item === "string") return item.length <= 64_000;
    if (!item || typeof item !== "object" || parents.has(item)) return false;
    if (!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item))) return false;
    if (Array.isArray(item) && (Object.keys(item).length !== item.length || Object.keys(item).some(key => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length))) return false;
    parents.add(item);
    const valid = Reflect.ownKeys(item).every(key => {
      if (Array.isArray(item) && key === "length") return true;
      if (typeof key !== "string" || /^(?:__proto__|prototype|constructor|password|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|token|service[_-]?role(?:[_-]?key)?|cookie|secret|private[_-]?key|user[_-]?id|account[_-]?id)$/i.test(key) ||
          /(?:^|_)(?:api_key|access_token|refresh_token|service_role_key|secret|password|private_key|database_url|db_url|cookie|token)(?:_|$)/i.test(key) ||
          /(?:apiKey|accessToken|refreshToken|serviceRoleKey|operatorToken|privateKey|userId|accountId)$/i.test(key)) return false;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      return !!descriptor && "value" in descriptor && descriptor.enumerable === true && visit(descriptor.value, depth + 1);
    });
    parents.delete(item);
    return valid;
  }
  try { return visit(value, 0); } catch { return false; }
}
function validGeometry(value: unknown): boolean {
  if (value === null) return true;
  if (!shape(value, ["type", "coordinates"])) return false;
  const g = value as { type: string; coordinates: unknown };
  const point = (p: unknown) => Array.isArray(p) && p.length === 2 && finite(p[0], -180, 180) && finite(p[1], -90, 90);
  const ring = (r: unknown) => list(r, 5_000, point) && r.length >= 4 && JSON.stringify(r[0]) === JSON.stringify(r[r.length - 1]);
  const polygon = (p: unknown) => list(p, 32, ring) && p.length > 0;
  return g.type === "Point" ? point(g.coordinates) : g.type === "Polygon" ? polygon(g.coordinates) : g.type === "MultiPolygon" && list(g.coordinates, 100, polygon) && g.coordinates.length > 0;
}
function validAoi(value: unknown): boolean {
  if (value === null) return true;
  if (!shape(value, ["id", "revision", "crs", "provenance", "coordinates", "vertexCount", "areaSqM", "perimeterM"])) return false;
  const a = value as AOI;
  if (!/^create-aoi-[A-Za-z0-9_.:-]{1,120}$/.test(a.id) || !integer(a.revision) || a.crs !== "EPSG:4326" ||
      !enumeration(a.provenance, ["user_provided", "synthetic"]) || !validGeometry({ type: "Polygon", coordinates: a.coordinates }) ||
      a.coordinates.length !== 1 || a.coordinates[0].length > 26 || !integer(a.vertexCount, 3, 25) || a.coordinates[0].length !== a.vertexCount + 1 || !finite(a.areaSqM) || !finite(a.perimeterM)) return false;
  const measured = validatePointObjectCreateAoiVertices(a.coordinates[0].slice(0, -1));
  return measured.ok && Math.abs(measured.measurements.areaSqM - a.areaSqM) <= 0.1 && Math.abs(measured.measurements.perimeterM - a.perimeterM) <= 0.1;
}
function validBrief(value: unknown): boolean {
  if (!shape(value, ["title", "objective", "marketKey", "locale", "strategy", "budget", "requirements", "assumptions"])) return false;
  const b = value as ProjectBrief;
  return text(b.title, 240) && b.title.trim().length > 0 && text(b.objective) && isPointObjectMarketKey(b.marketKey) && isPointObjectLocale(b.locale) && text(b.strategy) &&
    shape(b.budget, ["amount", "currency", "includesLand"]) && (b.budget.amount === null || finite(b.budget.amount)) && enumeration(b.budget.currency, ["AED", "RUB", "USD"]) &&
    (b.budget.includesLand === null || typeof b.budget.includesLand === "boolean") && strings(b.requirements) && strings(b.assumptions);
}
function validObject(value: unknown): boolean {
  if (!shape(value, ["id", "kind", "label", "sourceFeatureId", "geometry", "crs", "trust", "evidenceIds"])) return false;
  const o = value as SpatialObject;
  return id(o.id) && enumeration(o.kind, ["land_parcel", "building", "poi"]) && text(o.label, 240) && nullableText(o.sourceFeatureId, 240) &&
    validGeometry(o.geometry) && o.crs === "EPSG:4326" && trust(o.trust) && ids(o.evidenceIds);
}
function validEvidence(value: unknown): boolean {
  if (!shape(value, ["id", "subjectId", "label", "sourceId", "sourceUrl", "excerpt", "acquiredAt", "validAt", "responseHash", "trust", "status", "rights"], ["provenance"])) return false;
  const e = value as Evidence;
  return id(e.id) && id(e.subjectId) && text(e.label, 240) && id(e.sourceId) && url(e.sourceUrl) && nullableText(e.excerpt, 8_000) &&
    nullableTimestamp(e.acquiredAt) && nullableTimestamp(e.validAt) && (e.responseHash === null || /^[a-f0-9]{64}$/.test(e.responseHash)) && trust(e.trust) &&
    enumeration(e.status, ["available", "partial", "unavailable", "conflicting"]) && (e.trust !== "unavailable" || e.status === "unavailable") && shape(e.rights, ["licence", "attribution", "permittedUse", "redistribution"]) &&
    nullableText(e.rights.licence, 240) && text(e.rights.attribution) && enumeration(e.rights.permittedUse, ["public_demo", "synthetic_demo", "unknown"]) &&
    enumeration(e.rights.redistribution, ["allowed", "not_allowed", "unknown"]) && optionalObject(e, "provenance");
}
function validClaim(value: unknown): boolean {
  if (!shape(value, ["id", "subjectId", "field", "value", "unit", "status", "evidenceIds", "explanation"], ["scope"])) return false;
  const c = value as Claim;
  return id(c.id) && id(c.subjectId) && text(c.field, 240) && (c.value === null || typeof c.value === "boolean" || text(c.value) || typeof c.value === "number" && Number.isFinite(c.value)) &&
    nullableText(c.unit, 80) && enumeration(c.status, ["source_backed", "assumption", "derived", "generated", "unknown", "conflicting"]) &&
    (c.status !== "unknown" || c.value === null) && ids(c.evidenceIds) && (c.status !== "source_backed" || c.evidenceIds.length > 0) && text(c.explanation) && optionalObject(c, "scope");
}
function validConstraint(value: unknown): boolean {
  if (!shape(value, ["id", "subjectId", "label", "status", "severity", "geometry", "evidenceIds", "impact", "nextAction"])) return false;
  const c = value as Constraint;
  return id(c.id) && id(c.subjectId) && text(c.label, 240) && enumeration(c.status, ["source_backed", "proposed", "assumed", "unknown", "conflicting"]) &&
    enumeration(c.severity, ["critical", "warning", "information"]) && validGeometry(c.geometry) && ids(c.evidenceIds) &&
    (c.status !== "source_backed" || c.evidenceIds.length > 0) && text(c.impact) && text(c.nextAction);
}
function validBuilding(value: unknown): boolean {
  if (!shape(value, ["id", "label", "footprint", "levels", "use", "retained", "assumptionIds"])) return false;
  const b = value as DesignBuilding;
  return id(b.id) && text(b.label, 240) && b.footprint?.type === "Polygon" && validGeometry(b.footprint) &&
    (b.levels === null || integer(b.levels, 1, 200)) && enumeration(b.use, ["residential", "office", "retail", "hospitality", "civic", "open_space"]) &&
    typeof b.retained === "boolean" && ids(b.assumptionIds);
}
function validDesign(value: unknown): boolean {
  if (!shape(value, ["id", "revision", "scenarioId", "label", "createdAt", "inputRevision", "aoiId", "aoiRevision", "program", "buildings", "retainedObjectIds", "exclusionConstraintIds", "assumptions", "status"], ["scene"])) return false;
  const d = value as DesignVersion;
  return id(d.id) && integer(d.revision) && id(d.scenarioId) && text(d.label, 240) && timestamp(d.createdAt) && integer(d.inputRevision) && id(d.aoiId) && integer(d.aoiRevision) &&
    shape(d.program, ["templateId", "title", "summary", "massingStyle", "blockCount", "levelsMin", "levelsMax", "targetSiteCoveragePct", "openSpacePct", "setbackM", "useMix", "rationale"]) &&
    text(d.program.title, 600) && text(d.program.summary, 600) && integer(d.program.blockCount, 1, 12) && integer(d.program.levelsMin, 1, 80) && integer(d.program.levelsMax, 1, 80) &&
    finite(d.program.targetSiteCoveragePct, 0, 100) && finite(d.program.openSpacePct, 0, 100) && finite(d.program.setbackM, 0, 1_000) && strings(d.program.rationale) &&
    list(d.program.useMix, 6, item => shape(item, ["use", "sharePct"]) && enumeration((item as {use: unknown}).use, ["residential", "office", "retail", "hospitality", "civic", "open_space"]) && finite((item as {sharePct: unknown}).sharePct, 0, 100)) &&
    validateRedevelopmentProgram(d.program).ok && list(d.buildings, 200, validBuilding) && unique(d.buildings, b => b.id) &&
    ids(d.retainedObjectIds) && ids(d.exclusionConstraintIds) && strings(d.assumptions) && enumeration(d.status, ["draft", "review_required"]) && optionalObject(d, "scene");
}
function validRef(value: unknown): boolean {
  if (!shape(value, ["kind", "id", "revision"])) return false;
  const r = value as VersionRef;
  return enumeration(r.kind, ["design", "areas", "finance", "kit"]) && id(r.id) && integer(r.revision);
}
function validDerived(value: unknown): boolean {
  if (!shape(value, ["id", "kind", "revision", "inputRevision", "inputs", "createdAt", "status", "methodVersion", "assumptions", "missingInputs", "data"])) return false;
  const d = value as DerivedArtifact;
  const rank = { design: 0, areas: 1, finance: 2, kit: 3 };
  return id(d.id) && enumeration(d.kind, ["areas", "finance", "kit"]) && integer(d.revision) && integer(d.inputRevision) && list(d.inputs, 100, validRef) &&
    unique(d.inputs, r => `${r.kind}:${r.id}:${r.revision}`) && d.inputs.every(r => rank[r.kind] < rank[d.kind]) && timestamp(d.createdAt) &&
    enumeration(d.status, ["draft", "current", "stale", "blocked"]) && text(d.methodVersion, 160) && d.methodVersion.length > 0 &&
    strings(d.assumptions) && strings(d.missingInputs) && !!d.data && typeof d.data === "object" && !Array.isArray(d.data);
}

/** Freshness only, never professional acceptance. Historical revisions remain readable. */
export function devkitRefFreshness(project: DevkitProject, ref: VersionRef): "current" | "stale" | "missing" | "blocked" {
  if (ref.kind === "design") {
    const design = project.designVersions.find(d => d.id === ref.id && d.revision === ref.revision);
    if (!design) return "missing";
    if (design.inputRevision !== project.inputRevision || design.aoiId !== project.aoi?.id || design.aoiRevision !== project.aoi.revision) return "stale";
    const siblings = project.designVersions.filter(d => d.scenarioId === design.scenarioId && d.inputRevision === project.inputRevision);
    // Canonical history is append-only. A first generated scene may start at
    // revision1 after a revision1 programme seed with a different immutable ID.
    const latest = siblings[siblings.length - 1];
    return latest?.id === ref.id && latest.revision === ref.revision ? "current" : "stale";
  }
  const artifact = project.derivedArtifacts.find(a => a.kind === ref.kind && a.id === ref.id && a.revision === ref.revision);
  if (!artifact) return "missing";
  const rank = {design: 0, areas: 1, finance: 2, kit: 3};
  if (artifact.inputs.some(r => rank[r.kind] >= rank[artifact.kind])) return "blocked";
  if (artifact.status === "blocked" || artifact.status === "draft") return "blocked";
  if (artifact.status === "stale" || artifact.inputRevision !== project.inputRevision || project.derivedArtifacts.some(a => a.kind === ref.kind && a.id === ref.id && a.revision > ref.revision)) return "stale";
  const required = artifact.kind === "areas" ? ["design"] : artifact.kind === "finance" ? ["areas"] : ["design", "areas", "finance"];
  if (required.some(kind => !artifact.inputs.some(r => r.kind === kind))) return "blocked";
  const upstream = artifact.inputs.map(r => devkitRefFreshness(project, r));
  return upstream.includes("missing") ? "missing" : upstream.includes("blocked") ? "blocked" : upstream.includes("stale") ? "stale" : "current";
}

export function parseDevkitProject(value: unknown): DevkitProject | null {
  try {
    if (!safeJson(value) || bytes(JSON.stringify(value)) > DEVKIT_MAX_PROJECT_BYTES || !shape(value, ["schemaVersion", "id", "revision", "inputRevision", "createdAt", "updatedAt", "storageMode", "dataClass", "brief", "aoi", "objects", "evidence", "claims", "constraints", "scenarios", "designVersions", "activeDesignVersionId", "derivedArtifacts", "procedures", "caveat"])) return null;
    const p = value as DevkitProject;
    if (p.schemaVersion !== 1 || !id(p.id) || !integer(p.revision, 0) || !integer(p.inputRevision) || !timestamp(p.createdAt) || !timestamp(p.updatedAt) || Date.parse(p.updatedAt) < Date.parse(p.createdAt) ||
        p.storageMode !== "browser_local_on_this_device" || !enumeration(p.dataClass, ["public_demo", "synthetic_demo"]) || !validBrief(p.brief) || !validAoi(p.aoi) ||
        !list(p.objects, 500, validObject) || !unique(p.objects, o => o.id) || !list(p.evidence, 500, validEvidence) || !unique(p.evidence, e => e.id) ||
        !list(p.claims, 500, validClaim) || !unique(p.claims, c => c.id) || !list(p.constraints, 500, validConstraint) || !unique(p.constraints, c => c.id) ||
        !list(p.scenarios, 20, s => shape(s, ["id", "label", "objective"]) && id((s as {id: unknown}).id) && text((s as {label: unknown}).label, 240) && text((s as {objective: unknown}).objective)) || !unique(p.scenarios, s => s.id) ||
        !list(p.designVersions, 100, validDesign) || !unique(p.designVersions, d => `${d.id}:${d.revision}`) ||
        !(p.activeDesignVersionId === null || id(p.activeDesignVersionId) && p.designVersions.some(d => d.id === p.activeDesignVersionId)) ||
        !list(p.derivedArtifacts, 200, validDerived) || !unique(p.derivedArtifacts, a => `${a.kind}:${a.id}:${a.revision}`) ||
        !list(p.procedures, 100, r => {
          if (!shape(r, ["id", "label", "authority", "sourceUrl", "version", "applicant", "status", "missingInputs"])) return false;
          const procedure = r as DevkitProject["procedures"][number];
          return id(procedure.id) && text(procedure.label, 240) && nullableText(procedure.authority, 240) && url(procedure.sourceUrl) && nullableText(procedure.version, 240) && nullableText(procedure.applicant, 240) && enumeration(procedure.status, ["hypothesis", "draft", "review_required"]) && strings(procedure.missingInputs);
        }) || !unique(p.procedures, r => r.id) || p.caveat !== DEVKIT_CAVEAT) return null;
    const subjects = new Set([p.id, ...(p.aoi ? [p.aoi.id] : []), ...p.objects.map(o => o.id)]);
    const evidence = new Set(p.evidence.map(e => e.id));
    if (subjects.size !== 1 + (p.aoi ? 1 : 0) + p.objects.length || p.evidence.some(e => !subjects.has(e.subjectId)) || p.objects.some(o => o.evidenceIds.some(e => !evidence.has(e))) ||
        [...p.claims, ...p.constraints].some(c => !subjects.has(c.subjectId) || c.evidenceIds.some(e => !evidence.has(e))) ||
        [...p.claims, ...p.constraints].some(c => c.status === "source_backed" && c.evidenceIds.some(e => !p.evidence.some(row => row.id === e && ["available", "partial"].includes(row.status)))) ||
        p.designVersions.some(d => d.inputRevision > p.inputRevision || !p.scenarios.some(s => s.id === d.scenarioId) ||
          d.retainedObjectIds.some(objectId => !p.objects.some(o => o.id === objectId)) || d.exclusionConstraintIds.some(constraintId => !p.constraints.some(c => c.id === constraintId))) ||
        p.derivedArtifacts.some(a => a.inputRevision > p.inputRevision || a.status === "current" && devkitRefFreshness(p, {kind: a.kind, id: a.id, revision: a.revision}) !== "current")) return null;
    return clone(p);
  } catch { return null; }
}

type DevkitInputPatch = Partial<Pick<DevkitProject, "brief" | "aoi" | "objects" | "evidence" | "claims" | "constraints">>;
export function reviseDevkitInputs(project: DevkitProject, patch: DevkitInputPatch, updatedAt = new Date().toISOString()): DevkitProject {
  if (!safeJson(patch) || !patch || typeof patch !== "object" || Array.isArray(patch) || Object.keys(patch).some(key => !["brief", "aoi", "objects", "evidence", "claims", "constraints"].includes(key))) throw new Error("Invalid Devkit input patch");
  const original = parseDevkitProject(project);
  if (!original) throw new Error("Invalid original Devkit project");
  const candidate = { ...original, ...clone(patch), inputRevision: original.inputRevision + 1, updatedAt,
    derivedArtifacts: original.derivedArtifacts.map(a => ({ ...clone(a), status: a.status === "current" ? "stale" as const : a.status })) };
  const validated = parseDevkitProject(candidate);
  if (!validated) throw new Error("Invalid Devkit input revision; last valid snapshot is unchanged");
  return validated;
}

type Store = { format: "GEOAI_DEVKIT_STORE"; schemaVersion: 1; scopeId: string; projects: DevkitProject[] };
const success = <T>(value: T): DevkitResult<T> => ({ ok: true, value, persistence: "browser_local_only" });
const failure = (code: DevkitStoreFailure, message: string): {ok: false; code: DevkitStoreFailure; message: string} => ({ ok: false, code, message });
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().filter(key => (value as Record<string, unknown>)[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
}
const inputContent = (p: DevkitProject) => canonical([p.brief, p.aoi, p.objects, p.evidence, p.claims, p.constraints]);
function historyPreserved(previous: DevkitProject, next: DevkitProject): boolean {
  return previous.designVersions.every((d, index) => next.designVersions[index] && canonical(next.designVersions[index]) === canonical(d)) &&
    previous.derivedArtifacts.every(a => next.derivedArtifacts.some(n => n.kind === a.kind && n.id === a.id && n.revision === a.revision &&
      canonical({...n, status: undefined}) === canonical({...a, status: undefined})));
}

/** Namespace separation is NOT Auth. Public/synthetic data only; no hosted writes. */
export function createDevkitProjectStore(storage: DevkitStorage | null, scopeId: string) {
  const scopeValid = typeof scopeId === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(scopeId);
  const storageKey = `${PREFIX}${encodeURIComponent(scopeValid ? scopeId : "invalid")}`;
  const backupKey = `${storageKey}:previous`;
  const empty = (): Store => ({format: "GEOAI_DEVKIT_STORE", schemaVersion: 1, scopeId, projects: []});
  function decode(raw: string): DevkitResult<Store> {
    try {
      if (bytes(raw) > DEVKIT_MAX_STORE_BYTES) return failure("store_damaged", "Local store exceeds the supported size; raw data preserved.");
      const value = JSON.parse(raw) as Store;
      if (!safeJson(value) || !shape(value, ["format", "schemaVersion", "scopeId", "projects"]) || value.format !== "GEOAI_DEVKIT_STORE" || value.schemaVersion !== 1 || !Array.isArray(value.projects) || value.projects.length > MAX_PROJECTS) return failure("store_damaged", "Local store is invalid; raw data preserved.");
      if (value.scopeId !== scopeId) return failure("scope_mismatch", "Local namespace mismatch; raw data preserved.");
      const projects = value.projects.map(parseDevkitProject);
      if (projects.some(p => !p) || !unique(value.projects, p => p.id)) return failure("store_damaged", "Local project snapshot is invalid; raw data preserved.");
      return success({ ...value, projects: projects as DevkitProject[] });
    } catch { return failure("store_damaged", "Local store could not be parsed; raw data preserved."); }
  }
  function read(): DevkitResult<{store: Store; raw: string | null}> {
    if (!scopeValid) return failure("scope_mismatch", "A valid explicit local namespace is required.");
    if (!storage) return failure("storage_unavailable", "Browser-local storage is unavailable; no hosted persistence is used.");
    try {
      const raw = storage.getItem(storageKey);
      if (raw === null) return success({store: empty(), raw});
      const result = decode(raw);
      return result.ok ? success({store: result.value, raw}) : result;
    } catch { return failure("storage_unavailable", "Browser-local storage cannot be read."); }
  }
  function write(store: Store, previousRaw: string | null): DevkitResult<Store> {
    const raw = JSON.stringify(store);
    if (bytes(raw) > DEVKIT_MAX_STORE_BYTES) return failure("capacity", "Local storage capacity limit reached; prior snapshot is unchanged.");
    try {
      // A failed backup write stops before replacing the current valid snapshot.
      storage!.setItem(backupKey, previousRaw ?? JSON.stringify(empty()));
      storage!.setItem(storageKey, raw);
      return success(clone(store));
    } catch { return failure("storage_unavailable", "Local write failed; retain/export the last valid snapshot. No cloud save occurred."); }
  }
  function listProjects(): DevkitResult<DevkitProject[]> {
    const result = read();
    return result.ok ? success(clone(result.value.store.projects)) : result;
  }
  function get(projectId: string): DevkitResult<DevkitProject | null> {
    const result = listProjects();
    return result.ok ? success(result.value.find(p => p.id === projectId) ?? null) : result;
  }
  function save(project: DevkitProject, expectedRevision: number | null): DevkitResult<DevkitProject> {
    const validated = parseDevkitProject(project);
    if (!validated) return failure("invalid_project", "Project validation failed; no local data was overwritten.");
    const result = read();
    if (!result.ok) return result;
    const {store, raw} = result.value;
    const previous = store.projects.find(p => p.id === validated.id);
    if (previous ? expectedRevision !== previous.revision || validated.revision !== previous.revision : expectedRevision !== null) return failure("conflict", "The local revision changed or already exists; reopen before saving.");
    if (previous && (validated.createdAt !== previous.createdAt || validated.inputRevision < previous.inputRevision ||
        inputContent(previous) !== inputContent(validated) && validated.inputRevision <= previous.inputRevision || !historyPreserved(previous, validated))) return failure("conflict", "Input/history revision conflict; create a new immutable revision.");
    if (!previous && store.projects.length >= MAX_PROJECTS) return failure("capacity", "Local project count limit reached.");
    const saved = {...validated, revision: (previous?.revision ?? 0) + 1, updatedAt: new Date().toISOString()};
    if (!parseDevkitProject(saved)) return failure("invalid_project", "Saved timestamps/revisions are invalid; previous snapshot retained.");
    const next = {...store, projects: previous ? store.projects.map(p => p.id === saved.id ? saved : p) : [...store.projects, saved]};
    const written = write(next, raw);
    return written.ok ? success(clone(saved)) : written;
  }
  function exportProject(projectId: string): DevkitResult<string> {
    const result = get(projectId);
    if (!result.ok) return result;
    if (!result.value) return failure("invalid_project", "Project is not present in this local namespace.");
    const exported: DevkitExport = {format: "GEOAI_DEVKIT_PROJECT", schemaVersion: 1, exportedAt: new Date().toISOString(), project: result.value};
    return success(JSON.stringify(exported));
  }
  function importProject(json: string): DevkitResult<DevkitProject> {
    try {
      if (typeof json !== "string" || bytes(json) > DEVKIT_MAX_PROJECT_BYTES + 2_048) return failure("invalid_import", "Import exceeds the supported size.");
      const value = JSON.parse(json) as DevkitExport;
      if (!value || typeof value !== "object" || value.schemaVersion !== 1) return failure("unsupported_version", "Unsupported project schema; no implicit migration or overwrite.");
      if (!safeJson(value) || !shape(value, ["format", "schemaVersion", "exportedAt", "project"]) || value.format !== "GEOAI_DEVKIT_PROJECT" || !timestamp(value.exportedAt)) return failure("invalid_import", "Invalid local project export.");
      const project = parseDevkitProject(value.project);
      if (!project) return failure("invalid_import", "Imported project failed validation.");
      const result = read();
      if (!result.ok) return result;
      if (result.value.store.projects.some(p => p.id === project.id)) return failure("conflict", "Import ID already exists; the current project was preserved.");
      if (result.value.store.projects.length >= MAX_PROJECTS) return failure("capacity", "Local project count limit reached.");
      const written = write({...result.value.store, projects: [...result.value.store.projects, project]}, result.value.raw);
      return written.ok ? success(clone(project)) : written;
    } catch { return failure("invalid_import", "Import could not be parsed; current projects were preserved."); }
  }
  function recover(): DevkitResult<DevkitProject[]> {
    if (!scopeValid || !storage) return failure("storage_unavailable", "Local recovery is unavailable.");
    try {
      const raw = storage.getItem(backupKey);
      if (raw === null) return failure("store_damaged", "No previous local snapshot is available.");
      const backup = decode(raw);
      if (!backup.ok) return backup;
      storage.setItem(storageKey, raw);
      return success(clone(backup.value.projects));
    } catch { return failure("storage_unavailable", "Local recovery failed; backup remains available for inspection."); }
  }
  return { persistence: "browser_local_only" as const, list: listProjects, get, save, exportProject, importProject, recover };
}
