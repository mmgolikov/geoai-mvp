import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { createDataRoomChecklistItem } from "@/src/lib/repositories/data-room-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  dataRoomRequiredCaveat,
  type ValidationChecklistCategory,
  type ValidationChecklistItem,
  type ValidationChecklistPriority,
  type ValidationChecklistStatus
} from "@/src/types/data-room";

export const runtime = "nodejs";

const categories: ValidationChecklistCategory[] = [
  "market",
  "parcel",
  "zoning",
  "ownership",
  "planning",
  "climate",
  "infrastructure",
  "client_data",
  "report"
];
const statuses: ValidationChecklistStatus[] = ["not_started", "required", "in_review", "completed", "blocked", "not_applicable"];
const priorities: ValidationChecklistPriority[] = ["high", "medium", "low"];

function isChecklistInput(value: unknown): value is Omit<ValidationChecklistItem, "caveat"> & Partial<Pick<ValidationChecklistItem, "caveat">> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const input = value as Partial<ValidationChecklistItem>;
  return (
    typeof input.id === "string" &&
    typeof input.projectKey === "string" &&
    typeof input.title === "string" &&
    typeof input.description === "string" &&
    Boolean(input.category && categories.includes(input.category)) &&
    Boolean(input.status && statuses.includes(input.status)) &&
    Boolean(input.priority && priorities.includes(input.priority))
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  if (!isChecklistInput(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid validation checklist item." }, { status: 400 });
  }

  const result = await createDataRoomChecklistItem({
    ...body,
    caveat: body.caveat ?? dataRoomRequiredCaveat
  });
  const access = requireProjectAccess({ projectKey: body.projectKey, action: "write", mode: "soft" });
  void recordAuditEvent({
    projectKey: body.projectKey,
    eventType: "checklist_updated",
    entityType: "validation_checklist_item",
    entityId: body.id,
    action: "Created checklist item",
    metadata: { status: body.status, priority: body.priority, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields("local_fallback"),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: "Checklist status is a local/demo workflow marker; it is not official validation."
  }, { status: result.ok ? 201 : 200 });
}
