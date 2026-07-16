import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    status: "not_attested_on_public_endpoint",
    productStage: "public_demo_prototype",
    hardAccessEnabled: false,
    confidentialPilotReady: false,
    canonicalReplayCertified: false,
    containmentMigrationApplied: false,
    diagnosticsWithheld: true,
    blockers: [
      "DB-01 clean replay and tenant-isolation evidence are incomplete.",
      "AUTH-01 request identity and membership evidence are incomplete."
    ],
    nextActions: ["Run table-by-table positive and negative RLS checks only from an operator-authenticated control plane."],
    caveat: "This public route deliberately exposes no table inventory, policy plan, environment state or live probes."
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
