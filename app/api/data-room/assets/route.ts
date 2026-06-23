import { NextResponse } from "next/server";
import { createDataRoomAsset } from "@/src/lib/repositories/data-room-repository";
import {
  dataRoomRequiredCaveat,
  type DataRoomAsset,
  type DataRoomAssetType,
  type DataRoomSourceType,
  type DataRoomValidationStatus
} from "@/src/types/data-room";

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
  "planned_validation"
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
    typeof input.id === "string" &&
    typeof input.projectKey === "string" &&
    typeof input.name === "string" &&
    Boolean(input.assetType && assetTypes.includes(input.assetType)) &&
    Boolean(input.sourceType && sourceTypes.includes(input.sourceType)) &&
    Boolean(input.validationStatus && validationStatuses.includes(input.validationStatus))
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mode: "local_fallback", message: "Invalid JSON body." }, { status: 400 });
  }

  if (!isAssetInput(body)) {
    return NextResponse.json({ ok: false, mode: "local_fallback", message: "Invalid data room asset metadata." }, { status: 400 });
  }

  const result = await createDataRoomAsset({
    ...body,
    caveat: body.caveat ?? dataRoomRequiredCaveat
  });

  return NextResponse.json({
    ok: result.ok,
    mode: "local_fallback",
    item: result.data,
    error: result.error,
    dataHonesty: "Data room assets are local/demo metadata only; official validation and durable storage are not connected."
  }, { status: result.ok ? 201 : 200 });
}
