import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { createValidationEvidence } from "@/src/lib/repositories/validation-repository";
import { getProjectByKey } from "@/src/lib/db/repositories/projects";
import type { ValidationEvidence, ValidationSourceCategory } from "@/src/types/validation";

export const runtime = "nodejs";

const sourceCategories: ValidationSourceCategory[] = [
  "dld_public_snapshot",
  "dld_api_gateway",
  "dubai_pulse_snapshot",
  "geodubai_municipality",
  "dubai_municipality_planning",
  "client_uploaded_document",
  "client_uploaded_dataset",
  "licensed_market_data",
  "licensed_valuation",
  "field_inspection",
  "satellite_observation",
  "internal_bank_record",
  "broker_comparable",
  "developer_document",
  "other"
];

function isEvidenceInput(value: unknown): value is Partial<ValidationEvidence> & Pick<ValidationEvidence, "projectKey" | "title" | "sourceCategory"> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const input = value as Partial<ValidationEvidence>;
  return Boolean(
    typeof input.projectKey === "string" &&
      typeof input.title === "string" &&
      input.sourceCategory &&
      sourceCategories.includes(input.sourceCategory)
  );
}

function boundedString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maxLength)
    : undefined;
}

function boundedStringArray(value: unknown, maxItems = 40) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, maxItems)
        .map((item) => item.trim().slice(0, 240))
    : [];
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  if (!isEvidenceInput(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid validation evidence metadata." }, { status: 400 });
  }

  const access = requireProjectAccess({ projectKey: body.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const project = await getProjectByKey(body.projectKey);
  const safeInput: Partial<ValidationEvidence> & Pick<ValidationEvidence, "projectKey" | "title" | "sourceCategory"> = {
    projectKey: body.projectKey,
    projectId: project.data?.id ?? null,
    title: body.title.trim().slice(0, 500),
    sourceCategory: body.sourceCategory,
    sourceName: boundedString(body.sourceName, 500) ?? "Client-provided evidence request",
    accessMode: "client_provided",
    validationStatus: "evidence_requested",
    confidence: "unknown",
    allowedClaimLevel: "screening_only",
    description: boundedString(body.description, 4000) ?? "Validation evidence metadata registered for review.",
    documentDate: boundedString(body.documentDate, 40) ?? null,
    referenceId: boundedString(body.referenceId, 240) ?? null,
    sourceUrl: boundedString(body.sourceUrl, 2000) ?? null,
    linkedAoiIds: boundedStringArray(body.linkedAoiIds),
    linkedAnalysisIds: boundedStringArray(body.linkedAnalysisIds),
    linkedReportIds: boundedStringArray(body.linkedReportIds),
    linkedDataRoomAssetIds: boundedStringArray(body.linkedDataRoomAssetIds),
    linkedEvidenceFileIds: [],
    reviewedBy: null,
    reviewedAt: null,
    limitations: ["Public-demo metadata request only; reviewer identity and supporting evidence are not verified."],
    allowedClaims: ["Validation evidence has been requested for a screening workflow."],
    forbiddenClaims: ["GeoAI certifies ownership", "zoning approval", "official validation", "certified valuation"]
  };

  const result = await createValidationEvidence(safeInput);
  void recordAuditEvent({
    projectKey: body.projectKey,
    eventType: "validation_evidence_created",
    entityType: "validation_evidence",
    entityId: result.data.id,
    action: "Created validation evidence metadata",
    metadata: { sourceCategory: safeInput.sourceCategory, accessAllowed: access.allowed, posture: "evidence_requested" }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: "Validation evidence metadata is local/sample fallback unless durable storage and official review are configured."
  }, { status: result.ok ? 201 : 200 });
}
