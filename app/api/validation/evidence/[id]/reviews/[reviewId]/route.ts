import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getEvidenceReview, updateEvidenceReview } from "@/src/lib/repositories/evidence-review-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { evidenceReviewCaveat } from "@/src/types/evidence-review";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; reviewId: string }> }) {
  const { id, reviewId } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const existing = await getEvidenceReview(reviewId);

  if (!existing.data || existing.data.validationEvidenceId !== id) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Evidence review not found.", caveat: evidenceReviewCaveat }, { status: 404 });
  }

  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "review", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await updateEvidenceReview(reviewId, {
    notes: readString(body.notes) ?? existing.data.notes,
    reviewerName: existing.data.reviewerName,
    reviewerRole: existing.data.reviewerRole,
    expiresAt: readString(body.expiresAt) ?? existing.data.expiresAt,
    limitations: Array.isArray(body.limitations)
      ? body.limitations.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 6)
      : existing.data.limitations
  });

  void recordAuditEvent({
    projectKey: existing.data.projectKey,
    eventType: "evidence_review_updated",
    entityType: "evidence_review",
    entityId: reviewId,
    action: "Updated evidence review notes",
    metadata: { validationEvidenceId: id, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    review: result.data,
    access,
    error: result.error,
    caveat: evidenceReviewCaveat
  });
}
