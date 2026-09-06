import { createHash } from "node:crypto";

export const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function compareCanonicalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => compareCanonicalText(left, right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }

  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function semanticHash(value: unknown): string {
  return sha256(canonicalJson(value));
}

export function withoutKey(value: unknown, keyToRemove: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== keyToRemove);
  return Object.fromEntries(entries);
}

export function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}
