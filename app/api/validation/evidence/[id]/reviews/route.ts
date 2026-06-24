import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { createEvidenceReview, listEvidenceReviews, buildEvidenceReviewSummary } from "@/src/lib/repositories/evidence-review-repository";
import { getEvidenceFileAsset, updateEvidenceFileAsset } from "@/src/lib/repositories/evidence-file-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { listValidationEvidence, updateValidationEvidence } from "@/src/lib/repositories/validation-repository";
import { evidenceReviewCaveat, reviewStatusToValidationStatus, type EvidenceReviewDecision } from "@/src/types/evidence-review";
import type { ValidationEvidence } from "@/src/types/validation";
import { validateEvidenceReviewTransition, evidenceReviewStatusFromValidation } from "@/src/lib/validation/evidence-review-policy";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readDecision(value: unknown): EvidenceReviewDecision | null {
  const decision = readString(value);
  if (
    decision === "accept_for_screening" ||
    decision === "request_more_evidence" ||
    decision === "mark_client_validated" ||
    decision === "mark_official_validated" ||
    decision === "reject" ||
    decision === "expire" ||
    decision === "supersede" ||
    decision === "reset_to_review"
  ) {
    return decision;
  }
  return null;
}

function createTransientValidationEvidence(id: string, projectKey: string, projectId: string | null): ValidationEvidence {
  const now = new Date().toISOString();
  return {
    id,
    projectId,
    projectKey,
    linkedAoiIds: [],
    linkedAnalysisIds: [],
    linkedReportIds: [],
    linkedDataRoomAssetIds: [],
    linkedEvidenceFileIds: [],
    sourceCategory: "client_uploaded_document",
    sourceName: "Local fallback validation evidence",
    accessMode: "client_provided",
    validationStatus: "uploaded_unreviewed",
    confidence: "unknown",
    allowedClaimLevel: "screening_only",
    title: "Local fallback validation evidence",
    description: "Transient fallback evidence metadata for serverless local/API fallback. This is not durable production storage.",
    limitations: ["Local/API fallback is not durable production storage.", evidenceReviewCaveat],
    allowedClaims: ["Evidence may be reviewed for screening workflow only after explicit reviewer decision."],
    forbiddenClaims: ["GeoAI certifies ownership", "zoning approval", "certified valuation"],
    caveat: evidenceReviewCaveat,
    createdAt: now,
    updatedAt: now
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const projectKey = url.searchParams.get("projectKey") ?? "dubai-investment-screening-demo";
  const projectId = url.searchParams.get("projectId");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  const result = await listEvidenceReviews({ projectId, projectKey, validationEvidenceId: id, limit: 80 });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    reviews: result.data,
    reviewSummary: buildEvidenceReviewSummary(id, result.data),
    access,
    error: result.error,
    caveat: evidenceReviewCaveat
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const projectKey = readString(body.projectKey) ?? "dubai-investment-screening-demo";
  const projectId = readString(body.projectId);
  const access = requireProjectAccess({ projectKey, action: "write", mode: "soft" });
  const evidenceResult = await listValidationEvidence({ projectId, projectKey, limit: 100 });
  const validationEvidence = evidenceResult.data.find((item) => item.id === id)
    ?? createTransientValidationEvidence(id, projectKey, projectId);

  const decision = readDecision(body.decision);
  if (!decision) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(evidenceResult.mode), message: "Valid review decision is required.", caveat: evidenceReviewCaveat }, { status: 400 });
  }

  const evidenceFileId = readString(body.evidenceFileId);
  const notes = readString(body.notes) ?? "";
  const expiresAt = readString(body.expiresAt);
  const file = evidenceFileId ? await getEvidenceFileAsset(evidenceFileId) : null;
  const reviewHistory = await listEvidenceReviews({ projectId, projectKey, validationEvidenceId: id, limit: 50 });
  const latestSummary = buildEvidenceReviewSummary(id, reviewHistory.data);
  const currentStatus = latestSummary.latestStatus === "not_started"
    ? evidenceReviewStatusFromValidation(validationEvidence)
    : latestSummary.latestStatus;

  const policy = validateEvidenceReviewTransition({
    evidence: validationEvidence,
    decision,
    currentStatus,
    notes,
    expiresAt,
    evidenceFileId
  });

  if (!policy.ok) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(evidenceResult.mode), message: policy.message, caveat: policy.caveat }, { status: 400 });
  }

  const now = new Date().toISOString();
  const reviewerName = readString(body.reviewerName) ?? "GeoAI reviewer";
  const reviewerRole = readString(body.reviewerRole) ?? "reviewer";
  const review = await createEvidenceReview({
    id: `evidence-review-${id}-${Date.now()}`,
    organizationId: validationEvidence.organizationId ?? null,
    projectId: validationEvidence.projectId ?? projectId,
    projectKey: validationEvidence.projectKey,
    validationEvidenceId: id,
    evidenceFileId,
    reviewerId: readString(body.reviewerId),
    reviewerName,
    reviewerRole,
    decision,
    previousStatus: policy.previousStatus,
    nextStatus: policy.nextStatus,
    notes,
    limitations: policy.limitations,
    allowedClaimLevel: policy.allowedClaimLevel,
    effectiveFrom: now,
    expiresAt,
    createdAt: now
  });

  const updatedValidation = await updateValidationEvidence(id, {
    validationStatus: reviewStatusToValidationStatus(policy.nextStatus),
    allowedClaimLevel: policy.allowedClaimLevel,
    reviewedBy: reviewerName,
    reviewedAt: now,
    expiryDate: expiresAt,
    linkedEvidenceFileIds: evidenceFileId
      ? Array.from(new Set([...(validationEvidence.linkedEvidenceFileIds ?? []), evidenceFileId]))
      : validationEvidence.linkedEvidenceFileIds
  });

  if (file?.data && evidenceFileId) {
    void updateEvidenceFileAsset(evidenceFileId, {
      validationStatus: policy.nextStatus === "needs_more_evidence" || policy.nextStatus === "superseded"
        ? "in_review"
        : policy.nextStatus === "not_started"
          ? "uploaded_unreviewed"
          : policy.nextStatus
    });
  }

  void recordAuditEvent({
    projectKey,
    eventType: "evidence_review_created",
    entityType: "validation_evidence",
    entityId: id,
    action: "Created evidence review decision",
    metadata: { decision, previousStatus: policy.previousStatus, nextStatus: policy.nextStatus, evidenceFileId, accessAllowed: access.allowed }
  });
  void recordAuditEvent({
    projectKey,
    eventType: "evidence_review_status_changed",
    entityType: "validation_evidence",
    entityId: id,
    action: "Changed evidence review status",
    metadata: { previousStatus: policy.previousStatus, nextStatus: policy.nextStatus }
  });

  const nextHistory = await listEvidenceReviews({ projectId, projectKey, validationEvidenceId: id, limit: 80 });

  return NextResponse.json({
    ok: review.ok,
    ...repositoryModeFields(review.mode),
    review: review.data,
    validationEvidence: updatedValidation.data,
    reviewSummary: buildEvidenceReviewSummary(id, nextHistory.data),
    access,
    error: review.error,
    caveat: evidenceReviewCaveat
  }, { status: review.ok ? 201 : 200 });
}
