import { createHash } from "node:crypto";
import { closeSync, constants, fsyncSync, openSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
// @ts-expect-error Explicit extension is required by the offline Node runner.
import { canonicalReceivedJson, type Quality20FindAcquisition, type Quality20CreateAcquisition } from "./quality20-acquisition.ts";
// @ts-expect-error Explicit extension is required by the offline Node runner.
import { validateSprint10PublicEvidenceReceipt } from "./sprint10-live-journey-gate.ts";
import type { Quality20Binding, Quality20Subject } from "./quality20-frozen-case";

function guard(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`COMPLETE25_ACQUISITION_BLOCKED: ${message}`);
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sha = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const iso = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const sourceId = (value: unknown) => typeof value === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(value);
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
function validGeometry(value: unknown): boolean {
  if (value === null) return true;
  if (!record(value) || !["Polygon", "MultiPolygon"].includes(String(value.type)) || !Array.isArray(value.coordinates)) return false;
  const polygons = value.type === "Polygon" ? [value.coordinates] : value.coordinates;
  let count = 0;
  return polygons.length > 0 && polygons.every(poly => Array.isArray(poly) && poly.length > 0 && poly.every(ring =>
    Array.isArray(ring) && ring.length >= 4 && ring.every(p => ++count <= 20_000 && Array.isArray(p) && p.length === 2 &&
      p.every(n => typeof n === "number" && Number.isFinite(n)) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90) && hash(ring[0]) === hash(ring.at(-1))));
}
export type Complete25ContextCapture = { payload: unknown; receivedAt: string };
export function complete25FindRequest(plan: Quality20FindAcquisition) {
  return { marketKey: plan.marketKey, locale: plan.locale, bounds: plan.find.bounds, group: plan.find.group,
    mappedMinimumLevels: plan.find.mappedMinimumLevels, mappedMaximumLevels: plan.find.mappedMaximumLevels, limit: 12 };
}
export function complete25ObservedFindPlan(plan: Quality20FindAcquisition, bounds: unknown): Quality20FindAcquisition {
  const envelope = plan.find.boundedEnvelope, fit = plan.find.bounds;
  guard(Array.isArray(bounds) && bounds.length === 4 && bounds.every(n => typeof n === "number" && Number.isFinite(n)) &&
    bounds[0] < bounds[2] && bounds[1] < bounds[3] && bounds[0] >= envelope[0] && bounds[1] >= envelope[1] &&
    bounds[2] <= envelope[2] && bounds[3] <= envelope[3] && bounds[0] <= fit[0] + 1e-7 && bounds[1] <= fit[1] + 1e-7 &&
    bounds[2] >= fit[2] - 1e-7 && bounds[3] >= fit[3] - 1e-7, "Observed viewport left approved envelope or requested fit rectangle.");
  return { ...plan, find: { ...plan.find, bounds: [...bounds] } };
}
/** Never select a replacement for a malformed/missing candidate: source order is fixed. */
export function complete25AcquiredCandidates(plan: Quality20FindAcquisition, payload: unknown) {
  guard(record(payload) && payload.protocol === "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1" && payload.mode === "results" &&
    canonicalReceivedJson(payload.criteria) === canonicalReceivedJson(complete25FindRequest(plan)) &&
    Array.isArray(payload.candidates) && payload.candidates.length >= 3 && payload.candidates.length <= 12 && record(payload.source) &&
    payload.source.name === "OpenStreetMap" && payload.source.service === "Overpass API" && payload.source.licenceId === "ODbL-1.0" &&
    payload.source.officialStatus === "open_context_not_official" && sha(payload.source.sourceResponseHash) && iso(payload.source.acquiredAt) &&
    payload.ordering === "source_identity_ascending_not_ranked" && payload.caveat === caveat,
  "Find response lacks the exact attributed approved query/cohort.");
  const candidates = payload.candidates.slice(0, 3);
  guard(candidates.every((c): c is Record<string, unknown> => record(c) && sourceId(c.sourceFeatureId) &&
    typeof c.longitude === "number" && typeof c.latitude === "number" && Number.isFinite(c.longitude) && Number.isFinite(c.latitude) &&
    c.longitude >= plan.find.bounds[0] && c.longitude <= plan.find.bounds[2] && c.latitude >= plan.find.bounds[1] && c.latitude <= plan.find.bounds[3] &&
    validGeometry(c.geometry)) &&
    new Set(candidates.map(c => c.sourceFeatureId)).size === 3, "Find first-three identities/coordinates/geometry are unusable.");
  return candidates;
}
export function buildComplete25FindAcquisition(plan: Quality20FindAcquisition, receivedEvidence: unknown,
  captures: Complete25ContextCapture[], receivedAt: string, paidPostCount: number) {
  guard(paidPostCount === 0 && iso(receivedAt), "Nonpaid count/time required.");
  const candidates = complete25AcquiredCandidates(plan, receivedEvidence);
  guard(captures.length === 3 && record(receivedEvidence) && record(receivedEvidence.source), "Three exact Find transitions required.");
  const subjects = captures.map(({ payload, receivedAt: contextReceivedAt }, index) => {
    const candidate = candidates[index];
    guard(iso(contextReceivedAt) && record(payload) && payload.mode === "resolved" && payload.schemaVersion === 2 && record(payload.subject) &&
      payload.subject.sourceFeatureId === candidate.sourceFeatureId && hash(payload.subject.displayGeometry ?? null) === hash(candidate.geometry),
    "Find-to-Analyse identity/full geometry drift.");
    validateSprint10PublicEvidenceReceipt(payload.evidenceReceipt, String(candidate.sourceFeatureId));
    const e = payload.evidenceReceipt as Record<string, unknown>;
    const subject: Quality20Subject = { sourceIdentity: String(candidate.sourceFeatureId), geometryHash: hash(candidate.geometry),
      sourceResponseHash: String(e.sourceResponseHash), evidencePackHash: String(e.evidencePackHash), acquiredAt: String(e.acquiredAt) };
    return { caseId: `FA${String((Number(plan.caseId.slice(1)) - 1) * 3 + index + 1).padStart(2, "0")}`,
      subject, geometry: candidate.geometry, receivedAt: contextReceivedAt, receivedEvidence: payload };
  });
  const find: NonNullable<Quality20Binding["find"]> = { caseId: plan.caseId, bounds: plan.find.bounds, group: plan.find.group,
    mappedMinimumLevels: plan.find.mappedMinimumLevels, mappedMaximumLevels: plan.find.mappedMaximumLevels,
    candidateIds: subjects.map(s => s.subject.sourceIdentity), geometryHashes: subjects.map(s => s.subject.geometryHash),
    sourceResponseHash: String(receivedEvidence.source.sourceResponseHash), acquiredAt: String(receivedEvidence.source.acquiredAt) };
  return { schemaVersion: "geoai.complete25.nonpaid-acquisition-receipt.v2" as const, kind: "find" as const,
    status: "ACQUIRED_NOT_ANALYSED" as const, execution: plan.execution, caseId: plan.caseId, planSha256: plan.planSha256,
    receivedAt, receivedAtMeaning: "local_browser_response_receipt_time_NOT_source_freshness", paidPostCount: 0,
    comparisonAcceptance: "NOT_EVALUATED_ACQUISITION_ONLY", find, subjects, receivedEvidence };
}
export function buildComplete25CreateAcquisition(plan: Quality20CreateAcquisition, receivedEvidence: unknown,
  aoi: unknown, receivedAt: string, paidPostCount: number) {
  const coordinates = [[...plan.coordinates, plan.coordinates[0]]];
  guard(paidPostCount === 0 && iso(receivedAt) && record(aoi) && typeof aoi.id === "string" && /^create-aoi-\d{13}$/.test(aoi.id) &&
    hash(aoi.coordinates) === hash(coordinates) && record(receivedEvidence) && record(receivedEvidence.request) &&
    receivedEvidence.request.marketKey === plan.marketKey && receivedEvidence.request.locale === "en" &&
    hash(receivedEvidence.request.aoiCoordinates) === hash(coordinates) && record(receivedEvidence.source) &&
    sha(receivedEvidence.source.sourceResponseHash) && iso(receivedEvidence.source.acquiredAt), "Create AOI/source correlation failed.");
  return { schemaVersion: "geoai.complete25.nonpaid-acquisition-receipt.v2" as const, kind: "create" as const,
    status: "ACQUIRED_NOT_GENERATED" as const, execution: plan.execution, caseId: plan.caseId, planSha256: plan.planSha256,
    receivedAt, receivedAtMeaning: "local_browser_response_receipt_time_NOT_source_freshness", paidPostCount: 0,
    comparisonAcceptance: "NOT_EVALUATED_ACQUISITION_ONLY", create: { coordinates: plan.coordinates,
      geometryHash: hash(plan.coordinates), contextHash: hash(receivedEvidence), aoiId: aoi.id },
    sourceAcquiredAt: receivedEvidence.source.acquiredAt, sourceResponseHash: receivedEvidence.source.sourceResponseHash,
    receivedEvidence };
}
export function writeComplete25Acquisition(plan: Quality20FindAcquisition | Quality20CreateAcquisition,
  receipt: ReturnType<typeof buildComplete25FindAcquisition> | ReturnType<typeof buildComplete25CreateAcquisition>) {
  const canonical = canonicalReceivedJson(receipt);
  guard(receipt.kind === plan.kind && receipt.caseId === plan.caseId && receipt.planSha256 === plan.planSha256 &&
    hash(receipt.execution) === hash(plan.execution) && receipt.paidPostCount === 0 && Buffer.byteLength(canonical) <= 2_048_000 &&
    !/\b(?:Bearer\s+[A-Za-z0-9._~-]+|sk-[A-Za-z0-9_-]{12,}|sb_secret_[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/.test(canonical),
  "Receipt identity, bound or credential exclusion failed.");
  guard(isAbsolute(plan.outputPath) && dirname(plan.outputPath) === realpathSync(dirname(plan.outputPath)) &&
    (statSync(dirname(plan.outputPath)).mode & 0o077) === 0, "Receipt directory is not canonical/private.");
  const encoded = JSON.stringify({ ...receipt,
    canonicalReceivedEvidenceHash: createHash("sha256").update(canonicalReceivedJson(receipt.receivedEvidence)).digest("hex") });
  guard(Buffer.byteLength(encoded) <= 2_048_000, "Encoded receipt exceeds the byte bound.");
  const fd = openSync(plan.outputPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { writeFileSync(fd, encoded); fsyncSync(fd); }
  finally { closeSync(fd); }
}

/** Coordinator read-back: rebuild exact binding fields; no trust in supplied hashes alone. */
export function validateComplete25AcquisitionReceipt(plan: Quality20FindAcquisition | Quality20CreateAcquisition, value: unknown) {
  guard(record(value) && value.schemaVersion === "geoai.complete25.nonpaid-acquisition-receipt.v2" && value.kind === plan.kind &&
    record(value.receivedEvidence) && typeof value.receivedAt === "string" && value.paidPostCount === 0, "Invalid receipt envelope.");
  let rebuilt: ReturnType<typeof buildComplete25FindAcquisition> | ReturnType<typeof buildComplete25CreateAcquisition>;
  if (plan.kind === "find") {
    guard(record(value.find) && Array.isArray(value.subjects) && value.subjects.length === 3,
    "Receipt changed the approved viewport/cohort.");
    const captures = value.subjects.map(item => {
      guard(record(item) && typeof item.receivedAt === "string", "Invalid context receipt.");
      return { payload: item.receivedEvidence, receivedAt: item.receivedAt };
    });
    rebuilt = buildComplete25FindAcquisition(complete25ObservedFindPlan(plan, value.find.bounds), value.receivedEvidence, captures, value.receivedAt, 0);
  } else {
    guard(record(value.create), "Missing Create binding.");
    rebuilt = buildComplete25CreateAcquisition(plan, value.receivedEvidence,
      { id: value.create.aoiId, coordinates: [[...plan.coordinates, plan.coordinates[0]]] }, value.receivedAt, 0);
  }
  const expected = { ...rebuilt, canonicalReceivedEvidenceHash: createHash("sha256").update(canonicalReceivedJson(rebuilt.receivedEvidence)).digest("hex") };
  guard(canonicalReceivedJson(value) === canonicalReceivedJson(expected), "Receipt content/bindings differ from rebuilt evidence.");
  return expected;
}
