import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";

// @ts-expect-error The Node transform-types offline runner requires the explicit TypeScript extension.
import { parseSprint10ProviderTelemetry, type Sprint10RequestIdentity, type Sprint10SpendTelemetry } from "./sprint10-live-budget.ts";

export const SPRINT10_ANALYSIS_EVIDENCE_SCHEMA = "geoai.sprint10.analysis-result-evidence.v1" as const;
export const SPRINT10_ANALYSIS_EVIDENCE_CAPTURE_OPT_IN = "write-one-synthetic-public-analysis-response" as const;
export const SPRINT10_PUBLIC_ANALYSIS_QUESTION =
  "What evidence supports this screening result, and what must be validated before a redevelopment decision?" as const;
export const SPRINT10_ANALYSIS_EVIDENCE_MAX_BYTES = 96 * 1024;

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const SOURCE_FEATURE_PATTERN = /^(?:node|way|relation)\/[1-9]\d{0,19}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const EVIDENCE_REF_PATTERN = /^EVD-[A-Z0-9._:-]{1,120}$/;
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]{1,79}$/;
const EPSG4326_COORDINATE_PAIR_PATTERN = /-?\d{1,3}[.]\d{5,8},\s*-?\d{1,3}[.]\d{5,8}[^"\\]{0,32}EPSG:4326\b/i;
const FORBIDDEN_STRING_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bBearer\s+[A-Za-z0-9._~-]+/i,
  /\bsk-[A-Za-z0-9_-]{12,}/,
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /[?&](?:token|key|secret|password|code)=[^\s&#]+/i
] as const;

const ROLE_VALUES = new Set([
  "unspecified", "tourist", "resident_expat", "home_buyer", "renter", "investor_buyer", "family_relocation",
  "developer", "real_estate_fund", "bank_lender", "insurer", "government_urban_authority",
  "infrastructure_operator", "consultant_broker", "family_office", "asset_manager"
]);
const SCENARIO_VALUES = new Set([
  "unspecified", "b2c_point_context", "b2c_tourist_objects_route", "b2c_residential_context",
  "b2c_new_residential_projects", "b2c_interest_routes", "b2b_redevelopment_selected_aoi",
  "b2b_redevelopment_100ha", "b2b_lowrise_luxury_residential", "b2b_hotel_development",
  "b2b_commercial_real_estate"
]);
const CONTEXT_GROUPS = new Set([
  "hospitality", "commercial", "residential", "retail_daily_needs", "education", "healthcare", "civic_culture",
  "transport", "access", "open_space", "industrial", "construction", "other_built"
]);
const DISTRICT_CODES = new Set([
  "hospitality_tourism", "commercial_business", "residential", "mixed_use_urban", "civic_institutional",
  "industrial_logistics", "open_space_recreation", "low_signal"
]);

type JsonRecord = Record<string, unknown>;

export type Sprint10AnalysisResultEvidence = {
  schemaVersion: typeof SPRINT10_ANALYSIS_EVIDENCE_SCHEMA;
  captureKind: "single_synthetic_public_analysis_response";
  rawSourcePackCaptured: false;
  coordinateReferencedItemsCaptured: false;
  excludedCoordinateReferencedItemCount: number;
  analysisSchemaVersion: 6;
  sourceFeatureId: string;
  evidencePackId: string;
  evidencePackHash: string;
  submitted: {
    role: string;
    scenario: string;
    depth: "quick" | "standard" | "deep";
    goal: string;
    perspective: string;
    horizon: string;
    locale: "en" | "ru";
  };
  content: JsonRecord;
  telemetry: JsonRecord;
};

export type Sprint10AnalysisEvidenceInput = {
  response: unknown;
  submittedRequest: unknown;
  expectedSourceFeatureId: string;
  telemetryIdentity: Sprint10RequestIdentity;
};

function fail(message: string): never {
  throw new Error(`Sprint 10 analysis evidence rejected: ${message}`);
}

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function expectRecord(value: unknown, keys: readonly string[], label: string): JsonRecord {
  if (!record(value) || !exactKeys(value, keys)) fail(`${label} has an unexpected shape.`);
  return value;
}

function safeText(value: unknown, label: string, { nullable = false }: { nullable?: boolean } = {}): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || value.length < 1 || value.length > 4_096 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
    fail(`${label} is not bounded safe text.`);
  }
  if (FORBIDDEN_STRING_PATTERNS.some((pattern) => pattern.test(value))) fail(`${label} contains credential or identity-shaped text.`);
  return value;
}

function enumValue<T extends string>(value: unknown, accepted: readonly T[], label: string): T {
  if (typeof value !== "string" || !accepted.includes(value as T)) fail(`${label} is not accepted.`);
  return value as T;
}

function boundedInteger(value: unknown, label: string, maximum = 1_000_000): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > maximum) fail(`${label} is not a bounded integer.`);
  return value;
}

function nullableNumber(value: unknown, label: string, maximum: number): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum) fail(`${label} is not bounded.`);
  return value;
}

function evidenceRefs(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) fail(`${label} must contain bounded evidence references.`);
  const refs = value.map((item) => {
    if (typeof item !== "string" || !EVIDENCE_REF_PATTERN.test(item)) fail(`${label} contains an invalid evidence reference.`);
    return item;
  });
  if (new Set(refs).size !== refs.length) fail(`${label} contains duplicate evidence references.`);
  return refs;
}

function stringList(value: unknown, label: string, minimum = 0, maximum = 16): string[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) fail(`${label} is not a bounded list.`);
  return value.map((item, index) => safeText(item, `${label}[${index}]`) as string);
}

function objectList<T>(value: unknown, label: string, minimum: number, maximum: number, parse: (item: unknown, label: string) => T): T[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) fail(`${label} is not a bounded list.`);
  return value.map((item, index) => parse(item, `${label}[${index}]`));
}

function parseClaim(value: unknown, label: string) {
  const item = expectRecord(value, ["statement", "evidenceRefs"], label);
  return { statement: safeText(item.statement, `${label}.statement`) as string, evidenceRefs: evidenceRefs(item.evidenceRefs, `${label}.evidenceRefs`) };
}

function parseSignal(value: unknown, label: string) {
  const item = expectRecord(value, ["title", "observation", "implication", "evidenceClass", "evidenceRefs", "confidence"], label);
  return {
    title: safeText(item.title, `${label}.title`) as string,
    observation: safeText(item.observation, `${label}.observation`) as string,
    implication: safeText(item.implication, `${label}.implication`) as string,
    evidenceClass: enumValue(item.evidenceClass, ["observed", "derived", "hypothesis"] as const, `${label}.evidenceClass`),
    evidenceRefs: evidenceRefs(item.evidenceRefs, `${label}.evidenceRefs`),
    confidence: enumValue(item.confidence, ["low", "medium"] as const, `${label}.confidence`)
  };
}

function parseOpportunity(value: unknown, label: string) {
  const item = expectRecord(value, ["title", "hypothesis", "rationale", "potentialValue", "evidenceRefs", "evidenceNeeded", "confidence"], label);
  return {
    title: safeText(item.title, `${label}.title`) as string,
    hypothesis: safeText(item.hypothesis, `${label}.hypothesis`) as string,
    rationale: safeText(item.rationale, `${label}.rationale`) as string,
    potentialValue: safeText(item.potentialValue, `${label}.potentialValue`) as string,
    evidenceRefs: evidenceRefs(item.evidenceRefs, `${label}.evidenceRefs`),
    evidenceNeeded: stringList(item.evidenceNeeded, `${label}.evidenceNeeded`, 1),
    confidence: enumValue(item.confidence, ["low", "medium"] as const, `${label}.confidence`)
  };
}

function parseRisk(value: unknown, label: string) {
  const item = expectRecord(value, ["title", "statement", "decisionImpact", "severity", "evidenceRefs", "confidence"], label);
  return {
    title: safeText(item.title, `${label}.title`) as string,
    statement: safeText(item.statement, `${label}.statement`) as string,
    decisionImpact: safeText(item.decisionImpact, `${label}.decisionImpact`) as string,
    severity: enumValue(item.severity, ["low", "medium", "high"] as const, `${label}.severity`),
    evidenceRefs: evidenceRefs(item.evidenceRefs, `${label}.evidenceRefs`),
    confidence: enumValue(item.confidence, ["low", "medium"] as const, `${label}.confidence`)
  };
}

function parseValidation(value: unknown, label: string) {
  const item = expectRecord(value, ["title", "action", "source", "decisionImpact", "priority", "evidenceRefs"], label);
  return {
    title: safeText(item.title, `${label}.title`) as string,
    action: safeText(item.action, `${label}.action`) as string,
    source: safeText(item.source, `${label}.source`) as string,
    decisionImpact: safeText(item.decisionImpact, `${label}.decisionImpact`) as string,
    priority: enumValue(item.priority, ["critical", "high", "medium"] as const, `${label}.priority`),
    evidenceRefs: evidenceRefs(item.evidenceRefs, `${label}.evidenceRefs`)
  };
}

function parseDepthCheck(value: unknown, label: string) {
  return parseSignal(value, label);
}

function parseAlternative(value: unknown, label: string) {
  const item = expectRecord(value, ["title", "rationale", "evidenceClass", "evidenceRefs"], label);
  return {
    title: safeText(item.title, `${label}.title`) as string,
    rationale: safeText(item.rationale, `${label}.rationale`) as string,
    evidenceClass: enumValue(item.evidenceClass, ["hypothesis"] as const, `${label}.evidenceClass`),
    evidenceRefs: evidenceRefs(item.evidenceRefs, `${label}.evidenceRefs`)
  };
}

function parseUncertainty(value: unknown, label: string) {
  const item = expectRecord(value, ["title", "statement", "decisionImpact", "evidenceRefs"], label);
  return {
    title: safeText(item.title, `${label}.title`) as string,
    statement: safeText(item.statement, `${label}.statement`) as string,
    decisionImpact: safeText(item.decisionImpact, `${label}.decisionImpact`) as string,
    evidenceRefs: evidenceRefs(item.evidenceRefs, `${label}.evidenceRefs`)
  };
}

function parseTrigger(value: unknown, label: string) {
  const item = expectRecord(value, ["title", "action", "decisionImpact", "evidenceRefs"], label);
  return {
    title: safeText(item.title, `${label}.title`) as string,
    action: safeText(item.action, `${label}.action`) as string,
    decisionImpact: safeText(item.decisionImpact, `${label}.decisionImpact`) as string,
    evidenceRefs: evidenceRefs(item.evidenceRefs, `${label}.evidenceRefs`)
  };
}

function parseGeoContext(value: unknown) {
  const item = expectRecord(value, ["radiusM", "coverage", "sampleSize", "capReached", "groups", "mappedBuildingCount",
    "mappedLevelsKnownCount", "medianMappedLevels", "nearestTransitM", "nearestMajorRoadM", "districtCharacter"], "content.geoContext");
  const groups = objectList(item.groups, "content.geoContext.groups", 0, 13, (value, label) => {
    const group = expectRecord(value, ["group", "count", "sharePct", "nearestDistanceM"], label);
    if (typeof group.group !== "string" || !CONTEXT_GROUPS.has(group.group)) fail(`${label}.group is not accepted.`);
    return {
      group: group.group,
      count: boundedInteger(group.count, `${label}.count`, 500),
      sharePct: (() => {
        const share = nullableNumber(group.sharePct, `${label}.sharePct`, 100);
        return share === null ? fail(`${label}.sharePct cannot be null.`) : share;
      })(),
      nearestDistanceM: nullableNumber(group.nearestDistanceM, `${label}.nearestDistanceM`, 100_000)
    };
  });
  const district = expectRecord(item.districtCharacter, ["code", "confidence", "ruleVersion", "driverGroups"], "content.geoContext.districtCharacter");
  if (typeof district.code !== "string" || !DISTRICT_CODES.has(district.code)) fail("content.geoContext.districtCharacter.code is not accepted.");
  const driverGroups = stringList(district.driverGroups, "content.geoContext.districtCharacter.driverGroups", 0, 13);
  if (driverGroups.some((group) => !CONTEXT_GROUPS.has(group))) fail("content.geoContext.districtCharacter.driverGroups is not accepted.");
  return {
    radiusM: boundedInteger(item.radiusM, "content.geoContext.radiusM", 10_000),
    coverage: enumValue(item.coverage, ["available", "unavailable"] as const, "content.geoContext.coverage"),
    sampleSize: boundedInteger(item.sampleSize, "content.geoContext.sampleSize", 500),
    capReached: item.capReached === true ? true : item.capReached === false ? false : fail("content.geoContext.capReached is invalid."),
    groups,
    mappedBuildingCount: boundedInteger(item.mappedBuildingCount, "content.geoContext.mappedBuildingCount", 500),
    mappedLevelsKnownCount: boundedInteger(item.mappedLevelsKnownCount, "content.geoContext.mappedLevelsKnownCount", 500),
    medianMappedLevels: nullableNumber(item.medianMappedLevels, "content.geoContext.medianMappedLevels", 500),
    nearestTransitM: nullableNumber(item.nearestTransitM, "content.geoContext.nearestTransitM", 100_000),
    nearestMajorRoadM: nullableNumber(item.nearestMajorRoadM, "content.geoContext.nearestMajorRoadM", 100_000),
    districtCharacter: {
      code: district.code,
      confidence: enumValue(district.confidence, ["low", "medium"] as const, "content.geoContext.districtCharacter.confidence"),
      ruleVersion: enumValue(district.ruleVersion, ["POINT_OBJECT_DISTRICT_RULE_V1"] as const, "content.geoContext.districtCharacter.ruleVersion"),
      driverGroups
    }
  };
}

function parseContent(value: unknown, depth: "quick" | "standard" | "deep"): JsonRecord {
  const item = expectRecord(value, ["initialSemanticBrief", "depthReview", "decisionBrief", "signals", "opportunities", "risks",
    "sourceFacts", "locationContext", "nextValidation", "answerToQuestion", "geoContext", "caveat"], "content");
  const semantic = expectRecord(item.initialSemanticBrief, ["codes", "subject", "context", "access", "implication", "confidence"], "content.initialSemanticBrief");
  const codes = expectRecord(semantic.codes, ["subject", "context", "access", "implication"], "content.initialSemanticBrief.codes");
  for (const [name, value] of Object.entries(codes)) {
    if (typeof value !== "string" || !SAFE_CODE_PATTERN.test(value)) fail(`content.initialSemanticBrief.codes.${name} is invalid.`);
  }
  const decision = expectRecord(item.decisionBrief, ["headline", "disposition", "summary", "reasons", "confidence"], "content.decisionBrief");
  const targets = depth === "quick"
    ? { reasons: 2, signals: 3, opportunities: 1, risks: 2, checks: 2, alternatives: 0, uncertainties: 1, triggers: 1, purpose: "identity_evidence" }
    : depth === "standard"
      ? { reasons: 3, signals: 4, opportunities: 2, risks: 3, checks: 3, alternatives: 1, uncertainties: 2, triggers: 2, purpose: "decision_criteria" }
      : { reasons: 4, signals: 5, opportunities: 3, risks: 3, checks: 4, alternatives: 2, uncertainties: 3, triggers: 3, purpose: "decision_challenge" };
  const review = expectRecord(item.depthReview, ["depth", "basis", "purpose", "analyticChecks", "alternatives", "uncertainties", "decisionTriggers"], "content.depthReview");
  if (item.caveat !== CAVEAT) fail("content.caveat is not the mandatory caveat.");
  return {
    initialSemanticBrief: {
      codes: { subject: codes.subject, context: codes.context, access: codes.access, implication: codes.implication },
      subject: parseClaim(semantic.subject, "content.initialSemanticBrief.subject"),
      context: parseClaim(semantic.context, "content.initialSemanticBrief.context"),
      access: parseClaim(semantic.access, "content.initialSemanticBrief.access"),
      implication: parseClaim(semantic.implication, "content.initialSemanticBrief.implication"),
      confidence: enumValue(semantic.confidence, ["low", "medium"] as const, "content.initialSemanticBrief.confidence")
    },
    depthReview: {
      depth: enumValue(review.depth, [depth] as const, "content.depthReview.depth"),
      basis: enumValue(review.basis, ["structured_review_of_existing_evidence"] as const, "content.depthReview.basis"),
      purpose: enumValue(review.purpose, [targets.purpose] as const, "content.depthReview.purpose"),
      analyticChecks: objectList(review.analyticChecks, "content.depthReview.analyticChecks", 1, targets.checks, parseDepthCheck),
      alternatives: objectList(review.alternatives, "content.depthReview.alternatives", 0, targets.alternatives, parseAlternative),
      uncertainties: objectList(review.uncertainties, "content.depthReview.uncertainties", 0, targets.uncertainties, parseUncertainty),
      decisionTriggers: objectList(review.decisionTriggers, "content.depthReview.decisionTriggers", 1, targets.triggers, parseTrigger)
    },
    decisionBrief: {
      headline: safeText(decision.headline, "content.decisionBrief.headline") as string,
      disposition: enumValue(decision.disposition, ["continue_screening", "hold", "insufficient_evidence"] as const, "content.decisionBrief.disposition"),
      summary: safeText(decision.summary, "content.decisionBrief.summary") as string,
      reasons: objectList(decision.reasons, "content.decisionBrief.reasons", 2, targets.reasons, parseClaim),
      confidence: enumValue(decision.confidence, ["low", "medium"] as const, "content.decisionBrief.confidence")
    },
    signals: objectList(item.signals, "content.signals", 3, targets.signals, parseSignal),
    opportunities: objectList(item.opportunities, "content.opportunities", 1, targets.opportunities, parseOpportunity),
    risks: objectList(item.risks, "content.risks", 2, targets.risks, parseRisk),
    sourceFacts: objectList(item.sourceFacts, "content.sourceFacts", 1, 16, parseClaim),
    locationContext: objectList(item.locationContext, "content.locationContext", 0, 16, parseClaim),
    nextValidation: objectList(item.nextValidation, "content.nextValidation", 1, 16, parseValidation),
    answerToQuestion: (() => {
      const answer = expectRecord(item.answerToQuestion, ["statement", "evidenceRefs", "status", "scope", "confidence", "perspective", "horizon", "missingEvidence"], "content.answerToQuestion");
      return {
        statement: safeText(answer.statement, "content.answerToQuestion.statement") as string,
        evidenceRefs: evidenceRefs(answer.evidenceRefs, "content.answerToQuestion.evidenceRefs"),
        status: enumValue(answer.status, ["answered", "partial", "unsupported"] as const, "content.answerToQuestion.status"),
        scope: typeof answer.scope === "string" && SAFE_CODE_PATTERN.test(answer.scope) ? answer.scope : fail("content.answerToQuestion.scope is invalid."),
        confidence: enumValue(answer.confidence, ["low", "medium"] as const, "content.answerToQuestion.confidence"),
        perspective: enumValue(answer.perspective, ["developer", "investor", "asset_owner"] as const, "content.answerToQuestion.perspective"),
        horizon: enumValue(answer.horizon, ["current", "one_to_three_years", "long_term"] as const, "content.answerToQuestion.horizon"),
        missingEvidence: stringList(answer.missingEvidence, "content.answerToQuestion.missingEvidence", 0, 16)
      };
    })(),
    geoContext: parseGeoContext(item.geoContext),
    caveat: CAVEAT
  };
}

function redactCoordinateReferencedItems(content: JsonRecord): {
  content: JsonRecord;
  excludedCoordinateReferencedItemCount: number;
} {
  const omitted = Symbol("coordinate-referenced-item");
  let excludedCoordinateReferencedItemCount = 0;
  const visit = (value: unknown): unknown | typeof omitted => {
    if (Array.isArray(value)) {
      return value.map(visit).filter((item) => item !== omitted);
    }
    if (!record(value)) return value;
    if (Array.isArray(value.evidenceRefs) && value.evidenceRefs.includes("EVD-COORDINATES")) {
      excludedCoordinateReferencedItemCount += 1;
      return omitted;
    }
    const retained: JsonRecord = {};
    for (const [key, child] of Object.entries(value)) {
      const visited = visit(child);
      if (visited !== omitted) retained[key] = visited;
    }
    return retained;
  };
  const redacted = visit(content);
  if (!record(redacted)) fail("validated content could not be safely filtered.");
  const serialized = JSON.stringify(redacted);
  if (serialized.includes("EVD-COORDINATES") || EPSG4326_COORDINATE_PAIR_PATTERN.test(serialized)) {
    fail("coordinate-referenced content remained after filtering.");
  }
  return { content: redacted, excludedCoordinateReferencedItemCount };
}

function parseSubmitted(value: unknown, responseRequest: JsonRecord) {
  if (!record(value)) fail("submitted request is missing.");
  const role = value.role;
  const scenario = value.scenario;
  if (typeof role !== "string" || !ROLE_VALUES.has(role) || typeof scenario !== "string" || !SCENARIO_VALUES.has(scenario)) {
    fail("submitted role/scenario is invalid.");
  }
  const depth = enumValue(value.depth, ["quick", "standard", "deep"] as const, "submitted.depth");
  const goal = enumValue(value.goal, ["object_profile", "development_screening", "redevelopment", "due_diligence", "custom"] as const, "submitted.goal");
  const perspective = enumValue(value.perspective, ["developer", "investor", "asset_owner"] as const, "submitted.perspective");
  const horizon = enumValue(value.horizon, ["current", "one_to_three_years", "long_term"] as const, "submitted.horizon");
  const locale = enumValue(value.locale, ["en", "ru"] as const, "submitted.locale");
  if (value.question !== SPRINT10_PUBLIC_ANALYSIS_QUESTION || value.expectedSourceFeatureId === undefined) {
    fail("capture is restricted to the fixed synthetic public analysis question and exact source identity.");
  }
  const selected = { role, scenario, depth, goal, perspective, horizon, locale };
  for (const [key, submitted] of Object.entries(selected)) {
    if (responseRequest[key] !== submitted) fail(`response request ${key} does not match the submitted request.`);
  }
  if (responseRequest.question !== SPRINT10_PUBLIC_ANALYSIS_QUESTION || responseRequest.focused !== true) {
    fail("response request does not preserve the fixed focused public benchmark.");
  }
  return selected;
}

function safeTelemetry(value: Sprint10SpendTelemetry): JsonRecord {
  return {
    provider: value.provider,
    route: value.route,
    depth: value.depth,
    promptVersion: value.promptVersion,
    schemaVersion: value.schemaVersion,
    model: value.model,
    reasoningEffort: value.reasoningEffort,
    latencyMs: value.latencyMs,
    attempts: value.attempts,
    attemptTrace: value.attemptTrace.map(({ attempt, purpose, model, reasoningEffort, inputTokens, cachedInputTokens,
      cacheWriteTokens, outputTokens, totalTokens, estimatedCostUsd }) => ({
      attempt, purpose, model, reasoningEffort, inputTokens, cachedInputTokens, cacheWriteTokens,
      outputTokens, totalTokens, estimatedCostUsd
    })),
    inputTokens: value.inputTokens,
    cachedInputTokens: value.cachedInputTokens,
    cacheWriteTokens: value.cacheWriteTokens,
    outputTokens: value.outputTokens,
    totalTokens: value.totalTokens,
    estimatedCostUsd: value.estimatedCostUsd,
    costRateSource: value.costRateSource,
    stored: value.stored,
    toolCalls: value.toolCalls
  };
}

export function buildSprint10AnalysisResultEvidence(input: Sprint10AnalysisEvidenceInput): Sprint10AnalysisResultEvidence {
  const response = expectRecord(input.response, ["mode", "schemaVersion", "generatedAt", "evidencePackId", "evidencePackHash", "request", "content", "telemetry", "subject"], "response");
  if (response.mode !== "openai" || response.schemaVersion !== 6) fail("response is not the accepted current Analyse result.");
  if (typeof input.expectedSourceFeatureId !== "string" || !SOURCE_FEATURE_PATTERN.test(input.expectedSourceFeatureId)) fail("expected source identity is invalid.");
  const subject = record(response.subject) ? response.subject : fail("response subject is missing.");
  const responseRequest = expectRecord(response.request,
    ["role", "scenario", "depth", "goal", "perspective", "horizon", "question", "locale", "focused"], "response.request");
  const submitted = parseSubmitted(input.submittedRequest, responseRequest);
  if ((record(input.submittedRequest) && input.submittedRequest.expectedSourceFeatureId !== input.expectedSourceFeatureId) ||
      subject.sourceFeatureId !== input.expectedSourceFeatureId) fail("source identity changed before evidence capture.");
  if (typeof response.evidencePackHash !== "string" || !HASH_PATTERN.test(response.evidencePackHash) ||
      response.evidencePackId !== `p2o_live_evidence_${response.evidencePackHash.slice(0, 24)}`) {
    fail("evidence pack identity is invalid.");
  }
  if (input.telemetryIdentity.route !== "ai" || input.telemetryIdentity.schemaVersion !== 6 ||
      input.telemetryIdentity.depth !== submitted.depth) fail("telemetry identity does not match the submitted analysis.");
  const telemetry = parseSprint10ProviderTelemetry(input.telemetryIdentity, response);
  if (!telemetry) fail("provider telemetry is not accepted by the canonical Sprint 10 parser.");
  const parsedContent = redactCoordinateReferencedItems(parseContent(response.content, submitted.depth));
  const evidence: Sprint10AnalysisResultEvidence = {
    schemaVersion: SPRINT10_ANALYSIS_EVIDENCE_SCHEMA,
    captureKind: "single_synthetic_public_analysis_response",
    rawSourcePackCaptured: false,
    coordinateReferencedItemsCaptured: false,
    excludedCoordinateReferencedItemCount: parsedContent.excludedCoordinateReferencedItemCount,
    analysisSchemaVersion: 6,
    sourceFeatureId: input.expectedSourceFeatureId,
    evidencePackId: response.evidencePackId as string,
    evidencePackHash: response.evidencePackHash,
    submitted,
    content: parsedContent.content,
    telemetry: safeTelemetry(telemetry)
  };
  const bytes = Buffer.byteLength(`${JSON.stringify(evidence)}\n`, "utf8");
  if (bytes > SPRINT10_ANALYSIS_EVIDENCE_MAX_BYTES) fail("whitelisted evidence exceeds the bounded file size.");
  return evidence;
}

function pathEntry(path: string): ReturnType<typeof lstatSync> | null {
  try { return lstatSync(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    fail("output path could not be inspected safely.");
  }
}

export function validateSprint10AnalysisEvidencePath(pathValue: unknown): string {
  if (typeof pathValue !== "string" || !isAbsolute(pathValue) || resolve(pathValue) !== pathValue ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}[.]json$/.test(basename(pathValue))) {
    fail("output path must be one exact absolute file path.");
  }
  const parent = dirname(pathValue);
  const parentDetails = lstatSync(parent);
  if (!parentDetails.isDirectory() || parentDetails.isSymbolicLink() || realpathSync(parent) !== parent ||
      (statSync(parent).mode & 0o777) !== 0o700) fail("output parent must be one existing private 0700 real directory.");
  if (pathEntry(pathValue) !== null) fail("output file already exists and will not be overwritten.");
  return pathValue;
}

export function writeSprint10AnalysisResultEvidence(pathValue: unknown, input: Sprint10AnalysisEvidenceInput): Sprint10AnalysisResultEvidence {
  const path = validateSprint10AnalysisEvidencePath(pathValue);
  const evidence = buildSprint10AnalysisResultEvidence(input);
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > SPRINT10_ANALYSIS_EVIDENCE_MAX_BYTES) fail("formatted evidence exceeds the bounded file size.");
  const temporaryPath = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, serialized, "utf8");
    fsyncSync(descriptor);
    const temporary = fstatSync(descriptor);
    if (!temporary.isFile() || temporary.nlink !== 1 || (temporary.mode & 0o777) !== 0o600) fail("temporary evidence file is unsafe.");
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(temporaryPath, path);
    unlinkSync(temporaryPath);
    const written = lstatSync(path);
    if (!written.isFile() || written.isSymbolicLink() || written.nlink !== 1 || (written.mode & 0o777) !== 0o600 || realpathSync(path) !== path) {
      fail("written evidence file is not one private regular file.");
    }
    const directory = openSync(dirname(path), constants.O_RDONLY);
    try { fsyncSync(directory); } finally { closeSync(directory); }
    const reread: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (JSON.stringify(reread) !== JSON.stringify(evidence)) fail("written evidence did not round-trip exactly.");
    return evidence;
  } catch (error) {
    if (typeof descriptor === "number") closeSync(descriptor);
    const temporary = pathEntry(temporaryPath);
    if (temporary?.isFile() && !temporary.isSymbolicLink()) unlinkSync(temporaryPath);
    throw error;
  }
}
