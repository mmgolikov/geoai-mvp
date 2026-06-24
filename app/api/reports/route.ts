import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { requireProjectAccess } from "@/src/lib/auth/project-access";
import { getProjectByKey } from "@/src/lib/db/repositories/projects";
import { getReport, listReports, saveReport } from "@/src/lib/db/repositories/reports";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
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

function summarizeReport(item: unknown) {
  const report = item as {
    id?: string;
    report_key?: string;
    projectId?: string | null;
    project_id?: string | null;
    projectKey?: string | null;
    project_key?: string | null;
    title?: string;
    scenario?: string;
    targetLabel?: string;
    reportType?: string;
    report_type?: string;
    createdAt?: string;
    created_at?: string;
    generated_at?: string;
    sourceLineage?: { disclaimers?: string[] };
    reportPayload?: { selectedSite?: string; scenario?: string };
    report_json?: { selectedSite?: string; scenario?: string };
  };
  const payload = report.reportPayload ?? report.report_json;

  return {
    id: report.id ?? report.report_key,
    projectId: report.projectId ?? report.project_id ?? null,
    projectKey: report.projectKey ?? report.project_key ?? null,
    title: report.title ?? "Saved report",
    scenario: report.scenario ?? payload?.scenario ?? null,
    targetLabel: report.targetLabel ?? payload?.selectedSite ?? null,
    reportType: report.reportType ?? report.report_type ?? "analysis",
    createdAt: report.createdAt ?? report.created_at ?? report.generated_at ?? null,
    sourceSummary: report.sourceLineage?.disclaimers?.[0] ?? "Saved with local/demo source lineage; official validation required."
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const access = requireProjectAccess({ projectKey, action: "read", mode: "soft" });

  if (id) {
    const result = await getReport(id);
    const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
    return NextResponse.json({
      ok: result.ok,
      ...repositoryModeFields(responseMode),
      item: result.data,
      summary: result.data ? summarizeReport(result.data) : null,
      access,
      error: result.error,
      dataHonesty: "Saved reports use demo/sample/local source lineage unless externally validated."
    });
  }

  const result = await listReports({ projectId, projectKey, limit: 50 });
  const items = Array.isArray(result.data) ? result.data : [];

  const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
  return NextResponse.json({
    ok: result.ok,
    ...repositoryModeFields(responseMode),
    count: items.length,
    items,
    summaries: items.map(summarizeReport),
    access,
    error: result.error,
    dataHonesty: "No live official DLD, Dubai Pulse, GeoDubai, parcel, zoning or cadastral validation is implied."
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, persisted: false, ...repositoryModeFields("local_fallback"), message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!isReportInput(body)) {
    return NextResponse.json(
      { ok: false, persisted: false, ...repositoryModeFields("local_fallback"), message: "Invalid report payload." },
      { status: 400 }
    );
  }

  const project = body.projectKey ? await getProjectByKey(body.projectKey) : null;
  const access = requireProjectAccess({ projectKey: body.projectKey ?? project?.data?.projectKey ?? null, action: "write", mode: "soft" });
  const result = await saveReport({
    ...body,
    projectId: body.projectId ?? (project?.mode === "supabase" ? project.data?.id ?? null : null),
    projectKey: body.projectKey ?? project?.data?.projectKey ?? null,
    projectName: body.projectName ?? project?.data?.name ?? null
  });

  const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
  void recordAuditEvent({
    projectId: body.projectId ?? (project?.mode === "supabase" ? project.data?.id ?? null : null),
    projectKey: body.projectKey ?? project?.data?.projectKey ?? null,
    eventType: "report_generated",
    entityType: "report",
    entityId: body.reportKey,
    action: "Saved report",
    metadata: { reportType: body.reportType, accessAllowed: access.allowed }
  });
  return NextResponse.json({
    ok: result.ok,
    persisted: result.mode === "supabase" && result.ok,
    ...repositoryModeFields(responseMode),
    reportKey: body.reportKey,
    project: project?.data ?? null,
    access,
    data: result.data,
    error: result.error,
    message: result.mode === "supabase" && result.ok
      ? "Report persisted."
      : "Report kept as screen/print only; Supabase is not configured or unavailable."
  });
}
