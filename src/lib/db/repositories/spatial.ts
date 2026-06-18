import { getSupabaseServerClient } from "@/src/lib/supabase/server";

export async function listSpatialLayers(limit = 25) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return [];
  }

  try {
    const query = client.from("spatial_layers").select("*") as {
      order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null }> };
    };
    const response = await query.order("name", { ascending: true }).limit(limit);
    return response.data ?? [];
  } catch {
    return [];
  }
}

export async function listSpatialFeatures(layerId: string, limit = 100) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return [];
  }

  try {
    const query = client.from("spatial_features").select("*") as {
      eq: (column: string, value: string) => { limit: (count: number) => Promise<{ data: unknown[] | null }> };
    };
    const response = await query.eq("layer_id", layerId).limit(limit);
    return response.data ?? [];
  } catch {
    return [];
  }
}
