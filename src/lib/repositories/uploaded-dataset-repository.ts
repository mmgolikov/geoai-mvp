import type { DbRepositoryResult } from "@/src/lib/db/types";
import type { UploadedDatasetRecord } from "@/src/lib/project-workspace-types";
import { localCreate, localDelete, localList } from "@/src/lib/repositories/local-json-store";

export type UploadedDatasetRecordInput = UploadedDatasetRecord;

export async function listUploadedDatasetRecords(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}): Promise<DbRepositoryResult<UploadedDatasetRecord[]>> {
  const result = localList<UploadedDatasetRecord>("uploaded-datasets", filters);
  return { ok: true, mode: "local_only", data: result.data, error: null };
}

export async function saveUploadedDatasetRecord(input: UploadedDatasetRecordInput): Promise<DbRepositoryResult<UploadedDatasetRecord>> {
  const result = localCreate<UploadedDatasetRecord>("uploaded-datasets", input);
  return { ok: true, mode: "local_only", data: result.data, error: result.error };
}

export async function deleteUploadedDatasetRecord(id: string): Promise<DbRepositoryResult<boolean>> {
  const result = localDelete("uploaded-datasets", id);
  return { ok: true, mode: "local_only", data: result.data, error: null };
}
