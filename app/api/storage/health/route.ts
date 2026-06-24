import { NextResponse } from "next/server";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getStorageReadiness());
}
