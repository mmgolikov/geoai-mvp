import { NextResponse } from "next/server";
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

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    storageCaveat: result.storageCaveat,
    summary: summarizeReportPackage(result.data),
    exportManifest: result.data.exportManifest,
    message: "Use the printable route for browser Print / Save as PDF, or the JSON route for safe package metadata export."
  });
}
