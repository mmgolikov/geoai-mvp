import { NextResponse } from "next/server";
import { getCompactPublicSourceRegistryResponse } from "@/src/lib/external-data/public-source-readiness";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getCompactPublicSourceRegistryResponse(), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
  });
}
