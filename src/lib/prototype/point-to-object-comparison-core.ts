import type { LivePointObjectEvidencePack } from "./point-to-object-live-evidence";
import { CONTEXT_GROUPS, normalizePointObjectContext, type PointObjectNormalizedContext } from "./point-to-object-normalized-context";
import type { PointObjectAnalysisRequest } from "./point-to-object-ai-core";
import { LIVE_POINT_CAVEAT } from "../point-to-object/contracts";

export type PointObjectComparisonCandidate = { id: string; label: string | null; evidencePackHash: string; featureClass: string; footprintAreaSqM: number | null; context: PointObjectNormalizedContext };
export type PointObjectComparisonInput = { version: "POINT_OBJECT_COMPARISON_INPUT_V1"; locale: "en" | "ru"; role: string; scenario: string; candidates: PointObjectComparisonCandidate[]; allowedEvidenceRefs: string[] };
export type ComparisonClaim = { statement: string; evidenceRefs: string[] };
export type PointObjectComparisonRejectionCode =
  | "COMPARISON_COMPLETION_INVALID" | "COMPARISON_OUTPUT_INCOMPLETE" | "COMPARISON_OUTPUT_TOKEN_LIMIT" | "COMPARISON_OUTPUT_REFUSED"
  | "COMPARISON_OUTPUT_UNREADABLE" | "COMPARISON_OUTPUT_SHAPE_INVALID" | "COMPARISON_OUTPUT_REFERENCE_INVALID" | "COMPARISON_OUTPUT_UNKNOWN_REF"
  | "COMPARISON_OUTPUT_FORBIDDEN_CLAIM" | "COMPARISON_OUTPUT_SOURCE_BINDING" | "COMPARISON_RESPONSE_ENVELOPE_INVALID" | "COMPARISON_RESPONSE_REJECTED";
type ComparisonParseResult<T> = { content: T; rejectionCode: null } | { content: null; rejectionCode: PointObjectComparisonRejectionCode };
/** Classify the already-observed completion state; never infer token use or
 * reproduce provider prose. Only the explicit max_output_tokens reason proves a token limit. */
export function comparisonCompletionRejectionCode(state: "complete" | "incomplete" | "refusal" | "invalid", payload: unknown): PointObjectComparisonRejectionCode | null {
  if (state === "complete") return null;
  if (state === "refusal") return "COMPARISON_OUTPUT_REFUSED";
  if (state !== "incomplete") return "COMPARISON_COMPLETION_INVALID";
  const details = payload && typeof payload === "object" && "incomplete_details" in payload ? payload.incomplete_details : null;
  return details && typeof details === "object" && "reason" in details && details.reason === "max_output_tokens" ? "COMPARISON_OUTPUT_TOKEN_LIMIT" : "COMPARISON_OUTPUT_INCOMPLETE";
}
export type PointObjectComparisonInsight = {
  mode: "openai_comparison"; version: "POINT_OBJECT_COMPARISON_V1"; generatedAt: string; locale: "en" | "ru"; role: string; scenario: string;
  snapshots: Array<{ sourceFeatureId: string; evidencePackHash: string; label: string | null }>;
  summary: ComparisonClaim; differences: ComparisonClaim[];
  checks: Array<{ candidateId: string; action: string; evidenceRefs: string[] }>;
  caveat: typeof LIVE_POINT_CAVEAT;
  telemetry: { provider: "openai"; model: string; requestId: string | null; latencyMs: number; attempts: 1; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; stored: false; toolCalls: 0 };
};

export function buildPointObjectComparisonInput(packs: LivePointObjectEvidencePack[], request: PointObjectAnalysisRequest): PointObjectComparisonInput {
  if (packs.length < 2 || packs.length > 3 || new Set(packs.map(p => p.selectedObject.sourceFeatureId)).size !== packs.length || packs.some(p => p.resolution.coordinateAssociation !== "trusted_open_map_identity" || p.geoContext.coverage !== "available" || p.geoContext.sampleSize < 1 || p.geoContext.capReached)) throw new Error("COMPARISON_EVIDENCE_INSUFFICIENT");
  const times = packs.map(p => Date.parse(p.source.fabricAcquiredAt ?? ""));
  if (times.some(t => !Number.isFinite(t)) || Math.max(...times) - Math.min(...times) > 15 * 60_000) throw new Error("COMPARISON_SNAPSHOTS_NOT_ALIGNED");
  const candidates = packs.map(p => ({ id: p.selectedObject.sourceFeatureId, label: p.selectedObject.name, featureClass: p.selectedObject.featureClass,
    evidencePackHash: p.evidencePackHash, footprintAreaSqM: p.displayGeometry ? p.selectedObject.metrics?.footprintAreaSqM ?? null : null,
    context: normalizePointObjectContext(p) }));
  return { version: "POINT_OBJECT_COMPARISON_INPUT_V1", locale: request.locale, role: request.role ?? "unspecified", scenario: request.scenario ?? "unspecified", candidates,
    allowedEvidenceRefs: candidates.flatMap(c => [`${c.id}:identity`, ...c.context.metrics.filter(m => m.value !== null).map(m => `${c.id}:${m.id}`)]) };
}

export const POINT_OBJECT_COMPARISON_SCHEMA = { type: "object", additionalProperties: false, required: ["summary", "differences", "checks"], properties: {
  summary: { $ref: "#/$defs/claim" }, differences: { type: "array", minItems: 2, maxItems: 6, items: { $ref: "#/$defs/claim" } },
  checks: { type: "array", minItems: 2, maxItems: 6, items: { type: "object", additionalProperties: false, required: ["candidateId", "action", "evidenceRefs"], properties: { candidateId: { type: "string" }, action: { type: "string" }, evidenceRefs: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } } } } }
}, $defs: { claim: { type: "object", additionalProperties: false, required: ["statement", "evidenceRefs"], properties: { statement: { type: "string" }, evidenceRefs: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } } } } } };

export function parsePointObjectComparisonContentDetailed(value: unknown, input: PointObjectComparisonInput): ComparisonParseResult<Pick<PointObjectComparisonInsight, "summary" | "differences" | "checks">> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { content: null, rejectionCode: "COMPARISON_OUTPUT_SHAPE_INVALID" };
  const content = value as Pick<PointObjectComparisonInsight, "summary" | "differences" | "checks">;
  const refs = (r: unknown) => Array.isArray(r) && r.length >= 1 && r.length <= 8 && r.every(ref => typeof ref === "string" && input.allowedEvidenceRefs.includes(ref)) && new Set(r).size === r.length;
  const text = (t: unknown) => {
    if (typeof t !== "string" || t.trim().length < 8 || t.length > 1_500) return false;
    // Source labels such as "25h Heimat" may contain digits; this is not a
    // quantitative model claim. No other numerals or candidate ordinals pass.
    const prose = input.candidates.reduce((remaining, candidate) => {
      if (!candidate.label) return remaining;
      const quoted = remaining.replaceAll(`"${candidate.label}"`, "source label").replaceAll(`«${candidate.label}»`, "source label").replaceAll(`“${candidate.label}”`, "source label");
      if (!/\p{L}/u.test(candidate.label)) return quoted;
      const escaped = candidate.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return quoted.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu"), "source label");
    }, t);
    return !/\d/.test(prose) && !/(?:guaranteed|title clear|zoning allows|best (?:site|candidate)|winner|school capacity is sufficient|вместимость достаточна|гарантирован|права подтверждены|лучший объект)/i.test(prose);
  };
  const claim = (c: ComparisonClaim) => c && Object.keys(c).sort().join(",") === "evidenceRefs,statement" && text(c.statement) && refs(c.evidenceRefs);
  const compared = (c: ComparisonClaim) => input.candidates.filter(candidate => c.evidenceRefs.some(ref => ref.startsWith(`${candidate.id}:`))).length >= 2;
  if (Object.keys(content).sort().join(",") !== "checks,differences,summary" || !claim(content.summary) || !compared(content.summary) || !Array.isArray(content.differences) || content.differences.length < 2 || content.differences.length > 6 || !content.differences.every(c => claim(c) && compared(c)) ||
    !Array.isArray(content.checks) || content.checks.length < 2 || content.checks.length > 6 || !content.checks.every(c => c && Object.keys(c).sort().join(",") === "action,candidateId,evidenceRefs" && input.candidates.some(candidate => candidate.id === c.candidateId) && text(c.action) && refs(c.evidenceRefs) && c.evidenceRefs.every(ref=>ref.startsWith(`${c.candidateId}:`))) || !input.candidates.every(candidate => content.checks.some(c => c.candidateId === candidate.id))) {
    // Diagnostic-only classification after the unchanged acceptance predicate
    // has rejected the content. No recovery, repair, prose echo or weaker parser.
    const fail = (rejectionCode: PointObjectComparisonRejectionCode): ComparisonParseResult<never> => ({ content: null, rejectionCode });
    const boundedText = (t: unknown) => typeof t === "string" && t.trim().length >= 8 && t.length <= 1_500;
    if (Object.keys(content).sort().join(",") !== "checks,differences,summary" || !Array.isArray(content.differences) || content.differences.length < 2 || content.differences.length > 6 || !Array.isArray(content.checks) || content.checks.length < 2 || content.checks.length > 6) return fail("COMPARISON_OUTPUT_SHAPE_INVALID");
    const claims = [content.summary, ...content.differences];
    if (!claims.every(c => c && Object.keys(c).sort().join(",") === "evidenceRefs,statement" && boundedText(c.statement)) || !content.checks.every(c => c && Object.keys(c).sort().join(",") === "action,candidateId,evidenceRefs" && typeof c.candidateId === "string" && boundedText(c.action))) return fail("COMPARISON_OUTPUT_SHAPE_INVALID");
    const referenceLists = [...claims.map(c => c.evidenceRefs), ...content.checks.map(c => c.evidenceRefs)];
    if (!referenceLists.every(r => Array.isArray(r) && r.length >= 1 && r.length <= 8 && r.every(ref => typeof ref === "string") && new Set(r).size === r.length)) return fail("COMPARISON_OUTPUT_REFERENCE_INVALID");
    if (referenceLists.some(r => r.some(ref => !input.allowedEvidenceRefs.includes(ref)))) return fail("COMPARISON_OUTPUT_UNKNOWN_REF");
    if (claims.some(c => !text(c.statement)) || content.checks.some(c => !text(c.action))) return fail("COMPARISON_OUTPUT_FORBIDDEN_CLAIM");
    if (claims.some(c => !compared(c)) || content.checks.some(c => !input.candidates.some(candidate => candidate.id === c.candidateId) || c.evidenceRefs.some(ref => !ref.startsWith(`${c.candidateId}:`))) || !input.candidates.every(candidate => content.checks.some(c => c.candidateId === candidate.id))) return fail("COMPARISON_OUTPUT_SOURCE_BINDING");
    return fail("COMPARISON_RESPONSE_REJECTED");
  }
  return { content, rejectionCode: null };
}

export function parsePointObjectComparisonContent(value: unknown, input: PointObjectComparisonInput): Pick<PointObjectComparisonInsight, "summary" | "differences" | "checks"> | null {
  return parsePointObjectComparisonContentDetailed(value, input).content;
}

export function parsePointObjectComparisonInsightDetailed(value: unknown): ComparisonParseResult<PointObjectComparisonInsight> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { content: null, rejectionCode: "COMPARISON_RESPONSE_ENVELOPE_INVALID" };
  const result = value as PointObjectComparisonInsight;
  const boundedNumber = (n: unknown, max: number) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
  const tokens = (n: unknown) => n === null || Number.isInteger(n) && boundedNumber(n, 100_000);
  if (JSON.stringify(value).length > 24_000 || Object.keys(result).sort().join(",") !== "caveat,checks,differences,generatedAt,locale,mode,role,scenario,snapshots,summary,telemetry,version" || result.mode !== "openai_comparison" || result.version !== "POINT_OBJECT_COMPARISON_V1" || typeof result.generatedAt !== "string" || !Number.isFinite(Date.parse(result.generatedAt)) || !["en", "ru"].includes(result.locale) || typeof result.role !== "string" || typeof result.scenario !== "string" || result.role.length > 80 || result.scenario.length > 80 || result.caveat !== LIVE_POINT_CAVEAT || !Array.isArray(result.snapshots) || result.snapshots.length < 2 || result.snapshots.length > 3 || !result.snapshots.every(s => s && Object.keys(s).sort().join(",") === "evidencePackHash,label,sourceFeatureId" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(s.sourceFeatureId) && /^[a-f0-9]{64}$/.test(s.evidencePackHash) && (s.label === null || typeof s.label === "string" && s.label.length > 0 && s.label.length <= 240)) || new Set(result.snapshots.map(s => s.sourceFeatureId)).size !== result.snapshots.length || !result.telemetry || result.telemetry.provider !== "openai" || result.telemetry.attempts !== 1 || result.telemetry.stored !== false || result.telemetry.toolCalls !== 0 || typeof result.telemetry.model !== "string" || !/^[a-zA-Z0-9._-]{1,100}$/.test(result.telemetry.model) || !(result.telemetry.requestId === null || typeof result.telemetry.requestId === "string" && result.telemetry.requestId.length <= 160) || !boundedNumber(result.telemetry.latencyMs, 120_000) || !tokens(result.telemetry.inputTokens) || !tokens(result.telemetry.outputTokens) || !tokens(result.telemetry.totalTokens)) return { content: null, rejectionCode: "COMPARISON_RESPONSE_ENVELOPE_INVALID" };
  const candidates = result.snapshots.map(s => ({ id: s.sourceFeatureId, label: s.label }));
  const allowedEvidenceRefs = result.snapshots.flatMap(s => [`${s.sourceFeatureId}:identity`, ...CONTEXT_GROUPS.flatMap(group => ["count", "share", "nearest"].map(metric => `${s.sourceFeatureId}:${group}.${metric}`))]);
  const parsed = parsePointObjectComparisonContentDetailed({ summary: result.summary, differences: result.differences, checks: result.checks }, { candidates, allowedEvidenceRefs } as PointObjectComparisonInput);
  return parsed.content ? { content: result, rejectionCode: null } : parsed;
}

export function parsePointObjectComparisonInsight(value: unknown): PointObjectComparisonInsight | null {
  return parsePointObjectComparisonInsightDetailed(value).content;
}

/** Called only after strict response parsing. Preserve the submitted order and
 * exact source label/hash; set membership alone cannot bind an ordered comparison. */
export function comparisonInsightMatchesSubmission(result: PointObjectComparisonInsight | null,
  conditions: { locale: "en" | "ru"; role: string; scenario: string },
  snapshots: Array<{ sourceFeatureId: string; evidencePackHash: string; label: string | null | undefined }>): result is PointObjectComparisonInsight {
  return Boolean(result && result.locale === conditions.locale && result.role === conditions.role && result.scenario === conditions.scenario &&
    snapshots.length >= 2 && snapshots.length <= 3 && result.snapshots.length === snapshots.length &&
    new Set(snapshots.map(snapshot => snapshot.sourceFeatureId)).size === snapshots.length &&
    result.snapshots.every((snapshot,index) => snapshot.sourceFeatureId === snapshots[index].sourceFeatureId &&
      snapshot.evidencePackHash === snapshots[index].evidencePackHash && snapshot.label === snapshots[index].label));
}
