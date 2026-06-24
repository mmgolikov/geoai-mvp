import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { localCreate, localDelete, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import { aoiRequiredCaveat, type ProjectAoi } from "@/src/types/aoi";

const storeName = "project-aois";

type AoiInput = Omit<ProjectAoi, "createdAt" | "updatedAt" | "caveat"> & {
  createdAt?: string;
  updatedAt?: string;
  caveat?: string;
};

type AoiRow = {
  id: string;
  project_id: string | null;
  project_key: string;
  name: string;
  geometry_type: string | null;
  geometry: GeoJSON.Polygon | null;
  centroid: GeoJSON.Point | null;
  bbox: ProjectAoi["bbox"] | null;
  measurements: ProjectAoi["measurements"] | null;
  source_type: ProjectAoi["sourceType"] | null;
  data_mode: ProjectAoi["dataMode"] | null;
  validation_status: ProjectAoi["validationStatus"] | null;
  caveat: string | null;
  created_at: string;
  updated_at: string;
};

function toAoi(row: AoiRow): ProjectAoi {
  const centroidCoordinates = row.centroid?.coordinates;

  return {
    id: row.id,
    projectId: row.project_id,
    projectKey: row.project_key,
    name: row.name,
    geometryType: "Polygon",
    geometry: row.geometry ?? { type: "Polygon", coordinates: [[]] },
    centroid: {
      longitude: Array.isArray(centroidCoordinates) ? centroidCoordinates[0] ?? 0 : 0,
      latitude: Array.isArray(centroidCoordinates) ? centroidCoordinates[1] ?? 0 : 0
    },
    bbox: row.bbox ?? [0, 0, 0, 0],
    measurements: row.measurements ?? {
      areaSqM: 0,
      areaSqKm: 0,
      perimeterM: 0,
      perimeterKm: 0,
      centroid: {
        longitude: Array.isArray(centroidCoordinates) ? centroidCoordinates[0] ?? 0 : 0,
        latitude: Array.isArray(centroidCoordinates) ? centroidCoordinates[1] ?? 0 : 0
      },
      bbox: row.bbox ?? [0, 0, 0, 0],
      vertexCount: 0
    },
    sourceType: row.source_type ?? "user_drawn",
    dataMode: row.data_mode ?? "user_provided",
    validationStatus: row.validation_status ?? "validation_required",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    analysisCount: 0,
    reportCount: 0,
    caveat: row.caveat ?? aoiRequiredCaveat
  };
}

function toAoiRow(input: ProjectAoi) {
  return {
    id: input.id,
    project_id: input.projectId ?? null,
    project_key: input.projectKey,
    name: input.name,
    geometry_type: input.geometryType,
    source_type: input.sourceType,
    data_mode: input.dataMode,
    validation_status: input.validationStatus,
    geometry: input.geometry,
    centroid: {
      type: "Point",
      coordinates: [input.centroid.longitude, input.centroid.latitude]
    },
    bbox: input.bbox,
    measurements: input.measurements,
    properties: {
      analysisCount: input.analysisCount,
      reportCount: input.reportCount
    },
    caveat: input.caveat ?? aoiRequiredCaveat,
    created_at: input.createdAt,
    updated_at: input.updatedAt
  };
}

export async function listAois(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  const client = await getSupabaseServerClient();
  if (!client) return localList<ProjectAoi>(storeName, filters);

  try {
    const baseQuery = client.from("aois").select("*") as {
      eq: (column: string, value: string) => {
        order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: AoiRow[] | null; error?: unknown }> };
      };
      order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: AoiRow[] | null; error?: unknown }> };
    };
    const query = filters.projectId
      ? baseQuery.eq("project_id", filters.projectId)
      : filters.projectKey
        ? baseQuery.eq("project_key", filters.projectKey)
        : baseQuery;
    const response = await query.order("created_at", { ascending: false }).limit(filters.limit ?? 50);
    if (response.error) return localList<ProjectAoi>(storeName, filters);
    return { ok: true, mode: "supabase" as const, data: (response.data ?? []).map(toAoi), error: null };
  } catch {
    return localList<ProjectAoi>(storeName, filters);
  }
}

export async function getAoi(id: string) {
  const client = await getSupabaseServerClient();
  if (!client) return localGet<ProjectAoi>(storeName, id);

  try {
    const query = client.from("aois").select("*") as {
      eq: (column: string, value: string) => { limit: (count: number) => Promise<{ data: AoiRow[] | null; error?: unknown }> };
    };
    const response = await query.eq("id", id).limit(1);
    if (response.error || !response.data?.[0]) return localGet<ProjectAoi>(storeName, id);
    return { ok: true, mode: "supabase" as const, data: toAoi(response.data[0]), error: null };
  } catch {
    return localGet<ProjectAoi>(storeName, id);
  }
}

export async function createAoi(input: AoiInput) {
  const now = new Date().toISOString();
  const localPayload: ProjectAoi = {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    caveat: input.caveat ?? aoiRequiredCaveat
  };
  const client = await getSupabaseServerClient();
  if (!client) return localCreate<ProjectAoi>(storeName, localPayload);

  try {
    const query = client.from("aois").upsert(toAoiRow(localPayload), { onConflict: "id" }) as Promise<{
      data?: AoiRow[] | null;
      error?: unknown;
    }>;
    const response = await query;
    if (response.error) return localCreate<ProjectAoi>(storeName, localPayload);
    return { ok: true, mode: "supabase" as const, data: response.data?.[0] ? toAoi(response.data[0]) : localPayload, error: null };
  } catch {
    return localCreate<ProjectAoi>(storeName, localPayload);
  }
}

export async function updateAoi(id: string, patch: Partial<ProjectAoi>) {
  const client = await getSupabaseServerClient();
  if (!client) return localUpdate<ProjectAoi>(storeName, id, patch);

  try {
    const dbPatch: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    if (patch.name) dbPatch.name = patch.name;
    if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId;
    if (patch.projectKey) dbPatch.project_key = patch.projectKey;
    if (patch.geometry) dbPatch.geometry = patch.geometry;
    if (patch.centroid) dbPatch.centroid = { type: "Point", coordinates: [patch.centroid.longitude, patch.centroid.latitude] };
    if (patch.bbox) dbPatch.bbox = patch.bbox;
    if (patch.measurements) dbPatch.measurements = patch.measurements;
    if (patch.sourceType) dbPatch.source_type = patch.sourceType;
    if (patch.dataMode) dbPatch.data_mode = patch.dataMode;
    if (patch.validationStatus) dbPatch.validation_status = patch.validationStatus;
    if (patch.caveat) dbPatch.caveat = patch.caveat;

    const query = client.from("aois").update(dbPatch) as {
      eq: (column: string, value: string) => Promise<{ data?: AoiRow[] | null; error?: unknown }>;
    };
    const response = await query.eq("id", id);
    if (response.error) return localUpdate<ProjectAoi>(storeName, id, patch);
    return { ok: true, mode: "supabase" as const, data: response.data?.[0] ? toAoi(response.data[0]) : null, error: null };
  } catch {
    return localUpdate<ProjectAoi>(storeName, id, patch);
  }
}

export async function deleteAoi(id: string) {
  const client = await getSupabaseServerClient();
  if (!client) return localDelete(storeName, id);

  try {
    const query = client.from("aois") as unknown as {
      delete: () => { eq: (column: string, value: string) => Promise<{ error?: unknown }> };
    };
    const response = await query.delete().eq("id", id);
    if (response.error) return localDelete(storeName, id);
    return { ok: true, mode: "supabase" as const, data: true, error: null };
  } catch {
    return localDelete(storeName, id);
  }
}
