import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import {
  deleteUploadedDatasetRecord,
  getUploadedDatasetRecord,
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
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await listUploadedDatasetRecords({
    projectId: url.searchParams.get("projectId"),
    projectKey,
    limit: 50
  });
  const items = result.data ?? [];

  return NextResponse.json({
    ok: true,
    ...repositoryModeFields("local_fallback"),
    count: items.length,
    items,
    access,
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

  const access = requireProjectAccess({ projectKey: body.projectKey ?? null, action: "upload", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await saveUploadedDatasetRecord(body);
  return NextResponse.json({
    ok: true,
    persisted: false,
    ...repositoryModeFields("local_fallback"),
    item: result.data,
    access,
    error: result.error,
    message: "Uploaded dataset metadata kept in local fallback; official validation and durable storage are not connected."
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "id query parameter is required." }, { status: 400 });
  }

  const existing = await getUploadedDatasetRecord(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(existing.mode), message: "Uploaded dataset metadata not found." }, { status: 404 });
  }
  const access = requireProjectAccess({ projectKey: existing.data.projectKey ?? null, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await deleteUploadedDatasetRecord(id);
  return NextResponse.json({ ok: true, ...repositoryModeFields("local_fallback"), deleted: result.data, access });
}
