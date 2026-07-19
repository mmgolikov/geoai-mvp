import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { createDataRoomChecklistItem } from "@/src/lib/repositories/data-room-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  dataRoomRequiredCaveat,
  type ValidationChecklistCategory,
  type ValidationChecklistItem,
  type ValidationChecklistPriority,
  type ValidationChecklistStatus
} from "@/src/types/data-room";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { getProjectByKey } from "@/src/lib/db/repositories/projects";

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
    typeof input.id === "string" && /^[a-zA-Z0-9_.:-]{1,240}$/.test(input.id) &&
    typeof input.projectKey === "string" && input.projectKey.length <= 160 &&
    typeof input.title === "string" && input.title.trim().length > 0 && input.title.length <= 500 &&
    typeof input.description === "string" && input.description.length <= 4000 &&
    Boolean(input.category && categories.includes(input.category)) &&
    Boolean(input.status && statuses.includes(input.status)) &&
    Boolean(input.priority && priorities.includes(input.priority))
  );
}

export async function POST(request: Request) {
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "evidence.review_screening", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const parsed = await readBoundedJson(request, 128 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: parsed.message }, { status: parsed.status });
  }
  const body = parsed.value;

  if (!isChecklistInput(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid validation checklist item." }, { status: 400 });
  }

  const access = requireProjectAccess({ projectKey: body.projectKey, action: "evidence.review_screening", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const project = await getProjectByKey(body.projectKey);
  const linkedAssetIds = (body.linkedAssetIds ?? []).filter((item) => typeof item === "string" && /^[a-zA-Z0-9_.:-]{1,240}$/.test(item)).slice(0, 50);
  const result = await createDataRoomChecklistItem({
    id: body.id,
    projectId: project.data?.id ?? null,
    projectKey: body.projectKey,
    title: body.title.trim().slice(0, 500),
    category: body.category,
    status: body.status,
    priority: body.priority,
    description: body.description.trim().slice(0, 4000),
    linkedAssetIds,
    caveat: dataRoomRequiredCaveat
  });
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
    dataHonesty: "Checklist status is a local/sample workflow marker; it is not official validation."
  }, { status: result.ok ? 201 : 200 });
}
