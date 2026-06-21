import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import type { DbAnalysisRunInput, DbRepositoryResult } from "@/src/lib/db/types";
import type { WorkspaceAnalysisRun } from "@/src/lib/project-workspace-types";
import { localCreate, localList } from "@/src/lib/repositories/local-json-store";

export async function listAnalysisRuns(limit = 10, projectId?: string | null): Promise<DbRepositoryResult<unknown[]>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    const result = localList<WorkspaceAnalysisRun>("analysis-runs", { projectId, limit });
    return { ok: true, mode: "local_only", data: result.data, error: null };
  }

  try {
    const baseQuery = client.from("analysis_runs").select("*") as {
      eq: (column: string, value: string) => {
        order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null }> };
      };
      order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null }> };
    };
    const orderedQuery = projectId ? baseQuery.eq("project_id", projectId) : baseQuery;
    const response = await orderedQuery.order("created_at", { ascending: false }).limit(limit);
    return { ok: true, mode: "db", data: response.data ?? [], error: null };
  } catch (error) {
    return {
      ok: false,
      mode: "local_only",
      data: [],
      error: error instanceof Error ? error.message : "Unable to load analysis runs."
    };
  }
}

export async function saveAnalysisRun(input: DbAnalysisRunInput): Promise<DbRepositoryResult<unknown>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    const result = localCreate<WorkspaceAnalysisRun>("analysis-runs", {
      id: input.runKey,
      projectId: input.projectId ?? null,
      projectKey: input.projectKey ?? null,
      title: input.selectedName,
      scenario: input.scenarioId,
      targetLabel: input.selectedName,
      targetType: input.selectedObject ? "demo-feature" : "point",
      targetGeometry: input.selectedObject ?? null,
      targetCoordinates: input.selectedPoint,
      decisionPosture: input.decisionPosture ?? "Screening result",
      scoreSummary: (input.resultJson as { scores?: unknown })?.scores ?? null,
      sourceLineage: createSourceLineageSnapshot({
        evidence: (input.inputContext as { evidence?: [] })?.evidence ?? []
      }),
      payload: input.resultJson,
      createdAt: input.createdAt ?? new Date().toISOString()
    });
    return { ok: true, mode: "local_only", data: result.data, error: null };
  }

  try {
    const query = client.from("analysis_runs").upsert({
      run_key: input.runKey,
      project_id: input.projectId ?? null,
      project_key: input.projectKey ?? null,
      project_name: input.projectName ?? null,
      scenario_id: input.scenarioId,
      selected_name: input.selectedName,
      selected_type: input.selectedType,
      selected_point: input.selectedPoint,
      selected_feature_key: input.selectedFeatureKey ?? null,
      input_context: input.inputContext ?? null,
      selected_object: input.selectedObject ?? null,
      result_json: input.resultJson,
      decision_posture: input.decisionPosture ?? null,
      confidence_level: input.confidenceLevel ?? null,
      data_confidence_level: input.dataConfidenceLevel ?? null,
      analysis_mode: input.analysisMode ?? null,
      created_at: input.createdAt ?? new Date().toISOString()
    }, { onConflict: "run_key" }) as Promise<{ data?: unknown; error?: unknown }>;
    const response = await query;

    if (response.error) {
      return { ok: false, mode: "local_only", data: null, error: "Unable to persist analysis run." };
    }

    return { ok: true, mode: "db", data: response.data ?? null, error: null };
  } catch (error) {
    return {
      ok: false,
      mode: "local_only",
      data: null,
      error: error instanceof Error ? error.message : "Unable to persist analysis run."
    };
  }
}
