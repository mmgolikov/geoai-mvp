import { browserDemoStorageKey, isBrowserDemoStorageEnabled } from "@/src/lib/browser-demo-storage";

export type BrowserProjectArtifactSummary = {
  id: string;
  projectKey: string;
  projectId?: string | null;
  type: "comparison" | "report";
  title: string;
  createdAt: string;
  sourceSummary: string;
  reportType?: "analysis" | "comparison";
  targetLabel?: string | null;
};

export const browserProjectArtifactLimits = {
  maximumEntries: 100,
  maximumEntriesPerProject: 20,
  maximumStorageCharacters: 256 * 1024,
  maximumIdCharacters: 256,
  maximumProjectKeyCharacters: 160,
  maximumProjectIdCharacters: 256,
  maximumTitleCharacters: 240,
  maximumSourceSummaryCharacters: 1_200,
  maximumTargetLabelCharacters: 400
} as const;

const browserArtifactIndexKey = browserDemoStorageKey("project-artifacts-v1");
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;
const canonicalIsoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function boundedString(value: unknown, maximumCharacters: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumCharacters || unsafeControlCharacters.test(normalized)) return null;
  return normalized;
}

function optionalNullableBoundedString(value: unknown, maximumCharacters: number) {
  if (value === undefined) return { valid: true as const, value: undefined };
  if (value === null) return { valid: true as const, value: null };
  const normalized = boundedString(value, maximumCharacters);
  return normalized === null
    ? { valid: false as const, value: undefined }
    : { valid: true as const, value: normalized };
}

export function normalizeBrowserProjectArtifact(value: unknown): BrowserProjectArtifactSummary | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const artifact = value as Record<string, unknown>;
  const id = boundedString(artifact.id, browserProjectArtifactLimits.maximumIdCharacters);
  const projectKey = boundedString(artifact.projectKey, browserProjectArtifactLimits.maximumProjectKeyCharacters);
  const title = boundedString(artifact.title, browserProjectArtifactLimits.maximumTitleCharacters);
  const sourceSummary = boundedString(artifact.sourceSummary, browserProjectArtifactLimits.maximumSourceSummaryCharacters);
  const createdAtInput = boundedString(artifact.createdAt, 64);
  const createdAtTimestamp = createdAtInput === null ? Number.NaN : Date.parse(createdAtInput);
  const createdAt = createdAtInput !== null &&
    canonicalIsoTimestamp.test(createdAtInput) &&
    Number.isFinite(createdAtTimestamp) &&
    new Date(createdAtTimestamp).toISOString() === createdAtInput
    ? createdAtInput
    : null;
  const type = artifact.type === "comparison" || artifact.type === "report" ? artifact.type : null;
  const projectId = optionalNullableBoundedString(artifact.projectId, browserProjectArtifactLimits.maximumProjectIdCharacters);
  const targetLabel = optionalNullableBoundedString(artifact.targetLabel, browserProjectArtifactLimits.maximumTargetLabelCharacters);
  const reportType = artifact.reportType === undefined
    ? undefined
    : artifact.reportType === "analysis" || artifact.reportType === "comparison"
      ? artifact.reportType
      : null;

  if (
    id === null ||
    projectKey === null ||
    title === null ||
    sourceSummary === null ||
    createdAt === null ||
    type === null ||
    !projectId.valid ||
    !targetLabel.valid ||
    reportType === null
  ) {
    return null;
  }

  return {
    id,
    projectKey,
    projectId: projectId.value,
    type,
    title,
    createdAt,
    sourceSummary,
    reportType,
    targetLabel: targetLabel.value
  };
}

function limitBrowserProjectArtifacts(items: BrowserProjectArtifactSummary[]) {
  const counts = new Map<string, number>();
  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((item) => {
      const count = counts.get(item.projectKey) ?? 0;
      if (count >= browserProjectArtifactLimits.maximumEntriesPerProject) return false;
      counts.set(item.projectKey, count + 1);
      return true;
    })
    .slice(0, browserProjectArtifactLimits.maximumEntries);
}

export function readBrowserProjectArtifacts() {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return [] as BrowserProjectArtifactSummary[];
  try {
    const raw = window.localStorage.getItem(browserArtifactIndexKey);
    if (raw === null) return [];
    if (raw.length > browserProjectArtifactLimits.maximumStorageCharacters) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length > browserProjectArtifactLimits.maximumEntries) return [];
    return limitBrowserProjectArtifacts(
      parsed
        .map(normalizeBrowserProjectArtifact)
        .filter((item): item is BrowserProjectArtifactSummary => item !== null)
    );
  } catch {
    return [];
  }
}

export function upsertBrowserProjectArtifact(artifact: BrowserProjectArtifactSummary) {
  if (typeof window === "undefined" || !isBrowserDemoStorageEnabled()) return;
  const normalizedArtifact = normalizeBrowserProjectArtifact(artifact);
  if (!normalizedArtifact) return;
  const current = readBrowserProjectArtifacts();
  const next = limitBrowserProjectArtifacts([
    normalizedArtifact,
    ...current.filter((item) => !(item.id === normalizedArtifact.id && item.projectKey === normalizedArtifact.projectKey))
  ]);
  try {
    const serialized = JSON.stringify(next);
    if (serialized.length > browserProjectArtifactLimits.maximumStorageCharacters) return;
    window.localStorage.setItem(browserArtifactIndexKey, serialized);
  } catch {
    // The generated artifact remains available in memory/print flow if quota is exhausted.
  }
}
