import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getReportPackage } from "@/src/lib/repositories/report-package-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const result = await getReportPackage(decodedId);
  if (!result.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields(result.mode), message: "Report package not found." }, { status: 404 });
  }
  const access = requireProjectAccess({ projectKey: result.data.projectKey, action: "export", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  const url = new URL(request.url);
  return NextResponse.redirect(new URL(`/report-packages/${encodeURIComponent(decodedId)}/print`, url.origin));
}
