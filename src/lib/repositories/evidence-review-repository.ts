import { localCreate, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import { evidenceReviewCaveat, type EvidenceReviewRecord, type EvidenceReviewSummary } from "@/src/types/evidence-review";
import { requiredNextActionForReview } from "@/src/lib/validation/evidence-review-policy";

const evidenceReviewStore = "evidence-review-records";

type ReviewInput = Omit<EvidenceReviewRecord, "createdAt" | "caveat"> & {
  createdAt?: string;
  caveat?: string;
};

export async function listEvidenceReviews(filters: { projectId?: string | null; projectKey?: string | null; validationEvidenceId?: string | null; limit?: number } = {}) {
  const result = localList<EvidenceReviewRecord>(evidenceReviewStore, {
    projectId: filters.projectId,
    projectKey: filters.projectKey,
    limit: 200
  });
  const data = result.data
    .filter((item) => !filters.validationEvidenceId || item.validationEvidenceId === filters.validationEvidenceId)
    .slice(0, filters.limit ?? 50);
  return { ...result, data };
}

export async function getEvidenceReview(id: string) {
  return localGet<EvidenceReviewRecord>(evidenceReviewStore, id);
}

export async function createEvidenceReview(input: ReviewInput) {
  return localCreate<EvidenceReviewRecord>(evidenceReviewStore, {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
    caveat: input.caveat ?? evidenceReviewCaveat
  });
}

export async function updateEvidenceReview(id: string, patch: Partial<EvidenceReviewRecord>) {
  return localUpdate<EvidenceReviewRecord>(evidenceReviewStore, id, {
    ...patch,
    caveat: patch.caveat ?? evidenceReviewCaveat
  });
}

export function buildEvidenceReviewSummary(validationEvidenceId: string, reviews: EvidenceReviewRecord[]): EvidenceReviewSummary {
  const latest = [...reviews]
    .filter((item) => item.validationEvidenceId === validationEvidenceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const now = Date.now();
  const expiresAt = latest?.expiresAt ?? null;
  const isExpired = Boolean(expiresAt && Date.parse(expiresAt) <= now);
  const latestStatus = isExpired ? "expired" : latest?.nextStatus ?? "not_started";

  return {
    validationEvidenceId,
    latestStatus,
    latestDecision: latest?.decision ?? null,
    latestReviewer: latest?.reviewerName ?? null,
    latestReviewedAt: latest?.createdAt ?? null,
    expiresAt,
    isExpired,
    allowedClaimLevel: isExpired ? "not_supported" : latest?.allowedClaimLevel ?? "screening_only",
    requiredNextAction: requiredNextActionForReview(latestStatus),
    caveat: evidenceReviewCaveat
  };
}

export function buildEvidenceReviewSummaries(validationEvidenceIds: string[], reviews: EvidenceReviewRecord[]) {
  return validationEvidenceIds.map((id) => buildEvidenceReviewSummary(id, reviews));
}
