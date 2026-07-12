import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { getSeededDemoReportRecord } from "@/src/data/demo-report-seeds";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import type { DbReportInput, DbRepositoryResult } from "@/src/lib/db/types";
import type { WorkspaceReport } from "@/src/lib/project-workspace-types";
import { localCreate, localGet, localList } from "@/src/lib/repositories/local-json-store";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasCompleteReportPayload(record: unknown) {
  if (!isObject(record)) return false;
  const payload = record.reportPayload ?? record.report_json ?? record.payload;
  if (!isObject(payload)) return false;

  const comparison = payload.comparisonJson;
  if (isObject(comparison)) {
    return Array.isArray(comparison.items) && comparison.items.length > 0 &&
      Array.isArray(comparison.sharedOpportunities) && Array.isArray(comparison.differentiatedRisks) &&
      Array.isArray(comparison.nextActions);
  }

  const analysis = payload.memoJson;
  return isObject(analysis) && isObject(analysis.scores) && isObject(analysis.point) &&
    Array.isArray(analysis.keyFactors) && Array.isArray(analysis.risks) &&
    Array.isArray(analysis.opportunities) && Array.isArray(analysis.nextActions);
}

function resolveReservedSeedRecord(id: string, stored: unknown | null) {
  const seeded = getSeededDemoReportRecord(id);
  if (!seeded || hasCompleteReportPayload(stored)) return stored;
  return seeded;
}

export async function listReports(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}): Promise<DbRepositoryResult<WorkspaceReport[] | unknown[]>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    const result = localList<WorkspaceReport>("reports", filters);
    return { ok: true, mode: "local_fallback", data: result.data, error: result.error };
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
    return { ok: !response.error, mode: "supabase", data: response.data ?? [], error: response.error ? "Unable to load reports." : null };
  } catch (error) {
    return { ok: false, mode: "local_fallback", data: [], error: error instanceof Error ? error.message : "Unable to load reports." };
  }
}

export async function getReport(id: string): Promise<DbRepositoryResult<WorkspaceReport | unknown | null>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    const result = localGet<WorkspaceReport>("reports", id);
    return { ok: true, mode: "local_fallback", data: resolveReservedSeedRecord(id, result.data), error: null };
  }

  try {
    const query = client.from("reports").select("*") as {
      eq: (column: string, value: string) => { limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> };
    };
    const response = await query.eq("report_key", id).limit(1);
    const stored = response.data?.[0] ?? null;
    // Complete configured records retain precedence. Only reserved demo IDs with
    // missing legacy payload fields use the canonical read-only fixture.
    return { ok: !response.error, mode: "supabase", data: resolveReservedSeedRecord(id, stored), error: response.error ? "Unable to load report." : null };
  } catch (error) {
    return { ok: false, mode: "local_fallback", data: null, error: error instanceof Error ? error.message : "Unable to load report." };
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
    return { ok: true, mode: "local_fallback", data: result.data, error: null };
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
      summary: typeof (input.reportJson as { executiveSummary?: unknown })?.executiveSummary === "string"
        ? (input.reportJson as { executiveSummary: string }).executiveSummary
        : null,
      payload: input.reportJson,
      report_json: input.reportJson,
      linked_analysis_ids: input.runKey ? [input.runKey] : [],
      linked_comparison_id: input.reportType === "comparison" ? input.runKey ?? null : null,
      source_lineage: createSourceLineageSnapshot({
        evidence: (input.reportJson as { evidenceSourceReadiness?: [] })?.evidenceSourceReadiness ?? [],
        uploadedDatasets: (input.reportJson as { uploadedDataContext?: { datasets?: [] } })?.uploadedDataContext?.datasets ?? []
      }),
      decision_posture: input.decisionPosture ?? null,
      generated_at: input.generatedAt ?? new Date().toISOString()
    }, { onConflict: "report_key" }) as Promise<{ data?: unknown; error?: unknown }>;
    const response = await query;

    if (response.error) {
      return { ok: false, mode: "local_fallback", data: null, error: "Unable to persist report." };
    }

    return { ok: true, mode: "supabase", data: response.data ?? null, error: null };
  } catch (error) {
    return {
      ok: false,
      mode: "local_fallback",
      data: null,
      error: error instanceof Error ? error.message : "Unable to persist report."
    };
  }
}
