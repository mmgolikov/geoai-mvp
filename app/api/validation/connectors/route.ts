import { NextResponse } from "next/server";
import {
  getConnectorReadinessSummary,
  officialConnectorReadiness
} from "@/src/lib/validation/official-connector-readiness";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    mode: "local_fallback",
    connectorReadiness: officialConnectorReadiness,
    summary: getConnectorReadinessSummary(),
    dataHonesty: "Connector readiness is metadata only; no live official DLD, Dubai Pulse or GeoDubai integration is claimed."
  }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
