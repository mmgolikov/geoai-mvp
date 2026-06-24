import { NextResponse } from "next/server";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import { listValidationEvidence } from "@/src/lib/repositories/validation-repository";
import { officialConnectorReadiness } from "@/src/lib/validation/official-connector-readiness";
import { buildClaimPolicy } from "@/src/lib/validation/claim-policy";
import { buildValidationSummary } from "@/src/lib/validation/validation-summary";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey") ?? "dubai-investment-screening-demo";
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });
  const result = await listValidationEvidence({ projectId, projectKey, limit: 50 });
  const summary = buildValidationSummary(result.data);
  const claimPolicy = buildClaimPolicy({ evidence: result.data, summary });

  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(result.mode),
    projectId,
    projectKey,
    evidence: result.data,
    summary,
    claimPolicy,
    connectorReadiness: officialConnectorReadiness,
    access,
    error: result.error,
    dataHonesty: "Validation governance tracks evidence posture only; GeoAI does not certify ownership, zoning, cadastral status, planning approval or valuation."
  });
}
