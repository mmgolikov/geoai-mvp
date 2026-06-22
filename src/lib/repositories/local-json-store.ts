import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type LocalRepositoryResult<T> = {
  ok: boolean;
  mode: "local-fallback";
  data: T;
  error: string | null;
};

function storePath(name: string) {
  const root = process.env.VERCEL ? "/tmp/geoai-local-fallback" : join(process.cwd(), "data/local-fallback");
  return join(root, `${name}.json`);
}

function readStore<T extends { id: string }>(name: string): T[] {
  const path = storePath(name);
  if (!existsSync(path)) return [];

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore<T extends { id: string }>(name: string, items: T[]) {
  const path = storePath(name);
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(items, null, 2));
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

  return { ok: true, mode: "local-fallback", data: items, error: null };
}

export function localGet<T extends { id: string }>(name: string, id: string): LocalRepositoryResult<T | null> {
  return { ok: true, mode: "local-fallback", data: readStore<T>(name).find((item) => item.id === id) ?? null, error: null };
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
  const items = readStore<T>(name).filter((stored) => stored.id !== item.id);
  const written = writeStore(name, [nextItem, ...items].slice(0, 200));
  return {
    ok: written,
    mode: "local-fallback",
    data: nextItem,
    error: written ? null : "Runtime local fallback is non-durable; write storage is unavailable."
  };
}

export function localUpdate<T extends { id: string; updatedAt?: string }>(
  name: string,
  id: string,
  patch: Partial<T>
): LocalRepositoryResult<T | null> {
  const items = readStore<T>(name);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return { ok: true, mode: "local-fallback", data: null, error: null };

  const updated = { ...items[index], ...patch, updatedAt: new Date().toISOString() } as T;
  items[index] = updated;
  const written = writeStore(name, items);
  return {
    ok: written,
    mode: "local-fallback",
    data: updated,
    error: written ? null : "Runtime local fallback is non-durable; write storage is unavailable."
  };
}

export function localDelete(name: string, id: string): LocalRepositoryResult<boolean> {
  const items = readStore(name);
  const nextItems = items.filter((item) => item.id !== id);
  const written = writeStore(name, nextItems);
  return {
    ok: written,
    mode: "local-fallback",
    data: nextItems.length !== items.length,
    error: written ? null : "Runtime local fallback is non-durable; write storage is unavailable."
  };
}
