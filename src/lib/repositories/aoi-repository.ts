import { localCreate, localDelete, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import { aoiRequiredCaveat, type ProjectAoi } from "@/src/types/aoi";

const storeName = "project-aois";

type AoiInput = Omit<ProjectAoi, "createdAt" | "updatedAt" | "caveat"> & {
  createdAt?: string;
  updatedAt?: string;
  caveat?: string;
};

export async function listAois(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  return localList<ProjectAoi>(storeName, filters);
}

export async function getAoi(id: string) {
  return localGet<ProjectAoi>(storeName, id);
}

export async function createAoi(input: AoiInput) {
  const now = new Date().toISOString();
  return localCreate<ProjectAoi>(storeName, {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    caveat: input.caveat ?? aoiRequiredCaveat
  });
}

export async function updateAoi(id: string, patch: Partial<ProjectAoi>) {
  return localUpdate<ProjectAoi>(storeName, id, patch);
}

export async function deleteAoi(id: string) {
  return localDelete(storeName, id);
}
