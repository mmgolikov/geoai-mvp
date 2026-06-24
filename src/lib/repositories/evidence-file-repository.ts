import { localCreate, localDelete, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import { evidenceFileCaveat, type EvidenceFileAsset } from "@/src/types/storage";

const evidenceFileStore = "evidence-file-assets";

type EvidenceFileInput = Omit<EvidenceFileAsset, "createdAt" | "updatedAt" | "caveat"> & {
  createdAt?: string;
  updatedAt?: string;
  caveat?: string;
};

export async function listEvidenceFileAssets(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  return localList<EvidenceFileAsset>(evidenceFileStore, filters);
}

export async function getEvidenceFileAsset(id: string) {
  return localGet<EvidenceFileAsset>(evidenceFileStore, id);
}

export async function createEvidenceFileAsset(input: EvidenceFileInput) {
  const now = new Date().toISOString();
  return localCreate<EvidenceFileAsset>(evidenceFileStore, {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    caveat: input.caveat ?? evidenceFileCaveat
  });
}

export async function updateEvidenceFileAsset(id: string, patch: Partial<EvidenceFileAsset>) {
  return localUpdate<EvidenceFileAsset>(evidenceFileStore, id, {
    ...patch,
    caveat: patch.caveat ?? evidenceFileCaveat
  });
}

export async function deleteEvidenceFileAssetMetadata(id: string) {
  return localDelete(evidenceFileStore, id);
}
