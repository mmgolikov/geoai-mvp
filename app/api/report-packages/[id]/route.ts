import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getReportPackage, isCanonicalReportPackageId, summarizeReportPackage, updateReportPackageStatus } from "@/src/lib/repositories/report-package-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { ReportPackageStatus } from "@/src/types/report-package";
import { isPreAuthServerMutationBlocked } from "@/src/lib/auth/project-access";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

type Params = {
  params: Promise<{ id: string }>;
};

const allowedStatuses: ReportPackageStatus[] = ["draft", "generated", "ready_for_review", "validation_required", "superseded"];

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isCanonicalReportPackageId(id)) {
    return privateNoStoreJson({ ok: false, ...repositoryModeFields("browser_local"), message: "Invalid report package id." }, { status: 400 });
  }
  // Dynamic state stays unavailable until a request-bound principal can be
  // verified before repository access; global capability flags are insufficient.
  const result = await getReportPackage(id, { includeStoredState: false });

  if (!result.data) {
    return privateNoStoreJson({ ok: false, ...repositoryModeFields("local_fallback"), message: "Report package not found." }, { status: 404 });
  }
  const access = requireProjectAccess({ projectKey: result.data.projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }
  return privateNoStoreJson({
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
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "write", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const { id } = await params;
  if (!isCanonicalReportPackageId(id)) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("browser_local"), message: "Invalid report package id." }, { status: 400 });
  }
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

  const existing = await getReportPackage(id);
  if (!existing.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Report package not found." }, { status: 404 });
  }
  const access = requireProjectAccess({ projectKey: existing.data.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const result = await updateReportPackageStatus(id, status as ReportPackageStatus);
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
