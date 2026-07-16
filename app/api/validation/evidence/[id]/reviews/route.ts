import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { createEvidenceReview, listEvidenceReviews, buildEvidenceReviewSummary } from "@/src/lib/repositories/evidence-review-repository";
import { getEvidenceFileAsset, updateEvidenceFileAsset } from "@/src/lib/repositories/evidence-file-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { getValidationEvidence, listValidationEvidence, updateValidationEvidence } from "@/src/lib/repositories/validation-repository";
import { evidenceReviewCaveat, reviewStatusToValidationStatus, type EvidenceReviewDecision } from "@/src/types/evidence-review";
import type { ValidationEvidence } from "@/src/types/validation";
import { validateEvidenceReviewTransition, evidenceReviewStatusFromValidation } from "@/src/lib/validation/evidence-review-policy";
import { requestAuthKernelStatus } from "@/src/lib/auth/request-auth-kernel";

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

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const requestedProjectKey = url.searchParams.get("projectKey") ?? "dubai-investment-screening-demo";
  const requestedProjectId = url.searchParams.get("projectId");
  const existing = await getValidationEvidence(id);
  const listed = existing.data ? null : await listValidationEvidence({ projectId: requestedProjectId, projectKey: requestedProjectKey, limit: 100 });
  const validationEvidence = existing.data ?? listed?.data.find((item) => item.id === id) ?? null;
  if (!validationEvidence) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Validation evidence not found.", caveat: evidenceReviewCaveat }, { status: 404 });
  }
  const projectKey = validationEvidence.projectKey;
  const projectId = validationEvidence.projectId ?? requestedProjectId;
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

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
  const requestedProjectKey = readString(body.projectKey) ?? "dubai-investment-screening-demo";
  const requestedProjectId = readString(body.projectId);
  const existingEvidence = await getValidationEvidence(id);
  const projectKey = existingEvidence.data?.projectKey ?? requestedProjectKey;
  const projectId = existingEvidence.data?.projectId ?? requestedProjectId;
  const access = requireProjectAccess({ projectKey, action: "review", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  if (existingEvidence.data && requestedProjectKey !== existingEvidence.data.projectKey) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existingEvidence.mode), message: "Validation evidence does not belong to the requested project." }, { status: 400 });
  }

  const evidenceResult = await listValidationEvidence({ projectId, projectKey, limit: 100 });
  const validationEvidence = existingEvidence.data ?? evidenceResult.data.find((item) => item.id === id) ?? null;
  if (!validationEvidence) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(evidenceResult.mode), message: "Validation evidence not found.", caveat: evidenceReviewCaveat }, { status: 404 });
  }

  const decision = readDecision(body.decision);
  if (!decision) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(evidenceResult.mode), message: "Valid review decision is required.", caveat: evidenceReviewCaveat }, { status: 400 });
  }
  if (["mark_client_validated", "mark_official_validated"].includes(decision) &&
      (!requestAuthKernelStatus.requestUserVerified || !requestAuthKernelStatus.projectMembershipVerified)) {
    return NextResponse.json({
      ok: false,
      ...repositoryModeFields(evidenceResult.mode),
      message: "Client/official validation cannot be recorded until reviewer identity and project membership are request-verified.",
      caveat: evidenceReviewCaveat
    }, { status: 409 });
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
  const reviewerIdentityVerified = requestAuthKernelStatus.requestUserVerified && requestAuthKernelStatus.projectMembershipVerified;
  const reviewerName = reviewerIdentityVerified
    ? (access.user?.name ?? access.user?.email ?? "Verified project reviewer")
    : "GeoAI public-demo reviewer (identity unverified)";
  const reviewerRole = reviewerIdentityVerified ? (access.role ?? "reviewer") : "demo_unverified";
  const review = await createEvidenceReview({
    id: `evidence-review-${id}-${Date.now()}`,
    organizationId: validationEvidence.organizationId ?? null,
    projectId: validationEvidence.projectId ?? projectId,
    projectKey: validationEvidence.projectKey,
    validationEvidenceId: id,
    evidenceFileId,
    reviewerId: reviewerIdentityVerified ? access.user?.id ?? null : null,
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
    metadata: { decision, previousStatus: policy.previousStatus, nextStatus: policy.nextStatus, evidenceFileId, accessAllowed: access.allowed, reviewerIdentityVerified }
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
