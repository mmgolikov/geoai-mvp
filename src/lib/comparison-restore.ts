import { browserDemoStorageKey, isBrowserDemoStorageEnabled } from "@/src/lib/browser-demo-storage";
import type { ComparisonResult } from "@/src/types/geo";

const maximumSerializedComparisonCharacters = 512 * 1024;

function comparisonStorageKey(projectKey: string, comparisonId: string) {
  return browserDemoStorageKey(`comparison-v1:${projectKey}:${comparisonId}`);
}

function isRestorableComparison(value: unknown, projectKey: string, comparisonId: string): value is ComparisonResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const comparison = value as Partial<ComparisonResult>;
  return comparison.id === comparisonId &&
    comparison.project?.projectKey === projectKey &&
    Array.isArray(comparison.items) &&
    comparison.items.length >= 2 &&
    comparison.items.length <= 10 &&
    Boolean(comparison.winner);
}

export function writeBrowserComparisonRecord(projectKey: string, comparison: ComparisonResult) {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return false;
  if (!isRestorableComparison(comparison, projectKey, comparison.id)) return false;

  try {
    const serialized = JSON.stringify(comparison);
    if (serialized.length > maximumSerializedComparisonCharacters) return false;
    window.localStorage.setItem(comparisonStorageKey(projectKey, comparison.id), serialized);
    return true;
  } catch {
    return false;
  }
}

export function readBrowserComparisonRecord(projectKey: string, comparisonId: string) {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return null;

  try {
    const raw = window.localStorage.getItem(comparisonStorageKey(projectKey, comparisonId));
    if (!raw || raw.length > maximumSerializedComparisonCharacters) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isRestorableComparison(parsed, projectKey, comparisonId) ? parsed : null;
  } catch {
    return null;
  }
}
