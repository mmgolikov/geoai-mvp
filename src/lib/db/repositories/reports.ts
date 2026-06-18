import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import type { DbReportInput, DbRepositoryResult } from "@/src/lib/db/types";

export async function saveReport(input: DbReportInput): Promise<DbRepositoryResult<unknown>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { ok: true, mode: "local_only", data: null, error: null };
  }

  try {
    const query = client.from("reports").upsert({
      report_key: input.reportKey,
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
