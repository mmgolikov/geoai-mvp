import { NextResponse } from "next/server";
import demoObjects from "@/src/data/demo-objects.json";

export function GET() {
  return NextResponse.json({
    data: demoObjects
  });
}
