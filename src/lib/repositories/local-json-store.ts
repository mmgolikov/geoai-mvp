import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { localFallbackStorageCaveat, type RepositoryMode } from "@/src/lib/repositories/repository-mode";

export type LocalRepositoryResult<T> = {
  ok: boolean;
  mode: RepositoryMode;
  data: T;
  error: string | null;
  storageCaveat: string;
};

const maxLocalRecordBytes = 512 * 1024;
const maxLocalStoreBytes = 8 * 1024 * 1024;

function serializedBytes(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function storePath(name: string) {
  const root = process.env.VERCEL ? "/tmp/geoai-local_fallback" : join(process.cwd(), "data/local_fallback");
  return join(root, `${name}.json`);
}

function readStore<T extends { id: string }>(name: string): T[] {
  const path = storePath(name);
  if (!existsSync(path)) return [];

  try {
    if (statSync(path).size > maxLocalStoreBytes) return [];
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore<T extends { id: string }>(name: string, items: T[]) {
  const path = storePath(name);
  try {
    const serialized = JSON.stringify(items, null, 2);
    if (Buffer.byteLength(serialized, "utf8") > maxLocalStoreBytes) return false;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, serialized);
    return true;
  } catch {
    return false;
  }
}

export function localList<T extends { id: string; projectId?: string | null; projectKey?: string | null }>(
  name: string,
  filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}
): LocalRepositoryResult<T[]> {
  const items = readStore<T>(name)
    .filter((item) => !filters.projectId || item.projectId === filters.projectId)
    .filter((item) => !filters.projectKey || item.projectKey === filters.projectKey)
    .slice(0, filters.limit ?? 50);

  return { ok: true, mode: "local_fallback", data: items, error: null, storageCaveat: localFallbackStorageCaveat };
}

export function localGet<T extends { id: string }>(name: string, id: string): LocalRepositoryResult<T | null> {
  return {
    ok: true,
    mode: "local_fallback",
    data: readStore<T>(name).find((item) => item.id === id) ?? null,
    error: null,
    storageCaveat: localFallbackStorageCaveat
  };
}

export function localCreate<T extends { id: string; createdAt?: string; updatedAt?: string }>(
  name: string,
  item: T
): LocalRepositoryResult<T> {
  const now = new Date().toISOString();
  const nextItem = {
    ...item,
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  } as T;
  if (serializedBytes(nextItem) > maxLocalRecordBytes) {
    return {
      ok: false,
      mode: "local_fallback",
      data: nextItem,
      error: "Local fallback record exceeds the 512 KB containment limit.",
      storageCaveat: localFallbackStorageCaveat
    };
  }
  const items = readStore<T>(name).filter((stored) => stored.id !== item.id);
  const written = writeStore(name, [nextItem, ...items].slice(0, 200));
  return {
    ok: written,
    mode: "local_fallback",
    data: nextItem,
    error: written ? null : "Runtime local fallback is non-durable; write storage is unavailable.",
    storageCaveat: localFallbackStorageCaveat
  };
}

export function localUpdate<T extends { id: string; updatedAt?: string }>(
  name: string,
  id: string,
  patch: Partial<T>
): LocalRepositoryResult<T | null> {
  const items = readStore<T>(name);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return { ok: true, mode: "local_fallback", data: null, error: null, storageCaveat: localFallbackStorageCaveat };
  }

  const updated = { ...items[index], ...patch, updatedAt: new Date().toISOString() } as T;
  if (serializedBytes(updated) > maxLocalRecordBytes) {
    return {
      ok: false,
      mode: "local_fallback",
      data: items[index],
      error: "Local fallback record exceeds the 512 KB containment limit.",
      storageCaveat: localFallbackStorageCaveat
    };
  }
  items[index] = updated;
  const written = writeStore(name, items);
  return {
    ok: written,
    mode: "local_fallback",
    data: updated,
    error: written ? null : "Runtime local fallback is non-durable; write storage is unavailable.",
    storageCaveat: localFallbackStorageCaveat
  };
}

export function localDelete(name: string, id: string): LocalRepositoryResult<boolean> {
  const items = readStore(name);
  const nextItems = items.filter((item) => item.id !== id);
  const written = writeStore(name, nextItems);
  return {
    ok: written,
    mode: "local_fallback",
    data: nextItems.length !== items.length,
    error: written ? null : "Runtime local fallback is non-durable; write storage is unavailable.",
    storageCaveat: localFallbackStorageCaveat
  };
}
