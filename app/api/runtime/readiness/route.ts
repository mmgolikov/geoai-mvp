import { NextResponse } from "next/server";
import {
  validatePortableRuntimeConfiguration,
  validatePortableRuntimeFingerprint
} from "@/src/lib/platform/runtime-environment";
import { probeSupabaseApiHealth } from "@/src/lib/supabase/api-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const runtimeConfiguration = validatePortableRuntimeConfiguration();
  if (!runtimeConfiguration.ok) {
    const notSelfHosted = runtimeConfiguration.issues.includes("not_self_hosted_candidate");
    return NextResponse.json({
      ok: false,
      status: notSelfHosted ? "not_self_hosted_candidate" : "runtime_configuration_rejected",
      dependency: "not_checked"
    }, { status: notSelfHosted ? 404 : 503, headers: noStoreHeaders });
  }
  if (!await validatePortableRuntimeFingerprint()) {
    return NextResponse.json({
      ok: false,
      status: "runtime_configuration_rejected",
      dependency: "not_checked"
    }, { status: 503, headers: noStoreHeaders });
  }

  const dependency = await probeSupabaseApiHealth();
  const ready = dependency.configured && dependency.reachable && dependency.healthy;
  return NextResponse.json({
    ok: ready,
    status: ready ? "ready" : "dependency_unavailable",
    runtime: "self_hosted_candidate",
    dependency: ready ? "managed_supabase_ready" : "managed_supabase_unavailable"
  }, { status: ready ? 200 : 503, headers: noStoreHeaders });
}
