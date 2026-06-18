import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import type { DbSource } from "@/src/lib/db/types";

export async function listSources(limit = 25): Promise<DbSource[]> {
  const client = await getSupabaseServerClient();
  if (!client) {
    return [];
  }

  try {
    const query = client.from("sources").select("*") as {
      order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: DbSource[] | null }> };
    };
    const response = await query.order("name", { ascending: true }).limit(limit);
    return response.data ?? [];
  } catch {
    return [];
  }
}

export async function countSources(): Promise<number | null> {
  const client = await getSupabaseServerClient();
  if (!client) {
    return null;
  }

  try {
    const query = client.from("sources").select("id", {
      count: "exact",
      head: true
    }) as Promise<{ count: number | null }>;
    const response = await query;
    return response.count ?? 0;
  } catch {
    return null;
  }
}
