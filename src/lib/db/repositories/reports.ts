import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import type { DbReportInput } from "@/src/lib/db/types";

export async function saveReport(input: DbReportInput) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { persisted: false, mode: "local_only" as const };
  }

  try {
    const query = client.from("reports").insert({
      report_key: input.reportKey,
      report_type: input.reportType,
      title: input.title,
      payload: input.payload
    }) as Promise<{ error?: unknown }>;
    const response = await query;

    return response.error
      ? { persisted: false, mode: "local_only" as const }
      : { persisted: true, mode: "supabase" as const };
  } catch {
    return { persisted: false, mode: "local_only" as const };
  }
}
