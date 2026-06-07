import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    app: "GeoAI",
    milestone: "nextjs-mvp-skeleton"
  });
}
