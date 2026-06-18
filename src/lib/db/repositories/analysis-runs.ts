import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import type { DbAnalysisRunInput } from "@/src/lib/db/types";

export async function listAnalysisRuns(limit = 10) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { mode: "local_only" as const, runs: [] };
  }

  try {
    const query = client.from("analysis_runs").select("*") as {
      order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null }> };
    };
    const response = await query.order("created_at", { ascending: false }).limit(limit);
    return { mode: "supabase" as const, runs: response.data ?? [] };
  } catch {
    return { mode: "local_only" as const, runs: [] };
  }
}

export async function saveAnalysisRun(input: DbAnalysisRunInput) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { persisted: false, mode: "local_only" as const };
  }

  try {
    const query = client.from("analysis_runs").insert({
      run_key: input.runKey,
      scenario_id: input.scenarioId,
      selected_name: input.selectedName,
      selected_type: input.selectedType,
      selected_point: input.selectedPoint,
      selected_object: input.selectedObject ?? null,
      result_payload: input.result,
      decision_posture: input.decisionPosture ?? null,
      confidence_level: input.confidenceLevel ?? null,
      data_confidence_level: input.dataConfidenceLevel ?? null,
      analysis_mode: input.analysisMode ?? null
    }) as Promise<{ error?: unknown }>;
    const response = await query;

    return response.error
      ? { persisted: false, mode: "local_only" as const }
      : { persisted: true, mode: "supabase" as const };
  } catch {
    return { persisted: false, mode: "local_only" as const };
  }
}
