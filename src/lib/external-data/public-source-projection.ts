const privateLineageKeys = new Set([
  "availablefiles",
  "inputfile",
  "outputfile",
  "filepath",
  "normalizedpath",
  "rawfilename",
  "rawpath",
  "storagepath",
  "objectpath",
  "localpath",
  "filesystempath",
  "bucketname",
  "storagekey",
  "objectkey"
]);

function isPrivateLineageKey(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return privateLineageKeys.has(normalized) || normalized.endsWith("filesystempath") || normalized.endsWith("storagepath") || normalized.endsWith("objectpath");
}

export function redactPrivateSourceLineage<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactPrivateSourceLineage(item)) as T;
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (isPrivateLineageKey(key)) continue;
    output[key] = redactPrivateSourceLineage(child);
  }
  return output as T;
}
