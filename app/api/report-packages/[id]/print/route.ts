import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getReportPackage, isCanonicalReportPackageId } from "@/src/lib/repositories/report-package-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { applyPrivateNoStore, privateNoStoreJson } from "@/src/lib/http/private-no-store";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isCanonicalReportPackageId(id)) {
    return privateNoStoreJson({ ok: false, ...repositoryModeFields("browser_local"), message: "Invalid report package id." }, { status: 400 });
  }
  const result = await getReportPackage(id, { includeStoredState: false });
  if (!result.data) {
    return privateNoStoreJson({ ok: false, ...repositoryModeFields(result.mode), message: "Report package not found." }, { status: 404 });
  }
  const access = requireProjectAccess({ projectKey: result.data.projectKey, action: "export", mode: "soft" });
  if (!access.allowed) {
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }
  const url = new URL(request.url);
  return applyPrivateNoStore(NextResponse.redirect(new URL(`/report-packages/${encodeURIComponent(id)}/print`, url.origin)));
}
