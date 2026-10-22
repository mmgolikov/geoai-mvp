import type { AOI, Claim, Constraint, DevkitProject, Evidence, JsonObject, SpatialObject } from "./contracts";
import { LIVE_POINT_CAVEAT } from "../point-to-object/contracts";
import {
  buildAreaSourceContextV2,
  parseSavedAreaSourceContextV2,
  type AreaSourceBinding,
  type AreaSourceContextV2
} from "../prototype/point-to-object-area-source-context-v2";
import type { PointObjectAreaContextResult } from "../prototype/point-to-object-area-context-contract";
import { isPointObjectAreaContextResult, parsePointObjectCreateAoi, parsePointObjectCreateSourceUseReceipt } from "../prototype/point-to-object-create-result";
import { calculatePolygonMeasurements } from "../polygon-aoi";
import { normalizePointObjectAreaContext, parseNormalizedPointObjectContext } from "../prototype/point-to-object-normalized-context";

export const DEVKIT_EVIDENCE_VERSION = "DEVKIT_EVIDENCE_V1" as const;
export const DEVKIT_EVIDENCE_CAVEAT = LIVE_POINT_CAVEAT;
export type EvidenceSubject = { id: string; kind: "aoi" | SpatialObject["kind"] };
export type EvidenceScope = {
  subject: EvidenceSubject;
  kind: "subject" | "aoi_interior" | "radius";
  radiusM: 400 | 800 | null;
  geometryHash: string | null;
  completeInventory: boolean;
};
export type EvidenceSource = {
  id: string; label: string;
  mode: "bundled_public_snapshot" | "public_document" | "user_provided" | "synthetic" | "unavailable";
  url: string | null; version: string | null; snapshotHash: string | null;
  licence: {
    id: string | null; url: string | null; fullTextPath: string | null; attribution: string;
    localUse: "allowed" | "not_allowed" | "unknown";
    derivativeUse: "allowed" | "not_allowed" | "unknown";
    redistribution: "allowed" | "not_allowed" | "unknown";
    conditions: string[];
  };
};
/** Times are separate facts. Reading a stored record never refreshes its age. */
export type EvidenceLineage = {
  evidenceId: string; sourceId: string; subject: EvidenceSubject; scope: EvidenceScope;
  sourceRecordId: string | null; documentId: string | null; fragment: string | null;
  fetchedAt: string | null; observedAt: string | null;
  validFrom: string | null; validTo: string | null;
  providerUpdatedAt: string | null; cacheServedAt: string | null;
  normalization: { methodVersion: string; inputHashes: string[] };
  limitations: string[];
};
export type ClaimBinding = {
  claimId: string; subject: EvidenceSubject; scope: EvidenceScope;
  validFrom: string | null; validTo: string | null;
  derivedFromClaimIds: string[]; methodVersion: string | null;
};
export type ConstraintBinding = {
  constraintId: string; subject: EvidenceSubject;
  confirmation: "confirmed" | "proposed" | "assumed" | "unknown" | "conflicting";
  claimIds: string[];
  review: { reviewer: string; reviewedAt: string; basis: string } | null;
};
/** Persist/export the WHOLE payload alongside the foundation project arrays.
 * Dropping lineage is lossy and cannot qualify an evidence-backed decision. */
export type EvidenceCase = {
  version: typeof DEVKIT_EVIDENCE_VERSION; id: string; aoiId: string | null;
  objects: SpatialObject[]; sources: EvidenceSource[]; evidence: Evidence[];
  claims: Claim[]; constraints: Constraint[];
  lineage: EvidenceLineage[]; claimBindings: ClaimBinding[]; constraintBindings: ConstraintBinding[];
  retainedSource: JsonObject | null; limitations: string[];
  caveat: typeof DEVKIT_EVIDENCE_CAVEAT;
};
export type EvidenceIssue = { code: string; id: string; message: string };
export type EvidenceEvaluation = {
  evidenceId: string; usable: boolean; unknownObservation: boolean; stale: boolean;
  reasons: string[];
};
export type ClaimEvaluation = {
  claimId: string; value: Claim["value"];
  state: "source_backed" | "assumption" | "derived" | "generated" | "unknown" | "conflicting" | "stale" | "unsupported";
  usable: boolean; reasons: string[]; conflictingClaimIds: string[];
};
export type EvidenceEvaluationOptions = {
  asOf: string; intendedUse: "local_demo" | "derivative" | "export";
  /** Observation freshness is field-specific. Acquisition/cache time is never a substitute. */
  maxObservationAgeDays?: Readonly<Record<string, number>>;
};
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const nullableText = (value: unknown): value is string | null => value === null || text(value);
const timestamp = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const nullableTime = (value: unknown): value is string | null => value === null || timestamp(value);
const hash = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);
const trustValue = (value: unknown) => ["public_source", "user_provided", "synthetic", "derived", "generated", "unavailable"].includes(String(value));
const sourceUrl = (value: unknown) => value === null || typeof value === "string" && (() => { try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password; } catch { return false; } })();
const sameSubject = (a: EvidenceSubject, b: EvidenceSubject) => a.id === b.id && a.kind === b.kind;
function subject(value: unknown): value is EvidenceSubject {
  return record(value) && text(value.id) && ["aoi", "land_parcel", "building", "poi"].includes(String(value.kind));
}
function scope(value: unknown): value is EvidenceScope {
  return record(value) && subject(value.subject) && ["subject", "aoi_interior", "radius"].includes(String(value.kind)) &&
    (value.kind === "radius" ? value.radiusM === 400 || value.radiusM === 800 : value.radiusM === null) &&
    (value.geometryHash === null || hash(value.geometryHash)) && typeof value.completeInventory === "boolean" &&
    (value.kind !== "aoi_interior" || value.subject.kind === "aoi" && hash(value.geometryHash));
}
function scopeKey(value: EvidenceScope): string {
  return JSON.stringify([value.subject.kind, value.subject.id, value.kind, value.radiusM, value.geometryHash]);
}
/** Exact scoped matching, never a 400 m -> 800 m or POI -> parcel promotion. */
export function evidenceScopeMatches(actual: EvidenceScope, requested: EvidenceScope): boolean {
  return scopeKey(actual) === scopeKey(requested) && (!requested.completeInventory || actual.completeInventory);
}
const intervalValid = (from: string | null, to: string | null) => from === null || to === null || Date.parse(from) < Date.parse(to);
const activeAt = (from: string | null, to: string | null, at: number) => (from === null || Date.parse(from) <= at) && (to === null || at < Date.parse(to));
const overlaps = (a: ClaimBinding, b: ClaimBinding) =>
  Math.max(a.validFrom === null ? -Infinity : Date.parse(a.validFrom), b.validFrom === null ? -Infinity : Date.parse(b.validFrom)) <
  Math.min(a.validTo === null ? Infinity : Date.parse(a.validTo), b.validTo === null ? Infinity : Date.parse(b.validTo));
const useFlag = (source: EvidenceSource, use: EvidenceEvaluationOptions["intendedUse"]) =>
  use === "export" ? source.licence.redistribution : use === "derivative" ? source.licence.derivativeUse : source.licence.localUse;

/** Structural + referential checks for the bounded module payload. Not a document authenticity check. */
export function validateEvidenceCase(value: EvidenceCase): EvidenceIssue[] {
  const issues: EvidenceIssue[] = [];
  const add = (code: string, id: string, message: string) => issues.push({ code, id, message });
  if (value.version !== DEVKIT_EVIDENCE_VERSION || value.caveat !== DEVKIT_EVIDENCE_CAVEAT) add("VERSION", value.id, "Unsupported evidence version or caveat.");
  for (const [label, rows] of Object.entries({ objects: value.objects, sources: value.sources, evidence: value.evidence, claims: value.claims, constraints: value.constraints })) {
    const ids = new Set<string>();
    for (const row of rows) { if (!text(row.id) || ids.has(row.id)) add("DUPLICATE_ID", row.id, `${label} identity is missing or duplicated.`); ids.add(row.id); }
  }
  const subjects = new Map<string, EvidenceSubject["kind"]>(value.objects.map(o => [o.id, o.kind]));
  if (value.aoiId !== null) {
    if (subjects.has(value.aoiId)) add("SUBJECT_COLLISION", value.aoiId, "AOI identity cannot be reused for a parcel, building or POI.");
    subjects.set(value.aoiId, "aoi");
  }
  const knownSubject = (s: EvidenceSubject) => subject(s) && subjects.get(s.id) === s.kind;
  const sources = new Map(value.sources.map(s => [s.id, s]));
  const evidence = new Map(value.evidence.map(e => [e.id, e]));
  const claims = new Map(value.claims.map(c => [c.id, c]));
  const constraints = new Map(value.constraints.map(c => [c.id, c]));
  for (const [name, rows, key, base] of [
    ["lineage", value.lineage, "evidenceId", evidence],
    ["claimBindings", value.claimBindings, "claimId", claims],
    ["constraintBindings", value.constraintBindings, "constraintId", constraints]
  ] as const) {
    const seen = new Set<string>();
    for (const row of rows) {
      const id = (row as unknown as Record<string, string>)[key];
      if (seen.has(id) || !base.has(id) || !knownSubject(row.subject) || base.get(id)?.subjectId !== row.subject.id) add("BINDING", id, `${name} must bind one existing, exact subject.`);
      seen.add(id);
    }
    for (const id of base.keys()) if (!seen.has(id)) add("MISSING_BINDING", id, `${name} is required; omitted provenance is not restored by guessing.`);
  }
  for (const line of value.lineage) {
    const item = evidence.get(line.evidenceId), source = sources.get(line.sourceId);
    if (!source || item?.sourceId !== line.sourceId || item.rights.licence !== source.licence.id) add("SOURCE", line.evidenceId, "Source identity does not match evidence.");
    if (!scope(line.scope) || line.scope.kind === "subject" && !sameSubject(line.scope.subject, line.subject) || !knownSubject(line.scope.subject)) add("SCOPE", line.evidenceId, "Evidence scope is invalid or refers to another subject.");
    if (![line.fetchedAt, line.observedAt, line.validFrom, line.validTo, line.providerUpdatedAt, line.cacheServedAt].every(nullableTime) || !intervalValid(line.validFrom, line.validTo)) add("TIME", line.evidenceId, "Evidence times or validity interval are invalid.");
    if (item && item.acquiredAt !== line.fetchedAt) add("ACQUISITION", line.evidenceId, "AcquiredAt must retain fetchedAt, including null; cache time cannot replace it.");
    if (!text(line.normalization.methodVersion) || !line.normalization.inputHashes.every(hash)) add("NORMALIZATION", line.evidenceId, "Normalization method and actual input hashes are required.");
    if (source && source.mode !== "synthetic" && source.snapshotHash && !line.normalization.inputHashes.includes(source.snapshotHash)) add("INPUT_HASH", line.evidenceId, "The source snapshot hash must survive normalization.");
  }
  for (const binding of value.claimBindings) {
    const claim = claims.get(binding.claimId);
    if (!scope(binding.scope) || !knownSubject(binding.scope.subject) || ![binding.validFrom, binding.validTo].every(nullableTime) || !intervalValid(binding.validFrom, binding.validTo)) add("SCOPE_TIME", binding.claimId, "Claim scope or validity interval is invalid.");
    if (claim && !sameSubject(binding.subject, binding.scope.subject)) add("CLAIM_SCOPE_SUBJECT", claim.id, "Claim subject and scope must be identical.");
    if (claim?.evidenceIds.some(id => !evidence.has(id))) add("EVIDENCE_REF", binding.claimId, "Claim references missing evidence.");
    if (binding.derivedFromClaimIds.some(id => !claims.has(id) || id === binding.claimId)) add("CLAIM_REF", binding.claimId, "Derived claim references are invalid.");
    if (claim?.status === "unknown" && claim.value !== null) add("UNKNOWN_VALUE", claim.id, "Unknown must preserve null rather than a fabricated numeric value.");
  }
  for (const binding of value.constraintBindings) {
    const c = constraints.get(binding.constraintId);
    if (binding.claimIds.some(id => !claims.has(id)) || c?.evidenceIds.some(id => !evidence.has(id))) add("CONSTRAINT_REF", binding.constraintId, "Constraint references missing input.");
    if (binding.confirmation === "confirmed" && (!binding.review || !text(binding.review.reviewer) || !text(binding.review.basis) || !timestamp(binding.review.reviewedAt) || c?.status !== "source_backed")) add("REVIEW", binding.constraintId, "Confirmed constraint requires an explicit review and source-backed basis.");
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  const bindings = new Map(value.claimBindings.map(b => [b.claimId, b]));
  function visit(id: string) {
    if (visiting.has(id)) { add("CLAIM_CYCLE", id, "Derived claim graph must be acyclic."); return; }
    if (visited.has(id)) return;
    visiting.add(id); bindings.get(id)?.derivedFromClaimIds.forEach(visit); visiting.delete(id); visited.add(id);
  }
  value.claims.forEach(c => visit(c.id));
  try {
  const retained = value.retainedSource;
  if (retained?.version === "D2_AREA_SOURCE_CONTEXT_V2") {
    const raw = retained as unknown as AreaSourceContextV2;
    if (!parseSavedAreaSourceContextV2(raw, raw.binding, raw.osmInterior.heldV1) || value.claims.find(c => c.field === "mapped_place_source_records_400m")?.value !== raw.independentContext.sampleSize) add("RETAINED_SOURCE", value.id, "Retained admitted source payload or source-record count changed.");
  }
  if (retained && record(retained.context)) {
    const raw = retained.context;
    if (!isPointObjectAreaContextResult(raw) || !record(retained.binding) || JSON.stringify(retained.binding.coordinates) !== JSON.stringify(raw.request.aoiCoordinates) || value.claims.find(c => c.field === "returned_source_centres_inside_aoi")?.value !== raw.summary.sampleSize || value.evidence[0]?.responseHash !== raw.source.sourceResponseHash || value.evidence[0]?.acquiredAt !== raw.source.acquiredAt || value.lineage[0]?.observedAt !== raw.source.observedAt) add("RETAINED_SOURCE", value.id, "Retained AOI source facts or full binding changed.");
  }
  } catch { add("RETAINED_SOURCE", value.id, "Malformed retained source is not usable provenance."); }
  return issues;
}

export function evaluateEvidenceCase(value: EvidenceCase, options: EvidenceEvaluationOptions) {
  if (!timestamp(options.asOf)) throw new Error("An explicit valid asOf is required.");
  for (const age of Object.values(options.maxObservationAgeDays ?? {})) if (!Number.isFinite(age) || age < 0) throw new Error("Freshness limits must be finite nonnegative days.");
  const issues = validateEvidenceCase(value), at = Date.parse(options.asOf);
  const sources = new Map(value.sources.map(s => [s.id, s]));
  const lineage = new Map(value.lineage.map(l => [l.evidenceId, l]));
  const bindings = new Map(value.claimBindings.map(b => [b.claimId, b]));
  const evidence: EvidenceEvaluation[] = value.evidence.map(item => {
    const line = lineage.get(item.id), source = sources.get(item.sourceId), reasons: string[] = [];
    if (!line || !source) reasons.push("missing_provenance");
    if (item.status === "unavailable" || source?.mode === "unavailable" || item.trust === "unavailable") reasons.push("source_unavailable");
    if (["derived", "generated"].includes(item.trust)) reasons.push("interpretation_is_not_source_fact");
    if (item.status === "conflicting") reasons.push("source_conflicting");
    if (!source?.licence.id || useFlag(source, options.intendedUse) !== "allowed" || item.rights.permittedUse === "unknown" || options.intendedUse === "export" && item.rights.redistribution !== "allowed") reasons.push("rights_not_established");
    if (line && !activeAt(line.validFrom, line.validTo, at)) reasons.push("outside_validity");
    if (line?.fetchedAt && Date.parse(line.fetchedAt) > at || line?.observedAt && Date.parse(line.observedAt) > at) reasons.push("future_evidence");
    if (issues.some(i => i.id === item.id || i.id === item.sourceId) || issues.some(i => ["VERSION", "DUPLICATE_ID", "SUBJECT_COLLISION"].includes(i.code))) reasons.push("invalid_provenance");
    return { evidenceId: item.id, usable: reasons.length === 0, unknownObservation: line?.observedAt == null, stale: reasons.includes("outside_validity"), reasons };
  });
  const evidenceById = new Map(evidence.map(e => [e.evidenceId, e]));
  const conflicts = new Map<string, string[]>();
  for (let i = 0; i < value.claims.length; i++) for (let j = i + 1; j < value.claims.length; j++) {
    const a = value.claims[i], b = value.claims[j], ab = bindings.get(a.id), bb = bindings.get(b.id);
    // Hypotheses do not silently become conflicting source facts or defeat them.
    if (!ab || !bb || a.value === null || b.value === null || !["source_backed", "derived", "conflicting"].includes(a.status) || !["source_backed", "derived", "conflicting"].includes(b.status)) continue;
    if (sameSubject(ab.subject, bb.subject) && a.field === b.field && a.unit === b.unit && scopeKey(ab.scope) === scopeKey(bb.scope) && overlaps(ab, bb) && JSON.stringify(a.value) !== JSON.stringify(b.value)) {
      conflicts.set(a.id, [...(conflicts.get(a.id) ?? []), b.id]); conflicts.set(b.id, [...(conflicts.get(b.id) ?? []), a.id]);
    }
  }
  const results = new Map<string, ClaimEvaluation>(), visiting = new Set<string>();
  const claimsById = new Map(value.claims.map(c => [c.id, c]));
  function evaluateClaim(claim: Claim): ClaimEvaluation {
    const cached = results.get(claim.id); if (cached) return cached;
    if (visiting.has(claim.id)) return { claimId: claim.id, value: claim.value, state: "unsupported", usable: false, reasons: ["claim_cycle"], conflictingClaimIds: [] };
    visiting.add(claim.id);
    const binding = bindings.get(claim.id), reasons: string[] = [];
    let stale = false;
    if (!binding || issues.some(i => i.id === claim.id)) reasons.push("invalid_claim_binding");
    if (claim.status === "unknown" || claim.value === null) reasons.push("unknown");
    if (claim.status === "source_backed" && !claim.evidenceIds.length) reasons.push("missing_evidence");
    if (binding && !activeAt(binding.validFrom, binding.validTo, at)) { reasons.push("outside_validity"); stale = true; }
    for (const id of claim.evidenceIds) {
      const ev = evidenceById.get(id), line = lineage.get(id);
      if (!ev?.usable) { reasons.push("unusable_evidence"); stale ||= ev?.stale ?? false; }
      if (binding && line && (!sameSubject(binding.subject, line.subject) || !evidenceScopeMatches(line.scope, binding.scope))) reasons.push("evidence_scope_mismatch");
      const maxAge = options.maxObservationAgeDays?.[claim.field];
      if (maxAge !== undefined) {
        if (!line?.observedAt) reasons.push("observation_date_unknown");
        else if ((at - Date.parse(line.observedAt)) / 86_400_000 > maxAge) { reasons.push("observation_stale"); stale = true; }
      }
    }
    if (claim.status === "derived" && (!binding?.methodVersion || !binding.derivedFromClaimIds.length)) reasons.push("missing_derivation");
    for (const id of binding?.derivedFromClaimIds ?? []) {
      const input = claimsById.get(id);
      const inputResult = input ? evaluateClaim(input) : null;
      if (!inputResult?.usable) reasons.push("upstream_unusable");
      stale ||= inputResult?.state === "stale";
    }
    const conflictingClaimIds = conflicts.get(claim.id) ?? [];
    const conflict = claim.status === "conflicting" || conflictingClaimIds.length > 0;
    if (conflict) reasons.push("unresolved_conflict");
    const state: ClaimEvaluation["state"] = conflict ? "conflicting" : stale ? "stale" : reasons.includes("unknown") ? "unknown" : reasons.length ? "unsupported" : claim.status;
    const out = { claimId: claim.id, value: claim.value, state, usable: reasons.length === 0 && ["source_backed", "derived"].includes(claim.status), reasons: [...new Set(reasons)], conflictingClaimIds };
    visiting.delete(claim.id); results.set(claim.id, out); return out;
  }
  const claims = value.claims.map(evaluateClaim);
  const constraintBindings = new Map(value.constraintBindings.map(b => [b.constraintId, b]));
  const constraints = value.constraints.map(c => {
    const binding = constraintBindings.get(c.id), reasons: string[] = [];
    if (!binding || issues.some(i => i.id === c.id)) reasons.push("invalid_constraint_binding");
    if (!binding || binding.confirmation !== "confirmed") reasons.push("constraint_not_confirmed");
    if (c.status !== "source_backed" || !c.evidenceIds.length) reasons.push("constraint_basis_missing");
    if (c.evidenceIds.some(id => !evidenceById.get(id)?.usable || !sameSubject(lineage.get(id)!.subject, binding?.subject ?? { id: "", kind: "aoi" }))) reasons.push("constraint_evidence_unusable");
    if (binding?.claimIds.some(id => !results.get(id)?.usable || claimsById.get(id)?.subjectId !== c.subjectId)) reasons.push("constraint_claim_unusable");
    if (binding?.review && Date.parse(binding.review.reviewedAt) > at) reasons.push("future_review");
    return { constraintId: c.id, confirmation: binding?.confirmation ?? "unknown", blocksDecision: c.severity === "critical" && reasons.length > 0, reasons };
  });
  return {
    version: DEVKIT_EVIDENCE_VERSION, asOf: options.asOf, intendedUse: options.intendedUse,
    valid: issues.length === 0, issues, evidence, claims, constraints,
    rightsIssues: value.sources.filter(s => !s.licence.id || useFlag(s, options.intendedUse) !== "allowed").map(s => ({ sourceId: s.id, code: "case_use_rights_not_established" })),
    decision: issues.length || constraints.some(c => c.blocksDecision) || value.sources.some(s => !s.licence.id || useFlag(s, options.intendedUse) !== "allowed") ? "hold" as const : "screening_only" as const,
    caveat: DEVKIT_EVIDENCE_CAVEAT
  };
}

function rawCaseShape(value: unknown): value is EvidenceCase {
  if (!record(value) || value.version !== DEVKIT_EVIDENCE_VERSION || !text(value.id) || !nullableText(value.aoiId) || value.caveat !== DEVKIT_EVIDENCE_CAVEAT || !strings(value.limitations)) return false;
  const keys = ["version", "id", "aoiId", "objects", "sources", "evidence", "claims", "constraints", "lineage", "claimBindings", "constraintBindings", "retainedSource", "limitations", "caveat"];
  if (Object.keys(value).some(k => !keys.includes(k))) return false;
  for (const key of ["objects", "sources", "evidence", "claims", "constraints", "lineage", "claimBindings", "constraintBindings"]) if (!Array.isArray(value[key]) || (value[key] as unknown[]).length > 1000 || !(value[key] as unknown[]).every(record)) return false;
  const x = value as unknown as EvidenceCase;
  const rights = (v: unknown) => ["allowed", "not_allowed", "unknown"].includes(String(v));
  return (x.retainedSource === null || record(x.retainedSource)) &&
    x.objects.every(o => text(o.id) && ["land_parcel", "building", "poi"].includes(o.kind) && text(o.label) && o.crs === "EPSG:4326" && trustValue(o.trust) && strings(o.evidenceIds)) &&
    x.sources.every(s => text(s.id) && text(s.label) && ["bundled_public_snapshot", "public_document", "user_provided", "synthetic", "unavailable"].includes(s.mode) && sourceUrl(s.url) && nullableText(s.version) && (s.snapshotHash === null || hash(s.snapshotHash)) && record(s.licence) && nullableText(s.licence.id) && sourceUrl(s.licence.url) && nullableText(s.licence.fullTextPath) && typeof s.licence.attribution === "string" && rights(s.licence.localUse) && rights(s.licence.derivativeUse) && rights(s.licence.redistribution) && strings(s.licence.conditions)) &&
    x.evidence.every(e => text(e.id) && text(e.subjectId) && text(e.sourceId) && typeof e.label === "string" && sourceUrl(e.sourceUrl) && nullableText(e.excerpt) && nullableTime(e.acquiredAt) && nullableTime(e.validAt) && (e.responseHash === null || hash(e.responseHash)) && ["available", "partial", "unavailable", "conflicting"].includes(e.status) && trustValue(e.trust) && record(e.rights) && nullableText(e.rights.licence) && typeof e.rights.attribution === "string" && ["public_demo", "synthetic_demo", "unknown"].includes(e.rights.permittedUse) && rights(e.rights.redistribution)) &&
    x.claims.every(c => text(c.id) && text(c.subjectId) && text(c.field) && (c.value === null || ["string", "boolean"].includes(typeof c.value) || typeof c.value === "number" && Number.isFinite(c.value)) && nullableText(c.unit) && ["source_backed", "assumption", "derived", "generated", "unknown", "conflicting"].includes(c.status) && strings(c.evidenceIds) && typeof c.explanation === "string") &&
    x.constraints.every(c => text(c.id) && text(c.subjectId) && text(c.label) && ["source_backed", "proposed", "assumed", "unknown", "conflicting"].includes(c.status) && ["critical", "warning", "information"].includes(c.severity) && strings(c.evidenceIds) && typeof c.impact === "string" && typeof c.nextAction === "string") &&
    x.lineage.every(l => text(l.evidenceId) && text(l.sourceId) && subject(l.subject) && scope(l.scope) && [l.fetchedAt, l.observedAt, l.validFrom, l.validTo, l.providerUpdatedAt, l.cacheServedAt].every(nullableTime) && nullableText(l.sourceRecordId) && nullableText(l.documentId) && nullableText(l.fragment) && record(l.normalization) && text(l.normalization.methodVersion) && Array.isArray(l.normalization.inputHashes) && l.normalization.inputHashes.every(hash) && strings(l.limitations)) &&
    x.claimBindings.every(b => text(b.claimId) && subject(b.subject) && scope(b.scope) && [b.validFrom, b.validTo].every(nullableTime) && strings(b.derivedFromClaimIds) && nullableText(b.methodVersion)) &&
    x.constraintBindings.every(b => text(b.constraintId) && subject(b.subject) && ["confirmed", "proposed", "assumed", "unknown", "conflicting"].includes(b.confirmation) && strings(b.claimIds) && (b.review === null || record(b.review) && text(b.review.reviewer) && timestamp(b.review.reviewedAt) && text(b.review.basis)));
}
export function parseEvidenceCase(value: unknown): EvidenceCase | null {
  try {
    if (!rawCaseShape(value)) return null;
    let nodes = 0;
    const safeJson = (v: unknown, depth: number): boolean => {
      if (++nodes > 50000 || depth > 24) return false;
      if (v === null || typeof v === "string" || typeof v === "boolean") return true;
      if (typeof v === "number") return Number.isFinite(v);
      if (Array.isArray(v)) return v.every(x => safeJson(x, depth + 1));
      return record(v) && Object.getPrototypeOf(v) === Object.prototype && Object.entries(v).every(([key, item]) => !["__proto__", "constructor", "prototype"].includes(key) && safeJson(item, depth + 1));
    };
    if (!safeJson(value, 0)) return null;
    const json = JSON.stringify(value);
    if (new TextEncoder().encode(json).byteLength > 512 * 1024) return null;
    const plain: unknown = JSON.parse(json);
    return rawCaseShape(plain) && validateEvidenceCase(plain).length === 0 ? plain : null;
  } catch { return null; }
}
export function serializeEvidenceCase(value: EvidenceCase): string | null {
  const parsed = parseEvidenceCase(value); return parsed ? JSON.stringify(parsed) : null;
}

/** Only reuses an EXISTING validated source context supplied by the caller.
 * No fetch/env/filesystem/network activation; native binding is independent of the candidate save. */
export function adaptAreaSourceContext(binding: AreaSourceBinding, heldV1: PointObjectAreaContextResult | null, candidate: unknown, targetAoi?: AOI): EvidenceCase | null {
  const saved = parseSavedAreaSourceContextV2(candidate, binding, heldV1);
  if (!saved) return null;
  const c: AreaSourceContextV2 | null = buildAreaSourceContextV2(binding, heldV1, saved.independentContext);
  if (!c) return null;
  if (targetAoi && (!parsePointObjectCreateAoi(targetAoi) || targetAoi.crs !== "EPSG:4326" || !Number.isInteger(targetAoi.revision) || targetAoi.revision < 1 || JSON.stringify(targetAoi.coordinates) !== JSON.stringify(binding.geometry.coordinates))) return null;
  const aoiId = targetAoi?.id ?? binding.aoiId;
  const independent = c.independentContext, subjectRef: EvidenceSubject = { id: aoiId, kind: "aoi" };
  const scopeRef: EvidenceScope = { subject: subjectRef, kind: "radius", radiusM: 400, geometryHash: c.geometryHash, completeInventory: false };
  const id = `overture:${independent.snapshotHash}`, evId = `${id}:source-record-count`;
  const ev: Evidence = {
    id: evId, subjectId: aoiId, label: "Historical bounded Overture Places snapshot; source records only", sourceId: id, sourceUrl: null,
    excerpt: "Separate mapped Places point records; no parcel/building, operation, capacity or complete-inventory conclusion.", acquiredAt: independent.fetchedAt, validAt: null,
    responseHash: independent.snapshotHash, trust: "public_source", status: independent.status === "available" ? "partial" : "unavailable",
    rights: { licence: independent.licenceId, attribution: independent.attribution, permittedUse: "public_demo", redistribution: "allowed" }
  };
  const claims: Claim[] = [
    { id: `${evId}:claim`, subjectId: aoiId, field: "mapped_place_source_records_400m", value: independent.sampleSize, unit: "source_records", status: independent.sampleSize === null ? "unknown" : "source_backed", evidenceIds: [evId], explanation: "Source-record count in the admitted 400 m scope; not unique physical entities or a complete inventory." },
    { id: `${id}:800m-unknown`, subjectId: aoiId, field: "mapped_place_source_records_800m", value: null, unit: "source_records", status: "unknown", evidenceIds: [], explanation: "400 m source scope does not establish 800 m coverage." }
  ];
  const lineage: EvidenceLineage[] = [{ evidenceId: evId, sourceId: id, subject: subjectRef, scope: scopeRef, sourceRecordId: null, documentId: independent.licencePath, fragment: "sampleSize; places; sources; spatialCoverage", fetchedAt: independent.fetchedAt, observedAt: independent.observationDate, validFrom: null, validTo: null, providerUpdatedAt: null, cacheServedAt: independent.cacheServedAt, normalization: { methodVersion: "devkit-existing-area-source-v1", inputHashes: [independent.snapshotHash] }, limitations: ["Historical snapshot, not a new source acquisition.", "Provider update dates retained per source record; never copied to observation time."] }];
  const claimBindings: ClaimBinding[] = claims.map((claim, i) => ({ claimId: claim.id, subject: subjectRef, scope: i ? { ...scopeRef, radiusM: 800 } : structuredClone(scopeRef), validFrom: null, validTo: null, derivedFromClaimIds: [], methodVersion: null }));
  const records: Evidence[] = [];
  const objects: SpatialObject[] = independent.places.map(p => {
    const poi: EvidenceSubject = { id: `overture-poi:${p.id}`, kind: "poi" }, evidenceId = p.evidenceRef;
    records.push({ ...structuredClone(ev), id: evidenceId, subjectId: poi.id, label: p.name,
      excerpt: "Mapped Places point record, not a selected building/parcel, confirmed operation or capacity." });
    lineage.push({ evidenceId, sourceId: id, subject: poi, scope: { subject: poi, kind: "subject", radiusM: null, geometryHash: null, completeInventory: false },
      sourceRecordId: p.id, documentId: independent.licencePath, fragment: `places[id=${p.id}]; original provider sources retained`,
      fetchedAt: independent.fetchedAt, observedAt: p.observationDate, validFrom: null, validTo: null, providerUpdatedAt: p.providerUpdatedAt, cacheServedAt: independent.cacheServedAt,
      normalization: { methodVersion: "devkit-existing-place-record-v1", inputHashes: [independent.snapshotHash] },
      limitations: ["Source identifiers only; no cross-source physical merge.", "Confidence is not capacity, operation or independent catchments."] });
    return { id: poi.id, kind: "poi", label: p.name, sourceFeatureId: p.id, geometry: { type: "Point", coordinates: [...p.coordinates] }, crs: "EPSG:4326", trust: "public_source", evidenceIds: [evidenceId] };
  });
  const constraints: Constraint[] = [{ id: `${aoiId}:official-validation`, subjectId: aoiId, label: "Parcel identity, planning and rights remain unverified", status: "unknown", severity: "critical", geometry: null, evidenceIds: [], impact: "Screening can continue; parcel-specific legal or investment commitment requires validation.", nextAction: "Obtain applicable official/client parcel, title, planning and site evidence; review jurisdiction and authority." }];
  const geometrySources: EvidenceSource[] = binding.origin === "mapped_osm_polygon" ? [{ id: `osm-geometry:${binding.sourceFeatureId}:v${binding.sourceVersion}`, label: "Separate mapped OSM polygon input; not a cadastral parcel", mode: "bundled_public_snapshot", url: "https://www.openstreetmap.org/copyright", version: String(binding.sourceVersion), snapshotHash: null,
    licence: { id: "ODbL-1.0", url: "https://www.openstreetmap.org/copyright", fullTextPath: null, attribution: "© OpenStreetMap contributors", localUse: "allowed", derivativeUse: "unknown", redistribution: "unknown", conditions: ["Geometry has separate OSM attribution/terms.", "Combined database/derivative redistribution requires review; Places licence does not clear geometry rights."] } }] : [];
  return {
    version: DEVKIT_EVIDENCE_VERSION, id: `area-source:${aoiId}:${c.geometryHash}`, aoiId, objects,
    sources: [{ id, label: independent.dataset, mode: "bundled_public_snapshot", url: null, version: independent.release, snapshotHash: independent.snapshotHash,
      licence: { id: independent.licenceId, url: "https://cdla.dev/permissive-2-0/", fullTextPath: independent.licencePath, attribution: independent.attribution, localUse: "allowed", derivativeUse: "allowed", redistribution: "allowed", conditions: ["Supply the full agreement text with shared Places data.", "Preserve provider attribution and record lineage.", "OSM geometry licence remains separate; combined-database compatibility is not established."] } }, ...geometrySources],
    evidence: [ev, ...records], claims, constraints, lineage, claimBindings,
    constraintBindings: [{ constraintId: constraints[0].id, subject: subjectRef, confirmation: "unknown", claimIds: [], review: null }],
    retainedSource: JSON.parse(JSON.stringify(c)) as JsonObject,
    limitations: ["Source-only adapter; historical scope and caveats unchanged.", "AOI is not a legal land parcel; mapped POIs cannot replace a selected building or parcel.", "Missing OSM interior remains null/error, independently of surrounding Places records.", "This whole evidence payload must survive project save/reopen/export."], caveat: DEVKIT_EVIDENCE_CAVEAT
  };
}

export type ExistingAreaContextMapping = {
  status: "retained_context" | "source_missing" | "invalid_context" | "scope_mismatch";
  sourceUse: "matched_receipt" | "not_used" | "unknown" | "mismatch";
  evidenceCase: EvidenceCase | null;
  evidence: Evidence[]; claims: Claim[]; constraints: Constraint[]; objects: SpatialObject[];
  limitations: string[];
};
/** A saved source response is useful independently of whether an earlier AI
 * generation used it. `areaContextUsed` must be the ORIGINAL generation receipt.
 * This function never asserts that an old generated design used current context. */
export function mapExistingAreaContext(
  project: Pick<DevkitProject, "id" | "brief">,
  aoi: AOI,
  areaContext: unknown,
  options: { areaContextUsed?: unknown } = {}
): ExistingAreaContextMapping {
  const unavailable = (status: ExistingAreaContextMapping["status"], message: string): ExistingAreaContextMapping => ({ status, sourceUse: "unknown", evidenceCase: null, evidence: [], claims: [], constraints: [], objects: [], limitations: [message] });
  if (areaContext == null) return unavailable("source_missing", "No retained area source response; absence is unknown, never a zero inventory.");
  const parsedAoi = parsePointObjectCreateAoi(aoi);
  if (!parsedAoi || aoi.crs !== "EPSG:4326" || !Number.isInteger(aoi.revision) || aoi.revision < 1 || !isPointObjectAreaContextResult(areaContext) || !parseNormalizedPointObjectContext(normalizePointObjectAreaContext(areaContext))) return unavailable("invalid_context", "Saved AOI/source context failed existing producer-compatible validation.");
  const c = structuredClone(areaContext);
  if (c.request.marketKey !== project.brief.marketKey || JSON.stringify(c.request.aoiCoordinates) !== JSON.stringify(aoi.coordinates)) return unavailable("scope_mismatch", "Source context is for another market or exact AOI; no nearest object/POI substitution.");
  const measured = calculatePolygonMeasurements(aoi.coordinates[0]);
  if (c.area.areaSqM !== Math.round(measured.areaSqM) || c.area.perimeterM !== Math.round(measured.perimeterM) || Math.abs(c.area.centroid.longitude - measured.centroid.longitude) > 1e-9 || Math.abs(c.area.centroid.latitude - measured.centroid.latitude) > 1e-9) return unavailable("scope_mismatch", "Source measurements do not describe the supplied AOI.");
  const receipt = parsePointObjectCreateSourceUseReceipt(options.areaContextUsed);
  const sourceUse: ExistingAreaContextMapping["sourceUse"] = options.areaContextUsed === undefined ? "unknown" : options.areaContextUsed === null ? "not_used" : receipt && receipt.sourceResponseHash === c.source.sourceResponseHash && receipt.sampleSize === c.summary.sampleSize && receipt.mappedBuildingCount === c.summary.mappedBuildingCount && receipt.capReached === c.coverage.capReached ? "matched_receipt" : "mismatch";
  const ref: EvidenceSubject = { id: aoi.id, kind: "aoi" }, id = `osm-area:${c.source.sourceResponseHash}`, evidenceId = `${id}:aoi`;
  // The existing contract has no geometry hash; preserve exact full coordinates
  // in retainedSource and input binding instead of inventing a source hash.
  const scopeRef: EvidenceScope = { subject: ref, kind: "subject", radiusM: null, geometryHash: null, completeInventory: false };
  const ev: Evidence = { id: evidenceId, subjectId: aoi.id, label: "Retained OpenStreetMap AOI centre sample", sourceId: id, sourceUrl: c.source.licenceUrl,
    excerpt: "Returned feature centres inside this AOI; centroid proxy, not complete intersection, parcel or building inventory.", acquiredAt: c.source.acquiredAt, validAt: null, responseHash: c.source.sourceResponseHash,
    trust: aoi.provenance === "synthetic" ? "synthetic" : "public_source", status: "partial", rights: { licence: c.source.licenceId, attribution: c.source.attribution, permittedUse: aoi.provenance === "synthetic" ? "synthetic_demo" : "public_demo", redistribution: "unknown" } };
  const claims: Claim[] = [{ id: `${evidenceId}:count`, subjectId: aoi.id, field: "returned_source_centres_inside_aoi", value: c.summary.sampleSize, unit: "source_records", status: "source_backed", evidenceIds: [evidenceId], explanation: "Bounded mapped source sample; zero does not prove an empty site or absence of restrictions." }];
  const constraint: Constraint = { id: `${evidenceId}:official-gap`, subjectId: aoi.id, label: "Parcel, rights and planning validation missing", status: "unknown", severity: "critical", geometry: null, evidenceIds: [], impact: "AOI source sample cannot establish site-specific rights, buildability, service capacity or legal absence of constraints.", nextAction: "Obtain official/client parcel, planning and rights documents and applicable regional review." };
  const evidenceCase: EvidenceCase = {
    version: DEVKIT_EVIDENCE_VERSION, id: `project:${project.id}:aoi:${aoi.id}:r${aoi.revision}`, aoiId: aoi.id, objects: [],
    sources: [{ id, label: c.source.name, mode: aoi.provenance === "synthetic" ? "synthetic" : "bundled_public_snapshot", url: c.source.licenceUrl, version: null, snapshotHash: c.source.sourceResponseHash,
      licence: { id: c.source.licenceId, url: c.source.licenceUrl, fullTextPath: null, attribution: c.source.attribution, localUse: "allowed", derivativeUse: "unknown", redistribution: "unknown", conditions: ["Retained public/synthetic input only; combined database, commercial redistribution and hosted custody need separate review.", "Retain OpenStreetMap attribution and applicable ODbL terms."] } }],
    evidence: [ev], claims, constraints: [constraint],
    lineage: [{ evidenceId, sourceId: id, subject: ref, scope: scopeRef, sourceRecordId: null, documentId: null, fragment: "features; summary; coverage; source", fetchedAt: c.source.acquiredAt, observedAt: c.source.observedAt, validFrom: null, validTo: null, providerUpdatedAt: null, cacheServedAt: null, normalization: { methodVersion: "devkit-retained-area-context-v1", inputHashes: [c.source.sourceResponseHash] }, limitations: [...c.limitations, "Retained response; no fresh source network call."] }],
    claimBindings: [{ claimId: claims[0].id, subject: ref, scope: structuredClone(scopeRef), validFrom: null, validTo: null, derivedFromClaimIds: [], methodVersion: null }],
    constraintBindings: [{ constraintId: constraint.id, subject: ref, confirmation: "unknown", claimIds: [], review: null }],
    retainedSource: { binding: JSON.parse(JSON.stringify({ projectId: project.id, aoiId: aoi.id, aoiRevision: aoi.revision, coordinates: aoi.coordinates })) as JsonObject, context: JSON.parse(JSON.stringify(c)) as JsonObject, generationSourceUse: sourceUse },
    limitations: ["No mapped centre is promoted to parcel, building, entrance or legal geometry.", "400/800 m context is separate from this AOI interior sample.", `Earlier generation source use: ${sourceUse}; retained context alone cannot upgrade it.`, "Persist/export the full EvidenceCase to retain dates, source scope and original context."], caveat: DEVKIT_EVIDENCE_CAVEAT
  };
  const records = foundationRecordsForEvidenceCase(evidenceCase);
  return { status: "retained_context", sourceUse, evidenceCase, ...records, limitations: evidenceCase.limitations };
}

/** Contract1.1 preservation: module semantics stay here; foundation stores JSON.
 * The first source record carries case-level metadata and the original snapshot,
 * while every record keeps its own line/source and every claim its exact scope. */
export function foundationRecordsForEvidenceCase(value: EvidenceCase): Pick<DevkitProject, "objects" | "evidence" | "claims" | "constraints"> {
  if (validateEvidenceCase(value).length) throw new Error("Invalid evidence case cannot populate project records.");
  const json = (v: unknown): JsonObject => JSON.parse(JSON.stringify(v)) as JsonObject;
  const metadata = json({ id: value.id, aoiId: value.aoiId, objectIds: value.objects.map(o => o.id), evidenceIds: value.evidence.map(e => e.id), claimIds: value.claims.map(c => c.id), constraintIds: value.constraints.map(c => c.id), constraintBindings: value.constraintBindings, sources: value.sources, retainedSource: value.retainedSource, limitations: value.limitations, caveat: value.caveat });
  const evidence = value.evidence.map((item, index) => ({ ...structuredClone(item), provenance: json({ moduleVersion: DEVKIT_EVIDENCE_VERSION, caseId: value.id, lineage: value.lineage.find(l => l.evidenceId === item.id), source: value.sources.find(s => s.id === item.sourceId), ...(index === 0 ? { caseMetadata: metadata } : {}) }) }));
  const claims = value.claims.map(item => {
    const binding = value.claimBindings.find(b => b.claimId === item.id)!;
    return { ...structuredClone(item), scope: json({ moduleVersion: DEVKIT_EVIDENCE_VERSION, caseId: value.id, ...binding.scope, validFrom: binding.validFrom, validTo: binding.validTo, derivedFromClaimIds: binding.derivedFromClaimIds, methodVersion: binding.methodVersion }) };
  });
  return { objects: structuredClone(value.objects), evidence, claims, constraints: structuredClone(value.constraints) };
}

/** Reopen consistency check, not a signature or document authenticity claim.
 * Missing/edited preservation metadata stays a gap; no fallback reconstruction. */
export function restoreEvidenceCaseFromProject(project: Pick<DevkitProject, "aoi" | "objects" | "evidence" | "claims" | "constraints">, caseId: string): EvidenceCase | null {
  try {
    const evidence = project.evidence.filter(item => {
      const provenance = (item as Evidence & { provenance?: JsonObject }).provenance;
      return provenance?.moduleVersion === DEVKIT_EVIDENCE_VERSION && provenance.caseId === caseId;
    });
    const head = evidence.find(item => record((item as Evidence & { provenance?: JsonObject }).provenance?.caseMetadata));
    if (!head) return null;
    const meta = (head as Evidence & { provenance: JsonObject }).provenance.caseMetadata as JsonObject;
    if (meta.id !== caseId || meta.aoiId !== null && meta.aoiId !== project.aoi?.id || !strings(meta.objectIds) || !strings(meta.evidenceIds) || !strings(meta.claimIds) || !strings(meta.constraintIds) || !Array.isArray(meta.constraintBindings)) return null;
    const sameIds = (actual: string[], expected: string[]) => JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
    if (!sameIds(evidence.map(e => e.id), meta.evidenceIds)) return null;
    const claimIds = meta.claimIds, objectIds = meta.objectIds, constraintIds = meta.constraintIds;
    const claims = project.claims.filter(c => claimIds.includes(c.id));
    const objects = project.objects.filter(o => objectIds.includes(o.id));
    const constraints = project.constraints.filter(c => constraintIds.includes(c.id));
    if (record(meta.retainedSource) && record(meta.retainedSource.binding)) {
      const b = meta.retainedSource.binding;
      const coordinates = b.coordinates ?? (record(b.geometry) ? b.geometry.coordinates : null);
      if (coordinates && JSON.stringify(coordinates) !== JSON.stringify(project.aoi?.coordinates) || b.aoiRevision !== undefined && b.aoiRevision !== project.aoi?.revision) return null;
    }
    if (!sameIds(claims.map(c => c.id), meta.claimIds) || !sameIds(objects.map(o => o.id), meta.objectIds) || !sameIds(constraints.map(c => c.id), meta.constraintIds)) return null;
    if (!Array.isArray(meta.sources) || !meta.sources.every(record)) return null;
    const sources = new Map<string, EvidenceSource>((meta.sources as unknown as EvidenceSource[]).map(s => [s.id, s])), lineage: EvidenceLineage[] = [];
    for (const item of evidence) {
      const provenance = (item as Evidence & { provenance: JsonObject }).provenance;
      if (!record(provenance.lineage) || !record(provenance.source)) return null;
      const source = provenance.source as unknown as EvidenceSource, prior = sources.get(source.id);
      if (prior && JSON.stringify(prior) !== JSON.stringify(source)) return null;
      sources.set(source.id, source); lineage.push(provenance.lineage as unknown as EvidenceLineage);
    }
    const claimBindings = claims.map(claim => {
      const s = (claim as Claim & { scope?: JsonObject }).scope;
      if (!s || s.moduleVersion !== DEVKIT_EVIDENCE_VERSION || s.caseId !== caseId) throw new Error("Missing claim scope.");
      return { claimId: claim.id, subject: s.subject, scope: { subject: s.subject, kind: s.kind, radiusM: s.radiusM, geometryHash: s.geometryHash, completeInventory: s.completeInventory }, validFrom: s.validFrom, validTo: s.validTo, derivedFromClaimIds: s.derivedFromClaimIds, methodVersion: s.methodVersion };
    });
    return parseEvidenceCase({ version: DEVKIT_EVIDENCE_VERSION, id: meta.id, aoiId: meta.aoiId, objects, sources: [...sources.values()], evidence, claims, constraints, lineage, claimBindings, constraintBindings: meta.constraintBindings, retainedSource: meta.retainedSource, limitations: meta.limitations, caveat: meta.caveat });
  } catch { return null; }
}
