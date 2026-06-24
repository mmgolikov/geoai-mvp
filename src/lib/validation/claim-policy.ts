import {
  validationRequiredCaveat,
  type AllowedClaimLevel,
  type ClaimPolicy,
  type ValidationEvidence,
  type ValidationSummary
} from "@/src/types/validation";
import { buildValidationSummary } from "@/src/lib/validation/validation-summary";

const forbiddenPhrases = [
  "zoning allows",
  "ownership verified",
  "official parcel",
  "certified valuation",
  "approved site",
  "guaranteed best use",
  "cadastral validation",
  "planning approval",
  "legal conclusion"
];

export function buildClaimPolicy(input: {
  evidence?: ValidationEvidence[];
  summary?: ValidationSummary | null;
  sourceLineage?: unknown;
}): ClaimPolicy {
  const summary = input.summary ?? buildValidationSummary(input.evidence ?? []);
  const level: AllowedClaimLevel = summary.highestAllowedClaimLevel;

  if (level === "official_validation_recorded") {
    return {
      allowedClaimLevel: level,
      allowedPhrases: ["linked official validation evidence indicates", "official evidence recorded for screening context"],
      forbiddenPhrases: ["GeoAI certifies", ...forbiddenPhrases],
      requiredCaveats: [validationRequiredCaveat, "Validation evidence tracking does not mean GeoAI certifies ownership, zoning, cadastral status, planning approval or valuation."],
      unsupportedClaims: [],
      confidenceCap: "high"
    };
  }

  if (level === "client_provided_evidence" || level === "official_evidence_uploaded") {
    return {
      allowedClaimLevel: level,
      allowedPhrases: ["client-provided evidence indicates", "subject to official validation"],
      forbiddenPhrases,
      requiredCaveats: [validationRequiredCaveat, "Live official integrations require authorized access, contracts or client-provided evidence."],
      unsupportedClaims: [],
      confidenceCap: "medium"
    };
  }

  return {
    allowedClaimLevel: "screening_only",
    allowedPhrases: ["screening hypothesis", "requires official validation", "sample or fallback context"],
    forbiddenPhrases,
    requiredCaveats: [validationRequiredCaveat],
    unsupportedClaims: [],
    confidenceCap: "low"
  };
}

export function findForbiddenClaimText(text: string, policy: ClaimPolicy) {
  const normalized = text.toLowerCase();
  return policy.forbiddenPhrases.filter((phrase) => normalized.includes(phrase.toLowerCase()));
}
