import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { buildEvidenceReviewSummaries, listEvidenceReviews } from "@/src/lib/repositories/evidence-review-repository";
import { createDemoValidationEvidence, listValidationEvidence } from "@/src/lib/repositories/validation-repository";
import { officialConnectorReadiness } from "@/src/lib/validation/official-connector-readiness";
import { buildClaimPolicy } from "@/src/lib/validation/claim-policy";
import { buildValidationSummary } from "@/src/lib/validation/validation-summary";
import { hasVerifiedRequestIdentity } from "@/src/lib/auth/verified-request-access";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey") ?? "dubai-investment-screening-demo";
  const access = requireProjectAccess({ projectKey, action: "evidence.read", mode: "soft" });
  if (!access.allowed) {
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }
  const verifiedIdentity = hasVerifiedRequestIdentity(access);
  const result = verifiedIdentity
    ? await listValidationEvidence({ projectId, projectKey, limit: 50 })
    : { ok: true, mode: "browser_local" as const, data: createDemoValidationEvidence(projectKey), error: null };
  const reviewResult = verifiedIdentity
    ? await listEvidenceReviews({ projectId, projectKey, limit: 120 })
    : { ok: true, mode: "browser_local" as const, data: [], error: null };
  const summary = buildValidationSummary(result.data);
  const claimPolicy = buildClaimPolicy({ evidence: result.data, summary });
  const reviewSummaries = buildEvidenceReviewSummaries(result.data.map((item) => item.id), reviewResult.data);

  return privateNoStoreJson({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    projectId,
    projectKey,
    evidence: result.data,
    reviews: reviewResult.data,
    reviewSummaries,
    summary,
    claimPolicy,
    connectorReadiness: officialConnectorReadiness,
    access,
    error: result.error,
    dataHonesty: "Validation governance tracks evidence posture only; GeoAI does not certify ownership, zoning, cadastral status, planning approval or valuation."
  });
}
