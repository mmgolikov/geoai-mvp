import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getReportPackage, summarizeReportPackage, updateReportPackageStatus } from "@/src/lib/repositories/report-package-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { ReportPackageStatus } from "@/src/types/report-package";

type Params = {
  params: Promise<{ id: string }>;
};

const allowedStatuses: ReportPackageStatus[] = ["draft", "generated", "ready_for_review", "validation_required", "superseded"];

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const result = await getReportPackage(decodedId);

  if (!result.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Report package not found." }, { status: 404 });
  }
  const access = requireProjectAccess({ projectKey: result.data.projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    storageCaveat: result.storageCaveat,
    package: result.data,
    summary: summarizeReportPackage(result.data),
    access,
    caveat: result.data.caveat
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const status = typeof (body as { status?: unknown })?.status === "string" ? (body as { status: string }).status : "";
  if (!allowedStatuses.includes(status as ReportPackageStatus)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid report package status." }, { status: 400 });
  }

  const existing = await getReportPackage(decodedId);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Report package not found." }, { status: 404 });
  }
  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await updateReportPackageStatus(decodedId, status as ReportPackageStatus);
  if (!result.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Report package not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: result.ok,
    mode: result.mode,
    storageCaveat: result.storageCaveat,
    package: result.data,
    summary: summarizeReportPackage(result.data),
    access,
    error: result.error
  });
}
