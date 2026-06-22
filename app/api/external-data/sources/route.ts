import { NextResponse } from "next/server";
import { getExternalDataReadiness } from "@/src/lib/external-data/data-manifest";
import { externalDataCaveat, externalDataSources } from "@/src/lib/external-data/source-registry";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    caveat: externalDataCaveat,
    sources: externalDataSources,
    readiness: getExternalDataReadiness()
  });
}
