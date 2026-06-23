import { NextResponse } from "next/server";
import {
  deleteUploadedDatasetRecord,
  listUploadedDatasetRecords,
  saveUploadedDatasetRecord
} from "@/src/lib/repositories/uploaded-dataset-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { UploadedDatasetRecord } from "@/src/lib/project-workspace-types";

export const runtime = "nodejs";

function isUploadedDatasetRecord(value: unknown): value is UploadedDatasetRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<UploadedDatasetRecord>;
  return typeof input.id === "string" && typeof input.name === "string" && (input.type === "csv" || input.type === "geojson");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await listUploadedDatasetRecords({
    projectId: url.searchParams.get("projectId"),
    projectKey: url.searchParams.get("projectKey"),
    limit: 50
  });
  const items = result.data ?? [];

  return NextResponse.json({
    ok: true,
    ...repositoryModeFields("local_fallback"),
    count: items.length,
    items,
    dataHonesty: "Uploaded dataset metadata is local/project-scoped and requires official validation."
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  if (!isUploadedDatasetRecord(body)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid uploaded dataset metadata." }, { status: 400 });
  }

  const result = await saveUploadedDatasetRecord(body);
  return NextResponse.json({
    ok: true,
    persisted: false,
    ...repositoryModeFields("local_fallback"),
    item: result.data,
    error: result.error,
    message: "Uploaded dataset metadata kept in local fallback; official validation and durable storage are not connected."
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "id query parameter is required." }, { status: 400 });
  }

  const result = await deleteUploadedDatasetRecord(id);
  return NextResponse.json({ ok: true, ...repositoryModeFields("local_fallback"), deleted: result.data });
}
