import { NextResponse } from "next/server";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    status: "diagnostics_withheld",
    ...repositoryModeFields("browser_local"),
    configured: null,
    reachable: null,
    schemaReady: null,
    postgisReady: null,
    tablesReady: null,
    migrationApplied: false,
    canonicalReplayCertified: false,
    canRead: false,
    canWrite: false,
    sources_count: null,
    diagnosticsWithheld: true,
    message: "Database configuration, schema and credential diagnostics are not exposed on the public endpoint.",
    blockers: ["Protected database activation requires DB-01 and AUTH-01 evidence."],
    nextActions: ["Run database readiness checks only from an operator-authenticated control plane."],
    caveat: "Public-demo user state is browser-local; this response is not infrastructure attestation."
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
