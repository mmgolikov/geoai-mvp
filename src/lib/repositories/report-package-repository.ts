import { buildReportPackage } from "@/src/lib/report-package/report-package-builder";
import {
  seededReportPackageDefinitions,
  seededReportPackageKey
} from "@/src/lib/report-package/report-package-seed-definitions";
import { localCreate, localDelete, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import { localFallbackStorageCaveat, type RepositoryMode } from "@/src/lib/repositories/repository-mode";
import type { ReportPackage, ReportPackageBuildInput, ReportPackageStatus } from "@/src/types/report-package";

const reportPackageStore = "report-packages";

export function isCanonicalReportPackageId(value: string) {
  return value.length > 0 && value.length <= 240 && /^[a-z0-9][a-z0-9._:-]*$/i.test(value);
}

type ReportPackageRepositoryResult<T> = {
  ok: boolean;
  mode: RepositoryMode;
  data: T;
  error: string | null;
  storageCaveat: string;
};

export function summarizeReportPackage(pkg: ReportPackage) {
  return {
    id: pkg.id,
    packageKey: pkg.packageKey,
    projectId: pkg.projectId ?? null,
    projectKey: pkg.projectKey,
    title: pkg.title,
    packageType: pkg.packageType,
    status: pkg.status,
    version: pkg.version,
    generatedAt: pkg.generatedAt,
    linkedReportIds: pkg.linkedReportIds,
    linkedAnalysisIds: pkg.linkedAnalysisIds,
    linkedComparisonIds: pkg.linkedComparisonIds,
    validationStatus: pkg.validationSummary.highestAllowedClaimLevel,
    printablePath: `/report-packages/${encodeURIComponent(pkg.packageKey)}/print`,
    jsonPath: `/api/report-packages/${encodeURIComponent(pkg.packageKey)}/json`,
    caveat: pkg.caveat
  };
}

const seededPackageDefinitions = seededReportPackageDefinitions.map((definition) => {
  const input: ReportPackageBuildInput = {
    projectId: null,
    projectKey: definition.projectKey,
    packageType: definition.packageType,
    reportId: definition.reportId
  };
  return {
    projectKey: definition.projectKey,
    packageKey: seededReportPackageKey(definition),
    input
  };
});

const globalSeedCache = globalThis as typeof globalThis & {
  __geoAiSeededReportPackageCache?: Map<string, Promise<ReportPackage>>;
};
const seededReportPackageCache = globalSeedCache.__geoAiSeededReportPackageCache ?? new Map<string, Promise<ReportPackage>>();
globalSeedCache.__geoAiSeededReportPackageCache = seededReportPackageCache;

async function buildSeededPackage(definition: (typeof seededPackageDefinitions)[number]) {
  const current = seededReportPackageCache.get(definition.projectKey);
  if (current) return current;
  const pending = buildReportPackage(definition.input, { includeStoredState: false });
  seededReportPackageCache.set(definition.projectKey, pending);
  try {
    return await pending;
  } catch (error) {
    seededReportPackageCache.delete(definition.projectKey);
    throw error;
  }
}

async function seededPackagesForProject(projectKey?: string | null) {
  const definitions = projectKey
    ? seededPackageDefinitions.filter((item) => item.projectKey === projectKey)
    : seededPackageDefinitions;
  return Promise.all(definitions.map(buildSeededPackage));
}

export async function listReportPackages(filters: {
  projectId?: string | null;
  projectKey?: string | null;
  limit?: number;
  includeStoredState?: boolean;
} = {}): Promise<ReportPackageRepositoryResult<ReportPackage[]>> {
  const stored = filters.includeStoredState === false
    ? { ok: true, mode: "browser_local" as const, data: [] as ReportPackage[], error: null, storageCaveat: localFallbackStorageCaveat }
    : localList<ReportPackage>(reportPackageStore, filters);
  const seeded = await seededPackagesForProject(filters.projectKey);
  const byId = new Map<string, ReportPackage>();

  for (const item of seeded) byId.set(item.id, item);
  for (const item of stored.data) byId.set(item.id, item);

  const data = Array.from(byId.values())
    .filter((item) => !filters.projectId || item.projectId === filters.projectId)
    .filter((item) => !filters.projectKey || item.projectKey === filters.projectKey)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, filters.limit ?? 50);

  return {
    ok: true,
    mode: "local_fallback",
    data,
    error: stored.error,
    storageCaveat: localFallbackStorageCaveat
  };
}

export async function getReportPackage(
  idOrKey: string,
  options: { includeStoredState?: boolean } = {}
): Promise<ReportPackageRepositoryResult<ReportPackage | null>> {
  const stored = options.includeStoredState === false
    ? { ok: true, mode: "browser_local" as const, data: null, error: null, storageCaveat: localFallbackStorageCaveat }
    : localGet<ReportPackage>(reportPackageStore, idOrKey);
  if (stored.data) {
    return { ...stored, data: stored.data };
  }

  const definition = seededPackageDefinitions.find((item) => item.packageKey === idOrKey);
  const generated = definition ? await buildSeededPackage(definition) : null;
  return {
    ok: true,
    mode: "local_fallback",
    data: generated,
    error: null,
    storageCaveat: localFallbackStorageCaveat
  };
}

export async function createReportPackage(input: ReportPackageBuildInput): Promise<ReportPackageRepositoryResult<ReportPackage>> {
  const pkg = await buildReportPackage(input);
  const result = localCreate<ReportPackage>(reportPackageStore, pkg);

  return {
    ok: result.ok,
    mode: "local_fallback",
    data: result.data,
    error: result.error,
    storageCaveat: localFallbackStorageCaveat
  };
}

export async function saveReportPackage(pkg: ReportPackage): Promise<ReportPackageRepositoryResult<ReportPackage>> {
  const result = localCreate<ReportPackage>(reportPackageStore, pkg);
  return {
    ok: result.ok,
    mode: "local_fallback",
    data: result.data,
    error: result.error,
    storageCaveat: localFallbackStorageCaveat
  };
}

export async function updateReportPackageStatus(idOrKey: string, status: ReportPackageStatus): Promise<ReportPackageRepositoryResult<ReportPackage | null>> {
  const existing = await getReportPackage(idOrKey);
  if (!existing.data) {
    return { ok: true, mode: "local_fallback", data: null, error: null, storageCaveat: localFallbackStorageCaveat };
  }

  const result = localUpdate<ReportPackage>(reportPackageStore, existing.data.id, { status });
  return {
    ok: result.ok,
    mode: "local_fallback",
    data: result.data,
    error: result.error,
    storageCaveat: localFallbackStorageCaveat
  };
}

export async function deleteReportPackage(idOrKey: string): Promise<ReportPackageRepositoryResult<boolean>> {
  const existing = await getReportPackage(idOrKey);
  if (!existing.data) {
    return { ok: true, mode: "local_fallback", data: false, error: null, storageCaveat: localFallbackStorageCaveat };
  }

  const result = localDelete(reportPackageStore, existing.data.id);
  return {
    ok: result.ok,
    mode: "local_fallback",
    data: result.data,
    error: result.error,
    storageCaveat: localFallbackStorageCaveat
  };
}
