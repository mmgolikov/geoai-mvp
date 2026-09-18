import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isExactProjectKey } from "@/src/lib/auth/request-project-read-policy";
import {
  authorizePointObjectAnalysis,
  type PointObjectAccessResult
} from "@/src/lib/prototype/point-object-analysis-runs";
import type {
  PointObjectCloudCursor,
  PointObjectCloudPutInput
} from "@/src/lib/prototype/point-object-cloud-contract";

export type PointObjectCloudRepositoryResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 403 | 409 | 503; message: string };

export function getPointObjectCloudProjectKey(): string | null {
  const value = process.env.GEOAI_POINT_OBJECT_PREVIEW_PROJECT_KEY?.trim() ?? "";
  return isExactProjectKey(value) ? value : null;
}

export function authorizePointObjectCloud(input: {
  request: Request;
  projectKey: string;
  action: "analysis.read" | "analysis.run";
}): Promise<PointObjectAccessResult> {
  return authorizePointObjectAnalysis(input);
}

function repositoryError(error: { code?: string } | null): PointObjectCloudRepositoryResult {
  if (error?.code === "42501") {
    return { ok: false, status: 403, message: "Project artifact access was denied." };
  }
  if (error?.code === "22023") {
    return { ok: false, status: 400, message: "The project artifact request is invalid." };
  }
  if (error?.code === "23505" || error?.code === "40001") {
    return { ok: false, status: 409, message: "The project artifact changed concurrently." };
  }
  return { ok: false, status: 503, message: "Project artifact persistence is temporarily unavailable." };
}

export async function putPointObjectCloudArtifact(input: {
  supabase: SupabaseClient;
  projectKey: string;
  value: PointObjectCloudPutInput;
}): Promise<PointObjectCloudRepositoryResult> {
  try {
    const response = await input.supabase.schema("api").rpc("put_point_object_project_artifact", {
      target_project_key: input.projectKey,
      target_local_project: input.value.localProject,
      target_artifact_json: input.value.artifact,
      target_expected_cloud_revision: input.value.expectedCloudRevision
    });
    if (response.error) return repositoryError(response.error);
    return { ok: true, data: response.data };
  } catch {
    return repositoryError(null);
  }
}

export async function listPointObjectCloudArtifacts(input: {
  supabase: SupabaseClient;
  projectKey: string;
  limit: number;
  cursor: PointObjectCloudCursor | null;
}): Promise<PointObjectCloudRepositoryResult> {
  try {
    const response = await input.supabase.schema("api").rpc("list_point_object_project_artifacts", {
      target_project_key: input.projectKey,
      target_limit: input.limit,
      target_before_created_at: input.cursor?.createdAt ?? null,
      target_before_id: input.cursor?.id ?? null
    });
    if (response.error) return repositoryError(response.error);
    return { ok: true, data: response.data ?? [] };
  } catch {
    return repositoryError(null);
  }
}
