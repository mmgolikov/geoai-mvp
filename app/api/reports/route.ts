import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/src/lib/audit/audit-event";
import { projectAccessDeniedPayload, requireProjectAccess } from "@/src/lib/auth/project-access";
import { getProjectByKey } from "@/src/lib/db/repositories/projects";
import { getReport, listReports, saveReport } from "@/src/lib/db/repositories/reports";
import { repositoryModeFields } from "@/src/lib/repositories/repository-mode";
import type { DbReportInput } from "@/src/lib/db/types";
import { readBoundedJson } from "@/src/lib/http/bounded-json";
import { getSeededDemoReportRecord } from "@/src/data/demo-report-seeds";
import { hasVerifiedRequestIdentity } from "@/src/lib/auth/verified-request-access";

export const runtime = "nodejs";

function isReportInput(value: unknown): value is DbReportInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<DbReportInput>;
  return (
    typeof input.reportKey === "string" && /^[a-zA-Z0-9_-]{1,240}$/.test(input.reportKey) &&
    (input.reportType === "analysis" || input.reportType === "comparison") &&
    typeof input.title === "string" && input.title.trim().length > 0 && input.title.length <= 500 &&
    (input.projectKey === undefined || input.projectKey === null || (typeof input.projectKey === "string" && input.projectKey.length <= 160)) &&
    typeof input.reportJson === "object" && input.reportJson !== null && !Array.isArray(input.reportJson)
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
    sourceSummary: report.sourceLineage?.disclaimers?.[0] ?? "Saved with local/sample source lineage; official validation required."
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const projectId = url.searchParams.get("projectId");
  const projectKey = url.searchParams.get("projectKey");
  const existing = id ? await getReport(id) : null;
  const resolvedProjectKey = id
    ? ((existing?.data as { projectKey?: string | null; project_key?: string | null } | null)?.projectKey
      ?? (existing?.data as { project_key?: string | null } | null)?.project_key
      ?? null)
    : projectKey;
  const access = requireProjectAccess({ projectKey: resolvedProjectKey, action: "read", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }

  if (id) {
    if (!hasVerifiedRequestIdentity(access) && !getSeededDemoReportRecord(id)) {
      return NextResponse.json({ ok: false, ...repositoryModeFields("local_fallback"), message: "Server-side dynamic report reads are disabled in public-demo mode." }, { status: 404 });
    }
    const result = existing!;
    const responseMode = result.mode === "supabase" ? "supabase" : "local_fallback";
    return NextResponse.json({
      ok: result.ok,
      ...repositoryModeFields(responseMode),
      item: result.data,
      summary: result.data ? summarizeReport(result.data) : null,
      access,
      error: result.error,
      dataHonesty: "Saved reports use sample/open/local source lineage unless externally validated."
    });
  }

  if (!hasVerifiedRequestIdentity(access)) {
    return NextResponse.json({
      ok: true,
      ...repositoryModeFields("local_fallback"),
      count: 0,
      items: [],
      summaries: [],
      access,
      error: null,
      dataHonesty: "Public-demo reports are kept in the caller browser; shared server fallback is intentionally disabled."
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
  const parsed = await readBoundedJson(request, 768 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, persisted: false, ...repositoryModeFields("local_fallback"), message: parsed.message },
      { status: parsed.status }
    );
  }
  const body = parsed.value;

  if (!isReportInput(body)) {
    return NextResponse.json(
      { ok: false, persisted: false, ...repositoryModeFields("local_fallback"), message: "Invalid report payload." },
      { status: 400 }
    );
  }
  if (getSeededDemoReportRecord(body.reportKey)) {
    return NextResponse.json({
      ok: false,
      persisted: false,
      ...repositoryModeFields("local_fallback"),
      message: "Reserved seeded report IDs are immutable."
    }, { status: 409 });
  }

  const project = body.projectKey ? await getProjectByKey(body.projectKey) : null;
  const access = requireProjectAccess({ projectKey: body.projectKey ?? project?.data?.projectKey ?? null, action: "write", mode: "soft" });
  if (!access.allowed) {
    return NextResponse.json(projectAccessDeniedPayload(access), { status: access.status });
  }
  if (!hasVerifiedRequestIdentity(access)) {
    return NextResponse.json({
      ok: true,
      persisted: false,
      ...repositoryModeFields("browser_local"),
      reportKey: body.reportKey,
      project: project?.data ?? null,
      access,
      data: null,
      error: null,
      message: "Public-demo report remains in caller browser storage; shared server persistence is disabled."
    });
  }
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
