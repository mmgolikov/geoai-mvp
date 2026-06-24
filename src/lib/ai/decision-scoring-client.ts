import { applyDecisionScoreGuardrails } from "@/src/lib/ai/decision-scoring-guardrails";
import {
  decisionScoreCaveat,
  decisionPostures,
  decisionScoreConfidenceLevels,
  recommendedUses,
  type DecisionScoreRequest,
  type DecisionScoreResult
} from "@/src/lib/ai/decision-scoring-schema";
import { createDeterministicDecisionScore } from "@/src/lib/ai/decision-scoring-fallback";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 5);
  return normalized.length > 0 ? normalized : fallback;
}

function numberScore(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

export function validateDecisionScore(
  value: unknown,
  fallback: DecisionScoreResult["mode"],
  request?: DecisionScoreRequest
): DecisionScoreResult | null {
  if (!isRecord(value)) return null;

  const result: DecisionScoreResult = {
    mode: fallback,
    decisionPosture: enumValue(value.decisionPosture, decisionPostures, "validate_first"),
    recommendedUse: enumValue(value.recommendedUse, recommendedUses, "unknown"),
    suitabilityScore: numberScore(value.suitabilityScore, 55),
    riskScore: numberScore(value.riskScore, 60),
    confidence: enumValue(value.confidence, decisionScoreConfidenceLevels, "low"),
    evidenceUsed: stringArray(value.evidenceUsed, []),
    keyDrivers: stringArray(value.keyDrivers, []),
    keyRisks: stringArray(value.keyRisks, []),
    validationRequired: stringArray(value.validationRequired, []),
    nextActions: stringArray(value.nextActions, []),
    caveat: decisionScoreCaveat,
    forbiddenClaimsAvoided: value.forbiddenClaimsAvoided === true,
    unsupportedClaims: stringArray(value.unsupportedClaims, [])
  };

  if (
    result.keyDrivers.length === 0 ||
    result.keyRisks.length === 0 ||
    result.validationRequired.length === 0 ||
    result.nextActions.length === 0
  ) {
    return null;
  }

  return applyDecisionScoreGuardrails(result, request);
}

function extractText(payload: Record<string, unknown>) {
  const choices = payload.choices;
  if (!Array.isArray(choices)) return "";
  const first = choices[0];
  if (!isRecord(first) || !isRecord(first.message)) return "";
  return typeof first.message.content === "string" ? first.message.content : "";
}

function buildDecisionScorePrompt(request: DecisionScoreRequest) {
  return `
Return JSON only for a GeoAI decision-support score. This is a screening hypothesis, not an official, legal, cadastral, zoning, planning or valuation conclusion.

Rules:
- Do not claim official parcel boundaries, zoning approval, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, official suitability, or legal conclusion.
- Preserve deterministic scores as baseline context; do not invent facts.
- Treat DLD/Dubai Pulse/GeoDubai as manual/imported/sample/planned unless explicit validated evidence is provided.
- Respect validationSummary and claimPolicy. If claimPolicy.allowedClaimLevel is screening_only, confidence must be low and validationRequired must include official/client validation gaps.
- Respect evidenceReviewSummaries. Uploaded/unreviewed, rejected, expired or needs-more-evidence items do not support claims. In-review evidence may only be described as under review.
- If validation evidence is a placeholder, planned validation, evidence_requested, or permission_required, do not treat it as proof.
- Keep output concise and client-ready.

Input:
${JSON.stringify(request, null, 2)}

Required JSON shape:
{
  "decisionPosture": "proceed_with_conditions | compare_alternatives | validate_first | monitor | reject_or_pause",
  "recommendedUse": "residential | serviced_apartments | hotel | mixed_use | logistics_light_industrial | office | retail | hold_validate | compare_first | unknown",
  "suitabilityScore": 0,
  "riskScore": 0,
  "confidence": "low | medium | high",
  "evidenceUsed": ["source-or-evidence-id"],
  "keyDrivers": ["max 5 concise strings"],
  "keyRisks": ["max 5 concise strings"],
  "validationRequired": ["max 5 concise strings"],
  "nextActions": ["max 5 concise strings"],
  "caveat": "${decisionScoreCaveat}",
  "forbiddenClaimsAvoided": true,
  "unsupportedClaims": []
}`.trim();
}

export async function createOpenAiDecisionScore(request: DecisionScoreRequest): Promise<DecisionScoreResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_DECISION_SCORING ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are GeoAI's cautious decision scoring service. Return valid JSON only."
          },
          {
            role: "user",
            content: buildDecisionScorePrompt(request)
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) return null;
    const payload = await response.json() as Record<string, unknown>;
    const text = extractText(payload);
    if (!text) return null;
    return validateDecisionScore(JSON.parse(text), "openai", request);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createDecisionScore(request: DecisionScoreRequest) {
  const openAiResult = await createOpenAiDecisionScore(request);
  return openAiResult ?? createDeterministicDecisionScore(request);
}
