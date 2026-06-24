import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import { buildReportPackage } from "@/src/lib/report-package/report-package-builder";
import { localCreate, localDelete, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import { localFallbackStorageCaveat, type RepositoryMode } from "@/src/lib/repositories/repository-mode";
import type { ReportPackage, ReportPackageBuildInput, ReportPackageStatus } from "@/src/types/report-package";

const reportPackageStore = "report-packages";

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

function projectFor(input: { projectKey?: string | null; projectId?: string | null }) {
  return demoProjects.find((project) =>
    (input.projectKey && project.projectKey === input.projectKey) ||
    (input.projectId && (project.id === input.projectId || project.projectKey === input.projectId))
  ) ?? getDemoProject(input.projectKey ?? input.projectId);
}

async function seededPackagesForProject(projectKey?: string | null) {
  const projects = projectKey ? [projectFor({ projectKey })] : demoProjects;
  return Promise.all(projects.map((project) => buildReportPackage({
    projectId: project.id,
    projectKey: project.projectKey,
    packageType: project.clientType === "developer"
      ? "development_feasibility"
      : project.clientType === "bank"
        ? "bank_asset_review"
        : "investment_screening",
    reportId: project.projectKey === "developer-land-pipeline-demo"
      ? "seeded-analysis-dubai-south-development-report"
      : project.projectKey === "bank-asset-review-demo"
        ? "seeded-analysis-mbr-collateral-report"
        : "seeded-analysis-dubai-marina-report"
  })));
}

export async function listReportPackages(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}): Promise<ReportPackageRepositoryResult<ReportPackage[]>> {
  const stored = localList<ReportPackage>(reportPackageStore, filters);
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

export async function getReportPackage(idOrKey: string): Promise<ReportPackageRepositoryResult<ReportPackage | null>> {
  const stored = localGet<ReportPackage>(reportPackageStore, idOrKey);
  if (stored.data) {
    return { ...stored, data: stored.data };
  }

  const seeded = await seededPackagesForProject(null);
  const generated = seeded.find((item) => item.id === idOrKey || item.packageKey === idOrKey) ?? null;
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
