import type { LivePointObjectEvidencePack } from "./point-to-object-live-evidence";
import { CONTEXT_GROUPS, normalizePointObjectContext, type PointObjectNormalizedContext } from "./point-to-object-normalized-context";
import type { PointObjectAnalysisRequest } from "./point-to-object-ai-core";
import { LIVE_POINT_CAVEAT } from "../point-to-object/contracts";

export type PointObjectComparisonCandidate = { id: string; label: string | null; evidencePackHash: string; featureClass: string; footprintAreaSqM: number | null; context: PointObjectNormalizedContext };
export type PointObjectComparisonInput = { version: "POINT_OBJECT_COMPARISON_INPUT_V1"; locale: "en" | "ru"; role: string; scenario: string; candidates: PointObjectComparisonCandidate[]; allowedEvidenceRefs: string[] };
export type ComparisonClaim = { statement: string; evidenceRefs: string[] };
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

export function parsePointObjectComparisonContent(value: unknown, input: PointObjectComparisonInput): Pick<PointObjectComparisonInsight, "summary" | "differences" | "checks"> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
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
    !Array.isArray(content.checks) || content.checks.length < 2 || content.checks.length > 6 || !content.checks.every(c => c && Object.keys(c).sort().join(",") === "action,candidateId,evidenceRefs" && input.candidates.some(candidate => candidate.id === c.candidateId) && text(c.action) && refs(c.evidenceRefs) && c.evidenceRefs.every(ref=>ref.startsWith(`${c.candidateId}:`))) || !input.candidates.every(candidate => content.checks.some(c => c.candidateId === candidate.id))) return null;
  return content;
}

export function parsePointObjectComparisonInsight(value: unknown): PointObjectComparisonInsight | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as PointObjectComparisonInsight;
  const boundedNumber = (n: unknown, max: number) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
  const tokens = (n: unknown) => n === null || Number.isInteger(n) && boundedNumber(n, 100_000);
  if (JSON.stringify(value).length > 24_000 || Object.keys(result).sort().join(",") !== "caveat,checks,differences,generatedAt,locale,mode,role,scenario,snapshots,summary,telemetry,version" || result.mode !== "openai_comparison" || result.version !== "POINT_OBJECT_COMPARISON_V1" || typeof result.generatedAt !== "string" || !Number.isFinite(Date.parse(result.generatedAt)) || !["en", "ru"].includes(result.locale) || typeof result.role !== "string" || typeof result.scenario !== "string" || result.role.length > 80 || result.scenario.length > 80 || result.caveat !== LIVE_POINT_CAVEAT || !Array.isArray(result.snapshots) || result.snapshots.length < 2 || result.snapshots.length > 3 || !result.snapshots.every(s => s && Object.keys(s).sort().join(",") === "evidencePackHash,label,sourceFeatureId" && /^(node|way|relation)\/[1-9]\d{0,19}$/.test(s.sourceFeatureId) && /^[a-f0-9]{64}$/.test(s.evidencePackHash) && (s.label === null || typeof s.label === "string" && s.label.length > 0 && s.label.length <= 240)) || new Set(result.snapshots.map(s => s.sourceFeatureId)).size !== result.snapshots.length || !result.telemetry || result.telemetry.provider !== "openai" || result.telemetry.attempts !== 1 || result.telemetry.stored !== false || result.telemetry.toolCalls !== 0 || typeof result.telemetry.model !== "string" || !/^[a-zA-Z0-9._-]{1,100}$/.test(result.telemetry.model) || !(result.telemetry.requestId === null || typeof result.telemetry.requestId === "string" && result.telemetry.requestId.length <= 160) || !boundedNumber(result.telemetry.latencyMs, 120_000) || !tokens(result.telemetry.inputTokens) || !tokens(result.telemetry.outputTokens) || !tokens(result.telemetry.totalTokens)) return null;
  const candidates = result.snapshots.map(s => ({ id: s.sourceFeatureId, label: s.label }));
  const allowedEvidenceRefs = result.snapshots.flatMap(s => [`${s.sourceFeatureId}:identity`, ...CONTEXT_GROUPS.flatMap(group => ["count", "share", "nearest"].map(metric => `${s.sourceFeatureId}:${group}.${metric}`))]);
  return parsePointObjectComparisonContent({ summary: result.summary, differences: result.differences, checks: result.checks }, { candidates, allowedEvidenceRefs } as PointObjectComparisonInput) ? result : null;
}
