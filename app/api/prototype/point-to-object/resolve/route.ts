import { NextResponse } from "next/server";

import { readBoundedJson } from "@/src/lib/http/bounded-json";
import {
  isFrozenCaseKey,
  resolvePrototypePoint
} from "@/src/lib/point-to-object/frozen-osm-repository";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const parsed = await readBoundedJson(request, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  const body = parsed.value;
  if (!isRecord(body) || !isFrozenCaseKey(body.caseKey) ||
      typeof body.longitude !== "number" || !Number.isFinite(body.longitude) || Math.abs(body.longitude) > 180 ||
      typeof body.latitude !== "number" || !Number.isFinite(body.latitude) || Math.abs(body.latitude) > 90) {
    return NextResponse.json({ error: "A valid caseKey and WGS84 longitude/latitude are required." }, { status: 400 });
  }
  try {
    return NextResponse.json(resolvePrototypePoint(body.caseKey, [body.longitude, body.latitude]), {
      headers: { "Cache-Control": "private, no-store, max-age=0" }
    });
  } catch {
    return NextResponse.json({ error: "The frozen point could not be resolved safely." }, { status: 422 });
  }
}
