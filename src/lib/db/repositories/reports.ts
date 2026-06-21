import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import type { DbReportInput, DbRepositoryResult } from "@/src/lib/db/types";
import type { WorkspaceReport } from "@/src/lib/project-workspace-types";
import { localCreate, localGet, localList } from "@/src/lib/repositories/local-json-store";

export async function listReports(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}): Promise<DbRepositoryResult<WorkspaceReport[] | unknown[]>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    const result = localList<WorkspaceReport>("reports", filters);
    return { ok: true, mode: "local_only", data: result.data, error: null };
  }

  try {
    const baseQuery = client.from("reports").select("*") as {
      eq: (column: string, value: string) => {
        order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> };
      };
      order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> };
    };
    const byProjectId = filters.projectId ? baseQuery.eq("project_id", filters.projectId) : baseQuery;
    const byProjectKey = filters.projectKey && !filters.projectId ? baseQuery.eq("project_key", filters.projectKey) : byProjectId;
    const response = await byProjectKey.order("generated_at", { ascending: false }).limit(filters.limit ?? 50);
    return { ok: !response.error, mode: "db", data: response.data ?? [], error: response.error ? "Unable to load reports." : null };
  } catch (error) {
    return { ok: false, mode: "local_only", data: [], error: error instanceof Error ? error.message : "Unable to load reports." };
  }
}

export async function getReport(id: string): Promise<DbRepositoryResult<WorkspaceReport | unknown | null>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    const result = localGet<WorkspaceReport>("reports", id);
    return { ok: true, mode: "local_only", data: result.data, error: null };
  }

  try {
    const query = client.from("reports").select("*") as {
      eq: (column: string, value: string) => { limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> };
    };
    const response = await query.eq("report_key", id).limit(1);
    return { ok: !response.error, mode: "db", data: response.data?.[0] ?? null, error: response.error ? "Unable to load report." : null };
  } catch (error) {
    return { ok: false, mode: "local_only", data: null, error: error instanceof Error ? error.message : "Unable to load report." };
  }
}

export async function saveReport(input: DbReportInput): Promise<DbRepositoryResult<unknown>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    const reportPayload = input.reportJson as {
      scenario?: string;
      selectedSite?: string;
      evidenceSourceReadiness?: [];
      uploadedDataContext?: { datasets?: [] };
    };
    const result = localCreate<WorkspaceReport>("reports", {
      id: input.reportKey,
      projectId: input.projectId ?? null,
      projectKey: input.projectKey ?? null,
      analysisRunId: input.analysisRunId ?? null,
      title: input.title,
      scenario: reportPayload?.scenario ?? input.reportType,
      targetLabel: reportPayload?.selectedSite ?? input.title,
      reportType: input.reportType,
      reportPayload: input.reportJson,
      sourceLineage: createSourceLineageSnapshot({
        evidence: reportPayload?.evidenceSourceReadiness ?? [],
        uploadedDatasets: reportPayload?.uploadedDataContext?.datasets ?? []
      }),
      createdAt: input.generatedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { ok: true, mode: "local_only", data: result.data, error: null };
  }

  try {
    const query = client.from("reports").upsert({
      report_key: input.reportKey,
      analysis_run_id: input.analysisRunId ?? null,
      project_id: input.projectId ?? null,
      project_key: input.projectKey ?? null,
      project_name: input.projectName ?? null,
      run_key: input.runKey ?? null,
      report_type: input.reportType,
      title: input.title,
      report_json: input.reportJson,
      decision_posture: input.decisionPosture ?? null,
      generated_at: input.generatedAt ?? new Date().toISOString()
    }, { onConflict: "report_key" }) as Promise<{ data?: unknown; error?: unknown }>;
    const response = await query;

    if (response.error) {
      return { ok: false, mode: "local_only", data: null, error: "Unable to persist report." };
    }

    return { ok: true, mode: "db", data: response.data ?? null, error: null };
  } catch (error) {
    return {
      ok: false,
      mode: "local_only",
      data: null,
      error: error instanceof Error ? error.message : "Unable to persist report."
    };
  }
}
