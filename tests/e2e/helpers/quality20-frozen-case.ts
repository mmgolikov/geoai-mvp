import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute } from "node:path";
// @ts-expect-error The offline Node strip-types runner needs an explicit extension.
import { parseSprint10SpendLedger, hasSprint10UnresolvedCharge, type Sprint10SpendLedger } from "./sprint10-live-budget.ts";

export const QUALITY20_AMENDMENT = "quality20-dubai-a01-a06-singapore-a07-a08-v1";
export const QUALITY20_SCOPES = ["quality20-analyse", "quality20-find", "quality20-create"] as const;
export type Quality20Scope = typeof QUALITY20_SCOPES[number];
export type Quality20Case = {
  id: string; scope: Quality20Scope; marketKey: "dubai" | "singapore";
  goal: string | null; depth: "quick" | "standard" | "deep" | null;
  programme: string | null; aoiSlot: string | null;
};
const coreGoals = ["object_profile", "development_screening", "redevelopment", "due_diligence"];
export const QUALITY20_CASES: readonly Quality20Case[] = Object.freeze([
  ...Array.from({ length: 8 }, (_, i) => ([
    ["Q", "quick"], ["D", "deep"], ["S", "standard"]
  ] as const).map(([suffix, depth]) => ({
    id: `A${String(i + 1).padStart(2, "0")}-${suffix}`, scope: "quality20-analyse" as const,
    marketKey: i < 6 ? "dubai" as const : "singapore" as const,
    goal: coreGoals[Math.floor(i / 2)], depth, programme: null, aoiSlot: null
  }))).flat(),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `A${String(i + 9).padStart(2, "0")}`, scope: "quality20-analyse" as const,
    marketKey: i === 0 ? "dubai" as const : "singapore" as const,
    goal: "custom", depth: "standard" as const, programme: null, aoiSlot: null
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `F${String(i + 1).padStart(2, "0")}`, scope: "quality20-find" as const,
    marketKey: i < 4 ? "dubai" as const : "singapore" as const,
    goal: null, depth: null, programme: null, aoiSlot: null
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `FA${String(i + 1).padStart(2, "0")}`, scope: "quality20-analyse" as const,
    marketKey: i < 12 ? "dubai" as const : "singapore" as const,
    goal: null, depth: "standard" as const, programme: null, aoiSlot: null
  })),
  ...([ ["RM", "residential_mixed_use"], ["CH", "commercial_hub"], ["CG", "civic_green"] ] as const)
    .flatMap(([code, programme]) => [1, 2].map((index) => ({
      id: `C-${code}-0${index}`, scope: "quality20-create" as const,
      marketKey: "dubai" as const, goal: null, depth: "standard" as const,
      programme, aoiSlot: index === 1 ? "rectangle" : "concave"
    })))
].map((item) => Object.freeze(item)));

export type Quality20Subject = {
  sourceIdentity: string; geometryHash: string; sourceResponseHash: string;
  evidencePackHash: string; acquiredAt: string;
};
export type Quality20Binding = {
  query: string; locale: "en"; question: string; role: string; scenario: string; goal: string;
  subject: Quality20Subject | null;
  find: null | {
    caseId: string; bounds: number[]; group: string;
    mappedMinimumLevels: number | null; mappedMaximumLevels: number | null;
    candidateIds: string[]; geometryHashes: string[]; sourceResponseHash: string; acquiredAt: string;
  };
  create: null | { coordinates: number[][]; geometryHash: string; contextHash: string; aoiId: string; prompt: string };
};
export type Quality20Manifest = {
  schemaVersion: "geoai.quality20.frozen-cases.v1"; amendment: typeof QUALITY20_AMENDMENT;
  frozenAt: string; execution: { commit: string; origin: string; deploymentId: string };
  cases: Array<{ id: string; binding: Quality20Binding | null }>;
};
export type Quality20Selection = {
  manifest: Quality20Manifest; manifestSha256: string; definition: Quality20Case; binding: Quality20Binding;
};
const hashPattern = /^[a-f0-9]{64}$/;
function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`QUALITY20_BLOCKED: ${message}`);
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function keys(value: unknown, names: string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).sort().join("|") === [...names].sort().join("|");
}
function text(value: unknown, maximum = 500): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum &&
    !/[\u0000-\u001f]/.test(value) && !/^(UNKNOWN|NOT RUN|TODO)$/i.test(value);
}
function timestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
}
export function quality20Hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function isQuality20Scope(value: unknown): value is Quality20Scope {
  return QUALITY20_SCOPES.includes(value as Quality20Scope);
}
function validateSubject(value: unknown): asserts value is Quality20Subject {
  requireCondition(keys(value, ["sourceIdentity", "geometryHash", "sourceResponseHash", "evidencePackHash", "acquiredAt"]), "Subject fields are not exact.");
  requireCondition(typeof value.sourceIdentity === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(value.sourceIdentity), "An observed exact OSM source identity is required.");
  requireCondition([value.geometryHash, value.sourceResponseHash, value.evidencePackHash].every((v) => typeof v === "string" && hashPattern.test(v)) && timestamp(value.acquiredAt), "Subject source/geometry/evidence hashes and acquisition time are required.");
}
function validateBinding(value: unknown, definition: Quality20Case): asserts value is Quality20Binding {
  requireCondition(keys(value, ["query", "locale", "question", "role", "scenario", "goal", "subject", "find", "create"]), "Binding fields are not exact.");
  requireCondition(text(value.query, 200) && value.locale === "en" && text(value.question, 2000) &&
    text(value.role, 80) && text(value.scenario, 120) && [...coreGoals, "custom"].includes(String(value.goal)), "Freeze the observed query, locale, question, role, scenario and supported goal.");
  if (definition.goal !== null) requireCondition(value.goal === definition.goal, "Goal differs from the preregistered case.");
  if (definition.scope === "quality20-analyse") validateSubject(value.subject);
  else requireCondition(value.subject === null, "Non-analysis cases cannot bind an analysis subject.");
  const requiresFind = definition.scope === "quality20-find" || definition.id.startsWith("FA");
  requireCondition(requiresFind === (value.find !== null), "Find cohort binding is missing or unexpected.");
  if (value.find !== null) {
    const f = value.find;
    requireCondition(keys(f, ["caseId", "bounds", "group", "mappedMinimumLevels", "mappedMaximumLevels", "candidateIds", "geometryHashes", "sourceResponseHash", "acquiredAt"]), "Find fields are not exact.");
    const cohort = definition.id.startsWith("FA") ? `F${String(Math.ceil(Number(definition.id.slice(2)) / 3)).padStart(2, "0")}` : definition.id;
    requireCondition(f.caseId === cohort && Array.isArray(f.bounds) && f.bounds.length === 4 &&
      f.bounds.every((n) => typeof n === "number" && Number.isFinite(n)) && f.bounds[0] < f.bounds[2] && f.bounds[1] < f.bounds[3] &&
      Math.abs(f.bounds[0]) <= 180 && Math.abs(f.bounds[2]) <= 180 && Math.abs(f.bounds[1]) <= 90 && Math.abs(f.bounds[3]) <= 90, "Freeze a valid exact Find cohort/window.");
    requireCondition(text(f.group, 80) && [f.mappedMinimumLevels, f.mappedMaximumLevels].every((n) => n === null || (Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 200)), "Find criteria are invalid.");
    requireCondition(Array.isArray(f.candidateIds) && f.candidateIds.length === 3 && new Set(f.candidateIds).size === 3 &&
      f.candidateIds.every((id) => typeof id === "string" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(id)) &&
      Array.isArray(f.geometryHashes) && f.geometryHashes.length === 3 && f.geometryHashes.every((h) => typeof h === "string" && hashPattern.test(h)) &&
      typeof f.sourceResponseHash === "string" && hashPattern.test(f.sourceResponseHash) && timestamp(f.acquiredAt), "Freeze three distinct observed Find candidates and source hashes/timestamp.");
    if (definition.id.startsWith("FA")) {
      const index = (Number(definition.id.slice(2)) - 1) % 3;
      const subject = value.subject as Quality20Subject;
      requireCondition(subject.sourceIdentity === f.candidateIds[index] && subject.geometryHash === f.geometryHashes[index], "Find-to-Analyse must use its exact selected candidate geometry.");
    }
  }
  requireCondition((definition.scope === "quality20-create") === (value.create !== null), "Create binding missing or unexpected.");
  if (value.create !== null) {
    const c = value.create;
    requireCondition(keys(c, ["coordinates", "geometryHash", "contextHash", "aoiId", "prompt"]), "Create fields are not exact.");
    requireCondition(Array.isArray(c.coordinates) && c.coordinates.length >= 3 && c.coordinates.length <= 24 && c.coordinates.every((point) =>
      Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === "number" && Number.isFinite(n)) &&
      Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90), "Create coordinates must be a bounded observed open vertex list.");
    requireCondition(c.geometryHash === quality20Hash(c.coordinates) && typeof c.contextHash === "string" && hashPattern.test(c.contextHash) &&
      text(c.aoiId, 200) && text(c.prompt, 2000), "Create geometry hash, observed context hash, AOI ID and prompt are required.");
  }
}

export function validateQuality20Manifest(bytes: string, expectedSha256: string, caseId: string, scope: string,
  execution: { commit: string; origin: string; deploymentId?: string }, now = Date.now()): Quality20Selection {
  requireCondition(Buffer.byteLength(bytes) <= 512_000 && hashPattern.test(expectedSha256) &&
    createHash("sha256").update(bytes).digest("hex") === expectedSha256, "Manifest bytes differ from the root-approved SHA-256.");
  let raw: unknown;
  try { raw = JSON.parse(bytes); } catch { throw new Error("QUALITY20_BLOCKED: Invalid manifest JSON."); }
  requireCondition(keys(raw, ["schemaVersion", "amendment", "frozenAt", "execution", "cases"]) &&
    raw.schemaVersion === "geoai.quality20.frozen-cases.v1" && raw.amendment === QUALITY20_AMENDMENT &&
    timestamp(raw.frozenAt) && Date.parse(raw.frozenAt) <= now, "Manifest version/amendment/freeze time is not accepted.");
  requireCondition(keys(raw.execution, ["commit", "origin", "deploymentId"]) &&
    typeof raw.execution.commit === "string" && /^[a-f0-9]{40}$/.test(raw.execution.commit) && raw.execution.commit === execution.commit &&
    raw.execution.origin === execution.origin && typeof raw.execution.deploymentId === "string" && /^dpl_[A-Za-z0-9]+$/.test(raw.execution.deploymentId) &&
    (!execution.deploymentId || raw.execution.deploymentId === execution.deploymentId), "Execution commit/origin/deployment binding differs.");
  requireCondition(Array.isArray(raw.cases) && raw.cases.length === QUALITY20_CASES.length, "The complete 54-case denominator must be preserved (49 paid +5 Find).");
  const seen = new Set<string>();
  for (const item of raw.cases) {
    requireCondition(keys(item, ["id", "binding"]) && typeof item.id === "string" && !seen.has(item.id), "Duplicate or malformed case.");
    seen.add(item.id);
    const definition = QUALITY20_CASES.find((entry) => entry.id === item.id);
    requireCondition(definition, "Unregistered case ID.");
    if (item.binding !== null) validateBinding(item.binding, definition);
  }
  const manifest = raw as unknown as Quality20Manifest;
  const coreIdentities = new Set<string>();
  for (let index = 1; index <= 8; index += 1) {
    const group = manifest.cases.filter((item) => item.id.startsWith(`A${String(index).padStart(2, "0")}-`) && item.binding !== null);
    if (!group.length) continue;
    const first = group[0].binding!;
    requireCondition(group.every((item) => quality20Hash(item.binding) === quality20Hash(first)), "Non-depth inputs/snapshot differ across a core depth triplet.");
    requireCondition(!coreIdentities.has(first.subject!.sourceIdentity), "Core cases must use eight distinct source objects.");
    coreIdentities.add(first.subject!.sourceIdentity);
  }
  for (const item of manifest.cases.filter((entry) => entry.binding?.find)) {
    const cohort = manifest.cases.find((entry) => entry.id === item.binding!.find!.caseId);
    requireCondition(cohort?.binding?.find && quality20Hash(cohort.binding.find) === quality20Hash(item.binding!.find), "Find and candidate analysis cohort bindings differ.");
  }
  for (const slot of ["rectangle", "concave"]) {
    const bound = QUALITY20_CASES.filter((entry) => entry.aoiSlot === slot)
      .map((entry) => manifest.cases.find((item) => item.id === entry.id)?.binding?.create).filter((entry) => entry != null);
    requireCondition(bound.every((entry) => entry.geometryHash === bound[0].geometryHash), "Programmes must share the same frozen AOI within each shape class.");
  }
  const definition = QUALITY20_CASES.find((entry) => entry.id === caseId);
  const binding = manifest.cases.find((entry) => entry.id === caseId)?.binding;
  requireCondition(definition && definition.scope === scope && binding, "Selected case is unbound or not allowed in this scope; NOT RUN.");
  return { manifest, manifestSha256: expectedSha256, definition, binding };
}

export function loadQuality20Selection(env: Record<string, string | undefined>, scope: string,
  execution: { commit: string; origin: string; deploymentId?: string }): Quality20Selection | null {
  const names = ["GEOAI_QUALITY20_MANIFEST_PATH", "GEOAI_QUALITY20_MANIFEST_SHA256", "GEOAI_QUALITY20_CASE_ID"] as const;
  if (!isQuality20Scope(scope)) {
    requireCondition(names.every((name) => env[name] === undefined), "Case settings cannot leak into an old scope.");
    return null;
  }
  requireCondition(names.every((name) => text(env[name], 1000)), "All three frozen-case runtime settings are required.");
  const path = env.GEOAI_QUALITY20_MANIFEST_PATH!;
  requireCondition(isAbsolute(path) && realpathSync(path) === path, "Manifest must be an absolute canonical non-link file.");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    requireCondition(stat.isFile() && stat.nlink === 1 && stat.size <= 512_000 && (stat.mode & 0o077) === 0, "Manifest must be a private bounded regular file.");
    return validateQuality20Manifest(readFileSync(fd, "utf8"), env.GEOAI_QUALITY20_MANIFEST_SHA256!, env.GEOAI_QUALITY20_CASE_ID!, scope, execution);
  } finally { closeSync(fd); }
}
export function quality20RequestKey(selection: Quality20Selection, route: "ai" | "create"): string {
  requireCondition(route === (selection.definition.scope === "quality20-create" ? "create" : "ai") &&
    selection.definition.scope !== "quality20-find", "Paid route differs from the frozen case.");
  return `Q20:${selection.definition.id}:${route.toUpperCase()}:${selection.manifestSha256}`;
}
export function quality20ApprovalSuffix(selection: Quality20Selection | null): string {
  return selection ? `:${selection.definition.id}:${selection.manifestSha256}` : "";
}
export function validateQuality20Ledger(selection: Quality20Selection, input: Sprint10SpendLedger | readonly { identity?: { requestKey?: string }; state?: string }[]) {
  const parsed = Array.isArray(input) ? null : parseSprint10SpendLedger(input);
  requireCondition(Array.isArray(input) || parsed, "Full spend ledger or conservative accounting is invalid.");
  const receipts = parsed ? parsed.receipts : input as readonly { identity?: { requestKey?: string }; state?: string }[];
  const paid = selection.definition.scope !== "quality20-find";
  requireCondition(receipts.length >= 13 && receipts.length + Number(paid) <= 62, "Historic-inclusive 62-receipt execution ceiling reached or historic denominator missing.");
  requireCondition(parsed ? !hasSprint10UnresolvedCharge(parsed, true) : !receipts.some((receipt) => receipt.state === "reserved" || receipt.state === "unknown"), "Unsettled/unknown receipts block the next case.");
  requireCondition(!receipts.some((receipt) => receipt.identity?.requestKey?.startsWith(`Q20:${selection.definition.id}:`)), "Case already attempted; no automatic retry even under a revised manifest.");
}

export function validateQuality20PaidBody(selection: Quality20Selection, route: "ai" | "create", body: unknown) {
  const { definition: d, binding: b } = selection;
  requireCondition(object(body) && body.depth === d.depth && body.locale === b.locale, "Submitted depth/locale differs from the frozen case.");
  if (route === "ai") {
    requireCondition(d.scope === "quality20-analyse" && body.caseKey === d.marketKey && body.expectedSourceFeatureId === b.subject?.sourceIdentity &&
      body.role === b.role && body.scenario === b.scenario && body.goal === b.goal && body.question === b.question && body.consent === true,
    "Submitted analysis identity/goal/scenario/question differs; blocked before reservation.");
  } else {
    requireCondition(d.scope === "quality20-create" && b.create && body.marketKey === d.marketKey && body.templateId === d.programme &&
      body.customPrompt === b.create.prompt && Array.isArray(body.aoiCoordinates) && body.aoiCoordinates.length === 1 &&
      quality20Hash((body.aoiCoordinates[0] as unknown[]).slice(0, -1)) === b.create.geometryHash,
    "Submitted Create programme/prompt/geometry differs; blocked before reservation.");
  }
}

/** No inference of server snapshot identity from a rendered label or successful HTTP status. */
export function validateQuality20Context(selection: Quality20Selection, payload: unknown) {
  const subject = selection.binding.subject;
  requireCondition(subject && object(payload) && payload.mode === "resolved" && payload.schemaVersion === 2 && object(payload.subject) &&
    payload.subject.sourceFeatureId === subject.sourceIdentity && quality20Hash(payload.subject.displayGeometry ?? null) === subject.geometryHash,
  "Selected source identity/full geometry differs from the frozen object.");
  const evidence = payload.evidenceReceipt;
  requireCondition(object(evidence) && evidence.evidencePackHash === subject.evidencePackHash &&
    evidence.sourceResponseHash === subject.sourceResponseHash && evidence.acquiredAt === subject.acquiredAt,
  "A matching pre-paid source/evidence receipt is unavailable; snapshot coverage is BLOCKED, not inferred.");
}

export function validateQuality20AnalysisResult(selection: Quality20Selection, payload: unknown) {
  const { binding: b, definition: d } = selection;
  requireCondition(object(payload) && payload.mode === "openai" && payload.schemaVersion === 6 &&
    payload.evidencePackHash === b.subject?.evidencePackHash &&
    payload.evidencePackId === `p2o_live_evidence_${b.subject?.evidencePackHash.slice(0, 24)}` &&
    object(payload.subject) && payload.subject.sourceFeatureId === b.subject?.sourceIdentity &&
    payload.subject.sourceLabel === "© OpenStreetMap contributors" && object(payload.request) &&
    payload.request.depth === d.depth && payload.request.goal === b.goal && payload.request.role === b.role &&
    payload.request.scenario === b.scenario && payload.request.locale === b.locale && payload.request.question === b.question &&
    object(payload.content) && object(payload.content.depthReview) && payload.content.depthReview.depth === d.depth &&
    payload.content.caveat === "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
  "Analysis result identity, snapshot, depth, provenance or caveat differs from the frozen case.");
}
