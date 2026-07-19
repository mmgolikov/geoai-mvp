import { localCreate, localDelete, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import {
  dataRoomRequiredCaveat,
  type DataRoomAsset,
  type ValidationChecklistItem
} from "@/src/types/data-room";

const dataRoomAssetStore = "data-room-assets";
const dataRoomChecklistStore = "data-room-checklist";

type DataRoomAssetInput = Omit<DataRoomAsset, "createdAt" | "updatedAt" | "caveat"> & {
  createdAt?: string;
  updatedAt?: string;
  caveat?: string;
};

type ValidationChecklistItemInput = Omit<ValidationChecklistItem, "caveat"> & {
  caveat?: string;
};

export async function listDataRoomAssets(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  return localList<DataRoomAsset>(dataRoomAssetStore, filters);
}

export async function getDataRoomAsset(id: string) {
  return localGet<DataRoomAsset>(dataRoomAssetStore, id);
}

export async function createDataRoomAsset(input: DataRoomAssetInput) {
  const now = new Date().toISOString();
  return localCreate<DataRoomAsset>(dataRoomAssetStore, {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    caveat: input.caveat ?? dataRoomRequiredCaveat
  });
}

export async function updateDataRoomAsset(id: string, patch: Partial<DataRoomAsset>) {
  return localUpdate<DataRoomAsset>(dataRoomAssetStore, id, patch);
}

export async function deleteDataRoomAsset(id: string) {
  return localDelete(dataRoomAssetStore, id);
}

export async function listDataRoomChecklist(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  return localList<ValidationChecklistItem>(dataRoomChecklistStore, filters);
}

export async function getDataRoomChecklistItem(id: string) {
  return localGet<ValidationChecklistItem>(dataRoomChecklistStore, id);
}

export async function createDataRoomChecklistItem(input: ValidationChecklistItemInput) {
  return localCreate<ValidationChecklistItem>(dataRoomChecklistStore, {
    ...input,
    caveat: input.caveat ?? dataRoomRequiredCaveat
  });
}

export async function updateDataRoomChecklistItem(id: string, patch: Partial<ValidationChecklistItem>) {
  return localUpdate<ValidationChecklistItem>(dataRoomChecklistStore, id, {
    ...patch,
    caveat: patch.caveat ?? dataRoomRequiredCaveat
  });
}
