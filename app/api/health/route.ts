import { NextResponse } from "next/server";

export function GET() {
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
    dataStatus: "Sample/open and offline data only; live official integrations are not connected."
  });
}
