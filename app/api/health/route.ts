import { NextResponse } from "next/server";
import { resolveRuntimeTarget } from "@/src/lib/platform/runtime-environment";

export function GET() {
  const runtimeTarget = resolveRuntimeTarget();
  const releaseCommitCandidate = process.env.VERCEL_GIT_COMMIT_SHA?.trim().toLowerCase() ?? "";
  const deploymentHostCandidate = process.env.VERCEL_URL?.trim().toLowerCase() ?? "";
  const selfHostedCommitCandidate = process.env.GEOAI_RELEASE_COMMIT_SHA?.trim().toLowerCase() ?? "";
  const releaseCommit = runtimeTarget === "self_hosted_candidate"
    ? (/^[0-9a-f]{40}$/.test(selfHostedCommitCandidate) ? selfHostedCommitCandidate : null)
    : (/^[0-9a-f]{40}$/.test(releaseCommitCandidate) ? releaseCommitCandidate : null);
  const deploymentHost = /^[a-z0-9-]+\.vercel\.app$/.test(deploymentHostCandidate)
    ? deploymentHostCandidate
    : null;
  return NextResponse.json({
    status: "ok",
    app: "GeoAI",
    productStage: "public_demo_prototype",
    productSemVer: null,
    releaseIdentity: "Git commit and deployment ID are authoritative; Product SemVer is not established.",
    environment: runtimeTarget === "unknown" ? "local_development" : runtimeTarget,
    releaseCommit,
    deploymentMetadata: runtimeTarget === "self_hosted_candidate"
      ? { provider: "self_hosted" }
      : deploymentHost
        ? { provider: "vercel", deploymentHost }
        : null,
    dataStatus: "Sample/open and offline data only; live official integrations are not connected."
  });
}
