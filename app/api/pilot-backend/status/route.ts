import { NextResponse } from "next/server";
import { getPilotBackendActivationSummary } from "@/src/lib/platform/pilot-backend-activation";

export const runtime = "nodejs";

export async function GET() {
  const summary = await getPilotBackendActivationSummary();
  return NextResponse.json(summary);
}
