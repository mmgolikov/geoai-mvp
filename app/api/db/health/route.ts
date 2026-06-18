import { NextResponse } from "next/server";
import { countSources } from "@/src/lib/db/repositories/sources";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";

export const runtime = "nodejs";

export async function GET() {
  const configured = isSupabaseConfigured();
  const sourcesCount = configured ? await countSources() : null;
  const connected = configured && sourcesCount !== null;

  return NextResponse.json({
    configured,
    status: connected ? "connected" : configured ? "configured_unavailable" : "local_only",
    message: connected
      ? "Supabase/PostGIS foundation is reachable."
      : configured
        ? "Supabase env is configured, but the database client is unavailable or unreachable."
        : "Supabase is not configured. GeoAI is running in local/demo mode.",
    sources_count: sourcesCount
  });
}
