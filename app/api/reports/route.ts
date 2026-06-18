import { NextResponse } from "next/server";
import { saveReport } from "@/src/lib/db/repositories/reports";
import type { DbReportInput } from "@/src/lib/db/types";

export const runtime = "nodejs";

function isReportInput(value: unknown): value is DbReportInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<DbReportInput>;
  return (
    typeof input.reportKey === "string" &&
    typeof input.reportType === "string" &&
    typeof input.title === "string" &&
    input.reportJson !== undefined
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, persisted: false, mode: "local_only", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!isReportInput(body)) {
    return NextResponse.json(
      { ok: false, persisted: false, mode: "local_only", message: "Invalid report payload." },
      { status: 400 }
    );
  }

  const result = await saveReport(body);

  return NextResponse.json({
    ok: result.ok,
    persisted: result.mode === "db" && result.ok,
    mode: result.mode,
    reportKey: body.reportKey,
    data: result.data,
    error: result.error,
    message: result.mode === "db" && result.ok
      ? "Report persisted."
      : "Report kept as screen/print only; Supabase is not configured or unavailable."
  });
}
