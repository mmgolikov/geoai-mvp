import { NextResponse } from "next/server";

import {
  getPrototypeCase,
  isFrozenCaseKey
} from "@/src/lib/point-to-object/frozen-osm-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const caseKey = new URL(request.url).searchParams.get("case");
  if (!isFrozenCaseKey(caseKey)) {
    return NextResponse.json({ error: "case must be dubai or singapore" }, { status: 400 });
  }
  try {
    return NextResponse.json(getPrototypeCase(caseKey), {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
    });
  } catch {
    return NextResponse.json({ error: "Frozen case evidence failed authority verification." }, { status: 503 });
  }
}
