import { NextResponse } from "next/server";
import { knownLimitations } from "@/src/data/known-limitations";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    count: knownLimitations.length,
    items: knownLimitations,
    caveat: "Known limitations are explicit product guardrails, not hidden production readiness claims."
  });
}
