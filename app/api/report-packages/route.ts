import { NextResponse } from "next/server";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { createReportPackage, listReportPackages, summarizeReportPackage } from "@/src/lib/repositories/report-package-repository";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { ReportPackageBuildInput, ReportPackageType } from "@/src/types/report-package";

export const runtime = "nodejs";

const allowedPackageTypes: ReportPackageType[] = [
  "investment_screening",
  "development_feasibility",
  "bank_asset_review",
  "comparison_memo",
  "validation_pack",
  "data_room_summary",
  "executive_board_pack"
];

function parseBuildInput(value: unknown): ReportPackageBuildInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Partial<ReportPackageBuildInput>;
  if (typeof input.projectKey !== "string" || input.projectKey.trim().length === 0) return null;

  return {
    projectKey: input.projectKey,
    projectId: typeof input.projectId === "string" ? input.projectId : null,
    packageType: input.packageType && allowedPackageTypes.includes(input.packageType) ? input.packageType : undefined,
    analysisId: typeof input.analysisId === "string" ? input.analysisId : null,
    reportId: typeof input.reportId === "string" ? input.reportId : null,
    comparisonId: typeof input.comparisonId === "string" ? input.comparisonId : null,
    aoiId: typeof input.aoiId === "string" ? input.aoiId : null,
    includeDataRoom: input.includeDataRoom !== false,
    includeValidation: input.includeValidation !== false,
    includeEvidenceReview: input.includeEvidenceReview !== false,
    includePilotWorkflow: input.includePilotWorkflow !== false,
    generatedBy: typeof input.generatedBy === "string" ? input.generatedBy : null
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const result = await listReportPackages({ projectId, projectKey, limit: 50 });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields("local_fallback"),
    count: result.data.length,
    items: result.data,
    summaries: result.data.map(summarizeReportPackage),
    access,
    error: result.error,
    caveat: "Report packages are decision-support deliverables; official validation required."
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." }, { status: 400 });
  }

  const input = parseBuildInput(body);
  if (!input) {
    return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "projectKey is required." }, { status: 400 });
  }

  const access = requireProjectAccess({ projectKey: input.projectKey, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  const result = await createReportPackage(input);
  const summary = summarizeReportPackage(result.data);

  return NextResponse.json({
    ok: result.ok,
    mode: result.mode,
    storageCaveat: result.storageCaveat,
    access,
    package: result.data,
    summary,
    printablePath: summary.printablePath,
    jsonPath: summary.jsonPath,
    error: result.error,
    caveat: result.data.caveat
  });
}
