import { NextResponse } from "next/server";
import { isPreAuthServerMutationBlocked, projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { ReportPackageBuildInput, ReportPackageType } from "@/src/types/report-package";
import { hasVerifiedRequestIdentity } from "@/src/lib/auth/verified-request-access";
import {
  createReportPackageListProjection,
  publicReportPackageListMaxBytes
} from "@/src/lib/report-package/public-report-package-list";
import { publicSeedReportPackageSummaries } from "@/src/lib/report-package/report-package-seed-definitions";
import { privateNoStoreJson, publicImmutableSeedJson } from "@/src/lib/http/private-no-store";

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
    return privateNoStoreJson(projectAccessDeniedPayload(access), { status: access.status });
  }
  const verifiedRequestIdentity = hasVerifiedRequestIdentity(access);
  const staticSeedOnly = !verifiedRequestIdentity;
  const result = staticSeedOnly
    ? {
        ok: true,
        data: projectId
          ? []
          : publicSeedReportPackageSummaries.filter((item) => !projectKey || item.projectKey === projectKey).slice(0, 10),
        error: null
      }
    : await import("@/src/lib/repositories/report-package-repository").then(({ listReportPackages }) => listReportPackages({
        projectId,
        projectKey,
        limit: 50,
        includeStoredState: true
      }));
  const repositoryFields = repositoryModeFields(staticSeedOnly ? "demo_seed" : "local_fallback");
  const payload = createReportPackageListProjection({
    packages: result.data,
    projectKey,
    staticSeedOnly,
    ok: result.ok,
    ...repositoryFields,
    error: result.error
  });
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  const cacheStaticSeedResponse = staticSeedOnly && result.ok && result.error === null && payloadBytes <= publicReportPackageListMaxBytes;

  if (staticSeedOnly && payloadBytes > publicReportPackageListMaxBytes) {
    return privateNoStoreJson({
      ok: false,
      contractVersion: "compact_public_v1",
      projection: "dashboard_summaries_v1",
      sourceMode: "demo_seed",
      dynamicStoredStateIncluded: false,
      ...repositoryFields,
      projectKey,
      count: 0,
      summaries: [],
      error: "Public report-package projection exceeded its response budget.",
      caveat: "Report packages are decision-support deliverables; official validation required."
    }, {
      status: 503
    });
  }

  if (cacheStaticSeedResponse) {
    return publicImmutableSeedJson(payload);
  }
  return privateNoStoreJson(payload);
}

export async function POST(request: Request) {
  if (isPreAuthServerMutationBlocked("write")) {
    const access = requireProjectAccess({ action: "write", mode: "soft" });
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

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
  const { createReportPackage, summarizeReportPackage } = await import("@/src/lib/repositories/report-package-repository");
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
