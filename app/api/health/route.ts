import { NextResponse } from "next/server";

export function GET() {
  const releaseCommitCandidate = process.env.VERCEL_GIT_COMMIT_SHA?.trim().toLowerCase() ?? "";
  const deploymentHostCandidate = process.env.VERCEL_URL?.trim().toLowerCase() ?? "";
  const releaseCommit = /^[0-9a-f]{40}$/.test(releaseCommitCandidate) ? releaseCommitCandidate : null;
  const deploymentHost = /^[a-z0-9-]+\.vercel\.app$/.test(deploymentHostCandidate)
    ? deploymentHostCandidate
    : null;
  return NextResponse.json({
    status: "ok",
    app: "GeoAI",
    productStage: "public_demo_prototype",
    productSemVer: null,
    releaseIdentity: "Git commit and deployment ID are authoritative; Product SemVer is not established.",
    environment: process.env.VERCEL_ENV === "production"
      ? "vercel_production_demo"
      : process.env.VERCEL_ENV === "preview"
        ? "vercel_preview"
        : "local_development",
    releaseCommit,
    deploymentMetadata: deploymentHost ? { provider: "vercel", deploymentHost } : null,
    dataStatus: "Sample/open and offline data only; live official integrations are not connected."
  });
}
