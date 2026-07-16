import { NextResponse } from "next/server";
import { knownLimitations } from "@/src/data/known-limitations";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    status: "static_candidate_truth",
    count: knownLimitations.length,
    items: knownLimitations,
    liveReadinessIncluded: false,
    diagnosticsWithheld: true,
    caveat: "Limitations are reviewed candidate guardrails, not live infrastructure attestation or a production-readiness claim."
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
