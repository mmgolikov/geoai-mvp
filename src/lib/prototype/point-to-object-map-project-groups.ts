type LocatedResult = { id: string; longitude: number; latitude: number };

/** Exact numeric WGS84 positions only; no fuzzy merging or moved markers. */
export function groupExactPointObjectProjectResults<T extends LocatedResult>(results: readonly T[]): Array<{ key: string; results: T[] }> {
  const groups = new Map<string, { key: string; results: T[] }>();
  for (const result of results) {
    if (!Number.isFinite(result.longitude) || !Number.isFinite(result.latitude) || Math.abs(result.longitude) > 180 || Math.abs(result.latitude) > 85) continue;
    const key = `${result.longitude},${result.latitude}`;
    const group = groups.get(key) ?? { key, results: [] };
    group.results.push(result);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** A successful navigation stays locked until this map is unloaded. */
export function createPointObjectMapResultOpenGuard() {
  let pending = false;
  return {
    isPending: () => pending,
    async run(open: () => boolean | void | Promise<boolean | void>) {
      if (pending) return false;
      pending = true;
      try {
        if (await open() !== true) pending = false;
        return true;
      } catch (error) { pending = false; throw error; }
    }
  };
}
