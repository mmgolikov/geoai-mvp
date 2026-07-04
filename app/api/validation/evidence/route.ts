import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { createValidationEvidence } from "@/src/lib/repositories/validation-repository";
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
  const result = await createValidationEvidence(body);
  void recordAuditEvent({
    projectKey: body.projectKey,
    eventType: "validation_evidence_created",
    entityType: "validation_evidence",
    entityId: result.data.id,
    action: "Created validation evidence metadata",
    metadata: { sourceCategory: body.sourceCategory, accessAllowed: access.allowed }
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
