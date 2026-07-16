import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getReportPackage, summarizeReportPackage } from "@/src/lib/repositories/report-package-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const result = await getReportPackage(decodedId);

  if (!result.data) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Report package not found." }, { status: 404 });
  }

  const pkg = result.data;
  const access = requireProjectAccess({ projectKey: pkg.projectKey, action: "export", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    storageCaveat: result.storageCaveat,
    access,
    metadata: summarizeReportPackage(pkg),
    sections: pkg.sections.map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title,
      summary: section.summary,
      status: section.status,
      linkedEntityIds: section.linkedEntityIds,
      caveat: section.caveat
    })),
    sourceLineage: pkg.sourceLineage,
    validationSummary: pkg.validationSummary,
    evidenceReviewSummary: pkg.evidenceReviewSummary,
    exportManifest: pkg.exportManifest,
    caveats: pkg.exportManifest.caveats,
    generatedAt: pkg.generatedAt
  });
}
