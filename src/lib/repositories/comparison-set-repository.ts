import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { createSourceLineageSnapshot } from "@/src/lib/source-lineage-snapshot";
import type { DbRepositoryResult } from "@/src/lib/db/types";
import type { WorkspaceComparisonSet } from "@/src/lib/project-workspace-types";
import { localCreate, localDelete, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";

export type ComparisonSetInput = Omit<WorkspaceComparisonSet, "sourceLineage" | "createdAt" | "updatedAt"> & {
  sourceLineage?: WorkspaceComparisonSet["sourceLineage"];
  createdAt?: string;
  updatedAt?: string;
};

export async function listComparisonSets(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}): Promise<DbRepositoryResult<WorkspaceComparisonSet[] | unknown[]>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    const result = localList<WorkspaceComparisonSet>("comparison-sets", filters);
    return { ok: true, mode: "local_fallback", data: result.data, error: null };
  }

  try {
    const baseQuery = client.from("comparison_sets").select("*") as {
      eq: (column: string, value: string) => {
        order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> };
      };
      order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> };
    };
    const query = filters.projectId
      ? baseQuery.eq("project_id", filters.projectId)
      : filters.projectKey
        ? baseQuery.eq("project_key", filters.projectKey)
        : baseQuery;
    const response = await query.order("created_at", { ascending: false }).limit(filters.limit ?? 50);
    return { ok: !response.error, mode: "supabase", data: response.data ?? [], error: response.error ? "Unable to load comparison sets." : null };
  } catch (error) {
    return { ok: false, mode: "local_fallback", data: [], error: error instanceof Error ? error.message : "Unable to load comparison sets." };
  }
}

export async function getComparisonSet(id: string): Promise<DbRepositoryResult<WorkspaceComparisonSet | unknown | null>> {
  const result = localGet<WorkspaceComparisonSet>("comparison-sets", id);
  return { ok: true, mode: "local_fallback", data: result.data, error: null };
}

export async function saveComparisonSet(input: ComparisonSetInput): Promise<DbRepositoryResult<WorkspaceComparisonSet | unknown>> {
  const now = new Date().toISOString();
  const localPayload: WorkspaceComparisonSet = {
    ...input,
    sourceLineage: input.sourceLineage ?? createSourceLineageSnapshot(),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  };
  const client = await getSupabaseServerClient();
  if (!client) {
    const result = localCreate<WorkspaceComparisonSet>("comparison-sets", localPayload);
    return { ok: true, mode: "local_fallback", data: result.data, error: result.error };
  }

  try {
    const query = client.from("comparison_sets").upsert({
      comparison_key: input.id,
      project_id: input.projectId,
      project_key: input.projectKey,
      title: input.title,
      item_count: input.itemCount,
      items: input.items,
      recommendation: input.recommendation,
      source_lineage: localPayload.sourceLineage,
      result_payload: input.payload,
      payload: input.payload,
      created_at: localPayload.createdAt,
      updated_at: localPayload.updatedAt
    }, { onConflict: "comparison_key" }) as Promise<{ data?: unknown; error?: unknown }>;
    const response = await query;
    if (response.error) {
      const result = localCreate<WorkspaceComparisonSet>("comparison-sets", localPayload);
      return { ok: true, mode: "local_fallback", data: result.data, error: result.error ?? "DB comparison persistence unavailable; local fallback used." };
    }
    return { ok: true, mode: "supabase", data: response.data ?? localPayload, error: null };
  } catch {
    const result = localCreate<WorkspaceComparisonSet>("comparison-sets", localPayload);
    return { ok: true, mode: "local_fallback", data: result.data, error: result.error ?? "DB comparison persistence unavailable; local fallback used." };
  }
}

export async function updateComparisonSet(id: string, patch: Partial<WorkspaceComparisonSet>) {
  const result = localUpdate<WorkspaceComparisonSet>("comparison-sets", id, patch);
  return { ok: true, mode: "local_fallback" as const, data: result.data, error: null };
}

export async function deleteComparisonSet(id: string) {
  const result = localDelete("comparison-sets", id);
  return { ok: true, mode: "local_fallback" as const, data: result.data, error: null };
}
