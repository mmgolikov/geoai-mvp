import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { createDataRoomAsset } from "@/src/lib/repositories/data-room-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import {
  dataRoomRequiredCaveat,
  type DataRoomAsset,
  type DataRoomAssetType,
  type DataRoomSourceType,
  type DataRoomValidationStatus
} from "@/src/types/data-room";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { getProjectByKey } from "@/src/lib/db/repositories/projects";

export const runtime = "nodejs";

const assetTypes: DataRoomAssetType[] = [
  "aoi",
  "uploaded_geojson",
  "uploaded_csv",
  "uploaded_document",
  "analysis",
  "report",
  "comparison",
  "external_source",
  "validation_note"
];
const sourceTypes: DataRoomSourceType[] = [
  "user_uploaded",
  "user_drawn",
  "generated_by_geoai",
  "sample_fallback",
  "public_snapshot",
  "api_context",
  "planned_validation",
  "permission_required"
];
const validationStatuses: DataRoomValidationStatus[] = [
  "validation_required",
  "client_provided_unvalidated",
  "sample_fallback",
  "ready_for_review",
  "planned_official_validation"
];

function isAssetInput(value: unknown): value is Omit<DataRoomAsset, "createdAt" | "updatedAt" | "caveat"> & Partial<Pick<DataRoomAsset, "createdAt" | "updatedAt" | "caveat">> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const input = value as Partial<DataRoomAsset>;
  return (
    typeof input.id === "string" && /^[a-zA-Z0-9_.:-]{1,240}$/.test(input.id) &&
    typeof input.projectKey === "string" && input.projectKey.length <= 160 &&
    typeof input.name === "string" && input.name.trim().length > 0 && input.name.length <= 500 &&
    Boolean(input.assetType && assetTypes.includes(input.assetType)) &&
    Boolean(input.sourceType && sourceTypes.includes(input.sourceType)) &&
    Boolean(input.validationStatus && validationStatuses.includes(input.validationStatus))
  );
}

export async function POST(request: Request) {
  const parsed = await readBoundedJson(request, 192 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: parsed.message }, { status: parsed.status });
  }
  const body = parsed.value;

  if (!isAssetInput(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid data room asset metadata." }, { status: 400 });
  }

  const access = requireProjectAccess({ projectKey: body.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const project = await getProjectByKey(body.projectKey);
  const safeIds = (value: string[] | undefined) => (value ?? []).filter((item) => typeof item === "string" && /^[a-zA-Z0-9_.:-]{1,240}$/.test(item)).slice(0, 50);
  const result = await createDataRoomAsset({
    id: body.id,
    projectId: project.data?.id ?? null,
    projectKey: body.projectKey,
    name: body.name.trim().slice(0, 500),
    description: typeof body.description === "string" ? body.description.trim().slice(0, 4000) : undefined,
    assetType: body.assetType,
    sourceType: body.sourceType,
    linkedAoiIds: safeIds(body.linkedAoiIds),
    linkedAnalysisIds: safeIds(body.linkedAnalysisIds),
    linkedReportIds: safeIds(body.linkedReportIds),
    validationStatus: body.validationStatus,
    caveat: dataRoomRequiredCaveat
  });
  void recordAuditEvent({
    projectKey: body.projectKey,
    eventType: "data_room_asset_added",
    entityType: "data_room_asset",
    entityId: body.id,
    action: "Registered data room asset metadata",
    metadata: { assetType: body.assetType, sourceType: body.sourceType, accessAllowed: access.allowed }
  });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields("local_fallback"),
    item: result.data,
    access,
    error: result.error,
    dataHonesty: "Data room assets are local/demo metadata only; official validation and durable storage are not connected."
  }, { status: result.ok ? 201 : 200 });
}
