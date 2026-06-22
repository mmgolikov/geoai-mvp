import { NextResponse } from "next/server";
import {
  createSourceLineageItems,
  getExternalDataReadiness,
  readExternalDataManifest
} from "@/src/lib/external-data/data-manifest";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    manifest: readExternalDataManifest(),
    readiness: getExternalDataReadiness(),
    lineage: createSourceLineageItems("external data manifest")
  });
}
