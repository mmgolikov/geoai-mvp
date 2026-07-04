import { NextResponse } from "next/server";
import { knownLimitations } from "@/src/data/known-limitations";
import { getPilotBackendActivationSummary } from "@/src/lib/platform/pilot-backend-activation";
import type { KnownLimitation, KnownLimitationStatus } from "@/src/data/known-limitations";

export const runtime = "nodejs";

function capabilityStatus(summary: Awaited<ReturnType<typeof getPilotBackendActivationSummary>>, id: string) {
  return summary.capabilities.find((item) => item.id === id)?.status;
}

function dynamicStatus(summary: Awaited<ReturnType<typeof getPilotBackendActivationSummary>>, item: KnownLimitation): KnownLimitationStatus {
  if (item.id === "durable_storage") {
    const db = capabilityStatus(summary, "postgis_schema");
    if (db === "verified_active") return "verified_active";
    if (db === "configured_ready") return "configured_ready";
    return "foundation_ready";
  }
  if (item.id === "secure_file_storage") {
    const signed = capabilityStatus(summary, "signed_upload_download");
    const buckets = capabilityStatus(summary, "storage_buckets");
    if (signed === "verified_active") return "verified_active";
    if (buckets === "configured_ready") return "configured_ready";
    return "foundation_ready";
  }
  if (item.id === "auth_enforcement") {
    const hard = capabilityStatus(summary, "hard_access_enforcement");
    const auth = capabilityStatus(summary, "auth_sessions");
    if (hard === "verified_active") return "verified_active";
    if (auth === "configured_ready") return "configured_ready";
    return "foundation_ready";
  }
  if (item.id === "rls_governance") {
    const rls = capabilityStatus(summary, "rls_policies");
    if (rls === "verified_active") return "verified_active";
    if (rls === "configured_ready") return "configured_ready";
    return "foundation_ready";
  }
  if (item.id === "audit_trail") {
    return capabilityStatus(summary, "audit_events") === "verified_active" ? "verified_active" : "foundation_ready";
  }
  return item.currentStatus;
}

export async function GET() {
  const pilotBackend = await getPilotBackendActivationSummary();
  const items = knownLimitations.map((item) => ({
    ...item,
    currentStatus: dynamicStatus(pilotBackend, item),
    liveReadiness: {
      pilotBackendStatus: pilotBackend.status,
      canRunDemoPilot: pilotBackend.canRunDemoPilot,
      canRunConfidentialPilot: pilotBackend.canRunConfidentialPilot
    }
  }));

  return NextResponse.json({
    ok: true,
    count: items.length,
    items,
    pilotBackendStatus: pilotBackend.status,
    canRunDemoPilot: pilotBackend.canRunDemoPilot,
    canRunConfidentialPilot: pilotBackend.canRunConfidentialPilot,
    caveat: "Limitations are explicit product guardrails, not hidden production readiness claims."
  });
}
