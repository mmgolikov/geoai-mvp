import { NextResponse } from "next/server";
import {
  disabledRuntimeSourcePack,
  getRuntimeSourceEnvironment,
  isRuntimeSourcePackAllowed
} from "@/src/lib/external-data/runtime-source-contract";
import { getRuntimeSourcePack } from "@/src/lib/external-data/runtime-source-pack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const environment = getRuntimeSourceEnvironment();
  if (!isRuntimeSourcePackAllowed(environment)) {
    return NextResponse.json(disabledRuntimeSourcePack(), {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const response = await getRuntimeSourcePack();
  return NextResponse.json(response, {
    status: response.ok ? 200 : 503,
    headers: { "Cache-Control": "private, no-store" }
  });
}
