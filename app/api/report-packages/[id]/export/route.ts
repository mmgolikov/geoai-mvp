import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getReportPackage, isCanonicalReportPackageId, summarizeReportPackage } from "@/src/lib/repositories/report-package-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isCanonicalReportPackageId(id)) {
    return privateNoStoreJson({ ok: false, ...repositoryModeFields("browser_local"), message: "Invalid report package id." }, { status: 400 });
  }
  const result = await getReportPackage(id, { includeStoredState: false });

  if (!result.data) {
    return privateNoStoreJson({ ok: false, ...repositoryModeFields("local_fallback"), message: "Report package not found." }, { status: 404 });
  }
  const access = requireProjectAccess({ projectKey: result.data.projectKey, action: "export", mode: "soft" });
  if (!access.allowed) {
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }
  return privateNoStoreJson({
    ok: true,
    mode: result.mode,
    storageCaveat: result.storageCaveat,
    access,
    summary: summarizeReportPackage(result.data),
    exportManifest: result.data.exportManifest,
    message: "Use the printable route for browser Print / Save as PDF, or the JSON route for safe package metadata export."
  });
}
