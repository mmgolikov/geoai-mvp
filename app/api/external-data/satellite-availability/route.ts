import { NextResponse } from "next/server";
import { getCopernicusAvailabilityStatus } from "@/src/lib/external-data/copernicus-catalog";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getCopernicusAvailabilityStatus());
}
