import { NextResponse } from "next/server";
import { getPilotActivationGate } from "@/src/lib/platform/activation-gate";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getPilotActivationGate());
}
