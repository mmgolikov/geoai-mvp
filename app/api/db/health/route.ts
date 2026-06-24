import { NextResponse } from "next/server";
import { countSources } from "@/src/lib/db/repositories/sources";
import { getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getSchemaReadinessSummary();
  const sourcesCount = readiness.configured ? await countSources() : null;

  return NextResponse.json({
    ...readiness,
    sources_count: sourcesCount
  });
}
